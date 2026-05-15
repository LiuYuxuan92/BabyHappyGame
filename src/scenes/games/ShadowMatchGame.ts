import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';
import { showStarBurst } from '../../components/Particles';

interface ShadowItemDef {
  key: string;
  name: string;
}

interface ShadowLevel {
  title: string;
  prompt: string;
  bg: 'garden' | 'ocean' | 'city';
  items: ShadowItemDef[];
}

interface ShadowPair extends ShadowItemDef {
  shadow: Phaser.GameObjects.Image;
  colored: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Graphics;
  matched: boolean;
  targetX: number;
  targetY: number;
}

const LEVELS: ShadowLevel[] = [
  {
    title: '动物脚印',
    prompt: '观察耳朵和身体轮廓',
    bg: 'garden',
    items: [
      { key: 'animal_bear', name: '小熊' },
      { key: 'animal_cat', name: '小猫' },
      { key: 'animal_elephant', name: '大象' },
      { key: 'animal_giraffe', name: '长颈鹿' },
    ],
  },
  {
    title: '海底泡泡',
    prompt: '看尾巴和身体长短',
    bg: 'ocean',
    items: [
      { key: 'fish_blue', name: '蓝鱼' },
      { key: 'fish_green', name: '绿鱼' },
      { key: 'fish_orange', name: '橙鱼' },
      { key: 'fish_brown', name: '棕鱼' },
      { key: 'animal_penguin', name: '企鹅' },
    ],
  },
  {
    title: '交通小镇',
    prompt: '车身颜色变了，形状没变',
    bg: 'city',
    items: [
      { key: 'vehicle_blue', name: '蓝色车' },
      { key: 'vehicle_green', name: '绿色车' },
      { key: 'vehicle_red', name: '红色车' },
      { key: 'vehicle_orange', name: '橙色车' },
      { key: 'vehicle_yellow', name: '黄色车' },
      { key: 'vehicle_grey', name: '灰色车' },
    ],
  },
];

export class ShadowMatchGame extends Phaser.Scene {
  private pairs: ShadowPair[] = [];
  private matchedCount = 0;
  private wrongDrops = 0;
  private hintsUsed = 0;
  private levelIndex = 0;
  private statusText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  constructor() {
    super({ key: 'ShadowMatchGame' });
  }

  init(data?: { levelIndex?: number; wrongDrops?: number; hintsUsed?: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
    this.wrongDrops = data?.wrongDrops ?? 0;
    this.hintsUsed = data?.hintsUsed ?? 0;
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    this.pairs = [];
    this.matchedCount = 0;

    const { width } = this.scale;
    const level = LEVELS[this.levelIndex];
    this.drawBackground(level.bg);

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '影子侦探', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'ShadowMatchGame');

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

    this.createLevel();
    this.registerDragEvents();
    this.updateStatus();
  }

