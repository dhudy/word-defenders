import { positionAt } from './path.js';
import { ALIENS, TOWER_HP_FLOOR, DIZZY_SPEED, BOSS_WORD_DAMAGE, bossHp, baseSpeed } from './aliens.js';
import { towerStats, pickTarget, slowAt, facingFor } from './towers.js';

const HIT_RADIUS = 8;

export function createWorld({ path, spawns, speed = 1, drawWord, bossWords = [], towers = [] }) {
  return {
    path,
    speed,
    drawWord,
    bossWords,
    time: 0,
    pending: [...spawns].sort((a, b) => a.at - b.at),
    aliens: [],
    towers: towers.map((t) => ({ ...t, stats: towerStats(t.type, t.level), cooldown: 0, facing: 'south' })),
    projectiles: [],
    nextId: 1,
    cleared: false,
  };
}

export function lockableAliens(world) {
  return world.aliens
    .filter((a) => a.word !== null)
    .map((a) => ({ id: a.id, word: a.word, distance: a.distance }));
}

export function stepWorld(world, dt) {
  const events = [];
  world.time += dt;
  spawnDue(world, events);
  moveAliens(world, dt, events);
  updateTowers(world, dt, events);
  moveProjectiles(world, dt, events);
  if (!world.cleared && world.pending.length === 0 && world.aliens.length === 0) {
    world.cleared = true;
    events.push({ type: 'cleared' });
  }
  return events;
}

// Called when the player finishes typing an alien's word.
export function zapAlien(world, id) {
  const alien = world.aliens.find((a) => a.id === id);
  if (!alien || alien.word === null) return [];
  if (alien.type === 'boss') return hitBoss(world, alien);
  removeAlien(world, id);
  return [{ type: 'kill', id, alienType: alien.type, by: 'typing', x: alien.x, y: alien.y }];
}

// A typed word pops the boss's next shield; with the shields down it takes
// BOSS_WORD_DAMAGE and the boss shows a fresh list word, until a word finishes it.
function hitBoss(world, boss) {
  const { id, x, y } = boss;
  if (isShielded(boss)) {
    boss.shieldIndex += 1;
    const remaining = boss.shieldWords.length - boss.shieldIndex;
    boss.word = remaining > 0 ? boss.shieldWords[boss.shieldIndex] : world.drawWord(lettersOnScreen(world, id));
    return [{ type: 'shieldPop', id, remaining, x, y }];
  }
  boss.hp -= BOSS_WORD_DAMAGE;
  if (boss.hp <= 0) {
    removeAlien(world, id);
    return [{ type: 'kill', id, alienType: 'boss', by: 'typing', x, y }];
  }
  boss.word = world.drawWord(lettersOnScreen(world, id));
  return [{ type: 'bossHit', id, hp: boss.hp, x, y }];
}

// First letters of the words other aliens show, so a new word can avoid them.
function lettersOnScreen(world, exceptId = null) {
  return new Set(world.aliens.filter((a) => a.id !== exceptId && a.word !== null).map((a) => a.word[0].toLowerCase()));
}

function spawnDue(world, events) {
  while (world.pending.length > 0 && world.pending[0].at <= world.time) {
    const spawn = world.pending.shift();
    const alien = makeAlien(world, spawn.type);
    world.aliens.push(alien);
    events.push({ type: 'spawn', id: alien.id, alienType: alien.type });
  }
}

function makeAlien(world, type) {
  const start = positionAt(world.path, 0);
  const alien = {
    id: world.nextId++,
    type,
    word: null,
    shieldWords: [],
    shieldIndex: 0,
    hp: 0,
    maxHp: 0,
    distance: 0,
    x: start.x,
    y: start.y,
    dir: start.dir,
    slow: 0,
    dizzy: false,
  };
  if (type === 'boss') {
    alien.shieldWords = [...world.bossWords];
    alien.word = alien.shieldWords[0] ?? world.drawWord(lettersOnScreen(world));
    alien.hp = bossHp(alien.shieldWords.length);
  } else {
    alien.word = world.drawWord(lettersOnScreen(world));
    alien.hp = ALIENS[type].hp;
  }
  alien.maxHp = alien.hp;
  return alien;
}

