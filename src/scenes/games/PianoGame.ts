import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';
import { showStarBurst } from '../../components/Particles';

interface PianoKey {
  note: string;
  solfege: string;
  frequency: number;
  color: number;
  graphics: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Song {
  name: string;
  emoji: string;
  sequence: number[];
  durations: number[];
}

type GameMode = 'free' | 'listen' | 'follow' | 'record';

export class PianoGame extends Phaser.Scene {
  private keys: PianoKey[] = [];
  private isPlayingSong = false;
  private audioContext!: AudioContext;
  private mode: GameMode = 'free';
  private currentSongIndex = 0;
  private followIndex = 0;
  private followSequence: number[] = [];
  private recording: { key: number; time: number }[] = [];
  private recordStartTime = 0;
  private isRecording = false;
  private audio!: AudioManager;
  private modeText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private recitalGoalText!: Phaser.GameObjects.Text;
  private progressDots: Phaser.GameObjects.Graphics[] = [];
  private followHintHalo?: Phaser.GameObjects.Graphics;
  private followHintArrow?: Phaser.GameObjects.Text;
  private followHintBadge?: Phaser.GameObjects.Container;
  private followHintTweens: Phaser.Tweens.Tween[] = [];
  private animalSprites: Phaser.GameObjects.Image[] = [];
  private completedSongs = new Set<number>();
  private followInputReady = false;
  private followMistakes = 0;
  private totalFollowMistakes = 0;
  private finishedRecital = false;
  private waveType: OscillatorType = 'sine';

  private readonly noteData = [
    { note: 'C4', solfege: 'do', frequency: 261.63, color: 0xFF4444 },
    { note: 'D4', solfege: 're', frequency: 293.66, color: 0xFF8C00 },
    { note: 'E4', solfege: 'mi', frequency: 329.63, color: 0xFFCC00 },
    { note: 'F4', solfege: 'fa', frequency: 349.23, color: 0x44BB44 },
    { note: 'G4', solfege: 'sol', frequency: 392.00, color: 0x00CCCC },
    { note: 'A4', solfege: 'la', frequency: 440.00, color: 0x4488FF },
    { note: 'B4', solfege: 'si', frequency: 493.88, color: 0x8844CC },
    { note: 'C5', solfege: 'do', frequency: 523.25, color: 0xFF66AA },
  ];

  private readonly songs: Song[] = [
    {
      name: '小星星',
      emoji: '⭐',
      sequence: [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0],
      durations: [400, 400, 400, 400, 400, 400, 800, 400, 400, 400, 400, 400, 400, 800],
    },
    {
      name: '两只老虎',
      emoji: '🐯',
      sequence: [0, 1, 2, 0, 0, 1, 2, 0, 2, 3, 4, 2, 3, 4],
      durations: [400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 800, 400, 400, 800],
    },
    {
      name: '生日快乐',
      emoji: '🎂',
      sequence: [0, 0, 1, 0, 3, 2, 0, 0, 1, 0, 4, 3],
      durations: [300, 300, 600, 600, 600, 900, 300, 300, 600, 600, 600, 900],
    },
    {
      name: '小蜜蜂',
      emoji: '🐝',
      sequence: [4, 2, 2, 3, 1, 1, 0, 1, 2, 3, 4, 4, 4],
      durations: [400, 400, 800, 400, 400, 800, 400, 400, 400, 400, 400, 400, 800],
    },
    {
      name: '玛丽有只小羊羔',
      emoji: '🐑',
      sequence: [2, 1, 0, 1, 2, 2, 2, 1, 1, 1, 2, 4, 4],
      durations: [400, 400, 400, 400, 400, 400, 800, 400, 400, 800, 400, 400, 800],
    },
  ];

