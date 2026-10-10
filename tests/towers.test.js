import { describe, it, expect } from 'vitest';
import {
  TOWERS, TOWER_TYPES, MAX_LEVEL, DIRECTIONS_8, towerStats, availableTowers, pickTarget, slowAt, facingFor,
} from '../src/logic/towers.js';

describe('TOWERS', () => {
  it('matches the spec costs and unlocks', () => {
    expect(TOWER_TYPES).toEqual(['blaster', 'freeze', 'rocket']);
    expect(MAX_LEVEL).toBe(3);
    expect(TOWERS.blaster.costs).toEqual([20, 15, 25]);
    expect(TOWERS.freeze.costs).toEqual([30, 20, 30]);
    expect(TOWERS.rocket.costs).toEqual([40, 25, 35]);
    expect(TOWER_TYPES.map((t) => TOWERS[t].firstMission)).toEqual([1, 3, 5]);
    expect(TOWER_TYPES.map((t) => TOWERS[t].name)).toEqual(['Blaster', 'Freeze Ray', 'Rocket']);
  });
});

describe('towerStats', () => {
  it('gives a level-1 blaster 1 damage, 1 shot/s and 3 tiles of range', () => {
    expect(towerStats('blaster', 1)).toEqual({ range: 96, damage: 1, rate: 1, slow: 0, splash: 0, projectileSpeed: 480 });
  });

  it('adds 50% damage and 10% range per upgrade', () => {
    const l2 = towerStats('blaster', 2);
    const l3 = towerStats('blaster', 3);
    expect(l2.damage).toBeCloseTo(1.5);
    expect(l2.range).toBeCloseTo(105.6);
    expect(l3.damage).toBeCloseTo(2);
    expect(l3.range).toBeCloseTo(115.2);
  });

  it('raises the freeze slow per level and does no damage', () => {
    expect([1, 2, 3].map((l) => towerStats('freeze', l).slow)).toEqual([0.3, 0.45, 0.6]);
    expect(towerStats('freeze', 1)).toMatchObject({ range: 80, damage: 0, rate: 0 });
  });

  it('gives rockets splash damage', () => {
    expect(towerStats('rocket', 1)).toEqual({ range: 112, damage: 3, rate: 0.4, slow: 0, splash: 32, projectileSpeed: 300 });
  });
});

describe('availableTowers', () => {
  it('unlocks towers by mission', () => {
    expect(availableTowers(1)).toEqual(['blaster']);
    expect(availableTowers(2)).toEqual(['blaster']);
    expect(availableTowers(3)).toEqual(['blaster', 'freeze']);
    expect(availableTowers(5)).toEqual(['blaster', 'freeze', 'rocket']);
    expect(availableTowers(10)).toEqual(['blaster', 'freeze', 'rocket']);
  });
});

describe('pickTarget', () => {
  const origin = { x: 0, y: 0 };

  it('picks the in-range alien furthest along the path', () => {
    const a = { id: 1, x: 10, y: 0, distance: 50 };
    const b = { id: 2, x: 20, y: 0, distance: 80 };
    const far = { id: 3, x: 500, y: 0, distance: 999 };
    expect(pickTarget(origin, 96, [a, b, far])).toBe(b);
  });

  it('returns null when nothing is in range', () => {
    expect(pickTarget(origin, 96, [{ id: 1, x: 200, y: 0, distance: 1 }])).toBeNull();
  });
});

describe('slowAt', () => {
  it('uses the strongest covering freeze tower', () => {
    const towers = [
      { x: 0, y: 0, range: 80, slow: 0.3 },
      { x: 50, y: 0, range: 80, slow: 0.6 },
      { x: 900, y: 0, range: 80, slow: 0.9 },
    ];
    expect(slowAt({ x: 40, y: 0 }, towers)).toBe(0.6);
  });

  it('is 0 outside every range', () => {
    expect(slowAt({ x: 500, y: 500 }, [{ x: 0, y: 0, range: 80, slow: 0.3 }])).toBe(0);
  });
});

describe('facingFor', () => {
  it('maps vectors to the 8 sprite directions (y grows downward)', () => {
    expect(facingFor(1, 0)).toBe('east');
    expect(facingFor(1, 1)).toBe('south-east');
    expect(facingFor(0, 1)).toBe('south');
    expect(facingFor(-1, 1)).toBe('south-west');
    expect(facingFor(-1, 0)).toBe('west');
    expect(facingFor(-1, -1)).toBe('north-west');
    expect(facingFor(0, -1)).toBe('north');
    expect(facingFor(1, -1)).toBe('north-east');
  });

  it('lists all 8 directions', () => {
    expect(DIRECTIONS_8).toHaveLength(8);
  });
});
