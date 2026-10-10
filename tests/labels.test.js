import { describe, it, expect } from 'vitest';
import { layoutLabels } from '../src/logic/labels.js';

const OPTS = { minY: 86, minX: 4, maxX: 1020, rowHeight: 38 };
const ROW = OPTS.rowHeight + 2;

function overlapping(items, placed) {
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = placed.get(items[i].id);
      const b = placed.get(items[j].id);
      const apart =
        Math.abs(a.x - b.x) >= (items[i].width + items[j].width) / 2 || Math.abs(a.y - b.y) >= OPTS.rowHeight;
      if (!apart) pairs.push([items[i].id, items[j].id]);
    }
  }
  return pairs;
}

describe('layoutLabels', () => {
  it('leaves bubbles that do not overlap where they are', () => {
    const items = [
      { id: 1, x: 200, y: 300, width: 100, priority: 5 },
      { id: 2, x: 400, y: 300, width: 100, priority: 9 },
      { id: 3, x: 200, y: 400, width: 100, priority: 1 },
    ];
    const placed = layoutLabels(items, OPTS);
    expect(placed.get(1)).toEqual({ x: 200, y: 300 });
    expect(placed.get(2)).toEqual({ x: 400, y: 300 });
    expect(placed.get(3)).toEqual({ x: 200, y: 400 });
  });

  it('keeps bubbles below minY', () => {
    const placed = layoutLabels([{ id: 1, x: 300, y: 40, width: 100, priority: 1 }], OPTS);
    expect(placed.get(1)).toEqual({ x: 300, y: OPTS.minY });
  });

  it('moves a lower-priority bubble up one row and keeps the higher one in place', () => {
    const items = [
      { id: 'trailing', x: 320, y: 300, width: 120, priority: 100 },
      { id: 'leader', x: 360, y: 300, width: 120, priority: 400 },
    ];
    const placed = layoutLabels(items, OPTS);
    expect(placed.get('leader')).toEqual({ x: 360, y: 300 });
    expect(placed.get('trailing')).toEqual({ x: 320, y: 300 - ROW });
  });

  it('moves the lower-priority bubble down instead when there is no room above', () => {
    const items = [
      { id: 'trailing', x: 320, y: OPTS.minY, width: 120, priority: 100 },
      { id: 'leader', x: 360, y: OPTS.minY + 10, width: 120, priority: 400 },
    ];
    const placed = layoutLabels(items, OPTS);
    expect(placed.get('leader')).toEqual({ x: 360, y: OPTS.minY + 10 });
    expect(placed.get('trailing')).toEqual({ x: 320, y: OPTS.minY + 10 + ROW });
  });

  it('keeps whole bubbles on screen at both edges', () => {
    const items = [
      { id: 'left', x: 16, y: 120, width: 120, priority: 1 },
      { id: 'right', x: 1010, y: 300, width: 120, priority: 2 },
    ];
    const placed = layoutLabels(items, OPTS);
    expect(placed.get('left').x - 60).toBe(OPTS.minX);
    expect(placed.get('right').x + 60).toBe(OPTS.maxX);
  });

  it('separates three mutually overlapping bubbles', () => {
    const items = [
      { id: 1, x: 300, y: 300, width: 120, priority: 3 },
      { id: 2, x: 320, y: 305, width: 140, priority: 2 },
      { id: 3, x: 290, y: 295, width: 100, priority: 1 },
    ];
    const placed = layoutLabels(items, OPTS);
    expect(placed.get(1)).toEqual({ x: 300, y: 300 });
    expect(overlapping(items, placed)).toEqual([]);
  });

  it('separates three mutually overlapping bubbles at the top of the play area', () => {
    const items = [
      { id: 1, x: 300, y: 60, width: 120, priority: 3 },
      { id: 2, x: 320, y: 70, width: 140, priority: 2 },
      { id: 3, x: 290, y: 50, width: 100, priority: 1 },
    ];
    const placed = layoutLabels(items, OPTS);
    expect(overlapping(items, placed)).toEqual([]);
    for (const item of items) expect(placed.get(item.id).y).toBeGreaterThanOrEqual(OPTS.minY);
  });

  it('terminates for many identical bubbles', () => {
    const items = Array.from({ length: 40 }, (_, i) => ({ id: i, x: 500, y: 300, width: 120, priority: 0 }));
    const placed = layoutLabels(items, OPTS);
    expect(placed.size).toBe(40);
    for (const { x, y } of placed.values()) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });
});
