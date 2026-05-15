import Phaser from 'phaser';
import { enhanceGameScene, recordGameComplete } from '../../components/GameExperience';

interface Cell {
  row: number;
  col: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export class MazeGame extends Phaser.Scene {
  private grid: Cell[][] = [];
  private gridSize = 7;
  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private player!: Phaser.GameObjects.Arc;
  private playerRow = 0;
  private playerCol = 0;
  private goalRow = 0;
  private goalCol = 0;
  private isDragging = false;
  private isComplete = false;
  private level = 1;
  private wallGraphics!: Phaser.GameObjects.Graphics;
  private trailGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'MazeGame' });
  }

  create() {
    const { width, height } = this.scale;
    this.isComplete = false;
    this.isDragging = false;

    // Adjust grid size based on level
    this.gridSize = this.level <= 2 ? 5 : 7;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xE8F5E9, 0xE8F5E9, 0xC8E6C9, 0xC8E6C9);
    bg.fillRect(0, 0, width, height);

    // Back button
    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Title
    this.add.text(width / 2, 35, '🌟 走迷宫', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    enhanceGameScene(this, 'MazeGame');

    // Level indicator
    this.add.text(width - 20, 35, `第${this.level}关`, {
      fontSize: '22px',
      color: '#666666',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // Instruction
    this.add.text(width / 2, height - 20, '拖动小球走到星星处', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Calculate maze dimensions
    const mazeAreaHeight = height - 140;
    const mazeAreaWidth = width - 60;
    this.cellSize = Math.floor(Math.min(mazeAreaWidth, mazeAreaHeight) / this.gridSize);
    const mazeWidth = this.cellSize * this.gridSize;
    const mazeHeight = this.cellSize * this.gridSize;
    this.offsetX = (width - mazeWidth) / 2;
    this.offsetY = (height - mazeHeight) / 2 + 20;

    // Generate maze
    this.generateMaze();

    // Draw maze
    this.drawMaze();

    // Place player at top-left
    this.playerRow = 0;
    this.playerCol = 0;

    // Place goal at bottom-right
    this.goalRow = this.gridSize - 1;
    this.goalCol = this.gridSize - 1;

    // Draw goal (star)
    const goalX = this.offsetX + this.goalCol * this.cellSize + this.cellSize / 2;
    const goalY = this.offsetY + this.goalRow * this.cellSize + this.cellSize / 2;
    const goalStar = this.add.image(goalX, goalY, 'star_gold');
    goalStar.setDisplaySize(this.cellSize * 0.6, this.cellSize * 0.6);
    this.tweens.add({
      targets: goalStar,
      scale: goalStar.scaleX * 1.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Trail graphics (drawn behind player)
    this.trailGraphics = this.add.graphics();

    // Draw player
    const playerX = this.offsetX + this.playerCol * this.cellSize + this.cellSize / 2;
    const playerY = this.offsetY + this.playerRow * this.cellSize + this.cellSize / 2;
    const playerRadius = this.cellSize * 0.3;
    this.player = this.add.circle(playerX, playerY, playerRadius, 0xFF5722);
    this.player.setStrokeStyle(3, 0xE64A19);

    // Entrance animation
    this.player.setScale(0);
    this.tweens.add({
      targets: this.player,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Setup drag input
    this.setupInput();
  }

  private generateMaze() {
    // Initialize grid
    this.grid = [];
    for (let row = 0; row < this.gridSize; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        this.grid[row][col] = {
          row,
          col,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
        };
      }
    }

    // Recursive backtracker algorithm
    const stack: Cell[] = [];
    const startCell = this.grid[0][0];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Phaser.Math.Between(0, neighbors.length - 1)];
        this.removeWallBetween(current, next);
        next.visited = true;
        stack.push(next);
      }
    }
  }

  private getUnvisitedNeighbors(cell: Cell): Cell[] {
    const neighbors: Cell[] = [];
    const { row, col } = cell;

    if (row > 0 && !this.grid[row - 1][col].visited) neighbors.push(this.grid[row - 1][col]);
    if (row < this.gridSize - 1 && !this.grid[row + 1][col].visited) neighbors.push(this.grid[row + 1][col]);
    if (col > 0 && !this.grid[row][col - 1].visited) neighbors.push(this.grid[row][col - 1]);
    if (col < this.gridSize - 1 && !this.grid[row][col + 1].visited) neighbors.push(this.grid[row][col + 1]);

    return neighbors;
  }

  private removeWallBetween(a: Cell, b: Cell) {
    const rowDiff = b.row - a.row;
    const colDiff = b.col - a.col;

    if (rowDiff === -1) {
      a.walls.top = false;
      b.walls.bottom = false;
    } else if (rowDiff === 1) {
      a.walls.bottom = false;
      b.walls.top = false;
    } else if (colDiff === -1) {
      a.walls.left = false;
      b.walls.right = false;
    } else if (colDiff === 1) {
      a.walls.right = false;
      b.walls.left = false;
    }
  }

  private drawMaze() {
    this.wallGraphics = this.add.graphics();

    // Draw cell backgrounds with alternating soft colors
    const bgGraphics = this.add.graphics();
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const x = this.offsetX + col * this.cellSize;
        const y = this.offsetY + row * this.cellSize;
        const color = (row + col) % 2 === 0 ? 0xFFFFFF : 0xF1F8E9;
        bgGraphics.fillStyle(color, 0.8);
        bgGraphics.fillRect(x, y, this.cellSize, this.cellSize);
      }
    }

    // Draw walls with thick colorful lines
    const wallColors = [0x5C6BC0, 0x7E57C2, 0x26A69A, 0x42A5F5, 0xAB47BC];
    const wallThickness = Math.max(4, this.cellSize * 0.08);

    this.wallGraphics.lineStyle(wallThickness, wallColors[this.level % wallColors.length], 1);

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.grid[row][col];
        const x = this.offsetX + col * this.cellSize;
        const y = this.offsetY + row * this.cellSize;

        if (cell.walls.top) {
          this.wallGraphics.beginPath();
          this.wallGraphics.moveTo(x, y);
          this.wallGraphics.lineTo(x + this.cellSize, y);
          this.wallGraphics.strokePath();
        }
        if (cell.walls.right) {
          this.wallGraphics.beginPath();
          this.wallGraphics.moveTo(x + this.cellSize, y);
          this.wallGraphics.lineTo(x + this.cellSize, y + this.cellSize);
          this.wallGraphics.strokePath();
        }
        if (cell.walls.bottom) {
          this.wallGraphics.beginPath();
          this.wallGraphics.moveTo(x, y + this.cellSize);
          this.wallGraphics.lineTo(x + this.cellSize, y + this.cellSize);
          this.wallGraphics.strokePath();
        }
        if (cell.walls.left) {
          this.wallGraphics.beginPath();
          this.wallGraphics.moveTo(x, y);
          this.wallGraphics.lineTo(x, y + this.cellSize);
          this.wallGraphics.strokePath();
        }
      }
    }

    // Draw outer border thicker
    const outerThickness = wallThickness * 1.5;
    this.wallGraphics.lineStyle(outerThickness, wallColors[this.level % wallColors.length], 1);
    this.wallGraphics.strokeRect(
      this.offsetX,
      this.offsetY,
      this.cellSize * this.gridSize,
      this.cellSize * this.gridSize
    );
  }

  private setupInput() {
    // Make the whole scene respond to pointer for drag movement
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isComplete) return;
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.player.x, this.player.y);
      if (dist < this.cellSize * 0.8) {
        this.isDragging = true;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.isComplete) return;
      this.handleDragMove(pointer);
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
  }

  private handleDragMove(pointer: Phaser.Input.Pointer) {
    // Determine which cell the pointer is in
    const col = Math.floor((pointer.x - this.offsetX) / this.cellSize);
    const row = Math.floor((pointer.y - this.offsetY) / this.cellSize);

    // Check bounds
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return;

    // Only allow movement to adjacent cells
    const rowDiff = row - this.playerRow;
    const colDiff = col - this.playerCol;

    // Must be adjacent (one step)
    if (Math.abs(rowDiff) + Math.abs(colDiff) !== 1) return;

    // Check if wall blocks movement
    if (this.isWallBlocking(this.playerRow, this.playerCol, row, col)) return;

    // Move player
    const oldRow = this.playerRow;
    const oldCol = this.playerCol;
    this.playerRow = row;
    this.playerCol = col;

    const targetX = this.offsetX + col * this.cellSize + this.cellSize / 2;
    const targetY = this.offsetY + row * this.cellSize + this.cellSize / 2;

    // Draw trail
    this.trailGraphics.fillStyle(0xFFCC80, 0.6);
    this.trailGraphics.fillCircle(this.player.x, this.player.y, this.cellSize * 0.15);

    // Animate player movement
    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: 80,
      ease: 'Linear',
    });

    // Check if reached goal
    if (this.playerRow === this.goalRow && this.playerCol === this.goalCol) {
      this.isComplete = true;
      this.isDragging = false;
      this.time.delayedCall(200, () => this.onMazeComplete());
    }
  }

  private isWallBlocking(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const cell = this.grid[fromRow][fromCol];
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;

    if (rowDiff === -1) return cell.walls.top;
    if (rowDiff === 1) return cell.walls.bottom;
    if (colDiff === -1) return cell.walls.left;
    if (colDiff === 1) return cell.walls.right;

    return true;
  }

  private onMazeComplete() {
    const { width, height } = this.scale;

    // Player celebration animation
    this.tweens.add({
      targets: this.player,
      scale: 1.5,
      duration: 200,
      yoyo: true,
      repeat: 2,
    });

    // Particle-like star burst
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const star = this.add.image(this.player.x, this.player.y, 'star_gold');
      star.setScale(0.3);
      this.tweens.add({
        targets: star,
        x: this.player.x + Math.cos(angle) * 60,
        y: this.player.y + Math.sin(angle) * 60,
        alpha: 0,
        scale: 0.8,
        duration: 600,
        delay: i * 50,
        onComplete: () => star.destroy(),
      });
    }

    this.time.delayedCall(800, () => this.showComplete());
  }

  private showComplete() {
    const { width, height } = this.scale;
    recordGameComplete(this, 'MazeGame', Math.min(this.level, 3), '找到出口了');

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 300 });

    // Panel
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 130, 400, 260, 24);

    this.add.text(width / 2, height / 2 - 70, '🎉 到达终点！', {
      fontSize: '36px',
      color: '#4CAF50',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 30, `第${this.level}关完成`, {
      fontSize: '22px',
      color: '#666666',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // Stars
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(width / 2 - 50 + i * 50, height / 2 + 20, 'star_gold');
      star.setScale(0);
      this.tweens.add({
        targets: star,
        scale: 1,
        duration: 300,
        delay: i * 200,
        ease: 'Back.easeOut',
      });
    }

    // Next level button
    const nextBtn = this.add.text(width / 2, height / 2 + 80, '下一关 ▶', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#4CAF50',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => {
      this.level++;
      this.scene.restart();
    });
  }
}
