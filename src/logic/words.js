import { shuffle } from './rng.js';

export const MIN_WORDS = 5;
export const MAX_WORDS = 50;
export const MAX_WORD_LENGTH = 20;

export const STARTER_WORDS = Object.freeze([
  'after', 'again', 'around', 'because', 'before', 'could', 'every', 'friend',
  'house', 'little', 'people', 'their', 'there', 'water', 'would',
]);

// Letters, with apostrophes or hyphens allowed inside the word only.
const WORD_PATTERN = /^[a-z](?:[a-z'-]*[a-z])?$/i;
// Curly quotes that word processors substitute for a typed apostrophe.
const CURLY_APOSTROPHES = /['‘’ʼ]/g;

export function parseWordList(text) {
  const words = [];
  const seen = new Set();
  const errors = [];
  String(text ?? '')
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const word = raw.trim().replace(CURLY_APOSTROPHES, "'");
      if (word === '') return;
      const line = index + 1;
      if (!WORD_PATTERN.test(word)) {
        errors.push({ line, text: word, message: 'Use only letters, apostrophes and hyphens.' });
        return;
      }
      if (word.length > MAX_WORD_LENGTH) {
        errors.push({ line, text: word, message: `Keep words to ${MAX_WORD_LENGTH} letters or fewer.` });
        return;
      }
      const key = word.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      words.push(word);
    });
  if (errors.length === 0 && words.length < MIN_WORDS) {
    errors.push({ line: null, text: '', message: `Add at least ${MIN_WORDS} words.` });
  }
  if (errors.length === 0 && words.length > MAX_WORDS) {
    errors.push({ line: null, text: '', message: `Use ${MAX_WORDS} words or fewer.` });
  }
  return { words, errors };
}

// Draws every word once (shuffled) before any word repeats.
export function createDeck(words, rng) {
  let remaining = [];
  return {
    draw(onScreenFirstLetters = new Set()) {
      if (remaining.length === 0) remaining = shuffle(words, rng);
      let index = remaining.findIndex((word) => !onScreenFirstLetters.has(word[0].toLowerCase()));
      if (index === -1) index = 0;
      return remaining.splice(index, 1)[0];
    },
  };
}

export function pickBossWords(words, count, rng) {
  const byLength = words
    .map((word, index) => ({ word, index }))
    .sort((a, b) => b.word.length - a.word.length || a.index - b.index)
    .map((entry) => entry.word);
  const poolSize = Math.min(words.length, Math.max(Math.ceil(words.length / 3), count));
  return shuffle(byLength.slice(0, poolSize), rng).slice(0, count);
}
