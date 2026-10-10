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
