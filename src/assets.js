export const ALIEN_TYPES = Object.freeze(['blob', 'zoomer', 'chonk', 'boss']);

// Boss A leads missions 1-5; Boss C (sprite alien-boss-2) takes over from this mission.
export const LATE_BOSS_MISSION = 6;

export const alienSpriteKey = (type, missionId = 1) =>
  type === 'boss' && missionId >= LATE_BOSS_MISSION ? 'alien-boss-2' : `alien-${type}`;
export const towerSpriteKey = (type, level) => `tower-${type}-${level}`;

export const ALIEN_SPRITES = Object.freeze([...ALIEN_TYPES.map((type) => alienSpriteKey(type)), 'alien-boss-2']);

export const TOWER_SPRITES = Object.freeze(
  ['blaster', 'freeze', 'rocket'].flatMap((type) => [1, 2, 3].map((level) => towerSpriteKey(type, level))),
);

export const SPRITES = Object.freeze([...ALIEN_SPRITES, ...TOWER_SPRITES, 'fx-explosion']);

export const IMAGES = Object.freeze(['pad', 'base', 'portal', 'bg-space', 'coin', 'heart', 'star', 'shield', 'bolt', 'rocket-shell', 'freeze-puff']);

export const FONT_FILES = Object.freeze({ PixelUI: 'assets/fonts/pixel-ui.ttf' });

// Pixels from an alien's centre up to its word bubble. Tune against the art in Task 19.
export const LABEL_OFFSETS = Object.freeze({ blob: 40, zoomer: 40, chonk: 48, boss: 100 });

export const ANIMATION_RATES = Object.freeze({ walk: 10, explode: 18 });
