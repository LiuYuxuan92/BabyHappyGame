import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';
import { showStarBurst } from '../../components/Particles';

interface RhythmPad {
  id: string;
  icon: string;
  label: string;
  color: number;
  frequency: number;
  x: number;
  y: number;
  radius: number;
  base: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  iconText: Phaser.GameObjects.Text;
  labelText: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Arc;
}

interface RhythmStage {
  title: string;
  venue: string;
  mascotKey: string;
  accent: number;
  tempo: number;
  pattern: number[];
  goal: string;
}

const PAD_DATA = [
  { id: 'drum', icon: '🥁', label: '小鼓', color: 0xFF7043, frequency: 196 },
  { id: 'bell', icon: '🔔', label: '铃声', color: 0x42A5F5, frequency: 392 },
  { id: 'clap', icon: '👏', label: '拍手', color: 0x66BB6A, frequency: 294 },
  { id: 'star', icon: '✨', label: '亮片', color: 0xFFCA28, frequency: 523 },
];

const STAGES: RhythmStage[] = [
  {
    title: '森林开场',
    venue: '小熊乐队',
    mascotKey: 'animal_bear',
    accent: 0x66BB6A,
    tempo: 610,
    pattern: [0, 1, 0, 2],
    goal: '完成 4 拍开场节奏',
  },
  {
    title: '海边合奏',
    venue: '企鹅指挥',
    mascotKey: 'animal_penguin',
    accent: 0x03A9F4,
    tempo: 540,
    pattern: [1, 2, 3, 1, 0],
    goal: '跟上 5 拍海浪节奏',
  },
  {
    title: '星光舞台',
    venue: '猫头鹰压轴',
    mascotKey: 'animal_owl',
    accent: 0xAB47BC,
    tempo: 470,
    pattern: [3, 0, 2, 1, 3, 2],
    goal: '演奏 6 拍压轴节奏',
  },
];

export class RhythmGame extends Phaser.Scene {
  private pads: RhythmPad[] = [];
  private progressDots: Phaser.GameObjects.Graphics[] = [];
  private beatCards: Phaser.GameObjects.Container[] = [];
  private stageIndex = 0;
  private inputIndex = 0;
  private mistakes = 0;
  private stageMistakes = 0;
  private replays = 0;
  private combo = 0;
  private isLocked = true;
  private isShowingPattern = false;
  private audio!: AudioManager;
  private audioContext!: AudioContext;
  private stageText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private meterText!: Phaser.GameObjects.Text;
  private mascot!: Phaser.GameObjects.Image;
  private conductor!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'RhythmGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.pads = [];
    this.progressDots = [];
    this.beatCards = [];
    this.stageIndex = 0;
    this.inputIndex = 0;
    this.mistakes = 0;
    this.stageMistakes = 0;
    this.replays = 0;
    this.combo = 0;
    this.isLocked = true;
    this.isShowingPattern = false;
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    this.audioContext = (this.sound as Phaser.Sound.WebAudioSoundManager).context;

    this.drawBackground();

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    this.add.text(width / 2, 30, '🥁 节奏大师', {
      fontSize: '30px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    enhanceGameScene(this, 'RhythmGame');

    this.stageText = this.add.text(92, 74, '', {
      fontSize: '20px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.meterText = this.add.text(width - 24, 74, '', {
      fontSize: '18px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this.goalText = this.add.text(width / 2, 108, '', {
      fontSize: '18px',
      color: '#546E7A',
      fontFamily: 'sans-serif',
      align: 'center',
    }).setOrigin(0.5);

    this.createStageDisplay();
    this.createBeatCards();
    this.createPads();
    this.createControls();

    this.time.delayedCall(650, () => this.startStage(true));
  }

  private drawBackground() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFFF8E1, 0xE3F2FD, 0xFCE4EC, 0xE8F5E9);
    bg.fillRect(0, 0, width, height);