  private readonly waveTypes: { type: OscillatorType; name: string; emoji: string }[] = [
    { type: 'sine', name: '柔和', emoji: '🎵' },
    { type: 'triangle', name: '清脆', emoji: '🔔' },
    { type: 'square', name: '电子', emoji: '🎮' },
    { type: 'sawtooth', name: '明亮', emoji: '🎺' },
  ];

  constructor() {
    super({ key: 'PianoGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.keys = [];
    this.isPlayingSong = false;
    this.mode = 'free';
    this.followIndex = 0;
    this.recording = [];
    this.isRecording = false;
    this.progressDots = [];
    this.followHintTweens = [];
    this.animalSprites = [];
    this.completedSongs = new Set<number>();
    this.followInputReady = false;
    this.followMistakes = 0;
    this.totalFollowMistakes = 0;
    this.finishedRecital = false;
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    this.audioContext = (this.sound as Phaser.Sound.WebAudioSoundManager).context;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFCE4EC, 0xFCE4EC, 0xF3E5F5, 0xF3E5F5);
    bg.fillRect(0, 0, width, height);

    // Decorative music notes in background
    this.addBackgroundNotes();

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 30, '🎹 小钢琴', {
      fontSize: '28px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    enhanceGameScene(this, 'PianoGame');

    // Mode indicator
    this.modeText = this.add.text(width / 2, 55, '🎵 自由弹奏', {
      fontSize: '16px',
      color: '#7C4DFF',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Feedback text
    this.feedbackText = this.add.text(width / 2, 80, '', {
      fontSize: '20px',
      color: '#4CAF50',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.recitalGoalText = this.add.text(width / 2, height - 94, '小小演奏会 0/3', {
      fontSize: '17px',
      color: '#6A1B9A',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 16, y: 7 },
    }).setOrigin(0.5);

    // Dancing animals area
    this.createDancingAnimals();

    // Piano keys
    this.createPianoKeys();

    // Bottom control buttons
    this.createControlButtons();
  }

  private addBackgroundNotes() {
    const { width, height } = this.scale;
    const notes = ['♪', '♫', '♩', '♬'];
    for (let i = 0; i < 8; i++) {
      const note = this.add.text(
        Phaser.Math.Between(30, width - 30),
        Phaser.Math.Between(60, height - 60),
        notes[i % notes.length],
        { fontSize: '20px', color: '#E1BEE7' }
      ).setAlpha(0.3);

      this.tweens.add({
        targets: note,
        y: note.y - Phaser.Math.Between(10, 25),
        alpha: 0.15,
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 300,
      });
    }
  }

  private createDancingAnimals() {
    const { width } = this.scale;
    const animalKeys = ['animal_bear', 'animal_cat', 'animal_penguin', 'animal_owl'];
    const startX = width / 2 - (animalKeys.length - 1) * 70 / 2;

    animalKeys.forEach((key, i) => {
      const animal = this.add.image(startX + i * 70, 120, key);
      animal.setDisplaySize(45, 45);
      animal.setAlpha(0.7);
      this.animalSprites.push(animal);
    });
  }

  private bounceAnimal(keyIndex: number) {
    const animal = this.animalSprites[keyIndex % this.animalSprites.length];
    this.tweens.add({
      targets: animal,
      y: animal.y - 15,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private createPianoKeys() {
    const { width, height } = this.scale;

    const keyCount = 8;
    const gap = 6;
    const totalGap = gap * (keyCount - 1);
    const maxKeyWidth = 85;
    const keyWidth = Math.min(maxKeyWidth, (width - 80 - totalGap) / keyCount);
    const keyHeight = height * 0.38;
    const totalWidth = keyCount * keyWidth + totalGap;
    const startX = (width - totalWidth) / 2;
    const startY = height * 0.25;

    this.noteData.forEach((data, i) => {
      const x = startX + i * (keyWidth + gap);
      const y = startY;

      const keyGraphics = this.add.graphics();
      this.drawKey(keyGraphics, x, y, keyWidth, keyHeight, data.color, false);

      const label = this.add.text(x + keyWidth / 2, y + keyHeight - 28, data.solfege, {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const hitArea = this.add.rectangle(
        x + keyWidth / 2, y + keyHeight / 2,
        keyWidth, keyHeight, 0xffffff, 0
      ).setInteractive({ useHandCursor: true });

      const pianoKey: PianoKey = {
        note: data.note, solfege: data.solfege, frequency: data.frequency,
        color: data.color, graphics: keyGraphics, label, hitArea,
        x, y, width: keyWidth, height: keyHeight,
      };
      this.keys.push(pianoKey);

      hitArea.on('pointerdown', () => this.onKeyPress(i));
    });
  }

  private onKeyPress(index: number) {
    if (this.isPlayingSong) return;
    if (this.mode === 'follow' && !this.followInputReady) return;

    this.pressKey(index);
    this.bounceAnimal(index);

    if (this.isRecording) {
      this.recording.push({ key: index, time: Date.now() - this.recordStartTime });
    }

    if (this.mode === 'follow') {
      this.checkFollowNote(index);
    }
  }

  private checkFollowNote(index: number) {
    if (index === this.followSequence[this.followIndex]) {
      this.followIndex++;
      this.updateProgressDots();
      this.showFeedback('👍', '#4CAF50');

      if (this.followIndex >= this.followSequence.length) {
        this.clearFollowHint();
        this.followInputReady = false;
        this.time.delayedCall(300, () => this.showFollowComplete());
      } else {
        this.renderFollowHint();
      }
    } else {
      this.followMistakes++;
      this.totalFollowMistakes++;
      this.audio.playWrong();
      this.showFeedback('再试试~', '#FF9800');
      showFloatingToast(this, '黄色箭头指着下一键', 0xFFB300);
      this.highlightCorrectKey();
    }
  }

  private highlightCorrectKey() {
    this.renderFollowHint(true);
  }

  private renderFollowHint(strong = false) {
    if (this.mode !== 'follow' || this.followIndex >= this.followSequence.length) return;

    this.clearFollowHint();
    const correctIndex = this.followSequence[this.followIndex];
    const key = this.keys[correctIndex];
    const note = this.noteData[correctIndex];
    const centerX = key.x + key.width / 2;
    const badgeX = Phaser.Math.Clamp(centerX, 112, this.scale.width - 112);
    const badgeY = Math.max(118, key.y - 58);

    const halo = this.add.graphics().setDepth(80);
    halo.fillStyle(0xFFF59D, strong ? 0.38 : 0.28);
    halo.fillRoundedRect(key.x - 10, key.y - 10, key.width + 20, key.height + 20, 18);
    halo.lineStyle(strong ? 8 : 6, 0xFFD54F, 1);
    halo.strokeRoundedRect(key.x - 10, key.y - 10, key.width + 20, key.height + 20, 18);
    halo.lineStyle(3, 0xffffff, 0.95);
    halo.strokeRoundedRect(key.x - 3, key.y - 3, key.width + 6, key.height + 6, 14);

    const arrow = this.add.text(centerX, key.y - 25, '⬇', {
      fontSize: strong ? '54px' : '46px',
      color: '#FFB300',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(82);

    const badge = this.add.container(badgeX, badgeY).setDepth(83);
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(0xffffff, 0.98);
    badgeBg.fillRoundedRect(-100, -29, 200, 58, 20);
    badgeBg.lineStyle(4, note.color, 0.86);
    badgeBg.strokeRoundedRect(-100, -29, 200, 58, 20);
    const badgeText = this.add.text(0, -5, `下一键 ${note.solfege}`, {
      fontSize: '22px',
      color: '#4A148C',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const subText = this.add.text(0, 17, '按黄色箭头下面的琴键', {
      fontSize: '13px',
      color: '#7B1FA2',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
    badge.add([badgeBg, badgeText, subText]);

    this.followHintHalo = halo;
    this.followHintArrow = arrow;
    this.followHintBadge = badge;

    this.followHintTweens.push(this.tweens.add({
      targets: halo,
      alpha: { from: 0.72, to: 1 },
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));
    this.followHintTweens.push(this.tweens.add({
      targets: arrow,
      y: arrow.y - 12,
      duration: 430,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));
    this.followHintTweens.push(this.tweens.add({
      targets: badge,
      scale: strong ? 1.1 : 1.05,
      duration: 260,
      yoyo: true,
      repeat: strong ? 3 : -1,
      ease: 'Back.easeOut',
    }));
  }

  private clearFollowHint() {
    this.followHintTweens.forEach(tween => tween.stop());
    this.followHintTweens = [];
    this.followHintHalo?.destroy();
    this.followHintArrow?.destroy();
    this.followHintBadge?.destroy();
    this.followHintHalo = undefined;
    this.followHintArrow = undefined;
    this.followHintBadge = undefined;
  }


  private showFeedback(text: string, color: string) {
    this.feedbackText.setText(text);
    this.feedbackText.setColor(color);
    this.feedbackText.setAlpha(1);
    this.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      duration: 1200,
      delay: 300,
    });
  }

  private updateProgressDots() {
    this.progressDots.forEach((dot, i) => {
      if (i < this.followIndex) {
        this.drawProgressDot(dot, i, 'done');
      } else if (i === this.followIndex) {
        this.drawProgressDot(dot, i, 'current');
      } else {
        this.drawProgressDot(dot, i, 'pending');
      }
    });
  }

  private createProgressDots(sequence: number[]) {
    const { width } = this.scale;
    this.progressDots.forEach(d => d.destroy());
    this.progressDots = [];

    const dotGap = Math.min(28, (width - 180) / sequence.length);
    const startX = width / 2 - (sequence.length - 1) * dotGap / 2;

    sequence.forEach((_, i) => {
      const dot = this.add.graphics();
      dot.setPosition(startX + i * dotGap, 104);
      this.drawProgressDot(dot, i, i === 0 ? 'current' : 'pending');
      this.progressDots.push(dot);
    });
  }

  private drawProgressDot(dot: Phaser.GameObjects.Graphics, index: number, state: 'done' | 'current' | 'pending') {
    const noteIndex = this.followSequence[index] ?? 0;
    const color = this.noteData[noteIndex].color;
    dot.clear();
    if (state === 'done') {
      dot.fillStyle(color, 1);
      dot.fillCircle(0, 0, 9);
      dot.lineStyle(2, 0xffffff, 0.95);
      dot.strokeCircle(0, 0, 9);
      return;
    }
    if (state === 'current') {
      dot.fillStyle(0xFFF59D, 1);
      dot.fillCircle(0, 0, 12);
      dot.lineStyle(4, color, 0.95);
      dot.strokeCircle(0, 0, 12);
      return;
    }
    dot.fillStyle(0xffffff, 0.86);
    dot.fillCircle(0, 0, 7);
    dot.lineStyle(2, color, 0.42);
    dot.strokeCircle(0, 0, 7);
  }

  private createControlButtons() {
    const { width, height } = this.scale;
    const btnY = height - 55;
    const buttons = [
      { label: '🎵 歌曲', x: width * 0.12, action: () => this.showSongMenu() },
      { label: '👂 跟弹', x: width * 0.30, action: () => this.startFollowMode() },
      { label: '⏺️ 录音', x: width * 0.48, action: () => this.toggleRecording() },
      { label: '▶️ 回放', x: width * 0.66, action: () => this.playRecording() },
      { label: '🎸 音色', x: width * 0.84, action: () => this.cycleWaveType() },
    ];

    buttons.forEach(btn => {
      const text = this.add.text(btn.x, btnY, btn.label, {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        backgroundColor: '#7C4DFF',
        padding: { x: 12, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      text.on('pointerdown', () => {
        this.tweens.add({
          targets: text,
          scale: 0.9,
          duration: 80,
          yoyo: true,
          onComplete: () => btn.action(),
        });
      });
    });

    // Song name display
    this.add.text(width / 2, height - 20, '点击琴键弹奏 | 选歌曲跟弹学习', {
      fontSize: '13px',
      color: '#999999',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private showSongMenu() {
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
    overlay.setInteractive();

    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.98);
    panel.fillRoundedRect(width / 2 - 180, height / 2 - 160, 360, 320, 20);

    const title = this.add.text(width / 2, height / 2 - 130, '🎵 选择歌曲', {
      fontSize: '24px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const menuItems: Phaser.GameObjects.Text[] = [];

    this.songs.forEach((song, i) => {
      const y = height / 2 - 80 + i * 50;
      const item = this.add.text(width / 2, y, `${song.emoji} ${song.name}`, {
        fontSize: '22px',
        color: '#555555',
        fontFamily: 'sans-serif',
        backgroundColor: '#F3E5F5',
        padding: { x: 40, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      item.on('pointerdown', () => {
        this.currentSongIndex = i;
        this.mode = 'listen';
        this.followInputReady = false;
        this.clearFollowHint();
        destroyMenu();
        this.playSong(i);
      });

      menuItems.push(item);
    });

    const closeBtn = this.add.text(width / 2, height / 2 + 140, '✕ 关闭', {
      fontSize: '18px',
      color: '#999999',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const destroyMenu = () => {
      overlay.destroy();
      panel.destroy();
      title.destroy();
      closeBtn.destroy();
      menuItems.forEach(m => m.destroy());
    };

    closeBtn.on('pointerdown', destroyMenu);
    overlay.on('pointerdown', destroyMenu);
  }

  private startFollowMode() {
    const song = this.songs[this.currentSongIndex];
    this.mode = 'follow';
    this.followIndex = 0;
    this.followInputReady = false;
    this.followMistakes = 0;
    this.followSequence = song.sequence;
    this.clearFollowHint();
    this.modeText.setText(`🎯 跟弹: ${song.emoji} ${song.name}`);
    this.createProgressDots(song.sequence);
    this.showFeedback('听完后跟着弹!', '#7C4DFF');
    showFloatingToast(this, `${song.name} 准备开始`, 0x7C4DFF);

    // Play the song first so kid can hear it
    this.playSong(this.currentSongIndex, () => {
      this.followInputReady = true;
      this.showFeedback('轮到你了!', '#FF6B35');
      this.renderFollowHint();
      showFloatingToast(this, '看黄色箭头，弹下一键', 0xFFD54F);
    });
  }

  private showFollowComplete() {
    const completedSongIndex = this.currentSongIndex;
    const wasNewSong = !this.completedSongs.has(completedSongIndex);
    this.completedSongs.add(completedSongIndex);
    this.updateRecitalGoal();
    this.mode = 'free';
    this.followInputReady = false;
    this.clearFollowHint();
    this.modeText.setText('🎵 自由弹奏');
    this.progressDots.forEach(d => d.destroy());
    this.progressDots = [];

    const { width, height } = this.scale;

    // Celebration
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(width / 2 - 40 + i * 40, 120, 'star_gold').setScale(0);
      this.tweens.add({
        targets: star,
        scale: 1,
        duration: 300,
        delay: i * 150,
        ease: 'Back.easeOut',
      });
      this.time.delayedCall(2000, () => star.destroy());
    }

    this.showFeedback('🎉 太棒了! 弹得真好!', '#4CAF50');
    showFloatingToast(
      this,
      wasNewSong ? `收集 ${this.songs[completedSongIndex].name}` : '这首歌已经会弹了',
      0x7C4DFF
    );

    // Bounce all animals
    this.animalSprites.forEach((animal, i) => {
      this.tweens.add({
        targets: animal,
        y: animal.y - 20,
        duration: 200,
        delay: i * 100,
        yoyo: true,
        repeat: 2,
      });
      this.time.delayedCall(i * 110, () => showStarBurst(this, animal.x, animal.y));
    });

    if (this.completedSongs.size >= 3 && !this.finishedRecital) {
      this.finishedRecital = true;
      this.time.delayedCall(1100, () => this.showRecitalComplete());
    }
  }

  private updateRecitalGoal() {
    const count = Math.min(this.completedSongs.size, 3);
    this.recitalGoalText.setText(`小小演奏会 ${count}/3`);
    this.tweens.add({
      targets: this.recitalGoalText,
      scale: 1.08,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private showRecitalComplete() {
    const { width, height } = this.scale;
    const stars = Math.max(1, 3 - (this.totalFollowMistakes > 4 ? 1 : 0) - (this.totalFollowMistakes > 9 ? 1 : 0));
    recordGameComplete(this, 'PianoGame', stars, '小小演奏会完成');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x4A148C, 0.32)
      .setInteractive()
      .setDepth(9000);
    const panel = this.add.container(width / 2, height / 2).setDepth(9001);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.98);
    bg.fillRoundedRect(-205, -144, 410, 288, 26);
    bg.lineStyle(4, 0xEC407A, 0.75);
    bg.strokeRoundedRect(-205, -144, 410, 288, 26);

    const title = this.add.text(0, -96, '演奏会完成', {
      fontSize: '34px',
      color: '#4A148C',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const summary = this.add.text(0, -54, `完成 ${this.completedSongs.size} 首 · 提示 ${this.totalFollowMistakes} 次`, {
      fontSize: '19px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    const starImages: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(-58 + i * 58, -4, i < stars ? 'star_gold' : 'star_empty').setScale(0);
      starImages.push(star);
      this.tweens.add({
        targets: star,
        scale: 0.9,
        duration: 270,
        delay: i * 150,
        ease: 'Back.easeOut',
      });
    }

    const replay = this.add.text(-86, 82, '再开一场', {
      fontSize: '21px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#7C4DFF',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const menu = this.add.text(92, 82, '回到首页', {
      fontSize: '21px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#26A69A',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    replay.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
      this.scene.restart();
    });
    menu.on('pointerdown', () => this.scene.start('MenuScene'));

    panel.add([bg, title, summary, ...starImages, replay, menu]);
    panel.setScale(0.88).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }

  private toggleRecording() {
    if (this.isRecording) {
      this.isRecording = false;
      this.modeText.setText('🎵 自由弹奏');
      this.showFeedback(`录制完成! ${this.recording.length}个音符`, '#4CAF50');
    } else {
      this.recording = [];
      this.recordStartTime = Date.now();
      this.isRecording = true;
      this.mode = 'record';
      this.followInputReady = false;
      this.clearFollowHint();
      this.modeText.setText('⏺️ 录音中...');
      this.showFeedback('开始弹奏吧!', '#FF4444');
    }
  }

  private playRecording() {
    if (this.recording.length === 0) {
      this.showFeedback('还没有录音哦~', '#FF9800');
      return;
    }

    this.isPlayingSong = true;
    this.modeText.setText('▶️ 回放中...');

    let i = 0;
    const playNext = () => {
      if (i >= this.recording.length) {
        this.isPlayingSong = false;
        this.modeText.setText('🎵 自由弹奏');
        return;
      }

      const entry = this.recording[i];
      this.pressKey(entry.key);
      this.bounceAnimal(entry.key);
      i++;

      if (i < this.recording.length) {
        const delay = this.recording[i].time - entry.time;
        this.time.delayedCall(Math.max(delay, 100), playNext);
      } else {
        this.time.delayedCall(500, () => {
          this.isPlayingSong = false;
          this.modeText.setText('🎵 自由弹奏');
        });
      }
    };

    playNext();
  }

  private cycleWaveType() {
    const currentIdx = this.waveTypes.findIndex(w => w.type === this.waveType);
    const nextIdx = (currentIdx + 1) % this.waveTypes.length;
    this.waveType = this.waveTypes[nextIdx].type;
    const wt = this.waveTypes[nextIdx];
    this.showFeedback(`${wt.emoji} ${wt.name}音色`, '#7C4DFF');
  }

  private drawKey(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, pressed: boolean) {
    g.clear();
    if (!pressed) {
      g.fillStyle(this.darkenColor(color), 1);
      g.fillRoundedRect(x, y + 5, w, h, 12);
    }
    const offsetY = pressed ? 3 : 0;
    g.fillStyle(color, 1);
    g.fillRoundedRect(x, y + offsetY, w, h - (pressed ? 3 : 0), 12);
    g.fillStyle(0xffffff, 0.25);
    g.fillRoundedRect(x + 3, y + offsetY + 3, w - 6, h * 0.25, 8);
  }

  private darkenColor(color: number): number {
    const r = Math.max(0, ((color >> 16) & 0xFF) - 40);
    const g = Math.max(0, ((color >> 8) & 0xFF) - 40);
    const b = Math.max(0, (color & 0xFF) - 40);
    return (r << 16) | (g << 8) | b;
  }

  private pressKey(index: number) {
    const key = this.keys[index];
    this.drawKey(key.graphics, key.x, key.y, key.width, key.height, key.color, true);

    this.tweens.add({
      targets: key.label,
      y: key.y + key.height - 24,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        this.drawKey(key.graphics, key.x, key.y, key.width, key.height, key.color, false);
      },
    });

    this.playTone(key.frequency);
    this.showNoteParticle(key.x + key.width / 2, key.y);
  }

  private playTone(frequency: number) {
    const ctx = this.audioContext;
    if (!ctx || this.audio.muted) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = this.waveType;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Richer sound: add slight vibrato
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.setValueAtTime(5, ctx.currentTime);
    vibratoGain.gain.setValueAtTime(2, ctx.currentTime);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start(ctx.currentTime);
    vibrato.stop(ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  }

  private showNoteParticle(x: number, y: number) {
    const notes = ['♪', '♫', '♩', '♬', '🎵'];
    const note = notes[Phaser.Math.Between(0, notes.length - 1)];
    const text = this.add.text(
      x + Phaser.Math.Between(-15, 15), y,
      note,
      { fontSize: '24px', color: '#FF6B9D' }
    ).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - Phaser.Math.Between(40, 70),
      x: text.x + Phaser.Math.Between(-20, 20),
      alpha: 0,
      scale: 1.3,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private playSong(songIndex: number, onComplete?: () => void) {
    const song = this.songs[songIndex];
    this.isPlayingSong = true;
    this.modeText.setText(`🎵 ${song.emoji} ${song.name}`);

    let noteIndex = 0;
    const playNext = () => {
      if (noteIndex >= song.sequence.length) {
        this.isPlayingSong = false;
        if (this.mode !== 'follow') {
          this.modeText.setText('🎵 自由弹奏');
        }
        if (onComplete) onComplete();
        return;
      }

      const keyIndex = song.sequence[noteIndex];
      this.pressKey(keyIndex);
      this.bounceAnimal(keyIndex);
      this.highlightKey(keyIndex);

      const duration = song.durations[noteIndex];
      noteIndex++;
      this.time.delayedCall(duration, playNext);
    };

    playNext();
  }

  private highlightKey(index: number) {
    const key = this.keys[index];
    const highlight = this.add.graphics();
    highlight.lineStyle(3, 0xFFFFFF, 0.9);
    highlight.strokeRoundedRect(key.x - 2, key.y - 2, key.width + 4, key.height + 4, 14);

    this.tweens.add({
      targets: highlight,
      alpha: 0,
      duration: 300,
      onComplete: () => highlight.destroy(),
    });
  }
}
