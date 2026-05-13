import Phaser from 'phaser';

/**
 * RestReminder - Tracks total play time and shows a rest reminder after 20 minutes.
 * Uses a static timer so it persists across scene changes.
 */
export class RestReminder {
  private static startTime: number = Date.now();
  private static readonly REMINDER_INTERVAL = 20 * 60 * 1000; // 20 minutes
  private scene: Phaser.Scene;
  private checkTimer?: Phaser.Time.TimerEvent;
  private overlay?: Phaser.GameObjects.Rectangle;
  private panel?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Check every 30 seconds if it's time to remind
    this.checkTimer = scene.time.addEvent({
      delay: 30000,
      callback: () => this.checkPlayTime(),
      loop: true,
    });
  }

  private checkPlayTime(): void {
    const elapsed = Date.now() - RestReminder.startTime;
    if (elapsed >= RestReminder.REMINDER_INTERVAL) {
      this.showReminder();
    }
  }

  private showReminder(): void {
    if (this.overlay) return; // Already showing

    const { width, height } = this.scene.scale;

    // Dim overlay
    this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
    this.overlay.setDepth(10000);
    this.overlay.setInteractive(); // Block input to game below

    // Panel container
    this.panel = this.scene.add.container(width / 2, height / 2);
    this.panel.setDepth(10001);

    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-200, -120, 400, 240, 24);
    this.panel.add(bg);

    // Eye animation
    const eyeText = this.scene.add.text(0, -60, '\u{1F440}', {
      fontSize: '48px',
    }).setOrigin(0.5);
    this.panel.add(eyeText);

    // Gentle bounce on the eyes
    this.scene.tweens.add({
      targets: eyeText,
      y: -65,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Message
    const message = this.scene.add.text(0, 10, '\u5B9D\u5B9D\u4F11\u606F\u4E00\u4E0B\u773C\u775B\u5427', {
      fontSize: '26px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.panel.add(message);

    // Continue button
    const btnText = this.scene.add.text(0, 75, '\u7EE7\u7EED\u73A9', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#66BB6A',
      padding: { x: 30, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.panel.add(btnText);

    btnText.on('pointerdown', () => this.dismiss());

    // Fade in
    this.overlay.setAlpha(0);
    this.panel.setAlpha(0);
    this.scene.tweens.add({
      targets: [this.overlay, this.panel],
      alpha: 1,
      duration: 300,
    });
  }

  private dismiss(): void {
    // Reset timer
    RestReminder.startTime = Date.now();

    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = undefined;
    }
    if (this.panel) {
      this.panel.destroy();
      this.panel = undefined;
    }
  }

  /** Reset the static timer (e.g., on app start) */
  static resetTimer(): void {
    RestReminder.startTime = Date.now();
  }

  destroy(): void {
    if (this.checkTimer) {
      this.checkTimer.destroy();
    }
    this.dismiss();
  }
}
