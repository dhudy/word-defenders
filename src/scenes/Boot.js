import * as Phaser from 'phaser';
import { SPRITES, FONT_FILES } from '../assets.js';
import { showLoadError } from '../ui/errors.js';

// Loads the small files the real loader needs: sheet layouts, terrain metadata, fonts.
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.failedKey = null;
    this.load.on('loaderror', (file) => {
      this.failedKey = file.key;
    });
    for (const key of SPRITES) this.load.json(`sheet:${key}`, `assets/sprites/${key}.json`);
    this.load.json('terrain', 'assets/terrain/terrain.json');
    for (const [family, url] of Object.entries(FONT_FILES)) this.load.font(family, url, 'truetype');
  }

  create() {
    // A dev server may answer a missing file with index.html (status 200), which
    // Phaser fails to parse without a 'loaderror', so check the cache as well.
    const missing = [...SPRITES.map((key) => `sheet:${key}`), 'terrain'].find((key) => !this.cache.json.exists(key));
    if (this.failedKey || missing) {
      showLoadError(this, this.failedKey ?? missing);
      return;
    }
    document.fonts
      .load('26px Andika')
      .catch(() => null)
      .then(() => this.scene.start('Preload'));
  }
}
