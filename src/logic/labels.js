const MAX_STEPS = 8;

// Places word bubbles so none covers another. items: [{ id, x, y, width, priority }]
// with (x, y) the bubble's desired centre. Higher priority keeps its spot first;
// a bubble that overlaps one already placed moves up above it, or below it when
// there is no room above minY. x is clamped so the whole bubble stays in
// [minX, maxX]. Returns Map<id, { x, y }> of final centres.
export function layoutLabels(items, { minY, minX, maxX, rowHeight }) {
  const placed = [];
  const result = new Map();
  const ordered = [...items].sort((a, b) => b.priority - a.priority);
  for (const item of ordered) {
    const half = item.width / 2;
    const box = {
      x: Math.min(Math.max(item.x, minX + half), maxX - half),
      y: Math.max(item.y, minY),
      half,
    };
    let goingDown = false;
    for (let step = 0; step < MAX_STEPS; step++) {
      const hit = placed.find((other) => overlaps(box, other, rowHeight));
      if (!hit) break;
      const above = hit.y - (rowHeight + 2);
      if (!goingDown && above >= minY) {
        box.y = above;
      } else {
        goingDown = true;
        box.y = hit.y + rowHeight + 2;
      }
    }
    placed.push(box);
    result.set(item.id, { x: box.x, y: box.y });
  }
  return result;
}

function overlaps(a, b, rowHeight) {
  return Math.abs(a.x - b.x) < a.half + b.half && Math.abs(a.y - b.y) < rowHeight;
}
