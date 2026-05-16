import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';
import { showStarBurst } from '../../components/Particles';

interface DotPoint {
  x: number;
  y: number;
  index: number;
}

interface ShapePattern {
  name: string;
  prompt: string;
  dots: { x: number; y: number }[];
  fillColor: number;
  accent: number;
}

export class ConnectDotsGame extends Phaser.Scene {
  private dots: Phaser.GameObjects.Container[] = [];
  private lines!: Phaser.GameObjects.Graphics;
  private connectedPoints: DotPoint[] = [];
  private patterns: ShapePattern[] = [];
  private patternIndex = 0;
  private currentDot = 0;
  private wrongTaps = 0;
  private hintsUsed = 0;
  private isComplete = false;
  private statusText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  constructor() {
    super({ key: 'ConnectDotsGame' });
  }

  init(data?: { patternIndex?: number; wrongTaps?: number; hintsUsed?: number }) {
    this.patternIndex = data?.patternIndex ?? 0;
    this.wrongTaps = data?.wrongTaps ?? 0;
    this.hintsUsed = data?.hintsUsed ?? 0;
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    this.currentDot = 0;
    this.dots = [];
    this.connectedPoints = [];
    this.isComplete = false;

    const { width } = this.scale;
    this.patterns = this.getPatterns();
    const pattern = this.patterns[this.patternIndex];
    this.drawBackground(pattern);

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '数字连线画室', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'ConnectDotsGame');

    this.add.text(width / 2, 70, `${this.patternIndex + 1}/${this.patterns.length}  ${pattern.name} · ${pattern.prompt}`, {
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

    this.lines = this.add.graphics();
    this.createDots(pattern);
    this.updateStatus();
  }

  private drawBackground(pattern: ShapePattern) {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFFF8E1, 0xE1F5FE, 0xFCE4EC, 0xC8E6C9);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0xffffff, 0.34);
    bg.fillRoundedRect(72, 106, width - 144, height - 154, 34);
    bg.lineStyle(4, 0xffffff, 0.42);
    bg.strokeRoundedRect(72, 106, width - 144, height - 154, 34);

