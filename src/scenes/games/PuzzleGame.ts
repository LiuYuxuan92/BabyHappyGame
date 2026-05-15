import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';
import { showConfetti, showFireworks, showStarBurst } from '../../components/Particles';

interface PuzzleItem {
  key: string;
  name: string;
}

interface PuzzleSlot extends PuzzleItem {
  x: number;
  y: number;
  filled: boolean;
  hint: Phaser.GameObjects.Image;
}

interface PuzzlePiece {
  container: Phaser.GameObjects.Container;
  key: string;
  name: string;
  startX: number;
  startY: number;
  placed: boolean;
}

interface PuzzleLevel {
  title: string;
  accent: number;
  bg1: number;
  bg2: number;
  items: PuzzleItem[];
}

const LEVELS: PuzzleLevel[] = [
  {
    title: '农场朋友',
    accent: 0x7CB342,
    bg1: 0xE8F5E9,
    bg2: 0xA5D6A7,
    items: [
      { key: 'animal_cow', name: '牛' },
      { key: 'animal_sheep', name: '羊' },
      { key: 'animal_dog', name: '狗' },
      { key: 'animal_cat', name: '猫' },
      { key: 'animal_owl', name: '猫头鹰' },
      { key: 'animal_bear', name: '熊' },
    ],
  },
  {
    title: '海洋旅行',
    accent: 0x00ACC1,
    bg1: 0xE0F7FA,
    bg2: 0x4DD0E1,
    items: [
      { key: 'fish_blue', name: '蓝鱼' },
      { key: 'fish_green', name: '绿鱼' },
      { key: 'fish_orange', name: '橙鱼' },
      { key: 'fish_brown', name: '棕鱼' },
      { key: 'fish_grey', name: '灰鱼' },
      { key: 'animal_penguin', name: '企鹅' },
      { key: 'animal_owl', name: '猫头鹰' },
      { key: 'animal_bear', name: '熊' },
    ],
  },
  {
    title: '野生乐园',
    accent: 0xFF9800,
    bg1: 0xFFF3E0,
    bg2: 0xFFCC80,
    items: [
      { key: 'animal_elephant', name: '大象' },
      { key: 'animal_giraffe', name: '长颈鹿' },
      { key: 'animal_monkey', name: '猴子' },
      { key: 'animal_zebra', name: '斑马' },
      { key: 'animal_kangaroo', name: '袋鼠' },
      { key: 'animal_bear', name: '熊' },
      { key: 'animal_penguin', name: '企鹅' },
      { key: 'animal_cow', name: '牛' },
      { key: 'animal_dog', name: '狗' },
    ],
  },
];

export class PuzzleGame extends Phaser.Scene {
  private placedCount = 0;
  private wrongDrops = 0;
  private hintsUsed = 0;
  private levelIndex = 0;
  private slots: PuzzleSlot[] = [];
  private pieces: PuzzlePiece[] = [];
  private progressText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  constructor() {
    super({ key: 'PuzzleGame' });
  }

