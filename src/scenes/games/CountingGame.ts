import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';
import { showStarBurst } from '../../components/Particles';

interface CountLevel {
  title: string;
  prompt: string;
  min: number;
  max: number;
  rounds: number;
  assetKeys: string[];
  accent: number;
  bg: 'garden' | 'ocean' | 'market';
}

const LEVELS: CountLevel[] = [
  {
    title: '草地小队',
    prompt: '先数 1 到 5',
    min: 1,
    max: 5,
    rounds: 4,
    assetKeys: ['animal_bear', 'animal_cat', 'animal_dog', 'animal_cow', 'animal_penguin'],
    accent: 0x4CAF50,
    bg: 'garden',
  },
  {
    title: '海底集合',
    prompt: '鱼群会更多一点',
    min: 3,
    max: 7,
    rounds: 4,
    assetKeys: ['fish_blue', 'fish_green', 'fish_orange', 'fish_brown', 'animal_penguin'],
    accent: 0x03A9F4,
    bg: 'ocean',
  },
  {
    title: '热闹小摊',
    prompt: '挑战 5 到 10',
    min: 5,
    max: 10,
    rounds: 5,
    assetKeys: ['food_01', 'food_02', 'food_03', 'food_05', 'food_09', 'food_11'],
    accent: 0xFF9800,
    bg: 'market',
  },
];

export class CountingGame extends Phaser.Scene {
  private levelIndex = 0;
  private roundIndex = 0;
  private correctAnswers = 0;
  private wrongAnswers = 0;
  private hintsUsed = 0;
  private correctAnswer = 0;
  private feedbackLocked = false;
  private statusText!: Phaser.GameObjects.Text;
  private objectSprites: Phaser.GameObjects.Image[] = [];
  private numberButtons: Phaser.GameObjects.Container[] = [];
  private audio!: AudioManager;

  constructor() {
    super({ key: 'CountingGame' });
  }

