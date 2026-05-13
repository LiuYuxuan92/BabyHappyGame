import Phaser from 'phaser';
import { showConfetti, showFireworks } from '../../components/Particles';

export class PuzzleGame extends Phaser.Scene {
  private placedCount = 0;
  private totalPieces = 0;

  constructor() {
    super({ key: 'PuzzleGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.placedCount = 0;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xE8F5E9, 0xE8F5E9, 0xC8E6C9, 0xC8E6C9);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '🧩 动物拼图', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.createPuzzle();
  }

  private createPuzzle() {
    const { width, height } = this.scale;

    // Pick random animals for the puzzle
    const allAnimals = [
      { key: 'animal_bear', name: '熊' },
      { key: 'animal_cat', name: '猫' },
      { key: 'animal_cow', name: '牛' },
      { key: 'animal_dog', name: '狗' },
      { key: 'animal_elephant', name: '象' },
      { key: 'animal_giraffe', name: '长颈鹿' },
      { key: 'animal_monkey', name: '猴' },
      { key: 'animal_penguin', name: '企鹅' },
      { key: 'animal_owl', name: '猫头鹰' },
      { key: 'animal_sheep', name: '羊' },
      { key: 'animal_zebra', name: '斑马' },
      { key: 'animal_kangaroo', name: '袋鼠' },
    ];

    const cols = 4;
    const rows = 3;
    this.totalPieces = cols * rows;

    const slotSize = 120;
    const gap = 12;
    const totalW = cols * slotSize + (cols - 1) * gap;
    const totalH = rows * slotSize + (rows - 1) * gap;
    const gridStartX = width / 2 - totalW / 2 + slotSize / 2;
    const gridStartY = height / 2 - totalH / 2 + slotSize / 2 + 20;

    // Pick animals for slots
    const shuffledAnimals = Phaser.Utils.Array.Shuffle([...allAnimals]);
    const selected = shuffledAnimals.slice(0, this.totalPieces);

    // Create target slots (grayed out silhouettes)
    const slots: { x: number; y: number; key: string; name: string }[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = gridStartX + col * (slotSize + gap);
        const y = gridStartY + row * (slotSize + gap);
        const idx = row * cols + col;
        const animal = selected[idx];

        // Slot background
        const slot = this.add.graphics();
        slot.fillStyle(0xE0E0E0, 0.6);
        slot.fillRoundedRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, 12);
        slot.lineStyle(2, 0xBDBDBD);
        slot.strokeRoundedRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, 12);

        // Silhouette hint
        const hint = this.add.image(x, y, animal.key);
        hint.setDisplaySize(70, 70);
        hint.setAlpha(0.15);
        hint.setTint(0x000000);

        // Name label below slot
        this.add.text(x, y + slotSize / 2 - 8, animal.name, {
          fontSize: '14px',
          color: '#999999',
          fontFamily: 'sans-serif',
        }).setOrigin(0.5);

        slots.push({ x, y, key: animal.key, name: animal.name });
      }
    }

    // Create draggable pieces scattered on left and right sides
    const shuffledSlots = Phaser.Utils.Array.Shuffle([...slots]);

    shuffledSlots.forEach((slot, i) => {
      // Place pieces on left or right side
      let startX: number, startY: number;
      if (i < this.totalPieces / 2) {
        startX = Phaser.Math.Between(30, 80);
        startY = Phaser.Math.Between(90, height - 50);
      } else {
        startX = Phaser.Math.Between(width - 80, width - 30);
        startY = Phaser.Math.Between(90, height - 50);
      }

      const piece = this.add.image(startX, startY, slot.key);
      piece.setDisplaySize(75, 75);
      piece.setInteractive({ useHandCursor: true, draggable: true });
      piece.setData('targetX', slot.x);
      piece.setData('targetY', slot.y);
      piece.setData('targetKey', slot.key);

      // Add white background circle behind piece
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 0.9);
      bg.fillCircle(startX, startY, 45);
      bg.lineStyle(2, 0x4CAF50);
      bg.strokeCircle(startX, startY, 45);
      piece.setData('bg', bg);

      piece.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        piece.x = dragX;
        piece.y = dragY;
        const pieceBg = piece.getData('bg') as Phaser.GameObjects.Graphics;
        pieceBg.clear();
        pieceBg.fillStyle(0xffffff, 0.9);
        pieceBg.fillCircle(dragX, dragY, 45);
        pieceBg.lineStyle(2, 0x4CAF50);
        pieceBg.strokeCircle(dragX, dragY, 45);
      });

      piece.on('dragend', () => {
        const targetX = piece.getData('targetX');
        const targetY = piece.getData('targetY');
        const dist = Phaser.Math.Distance.Between(piece.x, piece.y, targetX, targetY);

        if (dist < 60) {
          piece.disableInteractive();
          const pieceBg = piece.getData('bg') as Phaser.GameObjects.Graphics;
          pieceBg.destroy();

          this.tweens.add({
            targets: piece,
            x: targetX,
            y: targetY,
            displayWidth: 85,
            displayHeight: 85,
            duration: 200,
            ease: 'Back.easeOut',
          });

          this.placedCount++;
          this.showCorrectFeedback(targetX, targetY);

          if (this.placedCount >= this.totalPieces) {
            this.time.delayedCall(600, () => this.showComplete());
          }
        }
      });
    });

    this.add.text(width / 2, height - 15, '把动物拖到对应的影子位置', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private showCorrectFeedback(x: number, y: number) {
    const star = this.add.image(x, y, 'star_gold').setScale(0);
    this.tweens.add({
      targets: star,
      scale: 1.2,
      alpha: 0,
      duration: 500,
      onComplete: () => star.destroy(),
    });
  }

  private showComplete() {
    const { width, height } = this.scale;

    // Celebration particles
    showConfetti(this);
    showFireworks(this, width / 2, height / 2 - 50);

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 120, 400, 240, 24);

    this.add.text(width / 2, height / 2 - 60, '🎉 拼图完成！', {
      fontSize: '38px',
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

    const nextBtn = this.add.text(width / 2, height / 2 + 70, '再来一次 🔄', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#2196F3',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => this.scene.restart());
  }
}
