import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';
import { showStarBurst } from '../../components/Particles';
import { SceneTransition } from '../../components/SceneTransition';

type CategoryId = 'farm' | 'wild' | 'water' | 'bird';

interface SortItemDef {
  key: string;
  name: string;
  category: CategoryId;
}

interface CategoryDef {
  id: CategoryId;
  label: string;
  color: number;
  icon: string;
}

interface SortLevel {
  title: string;
  prompt: string;
  categories: CategoryId[];
  items: SortItemDef[];
}

interface SortItem extends SortItemDef {
  sprite: Phaser.GameObjects.Image;
  plate: Phaser.GameObjects.Graphics;
  originalX: number;
  originalY: number;
  placed: boolean;
}

interface SortZone extends CategoryDef {
  x: number;
  y: number;
}

const CATEGORIES: Record<CategoryId, CategoryDef> = {
  farm: { id: 'farm', label: '农场', color: 0x8BC34A, icon: 'animal_cow' },
  wild: { id: 'wild', label: '野外', color: 0xFF9800, icon: 'animal_giraffe' },
  water: { id: 'water', label: '水里', color: 0x03A9F4, icon: 'fish_blue' },
  bird: { id: 'bird', label: '会飞/会游', color: 0x7E57C2, icon: 'animal_owl' },
};

const ITEM_BANK: SortItemDef[] = [
  { key: 'animal_cow', name: '奶牛', category: 'farm' },
  { key: 'animal_sheep', name: '小羊', category: 'farm' },
  { key: 'animal_dog', name: '小狗', category: 'farm' },
  { key: 'animal_cat', name: '小猫', category: 'farm' },
  { key: 'animal_elephant', name: '大象', category: 'wild' },
  { key: 'animal_giraffe', name: '长颈鹿', category: 'wild' },
  { key: 'animal_zebra', name: '斑马', category: 'wild' },
  { key: 'animal_monkey', name: '猴子', category: 'wild' },
  { key: 'animal_kangaroo', name: '袋鼠', category: 'wild' },
  { key: 'fish_blue', name: '蓝鱼', category: 'water' },
  { key: 'fish_green', name: '绿鱼', category: 'water' },
  { key: 'fish_orange', name: '橙鱼', category: 'water' },
  { key: 'fish_brown', name: '棕鱼', category: 'water' },
  { key: 'animal_penguin', name: '企鹅', category: 'bird' },
  { key: 'animal_owl', name: '猫头鹰', category: 'bird' },
];

const LEVELS: SortLevel[] = [
  {
    title: '两个小家',
    prompt: '先分清农场和水里的伙伴',
    categories: ['farm', 'water'],
    items: ITEM_BANK.filter(item => ['farm', 'water'].includes(item.category)).slice(0, 8),
  },
  {
    title: '森林旅行',
    prompt: '农场、野外、水里都不同',
    categories: ['farm', 'wild', 'water'],
    items: [
      ...ITEM_BANK.filter(item => item.category === 'farm').slice(0, 3),
      ...ITEM_BANK.filter(item => item.category === 'wild').slice(0, 3),
      ...ITEM_BANK.filter(item => item.category === 'water').slice(0, 3),
    ],
  },
  {
    title: '动物园闭馆',
    prompt: '把每个伙伴送回正确区域',
    categories: ['farm', 'wild', 'water', 'bird'],
    items: ITEM_BANK,
  },
];

export class SortingGame extends Phaser.Scene {
  private items: SortItem[] = [];
  private zones: SortZone[] = [];
  private placedCount = 0;
  private wrongDrops = 0;
  private hintsUsed = 0;
  private levelIndex = 0;
  private statusText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  constructor() {
    super({ key: 'SortingGame' });
  }

  init(data?: { levelIndex?: number; wrongDrops?: number; hintsUsed?: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
    this.wrongDrops = data?.wrongDrops ?? 0;
    this.hintsUsed = data?.hintsUsed ?? 0;
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    this.items = [];
    this.zones = [];
    this.placedCount = 0;

    SceneTransition.fadeIn(this);
    const { width } = this.scale;
    const level = LEVELS[this.levelIndex];
    this.drawMeadowBackground();

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '动物分类小队', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'SortingGame');

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
      backgroundColor: '#FF9800',
      padding: { x: 16, y: 8 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    hintBtn.on('pointerdown', () => this.showHint());

    this.createZones();
    this.createItems();
    this.registerDragHandlers();
    this.updateStatus();
  }

  private drawMeadowBackground() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xB3E5FC, 0xE1F5FE, 0xDCEDC8, 0xA5D6A7);
    bg.fillRect(0, 0, width, height);

    bg.fillStyle(0xffffff, 0.34);
    bg.fillRoundedRect(72, 104, width - 144, height - 250, 34);
    bg.lineStyle(4, 0xffffff, 0.42);
    bg.strokeRoundedRect(72, 104, width - 144, height - 250, 34);

