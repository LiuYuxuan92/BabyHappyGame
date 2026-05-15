import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';
import { showConfetti, showStarBurst } from '../../components/Particles';

type FoodCategory = 'fruit' | 'vegetable' | 'snack';

interface FoodDef {
  key: string;
  name: string;
  category: FoodCategory;
}

interface FoodItem extends FoodDef {
  sprite: Phaser.GameObjects.Image;
  originalX: number;
  originalY: number;
  placed: boolean;
}

interface SortZone {
  category: FoodCategory;
  label: string;
  x: number;
  y: number;
  color: number;
  icon: string;
}

interface FoodLevel {
  title: string;
  prompt: string;
  categories: FoodCategory[];
  items: FoodDef[];
}

const FOOD_BANK: FoodDef[] = [
  { key: 'food_01', name: '红水果', category: 'fruit' },
  { key: 'food_02', name: '黄水果', category: 'fruit' },
  { key: 'food_03', name: '绿水果', category: 'fruit' },
  { key: 'food_04', name: '甜水果', category: 'fruit' },
  { key: 'food_05', name: '绿蔬菜', category: 'vegetable' },
  { key: 'food_06', name: '根茎菜', category: 'vegetable' },
  { key: 'food_07', name: '叶子菜', category: 'vegetable' },
  { key: 'food_08', name: '彩蔬菜', category: 'vegetable' },
  { key: 'food_09', name: '小点心', category: 'snack' },
  { key: 'food_10', name: '甜点心', category: 'snack' },
  { key: 'food_11', name: '烘焙点心', category: 'snack' },
  { key: 'food_12', name: '零食', category: 'snack' },
];

const CATEGORY_META: Record<FoodCategory, { label: string; color: number; icon: string }> = {
  fruit: { label: '水果', color: 0xFF7043, icon: 'food_01' },
  vegetable: { label: '蔬菜', color: 0x66BB6A, icon: 'food_05' },
  snack: { label: '点心', color: 0xFFB300, icon: 'food_09' },
};

const LEVELS: FoodLevel[] = [
  {
    title: '早餐小篮',
    prompt: '先把水果和蔬菜分开',
    categories: ['fruit', 'vegetable'],
    items: FOOD_BANK.filter(food => food.category !== 'snack').slice(0, 8),
  },
  {
    title: '午餐餐盘',
    prompt: '点心也要放到自己的盘子',
    categories: ['fruit', 'vegetable', 'snack'],
    items: [
      ...FOOD_BANK.filter(food => food.category === 'fruit').slice(0, 3),
      ...FOOD_BANK.filter(food => food.category === 'vegetable').slice(0, 3),
      ...FOOD_BANK.filter(food => food.category === 'snack').slice(0, 3),
    ],
  },
  {
    title: '厨房大整理',
    prompt: '把所有食物都送回正确分类',
    categories: ['fruit', 'vegetable', 'snack'],
    items: FOOD_BANK,
  },
];

export class FoodSortGame extends Phaser.Scene {
  private foodItems: FoodItem[] = [];
  private zones: SortZone[] = [];
  private placedCount = 0;
  private wrongDrops = 0;
  private hintsUsed = 0;
  private levelIndex = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  constructor() {
    super({ key: 'FoodSortGame' });
  }

