import { towerSpriteKey } from '../assets.js';
import { towerStats } from '../logic/towers.js';

const TOWER_LIFT = 12;

// A tower sprite on its pad. It turns to the facing chosen by the simulation;
// a Freeze Ray shows its slowing field while a wave runs.
export class TowerView {
  constructor(scene, { pos, sheets, onClick }) {
    this.pos = pos;
    this.sheets = sheets;
    this.spriteKey = null;
    this.facing = 'south';
    this.auraShown = false;
    this.aura = scene.add.graphics().setDepth(-400);
    this.sprite = scene.add.sprite(pos.x, pos.y - TOWER_LIFT, towerSpriteKey('blaster', 1)).setDepth(pos.y);
    this.sprite.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
  }

  sync(tower, simTower) {
    const spriteKey = towerSpriteKey(tower.type, tower.level);
    const facing = simTower?.facing ?? this.facing;
    if (spriteKey !== this.spriteKey || facing !== this.facing) {
      this.spriteKey = spriteKey;
      this.facing = facing;
      this.sprite.setTexture(spriteKey, this.sheets[spriteKey].rotations[facing]);
    }
    const showAura = tower.type === 'freeze' && simTower !== null;
    if (showAura !== this.auraShown) {
      this.auraShown = showAura;
      this.aura.clear();
      if (showAura) {
        this.aura.fillStyle(0x9fd8ff, 0.14).fillCircle(this.pos.x, this.pos.y, towerStats(tower.type, tower.level).range);
      }
    }
  }

  destroy() {
    this.aura.destroy();
    this.sprite.destroy();
  }
}
