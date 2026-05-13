import Phaser from 'phaser';

/**
 * A cute bear mascot that appears in the MenuScene.
 * Drawn entirely with Phaser Graphics. Has idle bobbing and speech bubbles.
 */
export class Mascot {
  private container: Phaser.GameObjects.Container;
  private bubbleContainer: Phaser.GameObjects.Container;
  private bubbleText: Phaser.GameObjects.Text;
  private scene: Phaser.Scene;
  private timer: Phaser.Time.TimerEvent;

  private readonly messages = ['你真棒!', '加油!', '来玩吧!', '好聪明!', '太厉害了!', '继续加油!'];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
    this.container.setDepth(100);

    this.drawBear();

    // Speech bubble
    this.bubbleContainer = scene.add.container(55, -60);
    this.container.add(this.bubbleContainer);

    const bubbleBg = scene.add.graphics();
    bubbleBg.fillStyle(0xffffff, 0.95);
    bubbleBg.fillRoundedRect(-50, -22, 100, 36, 12);
    bubbleBg.lineStyle(2, 0xFFB74D);
    bubbleBg.strokeRoundedRect(-50, -22, 100, 36, 12);
    // Small triangle pointer
    bubbleBg.fillStyle(0xffffff, 0.95);
    bubbleBg.fillTriangle(-10, 14, 5, 14, -5, 26);
    this.bubbleContainer.add(bubbleBg);

    this.bubbleText = scene.add.text(0, -4, '来玩吧!', {
      fontSize: '16px',
      color: '#FF6B35',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.bubbleContainer.add(this.bubbleText);

    // Idle bobbing animation
    scene.tweens.add({
      targets: this.container,
      y: y - 6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Speech bubble change every 5 seconds
    this.timer = scene.time.addEvent({
      delay: 5000,
      callback: this.changeBubble,
      callbackScope: this,
      loop: true,
    });

    // Bubble pop-in animation
    this.bubbleContainer.setScale(0);
    scene.tweens.add({
      targets: this.bubbleContainer,
      scale: 1,
      duration: 400,
      delay: 500,
      ease: 'Back.easeOut',
    });
  }

  private drawBear(): void {
    const g = this.scene.add.graphics();

    // Head (main circle)
    g.fillStyle(0x8D6E63);
    g.fillCircle(0, 0, 35);

    // Ears
    g.fillStyle(0x8D6E63);
    g.fillCircle(-25, -28, 14);
    g.fillCircle(25, -28, 14);

    // Inner ears
    g.fillStyle(0xFFCCBC);
    g.fillCircle(-25, -28, 8);
    g.fillCircle(25, -28, 8);

    // Face (lighter area)
    g.fillStyle(0xD7CCC8);
    g.fillEllipse(0, 8, 40, 30);

    // Eyes
    g.fillStyle(0x333333);
    g.fillCircle(-12, -5, 5);
    g.fillCircle(12, -5, 5);

    // Eye highlights
    g.fillStyle(0xffffff);
    g.fillCircle(-10, -7, 2);
    g.fillCircle(14, -7, 2);

    // Nose
    g.fillStyle(0x4E342E);
    g.fillEllipse(0, 8, 10, 7);

    // Nose highlight
    g.fillStyle(0x795548, 0.6);
    g.fillCircle(-2, 6, 2);

    // Smile
    g.lineStyle(2, 0x4E342E);
    g.beginPath();
    g.arc(0, 10, 8, 0.2, Math.PI - 0.2, false);
    g.strokePath();

    // Blush cheeks
    g.fillStyle(0xFF8A80, 0.4);
    g.fillCircle(-22, 5, 7);
    g.fillCircle(22, 5, 7);

    this.container.add(g);
  }

  private changeBubble(): void {
    const msg = Phaser.Utils.Array.GetRandom(this.messages);

    // Pop out and back in
    this.scene.tweens.add({
      targets: this.bubbleContainer,
      scale: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.bubbleText.setText(msg);
        this.scene.tweens.add({
          targets: this.bubbleContainer,
          scale: 1,
          duration: 300,
          ease: 'Back.easeOut',
        });
      },
    });
  }

  destroy(): void {
    this.timer.destroy();
    this.container.destroy();
  }
}
