import Phaser from 'phaser';

/**
 * HintButton - Shows a hint button in the top-right corner.
 * Emits a 'hint' event on the scene when tapped.
 * Has a 5-second cooldown and pulses after 10 seconds of inactivity.
 */
export class HintButton {
  private button: Phaser.GameObjects.Text;
  private scene: Phaser.Scene;
  private cooldown = false;
  private pulseTimer?: Phaser.Time.TimerEvent;
  private pulseTween?: Phaser.Tweens.Tween;
  private inactivityTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width } = scene.scale;

    this.button = scene.add.text(width - 50, 40, '\u{1F4A1}', {
      fontSize: '36px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(1000);

    this.button.on('pointerdown', () => this.onTap());

    // Start inactivity tracking
    this.resetInactivityTimer();

    // Listen for any pointer activity to reset inactivity
    scene.input.on('pointerdown', () => this.resetInactivityTimer());
    scene.input.on('pointermove', () => this.resetInactivityTimer());
  }

  private onTap(): void {
    if (this.cooldown) return;

    this.cooldown = true;
    this.button.setAlpha(0.4);
    this.scene.events.emit('hint');

    // Stop pulsing
    this.stopPulse();

    // Cooldown for 5 seconds
    this.scene.time.delayedCall(5000, () => {
      this.cooldown = false;
      this.button.setAlpha(1);
      this.resetInactivityTimer();
    });
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      this.inactivityTimer.destroy();
    }
    this.stopPulse();

    this.inactivityTimer = this.scene.time.delayedCall(10000, () => {
      this.startPulse();
    });
  }

  private startPulse(): void {
    if (this.cooldown) return;
    this.pulseTween = this.scene.tweens.add({
      targets: this.button,
      scale: 1.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopPulse(): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = undefined;
      this.button.setScale(1);
    }
  }

  destroy(): void {
    if (this.inactivityTimer) this.inactivityTimer.destroy();
    this.stopPulse();
    this.button.destroy();
  }
}
