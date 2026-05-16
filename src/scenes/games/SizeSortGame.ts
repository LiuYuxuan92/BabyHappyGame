import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';
import { showStarBurst } from '../../components/Particles';

interface SizeLevel {
  title: string;
  prompt: string;
  itemKey: string;
  itemName: string;
  count: number;
  minScale: number;
  maxScale: number;
  accent: number;
  bg: 'garden' | 'ocean' | 'city';
}

interface Slot {
  x: number;
  y: number;
  index: number;
  occupiedBy: SizeItem | null;
  frame: Phaser.GameObjects.Graphics;
}

interface SizeItem {
  sprite: Phaser.GameObjects.Image;
  plate: Phaser.GameObjects.Graphics;
  correctSlot: number;
  currentSlot: number | null;
  originalX: number;
  originalY: number;
  scaleValue: number;
}

const LEVELS: SizeLevel[] = [
  {
    title: '小象排队',
    prompt: '从小到大排 3 个',
    itemKey: 'animal_elephant',
    itemName: '小象',
    count: 3,
    minScale: 0.52,
    maxScale: 0.95,
    accent: 0xE91E63,
    bg: 'garden',
  },
  {
    title: '小鱼长大',
    prompt: '按大小排 4 条鱼',
    itemKey: 'fish_orange',
    itemName: '小鱼',
    count: 4,
    minScale: 0.48,
    maxScale: 1.02,
    accent: 0x03A9F4,
    bg: 'ocean',
  },
  {
    title: '车队出发',
    prompt: '挑战 5 辆车',
    itemKey: 'vehicle_red',
    itemName: '小车',
    count: 5,
    minScale: 0.42,
    maxScale: 1.08,
    accent: 0xFF7043,
    bg: 'city',
  },
];

export class SizeSortGame extends Phaser.Scene {
  private items: SizeItem[] = [];
  private slots: Slot[] = [];
  private levelIndex = 0;
  private wrongOrders = 0;
  private hintsUsed = 0;
  private statusText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  constructor() {
    super({ key: 'SizeSortGame' });
  }

  init(data?: { levelIndex?: number; wrongOrders?: number; hintsUsed?: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
    this.wrongOrders = data?.wrongOrders ?? 0;
    this.hintsUsed = data?.hintsUsed ?? 0;
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    this.items = [];
    this.slots = [];

    const { width } = this.scale;
    const level = LEVELS[this.levelIndex];
    this.drawBackground(level);

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '大小排队乐园', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'SizeSortGame');

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

    this.createSlots(level);
    this.createItems(level);
    this.setupDrag();
    this.updateStatus();
  }

  private drawBackground(level: SizeLevel) {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    if (level.bg === 'ocean') {
      bg.fillGradientStyle(0xD9F7FF, 0xB2EBF2, 0xE0F7FA, 0x80DEEA);
    } else if (level.bg === 'city') {
      bg.fillGradientStyle(0xFFF8E1, 0xE1F5FE, 0xF3E5F5, 0xCFD8DC);
    } else {
      bg.fillGradientStyle(0xFCE4EC, 0xE3F2FD, 0xFFFDE7, 0xC8E6C9);
    }
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0xffffff, 0.34);
    bg.fillRoundedRect(72, 104, width - 144, height - 250, 34);
    bg.lineStyle(4, 0xffffff, 0.42);
    bg.strokeRoundedRect(72, 104, width - 144, height - 250, 34);

