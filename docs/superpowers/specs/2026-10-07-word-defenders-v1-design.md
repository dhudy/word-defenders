# Word Defenders — v1 Design

- **Date:** 2026-10-07
- **Status:** Design approved in chat; written spec awaiting review
- **Repo:** `~/word-defenders` (git, `main`, no remote)

## 1. Purpose

Word Defenders is a browser tower-defense game that helps a 7-year-old practice his weekly spelling words. Aliens march along a path, each carrying a word. Typing a word zaps its alien. Kills earn coins, and between waves he spends them on towers that buy him time: a Freeze Ray slows aliens down, and shooting towers wear them down until they're too dizzy to hurry. Towers never finish an alien; only a typed word does. Bosses wear shields that only typing can pop, then keep showing words until typing finishes them.

### Success criteria

- He chooses to play it.
- With a typical list of 10–20 words, every word on the list appears on an alien at least once per mission.
- A parent can replace the word list in under a minute.

### Users

- **Player:** a 2nd grader who plays on a laptop or desktop with a physical keyboard and a mouse or trackpad.
- **Grown-up:** a parent who enters the weekly list and adjusts the alien speed.

## 2. Decisions

| Topic | Decision |
|---|---|
| Engine | Phaser 4 (4.2.x), plain JavaScript (ES modules) |
| Tooling | Vite (dev server and static build), Vitest (unit tests), Node 22 |
| Art | PixelLab, generated through the PixelLab MCP tools from the start |
| Word font | Andika (SIL OFL), bundled locally; built for early readers |
| How words appear | Every alien always shows its word |
| Targeting | Type to lock on |
| Session structure | 10 missions of 5 waves each; a boss on wave 5 |
| Extras in v1 | Generated sound effects; 1–3 stars per mission |
| Word entry | Grown-ups screen in the game, saved in the browser |
| Persistence | `localStorage` only, with no backend and no accounts |
| v1 deployment | Local only (`npm run dev` / `npm run preview`). Hosting is decided after play-testing. |

## 3. Architecture

### Layout

```
word-defenders/
  index.html
  package.json
  vite.config.js
  src/
    main.js            Phaser game config and scene list
    logic/             pure JS; must not import Phaser
      typing.js        lock-on and letter matching
      words.js         list parsing and validation; word deck and picking
      missions.js      the 10-mission data table
      waves.js         (mission, wave, rng) → spawn list
      towers.js        tower stats, upgrades, target choice
      economy.js       coin rewards, costs, sell value
      stars.js         hearts and retry → stars
      save.js          load/save/validate/migrate
      path.js          map path geometry: position at distance, progress
    scenes/            Boot, Title, MissionMap, Game, Results, Grownups
    objects/           Alien, Boss, Tower, Projectile, WordLabel
    audio/sfx.js       Web Audio sound effects generated in code
  public/assets/       packed sprite sheets, tiles, font files
  assets/
    raw/               PNGs downloaded from PixelLab
    manifest.json      per asset: prompt, PixelLab ID, chosen candidate
  tools/
    pack-sprites.mjs   packs raw animation frames into Phaser sheets
  tests/               one Vitest spec per logic module
  docs/superpowers/specs/
```

### The boundary rule

Modules in `src/logic/` take plain data and return plain data. They never import Phaser, read the clock or call `Math.random()` directly; callers pass in time deltas and a random source. Scenes and objects call logic and draw the results. This rule keeps every game rule unit-testable.

## 4. Art and assets

### Asset list

| Asset | PixelLab tool | Est. generations |
|---|---|---|
| 3 aliens (Blob, Zoomer, Chonk) and 2 bosses (one for missions 1–5, one for missions 6–10), each with a 4-direction walk cycle | `create_character`, `animate_character("walking")` | 60–80 |
| 3 towers × 3 levels, 8 facings each | `create_8_direction_object`, `create_object_state` | ~270 |
| Ground/path tileset, build pad, base, spawn portal | `create_topdown_tileset`, `create_1_direction_object` | ~100 |
| Laser bolt, 3 projectiles, explosion, freeze puff, shield bubble, coin, heart, star | `create_image_pixflux`, `animate_image` | ~15 |
| Pixel font for the HUD and buttons | `create_font` | 25 |

