const TYPABLE = /^[a-z'-]$/;

export function normalizeKey(key) {
  if (key === 'Escape') return 'escape';
  if (typeof key !== 'string' || key.length !== 1) return null;
  const lower = key.toLowerCase();
  return TYPABLE.test(lower) ? lower : null;
}

// Held-key auto-repeat and shortcut chords are not typing.
export function readKeyEvent(event) {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return null;
  return event.key;
}

export function createTyping() {
  return { targetId: null, index: 0 };
}

// targets: aliens that currently show a word, as { id, word, distance }.
export function pressKey(state, key, targets) {
  const k = normalizeKey(key);
  if (k === null) return { state, events: [], handled: false };

  if (k === 'escape') {
    if (state.targetId === null) return { state, events: [], handled: true };
    return { state: createTyping(), events: [{ type: 'release', id: state.targetId }], handled: true };
  }

  if (state.targetId === null) {
    const matches = targets.filter((t) => t.word[0].toLowerCase() === k);
    if (matches.length === 0) return { state, events: [{ type: 'miss' }], handled: true };
    const target = matches.reduce((best, t) => (t.distance > best.distance ? t : best));
    return advance({ targetId: target.id, index: 0 }, target, [{ type: 'lock', id: target.id }]);
  }

  const target = targets.find((t) => t.id === state.targetId);
  if (!target) {
    const fresh = pressKey(createTyping(), key, targets);
    return { ...fresh, events: [{ type: 'release', id: state.targetId }, ...fresh.events] };
  }

  const expected = target.word[state.index];
  if (expected.toLowerCase() === k) return advance(state, target, []);
  return { state, events: [{ type: 'wrong', id: target.id, expected }], handled: true };
}

export function syncTyping(state, targets) {
  if (state.targetId === null || targets.some((t) => t.id === state.targetId)) {
    return { state, events: [] };
  }
  return { state: createTyping(), events: [{ type: 'release', id: state.targetId }] };
}

function advance(state, target, events) {
  const out = [...events, { type: 'correct', id: target.id, index: state.index }];
  const index = state.index + 1;
  if (index >= target.word.length) {
    return { state: createTyping(), events: [...out, { type: 'complete', id: target.id }], handled: true };
  }
  return { state: { targetId: target.id, index }, events: out, handled: true };
}
