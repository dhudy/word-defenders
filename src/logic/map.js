import { createPath } from './path.js';

export const TILE = 32;
export const COLS = 32;
export const ROWS = 18;
export const HUD_ROWS = 2;
export const GAME_WIDTH = COLS * TILE;
export const GAME_HEIGHT = ROWS * TILE;

// Cell coordinates are [col, row]. The path runs from the portal (left) to the base (right).
export const MAP_1 = Object.freeze({
  waypoints: [[0, 4], [6, 4], [6, 13], [13, 13], [13, 6], [20, 6], [20, 14], [27, 14], [27, 9], [29, 9]],
  pads: [[4, 6], [8, 11], [11, 11], [15, 8], [18, 8], [22, 12], [25, 12], [29, 12]],
  portal: [0, 4],
  base: { col: 29, row: 8, cols: 3, rows: 3 },
});

export function cellCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

export function pathCells(map) {
  const cells = [];
  const seen = new Set();
  for (let i = 1; i < map.waypoints.length; i++) {
    const [c0, r0] = map.waypoints[i - 1];
    const [c1, r1] = map.waypoints[i];
    const dc = Math.sign(c1 - c0);
    const dr = Math.sign(r1 - r0);
    const steps = Math.abs(c1 - c0) + Math.abs(r1 - r0);
    for (let s = 0; s <= steps; s++) {
      const cell = [c0 + dc * s, r0 + dr * s];
      const key = cell.join(',');
      if (!seen.has(key)) {
        seen.add(key);
        cells.push(cell);
      }
    }
  }
  return cells;
}

export function buildPath(map) {
  return createPath(map.waypoints.map(([col, row]) => cellCenter(col, row)));
}

export function padPositions(map) {
  return map.pads.map(([col, row]) => cellCenter(col, row));
}

export function basePosition(map) {
  const { col, row, cols, rows } = map.base;
  return { x: (col + cols / 2) * TILE, y: (row + rows / 2) * TILE };
}

export function portalPosition(map) {
  return cellCenter(map.portal[0], map.portal[1]);
}

// Corner-based (Wang) autotiling: a grid vertex is path ("lower") when any
// cell touching it is a path cell; everything else is ground ("upper").
export function terrainCorners(map, cols = COLS, rows = ROWS) {
  const path = new Set(pathCells(map).map((cell) => cell.join(',')));
  const isPath = (c, r) => path.has(`${c},${r}`);
  const vertex = (vx, vy) =>
    isPath(vx - 1, vy - 1) || isPath(vx, vy - 1) || isPath(vx - 1, vy) || isPath(vx, vy) ? 'lower' : 'upper';
  const grid = [];
  for (let row = 0; row < rows; row++) {
    const line = [];
    for (let col = 0; col < cols; col++) {
      line.push({
        NW: vertex(col, row),
        NE: vertex(col + 1, row),
        SW: vertex(col, row + 1),
        SE: vertex(col + 1, row + 1),
      });
    }
    grid.push(line);
  }
  return grid;
}
