import * as Phaser from 'phaser';
import { MISSIONS } from '../logic/missions.js';
import { isUnlocked } from '../logic/save.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';
import { app } from '../app.js';
import { sfx } from '../audio/sfx.js';
import { setupCamera, markReady } from '../ui/view.js';
import { addText, COLORS, FILLS } from '../ui/text.js';
import { addButton } from '../ui/button.js';

// Missions 1-5 run left to right, 6-10 snake back right to left.
const POSITIONS = [
  [160, 230], [336, 230], [512, 230], [688, 230], [864, 230],
  [864, 410], [688, 410], [512, 410], [336, 410], [160, 410],
];

export class MissionMap extends Phaser.Scene {
  constructor() {
    super('MissionMap');
  }

  create() {
    setupCamera(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-space').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    addText(this, GAME_WIDTH / 2, 90, 'PICK A MISSION', { fontSize: '48px', color: COLORS.gold, stroke: '#1b1b3a', strokeThickness: 6 }).setOrigin(0.5);
    const trail = this.add.graphics();
    trail.lineStyle(6, FILLS.panelEdge, 0.6);
    trail.beginPath();
    POSITIONS.forEach(([x, y], i) => (i === 0 ? trail.moveTo(x, y) : trail.lineTo(x, y)));
    trail.strokePath();
    MISSIONS.forEach((mission, i) => this.addMarker(mission.id, POSITIONS[i][0], POSITIONS[i][1]));
    addButton(this, 90, 540, 'BACK', () => this.scene.start('Title'), { width: 120, height: 44, fill: FILLS.quiet });
    markReady(this);
  }

  addMarker(id, x, y) {
    const unlocked = isUnlocked(app.save, id);
    const best = app.save.missions[id]?.stars ?? 0;
    const circle = this.add.circle(x, y, 44, unlocked ? FILLS.button : FILLS.locked).setStrokeStyle(4, 0xffffff, unlocked ? 1 : 0.3);
    addText(this, x, y, String(id), { fontSize: '32px', color: unlocked ? COLORS.text : COLORS.dim }).setOrigin(0.5);
    if (!unlocked) addText(this, x + 32, y - 32, '🔒', { fontFamily: 'sans-serif', fontSize: '24px' }).setOrigin(0.5);
    [-1, 0, 1].forEach((offset, i) => {
      const star = this.add.image(x + offset * 26, y + 62, 'star').setScale(0.75);
      if (i >= best) star.setTint(0x333344);
    });
    if (!unlocked) return;
    circle.setInteractive({ useHandCursor: true });
    circle.on('pointerover', () => circle.setFillStyle(0x7b7bf0));
    circle.on('pointerout', () => circle.setFillStyle(FILLS.button));
    circle.on('pointerdown', () => {
      sfx.play('click');
      this.scene.start('Game', { missionId: id });
    });
  }
}
