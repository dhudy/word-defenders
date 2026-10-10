import * as Phaser from 'phaser';
import { resetProgress } from '../logic/save.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';
import { app, updateSave } from '../app.js';
import { setupCamera, markReady } from '../ui/view.js';
import { openGrownupsPanel } from '../ui/grownupsPanel.js';

export class Grownups extends Phaser.Scene {
  constructor() {
    super('Grownups');
  }

  create() {
    setupCamera(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-space').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.5);
    const closePanel = openGrownupsPanel({
      save: app.save,
      persistent: app.persistent,
      onSave: ({ words, settings }) => updateSave({ ...app.save, words, settings }),
      onReset: () => updateSave(resetProgress(app.save)),
      onClose: () => this.scene.start('Title'),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, closePanel);
    markReady(this);
  }
}
