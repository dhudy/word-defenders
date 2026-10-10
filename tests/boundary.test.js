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