    for (let i = 0; i < 6; i++) {
      const cloud = this.add.image(74 + i * 210, 42 + (i % 2) * 22, 'cloud_deco').setAlpha(0.26).setScale(0.58 + i * 0.04);
      this.tweens.add({ targets: cloud, x: cloud.x + 18, duration: 2100 + i * 220, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    for (let i = 0; i < 7; i++) {
      const flower = this.add.image(66 + i * 182, height - 34, `flower_${i % 6}`).setScale(0.64).setAlpha(0.58);
      this.tweens.add({ targets: flower, y: flower.y - 4, duration: 900 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const ribbon = this.add.graphics();
    ribbon.fillStyle(pattern.accent, 0.12);
    ribbon.fillRoundedRect(width / 2 - 172, height - 86, 344, 42, 18);
  }

  private getPatterns(): ShapePattern[] {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2 + 18;
    const r = Math.min(width, height) * 0.25;
    return [
      {
        name: '星星',
        prompt: '按数字绕一圈',
        fillColor: 0xFFD54F,
        accent: 0xFFAB00,
        dots: Array.from({ length: 10 }, (_v, i) => {
          const angle = (i * 36 - 90) * (Math.PI / 180);
          const radius = i % 2 === 0 ? r : r * 0.44;
          return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
        }),
      },
      {
        name: '小房子',
        prompt: '先画墙，再画屋顶',
        fillColor: 0xFF8A65,
        accent: 0xFF7043,
        dots: [
          { x: cx - r * 0.78, y: cy + r * 0.72 },
          { x: cx + r * 0.78, y: cy + r * 0.72 },
          { x: cx + r * 0.78, y: cy - r * 0.08 },
          { x: cx + r * 0.92, y: cy - r * 0.08 },
          { x: cx, y: cy - r * 0.88 },
          { x: cx - r * 0.92, y: cy - r * 0.08 },
          { x: cx - r * 0.78, y: cy - r * 0.08 },
          { x: cx - r * 0.78, y: cy + r * 0.72 },
          { x: cx - r * 0.18, y: cy + r * 0.72 },
          { x: cx - r * 0.18, y: cy + r * 0.3 },
          { x: cx + r * 0.18, y: cy + r * 0.3 },
          { x: cx + r * 0.18, y: cy + r * 0.72 },
        ],
      },
      {
        name: '小鱼',
        prompt: '连出身体和尾巴',
        fillColor: 0x4FC3F7,
        accent: 0x03A9F4,
        dots: [
          { x: cx + r * 0.88, y: cy },
          { x: cx + r * 0.48, y: cy - r * 0.46 },
          { x: cx - r * 0.08, y: cy - r * 0.58 },
          { x: cx - r * 0.54, y: cy - r * 0.28 },
          { x: cx - r * 0.94, y: cy - r * 0.58 },
          { x: cx - r * 0.62, y: cy },
          { x: cx - r * 0.94, y: cy + r * 0.58 },
          { x: cx - r * 0.54, y: cy + r * 0.28 },
          { x: cx - r * 0.08, y: cy + r * 0.58 },
          { x: cx + r * 0.48, y: cy + r * 0.46 },
        ],
      },
    ];
  }

  private createDots(pattern: ShapePattern) {
    pattern.dots.forEach((pos, index) => {
      const container = this.add.container(pos.x, pos.y);
      const circle = this.add.graphics();
      this.drawDot(circle, index === 0 ? 0x4CAF50 : 0x78909C, false);
      const label = this.add.text(0, 0, String(index + 1), {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add([circle, label]);
      container.setSize(54, 54);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => this.onDotTapped(index, container));
      container.setScale(0);
      this.tweens.add({ targets: container, scale: 1, duration: 260, delay: index * 55, ease: 'Back.easeOut' });
      this.dots.push(container);
    });
    this.pulseCurrentDot();
  }

  private drawDot(circle: Phaser.GameObjects.Graphics, color: number, done: boolean) {
    circle.clear();
    circle.fillStyle(color, 1);
    circle.fillCircle(0, 0, done ? 22 : 24);
    circle.lineStyle(4, 0xffffff, 0.9);
    circle.strokeCircle(0, 0, done ? 22 : 24);
  }

  private onDotTapped(index: number, container: Phaser.GameObjects.Container) {
    if (this.isComplete) return;
    if (index !== this.currentDot) {
      this.handleWrongTap(container, index);
      return;
    }

    this.audio.playTap();
    const pattern = this.patterns[this.patternIndex];
    const pos = pattern.dots[index];
    this.connectedPoints.push({ x: pos.x, y: pos.y, index });
    this.tweens.killTweensOf(container);
    container.setScale(1);

    const circle = container.list[0] as Phaser.GameObjects.Graphics;
    this.drawDot(circle, pattern.accent, true);
    this.tweens.add({ targets: container, scale: 1.22, duration: 100, yoyo: true, ease: 'Quad.easeOut' });
    showStarBurst(this, pos.x, pos.y);

    if (this.connectedPoints.length > 1) {
      this.drawLineBetween(this.connectedPoints[this.connectedPoints.length - 2], this.connectedPoints[this.connectedPoints.length - 1], pattern.accent);
    }

    this.currentDot++;
    this.updateStatus();

    if (this.currentDot < this.dots.length) {
      this.pulseCurrentDot();
      return;
    }

    this.isComplete = true;
    this.drawLineBetween(this.connectedPoints[this.connectedPoints.length - 1], this.connectedPoints[0], pattern.accent);
    this.time.delayedCall(420, () => this.onShapeComplete());
  }

  private handleWrongTap(container: Phaser.GameObjects.Container, index: number) {
    const pattern = this.patterns[this.patternIndex];
    this.wrongTaps++;
    this.audio.playWrong();
    this.cameras.main.shake(140, 0.0018);
    showFloatingToast(this, `先找数字 ${this.currentDot + 1}`, 0xFFB300);
    this.tweens.add({
      targets: container,
      x: container.x + 8,
      duration: 45,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        container.x = pattern.dots[index].x;
      },
    });
    this.updateStatus();
  }

  private pulseCurrentDot() {
    const dot = this.dots[this.currentDot];
    if (!dot) return;
    this.tweens.killTweensOf(dot);
    this.tweens.add({ targets: dot, scale: 1.16, duration: 560, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private drawLineBetween(from: DotPoint, to: DotPoint, color: number) {
    const steps = 10;
    let step = 0;
    this.time.addEvent({
      delay: 18,
      repeat: steps - 1,
      callback: () => {
        step++;
        const prev = (step - 1) / steps;
        const next = step / steps;
        this.lines.lineStyle(6, color, 0.95);
        this.lines.beginPath();
        this.lines.moveTo(from.x + (to.x - from.x) * prev, from.y + (to.y - from.y) * prev);
        this.lines.lineTo(from.x + (to.x - from.x) * next, from.y + (to.y - from.y) * next);
        this.lines.strokePath();
      },
    });
  }

  private showHint() {
    if (this.isComplete) return;
    this.hintsUsed++;
    const pattern = this.patterns[this.patternIndex];
    const dot = this.dots[this.currentDot];
    this.audio.playTap();
    showFloatingToast(this, `下一个是 ${this.currentDot + 1}`, 0x26A69A);
    if (dot) {
      const ring = this.add.graphics().setDepth(30);
      ring.lineStyle(6, 0x26A69A, 0.85);
      ring.strokeCircle(dot.x, dot.y, 34);
      ring.lineStyle(2, 0xffffff, 0.8);
      ring.strokeCircle(dot.x, dot.y, 43);
      this.tweens.add({ targets: ring, alpha: 0, scale: 1.12, duration: 900, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    }
    this.updateStatus();
  }

  private onShapeComplete() {
    const pattern = this.patterns[this.patternIndex];
    const fill = this.add.graphics().setAlpha(0).setDepth(0);
    fill.fillStyle(pattern.fillColor, 0.42);
    fill.beginPath();
    fill.moveTo(pattern.dots[0].x, pattern.dots[0].y);
    for (let i = 1; i < pattern.dots.length; i++) {
      fill.lineTo(pattern.dots[i].x, pattern.dots[i].y);
    }
    fill.closePath();
    fill.fillPath();
    this.tweens.add({ targets: fill, alpha: 1, duration: 500, ease: 'Quad.easeIn' });
    this.time.delayedCall(650, () => this.finishPattern());
  }

  private finishPattern() {
    const pattern = this.patterns[this.patternIndex];
    this.audio.playSuccess();
    showFloatingToast(this, `${pattern.name} 画好了`, pattern.accent);

    if (this.patternIndex < this.patterns.length - 1) {
      this.time.delayedCall(780, () => {
        this.scene.restart({
          patternIndex: this.patternIndex + 1,
          wrongTaps: this.wrongTaps,
          hintsUsed: this.hintsUsed,
        });
      });
      return;
    }

    this.showComplete();
  }

  private updateStatus() {
    const pattern = this.patterns[this.patternIndex];
    this.statusText?.setText(`点 ${Math.min(this.currentDot + 1, pattern.dots.length)}/${pattern.dots.length}  错 ${this.wrongTaps}  提示 ${this.hintsUsed}`);
  }

  private showComplete() {
    const { width, height } = this.scale;
    const stars = this.wrongTaps <= 2 && this.hintsUsed <= 1 ? 3 : this.wrongTaps <= 6 && this.hintsUsed <= 4 ? 2 : 1;
    recordGameComplete(this, 'ConnectDotsGame', stars, '连线画全部完成');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.42).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -145, 440, 290, 28);
    bg.lineStyle(4, 0xFFAB00, 0.68);
    bg.strokeRoundedRect(-220, -145, 440, 290, 28);

    const title = this.add.text(0, -92, '连线画册完成', {
      fontSize: '34px',
      color: '#EF6C00',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const detail = this.add.text(0, -50, `错误 ${this.wrongTaps} 次 · 提示 ${this.hintsUsed} 次`, {
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

    const againBtn = this.add.text(0, 92, '再画一本', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#EF6C00',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    againBtn.on('pointerdown', () => {
      this.audio.playTap();
      overlay.destroy();
      this.scene.restart({ patternIndex: 0, wrongTaps: 0, hintsUsed: 0 });
    });
    panel.add(againBtn);
    panel.setScale(0.86).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }
}
