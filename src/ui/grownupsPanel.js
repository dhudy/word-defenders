import { parseWordList } from '../logic/words.js';

const SPEED_LABELS = { slow: 'Slow', normal: 'Normal', fast: 'Fast' };
const STORAGE_BLOCKED = "Couldn't save — this browser is blocking storage.";

// Builds the Grown-ups form inside #grownups. Returns a function that hides it.
// onSave and onReset return whether the change reached storage.
export function openGrownupsPanel({ save, persistent, onSave, onReset, onClose }) {
  const root = document.getElementById('grownups');
  root.innerHTML = `
    <div class="gw-panel" role="dialog" aria-labelledby="gw-title">
      <h1 id="gw-title">Grown-ups</h1>
      <label for="gw-words">Spelling words (one per line)</label>
      <textarea id="gw-words" rows="8" spellcheck="false"></textarea>
      <ul id="gw-errors" class="gw-errors"></ul>
      <fieldset>
        <legend>Alien speed</legend>
        ${Object.entries(SPEED_LABELS)
          .map(([value, label]) => `<label><input type="radio" name="gw-speed" value="${value}"> ${label}</label>`)
          .join('')}
      </fieldset>
      <label class="gw-check"><input type="checkbox" id="gw-sound"> Sound effects</label>
      <p id="gw-storage" class="gw-note" hidden>Progress can't be saved in this browser.</p>
      <div class="gw-buttons">
        <button id="gw-save" class="gw-primary">Save</button>
        <button id="gw-reset">Reset progress</button>
        <button id="gw-back">Back</button>
      </div>
      <p id="gw-status" class="gw-status" aria-live="polite"></p>
    </div>`;

  const $ = (id) => root.querySelector(`#${id}`);
  const status = (text) => {
    $('gw-status').textContent = text;
  };
  const formState = () =>
    JSON.stringify([
      $('gw-words').value,
      root.querySelector('input[name="gw-speed"]:checked').value,
      $('gw-sound').checked,
    ]);
  $('gw-words').value = save.words.join('\n');
  root.querySelector(`input[name="gw-speed"][value="${save.settings.speed}"]`).checked = true;
  $('gw-sound').checked = save.settings.sound;
  $('gw-storage').hidden = persistent;
  // The form as last loaded or saved; Back asks before dropping changes since then.
  let savedState = formState();

  $('gw-save').addEventListener('click', () => {
    const { words, errors } = parseWordList($('gw-words').value);
    $('gw-errors').replaceChildren(
      ...errors.map((e) => {
        const item = document.createElement('li');
        item.textContent = e.line === null ? e.message : `Line ${e.line} (${e.text}): ${e.message}`;
        return item;
      }),
    );
    if (errors.length > 0) {
      status('');
      return;
    }
    const speed = root.querySelector('input[name="gw-speed"]:checked').value;
    const stored = onSave({ words, settings: { speed, sound: $('gw-sound').checked } });
    $('gw-words').value = words.join('\n');
    savedState = formState();
    status(stored ? 'Saved!' : STORAGE_BLOCKED);
  });

  $('gw-reset').addEventListener('click', () => {
    if (!window.confirm('Clear all stars and unlocked missions? The word list stays.')) return;
    status(onReset() ? 'Progress reset.' : STORAGE_BLOCKED);
  });

  $('gw-back').addEventListener('click', () => {
    if (formState() !== savedState && !window.confirm('Leave without saving your changes?')) return;
    onClose();
  });
  root.hidden = false;
  $('gw-words').focus();
  // Focusing puts the caret at the end; show the list from its first word.
  $('gw-words').setSelectionRange(0, 0);
  $('gw-words').scrollTop = 0;

  return function close() {
    root.hidden = true;
    root.replaceChildren();
  };
}
