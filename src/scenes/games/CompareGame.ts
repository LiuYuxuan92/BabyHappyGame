import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';
import { showStarBurst } from '../../components/Particles';

type CompareMode = 'more' | 'less' | 'equal';
type AnswerSide = 'left' | 'right' | 'equal';

interface CompareLevel {
  title: string;
  prompt: string;
  rounds: number;
  min: number;
  max: number;
  modes: CompareMode[];
  assets: string[];
  accent: number;
  bg: 'garden' | 'ocean' | 'market';
}

interface RoundData {
  leftCount: number;
  rightCount: number;
  leftAsset: string;
  rightAsset: string;
  mode: CompareMode;
}

interface AnswerButton {
  side: AnswerSide;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
}

const LEVELS: CompareLevel[] = [
  {
    title: '哪边更多',
    prompt: '先比较 1 到 5',
    rounds: 4,
    min: 1,
    max: 5,
    modes: ['more'],
    assets: ['animal_cat', 'animal_dog', 'animal_bear', 'animal_penguin', 'animal_owl'],
    accent: 0x7E57C2,
    bg: 'garden',
  },
  {
    title: '更多还是更少',
    prompt: '题目会换问法',
    rounds: 4,
    min: 2,
    max: 7,
    modes: ['more', 'less'],
    assets: ['fish_blue', 'fish_green', 'fish_orange', 'fish_brown', 'animal_penguin'],
    accent: 0x03A9F4,
    bg: 'ocean',
  },
  {
    title: '小摊大比较',
    prompt: '可能一样多',
    rounds: 5,
    min: 4,
    max: 10,
    modes: ['more', 'less', 'equal'],
    assets: ['food_01', 'food_02', 'food_03', 'food_05', 'food_09', 'food_11'],
    accent: 0xFF9800,
    bg: 'market',
  },
];

export class CompareGame extends Phaser.Scene {
  private levelIndex = 0;
  private roundIndex = 0;
  private correctAnswers = 0;
  private wrongAnswers = 0;
  private hintsUsed = 0;
  private canTap = true;
  private round!: RoundData;
  private leftGroup: Phaser.GameObjects.Image[] = [];
  private rightGroup: Phaser.GameObjects.Image[] = [];
  private roundObjects: Phaser.GameObjects.GameObject[] = [];
  private answerButtons: AnswerButton[] = [];
  private questionText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  constructor() {
    super({ key: 'CompareGame' });
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
    this.canTap = true;
    this.leftGroup = [];
    this.rightGroup = [];
    this.roundObjects = [];
    this.answerButtons = [];

    const { width } = this.scale;
    const level = LEVELS[this.levelIndex];
    this.drawBackground(level);

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '数量比较站', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'CompareGame');

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

    this.questionText = this.add.text(width / 2, 110, '', {
      fontSize: '28px',
      color: '#4A148C',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#ffffffcc',
      padding: { x: 18, y: 8 },
    }).setOrigin(0.5);

