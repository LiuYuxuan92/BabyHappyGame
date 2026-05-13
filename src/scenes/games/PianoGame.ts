import Phaser from 'phaser';

interface PianoKey {
  note: string;
  solfege: string;
  frequency: number;
  color: number;
  graphics: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class PianoGame extends Phaser.Scene {
  private keys: PianoKey[] = [];
  private isPlayingSong = false;
  private audioContext!: AudioContext;

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

  // Twinkle Twinkle Little Star: C C G G A A G, F F E E D D C
  private readonly songSequence = [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0];

  constructor() {
    super({ key: 'PianoGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.keys = [];
    this.isPlayingSong = false;
    this.audioContext = (this.sound as Phaser.Sound.WebAudioSoundManager).context;

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFCE4EC, 0xFCE4EC, 0xF3E5F5, 0xF3E5F5);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 38, '🎹 小钢琴', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Create piano keys
    this.createPianoKeys();

    // Play song button
    this.createPlaySongButton();

    // Instruction
    this.add.text(width / 2, height - 20, '点击琴键弹奏音乐吧', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private createPianoKeys() {
    const { width, height } = this.scale;

    const keyCount = 8;
    const gap = 8;
    const totalGap = gap * (keyCount - 1);
    const maxKeyWidth = 90;
    const keyWidth = Math.min(maxKeyWidth, (width - 60 - totalGap) / keyCount);
    const keyHeight = height * 0.45;
    const totalWidth = keyCount * keyWidth + totalGap;
    const startX = (width - totalWidth) / 2;
    const startY = height * 0.28;

    this.noteData.forEach((data, i) => {
      const x = startX + i * (keyWidth + gap);
      const y = startY;

      // Key background
      const keyGraphics = this.add.graphics();
      this.drawKey(keyGraphics, x, y, keyWidth, keyHeight, data.color, false);

      // Solfege label
      const label = this.add.text(x + keyWidth / 2, y + keyHeight - 30, data.solfege, {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Note name above solfege
      this.add.text(x + keyWidth / 2, y + keyHeight - 55, data.note, {
        fontSize: '14px',
        color: 'rgba(255,255,255,0.8)',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5);

      // Hit area
      const hitArea = this.add.rectangle(
        x + keyWidth / 2,
        y + keyHeight / 2,
        keyWidth,
        keyHeight,
        0xffffff,
        0
      ).setInteractive({ useHandCursor: true });

      const pianoKey: PianoKey = {
        note: data.note,
        solfege: data.solfege,
        frequency: data.frequency,
        color: data.color,
        graphics: keyGraphics,
        label,
        x,
        y,
        width: keyWidth,
        height: keyHeight,
      };

      this.keys.push(pianoKey);

      hitArea.on('pointerdown', () => {
        if (!this.isPlayingSong) {
          this.pressKey(i);
        }
      });
    });
  }

  private drawKey(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    pressed: boolean
  ) {
    graphics.clear();

    // Shadow
    if (!pressed) {
      graphics.fillStyle(this.darkenColor(color), 1);
      graphics.fillRoundedRect(x, y + 6, w, h, 12);
    }

    // Main key body
    const offsetY = pressed ? 4 : 0;
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(x, y + offsetY, w, h - (pressed ? 4 : 0), 12);

    // Highlight on top
    graphics.fillStyle(0xffffff, 0.3);
    graphics.fillRoundedRect(x + 4, y + offsetY + 4, w - 8, h * 0.3, 8);
  }

  private darkenColor(color: number): number {
    const r = Math.max(0, ((color >> 16) & 0xFF) - 40);
    const g = Math.max(0, ((color >> 8) & 0xFF) - 40);
    const b = Math.max(0, (color & 0xFF) - 40);
    return (r << 16) | (g << 8) | b;
  }

  private pressKey(index: number) {
    const key = this.keys[index];

    // Visual press animation
    this.drawKey(key.graphics, key.x, key.y, key.width, key.height, key.color, true);

    // Move label down slightly
    this.tweens.add({
      targets: key.label,
      y: key.y + key.height - 26,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        this.drawKey(key.graphics, key.x, key.y, key.width, key.height, key.color, false);
      },
    });

    // Play tone
    this.playTone(key.frequency);

    // Particle-like feedback: floating note
    this.showNoteParticle(key.x + key.width / 2, key.y);
  }

  private playTone(frequency: number) {
    const ctx = this.audioContext;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Gain envelope for a pleasant short tone
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.35);
  }

  private showNoteParticle(x: number, y: number) {
    const notes = ['♪', '♫', '♩'];
    const note = notes[Phaser.Math.Between(0, notes.length - 1)];
    const text = this.add.text(x, y, note, {
      fontSize: '28px',
      color: '#FF6B9D',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      scale: 1.5,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private createPlaySongButton() {
    const { width, height } = this.scale;

    const btnY = height * 0.82;
    const btn = this.add.text(width / 2, btnY, '🎵 播放小星星', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#7C4DFF',
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Gentle idle animation
    this.tweens.add({
      targets: btn,
      scale: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    btn.on('pointerdown', () => {
      if (!this.isPlayingSong) {
        this.playSong();
      }
    });
  }

  private playSong() {
    this.isPlayingSong = true;

    let noteIndex = 0;
    const playNext = () => {
      if (noteIndex >= this.songSequence.length) {
        this.isPlayingSong = false;
        this.showSongComplete();
        return;
      }

      const keyIndex = this.songSequence[noteIndex];
      this.pressKey(keyIndex);
      this.highlightKey(keyIndex);
      noteIndex++;

      this.time.delayedCall(400, playNext);
    };

    playNext();
  }

  private highlightKey(index: number) {
    const key = this.keys[index];
    const { width: keyWidth, height: keyHeight } = key;

    const highlight = this.add.graphics();
    highlight.lineStyle(4, 0xFFFFFF, 0.8);
    highlight.strokeRoundedRect(key.x - 2, key.y - 2, keyWidth + 4, keyHeight + 4, 14);

    this.tweens.add({
      targets: highlight,
      alpha: 0,
      duration: 350,
      onComplete: () => highlight.destroy(),
    });
  }

  private showSongComplete() {
    const { width, height } = this.scale;

    // Star reward
    const star = this.add.image(width / 2, height * 0.15, 'star_gold').setScale(0);
    this.tweens.add({
      targets: star,
      scale: 1.2,
      duration: 400,
      ease: 'Back.easeOut',
    });

    const text = this.add.text(width / 2, height * 0.15 + 45, '太棒了!', {
      fontSize: '22px',
      color: '#FF6B35',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [star, text],
      alpha: 0,
      duration: 500,
      delay: 1500,
      onComplete: () => {
        star.destroy();
        text.destroy();
      },
    });
  }
}