  private drawBackground(kind: ShadowLevel['bg']) {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    const palettes = {
      garden: [0xE8F5E9, 0xE3F2FD, 0xFFFDE7, 0xC8E6C9],
      ocean: [0xD9F7FF, 0xB2EBF2, 0xE0F7FA, 0x80DEEA],
      city: [0xFFF8E1, 0xE1F5FE, 0xF3E5F5, 0xCFD8DC],
    };
    const colors = palettes[kind];
    bg.fillGradientStyle(colors[0], colors[1], colors[2], colors[3]);
    bg.fillRect(0, 0, width, height);

    bg.fillStyle(0xffffff, 0.34);
    bg.fillRoundedRect(78, 104, width - 156, height - 150, 34);
    bg.lineStyle(4, 0xffffff, 0.42);
    bg.strokeRoundedRect(78, 104, width - 156, height - 150, 34);

    if (kind === 'ocean') {
      for (let i = 0; i < 16; i++) {
        const bubble = this.add.circle(80 + i * 52, 130 + (i % 5) * 70, 7 + (i % 3) * 4, 0xffffff, 0.24);
        this.tweens.add({ targets: bubble, y: bubble.y - 22, alpha: 0.08, duration: 1200 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    } else if (kind === 'city') {
      bg.fillStyle(0x90A4AE, 0.22);
      for (let x = 70; x < width; x += 92) {
        bg.fillRoundedRect(x, height - 118, 54, 70 + (x % 3) * 14, 8);
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const flower = this.add.image(66 + i * 170, height - 34, `flower_${i % 6}`).setScale(0.7).setAlpha(0.58);
        this.tweens.add({ targets: flower, y: flower.y - 5, duration: 900 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  private createLevel() {
    const { width, height } = this.scale;
    const level = LEVELS[this.levelIndex];
    const items = level.items;
    const shadowItems = Phaser.Utils.Array.Shuffle([...items]);
    const objectItems = Phaser.Utils.Array.Shuffle([...items]);
    const top = 126;
    const availableHeight = height - 178;
    const gap = availableHeight / items.length;
    const shadowX = width * 0.74;
    const itemX = width * 0.26;

    const divider = this.add.graphics();
    divider.lineStyle(3, 0x90A4AE, 0.32);
    divider.lineBetween(width / 2, 106, width / 2, height - 34);
    divider.fillStyle(0xffffff, 0.54);
    divider.fillRoundedRect(width / 2 - 68, height / 2 - 26, 136, 52, 18);
    this.add.text(width / 2, height / 2, '拖到影子', {
      fontSize: '19px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(itemX, 104, '彩色伙伴', {
      fontSize: '20px',
      color: '#455A64',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(shadowX, 104, '影子卡片', {
      fontSize: '20px',
      color: '#455A64',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    shadowItems.forEach((item, index) => {
      const y = top + gap * index + gap / 2;
      const ring = this.add.graphics();
      this.drawShadowRing(ring, shadowX, y, 0x607D8B, 0.36);

      const shadow = this.add.image(shadowX, y, item.key).setDisplaySize(72, 72).setTint(0x1F2933).setAlpha(0.76);
      const objectIndex = objectItems.findIndex(object => object.key === item.key);
      const objectY = top + gap * objectIndex + gap / 2;
      const colored = this.add.image(itemX + Phaser.Math.Between(-36, 36), objectY, item.key).setDisplaySize(76, 76);
      colored.setInteractive({ useHandCursor: true, draggable: true });
      colored.setData('key', item.key);
      colored.setData('name', item.name);
      colored.setData('startX', colored.x);
      colored.setData('startY', colored.y);

      this.pairs.push({
        ...item,
        shadow,
        colored,
        ring,
        matched: false,
        targetX: shadowX,
        targetY: y,
      });

      colored.setScale(0);
      this.tweens.add({ targets: colored, scale: 1, duration: 300, delay: index * 70, ease: 'Back.easeOut' });
    });
  }

  private registerDragEvents() {
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      this.audio.playDrag();
      obj.setDepth(20);
      this.tweens.add({ targets: obj, scale: 1.13, duration: 100 });
    });

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
      obj.setPosition(dragX, dragY);
      this.highlightTarget(obj);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      this.clearHighlights();
      this.tryDrop(obj);
    });
  }

  private tryDrop(obj: Phaser.GameObjects.Image) {
    const draggedKey = obj.getData('key') as string;
    const pair = this.pairs.find(item => item.key === draggedKey && !item.matched);
    if (!pair) return;

    const dist = Phaser.Math.Distance.Between(obj.x, obj.y, pair.targetX, pair.targetY);
    if (dist < 74) {
      pair.matched = true;
      obj.disableInteractive();
      obj.setDepth(8);
      this.audio.playSuccess();

      this.tweens.add({
        targets: obj,
        x: pair.targetX,
        y: pair.targetY,
        scale: 1,
        displayWidth: 72,
        displayHeight: 72,
        duration: 220,
        ease: 'Back.easeOut',
      });
      this.tweens.add({ targets: pair.shadow, alpha: 0, duration: 260 });
      pair.ring.clear();
      this.drawShadowRing(pair.ring, pair.targetX, pair.targetY, 0x26A69A, 0.66);

      this.matchedCount++;
      this.updateStatus();
      showStarBurst(this, pair.targetX, pair.targetY);
      showFloatingToast(this, `${pair.name} 找到影子`, 0x26A69A);

      if (this.matchedCount >= LEVELS[this.levelIndex].items.length) {
        this.time.delayedCall(650, () => this.finishLevel());
      }
      return;
    }

    this.wrongDrops++;
    this.audio.playWrong();
    showFloatingToast(this, '再观察一下轮廓', 0xFFB300);
    this.cameras.main.shake(160, 0.002);
    this.returnToStart(obj);
    this.updateStatus();
  }

  private returnToStart(obj: Phaser.GameObjects.Image) {
    const startX = obj.getData('startX') as number;
    const startY = obj.getData('startY') as number;
    this.tweens.add({
      targets: obj,
      x: startX,
      y: startY,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private highlightTarget(obj: Phaser.GameObjects.Image) {
    this.clearHighlights();
    const draggedKey = obj.getData('key') as string;
    const pair = this.pairs.find(item => item.key === draggedKey && !item.matched);
    if (!pair) return;
    const dist = Phaser.Math.Distance.Between(obj.x, obj.y, pair.targetX, pair.targetY);
    if (dist > 150) return;

    const glow = this.add.graphics().setName('shadow-highlight').setDepth(6);
    glow.lineStyle(6, 0x26A69A, 0.68);
    glow.strokeCircle(pair.targetX, pair.targetY, 54);
    glow.lineStyle(2, 0xffffff, 0.8);
    glow.strokeCircle(pair.targetX, pair.targetY, 64);
  }

  private clearHighlights() {
    this.children.getAll('name', 'shadow-highlight').forEach(child => child.destroy());
  }

  private showHint() {
    const pair = this.pairs.find(item => !item.matched);
    if (!pair) return;
    this.hintsUsed++;
    this.audio.playTap();
    showFloatingToast(this, `${pair.name} 的影子在发光`, 0x26A69A);

    const line = this.add.graphics().setDepth(18);
    line.lineStyle(5, 0x26A69A, 0.85);
    line.strokeCircle(pair.colored.x, pair.colored.y, 50);
    line.strokeCircle(pair.targetX, pair.targetY, 56);
    line.lineStyle(3, 0x26A69A, 0.5);
    line.lineBetween(pair.colored.x, pair.colored.y, pair.targetX, pair.targetY);
    this.tweens.add({
      targets: line,
      alpha: 0,
      scale: 1.08,
      duration: 1100,
      ease: 'Sine.easeOut',
      onComplete: () => line.destroy(),
    });
    this.updateStatus();
  }

  private drawShadowRing(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha: number) {
    g.fillStyle(0xffffff, 0.72);
    g.fillCircle(x, y, 54);
    g.lineStyle(4, color, alpha);
    g.strokeCircle(x, y, 54);
    g.fillStyle(color, 0.08);
    g.fillCircle(x, y, 42);
  }

  private finishLevel() {
    if (this.levelIndex < LEVELS.length - 1) {
      showFloatingToast(this, '进入下一组影子', 0x26A69A);
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
    this.statusText?.setText(`配对 ${this.matchedCount}/${total}  错 ${this.wrongDrops}  提示 ${this.hintsUsed}`);
  }

  private showComplete() {
    const { width, height } = this.scale;
    const stars = this.wrongDrops <= 2 && this.hintsUsed <= 1 ? 3 : this.wrongDrops <= 6 && this.hintsUsed <= 4 ? 2 : 1;
    recordGameComplete(this, 'ShadowMatchGame', stars, '影子全部配对完成');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.42).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -145, 440, 290, 28);
    bg.lineStyle(4, 0x26A69A, 0.65);
    bg.strokeRoundedRect(-220, -145, 440, 290, 28);

    const title = this.add.text(0, -92, '影子侦探通关', {
      fontSize: '34px',
      color: '#00897B',
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

    const againBtn = this.add.text(0, 92, '再当一次侦探', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#00897B',
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
