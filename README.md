# Word Defenders

A tower-defense spelling game. Aliens march toward your base carrying this week's spelling words; type a word to zap its alien, earn coins, and build towers between waves. Towers slow the aliens down, but only a typed word finishes one. Bosses wear shields that only typing can pop.

## Play it

**https://dhudy.github.io/word-defenders/**

It needs a computer with a keyboard (laptop or Chromebook); tablets and phones can't type into it yet.

Grown-ups set the word list from the **Grown-ups** button on the title screen. Words and stars are saved only in that browser on that computer; nothing is sent anywhere.

## Run it locally

    npm install
    npm run dev

Open the printed URL. Every push to `main` tests, builds and publishes the game (`.github/workflows/deploy.yml`).

## Develop

- `npm test` — unit tests for all game rules (`src/logic/`)
- `npm run build` — static build in `dist/` (`npm run preview` serves it)
- `node tools/shot.mjs` — headless Chrome screenshots; see `docs/superpowers/plans/2026-10-10-word-defenders-v1.md`
- Dev-only URL shortcuts: `?mission=4&wave=5&coins=999&autostart=1`, `?scene=Grownups`

Design: `docs/superpowers/specs/2026-10-07-word-defenders-v1-design.md`. Play-testing: `docs/playtest-checklist.md`. Art comes from PixelLab; `assets/manifest.json` records every prompt and ID.

Fonts: Andika (SIL Open Font License, via `@fontsource/andika`); `PixelUI` generated with PixelLab.

## License

MIT (see `LICENSE`): use, copy, change and share it freely, as long as you keep the copyright notice. This covers the code and the PixelLab art. The Andika font keeps its own SIL Open Font License.
