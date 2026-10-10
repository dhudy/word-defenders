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
import { TowerView } from '../objects/TowerView.js';
import { MapView } from './game/MapView.js';
import { Hud } from './game/Hud.js';
import { BuildMenu } from './game/BuildMenu.js';
import { Guide } from './game/Guide.js';

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
    this.seenKeys = new WeakSet();
    this.alienViews = new Map();
    this.towerViews = new Map();
    this.projectileViews = new Map();
    this.mapView = new MapView(this, this.run.map, { onPadClick: (pad) => this.onPadClick(pad) });
    this.hud = new Hud(this, { missionId, onPause: () => this.pause() });
    this.startButton = addButton(this, START_BUTTON.x, START_BUTTON.y, 'START WAVE', () => this.onStartWave(), {
      width: 200,
      height: 48,
      fill: FILLS.go,
    }).setDepth(20000);
    this.buildMenu = new BuildMenu(this, { onChange: () => this.refreshPhaseUi() });
    this.guide = missionId === 1 && !app.save.missions[1]
      ? new Guide(this, { pad: this.mapView.padPosition(0), start: START_BUTTON })
      : null;

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
    this.syncTowers();
    this.syncProjectiles();
    this.hud.set(this.run);
    this.guide?.update(this.run);
  }

  onKey(event) {
    // Phaser re-emits a frame's earlier key events when 3+ arrive in one frame; handle each event once.
    if (this.seenKeys.has(event)) return;
    this.seenKeys.add(event);
    if (this.halted) return;
    const pressed = readKeyEvent(event);
    if (pressed === null) return;
    if (pressed === 'Escape' && this.buildMenu.isOpen) {
      this.buildMenu.close();
      return;
    }
    const { handled, events } = Run.key(this.run, pressed);
    if (handled) event.preventDefault();
    this.handleEvents(events);
  }

  onStartWave() {
    if (this.run.phase !== 'break' || this.halted) return;
    this.buildMenu.close();
    this.handleEvents(Run.startWave(this.run));
    this.refreshPhaseUi();
  }

  onPadClick(pad) {
    if (this.run.phase !== 'break' || this.halted || this.closeModal) return;
    this.buildMenu.open(this.run, pad, this.mapView.padPosition(pad));
  }

  refreshPhaseUi() {
    const inBreak = this.run.phase === 'break';
    this.startButton.show(inBreak);
    if (!inBreak) this.buildMenu.close();
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
          if (e.by === 'typing') this.guide?.noteTypedKill();
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
        case 'fire':
          sfx.play(e.towerType);
          break;
        case 'hit':
          if (e.splash) this.explode(e.x, e.y, 0.6);
          break;
        case 'chill':
          this.puff(e.x, e.y);
          sfx.play('freeze');
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
    this.buildMenu.close();
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

  syncTowers() {
    const sheets = this.registry.get('sheets');
    const simTowers = this.run.world?.towers ?? [];
    for (const [pad, tower] of Object.entries(this.run.towers)) {
      let view = this.towerViews.get(pad);
      if (!view) {
        const index = Number(pad);
        view = new TowerView(this, { pos: this.mapView.padPosition(index), sheets, onClick: () => this.onPadClick(index) });
        this.towerViews.set(pad, view);
      }
      view.sync(tower, simTowers.find((t) => t.pad === Number(pad)) ?? null);
    }
    for (const [pad, view] of this.towerViews) {
      if (!this.run.towers[pad]) {
        view.destroy();
        this.towerViews.delete(pad);
      }
    }
  }

  syncProjectiles() {
    const world = this.run.world;
    const alive = new Set();
    for (const p of world?.projectiles ?? []) {
      alive.add(p.id);
      let view = this.projectileViews.get(p.id);
      if (!view) {
        view = this.add.image(p.x, p.y, p.towerType === 'rocket' ? 'rocket-shell' : 'bolt').setDepth(15000);
        this.projectileViews.set(p.id, view);
      }
      const target = world.aliens.find((a) => a.id === p.targetId);
      if (target) view.setRotation(Math.atan2(target.y - p.y, target.x - p.x));
      view.setPosition(p.x, p.y);
    }
    for (const [id, view] of this.projectileViews) {
      if (!alive.has(id)) {
        view.destroy();
        this.projectileViews.delete(id);
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

  puff(x, y) {
    const frost = this.add.image(x, y, 'freeze-puff').setDepth(15500).setAlpha(0.9);
    this.tweens.add({ targets: frost, scale: 1.5, alpha: 0, duration: 600, onComplete: () => frost.destroy() });
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
