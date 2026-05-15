import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';

interface ColorRegion {
  graphics: Phaser.GameObjects.Graphics;
  path: Point[];
  filled: boolean;
  color: number | null;
  name: string;
}

interface FillHistory {
  region: ColorRegion;
  filled: boolean;
  color: number | null;
}

interface ColoringPage {
  key: PageKey;
  label: string;
  accent: number;
}

type PageKey = 'cat' | 'fish' | 'star' | 'rocket';
type Point = { x: number; y: number };

const PAGES: ColoringPage[] = [
  { key: 'cat', label: '小猫', accent: 0xEC407A },
  { key: 'fish', label: '小鱼', accent: 0x00ACC1 },
  { key: 'star', label: '星星', accent: 0xFFD54F },
  { key: 'rocket', label: '火箭', accent: 0x7E57C2 },
];

const COLORS = [
  0xF44336,
  0xFF7043,
  0xFFCA28,
  0x66BB6A,
  0x26A69A,
  0x42A5F5,
  0x5C6BC0,
  0xAB47BC,
  0xEC407A,
  0x8D6E63,
  0x90A4AE,
  0xFFFFFF,
];

export class ColoringGame extends Phaser.Scene {
  private regions: ColorRegion[] = [];
  private history: FillHistory[] = [];
  private selectedColor = COLORS[0];
  private filledCount = 0;
  private totalRegions = 0;
  private pageIndex = 0;
  private colorIndicator!: Phaser.GameObjects.Graphics;
  private outlineGraphics!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private pageText!: Phaser.GameObjects.Text;
  private canvasLayer!: Phaser.GameObjects.Container;
  private audio!: AudioManager;

  constructor() {
    super({ key: 'ColoringGame' });
  }

  init(data?: { pageIndex?: number }) {
    this.pageIndex = data?.pageIndex ?? Phaser.Math.Between(0, PAGES.length - 1);
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);

    const { width, height } = this.scale;
    this.regions = [];
    this.history = [];
    this.filledCount = 0;
    this.selectedColor = COLORS[0];

