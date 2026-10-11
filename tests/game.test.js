import { describe, it, expect } from 'vitest';
import {
  createGame, towerOptions, build, upgrade, sell, startWave, update, key, retryWave, result, START_HEARTS,
} from '../src/logic/game.js';
import { lockableAliens } from '../src/logic/world.js';
import { createRng } from '../src/logic/rng.js';

const WORDS = ['after', 'again', 'because', 'could', 'every', 'friend', 'house', 'little', 'people', 'water'];

function newGame(opts = {}) {
  return createGame({ missionId: 1, words: WORDS, rng: createRng(7), ...opts });
}

// Types the word of whichever alien the first keypress locks onto.
function typeOne(run) {
  const targets = lockableAliens(run.world);
  if (targets.length === 0) return [];
  const events = [...key(run, targets[0].word[0]).events];
  const locked = lockableAliens(run.world).find((t) => t.id === run.typing.targetId);
  if (locked) for (const ch of locked.word.slice(run.typing.index)) events.push(...key(run, ch).events);
  return events;
}

// Steps the wave, typing every visible word, until the phase leaves 'wave'.
function playWave(run, { typing = true, maxSeconds = 300 } = {}) {
  const events = [];
  for (let t = 0; t < maxSeconds && run.phase === 'wave'; t += 0.1) {
    events.push(...update(run, 0.1));
    while (typing && run.phase === 'wave' && lockableAliens(run.world).length > 0) events.push(...typeOne(run));
  }
  return events;
}

function stepUntil(run, predicate, maxSeconds = 30) {
  for (let t = 0; t < maxSeconds && !predicate(); t += 0.1) update(run, 0.1);
}

describe('createGame', () => {
  it('starts in the break before wave 1 with 10 hearts and 30 coins', () => {
    const run = newGame();
    expect(run).toMatchObject({ phase: 'break', wave: 1, hearts: START_HEARTS, coins: 30, coinsEarned: 0, towers: {}, retried: false, world: null });
  });

  it('accepts debug wave, coins and hearts', () => {
    expect(newGame({ debug: { wave: 5, coins: 999, hearts: 1 } })).toMatchObject({ wave: 5, coins: 999, hearts: 1 });
  });
});

describe('building', () => {
  it('builds an available tower on an empty pad', () => {
    const run = newGame();
    expect(towerOptions(run)).toEqual(['freeze']);
    expect(build(run, 0, 'freeze')).toBe(true);
    expect(run.coins).toBe(0);
    expect(run.towers).toEqual({ 0: { type: 'freeze', level: 1 } });
  });

  it('refuses occupied pads, missing pads, locked towers and empty wallets', () => {
    const run = newGame({ debug: { coins: 999 } });
    build(run, 0, 'freeze');
    expect(build(run, 0, 'freeze')).toBe(false);
    expect(build(run, 99, 'freeze')).toBe(false);
    expect(build(run, 1, 'blaster')).toBe(false);
    expect(run.coins).toBe(969);
    run.coins = 29;
    expect(build(run, 1, 'freeze')).toBe(false);
    expect(run.coins).toBe(29);
  });

  it('upgrades and sells with the spec prices', () => {
    const run = newGame({ missionId: 3, debug: { coins: 100 } });
    build(run, 2, 'blaster');
    expect(upgrade(run, 2)).toBe(true);
    expect(upgrade(run, 2)).toBe(true);
    expect(upgrade(run, 2)).toBe(false);
    expect(run.coins).toBe(40);
    expect(sell(run, 2)).toBe(true);
    expect(run.coins).toBe(70);
    expect(run.towers).toEqual({});
  });

  it('refuses to build during a wave', () => {
    const run = newGame();
    startWave(run);
    expect(build(run, 0, 'freeze')).toBe(false);
  });
});

