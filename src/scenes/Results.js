import * as Phaser from 'phaser';
import { getMission, MISSION_COUNT } from '../logic/missions.js';
import { TOWERS } from '../logic/towers.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';
import { towerSpriteKey } from '../assets.js';
import { sfx } from '../audio/sfx.js';
import { setupCamera, markReady } from '../ui/view.js';
import { addText, COLORS, FONTS, FILLS } from '../ui/text.js';
import { addButton } from '../ui/button.js';

export class Results extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  init(data) {
    this.outcome = { missionId: data?.missionId ?? 1, stars: data?.stars ?? 1, coinsEarned: data?.coinsEarned ?? 0 };
  }

  create() {
    setupCamera(this);
    const { missionId, stars, coinsEarned } = this.outcome;
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-space').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    addText(this, GAME_WIDTH / 2, 100, `MISSION ${missionId} COMPLETE!`, { fontSize: '48px', color: COLORS.gold, stroke: '#1b1b3a', strokeThickness: 6 }).setOrigin(0.5);

    [-1, 0, 1].forEach((offset, i) => {
      const star = this.add.image(GAME_WIDTH / 2 + offset * 110, 220, 'star').setScale(0);
      if (i >= stars) star.setTint(0x333344);
      this.tweens.add({
        targets: star,
        scale: 3,
        delay: 300 + i * 350,
        duration: 300,
        ease: 'Back.Out',
        onStart: () => {
          if (i < stars) sfx.play('coin');
        },
      });
    });

    addText(this, GAME_WIDTH / 2, 320, `Coins earned: ${coinsEarned}`, { fontFamily: FONTS.word, fontSize: '28px' }).setOrigin(0.5);

    const next = missionId < MISSION_COUNT ? getMission(missionId + 1) : null;
    if (next?.newTower) {
      const key = towerSpriteKey(next.newTower, 1);
      const south = this.registry.get('sheets')[key].rotations.south;
      this.add.sprite(GAME_WIDTH / 2 - 150, 386, key, south);
      addText(this, GAME_WIDTH / 2 - 100, 386, `New tower: ${TOWERS[next.newTower].name}!`, { fontFamily: FONTS.word, fontSize: '28px', color: COLORS.gold }).setOrigin(0, 0.5);
    }
    if (!next) {
      addText(this, GAME_WIDTH / 2, 386, 'You beat every mission!', { fontFamily: FONTS.word, fontSize: '32px', color: COLORS.gold }).setOrigin(0.5);
    }

    if (next) {
      addButton(this, GAME_WIDTH / 2 - 140, 480, 'NEXT MISSION', () => this.scene.start('Game', { missionId: missionId + 1 }), { width: 240, height: 56, fill: FILLS.go });
    }
    addButton(this, next ? GAME_WIDTH / 2 + 140 : GAME_WIDTH / 2, 480, 'MISSION MAP', () => this.scene.start('MissionMap'), { width: 240, height: 56 });
    markReady(this);
  }
}