The total is about 500 generations; the account has 4,880 left this cycle (it resets 2026-10-27).

### Constraints the art places on the game

- The path turns only at right angles, so 4-direction walk cycles suffice.
- Each turret snaps to the nearest of its 8 drawn facings.
- The boss's shield is a separate sprite drawn over the boss. Typing pops it with an animation. Stacked shields show as nested bubbles.
- Words on aliens use Andika. The pixel font is for the HUD and buttons only.

### Rendering scale

The game canvas is 1024×576 and scales to fit the window (Phaser `Scale.FIT`). Phaser's `pixelArt: true` setting keeps sprites crisp. On screen, ground tiles are 32×32, characters stand 48–64 px tall, towers are about 64 px and the boss is about 128 px. Word labels render at native resolution in Andika at 24 px or larger.

### Workflow

1. Generate 2–3 candidates for each alien and the boss. The player picks the winners.
2. Download the results into `assets/raw/`. Record the prompt, PixelLab ID and chosen candidate in `assets/manifest.json`.
3. Run `tools/pack-sprites.mjs` to write Phaser-ready sheets to `public/assets/`.
4. Commit both the raw and the packed art.

## 5. Gameplay

### Map

One map: a winding path across an alien planet, from a spawn portal at the left to the player's base at the right. The path runs along a 32 px grid and turns only at right angles. Eight fixed build pads sit beside it. The map is data (path points plus pad positions), so more maps can be added later.

### Typing

