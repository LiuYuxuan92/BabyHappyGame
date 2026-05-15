import Phaser from 'phaser';
import { enhanceGameScene, recordGameComplete } from '../../components/GameExperience';

export class StickerGame extends Phaser.Scene {
  private selectedSticker: string | null = null;
  private placedStickers: Phaser.GameObjects.Image[] = [];
  private paletteItems: Phaser.GameObjects.Image[] = [];
  private selectionIndicator!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'StickerGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.selectedSticker = null;
    this.placedStickers = [];
    this.paletteItems = [];

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xE8F5E9, 0xE1F5FE, 0xC8E6C9, 0xB3E5FC);
    bg.fillRect(0, 0, width, height);

    // Draw scene: blue sky
    const scene = this.add.graphics();
    scene.fillStyle(0x87CEEB);
    scene.fillRect(0, 0, width - 130, height);

    // Green grass
    scene.fillStyle(0x66BB6A);
    scene.fillRect(0, height * 0.65, width - 130, height * 0.35);

    // Grass detail - small hills
    scene.fillStyle(0x4CAF50);
    scene.fillEllipse(150, height * 0.68, 300, 60);
    scene.fillEllipse(450, height * 0.72, 250, 50);

    // Yellow sun
    scene.fillStyle(0xFFEB3B);
    scene.fillCircle(100, 100, 50);

    // Sun rays
    scene.lineStyle(4, 0xFFF176);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const x1 = 100 + Math.cos(angle) * 58;
      const y1 = 100 + Math.sin(angle) * 58;
      const x2 = 100 + Math.cos(angle) * 78;
      const y2 = 100 + Math.sin(angle) * 78;
      scene.lineBetween(x1, y1, x2, y2);
    }

    // Small clouds
    scene.fillStyle(0xffffff, 0.8);
    scene.fillEllipse(300, 70, 80, 30);
    scene.fillEllipse(320, 60, 60, 25);
    scene.fillEllipse(500, 90, 70, 28);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2 - 60, 35, '🎨 贴纸装饰', {
      fontSize: '30px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    enhanceGameScene(this, 'StickerGame');

    // Palette panel on the right
    this.createPalette();

    // Buttons at bottom
    this.createButtons();

    // Selection indicator (hidden initially)
    this.selectionIndicator = this.add.graphics();
    this.selectionIndicator.setVisible(false);

    // Scene tap to place sticker
    const hitZone = this.add.rectangle(
      (width - 130) / 2, height / 2,
      width - 130, height,
      0xffffff, 0
    ).setInteractive();

    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.selectedSticker) {
        this.placeSticker(pointer.x, pointer.y);
      }
    });

    // Instruction text
    this.add.text((width - 130) / 2, height - 25, '选择右边的贴纸，点击画面放置', {
      fontSize: '14px',
      color: '#666666',
      fontFamily: 'sans-serif',
      backgroundColor: '#ffffffcc',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);
  }

  private createPalette() {
    const { width, height } = this.scale;
    const paletteX = width - 65;
    const paletteW = 120;

    // Palette background
    const paletteBg = this.add.graphics();
    paletteBg.fillStyle(0xffffff, 0.9);
    paletteBg.fillRoundedRect(width - paletteW - 5, 70, paletteW, height - 140, 16);
    paletteBg.lineStyle(3, 0xE0E0E0);
    paletteBg.strokeRoundedRect(width - paletteW - 5, 70, paletteW, height - 140, 16);

    // Palette title
    this.add.text(paletteX, 90, '贴纸', {
      fontSize: '18px',
      color: '#555555',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const stickerKeys = [
      'animal_bear', 'animal_cat', 'animal_dog',
      'animal_penguin', 'animal_owl', 'fish_blue',
    ];

    const startY = 130;
    const spacing = 85;

    stickerKeys.forEach((key, i) => {
      const y = startY + i * spacing;
      const sticker = this.add.image(paletteX, y, key);
      sticker.setDisplaySize(60, 60);
      sticker.setInteractive({ useHandCursor: true });

      sticker.on('pointerdown', () => {
        this.selectSticker(key, sticker);
      });

      // Entrance animation
      sticker.setScale(0);
      this.tweens.add({
        targets: sticker,
        scale: sticker.scaleX || 1,
        displayWidth: 60,
        displayHeight: 60,
        duration: 300,
        delay: i * 80,
        ease: 'Back.easeOut',
      });

      this.paletteItems.push(sticker);
    });
  }

  private selectSticker(key: string, sprite: Phaser.GameObjects.Image) {
    this.selectedSticker = key;

    // Reset all palette items
    this.paletteItems.forEach(item => {
      this.tweens.add({
        targets: item,
        displayWidth: 60,
        displayHeight: 60,
        duration: 150,
      });
    });

    // Highlight selected
    this.tweens.add({
      targets: sprite,
      displayWidth: 72,
      displayHeight: 72,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Update selection indicator
    this.selectionIndicator.clear();
    this.selectionIndicator.lineStyle(3, 0xFF6B35);
    this.selectionIndicator.strokeRoundedRect(
      sprite.x - 40, sprite.y - 40, 80, 80, 12
    );
    this.selectionIndicator.setVisible(true);
  }

  private placeSticker(x: number, y: number) {
    if (!this.selectedSticker) return;

    const sticker = this.add.image(x, y, this.selectedSticker);
    sticker.setDisplaySize(70, 70);
    sticker.setInteractive({ useHandCursor: true, draggable: true });

    // Place animation - bounce in
    sticker.setScale(0);
    this.tweens.add({
      targets: sticker,
      scaleX: sticker.scaleX || 1,
      scaleY: sticker.scaleY || 1,
      displayWidth: 70,
      displayHeight: 70,
      duration: 350,
      ease: 'Back.easeOut',
    });

    // Small star burst on placement
    const star = this.add.image(x, y, 'star_gold').setScale(0).setAlpha(0.7);
    this.tweens.add({
      targets: star,
      scale: 1.2,
      alpha: 0,
      duration: 500,
      onComplete: () => star.destroy(),
    });

    this.placedStickers.push(sticker);

    // Drag events for placed sticker
    sticker.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      sticker.x = dragX;
      sticker.y = dragY;
    });

    sticker.on('dragstart', () => {
      this.tweens.add({
        targets: sticker,
        displayWidth: 80,
        displayHeight: 80,
        duration: 100,
      });
    });

    sticker.on('dragend', () => {
      this.tweens.add({
        targets: sticker,
        displayWidth: 70,
        displayHeight: 70,
        duration: 100,
      });
    });
  }

  private createButtons() {
    const { width, height } = this.scale;
    const btnY = height - 55;

    // Clear button
    const clearBtn = this.add.text(120, btnY, '🗑️ 清除', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#EF5350',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    clearBtn.on('pointerdown', () => {
      this.clearAllStickers();
    });

    clearBtn.on('pointerover', () => {
      this.tweens.add({ targets: clearBtn, scale: 1.05, duration: 100 });
    });
    clearBtn.on('pointerout', () => {
      this.tweens.add({ targets: clearBtn, scale: 1, duration: 100 });
    });

    // Done button
    const doneBtn = this.add.text(320, btnY, '✅ 完成', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#4CAF50',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    doneBtn.on('pointerdown', () => {
      this.showComplete();
    });

    doneBtn.on('pointerover', () => {
      this.tweens.add({ targets: doneBtn, scale: 1.05, duration: 100 });
    });
    doneBtn.on('pointerout', () => {
      this.tweens.add({ targets: doneBtn, scale: 1, duration: 100 });
    });
  }

  private clearAllStickers() {
    this.placedStickers.forEach((sticker, i) => {
      this.tweens.add({
        targets: sticker,
        scale: 0,
        alpha: 0,
        duration: 200,
        delay: i * 50,
        onComplete: () => sticker.destroy(),
      });
    });
    this.placedStickers = [];
  }

  private showComplete() {
    const { width, height } = this.scale;
    const stickerCount = this.placedStickers.length;
    const starCount = stickerCount >= 5 ? 3 : stickerCount >= 3 ? 2 : 1;
    recordGameComplete(this, 'StickerGame', starCount, '作品完成了');

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
    overlay.setDepth(100);

    // Panel
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 180, height / 2 - 120, 360, 240, 24);
    panel.setDepth(101);

    // Title
    const title = this.add.text(width / 2, height / 2 - 70, '🎉 作品完成！', {
      fontSize: '34px',
      color: '#FF6B35',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    // Stars
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(
        width / 2 - 50 + i * 50,
        height / 2 - 10,
        i < starCount ? 'star_gold' : 'star_gray'
      ).setDepth(102);
      star.setScale(0);
      this.tweens.add({
        targets: star,
        scale: 1,
        duration: 300,
        delay: i * 200,
        ease: 'Back.easeOut',
      });
    }

    // Message
    this.add.text(width / 2, height / 2 + 35, `你放置了 ${stickerCount} 个贴纸！`, {
      fontSize: '20px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5).setDepth(102);

    // Replay button
    const replayBtn = this.add.text(width / 2, height / 2 + 80, '再玩一次 🔄', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#2196F3',
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(102);

    replayBtn.on('pointerdown', () => this.scene.restart());
  }
}
