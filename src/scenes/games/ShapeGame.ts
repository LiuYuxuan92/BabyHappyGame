import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene } from '../../components/GameExperience';
import { showConfetti, showStarBurst } from '../../components/Particles';
import { saveStars } from '../../utils/storage';
import { VoiceFeedback } from '../../components/VoiceFeedback';

type ShapeType = 'circle' | 'square' | 'triangle' | 'star' | 'hexagon' | 'diamond' | 'oval' | 'heart';

interface ShapeDef {
  type: ShapeType;
  label: string;
  color: number;
  fact: string;
}

interface ShapeHole {
  x: number;
  y: number;
  type: ShapeType;
  label: string;
  filled: boolean;
  glow: Phaser.GameObjects.Graphics;
}

interface ShapePiece {
  container: Phaser.GameObjects.Container;
  shape: ShapeDef;
  originalX: number;
  originalY: number;
  placed: boolean;
}

export class ShapeGame extends Phaser.Scene {
  private audio!: AudioManager;
  private placedCount = 0;
  private totalShapes = 0;
  private level = 1;
  private holes: ShapeHole[] = [];
  private pieces: ShapePiece[] = [];
  private progressText!: Phaser.GameObjects.Text;
  private factText!: Phaser.GameObjects.Text;
  private hintTween?: Phaser.Tweens.Tween;

  private readonly allShapes: ShapeDef[] = [
    { type: 'circle', label: '圆形', color: 0xFF5252, fact: '圆形没有尖角，像太阳和皮球。' },
    { type: 'square', label: '正方形', color: 0x42A5F5, fact: '正方形有四条一样长的边。' },
    { type: 'triangle', label: '三角形', color: 0x66BB6A, fact: '三角形有三个角，像小屋顶。' },
    { type: 'star', label: '星形', color: 0xFFD54F, fact: '星形有尖尖的角，像夜空里的星星。' },
    { type: 'hexagon', label: '六边形', color: 0xAB47BC, fact: '六边形有六条边，像蜂巢格子。' },
    { type: 'diamond', label: '菱形', color: 0x26C6DA, fact: '菱形像转了一下的正方形。' },
    { type: 'oval', label: '椭圆形', color: 0xFF8A65, fact: '椭圆形圆圆长长，像鸡蛋。' },
    { type: 'heart', label: '爱心形', color: 0xEC407A, fact: '爱心形上面圆圆，下面尖尖。' },
  ];

  constructor() {
    super({ key: 'ShapeGame' });
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);

    const { width, height } = this.scale;
    this.placedCount = 0;
    this.holes = [];
    this.pieces = [];

    this.drawBackground(width, height);

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 35, '形状认知乐园', {
      fontSize: '34px',
      color: '#283593',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'ShapeGame');

