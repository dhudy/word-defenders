const SHIELD_SIZE = 140;
const LAYER_GROWTH = 24;

// Nested bubbles around a boss, one per remaining shield word. The outermost
// bubble pops when its word is typed.
export class ShieldView {
  constructor(scene) {
    this.scene = scene;
    this.bubbles = [];
  }

  sync(alien, depth) {
    const remaining = alien.shieldWords.length - alien.shieldIndex;
    while (this.bubbles.length < remaining) {
      const size = SHIELD_SIZE + this.bubbles.length * LAYER_GROWTH;
      this.bubbles.push(this.scene.add.image(alien.x, alien.y, 'shield').setDisplaySize(size, size).setAlpha(0.55));
    }
    while (this.bubbles.length > remaining) this.pop(this.bubbles.pop());
    for (const bubble of this.bubbles) bubble.setPosition(alien.x, alien.y).setDepth(depth + 1);
  }

  pop(bubble) {
    this.scene.tweens.add({
      targets: bubble,
      scale: bubble.scale * 1.6,
      alpha: 0,
      duration: 300,
      onComplete: () => bubble.destroy(),
    });
  }

  destroy() {
    for (const bubble of this.bubbles) bubble.destroy();
    this.bubbles = [];
  }
}
