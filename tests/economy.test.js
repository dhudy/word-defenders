import { describe, it, expect } from 'vitest';
import { REWARDS, buildCost, upgradeCost, totalSpent, sellValue, killReward } from '../src/logic/economy.js';
import { starsFor } from '../src/logic/stars.js';

describe('REWARDS', () => {
  it('matches the spec', () => {
    expect(REWARDS).toEqual({ typedKill: 5, boss: 25, waveClear: 10, missionStart: 30 });
  });
});

describe('costs', () => {
  it('reads build and upgrade costs from the tower table', () => {
    expect(buildCost('blaster')).toBe(20);
    expect(upgradeCost('blaster', 1)).toBe(15);
    expect(upgradeCost('blaster', 2)).toBe(25);
    expect(upgradeCost('blaster', 3)).toBeNull();
    expect(buildCost('rocket')).toBe(40);
  });

  it('refunds half of everything spent, rounded down', () => {
    expect(totalSpent('blaster', 3)).toBe(60);
    expect(sellValue('blaster', 1)).toBe(10);
    expect(sellValue('blaster', 3)).toBe(30);
    expect(sellValue('rocket', 2)).toBe(32);
  });
});

describe('killReward', () => {
  it('pays 5 for a typed alien and 25 for a boss', () => {
    expect(killReward({ alienType: 'blob' })).toBe(5);
    expect(killReward({ alienType: 'chonk' })).toBe(5);
    expect(killReward({ alienType: 'boss' })).toBe(25);
  });
});

describe('starsFor', () => {
  it('uses the hearts thresholds', () => {
    expect(starsFor({ hearts: 10, retried: false })).toBe(3);
    expect(starsFor({ hearts: 8, retried: false })).toBe(3);
    expect(starsFor({ hearts: 7, retried: false })).toBe(2);
    expect(starsFor({ hearts: 4, retried: false })).toBe(2);
    expect(starsFor({ hearts: 3, retried: false })).toBe(1);
    expect(starsFor({ hearts: 1, retried: false })).toBe(1);
  });

  it('caps a retried mission at 1 star', () => {
    expect(starsFor({ hearts: 10, retried: true })).toBe(1);
  });
});
