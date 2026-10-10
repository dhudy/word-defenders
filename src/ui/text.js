import { ZOOM } from './view.js';

export const FONTS = Object.freeze({ word: 'Andika', ui: '"PixelUI", monospace' });

export const COLORS = Object.freeze({
  text: '#ffffff',
  typed: '#3ddc84',
  next: '#ffd23f',
  wrong: '#ff5c5c',
  dim: '#9aa0c8',
  gold: '#ffd23f',
});

export const FILLS = Object.freeze({
  panel: 0x1b1b3a,
  panelEdge: 0x5b5bd6,
  button: 0x5b5bd6,
  go: 0x2e9e5b,
  quiet: 0x333355,
  disabled: 0x444466,
  locked: 0x333344,
});

export function addText(scene, x, y, content, style = {}) {
  return scene.add
    .text(x, y, content, { fontFamily: FONTS.ui, fontSize: '16px', color: COLORS.text, ...style })
    .setResolution(ZOOM);
}
