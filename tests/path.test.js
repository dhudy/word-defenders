import { describe, it, expect } from 'vitest';
import { createPath, positionAt } from '../src/logic/path.js';

const L_PATH = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 50 },
];

describe('createPath', () => {
  it('sums segment lengths', () => {
    expect(createPath(L_PATH).length).toBe(150);
  });

  it('rejects diagonal segments', () => {
    expect(() => createPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toThrow(/right angles/);
  });
});

describe('positionAt', () => {
  const path = createPath(L_PATH);

  it('interpolates along the first segment', () => {
    expect(positionAt(path, 40)).toEqual({ x: 40, y: 0, dir: 'east' });
  });

  it('turns the corner', () => {
    expect(positionAt(path, 120)).toEqual({ x: 100, y: 20, dir: 'south' });
  });

  it('clamps to the ends', () => {
    expect(positionAt(path, -5)).toEqual({ x: 0, y: 0, dir: 'east' });
    expect(positionAt(path, 999)).toEqual({ x: 100, y: 50, dir: 'south' });
  });

  it('reports west and north', () => {
    const back = createPath([{ x: 50, y: 50 }, { x: 0, y: 50 }, { x: 0, y: 0 }]);
    expect(positionAt(back, 10).dir).toBe('west');
    expect(positionAt(back, 60).dir).toBe('north');
  });
});