    this.add.text(width - 24, 28, `第 ${this.level} 关`, {
      fontSize: '22px',
      color: '#5C6BC0',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 12, y: 6 },
    }).setOrigin(1, 0.5);

    this.progressText = this.add.text(width - 24, 66, '0/0', {
      fontSize: '18px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this.factText = this.add.text(width / 2, height - 22, '拖动形状，放到一样的轮廓里', {
      fontSize: '18px',
      color: '#6D4C41',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 18, y: 7 },
    }).setOrigin(0.5);

    this.createLevel();
    this.createHintButton(width);
  }

  private drawBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xE3F2FD, 0xF3E5F5, 0xFFF8E1, 0xE8F5E9);
    bg.fillRect(0, 0, width, height);

    bg.fillStyle(0xffffff, 0.24);
    for (let i = 0; i < 16; i++) {
      const x = Phaser.Math.Between(70, width - 70);
      const y = Phaser.Math.Between(86, height - 120);
      const size = Phaser.Math.Between(18, 44);
      if (i % 3 === 0) bg.fillCircle(x, y, size);
      else if (i % 3 === 1) bg.fillRoundedRect(x - size, y - size, size * 2, size * 2, 14);
      else bg.fillTriangle(x, y - size, x - size, y + size, x + size, y + size);
    }

    const shelf = this.add.graphics();
    shelf.fillStyle(0xFFFFFF, 0.55);
    shelf.fillRoundedRect(68, 92, width - 136, 170, 34);
    shelf.fillRoundedRect(68, height - 245, width - 136, 158, 34);
    shelf.lineStyle(4, 0xFFFFFF, 0.65);
    shelf.strokeRoundedRect(68, 92, width - 136, 170, 34);
    shelf.strokeRoundedRect(68, height - 245, width - 136, 158, 34);
  }

  private createLevel(): void {
    const { width, height } = this.scale;
    const shapeCount = Math.min(3 + this.level, 6);
    const selected = Phaser.Utils.Array.Shuffle([...this.allShapes]).slice(0, shapeCount);
    this.totalShapes = selected.length;
    this.updateProgress();

    const holeY = height - 168;
    const holeGap = (width - 180) / (shapeCount - 1 || 1);
    const startHoleX = width / 2 - ((shapeCount - 1) * holeGap) / 2;

    selected.forEach((shape, i) => {
      const x = startHoleX + i * holeGap;
      this.createHole(x, holeY, shape);
    });

    const shuffledPieces = Phaser.Utils.Array.Shuffle([...selected]);
    const pieceY = 176;
    const pieceGap = (width - 210) / (shapeCount - 1 || 1);
    const startPieceX = width / 2 - ((shapeCount - 1) * pieceGap) / 2;

    shuffledPieces.forEach((shape, i) => {
      const x = startPieceX + i * pieceGap + Phaser.Math.Between(-18, 18);
      const y = pieceY + Phaser.Math.Between(-18, 18);
      this.createPiece(x, y, shape, i);
    });
  }

  private createHole(x: number, y: number, shape: ShapeDef): void {
    const glow = this.add.graphics();
    glow.fillStyle(shape.color, 0.14);
    this.drawShapeFill(glow, x, y, shape.type, 62);
    glow.setAlpha(0);

    const plate = this.add.graphics();
    plate.fillStyle(0xffffff, 0.86);
    plate.fillRoundedRect(x - 74, y - 74, 148, 148, 24);
    plate.lineStyle(3, shape.color, 0.55);
    plate.strokeRoundedRect(x - 74, y - 74, 148, 148, 24);

    const outline = this.add.graphics();
    outline.lineStyle(5, 0x78909C, 0.72);
    outline.fillStyle(0xECEFF1, 0.42);
    this.drawShapeFill(outline, x, y - 8, shape.type, 48);
    this.drawShapeStroke(outline, x, y - 8, shape.type, 48);

    this.add.text(x, y + 58, shape.label, {
      fontSize: '18px',
      color: '#546E7A',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.holes.push({ x, y: y - 8, type: shape.type, label: shape.label, filled: false, glow });
  }

  private createPiece(x: number, y: number, shape: ShapeDef, index: number): void {
    const container = this.add.container(x, y);
    container.setSize(122, 122);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-61, -61, 122, 122),
      Phaser.Geom.Rectangle.Contains
    );
    this.input.setDraggable(container);
    container.setData('shapeType', shape.type);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.11);
    this.drawShapeFill(shadow, 5, 7, shape.type, 46);

    const body = this.add.graphics();
    body.fillStyle(shape.color, 1);
    this.drawShapeFill(body, 0, 0, shape.type, 48);
    body.lineStyle(5, this.darkenColor(shape.color), 0.85);
    this.drawShapeStroke(body, 0, 0, shape.type, 48);

    const shine = this.add.graphics();
    shine.fillStyle(0xffffff, 0.32);
    shine.fillCircle(-18, -20, 13);

    const label = this.add.text(0, 64, shape.label, {
      fontSize: '17px',
      color: '#37474F',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    container.add([shadow, body, shine, label]);
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 320,
      delay: index * 110,
      ease: 'Back.easeOut',
    });

    const piece: ShapePiece = { container, shape, originalX: x, originalY: y, placed: false };
    this.pieces.push(piece);

    container.on('pointerdown', () => {
      if (piece.placed) return;
      this.audio.playTap();
      this.factText.setText(shape.fact);
      this.highlightHole(shape.type);
    });

    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj !== container || piece.placed) return;
      this.audio.playDrag();
      container.setDepth(20);
      this.highlightHole(shape.type);
      this.tweens.add({ targets: container, scale: 1.12, duration: 110, ease: 'Sine.easeOut' });
    });

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      if (obj !== container || piece.placed) return;
      container.setPosition(dragX, dragY);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj !== container || piece.placed) return;
      container.setDepth(1);
      this.stopHint();
      this.checkPlacement(piece);
    });
  }

  private checkPlacement(piece: ShapePiece): void {
    const matchingHole = this.holes.find(hole => hole.type === piece.shape.type && !hole.filled);
    if (!matchingHole) return;

    const dist = Phaser.Math.Distance.Between(piece.container.x, piece.container.y, matchingHole.x, matchingHole.y);
    if (dist < 82) {
      matchingHole.filled = true;
      piece.placed = true;
      piece.container.disableInteractive();
      this.audio.playSuccess();
      VoiceFeedback.speak(`${piece.shape.label}，答对了`);

      this.tweens.add({
        targets: piece.container,
        x: matchingHole.x,
        y: matchingHole.y,
        scale: 0.92,
        duration: 220,
        ease: 'Back.easeOut',
        onComplete: () => {
          showStarBurst(this, matchingHole.x, matchingHole.y);
        },
      });

      matchingHole.glow.setAlpha(1);
      this.tweens.add({ targets: matchingHole.glow, alpha: 0.28, duration: 260, yoyo: true, repeat: 1 });
      this.placedCount++;
      this.updateProgress();
      this.factText.setText(piece.shape.fact);

      if (this.placedCount >= this.totalShapes) {
        this.time.delayedCall(650, () => this.showComplete());
      }
      return;
    }

    this.audio.playWrong();
    VoiceFeedback.speak('找一样的轮廓试试看');
    this.factText.setText(`找一找 ${piece.shape.label} 的轮廓`);
    this.tweens.add({
      targets: piece.container,
      x: piece.originalX,
      y: piece.originalY,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private createHintButton(width: number): void {
    const btn = this.add.text(96, 68, '提示', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#5C6BC0',
      padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.audio.playTap();
      const next = this.pieces.find(piece => !piece.placed);
      if (!next) return;
      this.factText.setText(`提示：把 ${next.shape.label} 放到同样的轮廓里`);
      this.highlightHole(next.shape.type);
    });

    this.add.text(width / 2, 72, '认识形状、听小知识、拖到对应轮廓', {
      fontSize: '18px',
      color: '#5D4037',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private highlightHole(type: ShapeType): void {
    this.stopHint();
    const hole = this.holes.find(item => item.type === type && !item.filled);
    if (!hole) return;
    hole.glow.setAlpha(0.18);
    this.hintTween = this.tweens.add({
      targets: hole.glow,
      alpha: 0.72,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopHint(): void {
    if (this.hintTween) {
      this.hintTween.stop();
      this.hintTween = undefined;
    }
    this.holes.forEach(hole => {
      if (!hole.filled) hole.glow.setAlpha(0);
    });
  }

  private updateProgress(): void {
    if (this.progressText) {
      this.progressText.setText(`${this.placedCount}/${this.totalShapes}`);
    }
  }

  private showComplete(): void {
    this.audio.playComplete();
    saveStars('ShapeGame', Math.min(this.level, 3));
    const { width, height } = this.scale;
    showConfetti(this);

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4).setDepth(100);

    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -145, 440, 290, 28);
    bg.lineStyle(5, 0x5C6BC0, 0.72);
    bg.strokeRoundedRect(-220, -145, 440, 290, 28);
    panel.add(bg);

    panel.add(this.add.text(0, -86, '全部放对了!', {
      fontSize: '38px',
      color: '#3949AB',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    const stars = Math.min(this.level, 3);
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(-54 + i * 54, -22, i < stars ? 'star_gold' : 'star_gray');
      star.setScale(0);
      panel.add(star);
      this.tweens.add({ targets: star, scale: 1, duration: 300, delay: i * 170, ease: 'Back.easeOut' });
    }

    panel.add(this.add.text(0, 36, `认识了 ${this.totalShapes} 个形状`, {
      fontSize: '22px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    const nextBtn = this.add.text(0, 94, this.level >= 4 ? '再玩一次' : '下一关', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#4CAF50',
      padding: { x: 34, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    nextBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.level = this.level >= 4 ? 1 : this.level + 1;
      this.scene.restart();
    });
    panel.add(nextBtn);

    panel.setScale(0.82).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }

  private drawShapeFill(g: Phaser.GameObjects.Graphics, cx: number, cy: number, type: ShapeType, size: number): void {
    switch (type) {
      case 'circle':
        g.fillCircle(cx, cy, size);
        break;
      case 'square':
        g.fillRoundedRect(cx - size, cy - size, size * 2, size * 2, 12);
        break;
      case 'triangle': {
        const pts = this.getTrianglePoints(cx, cy, size);
        g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
        break;
      }
      case 'star':
        this.fillPolygon(g, this.getStarPoints(cx, cy, size, size * 0.45));
        break;
      case 'hexagon':
        this.fillPolygon(g, this.getRegularPolygonPoints(cx, cy, size, 6, -30));
        break;
      case 'diamond':
        this.fillPolygon(g, [
          { x: cx, y: cy - size },
          { x: cx + size * 0.82, y: cy },
          { x: cx, y: cy + size },
          { x: cx - size * 0.82, y: cy },
        ]);
        break;
      case 'oval':
        g.fillEllipse(cx, cy, size * 1.55, size * 1.08);
        break;
      case 'heart':
        this.fillPolygon(g, this.getHeartPoints(cx, cy, size));
        break;
    }
  }

  private drawShapeStroke(g: Phaser.GameObjects.Graphics, cx: number, cy: number, type: ShapeType, size: number): void {
    switch (type) {
      case 'circle':
        g.strokeCircle(cx, cy, size);
        break;
      case 'square':
        g.strokeRoundedRect(cx - size, cy - size, size * 2, size * 2, 12);
        break;
      case 'triangle':
        this.strokePolygon(g, this.getTrianglePoints(cx, cy, size));
        break;
      case 'star':
        this.strokePolygon(g, this.getStarPoints(cx, cy, size, size * 0.45));
        break;
      case 'hexagon':
        this.strokePolygon(g, this.getRegularPolygonPoints(cx, cy, size, 6, -30));
        break;
      case 'diamond':
        this.strokePolygon(g, [
          { x: cx, y: cy - size },
          { x: cx + size * 0.82, y: cy },
          { x: cx, y: cy + size },
          { x: cx - size * 0.82, y: cy },
        ]);
        break;
      case 'oval':
        g.strokeEllipse(cx, cy, size * 1.55, size * 1.08);
        break;
      case 'heart':
        this.strokePolygon(g, this.getHeartPoints(cx, cy, size));
        break;
    }
  }

  private fillPolygon(g: Phaser.GameObjects.Graphics, points: { x: number; y: number }[]): void {
    g.beginPath();
    points.forEach((point, index) => {
      if (index === 0) g.moveTo(point.x, point.y);
      else g.lineTo(point.x, point.y);
    });
    g.closePath();
    g.fillPath();
  }

  private strokePolygon(g: Phaser.GameObjects.Graphics, points: { x: number; y: number }[]): void {
    g.beginPath();
    points.forEach((point, index) => {
      if (index === 0) g.moveTo(point.x, point.y);
      else g.lineTo(point.x, point.y);
    });
    g.closePath();
    g.strokePath();
  }

  private getTrianglePoints(cx: number, cy: number, size: number): { x: number; y: number }[] {
    return [
      { x: cx, y: cy - size },
      { x: cx - size, y: cy + size * 0.78 },
      { x: cx + size, y: cy + size * 0.78 },
    ];
  }

  private getStarPoints(cx: number, cy: number, outerR: number, innerR: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? outerR : innerR;
      points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
    }
    return points;
  }

  private getRegularPolygonPoints(cx: number, cy: number, radius: number, sides: number, rotateDeg = 0): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const rotate = Phaser.Math.DegToRad(rotateDeg);
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 + rotate;
      points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
    }
    return points;
  }

  private getHeartPoints(cx: number, cy: number, size: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 36; i++) {
      const t = (i / 36) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      points.push({ x: cx + (x * size) / 18, y: cy + (y * size) / 18 });
    }
    return points;
  }

  private darkenColor(color: number): number {
    const r = Math.max(0, ((color >> 16) & 0xFF) - 44);
    const g = Math.max(0, ((color >> 8) & 0xFF) - 44);
    const b = Math.max(0, (color & 0xFF) - 44);
    return (r << 16) | (g << 8) | b;
  }
}