function moveAliens(world, dt, events) {
  const freezers = world.towers
    .filter((t) => t.type === 'freeze')
    .map((t) => ({ x: t.x, y: t.y, range: t.stats.range, slow: t.stats.slow }));
  const pxPerSecond = baseSpeed(world.path.length) * world.speed;
  for (const alien of [...world.aliens]) {
    const wasSlowed = alien.slow > 0;
    alien.slow = slowAt(alien, freezers);
    if (!wasSlowed && alien.slow > 0) events.push({ type: 'chill', id: alien.id, x: alien.x, y: alien.y });
    const dizzy = alien.dizzy ? DIZZY_SPEED : 1;
    alien.distance += pxPerSecond * ALIENS[alien.type].speed * (1 - alien.slow) * dizzy * dt;
    if (alien.distance >= world.path.length) {
      removeAlien(world, alien.id);
      events.push({ type: 'leak', id: alien.id, alienType: alien.type, hearts: ALIENS[alien.type].hearts });
      continue;
    }
    const pos = positionAt(world.path, alien.distance);
    alien.x = pos.x;
    alien.y = pos.y;
    alien.dir = pos.dir;
  }
}

function isShielded(alien) {
  return alien.type === 'boss' && alien.shieldIndex < alien.shieldWords.length;
}

// Shooters skip shielded bosses and aliens that are already dizzy.
function isTargetable(alien) {
  return !isShielded(alien) && !alien.dizzy;
}

function updateTowers(world, dt, events) {
  for (const tower of world.towers) {
    // Freeze towers aim at anything (slowing is not damage).
    const candidates = tower.type === 'freeze' ? world.aliens : world.aliens.filter(isTargetable);
    const target = pickTarget(tower, tower.stats.range, candidates);
    if (target) tower.facing = facingFor(target.x - tower.x, target.y - tower.y);
    if (tower.type === 'freeze') continue;
    tower.cooldown = Math.max(0, tower.cooldown - dt);
    if (!target || tower.cooldown > 0) continue;
    const projectile = {
      id: world.nextId++,
      towerType: tower.type,
      x: tower.x,
      y: tower.y,
      targetId: target.id,
      speed: tower.stats.projectileSpeed,
      damage: tower.stats.damage,
      splash: tower.stats.splash,
    };
    world.projectiles.push(projectile);
    tower.cooldown = 1 / tower.stats.rate;
    events.push({ type: 'fire', pad: tower.pad, towerType: tower.type, projectileId: projectile.id });
  }
}

function moveProjectiles(world, dt, events) {
  for (const p of [...world.projectiles]) {
    const target = world.aliens.find((a) => a.id === p.targetId);
    if (!target) {
      removeProjectile(world, p.id);
      events.push({ type: 'fizzle', projectileId: p.id });
      continue;
    }
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (dist <= Math.max(HIT_RADIUS, step)) {
      removeProjectile(world, p.id);
      events.push({ type: 'hit', projectileId: p.id, x: target.x, y: target.y, splash: p.splash > 0 });
      const victims = p.splash > 0
        ? world.aliens.filter((a) => !isShielded(a) && Math.hypot(a.x - target.x, a.y - target.y) <= p.splash)
        : [target];
      for (const victim of victims) damage(world, victim, p.damage, events);
      continue;
    }
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
  }
}

// Towers wear an alien down to TOWER_HP_FLOOR, where it turns dizzy; they never kill.
function damage(world, alien, amount, events) {
  if (!world.aliens.includes(alien) || alien.dizzy) return;
  alien.hp = Math.max(TOWER_HP_FLOOR, alien.hp - amount);
  if (alien.hp === TOWER_HP_FLOOR) {
    alien.dizzy = true;
    events.push({ type: 'dizzy', id: alien.id, x: alien.x, y: alien.y });
  }
}

function removeAlien(world, id) {
  world.aliens = world.aliens.filter((a) => a.id !== id);
}

function removeProjectile(world, id) {
  world.projectiles = world.projectiles.filter((p) => p.id !== id);
}
