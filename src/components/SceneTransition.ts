import Phaser from 'phaser';

/**
 * SceneTransition - Provides fade-in and fade-out transitions between scenes.
 */
export class SceneTransition {
  /**
   * Fades the scene to black, then calls the callback.
   */
  static fadeOut(scene: Phaser.Scene, duration = 400, callback?: () => void): void {
    const { width, height } = scene.scale;
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
    overlay.setDepth(9999);

    scene.tweens.add({
      targets: overlay,
      alpha: 1,
      duration,
      onComplete: () => {
        if (callback) callback();
      },
    });
  }

  /**
   * Fades from black to transparent on scene create.
   */
  static fadeIn(scene: Phaser.Scene, duration = 400): void {
    const { width, height } = scene.scale;
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 1);
    overlay.setDepth(9999);

    scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration,
      onComplete: () => {
        overlay.destroy();
      },
    });
  }
}
