import * as Phaser from 'phaser';
import * as Run from '../logic/game.js';
import { readKeyEvent } from '../logic/typing.js';
import { lockableAliens } from '../logic/world.js';
import { basePosition } from '../logic/map.js';
import { SPEEDS, recordResult } from '../logic/save.js';
import { createRng } from '../logic/rng.js';
import { app, updateSave } from '../app.js';
import { sfx } from '../audio/sfx.js';
import { setupCamera, markReady } from '../ui/view.js';
import { addText, COLORS, FILLS } from '../ui/text.js';
import { addButton } from '../ui/button.js';
import { showModal } from '../ui/modal.js';
import { AlienView } from '../objects/AlienView.js';
import { MapView } from './game/MapView.js';
import { Hud } from './game/Hud.js';

const START_BUTTON = { x: 900, y: 544 };

export class Game extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.launch = data ?? {};
  }

  create() {
    setupCamera(this);
    const { missionId = 1, wave, coins, hearts } = this.launch;
    this.run = Run.createGame({
      missionId,
      words: app.save.words,
      speed: SPEEDS[app.save.settings.speed],
      rng: createRng(Date.now() >>> 0),
      debug: { wave, coins, hearts },
    });
    this.halted = false;
    this.closeModal = null;
    this.alienViews = new Map();
    this.mapView = new MapView(this, this.run.map);
    this.hud = new Hud(this, { missionId, onPause: () => this.pause() });
    this.startButton = addButton(this, START_BUTTON.x, START_BUTTON.y, 'START WAVE', () => this.onStartWave(), {
      width: 200,
      height: 48,
      fill: FILLS.go,
    }).setDepth(20000);

    this.input.keyboard.on('keydown', this.onKey, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    if (import.meta.env.DEV) {
      globalThis.__debug = {
        run: this.run,
        firstWord: () => (this.run.world ? (lockableAliens(this.run.world)[0]?.word ?? '') : ''),
      };
    }
    this.refreshPhaseUi();
    if (this.launch.autostart) this.onStartWave();
    markReady(this);
  }

  update(_time, delta) {
    if (this.halted) return;
    if (this.run.phase === 'wave') this.handleEvents(Run.update(this.run, delta / 1000));
    this.syncAliens();
    this.hud.set(this.run);
  }

  onKey(event) {
    if (this.halted) return;
    const pressed = readKeyEvent(event);
    if (pressed === null) return;
    const { handled, events } = Run.key(this.run, pressed);
    if (handled) event.preventDefault();
    this.handleEvents(events);
  }

  onStartWave() {
    if (this.run.phase !== 'break' || this.halted) return;
    this.handleEvents(Run.startWave(this.run));
    this.refreshPhaseUi();
  }

  refreshPhaseUi() {
    this.startButton.show(this.run.phase === 'break');
  }

  handleEvents(events) {
    for (const e of events) {
      switch (e.type) {
        case 'waveStarted':
          sfx.play('waveStart');
          break;
        case 'spawn':
          if (e.alienType === 'boss') sfx.play('bossAlarm');
          break;
        case 'lock':
        case 'correct':
          sfx.play('key');
          break;
        case 'wrong':
          this.alienViews.get(e.id)?.wobble();
          sfx.play('wrong');
          break;
        case 'miss':
          sfx.play('miss');
          break;
        case 'complete':
          this.fireLaser(e.id);
          sfx.play('zap');
          break;
        case 'shieldPop':
          sfx.play('shieldPop');
          break;
        case 'kill':
          this.explode(e.x, e.y);
          sfx.play('explosion');
          break;
        case 'coins':
          this.floatCoins(e.x, e.y, e.amount);
          sfx.play('coin');
          break;
        case 'leak':
          this.hud.flashHearts();
          this.mapView.flashBase();
          sfx.play('leak');
          break;
        case 'waveCleared':
          this.refreshPhaseUi();
          break;
        case 'waveFailed':
          this.onWaveFailed();
          break;
        case 'missionWon':
          this.onMissionWon(e);
          break;
        default:
          break;
      }
    }
  }

  onWaveFailed() {
    sfx.play('tryAgain');
    this.refreshPhaseUi();
    this.closeModal = showModal(this, {
      message: "Uh oh, the aliens got through! Let's try that wave again.",
      buttons: [{ label: 'TRY AGAIN', onClick: () => this.retry() }],
    });
  }

  retry() {
    this.closeModal?.();
    this.closeModal = null;
    Run.retryWave(this.run);
    this.refreshPhaseUi();
  }

  onMissionWon({ stars, coinsEarned }) {
    sfx.play('victory');
    this.refreshPhaseUi();
    const missionId = this.run.mission.id;
    updateSave(recordResult(app.save, missionId, stars));
    this.time.delayedCall(1500, () => this.scene.start('Results', { missionId, stars, coinsEarned }));
  }

  pause() {
    if (this.halted || this.closeModal || this.run.phase === 'won') return;
    this.halted = true;
    this.tweens.pauseAll();
    this.anims.pauseAll();
    this.closeModal = showModal(this, {
      message: 'Paused',
      buttons: [
        { label: 'RESUME', onClick: () => this.resume() },
        { label: 'QUIT', onClick: () => this.scene.start('MissionMap') },
      ],
    });
  }

  resume() {
    this.closeModal?.();
    this.closeModal = null;
    this.halted = false;
    this.tweens.resumeAll();
    this.anims.resumeAll();
  }

  onBlur() {
    if (this.run.phase === 'wave') this.pause();
  }

  onShutdown() {
    this.input.keyboard.off('keydown', this.onKey, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.anims.resumeAll();
    if (import.meta.env.DEV) delete globalThis.__debug;
  }

  syncAliens() {
    const alive = new Set();
    for (const alien of this.run.world?.aliens ?? []) {
      alive.add(alien.id);
      let view = this.alienViews.get(alien.id);
      if (!view) {
        view = new AlienView(this, alien, this.run.mission.id);
        this.alienViews.set(alien.id, view);
      }
      view.sync(alien, this.run.typing);
    }
    for (const [id, view] of this.alienViews) {
      if (!alive.has(id)) {
        view.destroy();
        this.alienViews.delete(id);
      }
    }
  }

  fireLaser(id) {
    const view = this.alienViews.get(id);
    if (!view) return;
    const from = basePosition(this.run.map);
    const beam = this.add.graphics().setDepth(16500);
    beam.lineStyle(8, 0x7df9ff, 0.35).lineBetween(from.x, from.y, view.sprite.x, view.sprite.y);
    beam.lineStyle(3, 0xffffff, 1).lineBetween(from.x, from.y, view.sprite.x, view.sprite.y);
    this.tweens.add({ targets: beam, alpha: 0, duration: 250, onComplete: () => beam.destroy() });
  }

  explode(x, y, scale = 1) {
    const fx = this.add.sprite(x, y, 'fx-explosion').setDepth(16000).setScale(scale);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    fx.play('fx-explosion-explode-south');
  }

  floatCoins(x, y, amount) {
    const icon = this.add.image(x - 12, y - 24, 'coin').setDepth(17000).setScale(0.75);
    const label = addText(this, x + 2, y - 24, `+${amount}`, { fontSize: '16px', color: COLORS.gold })
      .setOrigin(0, 0.5)
      .setDepth(17000);
    this.tweens.add({
      targets: [icon, label],
      y: '-=36',
      alpha: 0,
      duration: 900,
      onComplete: () => {
        icon.destroy();
        label.destroy();
      },
    });
  }
}
