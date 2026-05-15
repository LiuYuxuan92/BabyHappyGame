import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';

type StickerCategory = 'animals' | 'ocean' | 'food' | 'traffic';

interface StickerTheme {
  name: string;
  bgKey: string;
  accent: number;
  label: string;
}

interface StickerDef {
  key: string;
  category: StickerCategory;
}

type PlacedSticker = Phaser.GameObjects.Image & {
  baseSize: number;
};

const THEMES: StickerTheme[] = [
  { name: 'meadow', bgKey: 'bg_sky_grass', accent: 0x66BB6A, label: '草地' },
  { name: 'ocean', bgKey: 'bg_ocean', accent: 0x00ACC1, label: '海底' },
  { name: 'forest', bgKey: 'bg_forest', accent: 0x8BC34A, label: '森林' },
];

const CATEGORY_LABELS: Record<StickerCategory, string> = {
  animals: '动物',
  ocean: '海洋',
  food: '食物',
  traffic: '交通',
};

const STICKERS: StickerDef[] = [
  { key: 'animal_bear', category: 'animals' },
  { key: 'animal_cat', category: 'animals' },
  { key: 'animal_dog', category: 'animals' },
  { key: 'animal_penguin', category: 'animals' },
  { key: 'animal_owl', category: 'animals' },
  { key: 'animal_giraffe', category: 'animals' },
  { key: 'fish_blue', category: 'ocean' },
  { key: 'fish_green', category: 'ocean' },
  { key: 'fish_orange', category: 'ocean' },
  { key: 'fish_brown', category: 'ocean' },
  { key: 'fish_grey', category: 'ocean' },
  { key: 'food_01', category: 'food' },
  { key: 'food_02', category: 'food' },
  { key: 'food_05', category: 'food' },
  { key: 'food_08', category: 'food' },
  { key: 'food_11', category: 'food' },
  { key: 'vehicle_blue', category: 'traffic' },
  { key: 'vehicle_red', category: 'traffic' },
  { key: 'vehicle_green', category: 'traffic' },
  { key: 'vehicle_yellow', category: 'traffic' },
  { key: 'vehicle_orange', category: 'traffic' },
];

export class StickerGame extends Phaser.Scene {
  private selectedSticker = STICKERS[0].key;
  private selectedPlacedSticker: PlacedSticker | null = null;
  private placedStickers: PlacedSticker[] = [];
  private paletteItems: Phaser.GameObjects.Container[] = [];
  private themeButtons: Phaser.GameObjects.Text[] = [];
  private categoryButtons: Phaser.GameObjects.Text[] = [];
  private selectionIndicator!: Phaser.GameObjects.Graphics;
  private placedIndicator!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private activeThemeIndex = 0;
  private activeCategory: StickerCategory = 'animals';
  private sceneWidth = 0;

  constructor() {
    super({ key: 'StickerGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.sceneWidth = width - 155;
    this.selectedSticker = STICKERS[0].key;
    this.selectedPlacedSticker = null;
    this.placedStickers = [];
    this.paletteItems = [];
    this.themeButtons = [];
    this.categoryButtons = [];

    this.drawBackdrop();
    this.createSceneCanvas();

    const backBtn = this.add.image(40, 40, 'btn_back').setDepth(60).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    this.add.text(this.sceneWidth / 2, 36, '贴纸创作屋', {
      fontSize: '30px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);

    this.createGoalStrip();
    this.createThemePicker();
    this.createPalettePanel();
    this.createEditToolbar();
    this.createActionButtons();

    this.selectionIndicator = this.add.graphics().setDepth(55);
    this.placedIndicator = this.add.graphics().setDepth(58);
    this.refreshPalette();
    this.updateProgress();
    enhanceGameScene(this, 'StickerGame');
  }

  private drawBackdrop() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFFF8E1, 0xE0F7FA, 0xF1F8E9, 0xE3F2FD);
    bg.fillRect(0, 0, width, height);
  }

  private createSceneCanvas() {
    const { height } = this.scale;
    this.add.image(this.sceneWidth / 2, height / 2, THEMES[this.activeThemeIndex].bgKey)
      .setDisplaySize(this.sceneWidth, height)
      .setDepth(0);

    const vignette = this.add.graphics().setDepth(2);
    vignette.lineStyle(8, 0xffffff, 0.45);
    vignette.strokeRoundedRect(12, 72, this.sceneWidth - 24, height - 152, 24);

    const hitZone = this.add.rectangle(
      this.sceneWidth / 2,
      height / 2,
      this.sceneWidth,
      height,
      0xffffff,
      0,
    ).setDepth(1).setInteractive();

    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.placeSticker(pointer.x, pointer.y);
    });
  }

