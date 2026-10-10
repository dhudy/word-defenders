import { PNG } from 'pngjs';

// Packs PNG frames into one uniform grid (cell = largest frame, frames
// centred) and describes it in PixelLab's spritesheet JSON format.
export function packSheet(rows) {
  const frames = rows.flatMap((row) => row.frames.map((frame) => frame.png));
  const cellWidth = Math.max(...frames.map((p) => p.width));
  const cellHeight = Math.max(...frames.map((p) => p.height));
  const columns = Math.max(...rows.map((row) => row.frames.length));
  const png = new PNG({ width: cellWidth * columns, height: cellHeight * rows.length });
  png.data.fill(0);

  const jsonRows = rows.map((row, rowIndex) => {
    row.frames.forEach((frame, col) => {
      const dx = col * cellWidth + Math.floor((cellWidth - frame.png.width) / 2);
      const dy = rowIndex * cellHeight + Math.floor((cellHeight - frame.png.height) / 2);
      PNG.bitblt(frame.png, png, 0, 0, frame.png.width, frame.png.height, dx, dy);
    });
    if (row.type === 'rotations') {
      return { row: rowIndex, type: 'rotations', frame_count: row.frames.length, directions: row.frames.map((f) => f.direction) };
    }
    return { row: rowIndex, type: 'animation', frame_count: row.frames.length, animation: row.animation, direction: row.direction };
  });

  return {
    png,
    json: { spritesheet: { cell_size: { width: cellWidth, height: cellHeight }, columns, pivot: 'cell-center', rows: jsonRows } },
  };
}

export function readPng(buffer) {
  return PNG.sync.read(buffer);
}

export function writePng(png) {
  return PNG.sync.write(png);
}
