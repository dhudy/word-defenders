import { describe, it, expect } from 'vitest';
import {
  parseWordList, createDeck, pickBossWords, STARTER_WORDS, MIN_WORDS, MAX_WORDS, MAX_WORD_LENGTH,
} from '../src/logic/words.js';
import { createRng } from '../src/logic/rng.js';

const BAD_CHARS = 'Use only letters, apostrophes and hyphens.';

describe('constants', () => {
  it('match the spec', () => {
    expect([MIN_WORDS, MAX_WORDS, MAX_WORD_LENGTH]).toEqual([5, 50, 20]);
    expect(STARTER_WORDS).toEqual([
      'after', 'again', 'around', 'because', 'before', 'could', 'every', 'friend',
      'house', 'little', 'people', 'their', 'there', 'water', 'would',
    ]);
  });

  it('starter list is itself valid', () => {
    expect(parseWordList(STARTER_WORDS.join('\n'))).toEqual({ words: STARTER_WORDS, errors: [] });
  });
});

describe('parseWordList', () => {
  it('trims, drops blank lines and case-insensitive duplicates, keeping the first spelling', () => {
    const { words, errors } = parseWordList('  because\n\nFriend\nfriend\nagain\n house \nwater\n');
    expect(errors).toEqual([]);
    expect(words).toEqual(['because', 'Friend', 'again', 'house', 'water']);
  });

  it('accepts Windows line endings and curly apostrophes from pasted documents', () => {
    const { words, errors } = parseWordList('don’t\r\ncan‘t\r\nit’s\r\nhouse\r\nwater');
    expect(errors).toEqual([]);
    expect(words).toEqual(["don't", "can't", "it's", 'house', 'water']);
  });


  it('accepts hyphens and one-letter words', () => {
    const { words, errors } = parseWordList('a\nI\nice-cream\nhouse\nwater');
    expect(errors).toEqual([]);
    expect(words).toEqual(['a', 'I', 'ice-cream', 'house', 'water']);
  });

  it('reports bad characters with the 1-based line number', () => {
    const { errors } = parseWordList('house\nice cream\nwater\nfriend\nagain\nr2d2');
    expect(errors).toEqual([
      { line: 2, text: 'ice cream', message: BAD_CHARS },
      { line: 6, text: 'r2d2', message: BAD_CHARS },
    ]);
  });

  it('rejects words that start or end with punctuation', () => {
    const { errors } = parseWordList("'til\nhouse\nwater\nfriend\nagain\nmom-");
    expect(errors.map((e) => e.line)).toEqual([1, 6]);
  });

  it('rejects words longer than 20 characters', () => {
    const long = 'supercalifragilistics';
    expect(long).toHaveLength(21);
    const { errors } = parseWordList(`${long}\nhouse\nwater\nfriend\nagain`);
    expect(errors).toEqual([{ line: 1, text: long, message: 'Keep words to 20 letters or fewer.' }]);
  });

  it('requires at least 5 words', () => {
    expect(parseWordList('house\nwater\nfriend\nagain').errors).toEqual([
      { line: null, text: '', message: 'Add at least 5 words.' },
    ]);
  });

  it('allows at most 50 words', () => {
    const letter = (n) => String.fromCharCode(97 + n);
    const text = Array.from({ length: 51 }, (_, i) => `word${letter(i % 26)}${letter(Math.floor(i / 26))}`).join('\n');
    expect(parseWordList(text).errors).toEqual([{ line: null, text: '', message: 'Use 50 words or fewer.' }]);
  });

  it('skips the count check while there are line errors', () => {
    expect(parseWordList('r2d2').errors).toEqual([{ line: 1, text: 'r2d2', message: BAD_CHARS }]);
  });
});

describe('createDeck', () => {
  it('uses every word once before repeating, across reshuffles', () => {
    const words = ['after', 'again', 'because', 'could', 'every', 'friend'];
    const deck = createDeck(words, createRng(1));
    for (let round = 0; round < 3; round++) {
      const drawn = Array.from({ length: words.length }, () => deck.draw(new Set()));
      expect([...drawn].sort()).toEqual([...words].sort());
    }
  });

  it('prefers a word whose first letter is not already on screen', () => {
    const deck = createDeck(['apple', 'ant', 'axe', 'bee'], createRng(2));
    expect(deck.draw(new Set(['a']))).toBe('bee');
  });

  it('compares first letters case-insensitively', () => {
    const deck = createDeck(['Apple', 'bee'], createRng(5));
    expect(deck.draw(new Set(['a']))).toBe('bee');
  });

  it('falls back to the next word when every first letter is taken', () => {
    const deck = createDeck(['apple', 'ant'], createRng(3));
    expect(['apple', 'ant']).toContain(deck.draw(new Set(['a'])));
  });

  it('keeps drawing from a 5-word list beyond its length', () => {
    const words = ['cat', 'dog', 'house', 'water', 'friend'];
    const deck = createDeck(words, createRng(8));
    const drawn = Array.from({ length: 23 }, () => deck.draw(new Set()));
    expect(drawn.every((w) => words.includes(w))).toBe(true);
  });
});

describe('pickBossWords', () => {
  it('draws distinct words from the longest third of the list', () => {
    const words = ['a', 'be', 'cat', 'dogs', 'horse', 'friend', 'because', 'beautiful', 'everybody'];
    const picked = pickBossWords(words, 2, createRng(4));
    expect(new Set(picked).size).toBe(2);
    for (const w of picked) expect(['beautiful', 'everybody', 'because']).toContain(w);
  });

  it('widens the pool when the longest third is smaller than the shield count', () => {
    const words = ['cat', 'dog', 'house', 'water', 'friend'];
    const picked = pickBossWords(words, 3, createRng(5));
    expect(new Set(picked).size).toBe(3);
    for (const w of picked) expect(['friend', 'house', 'water']).toContain(w);
  });
});
