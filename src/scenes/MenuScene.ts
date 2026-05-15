import Phaser from 'phaser';
import { GAME_CATALOG, GameInfo } from '../data/games';
import {
  claimDailyReward,
  getAchievementSummary,
  getProgress,
  getRecommendedGame,
  getSettings,
  updateSettings,
} from '../utils/storage';
import { AudioManager } from '../components/AudioManager';
import { StarDisplay } from '../components/StarDisplay';
import { Mascot } from '../components/Mascot';
import { VoiceFeedback } from '../components/VoiceFeedback';
import { showFloatingToast } from '../components/GameExperience';

export class MenuScene extends Phaser.Scene {
  private audio!: AudioManager;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    VoiceFeedback.syncWithSettings();

    const { width, height } = this.scale;
    const dailyReward = claimDailyReward();
    const recommendedKey = getRecommendedGame(GAME_CATALOG.map(game => game.key));

    // Sky-blue gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87CEEB, 0xB3E5FC, 0xE0F7FA, 0xE8F5E9);
    bg.fillRect(0, 0, width, height);

    // Green ground strip at bottom
    const ground = this.add.graphics();
    ground.fillGradientStyle(0x81C784, 0xA5D6A7, 0x66BB6A, 0x4CAF50);
    ground.fillRect(0, height - 40, width, 40);
    // Ground top edge decoration
    ground.fillStyle(0x8BC34A, 0.5);
    for (let x = 0; x < width; x += 20) {
      const h = 3 + Math.sin(x * 0.05) * 5;
      ground.fillEllipse(x + 10, height - 38, 16, h);
    }

