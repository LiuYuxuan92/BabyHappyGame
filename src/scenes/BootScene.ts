import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private dots: Phaser.GameObjects.Graphics[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private walker!: Phaser.GameObjects.Graphics;
  private progressBarBg!: Phaser.GameObjects.Graphics;
  private progressFill!: Phaser.GameObjects.Graphics;
  private percentText!: Phaser.GameObjects.Text;
  private currentProgress = 0;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87CEEB, 0xB3E5FC, 0xE1F5FE, 0xE0F7FA);
    bg.fillRect(0, 0, width, height);

    this.titleText = this.add.text(width / 2, height / 2 - 80, '宝宝乐园', {
      fontSize: '52px',
      color: '#FF6B35',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.createRainbowCycle();
    this.createProgressBar();
    this.createBouncingDots(width / 2, height / 2 + 75);
    this.createWalker();

    this.add.text(width / 2, height / 2 + 110, '正在准备游戏...', {
      fontSize: '16px',
      color: '#78909C',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      this.currentProgress = value;
      this.updateProgress(value);
    });

    // === Load curated game assets ===
    const animals = ['bear', 'cat', 'cow', 'dog', 'elephant', 'giraffe', 'kangaroo', 'monkey', 'owl', 'penguin', 'sheep', 'zebra'];
    animals.forEach(name => {
      this.load.image(`animal_${name}`, `assets/game/animals/${name}.png`);
    });

    const fishColors = ['blue', 'green', 'orange', 'brown', 'grey'];
    fishColors.forEach(color => {
      this.load.image(`fish_${color}`, `assets/game/fish/fish_${color}.png`);
    });

    for (let i = 1; i <= 12; i++) {
      const num = i.toString().padStart(2, '0');
      this.load.image(`food_${num}`, `assets/game/food/food_${num}.png`);
    }

    // Vehicles (cartoon colored vehicle sheets, 256x256)
    const vehicleColors = ['blue', 'green', 'red', 'orange', 'yellow', 'grey', 'black', 'white'];
    vehicleColors.forEach(color => {
      this.load.image(`vehicle_${color}`, `assets/game/vehicles/${color}.png`);
    });

    this.generateUITextures();
  }

  private createProgressBar() {
    const { width, height } = this.scale;

    this.progressBarBg = this.add.graphics();
    this.progressBarBg.fillStyle(0xffffff, 0.5);
    this.progressBarBg.fillRoundedRect(width / 2 - 200, height / 2 + 20, 400, 24, 12);
    this.progressBarBg.lineStyle(2, 0xFFB74D);
    this.progressBarBg.strokeRoundedRect(width / 2 - 200, height / 2 + 20, 400, 24, 12);

    this.progressFill = this.add.graphics();

    this.percentText = this.add.text(width / 2, height / 2 + 32, '0%', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private createWalker() {
    const { width, height } = this.scale;
    this.walker = this.add.graphics();
    this.drawBunny(this.walker);
    this.walker.setPosition(width / 2 - 210, height / 2 + 32);
  }

  private updateProgress(value: number) {
    const { width, height } = this.scale;
    const barWidth = 396 * value;

    this.progressFill.clear();
    this.progressFill.fillStyle(0xFFB74D, 1);
    this.progressFill.fillRoundedRect(width / 2 - 198, height / 2 + 22, barWidth, 20, 10);

    this.percentText.setText(`${Math.round(value * 100)}%`);

    const startX = width / 2 - 210;
    const endX = width / 2 + 190;
    this.walker.x = startX + (endX - startX) * value;
  }

  private createRainbowCycle() {
    const colors = ['#FF6B35', '#FF4081', '#9C27B0', '#2196F3', '#4CAF50', '#FFEB3B', '#FF6B35'];
    let colorIndex = 0;

    this.time.addEvent({
      delay: 800,
      callback: () => {
        colorIndex = (colorIndex + 1) % colors.length;
        this.titleText.setColor(colors[colorIndex]);
      },
      loop: true,
    });
  }

  private createBouncingDots(cx: number, cy: number) {
    const dotColors = [0xFF7043, 0xFFCA28, 0x66BB6A];

    for (let i = 0; i < 3; i++) {
      const dot = this.add.graphics();
      dot.fillStyle(dotColors[i], 1);
      dot.fillCircle(0, 0, 8);
      dot.setPosition(cx - 30 + i * 30, cy);

      this.tweens.add({
        targets: dot,
        y: cy - 18,
        duration: 400,
        delay: i * 150,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.dots.push(dot);
    }
  }

  private drawBunny(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0xFFFFFF);
    g.fillCircle(0, 4, 10);
    g.fillCircle(0, -8, 8);
    g.fillEllipse(-4, -22, 5, 12);
    g.fillEllipse(4, -22, 5, 12);
    g.fillStyle(0xFFCDD2);
    g.fillEllipse(-4, -22, 3, 8);
    g.fillEllipse(4, -22, 3, 8);
    g.fillStyle(0x333333);
    g.fillCircle(-3, -9, 2);
    g.fillCircle(3, -9, 2);
    g.fillStyle(0xFF8A80);
    g.fillCircle(0, -6, 1.5);

    this.tweens.add({
      targets: g,
      y: g.y - 6,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeOut',
    });
  }

  private generateUITextures() {
    // Stars
    this.createStar('star_gold', 0xffd700);
    this.createStar('star_gray', 0x888888);
    // Back button
    this.createBackButton();
    // Scene backgrounds (procedural, reusable across games)
    this.createSkyGrassBackground();
    this.createOceanBackground();
    this.createForestBackground();
    // Decorative elements
    this.createCloudSprite();
    this.createFlowerSprites();
    // Game icons for menu (cute illustrated icons, not plain rectangles)
    this.createGameIcons();
  }

  private createStar(key: string, color: number) {
    const size = 50;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color);
    const cx = size / 2, cy = size / 2;
    const points = 5, outer = size / 2 - 2, inner = size / 5;
    const step = Math.PI / points;
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const angle = i * step - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private createBackButton() {
    const size = 60;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 0.9);
    g.fillRoundedRect(2, 2, size - 4, size - 4, 12);
    g.lineStyle(3, 0x333333);
    g.strokeRoundedRect(2, 2, size - 4, size - 4, 12);
    g.beginPath();
    g.moveTo(size * 0.6, size * 0.3);
    g.lineTo(size * 0.3, size * 0.5);
    g.lineTo(size * 0.6, size * 0.7);
    g.strokePath();
    g.generateTexture('btn_back', size, size);
    g.destroy();
  }

  // ===== Scene Backgrounds =====

  private createSkyGrassBackground() {
    const W = 800, H = 600;
    const g = this.make.graphics({ x: 0, y: 0 });

    // Sky gradient (top to horizon)
    for (let y = 0; y < H * 0.7; y++) {
      const t = y / (H * 0.7);
      const r = Math.round(135 + t * 80);
      const gr = Math.round(206 + t * 20);
      const b = Math.round(235 - t * 10);
      g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b));
      g.fillRect(0, y, W, 1);
    }

    // Distant hills
    g.fillStyle(0x8BC34A, 0.6);
    g.beginPath();
    g.moveTo(0, H * 0.68);
    for (let x = 0; x <= W; x += 2) {
      const y = H * 0.68 - Math.sin(x * 0.008) * 25 - Math.sin(x * 0.02) * 15;
      g.lineTo(x, y);
    }
    g.lineTo(W, H);
    g.lineTo(0, H);
    g.closePath();
    g.fillPath();

    // Grass field
    for (let y = H * 0.65; y < H; y++) {
      const t = (y - H * 0.65) / (H * 0.35);
      const gr = Math.round(139 + t * 30);
      g.fillStyle(Phaser.Display.Color.GetColor(76, gr, 49));
      g.fillRect(0, y, W, 1);
    }

    // Sun
    g.fillStyle(0xFFF176, 0.8);
    g.fillCircle(120, 80, 40);
    // Sun rays
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const sx = 120 + Math.cos(angle) * 50;
      const sy = 80 + Math.sin(angle) * 50;
      g.fillStyle(0xFFF176, 0.3);
      g.fillCircle(sx, sy, 6);
    }

    // Clouds (white fluffs at various heights)
    g.fillStyle(0xffffff, 0.7);
    this.drawCloudShape(g, 200, 50, 1.0);
    this.drawCloudShape(g, 500, 70, 0.8);
    this.drawCloudShape(g, 650, 35, 1.2);

    g.generateTexture('bg_sky_grass', W, H);
    g.destroy();
  }

  private drawCloudShape(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number) {
    const s = scale;
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(x, y, 18 * s);
    g.fillCircle(x + 20 * s, y - 8 * s, 14 * s);
    g.fillCircle(x + 40 * s, y, 16 * s);
    g.fillCircle(x + 15 * s, y + 5 * s, 12 * s);
  }

  private createOceanBackground() {
    const W = 800, H = 600;
    const g = this.make.graphics({ x: 0, y: 0 });

    // Ocean water gradient
    for (let y = 0; y < H; y++) {
      const t = y / H;
      const r = Math.round(0 + t * 60);
      const gr = Math.round(105 + t * 40 - Math.sin(y * 0.02) * 15);
      const b = Math.round(148 + t * 60);
      g.fillStyle(Phaser.Display.Color.GetColor(r, Math.max(0, Math.min(255, gr)), b));
      g.fillRect(0, y, W, 1);
    }

    // Light rays from above
    for (let i = 0; i < 5; i++) {
      const rx = 80 + i * 160;
      g.fillStyle(0xffffff, 0.04);
      g.beginPath();
      g.moveTo(rx - 20, 0);
      g.lineTo(rx + 20, 0);
      g.lineTo(rx + 80, H);
      g.lineTo(rx - 80, H);
      g.closePath();
      g.fillPath();
    }

    // Seaweed at bottom
    g.fillStyle(0x2E7D32, 0.6);
    for (let i = 0; i < 8; i++) {
      const sx = 60 + i * 100;
      this.drawSeaweed(g, sx, H - 10, 1 + Math.random() * 0.5);
    }

    // Bubbles
    for (let i = 0; i < 15; i++) {
      const bx = Math.random() * W;
      const by = Math.random() * H;
      g.fillStyle(0xffffff, 0.15);
      g.fillCircle(bx, by, 4 + Math.random() * 8);
      g.lineStyle(1, 0xffffff, 0.1);
      g.strokeCircle(bx, by, 4 + Math.random() * 8);
    }

    g.generateTexture('bg_ocean', W, H);
    g.destroy();
  }

  private drawSeaweed(g: Phaser.GameObjects.Graphics, x: number, baseY: number, scale: number) {
    g.fillStyle(0x2E7D32, 0.5);
    let cy = baseY;
    for (let seg = 0; seg < 5; seg++) {
      const sway = Math.sin(seg * 0.8) * 15 * scale;
      g.fillEllipse(x + sway, cy, 12 * scale, 30 * scale);
      cy -= 25 * scale;
    }
    // Lighter tips
    g.fillStyle(0x66BB6A, 0.4);
    g.fillEllipse(x + Math.sin(5 * 0.8) * 15 * scale, cy + 15 * scale, 10 * scale, 18 * scale);
  }

  private createForestBackground() {
    const W = 800, H = 600;
    const g = this.make.graphics({ x: 0, y: 0 });

    // Evening/golden hour sky
    for (let y = 0; y < H; y++) {
      const t = y / H;
      const r = Math.round(25 + t * 60);
      const gr = Math.round(45 + t * 100);
      const b = Math.round(65 + t * 80);
      g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b));
      g.fillRect(0, y, W, 1);
    }

    // Distant tree silhouettes (lighter)
    g.fillStyle(0x1B3A29, 0.4);
    for (let i = 0; i < 8; i++) {
      const tx = i * 110 - 20;
      const th = 80 + Math.random() * 80;
      this.drawTreeShape(g, tx, H - 200, th, 0.6);
    }

    // Foreground trees (darker)
    g.fillStyle(0x0D2818, 0.7);
    for (let i = 0; i < 6; i++) {
      const tx = i * 140 - 30 + Math.random() * 30;
      const th = 120 + Math.random() * 100;
      this.drawTreeShape(g, tx, H - 180, th, 1.0);
    }

    // Ground
    for (let y = H - 200; y < H; y++) {
      const t = (y - (H - 200)) / 200;
      const gr = Math.round(30 + t * 20);
      g.fillStyle(Phaser.Display.Color.GetColor(15, gr, 20));
      g.fillRect(0, y, W, 1);
    }

    // Fireflies / sparkles
    for (let i = 0; i < 20; i++) {
      const fx = Math.random() * W;
      const fy = 100 + Math.random() * (H - 300);
      g.fillStyle(0xFFFF88, 0.3);
      g.fillCircle(fx, fy, 2 + Math.random() * 3);
    }

    g.generateTexture('bg_forest', W, H);
    g.destroy();
  }

  private drawTreeShape(g: Phaser.GameObjects.Graphics, x: number, baseY: number, height: number, scale: number) {
    // Trunk
    const trunkW = 8 * scale;
    g.fillRect(x - trunkW / 2, baseY - height * 0.5, trunkW, height * 0.5);
    // Triangular canopy layers
    for (let layer = 0; layer < 3; layer++) {
      const ly = baseY - height * 0.5 - layer * height * 0.2;
      const lw = (40 - layer * 8) * scale;
      const lh = (50 - layer * 5) * scale;
      g.beginPath();
      g.moveTo(x, ly - lh);
      g.lineTo(x - lw / 2, ly);
      g.lineTo(x + lw / 2, ly);
      g.closePath();
      g.fillPath();
    }
  }

  // ===== Decorative Elements =====

  private createCloudSprite() {
    const W = 100, H = 50;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(25, 25, 16);
    g.fillCircle(45, 18, 12);
    g.fillCircle(65, 25, 14);
    g.fillCircle(38, 32, 10);
    g.generateTexture('cloud_deco', W, H);
    g.destroy();
  }

  private createFlowerSprites() {
    const petalColors = [0xFF6B6B, 0xFFD93D, 0xFF8E53, 0xE06BFF, 0xFF477E, 0x6BCB77];
    const size = 24;

    petalColors.forEach((color, i) => {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Petals
      g.fillStyle(color, 0.9);
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2 - Math.PI / 2;
        const px = size / 2 + Math.cos(angle) * 7;
        const py = size / 2 + Math.sin(angle) * 7;
        g.fillCircle(px, py, 5);
      }
      // Center
      g.fillStyle(0xFFF176);
      g.fillCircle(size / 2, size / 2, 4);
      g.generateTexture(`flower_${i}`, size, size);
      g.destroy();
    });
  }

  // ===== Game Icons for Menu =====

  private createGameIcons() {
    this.createSortingIcon();
    this.createPuzzleIcon();
    this.createMatchingIcon();
    this.createColoringIcon();
    this.createShapeIcon();
    this.createCountingIcon();
    this.createSizeSortIcon();
    this.createCompareIcon();
    this.createPianoIcon();
    this.createRhythmIcon();
    this.createConnectDotsIcon();
    this.createMazeIcon();
    this.createFindDiffIcon();
    this.createShadowMatchIcon();
    this.createStickerIcon();
    this.createDressUpIcon();
    this.createFoodSortIcon();
  }

  private createRoundedIconBg(g: Phaser.GameObjects.Graphics, size: number, color: number) {
    g.fillStyle(color, 0.3);
    g.fillRoundedRect(0, 0, size, size, 16);
    g.lineStyle(3, color, 0.7);
    g.strokeRoundedRect(0, 0, size, size, 16);
  }

  private createSortingIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0xFF9800);
    // Two animal silhouettes being sorted into boxes
    g.fillStyle(0xFFFFFF, 0.9);
    g.fillRoundedRect(8, s - 28, 26, 22, 6);
    g.fillRoundedRect(s - 34, s - 28, 26, 22, 6);
    g.lineStyle(2, 0xFF9800, 0.6);
    g.strokeRoundedRect(8, s - 28, 26, 22, 6);
    g.strokeRoundedRect(s - 34, s - 28, 26, 22, 6);
    // Animal shapes
    g.fillStyle(0xFF9800, 0.7);
    g.fillCircle(21, s - 52, 9);
    g.fillCircle(s - 21, s - 48, 8);
    g.generateTexture('icon_sorting', s, s);
    g.destroy();
  }

  private createPuzzleIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0x2196F3);
    // Puzzle piece shapes
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillRoundedRect(20, 12, 24, 24, 4);
    g.fillRoundedRect(s / 2 - 2, s / 2 - 2, 24, 24, 4);
    g.fillRoundedRect(8, s - 34, 24, 24, 4);
    g.fillStyle(0x2196F3, 0.4);
    g.fillRoundedRect(20, 12, 24, 24, 4);
    g.fillRoundedRect(s / 2 - 2, s / 2 - 2, 24, 24, 4);
    g.fillRoundedRect(8, s - 34, 24, 24, 4);
    g.generateTexture('icon_puzzle', s, s);
    g.destroy();
  }

  private createMatchingIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0x4CAF50);
    // Two overlapping cards
    g.fillStyle(0xFFFFFF, 0.9);
    g.fillRoundedRect(10, 14, 34, 40, 6);
    g.fillRoundedRect(36, 26, 34, 40, 6);
    g.lineStyle(2, 0x4CAF50, 0.5);
    g.strokeRoundedRect(10, 14, 34, 40, 6);
    g.strokeRoundedRect(36, 26, 34, 40, 6);
    // Question marks
    g.lineStyle(2, 0x4CAF50, 0.6);
    g.fillStyle(0x4CAF50, 0.6);
    // Small dot + curve hint
    g.fillCircle(27, 30, 3);
    g.fillCircle(53, 42, 3);
    g.generateTexture('icon_matching', s, s);
    g.destroy();
  }

  private createColoringIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0xE91E63);
    // Paint palette shape
    g.fillStyle(0xFFFFFF, 0.9);
    g.fillEllipse(s / 2, s / 2 + 4, 44, 32);
    // Color dots
    const dotColors = [0xFF0000, 0xFF9800, 0xFFEB3B, 0x4CAF50, 0x2196F3, 0x9C27B0];
    dotColors.forEach((c, i) => {
      const angle = (i / dotColors.length) * Math.PI - Math.PI / 2;
      const dx = Math.cos(angle) * 14;
      const dy = Math.sin(angle) * 10;
      g.fillStyle(c);
      g.fillCircle(s / 2 + dx, s / 2 - 2 + dy, 5);
    });
    g.generateTexture('icon_coloring', s, s);
    g.destroy();
  }

  private createShapeIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0x3F51B5);
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillCircle(26, 26, 12);
    g.fillRect(s / 2 - 10, s - 32, 18, 18);
    g.beginPath();
    g.moveTo(s / 2, 48);
    g.lineTo(s / 2 - 10, 64);
    g.lineTo(s / 2 + 10, 64);
    g.closePath();
    g.fillPath();
    g.generateTexture('icon_shape', s, s);
    g.destroy();
  }

  private createCountingIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0x009688);
    // Large numbers
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillCircle(24, s / 2 - 2, 7);
    g.fillCircle(38, s / 2 - 2, 7);
    g.fillCircle(52, s / 2 - 2, 7);
    g.fillCircle(31, s / 2 + 12, 7);
    g.fillCircle(45, s / 2 + 12, 7);
    g.generateTexture('icon_counting', s, s);
    g.destroy();
  }

  private createSizeSortIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0xE040FB);
    // Three circles ascending
    g.fillStyle(0xFFFFFF, 0.7);
    g.fillCircle(20, s - 24, 7);
    g.fillCircle(s / 2, s - 20, 11);
    g.fillCircle(s - 20, s - 18, 15);
    g.generateTexture('icon_sizesort', s, s);
    g.destroy();
  }

  private createCompareIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0x673AB7);
    // Balance scale
    g.fillStyle(0xFFFFFF, 0.7);
    g.fillRect(s / 2 - 2, 20, 4, 40);
    g.fillRect(10, 55, s - 20, 4);
    g.fillTriangle(10, 55, 18, 35, 26, 55);
    g.fillTriangle(s - 26, 55, s - 18, 30, s - 10, 55);
    g.generateTexture('icon_compare', s, s);
    g.destroy();
  }

  private createPianoIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0xFF4081);
    // Piano keys
    g.fillStyle(0xFFFFFF, 0.9);
    for (let i = 0; i < 5; i++) {
      g.fillRoundedRect(8 + i * 14, 20, 10, 42, 2);
    }
    // Black keys
    g.fillStyle(0x333333, 0.8);
    for (let i = 0; i < 4; i++) {
      g.fillRoundedRect(13 + i * 14, 20, 6, 26, 1);
    }
    g.generateTexture('icon_piano', s, s);
    g.destroy();
  }

  private createRhythmIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0x00BCD4);
    // Drum shape
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillEllipse(s / 2, s / 2, 36, 18);
    g.fillRect(s / 2 - 18, s / 2 - 6, 36, 10);
    g.fillEllipse(s / 2, s / 2 + 10, 28, 8);
    g.generateTexture('icon_rhythm', s, s);
    g.destroy();
  }

  private createConnectDotsIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0xFFAB40);
    // Dots with connecting lines
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillCircle(16, 16, 5);
    g.fillCircle(40, 40, 5);
    g.fillCircle(64, 24, 5);
    g.fillCircle(56, 60, 5);
    g.lineStyle(2, 0xFFFFFF, 0.5);
    g.lineBetween(16, 16, 40, 40);
    g.lineBetween(40, 40, 64, 24);
    g.lineBetween(64, 24, 56, 60);
    g.generateTexture('icon_connectdots', s, s);
    g.destroy();
  }

  private createMazeIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0x8D6E63);
    // Maze pattern
    g.lineStyle(3, 0xFFFFFF, 0.7);
    g.strokeRect(12, 12, 56, 56);
    g.lineBetween(28, 12, 28, 44);
    g.lineBetween(28, 44, 52, 44);
    g.lineBetween(40, 28, 40, 56);
    g.lineBetween(52, 28, 56, 28);
    g.generateTexture('icon_maze', s, s);
    g.destroy();
  }

  private createFindDiffIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0xFF5722);
    // Two similar shapes with one difference
    g.fillStyle(0xFFFFFF, 0.7);
    g.fillCircle(30, 36, 14);
    g.fillCircle(52, 36, 14);
    // Different colored centers
    g.fillStyle(0xFF5722, 0.6);
    g.fillCircle(30, 36, 5);
    g.fillStyle(0xFF9800, 0.6);
    g.fillCircle(52, 36, 5);
    g.generateTexture('icon_finddiff', s, s);
    g.destroy();
  }

  private createShadowMatchIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0x607D8B);
    // Animal and its shadow
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillCircle(24, 28, 10);
    // Shadow offset below
    g.fillStyle(0x37474F, 0.5);
    g.fillCircle(46, 52, 10);
    g.generateTexture('icon_shadowmatch', s, s);
    g.destroy();
  }

  private createStickerIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0x26A69A);
    // Sticker shapes
    g.fillStyle(0xFFF176, 0.8);
    g.fillCircle(28, 28, 14);
    // Adorable star shape
    this.drawMiniStar(g, 52, 40, 12, 0xFF80AB, 0.8);
    this.drawMiniStar(g, 36, 56, 8, 0x81C784, 0.8);
    g.generateTexture('icon_sticker', s, s);
    g.destroy();
  }

  private createDressUpIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0x8BC34A);
    // Simplified dress/t-shirt shape
    g.fillStyle(0xFFFFFF, 0.8);
    g.beginPath();
    g.moveTo(s / 2, 18);
    g.lineTo(s / 2 - 16, 30);
    g.lineTo(s / 2 - 14, 62);
    g.lineTo(s / 2 + 14, 62);
    g.lineTo(s / 2 + 16, 30);
    g.closePath();
    g.fillPath();
    // Little bow at collar
    g.fillStyle(0xFF4081, 0.7);
    g.fillCircle(s / 2 - 4, 26, 4);
    g.fillCircle(s / 2 + 4, 26, 4);
    g.generateTexture('icon_dressup', s, s);
    g.destroy();
  }

  private createFoodSortIcon() {
    const s = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    this.createRoundedIconBg(g, s, 0xF44336);
    // Fruit shapes
    g.fillStyle(0xFF9800, 0.8);
    g.fillCircle(28, 28, 10);
    g.fillStyle(0x4CAF50, 0.5);
    g.fillRect(26, 16, 4, 6);
    // Another fruit
    g.fillStyle(0xE91E63, 0.8);
    g.fillCircle(52, 44, 9);
    g.fillStyle(0x4CAF50, 0.5);
    g.fillRect(50, 32, 4, 6);
    g.generateTexture('icon_foodsort', s, s);
    g.destroy();
  }

  private drawMiniStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, color: number, alpha: number) {
    g.fillStyle(color, alpha);
    const points = 5, outer = size, inner = size * 0.4;
    const step = Math.PI / points;
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const angle = i * step - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
  }

  create() {
    this.scene.start('MenuScene');
  }
}
