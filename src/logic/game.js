import { getMission } from './missions.js';
import { buildWave, WAVES_PER_MISSION } from './waves.js';
import { createDeck, pickBossWords } from './words.js';
import { createWorld, stepWorld, zapAlien, lockableAliens } from './world.js';
import { createTyping, pressKey, syncTyping } from './typing.js';
import { availableTowers } from './towers.js';
import { REWARDS, buildCost, upgradeCost, sellValue, killReward } from './economy.js';
import { starsFor } from './stars.js';
import { MAP_1, buildPath, padPositions } from './map.js';

export const START_HEARTS = 10;
export const MAX_STEP = 0.1;

export function createGame({ missionId, words, speed = 1, rng, map = MAP_1, debug = {} }) {
  const mission = getMission(missionId);
  return {
    mission,
    map,
    rng,
    words,
    speed,
    path: buildPath(map),
    pads: padPositions(map),
    deck: createDeck(words, rng),
    phase: 'break',
    wave: debug.wave ?? 1,
    hearts: debug.hearts ?? START_HEARTS,
    coins: debug.coins ?? REWARDS.missionStart,
    coinsEarned: 0,
    towers: {},
    retried: false,
    snapshot: null,
    world: null,
    typing: createTyping(),
  };
}

export function towerOptions(run) {
  return availableTowers(run.mission.id);
}

export function build(run, pad, type) {
  if (run.phase !== 'break' || !run.pads[pad] || run.towers[pad]) return false;
  if (!towerOptions(run).includes(type)) return false;
  const cost = buildCost(type);
  if (run.coins < cost) return false;
  run.coins -= cost;
  run.towers[pad] = { type, level: 1 };
  return true;
}

export function upgrade(run, pad) {
  const tower = run.towers[pad];
  if (run.phase !== 'break' || !tower) return false;
  const cost = upgradeCost(tower.type, tower.level);
  if (cost === null || run.coins < cost) return false;
  run.coins -= cost;
  tower.level += 1;
  return true;
}

export function sell(run, pad) {
  const tower = run.towers[pad];
  if (run.phase !== 'break' || !tower) return false;
  run.coins += sellValue(tower.type, tower.level);
  delete run.towers[pad];
  return true;
}

export function startWave(run) {
  if (run.phase !== 'break') return [];
  run.snapshot = { coins: run.coins, coinsEarned: run.coinsEarned, towers: cloneTowers(run.towers) };
  const isBossWave = run.wave === WAVES_PER_MISSION;
  run.world = createWorld({
    path: run.path,
    spawns: buildWave(run.mission, run.wave, run.rng),
    speed: run.mission.speed * run.speed,
    drawWord: (onScreen) => run.deck.draw(onScreen),
    bossWords: isBossWave ? pickBossWords(run.words, run.mission.shields, run.rng) : [],
    towers: Object.entries(run.towers).map(([pad, t]) => ({ pad: Number(pad), type: t.type, level: t.level, ...run.pads[pad] })),
  });
  run.phase = 'wave';
  run.typing = createTyping();
  return [{ type: 'waveStarted', wave: run.wave }];
}

export function update(run, dt) {
  if (run.phase !== 'wave') return [];
  const step = Math.min(Math.max(dt, 0), MAX_STEP);
  const events = absorb(run, stepWorld(run.world, step));
  if (run.phase === 'wave') {
    const sync = syncTyping(run.typing, lockableAliens(run.world));
    run.typing = sync.state;
    events.push(...sync.events);
  }
  return events;
}

export function key(run, rawKey) {
  if (run.phase !== 'wave') return { handled: false, events: [] };
  const pressed = pressKey(run.typing, rawKey, lockableAliens(run.world));
  run.typing = pressed.state;
  const events = [...pressed.events];
  for (const e of pressed.events) {
    if (e.type === 'complete') events.push(...absorb(run, zapAlien(run.world, e.id)));
  }
  return { handled: pressed.handled, events };
}

export function retryWave(run) {
  if (run.phase !== 'failed') return false;
  run.coins = run.snapshot.coins;
  run.coinsEarned = run.snapshot.coinsEarned;
  run.towers = cloneTowers(run.snapshot.towers);
  run.hearts = START_HEARTS;
  run.retried = true;
  run.phase = 'break';
  return true;
}

export function result(run) {
  return { stars: starsFor({ hearts: run.hearts, retried: run.retried }), coinsEarned: run.coinsEarned, hearts: run.hearts };
}

// Applies world events to coins and hearts and turns 'cleared' into wave results.
function absorb(run, worldEvents) {
  const out = [];
  for (const e of worldEvents) {
    if (e.type === 'cleared') {
      out.push(...endWave(run));
      continue;
    }
    out.push(e);
    if (e.type === 'kill') {
      const amount = killReward(e);
      run.coins += amount;
      run.coinsEarned += amount;
      out.push({ type: 'coins', amount, x: e.x, y: e.y });
    } else if (e.type === 'leak') {
      run.hearts = Math.max(0, run.hearts - e.hearts);
      if (run.hearts === 0) {
        out.push(...failWave(run));
        break;
      }
    }
  }
  return out;
}

function endWave(run) {
  run.coins += REWARDS.waveClear;
  run.coinsEarned += REWARDS.waveClear;
  run.world = null;
  run.typing = createTyping();
  if (run.wave === WAVES_PER_MISSION) {
    run.phase = 'won';
    return [{ type: 'missionWon', ...result(run) }];
  }
  const cleared = run.wave;
  run.wave += 1;
  run.phase = 'break';
  return [{ type: 'waveCleared', wave: cleared, bonus: REWARDS.waveClear }];
}

function failWave(run) {
  run.world = null;
  run.typing = createTyping();
  run.phase = 'failed';
  return [{ type: 'waveFailed', wave: run.wave }];
}

function cloneTowers(towers) {
  return Object.fromEntries(Object.entries(towers).map(([pad, t]) => [pad, { ...t }]));
}
