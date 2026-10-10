import { TOWERS, MAX_LEVEL } from './towers.js';

export const REWARDS = Object.freeze({ typedKill: 5, towerKill: 2, boss: 25, waveClear: 10, missionStart: 30 });

export function buildCost(type) {
  return TOWERS[type].costs[0];
}

// Cost to go from `level` to `level + 1`, or null at the maximum level.
export function upgradeCost(type, level) {
  return level >= MAX_LEVEL ? null : TOWERS[type].costs[level];
}

export function totalSpent(type, level) {
  return TOWERS[type].costs.slice(0, level).reduce((sum, cost) => sum + cost, 0);
}

export function sellValue(type, level) {
  return Math.floor(totalSpent(type, level) / 2);
}

export function killReward({ alienType, by }) {
  if (alienType === 'boss') return REWARDS.boss;
  return by === 'typing' ? REWARDS.typedKill : REWARDS.towerKill;
}
