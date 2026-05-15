import Phaser from 'phaser';
import { enhanceGameScene } from '../../components/GameExperience';
import { showConfetti, showStarBurst } from '../../components/Particles';
import { AudioManager } from '../../components/AudioManager';
import { VoiceFeedback } from '../../components/VoiceFeedback';
import { saveStars } from '../../utils/storage';

type DressCategory = 'hair' | 'tops' | 'bottoms' | 'shoes' | 'accessories';

interface DressItem {
  id: string;
  label: string;
  category: DressCategory;
  color: number;
  accent: number;
  draw: (scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number) => void;
}

const CATEGORY_LABELS: Record<DressCategory, string> = {
  hair: '发型',
  tops: '上衣',
  bottoms: '下装',
  shoes: '鞋子',
  accessories: '配饰',
};

const CATEGORY_EMOJIS: Record<DressCategory, string> = {
  hair: '🎀',
  tops: '👕',
  bottoms: '👗',
  shoes: '👟',
  accessories: '⭐',
};

export class DressUpGame extends Phaser.Scene {
  private audio!: AudioManager;
  private character!: Phaser.GameObjects.Container;
  private outfitLayer!: Phaser.GameObjects.Container;
  private faceLayer!: Phaser.GameObjects.Container;
  private wardrobeLayer!: Phaser.GameObjects.Container;
  private tabButtons: Phaser.GameObjects.Container[] = [];
  private activeCategory: DressCategory = 'tops';
  private equippedIds = new Map<DressCategory, string>();
  private equippedViews = new Map<DressCategory, Phaser.GameObjects.Container>();
  private sparkleTimer?: Phaser.Time.TimerEvent;
  private mirrorGlow!: Phaser.GameObjects.Graphics;
  private styleText!: Phaser.GameObjects.Text;

  private readonly categories: DressCategory[] = ['hair', 'tops', 'bottoms', 'shoes', 'accessories'];
  private readonly items: DressItem[] = [
    { id: 'hair_bow', label: '草莓蝴蝶结', category: 'hair', color: 0xFF5C8A, accent: 0xFFF176, draw: drawBowHair },
    { id: 'hair_crown', label: '星星皇冠', category: 'hair', color: 0xFFD54F, accent: 0xFF8F00, draw: drawCrownHair },
    { id: 'hair_cap', label: '小熊帽', category: 'hair', color: 0x8D6E63, accent: 0xFFE0B2, draw: drawBearCap },
    { id: 'top_rainbow', label: '彩虹外套', category: 'tops', color: 0x4FC3F7, accent: 0xFF8A65, draw: drawRainbowTop },
    { id: 'top_berry', label: '莓果裙衣', category: 'tops', color: 0xEC407A, accent: 0xF8BBD0, draw: drawDressTop },
    { id: 'top_sailor', label: '水手套装', category: 'tops', color: 0x42A5F5, accent: 0xFFFFFF, draw: drawSailorTop },
    { id: 'bottom_tutu', label: '蓬蓬短裙', category: 'bottoms', color: 0xBA68C8, accent: 0xF3E5F5, draw: drawTutuBottom },
    { id: 'bottom_shorts', label: '橙子短裤', category: 'bottoms', color: 0xFFA726, accent: 0xFFE0B2, draw: drawShortsBottom },
    { id: 'bottom_jeans', label: '星星长裤', category: 'bottoms', color: 0x5C6BC0, accent: 0xC5CAE9, draw: drawJeansBottom },
    { id: 'shoes_boots', label: '彩虹雨靴', category: 'shoes', color: 0x26A69A, accent: 0x80CBC4, draw: drawBoots },
    { id: 'shoes_sneakers', label: '云朵球鞋', category: 'shoes', color: 0xFF7043, accent: 0xFFFFFF, draw: drawSneakers },
    { id: 'shoes_mary', label: '糖果皮鞋', category: 'shoes', color: 0xF06292, accent: 0xFCE4EC, draw: drawMaryJanes },
    { id: 'acc_bag', label: '小兔包包', category: 'accessories', color: 0xFFB74D, accent: 0xFFFFFF, draw: drawBunnyBag },
    { id: 'acc_wand', label: '魔法星棒', category: 'accessories', color: 0xFFD54F, accent: 0xAB47BC, draw: drawStarWand },
    { id: 'acc_glasses', label: '爱心眼镜', category: 'accessories', color: 0xEF5350, accent: 0xFFFFFF, draw: drawHeartGlasses },
  ];

