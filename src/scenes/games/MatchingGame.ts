import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';
import { showStarBurst } from '../../components/Particles';
import { SceneTransition } from '../../components/SceneTransition';

interface MatchLevel {
  title: string;
  prompt: string;
  rows: number;
  cols: number;
  keys: string[];
  accent: number;
  bg: 'garden' | 'ocean' | 'traffic';
}

interface Card {
  container: Phaser.GameObjects.Container;
  imageKey: string;
  revealed: boolean;
  matched: boolean;
  back: Phaser.GameObjects.Graphics;
  backIcon: Phaser.GameObjects.Image;
  front: Phaser.GameObjects.Graphics;
  image: Phaser.GameObjects.Image;
}

const LEVELS: MatchLevel[] = [
  {
    title: '小小记忆',
    prompt: '先找到 3 对动物',
    rows: 2,
    cols: 3,
    accent: 0x66BB6A,
    bg: 'garden',
    keys: ['animal_bear', 'animal_cat', 'animal_dog', 'animal_cow', 'animal_penguin', 'animal_owl'],
  },
  {
    title: '森林翻牌',
    prompt: '记住更多位置',
    rows: 3,
    cols: 4,
    accent: 0x5C6BC0,
    bg: 'garden',
    keys: ['animal_bear', 'animal_cat', 'animal_cow', 'animal_dog', 'animal_elephant', 'animal_giraffe', 'animal_monkey', 'animal_penguin', 'animal_owl', 'animal_sheep', 'animal_zebra', 'animal_kangaroo'],
  },
  {
    title: '交通记忆赛',
    prompt: '最后挑战 10 对',
    rows: 4,
    cols: 5,
    accent: 0xFF7043,
    bg: 'traffic',
    keys: ['vehicle_blue', 'vehicle_green', 'vehicle_red', 'vehicle_orange', 'vehicle_yellow', 'vehicle_grey', 'vehicle_black', 'vehicle_white', 'fish_blue', 'fish_orange'],
  },
];

export class MatchingGame extends Phaser.Scene {
  private cards: Card[] = [];
  private firstCard: Card | null = null;
  private secondCard: Card | null = null;
  private canFlip = true;
  private matchedPairs = 0;
  private levelIndex = 0;
  private moves = 0;
  private misses = 0;
  private hintsUsed = 0;
  private statusText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  constructor() {
    super({ key: 'MatchingGame' });
  }

  init(data?: { levelIndex?: number; moves?: number; misses?: number; hintsUsed?: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
    this.moves = data?.moves ?? 0;
    this.misses = data?.misses ?? 0;
    this.hintsUsed = data?.hintsUsed ?? 0;
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    this.cards = [];
    this.firstCard = null;
    this.secondCard = null;
    this.canFlip = true;
    this.matchedPairs = 0;

    SceneTransition.fadeIn(this);
    const { width } = this.scale;
    const level = LEVELS[this.levelIndex];
    this.drawBackground(level);

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '记忆翻牌馆', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'MatchingGame');

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

    this.createCards(level);
    this.updateStatus();
  }

  private drawBackground(level: MatchLevel) {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    if (level.bg === 'traffic') {
      bg.fillGradientStyle(0xFFF8E1, 0xE1F5FE, 0xF3E5F5, 0xCFD8DC);
    } else if (level.bg === 'ocean') {
      bg.fillGradientStyle(0xD9F7FF, 0xB2EBF2, 0xE0F7FA, 0x80DEEA);
    } else {
      bg.fillGradientStyle(0xE8F5E9, 0xE3F2FD, 0xFFFDE7, 0xC8E6C9);
    }
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0xffffff, 0.34);
    bg.fillRoundedRect(70, 104, width - 140, height - 136, 34);
    bg.lineStyle(4, 0xffffff, 0.42);
    bg.strokeRoundedRect(70, 104, width - 140, height - 136, 34);

