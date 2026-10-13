import { describe, it, expect, vi } from 'vitest';
import { createWorld, stepWorld, zapAlien, lockableAliens } from '../src/logic/world.js';
import { createPath } from '../src/logic/path.js';

const path = createPath([{ x: 0, y: 0 }, { x: 300, y: 0 }]);

function cycle(list) {
  let i = 0;
  return () => list[i++ % list.length];
}

function run(world, seconds, dt = 0.1) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) events.push(...stepWorld(world, dt));
  return events;
}

describe('spawning', () => {
  it('spawns aliens on schedule with a drawn word', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 1 }, { type: 'blob', at: 2 }], drawWord: cycle(['cat', 'dog']) });
    expect(stepWorld(world, 0.5)).toEqual([]);
    const events = stepWorld(world, 0.6);
    expect(events).toEqual([{ type: 'spawn', id: 1, alienType: 'blob' }]);
    expect(world.aliens.map((a) => a.word)).toEqual(['cat']);
  });

  it('tells drawWord which first letters are on screen', () => {
    const drawWord = vi.fn(cycle(['Cat', 'dog']));
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }, { type: 'blob', at: 1 }], drawWord });
    run(world, 1.5);
    expect(drawWord).toHaveBeenNthCalledWith(1, new Set());
    expect(drawWord).toHaveBeenNthCalledWith(2, new Set(['c']));
  });

  it('gives a boss its shield words and boss HP', () => {
    const world = createWorld({ path, spawns: [{ type: 'boss', at: 0 }], drawWord: cycle(['x']), bossWords: ['because', 'friend'] });
    stepWorld(world, 0.1);
    expect(world.aliens[0]).toMatchObject({ type: 'boss', word: 'because', shieldWords: ['because', 'friend'], shieldIndex: 0, hp: 40, maxHp: 40 });
  });
});

describe('movement', () => {
  it('moves a blob path.length / 30 px per second', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']) });
    stepWorld(world, 1);
    expect(world.aliens[0].x).toBeCloseTo(10);
    expect(world.aliens[0].dir).toBe('east');
  });

  it('multiplies world speed and alien speed', () => {
    const world = createWorld({ path, spawns: [{ type: 'zoomer', at: 0 }], speed: 2, drawWord: cycle(['cat']) });
    stepWorld(world, 1);
    expect(world.aliens[0].x).toBeCloseTo(32);
  });

  it('leaks aliens that reach the end', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']) });
    const events = run(world, 31, 1);
    expect(events).toContainEqual({ type: 'leak', id: 1, alienType: 'blob', hearts: 1 });
    expect(world.aliens).toEqual([]);
  });

  it('charges 5 hearts for a boss leak', () => {
    const world = createWorld({ path, spawns: [{ type: 'boss', at: 0 }], drawWord: cycle(['x']), bossWords: ['because'] });
    const events = run(world, 61, 1);
    expect(events).toContainEqual({ type: 'leak', id: 1, alienType: 'boss', hearts: 5 });
  });

  it('walks dizzy aliens at half speed, on top of any freeze slow', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']) });
    stepWorld(world, 0);
    world.aliens[0].dizzy = true;
    stepWorld(world, 1);
    expect(world.aliens[0].x).toBeCloseTo(5);
    const frozen = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']), towers: [{ pad: 0, type: 'freeze', level: 1, x: 0, y: 0 }] });
    stepWorld(frozen, 0);
    frozen.aliens[0].dizzy = true;
    stepWorld(frozen, 1);
    expect(frozen.aliens[0].x).toBeCloseTo(3.5);
  });

  it('slows aliens inside a freeze tower range', () => {
    const towers = [{ pad: 0, type: 'freeze', level: 1, x: 0, y: 0 }];
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']), towers });
    const events = stepWorld(world, 1);
    expect(world.aliens[0].slow).toBe(0.3);
    expect(world.aliens[0].x).toBeCloseTo(7);
    expect(events).toContainEqual({ type: 'chill', id: 1, x: 0, y: 0 });
    expect(stepWorld(world, 0.1).some((e) => e.type === 'chill')).toBe(false);
  });
});

