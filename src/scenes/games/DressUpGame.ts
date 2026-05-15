import Phaser from 'phaser';
import { enhanceGameScene } from '../../components/GameExperience';

interface ClothingItem {
  graphics: Phaser.GameObjects.Container;
  type: 'hat' | 'shirt' | 'pants';
  name: string;
  equipped: boolean;
}

export class DressUpGame extends Phaser.Scene {
  private clothingItems: ClothingItem[] = [];
  private equippedItems: Map<string, Phaser.GameObjects.Container> = new Map();
  private headY = 0;
  private torsoY = 0;
  private legsY = 0;
  private characterX = 0;

  constructor() {
    super({ key: 'DressUpGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.clothingItems = [];
    this.equippedItems = new Map();

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFCE4EC, 0xFCE4EC, 0xF8BBD0, 0xF8BBD0);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '👗 换装游戏', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    enhanceGameScene(this, 'DressUpGame');

    // Draw character in center
    this.characterX = width / 2;
    const charBaseY = height / 2 - 20;
    this.headY = charBaseY - 80;
    this.torsoY = charBaseY;
    this.legsY = charBaseY + 80;

    this.drawCharacter(charBaseY);

    // Create clothing options on the sides
    this.createHats(80);
    this.createShirts(80);
    this.createPants(width - 80);

    // Setup drag
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container, dragX: number, dragY: number) => {
      obj.x = dragX;
      obj.y = dragY;
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container) => {
      const type = obj.getData('type') as string;
      let targetX = this.characterX;
      let targetY = 0;
      const snapDist = 90;

      if (type === 'hat') {
        targetY = this.headY - 30;
      } else if (type === 'shirt') {
        targetY = this.torsoY;
      } else if (type === 'pants') {
        targetY = this.legsY;
      }

      const dist = Phaser.Math.Distance.Between(obj.x, obj.y, targetX, targetY);
      if (dist < snapDist) {
        // Remove previously equipped item of same type
        if (this.equippedItems.has(type)) {
          const prev = this.equippedItems.get(type)!;
          const origX = prev.getData('originalX');
          const origY = prev.getData('originalY');
          this.tweens.add({
            targets: prev,
            x: origX,
            y: origY,
            duration: 300,
            ease: 'Back.easeOut',
          });
        }

        // Snap to position
        this.equippedItems.set(type, obj);
        this.tweens.add({
          targets: obj,
          x: targetX,
          y: targetY,
          duration: 200,
          ease: 'Back.easeOut',
        });

        // Star feedback
        const star = this.add.image(targetX, targetY, 'star_gold').setScale(0);
        this.tweens.add({
          targets: star,
          scale: 1.5,
          alpha: 0,
          duration: 500,
          onComplete: () => star.destroy(),
        });
      } else {
        // Bounce back to original position
        const origX = obj.getData('originalX');
        const origY = obj.getData('originalY');
        this.tweens.add({
          targets: obj,
          x: origX,
          y: origY,
          duration: 300,
          ease: 'Back.easeOut',
        });
      }
    });

