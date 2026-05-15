import Phaser from 'phaser';
import { enhanceGameScene } from '../../components/GameExperience';

interface AnimalPair {
  key: string;
  shadow: Phaser.GameObjects.Image;
  colored: Phaser.GameObjects.Image;
  matched: boolean;
  targetX: number;
  targetY: number;
}

export class ShadowMatchGame extends Phaser.Scene {
  private pairs: AnimalPair[] = [];
  private matchedCount = 0;
  private totalPairs = 0;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'ShadowMatchGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.pairs = [];
    this.matchedCount = 0;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xEDE7F6, 0xEDE7F6, 0xD1C4E9, 0xD1C4E9);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '🐾 影子配对', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    enhanceGameScene(this, 'ShadowMatchGame');

    // Status text
    this.statusText = this.add.text(width / 2, 70, '', {
      fontSize: '22px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    this.createGame();
    this.updateStatus();
  }

  private createGame() {
    const { width, height } = this.scale;

    const animalKeys = ['animal_bear', 'animal_cat', 'animal_elephant', 'animal_giraffe', 'animal_penguin'];
    this.totalPairs = animalKeys.length;

    // Shuffle for colored placement
    const shuffledForColored = Phaser.Utils.Array.Shuffle([...animalKeys]);

    // Right side: shadows (fixed positions)
    const shadowX = width * 0.75;
    const shadowStartY = 110;
    const shadowGap = (height - 160) / this.totalPairs;

    // Left side: colored originals
    const coloredX = width * 0.25;

    // Divider line
    const divider = this.add.graphics();
    divider.lineStyle(2, 0xB39DDB, 0.5);
    divider.beginPath();
    divider.moveTo(width / 2, 90);
    divider.lineTo(width / 2, height - 30);
    divider.strokePath();

    // Labels
    this.add.text(width * 0.25, 90, '彩色动物', {
      fontSize: '18px',
      color: '#7E57C2',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width * 0.75, 90, '影子', {
      fontSize: '18px',
      color: '#7E57C2',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    animalKeys.forEach((key, i) => {
      const sy = shadowStartY + shadowGap * i + shadowGap / 2;

      // Shadow background circle
      const shadowBg = this.add.graphics();
      shadowBg.fillStyle(0xffffff, 0.3);
      shadowBg.fillCircle(shadowX, sy, 48);
      shadowBg.lineStyle(2, 0xB39DDB, 0.5);
      shadowBg.strokeCircle(shadowX, sy, 48);

      // Shadow image (black tinted)
      const shadow = this.add.image(shadowX, sy, key);
      shadow.setDisplaySize(70, 70);
      shadow.setTint(0x000000);
      shadow.setAlpha(0.8);

      // Colored original (shuffled on left side)
      const coloredIndex = shuffledForColored.indexOf(key);
      const cy = shadowStartY + shadowGap * coloredIndex + shadowGap / 2;
      const cx = coloredX + Phaser.Math.Between(-40, 40);

      const colored = this.add.image(cx, cy, key);
      colored.setDisplaySize(75, 75);
      colored.setInteractive({ useHandCursor: true, draggable: true });
      colored.setData('key', key);
      colored.setData('startX', cx);
      colored.setData('startY', cy);

      // Entrance animation
      colored.setScale(0);
      this.tweens.add({
        targets: colored,
        scaleX: 75 / colored.width,
        scaleY: 75 / colored.height,
        duration: 300,
        delay: i * 100,
        ease: 'Back.easeOut',
      });

      const pair: AnimalPair = {
        key,
        shadow,
        colored,
        matched: false,
        targetX: shadowX,
        targetY: sy,
      };
      this.pairs.push(pair);
    });

    // Drag events
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
      obj.x = dragX;
      obj.y = dragY;
    });

    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      obj.setDepth(10);
      this.tweens.add({
        targets: obj,
        displayWidth: 85,
        displayHeight: 85,
        duration: 100,
      });
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      obj.setDepth(0);
      const draggedKey = obj.getData('key') as string;

      // Find matching pair
      const pair = this.pairs.find(p => p.key === draggedKey && !p.matched);
      if (!pair) return;

      const dist = Phaser.Math.Distance.Between(obj.x, obj.y, pair.targetX, pair.targetY);

      if (dist < 65) {
        // Correct match
        pair.matched = true;
        obj.disableInteractive();

        this.tweens.add({
          targets: obj,
          x: pair.targetX,
          y: pair.targetY,
          displayWidth: 70,
          displayHeight: 70,
          duration: 200,
          ease: 'Back.easeOut',
        });

        // Fade out shadow to reveal colored version
        this.tweens.add({
          targets: pair.shadow,
          alpha: 0,
          duration: 300,
        });

        this.matchedCount++;
        this.updateStatus();
        this.showMatchFeedback(pair.targetX, pair.targetY);

        if (this.matchedCount >= this.totalPairs) {
          this.time.delayedCall(600, () => this.showComplete());
        }
      } else {
        // Wrong position - snap back with shake
        this.tweens.add({
          targets: obj,
          displayWidth: 75,
          displayHeight: 75,
          duration: 100,
        });

        const startX = obj.getData('startX') as number;
        const startY = obj.getData('startY') as number;

        // Shake then return
        this.tweens.add({
          targets: obj,
          x: obj.x - 8,
          duration: 50,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            this.tweens.add({
              targets: obj,
              x: startX,
              y: startY,
              duration: 300,
              ease: 'Back.easeOut',
            });
          },
        });
      }
    });

    // Instruction
    this.add.text(width / 2, height - 20, '把彩色动物拖到对应的影子上', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  private showMatchFeedback(x: number, y: number) {
    const star = this.add.image(x, y, 'star_gold').setScale(0);
    this.tweens.add({
      targets: star,
      scale: 1.5,
      alpha: 0,
      duration: 600,
      onComplete: () => star.destroy(),
    });

    const text = this.add.text(x, y - 45, '配对成功!', {
      fontSize: '22px',
      color: '#7E57C2',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 75,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  private updateStatus() {
    this.statusText.setText(`配对 ${this.matchedCount}/${this.totalPairs}`);
  }

  private showComplete() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 130, 400, 260, 24);

    this.add.text(width / 2, height / 2 - 70, '🎉 全部配对成功！', {
      fontSize: '34px',
      color: '#7E57C2',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    for (let i = 0; i < 3; i++) {
      const star = this.add.image(width / 2 - 50 + i * 50, height / 2 - 10, 'star_gold');
      star.setScale(0);
      this.tweens.add({
        targets: star,
        scale: 1,
        duration: 300,
        delay: i * 200,
        ease: 'Back.easeOut',
      });
    }

    this.add.text(width / 2, height / 2 + 40, '你真聪明！', {
      fontSize: '20px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    const nextBtn = this.add.text(width / 2, height / 2 + 85, '再来一次 🔄', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#7E57C2',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => this.scene.restart());
  }
}
