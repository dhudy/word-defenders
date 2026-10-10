import { terrainCorners, padPositions, basePosition, portalPosition, cellCenter } from '../../logic/map.js';
import { buildTerrainLookup, cornerKey } from '../../logic/sheets.js';

// Draws the autotiled ground and path, the build pads, the portal and the base.
export class MapView {
  constructor(scene, map, { onPadClick = () => {} } = {}) {
    this.scene = scene;
    const lookup = buildTerrainLookup(scene.cache.json.get('terrain'));
    const grass = lookup.get('upper|upper|upper|upper');
    terrainCorners(map).forEach((line, row) =>
      line.forEach((corners, col) => {
        const { x, y } = cellCenter(col, row);
        scene.add.image(x, y, 'terrain', lookup.get(cornerKey(corners)) ?? grass).setDepth(-1000);
      }),
    );

    const portal = portalPosition(map);
    this.portal = scene.add.image(portal.x, portal.y, 'portal').setDepth(portal.y - 1);
    scene.tweens.add({ targets: this.portal, scale: 1.1, yoyo: true, repeat: -1, duration: 700 });

    const base = basePosition(map);
    this.base = scene.add.image(base.x, base.y, 'base').setDepth(base.y);

    this.pads = padPositions(map).map((pos, index) => {
      const pad = scene.add.image(pos.x, pos.y, 'pad').setDepth(-500).setInteractive({ useHandCursor: true });
      pad.on('pointerover', () => pad.setTint(0xfff3a0));
      pad.on('pointerout', () => pad.clearTint());
      pad.on('pointerdown', () => onPadClick(index));
      return pad;
    });
  }

  padPosition(index) {
    return { x: this.pads[index].x, y: this.pads[index].y };
  }

  flashBase() {
    this.base.setTint(0xff6666);
    this.scene.time.delayedCall(150, () => this.base.clearTint());
  }
}
