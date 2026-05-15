import Phaser from 'phaser';
import { getGameInfo } from '../data/games';
import { getSettings, hasSeenGuide, markGuideSeen } from '../utils/storage';
import { AudioManager } from './AudioManager';
import { RestReminder } from './RestReminder';
import { VoiceFeedback } from './VoiceFeedback';

export function enhanceGameScene(scene: Phaser.Scene, gameKey: string): void {
  AudioManager.getInstance().syncWithSettings();
  VoiceFeedback.syncWithSettings();

  const restReminder = new RestReminder(scene);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => restReminder.destroy());

  const gameInfo = getGameInfo(gameKey);
  if (gameInfo && !hasSeenGuide(gameKey)) {
    scene.time.delayedCall(350, () => showGuide(scene, gameKey, gameInfo.label, gameInfo.guide, gameInfo.color));
  }
}

export function showFloatingToast(scene: Phaser.Scene, text: string, accent = 0x4CAF50): void {
  const { width } = scene.scale;
  const container = scene.add.container(width / 2, 96).setDepth(12000);
  const bg = scene.add.graphics();
  bg.fillStyle(0xffffff, 0.96);
  bg.fillRoundedRect(-170, -28, 340, 56, 18);
  bg.lineStyle(3, accent, 0.75);
  bg.strokeRoundedRect(-170, -28, 340, 56, 18);
  const label = scene.add.text(0, 0, text, {
    fontSize: '20px',
    color: '#455A64',
    fontFamily: 'sans-serif',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  container.add([bg, label]);
  container.setAlpha(0).setScale(0.85);
  scene.tweens.add({
    targets: container,
    alpha: 1,
    scale: 1,
    duration: 220,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: container,
        alpha: 0,
        y: container.y - 26,
        duration: 450,
        delay: 1300,
        onComplete: () => container.destroy(),
      });
    },
  });
}

function showGuide(scene: Phaser.Scene, gameKey: string, title: string, guide: string, accent: number): void {
  const { width, height } = scene.scale;
  const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.35)
    .setDepth(11000)
    .setInteractive();
  const panel = scene.add.container(width / 2, height / 2).setDepth(11001);

  const bg = scene.add.graphics();
  bg.fillStyle(0xffffff, 0.98);
  bg.fillRoundedRect(-230, -130, 460, 260, 24);
  bg.lineStyle(4, accent, 0.7);
  bg.strokeRoundedRect(-230, -130, 460, 260, 24);

  const icon = scene.add.text(0, -82, '💡', { fontSize: '42px' }).setOrigin(0.5);
  const titleText = scene.add.text(0, -36, title, {
    fontSize: '30px',
    color: '#263238',
    fontFamily: 'sans-serif',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  const guideText = scene.add.text(0, 12, guide, {
    fontSize: '22px',
    color: '#607D8B',
    fontFamily: 'sans-serif',
    align: 'center',
    wordWrap: { width: 360 },
  }).setOrigin(0.5);
  const button = scene.add.text(0, 82, '开始玩', {
    fontSize: '24px',
    color: '#ffffff',
    fontFamily: 'sans-serif',
    fontStyle: 'bold',
    backgroundColor: '#4CAF50',
    padding: { x: 34, y: 12 },
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  panel.add([bg, icon, titleText, guideText, button]);
  panel.setScale(0.86).setAlpha(0);
  scene.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 240, ease: 'Back.easeOut' });

  const close = () => {
    markGuideSeen(gameKey);
    AudioManager.getInstance().playTap();
    overlay.destroy();
    panel.destroy();
  };
  button.on('pointerdown', close);

  const settings = getSettings();
  if (settings.voiceEnabled) {
    VoiceFeedback.speak(guide);
  }
}
