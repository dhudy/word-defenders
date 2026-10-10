import { GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';

// The canvas is 2x the logical size so text stays sharp; every scene
// zooms its camera so game code works in 1024x576 coordinates.
export const ZOOM = 2;

export function setupCamera(scene) {
  scene.cameras.main.setZoom(ZOOM).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

// Tells tools/shot.mjs which scene is on screen.
export function markReady(scene) {
  globalThis.__scene = scene.scene.key;
}
