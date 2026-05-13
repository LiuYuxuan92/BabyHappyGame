import Phaser from 'phaser';

interface ShapeDef {
  type: string;
  label: string;
  color: number;
}

interface ShapeHole {
  x: number;
  y: number;
  type: string;
  filled: boolean;
}

export class ShapeGame extends Phaser.Scene {
  private placedCount = 0;
  private totalShapes = 0;
  private level = 1;
  private holes: ShapeHole[] = [];

  constructor() {
    super({ key: 'ShapeGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.placedCount = 0;
    this.holes = [];

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xE8EAF6, 0xE8EAF6, 0xC5CAE9, 0xC5CAE9);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '🔷 形状配对', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Level indicator
    this.add.text(width - 20, 35, `第 ${this.level} 关`, {
      fontSize: '22px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(1, 0.5);

    this.createLevel();

    // Instruction
    this.add.text(width / 2, height - 20, '把形状拖到对应的位置', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private createLevel() {
    const { width, height } = this.scale;

    const allShapes: ShapeDef[] = [
      { type: 'circle', label: '圆形', color: 0xFF4444 },
      { type: 'square', label: '正方形', color: 0x2196F3 },
      { type: 'triangle', label: '三角形', color: 0x4CAF50 },
      { type: 'star', label: '星形', color: 0xFFEB3B },
      { type: 'hexagon', label: '六边形', color: 0x9C27B0 },
    ];

    // Progressive difficulty: 3 shapes at level 1, 4 at level 2, 5 at level 3+
    const shapeCount = Math.min(3 + (this.level - 1), 5);
    const shuffled = Phaser.Utils.Array.Shuffle([...allShapes]);
    const selected = shuffled.slice(0, shapeCount);
    this.totalShapes = shapeCount;

    // Create holes at the bottom
    const holeY = height - 160;
    const holeGap = width / (shapeCount + 1);

    selected.forEach((shape, i) => {
      const x = holeGap * (i + 1);
      this.createHole(x, holeY, shape);
      this.holes.push({ x, y: holeY, type: shape.type, filled: false });
    });

    // Create draggable pieces scattered at top
    const shuffledPieces = Phaser.Utils.Array.Shuffle([...selected]);
    const pieceY = 180;
    const pieceGap = width / (shapeCount + 1);

    shuffledPieces.forEach((shape, i) => {
      const x = pieceGap * (i + 1) + Phaser.Math.Between(-30, 30);
      const y = pieceY + Phaser.Math.Between(-40, 40);
      this.createPiece(x, y, shape);
    });
  }

  private createHole(x: number, y: number, shape: ShapeDef) {
    const g = this.add.graphics();
    g.lineStyle(4, 0x9E9E9E, 0.8);
    g.fillStyle(0xE0E0E0, 0.4);

    this.drawShape(g, 0, 0, shape.type, 50, true);
    g.setPosition(x, y);

    // Label below hole
    this.add.text(x, y + 70, shape.label, {
      fontSize: '18px',
      color: '#777777',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private createPiece(x: number, y: number, shape: ShapeDef) {
    const container = this.add.container(x, y);

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.1);
    this.drawShapeFill(shadow, 3, 3, shape.type, 50);
    container.add(shadow);

    // Main shape
    const g = this.add.graphics();
    g.fillStyle(shape.color, 1);
    this.drawShapeFill(g, 0, 0, shape.type, 50);
    g.lineStyle(4, this.darkenColor(shape.color));
    this.drawShapeStroke(g, 0, 0, shape.type, 50);
    container.add(g);

    // Hit area - large enough for small fingers
    const hitSize = 120;
    const hitArea = this.add.rectangle(0, 0, hitSize, hitSize, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true, draggable: true });
    container.add(hitArea);

    container.setData('shapeType', shape.type);

    hitArea.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      container.x = dragX;
      container.y = dragY;
    });

    hitArea.on('dragstart', () => {
      container.setDepth(10);
      this.tweens.add({
        targets: container,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
      });
    });

    hitArea.on('dragend', () => {
      container.setDepth(0);
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });

      this.checkPlacement(container, shape);
    });
  }

  private checkPlacement(container: Phaser.GameObjects.Container, shape: ShapeDef) {
    // Find matching hole
    const matchingHole = this.holes.find(h => h.type === shape.type && !h.filled);
    if (!matchingHole) return;

    const dist = Phaser.Math.Distance.Between(container.x, container.y, matchingHole.x, matchingHole.y);

    if (dist < 70) {
      matchingHole.filled = true;

      // Disable interaction on the hit area
      const hitArea = container.list[container.list.length - 1] as Phaser.GameObjects.Rectangle;
      hitArea.disableInteractive();

      // Snap into place
      this.tweens.add({
        targets: container,
        x: matchingHole.x,
        y: matchingHole.y,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });

      // Success feedback
      this.showCorrectFeedback(matchingHole.x, matchingHole.y);

      this.placedCount++;
      if (this.placedCount >= this.totalShapes) {
        this.time.delayedCall(600, () => this.showComplete());
      }
    }
  }

  private showCorrectFeedback(x: number, y: number) {
    const star = this.add.image(x, y - 40, 'star_gold').setScale(0);
    this.tweens.add({
      targets: star,
      scale: 1,
      alpha: 0,
      y: y - 70,
      duration: 500,
      onComplete: () => star.destroy(),
    });

    // Checkmark text
    const check = this.add.text(x, y, '✓', {
      fontSize: '36px',
      color: '#4CAF50',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: check,
      alpha: 1,
      scale: 1.3,
      duration: 200,
      yoyo: true,
      onComplete: () => check.destroy(),
    });
  }

  private drawShape(g: Phaser.GameObjects.Graphics, cx: number, cy: number, type: string, size: number, isHole: boolean) {
    if (isHole) {
      this.drawShapeFill(g, cx, cy, type, size);
      this.drawShapeStroke(g, cx, cy, type, size);
    } else {
      this.drawShapeFill(g, cx, cy, type, size);
      this.drawShapeStroke(g, cx, cy, type, size);
    }
  }

  private drawShapeFill(g: Phaser.GameObjects.Graphics, cx: number, cy: number, type: string, size: number) {
    switch (type) {
      case 'circle':
        g.fillCircle(cx, cy, size);
        break;
      case 'square':
        g.fillRect(cx - size, cy - size, size * 2, size * 2);
        break;
      case 'triangle': {
        const triPoints = this.getTrianglePoints(cx, cy, size);
        g.fillTriangle(triPoints[0].x, triPoints[0].y, triPoints[1].x, triPoints[1].y, triPoints[2].x, triPoints[2].y);
        break;
      }
      case 'star': {
        g.beginPath();
        const starPts = this.getStarPoints(cx, cy, size, size * 0.45);
        g.moveTo(starPts[0].x, starPts[0].y);
        for (let i = 1; i < starPts.length; i++) {
          g.lineTo(starPts[i].x, starPts[i].y);
        }
        g.closePath();
        g.fillPath();
        break;
      }
      case 'hexagon': {
        g.beginPath();
        const hexPts = this.getHexagonPoints(cx, cy, size);
        g.moveTo(hexPts[0].x, hexPts[0].y);
        for (let i = 1; i < hexPts.length; i++) {
          g.lineTo(hexPts[i].x, hexPts[i].y);
        }
        g.closePath();
        g.fillPath();
        break;
      }
    }
  }

  private drawShapeStroke(g: Phaser.GameObjects.Graphics, cx: number, cy: number, type: string, size: number) {
    switch (type) {
      case 'circle':
        g.strokeCircle(cx, cy, size);
        break;
      case 'square':
        g.strokeRect(cx - size, cy - size, size * 2, size * 2);
        break;
      case 'triangle': {
        const triPoints = this.getTrianglePoints(cx, cy, size);
        g.beginPath();
        g.moveTo(triPoints[0].x, triPoints[0].y);
        g.lineTo(triPoints[1].x, triPoints[1].y);
        g.lineTo(triPoints[2].x, triPoints[2].y);
        g.closePath();
        g.strokePath();
        break;
      }
      case 'star': {
        g.beginPath();
        const starPts = this.getStarPoints(cx, cy, size, size * 0.45);
        g.moveTo(starPts[0].x, starPts[0].y);
        for (let i = 1; i < starPts.length; i++) {
          g.lineTo(starPts[i].x, starPts[i].y);
        }
        g.closePath();
        g.strokePath();
        break;
      }
      case 'hexagon': {
        g.beginPath();
        const hexPts = this.getHexagonPoints(cx, cy, size);
        g.moveTo(hexPts[0].x, hexPts[0].y);
        for (let i = 1; i < hexPts.length; i++) {
          g.lineTo(hexPts[i].x, hexPts[i].y);
        }
        g.closePath();
        g.strokePath();
        break;
      }
    }
  }

  private getTrianglePoints(cx: number, cy: number, size: number): { x: number; y: number }[] {
    return [
      { x: cx, y: cy - size },
      { x: cx - size, y: cy + size * 0.7 },
      { x: cx + size, y: cy + size * 0.7 },
    ];
  }

  private getStarPoints(cx: number, cy: number, outerR: number, innerR: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * 36 - 90) * Math.PI / 180;
      const r = i % 2 === 0 ? outerR : innerR;
      points.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    }
    return points;
  }

