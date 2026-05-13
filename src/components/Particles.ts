import Phaser from 'phaser';

/**
 * Celebration particle effects using Phaser Graphics + tweens.
 * No particle plugin required.
 */

/** Burst of colorful circles flying outward with gravity, fading out */
export function showFireworks(scene: Phaser.Scene, x: number, y: number): void {
  const colors = [0xFF4444, 0x44FF44, 0x4444FF, 0xFFFF44, 0xFF44FF, 0x44FFFF, 0xFFA500, 0xFF69B4];
  const count = 24;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.2, 0.2);
    const speed = Phaser.Math.Between(150, 350);
    const color = Phaser.Utils.Array.GetRandom(colors);
    const size = Phaser.Math.Between(4, 10);

    const particle = scene.add.graphics();
    particle.fillStyle(color, 1);
    particle.fillCircle(0, 0, size);
    particle.setPosition(x, y);
    particle.setDepth(1000);

    const targetX = x + Math.cos(angle) * speed;
    const targetY = y + Math.sin(angle) * speed;

    scene.tweens.add({
      targets: particle,
      x: targetX,
      y: targetY + Phaser.Math.Between(50, 150), // gravity pull down
      alpha: 0,
      scale: Phaser.Math.FloatBetween(0.3, 0.8),
      duration: Phaser.Math.Between(600, 1200),
      ease: 'Cubic.easeOut',
      onComplete: () => particle.destroy(),
    });
  }
}

/** Full-screen confetti rain (small colored rectangles falling with rotation) */
export function showConfetti(scene: Phaser.Scene): void {
  const { width } = scene.scale;
  const colors = [0xFF4444, 0x44FF44, 0x4444FF, 0xFFFF44, 0xFF44FF, 0x44FFFF, 0xFFA500, 0xFF69B4, 0x9C27B0, 0x00BCD4];
  const count = 40;

  for (let i = 0; i < count; i++) {
    const color = Phaser.Utils.Array.GetRandom(colors);
    const startX = Phaser.Math.Between(0, width);
    const startY = Phaser.Math.Between(-100, -20);
    const w = Phaser.Math.Between(6, 14);
    const h = Phaser.Math.Between(4, 8);

    const particle = scene.add.graphics();
    particle.fillStyle(color, 1);
    particle.fillRect(-w / 2, -h / 2, w, h);
    particle.setPosition(startX, startY);
    particle.setDepth(1000);

    const drift = Phaser.Math.Between(-80, 80);
    const duration = Phaser.Math.Between(1500, 3000);
    const delay = Phaser.Math.Between(0, 800);

    scene.tweens.add({
      targets: particle,
      x: startX + drift,
      y: scene.scale.height + 50,
      angle: Phaser.Math.Between(-360, 360),
      alpha: { from: 1, to: 0.3 },
      duration,
      delay,
      ease: 'Sine.easeIn',
      onComplete: () => particle.destroy(),
    });
  }
}

/** Golden stars bursting from a point */
export function showStarBurst(scene: Phaser.Scene, x: number, y: number): void {
  const count = 12;
  const goldColors = [0xFFD700, 0xFFC107, 0xFFEB3B, 0xFFF176];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.15, 0.15);
    const speed = Phaser.Math.Between(80, 200);
    const color = Phaser.Utils.Array.GetRandom(goldColors);
    const size = Phaser.Math.Between(8, 16);

    const particle = scene.add.graphics();
    particle.setPosition(x, y);
    particle.setDepth(1000);

    // Draw a small star shape
    drawMiniStar(particle, 0, 0, size, color);

    const targetX = x + Math.cos(angle) * speed;
    const targetY = y + Math.sin(angle) * speed;

    scene.tweens.add({
      targets: particle,
      x: targetX,
      y: targetY + 30,
      alpha: 0,
      scale: Phaser.Math.FloatBetween(0.5, 1.5),
      angle: Phaser.Math.Between(-180, 180),
      duration: Phaser.Math.Between(500, 900),
      ease: 'Cubic.easeOut',
      onComplete: () => particle.destroy(),
    });
  }
}

function drawMiniStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, color: number): void {
  g.fillStyle(color, 1);
  const points = 5;
  const outer = size / 2;
  const inner = size / 5;
  const step = Math.PI / points;

  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = i * step - Math.PI / 2;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fillPath();
}
