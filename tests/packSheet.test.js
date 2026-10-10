import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';
import { packSheet } from '../tools/pack-sheet-lib.mjs';
import { parseSheet } from '../src/logic/sheets.js';

function solid(width, height, [r, g, b]) {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) png.data.set([r, g, b, 255], i * 4);
  return png;
}

function pixel(png, x, y) {
  const i = (y * png.width + x) * 4;
  return [...png.data.subarray(i, i + 4)];
}

describe('packSheet', () => {
  const red = solid(2, 2, [255, 0, 0]);
  const blue = solid(4, 2, [0, 0, 255]);
  const { png, json } = packSheet([
    { type: 'rotations', frames: [{ direction: 'east', png: red }, { direction: 'west', png: blue }] },
    { type: 'animation', animation: 'explode', direction: 'south', frames: [{ png: red }, { png: red }, { png: blue }] },
  ]);

  it('uses the largest frame as a uniform cell', () => {
    expect([png.width, png.height]).toEqual([12, 4]);
    expect(json.spritesheet.cell_size).toEqual({ width: 4, height: 2 });
    expect(json.spritesheet.columns).toBe(3);
  });

  it('writes PixelLab-format rows that parseSheet understands', () => {
    expect(parseSheet(json)).toMatchObject({
      rotations: { east: 0, west: 1 },
      animations: { explode: { south: [3, 4, 5] } },
    });
  });

  it('centres frames in their cells on a transparent background', () => {
    expect(pixel(png, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(png, 1, 0)).toEqual([255, 0, 0, 255]);
    expect(pixel(png, 4, 0)).toEqual([0, 0, 255, 255]);
    expect(pixel(png, 8, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(png, 11, 3)).toEqual([0, 0, 255, 255]);
  });
});