    for (let i = 0; i < 10; i++) {
      const note = this.add.text(
        Phaser.Math.Between(28, width - 28),
        Phaser.Math.Between(95, height - 95),
        ['♪', '♫', '♬', '♩'][i % 4],
        { fontSize: `${Phaser.Math.Between(18, 30)}px`, color: '#90A4AE', fontFamily: 'sans-serif' }
      ).setAlpha(0.18);

      this.tweens.add({
        targets: note,
        y: note.y - Phaser.Math.Between(10, 28),
        alpha: 0.08,
        duration: Phaser.Math.Between(2200, 4200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 160,
      });
    }
  }

  private createStageDisplay() {
    const { width, height } = this.scale;
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.72);
    panel.fillRoundedRect(width / 2 - 190, 134, 380, 134, 24);
    panel.lineStyle(3, 0xffffff, 0.85);
    panel.strokeRoundedRect(width / 2 - 190, 134, 380, 134, 24);

    this.conductor = this.add.text(width / 2 - 84, 160, '准备排练', {
      fontSize: '22px',
      color: '#37474F',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.statusText = this.add.text(width / 2 - 84, 198, '先听节奏，再跟着演奏', {
      fontSize: '20px',
      color: '#5C6BC0',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.mascot = this.add.image(width / 2 - 128, 198, 'animal_bear');
    this.mascot.setDisplaySize(78, 78);

    const stage = this.add.ellipse(width / 2, height - 38, width * 0.72, 34, 0x000000, 0.08);
    stage.setDepth(0);
  }

  private createBeatCards() {
    const { width } = this.scale;
    const startX = width / 2 - 148;
    for (let i = 0; i < 6; i++) {
      const card = this.add.container(startX + i * 59, 294);
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 0.86);
      bg.fillRoundedRect(-21, -21, 42, 42, 13);
      bg.lineStyle(2, 0xCFD8DC, 1);
      bg.strokeRoundedRect(-21, -21, 42, 42, 13);
      const label = this.add.text(0, 0, `${i + 1}`, {
        fontSize: '18px',
        color: '#78909C',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      card.add([bg, label]);
      this.beatCards.push(card);
    }
  }

  private createPads() {
    const { width, height } = this.scale;
    const radius = Math.min(58, Math.max(46, width / 12));
    const gap = Math.max(18, width * 0.035);
    const totalWidth = PAD_DATA.length * radius * 2 + (PAD_DATA.length - 1) * gap;
    const startX = (width - totalWidth) / 2 + radius;
    const y = height * 0.61;

    PAD_DATA.forEach((data, index) => {
      const x = startX + index * (radius * 2 + gap);
      const glow = this.add.graphics();
      const base = this.add.graphics();
      const iconText = this.add.text(x, y - 8, data.icon, {
        fontSize: `${Math.round(radius * 0.66)}px`,
        fontFamily: 'sans-serif',
      }).setOrigin(0.5);
      const labelText = this.add.text(x, y + radius + 24, data.label, {
        fontSize: '17px',
        color: '#455A64',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const hitArea = this.add.circle(x, y, radius + 10, 0xffffff, 0).setInteractive({ useHandCursor: true });

      const pad: RhythmPad = {
        ...data,
        x,
        y,
        radius,
        base,
        glow,
        iconText,
        labelText,
        hitArea,
      };
      this.pads.push(pad);
      this.drawPad(pad, false);

      hitArea.on('pointerdown', () => this.handlePadInput(index));
    });
  }

  private createControls() {
    const { width, height } = this.scale;
    const replay = this.createButton(width / 2 - 92, height - 72, '再听一次', 0x5C6BC0);
    replay.on('pointerdown', () => {
      if (this.isShowingPattern) return;
      this.audio.playTap();
      this.replays++;
      this.updateMeter();
      showFloatingToast(this, '仔细听这一段', 0x5C6BC0);
      this.playPattern();
    });

    const guide = this.createButton(width / 2 + 92, height - 72, '提示拍点', 0x26A69A);
    guide.on('pointerdown', () => {
      if (this.isShowingPattern || this.inputIndex >= this.currentStage.pattern.length) return;
      const nextPad = this.currentStage.pattern[this.inputIndex];
      this.audio.playTap();
      this.replays++;
      this.updateMeter();
      showFloatingToast(this, `下一拍是 ${PAD_DATA[nextPad].label}`, 0x26A69A);
      this.pulsePad(nextPad, 520, false);
    });
  }

  private createButton(x: number, y: number, text: string, color: number) {
    const button = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.95);
    bg.fillRoundedRect(-72, -23, 144, 46, 16);
    bg.lineStyle(2, 0xffffff, 0.72);
    bg.strokeRoundedRect(-72, -23, 144, 46, 16);
    const label = this.add.text(0, 0, text, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    button.add([bg, label]);
    button.setSize(144, 46);
    button.setInteractive(new Phaser.Geom.Rectangle(-72, -23, 144, 46), Phaser.Geom.Rectangle.Contains);
    button.on('pointerover', () => button.setScale(1.04));
    button.on('pointerout', () => button.setScale(1));
    return button;
  }

  private get currentStage() {
    return STAGES[this.stageIndex];
  }

  private startStage(autoPlay: boolean) {
    const stage = this.currentStage;
    this.inputIndex = 0;
    this.stageMistakes = 0;
    this.combo = 0;
    this.isLocked = true;

    this.stageText.setText(`第 ${this.stageIndex + 1}/${STAGES.length} 关 · ${stage.title}`);
    this.goalText.setText(stage.goal);
    this.conductor.setText(stage.venue);
    this.statusText.setText('听指挥演奏');
    this.statusText.setColor(`#${stage.accent.toString(16).padStart(6, '0')}`);
    this.mascot.setTexture(stage.mascotKey);
    this.mascot.setDisplaySize(78, 78);
    this.updateMeter();
    this.updateBeatCards();
    this.refreshProgressDots();

    this.tweens.add({
      targets: this.mascot,
      scaleX: 1.14,
      scaleY: 1.14,
      duration: 300,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    if (autoPlay) {
      this.time.delayedCall(500, () => this.playPattern());
    }
  }

  private refreshProgressDots() {
    this.progressDots.forEach(dot => dot.destroy());
    this.progressDots = [];

    const { width } = this.scale;
    const count = this.currentStage.pattern.length;
    const startX = width / 2 - (count - 1) * 18;
    for (let i = 0; i < count; i++) {
      const dot = this.add.graphics();
      dot.setPosition(startX + i * 36, 244);
      this.drawProgressDot(dot, 0xB0BEC5, 0.72);
      this.progressDots.push(dot);
    }
  }

  private drawProgressDot(dot: Phaser.GameObjects.Graphics, color: number, alpha: number) {
    dot.clear();
    dot.fillStyle(color, alpha);
    dot.fillCircle(0, 0, 9);
    dot.lineStyle(2, 0xffffff, 0.95);
    dot.strokeCircle(0, 0, 9);
  }

  private updateBeatCards() {
    const pattern = this.currentStage.pattern;
    this.beatCards.forEach((card, index) => {
      card.setVisible(index < pattern.length);
      if (index >= pattern.length) return;
      const bg = card.list[0] as Phaser.GameObjects.Graphics;
      const label = card.list[1] as Phaser.GameObjects.Text;
      const pad = PAD_DATA[pattern[index]];
      bg.clear();
      bg.fillStyle(0xffffff, 0.9);
      bg.fillRoundedRect(-21, -21, 42, 42, 13);
      bg.lineStyle(3, pad.color, 0.8);
      bg.strokeRoundedRect(-21, -21, 42, 42, 13);
      label.setText(pad.icon);
      label.setFontSize(21);
      label.setColor('#263238');
      card.setScale(1);
    });
  }

  private updateMeter() {
    this.meterText.setText(`失误 ${this.mistakes} · 重听 ${this.replays}`);
  }

  private drawPad(pad: RhythmPad, active: boolean) {
    pad.base.clear();
    pad.glow.clear();

    if (active) {
      pad.glow.fillStyle(pad.color, 0.28);
      pad.glow.fillCircle(pad.x, pad.y, pad.radius + 18);
    }

    pad.base.fillStyle(0x000000, active ? 0.14 : 0.1);
    pad.base.fillCircle(pad.x + 4, pad.y + 7, pad.radius);
    pad.base.fillStyle(pad.color, active ? 1 : 0.78);
    pad.base.fillCircle(pad.x, pad.y, pad.radius);
    pad.base.fillStyle(0xffffff, active ? 0.42 : 0.24);
    pad.base.fillCircle(pad.x - pad.radius * 0.22, pad.y - pad.radius * 0.24, pad.radius * 0.38);
    pad.base.lineStyle(active ? 5 : 3, active ? 0xffffff : this.darken(pad.color), active ? 1 : 0.82);
    pad.base.strokeCircle(pad.x, pad.y, pad.radius);
  }

  private darken(color: number) {
    const r = Math.max(0, ((color >> 16) & 0xFF) - 46);
    const g = Math.max(0, ((color >> 8) & 0xFF) - 46);
    const b = Math.max(0, (color & 0xFF) - 46);
    return (r << 16) | (g << 8) | b;
  }

  private playPattern() {
    if (this.isShowingPattern) return;

    const stage = this.currentStage;
    this.isShowingPattern = true;
    this.isLocked = true;
    this.inputIndex = 0;
    this.combo = 0;
    this.statusText.setText('听一遍完整节奏');
    this.statusText.setColor(`#${stage.accent.toString(16).padStart(6, '0')}`);
    this.refreshProgressDots();

    stage.pattern.forEach((padIndex, beat) => {
      this.time.delayedCall(beat * stage.tempo + 260, () => {
        this.pulsePad(padIndex, Math.min(360, stage.tempo - 80), true);
        this.pulseBeatCard(beat);
        this.bounceMascot();
      });
    });

    this.time.delayedCall(stage.pattern.length * stage.tempo + 560, () => {
      this.isShowingPattern = false;
      this.isLocked = false;
      this.statusText.setText('轮到你演奏');
      this.statusText.setColor('#2E7D32');
      showFloatingToast(this, '按刚才的顺序演奏', stage.accent);
    });
  }

  private pulseBeatCard(index: number) {
    const card = this.beatCards[index];
    if (!card) return;
    this.tweens.add({
      targets: card,
      scale: 1.18,
      duration: 130,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private bounceMascot() {
    this.tweens.add({
      targets: this.mascot,
      y: this.mascot.y - 12,
      angle: Phaser.Math.Between(-5, 5),
      duration: 120,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.mascot.setAngle(0);
      },
    });
  }

  private pulsePad(index: number, duration: number, fromPattern: boolean) {
    const pad = this.pads[index];
    this.drawPad(pad, true);
    this.playTone(pad.frequency, duration / 1000, fromPattern ? 'triangle' : 'sine');

    this.tweens.add({
      targets: [pad.iconText, pad.labelText],
      scale: fromPattern ? 1.18 : 1.1,
      duration: 110,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(duration, () => this.drawPad(pad, false));
  }

  private playTone(frequency: number, duration: number, wave: OscillatorType) {
    if (this.audio.muted || !this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration + 0.02);
  }

  private handlePadInput(index: number) {
    if (this.isLocked || this.isShowingPattern) return;

    const stage = this.currentStage;
    const expected = stage.pattern[this.inputIndex];
    this.pulsePad(index, 260, false);

    if (index !== expected) {
      this.handleMistake(expected);
      return;
    }

    this.audio.playTap();
    this.combo++;
    this.drawProgressDot(this.progressDots[this.inputIndex], stage.accent, 1);
    this.pulseBeatCard(this.inputIndex);
    showStarBurst(this, this.pads[index].x, this.pads[index].y);
    this.inputIndex++;

    if (this.combo >= 3) {
      this.statusText.setText(`连对 ${this.combo} 拍`);
      this.statusText.setColor('#2E7D32');
    } else {
      this.statusText.setText('节奏正确');
      this.statusText.setColor('#2E7D32');
    }

    if (this.inputIndex >= stage.pattern.length) {
      this.finishStage();
    }
  }

  private handleMistake(expected: number) {
    this.isLocked = true;
    this.combo = 0;
    this.mistakes++;
    this.stageMistakes++;
    this.updateMeter();
    this.audio.playWrong();
    this.statusText.setText('差一点，听这一拍');
    this.statusText.setColor('#E53935');
    this.drawProgressDot(this.progressDots[this.inputIndex], 0xEF5350, 0.95);
    showFloatingToast(this, `${PAD_DATA[expected].label} 才是这一拍`, 0xFFB300);

    this.cameras.main.shake(130, 0.003);
    this.time.delayedCall(520, () => this.pulsePad(expected, 520, false));
    this.time.delayedCall(1120, () => {
      this.drawProgressDot(this.progressDots[this.inputIndex], 0xB0BEC5, 0.72);
      this.statusText.setText('继续这一拍');
      this.statusText.setColor('#5C6BC0');
      this.isLocked = false;
    });
  }

  private finishStage() {
    const stage = this.currentStage;
    this.isLocked = true;
    this.audio.playSuccess();
    this.statusText.setText(this.stageMistakes === 0 ? '完美合奏!' : '这一段完成!');
    this.statusText.setColor('#2E7D32');
    showFloatingToast(this, this.stageMistakes === 0 ? '这一关满拍完成' : '进入下一段排练', stage.accent);

    this.pads.forEach((pad, index) => {
      this.time.delayedCall(index * 80, () => showStarBurst(this, pad.x, pad.y));
    });

    if (this.stageIndex < STAGES.length - 1) {
      this.time.delayedCall(1350, () => {
        this.stageIndex++;
        this.startStage(true);
      });
      return;
    }

    this.time.delayedCall(1200, () => this.showFinale());
  }

  private showFinale() {
    const { width, height } = this.scale;
    const stars = Math.max(1, 3 - (this.mistakes > 2 ? 1 : 0) - (this.replays > 2 ? 1 : 0));
    recordGameComplete(this, 'RhythmGame', stars, '节奏演奏全部完成');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.38)
      .setInteractive()
      .setDepth(9000);
    const panel = this.add.container(width / 2, height / 2).setDepth(9001);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.98);
    bg.fillRoundedRect(-202, -142, 404, 284, 26);
    bg.lineStyle(4, 0xAB47BC, 0.72);
    bg.strokeRoundedRect(-202, -142, 404, 284, 26);

    const title = this.add.text(0, -92, '演出完成', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -50, `失误 ${this.mistakes} · 重听 ${this.replays}`, {
      fontSize: '19px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    const starImages: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(-58 + i * 58, 0, i < stars ? 'star_gold' : 'star_empty').setScale(0);
      starImages.push(star);
      this.tweens.add({
        targets: star,
        scale: 0.92,
        duration: 280,
        delay: i * 150,
        ease: 'Back.easeOut',
      });
    }

    const replay = this.createButton(-84, 82, '再演一次', 0x5C6BC0);
    const menu = this.createButton(84, 82, '回到首页', 0x26A69A);
    replay.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
      this.scene.restart();
    });
    menu.on('pointerdown', () => this.scene.start('MenuScene'));

    panel.add([bg, title, subtitle, ...starImages, replay, menu]);
    panel.setScale(0.88).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }
}
