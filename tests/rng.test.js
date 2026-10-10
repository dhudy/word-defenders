import { describe, it, expect } from 'vitest';
import { createRng, shuffle, pickWeighted } from '../src/logic/rng.js';

describe('createRng', () => {
  it('is deterministic for a seed and stays in [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    const valuesA = Array.from({ length: 100 }, a);
    const valuesB = Array.from({ length: 100 }, b);
    expect(valuesA).toEqual(valuesB);
    expect(valuesA.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('differs between seeds', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, createRng(3));
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('pickWeighted', () => {
  it('only returns keys with positive weight', () => {
    const rng = createRng(9);
    for (let i = 0; i < 200; i++) {
      expect(['blob', 'zoomer']).toContain(pickWeighted({ blob: 3, zoomer: 1, chonk: 0 }, rng));
    }
  });

  it('roughly follows the weights', () => {
    const rng = createRng(11);
    let blobs = 0;
    for (let i = 0; i < 4000; i++) if (pickWeighted({ blob: 3, zoomer: 1 }, rng) === 'blob') blobs += 1;
    expect(blobs / 4000).toBeGreaterThan(0.7);
    expect(blobs / 4000).toBeLessThan(0.8);
  });
});
