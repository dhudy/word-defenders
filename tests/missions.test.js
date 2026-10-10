import { describe, it, expect } from 'vitest';
import { ALIENS, BLOB_CROSSING_SECONDS, bossHp, baseSpeed } from '../src/logic/aliens.js';
import { MISSIONS, MISSION_COUNT, getMission } from '../src/logic/missions.js';
import { buildWave, WAVES_PER_MISSION, WAVE_LEAD_IN } from '../src/logic/waves.js';
import { createRng } from '../src/logic/rng.js';

describe('ALIENS', () => {
  it('matches the spec table', () => {
    expect(ALIENS.blob).toEqual({ speed: 1, hp: 3, hearts: 1, firstMission: 1 });
    expect(ALIENS.zoomer).toEqual({ speed: 1.6, hp: 2, hearts: 1, firstMission: 2 });
    expect(ALIENS.chonk).toEqual({ speed: 0.7, hp: 9, hearts: 1, firstMission: 4 });
    expect(ALIENS.boss).toEqual({ speed: 0.5, hp: 20, hpPerShield: 10, hearts: 5, firstMission: 1 });
  });

  it('gives bosses 20 HP plus 10 per shield', () => {
    expect([bossHp(1), bossHp(2), bossHp(3)]).toEqual([30, 40, 50]);
  });

  it('makes a blob cross the path in 30 seconds', () => {
    expect(BLOB_CROSSING_SECONDS).toBe(30);
    expect(baseSpeed(1856)).toBeCloseTo(1856 / 30);
  });
});

describe('MISSIONS', () => {
  it('has missions 1 to 10', () => {
    expect(MISSION_COUNT).toBe(10);
    expect(MISSIONS.map((m) => m.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('matches the spec table', () => {
    expect(MISSIONS.map((m) => m.speed)).toEqual([1, 1.05, 1.1, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4]);
    expect(MISSIONS.map((m) => m.waves)).toEqual([
      [4, 5, 6, 7], [5, 6, 7, 8], [5, 6, 7, 8], [6, 7, 8, 9], [6, 7, 8, 9],
      [6, 8, 9, 10], [7, 8, 10, 11], [7, 9, 10, 12], [8, 9, 11, 12], [8, 10, 12, 14],
    ]);
    expect(MISSIONS.map((m) => m.escorts)).toEqual([3, 3, 4, 4, 4, 5, 5, 6, 6, 6]);
    expect(MISSIONS.map((m) => m.spawnGap)).toEqual([4.5, 4.3, 4.1, 4.0, 3.8, 3.6, 3.5, 3.3, 3.2, 3.0]);
    expect(MISSIONS.map((m) => m.shields)).toEqual([1, 1, 1, 2, 2, 2, 2, 3, 3, 3]);
    expect(MISSIONS.map((m) => m.newTower)).toEqual(['blaster', null, 'freeze', null, 'rocket', null, null, null, null, null]);
  });

  it('only mixes in aliens from their first mission onward', () => {
    for (const m of MISSIONS) {
      for (const type of Object.keys(m.mix)) {
        expect(ALIENS[type].firstMission).toBeLessThanOrEqual(m.id);
      }
    }
    expect(Object.keys(getMission(1).mix)).toEqual(['blob']);
    expect(Object.keys(getMission(4).mix)).toEqual(['blob', 'zoomer', 'chonk']);
  });

  it('throws for unknown missions', () => {
    expect(() => getMission(11)).toThrow(/Unknown mission/);
  });
});

describe('buildWave', () => {
  it('spawns the table count of regular aliens in waves 1-4', () => {
    const m = getMission(3);
    for (let wave = 1; wave <= 4; wave++) {
      const spawns = buildWave(m, wave, createRng(wave));
      expect(spawns).toHaveLength(m.waves[wave - 1]);
      expect(spawns.every((s) => s.type !== 'boss')).toBe(true);
    }
  });

  it('spawns escorts first and the boss last in wave 5', () => {
    const m = getMission(8);
    const spawns = buildWave(m, WAVES_PER_MISSION, createRng(1));
    expect(spawns).toHaveLength(m.escorts + 1);
    expect(spawns.at(-1).type).toBe('boss');
    expect(spawns.slice(0, -1).every((s) => s.type !== 'boss')).toBe(true);
  });

  it('spaces spawns by the mission gap after a lead-in', () => {
    const m = getMission(1);
    const spawns = buildWave(m, 2, createRng(1));
    spawns.forEach((s, i) => expect(s.at).toBeCloseTo(WAVE_LEAD_IN + i * m.spawnGap));
  });

  it('is reproducible for a seed', () => {
    const m = getMission(6);
    expect(buildWave(m, 3, createRng(77))).toEqual(buildWave(m, 3, createRng(77)));
  });

  it('only uses aliens from the mission mix', () => {
    const m = getMission(2);
    for (const s of buildWave(m, 4, createRng(5))) expect(['blob', 'zoomer']).toContain(s.type);
  });

  it('gives mission 1 enough aliens to show a 20-word list', () => {
    const m = getMission(1);
    const total = [1, 2, 3, 4, 5].reduce((sum, w) => sum + buildWave(m, w, createRng(w)).length, 0);
    expect(total).toBe(26);
  });

  it('rejects waves outside 1-5', () => {
    expect(() => buildWave(getMission(1), 6, createRng(1))).toThrow(/out of range/);
  });
});
