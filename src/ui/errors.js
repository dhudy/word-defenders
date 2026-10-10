import { setupCamera, markReady } from './view.js';
import { addText, FONTS } from './text.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';

export function showLoadError(scene, key) {
  setupCamera(scene);
  addText(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2, "Couldn't load the game — try refreshing.", {
    fontFamily: FONTS.word,
    fontSize: '28px',
  }).setOrigin(0.5);
  console.warn(`Asset failed to load: ${key}`);
  markReady(scene);
}
