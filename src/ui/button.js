import { addText, FILLS } from './text.js';
import { sfx } from '../audio/sfx.js';

export function addButton(scene, x, y, label, onClick, { width = 200, height = 48, fontSize = '16px', fill = FILLS.button } = {}) {
  const button = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const text = addText(scene, 0, 0, label, { fontSize }).setOrigin(0.5);
  const hit = scene.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true });
  let enabled = true;
  let hover = false;

  const draw = () => {
    const color = !enabled ? FILLS.disabled : hover ? lighten(fill) : fill;
    bg.clear();
    bg.fillStyle(color, 1).fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    bg.lineStyle(2, 0xffffff, enabled ? 0.9 : 0.3).strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    text.setAlpha(enabled ? 1 : 0.5);
  };

  hit.on('pointerover', () => {
    hover = true;
    draw();
  });
  hit.on('pointerout', () => {
    hover = false;
    draw();
  });
  hit.on('pointerdown', () => {
    if (!enabled) return;
    sfx.play('click');
    onClick();
  });

  button.add([bg, text, hit]);
  button.setEnabled = (on) => {
    enabled = Boolean(on);
    draw();
    return button;
  };
  button.setLabel = (value) => {
    text.setText(value);
    return button;
  };
  // Hidden buttons must also stop taking clicks.
  button.show = (on) => {
    button.setVisible(on);
    hit.input.enabled = on;
    return button;
  };
  draw();
  return button;
}

function lighten(color) {
  const channel = (shift) => Math.min(255, ((color >> shift) & 0xff) + 40);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