  init(data?: { levelIndex?: number; wrongDrops?: number; hintsUsed?: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
    this.wrongDrops = data?.wrongDrops ?? 0;
    this.hintsUsed = data?.hintsUsed ?? 0;
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    this.foodItems = [];
    this.zones = [];
    this.placedCount = 0;

    const { width } = this.scale;
    const level = LEVELS[this.levelIndex];
    this.drawKitchenBackground();

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '厨房分类小帮手', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'FoodSortGame');

    this.add.text(width / 2, 70, `${this.levelIndex + 1}/${LEVELS.length}  ${level.title} · ${level.prompt}`, {
      fontSize: '20px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.scoreText = this.add.text(width - 24, 34, '', {
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

    this.createZones();
    this.createFoodItems();
    this.registerDragEvents();
    this.updateScore();
  }

  private drawKitchenBackground() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFFF8E1, 0xE1F5FE, 0xFBE9E7, 0xE8F5E9);
    bg.fillRect(0, 0, width, height);

    bg.fillStyle(0xffffff, 0.32);
    bg.fillRoundedRect(76, 94, width - 152, height - 250, 34);
    bg.lineStyle(4, 0xffffff, 0.42);
    bg.strokeRoundedRect(76, 94, width - 152, height - 250, 34);

    bg.fillStyle(0xFFCC80, 0.25);
    for (let x = 0; x < width; x += 96) {
      bg.fillRoundedRect(x + 18, height - 142, 58, 36, 10);
    }

    for (let i = 0; i < 7; i++) {
      const flower = this.add.image(70 + i * 190, height - 32, `flower_${i % 6}`).setScale(0.65).setAlpha(0.55);
      this.tweens.add({ targets: flower, y: flower.y - 4, duration: 900 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private createZones() {
    const { width, height } = this.scale;
    const level = LEVELS[this.levelIndex];
    const zoneY = height - 96;
    const gap = width / (level.categories.length + 1);

    level.categories.forEach((category, index) => {
      const meta = CATEGORY_META[category];
      const x = gap * (index + 1);
      const zone: SortZone = { category, label: meta.label, x, y: zoneY, color: meta.color, icon: meta.icon };
      this.zones.push(zone);
      this.drawBasket(zone);
    });
  }

  private drawBasket(zone: SortZone) {
    const basket = this.add.graphics();
    basket.fillStyle(0xffffff, 0.9);
    basket.fillRoundedRect(zone.x - 78, zone.y - 62, 156, 124, 20);
    basket.lineStyle(4, zone.color, 0.8);
    basket.strokeRoundedRect(zone.x - 78, zone.y - 62, 156, 124, 20);
    basket.fillStyle(zone.color, 0.18);
    basket.fillRoundedRect(zone.x - 64, zone.y - 10, 128, 58, 14);

    const icon = this.add.image(zone.x, zone.y - 26, zone.icon).setDisplaySize(48, 48).setAlpha(0.82);
    this.tweens.add({ targets: icon, y: icon.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.text(zone.x, zone.y + 66, zone.label, {
      fontSize: '22px',
      color: '#37474F',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private createFoodItems() {
    const { width, height } = this.scale;
    const items = Phaser.Utils.Array.Shuffle([...LEVELS[this.levelIndex].items]);
    const columns = items.length <= 9 ? 4 : 6;
    const rows = Math.ceil(items.length / columns);
    const areaW = width - 200;
    const startX = width / 2 - areaW / 2;
    const startY = 126;
    const cellW = areaW / columns;
    const cellH = (height - 300) / rows;

    items.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * cellW + cellW / 2 + Phaser.Math.Between(-18, 18);
      const y = startY + row * cellH + cellH / 2 + Phaser.Math.Between(-12, 12);

      const plate = this.add.graphics().setPosition(x, y);
      plate.fillStyle(0xffffff, 0.66);
      plate.fillCircle(0, 5, 45);
      plate.lineStyle(2, 0xffffff, 0.8);
      plate.strokeCircle(0, 5, 45);

      const sprite = this.add.image(x, y, item.key).setDisplaySize(72, 72);
      sprite.setInteractive({ useHandCursor: true, draggable: true });
      sprite.setData('category', item.category);
      sprite.setData('originalX', x);
      sprite.setData('originalY', y);
      sprite.setData('plate', plate);
      sprite.setData('name', item.name);

      this.foodItems.push({ ...item, sprite, originalX: x, originalY: y, placed: false });
      sprite.setScale(0);
      plate.setScale(0);
      this.tweens.add({ targets: [sprite, plate], scale: 1, duration: 260, delay: index * 55, ease: 'Back.easeOut' });
    });
  }

  private registerDragEvents() {
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      this.audio.playDrag();
      obj.setDepth(20);
      this.movePlate(obj, obj.x, obj.y, 1.12);
      this.tweens.add({ targets: obj, scale: 1.12, duration: 100 });
    });

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
      obj.setPosition(dragX, dragY);
      this.movePlate(obj, dragX, dragY, 1.12);
      this.highlightZone(obj);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      this.clearZoneHighlights();
      this.tryDropFood(obj);
    });
  }

  private tryDropFood(obj: Phaser.GameObjects.Image) {
    const category = obj.getData('category') as FoodCategory;
    const droppedZone = this.zones.find(zone => Phaser.Math.Distance.Between(obj.x, obj.y, zone.x, zone.y) < 96);

    if (droppedZone?.category === category) {
      const item = this.foodItems.find(food => food.sprite === obj);
      if (item) item.placed = true;
      obj.disableInteractive();
      obj.setDepth(8);
      this.audio.playSuccess();
      const plate = obj.getData('plate') as Phaser.GameObjects.Graphics;
      plate.destroy();

      this.tweens.add({
        targets: obj,
        x: droppedZone.x + Phaser.Math.Between(-34, 34),
        y: droppedZone.y + Phaser.Math.Between(-30, -8),
        displayWidth: 48,
        displayHeight: 48,
        scale: 1,
        duration: 220,
        ease: 'Back.easeOut',
      });

      this.placedCount++;
      showStarBurst(this, obj.x, obj.y);
      showFloatingToast(this, `${obj.getData('name')} 放进${droppedZone.label}`, droppedZone.color);
      this.updateScore();

      if (this.placedCount >= LEVELS[this.levelIndex].items.length) {
        this.time.delayedCall(650, () => this.finishLevel());
      }
      return;
    }

    this.wrongDrops++;
    this.audio.playWrong();
    const originalX = obj.getData('originalX') as number;
    const originalY = obj.getData('originalY') as number;
    showFloatingToast(this, droppedZone ? '这个篮子不对' : '拖到篮子里分类', 0xFFB300);
    this.tweens.add({
      targets: obj,
      x: originalX,
      y: originalY,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onUpdate: () => this.movePlate(obj, obj.x, obj.y, 1),
      onComplete: () => this.movePlate(obj, originalX, originalY, 1),
    });
    this.cameras.main.shake(180, 0.0025);
    this.updateScore();
  }

  private highlightZone(obj: Phaser.GameObjects.Image) {
    this.clearZoneHighlights();
    const category = obj.getData('category') as FoodCategory;
    const targetZone = this.zones.find(zone => zone.category === category);
    if (!targetZone) return;
    const dist = Phaser.Math.Distance.Between(obj.x, obj.y, targetZone.x, targetZone.y);
    if (dist < 150) {
      const ring = this.add.graphics().setName('zone-highlight').setDepth(5);
      ring.lineStyle(5, targetZone.color, 0.55);
      ring.strokeRoundedRect(targetZone.x - 86, targetZone.y - 70, 172, 140, 24);
    }
  }

  private clearZoneHighlights() {
    this.children.getAll('name', 'zone-highlight').forEach(child => child.destroy());
  }

  private showHint() {
    const next = this.foodItems.find(item => !item.placed);
    if (!next) return;
    const zone = this.zones.find(item => item.category === next.category);
    if (!zone) return;
    this.hintsUsed++;
    this.audio.playTap();
    showFloatingToast(this, `${next.name} 属于${zone.label}`, zone.color);

    const ring = this.add.graphics().setDepth(18);
    ring.lineStyle(5, 0xFFB300, 0.9);
    ring.strokeCircle(next.sprite.x, next.sprite.y, 52);
    ring.strokeRoundedRect(zone.x - 86, zone.y - 70, 172, 140, 24);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.12,
      duration: 1000,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.updateScore();
  }

  private movePlate(obj: Phaser.GameObjects.Image, x: number, y: number, scale: number) {
    const plate = obj.getData('plate') as Phaser.GameObjects.Graphics | undefined;
    if (!plate?.active) return;
    plate.setPosition(x, y);
    plate.setScale(scale);
  }

  private finishLevel() {
    if (this.levelIndex < LEVELS.length - 1) {
      showFloatingToast(this, '下一轮厨房任务', 0x66BB6A);
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

  private updateScore() {
    const total = LEVELS[this.levelIndex].items.length;
    this.scoreText?.setText(`完成 ${this.placedCount}/${total}  错 ${this.wrongDrops}  提示 ${this.hintsUsed}`);
  }

  private showComplete() {
    const { width, height } = this.scale;
    const stars = this.wrongDrops <= 2 && this.hintsUsed <= 1 ? 3 : this.wrongDrops <= 6 && this.hintsUsed <= 4 ? 2 : 1;
    recordGameComplete(this, 'FoodSortGame', stars, '分类全部正确');
    showConfetti(this);

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.42).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -145, 440, 290, 28);
    bg.lineStyle(4, 0x66BB6A, 0.65);
    bg.strokeRoundedRect(-220, -145, 440, 290, 28);

    const title = this.add.text(0, -92, '厨房整理完成', {
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

    const againBtn = this.add.text(0, 92, '再整理一次', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#43A047',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    againBtn.on('pointerdown', () => {
      overlay.destroy();
      this.scene.restart({ levelIndex: 0, wrongDrops: 0, hintsUsed: 0 });
    });
    panel.add(againBtn);
    panel.setScale(0.86).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }
}
