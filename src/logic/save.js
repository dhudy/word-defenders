import { parseWordList, STARTER_WORDS } from './words.js';
import { MISSION_COUNT } from './missions.js';

export const SAVE_KEY = 'word-defenders:save';
export const SAVE_VERSION = 1;
export const SPEEDS = Object.freeze({ slow: 0.7, normal: 1, fast: 1.3 });

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    words: [...STARTER_WORDS],
    settings: { speed: 'normal', sound: true },
    missions: {},
  };
}

// Version 1 is the first format, so older or unversioned saves only need
// field validation. Future formats add their migration steps here.
export function validateSave(raw) {
  const save = defaultSave();
  if (!raw || typeof raw !== 'object') return save;

  if (Array.isArray(raw.words) && raw.words.every((w) => typeof w === 'string')) {
    const { words, errors } = parseWordList(raw.words.join('\n'));
    if (errors.length === 0) save.words = words;
  }

  const settings = raw.settings;
  if (settings && typeof settings === 'object') {
    if (Object.hasOwn(SPEEDS, settings.speed)) save.settings.speed = settings.speed;
    if (typeof settings.sound === 'boolean') save.settings.sound = settings.sound;
  }

  if (raw.missions && typeof raw.missions === 'object') {
    for (let id = 1; id <= MISSION_COUNT; id++) {
      const stars = raw.missions[id]?.stars;
      if (stars === 1 || stars === 2 || stars === 3) save.missions[id] = { stars };
    }
  }
  return save;
}

export function loadSave(storage) {
  try {
    const text = storage?.getItem(SAVE_KEY);
    if (!text) return defaultSave();
    return validateSave(JSON.parse(text));
  } catch {
    return defaultSave();
  }
}

export function writeSave(storage, save) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function createMemoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => {
      items.set(key, String(value));
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

export function openStorage(win = globalThis) {
  try {
    const local = win.localStorage;
    const probe = `${SAVE_KEY}:probe`;
    local.setItem(probe, '1');
    local.removeItem(probe);
    return { storage: local, persistent: true };
  } catch {
    return { storage: createMemoryStorage(), persistent: false };
  }
}

export function isUnlocked(save, id) {
  return id === 1 || Boolean(save.missions[id - 1]);
}

export function recordResult(save, id, stars) {
  const best = Math.max(stars, save.missions[id]?.stars ?? 0);
  return { ...save, missions: { ...save.missions, [id]: { stars: best } } };
}

export function resetProgress(save) {
  return { ...save, missions: {} };
}