  init(data?: { levelIndex?: number; correctAnswers?: number; wrongAnswers?: number; hintsUsed?: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
    this.correctAnswers = data?.correctAnswers ?? 0;
    this.wrongAnswers = data?.wrongAnswers ?? 0;
    this.hintsUsed = data?.hintsUsed ?? 0;
    this.roundIndex = 0;
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    this.objectSprites = [];
    this.numberButtons = [];
    this.feedbackLocked = false;

    const { width, height } = this.scale;
    const level = LEVELS[this.levelIndex];
    this.drawBackground(level);

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '数数探险队', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'CountingGame');

    this.add.text(width / 2, 70, `${this.levelIndex + 1}/${LEVELS.length}  ${level.title} · ${level.prompt}`, {
      fontSize: '20px',
      color: '#546E7A',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.statusText = this.add.text(width - 24, 34, '', {
      fontSize: '19px',
      color: '#455A64',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#ffffffdd',
      padding: { x: 12, y: 7 },
    }).setOrigin(1, 0.5);

    const hintBtn = this.add.text(width - 24, 72, '提示', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#26A69A',
      padding: { x: 16, y: 8 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    hintBtn.on('pointerdown', () => this.showHint());

    this.startRound();
  }

  private drawBackground(level: CountLevel) {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    if (level.bg === 'ocean') {
      bg.fillGradientStyle(0xD9F7FF, 0xB2EBF2, 0xE0F7FA, 0x4DD0E1);
    } else if (level.bg === 'market') {
      bg.fillGradientStyle(0xFFF8E1, 0xFFE0B2, 0xF1F8E9, 0xFFCC80);
    } else {
      bg.fillGradientStyle(0xE8F5E9, 0xE3F2FD, 0xFFFDE7, 0xC8E6C9);
    }
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0xffffff, 0.35);
    bg.fillRoundedRect(74, 104, width - 148, height - 250, 34);
    bg.lineStyle(4, 0xffffff, 0.42);
    bg.strokeRoundedRect(74, 104, width - 148, height - 250, 34);

    if (level.bg === 'ocean') {
      for (let i = 0; i < 14; i++) {
        const bubble = this.add.circle(72 + i * 58, 126 + (i % 5) * 66, 6 + (i % 3) * 4, 0xffffff, 0.22);
        this.tweens.add({ targets: bubble, y: bubble.y - 20, alpha: 0.08, duration: 1200 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const flower = this.add.image(62 + i * 185, height - 34, `flower_${i % 6}`).setScale(0.68).setAlpha(0.62);
        this.tweens.add({ targets: flower, y: flower.y - 4, duration: 900 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  private startRound() {
    this.feedbackLocked = false;
    this.clearRoundObjects();
    const level = LEVELS[this.levelIndex];
    this.correctAnswer = Phaser.Math.Between(level.min, level.max);
    const assetKey = Phaser.Utils.Array.GetRandom(level.assetKeys);

    this.addRoundPrompt(level);
    this.createCountObjects(assetKey);
    this.createNumberButtons(level);
    this.updateStatus();
  }

  private addRoundPrompt(level: CountLevel) {
    const { width } = this.scale;
    const old = this.children.getByName('round-prompt');
    old?.destroy();
    const prompt = this.add.text(width / 2, 106, `第 ${this.roundIndex + 1}/${level.rounds} 题：数一数有几个`, {
      fontSize: '24px',
      color: '#37474F',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#ffffffcc',
      padding: { x: 18, y: 8 },
    }).setOrigin(0.5);
    prompt.setName('round-prompt');
  }

  private createCountObjects(assetKey: string) {
    const { width, height } = this.scale;
    const positions = this.generatePositions(this.correctAnswer, 110, width - 110, 150, height - 190, 82);

    positions.forEach((pos, index) => {
      const halo = this.add.graphics().setPosition(pos.x, pos.y);
      halo.fillStyle(0xffffff, 0.6);
      halo.fillCircle(0, 8, 43);
      halo.setName('round-decoration');

      const sprite = this.add.image(pos.x, pos.y, assetKey).setDisplaySize(72, 72);
      sprite.setScale(0);
      this.objectSprites.push(sprite);
      this.tweens.add({ targets: [sprite, halo], scale: 1, duration: 280, delay: index * 60, ease: 'Back.easeOut' });
      this.tweens.add({ targets: sprite, y: pos.y - 5, duration: 850 + index * 35, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 320 + index * 40 });
    });
  }

  private generatePositions(count: number, left: number, right: number, top: number, bottom: number, minDist: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    let attempts = 0;
    while (positions.length < count && attempts < 900) {
      const x = Phaser.Math.Between(left, right);
      const y = Phaser.Math.Between(top, bottom);
      if (positions.every(pos => Phaser.Math.Distance.Between(x, y, pos.x, pos.y) >= minDist)) {
        positions.push({ x, y });
      }
      attempts++;
    }

    if (positions.length === count) return positions;
    positions.length = 0;
    const cols = Math.ceil(Math.sqrt(count + 2));
    const rows = Math.ceil(count / cols);
    const cellW = (right - left) / cols;
    const cellH = (bottom - top) / rows;
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({
        x: left + col * cellW + cellW / 2,
        y: top + row * cellH + cellH / 2,
      });
    }
    return positions;
  }

  private createNumberButtons(level: CountLevel) {
    const { width, height } = this.scale;
    const choices = this.buildChoices(level);
    const btnY = height - 96;
    const btnSize = 68;
    const gap = 18;
    const totalW = choices.length * btnSize + (choices.length - 1) * gap;
    const startX = (width - totalW) / 2 + btnSize / 2;

    choices.forEach((choice, index) => {
      const x = startX + index * (btnSize + gap);
      const container = this.add.container(x, btnY);
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 0.95);
      bg.fillRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 18);
      bg.lineStyle(4, level.accent, 0.82);
      bg.strokeRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 18);

      const label = this.add.text(0, 0, String(choice), {
        fontSize: '34px',
        color: '#263238',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const hit = this.add.rectangle(0, 0, btnSize, btnSize, 0xffffff, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.checkAnswer(choice, container, bg, level));

      container.add([bg, label, hit]);
      container.setScale(0);
      this.tweens.add({ targets: container, scale: 1, duration: 250, delay: index * 60, ease: 'Back.easeOut' });
      this.numberButtons.push(container);
    });
  }

  private buildChoices(level: CountLevel): number[] {
    const choices = new Set<number>([this.correctAnswer]);
    const offsets = Phaser.Utils.Array.Shuffle([-3, -2, -1, 1, 2, 3, 4, -4]);
    offsets.forEach(offset => {
      const candidate = this.correctAnswer + offset;
      if (candidate >= level.min && candidate <= level.max) {
        choices.add(candidate);
      }
    });
    for (let value = level.min; choices.size < 5 && value <= level.max; value++) {
      choices.add(value);
    }
    return Phaser.Utils.Array.Shuffle(Array.from(choices).slice(0, 5)).sort((a, b) => a - b);
  }

  private checkAnswer(choice: number, container: Phaser.GameObjects.Container, bg: Phaser.GameObjects.Graphics, level: CountLevel) {
    if (this.feedbackLocked) return;
    this.audio.playTap();
    this.feedbackLocked = true;

    if (choice === this.correctAnswer) {
      this.correctAnswers++;
      this.audio.playSuccess();
      bg.clear();
      bg.fillStyle(level.accent, 1);
      bg.fillRoundedRect(-34, -34, 68, 68, 18);
      showStarBurst(this, container.x, container.y);
      this.objectSprites.forEach((sprite, index) => {
        this.time.delayedCall(index * 55, () => showStarBurst(this, sprite.x, sprite.y));
      });
      showFloatingToast(this, `答对了，是 ${this.correctAnswer} 个`, level.accent);
      this.tweens.add({ targets: container, scale: 1.24, duration: 160, yoyo: true, ease: 'Back.easeOut' });
      this.time.delayedCall(1050, () => this.advanceRound());
      this.updateStatus();
      return;
    }

    this.wrongAnswers++;
    this.audio.playWrong();
    showFloatingToast(this, '再慢慢数一次', 0xFF7043);
    this.cameras.main.shake(160, 0.002);
    this.tweens.add({
      targets: container,
      x: container.x - 9,
      duration: 45,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.feedbackLocked = false;
      },
    });
    this.updateStatus();
  }

  private showHint() {
    if (this.feedbackLocked) return;
    const level = LEVELS[this.levelIndex];
    this.hintsUsed++;
    this.audio.playTap();
    showFloatingToast(this, '亮起来的数字帮你数', 0x26A69A);

    this.objectSprites.forEach((sprite, index) => {
      const badge = this.add.container(sprite.x + 28, sprite.y - 30).setDepth(20);
      const dot = this.add.circle(0, 0, 16, 0xffffff, 0.95);
      dot.setStrokeStyle(3, level.accent, 0.85);
      const label = this.add.text(0, 0, String(index + 1), {
        fontSize: '18px',
        color: '#263238',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      badge.add([dot, label]);
      badge.setScale(0);
      this.tweens.add({
        targets: badge,
        scale: 1,
        duration: 180,
        delay: index * 80,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({ targets: badge, alpha: 0, y: badge.y - 18, duration: 500, delay: 900, onComplete: () => badge.destroy() });
        },
      });
    });
    this.updateStatus();
  }

  private advanceRound() {
    const level = LEVELS[this.levelIndex];
    this.roundIndex++;
    if (this.roundIndex < level.rounds) {
      this.startRound();
      return;
    }

    if (this.levelIndex < LEVELS.length - 1) {
      showFloatingToast(this, '进入下一组数数挑战', level.accent);
      this.time.delayedCall(700, () => {
        this.scene.restart({
          levelIndex: this.levelIndex + 1,
          correctAnswers: this.correctAnswers,
          wrongAnswers: this.wrongAnswers,
          hintsUsed: this.hintsUsed,
        });
      });
      return;
    }

    this.showComplete();
  }

  private clearRoundObjects() {
    this.objectSprites.forEach(sprite => sprite.destroy());
    this.objectSprites = [];
    this.numberButtons.forEach(button => button.destroy());
    this.numberButtons = [];
    this.children.getAll('name', 'round-decoration').forEach(child => child.destroy());
  }

  private updateStatus() {
    const totalRounds = LEVELS.reduce((sum, level) => sum + level.rounds, 0);
    const completedRounds = LEVELS.slice(0, this.levelIndex).reduce((sum, level) => sum + level.rounds, 0) + this.roundIndex;
    this.statusText?.setText(`题 ${completedRounds + 1}/${totalRounds}  对 ${this.correctAnswers}  错 ${this.wrongAnswers}  提示 ${this.hintsUsed}`);
  }

  private showComplete() {
    const { width, height } = this.scale;
    const totalRounds = LEVELS.reduce((sum, level) => sum + level.rounds, 0);
    const stars = this.wrongAnswers <= 2 && this.hintsUsed <= 1 ? 3 : this.wrongAnswers <= 6 && this.hintsUsed <= 4 ? 2 : 1;
    recordGameComplete(this, 'CountingGame', stars, '数数全部答对');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.42).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -145, 440, 290, 28);
    bg.lineStyle(4, 0x4CAF50, 0.68);
    bg.strokeRoundedRect(-220, -145, 440, 290, 28);

    const title = this.add.text(0, -92, '数数探险完成', {
      fontSize: '34px',
      color: '#43A047',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const detail = this.add.text(0, -50, `答对 ${this.correctAnswers}/${totalRounds} · 错误 ${this.wrongAnswers} · 提示 ${this.hintsUsed}`, {
      fontSize: '19px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
    panel.add([bg, title, detail]);

    for (let i = 0; i < 3; i++) {
      const star = this.add.image(-58 + i * 58, 10, i < stars ? 'star_gold' : 'star_gray');
      star.setScale(0);
      panel.add(star);
      this.tweens.add({ targets: star, scale: 1, duration: 300, delay: i * 170, ease: 'Back.easeOut' });
    }

    const againBtn = this.add.text(0, 92, '再数一次', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#43A047',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    againBtn.on('pointerdown', () => {
      this.audio.playTap();
      overlay.destroy();
      this.scene.restart({ levelIndex: 0, correctAnswers: 0, wrongAnswers: 0, hintsUsed: 0 });
    });
    panel.add(againBtn);
    panel.setScale(0.86).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }
}
