import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';

interface Difference {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  found: boolean;
}

interface RoundDef {
  title: string;
  accent: number;
  prompt: string;
  total: number;
}

const ROUNDS: RoundDef[] = [
  { title: '阳光公园', accent: 0xFF7043, prompt: '找找公园里哪里变了', total: 4 },
  { title: '海底旅行', accent: 0x00ACC1, prompt: '看看海底朋友有什么不同', total: 5 },
  { title: '玩具房间', accent: 0x7E57C2, prompt: '观察房间里的小变化', total: 6 },
];

export class FindDiffGame extends Phaser.Scene {
  private differences: Difference[] = [];
  private foundCount = 0;
  private wrongTaps = 0;
  private hintsUsed = 0;
  private roundIndex = 0;
  private totalDiffs = 0;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  constructor() {
    super({ key: 'FindDiffGame' });
  }

  init(data?: { roundIndex?: number; wrongTaps?: number; hintsUsed?: number }) {
    this.roundIndex = data?.roundIndex ?? 0;
    this.wrongTaps = data?.wrongTaps ?? 0;
    this.hintsUsed = data?.hintsUsed ?? 0;
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);

    const { width, height } = this.scale;
    this.differences = [];
    this.foundCount = 0;
    this.totalDiffs = ROUNDS[this.roundIndex].total;