  init(data?: { levelIndex?: number; wrongDrops?: number; hintsUsed?: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
    this.wrongDrops = data?.wrongDrops ?? 0;
    this.hintsUsed = data?.hintsUsed ?? 0;
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    this.placedCount = 0;
    this.slots = [];
    this.pieces = [];

    const { width } = this.scale;
    const level = LEVELS[this.levelIndex];
    this.drawBackground(level);

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '动物拼图乐园', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'PuzzleGame');

    this.add.text(width / 2, 70, `${this.levelIndex + 1}/${LEVELS.length}  ${level.title} · 把动物拖到影子里`, {
      fontSize: '20px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.progressText = this.add.text(width - 24, 34, '', {
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
      backgroundColor: '#FFB300',
      padding: { x: 16, y: 8 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    hintBtn.on('pointerdown', () => this.showHint());

    this.createPuzzle();
    this.updateProgress();
  }

  private drawBackground(level: PuzzleLevel) {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(level.bg1, level.bg1, level.bg2, level.bg2);
    bg.fillRect(0, 0, width, height);

    bg.fillStyle(0xffffff, 0.2);
    for (let i = 0; i < 18; i++) {
      bg.fillCircle(Phaser.Math.Between(70, width - 70), Phaser.Math.Between(100, height - 120), Phaser.Math.Between(16, 42));
    }

    if (this.levelIndex === 1) {
      bg.fillStyle(0xffffff, 0.22);
      for (let i = 0; i < 16; i++) {
        bg.strokeCircle(Phaser.Math.Between(80, width - 80), Phaser.Math.Between(110, height - 100), Phaser.Math.Between(7, 18));
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const flower = this.add.image(60 + i * 180, height - 34, `flower_${i % 6}`).setAlpha(0.58).setScale(0.7);
        this.tweens.add({ targets: flower, y: flower.y - 5, duration: 900 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }

    const cloudCount = this.levelIndex === 1 ? 2 : 4;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = this.add.image(Phaser.Math.Between(80, width - 80), Phaser.Math.Between(10, 52), 'cloud_deco');
      cloud.setAlpha(0.26).setScale(Phaser.Math.FloatBetween(0.6, 1.05));
      this.tweens.add({ targets: cloud, x: cloud.x + Phaser.Math.Between(-18, 18), duration: 1800 + i * 220, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private createPuzzle() {
    const { width, height } = this.scale;
    const level = LEVELS[this.levelIndex];
    const items = Phaser.Utils.Array.Shuffle([...level.items]);
    const columns = items.length <= 6 ? 3 : items.length <= 8 ? 4 : 3;
    const rows = Math.ceil(items.length / columns);
    const slotSize = items.length >= 9 ? 104 : 116;
    const gap = 16;
    const totalW = columns * slotSize + (columns - 1) * gap;
    const totalH = rows * slotSize + (rows - 1) * gap;
    const startX = width / 2 - totalW / 2 + slotSize / 2;
    const startY = 132 + slotSize / 2;

    const board = this.add.graphics();
    board.fillStyle(0xffffff, 0.56);
    board.fillRoundedRect(width / 2 - totalW / 2 - 28, 106, totalW + 56, totalH + 56, 30);
    board.lineStyle(4, level.accent, 0.38);
    board.strokeRoundedRect(width / 2 - totalW / 2 - 28, 106, totalW + 56, totalH + 56, 30);

    items.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * (slotSize + gap);
      const y = startY + row * (slotSize + gap);
      this.createSlot(x, y, slotSize, item);
    });

    const trayY = height - 82;
    const tray = this.add.graphics();
    tray.fillStyle(0xffffff, 0.84);
    tray.fillRoundedRect(92, trayY - 56, width - 184, 112, 28);
    tray.lineStyle(4, level.accent, 0.36);
    tray.strokeRoundedRect(92, trayY - 56, width - 184, 112, 28);

    Phaser.Utils.Array.Shuffle([...this.slots]).forEach((slot, index) => {
      const gapX = (width - 220) / (this.slots.length - 1 || 1);
      const x = 110 + index * gapX;
      const y = trayY + Phaser.Math.Between(-8, 8);
      this.createPiece(x, y, slot);
    });
  }

  private createSlot(x: number, y: number, size: number, item: PuzzleItem) {
    const level = LEVELS[this.levelIndex];
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.06);
    shadow.fillRoundedRect(x - size / 2 + 3, y - size / 2 + 3, size, size, 18);

    const plate = this.add.graphics();
    plate.fillStyle(0xffffff, 0.78);
    plate.fillRoundedRect(x - size / 2, y - size / 2, size, size, 18);
    plate.lineStyle(3, level.accent, 0.32);
    plate.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 18);

    const hint = this.add.image(x, y - 5, item.key);
    hint.setDisplaySize(size * 0.62, size * 0.62);
    hint.setTint(0x263238).setAlpha(0.13);

    this.add.text(x, y + size / 2 - 15, item.name, {
      fontSize: '14px',
      color: '#78909C',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.slots.push({ ...item, x, y, filled: false, hint });
  }

  private createPiece(x: number, y: number, slot: PuzzleSlot) {
    const level = LEVELS[this.levelIndex];
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.08);
    bg.fillCircle(3, 4, 43);
    bg.fillStyle(0xffffff, 0.96);
    bg.fillCircle(0, 0, 43);
    bg.lineStyle(3, level.accent, 0.64);
    bg.strokeCircle(0, 0, 43);

    const animal = this.add.image(0, -2, slot.key).setDisplaySize(72, 72);
    container.add([bg, animal]);
    container.setSize(92, 92).setInteractive({ useHandCursor: true, draggable: true });

    const piece: PuzzlePiece = {
      container,
      key: slot.key,
      name: slot.name,
      startX: x,
      startY: y,
      placed: false,
    };
    this.pieces.push(piece);

    container.setScale(0);
    this.tweens.add({ targets: container, scale: 1, duration: 260, delay: this.pieces.length * 45, ease: 'Back.easeOut' });

    container.on('dragstart', () => {
      if (piece.placed) return;
      this.audio.playDrag();
      container.setDepth(20);
      this.tweens.add({ targets: container, scale: 1.12, duration: 100 });
    });

    container.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (piece.placed) return;
      container.setPosition(dragX, dragY);
      this.highlightNearestSlot(piece);
    });

    container.on('dragend', () => {
      if (piece.placed) return;
      this.tryPlacePiece(piece);
    });
  }

  private tryPlacePiece(piece: PuzzlePiece) {
    const target = this.slots.find(slot => slot.key === piece.key && !slot.filled);
    if (!target) return;

    const dist = Phaser.Math.Distance.Between(piece.container.x, piece.container.y, target.x, target.y);
    if (dist <= 58) {
      piece.placed = true;
      target.filled = true;
      piece.container.disableInteractive();
      piece.container.setDepth(8);
      this.clearSlotHighlights();
      this.audio.playSuccess();

      this.tweens.add({
        targets: piece.container,
        x: target.x,
        y: target.y - 6,
        scale: 1.08,
        duration: 220,
        ease: 'Back.easeOut',
      });
      target.hint.setAlpha(0.04);
      this.placedCount++;
      showStarBurst(this, target.x, target.y - 10);
      showFloatingToast(this, `${piece.name} 找到位置了`, LEVELS[this.levelIndex].accent);
      this.updateProgress();

      if (this.placedCount >= this.slots.length) {
        this.time.delayedCall(680, () => this.finishLevel());
      }
      return;
    }

    this.wrongDrops++;
    this.audio.playWrong();
    this.clearSlotHighlights();
    showFloatingToast(this, '再看看影子轮廓', 0xFFB300);
    this.tweens.add({
      targets: piece.container,
      x: piece.startX,
      y: piece.startY,
      scale: 1,
      duration: 280,
      ease: 'Back.easeOut',
    });
    this.updateProgress();
  }

  private highlightNearestSlot(piece: PuzzlePiece) {
    this.clearSlotHighlights();
    const slot = this.slots.find(candidate => candidate.key === piece.key && !candidate.filled);
    if (!slot) return;
    const dist = Phaser.Math.Distance.Between(piece.container.x, piece.container.y, slot.x, slot.y);
    if (dist < 92) {
      slot.hint.setAlpha(0.32);
      slot.hint.clearTint();
    }
  }

  private clearSlotHighlights() {
    this.slots.forEach(slot => {
      if (!slot.filled) slot.hint.setTint(0x263238).setAlpha(0.13);
    });
  }

  private showHint() {
    const piece = this.pieces.find(item => !item.placed);
    if (!piece) return;
    const slot = this.slots.find(item => item.key === piece.key && !item.filled);
    if (!slot) return;
    this.hintsUsed++;
    this.audio.playTap();
    showFloatingToast(this, `${piece.name} 去发光的位置`, 0xFFB300);

    const ring = this.add.graphics().setDepth(18);
    ring.lineStyle(5, 0xFFB300, 0.9);
    ring.strokeCircle(slot.x, slot.y - 5, 52);
    ring.setScale(0.7);
    this.tweens.add({
      targets: ring,
      scale: 1.25,
      alpha: 0,
      duration: 950,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.updateProgress();
  }

  private finishLevel() {
    if (this.levelIndex < LEVELS.length - 1) {
      showFloatingToast(this, '进入下一组拼图', LEVELS[this.levelIndex].accent);
      this.time.delayedCall(700, () => {
        this.scene.restart({
          levelIndex: this.levelIndex + 1,
          wrongDrops: this.wrongDrops,
          hintsUsed: this.hintsUsed,
        });
      });
      return;
    }

    this.showComplete();
  }

  private updateProgress() {
    this.progressText?.setText(`完成 ${this.placedCount}/${this.slots.length}  错 ${this.wrongDrops}  提示 ${this.hintsUsed}`);
  }

  private showComplete() {
    const { width, height } = this.scale;
    const stars = this.wrongDrops <= 2 && this.hintsUsed <= 1 ? 3 : this.wrongDrops <= 6 && this.hintsUsed <= 4 ? 2 : 1;
    recordGameComplete(this, 'PuzzleGame', stars, '拼图完成了');

    showConfetti(this);
    showFireworks(this, width / 2, height / 2 - 60);

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.42).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -145, 440, 290, 28);
    bg.lineStyle(4, 0x7CB342, 0.65);
    bg.strokeRoundedRect(-220, -145, 440, 290, 28);

    const title = this.add.text(0, -92, '拼图全部完成', {
      fontSize: '34px',
      color: '#43A047',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const detail = this.add.text(0, -50, `错误 ${this.wrongDrops} 次 · 提示 ${this.hintsUsed} 次`, {
      fontSize: '20px',
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

    const replayBtn = this.add.text(0, 92, '再玩一次', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#43A047',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    replayBtn.on('pointerdown', () => {
      overlay.destroy();
      this.scene.restart({ levelIndex: 0, wrongDrops: 0, hintsUsed: 0 });
    });

    panel.add(replayBtn);
    panel.setScale(0.86).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }
}
