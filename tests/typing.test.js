import { describe, it, expect } from 'vitest';
import { normalizeKey, readKeyEvent, createTyping, pressKey, syncTyping } from '../src/logic/typing.js';

const TARGETS = [
  { id: 1, word: 'cat', distance: 100 },
  { id: 2, word: 'car', distance: 300 },
  { id: 3, word: "don't", distance: 50 },
];

function typeAll(keys, targets = TARGETS, start = createTyping()) {
  let state = start;
  const events = [];
  for (const k of keys) {
    const r = pressKey(state, k, targets);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

describe('normalizeKey', () => {
  it('lowercases letters', () => {
    expect(normalizeKey('A')).toBe('a');
    expect(normalizeKey('z')).toBe('z');
  });

  it('accepts apostrophes and hyphens', () => {
    expect(normalizeKey("'")).toBe("'");
    expect(normalizeKey('-')).toBe('-');
  });

  it('maps Escape', () => {
    expect(normalizeKey('Escape')).toBe('escape');
  });

  it('ignores modifiers, navigation, digits and space', () => {
    for (const k of ['Shift', 'CapsLock', 'Meta', 'Control', 'Alt', 'Tab', 'ArrowLeft', 'Enter', 'Backspace', ' ', '1', 'é']) {
      expect(normalizeKey(k)).toBeNull();
    }
  });
});

describe('readKeyEvent', () => {
  it('passes plain keys through', () => {
    expect(readKeyEvent({ key: 'a' })).toBe('a');
  });

  it('drops auto-repeat from a held key', () => {
    expect(readKeyEvent({ key: 'l', repeat: true })).toBeNull();
  });

  it('drops shortcut chords so the browser keeps them', () => {
    expect(readKeyEvent({ key: 'r', metaKey: true })).toBeNull();
    expect(readKeyEvent({ key: 'r', ctrlKey: true })).toBeNull();
    expect(readKeyEvent({ key: 'r', altKey: true })).toBeNull();
  });
});

describe('pressKey', () => {
  it('locks onto the matching alien furthest along the path', () => {
    const r = pressKey(createTyping(), 'c', TARGETS);
    expect(r.state).toEqual({ targetId: 2, index: 1 });
    expect(r.events).toEqual([{ type: 'lock', id: 2 }, { type: 'correct', id: 2, index: 0 }]);
    expect(r.handled).toBe(true);
  });

  it('buzzes on a first letter that matches nothing', () => {
    const r = pressKey(createTyping(), 'q', TARGETS);
    expect(r.state).toEqual(createTyping());
    expect(r.events).toEqual([{ type: 'miss' }]);
    expect(r.handled).toBe(true);
  });

  it('stays on the same letter after a wrong key', () => {
    const { state } = typeAll(['c']);
    const r = pressKey(state, 'x', TARGETS);
    expect(r.state).toEqual({ targetId: 2, index: 1 });
    expect(r.events).toEqual([{ type: 'wrong', id: 2, expected: 'a' }]);
  });

  it('completes a word and resets the lock', () => {
    const { state, events } = typeAll(['c', 'a', 'r']);
    expect(state).toEqual(createTyping());
    expect(events.slice(-2)).toEqual([{ type: 'correct', id: 2, index: 2 }, { type: 'complete', id: 2 }]);
  });

  it('ignores capital letters', () => {
    const { events } = typeAll(['C', 'A', 'R']);
    expect(events.at(-1)).toEqual({ type: 'complete', id: 2 });
  });

  it('matches capitalised words', () => {
    const { events } = typeAll(['m', 'o', 'n'], [{ id: 9, word: 'Mon', distance: 0 }]);
    expect(events.at(-1)).toEqual({ type: 'complete', id: 9 });
  });

  it('types apostrophes', () => {
    const { events } = typeAll(['d', 'o', 'n', "'", 't']);
    expect(events.at(-1)).toEqual({ type: 'complete', id: 3 });
  });

  it('releases on Escape', () => {
    const { state } = typeAll(['c']);
    const r = pressKey(state, 'Escape', TARGETS);
    expect(r.state).toEqual(createTyping());
    expect(r.events).toEqual([{ type: 'release', id: 2 }]);
    expect(r.handled).toBe(true);
  });

  it('ignores Shift mid-word without a wrong event', () => {
    const { state } = typeAll(['c']);
    const r = pressKey(state, 'Shift', TARGETS);
    expect(r).toEqual({ state, events: [], handled: false });
  });

  it('re-locks fresh when the locked alien is gone', () => {
    const r = pressKey({ targetId: 99, index: 2 }, 'c', TARGETS);
    expect(r.events).toEqual([
      { type: 'release', id: 99 },
      { type: 'lock', id: 2 },
      { type: 'correct', id: 2, index: 0 },
    ]);
  });

  it('picks the furthest alien when two share a word', () => {
    const twins = [
      { id: 1, word: 'cat', distance: 10 },
      { id: 2, word: 'cat', distance: 20 },
    ];
    expect(pressKey(createTyping(), 'c', twins).state.targetId).toBe(2);
  });

  it('completes a one-letter word on the first key', () => {
    const r = pressKey(createTyping(), 'a', [{ id: 5, word: 'a', distance: 0 }]);
    expect(r.events).toEqual([
      { type: 'lock', id: 5 },
      { type: 'correct', id: 5, index: 0 },
      { type: 'complete', id: 5 },
    ]);
    expect(r.state).toEqual(createTyping());
  });
});

describe('syncTyping', () => {
  it('releases when the target disappears', () => {
    const r = syncTyping({ targetId: 2, index: 1 }, [{ id: 1, word: 'cat', distance: 0 }]);
    expect(r).toEqual({ state: createTyping(), events: [{ type: 'release', id: 2 }] });
  });

  it('keeps the lock while the target exists', () => {
    const state = { targetId: 2, index: 1 };
    expect(syncTyping(state, TARGETS)).toEqual({ state, events: [] });
  });
});
