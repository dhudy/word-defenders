import { WordLabel } from './WordLabel.js';
import { ShieldView } from './ShieldView.js';
import { LABEL_OFFSETS, alienSpriteKey } from '../assets.js';

const SLOW_TINT = 0x9fd8ff;
// Word bubbles never rise into the 64 px HUD bar (the path's top row is close to it).
export const LABEL_MIN_Y = 86;
// Label priority (and depth above 10000) of the locked alien: above any path
// distance (the longest path is 1856 px), below projectiles at depth 15000.
const LOCKED_PRIORITY = 3000;

export class AlienView {
  constructor(scene, alien, missionId) {
    this.scene = scene;
    this.spriteKey = alienSpriteKey(alien.type, missionId);
    this.labelOffset = LABEL_OFFSETS[alien.type];
    this.dir = null;
    this.sprite = scene.add.sprite(alien.x, alien.y, this.spriteKey);
    this.hpBar = scene.add.graphics();
    this.label = new WordLabel(scene);
    this.shields = alien.type === 'boss' ? new ShieldView(scene) : null;
  }

  sync(alien, typing) {
    this.sprite.setPosition(alien.x, alien.y).setDepth(alien.y);
    if (alien.dir !== this.dir) {
      this.dir = alien.dir;
      this.sprite.play(`${this.spriteKey}-walk-${alien.dir}`);
    }
    this.sprite.anims.timeScale = 1 - alien.slow;
    if (alien.slow > 0) this.sprite.setTint(SLOW_TINT);
    else this.sprite.clearTint();

    const locked = typing.targetId === alien.id;
    this.label.set(alien.word, locked ? typing.index : 0, locked);
    this.shields?.sync(alien, alien.y);
    this.alien = alien;
    // What Game's label layout needs: the bubble's desired centre, width and priority.
    this.labelItem = {
      id: alien.id,
      x: alien.x,
      y: alien.y - this.labelOffset,
      width: this.label.width,
      priority: locked ? LOCKED_PRIORITY : alien.distance,
    };
  }

  // Positions the word bubble at its laid-out centre, with the HP bar under it.
  placeLabel(x, y, depth) {
    this.label.setPosition(x, y, depth);
    this.drawHp(this.alien, x, y, depth);
  }

  drawHp(alien, labelX, labelY, depth) {
    this.hpBar.clear();
    if (alien.hp >= alien.maxHp) return;
    const width = alien.type === 'boss' ? 80 : 36;
    const x = labelX - width / 2;
    const y = labelY + 24;
    this.hpBar.setDepth(10000 + depth);
    this.hpBar.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, width + 2, 6);
    this.hpBar.fillStyle(0x3ddc84, 1).fillRect(x, y, width * Math.max(0, alien.hp / alien.maxHp), 4);
  }

  wobble() {
    this.label.wobble();
  }

  destroy() {
    this.sprite.destroy();
    this.hpBar.destroy();
    this.label.destroy();
    this.shields?.destroy();
  }
}
