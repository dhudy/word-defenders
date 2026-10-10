import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseSheet, cornerKey, buildTerrainLookup } from '../src/logic/sheets.js';
import { MAP_1, terrainCorners } from '../src/logic/map.js';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const range = (start, count) => Array.from({ length: count }, (_, i) => start + i);

describe('parseSheet', () => {
  const sheet = parseSheet(fixture('pixellab-sheet.json'));

  it('reads the cell size and column count', () => {
    expect(sheet).toMatchObject({ frameWidth: 92, frameHeight: 92, columns: 8 });
  });

  it('maps rotation directions to frame indices', () => {
    expect(sheet.rotations).toEqual({ south: 0, west: 1, east: 2, north: 3 });
  });

  it('maps each animation row to its frame indices', () => {
    expect(sheet.animations.walk).toEqual({
      south: range(8, 8),
      west: range(16, 8),
      east: range(24, 8),
      north: range(32, 8),
    });
  });
});

describe('terrain lookup', () => {
  const lookup = buildTerrainLookup(fixture('pixellab-tileset.json'));

  it('joins corners in NW, NE, SW, SE order', () => {
    expect(cornerKey({ SE: 'd', NW: 'a', SW: 'c', NE: 'b' })).toBe('a|b|c|d');
  });

  it('converts bounding boxes to spritesheet frame indices', () => {
    expect(lookup.size).toBe(16);
    expect(lookup.get('upper|upper|lower|upper')).toBe(0);
    expect(lookup.get('lower|lower|lower|lower')).toBe(6);
    expect(lookup.get('upper|upper|upper|upper')).toBe(12);
    expect(lookup.get('upper|lower|lower|upper')).toBe(14);
  });

  it('has a tile for every corner combination the map needs', () => {
    const needed = new Set(terrainCorners(MAP_1).flat().map(cornerKey));
    for (const key of needed) expect(lookup.has(key), key).toBe(true);
  });
});
