# Word Defenders v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Word Defenders v1, a Phaser 4 browser tower-defense game where a 7-year-old types his spelling words to zap aliens, earns coins, and buys towers between waves.

**Architecture:** Game rules live in `src/logic/` as plain functions over plain data — no Phaser, no clock, no `Math.random` — and are unit-tested with Vitest. `src/logic/game.js` is the single controller that the Game scene drives: the scene forwards keys, clicks and frame time, then renders the controller's state and plays effects for the events it returns. Art comes from PixelLab through its MCP tools and lands in `public/assets/` in PixelLab's spritesheet format (PNG + layout JSON), which `src/logic/sheets.js` parses at load time.

**Tech Stack:** Phaser 4.2.1, Vite 8, Vitest 5, Node 22, `@fontsource/andika` 5 (word font), `pngjs` 7 (sprite-sheet packing tool), Playwright 1.64 driving the installed Google Chrome (screenshot checks), PixelLab MCP (art).

**Spec:** `docs/superpowers/specs/2026-10-07-word-defenders-v1-design.md` — read it before starting any task.

## Global Constraints

- Plain JavaScript ES modules (`"type": "module"`); no TypeScript. Runtime dependencies are exactly `phaser` and `@fontsource/andika`.
- `src/logic/**` never imports Phaser, never calls `Math.random`, and never reads the clock (`Date`, `performance`). Randomness arrives as an `rng` function (`createRng(seed)`); time arrives as `dt` seconds. Do not even mention those APIs in comments there: `tests/boundary.test.js` greps for them.
- Logical game size is 1024×576: 32×18 tiles of 32 px, with the top 2 rows reserved for the HUD. The canvas backing store is 2048×1152 and every scene calls `setupCamera(this)` first (camera zoom 2, centred), so all scene coordinates are logical 1024×576 coordinates. Config: `pixelArt: true`, `Scale.FIT`, `Scale.CENTER_BOTH`.
- Create every Phaser `Text` through `addText()` in `src/ui/text.js` (it sets resolution 2). Words on aliens use font family `Andika` at 26 px. HUD and buttons use `PixelUI` (fallback `monospace`) at 16, 32, 48 or 64 px.
- The path turns only at right angles. Alien walk animations are named `<spriteKey>-walk-<south|west|east|north>`; tower sprites carry 8 rotations named `east, south-east, south, south-west, west, north-west, north, north-east`.
- Copy every number from the spec verbatim: alien stats, tower stats and costs, coin rewards, the mission table, star thresholds, word-list limits, and the 15 starter words.
- Save key `word-defenders:save`, `version: 1`. Loading never throws.
- Words contain only letters, apostrophes and hyphens, start and end with a letter, and are at most 20 characters; a list has 5–50 words. Matching is case-insensitive; display keeps the spelling as entered.
- No network access at runtime. All art, fonts and sounds ship in the repo or in npm packages, or are generated in code.
- Phaser `Scene` already owns `game`, `data`, `sys`, `events`, `scene`, `registry`, `input`, `add`, `tweens`, `time`, `anims`, `cameras`. Never assign those property names in a scene. The Game scene keeps its controller in `this.run`.
- Phaser reuses scene instances on restart. Initialise every per-run field in `create()`, not in the constructor.
- Every commit message ends with a blank line followed by `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **Lists pasted from Google Docs or Word** — curly apostrophes (`’ ‘ ʼ`) and Windows `\r\n` line endings must be accepted and normalized to `'`. Test lives in Task 4.
2. **Modifier and held keys mid-word** — Shift, Caps Lock, Ctrl/Cmd shortcuts and key auto-repeat must neither count as wrong letters nor type extra letters. Tests on `normalizeKey` and `readKeyEvent` live in Task 5.
3. **A long frame after a tab switch** — `update()` clamps `dt` to 0.1 s so aliens never jump past the base. Test lives in Task 11.
4. **Short lists** — exactly 5 words with a 3-shield boss, deck reshuffles, and two on-screen aliens with the same word must all work. Tests live in Tasks 4 and 5.
5. **Typing the last alien of a wave** — the wave must clear on the next `update()` instead of hanging. Test lives in Task 11.

## Screenshot Checks (Tasks 17–22)

Phaser tasks verify in headless Chrome with `tools/shot.mjs` (created in Task 17). Pattern:

```bash
mkdir -p .shots
(npx vite --port 5199 --strictPort > .shots/vite.log 2>&1 &) ; sleep 3
node tools/shot.mjs --url "http://localhost:5199/?scene=Title" --scene Title --do "wait:500" --do "shot:.shots/title.png"
pkill -f "vite --port 5199"
```

Then open the PNG with the Read tool and compare it with the task's **Expected** description. `shot.mjs` prints `No console errors.` on success and exits 1, printing the errors, if the page logged any console error or uncaught exception. Actions: `wait:<ms>`, `click:<x>,<y>` (logical 1024×576 coordinates), `type:<text>`, `key:<KeyName>`, `typefirst` (types the word of the first typeable alien, Game scene only, dev builds only), `scene:<Key>` (wait until that scene is active), `fill:<css selector>|<text>` (fills a DOM field; `\n` becomes a newline), `tap:<css selector>` (clicks a DOM element), `until:<expression>` (waits up to 300 s until a page expression is truthy, e.g. `until:__debug?.run.phase === 'won'`), `shot:<path>`. Browser `confirm()` dialogs are accepted automatically.

Headless Chrome renders at roughly 20 fps and the game clamps each frame to 0.1 s, so game time runs slower than wall-clock time there. Wait for game conditions with `until:` rather than long fixed `wait:` delays.

Dev-only URL parameters (parsed by `src/logic/debug.js`): `scene=Title|MissionMap|Game|Results|Grownups`, `mission=1..10` (implies `scene=Game` when `scene` is absent), `wave=1..5`, `coins=0..99999`, `hearts=1..10`, `autostart=1` (starts the wave immediately), `stars=1..3` (Results only).

## File Map

```
package.json, vite.config.js, index.html, CLAUDE.md, README.md
src/
  main.js                 Phaser config + scene list
  style.css               page + Grown-ups overlay styles
  app.js                  storage, current save, updateSave()
  assets.js               asset keys, label offsets, animation rates
  audio/sfx.js            Web Audio sound effects (createSfx, sfx singleton)
  logic/                  pure rules (unit-tested)
    rng.js                createRng, shuffle, pickWeighted
    path.js               createPath, positionAt
    map.js                grid constants, MAP_1, pathCells, buildPath, pad/base/portal positions, terrainCorners
    words.js              parseWordList, createDeck, pickBossWords, STARTER_WORDS
    typing.js             normalizeKey, readKeyEvent, createTyping, pressKey, syncTyping
    aliens.js             ALIENS, bossHp, baseSpeed
    missions.js           MISSIONS, getMission, MISSION_COUNT
    waves.js              buildWave, WAVES_PER_MISSION, WAVE_LEAD_IN
    towers.js             TOWERS, towerStats, availableTowers, pickTarget, slowAt, facingFor
    economy.js            REWARDS, buildCost, upgradeCost, totalSpent, sellValue, killReward
    stars.js              starsFor
    save.js               defaultSave, validateSave, loadSave, writeSave, openStorage, isUnlocked, recordResult, resetProgress
    world.js              createWorld, stepWorld, zapAlien, lockableAliens (one wave of combat)
    game.js               createGame, build, upgrade, sell, startWave, update, key, retryWave, result, towerOptions
    sheets.js             parseSheet, cornerKey, buildTerrainLookup
    debug.js              parseDebug
  ui/
    view.js               ZOOM, setupCamera, markReady
    text.js               FONTS, COLORS, addText
    button.js             addButton
    modal.js              showModal
    errors.js             showLoadError
    grownupsPanel.js      DOM form for the Grown-ups screen
  objects/
    WordLabel.js          word bubble with typed/next/rest colouring
    ShieldView.js         boss shield bubbles
    AlienView.js          alien sprite + label + shields + HP bar
    TowerView.js          tower sprite with 8 facings + freeze aura
  scenes/
    Boot.js, Preload.js, Title.js, MissionMap.js, Game.js, Results.js, Grownups.js
    game/MapView.js       terrain, pads, portal, base
    game/Hud.js           top bar
    game/BuildMenu.js     build / upgrade / sell pop-up
    game/Guide.js         mission-1 guided start
public/assets/
  sprites/<key>.png + <key>.json    PixelLab spritesheet format
  terrain/terrain.png + terrain.json
  images/<key>.png
  fonts/pixel-ui.ttf
assets/
  candidates/             alien candidate previews + index.html contact sheet
  raw/                    downloaded PixelLab ZIPs/frames used to build sheets
  manifest.json           prompts, PixelLab IDs, picks
tools/
  pack-sheet-lib.mjs      packSheet() (unit-tested)
  pack-sheet.mjs          CLI: pack loose PNGs into a PixelLab-format sheet
  shot.mjs                headless Chrome screenshot driver
tests/                    one Vitest spec per logic module, plus boundary/assets/sfx/pack tests
  fixtures/               real PixelLab sheet and tileset JSON
.shots/                   screenshot-check output (git-ignored)
docs/playtest-checklist.md
```

## Task Order and the Art Checkpoint

| # | Task | Notes |
|---|---|---|
| 1 | Project scaffold | |
| 2 | Art: alien and boss candidates | Ends in **CHECKPOINT A** |
| 3–11 | Logic modules, then the `game.js` controller | These run while the family picks aliens |
| 12 | Sheet parser and sheet-packing tool | |
| 13–15 | Art: terrain and map objects, towers, effects/icons/font | |
| 16 | Art: animate and export the picked aliens | Needs CHECKPOINT A answered |
| 17–21 | Phaser foundation and scenes | |
| 22 | Play-test checklist, README, final verification | |

**CHECKPOINT A (controller action after Task 2):** tell the user that `assets/candidates/index.html` is ready and ask them to open it with their son and pick one Blob, one Zoomer, one Chonk and one Boss (letters A/B/C). Continue with Tasks 3–15 while waiting. Before dispatching Task 16, make sure the picks are in hand, and pass them to the Task 16 implementer. Never guess the picks.

**Picks received (2026-10-10):** Blob A, Zoomer A, Chonk B, and two bosses — Boss A for missions 1–5 (sprite `alien-boss`) and Boss C for missions 6–10 (sprite `alien-boss-2`). The user chose to use both bosses.

---
### Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via npm), `vite.config.js`, `index.html`, `src/style.css`, `src/main.js`, `CLAUDE.md`, `tests/boundary.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test`, `npm run build`, `npm run dev`; the `#game` and `#grownups` elements in `index.html`; the boundary test every later logic task must keep green.

- [ ] **Step 1: Create package.json and install dependencies**

```bash
cd ~/word-defenders
npm init -y
npm pkg delete main
npm pkg set name=word-defenders version=0.1.0 type=module description="Spelling-word tower defense game"
npm pkg set private=true --json
npm pkg set scripts.dev="vite" scripts.build="vite build" scripts.preview="vite preview" scripts.test="vitest run"
npm install phaser@4.2.1 @fontsource/andika@^5.3.0
npm install -D vite@^8.3.3 vitest@^5.0.3 pngjs@^7.0.0 playwright@^1.64.0
```

Expected: `package.json` lists `phaser` and `@fontsource/andika` under `dependencies` and the other four under `devDependencies`. Playwright does not download browsers here; `tools/shot.mjs` uses the installed Google Chrome via `channel: 'chrome'`.

- [ ] **Step 2: Write `vite.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="data:," />
    <title>Word Defenders</title>
  </head>
  <body>
    <div id="game"></div>
    <div id="grownups" hidden></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `src/style.css`**

```css
html,
body {
  margin: 0;
  height: 100%;
  background: #0b0b1a;
  overflow: hidden;
}

#game {
  width: 100%;
  height: 100%;
}
```

- [ ] **Step 5: Write a temporary `src/main.js`** (Task 17 replaces it)

```js
import '@fontsource/andika/400.css';
import './style.css';
import * as Phaser from 'phaser';

class Hello extends Phaser.Scene {
  constructor() {
    super('Hello');
  }

