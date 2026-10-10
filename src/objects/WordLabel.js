import { addText, COLORS, FONTS, FILLS } from '../ui/text.js';

const PAD_X = 10;
const HEIGHT = 38;
const STYLE = { fontFamily: FONTS.word, fontSize: '26px' };

// Word bubble above an alien. While locked: typed letters green, the next
// letter yellow and underlined, the rest white, with a yellow outline.
export class WordLabel {
  constructor(scene) {
    this.scene = scene;
    this.offset = { x: 0 };
    this.stateKey = null;
    this.container = scene.add.container(0, 0).setDepth(10000);
    this.bg = scene.add.graphics();
    this.typed = addText(scene, 0, 0, '', { ...STYLE, color: COLORS.typed }).setOrigin(0, 0.5);
    this.next = addText(scene, 0, 0, '', { ...STYLE, color: COLORS.next }).setOrigin(0, 0.5);
    this.rest = addText(scene, 0, 0, '', { ...STYLE, color: COLORS.text }).setOrigin(0, 0.5);
    this.underline = scene.add.graphics();
    this.container.add([this.bg, this.typed, this.next, this.rest, this.underline]);
    this.pulse = scene.tweens.add({ targets: this.next, alpha: 0.35, yoyo: true, repeat: -1, duration: 350 });
  }

  set(word, typedCount, locked) {
    const stateKey = `${word}|${typedCount}|${locked}`;
    if (stateKey === this.stateKey) return;
    this.stateKey = stateKey;
    this.container.setVisible(word !== null);
    if (word === null) return;

    const split = locked ? typedCount : 0;
    this.typed.setText(word.slice(0, split));
    this.next.setText(locked ? word.slice(split, split + 1) : '');
    this.rest.setText(word.slice(locked ? split + 1 : 0));

    const width = this.typed.width + this.next.width + this.rest.width;
    let x = -width / 2;
    this.typed.setX(x);
    x += this.typed.width;
    this.next.setX(x);
    const nextX = x;
    x += this.next.width;
    this.rest.setX(x);

    const left = -width / 2 - PAD_X;
    this.bg.clear();
    this.bg.fillStyle(FILLS.panel, 0.9).fillRoundedRect(left, -HEIGHT / 2, width + PAD_X * 2, HEIGHT, 10);
    if (locked) this.bg.lineStyle(3, 0xffd23f, 1).strokeRoundedRect(left, -HEIGHT / 2, width + PAD_X * 2, HEIGHT, 10);
    this.underline.clear();
    if (locked && this.next.width > 0) this.underline.fillStyle(0xffd23f, 1).fillRect(nextX, 13, this.next.width, 3);
  }

  setPosition(x, y, depth) {
    this.container.setPosition(x + this.offset.x, y).setDepth(10000 + depth);
  }

  wobble() {
    this.scene.tweens.killTweensOf(this.offset);
    this.offset.x = 0;
    this.scene.tweens.add({
      targets: this.offset,
      x: 6,
      yoyo: true,
      repeat: 3,
      duration: 40,
      onComplete: () => {
        this.offset.x = 0;
      },
    });
    this.next.setColor(COLORS.wrong);
    this.scene.time.delayedCall(250, () => {
      if (this.next.active) this.next.setColor(COLORS.next);
    });
  }

  destroy() {
    this.pulse.remove();
    this.scene.tweens.killTweensOf(this.offset);
    this.container.destroy();
  }
}
