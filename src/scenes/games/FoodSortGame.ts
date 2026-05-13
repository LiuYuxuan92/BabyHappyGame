import Phaser from 'phaser';

interface FoodItem {
  key: string;
  category: 'fruit' | 'vegetable';
  sprite?: Phaser.GameObjects.Image;
}

export class FoodSortGame extends Phaser.Scene {
  private foodItems: FoodItem[] = [];
  private score = 0;
  private totalItems = 8;
  private scoreText!: Phaser.GameObjects.Text;
  private fruitZone = { x: 0, y: 0 };
  private vegZone = { x: 0, y: 0 };

  constructor() {
    super({ key: 'FoodSortGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.score = 0;
    this.foodItems = [];

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xE8F5E9, 0xE8F5E9, 0xC8E6C9, 0xC8E6C9);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '🍎 食物分类', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.scoreText = this.add.text(width - 20, 35, '⭐ 0 / 8', {
      fontSize: '22px',
      color: '#FF8C00',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // Create baskets/zones at bottom
    const zoneY = height - 100;
    this.fruitZone = { x: width / 4, y: zoneY };
    this.vegZone = { x: (width / 4) * 3, y: zoneY };

    // Fruit basket
    this.drawBasket(this.fruitZone.x, this.fruitZone.y, 0xFF5722, '水果 🍎');
    // Vegetable basket
    this.drawBasket(this.vegZone.x, this.vegZone.y, 0x4CAF50, '蔬菜 🥬');

    // Create food items
    this.createFoodItems();

    // Drag events
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
      obj.x = dragX;
      obj.y = dragY;
      obj.setScale(1.1);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      obj.setScale(1);
      const category = obj.getData('category') as string;

      const distFruit = Phaser.Math.Distance.Between(obj.x, obj.y, this.fruitZone.x, this.fruitZone.y);
      const distVeg = Phaser.Math.Distance.Between(obj.x, obj.y, this.vegZone.x, this.vegZone.y);

      let droppedOn: string | null = null;
      if (distFruit < 100) droppedOn = 'fruit';
      else if (distVeg < 100) droppedOn = 'vegetable';

      if (droppedOn === category) {
        // Correct placement
        obj.disableInteractive();
        const targetZone = category === 'fruit' ? this.fruitZone : this.vegZone;
        this.tweens.add({
          targets: obj,
          x: targetZone.x + Phaser.Math.Between(-30, 30),
          y: targetZone.y + Phaser.Math.Between(-30, -10),
          displayWidth: 45,
          displayHeight: 45,
          duration: 200,
        });
        this.score++;
        this.scoreText.setText(`⭐ ${this.score} / 8`);
        this.showCorrectFeedback(obj.x, obj.y);

        if (this.score >= this.totalItems) {
          this.time.delayedCall(600, () => this.showComplete());
        }
      } else if (droppedOn !== null) {
        // Wrong basket - bounce back with feedback
        this.showWrongFeedback(obj.x, obj.y);
        this.tweens.add({
          targets: obj,
          x: obj.getData('originalX'),
          y: obj.getData('originalY'),
          duration: 400,
          ease: 'Back.easeOut',
        });
      } else {
        // Dropped in empty space - bounce back
        this.tweens.add({
          targets: obj,
          x: obj.getData('originalX'),
          y: obj.getData('originalY'),
          duration: 300,
          ease: 'Back.easeOut',
        });
      }
    });

    // Instruction
    this.add.text(width / 2, height - 15, '把食物拖到正确的篮子里', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private drawBasket(x: number, y: number, color: number, label: string) {
    const basket = this.add.graphics();
    basket.fillStyle(0xffffff, 0.8);
    basket.fillRoundedRect(x - 70, y - 60, 140, 120, 16);
    basket.lineStyle(4, color);
    basket.strokeRoundedRect(x - 70, y - 60, 140, 120, 16);

    // Basket bottom decoration
    basket.fillStyle(color, 0.2);
    basket.fillRoundedRect(x - 60, y - 10, 120, 60, 10);

    this.add.text(x, y + 65, label, {
      fontSize: '22px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private createFoodItems() {
    const { width, height } = this.scale;

    // food_01 to food_04 = fruits, food_05 to food_08 = vegetables
    const fruits: FoodItem[] = [
      { key: 'food_01', category: 'fruit' },
      { key: 'food_02', category: 'fruit' },
      { key: 'food_03', category: 'fruit' },
      { key: 'food_04', category: 'fruit' },
    ];
    const vegetables: FoodItem[] = [
      { key: 'food_05', category: 'vegetable' },
      { key: 'food_06', category: 'vegetable' },
      { key: 'food_07', category: 'vegetable' },
      { key: 'food_08', category: 'vegetable' },
    ];

    const allItems = [...fruits, ...vegetables];
    Phaser.Utils.Array.Shuffle(allItems);

    // Place items scattered in the upper portion of the screen
    const margin = 80;
    const areaTop = 80;
    const areaBottom = height - 220;

    allItems.forEach((item, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const cellW = (width - margin * 2) / 4;
      const cellH = (areaBottom - areaTop) / 2;

      const x = margin + cellW * col + cellW / 2 + Phaser.Math.Between(-20, 20);
      const y = areaTop + cellH * row + cellH / 2 + Phaser.Math.Between(-15, 15);

      const sprite = this.add.image(x, y, item.key);
      sprite.setDisplaySize(70, 70);
      sprite.setInteractive({ useHandCursor: true, draggable: true });
      sprite.setData('category', item.category);
      sprite.setData('originalX', x);
      sprite.setData('originalY', y);

      item.sprite = sprite;
      this.foodItems.push(item);

      // Entry animation
      sprite.setScale(0);
      this.tweens.add({
        targets: sprite,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        delay: i * 100,
        ease: 'Back.easeOut',
      });
    });
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
    const text = this.add.text(x, y - 30, '正确！', {
      fontSize: '26px',
      color: '#4CAF50',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 70,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  private showWrongFeedback(x: number, y: number) {
    const text = this.add.text(x, y - 30, '再想想~', {
      fontSize: '22px',
      color: '#F44336',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    });

    // Gentle shake on wrong answer
    this.cameras.main.shake(200, 0.003);
  }

  private showComplete() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 120, 400, 240, 24);

    this.add.text(width / 2, height / 2 - 60, '🎉 全部分类正确！', {
      fontSize: '34px',
      color: '#4CAF50',
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

    this.add.text(width / 2, height / 2 + 40, '你真是食物分类小能手！', {
      fontSize: '20px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    const againBtn = this.add.text(width / 2, height / 2 + 85, '再来一次 🔄', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#4CAF50',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    againBtn.on('pointerdown', () => this.scene.restart());
  }
}