    this.drawBackground(width, height);

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '涂色小画室', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'ColoringGame');

    this.pageText = this.add.text(width / 2, 70, '', {
      fontSize: '20px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.progressText = this.add.text(width - 24, 34, '', {
      fontSize: '19px',
      color: '#455A64',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#ffffffdd',
      padding: { x: 12, y: 7 },
    }).setOrigin(1, 0.5);

    this.createCanvasShell();
    this.createPage(PAGES[this.pageIndex].key);
    this.createPalette();
    this.createTools();
    this.updateProgress();
  }

  private drawBackground(width: number, height: number) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFFF8E1, 0xE1F5FE, 0xFCE4EC, 0xE8F5E9);
    bg.fillRect(0, 0, width, height);

    bg.fillStyle(0xffffff, 0.24);
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(80, width - 80);
      const y = Phaser.Math.Between(100, height - 130);
      bg.fillCircle(x, y, Phaser.Math.Between(16, 38));
    }
  }

  private createCanvasShell() {
    const { width, height } = this.scale;
    const frame = this.add.graphics();
    frame.fillStyle(0xffffff, 0.82);
    frame.fillRoundedRect(90, 92, width - 180, height - 215, 30);
    frame.lineStyle(5, PAGES[this.pageIndex].accent, 0.5);
    frame.strokeRoundedRect(90, 92, width - 180, height - 215, 30);

    this.canvasLayer = this.add.container(0, 0);
  }

  private createPage(type: PageKey) {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2 - 34;
    this.pageText.setText(`${this.pageIndex + 1}/${PAGES.length}  ${PAGES[this.pageIndex].label}画稿 · 点区域上色`);

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
      case 'rocket':
        this.createRocketRegions(cx, cy);
        break;
    }

    this.totalRegions = this.regions.length;
    this.outlineGraphics = this.add.graphics();
    this.canvasLayer.add(this.outlineGraphics);
    this.drawAllOutlines();
  }

  private addRegion(path: Point[], name: string) {
    const graphics = this.add.graphics();
    this.canvasLayer.add(graphics);

    const region: ColorRegion = { graphics, path, filled: false, color: null, name };
    this.regions.push(region);
    this.paintRegion(region, 0xF7F9FC, false);

    const flatPoints: number[] = [];
    path.forEach(point => flatPoints.push(point.x, point.y));
    const polygon = new Phaser.Geom.Polygon(flatPoints);
    graphics.setInteractive(polygon, Phaser.Geom.Polygon.Contains);
    graphics.input!.cursor = 'pointer';
    graphics.on('pointerdown', () => this.fillRegion(region));
  }

  private fillRegion(region: ColorRegion) {
    this.history.push({ region, filled: region.filled, color: region.color });
    const wasEmpty = !region.filled;
    region.filled = true;
    region.color = this.selectedColor;
    this.paintRegion(region, this.selectedColor);
    this.audio.playSuccess();

    const center = this.getRegionCenter(region);
    this.showFillFeedback(center.x, center.y, region.name);

    if (wasEmpty) {
      this.filledCount++;
      this.updateProgress();
      if (this.filledCount >= this.totalRegions) {
        this.time.delayedCall(550, () => this.showComplete());
      }
    }
  }

  private paintRegion(region: ColorRegion, color: number, redrawOutline = true) {
    region.graphics.clear();
    region.graphics.fillStyle(color, 1);
    region.graphics.beginPath();
    region.graphics.moveTo(region.path[0].x, region.path[0].y);
    for (let i = 1; i < region.path.length; i++) {
      region.graphics.lineTo(region.path[i].x, region.path[i].y);
    }
    region.graphics.closePath();
    region.graphics.fillPath();

    if (redrawOutline) this.drawAllOutlines();
  }

  private drawAllOutlines() {
    if (!this.outlineGraphics) return;
    this.outlineGraphics.clear();
    this.outlineGraphics.lineStyle(4, 0x263238, 0.85);
    this.regions.forEach(region => this.drawRegionOutline(this.outlineGraphics, region.path));
  }

  private showFillFeedback(x: number, y: number, label: string) {
    const star = this.add.image(x, y, 'star_gold').setDepth(30).setScale(0).setAlpha(0.82);
    this.tweens.add({
      targets: star,
      scale: 0.95,
      alpha: 0,
      y: y - 36,
      duration: 540,
      onComplete: () => star.destroy(),
    });

    const text = this.add.text(x, y - 28, label, {
      fontSize: '16px',
      color: '#455A64',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#ffffffdd',
      padding: { x: 7, y: 3 },
    }).setOrigin(0.5).setDepth(31);
    this.tweens.add({ targets: text, y: y - 56, alpha: 0, duration: 720, onComplete: () => text.destroy() });
  }

  private createPalette() {
    const { width, height } = this.scale;
    const swatchSize = 44;
    const gap = 12;
    const totalW = COLORS.length * swatchSize + (COLORS.length - 1) * gap;
    const startX = width / 2 - totalW / 2 + swatchSize / 2;
    const y = height - 82;

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.86);
    bg.fillRoundedRect(startX - swatchSize / 2 - 18, y - swatchSize / 2 - 14, totalW + 36, swatchSize + 28, 18);
    bg.lineStyle(3, 0xffffff, 0.6);
    bg.strokeRoundedRect(startX - swatchSize / 2 - 18, y - swatchSize / 2 - 14, totalW + 36, swatchSize + 28, 18);

    this.colorIndicator = this.add.graphics();

    COLORS.forEach((color, index) => {
      const x = startX + index * (swatchSize + gap);
      const swatch = this.add.graphics();
      swatch.fillStyle(color);
      swatch.fillRoundedRect(x - swatchSize / 2, y - swatchSize / 2, swatchSize, swatchSize, 12);
      swatch.lineStyle(3, color === 0xFFFFFF ? 0xCFD8DC : 0xffffff);
      swatch.strokeRoundedRect(x - swatchSize / 2, y - swatchSize / 2, swatchSize, swatchSize, 12);

      swatch.setInteractive(new Phaser.Geom.Rectangle(x - swatchSize / 2, y - swatchSize / 2, swatchSize, swatchSize), Phaser.Geom.Rectangle.Contains);
      swatch.input!.cursor = 'pointer';
      swatch.on('pointerdown', () => {
        this.selectedColor = color;
        this.audio.playTap();
        this.updateColorIndicator(x, y, swatchSize);
        this.tweens.add({ targets: swatch, scaleX: 1.18, scaleY: 1.18, duration: 110, yoyo: true, ease: 'Back.easeOut' });
      });

      if (index === 0) this.time.delayedCall(20, () => this.updateColorIndicator(x, y, swatchSize));
    });
  }

  private createTools() {
    const { height } = this.scale;
    const tools = [
      { label: '撤销', x: 122, color: '#42A5F5', action: () => this.undoFill() },
      { label: '清空', x: 218, color: '#EF5350', action: () => this.clearPage() },
      { label: '换图', x: 314, color: '#66BB6A', action: () => this.nextPage() },
    ];

    tools.forEach(tool => {
      const button = this.add.text(tool.x, height - 82, tool.label, {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        backgroundColor: tool.color,
        padding: { x: 18, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => {
        this.audio.playTap();
        tool.action();
      });
    });
  }

  private undoFill() {
    const last = this.history.pop();
    if (!last) {
      showFloatingToast(this, '还没有可以撤销的颜色', 0xFFB300);
      return;
    }
    const wasFilled = last.region.filled;
    last.region.filled = last.filled;
    last.region.color = last.color;
    if (wasFilled && !last.filled) this.filledCount--;
    this.paintRegion(last.region, last.color ?? 0xF7F9FC);
    this.updateProgress();
  }

  private clearPage() {
    if (this.filledCount === 0) {
      showFloatingToast(this, '画稿还是干净的', 0xFFB300);
      return;
    }
    this.regions.forEach(region => {
      region.filled = false;
      region.color = null;
      this.paintRegion(region, 0xF7F9FC, false);
    });
    this.history = [];
    this.filledCount = 0;
    this.drawAllOutlines();
    this.updateProgress();
  }

  private nextPage() {
    this.scene.restart({ pageIndex: (this.pageIndex + 1) % PAGES.length });
  }

  private updateColorIndicator(x: number, y: number, size: number) {
    this.colorIndicator.clear();
    this.colorIndicator.lineStyle(5, 0x263238);
    this.colorIndicator.strokeRoundedRect(x - size / 2 - 5, y - size / 2 - 5, size + 10, size + 10, 15);
  }

  private updateProgress() {
    this.progressText?.setText(`完成 ${this.filledCount}/${this.totalRegions}`);
  }

  private showComplete() {
    const { width, height } = this.scale;
    const distinctColors = new Set(this.regions.map(region => region.color).filter(Boolean)).size;
    const stars = distinctColors >= 4 ? 3 : distinctColors >= 2 ? 2 : 1;
    recordGameComplete(this, 'ColoringGame', stars, '画得真棒');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.4).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -140, 440, 280, 28);
    bg.lineStyle(4, PAGES[this.pageIndex].accent, 0.66);
    bg.strokeRoundedRect(-220, -140, 440, 280, 28);

    const title = this.add.text(0, -88, '画稿完成', {
      fontSize: '34px',
      color: this.toHex(PAGES[this.pageIndex].accent),
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const detail = this.add.text(0, -48, `${PAGES[this.pageIndex].label}用了 ${distinctColors} 种颜色`, {
      fontSize: '20px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    panel.add([bg, title, detail]);
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(-58 + i * 58, 10, i < stars ? 'star_gold' : 'star_gray');
      star.setScale(0);
      panel.add(star);
      this.tweens.add({ targets: star, scale: 1, duration: 300, delay: i * 170, ease: 'Back.easeOut' });
    }

    const againBtn = this.add.text(-88, 90, '重画这张', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#42A5F5',
      padding: { x: 22, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const nextBtn = this.add.text(92, 90, '下一张', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#66BB6A',
      padding: { x: 22, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    againBtn.on('pointerdown', () => {
      overlay.destroy();
      this.scene.restart({ pageIndex: this.pageIndex });
    });
    nextBtn.on('pointerdown', () => {
      overlay.destroy();
      this.nextPage();
    });

    panel.add([againBtn, nextBtn]);
    panel.setScale(0.86).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }

  private createCatRegions(cx: number, cy: number) {
    this.addRegion(this.generateCirclePath(cx, cy - 34, 86, 28), '脑袋');
    this.addRegion(this.generateEllipsePath(cx, cy + 98, 72, 88, 28), '身体');
    this.addRegion([
      { x: cx - 64, y: cy - 92 },
      { x: cx - 100, y: cy - 166 },
      { x: cx - 24, y: cy - 112 },
    ], '耳朵');
    this.addRegion([
      { x: cx + 64, y: cy - 92 },
      { x: cx + 100, y: cy - 166 },
      { x: cx + 24, y: cy - 112 },
    ], '耳朵');
    this.addRegion([
      { x: cx + 58, y: cy + 126 },
      { x: cx + 104, y: cy + 78 },
      { x: cx + 150, y: cy + 52 },
      { x: cx + 166, y: cy + 78 },
      { x: cx + 126, y: cy + 118 },
      { x: cx + 88, y: cy + 156 },
    ], '尾巴');
    this.addRegion(this.generateCirclePath(cx, cy - 6, 38, 18), '脸蛋');
  }

  private createFishRegions(cx: number, cy: number) {
    this.addRegion(this.generateEllipsePath(cx - 20, cy, 142, 78, 30), '身体');
    this.addRegion([
      { x: cx + 102, y: cy },
      { x: cx + 188, y: cy - 66 },
      { x: cx + 188, y: cy + 66 },
    ], '尾巴');
    this.addRegion([
      { x: cx - 48, y: cy - 68 },
      { x: cx - 8, y: cy - 146 },
      { x: cx + 38, y: cy - 68 },
    ], '鱼鳍');
    this.addRegion([
      { x: cx - 38, y: cy + 66 },
      { x: cx - 4, y: cy + 122 },
      { x: cx + 48, y: cy + 66 },
    ], '鱼鳍');
    this.addRegion(this.generateCirclePath(cx - 82, cy - 12, 26, 14), '眼睛');
    this.addRegion([
      { x: cx + 20, y: cy - 62 },
      { x: cx + 52, y: cy - 56 },
      { x: cx + 52, y: cy + 56 },
      { x: cx + 20, y: cy + 62 },
    ], '条纹');
  }

  private createStarRegions(cx: number, cy: number) {
    const outerR = 136;
    const innerR = 58;
    const outer: Point[] = [];
    const inner: Point[] = [];
    for (let i = 0; i < 5; i++) {
      const outerAngle = Phaser.Math.DegToRad(i * 72 - 90);
      const innerAngle = Phaser.Math.DegToRad(i * 72 + 36 - 90);
      outer.push({ x: cx + Math.cos(outerAngle) * outerR, y: cy + Math.sin(outerAngle) * outerR });
      inner.push({ x: cx + Math.cos(innerAngle) * innerR, y: cy + Math.sin(innerAngle) * innerR });
    }
    for (let i = 0; i < 5; i++) {
      this.addRegion([outer[i], inner[i], inner[(i + 4) % 5]], '星角');
    }
    this.addRegion([...inner], '星心');
  }

  private createRocketRegions(cx: number, cy: number) {
    this.addRegion([
      { x: cx, y: cy - 170 },
      { x: cx - 58, y: cy - 82 },
      { x: cx - 46, y: cy + 104 },
      { x: cx + 46, y: cy + 104 },
      { x: cx + 58, y: cy - 82 },
    ], '火箭');
    this.addRegion(this.generateCirclePath(cx, cy - 52, 34, 18), '窗户');
    this.addRegion([
      { x: cx - 48, y: cy + 20 },
      { x: cx - 118, y: cy + 118 },
      { x: cx - 46, y: cy + 92 },
    ], '左翼');
    this.addRegion([
      { x: cx + 48, y: cy + 20 },
      { x: cx + 118, y: cy + 118 },
      { x: cx + 46, y: cy + 92 },
    ], '右翼');
    this.addRegion([
      { x: cx - 34, y: cy + 104 },
      { x: cx, y: cy + 180 },
      { x: cx + 34, y: cy + 104 },
    ], '火焰');
    this.addRegion([
      { x: cx - 32, y: cy - 126 },
      { x: cx, y: cy - 170 },
      { x: cx + 32, y: cy - 126 },
    ], '尖顶');
  }

  private drawRegionOutline(graphics: Phaser.GameObjects.Graphics, path: Point[]) {
    graphics.beginPath();
    graphics.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      graphics.lineTo(path[i].x, path[i].y);
    }
    graphics.closePath();
    graphics.strokePath();
  }

  private getRegionCenter(region: ColorRegion): Point {
    return {
      x: region.path.reduce((sum, point) => sum + point.x, 0) / region.path.length,
      y: region.path.reduce((sum, point) => sum + point.y, 0) / region.path.length,
    };
  }

  private generateCirclePath(cx: number, cy: number, radius: number, segments: number): Point[] {
    const path: Point[] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      path.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
    }
    return path;
  }

  private generateEllipsePath(cx: number, cy: number, rx: number, ry: number, segments: number): Point[] {
    const path: Point[] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      path.push({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
    }
    return path;
  }

  private toHex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
