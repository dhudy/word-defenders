import { pickWeighted } from './rng.js';

export const WAVES_PER_MISSION = 5;
export const WAVE_LEAD_IN = 1.5;

// Returns the wave's spawn schedule: [{ type, at }] with `at` in seconds.
export function buildWave(mission, wave, rng) {
  if (wave < 1 || wave > WAVES_PER_MISSION) throw new Error(`Wave ${wave} is out of range`);
  const isBossWave = wave === WAVES_PER_MISSION;
  const count = isBossWave ? mission.escorts : mission.waves[wave - 1];
  const spawns = [];
  for (let i = 0; i < count; i++) {
    spawns.push({ type: pickWeighted(mission.mix, rng), at: WAVE_LEAD_IN + i * mission.spawnGap });
  }
  if (isBossWave) spawns.push({ type: 'boss', at: WAVE_LEAD_IN + count * mission.spawnGap });
  return spawns;
}
