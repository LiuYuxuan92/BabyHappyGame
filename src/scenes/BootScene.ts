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

    // Soft gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87CEEB, 0xB3E5FC, 0xE1F5FE, 0xE0F7FA);
    bg.fillRect(0, 0, width, height);

    // Title with rainbow color cycling
    this.titleText = this.add.text(width / 2, height / 2 - 80, '宝宝乐园', {
      fontSize: '52px',
      color: '#FF6B35',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.createRainbowCycle();

    // Progress bar background
    this.progressBarBg = this.add.graphics();
    this.progressBarBg.fillStyle(0xffffff, 0.5);
    this.progressBarBg.fillRoundedRect(width / 2 - 200, height / 2 + 20, 400, 24, 12);
    this.progressBarBg.lineStyle(2, 0xFFB74D);
    this.progressBarBg.strokeRoundedRect(width / 2 - 200, height / 2 + 20, 400, 24, 12);

    // Progress fill
    this.progressFill = this.add.graphics();

    // Percent text
    this.percentText = this.add.text(width / 2, height / 2 + 32, '0%', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Bouncing dots
    this.createBouncingDots(width / 2, height / 2 + 75);

    // Walking character (a small bunny)
    this.walker = this.add.graphics();
    this.drawBunny(this.walker);
    this.walker.setPosition(width / 2 - 210, height / 2 + 32);

    // Subtitle
    this.add.text(width / 2, height / 2 + 110, '正在准备游戏...', {
      fontSize: '16px',
      color: '#78909C',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Progress listener
    this.load.on('progress', (value: number) => {
      this.currentProgress = value;
      this.updateProgress(value);
    });

    // Animals
    const animals = ['bear', 'cat', 'cow', 'dog', 'elephant', 'giraffe', 'kangaroo', 'monkey', 'owl', 'penguin', 'sheep', 'zebra'];
    animals.forEach(name => {
      this.load.image(`animal_${name}`, `assets/game/animals/${name}.png`);
    });

    // Fish
    const fishColors = ['blue', 'green', 'orange', 'brown', 'grey'];
    fishColors.forEach(color => {
      this.load.image(`fish_${color}`, `assets/game/fish/fish_${color}.png`);
    });

    // Food
    for (let i = 1; i <= 12; i++) {
      const num = i.toString().padStart(2, '0');
      this.load.image(`food_${num}`, `assets/game/food/food_${num}.png`);
    }

    this.generateUITextures();
  }

  private updateProgress(value: number) {
    const { width, height } = this.scale;
    const barWidth = 396 * value;

    this.progressFill.clear();
    this.progressFill.fillStyle(0xFFB74D, 1);
    this.progressFill.fillRoundedRect(width / 2 - 198, height / 2 + 22, barWidth, 20, 10);

    this.percentText.setText(`${Math.round(value * 100)}%`);

    // Move the walking character along the progress bar
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
    // Body
    g.fillStyle(0xFFFFFF);
    g.fillCircle(0, 4, 10);

    // Head
    g.fillStyle(0xFFFFFF);
    g.fillCircle(0, -8, 8);

    // Ears
    g.fillStyle(0xFFFFFF);
    g.fillEllipse(-4, -22, 5, 12);
    g.fillEllipse(4, -22, 5, 12);

    // Inner ears
    g.fillStyle(0xFFCDD2);
    g.fillEllipse(-4, -22, 3, 8);
    g.fillEllipse(4, -22, 3, 8);

    // Eyes
    g.fillStyle(0x333333);
    g.fillCircle(-3, -9, 2);
    g.fillCircle(3, -9, 2);

    // Nose
    g.fillStyle(0xFF8A80);
    g.fillCircle(0, -6, 1.5);

    // Bounce the bunny
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
    // Category icons
    this.createMenuIcon('icon_sorting', 0xFFE4B5);
    this.createMenuIcon('icon_puzzle', 0xB5E4FF);
    this.createMenuIcon('icon_matching', 0xB5FFB5);
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

  private createMenuIcon(key: string, bgColor: number) {
    const size = 160;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(bgColor);
    g.fillRoundedRect(4, 4, size - 8, size - 8, 24);
    g.lineStyle(4, 0xffffff);
    g.strokeRoundedRect(4, 4, size - 8, size - 8, 24);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  create() {
    this.scene.start('MenuScene');
  }
}
