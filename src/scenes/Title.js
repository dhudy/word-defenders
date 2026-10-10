import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';
import { setupCamera, markReady } from '../ui/view.js';
import { addText, COLORS, FILLS } from '../ui/text.js';
import { addButton } from '../ui/button.js';
import { sfx } from '../audio/sfx.js';

export class Title extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    setupCamera(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-space').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    addText(this, GAME_WIDTH / 2, 140, 'WORD DEFENDERS', {
      fontSize: '64px',
      color: COLORS.gold,
      stroke: '#1b1b3a',
      strokeThickness: 8,
    }).setOrigin(0.5);
    ['alien-blob', 'alien-zoomer', 'alien-chonk'].forEach((key, i) => {
      const alien = this.add.sprite(-80 - i * 110, 320, key).play(`${key}-walk-east`);
      this.tweens.add({ targets: alien, x: GAME_WIDTH + 80, duration: 10000, delay: i * 700, repeat: -1 });
    });
    addButton(this, GAME_WIDTH / 2, 440, 'PLAY', () => {
      sfx.unlock();
      this.scene.start('MissionMap');
    }, { width: 240, height: 64, fontSize: '32px', fill: FILLS.go });
    addButton(this, 924, 540, 'Grown-ups', () => {
      sfx.unlock();
      this.scene.start('Grownups');
    }, { width: 160, height: 40, fill: FILLS.quiet });
    markReady(this);
  }
}
