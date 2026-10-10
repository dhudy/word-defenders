import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  SPRITES, IMAGES, FONT_FILES, ALIEN_TYPES, ALIEN_SPRITES, TOWER_SPRITES, LABEL_OFFSETS, alienSpriteKey,
} from '../src/assets.js';
import { parseSheet, buildTerrainLookup, cornerKey } from '../src/logic/sheets.js';
import { DIRECTIONS_8 } from '../src/logic/towers.js';
import { MAP_1, terrainCorners } from '../src/logic/map.js';

const publicPath = (p) => fileURLToPath(new URL(`../public/${p}`, import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(publicPath(p), 'utf8'));

describe('asset keys', () => {
  it('lists 5 alien sprites (two bosses), 9 towers and the explosion', () => {
    expect(ALIEN_SPRITES).toEqual(['alien-blob', 'alien-zoomer', 'alien-chonk', 'alien-boss', 'alien-boss-2']);
    expect(SPRITES).toHaveLength(15);
    expect(TOWER_SPRITES).toHaveLength(9);
    expect(Object.keys(LABEL_OFFSETS).sort()).toEqual([...ALIEN_TYPES].sort());
  });

  it('switches to the second boss from mission 6', () => {
    expect(alienSpriteKey('boss', 1)).toBe('alien-boss');
    expect(alienSpriteKey('boss', 5)).toBe('alien-boss');
    expect(alienSpriteKey('boss', 6)).toBe('alien-boss-2');
    expect(alienSpriteKey('boss', 10)).toBe('alien-boss-2');
    expect(alienSpriteKey('chonk', 9)).toBe('alien-chonk');
    expect(alienSpriteKey('blob')).toBe('alien-blob');
  });
});

describe('shipped assets', () => {
  it('has a PNG and JSON for every sprite sheet', () => {
    for (const key of SPRITES) {
      expect(existsSync(publicPath(`assets/sprites/${key}.png`)), `${key}.png`).toBe(true);
      expect(existsSync(publicPath(`assets/sprites/${key}.json`)), `${key}.json`).toBe(true);
    }
  });

  it('gives every alien sprite a 4-direction walk', () => {
    for (const key of ALIEN_SPRITES) {
      const sheet = parseSheet(readJson(`assets/sprites/${key}.json`));
      expect(Object.keys(sheet.animations.walk ?? {}).sort(), key).toEqual(['east', 'north', 'south', 'west']);
    }
  });

  it('gives every tower 8 rotations', () => {
    for (const key of TOWER_SPRITES) {
      const sheet = parseSheet(readJson(`assets/sprites/${key}.json`));
      expect(Object.keys(sheet.rotations).sort(), key).toEqual([...DIRECTIONS_8].sort());
    }
  });

  it('has an explosion animation', () => {
    const sheet = parseSheet(readJson('assets/sprites/fx-explosion.json'));
    expect(sheet.animations.explode.south.length).toBeGreaterThanOrEqual(4);
  });

  it('has every image', () => {
    for (const key of IMAGES) expect(existsSync(publicPath(`assets/images/${key}.png`)), key).toBe(true);
  });

  it('has terrain for every corner combination on the map', () => {
    const lookup = buildTerrainLookup(readJson('assets/terrain/terrain.json'));
    for (const key of new Set(terrainCorners(MAP_1).flat().map(cornerKey))) expect(lookup.has(key), key).toBe(true);
    expect(existsSync(publicPath('assets/terrain/terrain.png'))).toBe(true);
  });

  it('has the pixel font', () => {
    for (const url of Object.values(FONT_FILES)) expect(existsSync(publicPath(url)), url).toBe(true);
  });
});
