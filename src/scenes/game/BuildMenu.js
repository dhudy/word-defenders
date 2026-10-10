import * as Run from '../../logic/game.js';
import { TOWERS, towerStats } from '../../logic/towers.js';
import { buildCost, upgradeCost, sellValue } from '../../logic/economy.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../../logic/map.js';
import { addButton } from '../../ui/button.js';
import { addText, FILLS } from '../../ui/text.js';
import { sfx } from '../../audio/sfx.js';

const WIDTH = 260;
const ROW = 56;
const HEADER = 56;
const HUD_BOTTOM = 64;
const DEPTH = 30000;

// Pop-up beside a pad: build choices on an empty pad, upgrade/sell on a tower.
export class BuildMenu {
  constructor(scene, { onChange }) {
    this.scene = scene;
    this.onChange = onChange;
    this.container = null;
    this.range = null;
  }

  get isOpen() {
    return this.container !== null;
  }

  open(run, pad, pos) {
    this.close();
    const tower = run.towers[pad];
    const items = tower ? this.towerItems(run, pad, tower) : this.buildItems(run, pad);
    const height = HEADER + items.length * ROW;
    const x = clamp(pos.x, WIDTH / 2 + 8, GAME_WIDTH - WIDTH / 2 - 8);
    const above = pos.y - 40 - height / 2;
    const preferred = above - height / 2 >= HUD_BOTTOM ? above : pos.y + 40 + height / 2;
    const y = clamp(preferred, HUD_BOTTOM + height / 2 + 4, GAME_HEIGHT - height / 2 - 4);

    this.container = this.scene.add.container(x, y).setDepth(DEPTH);
    // Swallows clicks on the heading and between rows so they never reach pads underneath.
    const blocker = this.scene.add.zone(0, 0, WIDTH, height).setInteractive();
    const bg = this.scene.add.graphics();
    bg.fillStyle(FILLS.panel, 0.96).fillRoundedRect(-WIDTH / 2, -height / 2, WIDTH, height, 14);
    bg.lineStyle(2, FILLS.panelEdge, 1).strokeRoundedRect(-WIDTH / 2, -height / 2, WIDTH, height, 14);
    const title = tower ? `${TOWERS[tower.type].name.toUpperCase()} LV ${tower.level}` : 'BUILD';
    const heading = addText(this.scene, -WIDTH / 2 + 14, -height / 2 + 24, title).setOrigin(0, 0.5);
    const close = addButton(this.scene, WIDTH / 2 - 26, -height / 2 + 24, 'X', () => this.close(), { width: 34, height: 30, fill: FILLS.quiet });
    this.container.add([blocker, bg, heading, close]);

    items.forEach((item, i) => {
      const button = addButton(this.scene, 0, -height / 2 + HEADER + i * ROW + ROW / 2 - 4, item.label, item.onClick, {
        width: WIDTH - 28,
        height: 44,
        fill: item.fill ?? FILLS.button,
      });
      button.setEnabled(item.enabled);
      this.container.add(button);
    });

    if (tower) {
      this.range = this.scene.add.graphics().setDepth(DEPTH - 1);
      this.range.lineStyle(2, 0xffffff, 0.7).strokeCircle(pos.x, pos.y, towerStats(tower.type, tower.level).range);
    }
  }

  buildItems(run, pad) {
    return Run.towerOptions(run).map((type) => {
      const cost = buildCost(type);
      return {
        label: `${TOWERS[type].name.toUpperCase()}  ${cost}`,
        enabled: run.coins >= cost,
        onClick: () => this.act(Run.build(run, pad, type)),
      };
    });
  }

  towerItems(run, pad, tower) {
    const cost = upgradeCost(tower.type, tower.level);
    return [
      {
        label: cost === null ? 'MAX LEVEL' : `UPGRADE  ${cost}`,
        enabled: cost !== null && run.coins >= cost,
        onClick: () => this.act(Run.upgrade(run, pad)),
      },
      {
        label: `SELL  +${sellValue(tower.type, tower.level)}`,
        enabled: true,
        fill: FILLS.quiet,
        onClick: () => this.act(Run.sell(run, pad)),
      },
    ];
  }

  act(changed) {
    if (changed) sfx.play('build');
    this.close();
    this.onChange();
  }

  close() {
    this.container?.destroy();
    this.range?.destroy();
    this.container = null;
    this.range = null;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