    // "完成" button
    const doneBtn = this.add.text(width / 2, height - 50, '完成 ✨', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#E91E63',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    doneBtn.on('pointerdown', () => this.showCelebration());

    // Instruction
    this.add.text(width / 2, height - 15, '把衣服拖到人物身上', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private drawCharacter(baseY: number) {
    const x = this.characterX;
    const char = this.add.graphics();

    // Head (circle)
    char.fillStyle(0xFFDBAC);
    char.fillCircle(x, baseY - 80, 30);
    char.lineStyle(2, 0xD4A574);
    char.strokeCircle(x, baseY - 80, 30);

    // Eyes
    char.fillStyle(0x333333);
    char.fillCircle(x - 10, baseY - 85, 4);
    char.fillCircle(x + 10, baseY - 85, 4);

    // Smile
    char.lineStyle(2, 0xE91E63);
    char.beginPath();
    char.arc(x, baseY - 72, 10, 0, Math.PI, false);
    char.strokePath();

    // Body (rectangle)
    char.fillStyle(0xEEEEEE);
    char.fillRect(x - 25, baseY - 40, 50, 60);
    char.lineStyle(2, 0xCCCCCC);
    char.strokeRect(x - 25, baseY - 40, 50, 60);

    // Arms (stick limbs)
    char.lineStyle(4, 0xFFDBAC);
    char.lineBetween(x - 25, baseY - 30, x - 45, baseY + 10);
    char.lineBetween(x + 25, baseY - 30, x + 45, baseY + 10);

    // Legs
    char.lineStyle(4, 0xFFDBAC);
    char.lineBetween(x - 10, baseY + 20, x - 15, baseY + 70);
    char.lineBetween(x + 10, baseY + 20, x + 15, baseY + 70);

    // Feet
    char.fillStyle(0x333333);
    char.fillEllipse(x - 15, baseY + 75, 16, 10);
    char.fillEllipse(x + 15, baseY + 75, 16, 10);
  }

  private createHats(x: number) {
    const hats = [
      { name: 'crown', label: '皇冠', draw: (g: Phaser.GameObjects.Graphics) => {
        g.fillStyle(0xFFD700);
        g.fillRect(-20, -5, 40, 15);
        g.fillTriangle(-15, -5, -10, -20, -5, -5);
        g.fillTriangle(-2, -5, 3, -25, 8, -5);
        g.fillTriangle(10, -5, 15, -20, 20, -5);
      }},
      { name: 'cap', label: '帽子', draw: (g: Phaser.GameObjects.Graphics) => {
        g.fillStyle(0x2196F3);
        g.fillEllipse(0, 0, 45, 20);
        g.fillRect(-5, -3, 30, 6);
      }},
      { name: 'bow', label: '蝴蝶结', draw: (g: Phaser.GameObjects.Graphics) => {
        g.fillStyle(0xFF4081);
        g.fillTriangle(-20, 0, 0, -10, 0, 10);
        g.fillTriangle(20, 0, 0, -10, 0, 10);
        g.fillCircle(0, 0, 5);
      }},
    ];

    hats.forEach((hat, i) => {
      const y = 120 + i * 80;
      const container = this.add.container(x, y);

      const g = this.add.graphics();
      hat.draw(g);
      container.add(g);

      const label = this.add.text(0, 22, hat.label, {
        fontSize: '14px',
        color: '#666666',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5);
      container.add(label);

      container.setSize(60, 50);
      container.setInteractive({ useHandCursor: true, draggable: true });
      container.setData('type', 'hat');
      container.setData('name', hat.name);
      container.setData('originalX', x);
      container.setData('originalY', y);

      this.clothingItems.push({ graphics: container, type: 'hat', name: hat.name, equipped: false });

      // Entry animation
      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        delay: i * 100,
        ease: 'Back.easeOut',
      });
    });
  }

  private createShirts(x: number) {
    const shirts = [
      { name: 'red', color: 0xF44336, label: '红衣' },
      { name: 'blue', color: 0x2196F3, label: '蓝衣' },
      { name: 'green', color: 0x4CAF50, label: '绿衣' },
    ];

    shirts.forEach((shirt, i) => {
      const y = 350 + i * 80;
      const container = this.add.container(x, y);

      const g = this.add.graphics();
      g.fillStyle(shirt.color);
      g.fillRect(-20, -15, 40, 30);
      // Sleeves
      g.fillRect(-30, -12, 12, 18);
      g.fillRect(18, -12, 12, 18);
      container.add(g);

      const label = this.add.text(0, 22, shirt.label, {
        fontSize: '14px',
        color: '#666666',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5);
      container.add(label);

      container.setSize(70, 50);
      container.setInteractive({ useHandCursor: true, draggable: true });
      container.setData('type', 'shirt');
      container.setData('name', shirt.name);
      container.setData('originalX', x);
      container.setData('originalY', y);

      this.clothingItems.push({ graphics: container, type: 'shirt', name: shirt.name, equipped: false });

      // Entry animation
      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        delay: (i + 3) * 100,
        ease: 'Back.easeOut',
      });
    });
  }

  private createPants(x: number) {
    const pants = [
      { name: 'shorts', label: '短裤', draw: (g: Phaser.GameObjects.Graphics) => {
        g.fillStyle(0xFF9800);
        g.fillRect(-20, -10, 18, 25);
        g.fillRect(2, -10, 18, 25);
        g.fillRect(-20, -10, 40, 10);
      }},
      { name: 'long', label: '长裤', draw: (g: Phaser.GameObjects.Graphics) => {
        g.fillStyle(0x3F51B5);
        g.fillRect(-20, -15, 16, 40);
        g.fillRect(4, -15, 16, 40);
        g.fillRect(-20, -15, 40, 10);
      }},
      { name: 'skirt', label: '裙子', draw: (g: Phaser.GameObjects.Graphics) => {
        g.fillStyle(0x9C27B0);
        g.fillRect(-15, -12, 30, 8);
        g.fillTriangle(-25, 20, 0, -4, 25, 20);
      }},
    ];

    pants.forEach((pant, i) => {
      const y = 120 + i * 80;
      const container = this.add.container(x, y);

      const g = this.add.graphics();
      pant.draw(g);
      container.add(g);

      const label = this.add.text(0, 28, pant.label, {
        fontSize: '14px',
        color: '#666666',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5);
      container.add(label);

      container.setSize(60, 55);
      container.setInteractive({ useHandCursor: true, draggable: true });
      container.setData('type', 'pants');
      container.setData('name', pant.name);
      container.setData('originalX', x);
      container.setData('originalY', y);

      this.clothingItems.push({ graphics: container, type: 'pants', name: pant.name, equipped: false });

      // Entry animation
      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        delay: (i + 6) * 100,
        ease: 'Back.easeOut',
      });
    });
  }

  private showCelebration() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 120, 400, 240, 24);

    this.add.text(width / 2, height / 2 - 60, '🎉 真漂亮！', {
      fontSize: '40px',
      color: '#E91E63',
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

    this.add.text(width / 2, height / 2 + 40, '你搭配得真好看！', {
      fontSize: '20px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    const againBtn = this.add.text(width / 2, height / 2 + 85, '再来一次 🔄', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#E91E63',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    againBtn.on('pointerdown', () => this.scene.restart());
  }
}
