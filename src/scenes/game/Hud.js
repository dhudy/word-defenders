import { addText, COLORS } from '../../ui/text.js';
import { addButton } from '../../ui/button.js';
import { WAVES_PER_MISSION } from '../../logic/waves.js';
import { GAME_WIDTH } from '../../logic/map.js';

const DEPTH = 20000;

// Top bar: hearts, coins, wave number, mission number and the pause button.
export class Hud {
  constructor(scene, { missionId, onPause }) {
    this.scene = scene;
    const bar = scene.add.graphics().setDepth(DEPTH);
    bar.fillStyle(0x0b0b1a, 0.9).fillRect(0, 0, GAME_WIDTH, 64);
    this.heart = scene.add.image(32, 32, 'heart').setDepth(DEPTH + 1);
    this.hearts = addText(scene, 56, 32, '', { fontSize: '32px' }).setOrigin(0, 0.5).setDepth(DEPTH + 1);
    scene.add.image(176, 32, 'coin').setDepth(DEPTH + 1);
    this.coins = addText(scene, 200, 32, '', { fontSize: '32px', color: COLORS.gold }).setOrigin(0, 0.5).setDepth(DEPTH + 1);
    this.wave = addText(scene, GAME_WIDTH / 2, 32, '', { fontSize: '32px' }).setOrigin(0.5).setDepth(DEPTH + 1);
    addText(scene, 800, 32, `MISSION ${missionId}`, { fontSize: '16px', color: COLORS.dim }).setOrigin(0.5).setDepth(DEPTH + 1);
    addButton(scene, 968, 32, 'II', onPause, { width: 64, height: 44 }).setDepth(DEPTH + 1);
    this.shown = null;
  }

  set(run) {
    const shown = `${run.hearts}|${run.coins}|${run.wave}`;
    if (shown === this.shown) return;
    this.shown = shown;
    this.hearts.setText(String(run.hearts));
    this.coins.setText(String(run.coins));
    this.wave.setText(`WAVE ${run.wave} / ${WAVES_PER_MISSION}`);
  }

  flashHearts() {
    this.scene.tweens.add({ targets: this.heart, scale: 1.5, yoyo: true, duration: 120 });
  }
}
