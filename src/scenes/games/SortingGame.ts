import Phaser from 'phaser';

interface SortItem {
  imageKey: string;
  category: string;
  sprite?: Phaser.GameObjects.Image;
}

export class SortingGame extends Phaser.Scene {
  private items: SortItem[] = [];
  private score = 0;
  private totalItems = 0;
  private level = 1;
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'SortingGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.score = 0;
    this.items = [];

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFFF8E1, 0xFFF8E1, 0xFFECB3, 0xFFECB3);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '🐾 动物分类', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.scoreText = this.add.text(width - 20, 35, '⭐ 0', {
      fontSize: '24px',
      color: '#FF8C00',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this.setupLevel();
  }

  private setupLevel() {
    const { width, height } = this.scale;

    // Define categories based on level
    const categories = this.getLevelCategories();
    this.totalItems = 0;

    // Create drop zones at bottom
    const zoneY = height - 90;
    const zoneSpacing = width / (categories.length + 1);

    categories.forEach((cat, i) => {
      const x = zoneSpacing * (i + 1);

      // Zone visual with sample image
      const zone = this.add.graphics();
      zone.fillStyle(0xffffff, 0.8);
      zone.fillRoundedRect(x - 65, zoneY - 65, 130, 130, 16);
      zone.lineStyle(4, cat.color);
      zone.strokeRoundedRect(x - 65, zoneY - 65, 130, 130, 16);

      // Category label icon
      const icon = this.add.image(x, zoneY - 20, cat.sampleKey);
      icon.setDisplaySize(60, 60);
      icon.setAlpha(0.4);

      // Zone label
      this.add.text(x, zoneY + 50, cat.label, {
        fontSize: '18px',
        color: '#555555',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Create draggable items for this category
      cat.items.forEach((itemKey) => {
        const randX = Phaser.Math.Between(120, width - 120);
        const randY = Phaser.Math.Between(100, height - 260);

        const sprite = this.add.image(randX, randY, itemKey);
        sprite.setDisplaySize(80, 80);
        sprite.setInteractive({ useHandCursor: true, draggable: true });
        sprite.setData('category', cat.id);
        sprite.setData('zoneX', x);
        sprite.setData('zoneY', zoneY);
        sprite.setData('originalX', randX);
        sprite.setData('originalY', randY);

        this.items.push({ imageKey: itemKey, category: cat.id, sprite });
        this.totalItems++;
      });
    });

    // Drag events
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
      obj.x = dragX;
      obj.y = dragY;
      obj.setScale(1.1);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      obj.setScale(1);
      const itemCat = obj.getData('category');
      const zoneX = obj.getData('zoneX');
      const zoneY2 = obj.getData('zoneY');

      const dist = Phaser.Math.Distance.Between(obj.x, obj.y, zoneX, zoneY2);
      if (dist < 90) {
        obj.disableInteractive();
        this.tweens.add({
          targets: obj,
          x: zoneX + Phaser.Math.Between(-25, 25),
          y: zoneY2 + Phaser.Math.Between(-25, 25),
          displayWidth: 50,
          displayHeight: 50,
          duration: 200,
        });
        this.score++;
        this.scoreText.setText(`⭐ ${this.score}`);
        this.showCorrectFeedback(obj.x, obj.y);

        if (this.score >= this.totalItems) {
          this.time.delayedCall(500, () => this.showLevelComplete());
        }
      } else {
        // Check if dropped on wrong zone - give feedback
        this.tweens.add({
          targets: obj,
          x: obj.getData('originalX'),
          y: obj.getData('originalY'),
          duration: 300,
          ease: 'Back.easeOut',
        });
        this.showWrongFeedback(obj.x, obj.y);
      }
    });

    // Instruction
    this.add.text(width / 2, height - 15, '把动物拖到对应的分类框里', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private getLevelCategories() {
    if (this.level <= 1) {
      return [
        {
          id: 'land',
          label: '陆地动物',
          color: 0x8BC34A,
          sampleKey: 'animal_bear',
          items: ['animal_bear', 'animal_cat', 'animal_dog', 'animal_cow'],
        },
        {
          id: 'water',
          label: '水中动物',
          color: 0x03A9F4,
          sampleKey: 'fish_blue',
          items: ['fish_blue', 'fish_green', 'fish_orange', 'fish_brown'],
        },
      ];
    } else if (this.level === 2) {
      return [
        {
          id: 'farm',
          label: '农场动物',
          color: 0x8BC34A,
          sampleKey: 'animal_cow',
          items: ['animal_cow', 'animal_sheep', 'animal_dog'],
        },
        {
          id: 'wild',
          label: '野生动物',
          color: 0xFF9800,
          sampleKey: 'animal_elephant',
          items: ['animal_elephant', 'animal_giraffe', 'animal_zebra'],
        },
        {
          id: 'water',
          label: '水中动物',
          color: 0x03A9F4,
          sampleKey: 'fish_blue',
          items: ['fish_blue', 'fish_green', 'fish_orange'],
        },
      ];
    } else {
      return [
        {
          id: 'farm',
          label: '农场',
          color: 0x8BC34A,
          sampleKey: 'animal_cow',
          items: ['animal_cow', 'animal_sheep', 'animal_cat', 'animal_dog'],
        },
        {
          id: 'wild',
          label: '野生',
          color: 0xFF9800,
          sampleKey: 'animal_elephant',
          items: ['animal_elephant', 'animal_giraffe', 'animal_monkey', 'animal_kangaroo'],
        },
        {
          id: 'water',
          label: '水中',
          color: 0x03A9F4,
          sampleKey: 'fish_blue',
          items: ['fish_blue', 'fish_green', 'fish_orange', 'fish_brown'],
        },
      ];
    }
  }

  private showCorrectFeedback(x: number, y: number) {
    const star = this.add.image(x, y, 'star_gold').setScale(0);
    this.tweens.add({
      targets: star,
      scale: 1.5,
      alpha: 0,
      duration: 600,
      onComplete: () => star.destroy(),
    });
    const text = this.add.text(x, y - 30, '棒！', {
      fontSize: '28px',
      color: '#FF6B35',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 80,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  private showWrongFeedback(x: number, y: number) {
    const text = this.add.text(x, y - 30, '再试试~', {
      fontSize: '22px',
      color: '#999999',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    });
  }

  private showLevelComplete() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 120, 400, 240, 24);

    this.add.text(width / 2, height / 2 - 60, '🎉 太棒了！', {
      fontSize: '40px',
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

    const nextBtn = this.add.text(width / 2, height / 2 + 70, '下一关 ▶', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#4CAF50',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => {
      this.level++;
      this.score = 0;
      this.scene.restart();
    });
  }
}
