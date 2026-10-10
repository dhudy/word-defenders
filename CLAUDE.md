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