describe('towers', () => {
  it('a blaster wears an alien down to 1 HP and makes it dizzy, but never kills it', () => {
    const towers = [{ pad: 3, type: 'blaster', level: 1, x: 50, y: 40 }];
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']), towers });
    const events = run(world, 5);
    expect(events.filter((e) => e.type === 'fire')).toHaveLength(2);
    expect(events.find((e) => e.type === 'fire')).toMatchObject({ pad: 3, towerType: 'blaster' });
    expect(events.filter((e) => e.type === 'dizzy')).toEqual([{ type: 'dizzy', id: 1, x: expect.any(Number), y: 0 }]);
    expect(events.some((e) => e.type === 'kill')).toBe(false);
    expect(world.aliens[0]).toMatchObject({ hp: 1, dizzy: true });
  });

  it('stops tower damage at 1 HP even when a hit would overshoot it', () => {
    const towers = [{ pad: 0, type: 'rocket', level: 3, x: 50, y: 40 }];
    const world = createWorld({ path, spawns: [{ type: 'zoomer', at: 0 }], drawWord: cycle(['cat']), towers });
    run(world, 3);
    expect(world.aliens[0]).toMatchObject({ hp: 1, dizzy: true });
  });

  it('blasters skip dizzy aliens and shoot the next one', () => {
    const towers = [{ pad: 0, type: 'blaster', level: 1, x: 50, y: 40 }];
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }, { type: 'blob', at: 0.5 }], drawWord: cycle(['cat', 'dog']), towers });
    run(world, 1.5);
    expect(world.aliens.map((a) => [a.hp, a.dizzy])).toEqual([[1, true], [3, false]]);
    run(world, 1);
    expect(world.aliens.map((a) => a.hp)).toEqual([1, 2]);
  });

  it('turns towers to face their target', () => {
    const towers = [{ pad: 0, type: 'blaster', level: 1, x: -60, y: 0 }];
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']), towers });
    stepWorld(world, 0.1);
    expect(world.towers[0].facing).toBe('east');
  });

  it('ignores a shielded boss', () => {
    const towers = [{ pad: 0, type: 'blaster', level: 1, x: 20, y: 40 }];
    const world = createWorld({ path, spawns: [{ type: 'boss', at: 0 }], drawWord: cycle(['x']), bossWords: ['because'], towers });
    const events = run(world, 3);
    expect(events.filter((e) => e.type === 'fire')).toEqual([]);
  });

  it('splash damage from a rocket hits neighbours', () => {
    const towers = [{ pad: 0, type: 'rocket', level: 1, x: 100, y: 40 }];
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }, { type: 'blob', at: 0.1 }], drawWord: cycle(['cat', 'dog']), towers });
    const events = run(world, 1);
    expect(events.filter((e) => e.type === 'dizzy')).toHaveLength(2);
    expect(world.aliens.map((a) => a.hp)).toEqual([1, 1]);
    expect(events.find((e) => e.type === 'hit')).toMatchObject({ splash: true });
  });

  it('projectiles fizzle when their target dies first', () => {
    const towers = [{ pad: 0, type: 'blaster', level: 1, x: 90, y: 0 }];
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']), towers });
    const fired = stepWorld(world, 0.01);
    expect(fired.some((e) => e.type === 'fire')).toBe(true);
    zapAlien(world, 1);
    expect(stepWorld(world, 0.01)).toContainEqual({ type: 'fizzle', projectileId: fired.find((e) => e.type === 'fire').projectileId });
  });
});