    if (level.bg === 'traffic') {
      bg.fillStyle(0x90A4AE, 0.2);
      for (let x = 42; x < width; x += 108) {
        bg.fillRoundedRect(x, height - 112, 60, 76 + (x % 4) * 10, 8);
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const flower = this.add.image(64 + i * 182, height - 34, `flower_${i % 6}`).setScale(0.62).setAlpha(0.55);
        this.tweens.add({ targets: flower, y: flower.y - 4, duration: 900 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  private createCards(level: MatchLevel) {
    const { width, height } = this.scale;
    const totalCards = level.rows * level.cols;
    const totalPairs = totalCards / 2;
    const selected = Phaser.Utils.Array.Shuffle([...level.keys]).slice(0, totalPairs);
    const deck = Phaser.Utils.Array.Shuffle(selected.flatMap(key => [key, key]));

    const maxCardW = level.cols >= 5 ? 92 : level.cols === 4 ? 108 : 122;
    const maxCardH = level.rows >= 4 ? 88 : level.rows === 3 ? 116 : 136;
    const gap = level.cols >= 5 ? 10 : 14;
    const totalW = level.cols * maxCardW + (level.cols - 1) * gap;
    const totalH = level.rows * maxCardH + (level.rows - 1) * gap;
    const startX = width / 2 - totalW / 2 + maxCardW / 2;
    const startY = Math.max(142, height / 2 - totalH / 2 + maxCardH / 2 + 18);

    deck.forEach((imageKey, index) => {
      const row = Math.floor(index / level.cols);
      const col = index % level.cols;
      const x = startX + col * (maxCardW + gap);
      const y = startY + row * (maxCardH + gap);
      const card = this.createCard(x, y, maxCardW, maxCardH, imageKey, level.accent, index);
      this.cards.push(card);
    });
  }

  private createCard(x: number, y: number, cardW: number, cardH: number, imageKey: string, accent: number, index: number): Card {
    const container = this.add.container(x, y);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.09);
    shadow.fillRoundedRect(-cardW / 2 + 4, -cardH / 2 + 5, cardW, cardH, 16);

    const front = this.add.graphics();
    front.fillStyle(0xffffff, 0.98);
    front.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    front.lineStyle(4, accent, 0.78);
    front.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);

    const image = this.add.image(0, 0, imageKey).setDisplaySize(cardW * 0.66, cardH * 0.66);

    const back = this.add.graphics();
    back.fillStyle(accent, 0.96);
    back.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    back.fillStyle(0xffffff, 0.18);
    back.fillRoundedRect(-cardW / 2 + 9, -cardH / 2 + 9, cardW - 18, cardH - 18, 12);
    back.lineStyle(3, 0xffffff, 0.5);
    back.strokeRoundedRect(-cardW / 2 + 9, -cardH / 2 + 9, cardW - 18, cardH - 18, 12);

    const backIcon = this.add.image(0, 0, 'star_gold').setScale(cardW < 100 ? 0.48 : 0.6).setAlpha(0.55);
    const hit = this.add.rectangle(0, 0, cardW, cardH, 0xffffff, 0).setInteractive({ useHandCursor: true });

    front.setVisible(false);
    image.setVisible(false);
    container.add([shadow, front, image, back, backIcon, hit]);
    container.setScale(0);
    this.tweens.add({ targets: container, scale: 1, duration: 260, delay: index * 35, ease: 'Back.easeOut' });

    const card: Card = { container, imageKey, revealed: false, matched: false, back, backIcon, front, image };
    hit.on('pointerdown', () => this.flipCard(card));
    return card;
  }

  private flipCard(card: Card) {
    if (!this.canFlip || card.revealed || card.matched) return;
    this.audio.playTap();
    this.revealCard(card);

    if (!this.firstCard) {
      this.firstCard = card;
      return;
    }

    this.secondCard = card;
    this.canFlip = false;
    this.moves++;
    this.updateStatus();

    this.time.delayedCall(650, () => {
      if (!this.firstCard || !this.secondCard) return;
      if (this.firstCard.imageKey === this.secondCard.imageKey) {
        this.handleMatch();
      } else {
        this.handleMismatch();
      }
    });
  }

  private revealCard(card: Card) {
    card.revealed = true;
    this.tweens.add({
      targets: card.container,
      scaleX: 0,
      duration: 95,
      onComplete: () => {
        card.back.setVisible(false);
        card.backIcon.setVisible(false);
        card.front.setVisible(true);
        card.image.setVisible(true);
        this.tweens.add({ targets: card.container, scaleX: 1, duration: 105, ease: 'Back.easeOut' });
      },
    });
  }

  private hideCard(card: Card) {
    card.revealed = false;
    this.tweens.add({
      targets: card.container,
      scaleX: 0,
      duration: 95,
      onComplete: () => {
        card.front.setVisible(false);
        card.image.setVisible(false);
        card.back.setVisible(true);
        card.backIcon.setVisible(true);
        this.tweens.add({ targets: card.container, scaleX: 1, duration: 105, ease: 'Back.easeOut' });
      },
    });
  }

  private handleMatch() {
    const first = this.firstCard!;
    const second = this.secondCard!;
    first.matched = true;
    second.matched = true;
    this.audio.playSuccess();
    this.matchedPairs++;

    [first, second].forEach(card => {
      this.tweens.add({ targets: card.container, scale: 1.12, duration: 160, yoyo: true, ease: 'Back.easeOut' });
      showStarBurst(this, card.container.x, card.container.y);
    });

    showFloatingToast(this, '找到一对', LEVELS[this.levelIndex].accent);
    this.firstCard = null;
    this.secondCard = null;
    this.canFlip = true;
    this.updateStatus();

    if (this.matchedPairs >= LEVELS[this.levelIndex].rows * LEVELS[this.levelIndex].cols / 2) {
      this.time.delayedCall(700, () => this.finishLevel());
    }
  }

  private handleMismatch() {
    const first = this.firstCard!;
    const second = this.secondCard!;
    this.misses++;
    this.audio.playWrong();
    this.cameras.main.shake(150, 0.0018);
    showFloatingToast(this, '先记住它们的位置', 0xFFB300);

    this.time.delayedCall(250, () => {
      this.hideCard(first);
      this.hideCard(second);
      this.firstCard = null;
      this.secondCard = null;
      this.canFlip = true;
      this.updateStatus();
    });
  }

  private showHint() {
    if (!this.canFlip || this.firstCard) {
      showFloatingToast(this, '先完成当前翻牌', 0xFFB300);
      return;
    }
    const remaining = this.cards.filter(card => !card.matched && !card.revealed);
    const pair = remaining.find(card => remaining.some(other => other !== card && other.imageKey === card.imageKey));
    if (!pair) return;
    const mate = remaining.find(card => card !== pair && card.imageKey === pair.imageKey);
    if (!mate) return;

    this.hintsUsed++;
    this.canFlip = false;
    this.audio.playTap();
    this.revealCard(pair);
    this.revealCard(mate);
    showFloatingToast(this, '记住这一对的位置', 0x26A69A);
    this.updateStatus();

    this.time.delayedCall(1150, () => {
      this.hideCard(pair);
      this.hideCard(mate);
      this.canFlip = true;
    });
  }

  private finishLevel() {
    if (this.levelIndex < LEVELS.length - 1) {
      showFloatingToast(this, '下一组卡片来了', LEVELS[this.levelIndex].accent);
      this.time.delayedCall(720, () => {
        this.scene.restart({
          levelIndex: this.levelIndex + 1,
          moves: this.moves,
          misses: this.misses,
          hintsUsed: this.hintsUsed,
        });
      });
      return;
    }
    this.showComplete();
  }

  private updateStatus() {
    const totalPairs = LEVELS[this.levelIndex].rows * LEVELS[this.levelIndex].cols / 2;
    this.statusText?.setText(`配对 ${this.matchedPairs}/${totalPairs}  翻 ${this.moves}  错 ${this.misses}  提示 ${this.hintsUsed}`);
  }

  private showComplete() {
    const { width, height } = this.scale;
    const stars = this.misses <= 3 && this.hintsUsed <= 1 ? 3 : this.misses <= 8 && this.hintsUsed <= 4 ? 2 : 1;
    recordGameComplete(this, 'MatchingGame', stars, '记忆配对全部完成');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.42).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -145, 440, 290, 28);
    bg.lineStyle(4, 0x5C6BC0, 0.68);
    bg.strokeRoundedRect(-220, -145, 440, 290, 28);

    const title = this.add.text(0, -92, '记忆翻牌通关', {
      fontSize: '34px',
      color: '#3949AB',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const detail = this.add.text(0, -50, `翻牌 ${this.moves} 次 · 错误 ${this.misses} · 提示 ${this.hintsUsed}`, {
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

    const againBtn = this.add.text(0, 92, '再翻一次', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#3949AB',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    againBtn.on('pointerdown', () => {
      this.audio.playTap();
      overlay.destroy();
      this.scene.restart({ levelIndex: 0, moves: 0, misses: 0, hintsUsed: 0 });
    });
    panel.add(againBtn);
    panel.setScale(0.86).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }
}
