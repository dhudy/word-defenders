export const BLOB_CROSSING_SECONDS = 30;

export const ALIENS = Object.freeze({
  blob: Object.freeze({ speed: 1, hp: 3, hearts: 1, firstMission: 1 }),
  zoomer: Object.freeze({ speed: 1.6, hp: 2, hearts: 1, firstMission: 2 }),
  chonk: Object.freeze({ speed: 0.7, hp: 9, hearts: 1, firstMission: 4 }),
  boss: Object.freeze({ speed: 0.5, hp: 20, hpPerShield: 10, hearts: 5, firstMission: 1 }),
});

export function bossHp(shields) {
  return ALIENS.boss.hp + ALIENS.boss.hpPerShield * shields;
}

// Pixels per second for speed 1: a blob crosses the whole path in BLOB_CROSSING_SECONDS.
export function baseSpeed(pathLength) {
  return pathLength / BLOB_CROSSING_SECONDS;
}
