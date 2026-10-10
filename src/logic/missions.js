// Starting values from the spec; tune here after play-testing.
const ALL = Object.freeze({ blob: 2, zoomer: 1, chonk: 1 });

export const MISSIONS = Object.freeze([
  { id: 1, speed: 1.0, waves: [4, 5, 6, 7], escorts: 3, spawnGap: 4.5, mix: { blob: 1 }, shields: 1, newTower: 'blaster' },
  { id: 2, speed: 1.05, waves: [5, 6, 7, 8], escorts: 3, spawnGap: 4.3, mix: { blob: 3, zoomer: 1 }, shields: 1, newTower: null },
  { id: 3, speed: 1.1, waves: [5, 6, 7, 8], escorts: 4, spawnGap: 4.1, mix: { blob: 2, zoomer: 1 }, shields: 1, newTower: 'freeze' },
  { id: 4, speed: 1.1, waves: [6, 7, 8, 9], escorts: 4, spawnGap: 4.0, mix: { blob: 3, zoomer: 1, chonk: 1 }, shields: 2, newTower: null },
  { id: 5, speed: 1.15, waves: [6, 7, 8, 9], escorts: 4, spawnGap: 3.8, mix: ALL, shields: 2, newTower: 'rocket' },
  { id: 6, speed: 1.2, waves: [6, 8, 9, 10], escorts: 5, spawnGap: 3.6, mix: ALL, shields: 2, newTower: null },
  { id: 7, speed: 1.25, waves: [7, 8, 10, 11], escorts: 5, spawnGap: 3.5, mix: ALL, shields: 2, newTower: null },
  { id: 8, speed: 1.3, waves: [7, 9, 10, 12], escorts: 6, spawnGap: 3.3, mix: ALL, shields: 3, newTower: null },
  { id: 9, speed: 1.35, waves: [8, 9, 11, 12], escorts: 6, spawnGap: 3.2, mix: ALL, shields: 3, newTower: null },
  { id: 10, speed: 1.4, waves: [8, 10, 12, 14], escorts: 6, spawnGap: 3.0, mix: ALL, shields: 3, newTower: null },
]);

export const MISSION_COUNT = MISSIONS.length;

export function getMission(id) {
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) throw new Error(`Unknown mission ${id}`);
  return mission;
}
