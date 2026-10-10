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
