import { describe, it, expect } from 'vitest';
import {
  SAVE_KEY, SAVE_VERSION, SPEEDS, defaultSave, validateSave, loadSave, writeSave,
  createMemoryStorage, openStorage, isUnlocked, recordResult, resetProgress,
} from '../src/logic/save.js';
import { STARTER_WORDS } from '../src/logic/words.js';

const WORDS = ['cat', 'dog', 'house', 'water', 'friend'];

describe('defaults', () => {
  it('use the starter list, normal speed and sound on', () => {
    expect(SAVE_KEY).toBe('word-defenders:save');
    expect(SPEEDS).toEqual({ slow: 0.7, normal: 1, fast: 1.3 });
    expect(defaultSave()).toEqual({
      version: SAVE_VERSION,
      words: [...STARTER_WORDS],
      settings: { speed: 'normal', sound: true },
      missions: {},
    });
  });
});

describe('save and load', () => {
  it('round-trips', () => {
    const storage = createMemoryStorage();
    const save = { ...defaultSave(), words: WORDS, settings: { speed: 'slow', sound: false }, missions: { 1: { stars: 3 }, 2: { stars: 1 } } };
    expect(writeSave(storage, save)).toBe(true);
    expect(loadSave(storage)).toEqual(save);
  });

  it('returns defaults when nothing is saved', () => {
    expect(loadSave(createMemoryStorage())).toEqual(defaultSave());
  });

  it('returns defaults for invalid JSON', () => {
    const storage = createMemoryStorage();
    storage.setItem(SAVE_KEY, '{not json');
    expect(loadSave(storage)).toEqual(defaultSave());
  });

  it('returns defaults when storage throws', () => {
    const broken = { getItem: () => { throw new Error('denied'); } };
    expect(loadSave(broken)).toEqual(defaultSave());
    expect(writeSave({ setItem: () => { throw new Error('full'); } }, defaultSave())).toBe(false);
  });
});

describe('validateSave', () => {
  it('replaces only the invalid fields', () => {
    const save = validateSave({
      version: 1,
      words: ['ok', 'r2d2'],
      settings: { speed: 'turbo', sound: false },
      missions: { 1: { stars: 3 }, 2: { stars: 7 }, 99: { stars: 3 }, 3: 'x' },
    });
    expect(save.words).toEqual([...STARTER_WORDS]);
    expect(save.settings).toEqual({ speed: 'normal', sound: false });
    expect(save.missions).toEqual({ 1: { stars: 3 } });
  });

  it('upgrades a save without a version to the current version', () => {
    const save = validateSave({ words: WORDS, settings: { speed: 'fast', sound: true }, missions: { 1: { stars: 2 } } });
    expect(save).toEqual({ version: 1, words: WORDS, settings: { speed: 'fast', sound: true }, missions: { 1: { stars: 2 } } });
  });

  it('handles non-objects', () => {
    expect(validateSave(null)).toEqual(defaultSave());
    expect(validateSave('hello')).toEqual(defaultSave());
  });
});

describe('openStorage', () => {
  it('uses localStorage when it works', () => {
    const local = createMemoryStorage();
    expect(openStorage({ localStorage: local })).toEqual({ storage: local, persistent: true });
  });

  it('falls back to memory when localStorage throws', () => {
    const win = { get localStorage() { throw new Error('SecurityError'); } };
    const { storage, persistent } = openStorage(win);
    expect(persistent).toBe(false);
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
  });
});

describe('progress', () => {
  it('unlocks mission 1 always and later missions after the previous one has stars', () => {
    const save = { ...defaultSave(), missions: { 1: { stars: 1 } } };
    expect(isUnlocked(save, 1)).toBe(true);
    expect(isUnlocked(save, 2)).toBe(true);
    expect(isUnlocked(save, 3)).toBe(false);
  });

  it('keeps the best stars', () => {
    let save = recordResult(defaultSave(), 1, 2);
    save = recordResult(save, 1, 1);
    expect(save.missions[1]).toEqual({ stars: 2 });
    save = recordResult(save, 1, 3);
    expect(save.missions[1]).toEqual({ stars: 3 });
  });

  it('resets progress but keeps words and settings', () => {
    const save = { ...defaultSave(), words: WORDS, settings: { speed: 'slow', sound: false }, missions: { 1: { stars: 3 } } };
    expect(resetProgress(save)).toEqual({ ...save, missions: {} });
  });
});
