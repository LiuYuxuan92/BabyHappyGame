import Phaser from 'phaser';

interface Difference {
  x: number;
  y: number;
  radius: number;
  found: boolean;
}

export class FindDiffGame extends Phaser.Scene {
  private differences: Difference[] = [];
  private foundCount = 0;
  private totalDiffs = 0;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'FindDiffGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.differences = [];
    this.foundCount = 0;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xFCE4EC, 0xFCE4EC, 0xF8BBD0, 0xF8BBD0);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '🔍 找不同', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Status text
    this.statusText = this.add.text(width / 2, 70, '', {
      fontSize: '22px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    this.createScenes();
    this.updateStatus();
  }

  private createScenes() {
    const { width, height } = this.scale;

    const sceneW = width / 2 - 30;
    const sceneH = height - 130;
    const leftX = 15;
    const rightX = width / 2 + 15;
    const sceneY = 95;

    // Scene borders
    const border = this.add.graphics();
    border.lineStyle(3, 0x795548);
    border.strokeRoundedRect(leftX, sceneY, sceneW, sceneH, 12);
    border.strokeRoundedRect(rightX, sceneY, sceneW, sceneH, 12);

    // Labels
    this.add.text(leftX + sceneW / 2, sceneY + sceneH + 12, '原图', {
      fontSize: '16px',
      color: '#795548',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(rightX + sceneW / 2, sceneY + sceneH + 12, '找不同 (点这里)', {
      fontSize: '16px',
      color: '#E91E63',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Draw left scene (original)
    this.drawScene(leftX, sceneY, sceneW, sceneH, false);

    // Draw right scene (with differences)
    this.drawScene(rightX, sceneY, sceneW, sceneH, true);

    // Set up interactive area on right scene for tap detection
    const hitArea = this.add.rectangle(
      rightX + sceneW / 2,
      sceneY + sceneH / 2,
      sceneW,
      sceneH,
      0xffffff,
      0
    ).setInteractive({ useHandCursor: true });

    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.checkDifference(pointer.x, pointer.y);
    });
  }

  private drawScene(x: number, y: number, w: number, h: number, withDifferences: boolean) {
    const g = this.add.graphics();

    // Sky background
    g.fillStyle(0x87CEEB);
    g.fillRoundedRect(x, y, w, h, 12);

    // Ground
    const groundY = y + h * 0.7;
    g.fillStyle(0x4CAF50);
    g.fillRect(x, groundY, w, h * 0.3);
    // Round bottom corners
    g.fillStyle(0x4CAF50);
    g.fillRoundedRect(x, y + h - 24, w, 24, { tl: 0, tr: 0, bl: 12, br: 12 });

    // Sun - DIFFERENCE 1: different color
    const sunX = x + w * 0.82;
    const sunY = y + h * 0.15;
    const sunColor = withDifferences ? 0xFF5722 : 0xFFEB3B;
    g.fillStyle(sunColor);
    g.fillCircle(sunX, sunY, 28);

    // Sun rays
    g.lineStyle(3, sunColor);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const innerR = 30;
      const outerR = 40;
      g.beginPath();
      g.moveTo(sunX + Math.cos(angle) * innerR, sunY + Math.sin(angle) * innerR);
      g.lineTo(sunX + Math.cos(angle) * outerR, sunY + Math.sin(angle) * outerR);
      g.strokePath();
    }

    if (withDifferences) {
      this.differences.push({ x: sunX, y: sunY, radius: 40, found: false });
    }

    // Clouds
    g.fillStyle(0xffffff, 0.9);
    g.fillEllipse(x + w * 0.25, y + h * 0.12, 70, 30);
    g.fillEllipse(x + w * 0.55, y + h * 0.18, 60, 25);

    // DIFFERENCE 2: extra cloud on right
    if (withDifferences) {
      g.fillEllipse(x + w * 0.4, y + h * 0.28, 55, 22);
      this.differences.push({ x: x + w * 0.4, y: y + h * 0.28, radius: 35, found: false });
    }

    // House
    const houseX = x + w * 0.55;
    const houseY = groundY - 80;
    const houseW = 90;
    const houseH = 80;

    // House body
    g.fillStyle(0xFFCC80);
    g.fillRect(houseX, houseY, houseW, houseH);

    // Roof
    g.fillStyle(0xD32F2F);
    g.beginPath();
    g.moveTo(houseX - 10, houseY);
    g.lineTo(houseX + houseW / 2, houseY - 45);
    g.lineTo(houseX + houseW + 10, houseY);
    g.closePath();
    g.fillPath();

    // Door - DIFFERENCE 3: different color
    const doorColor = withDifferences ? 0x9C27B0 : 0x5D4037;
    g.fillStyle(doorColor);
    g.fillRect(houseX + houseW / 2 - 12, houseY + houseH - 40, 24, 40);

    // Door knob
    g.fillStyle(0xFFD700);
    g.fillCircle(houseX + houseW / 2 + 6, houseY + houseH - 20, 3);

    if (withDifferences) {
      this.differences.push({
        x: houseX + houseW / 2,
        y: houseY + houseH - 20,
        radius: 30,
        found: false,
      });
    }

    // Windows
    g.fillStyle(0x81D4FA);
    g.fillRect(houseX + 12, houseY + 15, 22, 22);
    g.fillRect(houseX + houseW - 34, houseY + 15, 22, 22);
    // Window cross
    g.lineStyle(2, 0xffffff);
    g.beginPath();
    g.moveTo(houseX + 23, houseY + 15);
    g.lineTo(houseX + 23, houseY + 37);
    g.moveTo(houseX + 12, houseY + 26);
    g.lineTo(houseX + 34, houseY + 26);
    g.strokePath();

    // Tree
    const treeX = x + w * 0.2;
    const treeY = groundY;

    // Trunk
    g.fillStyle(0x795548);
    g.fillRect(treeX - 8, treeY - 70, 16, 70);

    // Leaves
    g.fillStyle(0x2E7D32);
    g.fillCircle(treeX, treeY - 80, 35);
    g.fillCircle(treeX - 20, treeY - 60, 25);
    g.fillCircle(treeX + 20, treeY - 60, 25);

    // Flowers - DIFFERENCE 4: missing flower on right
    const flowerColors = [0xFF4081, 0xFFEB3B, 0xE040FB];
    const flowerPositions = [
      { fx: x + w * 0.15, fy: groundY + 20 },
      { fx: x + w * 0.35, fy: groundY + 25 },
      { fx: x + w * 0.75, fy: groundY + 18 },
    ];

    flowerPositions.forEach((pos, i) => {
      // Skip the second flower on the right scene (difference)
      if (withDifferences && i === 1) {
        this.differences.push({ x: pos.fx, y: pos.fy, radius: 30, found: false });
        return;
      }
      // Stem
      g.lineStyle(0, 0x000000, 0);
      g.fillStyle(0x388E3C);
      g.fillRect(pos.fx - 2, pos.fy - 12, 4, 16);
      // Petals
      g.fillStyle(flowerColors[i]);
      g.fillCircle(pos.fx, pos.fy - 16, 8);
      g.fillCircle(pos.fx - 6, pos.fy - 10, 6);
      g.fillCircle(pos.fx + 6, pos.fy - 10, 6);
      // Center
      g.fillStyle(0xFFEB3B);
      g.fillCircle(pos.fx, pos.fy - 12, 4);
    });

    this.totalDiffs = this.differences.length;
  }

  private checkDifference(px: number, py: number) {
    for (const diff of this.differences) {
      if (diff.found) continue;

      const dist = Phaser.Math.Distance.Between(px, py, diff.x, diff.y);
      if (dist <= diff.radius) {
        diff.found = true;
        this.foundCount++;
        this.showFoundCircle(diff.x, diff.y, diff.radius);
        this.updateStatus();

        if (this.foundCount >= this.totalDiffs) {
          this.time.delayedCall(600, () => this.showComplete());
        }
        return;
      }
    }

    // Wrong tap feedback
    this.showWrongTap(px, py);
  }

  private showFoundCircle(x: number, y: number, radius: number) {
    const circle = this.add.graphics();
    circle.lineStyle(4, 0xFF4081);
    circle.strokeCircle(x, y, radius);
    circle.setAlpha(0);

    this.tweens.add({
      targets: circle,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Star burst
    const star = this.add.image(x, y, 'star_gold').setScale(0);
    this.tweens.add({
      targets: star,
      scale: 1.5,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => star.destroy(),
    });

    const text = this.add.text(x, y - 30, '找到了!', {
      fontSize: '20px',
      color: '#E91E63',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  private showWrongTap(x: number, y: number) {
    const text = this.add.text(x, y, '✕', {
      fontSize: '28px',
      color: '#999999',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      alpha: 0,
      scale: 1.5,
      duration: 400,
      onComplete: () => text.destroy(),
    });
  }

  private updateStatus() {
    this.statusText.setText(`找到 ${this.foundCount}/${this.totalDiffs} 处不同`);
  }

  private showComplete() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 130, 400, 260, 24);

    this.add.text(width / 2, height / 2 - 70, '🎉 全部找到了！', {
      fontSize: '34px',
      color: '#E91E63',
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

    this.add.text(width / 2, height / 2 + 40, '你的眼睛真厉害！', {
      fontSize: '20px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    const nextBtn = this.add.text(width / 2, height / 2 + 85, '再来一次 🔄', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#E91E63',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => this.scene.restart());
  }
}
