import Phaser from 'phaser';
import { enhanceGameScene } from '../../components/GameExperience';
import { saveStars } from '../../utils/storage';
import { VoiceFeedback } from '../../components/VoiceFeedback';
import { AudioManager } from '../../components/AudioManager';
import { SceneTransition } from '../../components/SceneTransition';

interface Card {
  sprite: Phaser.GameObjects.Container;
  imageKey: string;
  revealed: boolean;
  matched: boolean;
}

export class MatchingGame extends Phaser.Scene {
  private cards: Card[] = [];
  private firstCard: Card | null = null;
  private secondCard: Card | null = null;
  private canFlip = true;
  private matchedPairs = 0;
  private totalPairs = 0;
  private moves = 0;
  private movesText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  constructor() {
    super({ key: 'MatchingGame' });
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);

    SceneTransition.fadeIn(this);

    const { width, height } = this.scale;
    this.cards = [];
    this.firstCard = null;
    this.secondCard = null;
    this.canFlip = true;
    this.matchedPairs = 0;
    this.moves = 0;

    // Background - nice purple-blue gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xE8EAF6, 0xE3F2FD, 0xC5CAE9, 0xBBDEFB);
    bg.fillRect(0, 0, width, height);

    // Ground strip
    const ground = this.add.graphics();
    ground.fillStyle(0x81C784, 0.5);
    ground.fillRect(0, height - 30, width, 30);
    ground.fillStyle(0x66BB6A, 0.4);
    for (let x = 0; x < width; x += 18) {
      ground.fillEllipse(x + 9, height - 28, 14, 4 + Math.sin(x * 0.06) * 4);
    }

    // Flowers
    for (let i = 0; i < 6; i++) {
      const fx = 30 + (i / 5) * (width - 60);
      const f = this.add.image(fx, height - 36, `flower_${i % 6}`);
      f.setScale(0.6);
      f.setAlpha(0.6);
    }

    // Clouds
    for (let i = 0; i < 3; i++) {
      const cloud = this.add.image(Phaser.Math.Between(40, width - 40), Phaser.Math.Between(8, 40), 'cloud_deco');
      cloud.setAlpha(0.3);
      cloud.setScale(Phaser.Math.FloatBetween(0.5, 0.9));
    }

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '🎴 记忆配对', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    enhanceGameScene(this, 'MatchingGame');

    this.movesText = this.add.text(width - 20, 35, '翻牌: 0', {
      fontSize: '22px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(1, 0.5);

    this.createCards();
  }

  private createCards() {
    const { width, height } = this.scale;

    const cols = 4;
    const rows = 3;
    this.totalPairs = (cols * rows) / 2;

    const cardW = 120;
    const cardH = 140;
    const gap = 16;
    const totalW = cols * cardW + (cols - 1) * gap;
    const totalH = rows * cardH + (rows - 1) * gap;
    const startX = (width - totalW) / 2 + cardW / 2;
    const startY = (height - totalH) / 2 + cardH / 2 + 30;

    const allImages = [
      'animal_bear', 'animal_cat', 'animal_cow', 'animal_dog',
      'animal_elephant', 'animal_giraffe', 'animal_monkey', 'animal_penguin',
      'animal_owl', 'animal_sheep', 'animal_zebra', 'animal_kangaroo',
    ];
    const selected = Phaser.Utils.Array.Shuffle([...allImages]).slice(0, this.totalPairs);

    const pairImages: string[] = [];
    selected.forEach(img => {
      pairImages.push(img);
      pairImages.push(img);
    });
    Phaser.Utils.Array.Shuffle(pairImages);

    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * (cardW + gap);
        const y = startY + row * (cardH + gap) + cardH / 2;
        const imageKey = pairImages[index];

        const container = this.add.container(x, y);

        // Card shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.08);
        shadow.fillRoundedRect(-cardW / 2 + 3, -cardH / 2 + 3, cardW, cardH, 14);

        // Card back - more attractive pattern
        const back = this.add.graphics();
        back.fillStyle(0x5C6BC0);
        back.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
        back.fillStyle(0x7986CB, 0.4);
        back.fillRoundedRect(-cardW / 2 + 8, -cardH / 2 + 8, cardW - 16, cardH - 16, 10);
        back.lineStyle(3, 0x3949AB);
        back.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);

        // Star decoration on card back
        const starOnBack = this.add.image(0, 0, 'star_gold');
        starOnBack.setScale(0.6);
        starOnBack.setAlpha(0.5);

        // Card front - white with green border
        const front = this.add.graphics();
        front.fillStyle(0xffffff);
        front.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
        front.lineStyle(3, 0x4CAF50, 0.8);
        front.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);

        const img = this.add.image(0, 0, imageKey);
        img.setDisplaySize(90, 90);

        front.setVisible(false);
        img.setVisible(false);

