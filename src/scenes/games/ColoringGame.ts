import Phaser from 'phaser';

interface ColorRegion {
  graphics: Phaser.GameObjects.Graphics;
  path: { x: number; y: number }[];
  filled: boolean;
  color: number | null;
}

export class ColoringGame extends Phaser.Scene {
  private regions: ColorRegion[] = [];
  private selectedColor: number = 0;
  private filledCount = 0;
  private totalRegions = 0;
  private colorIndicator!: Phaser.GameObjects.Graphics;
  private outlineGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'ColoringGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.regions = [];
    this.filledCount = 0;
    this.selectedColor = 0;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFFF8E1, 0xFFF8E1, 0xFFECB3, 0xFFECB3);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '🎨 涂色游戏', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Pick a random shape to color
    const shapes = ['cat', 'fish', 'star'];
    const chosen = Phaser.Utils.Array.GetRandom(shapes);

    this.createShape(chosen);
    this.createPalette();

    // Instruction
    this.add.text(width / 2, height - 20, '选一个颜色，然后点击区域涂色吧！', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private createShape(type: string) {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2 - 40;

    switch (type) {
      case 'cat':
        this.createCatRegions(cx, cy);
        break;
      case 'fish':
        this.createFishRegions(cx, cy);
        break;
      case 'star':
        this.createStarRegions(cx, cy);
        break;
    }

    this.totalRegions = this.regions.length;

    // Draw outline on top
    this.outlineGraphics = this.add.graphics();
    this.outlineGraphics.lineStyle(3, 0x333333);
    this.regions.forEach(region => {
      this.drawRegionOutline(this.outlineGraphics, region.path);
    });
  }

  private createCatRegions(cx: number, cy: number) {
    // Cat head (large circle area)
    const headPath = this.generateCirclePath(cx, cy - 20, 90, 24);
    this.addRegion(headPath);

    // Cat body (ellipse below head)
    const bodyPath = this.generateEllipsePath(cx, cy + 110, 70, 90, 24);
    this.addRegion(bodyPath);

    // Left ear (triangle)
    const leftEar: { x: number; y: number }[] = [
      { x: cx - 65, y: cy - 80 },
      { x: cx - 95, y: cy - 160 },
      { x: cx - 25, y: cy - 100 },
    ];
    this.addRegion(leftEar);

    // Right ear (triangle)
    const rightEar: { x: number; y: number }[] = [
      { x: cx + 65, y: cy - 80 },
      { x: cx + 95, y: cy - 160 },
      { x: cx + 25, y: cy - 100 },
    ];
    this.addRegion(rightEar);

    // Tail (curved shape approximated as polygon)
    const tailPath: { x: number; y: number }[] = [
      { x: cx + 60, y: cy + 140 },
      { x: cx + 100, y: cy + 100 },
      { x: cx + 140, y: cy + 60 },
      { x: cx + 160, y: cy + 70 },
      { x: cx + 130, y: cy + 110 },
      { x: cx + 90, y: cy + 155 },
    ];
    this.addRegion(tailPath);

    // Face detail area (inner circle on head for nose/mouth area)
    const facePath = this.generateCirclePath(cx, cy + 10, 40, 16);
    this.addRegion(facePath);
  }

  private createFishRegions(cx: number, cy: number) {
    // Fish body (main ellipse)
    const bodyPath = this.generateEllipsePath(cx, cy, 140, 80, 24);
    this.addRegion(bodyPath);

    // Tail fin (triangle on right)
    const tailFin: { x: number; y: number }[] = [
      { x: cx + 130, y: cy },
      { x: cx + 200, y: cy - 60 },
      { x: cx + 200, y: cy + 60 },
    ];
    this.addRegion(tailFin);

    // Top fin
    const topFin: { x: number; y: number }[] = [
      { x: cx - 30, y: cy - 70 },
      { x: cx, y: cy - 140 },
      { x: cx + 40, y: cy - 70 },
    ];
    this.addRegion(topFin);

    // Bottom fin
    const bottomFin: { x: number; y: number }[] = [
      { x: cx - 20, y: cy + 70 },
      { x: cx + 10, y: cy + 120 },
      { x: cx + 40, y: cy + 70 },
    ];
    this.addRegion(bottomFin);

    // Eye area (small circle)
    const eyePath = this.generateCirclePath(cx - 50, cy - 10, 25, 12);
    this.addRegion(eyePath);

    // Stripe on body
    const stripe: { x: number; y: number }[] = [
      { x: cx + 30, y: cy - 60 },
      { x: cx + 55, y: cy - 60 },
      { x: cx + 55, y: cy + 60 },
      { x: cx + 30, y: cy + 60 },
    ];
    this.addRegion(stripe);
  }

  private createStarRegions(cx: number, cy: number) {
    // 5-pointed star split into 5 outer triangles and 1 inner pentagon
    const outerR = 130;
    const innerR = 55;
    const points: { x: number; y: number }[] = [];
    const innerPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 72 - 90) * Math.PI / 180;
      const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
      points.push({ x: cx + Math.cos(outerAngle) * outerR, y: cy + Math.sin(outerAngle) * outerR });
      innerPoints.push({ x: cx + Math.cos(innerAngle) * innerR, y: cy + Math.sin(innerAngle) * innerR });
    }

    // 5 outer triangle regions (each star point)
    for (let i = 0; i < 5; i++) {
      const next = (i + 1) % 5;
      const triangle: { x: number; y: number }[] = [
        points[i],
        innerPoints[i],
        innerPoints[(i + 4) % 5],
      ];
      this.addRegion(triangle);
    }

    // Inner pentagon
    this.addRegion([...innerPoints]);
  }

  private addRegion(path: { x: number; y: number }[]) {
    const graphics = this.add.graphics();
    // Draw initial unfilled region (light gray)
    graphics.fillStyle(0xF5F5F5, 1);
    graphics.beginPath();
    graphics.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      graphics.lineTo(path[i].x, path[i].y);
    }
    graphics.closePath();
    graphics.fillPath();

    // Create hit area polygon
    const flatPoints: number[] = [];
    path.forEach(p => { flatPoints.push(p.x, p.y); });
    const polygon = new Phaser.Geom.Polygon(flatPoints);

    graphics.setInteractive(polygon, Phaser.Geom.Polygon.Contains);
    graphics.input!.cursor = 'pointer';

    const region: ColorRegion = { graphics, path, filled: false, color: null };
    this.regions.push(region);

    graphics.on('pointerdown', () => this.fillRegion(region));
  }

  private fillRegion(region: ColorRegion) {
    if (this.selectedColor === 0) return;

    const wasEmpty = !region.filled;
    region.filled = true;
    region.color = this.selectedColor;

    // Redraw with selected color
    region.graphics.clear();
    region.graphics.fillStyle(this.selectedColor, 1);
    region.graphics.beginPath();
    region.graphics.moveTo(region.path[0].x, region.path[0].y);
    for (let i = 1; i < region.path.length; i++) {
      region.graphics.lineTo(region.path[i].x, region.path[i].y);
    }
    region.graphics.closePath();
    region.graphics.fillPath();

    // Re-draw outline on top
    this.outlineGraphics.clear();
    this.outlineGraphics.lineStyle(3, 0x333333);
    this.regions.forEach(r => {
      this.drawRegionOutline(this.outlineGraphics, r.path);
    });

    // Feedback animation
    this.tweens.add({
      targets: region.graphics,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // Small star feedback
    const centerX = region.path.reduce((sum, p) => sum + p.x, 0) / region.path.length;
    const centerY = region.path.reduce((sum, p) => sum + p.y, 0) / region.path.length;
    this.showFillFeedback(centerX, centerY);

    if (wasEmpty) {
      this.filledCount++;
      if (this.filledCount >= this.totalRegions) {
        this.time.delayedCall(600, () => this.showComplete());
      }
    }
  }

  private showFillFeedback(x: number, y: number) {
    const star = this.add.image(x, y, 'star_gold').setScale(0).setAlpha(0.8);
    this.tweens.add({
      targets: star,
      scale: 0.8,
      alpha: 0,
      y: y - 30,
      duration: 500,
      onComplete: () => star.destroy(),
    });
  }

  private createPalette() {
    const { width, height } = this.scale;
    const colors = [
      0xFF4444, // red
      0xFF9800, // orange
      0xFFEB3B, // yellow
      0x4CAF50, // green
      0x2196F3, // blue
      0x9C27B0, // purple
      0xFF69B4, // pink
      0x795548, // brown
    ];

    const swatchSize = 64;
    const gap = 16;
    const totalW = colors.length * swatchSize + (colors.length - 1) * gap;
    const startX = width / 2 - totalW / 2 + swatchSize / 2;
    const y = height - 80;

    // Palette background
    const paletteBg = this.add.graphics();
    paletteBg.fillStyle(0xffffff, 0.8);
    paletteBg.fillRoundedRect(startX - swatchSize / 2 - 16, y - swatchSize / 2 - 12, totalW + 32, swatchSize + 24, 16);

    // Color indicator (shows selected color)
    this.colorIndicator = this.add.graphics();

    colors.forEach((color, i) => {
      const x = startX + i * (swatchSize + gap);

      const swatch = this.add.graphics();
      swatch.fillStyle(color);
      swatch.fillRoundedRect(x - swatchSize / 2, y - swatchSize / 2, swatchSize, swatchSize, 12);
      swatch.lineStyle(3, 0xffffff);
      swatch.strokeRoundedRect(x - swatchSize / 2, y - swatchSize / 2, swatchSize, swatchSize, 12);

      const hitArea = new Phaser.Geom.Rectangle(x - swatchSize / 2, y - swatchSize / 2, swatchSize, swatchSize);
      swatch.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      swatch.input!.cursor = 'pointer';

      swatch.on('pointerdown', () => {
        this.selectedColor = color;
        this.updateColorIndicator(x, y, swatchSize);

        // Bounce animation
        this.tweens.add({
          targets: swatch,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 100,
          yoyo: true,
          ease: 'Back.easeOut',
        });
      });
    });
  }

  private updateColorIndicator(x: number, y: number, size: number) {
    this.colorIndicator.clear();
    this.colorIndicator.lineStyle(5, 0x333333);
    this.colorIndicator.strokeRoundedRect(x - size / 2 - 4, y - size / 2 - 4, size + 8, size + 8, 14);
  }

  private drawRegionOutline(graphics: Phaser.GameObjects.Graphics, path: { x: number; y: number }[]) {
    graphics.beginPath();
    graphics.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      graphics.lineTo(path[i].x, path[i].y);
    }
    graphics.closePath();
    graphics.strokePath();
  }

  private generateCirclePath(cx: number, cy: number, radius: number, segments: number): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      path.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    }
    return path;
  }

  private generateEllipsePath(cx: number, cy: number, rx: number, ry: number, segments: number): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      path.push({
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
      });
    }
    return path;
  }

  private showComplete() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 120, 400, 240, 24);

    this.add.text(width / 2, height / 2 - 60, '🎉 完成！画得真棒！', {
      fontSize: '34px',
      color: '#FF6B35',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    for (let i = 0; i < 3; i++) {
      const star = this.add.image(width / 2 - 50 + i * 50, height / 2, 'star_gold');
      star.setScale(0);
      this.tweens.add({
        targets: star,
        scale: 1,
        duration: 300,
        delay: i * 200,
        ease: 'Back.easeOut',
      });
    }

    const nextBtn = this.add.text(width / 2, height / 2 + 70, '再来一次 🔄', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#2196F3',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => this.scene.restart());
  }
}
