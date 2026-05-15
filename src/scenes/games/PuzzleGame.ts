import Phaser from 'phaser';
import { enhanceGameScene } from '../../components/GameExperience';
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

    // Forest-like background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xE8F5E9, 0xC8E6C9, 0xA5D6A7, 0x81C784);
    bg.fillRect(0, 0, width, height);

    // Ground strip
    const ground = this.add.graphics();
    ground.fillStyle(0x689F38, 0.5);
    ground.fillRect(0, height - 30, width, 30);
    ground.fillStyle(0x7CB342, 0.4);
    for (let x = 0; x < width; x += 18) {
      ground.fillEllipse(x + 9, height - 28, 14, 4 + Math.sin(x * 0.06) * 4);
    }

    // Flowers
    for (let i = 0; i < 6; i++) {
      const fx = 30 + (i / 5) * (width - 60);
      const f = this.add.image(fx, height - 36, `flower_${i % 6}`);
      f.setScale(0.65);
      f.setAlpha(0.65);
    }

    // Clouds
    for (let i = 0; i < 3; i++) {
      const cloud = this.add.image(Phaser.Math.Between(40, width - 40), Phaser.Math.Between(8, 40), 'cloud_deco');
      cloud.setAlpha(0.3);
      cloud.setScale(Phaser.Math.FloatBetween(0.5, 0.9));
    }

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
    enhanceGameScene(this, 'PuzzleGame');

    this.createPuzzle();
  }

  private createPuzzle() {
    const { width, height } = this.scale;

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

    const shuffledAnimals = Phaser.Utils.Array.Shuffle([...allAnimals]);
    const selected = shuffledAnimals.slice(0, this.totalPieces);

    const slots: { x: number; y: number; key: string; name: string }[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = gridStartX + col * (slotSize + gap);
        const y = gridStartY + row * (slotSize + gap);
        const idx = row * cols + col;
        const animal = selected[idx];

        // Slot with shadow
        const slotShadow = this.add.graphics();
        slotShadow.fillStyle(0x000000, 0.06);
        slotShadow.fillRoundedRect(x - slotSize / 2 + 2, y - slotSize / 2 + 2, slotSize, slotSize, 12);

        const slot = this.add.graphics();
        slot.fillStyle(0xffffff, 0.7);
        slot.fillRoundedRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, 12);
        slot.lineStyle(2, 0xBDBDBD, 0.5);
        slot.strokeRoundedRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize, 12);

        // Silhouette hint
        const hint = this.add.image(x, y, animal.key);
        hint.setDisplaySize(78, 78);
        hint.setAlpha(0.12);
        hint.setTint(0x000000);

        // Name label
        this.add.text(x, y + slotSize / 2 - 8, animal.name, {
          fontSize: '13px',
          color: '#9E9E9E',
          fontFamily: 'sans-serif',
        }).setOrigin(0.5);

        slots.push({ x, y, key: animal.key, name: animal.name });
      }
    }

    // Draggable pieces
    const shuffledSlots = Phaser.Utils.Array.Shuffle([...slots]);

    shuffledSlots.forEach((slot, i) => {
      let startX: number, startY: number;
      if (i < this.totalPieces / 2) {
        startX = Phaser.Math.Between(30, 80);
        startY = Phaser.Math.Between(90, height - 50);
      } else {
        startX = Phaser.Math.Between(width - 80, width - 30);
        startY = Phaser.Math.Between(90, height - 50);
      }

      const piece = this.add.image(startX, startY, slot.key);
      piece.setDisplaySize(88, 88);
      piece.setInteractive({ useHandCursor: true, draggable: true });
      piece.setData('targetX', slot.x);
      piece.setData('targetY', slot.y);
      piece.setData('targetKey', slot.key);

      // White circular background with shadow
      const bgG = this.add.graphics();
      bgG.fillStyle(0x000000, 0.06);
      bgG.fillEllipse(startX + 2, startY + 2, 86, 86);
      bgG.fillStyle(0xffffff, 0.9);
      bgG.fillCircle(startX, startY, 43);
      bgG.lineStyle(2, 0x66BB6A, 0.6);
      bgG.strokeCircle(startX, startY, 43);
      piece.setData('bg', bgG);

      piece.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        piece.x = dragX;
        piece.y = dragY;
        const pb = piece.getData('bg') as Phaser.GameObjects.Graphics;
        pb.clear();
        pb.fillStyle(0x000000, 0.06);
        pb.fillEllipse(dragX + 2, dragY + 2, 86, 86);
        pb.fillStyle(0xffffff, 0.9);
        pb.fillCircle(dragX, dragY, 43);
        pb.lineStyle(2, 0x66BB6A, 0.6);
        pb.strokeCircle(dragX, dragY, 43);
      });

      piece.on('dragend', () => {
        const targetX = piece.getData('targetX');
        const targetY = piece.getData('targetY');
        const dist = Phaser.Math.Distance.Between(piece.x, piece.y, targetX, targetY);

        if (dist < 60) {
          piece.disableInteractive();
          const pb = piece.getData('bg') as Phaser.GameObjects.Graphics;
          pb.destroy();

          this.tweens.add({
            targets: piece,
            x: targetX,
            y: targetY,
            displayWidth: 95,
            displayHeight: 95,
            duration: 200,
            ease: 'Back.easeOut',
          });

          this.placedCount++;
          this.showCorrectFeedback(targetX, targetY);

          if (this.placedCount >= this.totalPieces) {
            this.time.delayedCall(600, () => this.showComplete());
          }
        } else {
          // Snap to original position
          const pb = piece.getData('bg') as Phaser.GameObjects.Graphics;
          pb.clear();
          pb.fillStyle(0x000000, 0.06);
          pb.fillEllipse(startX + 2, startY + 2, 86, 86);
          pb.fillStyle(0xffffff, 0.9);
          pb.fillCircle(startX, startY, 43);
          pb.lineStyle(2, 0x66BB6A, 0.6);
          pb.strokeCircle(startX, startY, 43);

          this.tweens.add({
            targets: piece,
            x: startX,
            y: startY,
            duration: 300,
            ease: 'Back.easeOut',
          });
        }
      });
    });

    this.add.text(width / 2, height - 12, '把动物拖到对应的影子位置', {
      fontSize: '15px',
      color: '#8D6E63',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private showCorrectFeedback(x: number, y: number) {
    const star = this.add.image(x, y, 'star_gold').setScale(0);
    this.tweens.add({
      targets: star,
      scale: 1.4,
      alpha: 0,
      duration: 500,
      onComplete: () => star.destroy(),
    });
  }

  private showComplete() {
    const { width, height } = this.scale;

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