- **Lock-on:** with no alien locked, a key that matches the first character of an on-screen alien's word locks onto that alien. If several match, the alien furthest along the path wins. A key that matches no alien plays a soft buzz and does nothing else.
- **Progress:** each correct key turns that letter green. The next letter pulses. The locked alien gets a glowing ring.
- **Wrong key:** the alien wobbles and a soft buzz plays. Progress stays on the same letter, with no reset and no penalty.
- **Completing a word:** a laser fires from the base and the alien dies instantly, whatever its HP. On a boss, completing the word pops one shield, or once the shields are down, takes 10 HP off it.
- **Release:** Esc releases the lock. If the locked alien dies or reaches the base, the lock releases automatically.
- **Matching:** case-insensitive. Apostrophes and hyphens are typed characters ("don't").
- **Key handling:** the game calls `preventDefault` on every key it consumes. This stops browser shortcuts such as Firefox's Quick Find on `'`.
- Typing does nothing during the break between waves.

### Words

- **Deck:** each mission shuffles the list into a deck and draws from it. Every word appears once before any repeats; when the deck runs out, it reshuffles.
- **First letters:** for a new alien, the picker takes the first remaining deck word whose first letter differs from every word on screen. If none qualifies, it takes the next deck word.
- **Boss words:** boss shields use distinct words drawn at random from the longest third of the list. Boss words don't consume the deck.
- **Display:** words appear as entered; matching ignores case.

### Aliens

| Alien | Speed | HP | First mission | Hearts lost on reaching the base |
|---|---|---|---|---|
| Blob | 1× (crosses the path in ~30 s in mission 1 at Normal) | 3 | 1 | 1 |
| Zoomer | 1.6× | 2 | 2 | 1 |
| Chonk | 0.7× | 9 | 4 | 1 |
| Boss | 0.5× | 20 + 10 per shield | 1 (wave 5) | 5 |

Typing kills any regular alien instantly, whatever its HP. Towers can't take an alien below 1 HP: an alien worn down to 1 HP turns **dizzy** (stars circle its head) and walks at half speed until its word is typed.

### Boss

Two boss designs share the same rules: the player picked one for missions 1–5 and another for missions 6–10, so the second half of the game brings a new boss.

The boss carries 1–3 shields. While any shield is up, towers can't damage it. Each shield shows one word. Typing that word pops the shield, releases the lock and reveals the next shield's word. With every shield gone, the boss shows a word from the weekly list (avoiding first letters already on screen). Each typed word takes 10 HP off and brings a new word, until a word takes it to 0. Towers can hurt it once the shields are gone, but only down to 1 HP, so a typed word always lands the last hit. Without towers, that's 3 words after the shields at 1 shield, 4 at 2 and 5 at 3.

### Towers

Building, upgrading and selling happen only during the break between waves. The break has no timer; the player clicks **Start Wave** when ready. Clicking an empty pad opens a build menu. Clicking a tower opens an upgrade/sell menu.

| Tower | Role | Cost (L1 / L2 / L3) | First mission |
|---|---|---|---|
| Freeze Ray | Slows every alien in range by 30% / 45% / 60%; no damage; 2.5-tile range | 30 / 20 / 30 | 1 |
| Blaster | Single target. 1 damage, 1 shot/s, 3-tile range | 20 / 15 / 25 | 3 |
| Rocket | 3 splash damage (1-tile radius), 0.4 shots/s, 3.5-tile range | 40 / 25 / 35 | 5 |

- Each upgrade adds 50% damage and 10% range. Freeze Ray upgrades raise the slow, as shown in the table.
- Towers target the alien in range that is furthest along the path. Shooting towers skip shielded bosses and dizzy aliens.
- Selling refunds 50% of the coins spent on that tower, upgrades included.
- A tower is available in its first mission and every mission after it.
- Towers back up typing; they don't replace it. Their damage stops at 1 HP, where the alien turns dizzy (see Aliens), so every alien still needs its word typed.

### Coins

| Event | Coins |
|---|---|
| Typed kill | 5 |
| Boss kill | 25 |
| Wave ends with hearts left | 10 |
| Mission start | 30 |

Only typing kills, so every kill pays the typed reward.

### Missions and waves

Every mission has 5 waves. Waves 1–4 contain regular aliens. Wave 5 spawns its escorts first and the boss last. A wave ends when every alien has died or reached the base.

Starting values (tuned during play-testing):

| Mission | Speed × | Waves 1–4 | Wave 5 escorts | Spawn gap | Alien mix | Boss shields | New tower |
|---|---|---|---|---|---|---|---|
| 1 | 1.00 | 4, 5, 6, 7 | 3 | 4.5 s | Blob | 1 | Freeze Ray |
| 2 | 1.05 | 5, 6, 7, 8 | 3 | 4.3 s | Blob, Zoomer | 1 | — |
| 3 | 1.10 | 5, 6, 7, 8 | 4 | 4.1 s | Blob, Zoomer | 1 | Blaster |
| 4 | 1.10 | 6, 7, 8, 9 | 4 | 4.0 s | + Chonk | 2 | — |
| 5 | 1.15 | 6, 7, 8, 9 | 4 | 3.8 s | All | 2 | Rocket |
| 6 | 1.20 | 6, 8, 9, 10 | 5 | 3.6 s | All | 2 | — |
| 7 | 1.25 | 7, 8, 10, 11 | 5 | 3.5 s | All | 2 | — |
| 8 | 1.30 | 7, 9, 10, 12 | 6 | 3.3 s | All | 3 | — |
| 9 | 1.35 | 8, 9, 11, 12 | 6 | 3.2 s | All | 3 | — |
| 10 | 1.40 | 8, 10, 12, 14 | 6 | 3.0 s | All | 3 | — |

`waves.js` takes a random source, so tests can reproduce any wave exactly. The Grown-ups speed setting (0.7× / 1× / 1.3×) multiplies the mission's speed.

### Guided start

Mission 1's first break shows an arrow to a pad with the text "Build a Freeze Ray here!", then an arrow to **Start Wave**. Replays of mission 1 skip the guide.

### Hearts, retries and winning

- The base starts each mission with 10 hearts.
- When hearts reach 0, the game shows "Uh oh, the aliens got through! Let's try that wave again." The wave restarts with the towers and coins from the start of that wave, and hearts refill to 10. The mission is then marked as retried.
- The mission is won when wave 5 ends with hearts left.
- Winning mission *N* unlocks mission *N + 1*, whatever the star count.

### Stars

| Result | Stars |
|---|---|
| 8–10 hearts left, no retries | 3 |
| 4–7 hearts left, no retries | 2 |
| 1–3 hearts left, or any retry | 1 |

The save keeps the best stars for each mission.

## 6. Screens

Flow: **Title → Mission Map → Game → Results → Mission Map.** A **Grown-ups** button sits on the Title screen.

| Screen | Contents |
|---|---|
| Boot | Loads assets. On failure, shows "Couldn't load the game — try refreshing." |
| Title | Logo, a big **Play** button, a small **Grown-ups** button. The first click unlocks audio. |
| Mission Map | 10 mission markers on a star map showing best stars. Locked missions appear dimmed with a padlock. |
| Game | Top bar: hearts, coins, "Wave *n* / 5", pause button. Breaks add build/upgrade pop-ups and **Start Wave**. The pause menu offers Resume and Quit to Mission Map. The game pauses automatically when the window loses focus. |
| Results | Animated stars, coins earned, a "New tower!" banner when the next mission adds one. Buttons: **Next Mission**, **Mission Map**. |
| Grown-ups | See below. |

There is no pause key: any letter might belong to a word.

### Grown-ups screen

- **Word list:** a text area with one word per line. Saving trims whitespace and drops blank lines and case-insensitive duplicates. Each word must contain only letters, apostrophes and hyphens and be at most 20 characters long; problems appear beside the offending lines and block the save. The list needs at least 5 words and at most 50.
- **Starter list:** before a list is saved, the game uses 15 common 2nd-grade words: *after, again, around, because, before, could, every, friend, house, little, people, their, there, water, would*.
- **Alien speed:** Slow / Normal / Fast (0.7× / 1× / 1.3×).
- **Sound:** on or off.
- **Reset progress:** after a confirmation, clears stars and unlocks but keeps the word list and settings.
- **Storage notice:** if the browser blocks storage, the screen shows "Progress can't be saved in this browser."
- v1 has no lock on this screen.

## 7. Saving

- One `localStorage` key: `word-defenders:save`.
- Shape: `{ version: 1, words: string[], settings: { speed: "slow" | "normal" | "fast", sound: boolean }, missions: { [id]: { stars: 1 | 2 | 3 } } }`. A mission is unlocked when it is mission 1 or when the mission before it has stars.
- Loading validates each field separately and replaces an invalid field with its default (an invalid word list becomes the starter list). Invalid JSON yields a fresh default save. Loading never throws.
- `version` drives migrations, so later formats can upgrade old saves.
- The game saves when a mission ends and when the Grown-ups screen saves. A mission in progress isn't saved.
- If `localStorage` is unavailable, the game runs with an in-memory save.

## 8. Error handling

- **Asset load failure:** Boot shows a friendly message instead of a black screen.
- **Audio failure or no user gesture yet:** the game stays silent and keeps running.
- **Window resize:** `Scale.FIT` keeps 16:9 letterboxed to any window.
- **Corrupt save:** handled by `save.js` as described in Section 7.

## 9. Sound effects

Web Audio oscillators and envelopes generate every effect in code, with no audio files. The effects: correct key, wrong key, laser zap, a shot sound for each tower, explosion, coin, shield pop, dizzy warble, boss alarm, wave start, victory jingle and a gentle try-again sound. The Grown-ups sound setting mutes them all.

## 10. Testing

**Unit tests (Vitest), one spec per logic module:**

- `typing`: lock-on, the furthest-along tie-break, wrong keys, Esc, case-insensitivity, apostrophes and hyphens, release when the target dies.
- `words`: parsing and validation messages, the deck using every word before repeating, first-letter avoidance, boss words from the longest third.
- `missions` / `waves`: every mission has 5 waves with the boss last in wave 5, shield counts and tower unlocks match Section 5, alien mixes respect each alien's first mission, and the same seed reproduces the same spawns.
- `towers`: stats per level, targeting the furthest-along alien, skipping shielded bosses and dizzy aliens; tower damage stopping at 1 HP.
- `economy`: rewards, costs, the 50% refund including upgrades.
- `stars`: each threshold and the 1-star cap after a retry.
- `save`: a save-then-load round trip, invalid JSON, missing or invalid fields, an older version.

**Dev-only debug URL:** `?mission=4&wave=5&coins=999` jumps straight to a boss fight. Production builds ignore it.

**Manual play-test checklist:** the implementation plan includes one per scene.

**Play-testing:** the player tries each mission. Tuning happens in the missions table.

## 11. Out of scope for v1

- Words spoken aloud
- Tricky-word tracking and reports
- Multiple saved word lists
- A lock on the Grown-ups screen
- More than one map
- Touch or mobile play
- Accounts or a backend
- Background music
- Hosting
