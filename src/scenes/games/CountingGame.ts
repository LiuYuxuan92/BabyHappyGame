import Phaser from 'phaser';
import { enhanceGameScene, recordGameComplete } from '../../components/GameExperience';
import { showStarBurst } from '../../components/Particles';

export class CountingGame extends Phaser.Scene {
  private score = 0;
  private round = 0;
  private totalRounds = 5;
  private correctAnswer = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private animalSprites: Phaser.GameObjects.Image[] = [];
  private numberButtons: Phaser.GameObjects.Container[] = [];
  private feedbackLocked = false;

  private readonly animalKeys = [
    'animal_bear', 'animal_cat', 'animal_dog',
    'animal_cow', 'animal_penguin', 'animal_owl',
  ];

  constructor() {
    super({ key: 'CountingGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.score = 0;
    this.round = 0;
    this.animalSprites = [];
    this.numberButtons = [];
    this.feedbackLocked = false;

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xE8F5E9, 0xE8F5E9, 0xC8E6C9, 0xC8E6C9);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '🔢 数一数', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    enhanceGameScene(this, 'CountingGame');

    // Score display
    this.scoreText = this.add.text(width - 20, 25, '⭐ 0', {
      fontSize: '24px',
      color: '#FF8C00',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // Round display
    this.roundText = this.add.text(width - 20, 55, '第 1/5 题', {
      fontSize: '18px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(1, 0.5);

    // Instruction
    this.add.text(width / 2, height - 20, '数一数有几只动物，点击正确的数字', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    this.startRound();
  }

  private startRound() {
    this.round++;
    this.feedbackLocked = false;
    this.roundText.setText(`第 ${this.round}/${this.totalRounds} 题`);

    // Clear previous animals
    this.animalSprites.forEach(s => s.destroy());
    this.animalSprites = [];

    // Clear previous buttons
    this.numberButtons.forEach(b => b.destroy());
    this.numberButtons = [];

    const { width, height } = this.scale;

    // Pick random count 1-5
    this.correctAnswer = Phaser.Math.Between(1, 5);

    // Pick a random animal type for this round
    const animalKey = Phaser.Utils.Array.GetRandom(this.animalKeys);

    // Place animals in the play area
    const playAreaTop = 90;
    const playAreaBottom = height - 180;
    const playAreaLeft = 80;
    const playAreaRight = width - 80;

    // Generate non-overlapping positions
    const positions = this.generatePositions(
      this.correctAnswer,
      playAreaLeft,
      playAreaRight,
      playAreaTop,
      playAreaBottom,
      90
    );

    positions.forEach((pos, i) => {
      const animal = this.add.image(pos.x, pos.y, animalKey);
      animal.setDisplaySize(90, 90);
      animal.setScale(0);

      // Entrance animation with stagger
      this.tweens.add({
        targets: animal,
        scale: { from: 0, to: animal.displayWidth / animal.width },
        duration: 400,
        delay: i * 150,
        ease: 'Back.easeOut',
      });

      // Idle bounce animation
      this.tweens.add({
        targets: animal,
        y: pos.y - 8,
        duration: 800 + Phaser.Math.Between(0, 300),
        delay: i * 150 + 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.animalSprites.push(animal);
    });

    // Create number buttons at bottom
    this.createNumberButtons();
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

    // Fallback: if we couldn't place all, use grid
    if (positions.length < count) {
      positions.length = 0;
      const cols = Math.ceil(Math.sqrt(count));
      const spacingX = (right - left) / (cols + 1);
      const rows = Math.ceil(count / cols);
      const spacingY = (bottom - top) / (rows + 1);
      let idx = 0;
      for (let r = 0; r < rows && idx < count; r++) {
        for (let c = 0; c < cols && idx < count; c++) {
          positions.push({
            x: left + spacingX * (c + 1),
            y: top + spacingY * (r + 1),
          });
          idx++;
        }
      }
    }

    return positions;
  }

  private createNumberButtons() {
    const { width, height } = this.scale;
    const btnY = height - 100;
    const btnSize = 70;
    const gap = 20;
    const totalW = 5 * btnSize + 4 * gap;
    const startX = (width - totalW) / 2 + btnSize / 2;

    for (let i = 1; i <= 5; i++) {
      const x = startX + (i - 1) * (btnSize + gap);
      const container = this.add.container(x, btnY);

      // Button background
      const btnBg = this.add.graphics();
      btnBg.fillStyle(0xFFFFFF, 1);
      btnBg.fillRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 16);
      btnBg.lineStyle(4, 0x4CAF50);
      btnBg.strokeRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 16);

      // Number text
      const numText = this.add.text(0, 0, `${i}`, {
        fontSize: '36px',
        color: '#333333',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Hit area
      const hitArea = this.add.rectangle(0, 0, btnSize, btnSize, 0xffffff, 0);
      hitArea.setInteractive({ useHandCursor: true });

      container.add([btnBg, numText, hitArea]);

      // Scale entrance animation
      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        delay: i * 80,
        ease: 'Back.easeOut',
      });

      hitArea.on('pointerdown', () => this.checkAnswer(i, container, btnBg));

      this.numberButtons.push(container);
    }
  }

  private checkAnswer(
    selected: number,
    container: Phaser.GameObjects.Container,
    btnBg: Phaser.GameObjects.Graphics
  ) {
    if (this.feedbackLocked) return;
    this.feedbackLocked = true;

    const { width, height } = this.scale;

    if (selected === this.correctAnswer) {
      // Correct answer
      this.score++;
      this.scoreText.setText(`⭐ ${this.score}`);

      // Star burst particle effect
      showStarBurst(this, container.x, container.y);

      // Highlight correct button
      btnBg.clear();
      btnBg.fillStyle(0x4CAF50, 1);
      btnBg.fillRoundedRect(-35, -35, 70, 70, 16);

      // Celebration: bounce the button
      this.tweens.add({
        targets: container,
        scale: 1.3,
        duration: 200,
        yoyo: true,
        ease: 'Bounce.easeOut',
      });

      // Star burst on animals
      this.animalSprites.forEach((animal, idx) => {
        this.time.delayedCall(idx * 100, () => {
          const star = this.add.image(animal.x, animal.y, 'star_gold').setScale(0);
          this.tweens.add({
            targets: star,
            scale: 1.2,
            alpha: 0,
            y: animal.y - 50,
            duration: 600,
            onComplete: () => star.destroy(),
          });
        });
      });

      // Success text
      const successText = this.add.text(width / 2, height / 2 - 30, '答对了！', {
        fontSize: '42px',
        color: '#4CAF50',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5).setScale(0);

      this.tweens.add({
        targets: successText,
        scale: 1,
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: successText,
            alpha: 0,
            y: successText.y - 40,
            duration: 500,
            delay: 400,
            onComplete: () => successText.destroy(),
          });
        },
      });

      // Next round or completion
      this.time.delayedCall(1500, () => {
        if (this.round >= this.totalRounds) {
          this.showCompletion();
        } else {
          this.startRound();
        }
      });
    } else {
      // Wrong answer - gentle shake
      this.tweens.add({
        targets: container,
        x: container.x - 10,
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          container.x = container.x; // reset position
        },
      });

      // Wrong feedback text
      const wrongText = this.add.text(width / 2, height / 2 - 30, '再试试~', {
        fontSize: '32px',
        color: '#FF7043',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: wrongText,
        alpha: 0,
        y: wrongText.y - 40,
        duration: 800,
        onComplete: () => {
          wrongText.destroy();
          this.feedbackLocked = false;
        },
      });
    }
  }

  private showCompletion() {
    const { width, height } = this.scale;
    const stars = this.score >= 5 ? 3 : this.score >= 3 ? 2 : 1;
    recordGameComplete(this, 'CountingGame', stars, '数得真准确');

    // Overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    // Panel
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 140, 400, 280, 24);

    // Title
    this.add.text(width / 2, height / 2 - 80, '🎉 太棒了！', {
      fontSize: '40px',
      color: '#4CAF50',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Score summary
    this.add.text(width / 2, height / 2 - 30, `答对了 ${this.score}/${this.totalRounds} 题`, {
      fontSize: '24px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Stars based on score
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

    // Play again button
    const againBtn = this.add.text(width / 2, height / 2 + 85, '再玩一次 🔄', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#4CAF50',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    againBtn.on('pointerdown', () => {
      this.score = 0;
      this.round = 0;
      this.scene.restart();
    });
  }
}
