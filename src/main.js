import '@fontsource/andika/400.css';
import './style.css';
import * as Phaser from 'phaser';

class Hello extends Phaser.Scene {
  constructor() {
    super('Hello');
  }

  create() {
    this.cameras.main.setZoom(2).centerOn(512, 288);
    this.add
      .text(512, 288, 'Word Defenders', { fontFamily: 'Andika', fontSize: '48px', color: '#ffffff' })
      .setOrigin(0.5)
      .setResolution(2);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 2048,
  height: 1152,
  backgroundColor: '#0b0b1a',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Hello],
});
