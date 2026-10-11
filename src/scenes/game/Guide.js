import { addText, COLORS, FONTS } from '../../ui/text.js';
import { GAME_WIDTH } from '../../logic/map.js';

const DEPTH = 25000;

// First-time hints for mission 1: build a Freeze Ray, press Start Wave, type a word.
export class Guide {
  constructor(scene, { pad, start }) {
    this.spots = { pad, start };
    this.step = null;
    this.typedOnce = false;
    this.arrow = scene.add.container(0, 0).setDepth(DEPTH);
    const shape = scene.add.graphics();
    shape.fillStyle(0xffd23f, 1).fillTriangle(-16, -24, 16, -24, 0, 0);
    shape.lineStyle(3, 0x1b1b3a, 1).strokeTriangle(-16, -24, 16, -24, 0, 0);
    this.arrow.add(shape);
    scene.tweens.add({ targets: shape, y: -10, yoyo: true, repeat: -1, duration: 350 });
    this.text = addText(scene, 0, 0, '', {
      fontFamily: FONTS.word,
      fontSize: '28px',
      color: COLORS.gold,
      stroke: '#1b1b3a',
      strokeThickness: 6,
    })
      .setOrigin(0.5)
      .setDepth(DEPTH);
  }

  noteTypedKill() {
    this.typedOnce = true;
  }

  update(run) {
    const step = this.stepFor(run);
    if (step === this.step) return;
    this.step = step;
    const { pad, start } = this.spots;
    if (step === 'build') this.show(pad.x, pad.y - 22, 'Build a Freeze Ray here!', pad.x + 40, pad.y - 80);
    else if (step === 'start') this.show(start.x, start.y - 30, 'Press Start Wave!', start.x - 60, start.y - 84);
    else if (step === 'type') this.show(null, null, 'Type the word on an alien to zap it!', GAME_WIDTH / 2, 530);
    else this.show(null, null, '', 0, 0);
  }

  stepFor(run) {
    if (run.wave !== 1) return 'done';
    if (run.phase === 'break') return Object.keys(run.towers).length === 0 ? 'build' : 'start';
    if (run.phase === 'wave' && !this.typedOnce) return 'type';
    return 'done';
  }

  show(arrowX, arrowY, message, textX, textY) {
    this.arrow.setVisible(arrowX !== null);
    if (arrowX !== null) this.arrow.setPosition(arrowX, arrowY);
    this.text.setText(message).setPosition(textX, textY).setVisible(message !== '');
  }
}