        container.add([shadow, front, img, back, starOnBack]);

        const hitArea = this.add.rectangle(0, 0, cardW, cardH, 0xffffff, 0);
        hitArea.setInteractive({ useHandCursor: true });
        container.add(hitArea);

        const card: Card = { sprite: container, imageKey, revealed: false, matched: false };
        this.cards.push(card);

        hitArea.on('pointerdown', () => this.flipCard(card, back, starOnBack, front, img));

        index++;
      }
    }

    this.addInstruction(width, height);
  }

  private flipCard(
    card: Card,
    back: Phaser.GameObjects.Graphics,
    starOnBack: Phaser.GameObjects.Image,
    front: Phaser.GameObjects.Graphics,
    img: Phaser.GameObjects.Image
  ) {
    if (!this.canFlip || card.revealed || card.matched) return;

    this.audio.playTap();
    card.revealed = true;
    this.tweens.add({
      targets: card.sprite,
      scaleX: 0,
      duration: 100,
      onComplete: () => {
        back.setVisible(false);
        starOnBack.setVisible(false);
        front.setVisible(true);
        img.setVisible(true);
        this.tweens.add({
          targets: card.sprite,
          scaleX: 1,
          duration: 100,
        });
      },
    });

    if (!this.firstCard) {
      this.firstCard = card;
    } else {
      this.secondCard = card;
      this.canFlip = false;
      this.moves++;
      this.movesText.setText(`翻牌: ${this.moves}`);

      this.time.delayedCall(700, () => {
        if (this.firstCard!.imageKey === this.secondCard!.imageKey) {
          this.handleMatch();
        } else {
          this.handleMismatch();
        }
      });
    }
  }

  private handleMatch() {
    this.firstCard!.matched = true;
    this.secondCard!.matched = true;
    this.audio.playSuccess();
    VoiceFeedback.speakCorrect();

    [this.firstCard!, this.secondCard!].forEach(card => {
      this.tweens.add({
        targets: card.sprite,
        scale: 1.15,
        duration: 200,
        yoyo: true,
      });
    });

    const x = (this.firstCard!.sprite.x + this.secondCard!.sprite.x) / 2;
    const y = (this.firstCard!.sprite.y + this.secondCard!.sprite.y) / 2;

    const text = this.add.text(x, y, '✅ 配对成功！', {
      fontSize: '22px',
      color: '#4CAF50',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });

    this.matchedPairs++;
    this.firstCard = null;
    this.secondCard = null;
    this.canFlip = true;

    if (this.matchedPairs >= this.totalPairs) {
      this.time.delayedCall(500, () => this.showComplete());
    }
  }

  private handleMismatch() {
    this.audio.playWrong();
    VoiceFeedback.speakWrong();
    const first = this.firstCard!;
    const second = this.secondCard!;

    [first, second].forEach(card => {
      card.revealed = false;
      this.tweens.add({
        targets: card.sprite,
        scaleX: 0,
        duration: 100,
        onComplete: () => {
          const children = card.sprite.list as Phaser.GameObjects.GameObject[];
          (children[1] as Phaser.GameObjects.Graphics).setVisible(false);
          (children[2] as Phaser.GameObjects.Image).setVisible(false);
          (children[3] as Phaser.GameObjects.Graphics).setVisible(true);
          (children[4] as Phaser.GameObjects.Image).setVisible(true);
          this.tweens.add({
            targets: card.sprite,
            scaleX: 1,
            duration: 100,
          });
        },
      });
    });

    this.firstCard = null;
    this.secondCard = null;
    this.canFlip = true;
  }

  private showComplete() {
    this.audio.playComplete();
    const stars = this.moves <= 8 ? 3 : this.moves <= 12 ? 2 : 1;
    saveStars('MatchingGame', stars);
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 130, 400, 260, 24);

    this.add.text(width / 2, height / 2 - 70, '🎉 全部配对成功！', {
      fontSize: '34px',
      color: '#2196F3',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    for (let i = 0; i < 3; i++) {
      const star = this.add.image(width / 2 - 50 + i * 50, height / 2 - 10, i < stars ? 'star_gold' : 'star_gray');
      star.setScale(0);
      this.tweens.add({
        targets: star,
        scale: 1,
        duration: 300,
        delay: i * 200,
        ease: 'Back.easeOut',
      });
    }

    this.add.text(width / 2, height / 2 + 40, `用了 ${this.moves} 次翻牌`, {
      fontSize: '20px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    const nextBtn = this.add.text(width / 2, height / 2 + 85, '再来一次 🔄', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#2196F3',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => this.scene.restart());
  }

  private addInstruction(width: number, height: number) {
    this.add.text(width / 2, height - 12, '翻开两张相同动物的卡片', {
      fontSize: '15px',
      color: '#8D6E63',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }
}
