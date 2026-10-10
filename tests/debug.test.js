import { describe, it, expect } from 'vitest';
import { parseDebug } from '../src/logic/debug.js';

describe('parseDebug', () => {
  it('returns null without debug parameters', () => {
    expect(parseDebug('')).toBeNull();
    expect(parseDebug('?scene=Nowhere')).toBeNull();
  });

  it('starts a mission directly', () => {
    expect(parseDebug('?mission=4&wave=5&coins=999&hearts=2&autostart=1')).toEqual({
      scene: 'Game',
      data: { missionId: 4, wave: 5, coins: 999, hearts: 2, stars: 3, autostart: true },
    });
  });

  it('opens other scenes', () => {
    expect(parseDebug('?scene=Results&mission=2&stars=1')).toMatchObject({ scene: 'Results', data: { missionId: 2, stars: 1 } });
    expect(parseDebug('?scene=Title')).toMatchObject({ scene: 'Title' });
  });

  it('ignores out-of-range values', () => {
    expect(parseDebug('?mission=12&wave=9&coins=-5&hearts=0').data).toEqual({
      missionId: 1, wave: undefined, coins: undefined, hearts: undefined, stars: 3, autostart: false,
    });
  });
});
