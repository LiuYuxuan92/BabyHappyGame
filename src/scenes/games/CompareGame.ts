import Phaser from 'phaser';

interface RoundData {
  leftCount: number;
  rightCount: number;
  leftAnimal: string;
  rightAnimal: string;
}

export class CompareGame extends Phaser.Scene {
  private currentRound = 0;
  private totalRounds = 5;
  private score = 0;
  private roundData: RoundData[] = [];
  private canTap = true;
  private leftGroup: Phaser.GameObjects.Image[] = [];
  private rightGroup: Phaser.GameObjects.Image[] = [];
  private questionText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'CompareGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.currentRound = 0;
    this.score = 0;
    this.canTap = true;
    this.leftGroup = [];
    this.rightGroup = [];

    // Generate all rounds
    this.roundData = this.generateRounds();

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFCE4EC, 0xF3E5F5, 0xF8BBD0, 0xE1BEE7);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '🔢 比多少', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Round indicator
    this.roundText = this.add.text(width - 20, 25, `第 1/${this.totalRounds} 题`, {
      fontSize: '18px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(1, 0.5);

    // Score
    this.scoreText = this.add.text(width - 20, 50, '⭐ 0', {
      fontSize: '20px',
      color: '#FF8C00',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // Question text
    this.questionText = this.add.text(width / 2, 85, '哪边更多？', {
      fontSize: '28px',
      color: '#6A1B9A',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Divider line
    const divider = this.add.graphics();
    divider.lineStyle(3, 0xCE93D8, 0.6);
    divider.lineBetween(width / 2, 110, width / 2, height - 60);

    // Instruction
    this.add.text(width / 2, height - 25, '点击动物更多的一边', {
      fontSize: '15px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Start first round
    this.showRound();
  }

  private generateRounds(): RoundData[] {
    const rounds: RoundData[] = [];
    const animals = ['animal_cat', 'animal_dog', 'animal_bear', 'animal_penguin', 'animal_owl'];

    for (let i = 0; i < this.totalRounds; i++) {
      // Generate two numbers 1-5 with difference >= 2
      let left: number, right: number;
      do {
        left = Phaser.Math.Between(1, 5);
        right = Phaser.Math.Between(1, 5);
      } while (Math.abs(left - right) < 2);

      const leftAnimal = Phaser.Utils.Array.GetRandom(animals);
      let rightAnimal = Phaser.Utils.Array.GetRandom(animals);
      // Ensure different animals for visual distinction
      while (rightAnimal === leftAnimal) {
        rightAnimal = Phaser.Utils.Array.GetRandom(animals);
      }

      rounds.push({
        leftCount: left,
        rightCount: right,
        leftAnimal,
        rightAnimal,
      });
    }
    return rounds;
  }

  private showRound() {
    const { width, height } = this.scale;
    this.canTap = true;

    // Clear previous animals
    this.leftGroup.forEach(img => img.destroy());
    this.rightGroup.forEach(img => img.destroy());
    this.leftGroup = [];
    this.rightGroup = [];

    const round = this.roundData[this.currentRound];
    this.roundText.setText(`第 ${this.currentRound + 1}/${this.totalRounds} 题`);

    // Define areas
    const leftArea = { x: 40, y: 120, w: width / 2 - 60, h: height - 200 };
    const rightArea = { x: width / 2 + 20, y: 120, w: width / 2 - 60, h: height - 200 };

    // Left tap zone
    const leftZone = this.add.rectangle(
      leftArea.x + leftArea.w / 2,
      leftArea.y + leftArea.h / 2,
      leftArea.w,
      leftArea.h,
      0xffffff, 0.3
    ).setInteractive({ useHandCursor: true });

    // Right tap zone
    const rightZone = this.add.rectangle(
      rightArea.x + rightArea.w / 2,
      rightArea.y + rightArea.h / 2,
      rightArea.w,
      rightArea.h,
      0xffffff, 0.3
    ).setInteractive({ useHandCursor: true });

    // Round corners for zones
    const zoneBg = this.add.graphics();
    zoneBg.lineStyle(3, 0xCE93D8, 0.4);
    zoneBg.strokeRoundedRect(leftArea.x, leftArea.y, leftArea.w, leftArea.h, 16);
    zoneBg.strokeRoundedRect(rightArea.x, rightArea.y, rightArea.w, rightArea.h, 16);

    // Place left animals
    this.placeAnimals(round.leftAnimal, round.leftCount, leftArea, this.leftGroup);

    // Place right animals
    this.placeAnimals(round.rightAnimal, round.rightCount, rightArea, this.rightGroup);

    // Tap handlers
    leftZone.on('pointerdown', () => {
      if (!this.canTap) return;
      this.canTap = false;
      if (round.leftCount > round.rightCount) {
        this.handleCorrect(leftZone);
      } else {
        this.handleWrong(leftZone, this.leftGroup);
      }
      // Clean up zones after answer
      this.time.delayedCall(1500, () => {
        leftZone.destroy();
        rightZone.destroy();
        zoneBg.destroy();
      });
    });

    rightZone.on('pointerdown', () => {
      if (!this.canTap) return;
      this.canTap = false;
      if (round.rightCount > round.leftCount) {
        this.handleCorrect(rightZone);
      } else {
        this.handleWrong(rightZone, this.rightGroup);
      }
      // Clean up zones after answer
      this.time.delayedCall(1500, () => {
        leftZone.destroy();
        rightZone.destroy();
        zoneBg.destroy();
      });
    });
  }

  private placeAnimals(
    animalKey: string,
    count: number,
    area: { x: number; y: number; w: number; h: number },
    group: Phaser.GameObjects.Image[]
  ) {
    const size = 65;
    const cols = count <= 3 ? count : Math.ceil(count / 2);
    const rows = count <= 3 ? 1 : 2;
    const totalW = cols * (size + 10);
    const totalH = rows * (size + 10);
    const startX = area.x + (area.w - totalW) / 2 + size / 2 + 5;
    const startY = area.y + (area.h - totalH) / 2 + size / 2 + 5;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (size + 10);
      const y = startY + row * (size + 10);

      const animal = this.add.image(x, y, animalKey);
      animal.setDisplaySize(size, size);

      // Entrance animation
      animal.setScale(0);
      this.tweens.add({
        targets: animal,
        displayWidth: size,
        displayHeight: size,
        duration: 300,
        delay: i * 100,
        ease: 'Back.easeOut',
      });

      group.push(animal);
    }
  }

  private handleCorrect(zone: Phaser.GameObjects.Rectangle) {
    const { width, height } = this.scale;
    this.score++;
    this.scoreText.setText(`⭐ ${this.score}`);

    // Flash zone green
    this.tweens.add({
      targets: zone,
      fillAlpha: 0.4,
      duration: 200,
      yoyo: true,
    });
    zone.setFillStyle(0x4CAF50, 0.3);

    // Star burst
    const starX = zone.x;
    const starY = zone.y;
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(
        starX + Phaser.Math.Between(-40, 40),
        starY + Phaser.Math.Between(-40, 40),
        'star_gold'
      ).setScale(0);
      this.tweens.add({
        targets: star,
        scale: 0.8,
        alpha: 0,
        y: star.y - 60,
        duration: 700,
        delay: i * 100,
        onComplete: () => star.destroy(),
      });
    }

    // Correct text
    const correctText = this.add.text(width / 2, height / 2, '答对了！', {
      fontSize: '36px',
      color: '#4CAF50',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: correctText,
      y: height / 2 - 50,
      alpha: 0,
      scale: 1.3,
      duration: 800,
      onComplete: () => correctText.destroy(),
    });

    // Next round or finish
    this.time.delayedCall(1500, () => {
      this.currentRound++;
      if (this.currentRound >= this.totalRounds) {
        this.showFinalScore();
      } else {
        this.showRound();
      }
    });
  }

  private handleWrong(zone: Phaser.GameObjects.Rectangle, group: Phaser.GameObjects.Image[]) {
    // Flash zone red
    zone.setFillStyle(0xEF5350, 0.3);
    this.tweens.add({
      targets: zone,
      fillAlpha: 0,
      duration: 400,
    });

    // Shake the animals on the wrong side
    group.forEach(animal => {
      this.tweens.add({
        targets: animal,
        x: animal.x + 8,
        duration: 50,
        yoyo: true,
        repeat: 3,
      });
    });

    // Wrong text
    const { width, height } = this.scale;
    const wrongText = this.add.text(width / 2, height / 2, '再想想~', {
      fontSize: '28px',
      color: '#EF5350',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: wrongText,
      alpha: 0,
      y: height / 2 - 30,
      duration: 800,
      onComplete: () => wrongText.destroy(),
    });

    // Allow retry
    this.time.delayedCall(600, () => {
      this.canTap = true;
    });
  }

  private showFinalScore() {
    const { width, height } = this.scale;

    // Overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4).setDepth(100);

    // Panel
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 140, 400, 280, 24);
    panel.setDepth(101);

    // Title
    this.add.text(width / 2, height / 2 - 90, '🎉 游戏结束！', {
      fontSize: '34px',
      color: '#6A1B9A',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    // Score text
    this.add.text(width / 2, height / 2 - 40, `答对 ${this.score}/${this.totalRounds} 题`, {
      fontSize: '24px',
      color: '#333333',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5).setDepth(102);

    // Stars based on score
    const starCount = this.score >= 5 ? 3 : this.score >= 3 ? 2 : 1;
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(
        width / 2 - 50 + i * 50,
        height / 2 + 15,
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

    // Encouragement message
    const messages = ['继续加油！', '很不错！', '太厉害了！'];
    const msgIndex = starCount - 1;
    this.add.text(width / 2, height / 2 + 60, messages[msgIndex], {
      fontSize: '20px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5).setDepth(102);

    // Replay button
    const replayBtn = this.add.text(width / 2, height / 2 + 105, '再来一次 🔄', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#7B1FA2',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(102);

    replayBtn.on('pointerdown', () => this.scene.restart());
  }
}
