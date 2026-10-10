import * as Phaser from 'phaser';
import { SPRITES, IMAGES, ANIMATION_RATES } from '../assets.js';
import { parseSheet } from '../logic/sheets.js';
import { parseDebug } from '../logic/debug.js';
import { TILE, GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';
import { setupCamera } from '../ui/view.js';
import { showLoadError } from '../ui/errors.js';

export class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    setupCamera(this);
    this.failedKey = null;
    this.progressBar = this.add.graphics();
    this.load.on('progress', (progress) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x5b5bd6, 1).fillRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 - 8, 400 * progress, 16);
    });
    this.load.on('loaderror', (file) => {
      this.failedKey = file.key;
    });
    this.sheetLayouts = {};
    for (const key of SPRITES) {
      const sheet = parseSheet(this.cache.json.get(`sheet:${key}`));
      this.sheetLayouts[key] = sheet;
      this.load.spritesheet(key, `assets/sprites/${key}.png`, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
    }
    this.load.spritesheet('terrain', 'assets/terrain/terrain.png', { frameWidth: TILE, frameHeight: TILE });
    for (const key of IMAGES) this.load.image(key, `assets/images/${key}.png`);
  }

  create() {
    this.progressBar.destroy();
    const missing = [...SPRITES, ...IMAGES, 'terrain'].find((key) => !this.textures.exists(key));
    if (this.failedKey || missing) {
      showLoadError(this, this.failedKey ?? missing);
      return;
    }
    this.registry.set('sheets', this.sheetLayouts);
    for (const [key, sheet] of Object.entries(this.sheetLayouts)) {
      for (const [name, directions] of Object.entries(sheet.animations)) {
        for (const [direction, frames] of Object.entries(directions)) {
          this.anims.create({
            key: `${key}-${name}-${direction}`,
            frames: this.anims.generateFrameNumbers(key, { frames }),
            frameRate: ANIMATION_RATES[name] ?? 12,
            repeat: name === 'walk' ? -1 : 0,
          });
        }
      }
    }
    const debug = import.meta.env.DEV ? parseDebug(globalThis.location.search) : null;
    if (debug) this.scene.start(debug.scene, debug.data);
    else this.scene.start('Title');
  }
}