  private createGoalStrip() {
    const { height } = this.scale;
    const strip = this.add.graphics().setDepth(30);
    strip.fillStyle(0xffffff, 0.86);
    strip.fillRoundedRect(88, height - 86, 350, 54, 18);
    strip.lineStyle(3, 0x26A69A, 0.36);
    strip.strokeRoundedRect(88, height - 86, 350, 54, 18);

    this.progressText = this.add.text(108, height - 59, '', {
      fontSize: '18px',
      color: '#455A64',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(31);
  }

  private createThemePicker() {
    const x = 130;
    THEMES.forEach((theme, index) => {
      const button = this.add.text(x + index * 88, 84, theme.label, {
        fontSize: '18px',
        color: index === this.activeThemeIndex ? '#ffffff' : '#455A64',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        backgroundColor: index === this.activeThemeIndex ? this.toHex(theme.accent) : '#ffffffdd',
        padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setDepth(35).setInteractive({ useHandCursor: true });

      button.on('pointerdown', () => this.switchTheme(index));
      this.themeButtons.push(button);
    });
  }

  private createPalettePanel() {
    const { width, height } = this.scale;
    const panelX = width - 150;
    const panel = this.add.graphics().setDepth(40);
    panel.fillStyle(0xffffff, 0.94);
    panel.fillRoundedRect(panelX, 12, 138, height - 24, 20);
    panel.lineStyle(3, 0xB2DFDB, 0.8);
    panel.strokeRoundedRect(panelX, 12, 138, height - 24, 20);

    this.add.text(panelX + 69, 42, '贴纸库', {
      fontSize: '20px',
      color: '#37474F',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(41);

    (Object.keys(CATEGORY_LABELS) as StickerCategory[]).forEach((category, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const button = this.add.text(panelX + 39 + col * 60, 78 + row * 38, CATEGORY_LABELS[category], {
        fontSize: '14px',
        color: category === this.activeCategory ? '#ffffff' : '#546E7A',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        backgroundColor: category === this.activeCategory ? '#26A69A' : '#ECEFF1',
        padding: { x: 10, y: 7 },
      }).setOrigin(0.5).setDepth(42).setInteractive({ useHandCursor: true });

      button.on('pointerdown', () => {
        AudioManager.getInstance().playTap();
        this.activeCategory = category;
        this.refreshPalette();
      });
      this.categoryButtons.push(button);
    });
  }

  private refreshPalette() {
    const { width } = this.scale;
    const panelX = width - 150;
    this.paletteItems.forEach(item => item.destroy());
    this.paletteItems = [];
    this.selectionIndicator?.clear();

    this.categoryButtons.forEach((button, index) => {
      const category = (Object.keys(CATEGORY_LABELS) as StickerCategory[])[index];
      button.setColor(category === this.activeCategory ? '#ffffff' : '#546E7A');
      button.setBackgroundColor(category === this.activeCategory ? '#26A69A' : '#ECEFF1');
    });

    const choices = STICKERS.filter(sticker => sticker.category === this.activeCategory);
    choices.forEach((def, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = panelX + 42 + col * 58;
      const y = 160 + row * 74;
      const card = this.add.container(x, y).setDepth(44);
      const bg = this.add.graphics();
      bg.fillStyle(0xF7FBFC, 1);
      bg.fillRoundedRect(-25, -29, 50, 58, 14);
      bg.lineStyle(2, 0xCFD8DC, 0.8);
      bg.strokeRoundedRect(-25, -29, 50, 58, 14);
      const icon = this.add.image(0, 0, def.key).setDisplaySize(42, 42);
      card.add([bg, icon]);
      card.setSize(54, 62).setInteractive({ useHandCursor: true });
      card.setScale(0);
      this.tweens.add({ targets: card, scale: 1, duration: 220, delay: index * 45, ease: 'Back.easeOut' });
      card.on('pointerdown', () => this.selectSticker(def.key, card));
      this.paletteItems.push(card);

      if (def.key === this.selectedSticker) {
        this.time.delayedCall(20, () => this.drawPaletteSelection(card));
      }
    });

    if (!choices.some(def => def.key === this.selectedSticker)) {
      this.selectedSticker = choices[0]?.key ?? STICKERS[0].key;
      const first = this.paletteItems[0];
      if (first) this.time.delayedCall(20, () => this.drawPaletteSelection(first));
    }
  }

  private selectSticker(key: string, card: Phaser.GameObjects.Container) {
    this.selectedSticker = key;
    this.selectedPlacedSticker = null;
    this.placedIndicator.clear();
    AudioManager.getInstance().playTap();
    this.drawPaletteSelection(card);
    this.tweens.add({ targets: card, scale: 1.08, duration: 120, yoyo: true, ease: 'Sine.easeOut' });
  }

  private drawPaletteSelection(card: Phaser.GameObjects.Container) {
    this.selectionIndicator.clear();
    this.selectionIndicator.lineStyle(4, 0xFF7043, 0.95);
    this.selectionIndicator.strokeRoundedRect(card.x - 31, card.y - 35, 62, 70, 16);
  }

  private placeSticker(x: number, y: number) {
    if (!this.selectedSticker || x > this.sceneWidth - 18 || y < 76 || y > this.scale.height - 100) {
      showFloatingToast(this, '在画布里贴上它', 0xFFB300);
      return;
    }

    AudioManager.getInstance().playSuccess();
    const size = this.activeCategory === 'traffic' ? 82 : 74;
    const sticker = this.add.image(x, y, this.selectedSticker).setDepth(12).setDisplaySize(size, size) as PlacedSticker;
    sticker.baseSize = size;
    sticker.setInteractive({ useHandCursor: true, draggable: true });
    sticker.setScale(0);
    this.tweens.add({
      targets: sticker,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    const sparkle = this.add.image(x, y, 'star_gold').setDepth(14).setScale(0).setAlpha(0.8);
    this.tweens.add({
      targets: sparkle,
      scale: 1.35,
      alpha: 0,
      angle: 120,
      duration: 520,
      onComplete: () => sparkle.destroy(),
    });

    sticker.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.selectPlacedSticker(sticker);
    });

    sticker.on('dragstart', () => {
      this.selectPlacedSticker(sticker);
      AudioManager.getInstance().playDrag();
      this.tweens.add({ targets: sticker, scaleX: 1.12, scaleY: 1.12, duration: 100 });
    });

    sticker.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      sticker.x = Phaser.Math.Clamp(dragX, 34, this.sceneWidth - 34);
      sticker.y = Phaser.Math.Clamp(dragY, 100, this.scale.height - 118);
      this.drawPlacedSelection();
    });

    sticker.on('dragend', () => {
      this.tweens.add({ targets: sticker, scaleX: 1, scaleY: 1, duration: 120 });
      this.drawPlacedSelection();
    });

    this.placedStickers.push(sticker);
    this.selectPlacedSticker(sticker);
    this.updateProgress();
  }

  private createEditToolbar() {
    const { height } = this.scale;
    const tools = [
      { label: '小', action: () => this.resizeSelected(0.9) },
      { label: '大', action: () => this.resizeSelected(1.1) },
      { label: '转', action: () => this.rotateSelected() },
      { label: '删', action: () => this.deleteSelected() },
    ];

    tools.forEach((tool, index) => {
      const button = this.add.text(470 + index * 64, height - 59, tool.label, {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        backgroundColor: index === 3 ? '#EF5350' : '#546E7A',
        padding: { x: 15, y: 10 },
      }).setOrigin(0.5).setDepth(35).setInteractive({ useHandCursor: true });

      button.on('pointerdown', () => {
        if (!this.selectedPlacedSticker) {
          showFloatingToast(this, '先点一个已贴好的贴纸', 0xFFB300);
          return;
        }
        AudioManager.getInstance().playTap();
        tool.action();
      });
    });
  }

  private createActionButtons() {
    const { height } = this.scale;
    const clearBtn = this.add.text(62, height - 59, '清空', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#EF5350',
      padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setDepth(35).setInteractive({ useHandCursor: true });

    clearBtn.on('pointerdown', () => this.clearAllStickers());

    const doneBtn = this.add.text(this.sceneWidth - 78, height - 59, '完成作品', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#43A047',
      padding: { x: 22, y: 10 },
    }).setOrigin(0.5).setDepth(35).setInteractive({ useHandCursor: true });

    doneBtn.on('pointerdown', () => this.showComplete());
  }

  private switchTheme(index: number) {
    if (index === this.activeThemeIndex) return;
    this.activeThemeIndex = index;
    AudioManager.getInstance().playTap();
    this.children.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Image && THEMES.some(theme => child.texture.key === theme.bgKey)) {
        child.setTexture(THEMES[this.activeThemeIndex].bgKey).setDisplaySize(this.sceneWidth, this.scale.height);
      }
    });
    this.themeButtons.forEach((button, buttonIndex) => {
      button.setColor(buttonIndex === index ? '#ffffff' : '#455A64');
      button.setBackgroundColor(buttonIndex === index ? this.toHex(THEMES[index].accent) : '#ffffffdd');
    });
    showFloatingToast(this, `切换到${THEMES[index].label}场景`, THEMES[index].accent);
  }

  private selectPlacedSticker(sticker: PlacedSticker) {
    this.selectedPlacedSticker = sticker;
    sticker.setDepth(16);
    this.drawPlacedSelection();
  }

  private drawPlacedSelection() {
    this.placedIndicator.clear();
    if (!this.selectedPlacedSticker?.active) return;
    const sticker = this.selectedPlacedSticker;
    const radius = Math.max(sticker.displayWidth, sticker.displayHeight) / 2 + 10;
    this.placedIndicator.lineStyle(3, 0xffffff, 0.92);
    this.placedIndicator.strokeCircle(sticker.x, sticker.y, radius);
    this.placedIndicator.lineStyle(2, 0xFF7043, 0.95);
    this.placedIndicator.strokeCircle(sticker.x, sticker.y, radius + 5);
  }

  private resizeSelected(factor: number) {
    if (!this.selectedPlacedSticker) return;
    const sticker = this.selectedPlacedSticker;
    const nextWidth = Phaser.Math.Clamp(sticker.displayWidth * factor, 42, 130);
    const ratio = nextWidth / sticker.displayWidth;
    sticker.setDisplaySize(nextWidth, sticker.displayHeight * ratio);
    this.drawPlacedSelection();
  }

  private rotateSelected() {
    if (!this.selectedPlacedSticker) return;
    this.tweens.add({
      targets: this.selectedPlacedSticker,
      angle: this.selectedPlacedSticker.angle + 18,
      duration: 120,
      ease: 'Sine.easeOut',
      onUpdate: () => this.drawPlacedSelection(),
    });
  }

  private deleteSelected() {
    const sticker = this.selectedPlacedSticker;
    if (!sticker) return;
    this.placedStickers = this.placedStickers.filter(item => item !== sticker);
    this.selectedPlacedSticker = null;
    this.placedIndicator.clear();
    this.tweens.add({
      targets: sticker,
      scale: 0,
      alpha: 0,
      angle: sticker.angle + 25,
      duration: 180,
      onComplete: () => sticker.destroy(),
    });
    this.updateProgress();
  }

  private clearAllStickers() {
    if (this.placedStickers.length === 0) {
      showFloatingToast(this, '画布还是空的', 0xFFB300);
      return;
    }
    AudioManager.getInstance().playWrong();
    this.placedStickers.forEach((sticker, index) => {
      this.tweens.add({
        targets: sticker,
        scale: 0,
        alpha: 0,
        duration: 180,
        delay: index * 35,
        onComplete: () => sticker.destroy(),
      });
    });
    this.placedStickers = [];
    this.selectedPlacedSticker = null;
    this.placedIndicator.clear();
    this.updateProgress();
  }

  private updateProgress() {
    const count = this.placedStickers.length;
    const unique = new Set(this.placedStickers.map(sticker => sticker.texture.key)).size;
    const targetText = count >= 6 && unique >= 3 ? '已达成 3 星目标' : `再贴 ${Math.max(0, 6 - count)} 个，使用 ${Math.max(0, 3 - unique)} 种`;
    this.progressText?.setText(`创作目标：6 个贴纸 + 3 种类型  ·  ${targetText}`);
  }

  private showComplete() {
    const { width, height } = this.scale;
    const stickerCount = this.placedStickers.length;
    const uniqueCount = new Set(this.placedStickers.map(sticker => sticker.texture.key)).size;
    const starCount = stickerCount >= 6 && uniqueCount >= 3 ? 3 : stickerCount >= 4 && uniqueCount >= 2 ? 2 : 1;
    recordGameComplete(this, 'StickerGame', starCount, '贴纸作品完成了');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.45).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-215, -145, 430, 290, 28);
    bg.lineStyle(4, THEMES[this.activeThemeIndex].accent, 0.65);
    bg.strokeRoundedRect(-215, -145, 430, 290, 28);

    const title = this.add.text(0, -96, '作品完成', {
      fontSize: '34px',
      color: '#FF7043',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const themeText = this.add.text(0, -56, `${THEMES[this.activeThemeIndex].label}主题 · ${stickerCount} 个贴纸 · ${uniqueCount} 种图案`, {
      fontSize: '18px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    panel.add([bg, title, themeText]);

    for (let i = 0; i < 3; i++) {
      const star = this.add.image(-58 + i * 58, 8, i < starCount ? 'star_gold' : 'star_gray');
      star.setScale(0);
      panel.add(star);
      this.tweens.add({ targets: star, scale: 1, duration: 280, delay: i * 150, ease: 'Back.easeOut' });
    }

    const replayBtn = this.add.text(-72, 92, '再做一张', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#42A5F5',
      padding: { x: 22, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const keepBtn = this.add.text(90, 92, '继续装饰', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#66BB6A',
      padding: { x: 22, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    replayBtn.on('pointerdown', () => this.scene.restart());
    keepBtn.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
    });

    panel.add([replayBtn, keepBtn]);
    panel.setScale(0.86).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }

  private toHex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
