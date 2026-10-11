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
  it('a blaster shoots the alien and kills it with tower credit', () => {
    const towers = [{ pad: 3, type: 'blaster', level: 1, x: 50, y: 40 }];
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']), towers });
    const events = run(world, 5);
    expect(events.filter((e) => e.type === 'fire')).toHaveLength(3);
    expect(events.find((e) => e.type === 'fire')).toMatchObject({ pad: 3, towerType: 'blaster' });
    expect(events.find((e) => e.type === 'kill')).toMatchObject({ id: 1, alienType: 'blob', by: 'tower' });
    expect(world.aliens).toEqual([]);
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
    expect(events.filter((e) => e.type === 'kill')).toHaveLength(2);
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

  it('pops boss shields one word at a time, then lets towers hit it', () => {
    const towers = [{ pad: 0, type: 'blaster', level: 1, x: 20, y: 40 }];
    const world = createWorld({ path, spawns: [{ type: 'boss', at: 0 }], drawWord: cycle(['x']), bossWords: ['because', 'friend'], towers });
    stepWorld(world, 0.1);
    expect(zapAlien(world, 1)).toEqual([{ type: 'shieldPop', id: 1, remaining: 1, x: world.aliens[0].x, y: 0 }]);
    expect(world.aliens[0].word).toBe('friend');
    expect(zapAlien(world, 1)[0]).toMatchObject({ type: 'shieldPop', remaining: 0 });
    expect(world.aliens[0].word).toBeNull();
    const events = run(world, 1);
    expect(events.some((e) => e.type === 'fire')).toBe(true);
  });

  it('lets typing finish the boss in a world without shooting towers', () => {
    const world = createWorld({ path, spawns: [{ type: 'boss', at: 0 }], drawWord: cycle(['x']), bossWords: ['because', 'friend'], typingFinishesBoss: true });
    stepWorld(world, 0.1);
    expect(zapAlien(world, 1)).toEqual([{ type: 'shieldPop', id: 1, remaining: 1, x: world.aliens[0].x, y: 0 }]);
    const { x } = world.aliens[0];
    expect(zapAlien(world, 1)).toEqual([
      { type: 'shieldPop', id: 1, remaining: 0, x, y: 0 },
      { type: 'kill', id: 1, alienType: 'boss', by: 'typing', x, y: 0 },
    ]);
    expect(world.aliens).toEqual([]);
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
