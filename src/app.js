import { openStorage, loadSave, writeSave } from './logic/save.js';
import { sfx } from './audio/sfx.js';

const { storage, persistent } = openStorage();

// The one live copy of the save. Change it only through updateSave().
export const app = { persistent, save: loadSave(storage) };
sfx.setEnabled(app.save.settings.sound);

export function updateSave(next) {
  app.save = next;
  sfx.setEnabled(next.settings.sound);
  return writeSave(storage, next);
}
