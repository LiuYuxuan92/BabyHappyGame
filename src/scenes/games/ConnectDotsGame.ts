import Phaser from 'phaser';

interface DotPoint {
  x: number;
  y: number;
  index: number;
}

interface ShapePattern {
  name: string;
  dots: { x: number; y: number }[];
  fillColor: number;
}

export class ConnectDotsGame extends Phaser.Scene {
  private dots: Phaser.GameObjects.Container[] = [];
  private lines: Phaser.GameObjects.Graphics | null = null;
  private currentDot = 0;
  private patternIndex = 0;
  private patterns: ShapePattern[] = [];
  private connectedPoints: DotPoint[] = [];
  private isComplete = false;

  constructor() {
    super({ key: 'ConnectDotsGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.currentDot = 0;
    this.dots = [];
    this.connectedPoints = [];
    this.isComplete = false;

    this.patterns = this.getPatterns(width, height);

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFCE4EC, 0xFCE4EC, 0xF8BBD0, 0xF8BBD0);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '✏️ 连线画', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Instruction
    this.add.text(width / 2, height - 20, '按数字顺序点击圆点来画图形', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    this.setupPattern();
  }

  private getPatterns(width: number, height: number): ShapePattern[] {
    const cx = width / 2;
    const cy = height / 2 + 20;
    const r = Math.min(width, height) * 0.28;

    return [
      // Star
      {
        name: '星星',
        fillColor: 0xFFD700,
        dots: (() => {
          const points: { x: number; y: number }[] = [];
          for (let i = 0; i < 10; i++) {
            const angle = (i * 36 - 90) * (Math.PI / 180);
            const radius = i % 2 === 0 ? r : r * 0.45;
            points.push({
              x: cx + Math.cos(angle) * radius,
              y: cy + Math.sin(angle) * radius,
            });
          }
          return points;
        })(),
      },
      // House
      {
        name: '房子',
        fillColor: 0xFF7043,
        dots: [
          { x: cx - r * 0.7, y: cy + r * 0.8 },   // 1 bottom-left
          { x: cx + r * 0.7, y: cy + r * 0.8 },   // 2 bottom-right
          { x: cx + r * 0.7, y: cy - r * 0.1 },   // 3 top-right wall
          { x: cx + r * 0.9, y: cy - r * 0.1 },   // 4 roof overhang right
          { x: cx, y: cy - r * 0.9 },              // 5 roof peak
          { x: cx - r * 0.9, y: cy - r * 0.1 },   // 6 roof overhang left
          { x: cx - r * 0.7, y: cy - r * 0.1 },   // 7 top-left wall
          { x: cx - r * 0.7, y: cy + r * 0.8 },   // 8 back to start (close)
          { x: cx - r * 0.2, y: cy + r * 0.8 },   // 9 door left
          { x: cx - r * 0.2, y: cy + r * 0.3 },   // 10 door top
        ],
      },
      // Heart
      {
        name: '爱心',
        fillColor: 0xE91E63,
        dots: (() => {
          const points: { x: number; y: number }[] = [];
          const steps = 10;
          for (let i = 0; i < steps; i++) {
            const t = (i / steps) * Math.PI * 2;
            const hx = 16 * Math.pow(Math.sin(t), 3);
            const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            points.push({
              x: cx + hx * (r / 18),
              y: cy + hy * (r / 18),
            });
          }
          return points;
        })(),
      },
      // Fish
      {
        name: '小鱼',
        fillColor: 0x29B6F6,
        dots: [
          { x: cx + r * 0.8, y: cy },              // 1 nose
          { x: cx + r * 0.4, y: cy - r * 0.5 },   // 2 top front
          { x: cx - r * 0.1, y: cy - r * 0.6 },   // 3 top middle
          { x: cx - r * 0.5, y: cy - r * 0.3 },   // 4 top back
          { x: cx - r * 0.9, y: cy - r * 0.6 },   // 5 tail top
          { x: cx - r * 0.6, y: cy },              // 6 tail center
          { x: cx - r * 0.9, y: cy + r * 0.6 },   // 7 tail bottom
          { x: cx - r * 0.5, y: cy + r * 0.3 },   // 8 bottom back
          { x: cx - r * 0.1, y: cy + r * 0.6 },   // 9 bottom middle
          { x: cx + r * 0.4, y: cy + r * 0.5 },   // 10 bottom front
        ],
      },
    ];
  }

  private setupPattern() {
    const { width, height } = this.scale;
    const pattern = this.patterns[this.patternIndex % this.patterns.length];

    // Clear previous
    this.dots.forEach(d => d.destroy());
    this.dots = [];
    this.connectedPoints = [];
    this.currentDot = 0;
    this.isComplete = false;

    if (this.lines) {
      this.lines.destroy();
    }
    this.lines = this.add.graphics();

    // Pattern name hint
    const hint = this.add.text(width / 2, 75, `画一个${pattern.name}`, {
      fontSize: '22px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
    hint.setData('hint', true);

    // Create dots
    pattern.dots.forEach((pos, i) => {
      const container = this.add.container(pos.x, pos.y);

      // Dot circle
      const circle = this.add.graphics();
      circle.fillStyle(i === 0 ? 0x4CAF50 : 0x78909C, 1);
      circle.fillCircle(0, 0, 24);
      circle.lineStyle(3, 0xffffff);
      circle.strokeCircle(0, 0, 24);

      // Number label
      const label = this.add.text(0, 0, `${i + 1}`, {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      container.add([circle, label]);
      container.setSize(48, 48);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerdown', () => this.onDotTapped(i, container));

      // Entrance animation
      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        delay: i * 80,
        ease: 'Back.easeOut',
      });

      // Pulse the first dot to guide the child
      if (i === 0) {
        this.tweens.add({
          targets: container,
          scale: 1.15,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      this.dots.push(container);
    });
  }

  private onDotTapped(index: number, container: Phaser.GameObjects.Container) {
    if (this.isComplete) return;

    if (index === this.currentDot) {
      // Correct dot
      const pattern = this.patterns[this.patternIndex % this.patterns.length];
      const pos = pattern.dots[index];

      this.connectedPoints.push({ x: pos.x, y: pos.y, index });

      // Stop pulse on first dot
      this.tweens.killTweensOf(container);
      container.setScale(1);

      // Mark as connected - change color
      const circle = container.list[0] as Phaser.GameObjects.Graphics;
      circle.clear();
      circle.fillStyle(0x4CAF50, 1);
      circle.fillCircle(0, 0, 24);
      circle.lineStyle(3, 0xffffff);
      circle.strokeCircle(0, 0, 24);

      // Pop animation
      this.tweens.add({
        targets: container,
        scale: 1.3,
        duration: 100,
        yoyo: true,
        ease: 'Quad.easeOut',
      });

      // Draw line to previous dot
      if (this.connectedPoints.length > 1) {
        this.drawLineBetween(
          this.connectedPoints[this.connectedPoints.length - 2],
          this.connectedPoints[this.connectedPoints.length - 1]
        );
      }

      // Show small star feedback
      const star = this.add.image(pos.x, pos.y - 30, 'star_gold').setScale(0);
      this.tweens.add({
        targets: star,
        scale: 0.8,
        y: pos.y - 50,
        alpha: 0,
        duration: 500,
        onComplete: () => star.destroy(),
      });

      this.currentDot++;

      // Pulse next dot
      if (this.currentDot < this.dots.length) {
        const nextContainer = this.dots[this.currentDot];
        this.tweens.add({
          targets: nextContainer,
          scale: 1.15,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      // Check completion
      if (this.currentDot >= pattern.dots.length) {
        this.isComplete = true;
        // Draw closing line back to first dot
        this.drawLineBetween(
          this.connectedPoints[this.connectedPoints.length - 1],
          this.connectedPoints[0]
        );
        this.time.delayedCall(400, () => this.onShapeComplete());
      }
    } else {
      // Wrong dot - shake feedback
      this.tweens.add({
        targets: container,
        x: container.x + 8,
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          const pattern = this.patterns[this.patternIndex % this.patterns.length];
          container.x = pattern.dots[index].x;
        },
      });

      // Show gentle hint
      const { width } = this.scale;
      const hintText = this.add.text(width / 2, 105, `找数字 ${this.currentDot + 1}`, {
        fontSize: '20px',
        color: '#FF5722',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: hintText,
        alpha: 1,
        duration: 200,
      });
      this.tweens.add({
        targets: hintText,
        alpha: 0,
        delay: 1200,
        duration: 400,
        onComplete: () => hintText.destroy(),
      });
    }
  }

  private drawLineBetween(from: DotPoint, to: DotPoint) {
    if (!this.lines) return;

    // Animate line drawing
    const steps = 10;
    let step = 0;

    const timer = this.time.addEvent({
      delay: 20,
      repeat: steps - 1,
      callback: () => {
        step++;
        const progress = step / steps;
        const currentX = from.x + (to.x - from.x) * progress;
        const currentY = from.y + (to.y - from.y) * progress;
        const prevX = from.x + (to.x - from.x) * ((step - 1) / steps);
        const prevY = from.y + (to.y - from.y) * ((step - 1) / steps);

        this.lines!.lineStyle(5, 0x4CAF50, 1);
        this.lines!.beginPath();
        this.lines!.moveTo(prevX, prevY);
        this.lines!.lineTo(currentX, currentY);
        this.lines!.strokePath();
      },
    });
  }

  private onShapeComplete() {
    const { width, height } = this.scale;
    const pattern = this.patterns[this.patternIndex % this.patterns.length];

    // Fill the shape with color
    const fillGraphics = this.add.graphics();
    fillGraphics.setAlpha(0);
    fillGraphics.fillStyle(pattern.fillColor, 0.5);
    fillGraphics.beginPath();
    fillGraphics.moveTo(pattern.dots[0].x, pattern.dots[0].y);
    for (let i = 1; i < pattern.dots.length; i++) {
      fillGraphics.lineTo(pattern.dots[i].x, pattern.dots[i].y);
    }
    fillGraphics.closePath();
    fillGraphics.fillPath();

    this.tweens.add({
      targets: fillGraphics,
      alpha: 1,
      duration: 600,
      ease: 'Quad.easeIn',
    });

    // Celebration
    this.time.delayedCall(600, () => this.showComplete());
  }

  private showComplete() {
    const { width, height } = this.scale;

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 300 });

    // Panel
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 130, 400, 260, 24);
    panel.setAlpha(0);
    this.tweens.add({ targets: panel, alpha: 1, duration: 300 });

    const pattern = this.patterns[this.patternIndex % this.patterns.length];
    const title = this.add.text(width / 2, height / 2 - 70, `🎉 画好了！`, {
      fontSize: '36px',
      color: '#FF6B35',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const shapeName = this.add.text(width / 2, height / 2 - 30, `你画了一个${pattern.name}`, {
      fontSize: '22px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Stars
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(width / 2 - 50 + i * 50, height / 2 + 20, 'star_gold');
      star.setScale(0);
      this.tweens.add({
        targets: star,
        scale: 1,
        duration: 300,
        delay: i * 200,
        ease: 'Back.easeOut',
      });
    }

    // Next button
    const nextBtn = this.add.text(width / 2, height / 2 + 80, '下一个图形 ▶', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#4CAF50',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => {
      this.patternIndex++;
      this.scene.restart();
    });
  }
}