  constructor() {
    super({ key: 'DressUpGame' });
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    this.equippedIds.clear();
    this.equippedViews.clear();
    this.tabButtons = [];
    this.activeCategory = 'tops';

    const { width, height } = this.scale;
    this.drawBoutiqueBackground(width, height);

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '梦幻换装屋', {
      fontSize: '34px',
      color: '#6A3A2A',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);

    enhanceGameScene(this, 'DressUpGame');
    this.createStage(width, height);
    this.createWardrobe(width, height);
    this.createBottomActions(width, height);
    this.startAmbientSparkles(width, height);
    this.updateStyleText();
  }

  private drawBoutiqueBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFFF3E0, 0xFFE0F0, 0xE1F5FE, 0xD7F5E8);
    bg.fillRect(0, 0, width, height);

    bg.fillStyle(0xFFFFFF, 0.32);
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(80, width - 80);
      const y = Phaser.Math.Between(78, height - 110);
      bg.fillCircle(x, y, Phaser.Math.Between(10, 28));
    }

    const floor = this.add.graphics();
    floor.fillStyle(0xFFCCBC, 0.55);
    floor.fillRoundedRect(120, height - 98, width - 240, 54, 26);
    floor.lineStyle(3, 0xFFFFFF, 0.65);
    floor.strokeRoundedRect(120, height - 98, width - 240, 54, 26);
  }

  private createStage(width: number, height: number): void {
    const stageX = width * 0.42;
    const stageY = height * 0.52;

    this.mirrorGlow = this.add.graphics();
    this.mirrorGlow.fillStyle(0xFFFFFF, 0.58);
    this.mirrorGlow.fillRoundedRect(stageX - 190, stageY - 250, 380, 470, 54);
    this.mirrorGlow.lineStyle(8, 0xFFD180, 0.65);
    this.mirrorGlow.strokeRoundedRect(stageX - 190, stageY - 250, 380, 470, 54);
    this.tweens.add({
      targets: this.mirrorGlow,
      alpha: 0.82,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.character = this.add.container(stageX, stageY + 22);
    this.character.setDepth(10);
    this.drawCharacterBase();
    this.outfitLayer = this.add.container(0, 0);
    this.faceLayer = this.add.container(0, 0);
    this.character.add(this.outfitLayer);
    this.character.add(this.faceLayer);
    this.drawFace('happy');

    this.character.setScale(0.92);
    this.tweens.add({
      targets: this.character,
      y: this.character.y - 10,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.styleText = this.add.text(stageX, height - 64, '', {
      fontSize: '20px',
      color: '#6D4C41',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setDepth(20);
  }

  private drawCharacterBase(): void {
    const base = this.add.graphics();

    base.fillStyle(0xFFE0B2);
    base.fillEllipse(0, -158, 86, 94);
    base.lineStyle(4, 0xE0A66C, 0.8);
    base.strokeEllipse(0, -158, 86, 94);

    base.fillStyle(0x5D4037);
    base.fillEllipse(0, -190, 92, 48);
    base.fillCircle(-42, -170, 17);
    base.fillCircle(42, -170, 17);

    base.fillStyle(0xFFE0B2);
    base.fillRoundedRect(-22, -112, 44, 34, 16);
    base.fillStyle(0xFFF8E1);
    base.fillRoundedRect(-44, -82, 88, 104, 28);
    base.lineStyle(3, 0xD7CCC8, 0.65);
    base.strokeRoundedRect(-44, -82, 88, 104, 28);

    base.lineStyle(10, 0xFFE0B2, 1);
    base.lineBetween(-42, -56, -82, -8);
    base.lineBetween(42, -56, 82, -8);
    base.lineBetween(-20, 18, -28, 96);
    base.lineBetween(20, 18, 28, 96);

    base.fillStyle(0x6D4C41);
    base.fillEllipse(-30, 104, 42, 18);
    base.fillEllipse(30, 104, 42, 18);
    this.character.add(base);
  }

  private drawFace(expression: 'happy' | 'wow'): void {
    this.faceLayer.removeAll(true);
    const face = this.add.graphics();
    face.fillStyle(0x3E2723);
    face.fillCircle(-18, -166, 5);
    face.fillCircle(18, -166, 5);
    face.fillStyle(0xffffff);
    face.fillCircle(-16, -168, 2);
    face.fillCircle(20, -168, 2);
    face.fillStyle(0xFF8A80, 0.35);
    face.fillCircle(-30, -150, 9);
    face.fillCircle(30, -150, 9);
    face.lineStyle(3, 0xD84315, 1);
    face.beginPath();
    if (expression === 'wow') {
      face.strokeCircle(0, -146, 8);
    } else {
      face.arc(0, -149, 15, 0.15, Math.PI - 0.15, false);
      face.strokePath();
    }
    this.faceLayer.add(face);
  }

  private createWardrobe(width: number, height: number): void {
    const panelX = width - 230;
    const panelY = height / 2 + 26;
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.92);
    panel.fillRoundedRect(panelX - 180, panelY - 250, 360, 500, 30);
    panel.lineStyle(5, 0xFFB74D, 0.72);
    panel.strokeRoundedRect(panelX - 180, panelY - 250, 360, 500, 30);

    this.add.text(panelX, panelY - 216, '魔法衣橱', {
      fontSize: '26px',
      color: '#6A3A2A',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.categories.forEach((category, index) => {
      const tab = this.createCategoryTab(panelX - 132 + index * 66, panelY - 168, category);
      this.tabButtons.push(tab);
    });

    this.wardrobeLayer = this.add.container(panelX, panelY + 34);
    this.renderWardrobeItems();
  }

  private createCategoryTab(x: number, y: number, category: DressCategory): Phaser.GameObjects.Container {
    const tab = this.add.container(x, y).setDepth(30);
    const bg = this.add.graphics();
    const active = category === this.activeCategory;
    bg.fillStyle(active ? 0xFF8A65 : 0xFFF3E0, 1);
    bg.fillRoundedRect(-28, -26, 56, 52, 18);
    bg.lineStyle(3, active ? 0xE64A19 : 0xFFCC80, 0.8);
    bg.strokeRoundedRect(-28, -26, 56, 52, 18);
    const icon = this.add.text(0, -4, CATEGORY_EMOJIS[category], {
      fontSize: '25px',
    }).setOrigin(0.5);
    tab.add([bg, icon]);
    tab.setSize(56, 52);
    tab.setInteractive({ useHandCursor: true });
    tab.setData('category', category);
    tab.setData('bg', bg);
    tab.on('pointerdown', () => {
      this.audio.playTap();
      this.activeCategory = category;
      this.updateTabs();
      this.renderWardrobeItems();
    });
    return tab;
  }

  private updateTabs(): void {
    this.tabButtons.forEach(tab => {
      const category = tab.getData('category') as DressCategory;
      const bg = tab.getData('bg') as Phaser.GameObjects.Graphics;
      const active = category === this.activeCategory;
      bg.clear();
      bg.fillStyle(active ? 0xFF8A65 : 0xFFF3E0, 1);
      bg.fillRoundedRect(-28, -26, 56, 52, 18);
      bg.lineStyle(3, active ? 0xE64A19 : 0xFFCC80, 0.8);
      bg.strokeRoundedRect(-28, -26, 56, 52, 18);
      this.tweens.add({
        targets: tab,
        scale: active ? 1.08 : 1,
        duration: 140,
      });
    });
  }

  private renderWardrobeItems(): void {
    this.wardrobeLayer.removeAll(true);
    const title = this.add.text(0, -122, CATEGORY_LABELS[this.activeCategory], {
      fontSize: '22px',
      color: '#6D4C41',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.wardrobeLayer.add(title);

    const options = this.items.filter(item => item.category === this.activeCategory);
    options.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const card = this.createItemCard(item, -78 + col * 156, -56 + row * 132, index);
      this.wardrobeLayer.add(card);
    });
  }

  private createItemCard(item: DressItem, x: number, y: number, index: number): Phaser.GameObjects.Container {
    const card = this.add.container(x, y);
    const selected = this.equippedIds.get(item.category) === item.id;
    const bg = this.add.graphics();
    bg.fillStyle(selected ? 0xFFF176 : 0xFFFFFF, 1);
    bg.fillRoundedRect(-62, -48, 124, 106, 22);
    bg.lineStyle(4, selected ? 0xFFB300 : item.color, 0.75);
    bg.strokeRoundedRect(-62, -48, 124, 106, 22);

    const preview = this.add.container(0, -10);
    item.draw(this, preview, item.color, item.accent);
    preview.setScale(0.62);

    const label = this.add.text(0, 38, item.label, {
      fontSize: '15px',
      color: '#5D4037',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    card.add([bg, preview, label]);
    card.setSize(124, 106);
    card.setInteractive({ useHandCursor: true });
    card.setAlpha(0).setScale(0.75);
    this.tweens.add({
      targets: card,
      alpha: 1,
      scale: 1,
      duration: 260,
      delay: index * 70,
      ease: 'Back.easeOut',
    });
    card.on('pointerdown', () => this.equipItem(item));
    card.on('pointerover', () => this.tweens.add({ targets: card, scale: 1.06, duration: 120 }));
    card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 120 }));
    return card;
  }

  private equipItem(item: DressItem): void {
    this.audio.playSuccess();
    VoiceFeedback.speak(Phaser.Utils.Array.GetRandom(['真好看', '搭配成功', '太漂亮了']));
    this.equippedIds.set(item.category, item.id);

    const previous = this.equippedViews.get(item.category);
    if (previous) {
      this.tweens.add({
        targets: previous,
        alpha: 0,
        scale: 0.6,
        duration: 160,
        onComplete: () => previous.destroy(),
      });
    }

    const view = this.add.container(0, 0);
    item.draw(this, view, item.color, item.accent);
    view.setAlpha(0).setScale(0.7);
    this.positionOutfitView(item.category, view);
    this.outfitLayer.add(view);
    this.equippedViews.set(item.category, view);

    this.tweens.add({
      targets: view,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        showStarBurst(this, this.character.x + view.x, this.character.y + view.y);
      },
    });
    this.drawFace('wow');
    this.time.delayedCall(650, () => this.drawFace('happy'));
    this.renderWardrobeItems();
    this.updateStyleText();
  }

  private positionOutfitView(category: DressCategory, view: Phaser.GameObjects.Container): void {
    const positions: Record<DressCategory, { x: number; y: number; depth: number }> = {
      hair: { x: 0, y: -202, depth: 8 },
      tops: { x: 0, y: -42, depth: 3 },
      bottoms: { x: 0, y: 24, depth: 2 },
      shoes: { x: 0, y: 102, depth: 4 },
      accessories: { x: 0, y: -18, depth: 7 },
    };
    const pos = positions[category];
    view.setPosition(pos.x, pos.y);
    view.setDepth(pos.depth);
  }

  private createBottomActions(width: number, height: number): void {
    const randomBtn = this.createActionButton(width * 0.22, height - 42, '随机搭配', 0x26A69A);
    randomBtn.on('pointerdown', () => this.randomizeOutfit());

    const clearBtn = this.createActionButton(width * 0.42, height - 42, '重新换装', 0x78909C);
    clearBtn.on('pointerdown', () => this.clearOutfit());

    const doneBtn = this.createActionButton(width * 0.62, height - 42, '完成展示', 0xEC407A);
    doneBtn.on('pointerdown', () => this.showCelebration());
  }

  private createActionButton(x: number, y: number, label: string, color: number): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, label, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: Phaser.Display.Color.IntegerToColor(color).rgba,
      padding: { x: 24, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(50);
    button.on('pointerover', () => this.tweens.add({ targets: button, scale: 1.07, duration: 120 }));
    button.on('pointerout', () => this.tweens.add({ targets: button, scale: 1, duration: 120 }));
    return button;
  }

  private randomizeOutfit(): void {
    this.audio.playTap();
    this.categories.forEach((category, index) => {
      const options = this.items.filter(item => item.category === category);
      const item = Phaser.Utils.Array.GetRandom(options);
      this.time.delayedCall(index * 170, () => this.equipItem(item));
    });
  }

  private clearOutfit(): void {
    this.audio.playWrong();
    this.equippedIds.clear();
    this.equippedViews.forEach(view => view.destroy());
    this.equippedViews.clear();
    this.renderWardrobeItems();
    this.updateStyleText();
  }

  private updateStyleText(): void {
    const count = this.equippedIds.size;
    const tips = ['先选一件上衣吧', '继续搭配更完整', '已经有小小造型啦', '快完成一套漂亮造型'];
    this.styleText.setText(count >= 5 ? '完美造型完成!' : tips[Math.min(count, tips.length - 1)]);
  }

  private startAmbientSparkles(width: number, height: number): void {
    this.sparkleTimer = this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(Math.floor(width * 0.22), Math.floor(width * 0.56));
        const y = Phaser.Math.Between(100, height - 125);
        const star = this.add.image(x, y, 'star_gold').setDisplaySize(18, 18).setAlpha(0.42);
        this.tweens.add({
          targets: star,
          alpha: 0,
          scale: 1.6,
          angle: 90,
          duration: 850,
          onComplete: () => star.destroy(),
        });
      },
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sparkleTimer?.destroy());
  }

  private showCelebration(): void {
    this.audio.playComplete();
    VoiceFeedback.speak('造型完成，真漂亮');
    saveStars('DressUpGame', this.equippedIds.size >= 4 ? 3 : 2);
    const { width, height } = this.scale;

    showConfetti(this);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.42).setDepth(100);

    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.98);
    bg.fillRoundedRect(-235, -170, 470, 340, 32);
    bg.lineStyle(5, 0xFFB74D, 0.8);
    bg.strokeRoundedRect(-235, -170, 470, 340, 32);
    panel.add(bg);

    const title = this.add.text(0, -112, '闪亮造型秀', {
      fontSize: '38px',
      color: '#E91E63',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    panel.add(title);

    const photo = this.add.graphics();
    photo.fillStyle(0xFFF8E1, 1);
    photo.fillRoundedRect(-84, -76, 168, 154, 22);
    photo.lineStyle(4, 0xFFCC80, 0.75);
    photo.strokeRoundedRect(-84, -76, 168, 154, 22);
    panel.add(photo);

    for (let i = 0; i < 3; i++) {
      const star = this.add.image(-50 + i * 50, 18, i < (this.equippedIds.size >= 4 ? 3 : 2) ? 'star_gold' : 'star_gray');
      star.setScale(0);
      panel.add(star);
      this.tweens.add({ targets: star, scale: 1, duration: 300, delay: i * 180, ease: 'Back.easeOut' });
    }

    const summary = this.add.text(0, 70, `搭配了 ${this.equippedIds.size}/5 类装扮`, {
      fontSize: '22px',
      color: '#6D4C41',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    panel.add(summary);

    const againBtn = this.add.text(0, 124, '再搭一套', {
      fontSize: '25px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#EC407A',
      padding: { x: 32, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    againBtn.on('pointerdown', () => this.scene.restart());
    panel.add(againBtn);

    panel.setScale(0.82).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }
}

function drawBowHair(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillTriangle(-42, 0, -8, -22, -8, 22);
  g.fillTriangle(42, 0, 8, -22, 8, 22);
  g.fillStyle(accent, 1);
  g.fillCircle(0, 0, 10);
  g.lineStyle(3, 0xC2185B, 0.6);
  g.strokeCircle(0, 0, 10);
  target.add(g);
}

function drawCrownHair(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(-38, -8, 76, 24, 8);
  g.fillTriangle(-34, -8, -22, -48, -10, -8);
  g.fillTriangle(-10, -8, 0, -58, 10, -8);
  g.fillTriangle(10, -8, 22, -48, 34, -8);
  g.fillStyle(accent, 1);
  g.fillCircle(-22, -30, 5);
  g.fillCircle(0, -42, 5);
  g.fillCircle(22, -30, 5);
  target.add(g);
}

function drawBearCap(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillEllipse(0, -2, 92, 48);
  g.fillCircle(-34, -28, 18);
  g.fillCircle(34, -28, 18);
  g.fillStyle(accent, 1);
  g.fillCircle(-34, -28, 10);
  g.fillCircle(34, -28, 10);
  target.add(g);
}

function drawRainbowTop(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(-54, -40, 108, 94, 22);
  g.fillRoundedRect(-80, -30, 34, 62, 16);
  g.fillRoundedRect(46, -30, 34, 62, 16);
  g.lineStyle(5, accent, 1);
  g.lineBetween(-38, -12, 38, -12);
  g.lineStyle(5, 0xFFF176, 1);
  g.lineBetween(-34, 8, 34, 8);
  target.add(g);
}

function drawDressTop(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(-44, -44, 88, 76, 18);
  g.fillTriangle(-76, 84, -38, 22, 0, 84);
  g.fillTriangle(0, 84, 38, 22, 76, 84);
  g.fillTriangle(-38, 22, 0, 84, 38, 22);
  g.fillStyle(accent, 1);
  g.fillCircle(-24, -14, 6);
  g.fillCircle(0, -8, 6);
  g.fillCircle(24, -14, 6);
  target.add(g);
}

function drawSailorTop(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(-52, -42, 104, 96, 20);
  g.fillStyle(accent, 1);
  g.fillTriangle(-44, -38, 0, -4, 44, -38);
  g.lineStyle(4, 0x0D47A1, 0.75);
  g.lineBetween(-34, -28, 34, -28);
  target.add(g);
}

function drawTutuBottom(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(-40, -12, 80, 20, 8);
  g.fillStyle(accent, 0.92);
  for (let i = 0; i < 5; i++) {
    g.fillTriangle(-70 + i * 35, 68, -38 + i * 20, 4, 0 + i * 20, 68);
  }
  target.add(g);
}

function drawShortsBottom(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(-46, -18, 92, 22, 8);
  g.fillRoundedRect(-44, -4, 38, 54, 10);
  g.fillRoundedRect(6, -4, 38, 54, 10);
  g.fillStyle(accent, 1);
  g.fillCircle(-22, 16, 5);
  g.fillCircle(22, 16, 5);
  target.add(g);
}

function drawJeansBottom(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(-42, -18, 84, 22, 8);
  g.fillRoundedRect(-40, 0, 34, 92, 10);
  g.fillRoundedRect(6, 0, 34, 92, 10);
  g.fillStyle(accent, 1);
  g.fillCircle(-22, 32, 5);
  g.fillCircle(22, 54, 5);
  target.add(g);
}

function drawBoots(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(-48, -22, 38, 58, 12);
  g.fillRoundedRect(10, -22, 38, 58, 12);
  g.fillRoundedRect(-58, 22, 54, 20, 10);
  g.fillRoundedRect(4, 22, 54, 20, 10);
  g.lineStyle(5, accent, 1);
  g.lineBetween(-44, -4, -12, -4);
  g.lineBetween(14, -4, 46, -4);
  target.add(g);
}

function drawSneakers(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(-62, 0, 58, 28, 14);
  g.fillRoundedRect(4, 0, 58, 28, 14);
  g.fillStyle(accent, 1);
  g.fillCircle(-38, 8, 8);
  g.fillCircle(28, 8, 8);
  target.add(g);
}

function drawMaryJanes(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillEllipse(-34, 12, 58, 30);
  g.fillEllipse(34, 12, 58, 30);
  g.fillStyle(accent, 1);
  g.fillRoundedRect(-52, 0, 36, 7, 4);
  g.fillRoundedRect(16, 0, 36, 7, 4);
  target.add(g);
}

function drawBunnyBag(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.lineStyle(6, color, 1);
  g.arc(72, -18, 30, Math.PI, Math.PI * 2, false);
  g.fillStyle(color, 1);
  g.fillRoundedRect(42, 4, 60, 58, 18);
  g.fillStyle(accent, 1);
  g.fillCircle(62, 28, 5);
  g.fillCircle(82, 28, 5);
  g.lineStyle(3, 0x6D4C41, 1);
  g.lineBetween(72, 34, 72, 44);
  target.add(g);
}

function drawStarWand(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number, accent: number): void {
  const g = scene.add.graphics();
  g.lineStyle(6, accent, 1);
  g.lineBetween(70, -46, 105, 40);
  drawMiniStar(g, 64, -60, 24, color);
  target.add(g);
}

function drawHeartGlasses(scene: Phaser.Scene, target: Phaser.GameObjects.Container, color: number): void {
  const g = scene.add.graphics();
  g.lineStyle(5, color, 1);
  g.strokeCircle(-18, -148, 14);
  g.strokeCircle(18, -148, 14);
  g.lineBetween(-4, -148, 4, -148);
  target.add(g);
}

function drawMiniStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, color: number): void {
  g.fillStyle(color, 1);
  const outer = size;
  const inner = size * 0.42;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = i * Math.PI / 5 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();
}