    for (let i = 0; i < 4; i++) {
      const cloud = this.add.image(90 + i * 230, 38 + (i % 2) * 24, 'cloud_deco');
      cloud.setAlpha(0.38);
      cloud.setScale(0.75 + i * 0.06);
      this.tweens.add({ targets: cloud, x: cloud.x + 18, duration: 2200 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    bg.fillStyle(0x66BB6A, 0.32);
    bg.fillRoundedRect(0, height - 154, width, 154, 28);
    for (let i = 0; i < 9; i++) {
      const flower = this.add.image(42 + i * 150, height - 36, `flower_${i % 6}`).setScale(0.7).setAlpha(0.7);
      this.tweens.add({ targets: flower, y: flower.y - 4, duration: 900 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private createZones() {
    const { width, height } = this.scale;
    const level = LEVELS[this.levelIndex];
    const zoneY = height - 94;
    const gap = width / (level.categories.length + 1);

    level.categories.forEach((category, index) => {
      const meta = CATEGORIES[category];
      const zone = { ...meta, x: gap * (index + 1), y: zoneY };
      this.zones.push(zone);
      this.drawZone(zone);
    });
  }

  private drawZone(zone: SortZone) {
    const base = this.add.graphics();
    base.fillStyle(0x000000, 0.06);
    base.fillRoundedRect(zone.x - 78, zone.y - 64, 160, 130, 20);
    base.fillStyle(0xffffff, 0.9);
    base.fillRoundedRect(zone.x - 82, zone.y - 70, 164, 132, 20);
    base.lineStyle(4, zone.color, 0.78);
    base.strokeRoundedRect(zone.x - 82, zone.y - 70, 164, 132, 20);
    base.fillStyle(zone.color, 0.14);
    base.fillRoundedRect(zone.x - 68, zone.y - 16, 136, 58, 16);

    const icon = this.add.image(zone.x, zone.y - 30, zone.icon).setDisplaySize(52, 52).setAlpha(0.76);
    this.tweens.add({ targets: icon, y: icon.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.text(zone.x, zone.y + 66, zone.label, {
      fontSize: '22px',
      color: '#37474F',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private createItems() {
    const { width, height } = this.scale;
    const levelItems = Phaser.Utils.Array.Shuffle([...LEVELS[this.levelIndex].items]);
    const columns = levelItems.length <= 9 ? 4 : 5;
    const rows = Math.ceil(levelItems.length / columns);
    const areaW = width - 190;
    const startX = width / 2 - areaW / 2;
    const startY = 126;
    const cellW = areaW / columns;
    const cellH = (height - 300) / rows;

    levelItems.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * cellW + cellW / 2 + Phaser.Math.Between(-18, 18);
      const y = startY + row * cellH + cellH / 2 + Phaser.Math.Between(-12, 12);

      const plate = this.add.graphics().setPosition(x, y);
      plate.fillStyle(0xffffff, 0.68);
      plate.fillCircle(0, 8, 48);
      plate.lineStyle(2, 0xffffff, 0.82);
      plate.strokeCircle(0, 8, 48);

      const sprite = this.add.image(x, y, item.key).setDisplaySize(78, 78);
      sprite.setInteractive({ useHandCursor: true, draggable: true });
      sprite.setData('category', item.category);
      sprite.setData('name', item.name);
      sprite.setData('originalX', x);
      sprite.setData('originalY', y);
      sprite.setData('plate', plate);

      this.items.push({ ...item, sprite, plate, originalX: x, originalY: y, placed: false });
      sprite.setScale(0);
      plate.setScale(0);
      this.tweens.add({ targets: [sprite, plate], scale: 1, duration: 260, delay: index * 50, ease: 'Back.easeOut' });
    });
  }

  private registerDragHandlers() {
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      this.audio.playDrag();
      obj.setDepth(20);
      this.movePlate(obj, obj.x, obj.y, 1.12);
      this.tweens.add({ targets: obj, scale: 1.12, duration: 100 });
    });

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
      obj.setPosition(dragX, dragY);
      this.movePlate(obj, dragX, dragY, 1.12);
      this.highlightTargetZone(obj);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      this.clearHighlights();
      this.tryDrop(obj);
    });
  }

  private tryDrop(obj: Phaser.GameObjects.Image) {
    const category = obj.getData('category') as CategoryId;
    const droppedZone = this.zones.find(zone => Phaser.Math.Distance.Between(obj.x, obj.y, zone.x, zone.y) < 96);

    if (droppedZone?.id === category) {
      const item = this.items.find(candidate => candidate.sprite === obj);
      if (item) item.placed = true;
      obj.disableInteractive();
      obj.setDepth(8);
      this.audio.playSuccess();
      const plate = obj.getData('plate') as Phaser.GameObjects.Graphics;
      plate.destroy();

      this.tweens.add({
        targets: obj,
        x: droppedZone.x + Phaser.Math.Between(-34, 34),
        y: droppedZone.y + Phaser.Math.Between(-28, -4),
        displayWidth: 50,
        displayHeight: 50,
        scale: 1,
        duration: 220,
        ease: 'Back.easeOut',
      });

      this.placedCount++;
      showStarBurst(this, obj.x, obj.y);
      showFloatingToast(this, `${obj.getData('name')} 回到${droppedZone.label}`, droppedZone.color);
      this.updateStatus();

      if (this.placedCount >= LEVELS[this.levelIndex].items.length) {
        this.time.delayedCall(650, () => this.finishLevel());
      }
      return;
    }

    this.wrongDrops++;
    this.audio.playWrong();
    showFloatingToast(this, droppedZone ? '这个家不对' : '拖到动物家里', 0xFFB300);
    this.cameras.main.shake(170, 0.0022);
    this.returnToStart(obj);
    this.updateStatus();
  }

  private returnToStart(obj: Phaser.GameObjects.Image) {
    const originalX = obj.getData('originalX') as number;
    const originalY = obj.getData('originalY') as number;
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
  }

  private highlightTargetZone(obj: Phaser.GameObjects.Image) {
    this.clearHighlights();
    const category = obj.getData('category') as CategoryId;
    const targetZone = this.zones.find(zone => zone.id === category);
    if (!targetZone) return;
    const dist = Phaser.Math.Distance.Between(obj.x, obj.y, targetZone.x, targetZone.y);
    if (dist > 154) return;

    const ring = this.add.graphics().setName('sort-highlight').setDepth(6);
    ring.lineStyle(6, targetZone.color, 0.62);
    ring.strokeRoundedRect(targetZone.x - 90, targetZone.y - 78, 180, 148, 24);
    ring.lineStyle(2, 0xffffff, 0.8);
    ring.strokeRoundedRect(targetZone.x - 100, targetZone.y - 88, 200, 168, 28);
  }

  private clearHighlights() {
    this.children.getAll('name', 'sort-highlight').forEach(child => child.destroy());
  }

  private showHint() {
    const next = this.items.find(item => !item.placed);
    if (!next) return;
    const zone = this.zones.find(candidate => candidate.id === next.category);
    if (!zone) return;
    this.hintsUsed++;
    this.audio.playTap();
    showFloatingToast(this, `${next.name} 属于${zone.label}`, zone.color);

    const guide = this.add.graphics().setDepth(18);
    guide.lineStyle(5, zone.color, 0.85);
    guide.strokeCircle(next.sprite.x, next.sprite.y, 54);
    guide.strokeRoundedRect(zone.x - 90, zone.y - 78, 180, 148, 24);
    guide.lineStyle(3, zone.color, 0.42);
    guide.lineBetween(next.sprite.x, next.sprite.y, zone.x, zone.y);
    this.tweens.add({
      targets: guide,
      alpha: 0,
      scale: 1.1,
      duration: 1100,
      ease: 'Sine.easeOut',
      onComplete: () => guide.destroy(),
    });
    this.updateStatus();
  }

  private movePlate(obj: Phaser.GameObjects.Image, x: number, y: number, scale: number) {
    const plate = obj.getData('plate') as Phaser.GameObjects.Graphics | undefined;
    if (!plate?.active) return;
    plate.setPosition(x, y);
    plate.setScale(scale);
  }

  private finishLevel() {
    if (this.levelIndex < LEVELS.length - 1) {
      showFloatingToast(this, '下一站动物家园', 0x8BC34A);
      this.time.delayedCall(720, () => {
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

  private updateStatus() {
    const total = LEVELS[this.levelIndex].items.length;
    this.statusText?.setText(`完成 ${this.placedCount}/${total}  错 ${this.wrongDrops}  提示 ${this.hintsUsed}`);
  }

  private showComplete() {
    const { width, height } = this.scale;
    const stars = this.wrongDrops <= 2 && this.hintsUsed <= 1 ? 3 : this.wrongDrops <= 6 && this.hintsUsed <= 4 ? 2 : 1;
    recordGameComplete(this, 'SortingGame', stars, '动物全部回家');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.42).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -145, 440, 290, 28);
    bg.lineStyle(4, 0x8BC34A, 0.68);
    bg.strokeRoundedRect(-220, -145, 440, 290, 28);

    const title = this.add.text(0, -92, '动物家园整理好啦', {
      fontSize: '33px',
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

    const againBtn = this.add.text(0, 92, '再分一次', {
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
      this.scene.restart({ levelIndex: 0, wrongDrops: 0, hintsUsed: 0 });
    });
    panel.add(againBtn);
    panel.setScale(0.86).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }
}
