import Phaser from 'phaser';

interface RhythmCircle {
  graphics: Phaser.GameObjects.Graphics;
  glowGraphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  radius: number;
  color: number;
  frequency: number;
  hitArea: Phaser.GameObjects.Arc;
}

export class RhythmGame extends Phaser.Scene {
  private circles: RhythmCircle[] = [];
  private pattern: number[] = [];
  private playerInput: number[] = [];
  private isShowingPattern = false;
  private isPlayerTurn = false;
  private level = 1;
  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private audioContext!: AudioContext;

  private readonly circleData = [
    { color: 0xFF4444, frequency: 262 },
    { color: 0x4488FF, frequency: 330 },
    { color: 0x44CC44, frequency: 392 },
    { color: 0xFFCC00, frequency: 523 },
  ];

  constructor() {
    super({ key: 'RhythmGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.circles = [];
    this.pattern = [];
    this.playerInput = [];
    this.isShowingPattern = false;
    this.isPlayerTurn = false;
    this.level = 1;
    this.score = 0;
    this.audioContext = (this.sound as Phaser.Sound.WebAudioSoundManager).context;

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xE8EAF6, 0xE8EAF6, 0xC5CAE9, 0xC5CAE9);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 38, '🥁 节奏大师', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Score and level
    this.scoreText = this.add.text(width - 20, 30, '得分: 0', {
      fontSize: '20px',
      color: '#666666',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this.levelText = this.add.text(width - 20, 55, '关卡: 1', {
      fontSize: '18px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(1, 0.5);

    // Status text
    this.statusText = this.add.text(width / 2, height * 0.25, '准备好了吗？', {
      fontSize: '26px',
      color: '#5C6BC0',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Create circles
    this.createCircles();

    // Instruction
    this.add.text(width / 2, height - 20, '记住顺序，然后按相同顺序点击', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Start first round after a short delay
    this.time.delayedCall(1000, () => this.startNewRound());
  }

  private createCircles() {
    const { width, height } = this.scale;

    const circleCount = 4;
    const radius = 55;
    const gap = 30;
    const totalWidth = circleCount * (radius * 2) + (circleCount - 1) * gap;
    const startX = (width - totalWidth) / 2 + radius;
    const y = height * 0.5;

    this.circleData.forEach((data, i) => {
      const x = startX + i * (radius * 2 + gap);

      // Glow graphics (behind main circle)
      const glowGraphics = this.add.graphics();

      // Main circle graphics
      const graphics = this.add.graphics();
      this.drawCircle(graphics, x, y, radius, data.color, false);

      // Hit area
      const hitArea = this.add.circle(x, y, radius, 0xffffff, 0);
      hitArea.setInteractive({ useHandCursor: true });

      const circle: RhythmCircle = {
        graphics,
        glowGraphics,
        x,
        y,
        radius,
        color: data.color,
        frequency: data.frequency,
        hitArea,
      };

      this.circles.push(circle);

      hitArea.on('pointerdown', () => {
        if (this.isPlayerTurn) {
          this.handlePlayerInput(i);
        }
      });
    });
  }

  private drawCircle(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    color: number,
    lit: boolean
  ) {
    graphics.clear();

    // Shadow
    graphics.fillStyle(0x000000, 0.15);
    graphics.fillCircle(x + 3, y + 3, radius);

    // Main circle
    const alpha = lit ? 1 : 0.6;
    graphics.fillStyle(color, alpha);
    graphics.fillCircle(x, y, radius);

    // Inner highlight
    graphics.fillStyle(0xffffff, lit ? 0.4 : 0.2);
    graphics.fillCircle(x - radius * 0.2, y - radius * 0.2, radius * 0.4);

    // Border
    graphics.lineStyle(3, lit ? 0xffffff : this.darkenColor(color), 1);
    graphics.strokeCircle(x, y, radius);
  }

  private darkenColor(color: number): number {
    const r = Math.max(0, ((color >> 16) & 0xFF) - 50);
    const g = Math.max(0, ((color >> 8) & 0xFF) - 50);
    const b = Math.max(0, (color & 0xFF) - 50);
    return (r << 16) | (g << 8) | b;
  }

  private lightUpCircle(index: number, duration = 400) {
    const circle = this.circles[index];

    // Draw lit state
    this.drawCircle(circle.graphics, circle.x, circle.y, circle.radius, circle.color, true);

    // Glow effect
    circle.glowGraphics.clear();
    circle.glowGraphics.fillStyle(circle.color, 0.3);
    circle.glowGraphics.fillCircle(circle.x, circle.y, circle.radius + 12);

    // Play tone
    this.playTone(circle.frequency);

    // Scale animation
    this.tweens.add({
      targets: circle.graphics,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: duration * 0.3,
      yoyo: true,
      onComplete: () => {
        circle.graphics.setScale(1);
      },
    });

    // Reset after duration
    this.time.delayedCall(duration, () => {
      this.drawCircle(circle.graphics, circle.x, circle.y, circle.radius, circle.color, false);
      circle.glowGraphics.clear();
    });
  }

  private playTone(frequency: number) {
    const ctx = this.audioContext;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Gain envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.35);
  }

  private startNewRound() {
    this.playerInput = [];
    this.isPlayerTurn = false;
    this.isShowingPattern = true;

    // Add a new step to the pattern
    const nextStep = Phaser.Math.Between(0, 3);
    this.pattern.push(nextStep);

    this.statusText.setText('看好顺序...');
    this.statusText.setColor('#5C6BC0');

    // Animate status text
    this.tweens.add({
      targets: this.statusText,
      scale: 1.1,
      duration: 300,
      yoyo: true,
    });

    // Show pattern with delays
    this.time.delayedCall(600, () => this.showPattern());
  }

  private showPattern() {
    let delay = 0;
    const interval = 600;

    this.pattern.forEach((circleIndex, i) => {
      this.time.delayedCall(delay, () => {
        this.lightUpCircle(circleIndex, 400);
      });
      delay += interval;
    });

    // After pattern is shown, enable player input
    this.time.delayedCall(delay + 300, () => {
      this.isShowingPattern = false;
      this.isPlayerTurn = true;
      this.statusText.setText('你的回合!');
      this.statusText.setColor('#4CAF50');

      this.tweens.add({
        targets: this.statusText,
        scale: 1.15,
        duration: 200,
        yoyo: true,
      });
    });
  }

  private handlePlayerInput(index: number) {
    this.playerInput.push(index);
    this.lightUpCircle(index, 300);

    const currentStep = this.playerInput.length - 1;

    // Check if the input matches the pattern
    if (this.playerInput[currentStep] !== this.pattern[currentStep]) {
      // Wrong input
      this.handleFailure();
      return;
    }

    // Check if pattern is complete
    if (this.playerInput.length === this.pattern.length) {
      this.isPlayerTurn = false;
      this.handleSuccess();
    }
  }

  private handleSuccess() {
    this.score += this.pattern.length;
    this.scoreText.setText(`得分: ${this.score}`);

    // Level up every 3 successful rounds
    if (this.pattern.length % 3 === 0 && this.pattern.length > 0) {
      this.level++;
      this.levelText.setText(`关卡: ${this.level}`);
    }

    this.statusText.setText('正确!');
    this.statusText.setColor('#4CAF50');

    // Show star feedback
    this.showStarFeedback();

    // Check for level milestone
    if (this.pattern.length >= 5 && this.pattern.length % 5 === 0) {
      this.time.delayedCall(800, () => this.showLevelUp());
    } else {
      // Next round
      this.time.delayedCall(1200, () => this.startNewRound());
    }
  }

  private handleFailure() {
    this.isPlayerTurn = false;

    this.statusText.setText('哎呀，再试一次!');
    this.statusText.setColor('#FF5252');

    // Flash all circles red briefly
    this.circles.forEach((circle) => {
      this.tweens.add({
        targets: circle.graphics,
        alpha: 0.3,
        duration: 150,
        yoyo: true,
        repeat: 2,
      });
    });

    // Show wrong feedback
    const { width, height } = this.scale;
    const text = this.add.text(width / 2, height * 0.7, '没关系，重新开始', {
      fontSize: '22px',
      color: '#FF5252',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: height * 0.7 - 30,
      alpha: 0,
      duration: 1000,
      delay: 500,
      onComplete: () => text.destroy(),
    });

    // Reset pattern and start over (keep score)
    this.time.delayedCall(1800, () => {
      this.pattern = [];
      this.playerInput = [];
      this.startNewRound();
    });
  }

  private showStarFeedback() {
    const { width, height } = this.scale;

    const star = this.add.image(width / 2, height * 0.35, 'star_gold').setScale(0);
    this.tweens.add({
      targets: star,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    const text = this.add.text(width / 2, height * 0.35 + 35, '棒!', {
      fontSize: '24px',
      color: '#FF6B35',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 200,
      delay: 200,
    });

    this.tweens.add({
      targets: [star, text],
      alpha: 0,
      y: '-=30',
      duration: 400,
      delay: 800,
      onComplete: () => {
        star.destroy();
        text.destroy();
      },
    });
  }

  private showLevelUp() {
    const { width, height } = this.scale;

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    // Panel
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 180, height / 2 - 110, 360, 220, 24);

    // Title
    const title = this.add.text(width / 2, height / 2 - 55, '升级了!', {
      fontSize: '36px',
      color: '#5C6BC0',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stars
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

    // Score display
    const scoreDisplay = this.add.text(width / 2, height / 2 + 40, `得分: ${this.score}`, {
      fontSize: '20px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Continue button
    const continueBtn = this.add.text(width / 2, height / 2 + 80, '继续挑战 ▶', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#5C6BC0',
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    continueBtn.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
      title.destroy();
      scoreDisplay.destroy();
      continueBtn.destroy();
      this.startNewRound();
    });
  }
}
