import { addText, FONTS, FILLS } from './text.js';
import { addButton } from './button.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';

const DEPTH = 40000;

// Centred message box that blocks clicks underneath. Returns a close function.
export function showModal(scene, { message, buttons }) {
  const shade = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
    .setInteractive()
    .setDepth(DEPTH);
  const panel = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(DEPTH + 1);
  const bg = scene.add.graphics();
  bg.fillStyle(FILLS.panel, 0.97).fillRoundedRect(-280, -120, 560, 240, 18);
  bg.lineStyle(3, FILLS.panelEdge, 1).strokeRoundedRect(-280, -120, 560, 240, 18);
  const text = addText(scene, 0, -40, message, {
    fontFamily: FONTS.word,
    fontSize: '28px',
    align: 'center',
    wordWrap: { width: 500 },
  }).setOrigin(0.5);
  panel.add([bg, text]);
  buttons.forEach((b, i) => {
    const x = (i - (buttons.length - 1) / 2) * 220;
    panel.add(addButton(scene, x, 70, b.label, b.onClick, { width: 200, height: 52 }));
  });
  return () => {
    shade.destroy();
    panel.destroy();
  };
}
