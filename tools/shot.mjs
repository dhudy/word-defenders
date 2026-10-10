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
