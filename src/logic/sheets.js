// Reads PixelLab's spritesheet JSON: a uniform grid where each row is either
// a set of rotations or one direction of one animation.
export function parseSheet(json) {
  const sheet = json.spritesheet;
  const { width: frameWidth, height: frameHeight } = sheet.cell_size;
  const columns = sheet.columns;
  const rotations = {};
  const animations = {};
  for (const row of sheet.rows) {
    const first = row.row * columns;
    if (row.type === 'rotations') {
      row.directions.forEach((direction, i) => {
        rotations[direction] = first + i;
      });
    } else if (row.type === 'animation') {
      animations[row.animation] ??= {};
      animations[row.animation][row.direction] = Array.from({ length: row.frame_count }, (_, i) => first + i);
    }
  }
  return { frameWidth, frameHeight, columns, rotations, animations };
}

export function cornerKey(corners) {
  return `${corners.NW}|${corners.NE}|${corners.SW}|${corners.SE}`;
}

// Maps each corner combination of a PixelLab Wang tileset to its frame index.
export function buildTerrainLookup(metadata) {
  const data = metadata.tileset_data;
  const { width, height } = data.tile_size;
  const cols = data.spritesheet_grid.cols;
  const lookup = new Map();
  for (const tile of data.tiles) {
    const box = tile.bounding_box;
    lookup.set(cornerKey(tile.corners), (box.y / height) * cols + box.x / width);
  }
  return lookup;
}
