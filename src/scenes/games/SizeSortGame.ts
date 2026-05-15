import Phaser from 'phaser';
import { enhanceGameScene, recordGameComplete } from '../../components/GameExperience';

interface SortableItem {
  sprite: Phaser.GameObjects.Image;
  originalScale: number;
  correctSlot: number;
  currentSlot: number | null;
}

export class SizeSortGame extends Phaser.Scene {
  private items: SortableItem[] = [];
  private slots: { x: number; y: number; occupied: boolean; index: number }[] = [];
  private level = 1;
  private itemCount = 3;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private dragStartX = 0;
  private dragStartY = 0;

  private readonly animalKey = 'animal_elephant';

  constructor() {
    super({ key: 'SizeSortGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.items = [];
    this.slots = [];

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFCE4EC, 0xFCE4EC, 0xF8BBD0, 0xF8BBD0);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '📏 大小排序', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    enhanceGameScene(this, 'SizeSortGame');

    // Level display
    this.levelText = this.add.text(width - 20, 25, `第 ${this.level} 关`, {
      fontSize: '22px',
      color: '#E91E63',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // Score/progress
    this.scoreText = this.add.text(width - 20, 55, `${this.itemCount} 个物品`, {
      fontSize: '18px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(1, 0.5);

    // Instruction
    this.add.text(width / 2, 75, '把动物从小到大排列（左到右）', {
      fontSize: '18px',
      color: '#777777',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Determine item count based on level
    this.itemCount = Math.min(3 + this.level - 1, 5);
    this.scoreText.setText(`${this.itemCount} 个物品`);

    this.createSlots();
    this.createItems();
    this.setupDrag();

    // Bottom instruction
    this.add.text(width / 2, height - 20, '拖动动物到下方格子里，从小到大排列', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private createSlots() {
    const { width, height } = this.scale;
    const slotSize = 110;
    const gap = 16;
    const totalW = this.itemCount * slotSize + (this.itemCount - 1) * gap;
    const startX = (width - totalW) / 2 + slotSize / 2;
    const slotY = height - 130;

    for (let i = 0; i < this.itemCount; i++) {
      const x = startX + i * (slotSize + gap);

      // Slot visual
      const slotGfx = this.add.graphics();
      slotGfx.fillStyle(0xFFFFFF, 0.7);
      slotGfx.fillRoundedRect(x - slotSize / 2, slotY - slotSize / 2, slotSize, slotSize, 14);
      slotGfx.lineStyle(3, 0xE91E63, 0.6);
      slotGfx.strokeRoundedRect(x - slotSize / 2, slotY - slotSize / 2, slotSize, slotSize, 14);

      // Slot number label
      this.add.text(x, slotY + slotSize / 2 + 14, `${i + 1}`, {
        fontSize: '20px',
        color: '#E91E63',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Size hint: small arrow to large
      if (i === 0) {
        this.add.text(x, slotY - slotSize / 2 - 14, '小', {
          fontSize: '16px',
          color: '#999999',
          fontFamily: 'sans-serif',
        }).setOrigin(0.5);
      } else if (i === this.itemCount - 1) {
        this.add.text(x, slotY - slotSize / 2 - 14, '大', {
          fontSize: '16px',
          color: '#999999',
          fontFamily: 'sans-serif',
        }).setOrigin(0.5);
      }

      this.slots.push({ x, y: slotY, occupied: false, index: i });
    }
  }

  private createItems() {
    const { width, height } = this.scale;

    // Generate scales from small to large
    const minScale = 0.4;
    const maxScale = 1.2;
    const scaleStep = (maxScale - minScale) / (this.itemCount - 1);

    const scales: number[] = [];
    for (let i = 0; i < this.itemCount; i++) {
      scales.push(minScale + i * scaleStep);
    }

    // Shuffle for display
    const shuffledScales = Phaser.Utils.Array.Shuffle([...scales]);

    // Place items in the upper play area
    const playAreaTop = 110;
    const playAreaBottom = height - 260;
    const playAreaLeft = 100;
    const playAreaRight = width - 100;

    const positions = this.generatePositions(
      this.itemCount,
      playAreaLeft,
      playAreaRight,
      playAreaTop,
      playAreaBottom,
      120
    );

    shuffledScales.forEach((scale, i) => {
      const pos = positions[i];
      const sprite = this.add.image(pos.x, pos.y, this.animalKey);
      sprite.setScale(scale * 0.7); // Adjust base size
      sprite.setInteractive({ useHandCursor: true, draggable: true });

      // Determine correct slot (sorted index based on scale)
      const sortedIndex = scales.indexOf(scale);

      sprite.setData('itemIndex', i);
      sprite.setData('originalX', pos.x);
      sprite.setData('originalY', pos.y);

      const item: SortableItem = {
        sprite,
        originalScale: scale,
        correctSlot: sortedIndex,
        currentSlot: null,
      };

      this.items.push(item);

      // Entrance animation
      sprite.setAlpha(0);
      this.tweens.add({
        targets: sprite,
        alpha: 1,
        y: pos.y,
        duration: 400,
        delay: i * 120,
        ease: 'Back.easeOut',
      });
    });
  }

  private generatePositions(
    count: number,
    left: number,
    right: number,
    top: number,
    bottom: number,
    minDist: number
  ): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    let attempts = 0;

    while (positions.length < count && attempts < 500) {
      const x = Phaser.Math.Between(left, right);
      const y = Phaser.Math.Between(top, bottom);
      let valid = true;

      for (const pos of positions) {
        if (Phaser.Math.Distance.Between(x, y, pos.x, pos.y) < minDist) {
          valid = false;
          break;
        }
      }

      if (valid) {
        positions.push({ x, y });
      }
      attempts++;
    }

    // Fallback grid
    if (positions.length < count) {
      positions.length = 0;
      const spacing = (right - left) / (count + 1);
      const midY = (top + bottom) / 2;
      for (let i = 0; i < count; i++) {
        positions.push({
          x: left + spacing * (i + 1),
          y: midY + Phaser.Math.Between(-30, 30),
        });
      }
    }

    return positions;
  }

  private setupDrag() {
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      this.dragStartX = obj.x;
      this.dragStartY = obj.y;
      obj.setDepth(10);

      // Scale up slightly when picked up
      this.tweens.add({
        targets: obj,
        scaleX: obj.scaleX * 1.1,
        scaleY: obj.scaleY * 1.1,
        duration: 100,
      });

      // Free up the slot this item was in
      const item = this.items.find(it => it.sprite === obj);
      if (item && item.currentSlot !== null) {
        this.slots[item.currentSlot].occupied = false;
        item.currentSlot = null;
      }
    });

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
      obj.x = dragX;
      obj.y = dragY;
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      obj.setDepth(0);
      const item = this.items.find(it => it.sprite === obj);
      if (!item) return;

      // Restore scale
      const targetScale = item.originalScale * 0.7;

      // Check if near a slot
      let snapped = false;
      for (const slot of this.slots) {
        const dist = Phaser.Math.Distance.Between(obj.x, obj.y, slot.x, slot.y);
        if (dist < 70 && !slot.occupied) {
          // Snap to slot
          slot.occupied = true;
          item.currentSlot = slot.index;
          snapped = true;

          this.tweens.add({
            targets: obj,
            x: slot.x,
            y: slot.y,
            scaleX: targetScale,
            scaleY: targetScale,
            duration: 200,
            ease: 'Back.easeOut',
          });
          break;
        }
      }

      if (!snapped) {
        // Return to original position
        this.tweens.add({
          targets: obj,
          x: obj.getData('originalX'),
          y: obj.getData('originalY'),
          scaleX: targetScale,
          scaleY: targetScale,
          duration: 300,
          ease: 'Back.easeOut',
        });
      }

      // Check if all items are placed
      this.time.delayedCall(250, () => this.checkCompletion());
    });
  }

  private checkCompletion() {
    // Check if all slots are filled
    const allPlaced = this.items.every(item => item.currentSlot !== null);
    if (!allPlaced) return;

    // Check if order is correct
    const isCorrect = this.items.every(item => item.currentSlot === item.correctSlot);

    if (isCorrect) {
      this.showSuccess();
    } else {
      this.showTryAgain();
    }
  }

  private showSuccess() {
    const { width, height } = this.scale;

    // Disable all dragging
    this.items.forEach(item => item.sprite.disableInteractive());

    // Celebrate each item
    this.items.forEach((item, i) => {
      this.time.delayedCall(i * 150, () => {
        this.tweens.add({
          targets: item.sprite,
          y: item.sprite.y - 20,
          duration: 200,
          yoyo: true,
          ease: 'Sine.easeOut',
        });

        const star = this.add.image(item.sprite.x, item.sprite.y - 40, 'star_gold').setScale(0);
        this.tweens.add({
          targets: star,
          scale: 1,
          alpha: 0,
          y: star.y - 40,
          duration: 600,
          onComplete: () => star.destroy(),
        });
      });
    });

    // Show completion after celebration
    this.time.delayedCall(this.itemCount * 150 + 600, () => {
      this.showLevelComplete();
    });
  }

  private showTryAgain() {
    const { width, height } = this.scale;

    // Shake all items gently
    this.items.forEach(item => {
      this.tweens.add({
        targets: item.sprite,
        x: item.sprite.x - 5,
        duration: 50,
        yoyo: true,
        repeat: 3,
      });
    });

    // Show hint text
    const hintText = this.add.text(width / 2, height / 2 - 60, '再试试~ 从小到大哦', {
      fontSize: '28px',
      color: '#FF7043',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: hintText,
      alpha: 0,
      y: hintText.y - 40,
      duration: 1200,
      delay: 500,
      onComplete: () => hintText.destroy(),
    });
  }

  private showLevelComplete() {
    const { width, height } = this.scale;
    recordGameComplete(this, 'SizeSortGame', 3, '大小顺序排好了');

    // Overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    // Panel
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 140, 400, 280, 24);

    // Title
    this.add.text(width / 2, height / 2 - 80, '🎉 排对了！', {
      fontSize: '40px',
      color: '#E91E63',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Level info
    this.add.text(width / 2, height / 2 - 30, `第 ${this.level} 关完成`, {
      fontSize: '22px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Stars
    const stars = 3;
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(
        width / 2 - 50 + i * 50,
        height / 2 + 20,
        i < stars ? 'star_gold' : 'star_gray'
      );
      star.setScale(0);
      this.tweens.add({
        targets: star,
        scale: 1,
        duration: 300,
        delay: i * 200,
        ease: 'Back.easeOut',
      });
    }

    // Next level button (if not at max)
    if (this.itemCount < 5) {
      const nextBtn = this.add.text(width / 2, height / 2 + 85, '下一关 ▶', {
        fontSize: '26px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        backgroundColor: '#E91E63',
        padding: { x: 30, y: 12 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      nextBtn.on('pointerdown', () => {
        this.level++;
        this.scene.restart();
      });
    } else {
      // Final level - show replay
      const replayBtn = this.add.text(width / 2, height / 2 + 85, '再玩一次 🔄', {
        fontSize: '26px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        backgroundColor: '#E91E63',
        padding: { x: 30, y: 12 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      replayBtn.on('pointerdown', () => {
        this.level = 1;
        this.scene.restart();
      });
    }
  }
}