    this.startRound();
  }

  private drawBackground(level: CompareLevel) {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    if (level.bg === 'ocean') {
      bg.fillGradientStyle(0xD9F7FF, 0xB2EBF2, 0xE0F7FA, 0x80DEEA);
    } else if (level.bg === 'market') {
      bg.fillGradientStyle(0xFFF8E1, 0xFFE0B2, 0xF1F8E9, 0xFFCC80);
    } else {
      bg.fillGradientStyle(0xFCE4EC, 0xF3E5F5, 0xE1F5FE, 0xC8E6C9);
    }
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0xffffff, 0.34);
    bg.fillRoundedRect(64, 138, width - 128, height - 260, 34);
    bg.lineStyle(4, 0xffffff, 0.42);
    bg.strokeRoundedRect(64, 138, width - 128, height - 260, 34);

    const divider = this.add.graphics();
    divider.lineStyle(3, level.accent, 0.26);
    divider.lineBetween(width / 2, 150, width / 2, height - 148);

    if (level.bg === 'ocean') {
      for (let i = 0; i < 14; i++) {
        const bubble = this.add.circle(78 + i * 58, 150 + (i % 4) * 66, 6 + (i % 3) * 4, 0xffffff, 0.22);
        this.tweens.add({ targets: bubble, y: bubble.y - 20, alpha: 0.08, duration: 1200 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const flower = this.add.image(66 + i * 182, height - 34, `flower_${i % 6}`).setScale(0.64).setAlpha(0.56);
        this.tweens.add({ targets: flower, y: flower.y - 4, duration: 900 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  private startRound() {
    this.clearRound();
    this.canTap = true;
    const level = LEVELS[this.levelIndex];
    this.round = this.generateRound(level);
    const prompt = this.round.mode === 'more' ? '哪边更多？' : this.round.mode === 'less' ? '哪边更少？' : '哪边一样多？';
    this.questionText.setText(`第 ${this.roundIndex + 1}/${level.rounds} 题：${prompt}`);

    this.drawGroups(level);
    this.createAnswerButtons(level);
    this.updateStatus();
  }

  private generateRound(level: CompareLevel): RoundData {
    const mode = Phaser.Utils.Array.GetRandom(level.modes);
    let leftCount = Phaser.Math.Between(level.min, level.max);
    let rightCount = Phaser.Math.Between(level.min, level.max);

    if (mode === 'equal') {
      rightCount = leftCount;
    } else {
      while (leftCount === rightCount || Math.abs(leftCount - rightCount) < 2) {
        leftCount = Phaser.Math.Between(level.min, level.max);
        rightCount = Phaser.Math.Between(level.min, level.max);
      }
    }

    const leftAsset = Phaser.Utils.Array.GetRandom(level.assets);
    let rightAsset = Phaser.Utils.Array.GetRandom(level.assets);
    let guard = 0;
    while (rightAsset === leftAsset && guard < 10) {
      rightAsset = Phaser.Utils.Array.GetRandom(level.assets);
      guard++;
    }

    return { leftCount, rightCount, leftAsset, rightAsset, mode };
  }

  private drawGroups(level: CompareLevel) {
    const { width, height } = this.scale;
    const leftArea = { x: 82, y: 158, w: width / 2 - 104, h: height - 324 };
    const rightArea = { x: width / 2 + 22, y: 158, w: width / 2 - 104, h: height - 324 };
    this.drawArea(leftArea, '左边', level.accent);
    this.drawArea(rightArea, '右边', level.accent);
    this.placeItems(this.round.leftAsset, this.round.leftCount, leftArea, this.leftGroup);
    this.placeItems(this.round.rightAsset, this.round.rightCount, rightArea, this.rightGroup);
  }

  private drawArea(area: { x: number; y: number; w: number; h: number }, label: string, accent: number) {
    const zone = this.add.graphics();
    zone.fillStyle(0xffffff, 0.38);
    zone.fillRoundedRect(area.x, area.y, area.w, area.h, 24);
    zone.lineStyle(4, accent, 0.28);
    zone.strokeRoundedRect(area.x, area.y, area.w, area.h, 24);
    const text = this.add.text(area.x + area.w / 2, area.y + 28, label, {
      fontSize: '22px',
      color: '#455A64',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.roundObjects.push(zone, text);
  }

  private placeItems(assetKey: string, count: number, area: { x: number; y: number; w: number; h: number }, group: Phaser.GameObjects.Image[]) {
    const size = count >= 8 ? 46 : count >= 6 ? 54 : 64;
    const cols = Math.ceil(Math.sqrt(count + 1));
    const rows = Math.ceil(count / cols);
    const cellW = area.w / cols;
    const cellH = (area.h - 58) / rows;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = area.x + col * cellW + cellW / 2 + Phaser.Math.Between(-8, 8);
      const y = area.y + 62 + row * cellH + cellH / 2 + Phaser.Math.Between(-7, 7);
      const plate = this.add.circle(x, y + 5, size * 0.58, 0xffffff, 0.52);
      const item = this.add.image(x, y, assetKey).setDisplaySize(size, size);
      item.setScale(0);
      plate.setScale(0);
      this.tweens.add({ targets: [item, plate], scale: 1, duration: 260, delay: i * 45, ease: 'Back.easeOut' });
      group.push(item);
      this.roundObjects.push(item, plate);
    }
  }

  private createAnswerButtons(level: CompareLevel) {
    const { width, height } = this.scale;
    const labels: { side: AnswerSide; label: string }[] = [
      { side: 'left', label: '左边' },
      { side: 'equal', label: '一样多' },
      { side: 'right', label: '右边' },
    ];
    const btnW = 142;
    const btnH = 56;
    const gap = 22;
    const totalW = labels.length * btnW + (labels.length - 1) * gap;
    const startX = width / 2 - totalW / 2 + btnW / 2;
    const y = height - 92;

    labels.forEach((item, index) => {
      const x = startX + index * (btnW + gap);
      const container = this.add.container(x, y);
      const bg = this.add.graphics();
      this.drawButtonBg(bg, btnW, btnH, level.accent, false);
      const label = this.add.text(0, 0, item.label, {
        fontSize: '24px',
        color: '#263238',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const hit = this.add.rectangle(0, 0, btnW, btnH, 0xffffff, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.answer(item.side));
      container.add([bg, label, hit]);
      container.setScale(0);
      this.tweens.add({ targets: container, scale: 1, duration: 230, delay: index * 70, ease: 'Back.easeOut' });
      this.answerButtons.push({ side: item.side, container, bg });
      this.roundObjects.push(container);
    });
  }

  private drawButtonBg(bg: Phaser.GameObjects.Graphics, w: number, h: number, color: number, active: boolean) {
    bg.clear();
    bg.fillStyle(active ? color : 0xffffff, active ? 0.98 : 0.94);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(4, color, active ? 0.95 : 0.68);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
  }

  private answer(side: AnswerSide) {
    if (!this.canTap) return;
    this.canTap = false;
    this.audio.playTap();
    const correct = this.getCorrectAnswer();
    const button = this.answerButtons.find(item => item.side === side);
    const level = LEVELS[this.levelIndex];

    if (side === correct) {
      this.correctAnswers++;
      this.audio.playSuccess();
      if (button) this.drawButtonBg(button.bg, 142, 56, level.accent, true);
      const targetGroup = correct === 'left' ? this.leftGroup : correct === 'right' ? this.rightGroup : [...this.leftGroup, ...this.rightGroup];
      targetGroup.forEach((item, index) => this.time.delayedCall(index * 40, () => showStarBurst(this, item.x, item.y)));
      showFloatingToast(this, '比较正确', level.accent);
      this.time.delayedCall(950, () => this.advanceRound());
      this.updateStatus();
      return;
    }

    this.wrongAnswers++;
    this.audio.playWrong();
    if (button) {
      this.tweens.add({ targets: button.container, x: button.container.x - 8, duration: 45, yoyo: true, repeat: 3 });
    }
    this.cameras.main.shake(160, 0.002);
    showFloatingToast(this, '再数一数两边', 0xFFB300);
    this.time.delayedCall(650, () => {
      this.canTap = true;
      this.updateStatus();
    });
  }

  private getCorrectAnswer(): AnswerSide {
    const { leftCount, rightCount, mode } = this.round;
    if (leftCount === rightCount) return 'equal';
    if (mode === 'more') return leftCount > rightCount ? 'left' : 'right';
    if (mode === 'less') return leftCount < rightCount ? 'left' : 'right';
    return 'equal';
  }

  private showHint() {
    if (!this.canTap) return;
    this.hintsUsed++;
    this.audio.playTap();
    showFloatingToast(this, `左边 ${this.round.leftCount} 个，右边 ${this.round.rightCount} 个`, 0x26A69A);
    this.showCountBadge(this.leftGroup, this.round.leftCount);
    this.showCountBadge(this.rightGroup, this.round.rightCount);
    this.updateStatus();
  }

  private showCountBadge(group: Phaser.GameObjects.Image[], count: number) {
    if (group.length === 0) return;
    const x = group.reduce((sum, item) => sum + item.x, 0) / group.length;
    const y = Math.min(...group.map(item => item.y)) - 38;
    const badge = this.add.container(x, y).setDepth(30);
    const bg = this.add.circle(0, 0, 26, 0xffffff, 0.96);
    bg.setStrokeStyle(4, 0x26A69A, 0.85);
    const label = this.add.text(0, 0, String(count), {
      fontSize: '26px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    badge.add([bg, label]);
    badge.setScale(0);
    this.tweens.add({
      targets: badge,
      scale: 1,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: badge, alpha: 0, y: badge.y - 18, duration: 520, delay: 1000, onComplete: () => badge.destroy() }),
    });
  }

  private advanceRound() {
    const level = LEVELS[this.levelIndex];
    this.roundIndex++;
    if (this.roundIndex < level.rounds) {
      this.startRound();
      return;
    }

    if (this.levelIndex < LEVELS.length - 1) {
      showFloatingToast(this, '下一组比较挑战', level.accent);
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

  private clearRound() {
    this.roundObjects.forEach(item => item.destroy());
    this.roundObjects = [];
    this.leftGroup = [];
    this.rightGroup = [];
    this.answerButtons = [];
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
    recordGameComplete(this, 'CompareGame', stars, '数量比较全部完成');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.42).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -145, 440, 290, 28);
    bg.lineStyle(4, 0x7E57C2, 0.66);
    bg.strokeRoundedRect(-220, -145, 440, 290, 28);

    const title = this.add.text(0, -92, '数量比较完成', {
      fontSize: '34px',
      color: '#6A1B9A',
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

    const againBtn = this.add.text(0, 92, '再比一次', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#6A1B9A',
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