    this.drawBackground(width, height);

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '找不同探险', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'FindDiffGame');

    this.add.text(width / 2, 70, `${this.roundIndex + 1}/${ROUNDS.length}  ${ROUNDS[this.roundIndex].title} · ${ROUNDS[this.roundIndex].prompt}`, {
      fontSize: '20px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.statusText = this.add.text(width - 24, 32, '', {
      fontSize: '20px',
      color: '#455A64',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#ffffffdd',
      padding: { x: 12, y: 7 },
    }).setOrigin(1, 0.5);

    this.hintText = this.add.text(width - 24, 70, '提示', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFB300',
      padding: { x: 16, y: 8 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    this.hintText.on('pointerdown', () => this.showHint());

    this.createScenes();
    this.updateStatus();
  }

  private drawBackground(width: number, height: number) {
    const round = ROUNDS[this.roundIndex];
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFFF3E0, 0xE0F7FA, 0xF3E5F5, 0xE8F5E9);
    bg.fillRect(0, 0, width, height);

    bg.fillStyle(round.accent, 0.08);
    for (let i = 0; i < 16; i++) {
      bg.fillCircle(Phaser.Math.Between(70, width - 70), Phaser.Math.Between(110, height - 80), Phaser.Math.Between(18, 46));
    }
  }

  private createScenes() {
    const { width, height } = this.scale;
    const sceneW = width / 2 - 44;
    const sceneH = height - 150;
    const leftX = 22;
    const rightX = width / 2 + 22;
    const sceneY = 98;
    const round = ROUNDS[this.roundIndex];

    const frame = this.add.graphics();
    frame.lineStyle(4, round.accent, 0.78);
    frame.fillStyle(0xffffff, 0.88);
    frame.fillRoundedRect(leftX - 6, sceneY - 6, sceneW + 12, sceneH + 12, 24);
    frame.fillRoundedRect(rightX - 6, sceneY - 6, sceneW + 12, sceneH + 12, 24);
    frame.strokeRoundedRect(leftX - 6, sceneY - 6, sceneW + 12, sceneH + 12, 24);
    frame.strokeRoundedRect(rightX - 6, sceneY - 6, sceneW + 12, sceneH + 12, 24);

    this.add.text(leftX + sceneW / 2, sceneY + sceneH + 22, '原图', {
      fontSize: '17px',
      color: '#546E7A',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(rightX + sceneW / 2, sceneY + sceneH + 22, '点右边找不同', {
      fontSize: '17px',
      color: this.toHex(round.accent),
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.drawRound(leftX, sceneY, sceneW, sceneH, false);
    this.drawRound(rightX, sceneY, sceneW, sceneH, true);

    const hitArea = this.add.rectangle(rightX + sceneW / 2, sceneY + sceneH / 2, sceneW, sceneH, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.checkDifference(pointer.x, pointer.y);
    });
  }

  private drawRound(x: number, y: number, w: number, h: number, withDifferences: boolean) {
    if (this.roundIndex === 0) this.drawParkScene(x, y, w, h, withDifferences);
    else if (this.roundIndex === 1) this.drawOceanScene(x, y, w, h, withDifferences);
    else this.drawRoomScene(x, y, w, h, withDifferences);
  }

  private drawParkScene(x: number, y: number, w: number, h: number, diff: boolean) {
    const g = this.add.graphics();
    this.drawSkyGround(g, x, y, w, h, 0x87CEEB, 0x66BB6A);

    const sunX = x + w * 0.82;
    const sunY = y + h * 0.16;
    const sunColor = diff ? 0xFF7043 : 0xFFE082;
    g.fillStyle(sunColor);
    g.fillCircle(sunX, sunY, 28);
    if (diff) this.addDiff('park-sun', '太阳颜色', sunX, sunY, 40);

    g.fillStyle(0xffffff, 0.9);
    this.drawCloud(g, x + w * 0.24, y + h * 0.14, 1);
    this.drawCloud(g, x + w * 0.52, y + h * 0.2, 0.82);
    if (diff) {
      this.drawCloud(g, x + w * 0.39, y + h * 0.31, 0.72);
      this.addDiff('park-cloud', '多了一朵云', x + w * 0.39, y + h * 0.31, 34);
    }

    const groundY = y + h * 0.68;
    this.drawTree(g, x + w * 0.2, groundY);
    this.drawHouse(g, x + w * 0.58, groundY - 82, diff);

    const flowers = [
      { x: x + w * 0.14, y: groundY + 32, c: 0xEC407A },
      { x: x + w * 0.35, y: groundY + 28, c: 0xFFCA28 },
      { x: x + w * 0.76, y: groundY + 30, c: 0xAB47BC },
    ];
    flowers.forEach((flower, index) => {
      if (diff && index === 1) {
        this.addDiff('park-flower', '少了一朵花', flower.x, flower.y - 8, 28);
        return;
      }
      this.drawFlower(g, flower.x, flower.y, flower.c);
    });
  }

  private drawOceanScene(x: number, y: number, w: number, h: number, diff: boolean) {
    const g = this.add.graphics();
    g.fillStyle(0x4DD0E1);
    g.fillRoundedRect(x, y, w, h, 18);
    g.fillStyle(0x00838F, 0.52);
    g.fillRect(x, y + h * 0.64, w, h * 0.36);

    for (let i = 0; i < 5; i++) {
      const bx = x + 70 + i * 78;
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(bx, y + 78 + (i % 2) * 52, 9);
      g.strokeCircle(bx, y + 78 + (i % 2) * 52, 9);
    }

    const fish = [
      { key: 'fish_blue', x: x + w * 0.25, y: y + h * 0.28, s: 56 },
      { key: diff ? 'fish_orange' : 'fish_green', x: x + w * 0.56, y: y + h * 0.38, s: 62 },
      { key: 'fish_brown', x: x + w * 0.78, y: y + h * 0.22, s: 48 },
    ];
    fish.forEach(item => this.add.image(item.x, item.y, item.key).setDisplaySize(item.s, item.s).setDepth(2));
    if (diff) this.addDiff('ocean-fish-color', '小鱼颜色', x + w * 0.56, y + h * 0.38, 36);

    if (!diff) {
      this.add.image(x + w * 0.4, y + h * 0.52, 'fish_grey').setDisplaySize(50, 50).setDepth(2);
    } else {
      this.addDiff('ocean-missing-fish', '少了一条鱼', x + w * 0.4, y + h * 0.52, 34);
    }

    this.drawSeaweed(g, x + w * 0.16, y + h - 24, diff ? 0.78 : 1);
    if (diff) this.addDiff('ocean-short-seaweed', '海草变矮', x + w * 0.16, y + h - 76, 32);
    this.drawSeaweed(g, x + w * 0.72, y + h - 24, 0.9);

    g.fillStyle(diff ? 0xFFCA28 : 0xAB47BC);
    g.fillCircle(x + w * 0.84, y + h * 0.72, 24);
    g.fillStyle(0xffffff, 0.28);
    g.fillCircle(x + w * 0.84 - 7, y + h * 0.72 - 8, 5);
    if (diff) this.addDiff('ocean-shell-color', '贝壳颜色', x + w * 0.84, y + h * 0.72, 32);

    if (diff) {
      g.fillStyle(0xffffff, 0.45);
      g.fillCircle(x + w * 0.63, y + h * 0.2, 13);
      this.addDiff('ocean-extra-bubble', '多了大泡泡', x + w * 0.63, y + h * 0.2, 26);
    }
  }

  private drawRoomScene(x: number, y: number, w: number, h: number, diff: boolean) {
    const g = this.add.graphics();
    g.fillStyle(0xFFE0B2);
    g.fillRoundedRect(x, y, w, h, 18);
    g.fillStyle(0xD7CCC8);
    g.fillRect(x, y + h * 0.7, w, h * 0.3);

    g.fillStyle(diff ? 0x42A5F5 : 0xFF8A65);
    g.fillRoundedRect(x + w * 0.1, y + h * 0.12, 78, 62, 10);
    g.fillStyle(0xffffff, 0.48);
    g.fillRect(x + w * 0.1 + 10, y + h * 0.12 + 12, 58, 6);
    if (diff) this.addDiff('room-picture-color', '画框颜色', x + w * 0.1 + 39, y + h * 0.12 + 31, 38);

    this.add.image(x + w * 0.28, y + h * 0.58, diff ? 'animal_cat' : 'animal_dog').setDisplaySize(76, 76).setDepth(2);
    if (diff) this.addDiff('room-pet', '小动物换了', x + w * 0.28, y + h * 0.58, 42);

    this.drawToyShelf(g, x + w * 0.58, y + h * 0.34, diff);
    this.drawBall(g, x + w * 0.76, y + h * 0.72, diff ? 0x66BB6A : 0xEF5350);
    if (diff) this.addDiff('room-ball-color', '皮球颜色', x + w * 0.76, y + h * 0.72, 34);

    this.add.image(x + w * 0.52, y + h * 0.72, 'vehicle_blue').setDisplaySize(76, 76).setDepth(2);
    if (diff) {
      this.add.image(x + w * 0.87, y + h * 0.5, 'star_gold').setDisplaySize(36, 36).setDepth(2);
      this.addDiff('room-extra-star', '多了星星', x + w * 0.87, y + h * 0.5, 28);
    }

    const blockX = x + w * 0.4;
    const blockY = y + h * 0.74;
    if (!diff) {
      this.drawBlock(g, blockX, blockY, 0x29B6F6);
    } else {
      this.addDiff('room-missing-block', '积木不见了', blockX, blockY, 28);
    }
  }

  private checkDifference(px: number, py: number) {
    for (const diff of this.differences) {
      if (diff.found) continue;

      const dist = Phaser.Math.Distance.Between(px, py, diff.x, diff.y);
      if (dist <= diff.radius) {
        diff.found = true;
        this.foundCount++;
        this.audio.playSuccess();
        this.showFoundCircle(diff);
        this.updateStatus();

        if (this.foundCount >= this.totalDiffs) {
          this.time.delayedCall(650, () => this.finishRound());
        }
        return;
      }
    }

    this.wrongTaps++;
    this.audio.playWrong();
    this.showWrongTap(px, py);
    this.updateStatus();
  }

  private finishRound() {
    if (this.roundIndex < ROUNDS.length - 1) {
      showFloatingToast(this, '进入下一关', ROUNDS[this.roundIndex].accent);
      this.time.delayedCall(650, () => {
        this.scene.restart({
          roundIndex: this.roundIndex + 1,
          wrongTaps: this.wrongTaps,
          hintsUsed: this.hintsUsed,
        });
      });
      return;
    }

    this.showComplete();
  }

  private showFoundCircle(diff: Difference) {
    const circle = this.add.graphics().setDepth(12);
    circle.lineStyle(5, ROUNDS[this.roundIndex].accent);
    circle.strokeCircle(diff.x, diff.y, diff.radius);
    circle.setAlpha(0);
    this.tweens.add({ targets: circle, alpha: 1, duration: 240, ease: 'Back.easeOut' });

    const star = this.add.image(diff.x, diff.y, 'star_gold').setDepth(13).setScale(0);
    this.tweens.add({
      targets: star,
      scale: 1.45,
      alpha: 0,
      angle: 160,
      duration: 620,
      ease: 'Cubic.easeOut',
      onComplete: () => star.destroy(),
    });

    const text = this.add.text(diff.x, diff.y - 32, diff.label, {
      fontSize: '18px',
      color: this.toHex(ROUNDS[this.roundIndex].accent),
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#ffffffdd',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(13);
    this.tweens.add({ targets: text, y: diff.y - 62, alpha: 0, duration: 850, onComplete: () => text.destroy() });
  }

  private showWrongTap(x: number, y: number) {
    const mark = this.add.text(x, y, 'x', {
      fontSize: '30px',
      color: '#78909C',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(13);
    this.tweens.add({
      targets: mark,
      alpha: 0,
      scale: 1.6,
      duration: 420,
      onComplete: () => mark.destroy(),
    });
  }

  private showHint() {
    const remaining = this.differences.find(diff => !diff.found);
    if (!remaining) return;
    this.hintsUsed++;
    this.audio.playTap();
    showFloatingToast(this, '看发光的区域', 0xFFB300);

    const halo = this.add.graphics().setDepth(11);
    halo.lineStyle(4, 0xFFB300, 0.8);
    halo.strokeCircle(remaining.x, remaining.y, remaining.radius + 10);
    halo.setScale(0.7);
    this.tweens.add({
      targets: halo,
      scale: 1.2,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => halo.destroy(),
    });
    this.updateStatus();
  }

  private updateStatus() {
    this.statusText.setText(`找到 ${this.foundCount}/${this.totalDiffs}  错 ${this.wrongTaps}  提示 ${this.hintsUsed}`);
    this.hintText.setAlpha(this.foundCount >= this.totalDiffs ? 0.45 : 1);
  }

  private showComplete() {
    const { width, height } = this.scale;
    const stars = this.wrongTaps <= 2 && this.hintsUsed === 0 ? 3 : this.wrongTaps <= 6 && this.hintsUsed <= 2 ? 2 : 1;
    recordGameComplete(this, 'FindDiffGame', stars, '观察得真仔细');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.42).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -145, 440, 290, 28);
    bg.lineStyle(4, 0xFF7043, 0.65);
    bg.strokeRoundedRect(-220, -145, 440, 290, 28);

    const title = this.add.text(0, -92, '全部关卡完成', {
      fontSize: '34px',
      color: '#FF7043',
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

    const replayBtn = this.add.text(0, 92, '再挑战一次', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FF7043',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    replayBtn.on('pointerdown', () => {
      overlay.destroy();
      this.scene.restart({ roundIndex: 0, wrongTaps: 0, hintsUsed: 0 });
    });
    panel.add(replayBtn);
    panel.setScale(0.86).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }

  private addDiff(id: string, label: string, x: number, y: number, radius: number) {
    this.differences.push({ id, label, x, y, radius, found: false });
  }

  private drawSkyGround(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, sky: number, ground: number) {
    g.fillStyle(sky);
    g.fillRoundedRect(x, y, w, h, 18);
    g.fillStyle(ground);
    g.fillRect(x, y + h * 0.68, w, h * 0.32);
    g.fillRoundedRect(x, y + h - 22, w, 22, { tl: 0, tr: 0, bl: 18, br: 18 });
  }

  private drawCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number) {
    g.fillCircle(x, y, 18 * scale);
    g.fillCircle(x + 22 * scale, y - 8 * scale, 14 * scale);
    g.fillCircle(x + 42 * scale, y, 16 * scale);
    g.fillCircle(x + 14 * scale, y + 8 * scale, 12 * scale);
  }

  private drawTree(g: Phaser.GameObjects.Graphics, x: number, groundY: number) {
    g.fillStyle(0x795548);
    g.fillRoundedRect(x - 9, groundY - 72, 18, 72, 6);
    g.fillStyle(0x2E7D32);
    g.fillCircle(x, groundY - 88, 36);
    g.fillCircle(x - 22, groundY - 66, 27);
    g.fillCircle(x + 22, groundY - 66, 27);
  }

  private drawHouse(g: Phaser.GameObjects.Graphics, x: number, y: number, diff: boolean) {
    const houseW = 92;
    const houseH = 82;
    g.fillStyle(0xFFCC80);
    g.fillRoundedRect(x, y, houseW, houseH, 4);
    g.fillStyle(0xD32F2F);
    g.fillTriangle(x - 12, y, x + houseW / 2, y - 48, x + houseW + 12, y);
    g.fillStyle(diff ? 0x7E57C2 : 0x5D4037);
    g.fillRoundedRect(x + houseW / 2 - 12, y + houseH - 42, 24, 42, 5);
    if (diff) this.addDiff('park-door', '门变色了', x + houseW / 2, y + houseH - 21, 30);
    g.fillStyle(0x81D4FA);
    g.fillRect(x + 13, y + 17, 22, 22);
    g.fillRect(x + houseW - 35, y + 17, 22, 22);
  }

  private drawFlower(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number) {
    g.fillStyle(0x388E3C);
    g.fillRect(x - 2, y - 18, 4, 18);
    g.fillStyle(color);
    g.fillCircle(x, y - 21, 8);
    g.fillCircle(x - 7, y - 14, 6);
    g.fillCircle(x + 7, y - 14, 6);
    g.fillStyle(0xFFF176);
    g.fillCircle(x, y - 16, 4);
  }

  private drawSeaweed(g: Phaser.GameObjects.Graphics, x: number, baseY: number, scale: number) {
    g.fillStyle(0x2E7D32, 0.7);
    for (let i = 0; i < 4; i++) {
      g.fillEllipse(x + Math.sin(i) * 12 * scale, baseY - i * 25 * scale, 12 * scale, 32 * scale);
    }
  }

  private drawToyShelf(g: Phaser.GameObjects.Graphics, x: number, y: number, diff: boolean) {
    g.fillStyle(0x8D6E63);
    g.fillRoundedRect(x - 58, y - 18, 116, 36, 8);
    g.fillStyle(0xFFE082);
    g.fillCircle(x - 30, y - 4, 13);
    g.fillStyle(diff ? 0xEF5350 : 0x42A5F5);
    g.fillRoundedRect(x + 12, y - 16, 28, 28, 6);
    if (diff) this.addDiff('room-block-color', '架上积木变色', x + 26, y - 2, 28);
  }

  private drawBall(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number) {
    g.fillStyle(color);
    g.fillCircle(x, y, 25);
    g.lineStyle(3, 0xffffff, 0.62);
    g.lineBetween(x - 18, y - 12, x + 18, y + 12);
    g.lineBetween(x - 18, y + 12, x + 18, y - 12);
  }

  private drawBlock(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number) {
    g.fillStyle(color);
    g.fillRoundedRect(x - 18, y - 18, 36, 36, 7);
    g.fillStyle(0xffffff, 0.36);
    g.fillRect(x - 10, y - 10, 20, 6);
  }

  private toHex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
