import '@fontsource/andika/400.css';
import './style.css';
import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './logic/map.js';
import { ZOOM } from './ui/view.js';
import { Boot } from './scenes/Boot.js';
import { Preload } from './scenes/Preload.js';
import { Title } from './scenes/Title.js';
import { MissionMap } from './scenes/MissionMap.js';
import { Results } from './scenes/Results.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH * ZOOM,
  height: GAME_HEIGHT * ZOOM,
  backgroundColor: '#0b0b1a',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Preload, Title, MissionMap, Results],
});
