import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xE0F7FA, 0xE0F7FA);
    bg.fillRect(0, 0, width, height);

    // Clouds decoration
    this.addClouds();

    // Title
    this.add.text(width / 2, 50, '🌈 宝宝乐园 🌈', {
      fontSize: '44px',
      color: '#FF6B35',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(width / 2, 90, '选择一个游戏开始玩吧！', {
      fontSize: '20px',
      color: '#555555',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // All games
    const games = [
      { key: 'SortingGame', label: '动物分类', emoji: '🐾', color: 0xFFE4B5 },
      { key: 'PuzzleGame', label: '趣味拼图', emoji: '🧩', color: 0xB5E4FF },
      { key: 'MatchingGame', label: '记忆配对', emoji: '🎴', color: 0xB5FFB5 },
      { key: 'ColoringGame', label: '涂色画画', emoji: '🖍️', color: 0xFFCDD2 },
      { key: 'ShapeGame', label: '形状认知', emoji: '🔷', color: 0xC5CAE9 },
      { key: 'CountingGame', label: '数一数', emoji: '🔢', color: 0xC8E6C9 },
      { key: 'SizeSortGame', label: '大小排序', emoji: '📏', color: 0xF8BBD0 },
      { key: 'CompareGame', label: '比多少', emoji: '⚖️', color: 0xD1C4E9 },
      { key: 'PianoGame', label: '小钢琴', emoji: '🎹', color: 0xFFB5E4 },
      { key: 'RhythmGame', label: '节奏大师', emoji: '🥁', color: 0xE4B5FF },
      { key: 'ConnectDotsGame', label: '连线画', emoji: '✏️', color: 0xFFF9C4 },
      { key: 'MazeGame', label: '走迷宫', emoji: '🏁', color: 0xB2DFDB },
      { key: 'FindDiffGame', label: '找不同', emoji: '🔍', color: 0xFFECB3 },
      { key: 'ShadowMatchGame', label: '影子配对', emoji: '👤', color: 0xD7CCC8 },
      { key: 'StickerGame', label: '贴纸装饰', emoji: '🎨', color: 0xFFF9C4 },
      { key: 'DressUpGame', label: '换装游戏', emoji: '👗', color: 0xF0F4C3 },
      { key: 'FoodSortGame', label: '食物分类', emoji: '🍎', color: 0xFFCCBC },
    ];

    // Grid layout: 6 columns, 3 rows
    const cols = 6;
    const cardW = 130;
    const cardH = 140;
    const gapX = 15;
    const gapY = 15;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (width - totalW) / 2 + cardW / 2;
    const startY = 140;

    games.forEach((game, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY) + cardH / 2;
      this.createGameButton(x, y, game, cardW, cardH);
    });

    // Footer
    this.add.text(width / 2, height - 15, '适合 2-5 岁宝宝 ❤️ 共17款游戏', {
      fontSize: '14px',
      color: '#999999',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private createGameButton(x: number, y: number, game: { key: string; label: string; emoji: string; color: number }, cardW: number, cardH: number) {
    const container = this.add.container(x, y);

    // Card background
    const card = this.add.graphics();
    card.fillStyle(0xffffff, 0.95);
    card.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    card.lineStyle(3, game.color);
    card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    container.add(card);

    // Emoji
    const emoji = this.add.text(0, -20, game.emoji, {
      fontSize: '40px',
    }).setOrigin(0.5);
    container.add(emoji);

    // Label
    const label = this.add.text(0, 35, game.label, {
      fontSize: '18px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(label);

    // Hit area
    const hitArea = this.add.rectangle(0, 0, cardW, cardH, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.08, scaleY: 1.08, duration: 120 });
    });
    hitArea.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 });
    });
    hitArea.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.scene.start(game.key);
        },
      });
    });
  }

  private addClouds() {
    const { width } = this.scale;
    for (let i = 0; i < 4; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const y = Phaser.Math.Between(10, 60);
      const cloud = this.add.graphics();
      cloud.fillStyle(0xffffff, 0.4);
      cloud.fillEllipse(0, 0, Phaser.Math.Between(60, 100), Phaser.Math.Between(20, 35));
      cloud.setPosition(x, y);

      this.tweens.add({
        targets: cloud,
        x: cloud.x + Phaser.Math.Between(-20, 20),
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
