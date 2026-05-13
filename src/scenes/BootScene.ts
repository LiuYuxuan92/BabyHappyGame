import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x87ceeb);
    const progressBox = this.add.rectangle(width / 2, height / 2 + 50, 400, 40, 0x222222);
    const progressBar = this.add.rectangle(width / 2 - 190, height / 2 + 50, 0, 30, 0x44dd44);
    progressBar.setOrigin(0, 0.5);

    this.add.text(width / 2, height / 2 - 30, '宝宝乐园', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2 + 50, '0%', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.width = 380 * value;
      percentText.setText(`${Math.round(value * 100)}%`);
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
