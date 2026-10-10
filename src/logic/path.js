// A path is a list of waypoints joined by horizontal or vertical segments.
export function createPath(points) {
  const segments = [];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.x !== b.x && a.y !== b.y) {
      throw new Error(`Path segment ${i} is diagonal; paths turn only at right angles`);
    }
    const len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    segments.push({ a, b, start: length, len, dir: directionOf(a, b) });
    length += len;
  }
  return { points, segments, length };
}

export function positionAt(path, distance) {
  const d = Math.max(0, Math.min(distance, path.length));
  for (const s of path.segments) {
    if (d <= s.start + s.len) {
      const t = s.len === 0 ? 0 : (d - s.start) / s.len;
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, dir: s.dir };
    }
  }
  const last = path.segments[path.segments.length - 1];
  return { x: last.b.x, y: last.b.y, dir: last.dir };
}

function directionOf(a, b) {
  if (b.x > a.x) return 'east';
  if (b.x < a.x) return 'west';
  if (b.y > a.y) return 'south';
  return 'north';
}