describe('zapAlien', () => {
  it('kills a regular alien with typing credit', () => {
    const world = createWorld({ path, spawns: [{ type: 'chonk', at: 0 }], drawWord: cycle(['cat']) });
    stepWorld(world, 0.1);
    const [kill] = zapAlien(world, 1);
    expect(kill).toMatchObject({ type: 'kill', id: 1, alienType: 'chonk', by: 'typing' });
    expect(world.aliens).toEqual([]);
  });

  it('pops boss shields one word at a time, then shows a list word and lets towers hit it', () => {
    const towers = [{ pad: 0, type: 'blaster', level: 1, x: 20, y: 40 }];
    const world = createWorld({ path, spawns: [{ type: 'boss', at: 0 }], drawWord: cycle(['robot']), bossWords: ['because', 'friend'], towers });
    stepWorld(world, 0.1);
    expect(zapAlien(world, 1)).toEqual([{ type: 'shieldPop', id: 1, remaining: 1, x: world.aliens[0].x, y: 0 }]);
    expect(world.aliens[0].word).toBe('friend');
    expect(zapAlien(world, 1)[0]).toMatchObject({ type: 'shieldPop', remaining: 0 });
    expect(world.aliens[0].word).toBe('robot');
    const events = run(world, 1);
    expect(events.some((e) => e.type === 'fire')).toBe(true);
  });

  it('takes 10 HP per typed word once the shields are down, with a new word each time', () => {
    const world = createWorld({ path, spawns: [{ type: 'boss', at: 0 }], drawWord: cycle(['cat', 'dog', 'egg']), bossWords: ['because'] });
    stepWorld(world, 0.1);
    zapAlien(world, 1);
    const boss = world.aliens[0];
    expect(boss).toMatchObject({ word: 'cat', hp: 30 });
    expect(zapAlien(world, 1)).toEqual([{ type: 'bossHit', id: 1, hp: 20, x: boss.x, y: 0 }]);
    expect(boss.word).toBe('dog');
    zapAlien(world, 1);
    expect(boss).toMatchObject({ word: 'egg', hp: 10 });
    expect(zapAlien(world, 1)).toEqual([{ type: 'kill', id: 1, alienType: 'boss', by: 'typing', x: boss.x, y: 0 }]);
    expect(world.aliens).toEqual([]);
  });

  it('lets towers wear the boss down to 1 HP, then the next typed word finishes it', () => {
    const towers = [10, 60, 110].map((x, pad) => ({ pad, type: 'blaster', level: 3, x, y: 40 }));
    const world = createWorld({ path, spawns: [{ type: 'boss', at: 0 }], drawWord: cycle(['cat']), bossWords: ['because'], towers });
    stepWorld(world, 0.1);
    zapAlien(world, 1);
    const events = run(world, 20);
    expect(events.some((e) => e.type === 'kill')).toBe(false);
    expect(world.aliens[0]).toMatchObject({ hp: 1, dizzy: true });
    expect(zapAlien(world, 1)).toContainEqual(expect.objectContaining({ type: 'kill', alienType: 'boss', by: 'typing' }));
  });

  it('draws the boss a word whose first letter no other alien shows', () => {
    const drawWord = vi.fn(cycle(['cat', 'dog']));
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }, { type: 'boss', at: 0 }], drawWord, bossWords: ['because'] });
    stepWorld(world, 0.1);
    zapAlien(world, 2);
    expect(drawWord).toHaveBeenLastCalledWith(new Set(['c']));
  });

  it('does nothing for unknown or wordless aliens', () => {
    const world = createWorld({ path, spawns: [], drawWord: cycle(['x']) });
    expect(zapAlien(world, 42)).toEqual([]);
  });
});

describe('clearing', () => {
  it('emits cleared exactly once after the last alien is gone', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']) });
    stepWorld(world, 0.1);
    zapAlien(world, 1);
    expect(stepWorld(world, 0.1)).toEqual([{ type: 'cleared' }]);
    expect(stepWorld(world, 0.1)).toEqual([]);
  });

  it('does not clear while spawns are pending', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 5 }], drawWord: cycle(['cat']) });
    expect(stepWorld(world, 0.1)).toEqual([]);
  });
});

describe('lockableAliens', () => {
  it('lists aliens that show a word', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']) });
    stepWorld(world, 1);
    expect(lockableAliens(world)).toEqual([{ id: 1, word: 'cat', distance: world.aliens[0].distance }]);
  });
});
