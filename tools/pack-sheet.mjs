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