  create() {
    this.cameras.main.setZoom(2).centerOn(512, 288);
    this.add
      .text(512, 288, 'Word Defenders', { fontFamily: 'Andika', fontSize: '48px', color: '#ffffff' })
      .setOrigin(0.5)
      .setResolution(2);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 2048,
  height: 1152,
  backgroundColor: '#0b0b1a',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Hello],
});
```

- [ ] **Step 6: Write the boundary test `tests/boundary.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const LOGIC_DIR = fileURLToPath(new URL('../src/logic', import.meta.url));
const FORBIDDEN = [
  /from\s+['"]phaser['"]/,
  /Math\.random/,
  /Date\.now/,
  /new Date\(/,
  /performance\.now/,
];

describe('src/logic boundary', () => {
  it('has no Phaser imports, randomness or clock reads', () => {
    const files = existsSync(LOGIC_DIR) ? readdirSync(LOGIC_DIR).filter((f) => f.endsWith('.js')) : [];
    const offenders = [];
    for (const file of files) {
      const text = readFileSync(join(LOGIC_DIR, file), 'utf8');
      for (const pattern of FORBIDDEN) {
        if (pattern.test(text)) offenders.push(`${file}: ${pattern}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 7: Update `.gitignore`**

Replace the file's contents with:

```
node_modules/
dist/
.DS_Store
.shots/
```

- [ ] **Step 8: Write `CLAUDE.md`**

```markdown
# Word Defenders

Browser tower-defense spelling game for a 7-year-old (Phaser 4 + Vite).

- Spec: `docs/superpowers/specs/2026-10-07-word-defenders-v1-design.md`
- Plan: `docs/superpowers/plans/2026-10-10-word-defenders-v1.md`

## Commands

- `npm run dev` — dev server
- `npm test` — Vitest unit tests (`tests/**/*.test.js`)
- `npm run build` — static build into `dist/`
- `node tools/shot.mjs ...` — headless Chrome screenshots (see the plan's "Screenshot Checks")

## Rules

- `src/logic/` is pure: no Phaser imports, no randomness API, no clock. Pass `rng` and `dt` in. `tests/boundary.test.js` enforces this.
- Scenes call `setupCamera(this)` first and create text only through `addText()` (`src/ui/text.js`).
- Never assign Phaser-owned scene properties (`game`, `data`, `sys`, `events`, ...). The Game scene's controller is `this.run`.
- Scenes are reused on restart: initialise per-run fields in `create()`.
- Art lives in `public/assets/` in PixelLab spritesheet format (PNG + JSON); `assets/manifest.json` records prompts and PixelLab IDs for regeneration.
- Commit messages end with the `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>` trailer.
```

- [ ] **Step 9: Run the tests and the build**

Run: `npm test`
Expected: `tests/boundary.test.js` passes (1 test).

Run: `npm run build`
Expected: exits 0 and writes `dist/index.html`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + Phaser 4 + Vitest project

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Art — Alien and Boss Candidates (ends in CHECKPOINT A)

This task uses the PixelLab MCP tools. Load them first with ToolSearch: `select:mcp__pixellab__create_character,mcp__pixellab__get_character,mcp__pixellab__wait_for_jobs`.

**Files:**
- Create: `assets/candidates/<type>-<letter>.png` (12 files), `assets/candidates/index.html`, `assets/manifest.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `assets/manifest.json` with a `candidates` block mapping each alien type and letter to a PixelLab character ID. Task 16 reads it.

One candidate already exists from design-time probing: **Blob A** = character `cdd04155-935a-48bb-bb4c-2f0e3f8db599`, which already has a 4-direction `walk` animation. Do not regenerate it.

- [ ] **Step 1: Queue the 11 remaining candidates**

Call `create_character` once per row with `mode: "standard"`, `n_directions: 4`, `view: "low top-down"`, `proportions: "{\"type\": \"preset\", \"name\": \"chibi\"}"`, and the given `name`, `description` and `size`:

| Key | name | size | description |
|---|---|---|---|
| blob-b | Blob candidate B | 64 | cute round purple jelly blob alien with three eyes and stubby little legs, friendly cartoon style |
| blob-c | Blob candidate C | 64 | cute round orange slime alien with a big smile, two antennae and stubby little legs, friendly cartoon style |
| zoomer-a | Zoomer candidate A | 64 | small skinny yellow alien with a jetpack and racing goggles, fast and zippy, cute cartoon style |
| zoomer-b | Zoomer candidate B | 64 | cute speedy blue alien with long springy legs and a lightning-bolt antenna, cartoon style |
| zoomer-c | Zoomer candidate C | 64 | tiny red alien wearing roller skates and a little helmet, cute cartoon style |
| chonk-a | Chonk candidate A | 80 | big chubby green alien with a rocky shell on its back, slow and sturdy, cute cartoon style |
| chonk-b | Chonk candidate B | 80 | large round purple alien wearing shiny metal armor plates, cute cartoon style |
| chonk-c | Chonk candidate C | 80 | chunky orange alien with stone-like skin and tiny happy eyes, cute cartoon style |
| boss-a | Boss candidate A | 128 | giant purple alien commander with a flowing cape and a crown, four arms, cute but a little scary, cartoon style |
| boss-b | Boss candidate B | 128 | huge one-eyed green alien king riding in a round robot suit, cute but a little scary, cartoon style |
| boss-c | Boss candidate C | 128 | big red alien general with glowing eyes and spiky armor, cute but a little scary, cartoon style |

Record each returned `id`.

- [ ] **Step 2: Wait for completion**

Call `wait_for_jobs` (timeout 300) repeatedly until it reports nothing running. Then call `get_character` for each ID. If any status is `failed`, queue that row once more with the same parameters and wait again.

- [ ] **Step 3: Download the south-facing previews**

```bash
mkdir -p ~/word-defenders/assets/candidates
cd ~/word-defenders/assets/candidates
curl -sSL -o blob-a.png "<south rotation URL from get_character for cdd04155-935a-48bb-bb4c-2f0e3f8db599>"
```

Repeat for all 12 keys (`blob-a` … `boss-c`), using each character's `rotations.south` URL from `get_character`.

Run: `file ~/word-defenders/assets/candidates/*.png`
Expected: 12 lines, each `PNG image data`.

- [ ] **Step 4: Write `assets/candidates/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Pick your aliens!</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #0b0b1a; color: #fff; margin: 24px; }
      h1 { font-size: 40px; }
      h2 { margin: 28px 0 8px; font-size: 28px; }
      .row { display: flex; gap: 24px; flex-wrap: wrap; }
      figure { margin: 0; text-align: center; background: #1b1b3a; padding: 12px; border-radius: 12px; }
      img { width: 256px; height: 256px; image-rendering: pixelated; }
      figcaption { font-size: 32px; font-weight: bold; }
    </style>
  </head>
  <body>
    <h1>Pick your aliens!</h1>
    <h2>Blob — the everyday alien</h2>
    <div class="row">
      <figure><img src="blob-a.png" alt="Blob A" /><figcaption>A</figcaption></figure>
      <figure><img src="blob-b.png" alt="Blob B" /><figcaption>B</figcaption></figure>
      <figure><img src="blob-c.png" alt="Blob C" /><figcaption>C</figcaption></figure>
    </div>
    <h2>Zoomer — the fast one</h2>
    <div class="row">
      <figure><img src="zoomer-a.png" alt="Zoomer A" /><figcaption>A</figcaption></figure>
      <figure><img src="zoomer-b.png" alt="Zoomer B" /><figcaption>B</figcaption></figure>
      <figure><img src="zoomer-c.png" alt="Zoomer C" /><figcaption>C</figcaption></figure>
    </div>
    <h2>Chonk — the tough one</h2>
    <div class="row">
      <figure><img src="chonk-a.png" alt="Chonk A" /><figcaption>A</figcaption></figure>
      <figure><img src="chonk-b.png" alt="Chonk B" /><figcaption>B</figcaption></figure>
      <figure><img src="chonk-c.png" alt="Chonk C" /><figcaption>C</figcaption></figure>
    </div>
    <h2>Boss — the big bad</h2>
    <div class="row">
      <figure><img src="boss-a.png" alt="Boss A" /><figcaption>A</figcaption></figure>
      <figure><img src="boss-b.png" alt="Boss B" /><figcaption>B</figcaption></figure>
      <figure><img src="boss-c.png" alt="Boss C" /><figcaption>C</figcaption></figure>
    </div>
  </body>
</html>
```

- [ ] **Step 5: Write `assets/manifest.json`**

Fill in the real IDs from Step 1:

```json
{
  "candidates": {
    "blob": { "a": "cdd04155-935a-48bb-bb4c-2f0e3f8db599", "b": "<blob-b id>", "c": "<blob-c id>" },
    "zoomer": { "a": "<zoomer-a id>", "b": "<zoomer-b id>", "c": "<zoomer-c id>" },
    "chonk": { "a": "<chonk-a id>", "b": "<chonk-b id>", "c": "<chonk-c id>" },
    "boss": { "a": "<boss-a id>", "b": "<boss-b id>", "c": "<boss-c id>" }
  },
  "picks": {},
  "assets": {}
}
```

Run: `node -e "const m=require('./assets/manifest.json'); const ids=Object.values(m.candidates).flatMap(Object.values); if(ids.length!==12||ids.some(i=>!/^[0-9a-f-]{36}$/.test(i))) throw new Error('bad manifest'); console.log('ok', ids.length)"` (run from `~/word-defenders`)
Expected: `ok 12`

- [ ] **Step 6: Commit**

```bash
cd ~/word-defenders
git add assets/
git commit -m "art: add alien and boss candidates for picking

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 7: Report CHECKPOINT A**

End your report with: "CHECKPOINT A: `assets/candidates/index.html` is ready. Ask the user to open it with their son and pick one Blob, Zoomer, Chonk and Boss (A/B/C)." The controller handles the question; continue to the next task without waiting.

---
### Task 3: Seeded RNG, Path Geometry and the Map

**Files:**
- Create: `src/logic/rng.js`, `src/logic/path.js`, `src/logic/map.js`
- Test: `tests/rng.test.js`, `tests/path.test.js`, `tests/map.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `createRng(seed: number) → () => number` (in [0, 1)), `shuffle(items, rng) → newArray`, `pickWeighted(weights: {[key]: number}, rng) → key`
  - `createPath(points: {x,y}[]) → { points, segments, length }` (throws on a diagonal segment); `positionAt(path, distance) → { x, y, dir }` with `dir` in `east|west|north|south`
  - `TILE = 32`, `COLS = 32`, `ROWS = 18`, `HUD_ROWS = 2`, `GAME_WIDTH = 1024`, `GAME_HEIGHT = 576`, `MAP_1`, `cellCenter(col, row) → {x,y}`, `pathCells(map) → [col,row][]`, `buildPath(map) → path`, `padPositions(map) → {x,y}[]`, `basePosition(map) → {x,y}`, `portalPosition(map) → {x,y}`, `terrainCorners(map, cols?, rows?) → {NW,NE,SW,SE}[][]` with values `'lower'` (path) or `'upper'` (ground)

- [ ] **Step 1: Write the failing tests**

`tests/rng.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createRng, shuffle, pickWeighted } from '../src/logic/rng.js';

describe('createRng', () => {
  it('is deterministic for a seed and stays in [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    const valuesA = Array.from({ length: 100 }, a);
    const valuesB = Array.from({ length: 100 }, b);
    expect(valuesA).toEqual(valuesB);
    expect(valuesA.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('differs between seeds', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, createRng(3));
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('pickWeighted', () => {
  it('only returns keys with positive weight', () => {
    const rng = createRng(9);
    for (let i = 0; i < 200; i++) {
      expect(['blob', 'zoomer']).toContain(pickWeighted({ blob: 3, zoomer: 1, chonk: 0 }, rng));
    }
  });

  it('roughly follows the weights', () => {
    const rng = createRng(11);
    let blobs = 0;
    for (let i = 0; i < 4000; i++) if (pickWeighted({ blob: 3, zoomer: 1 }, rng) === 'blob') blobs += 1;
    expect(blobs / 4000).toBeGreaterThan(0.7);
    expect(blobs / 4000).toBeLessThan(0.8);
  });
});
```

`tests/path.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createPath, positionAt } from '../src/logic/path.js';

const L_PATH = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 50 },
];

describe('createPath', () => {
  it('sums segment lengths', () => {
    expect(createPath(L_PATH).length).toBe(150);
  });

  it('rejects diagonal segments', () => {
    expect(() => createPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toThrow(/right angles/);
  });
});

describe('positionAt', () => {
  const path = createPath(L_PATH);

  it('interpolates along the first segment', () => {
    expect(positionAt(path, 40)).toEqual({ x: 40, y: 0, dir: 'east' });
  });

  it('turns the corner', () => {
    expect(positionAt(path, 120)).toEqual({ x: 100, y: 20, dir: 'south' });
  });

  it('clamps to the ends', () => {
    expect(positionAt(path, -5)).toEqual({ x: 0, y: 0, dir: 'east' });
    expect(positionAt(path, 999)).toEqual({ x: 100, y: 50, dir: 'south' });
  });

  it('reports west and north', () => {
    const back = createPath([{ x: 50, y: 50 }, { x: 0, y: 50 }, { x: 0, y: 0 }]);
    expect(positionAt(back, 10).dir).toBe('west');
    expect(positionAt(back, 60).dir).toBe('north');
  });
});
```

`tests/map.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  MAP_1, TILE, COLS, ROWS, HUD_ROWS, GAME_WIDTH, GAME_HEIGHT,
  cellCenter, pathCells, buildPath, padPositions, basePosition, portalPosition, terrainCorners,
} from '../src/logic/map.js';

const chebyshev = ([c1, r1], [c2, r2]) => Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2));

describe('grid', () => {
  it('is 32x18 tiles of 32px', () => {
    expect([TILE, COLS, ROWS, GAME_WIDTH, GAME_HEIGHT]).toEqual([32, 32, 18, 1024, 576]);
  });

  it('centres cells', () => {
    expect(cellCenter(0, 4)).toEqual({ x: 16, y: 144 });
  });
});

describe('MAP_1 path', () => {
  it('is 58 tiles long from the portal to the base', () => {
    const path = buildPath(MAP_1);
    expect(path.length).toBe(58 * TILE);
    expect(path.points[0]).toEqual(portalPosition(MAP_1));
    expect(path.points.at(-1)).toEqual({ x: 944, y: 304 });
  });

  it('covers 59 distinct cells', () => {
    const cells = pathCells(MAP_1);
    expect(cells).toHaveLength(59);
    expect(new Set(cells.map(String)).size).toBe(59);
  });
});

describe('MAP_1 pads', () => {
  const cells = pathCells(MAP_1);

  it('has 8 pads inside the playfield', () => {
    expect(MAP_1.pads).toHaveLength(8);
    for (const [c, r] of MAP_1.pads) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(COLS);
      expect(r).toBeGreaterThanOrEqual(HUD_ROWS);
      expect(r).toBeLessThan(ROWS);
    }
  });

  it('keeps every pad exactly 2 tiles from the path (on grass, in Blaster range)', () => {
    for (const pad of MAP_1.pads) {
      const nearest = Math.min(...cells.map((cell) => chebyshev(pad, cell)));
      expect(nearest).toBe(2);
    }
  });

  it('keeps pads off the base', () => {
    const { col, row, cols, rows } = MAP_1.base;
    for (const [c, r] of MAP_1.pads) {
      const inside = c >= col && c < col + cols && r >= row && r < row + rows;
      expect(inside).toBe(false);
    }
  });

  it('converts pads to pixel centres', () => {
    expect(padPositions(MAP_1)[0]).toEqual(cellCenter(4, 6));
  });
});

describe('basePosition', () => {
  it('is the centre of the 3x3 base area', () => {
    expect(basePosition(MAP_1)).toEqual({ x: 976, y: 304 });
  });
});

describe('terrainCorners', () => {
  const grid = terrainCorners(MAP_1);

  it('has one entry per cell', () => {
    expect(grid).toHaveLength(ROWS);
    expect(grid[0]).toHaveLength(COLS);
  });

  it('marks all corners of a path cell as path', () => {
    expect(grid[4][3]).toEqual({ NW: 'lower', NE: 'lower', SW: 'lower', SE: 'lower' });
  });

  it('marks the bottom corners of the cell above the path', () => {
    expect(grid[3][3]).toEqual({ NW: 'upper', NE: 'upper', SW: 'lower', SE: 'lower' });
  });

  it('marks cells two away as ground', () => {
    expect(grid[2][3]).toEqual({ NW: 'upper', NE: 'upper', SW: 'upper', SE: 'upper' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL. The three new files report `Failed to load url ../src/logic/rng.js` (or `path.js` / `map.js`).

- [ ] **Step 3: Implement `src/logic/rng.js`**

```js
// Seeded pseudo-random numbers (mulberry32). Logic modules receive an rng
// function so tests can replay any game exactly.
export function createRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(items, rng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickWeighted(weights, rng) {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1][0];
}
```

- [ ] **Step 4: Implement `src/logic/path.js`**

```js
// A path is a list of waypoints joined by horizontal or vertical segments.
export function createPath(points) {
  const segments = [];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.x !== b.x && a.y !== b.y) {
      throw new Error(`Path segment ${i} is diagonal; paths turn only at right angles`);
    }
    const len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    segments.push({ a, b, start: length, len, dir: directionOf(a, b) });
    length += len;
  }
  return { points, segments, length };
}

export function positionAt(path, distance) {
  const d = Math.max(0, Math.min(distance, path.length));
  for (const s of path.segments) {
    if (d <= s.start + s.len) {
      const t = s.len === 0 ? 0 : (d - s.start) / s.len;
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, dir: s.dir };
    }
  }
  const last = path.segments[path.segments.length - 1];
  return { x: last.b.x, y: last.b.y, dir: last.dir };
}

function directionOf(a, b) {
  if (b.x > a.x) return 'east';
  if (b.x < a.x) return 'west';
  if (b.y > a.y) return 'south';
  return 'north';
}
```

- [ ] **Step 5: Implement `src/logic/map.js`**

```js
import { createPath } from './path.js';

export const TILE = 32;
export const COLS = 32;
export const ROWS = 18;
export const HUD_ROWS = 2;
export const GAME_WIDTH = COLS * TILE;
export const GAME_HEIGHT = ROWS * TILE;

// Cell coordinates are [col, row]. The path runs from the portal (left) to the base (right).
export const MAP_1 = Object.freeze({
  waypoints: [[0, 4], [6, 4], [6, 13], [13, 13], [13, 6], [20, 6], [20, 14], [27, 14], [27, 9], [29, 9]],
  pads: [[4, 6], [8, 11], [11, 11], [15, 8], [18, 8], [22, 12], [25, 12], [29, 12]],
  portal: [0, 4],
  base: { col: 29, row: 8, cols: 3, rows: 3 },
});

export function cellCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

export function pathCells(map) {
  const cells = [];
  const seen = new Set();
  for (let i = 1; i < map.waypoints.length; i++) {
    const [c0, r0] = map.waypoints[i - 1];
    const [c1, r1] = map.waypoints[i];
    const dc = Math.sign(c1 - c0);
    const dr = Math.sign(r1 - r0);
    const steps = Math.abs(c1 - c0) + Math.abs(r1 - r0);
    for (let s = 0; s <= steps; s++) {
      const cell = [c0 + dc * s, r0 + dr * s];
      const key = cell.join(',');
      if (!seen.has(key)) {
        seen.add(key);
        cells.push(cell);
      }
    }
  }
  return cells;
}

export function buildPath(map) {
  return createPath(map.waypoints.map(([col, row]) => cellCenter(col, row)));
}

export function padPositions(map) {
  return map.pads.map(([col, row]) => cellCenter(col, row));
}

export function basePosition(map) {
  const { col, row, cols, rows } = map.base;
  return { x: (col + cols / 2) * TILE, y: (row + rows / 2) * TILE };
}

export function portalPosition(map) {
  return cellCenter(map.portal[0], map.portal[1]);
}

// Corner-based (Wang) autotiling: a grid vertex is path ("lower") when any
// cell touching it is a path cell; everything else is ground ("upper").
export function terrainCorners(map, cols = COLS, rows = ROWS) {
  const path = new Set(pathCells(map).map((cell) => cell.join(',')));
  const isPath = (c, r) => path.has(`${c},${r}`);
  const vertex = (vx, vy) =>
    isPath(vx - 1, vy - 1) || isPath(vx, vy - 1) || isPath(vx - 1, vy) || isPath(vx, vy) ? 'lower' : 'upper';
  const grid = [];
  for (let row = 0; row < rows; row++) {
    const line = [];
    for (let col = 0; col < cols; col++) {
      line.push({
        NW: vertex(col, row),
        NE: vertex(col + 1, row),
        SW: vertex(col, row + 1),
        SE: vertex(col + 1, row + 1),
      });
    }
    grid.push(line);
  }
  return grid;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests in `rng`, `path`, `map` and `boundary`.

- [ ] **Step 7: Commit**

```bash
git add src/logic tests
git commit -m "feat(logic): seeded rng, path geometry and map 1

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Word Lists, the Word Deck and Boss Words

**Files:**
- Create: `src/logic/words.js`
- Test: `tests/words.test.js`

**Interfaces:**
- Consumes: `shuffle(items, rng)` from `src/logic/rng.js`.
- Produces:
  - `MIN_WORDS = 5`, `MAX_WORDS = 50`, `MAX_WORD_LENGTH = 20`, `STARTER_WORDS: string[]` (15 words)
  - `parseWordList(text: string) → { words: string[], errors: { line: number|null, text: string, message: string }[] }`
  - `createDeck(words: string[], rng) → { draw(onScreenFirstLetters: Set<string>) → string }` (letters are lowercase)
  - `pickBossWords(words: string[], count: number, rng) → string[]` (distinct)

- [ ] **Step 1: Write the failing tests**

`tests/words.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  parseWordList, createDeck, pickBossWords, STARTER_WORDS, MIN_WORDS, MAX_WORDS, MAX_WORD_LENGTH,
} from '../src/logic/words.js';
import { createRng } from '../src/logic/rng.js';

const BAD_CHARS = 'Use only letters, apostrophes and hyphens.';

describe('constants', () => {
  it('match the spec', () => {
    expect([MIN_WORDS, MAX_WORDS, MAX_WORD_LENGTH]).toEqual([5, 50, 20]);
    expect(STARTER_WORDS).toEqual([
      'after', 'again', 'around', 'because', 'before', 'could', 'every', 'friend',
      'house', 'little', 'people', 'their', 'there', 'water', 'would',
    ]);
  });

  it('starter list is itself valid', () => {
    expect(parseWordList(STARTER_WORDS.join('\n'))).toEqual({ words: STARTER_WORDS, errors: [] });
  });
});

describe('parseWordList', () => {
  it('trims, drops blank lines and case-insensitive duplicates, keeping the first spelling', () => {
    const { words, errors } = parseWordList('  because\n\nFriend\nfriend\nagain\n house \nwater\n');
    expect(errors).toEqual([]);
    expect(words).toEqual(['because', 'Friend', 'again', 'house', 'water']);
  });

  it('accepts Windows line endings and curly apostrophes from pasted documents', () => {
    const { words, errors } = parseWordList('don’t\r\ncan‘t\r\nit’s\r\nhouse\r\nwater');
    expect(errors).toEqual([]);
    expect(words).toEqual(["don't", "can't", "it's", 'house', 'water']);
  });

  it('accepts hyphens and one-letter words', () => {
    const { words, errors } = parseWordList('a\nI\nice-cream\nhouse\nwater');
    expect(errors).toEqual([]);
    expect(words).toEqual(['a', 'I', 'ice-cream', 'house', 'water']);
  });

  it('reports bad characters with the 1-based line number', () => {
    const { errors } = parseWordList('house\nice cream\nwater\nfriend\nagain\nr2d2');
    expect(errors).toEqual([
      { line: 2, text: 'ice cream', message: BAD_CHARS },
      { line: 6, text: 'r2d2', message: BAD_CHARS },
    ]);
  });

  it('rejects words that start or end with punctuation', () => {
    const { errors } = parseWordList("'til\nhouse\nwater\nfriend\nagain\nmom-");
    expect(errors.map((e) => e.line)).toEqual([1, 6]);
  });

  it('rejects words longer than 20 characters', () => {
    const long = 'supercalifragilistics';
    expect(long).toHaveLength(21);
    const { errors } = parseWordList(`${long}\nhouse\nwater\nfriend\nagain`);
    expect(errors).toEqual([{ line: 1, text: long, message: 'Keep words to 20 letters or fewer.' }]);
  });

  it('requires at least 5 words', () => {
    expect(parseWordList('house\nwater\nfriend\nagain').errors).toEqual([
      { line: null, text: '', message: 'Add at least 5 words.' },
    ]);
  });

  it('allows at most 50 words', () => {
    const letter = (n) => String.fromCharCode(97 + n);
    const text = Array.from({ length: 51 }, (_, i) => `word${letter(i % 26)}${letter(Math.floor(i / 26))}`).join('\n');
    expect(parseWordList(text).errors).toEqual([{ line: null, text: '', message: 'Use 50 words or fewer.' }]);
  });

  it('skips the count check while there are line errors', () => {
    expect(parseWordList('r2d2').errors).toEqual([{ line: 1, text: 'r2d2', message: BAD_CHARS }]);
  });
});

describe('createDeck', () => {
  it('uses every word once before repeating, across reshuffles', () => {
    const words = ['after', 'again', 'because', 'could', 'every', 'friend'];
    const deck = createDeck(words, createRng(1));
    for (let round = 0; round < 3; round++) {
      const drawn = Array.from({ length: words.length }, () => deck.draw(new Set()));
      expect([...drawn].sort()).toEqual([...words].sort());
    }
  });

  it('prefers a word whose first letter is not already on screen', () => {
    const deck = createDeck(['apple', 'ant', 'axe', 'bee'], createRng(2));
    expect(deck.draw(new Set(['a']))).toBe('bee');
  });

  it('compares first letters case-insensitively', () => {
    const deck = createDeck(['Apple', 'bee'], createRng(5));
    expect(deck.draw(new Set(['a']))).toBe('bee');
  });

  it('falls back to the next word when every first letter is taken', () => {
    const deck = createDeck(['apple', 'ant'], createRng(3));
    expect(['apple', 'ant']).toContain(deck.draw(new Set(['a'])));
  });

  it('keeps drawing from a 5-word list beyond its length', () => {
    const words = ['cat', 'dog', 'house', 'water', 'friend'];
    const deck = createDeck(words, createRng(8));
    const drawn = Array.from({ length: 23 }, () => deck.draw(new Set()));
    expect(drawn.every((w) => words.includes(w))).toBe(true);
  });
});

describe('pickBossWords', () => {
  it('draws distinct words from the longest third of the list', () => {
    const words = ['a', 'be', 'cat', 'dogs', 'horse', 'friend', 'because', 'beautiful', 'everybody'];
    const picked = pickBossWords(words, 2, createRng(4));
    expect(new Set(picked).size).toBe(2);
    for (const w of picked) expect(['beautiful', 'everybody', 'because']).toContain(w);
  });

  it('widens the pool when the longest third is smaller than the shield count', () => {
    const words = ['cat', 'dog', 'house', 'water', 'friend'];
    const picked = pickBossWords(words, 3, createRng(5));
    expect(new Set(picked).size).toBe(3);
    for (const w of picked) expect(['friend', 'house', 'water']).toContain(w);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/words.test.js`
Expected: FAIL with `Failed to load url ../src/logic/words.js`.

- [ ] **Step 3: Implement `src/logic/words.js`**

```js
import { shuffle } from './rng.js';

export const MIN_WORDS = 5;
export const MAX_WORDS = 50;
export const MAX_WORD_LENGTH = 20;

export const STARTER_WORDS = Object.freeze([
  'after', 'again', 'around', 'because', 'before', 'could', 'every', 'friend',
  'house', 'little', 'people', 'their', 'there', 'water', 'would',
]);

// Letters, with apostrophes or hyphens allowed inside the word only.
const WORD_PATTERN = /^[a-z](?:[a-z'-]*[a-z])?$/i;
// Curly quotes that word processors substitute for a typed apostrophe.
const CURLY_APOSTROPHES = /[‘’ʼ]/g;

export function parseWordList(text) {
  const words = [];
  const seen = new Set();
  const errors = [];
  String(text ?? '')
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const word = raw.trim().replace(CURLY_APOSTROPHES, "'");
      if (word === '') return;
      const line = index + 1;
      if (!WORD_PATTERN.test(word)) {
        errors.push({ line, text: word, message: 'Use only letters, apostrophes and hyphens.' });
        return;
      }
      if (word.length > MAX_WORD_LENGTH) {
        errors.push({ line, text: word, message: `Keep words to ${MAX_WORD_LENGTH} letters or fewer.` });
        return;
      }
      const key = word.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      words.push(word);
    });
  if (errors.length === 0 && words.length < MIN_WORDS) {
    errors.push({ line: null, text: '', message: `Add at least ${MIN_WORDS} words.` });
  }
  if (errors.length === 0 && words.length > MAX_WORDS) {
    errors.push({ line: null, text: '', message: `Use ${MAX_WORDS} words or fewer.` });
  }
  return { words, errors };
}

// Draws every word once (shuffled) before any word repeats.
export function createDeck(words, rng) {
  let remaining = [];
  return {
    draw(onScreenFirstLetters = new Set()) {
      if (remaining.length === 0) remaining = shuffle(words, rng);
      let index = remaining.findIndex((word) => !onScreenFirstLetters.has(word[0].toLowerCase()));
      if (index === -1) index = 0;
      return remaining.splice(index, 1)[0];
    },
  };
}

export function pickBossWords(words, count, rng) {
  const byLength = words
    .map((word, index) => ({ word, index }))
    .sort((a, b) => b.word.length - a.word.length || a.index - b.index)
    .map((entry) => entry.word);
  const poolSize = Math.min(words.length, Math.max(Math.ceil(words.length / 3), count));
  return shuffle(byLength.slice(0, poolSize), rng).slice(0, count);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 5: Commit**

```bash
git add src/logic/words.js tests/words.test.js
git commit -m "feat(logic): word list parsing, word deck and boss words

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Typing — Lock-on and Letter Matching

**Files:**
- Create: `src/logic/typing.js`
- Test: `tests/typing.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `normalizeKey(key: string) → string | null` — a lowercase letter, `'`, `-`, `'escape'`, or `null` for everything else
  - `readKeyEvent(event: { key, repeat?, ctrlKey?, metaKey?, altKey? }) → string | null` — `null` for auto-repeat and shortcut chords
  - `createTyping() → { targetId: null, index: 0 }`
  - `pressKey(state, key, targets: { id, word, distance }[]) → { state, events, handled }`. Events: `{type:'lock', id}`, `{type:'correct', id, index}`, `{type:'wrong', id, expected}`, `{type:'miss'}`, `{type:'complete', id}`, `{type:'release', id}`
  - `syncTyping(state, targets) → { state, events }` — releases a lock whose target disappeared

- [ ] **Step 1: Write the failing tests**

`tests/typing.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { normalizeKey, readKeyEvent, createTyping, pressKey, syncTyping } from '../src/logic/typing.js';

const TARGETS = [
  { id: 1, word: 'cat', distance: 100 },
  { id: 2, word: 'car', distance: 300 },
  { id: 3, word: "don't", distance: 50 },
];

function typeAll(keys, targets = TARGETS, start = createTyping()) {
  let state = start;
  const events = [];
  for (const k of keys) {
    const r = pressKey(state, k, targets);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

describe('normalizeKey', () => {
  it('lowercases letters', () => {
    expect(normalizeKey('A')).toBe('a');
    expect(normalizeKey('z')).toBe('z');
  });

  it('accepts apostrophes and hyphens', () => {
    expect(normalizeKey("'")).toBe("'");
    expect(normalizeKey('-')).toBe('-');
  });

  it('maps Escape', () => {
    expect(normalizeKey('Escape')).toBe('escape');
  });

  it('ignores modifiers, navigation, digits and space', () => {
    for (const k of ['Shift', 'CapsLock', 'Meta', 'Control', 'Alt', 'Tab', 'ArrowLeft', 'Enter', 'Backspace', ' ', '1', 'é']) {
      expect(normalizeKey(k)).toBeNull();
    }
  });
});

describe('readKeyEvent', () => {
  it('passes plain keys through', () => {
    expect(readKeyEvent({ key: 'a' })).toBe('a');
  });

  it('drops auto-repeat from a held key', () => {
    expect(readKeyEvent({ key: 'l', repeat: true })).toBeNull();
  });

  it('drops shortcut chords so the browser keeps them', () => {
    expect(readKeyEvent({ key: 'r', metaKey: true })).toBeNull();
    expect(readKeyEvent({ key: 'r', ctrlKey: true })).toBeNull();
    expect(readKeyEvent({ key: 'r', altKey: true })).toBeNull();
  });
});

describe('pressKey', () => {
  it('locks onto the matching alien furthest along the path', () => {
    const r = pressKey(createTyping(), 'c', TARGETS);
    expect(r.state).toEqual({ targetId: 2, index: 1 });
    expect(r.events).toEqual([{ type: 'lock', id: 2 }, { type: 'correct', id: 2, index: 0 }]);
    expect(r.handled).toBe(true);
  });

  it('buzzes on a first letter that matches nothing', () => {
    const r = pressKey(createTyping(), 'q', TARGETS);
    expect(r.state).toEqual(createTyping());
    expect(r.events).toEqual([{ type: 'miss' }]);
    expect(r.handled).toBe(true);
  });

  it('stays on the same letter after a wrong key', () => {
    const { state } = typeAll(['c']);
    const r = pressKey(state, 'x', TARGETS);
    expect(r.state).toEqual({ targetId: 2, index: 1 });
    expect(r.events).toEqual([{ type: 'wrong', id: 2, expected: 'a' }]);
  });

  it('completes a word and resets the lock', () => {
    const { state, events } = typeAll(['c', 'a', 'r']);
    expect(state).toEqual(createTyping());
    expect(events.slice(-2)).toEqual([{ type: 'correct', id: 2, index: 2 }, { type: 'complete', id: 2 }]);
  });

  it('ignores capital letters', () => {
    const { events } = typeAll(['C', 'A', 'R']);
    expect(events.at(-1)).toEqual({ type: 'complete', id: 2 });
  });

  it('matches capitalised words', () => {
    const { events } = typeAll(['m', 'o', 'n'], [{ id: 9, word: 'Mon', distance: 0 }]);
    expect(events.at(-1)).toEqual({ type: 'complete', id: 9 });
  });

  it('types apostrophes', () => {
    const { events } = typeAll(['d', 'o', 'n', "'", 't']);
    expect(events.at(-1)).toEqual({ type: 'complete', id: 3 });
  });

  it('releases on Escape', () => {
    const { state } = typeAll(['c']);
    const r = pressKey(state, 'Escape', TARGETS);
    expect(r.state).toEqual(createTyping());
    expect(r.events).toEqual([{ type: 'release', id: 2 }]);
    expect(r.handled).toBe(true);
  });

  it('ignores Shift mid-word without a wrong event', () => {
    const { state } = typeAll(['c']);
    const r = pressKey(state, 'Shift', TARGETS);
    expect(r).toEqual({ state, events: [], handled: false });
  });

  it('re-locks fresh when the locked alien is gone', () => {
    const r = pressKey({ targetId: 99, index: 2 }, 'c', TARGETS);
    expect(r.events).toEqual([
      { type: 'release', id: 99 },
      { type: 'lock', id: 2 },
      { type: 'correct', id: 2, index: 0 },
    ]);
  });

  it('picks the furthest alien when two share a word', () => {
    const twins = [
      { id: 1, word: 'cat', distance: 10 },
      { id: 2, word: 'cat', distance: 20 },
    ];
    expect(pressKey(createTyping(), 'c', twins).state.targetId).toBe(2);
  });

  it('completes a one-letter word on the first key', () => {
    const r = pressKey(createTyping(), 'a', [{ id: 5, word: 'a', distance: 0 }]);
    expect(r.events).toEqual([
      { type: 'lock', id: 5 },
      { type: 'correct', id: 5, index: 0 },
      { type: 'complete', id: 5 },
    ]);
    expect(r.state).toEqual(createTyping());
  });
});

describe('syncTyping', () => {
  it('releases when the target disappears', () => {
    const r = syncTyping({ targetId: 2, index: 1 }, [{ id: 1, word: 'cat', distance: 0 }]);
    expect(r).toEqual({ state: createTyping(), events: [{ type: 'release', id: 2 }] });
  });

  it('keeps the lock while the target exists', () => {
    const state = { targetId: 2, index: 1 };
    expect(syncTyping(state, TARGETS)).toEqual({ state, events: [] });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/typing.test.js`
Expected: FAIL with `Failed to load url ../src/logic/typing.js`.

- [ ] **Step 3: Implement `src/logic/typing.js`**

```js
const TYPABLE = /^[a-z'-]$/;

export function normalizeKey(key) {
  if (key === 'Escape') return 'escape';
  if (typeof key !== 'string' || key.length !== 1) return null;
  const lower = key.toLowerCase();
  return TYPABLE.test(lower) ? lower : null;
}

// Held-key auto-repeat and shortcut chords are not typing.
export function readKeyEvent(event) {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return null;
  return event.key;
}

export function createTyping() {
  return { targetId: null, index: 0 };
}

// targets: aliens that currently show a word, as { id, word, distance }.
export function pressKey(state, key, targets) {
  const k = normalizeKey(key);
  if (k === null) return { state, events: [], handled: false };

  if (k === 'escape') {
    if (state.targetId === null) return { state, events: [], handled: true };
    return { state: createTyping(), events: [{ type: 'release', id: state.targetId }], handled: true };
  }

  if (state.targetId === null) {
    const matches = targets.filter((t) => t.word[0].toLowerCase() === k);
    if (matches.length === 0) return { state, events: [{ type: 'miss' }], handled: true };
    const target = matches.reduce((best, t) => (t.distance > best.distance ? t : best));
    return advance({ targetId: target.id, index: 0 }, target, [{ type: 'lock', id: target.id }]);
  }

  const target = targets.find((t) => t.id === state.targetId);
  if (!target) {
    const fresh = pressKey(createTyping(), key, targets);
    return { ...fresh, events: [{ type: 'release', id: state.targetId }, ...fresh.events] };
  }

  const expected = target.word[state.index];
  if (expected.toLowerCase() === k) return advance(state, target, []);
  return { state, events: [{ type: 'wrong', id: target.id, expected }], handled: true };
}

export function syncTyping(state, targets) {
  if (state.targetId === null || targets.some((t) => t.id === state.targetId)) {
    return { state, events: [] };
  }
  return { state: createTyping(), events: [{ type: 'release', id: state.targetId }] };
}

function advance(state, target, events) {
  const out = [...events, { type: 'correct', id: target.id, index: state.index }];
  const index = state.index + 1;
  if (index >= target.word.length) {
    return { state: createTyping(), events: [...out, { type: 'complete', id: target.id }], handled: true };
  }
  return { state: { targetId: target.id, index }, events: out, handled: true };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 5: Commit**

```bash
git add src/logic/typing.js tests/typing.test.js
git commit -m "feat(logic): type-to-lock typing state machine

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 6: Aliens, Missions and Waves

**Files:**
- Create: `src/logic/aliens.js`, `src/logic/missions.js`, `src/logic/waves.js`
- Test: `tests/missions.test.js`

**Interfaces:**
- Consumes: `pickWeighted(weights, rng)` from `src/logic/rng.js`.
- Produces:
  - `BLOB_CROSSING_SECONDS = 30`, `ALIENS: { blob, zoomer, chonk, boss }` each `{ speed, hp, hearts, firstMission }` (boss also `hpPerShield`), `bossHp(shields) → number`, `baseSpeed(pathLength) → px/s`
  - `MISSIONS: { id, speed, waves: number[4], escorts, spawnGap, mix: {type: weight}, shields, newTower: string|null }[]`, `MISSION_COUNT = 10`, `getMission(id)` (throws for unknown ids)
  - `WAVES_PER_MISSION = 5`, `WAVE_LEAD_IN = 1.5`, `buildWave(mission, wave, rng) → { type, at }[]` (seconds from wave start, ascending)

- [ ] **Step 1: Write the failing tests**

`tests/missions.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { ALIENS, BLOB_CROSSING_SECONDS, bossHp, baseSpeed } from '../src/logic/aliens.js';
import { MISSIONS, MISSION_COUNT, getMission } from '../src/logic/missions.js';
import { buildWave, WAVES_PER_MISSION, WAVE_LEAD_IN } from '../src/logic/waves.js';
import { createRng } from '../src/logic/rng.js';

describe('ALIENS', () => {
  it('matches the spec table', () => {
    expect(ALIENS.blob).toEqual({ speed: 1, hp: 3, hearts: 1, firstMission: 1 });
    expect(ALIENS.zoomer).toEqual({ speed: 1.6, hp: 2, hearts: 1, firstMission: 2 });
    expect(ALIENS.chonk).toEqual({ speed: 0.7, hp: 9, hearts: 1, firstMission: 4 });
    expect(ALIENS.boss).toEqual({ speed: 0.5, hp: 20, hpPerShield: 10, hearts: 5, firstMission: 1 });
  });

  it('gives bosses 20 HP plus 10 per shield', () => {
    expect([bossHp(1), bossHp(2), bossHp(3)]).toEqual([30, 40, 50]);
  });

  it('makes a blob cross the path in 30 seconds', () => {
    expect(BLOB_CROSSING_SECONDS).toBe(30);
    expect(baseSpeed(1856)).toBeCloseTo(1856 / 30);
  });
});

describe('MISSIONS', () => {
  it('has missions 1 to 10', () => {
    expect(MISSION_COUNT).toBe(10);
    expect(MISSIONS.map((m) => m.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('matches the spec table', () => {
    expect(MISSIONS.map((m) => m.speed)).toEqual([1, 1.05, 1.1, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4]);
    expect(MISSIONS.map((m) => m.waves)).toEqual([
      [4, 5, 6, 7], [5, 6, 7, 8], [5, 6, 7, 8], [6, 7, 8, 9], [6, 7, 8, 9],
      [6, 8, 9, 10], [7, 8, 10, 11], [7, 9, 10, 12], [8, 9, 11, 12], [8, 10, 12, 14],
    ]);
    expect(MISSIONS.map((m) => m.escorts)).toEqual([3, 3, 4, 4, 4, 5, 5, 6, 6, 6]);
    expect(MISSIONS.map((m) => m.spawnGap)).toEqual([4.5, 4.3, 4.1, 4.0, 3.8, 3.6, 3.5, 3.3, 3.2, 3.0]);
    expect(MISSIONS.map((m) => m.shields)).toEqual([1, 1, 1, 2, 2, 2, 2, 3, 3, 3]);
    expect(MISSIONS.map((m) => m.newTower)).toEqual(['blaster', null, 'freeze', null, 'rocket', null, null, null, null, null]);
  });

  it('only mixes in aliens from their first mission onward', () => {
    for (const m of MISSIONS) {
      for (const type of Object.keys(m.mix)) {
        expect(ALIENS[type].firstMission).toBeLessThanOrEqual(m.id);
      }
    }
    expect(Object.keys(getMission(1).mix)).toEqual(['blob']);
    expect(Object.keys(getMission(4).mix)).toEqual(['blob', 'zoomer', 'chonk']);
  });

  it('throws for unknown missions', () => {
    expect(() => getMission(11)).toThrow(/Unknown mission/);
  });
});

describe('buildWave', () => {
  it('spawns the table count of regular aliens in waves 1-4', () => {
    const m = getMission(3);
    for (let wave = 1; wave <= 4; wave++) {
      const spawns = buildWave(m, wave, createRng(wave));
      expect(spawns).toHaveLength(m.waves[wave - 1]);
      expect(spawns.every((s) => s.type !== 'boss')).toBe(true);
    }
  });

  it('spawns escorts first and the boss last in wave 5', () => {
    const m = getMission(8);
    const spawns = buildWave(m, WAVES_PER_MISSION, createRng(1));
    expect(spawns).toHaveLength(m.escorts + 1);
    expect(spawns.at(-1).type).toBe('boss');
    expect(spawns.slice(0, -1).every((s) => s.type !== 'boss')).toBe(true);
  });

  it('spaces spawns by the mission gap after a lead-in', () => {
    const m = getMission(1);
    const spawns = buildWave(m, 2, createRng(1));
    spawns.forEach((s, i) => expect(s.at).toBeCloseTo(WAVE_LEAD_IN + i * m.spawnGap));
  });

  it('is reproducible for a seed', () => {
    const m = getMission(6);
    expect(buildWave(m, 3, createRng(77))).toEqual(buildWave(m, 3, createRng(77)));
  });

  it('only uses aliens from the mission mix', () => {
    const m = getMission(2);
    for (const s of buildWave(m, 4, createRng(5))) expect(['blob', 'zoomer']).toContain(s.type);
  });

  it('gives mission 1 enough aliens to show a 20-word list', () => {
    const m = getMission(1);
    const total = [1, 2, 3, 4, 5].reduce((sum, w) => sum + buildWave(m, w, createRng(w)).length, 0);
    expect(total).toBe(26);
  });

  it('rejects waves outside 1-5', () => {
    expect(() => buildWave(getMission(1), 6, createRng(1))).toThrow(/out of range/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/missions.test.js`
Expected: FAIL with `Failed to load url ../src/logic/aliens.js`.

- [ ] **Step 3: Implement `src/logic/aliens.js`**

```js
export const BLOB_CROSSING_SECONDS = 30;

export const ALIENS = Object.freeze({
  blob: Object.freeze({ speed: 1, hp: 3, hearts: 1, firstMission: 1 }),
  zoomer: Object.freeze({ speed: 1.6, hp: 2, hearts: 1, firstMission: 2 }),
  chonk: Object.freeze({ speed: 0.7, hp: 9, hearts: 1, firstMission: 4 }),
  boss: Object.freeze({ speed: 0.5, hp: 20, hpPerShield: 10, hearts: 5, firstMission: 1 }),
});

export function bossHp(shields) {
  return ALIENS.boss.hp + ALIENS.boss.hpPerShield * shields;
}

// Pixels per second for speed 1: a blob crosses the whole path in BLOB_CROSSING_SECONDS.
export function baseSpeed(pathLength) {
  return pathLength / BLOB_CROSSING_SECONDS;
}
```

- [ ] **Step 4: Implement `src/logic/missions.js`**

```js
// Starting values from the spec; tune here after play-testing.
const ALL = Object.freeze({ blob: 2, zoomer: 1, chonk: 1 });

export const MISSIONS = Object.freeze([
  { id: 1, speed: 1.0, waves: [4, 5, 6, 7], escorts: 3, spawnGap: 4.5, mix: { blob: 1 }, shields: 1, newTower: 'blaster' },
  { id: 2, speed: 1.05, waves: [5, 6, 7, 8], escorts: 3, spawnGap: 4.3, mix: { blob: 3, zoomer: 1 }, shields: 1, newTower: null },
  { id: 3, speed: 1.1, waves: [5, 6, 7, 8], escorts: 4, spawnGap: 4.1, mix: { blob: 2, zoomer: 1 }, shields: 1, newTower: 'freeze' },
  { id: 4, speed: 1.1, waves: [6, 7, 8, 9], escorts: 4, spawnGap: 4.0, mix: { blob: 3, zoomer: 1, chonk: 1 }, shields: 2, newTower: null },
  { id: 5, speed: 1.15, waves: [6, 7, 8, 9], escorts: 4, spawnGap: 3.8, mix: ALL, shields: 2, newTower: 'rocket' },
  { id: 6, speed: 1.2, waves: [6, 8, 9, 10], escorts: 5, spawnGap: 3.6, mix: ALL, shields: 2, newTower: null },
  { id: 7, speed: 1.25, waves: [7, 8, 10, 11], escorts: 5, spawnGap: 3.5, mix: ALL, shields: 2, newTower: null },
  { id: 8, speed: 1.3, waves: [7, 9, 10, 12], escorts: 6, spawnGap: 3.3, mix: ALL, shields: 3, newTower: null },
  { id: 9, speed: 1.35, waves: [8, 9, 11, 12], escorts: 6, spawnGap: 3.2, mix: ALL, shields: 3, newTower: null },
  { id: 10, speed: 1.4, waves: [8, 10, 12, 14], escorts: 6, spawnGap: 3.0, mix: ALL, shields: 3, newTower: null },
]);

export const MISSION_COUNT = MISSIONS.length;

export function getMission(id) {
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) throw new Error(`Unknown mission ${id}`);
  return mission;
}
```

- [ ] **Step 5: Implement `src/logic/waves.js`**

```js
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
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 7: Commit**

```bash
git add src/logic tests/missions.test.js
git commit -m "feat(logic): alien stats, mission table and wave schedules

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Towers — Stats, Targeting, Slow and Facing

**Files:**
- Create: `src/logic/towers.js`
- Test: `tests/towers.test.js`

**Interfaces:**
- Consumes: `TILE` from `src/logic/map.js`.
- Produces:
  - `MAX_LEVEL = 3`, `DIRECTIONS_8` (`east, south-east, south, south-west, west, north-west, north, north-east`), `TOWERS: { blaster, freeze, rocket }` each `{ name, costs: [L1, L2, L3], firstMission, range (tiles), ... }`, `TOWER_TYPES`
  - `towerStats(type, level) → { range (px), damage, rate (shots/s), slow (0..1), splash (px), projectileSpeed (px/s) }`
  - `availableTowers(missionId) → string[]`
  - `pickTarget(origin: {x,y}, range, candidates: {x,y,distance}[]) → candidate | null` (furthest along the path within range)
  - `slowAt(pos: {x,y}, freezeTowers: {x,y,range,slow}[]) → number` (strongest covering slow; slows don't stack)
  - `facingFor(dx, dy) → one of DIRECTIONS_8` (screen coordinates, y grows downward)

- [ ] **Step 1: Write the failing tests**

`tests/towers.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  TOWERS, TOWER_TYPES, MAX_LEVEL, DIRECTIONS_8, towerStats, availableTowers, pickTarget, slowAt, facingFor,
} from '../src/logic/towers.js';

describe('TOWERS', () => {
  it('matches the spec costs and unlocks', () => {
    expect(TOWER_TYPES).toEqual(['blaster', 'freeze', 'rocket']);
    expect(MAX_LEVEL).toBe(3);
    expect(TOWERS.blaster.costs).toEqual([20, 15, 25]);
    expect(TOWERS.freeze.costs).toEqual([30, 20, 30]);
    expect(TOWERS.rocket.costs).toEqual([40, 25, 35]);
    expect(TOWER_TYPES.map((t) => TOWERS[t].firstMission)).toEqual([1, 3, 5]);
    expect(TOWER_TYPES.map((t) => TOWERS[t].name)).toEqual(['Blaster', 'Freeze Ray', 'Rocket']);
  });
});

describe('towerStats', () => {
  it('gives a level-1 blaster 1 damage, 1 shot/s and 3 tiles of range', () => {
    expect(towerStats('blaster', 1)).toEqual({ range: 96, damage: 1, rate: 1, slow: 0, splash: 0, projectileSpeed: 480 });
  });

  it('adds 50% damage and 10% range per upgrade', () => {
    const l2 = towerStats('blaster', 2);
    const l3 = towerStats('blaster', 3);
    expect(l2.damage).toBeCloseTo(1.5);
    expect(l2.range).toBeCloseTo(105.6);
    expect(l3.damage).toBeCloseTo(2);
    expect(l3.range).toBeCloseTo(115.2);
  });

  it('raises the freeze slow per level and does no damage', () => {
    expect([1, 2, 3].map((l) => towerStats('freeze', l).slow)).toEqual([0.3, 0.45, 0.6]);
    expect(towerStats('freeze', 1)).toMatchObject({ range: 80, damage: 0, rate: 0 });
  });

  it('gives rockets splash damage', () => {
    expect(towerStats('rocket', 1)).toEqual({ range: 112, damage: 3, rate: 0.4, slow: 0, splash: 32, projectileSpeed: 300 });
  });
});

describe('availableTowers', () => {
  it('unlocks towers by mission', () => {
    expect(availableTowers(1)).toEqual(['blaster']);
    expect(availableTowers(2)).toEqual(['blaster']);
    expect(availableTowers(3)).toEqual(['blaster', 'freeze']);
    expect(availableTowers(5)).toEqual(['blaster', 'freeze', 'rocket']);
    expect(availableTowers(10)).toEqual(['blaster', 'freeze', 'rocket']);
  });
});

describe('pickTarget', () => {
  const origin = { x: 0, y: 0 };

  it('picks the in-range alien furthest along the path', () => {
    const a = { id: 1, x: 10, y: 0, distance: 50 };
    const b = { id: 2, x: 20, y: 0, distance: 80 };
    const far = { id: 3, x: 500, y: 0, distance: 999 };
    expect(pickTarget(origin, 96, [a, b, far])).toBe(b);
  });

  it('returns null when nothing is in range', () => {
    expect(pickTarget(origin, 96, [{ id: 1, x: 200, y: 0, distance: 1 }])).toBeNull();
  });
});

describe('slowAt', () => {
  it('uses the strongest covering freeze tower', () => {
    const towers = [
      { x: 0, y: 0, range: 80, slow: 0.3 },
      { x: 50, y: 0, range: 80, slow: 0.6 },
      { x: 900, y: 0, range: 80, slow: 0.9 },
    ];
    expect(slowAt({ x: 40, y: 0 }, towers)).toBe(0.6);
  });

  it('is 0 outside every range', () => {
    expect(slowAt({ x: 500, y: 500 }, [{ x: 0, y: 0, range: 80, slow: 0.3 }])).toBe(0);
  });
});

describe('facingFor', () => {
  it('maps vectors to the 8 sprite directions (y grows downward)', () => {
    expect(facingFor(1, 0)).toBe('east');
    expect(facingFor(1, 1)).toBe('south-east');
    expect(facingFor(0, 1)).toBe('south');
    expect(facingFor(-1, 1)).toBe('south-west');
    expect(facingFor(-1, 0)).toBe('west');
    expect(facingFor(-1, -1)).toBe('north-west');
    expect(facingFor(0, -1)).toBe('north');
    expect(facingFor(1, -1)).toBe('north-east');
  });

  it('lists all 8 directions', () => {
    expect(DIRECTIONS_8).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/towers.test.js`
Expected: FAIL with `Failed to load url ../src/logic/towers.js`.

- [ ] **Step 3: Implement `src/logic/towers.js`**

```js
import { TILE } from './map.js';

export const MAX_LEVEL = 3;

export const DIRECTIONS_8 = Object.freeze([
  'east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east',
]);

// Ranges are in tiles; towerStats converts them to pixels.
export const TOWERS = Object.freeze({
  blaster: Object.freeze({ name: 'Blaster', costs: [20, 15, 25], firstMission: 1, range: 3, damage: 1, rate: 1, projectileSpeed: 480 }),
  freeze: Object.freeze({ name: 'Freeze Ray', costs: [30, 20, 30], firstMission: 3, range: 2.5, slow: [0.3, 0.45, 0.6] }),
  rocket: Object.freeze({ name: 'Rocket', costs: [40, 25, 35], firstMission: 5, range: 3.5, damage: 3, rate: 0.4, splash: 1, projectileSpeed: 300 }),
});

export const TOWER_TYPES = Object.freeze(Object.keys(TOWERS));

export function towerStats(type, level) {
  const t = TOWERS[type];
  const upgrades = level - 1;
  return {
    range: t.range * TILE * (1 + 0.1 * upgrades),
    damage: t.damage ? t.damage * (1 + 0.5 * upgrades) : 0,
    rate: t.rate ?? 0,
    slow: t.slow ? t.slow[level - 1] : 0,
    splash: t.splash ? t.splash * TILE : 0,
    projectileSpeed: t.projectileSpeed ?? 0,
  };
}

export function availableTowers(missionId) {
  return TOWER_TYPES.filter((type) => TOWERS[type].firstMission <= missionId);
}

export function pickTarget(origin, range, candidates) {
  let best = null;
  for (const c of candidates) {
    if (Math.hypot(c.x - origin.x, c.y - origin.y) > range) continue;
    if (best === null || c.distance > best.distance) best = c;
  }
  return best;
}

export function slowAt(pos, freezeTowers) {
  let slow = 0;
  for (const t of freezeTowers) {
    if (Math.hypot(pos.x - t.x, pos.y - t.y) <= t.range) slow = Math.max(slow, t.slow);
  }
  return slow;
}

export function facingFor(dx, dy) {
  const index = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return DIRECTIONS_8[(index + 8) % 8];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 5: Commit**

```bash
git add src/logic/towers.js tests/towers.test.js
git commit -m "feat(logic): tower stats, targeting, freeze slow and facing

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Coins and Stars

**Files:**
- Create: `src/logic/economy.js`, `src/logic/stars.js`
- Test: `tests/economy.test.js`

**Interfaces:**
- Consumes: `TOWERS`, `MAX_LEVEL` from `src/logic/towers.js`.
- Produces:
  - `REWARDS = { typedKill: 5, towerKill: 2, boss: 25, waveClear: 10, missionStart: 30 }`
  - `buildCost(type)`, `upgradeCost(type, level) → number | null` (cost from `level` to `level + 1`; `null` at max), `totalSpent(type, level)`, `sellValue(type, level)` (floor of half the total spent), `killReward({ alienType, by }) → number`
  - `starsFor({ hearts, retried }) → 1 | 2 | 3`

- [ ] **Step 1: Write the failing tests**

`tests/economy.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { REWARDS, buildCost, upgradeCost, totalSpent, sellValue, killReward } from '../src/logic/economy.js';
import { starsFor } from '../src/logic/stars.js';

describe('REWARDS', () => {
  it('matches the spec', () => {
    expect(REWARDS).toEqual({ typedKill: 5, towerKill: 2, boss: 25, waveClear: 10, missionStart: 30 });
  });
});

describe('costs', () => {
  it('reads build and upgrade costs from the tower table', () => {
    expect(buildCost('blaster')).toBe(20);
    expect(upgradeCost('blaster', 1)).toBe(15);
    expect(upgradeCost('blaster', 2)).toBe(25);
    expect(upgradeCost('blaster', 3)).toBeNull();
    expect(buildCost('rocket')).toBe(40);
  });

  it('refunds half of everything spent, rounded down', () => {
    expect(totalSpent('blaster', 3)).toBe(60);
    expect(sellValue('blaster', 1)).toBe(10);
    expect(sellValue('blaster', 3)).toBe(30);
    expect(sellValue('rocket', 2)).toBe(32);
  });
});

describe('killReward', () => {
  it('pays more for typing than for towers', () => {
    expect(killReward({ alienType: 'blob', by: 'typing' })).toBe(5);
    expect(killReward({ alienType: 'chonk', by: 'tower' })).toBe(2);
  });

  it('pays 25 for a boss however it dies', () => {
    expect(killReward({ alienType: 'boss', by: 'tower' })).toBe(25);
  });
});

describe('starsFor', () => {
  it('uses the hearts thresholds', () => {
    expect(starsFor({ hearts: 10, retried: false })).toBe(3);
    expect(starsFor({ hearts: 8, retried: false })).toBe(3);
    expect(starsFor({ hearts: 7, retried: false })).toBe(2);
    expect(starsFor({ hearts: 4, retried: false })).toBe(2);
    expect(starsFor({ hearts: 3, retried: false })).toBe(1);
    expect(starsFor({ hearts: 1, retried: false })).toBe(1);
  });

  it('caps a retried mission at 1 star', () => {
    expect(starsFor({ hearts: 10, retried: true })).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/economy.test.js`
Expected: FAIL with `Failed to load url ../src/logic/economy.js`.

- [ ] **Step 3: Implement `src/logic/economy.js`**

```js
import { TOWERS, MAX_LEVEL } from './towers.js';

export const REWARDS = Object.freeze({ typedKill: 5, towerKill: 2, boss: 25, waveClear: 10, missionStart: 30 });

export function buildCost(type) {
  return TOWERS[type].costs[0];
}

// Cost to go from `level` to `level + 1`, or null at the maximum level.
export function upgradeCost(type, level) {
  return level >= MAX_LEVEL ? null : TOWERS[type].costs[level];
}

export function totalSpent(type, level) {
  return TOWERS[type].costs.slice(0, level).reduce((sum, cost) => sum + cost, 0);
}

export function sellValue(type, level) {
  return Math.floor(totalSpent(type, level) / 2);
}

export function killReward({ alienType, by }) {
  if (alienType === 'boss') return REWARDS.boss;
  return by === 'typing' ? REWARDS.typedKill : REWARDS.towerKill;
}
```

- [ ] **Step 4: Implement `src/logic/stars.js`**

```js
export function starsFor({ hearts, retried }) {
  if (retried || hearts <= 3) return 1;
  if (hearts <= 7) return 2;
  return 3;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 6: Commit**

```bash
git add src/logic/economy.js src/logic/stars.js tests/economy.test.js
git commit -m "feat(logic): coin rewards, tower costs and star rating

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Saving and Loading

**Files:**
- Create: `src/logic/save.js`
- Test: `tests/save.test.js`

**Interfaces:**
- Consumes: `parseWordList`, `STARTER_WORDS` from `src/logic/words.js`; `MISSION_COUNT` from `src/logic/missions.js`.
- Produces:
  - `SAVE_KEY = 'word-defenders:save'`, `SAVE_VERSION = 1`, `SPEEDS = { slow: 0.7, normal: 1, fast: 1.3 }`
  - `defaultSave() → { version, words, settings: { speed, sound }, missions: {} }`
  - `validateSave(raw) → save` (field-by-field fallback to defaults)
  - `loadSave(storage) → save` (never throws), `writeSave(storage, save) → boolean`
  - `createMemoryStorage() → { getItem, setItem, removeItem }`, `openStorage(win?) → { storage, persistent }`
  - `isUnlocked(save, id) → boolean`, `recordResult(save, id, stars) → save` (keeps the best), `resetProgress(save) → save`

- [ ] **Step 1: Write the failing tests**

`tests/save.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  SAVE_KEY, SAVE_VERSION, SPEEDS, defaultSave, validateSave, loadSave, writeSave,
  createMemoryStorage, openStorage, isUnlocked, recordResult, resetProgress,
} from '../src/logic/save.js';
import { STARTER_WORDS } from '../src/logic/words.js';

const WORDS = ['cat', 'dog', 'house', 'water', 'friend'];

describe('defaults', () => {
  it('use the starter list, normal speed and sound on', () => {
    expect(SAVE_KEY).toBe('word-defenders:save');
    expect(SPEEDS).toEqual({ slow: 0.7, normal: 1, fast: 1.3 });
    expect(defaultSave()).toEqual({
      version: SAVE_VERSION,
      words: [...STARTER_WORDS],
      settings: { speed: 'normal', sound: true },
      missions: {},
    });
  });
});

describe('save and load', () => {
  it('round-trips', () => {
    const storage = createMemoryStorage();
    const save = { ...defaultSave(), words: WORDS, settings: { speed: 'slow', sound: false }, missions: { 1: { stars: 3 }, 2: { stars: 1 } } };
    expect(writeSave(storage, save)).toBe(true);
    expect(loadSave(storage)).toEqual(save);
  });

  it('returns defaults when nothing is saved', () => {
    expect(loadSave(createMemoryStorage())).toEqual(defaultSave());
  });

  it('returns defaults for invalid JSON', () => {
    const storage = createMemoryStorage();
    storage.setItem(SAVE_KEY, '{not json');
    expect(loadSave(storage)).toEqual(defaultSave());
  });

  it('returns defaults when storage throws', () => {
    const broken = { getItem: () => { throw new Error('denied'); } };
    expect(loadSave(broken)).toEqual(defaultSave());
    expect(writeSave({ setItem: () => { throw new Error('full'); } }, defaultSave())).toBe(false);
  });
});

describe('validateSave', () => {
  it('replaces only the invalid fields', () => {
    const save = validateSave({
      version: 1,
      words: ['ok', 'r2d2'],
      settings: { speed: 'turbo', sound: false },
      missions: { 1: { stars: 3 }, 2: { stars: 7 }, 99: { stars: 3 }, 3: 'x' },
    });
    expect(save.words).toEqual([...STARTER_WORDS]);
    expect(save.settings).toEqual({ speed: 'normal', sound: false });
    expect(save.missions).toEqual({ 1: { stars: 3 } });
  });

  it('upgrades a save without a version to the current version', () => {
    const save = validateSave({ words: WORDS, settings: { speed: 'fast', sound: true }, missions: { 1: { stars: 2 } } });
    expect(save).toEqual({ version: 1, words: WORDS, settings: { speed: 'fast', sound: true }, missions: { 1: { stars: 2 } } });
  });

  it('handles non-objects', () => {
    expect(validateSave(null)).toEqual(defaultSave());
    expect(validateSave('hello')).toEqual(defaultSave());
  });
});

describe('openStorage', () => {
  it('uses localStorage when it works', () => {
    const local = createMemoryStorage();
    expect(openStorage({ localStorage: local })).toEqual({ storage: local, persistent: true });
  });

  it('falls back to memory when localStorage throws', () => {
    const win = { get localStorage() { throw new Error('SecurityError'); } };
    const { storage, persistent } = openStorage(win);
    expect(persistent).toBe(false);
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
  });
});

describe('progress', () => {
  it('unlocks mission 1 always and later missions after the previous one has stars', () => {
    const save = { ...defaultSave(), missions: { 1: { stars: 1 } } };
    expect(isUnlocked(save, 1)).toBe(true);
    expect(isUnlocked(save, 2)).toBe(true);
    expect(isUnlocked(save, 3)).toBe(false);
  });

  it('keeps the best stars', () => {
    let save = recordResult(defaultSave(), 1, 2);
    save = recordResult(save, 1, 1);
    expect(save.missions[1]).toEqual({ stars: 2 });
    save = recordResult(save, 1, 3);
    expect(save.missions[1]).toEqual({ stars: 3 });
  });

  it('resets progress but keeps words and settings', () => {
    const save = { ...defaultSave(), words: WORDS, settings: { speed: 'slow', sound: false }, missions: { 1: { stars: 3 } } };
    expect(resetProgress(save)).toEqual({ ...save, missions: {} });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/save.test.js`
Expected: FAIL with `Failed to load url ../src/logic/save.js`.

- [ ] **Step 3: Implement `src/logic/save.js`**

```js
import { parseWordList, STARTER_WORDS } from './words.js';
import { MISSION_COUNT } from './missions.js';

export const SAVE_KEY = 'word-defenders:save';
export const SAVE_VERSION = 1;
export const SPEEDS = Object.freeze({ slow: 0.7, normal: 1, fast: 1.3 });

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    words: [...STARTER_WORDS],
    settings: { speed: 'normal', sound: true },
    missions: {},
  };
}

// Version 1 is the first format, so older or unversioned saves only need
// field validation. Future formats add their migration steps here.
export function validateSave(raw) {
  const save = defaultSave();
  if (!raw || typeof raw !== 'object') return save;

  if (Array.isArray(raw.words) && raw.words.every((w) => typeof w === 'string')) {
    const { words, errors } = parseWordList(raw.words.join('\n'));
    if (errors.length === 0) save.words = words;
  }

  const settings = raw.settings;
  if (settings && typeof settings === 'object') {
    if (Object.hasOwn(SPEEDS, settings.speed)) save.settings.speed = settings.speed;
    if (typeof settings.sound === 'boolean') save.settings.sound = settings.sound;
  }

  if (raw.missions && typeof raw.missions === 'object') {
    for (let id = 1; id <= MISSION_COUNT; id++) {
      const stars = raw.missions[id]?.stars;
      if (stars === 1 || stars === 2 || stars === 3) save.missions[id] = { stars };
    }
  }
  return save;
}

export function loadSave(storage) {
  try {
    const text = storage?.getItem(SAVE_KEY);
    if (!text) return defaultSave();
    return validateSave(JSON.parse(text));
  } catch {
    return defaultSave();
  }
}

export function writeSave(storage, save) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function createMemoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => {
      items.set(key, String(value));
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

export function openStorage(win = globalThis) {
  try {
    const local = win.localStorage;
    const probe = `${SAVE_KEY}:probe`;
    local.setItem(probe, '1');
    local.removeItem(probe);
    return { storage: local, persistent: true };
  } catch {
    return { storage: createMemoryStorage(), persistent: false };
  }
}

export function isUnlocked(save, id) {
  return id === 1 || Boolean(save.missions[id - 1]);
}

export function recordResult(save, id, stars) {
  const best = Math.max(stars, save.missions[id]?.stars ?? 0);
  return { ...save, missions: { ...save.missions, [id]: { stars: best } } };
}

export function resetProgress(save) {
  return { ...save, missions: {} };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 5: Commit**

```bash
git add src/logic/save.js tests/save.test.js
git commit -m "feat(logic): versioned, validated local save

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 10: The Wave Simulation (`world.js`)

One `world` is one wave of combat: spawning, walking, freezing, shooting, projectiles, typed zaps, leaks and the "wave cleared" signal. It mutates itself in `stepWorld` and returns events for the controller.

**Files:**
- Create: `src/logic/world.js`
- Test: `tests/world.test.js`

**Interfaces:**
- Consumes: `positionAt` (`path.js`); `ALIENS`, `bossHp`, `baseSpeed` (`aliens.js`); `towerStats`, `pickTarget`, `slowAt`, `facingFor` (`towers.js`).
- Produces:
  - `createWorld({ path, spawns, speed = 1, drawWord, bossWords = [], towers = [] }) → world` where `towers` are `{ pad, type, level, x, y }` and `drawWord(onScreenFirstLetters: Set<string>) → string`
  - world fields read by the scene: `aliens: { id, type, word (string|null), shieldWords, shieldIndex, hp, maxHp, distance, x, y, dir, slow }[]`, `towers: { pad, type, level, x, y, facing, ... }[]`, `projectiles: { id, towerType, x, y, targetId }[]`
  - `stepWorld(world, dt) → events`; `zapAlien(world, id) → events`; `lockableAliens(world) → { id, word, distance }[]`
  - Events: `{type:'spawn', id, alienType}`, `{type:'leak', id, alienType, hearts}`, `{type:'fire', pad, towerType, projectileId}`, `{type:'hit', projectileId, x, y, splash}`, `{type:'fizzle', projectileId}`, `{type:'kill', id, alienType, by: 'tower'|'typing', x, y}`, `{type:'shieldPop', id, remaining, x, y}`, `{type:'chill', id, x, y}` (an alien first enters a freeze field), `{type:'cleared'}`

- [ ] **Step 1: Write the failing tests**

`tests/world.test.js` uses a straight 300 px path, so a blob at speed 1 moves 10 px/s:

```js
import { describe, it, expect, vi } from 'vitest';
import { createWorld, stepWorld, zapAlien, lockableAliens } from '../src/logic/world.js';
import { createPath } from '../src/logic/path.js';

const path = createPath([{ x: 0, y: 0 }, { x: 300, y: 0 }]);

function cycle(list) {
  let i = 0;
  return () => list[i++ % list.length];
}

function run(world, seconds, dt = 0.1) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) events.push(...stepWorld(world, dt));
  return events;
}

describe('spawning', () => {
  it('spawns aliens on schedule with a drawn word', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 1 }, { type: 'blob', at: 2 }], drawWord: cycle(['cat', 'dog']) });
    expect(stepWorld(world, 0.5)).toEqual([]);
    const events = stepWorld(world, 0.6);
    expect(events).toEqual([{ type: 'spawn', id: 1, alienType: 'blob' }]);
    expect(world.aliens.map((a) => a.word)).toEqual(['cat']);
  });

  it('tells drawWord which first letters are on screen', () => {
    const drawWord = vi.fn(cycle(['Cat', 'dog']));
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }, { type: 'blob', at: 1 }], drawWord });
    run(world, 1.5);
    expect(drawWord).toHaveBeenNthCalledWith(1, new Set());
    expect(drawWord).toHaveBeenNthCalledWith(2, new Set(['c']));
  });

  it('gives a boss its shield words and boss HP', () => {
    const world = createWorld({ path, spawns: [{ type: 'boss', at: 0 }], drawWord: cycle(['x']), bossWords: ['because', 'friend'] });
    stepWorld(world, 0.1);
    expect(world.aliens[0]).toMatchObject({ type: 'boss', word: 'because', shieldWords: ['because', 'friend'], shieldIndex: 0, hp: 40, maxHp: 40 });
  });
});

describe('movement', () => {
  it('moves a blob path.length / 30 px per second', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']) });
    stepWorld(world, 1);
    expect(world.aliens[0].x).toBeCloseTo(10);
    expect(world.aliens[0].dir).toBe('east');
  });

  it('multiplies world speed and alien speed', () => {
    const world = createWorld({ path, spawns: [{ type: 'zoomer', at: 0 }], speed: 2, drawWord: cycle(['cat']) });
    stepWorld(world, 1);
    expect(world.aliens[0].x).toBeCloseTo(32);
  });

  it('leaks aliens that reach the end', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']) });
    const events = run(world, 31, 1);
    expect(events).toContainEqual({ type: 'leak', id: 1, alienType: 'blob', hearts: 1 });
    expect(world.aliens).toEqual([]);
  });

  it('charges 5 hearts for a boss leak', () => {
    const world = createWorld({ path, spawns: [{ type: 'boss', at: 0 }], drawWord: cycle(['x']), bossWords: ['because'] });
    const events = run(world, 61, 1);
    expect(events).toContainEqual({ type: 'leak', id: 1, alienType: 'boss', hearts: 5 });
  });

  it('slows aliens inside a freeze tower range', () => {
    const towers = [{ pad: 0, type: 'freeze', level: 1, x: 0, y: 0 }];
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']), towers });
    const events = stepWorld(world, 1);
    expect(world.aliens[0].slow).toBe(0.3);
    expect(world.aliens[0].x).toBeCloseTo(7);
    expect(events).toContainEqual({ type: 'chill', id: 1, x: 0, y: 0 });
    expect(stepWorld(world, 0.1).some((e) => e.type === 'chill')).toBe(false);
  });
});

describe('towers', () => {
  it('a blaster shoots the alien and kills it with tower credit', () => {
    const towers = [{ pad: 3, type: 'blaster', level: 1, x: 50, y: 40 }];
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']), towers });
    const events = run(world, 5);
    expect(events.filter((e) => e.type === 'fire')).toHaveLength(3);
    expect(events.find((e) => e.type === 'fire')).toMatchObject({ pad: 3, towerType: 'blaster' });
    expect(events.find((e) => e.type === 'kill')).toMatchObject({ id: 1, alienType: 'blob', by: 'tower' });
    expect(world.aliens).toEqual([]);
  });

  it('turns towers to face their target', () => {
    const towers = [{ pad: 0, type: 'blaster', level: 1, x: 0, y: -60 }];
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']), towers });
    stepWorld(world, 0.1);
    expect(world.towers[0].facing).toBe('south');
  });

  it('ignores a shielded boss', () => {
    const towers = [{ pad: 0, type: 'blaster', level: 1, x: 20, y: 40 }];
    const world = createWorld({ path, spawns: [{ type: 'boss', at: 0 }], drawWord: cycle(['x']), bossWords: ['because'], towers });
    const events = run(world, 3);
    expect(events.filter((e) => e.type === 'fire')).toEqual([]);
  });

  it('splash damage from a rocket hits neighbours', () => {
    const towers = [{ pad: 0, type: 'rocket', level: 1, x: 100, y: 40 }];
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }, { type: 'blob', at: 0.1 }], drawWord: cycle(['cat', 'dog']), towers });
    const events = run(world, 1);
    expect(events.filter((e) => e.type === 'kill')).toHaveLength(2);
    expect(events.find((e) => e.type === 'hit')).toMatchObject({ splash: true });
  });

  it('projectiles fizzle when their target dies first', () => {
    const towers = [{ pad: 0, type: 'blaster', level: 1, x: 90, y: 0 }];
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']), towers });
    const fired = stepWorld(world, 0.01);
    expect(fired.some((e) => e.type === 'fire')).toBe(true);
    zapAlien(world, 1);
    expect(stepWorld(world, 0.01)).toContainEqual({ type: 'fizzle', projectileId: fired.find((e) => e.type === 'fire').projectileId });
  });
});

describe('zapAlien', () => {
  it('kills a regular alien with typing credit', () => {
    const world = createWorld({ path, spawns: [{ type: 'chonk', at: 0 }], drawWord: cycle(['cat']) });
    stepWorld(world, 0.1);
    const [kill] = zapAlien(world, 1);
    expect(kill).toMatchObject({ type: 'kill', id: 1, alienType: 'chonk', by: 'typing' });
    expect(world.aliens).toEqual([]);
  });

  it('pops boss shields one word at a time, then lets towers hit it', () => {
    const towers = [{ pad: 0, type: 'blaster', level: 1, x: 20, y: 40 }];
    const world = createWorld({ path, spawns: [{ type: 'boss', at: 0 }], drawWord: cycle(['x']), bossWords: ['because', 'friend'], towers });
    stepWorld(world, 0.1);
    expect(zapAlien(world, 1)).toEqual([{ type: 'shieldPop', id: 1, remaining: 1, x: world.aliens[0].x, y: 0 }]);
    expect(world.aliens[0].word).toBe('friend');
    expect(zapAlien(world, 1)[0]).toMatchObject({ type: 'shieldPop', remaining: 0 });
    expect(world.aliens[0].word).toBeNull();
    const events = run(world, 1);
    expect(events.some((e) => e.type === 'fire')).toBe(true);
  });

  it('does nothing for unknown or wordless aliens', () => {
    const world = createWorld({ path, spawns: [], drawWord: cycle(['x']) });
    expect(zapAlien(world, 42)).toEqual([]);
  });
});

describe('clearing', () => {
  it('emits cleared exactly once after the last alien is gone', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']) });
    stepWorld(world, 0.1);
    zapAlien(world, 1);
    expect(stepWorld(world, 0.1)).toEqual([{ type: 'cleared' }]);
    expect(stepWorld(world, 0.1)).toEqual([]);
  });

  it('does not clear while spawns are pending', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 5 }], drawWord: cycle(['cat']) });
    expect(stepWorld(world, 0.1)).toEqual([]);
  });
});

describe('lockableAliens', () => {
  it('lists aliens that show a word', () => {
    const world = createWorld({ path, spawns: [{ type: 'blob', at: 0 }], drawWord: cycle(['cat']) });
    stepWorld(world, 1);
    expect(lockableAliens(world)).toEqual([{ id: 1, word: 'cat', distance: world.aliens[0].distance }]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/world.test.js`
Expected: FAIL with `Failed to load url ../src/logic/world.js`.

- [ ] **Step 3: Implement `src/logic/world.js`**

```js
import { positionAt } from './path.js';
import { ALIENS, bossHp, baseSpeed } from './aliens.js';
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
  if (alien.type === 'boss') {
    alien.shieldIndex += 1;
    alien.word = alien.shieldWords[alien.shieldIndex] ?? null;
    return [{ type: 'shieldPop', id, remaining: alien.shieldWords.length - alien.shieldIndex, x: alien.x, y: alien.y }];
  }
  removeAlien(world, id);
  return [{ type: 'kill', id, alienType: alien.type, by: 'typing', x: alien.x, y: alien.y }];
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
  };
  if (type === 'boss') {
    alien.shieldWords = [...world.bossWords];
    alien.word = alien.shieldWords[0] ?? null;
    alien.hp = bossHp(alien.shieldWords.length);
  } else {
    const onScreen = new Set(world.aliens.filter((a) => a.word !== null).map((a) => a.word[0].toLowerCase()));
    alien.word = world.drawWord(onScreen);
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
    alien.distance += pxPerSecond * ALIENS[alien.type].speed * (1 - alien.slow) * dt;
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

function isTargetable(alien) {
  return alien.type !== 'boss' || alien.word === null;
}

function updateTowers(world, dt, events) {
  for (const tower of world.towers) {
    // Freeze towers aim at anything (slowing is not damage); shooters skip shielded bosses.
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
        ? world.aliens.filter((a) => isTargetable(a) && Math.hypot(a.x - target.x, a.y - target.y) <= p.splash)
        : [target];
      for (const victim of victims) damage(world, victim, p.damage, events);
      continue;
    }
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
  }
}

function damage(world, alien, amount, events) {
  if (!world.aliens.includes(alien)) return;
  alien.hp -= amount;
  if (alien.hp <= 0) {
    removeAlien(world, alien.id);
    events.push({ type: 'kill', id: alien.id, alienType: alien.type, by: 'tower', x: alien.x, y: alien.y });
  }
}

function removeAlien(world, id) {
  world.aliens = world.aliens.filter((a) => a.id !== id);
}

function removeProjectile(world, id) {
  world.projectiles = world.projectiles.filter((p) => p.id !== id);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 5: Commit**

```bash
git add src/logic/world.js tests/world.test.js
git commit -m "feat(logic): wave simulation with towers, projectiles and zaps

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: The Game Controller (`game.js`)

`game.js` owns one mission run: coins, hearts, towers on pads, the wave number, the retry snapshot, the typing state and the current world. The Game scene talks only to this module.

**Files:**
- Create: `src/logic/game.js`
- Test: `tests/game.test.js`

**Interfaces:**
- Consumes: `getMission` (`missions.js`); `buildWave`, `WAVES_PER_MISSION` (`waves.js`); `createDeck`, `pickBossWords` (`words.js`); `createWorld`, `stepWorld`, `zapAlien`, `lockableAliens` (`world.js`); `createTyping`, `pressKey`, `syncTyping` (`typing.js`); `availableTowers` (`towers.js`); `REWARDS`, `buildCost`, `upgradeCost`, `sellValue`, `killReward` (`economy.js`); `starsFor` (`stars.js`); `MAP_1`, `buildPath`, `padPositions` (`map.js`).
- Produces:
  - `START_HEARTS = 10`, `MAX_STEP = 0.1`
  - `createGame({ missionId, words, speed = 1, rng, map = MAP_1, debug = {} }) → run`. Run fields read by the scene: `mission`, `map`, `phase` (`'break' | 'wave' | 'failed' | 'won'`), `wave`, `hearts`, `coins`, `coinsEarned`, `towers` (`{ [pad]: { type, level } }`), `retried`, `world`, `typing`. `debug` may set `wave`, `coins` and `hearts` (dev URL shortcuts).
  - `towerOptions(run) → string[]`, `build(run, pad, type) → boolean`, `upgrade(run, pad) → boolean`, `sell(run, pad) → boolean` (break phase only)
  - `startWave(run) → events` (`[{type:'waveStarted', wave}]`)
  - `update(run, dt) → events` — world events plus `{type:'coins', amount, x, y}` after each kill, `{type:'waveCleared', wave, bonus}`, `{type:'waveFailed', wave}`, `{type:'missionWon', stars, coinsEarned, hearts}`, `{type:'release', id}`
  - `key(run, key) → { handled, events }` — typing events plus zap results
  - `retryWave(run) → boolean`, `result(run) → { stars, coinsEarned, hearts }`

- [ ] **Step 1: Write the failing tests**

`tests/game.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  createGame, towerOptions, build, upgrade, sell, startWave, update, key, retryWave, result, START_HEARTS,
} from '../src/logic/game.js';
import { lockableAliens } from '../src/logic/world.js';
import { createRng } from '../src/logic/rng.js';

const WORDS = ['after', 'again', 'because', 'could', 'every', 'friend', 'house', 'little', 'people', 'water'];

function newGame(opts = {}) {
  return createGame({ missionId: 1, words: WORDS, rng: createRng(7), ...opts });
}

// Types the word of whichever alien the first keypress locks onto.
function typeOne(run) {
  const targets = lockableAliens(run.world);
  if (targets.length === 0) return [];
  const events = [...key(run, targets[0].word[0]).events];
  const locked = lockableAliens(run.world).find((t) => t.id === run.typing.targetId);
  if (locked) for (const ch of locked.word.slice(run.typing.index)) events.push(...key(run, ch).events);
  return events;
}

// Steps the wave, typing every visible word, until the phase leaves 'wave'.
function playWave(run, { typing = true, maxSeconds = 300 } = {}) {
  const events = [];
  for (let t = 0; t < maxSeconds && run.phase === 'wave'; t += 0.1) {
    events.push(...update(run, 0.1));
    while (typing && run.phase === 'wave' && lockableAliens(run.world).length > 0) events.push(...typeOne(run));
  }
  return events;
}

function stepUntil(run, predicate, maxSeconds = 30) {
  for (let t = 0; t < maxSeconds && !predicate(); t += 0.1) update(run, 0.1);
}

describe('createGame', () => {
  it('starts in the break before wave 1 with 10 hearts and 30 coins', () => {
    const run = newGame();
    expect(run).toMatchObject({ phase: 'break', wave: 1, hearts: START_HEARTS, coins: 30, coinsEarned: 0, towers: {}, retried: false, world: null });
  });

  it('accepts debug wave, coins and hearts', () => {
    expect(newGame({ debug: { wave: 5, coins: 999, hearts: 1 } })).toMatchObject({ wave: 5, coins: 999, hearts: 1 });
  });
});

describe('building', () => {
  it('builds an available tower on an empty pad', () => {
    const run = newGame();
    expect(towerOptions(run)).toEqual(['blaster']);
    expect(build(run, 0, 'blaster')).toBe(true);
    expect(run.coins).toBe(10);
    expect(run.towers).toEqual({ 0: { type: 'blaster', level: 1 } });
  });

  it('refuses occupied pads, missing pads, locked towers and empty wallets', () => {
    const run = newGame();
    build(run, 0, 'blaster');
    expect(build(run, 0, 'blaster')).toBe(false);
    expect(build(run, 99, 'blaster')).toBe(false);
    expect(build(run, 1, 'freeze')).toBe(false);
    expect(build(run, 1, 'blaster')).toBe(false);
    expect(run.coins).toBe(10);
  });

  it('upgrades and sells with the spec prices', () => {
    const run = newGame({ debug: { coins: 100 } });
    build(run, 2, 'blaster');
    expect(upgrade(run, 2)).toBe(true);
    expect(upgrade(run, 2)).toBe(true);
    expect(upgrade(run, 2)).toBe(false);
    expect(run.coins).toBe(40);
    expect(sell(run, 2)).toBe(true);
    expect(run.coins).toBe(70);
    expect(run.towers).toEqual({});
  });

  it('refuses to build during a wave', () => {
    const run = newGame();
    startWave(run);
    expect(build(run, 0, 'blaster')).toBe(false);
  });
});

describe('waves', () => {
  it('starts a wave', () => {
    const run = newGame();
    expect(startWave(run)).toEqual([{ type: 'waveStarted', wave: 1 }]);
    expect(run.phase).toBe('wave');
    expect(startWave(run)).toEqual([]);
  });

  it('pays 5 coins for typing an alien', () => {
    const run = newGame();
    startWave(run);
    stepUntil(run, () => run.world.aliens.length > 0);
    const events = typeOne(run);
    expect(events).toContainEqual(expect.objectContaining({ type: 'kill', by: 'typing' }));
    expect(events).toContainEqual(expect.objectContaining({ type: 'coins', amount: 5 }));
    expect(run.coins).toBe(35);
  });

  it('ignores keys outside a wave', () => {
    expect(key(newGame(), 'a')).toEqual({ handled: false, events: [] });
  });

  it('clamps a long frame so aliens cannot jump to the base', () => {
    const run = newGame();
    startWave(run);
    stepUntil(run, () => run.world.aliens.length > 0);
    const before = run.world.aliens[0].distance;
    update(run, 30);
    expect(run.world.aliens).toHaveLength(1);
    expect(run.world.aliens[0].distance - before).toBeLessThan(10);
  });

  it('clears a fully typed wave with a 10-coin bonus and moves to the next break', () => {
    const run = newGame();
    startWave(run);
    const events = playWave(run);
    expect(events).toContainEqual({ type: 'waveCleared', wave: 1, bonus: 10 });
    expect(run).toMatchObject({ phase: 'break', wave: 2, coins: 30 + 4 * 5 + 10, world: null });
  });

  it('clears the wave on the update after the last alien is typed', () => {
    const run = newGame();
    startWave(run);
    for (let t = 0; t < 60; t += 0.1) {
      update(run, 0.1);
      if (run.world.pending.length === 0 && run.world.aliens.length > 0) break;
    }
    while (lockableAliens(run.world).length > 0) typeOne(run);
    expect(run.phase).toBe('wave');
    expect(update(run, 0.1)).toContainEqual({ type: 'waveCleared', wave: 1, bonus: 10 });
    expect(run.phase).toBe('break');
  });

  it('releases a lock when a tower kills the locked alien', () => {
    const run = newGame({ debug: { coins: 999 } });
    for (let pad = 0; pad < 8; pad++) build(run, pad, 'blaster');
    startWave(run);
    stepUntil(run, () => run.world.aliens.length > 0);
    const first = lockableAliens(run.world)[0];
    key(run, first.word[0]);
    const lockedId = run.typing.targetId;
    let released = false;
    for (let t = 0; t < 40 && !released; t += 0.1) {
      released = update(run, 0.1).some((e) => e.type === 'release' && e.id === lockedId);
    }
    expect(released).toBe(true);
    expect(run.typing.targetId).toBeNull();
  });
});

describe('failing and retrying', () => {
  it('fails the wave at 0 hearts and retries from the wave-start snapshot', () => {
    // A Freeze Ray does no damage, so untyped aliens are sure to leak.
    const run = newGame({ missionId: 3, debug: { coins: 50 } });
    build(run, 0, 'freeze');
    startWave(run);
    stepUntil(run, () => run.world.aliens.length > 0);
    typeOne(run);
    expect(run.coins).toBe(25);
    run.hearts = 1;
    const events = playWave(run, { typing: false });
    expect(events).toContainEqual({ type: 'waveFailed', wave: 1 });
    expect(run).toMatchObject({ phase: 'failed', hearts: 0, world: null });
    expect(sell(run, 0)).toBe(false);
    expect(retryWave(run)).toBe(true);
    expect(run).toMatchObject({
      phase: 'break', wave: 1, hearts: 10, coins: 20, coinsEarned: 0, retried: true,
      towers: { 0: { type: 'freeze', level: 1 } },
    });
    expect(retryWave(run)).toBe(false);
  });

  it('caps a retried mission at 1 star', () => {
    const run = newGame();
    run.retried = true;
    expect(result(run).stars).toBe(1);
  });
});

describe('boss wave', () => {
  it('wins the mission when the boss leaks with hearts left', () => {
    const run = newGame({ debug: { wave: 5 } });
    startWave(run);
    const events = playWave(run);
    const won = events.find((e) => e.type === 'missionWon');
    expect(won).toEqual({ type: 'missionWon', stars: 2, coinsEarned: 3 * 5 + 10, hearts: 5 });
    expect(events.filter((e) => e.type === 'shieldPop')).toHaveLength(1);
    expect(run.phase).toBe('won');
  });

  it('pays 25 coins when towers finish the boss', () => {
    const run = newGame({ debug: { wave: 5, coins: 999 } });
    for (let pad = 0; pad < 8; pad++) {
      build(run, pad, 'blaster');
      upgrade(run, pad);
      upgrade(run, pad);
    }
    startWave(run);
    const events = playWave(run);
    expect(events).toContainEqual(expect.objectContaining({ type: 'kill', alienType: 'boss', by: 'tower' }));
    expect(events).toContainEqual(expect.objectContaining({ type: 'coins', amount: 25 }));
    expect(events.find((e) => e.type === 'missionWon')).toMatchObject({ stars: 3, hearts: 10 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/game.test.js`
Expected: FAIL with `Failed to load url ../src/logic/game.js`.

- [ ] **Step 3: Implement `src/logic/game.js`**

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 5: Commit**

```bash
git add src/logic/game.js tests/game.test.js
git commit -m "feat(logic): mission controller with economy, retries and wins

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 12: Sprite-Sheet Parser and Sheet-Packing Tool

PixelLab's character spritesheet export is a uniform grid PNG plus a JSON layout (verified during design). `parseSheet` turns that JSON into frame indices for Phaser. For art that PixelLab does not export as a sheet (tower rotations, effect frames), `tools/pack-sheet.mjs` packs loose PNGs into the same format, so the game reads one format everywhere.

**Files:**
- Create: `src/logic/sheets.js`, `tools/pack-sheet-lib.mjs`, `tools/pack-sheet.mjs`, `tests/fixtures/pixellab-sheet.json`, `tests/fixtures/pixellab-tileset.json`
- Test: `tests/sheets.test.js`, `tests/packSheet.test.js`

**Interfaces:**
- Consumes: `MAP_1`, `terrainCorners` (`map.js`) in tests only.
- Produces:
  - `parseSheet(json) → { frameWidth, frameHeight, columns, rotations: { [direction]: frameIndex }, animations: { [name]: { [direction]: frameIndex[] } } }`
  - `cornerKey({ NW, NE, SW, SE }) → 'NW|NE|SW|SE'`
  - `buildTerrainLookup(tilesetMetadata) → Map<cornerKey, frameIndex>`
  - `packSheet(rows) → { png, json }` where rows are `{ type: 'rotations', frames: [{ direction, png }] }` or `{ type: 'animation', animation, direction, frames: [{ png }] }`
  - CLI: `node tools/pack-sheet.mjs <spec.json>`; spec = `{ "output": "<path without extension, relative to the repo root>", "rows": [...] }` with frame `file` paths relative to the spec file. Writes `<output>.png` and `<output>.json`.

- [ ] **Step 1: Add the fixtures**

`tests/fixtures/pixellab-sheet.json` (a real PixelLab export, trimmed):

```json
{
  "character": { "id": "cdd04155-935a-48bb-bb4c-2f0e3f8db599", "name": "Idle", "size": { "width": 92, "height": 92 }, "directions": 4, "view": "low top-down" },
  "spritesheet": {
    "path": "Blob_candidate_A-Idle.png",
    "cell_size": { "width": 92, "height": 92 },
    "sheet_size": { "width": 736, "height": 460 },
    "columns": 8,
    "pivot": "cell-center",
    "rows": [
      { "row": 0, "type": "rotations", "frame_count": 4, "directions": ["south", "west", "east", "north"] },
      { "row": 1, "type": "animation", "frame_count": 8, "animation": "walk", "direction": "south" },
      { "row": 2, "type": "animation", "frame_count": 8, "animation": "walk", "direction": "west" },
      { "row": 3, "type": "animation", "frame_count": 8, "animation": "walk", "direction": "east" },
      { "row": 4, "type": "animation", "frame_count": 8, "animation": "walk", "direction": "north" }
    ]
  },
  "export_version": "1.0"
}
```

`tests/fixtures/pixellab-tileset.json` (the real tileset's tile table):

```json
{"tileset_data":{"tile_size":{"width":32,"height":32},"spritesheet_grid":{"cols":4,"rows":4},"tiles":[
    {"corners":{"NW":"upper","NE":"upper","SW":"lower","SE":"upper"},"bounding_box":{"x":0,"y":0,"width":32,"height":32}},
    {"corners":{"NW":"upper","NE":"lower","SW":"upper","SE":"lower"},"bounding_box":{"x":32,"y":0,"width":32,"height":32}},
    {"corners":{"NW":"lower","NE":"upper","SW":"lower","SE":"lower"},"bounding_box":{"x":64,"y":0,"width":32,"height":32}},
    {"corners":{"NW":"upper","NE":"upper","SW":"lower","SE":"lower"},"bounding_box":{"x":96,"y":0,"width":32,"height":32}},
    {"corners":{"NW":"lower","NE":"upper","SW":"upper","SE":"lower"},"bounding_box":{"x":0,"y":32,"width":32,"height":32}},
    {"corners":{"NW":"upper","NE":"lower","SW":"lower","SE":"lower"},"bounding_box":{"x":32,"y":32,"width":32,"height":32}},
    {"corners":{"NW":"lower","NE":"lower","SW":"lower","SE":"lower"},"bounding_box":{"x":64,"y":32,"width":32,"height":32}},
    {"corners":{"NW":"lower","NE":"lower","SW":"lower","SE":"upper"},"bounding_box":{"x":96,"y":32,"width":32,"height":32}},
    {"corners":{"NW":"upper","NE":"lower","SW":"upper","SE":"upper"},"bounding_box":{"x":0,"y":64,"width":32,"height":32}},
    {"corners":{"NW":"lower","NE":"lower","SW":"upper","SE":"upper"},"bounding_box":{"x":32,"y":64,"width":32,"height":32}},
    {"corners":{"NW":"lower","NE":"lower","SW":"upper","SE":"lower"},"bounding_box":{"x":64,"y":64,"width":32,"height":32}},
    {"corners":{"NW":"lower","NE":"upper","SW":"lower","SE":"upper"},"bounding_box":{"x":96,"y":64,"width":32,"height":32}},
    {"corners":{"NW":"upper","NE":"upper","SW":"upper","SE":"upper"},"bounding_box":{"x":0,"y":96,"width":32,"height":32}},
    {"corners":{"NW":"upper","NE":"upper","SW":"upper","SE":"lower"},"bounding_box":{"x":32,"y":96,"width":32,"height":32}},
    {"corners":{"NW":"upper","NE":"lower","SW":"lower","SE":"upper"},"bounding_box":{"x":64,"y":96,"width":32,"height":32}},
    {"corners":{"NW":"lower","NE":"upper","SW":"upper","SE":"upper"},"bounding_box":{"x":96,"y":96,"width":32,"height":32}}
  ]}}
```

- [ ] **Step 2: Write the failing tests**

`tests/sheets.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseSheet, cornerKey, buildTerrainLookup } from '../src/logic/sheets.js';
import { MAP_1, terrainCorners } from '../src/logic/map.js';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const range = (start, count) => Array.from({ length: count }, (_, i) => start + i);

describe('parseSheet', () => {
  const sheet = parseSheet(fixture('pixellab-sheet.json'));

  it('reads the cell size and column count', () => {
    expect(sheet).toMatchObject({ frameWidth: 92, frameHeight: 92, columns: 8 });
  });

  it('maps rotation directions to frame indices', () => {
    expect(sheet.rotations).toEqual({ south: 0, west: 1, east: 2, north: 3 });
  });

  it('maps each animation row to its frame indices', () => {
    expect(sheet.animations.walk).toEqual({
      south: range(8, 8),
      west: range(16, 8),
      east: range(24, 8),
      north: range(32, 8),
    });
  });
});

describe('terrain lookup', () => {
  const lookup = buildTerrainLookup(fixture('pixellab-tileset.json'));

  it('joins corners in NW, NE, SW, SE order', () => {
    expect(cornerKey({ SE: 'd', NW: 'a', SW: 'c', NE: 'b' })).toBe('a|b|c|d');
  });

  it('converts bounding boxes to spritesheet frame indices', () => {
    expect(lookup.size).toBe(16);
    expect(lookup.get('upper|upper|lower|upper')).toBe(0);
    expect(lookup.get('lower|lower|lower|lower')).toBe(6);
    expect(lookup.get('upper|upper|upper|upper')).toBe(12);
    expect(lookup.get('upper|lower|lower|upper')).toBe(14);
  });

  it('has a tile for every corner combination the map needs', () => {
    const needed = new Set(terrainCorners(MAP_1).flat().map(cornerKey));
    for (const key of needed) expect(lookup.has(key), key).toBe(true);
  });
});
```

`tests/packSheet.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';
import { packSheet } from '../tools/pack-sheet-lib.mjs';
import { parseSheet } from '../src/logic/sheets.js';

function solid(width, height, [r, g, b]) {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) png.data.set([r, g, b, 255], i * 4);
  return png;
}

function pixel(png, x, y) {
  const i = (y * png.width + x) * 4;
  return [...png.data.subarray(i, i + 4)];
}

describe('packSheet', () => {
  const red = solid(2, 2, [255, 0, 0]);
  const blue = solid(4, 2, [0, 0, 255]);
  const { png, json } = packSheet([
    { type: 'rotations', frames: [{ direction: 'east', png: red }, { direction: 'west', png: blue }] },
    { type: 'animation', animation: 'explode', direction: 'south', frames: [{ png: red }, { png: red }, { png: blue }] },
  ]);

  it('uses the largest frame as a uniform cell', () => {
    expect([png.width, png.height]).toEqual([12, 4]);
    expect(json.spritesheet.cell_size).toEqual({ width: 4, height: 2 });
    expect(json.spritesheet.columns).toBe(3);
  });

  it('writes PixelLab-format rows that parseSheet understands', () => {
    expect(parseSheet(json)).toMatchObject({
      rotations: { east: 0, west: 1 },
      animations: { explode: { south: [3, 4, 5] } },
    });
  });

  it('centres frames in their cells on a transparent background', () => {
    expect(pixel(png, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(png, 1, 0)).toEqual([255, 0, 0, 255]);
    expect(pixel(png, 4, 0)).toEqual([0, 0, 255, 255]);
    expect(pixel(png, 8, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(png, 11, 3)).toEqual([0, 0, 255, 255]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/sheets.test.js tests/packSheet.test.js`
Expected: FAIL with `Failed to load url ../src/logic/sheets.js` and `../tools/pack-sheet-lib.mjs`.

- [ ] **Step 4: Implement `src/logic/sheets.js`**

```js
// Reads PixelLab's spritesheet JSON: a uniform grid where each row is either
// a set of rotations or one direction of one animation.
export function parseSheet(json) {
  const sheet = json.spritesheet;
  const { width: frameWidth, height: frameHeight } = sheet.cell_size;
  const columns = sheet.columns;
  const rotations = {};
  const animations = {};
  for (const row of sheet.rows) {
    const first = row.row * columns;
    if (row.type === 'rotations') {
      row.directions.forEach((direction, i) => {
        rotations[direction] = first + i;
      });
    } else if (row.type === 'animation') {
      animations[row.animation] ??= {};
      animations[row.animation][row.direction] = Array.from({ length: row.frame_count }, (_, i) => first + i);
    }
  }
  return { frameWidth, frameHeight, columns, rotations, animations };
}

export function cornerKey(corners) {
  return `${corners.NW}|${corners.NE}|${corners.SW}|${corners.SE}`;
}

// Maps each corner combination of a PixelLab Wang tileset to its frame index.
export function buildTerrainLookup(metadata) {
  const data = metadata.tileset_data;
  const { width, height } = data.tile_size;
  const cols = data.spritesheet_grid.cols;
  const lookup = new Map();
  for (const tile of data.tiles) {
    const box = tile.bounding_box;
    lookup.set(cornerKey(tile.corners), (box.y / height) * cols + box.x / width);
  }
  return lookup;
}
```

- [ ] **Step 5: Implement `tools/pack-sheet-lib.mjs`**

```js
import { PNG } from 'pngjs';

// Packs PNG frames into one uniform grid (cell = largest frame, frames
// centred) and describes it in PixelLab's spritesheet JSON format.
export function packSheet(rows) {
  const frames = rows.flatMap((row) => row.frames.map((frame) => frame.png));
  const cellWidth = Math.max(...frames.map((p) => p.width));
  const cellHeight = Math.max(...frames.map((p) => p.height));
  const columns = Math.max(...rows.map((row) => row.frames.length));
  const png = new PNG({ width: cellWidth * columns, height: cellHeight * rows.length });
  png.data.fill(0);

  const jsonRows = rows.map((row, rowIndex) => {
    row.frames.forEach((frame, col) => {
      const dx = col * cellWidth + Math.floor((cellWidth - frame.png.width) / 2);
      const dy = rowIndex * cellHeight + Math.floor((cellHeight - frame.png.height) / 2);
      PNG.bitblt(frame.png, png, 0, 0, frame.png.width, frame.png.height, dx, dy);
    });
    if (row.type === 'rotations') {
      return { row: rowIndex, type: 'rotations', frame_count: row.frames.length, directions: row.frames.map((f) => f.direction) };
    }
    return { row: rowIndex, type: 'animation', frame_count: row.frames.length, animation: row.animation, direction: row.direction };
  });

  return {
    png,
    json: { spritesheet: { cell_size: { width: cellWidth, height: cellHeight }, columns, pivot: 'cell-center', rows: jsonRows } },
  };
}

export function readPng(buffer) {
  return PNG.sync.read(buffer);
}

export function writePng(png) {
  return PNG.sync.write(png);
}
```

- [ ] **Step 6: Implement `tools/pack-sheet.mjs`**

```js
#!/usr/bin/env node
// Usage: node tools/pack-sheet.mjs <spec.json>
// Spec:
//   { "output": "public/assets/sprites/tower-blaster-1",
//     "rows": [
//       { "type": "rotations", "frames": [{ "direction": "east", "file": "east.png" }] },
//       { "type": "animation", "animation": "explode", "direction": "south", "frames": [{ "file": "frame_0.png" }] } ] }
// `output` is relative to the current directory; frame files are relative to the spec file.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { packSheet, readPng, writePng } from './pack-sheet-lib.mjs';

const specPath = process.argv[2];
if (!specPath) {
  console.error('Usage: node tools/pack-sheet.mjs <spec.json>');
  process.exit(1);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const base = dirname(resolve(specPath));
const rows = spec.rows.map((row) => ({
  ...row,
  frames: row.frames.map((frame) => ({ ...frame, png: readPng(readFileSync(resolve(base, frame.file))) })),
}));
const { png, json } = packSheet(rows);
mkdirSync(dirname(spec.output), { recursive: true });
writeFileSync(`${spec.output}.png`, writePng(png));
writeFileSync(`${spec.output}.json`, `${JSON.stringify(json, null, 2)}\n`);
console.log(`wrote ${spec.output}.png (${png.width}x${png.height}) and ${spec.output}.json`);
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 8: Smoke-test the CLI**

```bash
mkdir -p .shots/pack && node --input-type=module -e "
import { PNG } from 'pngjs'; import { writeFileSync } from 'node:fs';
const p = new PNG({ width: 8, height: 8 }); p.data.fill(255);
writeFileSync('.shots/pack/a.png', PNG.sync.write(p));
writeFileSync('.shots/pack/spec.json', JSON.stringify({ output: '.shots/pack/out', rows: [{ type: 'rotations', frames: [{ direction: 'south', file: 'a.png' }] }] }));
"
node tools/pack-sheet.mjs .shots/pack/spec.json
```

Expected: `wrote .shots/pack/out.png (8x8) and .shots/pack/out.json`

- [ ] **Step 9: Commit**

```bash
git add src/logic/sheets.js tools tests
git commit -m "feat: PixelLab sheet parser, terrain lookup and sheet packer

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 13: Art — Terrain, Build Pads, Base, Portal and Background

Load the PixelLab tools first with ToolSearch: `select:mcp__pixellab__create_1_direction_object,mcp__pixellab__get_object,mcp__pixellab__select_object_frames,mcp__pixellab__create_image_pixflux,mcp__pixellab__get_image,mcp__pixellab__wait_for_jobs`.

**Files:**
- Create: `public/assets/terrain/terrain.png`, `public/assets/terrain/terrain.json`, `public/assets/images/pad.png`, `public/assets/images/base.png`, `public/assets/images/portal.png`, `public/assets/images/bg-space.png`
- Modify: `assets/manifest.json` (`assets` block)

**Interfaces:**
- Consumes: `buildTerrainLookup`, `cornerKey` (`sheets.js`); `MAP_1`, `terrainCorners` (`map.js`).
- Produces: image keys `pad` (32×32), `base` (96×96), `portal` (64×64), `bg-space` (256×144); the `terrain` sheet (32 px tiles) with its metadata JSON.

The ground/path tileset was generated during design and checked against the map: tileset `9da86472-df41-43ac-93b9-ef502a710b59` (lower = "smooth tan cobblestone path", upper = "bright teal alien grass with tiny pink flowers", 32 px tiles, 16 tiles). Download it; do not regenerate it.

- [ ] **Step 1: Download the terrain tileset**

```bash
cd ~/word-defenders
mkdir -p public/assets/terrain public/assets/images
curl -sSL -o public/assets/terrain/terrain.png "https://api.pixellab.ai/mcp/tilesets/9da86472-df41-43ac-93b9-ef502a710b59/image?inline=true"
curl -sSL -o public/assets/terrain/terrain.json "https://api.pixellab.ai/mcp/tilesets/9da86472-df41-43ac-93b9-ef502a710b59/metadata"
file public/assets/terrain/terrain.png
```

Expected: `PNG image data, 128 x 128`.

- [ ] **Step 2: Check the tileset covers the map**

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { buildTerrainLookup, cornerKey } from './src/logic/sheets.js';
import { MAP_1, terrainCorners } from './src/logic/map.js';
const lookup = buildTerrainLookup(JSON.parse(readFileSync('public/assets/terrain/terrain.json', 'utf8')));
const missing = [...new Set(terrainCorners(MAP_1).flat().map(cornerKey))].filter((k) => !lookup.has(k));
if (missing.length) throw new Error('missing tiles: ' + missing.join(', '));
console.log('terrain ok', lookup.size);
"
```

Expected: `terrain ok 16`

- [ ] **Step 3: Generate the build pad, base and portal**

Call `create_1_direction_object` with `view: "top-down"` for each:

| Key | size | description | Candidates |
|---|---|---|---|
| pad | 32 | round metal tower build pad, flat sci-fi platform with a glowing blue rim, seen from above | 64 |
| base | 96 | cute dome-shaped space base with an antenna and glowing round windows, kids cartoon style, seen from above | 4 |
| portal | 64 | swirling purple alien portal on the ground with sparkles, seen from above | 16 |

Each enters `review` status. Call `get_object` to see the candidates and pick one per asset that: is centred, has a transparent background, reads clearly at its size, and matches the bright cartoon style. Call `select_object_frames(object_id, indices=[<index>])`, then `get_object` on the resulting object and download its image URL:

```bash
curl -sSL -o public/assets/images/pad.png "<image URL of the selected pad>"
curl -sSL -o public/assets/images/base.png "<image URL of the selected base>"
curl -sSL -o public/assets/images/portal.png "<image URL of the selected portal>"
```

If `get_object` offers only a ZIP download, unzip it into `assets/raw/objects/<key>/` and copy the single PNG instead.

- [ ] **Step 4: Generate the space background**

Call `create_image_pixflux` with `description: "starry purple night sky with distant colorful planets and a soft nebula, cute pixel art space background"`, `width: 256`, `height: 144`, `no_background: false`. Wait with `wait_for_jobs`, call `get_image`, then:

```bash
curl -sSL -o public/assets/images/bg-space.png "<image URL from get_image>"
```

- [ ] **Step 5: Check sizes**

Run: `file public/assets/images/*.png`
Expected: `bg-space.png` 256 x 144, `base.png` 96 x 96, `pad.png` 32 x 32, `portal.png` 64 x 64, all `PNG image data`. If a selected object came back at a different size, keep it — the game draws images at their native size — but note the actual size in the manifest.

- [ ] **Step 6: Record the assets in `assets/manifest.json`**

Add entries under `"assets"` (keep `candidates` and `picks` unchanged):

```json
"terrain": { "tool": "create_topdown_tileset", "id": "9da86472-df41-43ac-93b9-ef502a710b59", "lower": "smooth tan cobblestone path", "upper": "bright teal alien grass with tiny pink flowers", "files": ["public/assets/terrain/terrain.png", "public/assets/terrain/terrain.json"] },
"pad": { "tool": "create_1_direction_object", "id": "<selected object id>", "prompt": "<description from Step 3>", "files": ["public/assets/images/pad.png"] },
"base": { "tool": "create_1_direction_object", "id": "<selected object id>", "prompt": "<description>", "files": ["public/assets/images/base.png"] },
"portal": { "tool": "create_1_direction_object", "id": "<selected object id>", "prompt": "<description>", "files": ["public/assets/images/portal.png"] },
"bg-space": { "tool": "create_image_pixflux", "id": "<job id>", "prompt": "<description from Step 4>", "files": ["public/assets/images/bg-space.png"] }
```

Run: `node -e "JSON.parse(require('fs').readFileSync('assets/manifest.json','utf8')); console.log('manifest ok')"`
Expected: `manifest ok`

- [ ] **Step 7: Commit**

```bash
git add public/assets assets/manifest.json
git commit -m "art: terrain tileset, build pad, base, portal and space background

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Art — Towers (3 types × 3 levels, 8 facings)

Load tools with ToolSearch: `select:mcp__pixellab__create_8_direction_object,mcp__pixellab__create_object_state,mcp__pixellab__get_object,mcp__pixellab__wait_for_jobs`.

**Files:**
- Create: `assets/raw/towers/tower-<type>-<level>/<direction>.png` (8 per tower) and `pack.json`; `public/assets/sprites/tower-<type>-<level>.png` + `.json` (9 sheets)
- Modify: `assets/manifest.json`

**Interfaces:**
- Consumes: `tools/pack-sheet.mjs`; `parseSheet` (`sheets.js`); `DIRECTIONS_8` (`towers.js`).
- Produces: sprite keys `tower-blaster-1` … `tower-rocket-3`, each a sheet whose `rotations` contain all of `east, south-east, south, south-west, west, north-west, north, north-east`.

- [ ] **Step 1: Create the level-1 towers**

Call `create_8_direction_object` with `size: 64`, `view: "low top-down"`:

| Key | description |
|---|---|
| tower-blaster-1 | cute sci-fi blaster turret with a single laser barrel, blue and white, on a round metal base |
| tower-freeze-1 | cute ice ray turret with a frosty crystal dish, light blue and white, on a round metal base |
| tower-rocket-1 | cute rocket launcher turret with a red and white missile pod, on a round metal base |

Wait with `wait_for_jobs`, then `get_object` each until `completed`.

- [ ] **Step 2: Create levels 2 and 3 as object states**

For each level-1 object, call `create_object_state(object_id, edit_description, state_name)`:

| Key | edit_description | state_name |
|---|---|---|
| tower-blaster-2 | upgrade: bigger double barrel with gold trim | Level 2 |
| tower-blaster-3 | upgrade: triple glowing barrels, gold armor plates and a glowing core | Level 3 |
| tower-freeze-2 | upgrade: larger crystal dish with more icicles and silver trim | Level 2 |
| tower-freeze-3 | upgrade: huge glowing ice crystal with silver and gold trim | Level 3 |
| tower-rocket-2 | upgrade: two missile pods and gold trim | Level 2 |
| tower-rocket-3 | upgrade: four glowing missile pods and gold armor | Level 3 |

Wait, then `get_object` each new state. **If a state does not list all 8 rotations**, delete nothing; instead create that level with `create_8_direction_object(description: "<level-1 description>, <edit_description>", size: 64, view: "low top-down", style_object_id: "<level-1 object id>")` and use that object.

- [ ] **Step 3: Download every rotation**

For each of the 9 tower keys, download the 8 rotation URLs listed by `get_object` into `assets/raw/towers/<key>/<direction>.png`, using PixelLab's direction names (`east`, `south-east`, `south`, `south-west`, `west`, `north-west`, `north`, `north-east`):

```bash
mkdir -p assets/raw/towers/tower-blaster-1
curl -sSL -o assets/raw/towers/tower-blaster-1/east.png "<east rotation URL>"
```

Run: `ls assets/raw/towers/*/ | grep -c png`
Expected: `72`

- [ ] **Step 4: Write a pack spec per tower and pack it**

`assets/raw/towers/tower-blaster-1/pack.json` (repeat for all 9 keys, changing only `output`):

```json
{
  "output": "public/assets/sprites/tower-blaster-1",
  "rows": [
    {
      "type": "rotations",
      "frames": [
        { "direction": "east", "file": "east.png" },
        { "direction": "south-east", "file": "south-east.png" },
        { "direction": "south", "file": "south.png" },
        { "direction": "south-west", "file": "south-west.png" },
        { "direction": "west", "file": "west.png" },
        { "direction": "north-west", "file": "north-west.png" },
        { "direction": "north", "file": "north.png" },
        { "direction": "north-east", "file": "north-east.png" }
      ]
    }
  ]
}
```

```bash
for d in assets/raw/towers/*/; do node tools/pack-sheet.mjs "${d}pack.json"; done
```

Expected: 9 lines `wrote public/assets/sprites/tower-<type>-<level>.png (...)`.

- [ ] **Step 5: Verify every tower sheet**

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { parseSheet } from './src/logic/sheets.js';
import { DIRECTIONS_8 } from './src/logic/towers.js';
for (const type of ['blaster', 'freeze', 'rocket']) for (const level of [1, 2, 3]) {
  const key = 'tower-' + type + '-' + level;
  const sheet = parseSheet(JSON.parse(readFileSync('public/assets/sprites/' + key + '.json', 'utf8')));
  const missing = DIRECTIONS_8.filter((d) => !(d in sheet.rotations));
  if (missing.length) throw new Error(key + ' missing ' + missing.join(','));
}
console.log('towers ok');
"
```

Expected: `towers ok`

- [ ] **Step 6: Record the towers in `assets/manifest.json`**

Add one entry per tower key under `"assets"`:

```json
"tower-blaster-1": { "tool": "create_8_direction_object", "id": "<object id>", "prompt": "<description>", "files": ["public/assets/sprites/tower-blaster-1.png", "public/assets/sprites/tower-blaster-1.json"] },
"tower-blaster-2": { "tool": "create_object_state", "id": "<object id>", "source": "<level-1 object id>", "prompt": "<edit_description>", "files": ["public/assets/sprites/tower-blaster-2.png", "public/assets/sprites/tower-blaster-2.json"] }
```

(Use `"tool": "create_8_direction_object"` and add `"style_object_id"` for any level made by the Step 2 fallback.)

- [ ] **Step 7: Commit**

```bash
git add assets/raw/towers public/assets/sprites assets/manifest.json
git commit -m "art: blaster, freeze ray and rocket towers at three levels

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Art — Effects, Icons and the Pixel Font

Load tools with ToolSearch: `select:mcp__pixellab__create_image_pixflux,mcp__pixellab__animate_image,mcp__pixellab__get_image,mcp__pixellab__create_font,mcp__pixellab__get_font,mcp__pixellab__wait_for_jobs`.

**Files:**
- Create: `public/assets/images/{coin,heart,star,shield,bolt,rocket-shell,freeze-puff}.png`, `assets/raw/fx/explosion/frame_<n>.png` + `pack.json`, `public/assets/sprites/fx-explosion.png` + `.json`, `public/assets/fonts/pixel-ui.ttf`
- Modify: `assets/manifest.json`

**Interfaces:**
- Consumes: `tools/pack-sheet.mjs`, `parseSheet`.
- Produces: image keys `coin`, `heart`, `star`, `shield`, `bolt`, `rocket-shell`, `freeze-puff`; sprite key `fx-explosion` with animation `explode` / direction `south`; font family `PixelUI` from `assets/fonts/pixel-ui.ttf`.

- [ ] **Step 1: Generate the static images**

Call `create_image_pixflux` with `no_background: true` for each:

| Key | width × height | description |
|---|---|---|
| coin | 32 × 32 | shiny gold coin with a star stamped on it, cute pixel art icon |
| heart | 32 × 32 | bright red heart, cute pixel art icon |
| star | 32 × 32 | bright yellow five-pointed star with a white sparkle, cute pixel art icon |
| shield | 128 × 128 | round glowing cyan energy bubble shield, mostly see-through in the middle, bright rim |
| bolt | 32 × 32 | small glowing blue laser bolt pointing right |
| rocket-shell | 32 × 32 | small red and white cartoon missile pointing right with a little flame |
| freeze-puff | 64 × 64 | small puff of icy blue frost with snowflake sparkles |

Wait with `wait_for_jobs`, call `get_image` per job, and download each:

```bash
curl -sSL -o public/assets/images/coin.png "<image URL>"
```

Run: `file public/assets/images/{coin,heart,star,shield,bolt,rocket-shell,freeze-puff}.png`
Expected: 7 lines of `PNG image data` with the sizes above.

- [ ] **Step 2: Generate and animate the explosion**

1. `create_image_pixflux(description: "cartoon explosion burst, orange and yellow with white center, small", width: 64, height: 64, no_background: true)` → wait → `get_image` → note the image URL.
2. `animate_image(first_frame_url: "<that URL>", action: "explosion bursting outward then fading into small puffs of smoke", frame_count: 8, no_background: true)` → wait → `get_image`. It returns 9 frames (index 0 is the input frame). Use the `index` parameter of `get_image` if not all frame URLs are listed.
3. Download all 9 frames in order:

```bash
mkdir -p assets/raw/fx/explosion
curl -sSL -o assets/raw/fx/explosion/frame_0.png "<frame 0 URL>"
```

(through `frame_8.png`).

- [ ] **Step 3: Pack the explosion**

`assets/raw/fx/explosion/pack.json`:

```json
{
  "output": "public/assets/sprites/fx-explosion",
  "rows": [
    {
      "type": "animation",
      "animation": "explode",
      "direction": "south",
      "frames": [
        { "file": "frame_0.png" }, { "file": "frame_1.png" }, { "file": "frame_2.png" },
        { "file": "frame_3.png" }, { "file": "frame_4.png" }, { "file": "frame_5.png" },
        { "file": "frame_6.png" }, { "file": "frame_7.png" }, { "file": "frame_8.png" }
      ]
    }
  ]
}
```

Run: `node tools/pack-sheet.mjs assets/raw/fx/explosion/pack.json`
Expected: `wrote public/assets/sprites/fx-explosion.png (576x64) and public/assets/sprites/fx-explosion.json`

- [ ] **Step 4: Generate the pixel font**

Call `create_font(description: "chunky friendly space arcade font, white with a dark outline", weight: "Bold", glyph_px: 16, font_name: "PixelUI")`. Wait, call `get_font`, and download the `.ttf` URL:

```bash
mkdir -p public/assets/fonts
curl -sSL -o public/assets/fonts/pixel-ui.ttf "<ttf URL from get_font>"
file public/assets/fonts/pixel-ui.ttf
```

Expected: `TrueType Font data`. (The font has no space glyph; `FONTS.ui` falls back to `monospace` for spaces.)

- [ ] **Step 5: Record the assets in `assets/manifest.json`**

Add one entry per image key, plus:

```json
"fx-explosion": { "tool": "create_image_pixflux + animate_image", "ids": ["<still job id>", "<animation job id>"], "prompt": "<both prompts>", "files": ["public/assets/sprites/fx-explosion.png", "public/assets/sprites/fx-explosion.json"] },
"pixel-ui": { "tool": "create_font", "id": "<job id>", "prompt": "chunky friendly space arcade font, white with a dark outline", "files": ["public/assets/fonts/pixel-ui.ttf"] }
```

- [ ] **Step 6: Commit**

```bash
git add public/assets assets/raw/fx assets/manifest.json
git commit -m "art: effects, HUD icons, explosion animation and pixel font

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Art — Animate and Export the Picked Aliens

**Picks (CHECKPOINT A, 2026-10-10):** blob **a**, zoomer **a**, chonk **b**, boss **a** (missions 1–5) and boss2 **c** (missions 6–10). The game uses two bosses: the `boss2` pick is the Boss C candidate and exports as sprite `alien-boss-2`.

Load tools with ToolSearch: `select:mcp__pixellab__get_character,mcp__pixellab__animate_character,mcp__pixellab__delete_animation,mcp__pixellab__wait_for_jobs`.

**Files:**
- Create: `assets/raw/aliens/<name>.zip` and extracted folders (names `blob`, `zoomer`, `chonk`, `boss`, `boss-2`), `public/assets/sprites/alien-{blob,zoomer,chonk,boss,boss-2}.png` + `.json`
- Modify: `assets/manifest.json` (`picks`, `assets`)

**Interfaces:**
- Consumes: `assets/manifest.json` `candidates`; `parseSheet`.
- Produces: sprite keys `alien-blob`, `alien-zoomer`, `alien-chonk`, `alien-boss` (missions 1–5) and `alien-boss-2` (missions 6–10), each with a `walk` animation in `south`, `west`, `east` and `north`.

- [ ] **Step 1: Record the picks**

Set `"picks"` in `assets/manifest.json` to `{ "blob": "a", "zoomer": "a", "chonk": "b", "boss": "a", "boss2": "c" }`. Look up each picked character ID in `candidates` (`boss2` uses `candidates.boss.c`).

- [ ] **Step 2: Add walk animations**

For each picked character, call `get_character`. If it already lists an animation named `walk` with all 4 directions (Blob A does), skip it. Otherwise call:

`animate_character(character_id: "<id>", template_animation_id: "walking-8-frames", animation_name: "walk")`

Wait with `wait_for_jobs` until nothing is running, then `get_character` again and look at the preview. If the walk is clearly broken (the alien changes identity or limbs come apart), call `delete_animation` for it and retry once with `template_animation_id: "walking-6-frames"`, still named `walk`.

- [ ] **Step 3: Download each spritesheet export**

```bash
mkdir -p assets/raw/aliens
curl -sSL -o assets/raw/aliens/blob.zip "https://api.pixellab.ai/mcp/characters/<blob id>/spritesheet"
unzip -o assets/raw/aliens/blob.zip -d assets/raw/aliens/blob
cp assets/raw/aliens/blob/*.png public/assets/sprites/alien-blob.png
cp assets/raw/aliens/blob/*.json public/assets/sprites/alien-blob.json
```

Repeat for `zoomer`, `chonk`, `boss` (Boss A) and `boss-2` (Boss C, written to `alien-boss-2.png` / `.json`). Each ZIP holds exactly one PNG and one JSON.

- [ ] **Step 4: Verify the walk cycles**

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { parseSheet } from './src/logic/sheets.js';
for (const type of ['blob', 'zoomer', 'chonk', 'boss', 'boss-2']) {
  const sheet = parseSheet(JSON.parse(readFileSync('public/assets/sprites/alien-' + type + '.json', 'utf8')));
  const dirs = Object.keys(sheet.animations.walk ?? {}).sort().join(',');
  if (dirs !== 'east,north,south,west') throw new Error(type + ' walk directions: ' + dirs);
  console.log(type, sheet.frameWidth + 'x' + sheet.frameHeight, 'frames per direction:', sheet.animations.walk.south.length);
}
"
```

Expected: 5 lines, one per alien sprite, with no error.

- [ ] **Step 5: Record the aliens in `assets/manifest.json`**

```json
"alien-blob": { "tool": "create_character + animate_character", "id": "<character id>", "animation": "walking-8-frames as walk", "files": ["public/assets/sprites/alien-blob.png", "public/assets/sprites/alien-blob.json"] }
```

(one entry per alien sprite: `alien-blob`, `alien-zoomer`, `alien-chonk`, `alien-boss`, `alien-boss-2`)

- [ ] **Step 6: Commit**

```bash
git add assets public/assets/sprites
git commit -m "art: animate and export the picked aliens and boss

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 17: Phaser Foundation — Loading, Sound, UI Kit, Debug URLs, Title Screen

**Files:**
- Create: `src/ui/view.js`, `src/ui/text.js`, `src/ui/button.js`, `src/ui/errors.js`, `src/audio/sfx.js`, `src/app.js`, `src/assets.js`, `src/logic/debug.js`, `src/scenes/Boot.js`, `src/scenes/Preload.js`, `src/scenes/Title.js`, `tools/shot.mjs`
- Modify: `src/main.js` (replace the temporary scene)
- Test: `tests/sfx.test.js`, `tests/debug.test.js`, `tests/assets.test.js`

**Interfaces:**
- Consumes: everything in `src/logic/`; all art from Tasks 13–16.
- Produces:
  - `ZOOM = 2`, `setupCamera(scene)`, `markReady(scene)` (`src/ui/view.js`)
  - `FONTS`, `COLORS`, `FILLS`, `addText(scene, x, y, content, style?)` (`src/ui/text.js`)
  - `addButton(scene, x, y, label, onClick, { width, height, fontSize, fill }?) → Container` with extra methods `setEnabled(on)`, `setLabel(text)`, `show(on)` (`src/ui/button.js`)
  - `showLoadError(scene, key)` (`src/ui/errors.js`)
  - `createSfx({ AudioContextClass }?)`, `SOUND_NAMES`, `sfx` singleton with `play(name)`, `unlock()`, `setEnabled(on)` (`src/audio/sfx.js`)
  - `app` (`{ persistent, save }`) and `updateSave(next) → boolean` (`src/app.js`)
  - `ALIEN_TYPES`, `ALIEN_SPRITES`, `LATE_BOSS_MISSION`, `TOWER_SPRITES`, `SPRITES`, `IMAGES`, `FONT_FILES`, `LABEL_OFFSETS`, `ANIMATION_RATES`, `alienSpriteKey(type, missionId = 1)` (Boss A's `alien-boss` before mission 6, Boss C's `alien-boss-2` from mission 6), `towerSpriteKey(type, level)` (`src/assets.js`)
  - `parseDebug(search) → { scene, data: { missionId, wave, coins, hearts, stars, autostart } } | null` (`src/logic/debug.js`)
  - Registry key `sheets` (`{ [spriteKey]: parseSheet result }`); animations `<spriteKey>-<animation>-<direction>`; scene keys `Boot`, `Preload`, `Title`
  - `globalThis.__scene` (set by `markReady`) for `tools/shot.mjs`

- [ ] **Step 1: Write the failing tests**

`tests/sfx.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createSfx, SOUND_NAMES } from '../src/audio/sfx.js';

class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.destination = {};
    this.started = [];
  }

  param() {
    return { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
  }

  createOscillator() {
    const started = this.started;
    return { type: '', frequency: this.param(), connect: (node) => node, start: () => started.push('tone'), stop() {} };
  }

  createGain() {
    return { gain: this.param(), connect: (node) => node };
  }

  createBuffer(_channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }

  createBufferSource() {
    const started = this.started;
    return { buffer: null, connect: (node) => node, start: () => started.push('noise') };
  }

  resume() {
    return Promise.resolve();
  }
}

function recorder() {
  const box = { ctx: null };
  class Recording extends FakeAudioContext {
    constructor() {
      super();
      box.ctx = this;
    }
  }
  return { box, Recording };
}

describe('createSfx', () => {
  it('has a sound for every game moment in the spec', () => {
    expect(SOUND_NAMES).toEqual(expect.arrayContaining([
      'key', 'wrong', 'miss', 'zap', 'blaster', 'freeze', 'rocket', 'explosion', 'coin',
      'shieldPop', 'bossAlarm', 'leak', 'waveStart', 'victory', 'tryAgain', 'build', 'click',
    ]));
  });

  it('is silent and safe without Web Audio', () => {
    const sfx = createSfx({ AudioContextClass: null });
    expect(() => SOUND_NAMES.forEach((name) => sfx.play(name))).not.toThrow();
  });

  it('plays every sound through one shared context', () => {
    const { box, Recording } = recorder();
    const sfx = createSfx({ AudioContextClass: Recording });
    for (const name of SOUND_NAMES) sfx.play(name);
    expect(box.ctx.started.length).toBeGreaterThanOrEqual(SOUND_NAMES.length);
  });

  it('plays nothing while disabled', () => {
    const { box, Recording } = recorder();
    const sfx = createSfx({ AudioContextClass: Recording });
    sfx.setEnabled(false);
    sfx.play('coin');
    expect(box.ctx).toBeNull();
  });

  it('ignores unknown sound names', () => {
    const sfx = createSfx({ AudioContextClass: FakeAudioContext });
    expect(() => sfx.play('nope')).not.toThrow();
  });
});
```

`tests/debug.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { parseDebug } from '../src/logic/debug.js';

describe('parseDebug', () => {
  it('returns null without debug parameters', () => {
    expect(parseDebug('')).toBeNull();
    expect(parseDebug('?scene=Nowhere')).toBeNull();
  });

  it('starts a mission directly', () => {
    expect(parseDebug('?mission=4&wave=5&coins=999&hearts=2&autostart=1')).toEqual({
      scene: 'Game',
      data: { missionId: 4, wave: 5, coins: 999, hearts: 2, stars: 3, autostart: true },
    });
  });

  it('opens other scenes', () => {
    expect(parseDebug('?scene=Results&mission=2&stars=1')).toMatchObject({ scene: 'Results', data: { missionId: 2, stars: 1 } });
    expect(parseDebug('?scene=Title')).toMatchObject({ scene: 'Title' });
  });

  it('ignores out-of-range values', () => {
    expect(parseDebug('?mission=12&wave=9&coins=-5&hearts=0').data).toEqual({
      missionId: 1, wave: undefined, coins: undefined, hearts: undefined, stars: 3, autostart: false,
    });
  });
});
```

`tests/assets.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  SPRITES, IMAGES, FONT_FILES, ALIEN_TYPES, ALIEN_SPRITES, TOWER_SPRITES, LABEL_OFFSETS, alienSpriteKey,
} from '../src/assets.js';
import { parseSheet, buildTerrainLookup, cornerKey } from '../src/logic/sheets.js';
import { DIRECTIONS_8 } from '../src/logic/towers.js';
import { MAP_1, terrainCorners } from '../src/logic/map.js';

const publicPath = (p) => fileURLToPath(new URL(`../public/${p}`, import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(publicPath(p), 'utf8'));

describe('asset keys', () => {
  it('lists 5 alien sprites (two bosses), 9 towers and the explosion', () => {
    expect(ALIEN_SPRITES).toEqual(['alien-blob', 'alien-zoomer', 'alien-chonk', 'alien-boss', 'alien-boss-2']);
    expect(SPRITES).toHaveLength(15);
    expect(TOWER_SPRITES).toHaveLength(9);
    expect(Object.keys(LABEL_OFFSETS).sort()).toEqual([...ALIEN_TYPES].sort());
  });

  it('switches to the second boss from mission 6', () => {
    expect(alienSpriteKey('boss', 1)).toBe('alien-boss');
    expect(alienSpriteKey('boss', 5)).toBe('alien-boss');
    expect(alienSpriteKey('boss', 6)).toBe('alien-boss-2');
    expect(alienSpriteKey('boss', 10)).toBe('alien-boss-2');
    expect(alienSpriteKey('chonk', 9)).toBe('alien-chonk');
    expect(alienSpriteKey('blob')).toBe('alien-blob');
  });
});

describe('shipped assets', () => {
  it('has a PNG and JSON for every sprite sheet', () => {
    for (const key of SPRITES) {
      expect(existsSync(publicPath(`assets/sprites/${key}.png`)), `${key}.png`).toBe(true);
      expect(existsSync(publicPath(`assets/sprites/${key}.json`)), `${key}.json`).toBe(true);
    }
  });

  it('gives every alien sprite a 4-direction walk', () => {
    for (const key of ALIEN_SPRITES) {
      const sheet = parseSheet(readJson(`assets/sprites/${key}.json`));
      expect(Object.keys(sheet.animations.walk ?? {}).sort(), key).toEqual(['east', 'north', 'south', 'west']);
    }
  });

  it('gives every tower 8 rotations', () => {
    for (const key of TOWER_SPRITES) {
      const sheet = parseSheet(readJson(`assets/sprites/${key}.json`));
      expect(Object.keys(sheet.rotations).sort(), key).toEqual([...DIRECTIONS_8].sort());
    }
  });

  it('has an explosion animation', () => {
    const sheet = parseSheet(readJson('assets/sprites/fx-explosion.json'));
    expect(sheet.animations.explode.south.length).toBeGreaterThanOrEqual(4);
  });

  it('has every image', () => {
    for (const key of IMAGES) expect(existsSync(publicPath(`assets/images/${key}.png`)), key).toBe(true);
  });

  it('has terrain for every corner combination on the map', () => {
    const lookup = buildTerrainLookup(readJson('assets/terrain/terrain.json'));
    for (const key of new Set(terrainCorners(MAP_1).flat().map(cornerKey))) expect(lookup.has(key), key).toBe(true);
    expect(existsSync(publicPath('assets/terrain/terrain.png'))).toBe(true);
  });

  it('has the pixel font', () => {
    for (const url of Object.values(FONT_FILES)) expect(existsSync(publicPath(url)), url).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/sfx.test.js tests/debug.test.js tests/assets.test.js`
Expected: FAIL with `Failed to load url` for `src/audio/sfx.js`, `src/logic/debug.js` and `src/assets.js`.

- [ ] **Step 3: Implement `src/audio/sfx.js`**

```js
// Sound effects synthesised with Web Audio, so the game ships no audio files.
const SOUNDS = {
  key: (s) => s.tone({ freq: 880, dur: 0.05, type: 'triangle', vol: 0.08 }),
  wrong: (s) => s.tone({ freq: 170, to: 110, dur: 0.18, type: 'sawtooth', vol: 0.07 }),
  miss: (s) => s.tone({ freq: 140, dur: 0.08, type: 'sine', vol: 0.06 }),
  zap: (s) => s.tone({ freq: 1400, to: 300, dur: 0.18, type: 'sawtooth', vol: 0.1 }),
  blaster: (s) => s.tone({ freq: 660, to: 440, dur: 0.06, type: 'square', vol: 0.04 }),
  freeze: (s) => s.tone({ freq: 1200, to: 1700, dur: 0.15, type: 'sine', vol: 0.05 }),
  rocket: (s) => s.noise({ dur: 0.2, vol: 0.05 }),
  explosion: (s) => s.noise({ dur: 0.35, vol: 0.1 }),
  coin: (s) => {
    s.tone({ freq: 988, dur: 0.06, type: 'square', vol: 0.05 });
    s.tone({ freq: 1319, dur: 0.1, type: 'square', vol: 0.05, delay: 0.06 });
  },
  shieldPop: (s) => s.tone({ freq: 400, to: 1600, dur: 0.25, type: 'triangle', vol: 0.12 }),
  bossAlarm: (s) => [0, 0.3, 0.6].forEach((delay) => s.tone({ freq: 440, to: 330, dur: 0.25, type: 'square', vol: 0.07, delay })),
  leak: (s) => s.tone({ freq: 220, to: 110, dur: 0.3, type: 'square', vol: 0.07 }),
  waveStart: (s) => [523, 659, 784].forEach((freq, i) => s.tone({ freq, dur: 0.12, type: 'triangle', vol: 0.09, delay: i * 0.1 })),
  victory: (s) => [523, 659, 784, 1047].forEach((freq, i) => s.tone({ freq, dur: 0.2, type: 'triangle', vol: 0.1, delay: i * 0.15 })),
  tryAgain: (s) => [392, 330].forEach((freq, i) => s.tone({ freq, dur: 0.25, type: 'triangle', vol: 0.08, delay: i * 0.2 })),
  build: (s) => s.tone({ freq: 523, to: 784, dur: 0.12, type: 'square', vol: 0.06 }),
  click: (s) => s.tone({ freq: 600, dur: 0.04, type: 'square', vol: 0.04 }),
};

export const SOUND_NAMES = Object.freeze(Object.keys(SOUNDS));

export function createSfx({ AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext } = {}) {
  let ctx = null;
  let enabled = true;

  function context() {
    if (!ctx) {
      if (!AudioContextClass) return null;
      try {
        ctx = new AudioContextClass();
      } catch {
        return null;
      }
    }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
    return ctx;
  }

  const synth = {
    tone({ freq, to = freq, dur, type, vol, delay = 0 }) {
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    },
    noise({ dur, vol, delay = 0 }) {
      const start = ctx.currentTime + delay;
      const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(vol, start);
      source.connect(gain).connect(ctx.destination);
      source.start(start);
    },
  };

  return {
    play(name) {
      if (!enabled || !SOUNDS[name] || !context()) return;
      try {
        SOUNDS[name](synth);
      } catch {
        // Sound is optional; never let it break the game.
      }
    },
    unlock() {
      context();
    },
    setEnabled(on) {
      enabled = Boolean(on);
    },
  };
}

export const sfx = createSfx();
```

- [ ] **Step 4: Implement `src/logic/debug.js`**

```js
const SCENES = ['Title', 'MissionMap', 'Game', 'Results', 'Grownups'];

// Dev-only URL shortcuts for screenshots, e.g. ?mission=4&wave=5&coins=999.
export function parseDebug(search) {
  const params = new URLSearchParams(search);
  const scene = params.get('scene') ?? (params.has('mission') ? 'Game' : null);
  if (!SCENES.includes(scene)) return null;
  const int = (name, min, max) => {
    const n = Number(params.get(name));
    return params.has(name) && Number.isInteger(n) && n >= min && n <= max ? n : undefined;
  };
  return {
    scene,
    data: {
      missionId: int('mission', 1, 10) ?? 1,
      wave: int('wave', 1, 5),
      coins: int('coins', 0, 99999),
      hearts: int('hearts', 1, 10),
      stars: int('stars', 1, 3) ?? 3,
      autostart: params.get('autostart') === '1',
    },
  };
}
```

- [ ] **Step 5: Implement `src/assets.js`**

```js
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
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all files). If `tests/assets.test.js` fails, an art task is incomplete: fix the art, not the test.

- [ ] **Step 7: Write the UI kit**

`src/ui/view.js`:

```js
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
```

`src/ui/text.js`:

```js
import { ZOOM } from './view.js';

export const FONTS = Object.freeze({ word: 'Andika', ui: '"PixelUI", monospace' });

export const COLORS = Object.freeze({
  text: '#ffffff',
  typed: '#3ddc84',
  next: '#ffd23f',
  wrong: '#ff5c5c',
  dim: '#9aa0c8',
  gold: '#ffd23f',
});

export const FILLS = Object.freeze({
  panel: 0x1b1b3a,
  panelEdge: 0x5b5bd6,
  button: 0x5b5bd6,
  go: 0x2e9e5b,
  quiet: 0x333355,
  disabled: 0x444466,
  locked: 0x333344,
});

export function addText(scene, x, y, content, style = {}) {
  return scene.add
    .text(x, y, content, { fontFamily: FONTS.ui, fontSize: '16px', color: COLORS.text, ...style })
    .setResolution(ZOOM);
}
```

`src/ui/button.js`:

```js
import { addText, FILLS } from './text.js';
import { sfx } from '../audio/sfx.js';

export function addButton(scene, x, y, label, onClick, { width = 200, height = 48, fontSize = '16px', fill = FILLS.button } = {}) {
  const button = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const text = addText(scene, 0, 0, label, { fontSize }).setOrigin(0.5);
  const hit = scene.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true });
  let enabled = true;
  let hover = false;

  const draw = () => {
    const color = !enabled ? FILLS.disabled : hover ? lighten(fill) : fill;
    bg.clear();
    bg.fillStyle(color, 1).fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    bg.lineStyle(2, 0xffffff, enabled ? 0.9 : 0.3).strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    text.setAlpha(enabled ? 1 : 0.5);
  };

  hit.on('pointerover', () => {
    hover = true;
    draw();
  });
  hit.on('pointerout', () => {
    hover = false;
    draw();
  });
  hit.on('pointerdown', () => {
    if (!enabled) return;
    sfx.play('click');
    onClick();
  });

  button.add([bg, text, hit]);
  button.setEnabled = (on) => {
    enabled = Boolean(on);
    draw();
    return button;
  };
  button.setLabel = (value) => {
    text.setText(value);
    return button;
  };
  // Hidden buttons must also stop taking clicks.
  button.show = (on) => {
    button.setVisible(on);
    hit.input.enabled = on;
    return button;
  };
  draw();
  return button;
}

function lighten(color) {
  const channel = (shift) => Math.min(255, ((color >> shift) & 0xff) + 40);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
```

`src/ui/errors.js`:

```js
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
```

- [ ] **Step 8: Write `src/app.js`**

```js
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
```

- [ ] **Step 9: Write the loading scenes**

`src/scenes/Boot.js`:

```js
import * as Phaser from 'phaser';
import { SPRITES, FONT_FILES } from '../assets.js';
import { showLoadError } from '../ui/errors.js';

// Loads the small files the real loader needs: sheet layouts, terrain metadata, fonts.
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.failedKey = null;
    this.load.on('loaderror', (file) => {
      this.failedKey = file.key;
    });
    for (const key of SPRITES) this.load.json(`sheet:${key}`, `assets/sprites/${key}.json`);
    this.load.json('terrain', 'assets/terrain/terrain.json');
    for (const [family, url] of Object.entries(FONT_FILES)) this.load.font(family, url, 'truetype');
  }

  create() {
    // A dev server may answer a missing file with index.html (status 200), which
    // Phaser fails to parse without a 'loaderror', so check the cache as well.
    const missing = [...SPRITES.map((key) => `sheet:${key}`), 'terrain'].find((key) => !this.cache.json.exists(key));
    if (this.failedKey || missing) {
      showLoadError(this, this.failedKey ?? missing);
      return;
    }
    document.fonts
      .load('26px Andika')
      .catch(() => null)
      .then(() => this.scene.start('Preload'));
  }
}
```

`src/scenes/Preload.js`:

```js
import * as Phaser from 'phaser';
import { SPRITES, IMAGES, ANIMATION_RATES } from '../assets.js';
import { parseSheet } from '../logic/sheets.js';
import { parseDebug } from '../logic/debug.js';
import { TILE, GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';
import { setupCamera } from '../ui/view.js';
import { showLoadError } from '../ui/errors.js';

export class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    setupCamera(this);
    this.failedKey = null;
    this.progressBar = this.add.graphics();
    this.load.on('progress', (progress) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x5b5bd6, 1).fillRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 - 8, 400 * progress, 16);
    });
    this.load.on('loaderror', (file) => {
      this.failedKey = file.key;
    });
    this.sheetLayouts = {};
    for (const key of SPRITES) {
      const sheet = parseSheet(this.cache.json.get(`sheet:${key}`));
      this.sheetLayouts[key] = sheet;
      this.load.spritesheet(key, `assets/sprites/${key}.png`, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
    }
    this.load.spritesheet('terrain', 'assets/terrain/terrain.png', { frameWidth: TILE, frameHeight: TILE });
    for (const key of IMAGES) this.load.image(key, `assets/images/${key}.png`);
  }

  create() {
    this.progressBar.destroy();
    const missing = [...SPRITES, ...IMAGES, 'terrain'].find((key) => !this.textures.exists(key));
    if (this.failedKey || missing) {
      showLoadError(this, this.failedKey ?? missing);
      return;
    }
    this.registry.set('sheets', this.sheetLayouts);
    for (const [key, sheet] of Object.entries(this.sheetLayouts)) {
      for (const [name, directions] of Object.entries(sheet.animations)) {
        for (const [direction, frames] of Object.entries(directions)) {
          this.anims.create({
            key: `${key}-${name}-${direction}`,
            frames: this.anims.generateFrameNumbers(key, { frames }),
            frameRate: ANIMATION_RATES[name] ?? 12,
            repeat: name === 'walk' ? -1 : 0,
          });
        }
      }
    }
    const debug = import.meta.env.DEV ? parseDebug(globalThis.location.search) : null;
    if (debug) this.scene.start(debug.scene, debug.data);
    else this.scene.start('Title');
  }
}
```

- [ ] **Step 10: Write `src/scenes/Title.js`**

```js
import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';
import { setupCamera, markReady } from '../ui/view.js';
import { addText, COLORS, FILLS } from '../ui/text.js';
import { addButton } from '../ui/button.js';
import { sfx } from '../audio/sfx.js';

export class Title extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    setupCamera(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-space').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    addText(this, GAME_WIDTH / 2, 140, 'WORD DEFENDERS', {
      fontSize: '64px',
      color: COLORS.gold,
      stroke: '#1b1b3a',
      strokeThickness: 8,
    }).setOrigin(0.5);
    ['alien-blob', 'alien-zoomer', 'alien-chonk'].forEach((key, i) => {
      const alien = this.add.sprite(-80 - i * 110, 320, key).play(`${key}-walk-east`);
      this.tweens.add({ targets: alien, x: GAME_WIDTH + 80, duration: 10000, delay: i * 700, repeat: -1 });
    });
    addButton(this, GAME_WIDTH / 2, 440, 'PLAY', () => {
      sfx.unlock();
      this.scene.start('MissionMap');
    }, { width: 240, height: 64, fontSize: '32px', fill: FILLS.go });
    addButton(this, 924, 540, 'Grown-ups', () => {
      sfx.unlock();
      this.scene.start('Grownups');
    }, { width: 160, height: 40, fill: FILLS.quiet });
    markReady(this);
  }
}
```

- [ ] **Step 11: Replace `src/main.js`**

```js
import '@fontsource/andika/400.css';
import './style.css';
import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './logic/map.js';
import { ZOOM } from './ui/view.js';
import { Boot } from './scenes/Boot.js';
import { Preload } from './scenes/Preload.js';
import { Title } from './scenes/Title.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH * ZOOM,
  height: GAME_HEIGHT * ZOOM,
  backgroundColor: '#0b0b1a',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Preload, Title],
});
```

- [ ] **Step 12: Write `tools/shot.mjs`**

```js
#!/usr/bin/env node
// Drives the dev server in headless Chrome for screenshot checks.
// node tools/shot.mjs --url <url> [--scene <Key>] --do "wait:1000" --do "click:512,300"
//   --do "type:because" --do "key:Escape" --do "typefirst" --do "typefirst:2" --do "scene:Game" --do "shot:.shots/x.png"
//   --do "fill:#gw-words|cat\ndog" --do "tap:#gw-save"   (DOM elements; \n in fill text becomes a newline)
//   --do "until:__debug?.run.phase === 'won'"   (wait up to 300 s for a page expression to be truthy)
// Click coordinates are logical game coordinates (1024x576). Browser dialogs are accepted.
// Exits 1 on any console error.
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const opts = { url: null, scene: null, actions: [] };
for (let i = 0; i < args.length; i += 2) {
  const [flag, value] = [args[i], args[i + 1]];
  if (flag === '--url') opts.url = value;
  else if (flag === '--scene') opts.scene = value;
  else if (flag === '--do') opts.actions.push(value);
  else throw new Error(`Unknown flag ${flag}`);
}
if (!opts.url) throw new Error('--url is required');

const waitForScene = (page, key) =>
  page.waitForFunction((k) => globalThis.__scene === k, key, { timeout: 20000 });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('dialog', (dialog) => dialog.accept());

try {
  await page.goto(opts.url);
  if (opts.scene) await waitForScene(page, opts.scene);
  for (const action of opts.actions) {
    const [verb, ...rest] = action.split(':');
    const arg = rest.join(':');
    if (verb === 'wait') {
      await page.waitForTimeout(Number(arg));
    } else if (verb === 'click') {
      const [x, y] = arg.split(',').map(Number);
      const box = await page.locator('canvas').boundingBox();
      await page.mouse.click(box.x + (x * box.width) / 1024, box.y + (y * box.height) / 576);
    } else if (verb === 'type') {
      await page.keyboard.type(arg, { delay: 60 });
    } else if (verb === 'key') {
      await page.keyboard.press(arg);
    } else if (verb === 'typefirst') {
      const word = await page.evaluate(() => globalThis.__debug?.firstWord?.() ?? '');
      if (!word) throw new Error('typefirst: no typeable alien on screen');
      await page.keyboard.type(arg ? word.slice(0, Number(arg)) : word, { delay: 60 });
    } else if (verb === 'scene') {
      await waitForScene(page, arg);
    } else if (verb === 'until') {
      await page.waitForFunction(arg, null, { timeout: 300000 });
    } else if (verb === 'fill') {
      const [selector, ...text] = arg.split('|');
      await page.fill(selector, text.join('|').replaceAll('\\n', '\n'));
    } else if (verb === 'tap') {
      await page.click(arg);
    } else if (verb === 'shot') {
      await page.screenshot({ path: arg });
      console.log(`saved ${arg}`);
    } else {
      throw new Error(`Unknown action ${verb}`);
    }
  }
} finally {
  await browser.close();
}

if (errors.length) {
  console.error('Console errors:', JSON.stringify(errors, null, 2));
  process.exit(1);
}
console.log('No console errors.');
```

- [ ] **Step 13: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 14: Screenshot check — Title**

```bash
mkdir -p .shots
(npx vite --port 5199 --strictPort > .shots/vite.log 2>&1 &) ; sleep 3
node tools/shot.mjs --url "http://localhost:5199/" --scene Title --do "wait:1500" --do "shot:.shots/17-title.png"
pkill -f "vite --port 5199"
```

Expected: prints `No console errors.` Open `.shots/17-title.png` with the Read tool: the space background fills the window; "WORD DEFENDERS" in the gold pixel font near the top; the picked Blob, Zoomer and Chonk walk left-to-right across the middle (sharp pixels, not blurry); a green **PLAY** button below them; a small **Grown-ups** button bottom-right.

- [ ] **Step 15: Screenshot check — missing-asset message**

```bash
mv public/assets/images/coin.png .shots/coin.png.bak
(npx vite --port 5199 --strictPort > .shots/vite.log 2>&1 &) ; sleep 3
node tools/shot.mjs --url "http://localhost:5199/" --scene Preload --do "wait:500" --do "shot:.shots/17-error.png" ; echo "exit=$?"
pkill -f "vite --port 5199"
mv .shots/coin.png.bak public/assets/images/coin.png
```

Expected: `exit=1` with a console error about `coin` (Vite answers the missing file with `index.html`, so Phaser logs "Failed to process file"), and `.shots/17-error.png` shows "Couldn't load the game — try refreshing." centred on a dark background. Confirm `git status --short public/assets` prints nothing afterwards (the coin is restored).

- [ ] **Step 16: Commit**

```bash
git add src tools tests
git commit -m "feat: Phaser boot, asset loading, sound, UI kit and title screen

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 18: Mission Map and Results Screens

**Files:**
- Create: `src/scenes/MissionMap.js`, `src/scenes/Results.js`
- Modify: `src/main.js` (scene list)

**Interfaces:**
- Consumes: `MISSIONS`, `MISSION_COUNT`, `getMission` (`missions.js`); `isUnlocked` (`save.js`); `TOWERS` (`towers.js`); `app`; `towerSpriteKey`; UI kit.
- Produces: scene `MissionMap` (starts `Game` with `{ missionId }`); scene `Results`, started with `{ missionId, stars, coinsEarned }`, which offers `Game` with `{ missionId: missionId + 1 }` or `MissionMap`.

- [ ] **Step 1: Write `src/scenes/MissionMap.js`**

```js
import * as Phaser from 'phaser';
import { MISSIONS } from '../logic/missions.js';
import { isUnlocked } from '../logic/save.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';
import { app } from '../app.js';
import { sfx } from '../audio/sfx.js';
import { setupCamera, markReady } from '../ui/view.js';
import { addText, COLORS, FILLS } from '../ui/text.js';
import { addButton } from '../ui/button.js';

// Missions 1-5 run left to right, 6-10 snake back right to left.
const POSITIONS = [
  [160, 230], [336, 230], [512, 230], [688, 230], [864, 230],
  [864, 410], [688, 410], [512, 410], [336, 410], [160, 410],
];

export class MissionMap extends Phaser.Scene {
  constructor() {
    super('MissionMap');
  }

  create() {
    setupCamera(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-space').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    addText(this, GAME_WIDTH / 2, 90, 'PICK A MISSION', { fontSize: '48px', color: COLORS.gold, stroke: '#1b1b3a', strokeThickness: 6 }).setOrigin(0.5);
    const trail = this.add.graphics();
    trail.lineStyle(6, FILLS.panelEdge, 0.6);
    trail.beginPath();
    POSITIONS.forEach(([x, y], i) => (i === 0 ? trail.moveTo(x, y) : trail.lineTo(x, y)));
    trail.strokePath();
    MISSIONS.forEach((mission, i) => this.addMarker(mission.id, POSITIONS[i][0], POSITIONS[i][1]));
    addButton(this, 90, 540, 'BACK', () => this.scene.start('Title'), { width: 120, height: 44, fill: FILLS.quiet });
    markReady(this);
  }

  addMarker(id, x, y) {
    const unlocked = isUnlocked(app.save, id);
    const best = app.save.missions[id]?.stars ?? 0;
    const circle = this.add.circle(x, y, 44, unlocked ? FILLS.button : FILLS.locked).setStrokeStyle(4, 0xffffff, unlocked ? 1 : 0.3);
    addText(this, x, y, String(id), { fontSize: '32px', color: unlocked ? COLORS.text : COLORS.dim }).setOrigin(0.5);
    if (!unlocked) addText(this, x + 32, y - 32, '🔒', { fontFamily: 'sans-serif', fontSize: '24px' }).setOrigin(0.5);
    [-1, 0, 1].forEach((offset, i) => {
      const star = this.add.image(x + offset * 26, y + 62, 'star').setScale(0.75);
      if (i >= best) star.setTint(0x333344);
    });
    if (!unlocked) return;
    circle.setInteractive({ useHandCursor: true });
    circle.on('pointerover', () => circle.setFillStyle(0x7b7bf0));
    circle.on('pointerout', () => circle.setFillStyle(FILLS.button));
    circle.on('pointerdown', () => {
      sfx.play('click');
      this.scene.start('Game', { missionId: id });
    });
  }
}
```

- [ ] **Step 2: Write `src/scenes/Results.js`**

```js
import * as Phaser from 'phaser';
import { getMission, MISSION_COUNT } from '../logic/missions.js';
import { TOWERS } from '../logic/towers.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';
import { towerSpriteKey } from '../assets.js';
import { sfx } from '../audio/sfx.js';
import { setupCamera, markReady } from '../ui/view.js';
import { addText, COLORS, FONTS, FILLS } from '../ui/text.js';
import { addButton } from '../ui/button.js';

export class Results extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  init(data) {
    this.outcome = { missionId: data?.missionId ?? 1, stars: data?.stars ?? 1, coinsEarned: data?.coinsEarned ?? 0 };
  }

  create() {
    setupCamera(this);
    const { missionId, stars, coinsEarned } = this.outcome;
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-space').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    addText(this, GAME_WIDTH / 2, 100, `MISSION ${missionId} COMPLETE!`, { fontSize: '48px', color: COLORS.gold, stroke: '#1b1b3a', strokeThickness: 6 }).setOrigin(0.5);

    [-1, 0, 1].forEach((offset, i) => {
      const star = this.add.image(GAME_WIDTH / 2 + offset * 110, 220, 'star').setScale(0);
      if (i >= stars) star.setTint(0x333344);
      this.tweens.add({
        targets: star,
        scale: 3,
        delay: 300 + i * 350,
        duration: 300,
        ease: 'Back.Out',
        onStart: () => {
          if (i < stars) sfx.play('coin');
        },
      });
    });

    addText(this, GAME_WIDTH / 2, 320, `Coins earned: ${coinsEarned}`, { fontFamily: FONTS.word, fontSize: '28px' }).setOrigin(0.5);

    const next = missionId < MISSION_COUNT ? getMission(missionId + 1) : null;
    if (next?.newTower) {
      const key = towerSpriteKey(next.newTower, 1);
      const south = this.registry.get('sheets')[key].rotations.south;
      this.add.sprite(GAME_WIDTH / 2 - 150, 386, key, south);
      addText(this, GAME_WIDTH / 2 - 100, 386, `New tower: ${TOWERS[next.newTower].name}!`, { fontFamily: FONTS.word, fontSize: '28px', color: COLORS.gold }).setOrigin(0, 0.5);
    }
    if (!next) {
      addText(this, GAME_WIDTH / 2, 386, 'You beat every mission!', { fontFamily: FONTS.word, fontSize: '32px', color: COLORS.gold }).setOrigin(0.5);
    }

    if (next) {
      addButton(this, GAME_WIDTH / 2 - 140, 480, 'NEXT MISSION', () => this.scene.start('Game', { missionId: missionId + 1 }), { width: 240, height: 56, fill: FILLS.go });
    }
    addButton(this, next ? GAME_WIDTH / 2 + 140 : GAME_WIDTH / 2, 480, 'MISSION MAP', () => this.scene.start('MissionMap'), { width: 240, height: 56 });
    markReady(this);
  }
}
```

- [ ] **Step 3: Register the scenes in `src/main.js`**

Add the imports after the `Title` import:

```js
import { MissionMap } from './scenes/MissionMap.js';
import { Results } from './scenes/Results.js';
```

and change the scene list to:

```js
  scene: [Boot, Preload, Title, MissionMap, Results],
```

- [ ] **Step 4: Run tests and build**

Run: `npm test && npm run build`
Expected: all tests pass; build exits 0.

- [ ] **Step 5: Screenshot checks**

```bash
(npx vite --port 5199 --strictPort > .shots/vite.log 2>&1 &) ; sleep 3
node tools/shot.mjs --url "http://localhost:5199/?scene=MissionMap" --scene MissionMap --do "wait:500" --do "shot:.shots/18-map.png"
node tools/shot.mjs --url "http://localhost:5199/?scene=Results&mission=2&stars=2" --scene Results --do "wait:2000" --do "shot:.shots/18-results.png"
node tools/shot.mjs --url "http://localhost:5199/?scene=Results&mission=10&stars=3" --scene Results --do "wait:2000" --do "shot:.shots/18-results-final.png"
node tools/shot.mjs --url "http://localhost:5199/" --scene Title --do "click:512,440" --do "scene:MissionMap" --do "shot:.shots/18-play.png"
pkill -f "vite --port 5199"
```

Expected (each run prints `No console errors.`):
- `18-map.png`: "PICK A MISSION"; ten numbered circles joined by a trail in two rows (1–5 top, 6–10 bottom snaking back); mission 1 bright blue; 2–10 dark with a padlock; three dim stars under each; **BACK** bottom-left. (Headless Chrome starts with an empty save.)
- `18-results.png`: "MISSION 2 COMPLETE!", two gold stars and one dim, "Coins earned: 0", the Freeze Ray level-1 sprite with "New tower: Freeze Ray!", and **NEXT MISSION** and **MISSION MAP** buttons.
- `18-results-final.png`: three gold stars, "You beat every mission!", and only **MISSION MAP**.
- `18-play.png`: clicking **PLAY** on the title opens the Mission Map.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: mission map and results screens

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 19: Game Scene — Map, Aliens, Typing, HUD, Pause, Retry and Win

This task builds a playable game without towers: aliens walk the path, words are typed to zap them, the HUD tracks hearts, coins and the wave, and failing or winning works. Task 20 adds towers.

**Files:**
- Create: `src/objects/WordLabel.js`, `src/objects/ShieldView.js`, `src/objects/AlienView.js`, `src/scenes/game/MapView.js`, `src/scenes/game/Hud.js`, `src/ui/modal.js`, `src/scenes/Game.js`
- Modify: `src/main.js` (scene list), `src/assets.js` (tune `LABEL_OFFSETS` in Step 9)

**Interfaces:**
- Consumes: `src/logic/game.js` (as `Run`), `readKeyEvent`, `lockableAliens`, map helpers, `buildTerrainLookup`/`cornerKey`, `SPEEDS`, `recordResult`, `createRng`, `app`/`updateSave`, `sfx`, the UI kit, the `sheets` registry entry.
- Produces:
  - Scene `Game`, started with `{ missionId, wave?, coins?, hearts?, autostart? }`
  - `new MapView(scene, map, { onPadClick? })` with `padPosition(index) → {x,y}` and `flashBase()`
  - `new Hud(scene, { missionId, onPause })` with `set(run)` and `flashHearts()`
  - `new AlienView(scene, alien, missionId)` with `sync(alien, typing)`, `wobble()`, `destroy()` and a `sprite` property (`missionId` picks the boss sprite through `alienSpriteKey`)
  - `showModal(scene, { message, buttons: [{ label, onClick }] }) → close()`
  - DEV only: `globalThis.__debug = { run, firstWord() }`

- [ ] **Step 1: Write `src/objects/WordLabel.js`**

```js
import { addText, COLORS, FONTS, FILLS } from '../ui/text.js';

const PAD_X = 10;
const HEIGHT = 38;
const STYLE = { fontFamily: FONTS.word, fontSize: '26px' };

// Word bubble above an alien. While locked: typed letters green, the next
// letter yellow and underlined, the rest white, with a yellow outline.
export class WordLabel {
  constructor(scene) {
    this.scene = scene;
    this.offset = { x: 0 };
    this.stateKey = null;
    this.container = scene.add.container(0, 0).setDepth(10000);
    this.bg = scene.add.graphics();
    this.typed = addText(scene, 0, 0, '', { ...STYLE, color: COLORS.typed }).setOrigin(0, 0.5);
    this.next = addText(scene, 0, 0, '', { ...STYLE, color: COLORS.next }).setOrigin(0, 0.5);
    this.rest = addText(scene, 0, 0, '', { ...STYLE, color: COLORS.text }).setOrigin(0, 0.5);
    this.underline = scene.add.graphics();
    this.container.add([this.bg, this.typed, this.next, this.rest, this.underline]);
    this.pulse = scene.tweens.add({ targets: this.next, alpha: 0.35, yoyo: true, repeat: -1, duration: 350 });
  }

  set(word, typedCount, locked) {
    const stateKey = `${word}|${typedCount}|${locked}`;
    if (stateKey === this.stateKey) return;
    this.stateKey = stateKey;
    this.container.setVisible(word !== null);
    if (word === null) return;

    const split = locked ? typedCount : 0;
    this.typed.setText(word.slice(0, split));
    this.next.setText(locked ? word.slice(split, split + 1) : '');
    this.rest.setText(word.slice(locked ? split + 1 : 0));

    const width = this.typed.width + this.next.width + this.rest.width;
    let x = -width / 2;
    this.typed.setX(x);
    x += this.typed.width;
    this.next.setX(x);
    const nextX = x;
    x += this.next.width;
    this.rest.setX(x);

    const left = -width / 2 - PAD_X;
    this.bg.clear();
    this.bg.fillStyle(FILLS.panel, 0.9).fillRoundedRect(left, -HEIGHT / 2, width + PAD_X * 2, HEIGHT, 10);
    if (locked) this.bg.lineStyle(3, 0xffd23f, 1).strokeRoundedRect(left, -HEIGHT / 2, width + PAD_X * 2, HEIGHT, 10);
    this.underline.clear();
    if (locked && this.next.width > 0) this.underline.fillStyle(0xffd23f, 1).fillRect(nextX, 13, this.next.width, 3);
  }

  setPosition(x, y, depth) {
    this.container.setPosition(x + this.offset.x, y).setDepth(10000 + depth);
  }

  wobble() {
    this.scene.tweens.killTweensOf(this.offset);
    this.offset.x = 0;
    this.scene.tweens.add({
      targets: this.offset,
      x: 6,
      yoyo: true,
      repeat: 3,
      duration: 40,
      onComplete: () => {
        this.offset.x = 0;
      },
    });
    this.next.setColor(COLORS.wrong);
    this.scene.time.delayedCall(250, () => {
      if (this.next.active) this.next.setColor(COLORS.next);
    });
  }

  destroy() {
    this.pulse.remove();
    this.scene.tweens.killTweensOf(this.offset);
    this.container.destroy();
  }
}
```

- [ ] **Step 2: Write `src/objects/ShieldView.js`**

```js
const SHIELD_SIZE = 140;
const LAYER_GROWTH = 24;

// Nested bubbles around a boss, one per remaining shield word. The outermost
// bubble pops when its word is typed.
export class ShieldView {
  constructor(scene) {
    this.scene = scene;
    this.bubbles = [];
  }

  sync(alien, depth) {
    const remaining = alien.shieldWords.length - alien.shieldIndex;
    while (this.bubbles.length < remaining) {
      const size = SHIELD_SIZE + this.bubbles.length * LAYER_GROWTH;
      this.bubbles.push(this.scene.add.image(alien.x, alien.y, 'shield').setDisplaySize(size, size).setAlpha(0.55));
    }
    while (this.bubbles.length > remaining) this.pop(this.bubbles.pop());
    for (const bubble of this.bubbles) bubble.setPosition(alien.x, alien.y).setDepth(depth + 1);
  }

  pop(bubble) {
    this.scene.tweens.add({
      targets: bubble,
      scale: bubble.scale * 1.6,
      alpha: 0,
      duration: 300,
      onComplete: () => bubble.destroy(),
    });
  }

  destroy() {
    for (const bubble of this.bubbles) bubble.destroy();
    this.bubbles = [];
  }
}
```

- [ ] **Step 3: Write `src/objects/AlienView.js`**

```js
import { WordLabel } from './WordLabel.js';
import { ShieldView } from './ShieldView.js';
import { LABEL_OFFSETS, alienSpriteKey } from '../assets.js';

const SLOW_TINT = 0x9fd8ff;
// Word bubbles never rise into the 64 px HUD bar (the path's top row is close to it).
const LABEL_MIN_Y = 86;

export class AlienView {
  constructor(scene, alien, missionId) {
    this.scene = scene;
    this.spriteKey = alienSpriteKey(alien.type, missionId);
    this.labelOffset = LABEL_OFFSETS[alien.type];
    this.dir = null;
    this.sprite = scene.add.sprite(alien.x, alien.y, this.spriteKey);
    this.hpBar = scene.add.graphics();
    this.label = new WordLabel(scene);
    this.shields = alien.type === 'boss' ? new ShieldView(scene) : null;
  }

  sync(alien, typing) {
    this.sprite.setPosition(alien.x, alien.y).setDepth(alien.y);
    if (alien.dir !== this.dir) {
      this.dir = alien.dir;
      this.sprite.play(`${this.spriteKey}-walk-${alien.dir}`);
    }
    this.sprite.anims.timeScale = 1 - alien.slow;
    if (alien.slow > 0) this.sprite.setTint(SLOW_TINT);
    else this.sprite.clearTint();

    const locked = typing.targetId === alien.id;
    const labelY = Math.max(alien.y - this.labelOffset, LABEL_MIN_Y);
    this.label.set(alien.word, locked ? typing.index : 0, locked);
    this.label.setPosition(alien.x, labelY, alien.y);
    this.shields?.sync(alien, alien.y);
    this.drawHp(alien, labelY);
  }

  drawHp(alien, labelY) {
    this.hpBar.clear();
    if (alien.hp >= alien.maxHp) return;
    const width = alien.type === 'boss' ? 80 : 36;
    const x = alien.x - width / 2;
    const y = labelY + 24;
    this.hpBar.setDepth(10000 + alien.y);
    this.hpBar.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, width + 2, 6);
    this.hpBar.fillStyle(0x3ddc84, 1).fillRect(x, y, width * Math.max(0, alien.hp / alien.maxHp), 4);
  }

  wobble() {
    this.label.wobble();
  }

  destroy() {
    this.sprite.destroy();
    this.hpBar.destroy();
    this.label.destroy();
    this.shields?.destroy();
  }
}
```

- [ ] **Step 4: Write `src/scenes/game/MapView.js`**

```js
import { terrainCorners, padPositions, basePosition, portalPosition, cellCenter } from '../../logic/map.js';
import { buildTerrainLookup, cornerKey } from '../../logic/sheets.js';

// Draws the autotiled ground and path, the build pads, the portal and the base.
export class MapView {
  constructor(scene, map, { onPadClick = () => {} } = {}) {
    this.scene = scene;
    const lookup = buildTerrainLookup(scene.cache.json.get('terrain'));
    const grass = lookup.get('upper|upper|upper|upper');
    terrainCorners(map).forEach((line, row) =>
      line.forEach((corners, col) => {
        const { x, y } = cellCenter(col, row);
        scene.add.image(x, y, 'terrain', lookup.get(cornerKey(corners)) ?? grass).setDepth(-1000);
      }),
    );

    const portal = portalPosition(map);
    this.portal = scene.add.image(portal.x, portal.y, 'portal').setDepth(portal.y - 1);
    scene.tweens.add({ targets: this.portal, scale: 1.1, yoyo: true, repeat: -1, duration: 700 });

    const base = basePosition(map);
    this.base = scene.add.image(base.x, base.y, 'base').setDepth(base.y);

    this.pads = padPositions(map).map((pos, index) => {
      const pad = scene.add.image(pos.x, pos.y, 'pad').setDepth(-500).setInteractive({ useHandCursor: true });
      pad.on('pointerover', () => pad.setTint(0xfff3a0));
      pad.on('pointerout', () => pad.clearTint());
      pad.on('pointerdown', () => onPadClick(index));
      return pad;
    });
  }

  padPosition(index) {
    return { x: this.pads[index].x, y: this.pads[index].y };
  }

  flashBase() {
    this.base.setTint(0xff6666);
    this.scene.time.delayedCall(150, () => this.base.clearTint());
  }
}
```

- [ ] **Step 5: Write `src/scenes/game/Hud.js`**

```js
import { addText, COLORS } from '../../ui/text.js';
import { addButton } from '../../ui/button.js';
import { WAVES_PER_MISSION } from '../../logic/waves.js';
import { GAME_WIDTH } from '../../logic/map.js';

const DEPTH = 20000;

// Top bar: hearts, coins, wave number, mission number and the pause button.
export class Hud {
  constructor(scene, { missionId, onPause }) {
    this.scene = scene;
    const bar = scene.add.graphics().setDepth(DEPTH);
    bar.fillStyle(0x0b0b1a, 0.9).fillRect(0, 0, GAME_WIDTH, 64);
    this.heart = scene.add.image(32, 32, 'heart').setDepth(DEPTH + 1);
    this.hearts = addText(scene, 56, 32, '', { fontSize: '32px' }).setOrigin(0, 0.5).setDepth(DEPTH + 1);
    scene.add.image(176, 32, 'coin').setDepth(DEPTH + 1);
    this.coins = addText(scene, 200, 32, '', { fontSize: '32px', color: COLORS.gold }).setOrigin(0, 0.5).setDepth(DEPTH + 1);
    this.wave = addText(scene, GAME_WIDTH / 2, 32, '', { fontSize: '32px' }).setOrigin(0.5).setDepth(DEPTH + 1);
    addText(scene, 800, 32, `MISSION ${missionId}`, { fontSize: '16px', color: COLORS.dim }).setOrigin(0.5).setDepth(DEPTH + 1);
    addButton(scene, 968, 32, 'II', onPause, { width: 64, height: 44 }).setDepth(DEPTH + 1);
    this.shown = null;
  }

  set(run) {
    const shown = `${run.hearts}|${run.coins}|${run.wave}`;
    if (shown === this.shown) return;
    this.shown = shown;
    this.hearts.setText(String(run.hearts));
    this.coins.setText(String(run.coins));
    this.wave.setText(`WAVE ${run.wave} / ${WAVES_PER_MISSION}`);
  }

  flashHearts() {
    this.scene.tweens.add({ targets: this.heart, scale: 1.5, yoyo: true, duration: 120 });
  }
}
```

- [ ] **Step 6: Write `src/ui/modal.js`**

```js
import { addText, FONTS, FILLS } from './text.js';
import { addButton } from './button.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../logic/map.js';

const DEPTH = 40000;

// Centred message box that blocks clicks underneath. Returns a close function.
export function showModal(scene, { message, buttons }) {
  const shade = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
    .setInteractive()
    .setDepth(DEPTH);
  const panel = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(DEPTH + 1);
  const bg = scene.add.graphics();
  bg.fillStyle(FILLS.panel, 0.97).fillRoundedRect(-280, -120, 560, 240, 18);
  bg.lineStyle(3, FILLS.panelEdge, 1).strokeRoundedRect(-280, -120, 560, 240, 18);
  const text = addText(scene, 0, -40, message, {
    fontFamily: FONTS.word,
    fontSize: '28px',
    align: 'center',
    wordWrap: { width: 500 },
  }).setOrigin(0.5);
  panel.add([bg, text]);
  buttons.forEach((b, i) => {
    const x = (i - (buttons.length - 1) / 2) * 220;
    panel.add(addButton(scene, x, 70, b.label, b.onClick, { width: 200, height: 52 }));
  });
  return () => {
    shade.destroy();
    panel.destroy();
  };
}
```

- [ ] **Step 7: Write `src/scenes/Game.js`**

```js
import * as Phaser from 'phaser';
import * as Run from '../logic/game.js';
import { readKeyEvent } from '../logic/typing.js';
import { lockableAliens } from '../logic/world.js';
import { basePosition } from '../logic/map.js';
import { SPEEDS, recordResult } from '../logic/save.js';
import { createRng } from '../logic/rng.js';
import { app, updateSave } from '../app.js';
import { sfx } from '../audio/sfx.js';
import { setupCamera, markReady } from '../ui/view.js';
import { addText, COLORS, FILLS } from '../ui/text.js';
import { addButton } from '../ui/button.js';
import { showModal } from '../ui/modal.js';
import { AlienView } from '../objects/AlienView.js';
import { MapView } from './game/MapView.js';
import { Hud } from './game/Hud.js';

const START_BUTTON = { x: 900, y: 544 };

export class Game extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.launch = data ?? {};
  }

  create() {
    setupCamera(this);
    const { missionId = 1, wave, coins, hearts } = this.launch;
    this.run = Run.createGame({
      missionId,
      words: app.save.words,
      speed: SPEEDS[app.save.settings.speed],
      rng: createRng(Date.now() >>> 0),
      debug: { wave, coins, hearts },
    });
    this.halted = false;
    this.closeModal = null;
    this.alienViews = new Map();
    this.mapView = new MapView(this, this.run.map);
    this.hud = new Hud(this, { missionId, onPause: () => this.pause() });
    this.startButton = addButton(this, START_BUTTON.x, START_BUTTON.y, 'START WAVE', () => this.onStartWave(), {
      width: 200,
      height: 48,
      fill: FILLS.go,
    }).setDepth(20000);

    this.input.keyboard.on('keydown', this.onKey, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    if (import.meta.env.DEV) {
      globalThis.__debug = {
        run: this.run,
        firstWord: () => (this.run.world ? (lockableAliens(this.run.world)[0]?.word ?? '') : ''),
      };
    }
    this.refreshPhaseUi();
    if (this.launch.autostart) this.onStartWave();
    markReady(this);
  }

  update(_time, delta) {
    if (this.halted) return;
    if (this.run.phase === 'wave') this.handleEvents(Run.update(this.run, delta / 1000));
    this.syncAliens();
    this.hud.set(this.run);
  }

  onKey(event) {
    if (this.halted) return;
    const pressed = readKeyEvent(event);
    if (pressed === null) return;
    const { handled, events } = Run.key(this.run, pressed);
    if (handled) event.preventDefault();
    this.handleEvents(events);
  }

  onStartWave() {
    if (this.run.phase !== 'break' || this.halted) return;
    this.handleEvents(Run.startWave(this.run));
    this.refreshPhaseUi();
  }

  refreshPhaseUi() {
    this.startButton.show(this.run.phase === 'break');
  }

  handleEvents(events) {
    for (const e of events) {
      switch (e.type) {
        case 'waveStarted':
          sfx.play('waveStart');
          break;
        case 'spawn':
          if (e.alienType === 'boss') sfx.play('bossAlarm');
          break;
        case 'lock':
        case 'correct':
          sfx.play('key');
          break;
        case 'wrong':
          this.alienViews.get(e.id)?.wobble();
          sfx.play('wrong');
          break;
        case 'miss':
          sfx.play('miss');
          break;
        case 'complete':
          this.fireLaser(e.id);
          sfx.play('zap');
          break;
        case 'shieldPop':
          sfx.play('shieldPop');
          break;
        case 'kill':
          this.explode(e.x, e.y);
          sfx.play('explosion');
          break;
        case 'coins':
          this.floatCoins(e.x, e.y, e.amount);
          sfx.play('coin');
          break;
        case 'leak':
          this.hud.flashHearts();
          this.mapView.flashBase();
          sfx.play('leak');
          break;
        case 'waveCleared':
          this.refreshPhaseUi();
          break;
        case 'waveFailed':
          this.onWaveFailed();
          break;
        case 'missionWon':
          this.onMissionWon(e);
          break;
        default:
          break;
      }
    }
  }

  onWaveFailed() {
    sfx.play('tryAgain');
    this.refreshPhaseUi();
    this.closeModal = showModal(this, {
      message: "Uh oh, the aliens got through! Let's try that wave again.",
      buttons: [{ label: 'TRY AGAIN', onClick: () => this.retry() }],
    });
  }

  retry() {
    this.closeModal?.();
    this.closeModal = null;
    Run.retryWave(this.run);
    this.refreshPhaseUi();
  }

  onMissionWon({ stars, coinsEarned }) {
    sfx.play('victory');
    this.refreshPhaseUi();
    const missionId = this.run.mission.id;
    updateSave(recordResult(app.save, missionId, stars));
    this.time.delayedCall(1500, () => this.scene.start('Results', { missionId, stars, coinsEarned }));
  }

  pause() {
    if (this.halted || this.closeModal || this.run.phase === 'won') return;
    this.halted = true;
    this.tweens.pauseAll();
    this.anims.pauseAll();
    this.closeModal = showModal(this, {
      message: 'Paused',
      buttons: [
        { label: 'RESUME', onClick: () => this.resume() },
        { label: 'QUIT', onClick: () => this.scene.start('MissionMap') },
      ],
    });
  }

  resume() {
    this.closeModal?.();
    this.closeModal = null;
    this.halted = false;
    this.tweens.resumeAll();
    this.anims.resumeAll();
  }

  onBlur() {
    if (this.run.phase === 'wave') this.pause();
  }

  onShutdown() {
    this.input.keyboard.off('keydown', this.onKey, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.anims.resumeAll();
    if (import.meta.env.DEV) delete globalThis.__debug;
  }

  syncAliens() {
    const alive = new Set();
    for (const alien of this.run.world?.aliens ?? []) {
      alive.add(alien.id);
      let view = this.alienViews.get(alien.id);
      if (!view) {
        view = new AlienView(this, alien, this.run.mission.id);
        this.alienViews.set(alien.id, view);
      }
      view.sync(alien, this.run.typing);
    }
    for (const [id, view] of this.alienViews) {
      if (!alive.has(id)) {
        view.destroy();
        this.alienViews.delete(id);
      }
    }
  }

  fireLaser(id) {
    const view = this.alienViews.get(id);
    if (!view) return;
    const from = basePosition(this.run.map);
    const beam = this.add.graphics().setDepth(16500);
    beam.lineStyle(8, 0x7df9ff, 0.35).lineBetween(from.x, from.y, view.sprite.x, view.sprite.y);
    beam.lineStyle(3, 0xffffff, 1).lineBetween(from.x, from.y, view.sprite.x, view.sprite.y);
    this.tweens.add({ targets: beam, alpha: 0, duration: 250, onComplete: () => beam.destroy() });
  }

  explode(x, y, scale = 1) {
    const fx = this.add.sprite(x, y, 'fx-explosion').setDepth(16000).setScale(scale);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    fx.play('fx-explosion-explode-south');
  }

  floatCoins(x, y, amount) {
    const icon = this.add.image(x - 12, y - 24, 'coin').setDepth(17000).setScale(0.75);
    const label = addText(this, x + 2, y - 24, `+${amount}`, { fontSize: '16px', color: COLORS.gold })
      .setOrigin(0, 0.5)
      .setDepth(17000);
    this.tweens.add({
      targets: [icon, label],
      y: '-=36',
      alpha: 0,
      duration: 900,
      onComplete: () => {
        icon.destroy();
        label.destroy();
      },
    });
  }
}
```

- [ ] **Step 8: Register the scene in `src/main.js`**

Add `import { Game } from './scenes/Game.js';` after the `Results` import and change the scene list to:

```js
  scene: [Boot, Preload, Title, MissionMap, Game, Results],
```

- [ ] **Step 9: Run tests and build, then screenshot a wave**

Run: `npm test && npm run build`
Expected: all tests pass; build exits 0.

```bash
(npx vite --port 5199 --strictPort > .shots/vite.log 2>&1 &) ; sleep 3
node tools/shot.mjs --url "http://localhost:5199/?mission=1" --scene Game --do "wait:800" --do "shot:.shots/19-break.png"
node tools/shot.mjs --url "http://localhost:5199/?mission=1&autostart=1" --scene Game --do "until:__debug?.run.world?.aliens.length >= 2" --do "wait:1500" --do "shot:.shots/19-wave.png" --do "typefirst:2" --do "wait:100" --do "shot:.shots/19-locked.png" --do "key:x" --do "wait:60" --do "shot:.shots/19-wrong.png"
pkill -f "vite --port 5199"
```

Expected (each run prints `No console errors.`):
- `19-break.png`: teal grass with a wide tan path that snakes from the portal (left, row 4) to the dome base (right); 8 build pads on the grass beside the bends; the HUD across the top with a heart and `10`, a coin and `30`, `WAVE 1 / 5`, `MISSION 1` and a pause button; a green **START WAVE** button bottom-right.
- `19-wave.png`: two or three Blobs walking along the path, each with a dark word bubble in Andika above it. **Tune `LABEL_OFFSETS` in `src/assets.js` now** if a bubble covers the alien's head or floats far above it (the bubble's bottom edge should sit just above the head), then re-run this check.
- `19-locked.png`: the furthest-along matching alien's bubble has a yellow outline, its first two letters green, the third letter yellow and underlined.
- `19-wrong.png`: the same bubble mid-wobble with the next letter red (a wrong key does not advance it).

- [ ] **Step 10: Screenshot the zap, the boss, pause, failure and the win**

```bash
(npx vite --port 5199 --strictPort > .shots/vite.log 2>&1 &) ; sleep 3
node tools/shot.mjs --url "http://localhost:5199/?mission=1&autostart=1" --scene Game --do "until:__debug?.firstWord()" --do "typefirst" --do "wait:120" --do "shot:.shots/19-zap.png"
node tools/shot.mjs --url "http://localhost:5199/?mission=4&wave=5&autostart=1" --scene Game --do "until:__debug?.run.world?.aliens.some((a) => a.type === 'boss')" --do "wait:1500" --do "shot:.shots/19-boss.png"
node tools/shot.mjs --url "http://localhost:5199/?mission=8&wave=5&autostart=1" --scene Game --do "until:__debug?.run.world?.aliens.some((a) => a.type === 'boss')" --do "wait:1500" --do "shot:.shots/19-boss-late.png"
node tools/shot.mjs --url "http://localhost:5199/?mission=1&autostart=1" --scene Game --do "until:__debug?.firstWord()" --do "click:968,32" --do "wait:300" --do "shot:.shots/19-paused.png" --do "click:402,358" --do "wait:500" --do "shot:.shots/19-resumed.png"
node tools/shot.mjs --url "http://localhost:5199/?mission=1&autostart=1&hearts=1" --scene Game --do "until:__debug?.run.phase === 'failed'" --do "wait:300" --do "shot:.shots/19-failed.png" --do "click:512,358" --do "wait:300" --do "shot:.shots/19-retry.png"
pkill -f "vite --port 5199"
```

Expected (each run prints `No console errors.`):
- `19-zap.png`: a cyan laser line from the base to where the typed alien was, an explosion there, and a floating `+5` with a coin; the HUD shows `35`.
- `19-boss.png`: the mission-4 boss — Boss A, the purple caped king — (wave 5 spawns 4 escorts first) just past the portal inside two nested cyan shield bubbles, with its word bubble above it and fully below the HUD bar.
- `19-boss-late.png`: the mission-8 boss is Boss C, the red armored general (sprite `alien-boss-2`), inside three nested shield bubbles, with its word bubble fully below the HUD bar.
- `19-paused.png`: a dark overlay with "Paused" and **RESUME** / **QUIT**; `19-resumed.png`: the overlay is gone and aliens are moving again.
- `19-failed.png`: after the first Blob reaches the base with 1 heart left, the message "Uh oh, the aliens got through! Let's try that wave again." with **TRY AGAIN**. `19-retry.png`: hearts back to `10`, still `WAVE 1 / 5`, and **START WAVE** visible again.

Then check the win path (a few minutes in headless Chrome: nothing is typed, so the 3 escorts and the boss all reach the base, leaving 2 hearts):

```bash
(npx vite --port 5199 --strictPort > .shots/vite.log 2>&1 &) ; sleep 3
node tools/shot.mjs --url "http://localhost:5199/?mission=1&wave=5&autostart=1" --scene Game --do "until:__debug?.run.phase === 'won'" --do "scene:Results" --do "wait:2000" --do "shot:.shots/19-won.png"
pkill -f "vite --port 5199"
```

Expected: `No console errors.` and `19-won.png` shows "MISSION 1 COMPLETE!" with 1 gold star (2 hearts left).

- [ ] **Step 11: Commit**

```bash
git add src
git commit -m "feat: playable game scene with typing, HUD, pause, retry and win

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 20: Towers, Projectiles, the Build Menu and the Guided Start

**Files:**
- Create: `src/objects/TowerView.js`, `src/scenes/game/BuildMenu.js`, `src/scenes/game/Guide.js`
- Modify: `src/scenes/Game.js` (replace the whole file with Step 4's version)

**Interfaces:**
- Consumes: `Run.towerOptions/build/upgrade/sell`, `TOWERS`, `towerStats`, `buildCost`, `upgradeCost`, `sellValue`, `towerSpriteKey`, the `sheets` registry entry, `MapView.padPosition`, the UI kit.
- Produces:
  - `new TowerView(scene, { pos, sheets, onClick })` with `sync(tower, simTower | null)` and `destroy()`
  - `new BuildMenu(scene, { onChange })` with `open(run, pad, pos)`, `close()`, `isOpen`
  - `new Guide(scene, { pad, start })` with `update(run)` and `noteTypedKill()`

- [ ] **Step 1: Write `src/objects/TowerView.js`**

```js
import { towerSpriteKey } from '../assets.js';
import { towerStats } from '../logic/towers.js';

const TOWER_LIFT = 12;

// A tower sprite on its pad. It turns to the facing chosen by the simulation;
// a Freeze Ray shows its slowing field while a wave runs.
export class TowerView {
  constructor(scene, { pos, sheets, onClick }) {
    this.pos = pos;
    this.sheets = sheets;
    this.spriteKey = null;
    this.facing = 'south';
    this.auraShown = false;
    this.aura = scene.add.graphics().setDepth(-400);
    this.sprite = scene.add.sprite(pos.x, pos.y - TOWER_LIFT, towerSpriteKey('blaster', 1)).setDepth(pos.y);
    this.sprite.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
  }

  sync(tower, simTower) {
    const spriteKey = towerSpriteKey(tower.type, tower.level);
    const facing = simTower?.facing ?? this.facing;
    if (spriteKey !== this.spriteKey || facing !== this.facing) {
      this.spriteKey = spriteKey;
      this.facing = facing;
      this.sprite.setTexture(spriteKey, this.sheets[spriteKey].rotations[facing]);
    }
    const showAura = tower.type === 'freeze' && simTower !== null;
    if (showAura !== this.auraShown) {
      this.auraShown = showAura;
      this.aura.clear();
      if (showAura) {
        this.aura.fillStyle(0x9fd8ff, 0.14).fillCircle(this.pos.x, this.pos.y, towerStats(tower.type, tower.level).range);
      }
    }
  }

  destroy() {
    this.aura.destroy();
    this.sprite.destroy();
  }
}
```

- [ ] **Step 2: Write `src/scenes/game/BuildMenu.js`**

```js
import * as Run from '../../logic/game.js';
import { TOWERS, towerStats } from '../../logic/towers.js';
import { buildCost, upgradeCost, sellValue } from '../../logic/economy.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../../logic/map.js';
import { addButton } from '../../ui/button.js';
import { addText, FILLS } from '../../ui/text.js';
import { sfx } from '../../audio/sfx.js';

const WIDTH = 260;
const ROW = 56;
const HEADER = 56;
const HUD_BOTTOM = 64;
const DEPTH = 30000;

// Pop-up beside a pad: build choices on an empty pad, upgrade/sell on a tower.
export class BuildMenu {
  constructor(scene, { onChange }) {
    this.scene = scene;
    this.onChange = onChange;
    this.container = null;
    this.range = null;
  }

  get isOpen() {
    return this.container !== null;
  }

  open(run, pad, pos) {
    this.close();
    const tower = run.towers[pad];
    const items = tower ? this.towerItems(run, pad, tower) : this.buildItems(run, pad);
    const height = HEADER + items.length * ROW;
    const x = clamp(pos.x, WIDTH / 2 + 8, GAME_WIDTH - WIDTH / 2 - 8);
    const above = pos.y - 40 - height / 2;
    const preferred = above - height / 2 >= HUD_BOTTOM ? above : pos.y + 40 + height / 2;
    const y = clamp(preferred, HUD_BOTTOM + height / 2 + 4, GAME_HEIGHT - height / 2 - 4);

    this.container = this.scene.add.container(x, y).setDepth(DEPTH);
    const bg = this.scene.add.graphics();
    bg.fillStyle(FILLS.panel, 0.96).fillRoundedRect(-WIDTH / 2, -height / 2, WIDTH, height, 14);
    bg.lineStyle(2, FILLS.panelEdge, 1).strokeRoundedRect(-WIDTH / 2, -height / 2, WIDTH, height, 14);
    const title = tower ? `${TOWERS[tower.type].name.toUpperCase()} LV ${tower.level}` : 'BUILD';
    const heading = addText(this.scene, -WIDTH / 2 + 14, -height / 2 + 24, title).setOrigin(0, 0.5);
    const close = addButton(this.scene, WIDTH / 2 - 26, -height / 2 + 24, 'X', () => this.close(), { width: 34, height: 30, fill: FILLS.quiet });
    this.container.add([bg, heading, close]);

    items.forEach((item, i) => {
      const button = addButton(this.scene, 0, -height / 2 + HEADER + i * ROW + ROW / 2 - 4, item.label, item.onClick, {
        width: WIDTH - 28,
        height: 44,
        fill: item.fill ?? FILLS.button,
      });
      button.setEnabled(item.enabled);
      this.container.add(button);
    });

    if (tower) {
      this.range = this.scene.add.graphics().setDepth(DEPTH - 1);
      this.range.lineStyle(2, 0xffffff, 0.7).strokeCircle(pos.x, pos.y, towerStats(tower.type, tower.level).range);
    }
  }

  buildItems(run, pad) {
    return Run.towerOptions(run).map((type) => {
      const cost = buildCost(type);
      return {
        label: `${TOWERS[type].name.toUpperCase()}  ${cost}`,
        enabled: run.coins >= cost,
        onClick: () => this.act(Run.build(run, pad, type)),
      };
    });
  }

  towerItems(run, pad, tower) {
    const cost = upgradeCost(tower.type, tower.level);
    return [
      {
        label: cost === null ? 'MAX LEVEL' : `UPGRADE  ${cost}`,
        enabled: cost !== null && run.coins >= cost,
        onClick: () => this.act(Run.upgrade(run, pad)),
      },
      {
        label: `SELL  +${sellValue(tower.type, tower.level)}`,
        enabled: true,
        fill: FILLS.quiet,
        onClick: () => this.act(Run.sell(run, pad)),
      },
    ];
  }

  act(changed) {
    if (changed) sfx.play('build');
    this.close();
    this.onChange();
  }

  close() {
    this.container?.destroy();
    this.range?.destroy();
    this.container = null;
    this.range = null;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
```

- [ ] **Step 3: Write `src/scenes/game/Guide.js`**

```js
import { addText, COLORS, FONTS } from '../../ui/text.js';
import { GAME_WIDTH } from '../../logic/map.js';

const DEPTH = 25000;

// First-time hints for mission 1: build a Blaster, press Start Wave, type a word.
export class Guide {
  constructor(scene, { pad, start }) {
    this.spots = { pad, start };
    this.step = null;
    this.typedOnce = false;
    this.arrow = scene.add.container(0, 0).setDepth(DEPTH);
    const shape = scene.add.graphics();
    shape.fillStyle(0xffd23f, 1).fillTriangle(-16, -24, 16, -24, 0, 0);
    shape.lineStyle(3, 0x1b1b3a, 1).strokeTriangle(-16, -24, 16, -24, 0, 0);
    this.arrow.add(shape);
    scene.tweens.add({ targets: shape, y: -10, yoyo: true, repeat: -1, duration: 350 });
    this.text = addText(scene, 0, 0, '', {
      fontFamily: FONTS.word,
      fontSize: '28px',
      color: COLORS.gold,
      stroke: '#1b1b3a',
      strokeThickness: 6,
    })
      .setOrigin(0.5)
      .setDepth(DEPTH);
  }

  noteTypedKill() {
    this.typedOnce = true;
  }

  update(run) {
    const step = this.stepFor(run);
    if (step === this.step) return;
    this.step = step;
    const { pad, start } = this.spots;
    if (step === 'build') this.show(pad.x, pad.y - 22, 'Build a Blaster here!', pad.x + 40, pad.y - 80);
    else if (step === 'start') this.show(start.x, start.y - 30, 'Press Start Wave!', start.x - 60, start.y - 84);
    else if (step === 'type') this.show(null, null, 'Type the word on an alien to zap it!', GAME_WIDTH / 2, 530);
    else this.show(null, null, '', 0, 0);
  }

  stepFor(run) {
    if (run.wave !== 1) return 'done';
    if (run.phase === 'break') return Object.keys(run.towers).length === 0 ? 'build' : 'start';
    if (run.phase === 'wave' && !this.typedOnce) return 'type';
    return 'done';
  }

  show(arrowX, arrowY, message, textX, textY) {
    this.arrow.setVisible(arrowX !== null);
    if (arrowX !== null) this.arrow.setPosition(arrowX, arrowY);
    this.text.setText(message).setPosition(textX, textY).setVisible(message !== '');
  }
}
```

- [ ] **Step 4: Replace `src/scenes/Game.js`**

The changes from Task 19: imports for `TowerView`, `BuildMenu`, `Guide`; tower, projectile, menu and guide state in `create()`; pad clicks; Escape closes the menu; `syncTowers` and `syncProjectiles`; `fire`, `hit` and `chill` events; and the guide hooks.

```js
import * as Phaser from 'phaser';
import * as Run from '../logic/game.js';
import { readKeyEvent } from '../logic/typing.js';
import { lockableAliens } from '../logic/world.js';
import { basePosition } from '../logic/map.js';
import { SPEEDS, recordResult } from '../logic/save.js';
import { createRng } from '../logic/rng.js';
import { app, updateSave } from '../app.js';
import { sfx } from '../audio/sfx.js';
import { setupCamera, markReady } from '../ui/view.js';
import { addText, COLORS, FILLS } from '../ui/text.js';
import { addButton } from '../ui/button.js';
import { showModal } from '../ui/modal.js';
import { AlienView } from '../objects/AlienView.js';
import { TowerView } from '../objects/TowerView.js';
import { MapView } from './game/MapView.js';
import { Hud } from './game/Hud.js';
import { BuildMenu } from './game/BuildMenu.js';
import { Guide } from './game/Guide.js';

const START_BUTTON = { x: 900, y: 544 };

export class Game extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.launch = data ?? {};
  }

  create() {
    setupCamera(this);
    const { missionId = 1, wave, coins, hearts } = this.launch;
    this.run = Run.createGame({
      missionId,
      words: app.save.words,
      speed: SPEEDS[app.save.settings.speed],
      rng: createRng(Date.now() >>> 0),
      debug: { wave, coins, hearts },
    });
    this.halted = false;
    this.closeModal = null;
    this.alienViews = new Map();
    this.towerViews = new Map();
    this.projectileViews = new Map();
    this.mapView = new MapView(this, this.run.map, { onPadClick: (pad) => this.onPadClick(pad) });
    this.hud = new Hud(this, { missionId, onPause: () => this.pause() });
    this.startButton = addButton(this, START_BUTTON.x, START_BUTTON.y, 'START WAVE', () => this.onStartWave(), {
      width: 200,
      height: 48,
      fill: FILLS.go,
    }).setDepth(20000);
    this.buildMenu = new BuildMenu(this, { onChange: () => this.refreshPhaseUi() });
    this.guide = missionId === 1 && !app.save.missions[1]
      ? new Guide(this, { pad: this.mapView.padPosition(0), start: START_BUTTON })
      : null;

    this.input.keyboard.on('keydown', this.onKey, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    if (import.meta.env.DEV) {
      globalThis.__debug = {
        run: this.run,
        firstWord: () => (this.run.world ? (lockableAliens(this.run.world)[0]?.word ?? '') : ''),
      };
    }
    this.refreshPhaseUi();
    if (this.launch.autostart) this.onStartWave();
    markReady(this);
  }

  update(_time, delta) {
    if (this.halted) return;
    if (this.run.phase === 'wave') this.handleEvents(Run.update(this.run, delta / 1000));
    this.syncAliens();
    this.syncTowers();
    this.syncProjectiles();
    this.hud.set(this.run);
    this.guide?.update(this.run);
  }

  onKey(event) {
    if (this.halted) return;
    const pressed = readKeyEvent(event);
    if (pressed === null) return;
    if (pressed === 'Escape' && this.buildMenu.isOpen) {
      this.buildMenu.close();
      return;
    }
    const { handled, events } = Run.key(this.run, pressed);
    if (handled) event.preventDefault();
    this.handleEvents(events);
  }

  onStartWave() {
    if (this.run.phase !== 'break' || this.halted) return;
    this.buildMenu.close();
    this.handleEvents(Run.startWave(this.run));
    this.refreshPhaseUi();
  }

  onPadClick(pad) {
    if (this.run.phase !== 'break' || this.halted || this.closeModal) return;
    this.buildMenu.open(this.run, pad, this.mapView.padPosition(pad));
  }

  refreshPhaseUi() {
    const inBreak = this.run.phase === 'break';
    this.startButton.show(inBreak);
    if (!inBreak) this.buildMenu.close();
  }

  handleEvents(events) {
    for (const e of events) {
      switch (e.type) {
        case 'waveStarted':
          sfx.play('waveStart');
          break;
        case 'spawn':
          if (e.alienType === 'boss') sfx.play('bossAlarm');
          break;
        case 'lock':
        case 'correct':
          sfx.play('key');
          break;
        case 'wrong':
          this.alienViews.get(e.id)?.wobble();
          sfx.play('wrong');
          break;
        case 'miss':
          sfx.play('miss');
          break;
        case 'complete':
          this.fireLaser(e.id);
          sfx.play('zap');
          break;
        case 'shieldPop':
          sfx.play('shieldPop');
          break;
        case 'kill':
          this.explode(e.x, e.y);
          sfx.play('explosion');
          if (e.by === 'typing') this.guide?.noteTypedKill();
          break;
        case 'coins':
          this.floatCoins(e.x, e.y, e.amount);
          sfx.play('coin');
          break;
        case 'leak':
          this.hud.flashHearts();
          this.mapView.flashBase();
          sfx.play('leak');
          break;
        case 'fire':
          sfx.play(e.towerType);
          break;
        case 'hit':
          if (e.splash) this.explode(e.x, e.y, 0.6);
          break;
        case 'chill':
          this.puff(e.x, e.y);
          sfx.play('freeze');
          break;
        case 'waveCleared':
          this.refreshPhaseUi();
          break;
        case 'waveFailed':
          this.onWaveFailed();
          break;
        case 'missionWon':
          this.onMissionWon(e);
          break;
        default:
          break;
      }
    }
  }

  onWaveFailed() {
    sfx.play('tryAgain');
    this.refreshPhaseUi();
    this.closeModal = showModal(this, {
      message: "Uh oh, the aliens got through! Let's try that wave again.",
      buttons: [{ label: 'TRY AGAIN', onClick: () => this.retry() }],
    });
  }

  retry() {
    this.closeModal?.();
    this.closeModal = null;
    Run.retryWave(this.run);
    this.refreshPhaseUi();
  }

  onMissionWon({ stars, coinsEarned }) {
    sfx.play('victory');
    this.refreshPhaseUi();
    const missionId = this.run.mission.id;
    updateSave(recordResult(app.save, missionId, stars));
    this.time.delayedCall(1500, () => this.scene.start('Results', { missionId, stars, coinsEarned }));
  }

  pause() {
    if (this.halted || this.closeModal || this.run.phase === 'won') return;
    this.halted = true;
    this.buildMenu.close();
    this.tweens.pauseAll();
    this.anims.pauseAll();
    this.closeModal = showModal(this, {
      message: 'Paused',
      buttons: [
        { label: 'RESUME', onClick: () => this.resume() },
        { label: 'QUIT', onClick: () => this.scene.start('MissionMap') },
      ],
    });
  }

  resume() {
    this.closeModal?.();
    this.closeModal = null;
    this.halted = false;
    this.tweens.resumeAll();
    this.anims.resumeAll();
  }

  onBlur() {
    if (this.run.phase === 'wave') this.pause();
  }

  onShutdown() {
    this.input.keyboard.off('keydown', this.onKey, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.anims.resumeAll();
    if (import.meta.env.DEV) delete globalThis.__debug;
  }

  syncAliens() {
    const alive = new Set();
    for (const alien of this.run.world?.aliens ?? []) {
      alive.add(alien.id);
      let view = this.alienViews.get(alien.id);
      if (!view) {
        view = new AlienView(this, alien, this.run.mission.id);
        this.alienViews.set(alien.id, view);
      }
      view.sync(alien, this.run.typing);
    }
    for (const [id, view] of this.alienViews) {
      if (!alive.has(id)) {
        view.destroy();
        this.alienViews.delete(id);
      }
    }
  }

  syncTowers() {
    const sheets = this.registry.get('sheets');
    const simTowers = this.run.world?.towers ?? [];
    for (const [pad, tower] of Object.entries(this.run.towers)) {
      let view = this.towerViews.get(pad);
      if (!view) {
        const index = Number(pad);
        view = new TowerView(this, { pos: this.mapView.padPosition(index), sheets, onClick: () => this.onPadClick(index) });
        this.towerViews.set(pad, view);
      }
      view.sync(tower, simTowers.find((t) => t.pad === Number(pad)) ?? null);
    }
    for (const [pad, view] of this.towerViews) {
      if (!this.run.towers[pad]) {
        view.destroy();
        this.towerViews.delete(pad);
      }
    }
  }

  syncProjectiles() {
    const world = this.run.world;
    const alive = new Set();
    for (const p of world?.projectiles ?? []) {
      alive.add(p.id);
      let view = this.projectileViews.get(p.id);
      if (!view) {
        view = this.add.image(p.x, p.y, p.towerType === 'rocket' ? 'rocket-shell' : 'bolt').setDepth(15000);
        this.projectileViews.set(p.id, view);
      }
      const target = world.aliens.find((a) => a.id === p.targetId);
      if (target) view.setRotation(Math.atan2(target.y - p.y, target.x - p.x));
      view.setPosition(p.x, p.y);
    }
    for (const [id, view] of this.projectileViews) {
      if (!alive.has(id)) {
        view.destroy();
        this.projectileViews.delete(id);
      }
    }
  }

  fireLaser(id) {
    const view = this.alienViews.get(id);
    if (!view) return;
    const from = basePosition(this.run.map);
    const beam = this.add.graphics().setDepth(16500);
    beam.lineStyle(8, 0x7df9ff, 0.35).lineBetween(from.x, from.y, view.sprite.x, view.sprite.y);
    beam.lineStyle(3, 0xffffff, 1).lineBetween(from.x, from.y, view.sprite.x, view.sprite.y);
    this.tweens.add({ targets: beam, alpha: 0, duration: 250, onComplete: () => beam.destroy() });
  }

  explode(x, y, scale = 1) {
    const fx = this.add.sprite(x, y, 'fx-explosion').setDepth(16000).setScale(scale);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    fx.play('fx-explosion-explode-south');
  }

  puff(x, y) {
    const frost = this.add.image(x, y, 'freeze-puff').setDepth(15500).setAlpha(0.9);
    this.tweens.add({ targets: frost, scale: 1.5, alpha: 0, duration: 600, onComplete: () => frost.destroy() });
  }

  floatCoins(x, y, amount) {
    const icon = this.add.image(x - 12, y - 24, 'coin').setDepth(17000).setScale(0.75);
    const label = addText(this, x + 2, y - 24, `+${amount}`, { fontSize: '16px', color: COLORS.gold })
      .setOrigin(0, 0.5)
      .setDepth(17000);
    this.tweens.add({
      targets: [icon, label],
      y: '-=36',
      alpha: 0,
      duration: 900,
      onComplete: () => {
        icon.destroy();
        label.destroy();
      },
    });
  }
}
```

- [ ] **Step 5: Run tests and build**

Run: `npm test && npm run build`
Expected: all tests pass; build exits 0.

- [ ] **Step 6: Screenshot checks**

Wait about 200 ms after every click that opens or changes a menu: Phaser handles pointer input on its next frame, and headless Chrome draws only about 20 frames a second.

Pad centres (from `MAP_1`): pad 0 (144, 208), pad 3 (496, 272), pad 6 (816, 400). With the menu layout in Step 2, the menu button centres are:

| Menu | Buttons (x, y) |
|---|---|
| Pad 0, mission 1 (Blaster only) | Blaster (144, 328) |
| Pad 0, mission 5 | Blaster (144, 328), Freeze Ray (144, 384), Rocket (144, 440) |
| Pad 3, mission 5 | Blaster (496, 392), Freeze Ray (496, 448), Rocket (496, 504) |
| Pad 6, mission 5 | Blaster (816, 216), Freeze Ray (816, 272), Rocket (816, 328) |
| Tower on pad 6 | Upgrade (816, 272), Sell (816, 328) |

```bash
(npx vite --port 5199 --strictPort > .shots/vite.log 2>&1 &) ; sleep 3
node tools/shot.mjs --url "http://localhost:5199/?mission=1" --scene Game --do "wait:800" --do "shot:.shots/20-guide-build.png" --do "click:144,208" --do "wait:200" --do "shot:.shots/20-menu.png" --do "click:144,328" --do "wait:200" --do "shot:.shots/20-built.png"
node tools/shot.mjs --url "http://localhost:5199/?mission=5&coins=999" --scene Game --do "click:496,272" --do "wait:200" --do "shot:.shots/20-menu-all.png" --do "key:Escape" --do "wait:200" --do "shot:.shots/20-menu-closed.png"
node tools/shot.mjs --url "http://localhost:5199/?mission=5&coins=999" --scene Game --do "click:144,208" --do "wait:200" --do "click:144,328" --do "wait:200" --do "click:496,272" --do "wait:200" --do "click:496,448" --do "wait:200" --do "click:816,400" --do "wait:200" --do "click:816,328" --do "wait:200" --do "click:816,400" --do "wait:200" --do "shot:.shots/20-upgrade-menu.png" --do "key:Escape" --do "click:900,544" --do "until:__debug?.run.world?.projectiles.length > 0" --do "wait:300" --do "shot:.shots/20-combat.png"
pkill -f "vite --port 5199"
```

Expected (each run prints `No console errors.`):
- `20-guide-build.png`: a bouncing yellow arrow above pad 0 and the gold hint "Build a Blaster here!".
- `20-menu.png`: a panel titled **BUILD** below pad 0 with one button, `BLASTER  20`, and an **X** close button.
- `20-built.png`: a Blaster tower standing on pad 0, the HUD coin count `10`, and the guide arrow now pointing at **START WAVE** with "Press Start Wave!".
- `20-menu-all.png`: the mission-5 menu below pad 3 offers `BLASTER  20`, `FREEZE RAY  30` and `ROCKET  40`. `20-menu-closed.png`: Escape closed it.
- `20-upgrade-menu.png`: a Blaster on pad 0, a Freeze Ray on pad 3 and a Rocket on pad 6; the Rocket's menu above pad 6 reads `ROCKET LV 1` with `UPGRADE  25` and `SELL  +20`, and a white range circle surrounds the Rocket.
- `20-combat.png`: during the wave, towers face the aliens; Blaster bolts or rocket shells are in flight or explosions are visible; aliens inside the Freeze Ray's light-blue field are tinted blue.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: towers, projectiles, build menu and mission-1 guide

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 21: The Grown-ups Screen

The word list form is plain HTML over the canvas: a real `<textarea>` handles pasting, editing and accessibility far better than an in-canvas widget.

**Files:**
- Create: `src/ui/grownupsPanel.js`, `src/scenes/Grownups.js`
- Modify: `src/style.css` (append overlay styles), `src/main.js` (scene list)

**Interfaces:**
- Consumes: `parseWordList` (`words.js`); `resetProgress` (`save.js`); `app`, `updateSave`; the `#grownups` element from `index.html`.
- Produces: `openGrownupsPanel({ save, persistent, onSave, onReset, onClose }) → close()`; scene `Grownups`.

- [ ] **Step 1: Write `src/ui/grownupsPanel.js`**

```js
import { parseWordList } from '../logic/words.js';

const SPEED_LABELS = { slow: 'Slow', normal: 'Normal', fast: 'Fast' };

// Builds the Grown-ups form inside #grownups. Returns a function that hides it.
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
  $('gw-words').value = save.words.join('\n');
  root.querySelector(`input[name="gw-speed"][value="${save.settings.speed}"]`).checked = true;
  $('gw-sound').checked = save.settings.sound;
  $('gw-storage').hidden = persistent;

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
    onSave({ words, settings: { speed, sound: $('gw-sound').checked } });
    $('gw-words').value = words.join('\n');
    status('Saved!');
  });

  $('gw-reset').addEventListener('click', () => {
    if (!window.confirm('Clear all stars and unlocked missions? The word list stays.')) return;
    onReset();
    status('Progress reset.');
  });

  $('gw-back').addEventListener('click', onClose);
  root.hidden = false;
  $('gw-words').focus();

  return function close() {
    root.hidden = true;
    root.replaceChildren();
  };
}
```

- [ ] **Step 2: Write `src/scenes/Grownups.js`**

```js
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
```

- [ ] **Step 3: Append the overlay styles to `src/style.css`**

```css
#grownups {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  background: rgba(11, 11, 26, 0.6);
  font-family: 'Andika', sans-serif;
  color: #ffffff;
}

#grownups[hidden] {
  display: none;
}

.gw-panel {
  width: min(560px, 100%);
  max-height: 100%;
  overflow: auto;
  box-sizing: border-box;
  padding: 24px 28px;
  background: #1b1b3a;
  border: 2px solid #5b5bd6;
  border-radius: 16px;
}

.gw-panel h1 {
  margin: 0 0 12px;
  font-size: 32px;
}

.gw-panel label {
  display: block;
  font-size: 18px;
}

.gw-panel textarea {
  width: 100%;
  box-sizing: border-box;
  margin: 6px 0;
  padding: 8px;
  font: 20px/1.4 'Andika', sans-serif;
  color: #ffffff;
  background: #0b0b1a;
  border: 1px solid #5b5bd6;
  border-radius: 8px;
}

.gw-errors {
  margin: 4px 0 12px;
  padding-left: 20px;
  color: #ff8a8a;
}

.gw-panel fieldset {
  display: flex;
  gap: 16px;
  margin: 8px 0;
  border: 1px solid #5b5bd6;
  border-radius: 8px;
}

.gw-panel fieldset label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.gw-panel .gw-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}

.gw-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.gw-buttons button {
  padding: 8px 16px;
  font: 18px 'Andika', sans-serif;
  color: #ffffff;
  background: #333355;
  border: 2px solid #ffffff;
  border-radius: 10px;
  cursor: pointer;
}

.gw-buttons .gw-primary {
  background: #2e9e5b;
}

.gw-note {
  color: #ffd23f;
}

.gw-status {
  min-height: 1.4em;
  color: #3ddc84;
}
```

- [ ] **Step 4: Register the scene in `src/main.js`**

Add `import { Grownups } from './scenes/Grownups.js';` after the `Results` import and change the scene list to:

```js
  scene: [Boot, Preload, Title, MissionMap, Game, Results, Grownups],
```

- [ ] **Step 5: Run tests and build**

Run: `npm test && npm run build`
Expected: all tests pass; build exits 0.

- [ ] **Step 6: Screenshot checks**

One run edits the list and settings, saves, then plays mission 1 to confirm the new words reach the aliens, then reopens the Grown-ups screen to confirm the settings stuck:

```bash
(npx vite --port 5199 --strictPort > .shots/vite.log 2>&1 &) ; sleep 3
node tools/shot.mjs --url "http://localhost:5199/" --scene Title \
  --do "click:924,540" --do "scene:Grownups" --do "wait:300" --do "shot:.shots/21-panel.png" \
  --do "fill:#gw-words|house\nice cream\nwater" --do "tap:#gw-save" --do "wait:200" --do "shot:.shots/21-errors.png" \
  --do "fill:#gw-words|zebra\nyellow\nquiet\njump\nkite" --do "tap:input[value=slow]" --do "tap:#gw-sound" --do "tap:#gw-save" --do "wait:200" --do "shot:.shots/21-saved.png" \
  --do "tap:#gw-back" --do "scene:Title" --do "click:512,440" --do "scene:MissionMap" --do "click:160,230" --do "scene:Game" \
  --do "click:900,544" --do "until:__debug?.firstWord()" --do "wait:300" --do "shot:.shots/21-new-words.png" \
  --do "click:968,32" --do "wait:200" --do "click:622,358" --do "scene:MissionMap" --do "click:90,540" --do "scene:Title" \
  --do "click:924,540" --do "scene:Grownups" --do "wait:300" --do "shot:.shots/21-reopened.png" \
  --do "tap:#gw-reset" --do "wait:200" --do "shot:.shots/21-reset.png"
pkill -f "vite --port 5199"
```

Expected (`No console errors.`):
- `21-panel.png`: a dark panel titled "Grown-ups" over a dimmed space background, the 15 starter words one per line in Andika, **Normal** speed selected, **Sound effects** ticked, and **Save**, **Reset progress** and **Back** buttons. No storage warning.
- `21-errors.png`: a red list item "Line 2 (ice cream): Use only letters, apostrophes and hyphens." and no "Saved!".
- `21-saved.png`: "Saved!" in green, **Slow** selected, sound unticked.
- `21-new-words.png`: mission 1's first Blob carries one of `zebra`, `yellow`, `quiet`, `jump` or `kite`.
- `21-reopened.png`: the five new words, **Slow** selected and sound unticked.
- `21-reset.png`: "Progress reset." under the buttons.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: grown-ups screen for the word list, speed and sound

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 22: Play-Test Checklist, README and Final Verification

**Files:**
- Create: `docs/playtest-checklist.md`, `README.md`

**Interfaces:**
- Consumes: the finished game.
- Produces: documentation for the parent; a verified, committed v1.

- [ ] **Step 1: Write `docs/playtest-checklist.md`**

```markdown
# Word Defenders — Play-Test Checklist

Run `npm run dev` and open the printed URL in Chrome, Safari or Firefox on a laptop with a keyboard.

## Before the first session

- [ ] Grown-ups: paste this week's list (one word per line) and press **Save**. Words with curly apostrophes from a school email paste fine.
- [ ] Pick **Slow** alien speed for the first session.

## Watch your player

- [ ] Can he read every word bubble without leaning in? (If not: raise the 26 px word size in `src/objects/WordLabel.js`.)
- [ ] Does he understand that typing zaps an alien? (Mission 1 shows "Type the word on an alien to zap it!".)
- [ ] When he types a wrong letter, does he notice the red letter and keep going, or get stuck?
- [ ] Does he build towers between waves without help after mission 1?
- [ ] Is a mission about 8–10 minutes? Shorter or longer means tuning `src/logic/missions.js`.
- [ ] Does the boss feel exciting rather than scary?
- [ ] Did he want to play another mission?

## Tuning knobs

| Feels like | Change |
|---|---|
| Aliens too fast | Grown-ups speed, or `speed` in `src/logic/missions.js` |
| Too many aliens at once | `waves` / `spawnGap` in `src/logic/missions.js` |
| Never enough coins | `REWARDS` in `src/logic/economy.js` |
| Towers do all the work | lower `damage` in `src/logic/towers.js` |
| Missions too easy for stars | star thresholds in `src/logic/stars.js` |

After any change: `npm test`.

## Manual checks per screen

- [ ] Title: Play and Grown-ups both work; aliens parade across.
- [ ] Mission Map: completed missions show stars; the next mission unlocks after a win.
- [ ] Game: typing, wrong-letter wobble, Escape releases a lock, pause button, auto-pause when switching tabs, build/upgrade/sell, Start Wave, retry after losing all hearts.
- [ ] Boss: shields pop one word at a time; towers only hurt it after the last shield. Missions 1–5 bring the purple caped boss; missions 6–10 bring the red armored one.
- [ ] Results: stars, coins earned, new-tower banner, Next Mission.
- [ ] Grown-ups: bad words are rejected with line numbers; settings persist after a page reload; Reset progress clears stars but keeps the words.
```

- [ ] **Step 2: Write `README.md`**

```markdown
# Word Defenders

A tower-defense spelling game. Aliens march toward your base carrying this week's spelling words; type a word to zap its alien, earn coins, and build towers between waves. Bosses wear shields that only typing can pop.

## Run it

    npm install
    npm run dev

Open the printed URL. Grown-ups set the word list from the **Grown-ups** button on the title screen.

## Develop

- `npm test` — unit tests for all game rules (`src/logic/`)
- `npm run build` — static build in `dist/` (`npm run preview` serves it)
- `node tools/shot.mjs` — headless Chrome screenshots; see `docs/superpowers/plans/2026-10-10-word-defenders-v1.md`
- Dev-only URL shortcuts: `?mission=4&wave=5&coins=999&autostart=1`, `?scene=Grownups`

Design: `docs/superpowers/specs/2026-10-07-word-defenders-v1-design.md`. Play-testing: `docs/playtest-checklist.md`. Art comes from PixelLab; `assets/manifest.json` records every prompt and ID.

Fonts: Andika (SIL Open Font License, via `@fontsource/andika`); `PixelUI` generated with PixelLab.
```

- [ ] **Step 3: Full verification**

Run: `npm test`
Expected: every test file passes, with 0 failures.

Run: `npm run build`
Expected: exits 0.

```bash
(npx vite preview --port 5198 --strictPort > .shots/preview.log 2>&1 &) ; sleep 3
node tools/shot.mjs --url "http://localhost:5198/?mission=4" --scene Title --do "wait:1000" --do "shot:.shots/22-preview.png"
pkill -f "vite preview --port 5198"
```

Expected: `No console errors.` The production build ignores debug parameters, so it opens on the Title screen even with `?mission=4`; `.shots/22-preview.png` matches the Task 17 title screenshot.

Run: `git status --short`
Expected: only the two new docs are untracked or modified.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/playtest-checklist.md
git commit -m "docs: README and play-test checklist

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
