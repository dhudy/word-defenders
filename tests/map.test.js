import { describe, it, expect } from 'vitest';
import {
  MAP_1, TILE, COLS, ROWS, HUD_ROWS, GAME_WIDTH, GAME_HEIGHT,
  cellCenter, pathCells, buildPath, padPositions, basePosition, portalPosition, terrainCorners,
} from '../src/logic/map.js';

const chebyshev = ([c1, r1], [c2, r2]) => Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2));

describe('grid', () => {
  it('is 32x18 tiles of 32px', () => {
    expect([TILE, COLS, ROWS, GAME_WIDTH, GAME_HEIGHT]).toEqual([32, 32, 18, 1024, 576]);
  });

  it('centres cells', () => {
    expect(cellCenter(0, 4)).toEqual({ x: 16, y: 144 });
  });
});

describe('MAP_1 path', () => {
  it('is 58 tiles long from the portal to the base', () => {
    const path = buildPath(MAP_1);
    expect(path.length).toBe(58 * TILE);
    expect(path.points[0]).toEqual(portalPosition(MAP_1));
    expect(path.points.at(-1)).toEqual({ x: 944, y: 304 });
  });

  it('covers 59 distinct cells', () => {
    const cells = pathCells(MAP_1);
    expect(cells).toHaveLength(59);
    expect(new Set(cells.map(String)).size).toBe(59);
  });
});

describe('MAP_1 pads', () => {
  const cells = pathCells(MAP_1);

  it('has 8 pads inside the playfield', () => {
    expect(MAP_1.pads).toHaveLength(8);
    for (const [c, r] of MAP_1.pads) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(COLS);
      expect(r).toBeGreaterThanOrEqual(HUD_ROWS);
      expect(r).toBeLessThan(ROWS);
    }
  });

  it('keeps every pad exactly 2 tiles from the path (on grass, in Blaster range)', () => {
    for (const pad of MAP_1.pads) {
      const nearest = Math.min(...cells.map((cell) => chebyshev(pad, cell)));
      expect(nearest).toBe(2);
    }
  });

  it('keeps pads off the base', () => {
    const { col, row, cols, rows } = MAP_1.base;
    for (const [c, r] of MAP_1.pads) {
      const inside = c >= col && c < col + cols && r >= row && r < row + rows;
      expect(inside).toBe(false);
    }
  });

  it('converts pads to pixel centres', () => {
    expect(padPositions(MAP_1)[0]).toEqual(cellCenter(4, 6));
  });
});

describe('basePosition', () => {
  it('is the centre of the 3x3 base area', () => {
    expect(basePosition(MAP_1)).toEqual({ x: 976, y: 304 });
  });
});

describe('terrainCorners', () => {
  const grid = terrainCorners(MAP_1);

  it('has one entry per cell', () => {
    expect(grid).toHaveLength(ROWS);
    expect(grid[0]).toHaveLength(COLS);
  });

  it('marks all corners of a path cell as path', () => {
    expect(grid[4][3]).toEqual({ NW: 'lower', NE: 'lower', SW: 'lower', SE: 'lower' });
  });

  it('marks the bottom corners of the cell above the path', () => {
    expect(grid[3][3]).toEqual({ NW: 'upper', NE: 'upper', SW: 'lower', SE: 'lower' });
  });

  it('marks cells two away as ground', () => {
    expect(grid[2][3]).toEqual({ NW: 'upper', NE: 'upper', SW: 'upper', SE: 'upper' });
  });
});