describe('waves', () => {
  it('starts a wave', () => {
    const run = newGame();
    expect(startWave(run)).toEqual([{ type: 'waveStarted', wave: 1 }]);
    expect(run.phase).toBe('wave');
    expect(startWave(run)).toEqual([]);
  });

  it('pays 5 coins for typing an alien', () => {
    const run = newGame();
    startWave(run);
    stepUntil(run, () => run.world.aliens.length > 0);
    const events = typeOne(run);
    expect(events).toContainEqual(expect.objectContaining({ type: 'kill', by: 'typing' }));
    expect(events).toContainEqual(expect.objectContaining({ type: 'coins', amount: 5 }));
    expect(run.coins).toBe(35);
  });

  it('ignores keys outside a wave', () => {
    expect(key(newGame(), 'a')).toEqual({ handled: false, events: [] });
  });

  it('clamps a long frame so aliens cannot jump to the base', () => {
    const run = newGame();
    startWave(run);
    stepUntil(run, () => run.world.aliens.length > 0);
    const before = run.world.aliens[0].distance;
    update(run, 30);
    expect(run.world.aliens).toHaveLength(1);
    expect(run.world.aliens[0].distance - before).toBeLessThan(10);
  });

  it('survives a non-finite frame time without corrupting alien positions', () => {
    const run = newGame();
    startWave(run);
    stepUntil(run, () => run.world.aliens.length > 0);
    const before = run.world.aliens[0].distance;
    expect(() => update(run, NaN)).not.toThrow();
    expect(run.world.aliens[0].distance).toBe(before);
    expect(() => update(run, Infinity)).not.toThrow();
    for (const alien of run.world.aliens) {
      expect(Number.isFinite(alien.distance)).toBe(true);
      expect(Number.isFinite(alien.x)).toBe(true);
      expect(Number.isFinite(alien.y)).toBe(true);
    }
    expect(run.world.aliens[0].distance - before).toBeLessThan(10);
  });

  it('clears a fully typed wave with a 10-coin bonus and moves to the next break', () => {
    const run = newGame();
    startWave(run);
    const events = playWave(run);
    expect(events).toContainEqual({ type: 'waveCleared', wave: 1, bonus: 10 });
    expect(run).toMatchObject({ phase: 'break', wave: 2, coins: 30 + 4 * 5 + 10, world: null });
  });

  it('clears the wave on the update after the last alien is typed', () => {
    const run = newGame();
    startWave(run);
    for (let t = 0; t < 60; t += 0.1) {
      update(run, 0.1);
      if (run.world.pending.length === 0 && run.world.aliens.length > 0) break;
    }
    while (lockableAliens(run.world).length > 0) typeOne(run);
    expect(run.phase).toBe('wave');
    expect(update(run, 0.1)).toContainEqual({ type: 'waveCleared', wave: 1, bonus: 10 });
    expect(run.phase).toBe('break');
  });

  it('releases a lock when a tower kills the locked alien', () => {
    const run = newGame({ missionId: 3, debug: { coins: 999 } });
    for (let pad = 0; pad < 8; pad++) build(run, pad, 'blaster');
    startWave(run);
    stepUntil(run, () => run.world.aliens.length > 0);
    const first = lockableAliens(run.world)[0];
    key(run, first.word[0]);
    const lockedId = run.typing.targetId;
    let released = false;
    for (let t = 0; t < 40 && !released; t += 0.1) {
      released = update(run, 0.1).some((e) => e.type === 'release' && e.id === lockedId);
    }
    expect(released).toBe(true);
    expect(run.typing.targetId).toBeNull();
  });
});

describe('failing and retrying', () => {
  it('fails the wave at 0 hearts and retries from the wave-start snapshot', () => {
    // A Freeze Ray does no damage, so untyped aliens are sure to leak.
    const run = newGame({ missionId: 3, debug: { coins: 50 } });
    build(run, 0, 'freeze');
    startWave(run);
    stepUntil(run, () => run.world.aliens.length > 0);
    typeOne(run);
    expect(run.coins).toBe(25);
    run.hearts = 1;
    const events = playWave(run, { typing: false });
    expect(events).toContainEqual({ type: 'waveFailed', wave: 1 });
    expect(run).toMatchObject({ phase: 'failed', hearts: 0, world: null });
    expect(sell(run, 0)).toBe(false);
    expect(retryWave(run)).toBe(true);
    expect(run).toMatchObject({
      phase: 'break', wave: 1, hearts: 10, coins: 20, coinsEarned: 0, retried: true,
      towers: { 0: { type: 'freeze', level: 1 } },
    });
    expect(retryWave(run)).toBe(false);
  });

  it('caps a retried mission at 1 star', () => {
    const run = newGame();
    run.retried = true;
    expect(result(run).stars).toBe(1);
  });
});

describe('boss wave', () => {
  it('lets typing finish the boss while no shooting tower is unlocked', () => {
    const run = newGame({ debug: { wave: 5 } });
    startWave(run);
    const events = playWave(run);
    expect(events).toContainEqual(expect.objectContaining({ type: 'kill', alienType: 'boss', by: 'typing' }));
    expect(events).toContainEqual(expect.objectContaining({ type: 'coins', amount: 25 }));
    expect(events.find((e) => e.type === 'missionWon')).toEqual({ type: 'missionWon', stars: 3, coinsEarned: 3 * 5 + 25 + 10, hearts: 10 });
  });

  it('wins the mission when the boss leaks with hearts left', () => {
    const run = newGame({ missionId: 3, debug: { wave: 5 } });
    startWave(run);
    const events = playWave(run);
    const won = events.find((e) => e.type === 'missionWon');
    expect(won).toEqual({ type: 'missionWon', stars: 2, coinsEarned: 4 * 5 + 10, hearts: 5 });
    expect(events.filter((e) => e.type === 'shieldPop')).toHaveLength(1);
    expect(run.phase).toBe('won');
  });

  it('pays 25 coins when towers finish the boss', () => {
    const run = newGame({ missionId: 3, debug: { wave: 5, coins: 999 } });
    for (let pad = 0; pad < 8; pad++) {
      build(run, pad, 'blaster');
      upgrade(run, pad);
      upgrade(run, pad);
    }
    startWave(run);
    const events = playWave(run);
    expect(events).toContainEqual(expect.objectContaining({ type: 'kill', alienType: 'boss', by: 'tower' }));
    expect(events).toContainEqual(expect.objectContaining({ type: 'coins', amount: 25 }));
    expect(events.find((e) => e.type === 'missionWon')).toMatchObject({ stars: 3, hearts: 10 });
  });
});