  private getHexagonPoints(cx: number, cy: number, size: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 - 30) * Math.PI / 180;
      points.push({
        x: cx + Math.cos(angle) * size,
        y: cy + Math.sin(angle) * size,
      });
    }
    return points;
  }

  private darkenColor(color: number): number {
    const r = Math.max(0, ((color >> 16) & 0xFF) - 40);
    const g = Math.max(0, ((color >> 8) & 0xFF) - 40);
    const b = Math.max(0, (color & 0xFF) - 40);
    return (r << 16) | (g << 8) | b;
  }

  private showComplete() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 130, 400, 260, 24);

    this.add.text(width / 2, height / 2 - 70, '🎉 全部放对了！', {
      fontSize: '34px',
      color: '#2196F3',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stars based on level
    const stars = Math.min(this.level, 3);
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(width / 2 - 50 + i * 50, height / 2 - 10, i < stars ? 'star_gold' : 'star_gold');
      star.setScale(0);
      star.setAlpha(i < stars ? 1 : 0.3);
      this.tweens.add({
        targets: star,
        scale: 1,
        duration: 300,
        delay: i * 200,
        ease: 'Back.easeOut',
      });
    }

    this.add.text(width / 2, height / 2 + 40, `第 ${this.level} 关完成`, {
      fontSize: '20px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    const nextBtn = this.add.text(width / 2, height / 2 + 85, '下一关 ▶', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#4CAF50',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => {
      this.level++;
      if (this.level > 3) this.level = 1;
      this.scene.restart();
    });
  }
}
