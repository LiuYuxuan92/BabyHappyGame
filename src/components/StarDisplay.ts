import Phaser from 'phaser';
import { getTotalStars } from '../utils/storage';

export class StarDisplay extends Phaser.GameObjects.Container {
  private countText: Phaser.GameObjects.Text;
  private displayedCount: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.displayedCount = getTotalStars();

    const starIcon = scene.add.text(0, 0, '⭐', {
      fontSize: '28px',
    }).setOrigin(1, 0.5);

    this.countText = scene.add.text(8, 0, `${this.displayedCount}`, {
      fontSize: '24px',
      color: '#FF8C00',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add([starIcon, this.countText]);
    scene.add.existing(this);
  }

  animateToValue(target: number): void {
    if (target === this.displayedCount) return;

    this.scene.tweens.addCounter({
      from: this.displayedCount,
      to: target,
      duration: 600,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        const value = Math.round(tween.getValue() ?? this.displayedCount);
        this.countText.setText(`${value}`);
      },
      onComplete: () => {
        this.displayedCount = target;
        this.countText.setText(`${target}`);
      },
    });
  }

  static createMiniStars(scene: Phaser.Scene, x: number, y: number, count: number): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);
    const starSize = 16;
    const gap = 4;
    const totalWidth = 3 * starSize + 2 * gap;
    const startX = -totalWidth / 2 + starSize / 2;

    for (let i = 0; i < 3; i++) {
      const posX = startX + i * (starSize + gap);
      const star = scene.add.image(posX, 0, i < count ? 'star_gold' : 'star_gray');
      star.setDisplaySize(starSize, starSize);
      container.add(star);
    }

    return container;
  }
}