    if (level.bg === 'ocean') {
      for (let i = 0; i < 14; i++) {
        const bubble = this.add.circle(72 + i * 58, 126 + (i % 5) * 66, 6 + (i % 3) * 4, 0xffffff, 0.22);
        this.tweens.add({ targets: bubble, y: bubble.y - 20, alpha: 0.08, duration: 1200 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    } else if (level.bg === 'city') {
      bg.fillStyle(0x90A4AE, 0.22);
      for (let x = 70; x < width; x += 96) {
        bg.fillRoundedRect(x, height - 126, 54, 76 + (x % 3) * 12, 8);
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const flower = this.add.image(66 + i * 182, height - 34, `flower_${i % 6}`).setScale(0.66).setAlpha(0.6);
        this.tweens.add({ targets: flower, y: flower.y - 4, duration: 900 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  private createSlots(level: SizeLevel) {
    const { width, height } = this.scale;
    const slotSize = level.count >= 5 ? 96 : 112;
    const gap = level.count >= 5 ? 12 : 18;
    const totalW = level.count * slotSize + (level.count - 1) * gap;
    const startX = width / 2 - totalW / 2 + slotSize / 2;
    const y = height - 112;

    this.add.text(width / 2, y - 86, '从小到大', {
      fontSize: '23px',
      color: '#455A64',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#ffffffcc',
      padding: { x: 18, y: 8 },
    }).setOrigin(0.5);

    for (let i = 0; i < level.count; i++) {
      const x = startX + i * (slotSize + gap);
      const frame = this.add.graphics();
      this.drawSlotFrame(frame, x, y, slotSize, level.accent, false);

      const label = i === 0 ? '小' : i === level.count - 1 ? '大' : String(i + 1);
      this.add.text(x, y + slotSize / 2 + 17, label, {
        fontSize: '19px',
        color: '#607D8B',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.slots.push({ x, y, index: i, occupiedBy: null, frame });
    }

    const arrow = this.add.graphics();
    arrow.lineStyle(4, level.accent, 0.55);
    arrow.lineBetween(startX - 44, y - 70, startX + (level.count - 1) * (slotSize + gap) + 44, y - 70);
    arrow.fillStyle(level.accent, 0.55);
    arrow.fillTriangle(startX + (level.count - 1) * (slotSize + gap) + 54, y - 70, startX + (level.count - 1) * (slotSize + gap) + 34, y - 82, startX + (level.count - 1) * (slotSize + gap) + 34, y - 58);
  }

  private drawSlotFrame(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number, active: boolean) {
    g.clear();
    g.fillStyle(0xffffff, active ? 0.98 : 0.78);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 18);
    g.lineStyle(active ? 6 : 4, color, active ? 0.85 : 0.55);
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 18);
    g.fillStyle(color, active ? 0.18 : 0.08);
    g.fillCircle(x, y, size * 0.27);
  }

  private createItems(level: SizeLevel) {
    const { width, height } = this.scale;
    const scaleStep = (level.maxScale - level.minScale) / (level.count - 1);
    const sizes = Array.from({ length: level.count }, (_v, i) => level.minScale + i * scaleStep);
    const shuffled = Phaser.Utils.Array.Shuffle(sizes.map((scale, index) => ({ scale, index })));
    const positions = this.generatePositions(level.count, 110, width - 110, 142, height - 252, 112);

    shuffled.forEach((entry, displayIndex) => {
      const pos = positions[displayIndex];
      const plate = this.add.graphics().setPosition(pos.x, pos.y);
      plate.fillStyle(0xffffff, 0.62);
      plate.fillCircle(0, 10, 50);
      plate.lineStyle(2, 0xffffff, 0.8);
      plate.strokeCircle(0, 10, 50);

      const sprite = this.add.image(pos.x, pos.y, level.itemKey);
      sprite.setScale(entry.scale);
      sprite.setInteractive({ useHandCursor: true, draggable: true });
      sprite.setData('originalX', pos.x);
      sprite.setData('originalY', pos.y);
      sprite.setData('plate', plate);

      const item: SizeItem = {
        sprite,
        plate,
        correctSlot: entry.index,
        currentSlot: null,
        originalX: pos.x,
        originalY: pos.y,
        scaleValue: entry.scale,
      };
      this.items.push(item);

      sprite.setAlpha(0).setY(pos.y + 18);
      plate.setAlpha(0);
      this.tweens.add({ targets: [sprite, plate], alpha: 1, y: pos.y, duration: 280, delay: displayIndex * 75, ease: 'Back.easeOut' });
    });
  }

  private generatePositions(count: number, left: number, right: number, top: number, bottom: number, minDist: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    let attempts = 0;
    while (positions.length < count && attempts < 700) {
      const x = Phaser.Math.Between(left, right);
      const y = Phaser.Math.Between(top, bottom);
      if (positions.every(pos => Phaser.Math.Distance.Between(x, y, pos.x, pos.y) >= minDist)) {
        positions.push({ x, y });
      }
      attempts++;
    }

    if (positions.length === count) return positions;
    positions.length = 0;
    const spacing = (right - left) / (count + 1);
    const midY = (top + bottom) / 2;
    for (let i = 0; i < count; i++) {
      positions.push({ x: left + spacing * (i + 1), y: midY + Phaser.Math.Between(-26, 26) });
    }
    return positions;
  }

  private setupDrag() {
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      const item = this.items.find(candidate => candidate.sprite === obj);
      if (!item) return;
      this.audio.playDrag();
      obj.setDepth(20);
      item.plate.setDepth(19);
      this.releaseCurrentSlot(item);
      this.tweens.add({ targets: obj, scale: item.scaleValue * 1.08, duration: 100 });
    });

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
      obj.setPosition(dragX, dragY);
      const plate = obj.getData('plate') as Phaser.GameObjects.Graphics;
      plate.setPosition(dragX, dragY);
      this.highlightNearestSlot(obj);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      this.clearSlotHighlights();
      const item = this.items.find(candidate => candidate.sprite === obj);
      if (!item) return;
      obj.setDepth(0);
      item.plate.setDepth(0);

      const slot = this.slots.find(candidate => Phaser.Math.Distance.Between(obj.x, obj.y, candidate.x, candidate.y) < 72);
      if (slot) {
        this.placeItemInSlot(item, slot);
      } else {
        this.returnItemHome(item);
      }
      this.time.delayedCall(260, () => this.checkCompletion());
    });
  }

  private releaseCurrentSlot(item: SizeItem) {
    if (item.currentSlot === null) return;
    const slot = this.slots[item.currentSlot];
    slot.occupiedBy = null;
    item.currentSlot = null;
  }

  private placeItemInSlot(item: SizeItem, slot: Slot) {
    if (slot.occupiedBy && slot.occupiedBy !== item) {
      this.returnItemHome(slot.occupiedBy);
      slot.occupiedBy.currentSlot = null;
    }
    slot.occupiedBy = item;
    item.currentSlot = slot.index;
    this.audio.playTap();
    this.tweens.add({
      targets: [item.sprite, item.plate],
      x: slot.x,
      y: slot.y,
      duration: 210,
      ease: 'Back.easeOut',
    });
    this.tweens.add({ targets: item.sprite, scale: item.scaleValue, duration: 120 });
  }

  private returnItemHome(item: SizeItem) {
    this.releaseCurrentSlot(item);
    this.tweens.add({
      targets: [item.sprite, item.plate],
      x: item.originalX,
      y: item.originalY,
      duration: 280,
      ease: 'Back.easeOut',
    });
    this.tweens.add({ targets: item.sprite, scale: item.scaleValue, duration: 120 });
  }

  private highlightNearestSlot(obj: Phaser.GameObjects.Image) {
    this.clearSlotHighlights();
    const level = LEVELS[this.levelIndex];
    const slotSize = level.count >= 5 ? 96 : 112;
    const slot = this.slots.find(candidate => Phaser.Math.Distance.Between(obj.x, obj.y, candidate.x, candidate.y) < 92);
    if (slot) {
      this.drawSlotFrame(slot.frame, slot.x, slot.y, slotSize, level.accent, true);
    }
  }

  private clearSlotHighlights() {
    const level = LEVELS[this.levelIndex];
    const slotSize = level.count >= 5 ? 96 : 112;
    this.slots.forEach(slot => this.drawSlotFrame(slot.frame, slot.x, slot.y, slotSize, level.accent, false));
  }

  private checkCompletion() {
    if (!this.items.every(item => item.currentSlot !== null)) return;
    const correct = this.items.every(item => item.currentSlot === item.correctSlot);
    if (correct) {
      this.finishLevel();
      return;
    }

    this.wrongOrders++;
    this.audio.playWrong();
    this.cameras.main.shake(180, 0.002);
    showFloatingToast(this, '顺序还不对，看看谁更小', 0xFFB300);
    this.items.forEach((item, index) => {
      this.tweens.add({ targets: item.sprite, x: item.sprite.x - 7, duration: 45, yoyo: true, repeat: 3, delay: index * 20 });
    });
    this.updateStatus();
  }

  private showHint() {
    const level = LEVELS[this.levelIndex];
    this.hintsUsed++;
    this.audio.playTap();
    showFloatingToast(this, '数字越小越靠左', 0x26A69A);

    this.items.forEach(item => {
      const badge = this.add.container(item.sprite.x + 30, item.sprite.y - 32).setDepth(30);
      const dot = this.add.circle(0, 0, 17, 0xffffff, 0.96);
      dot.setStrokeStyle(3, level.accent, 0.85);
      const label = this.add.text(0, 0, String(item.correctSlot + 1), {
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
        ease: 'Back.easeOut',
        onComplete: () => this.tweens.add({ targets: badge, alpha: 0, y: badge.y - 18, duration: 520, delay: 1000, onComplete: () => badge.destroy() }),
      });
    });
    this.updateStatus();
  }

  private finishLevel() {
    const level = LEVELS[this.levelIndex];
    this.audio.playSuccess();
    this.items.forEach(item => item.sprite.disableInteractive());
    this.items.forEach((item, index) => {
      this.time.delayedCall(index * 120, () => {
        showStarBurst(this, item.sprite.x, item.sprite.y);
        this.tweens.add({ targets: item.sprite, y: item.sprite.y - 16, duration: 180, yoyo: true, ease: 'Sine.easeOut' });
      });
    });

    if (this.levelIndex < LEVELS.length - 1) {
      showFloatingToast(this, '下一组大小挑战', level.accent);
      this.time.delayedCall(900, () => {
        this.scene.restart({
          levelIndex: this.levelIndex + 1,
          wrongOrders: this.wrongOrders,
          hintsUsed: this.hintsUsed,
        });
      });
      return;
    }

    this.time.delayedCall(900, () => this.showComplete());
  }

  private updateStatus() {
    const level = LEVELS[this.levelIndex];
    const placed = this.items.filter(item => item.currentSlot !== null).length;
    this.statusText?.setText(`放好 ${placed}/${level.count}  错 ${this.wrongOrders}  提示 ${this.hintsUsed}`);
  }

  private showComplete() {
    const { width, height } = this.scale;
    const stars = this.wrongOrders <= 1 && this.hintsUsed <= 1 ? 3 : this.wrongOrders <= 4 && this.hintsUsed <= 3 ? 2 : 1;
    recordGameComplete(this, 'SizeSortGame', stars, '大小顺序排好了');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.42).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -145, 440, 290, 28);
    bg.lineStyle(4, 0xE91E63, 0.66);
    bg.strokeRoundedRect(-220, -145, 440, 290, 28);

    const title = this.add.text(0, -92, '大小排队完成', {
      fontSize: '34px',
      color: '#C2185B',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const detail = this.add.text(0, -50, `顺序错误 ${this.wrongOrders} 次 · 提示 ${this.hintsUsed} 次`, {
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

    const againBtn = this.add.text(0, 92, '再排一次', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#C2185B',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    againBtn.on('pointerdown', () => {
      this.audio.playTap();
      overlay.destroy();
      this.scene.restart({ levelIndex: 0, wrongOrders: 0, hintsUsed: 0 });
    });
    panel.add(againBtn);
    panel.setScale(0.86).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }
}
