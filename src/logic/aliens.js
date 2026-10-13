export const BLOB_CROSSING_SECONDS = 30;
// Towers can't take an alien below this HP: only a typed word finishes it.
export const TOWER_HP_FLOOR = 1;
// An alien worn down to the floor walks at this fraction of its speed until it's typed.
export const DIZZY_SPEED = 0.5;
// HP each typed word takes off a boss once its shields are down.
export const BOSS_WORD_DAMAGE = 10;

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