    // Decorative flowers on the ground
    for (let i = 0; i < 8; i++) {
      const fx = 40 + (i / 7) * (width - 80);
      const flower = this.add.image(fx, height - 48, `flower_${i % 6}`);
      flower.setScale(0.9);
      flower.setAlpha(0.8);
      this.tweens.add({
        targets: flower,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 1500 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Clouds
    this.addClouds(width);

    // Animated rainbow arc behind title
    this.addRainbowArc(width / 2, 50);

    // Twinkling stars
    this.addTwinklingStars(width);

    // Title with rainbow gradient effect
    const title = this.add.text(width / 2, 42, '宝宝乐园', {
      fontSize: '46px',
      color: '#FF6B35',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(width / 2, 82, '选择一个游戏开始玩吧！', {
      fontSize: '18px',
      color: '#78909C',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Star display in top-right
    new StarDisplay(this, width - 70, 30);
    this.addTopControls(width);
    this.addAchievementStrip(width, height, dailyReward.claimed);
    if (dailyReward.claimed) {
      this.time.delayedCall(500, () => {
        showFloatingToast(this, '今日奖励 +1 ⭐', 0xFFB300);
        VoiceFeedback.speak('今天也来玩啦，奖励一颗星星');
      });
    }

    // All games with icons
    const games = GAME_CATALOG;

    // Grid: 6 columns
    const cols = 6;
    const cardW = 120;
    const cardH = 130;
    const gapX = 12;
    const gapY = 12;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (width - totalW) / 2 + cardW / 2;
    const startY = 120;

    games.forEach((game, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY) + cardH / 2;
      this.createGameButton(x, y, game, cardW, cardH, game.key === recommendedKey);
    });

    // Footer
    this.add.text(width / 2, height - 18, '适合 2-5 岁宝宝 ❤️ 共17款游戏', {
      fontSize: '13px',
      color: '#8D6E63',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Mascot in bottom-left
    new Mascot(this, 55, height - 60);
  }

  private createGameButton(x: number, y: number, game: GameInfo, cardW: number, cardH: number, recommended: boolean) {
    const container = this.add.container(x, y);

    // Card background with shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.08);
    shadow.fillRoundedRect(-cardW / 2 + 3, -cardH / 2 + 3, cardW, cardH, 16);
    container.add(shadow);

    const card = this.add.graphics();
    card.fillStyle(0xffffff, 0.95);
    card.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    card.lineStyle(recommended ? 5 : 3, game.color, recommended ? 1 : 0.7);
    card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    container.add(card);

    // Game icon (procedurally generated 80x80 texture)
    const icon = this.add.image(0, -14, game.iconKey);
    icon.setDisplaySize(54, 54);
    container.add(icon);

    // Label
    const label = this.add.text(0, 36, game.label, {
      fontSize: '15px',
      color: '#444444',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(label);

    // Mini stars
    const progress = getProgress(game.key);
    const miniStars = StarDisplay.createMiniStars(this, 0, 52, progress.stars);
    container.add(miniStars);

    if (recommended) {
      const badge = this.add.text(0, -55, '推荐', {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        backgroundColor: '#FF7043',
        padding: { x: 8, y: 3 },
      }).setOrigin(0.5);
      container.add(badge);
      this.tweens.add({
        targets: container,
        y: y - 4,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Hit area
    const hitArea = this.add.rectangle(0, 0, cardW, cardH, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.1, scaleY: 1.1, duration: 120 });
      // Brighten the border
      card.clear();
      card.fillStyle(0xffffff, 1);
      card.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
      card.lineStyle(4, game.color, 0.9);
      card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    });
    hitArea.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 });
      card.clear();
      card.fillStyle(0xffffff, 0.95);
      card.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
      card.lineStyle(3, game.color, 0.7);
      card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    });
    hitArea.on('pointerdown', () => {
      this.audio.playTap();
      this.tweens.add({
        targets: container,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.scene.start(game.key);
        },
      });
    });
  }

  private addTopControls(width: number) {
    const settingsBtn = this.add.text(width - 160, 30, '家长设置', {
      fontSize: '16px',
      color: '#5D4037',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFF8E1',
      padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    settingsBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.showSettingsPanel();
    });
  }

  private addAchievementStrip(width: number, height: number, dailyClaimed: boolean) {
    const summary = getAchievementSummary();
    const text = `已玩 ${summary.gamesPlayed}/17  三星 ${summary.perfectGames}  ${dailyClaimed ? '今日已打卡' : '今日已领取'}`;
    const strip = this.add.text(width / 2, height - 44, text, {
      fontSize: '15px',
      color: '#5D4037',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 18, y: 6 },
    }).setOrigin(0.5);
    strip.setAlpha(0.86);

    if (summary.badges.length > 0) {
      this.add.text(width - 155, height - 44, `徽章 ${summary.badges.slice(-1)[0]}`, {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        backgroundColor: '#26A69A',
        padding: { x: 10, y: 6 },
      }).setOrigin(0.5);
    }
  }

  private showSettingsPanel() {
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.45)
      .setDepth(10000)
      .setInteractive();
    const panel = this.add.container(width / 2, height / 2).setDepth(10001);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.98);
    bg.fillRoundedRect(-230, -170, 460, 340, 24);
    bg.lineStyle(4, 0xFFB74D, 0.8);
    bg.strokeRoundedRect(-230, -170, 460, 340, 24);
    panel.add(bg);

    panel.add(this.add.text(0, -120, '家长设置', {
      fontSize: '32px',
      color: '#4E342E',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    const renderToggle = (y: number, label: string, active: boolean, onToggle: (value: boolean) => void) => {
      const row = this.add.container(0, y);
      row.add(this.add.text(-150, 0, label, {
        fontSize: '22px',
        color: '#455A64',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5));
      const button = this.add.text(125, 0, active ? '开启' : '关闭', {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        backgroundColor: active ? '#4CAF50' : '#90A4AE',
        padding: { x: 18, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => {
        active = !active;
        button.setText(active ? '开启' : '关闭');
        button.setBackgroundColor(active ? '#4CAF50' : '#90A4AE');
        onToggle(active);
        this.audio.syncWithSettings();
        VoiceFeedback.syncWithSettings();
        this.audio.playTap();
      });
      row.add(button);
      panel.add(row);
    };

    const settings = getSettings();
    renderToggle(-60, '音效反馈', settings.soundEnabled, value => updateSettings({ soundEnabled: value }));
    renderToggle(-10, '语音鼓励', settings.voiceEnabled, value => updateSettings({ voiceEnabled: value }));
    renderToggle(40, '护眼提醒', settings.restReminderEnabled, value => updateSettings({ restReminderEnabled: value }));

    const difficultyBtn = this.add.text(0, 92, `难度：${settings.difficulty === 'easy' ? '低龄友好' : '普通'}`, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#26A69A',
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    difficultyBtn.on('pointerdown', () => {
      const next = getSettings().difficulty === 'easy' ? 'normal' : 'easy';
      updateSettings({ difficulty: next });
      difficultyBtn.setText(`难度：${next === 'easy' ? '低龄友好' : '普通'}`);
      this.audio.playTap();
    });
    panel.add(difficultyBtn);

    const closeBtn = this.add.text(0, 142, '完成', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FF7043',
      padding: { x: 34, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.audio.playTap();
      overlay.destroy();
      panel.destroy();
      this.scene.restart();
    });
    panel.add(closeBtn);
  }

  private addRainbowArc(cx: number, cy: number) {
    const rainbow = this.add.graphics();
    rainbow.setDepth(0);
    const colors = [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x4B0082, 0x9400D3];
    const baseRadius = 160;

    colors.forEach((color, i) => {
      rainbow.lineStyle(3, color, 0.2);
      rainbow.beginPath();
      rainbow.arc(cx, cy + 15, baseRadius - i * 7, Math.PI, 0, false);
      rainbow.strokePath();
    });

    rainbow.setAlpha(0.5);
    this.tweens.add({
      targets: rainbow,
      alpha: 0.75,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private addTwinklingStars(width: number) {
    const starPositions = [
      { x: width * 0.08, y: 25 },
      { x: width * 0.88, y: 40 },
      { x: width * 0.22, y: 65 },
      { x: width * 0.72, y: 22 },
      { x: width * 0.5, y: 12 },
      { x: width * 0.94, y: 70 },
    ];

    starPositions.forEach((pos, i) => {
      const star = this.add.graphics();
      star.setDepth(1);
      this.drawSparkle(star, 0, 0, Phaser.Math.Between(4, 8));
      star.setPosition(pos.x, pos.y);
      star.setAlpha(0.25);

      this.tweens.add({
        targets: star,
        alpha: 0.9,
        scale: 1.3,
        duration: Phaser.Math.Between(800, 1500),
        delay: i * 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: star,
        y: pos.y - Phaser.Math.Between(5, 12),
        duration: Phaser.Math.Between(2000, 3500),
        delay: i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private drawSparkle(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number) {
    const color = Phaser.Utils.Array.GetRandom([0xFFD700, 0xFFF176, 0xFFEB3B]);
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(cx, cy - size);
    g.lineTo(cx + size * 0.3, cy - size * 0.3);
    g.lineTo(cx + size, cy);
    g.lineTo(cx + size * 0.3, cy + size * 0.3);
    g.lineTo(cx, cy + size);
    g.lineTo(cx - size * 0.3, cy + size * 0.3);
    g.lineTo(cx - size, cy);
    g.lineTo(cx - size * 0.3, cy - size * 0.3);
    g.closePath();
    g.fillPath();
  }

  private addClouds(width: number) {
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(30, width - 30);
      const y = Phaser.Math.Between(8, 55);
      const cloud = this.add.image(x, y, 'cloud_deco');
      cloud.setAlpha(0.5);
      cloud.setScale(Phaser.Math.FloatBetween(0.6, 1.2));

      this.tweens.add({
        targets: cloud,
        x: cloud.x + Phaser.Math.Between(-15, 15),
        duration: Phaser.Math.Between(4000, 7000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
