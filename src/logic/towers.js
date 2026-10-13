import { TILE } from './map.js';

export const MAX_LEVEL = 3;

export const DIRECTIONS_8 = Object.freeze([
  'east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east',
]);

// Ranges are in tiles; towerStats converts them to pixels.
export const TOWERS = Object.freeze({
  blaster: Object.freeze({ name: 'Blaster', costs: [20, 15, 25], firstMission: 3, range: 3, damage: 1, rate: 1, projectileSpeed: 480 }),
  freeze: Object.freeze({ name: 'Freeze Ray', costs: [30, 20, 30], firstMission: 1, range: 2.5, slow: [0.3, 0.45, 0.6] }),
  rocket: Object.freeze({ name: 'Rocket', costs: [40, 25, 35], firstMission: 5, range: 3.5, damage: 3, rate: 0.4, splash: 1, projectileSpeed: 300 }),
});

export const TOWER_TYPES = Object.freeze(Object.keys(TOWERS));

export function towerStats(type, level) {
  const t = TOWERS[type];
  const upgrades = level - 1;
  return {
    range: t.range * TILE * (1 + 0.1 * upgrades),
    damage: t.damage ? t.damage * (1 + 0.5 * upgrades) : 0,
    rate: t.rate ?? 0,
    slow: t.slow ? t.slow[level - 1] : 0,
    splash: t.splash ? t.splash * TILE : 0,
    projectileSpeed: t.projectileSpeed ?? 0,
  };
}

export function availableTowers(missionId) {
  return TOWER_TYPES.filter((type) => TOWERS[type].firstMission <= missionId);
}

export function pickTarget(origin, range, candidates) {
  let best = null;
  for (const c of candidates) {
    if (Math.hypot(c.x - origin.x, c.y - origin.y) > range) continue;
    if (best === null || c.distance > best.distance) best = c;
  }
  return best;
}

export function slowAt(pos, freezeTowers) {
  let slow = 0;
  for (const t of freezeTowers) {
    if (Math.hypot(pos.x - t.x, pos.y - t.y) <= t.range) slow = Math.max(slow, t.slow);
  }
  return slow;
}

export function facingFor(dx, dy) {
  const index = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return DIRECTIONS_8[(index + 8) % 8];
}
