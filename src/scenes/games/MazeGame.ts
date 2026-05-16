import Phaser from 'phaser';
import { AudioManager } from '../../components/AudioManager';
import { enhanceGameScene, recordGameComplete, showFloatingToast } from '../../components/GameExperience';
import { showStarBurst } from '../../components/Particles';

interface Cell {
  row: number;
  col: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

interface MazeLevel {
  title: string;
  prompt: string;
  gridSize: number;
  playerKey: string;
  accent: number;
  bg: 'garden' | 'ocean' | 'city';
}

const LEVELS: MazeLevel[] = [
  { title: '草地小路', prompt: '先走 5x5 小迷宫', gridSize: 5, playerKey: 'animal_dog', accent: 0x66BB6A, bg: 'garden' },
  { title: '海边弯路', prompt: '路线更长一点', gridSize: 6, playerKey: 'animal_penguin', accent: 0x03A9F4, bg: 'ocean' },
  { title: '城市出口', prompt: '挑战 7x7 迷宫', gridSize: 7, playerKey: 'vehicle_blue', accent: 0xFF7043, bg: 'city' },
];

export class MazeGame extends Phaser.Scene {
  private grid: Cell[][] = [];
  private gridSize = 5;
  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private player!: Phaser.GameObjects.Image;
  private goalStar!: Phaser.GameObjects.Image;
  private playerRow = 0;
  private playerCol = 0;
  private goalRow = 0;
  private goalCol = 0;
  private levelIndex = 0;
  private steps = 0;
  private bumps = 0;
  private hintsUsed = 0;
  private isDragging = false;
  private isComplete = false;
  private lastBlockedKey = '';
  private wallGraphics!: Phaser.GameObjects.Graphics;
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private hintGraphics!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  constructor() {
    super({ key: 'MazeGame' });
  }

  init(data?: { levelIndex?: number; steps?: number; bumps?: number; hintsUsed?: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
    this.steps = data?.steps ?? 0;
    this.bumps = data?.bumps ?? 0;
    this.hintsUsed = data?.hintsUsed ?? 0;
  }

  create() {
    this.audio = AudioManager.getInstance();
    this.audio.init(this);
    this.isComplete = false;
    this.isDragging = false;
    this.lastBlockedKey = '';

    const { width } = this.scale;
    const level = LEVELS[this.levelIndex];
    this.gridSize = level.gridSize;
    this.drawBackground(level);

    const backBtn = this.add.image(40, 40, 'btn_back').setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.audio.playTap();
      this.scene.start('MenuScene');
    });

    this.add.text(width / 2, 34, '迷宫探险队', {
      fontSize: '34px',
      color: '#263238',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5);
    enhanceGameScene(this, 'MazeGame');

    this.add.text(width / 2, 70, `${this.levelIndex + 1}/${LEVELS.length}  ${level.title} · ${level.prompt}`, {
      fontSize: '20px',
      color: '#546E7A',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.statusText = this.add.text(width - 24, 34, '', {
      fontSize: '19px',
      color: '#455A64',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#ffffffdd',
      padding: { x: 12, y: 7 },
    }).setOrigin(1, 0.5);

    const hintBtn = this.add.text(width - 24, 72, '提示', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#26A69A',
      padding: { x: 16, y: 8 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    hintBtn.on('pointerdown', () => this.showHintPath());

    this.calculateMazeLayout();
    this.generateMaze();
    this.drawMaze(level);
    this.placeActors(level);
    this.setupInput();
    this.updateStatus();
  }

  private drawBackground(level: MazeLevel) {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    if (level.bg === 'ocean') {
      bg.fillGradientStyle(0xD9F7FF, 0xB2EBF2, 0xE0F7FA, 0x80DEEA);
    } else if (level.bg === 'city') {
      bg.fillGradientStyle(0xFFF8E1, 0xE1F5FE, 0xF3E5F5, 0xCFD8DC);
    } else {
      bg.fillGradientStyle(0xE8F5E9, 0xE3F2FD, 0xFFFDE7, 0xC8E6C9);
    }
    bg.fillRect(0, 0, width, height);

    bg.fillStyle(0xffffff, 0.32);
    bg.fillRoundedRect(70, 104, width - 140, height - 150, 34);
    bg.lineStyle(4, 0xffffff, 0.42);
    bg.strokeRoundedRect(70, 104, width - 140, height - 150, 34);

    if (level.bg === 'ocean') {
      for (let i = 0; i < 14; i++) {
        const bubble = this.add.circle(76 + i * 58, 126 + (i % 5) * 66, 6 + (i % 3) * 4, 0xffffff, 0.22);
        this.tweens.add({ targets: bubble, y: bubble.y - 20, alpha: 0.08, duration: 1200 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const flower = this.add.image(66 + i * 182, height - 34, `flower_${i % 6}`).setScale(0.62).setAlpha(0.55);
        this.tweens.add({ targets: flower, y: flower.y - 4, duration: 900 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  private calculateMazeLayout() {
    const { width, height } = this.scale;
    const mazeAreaHeight = height - 170;
    const mazeAreaWidth = width - 140;
    this.cellSize = Math.floor(Math.min(mazeAreaWidth, mazeAreaHeight) / this.gridSize);
    const mazeWidth = this.cellSize * this.gridSize;
    const mazeHeight = this.cellSize * this.gridSize;
    this.offsetX = (width - mazeWidth) / 2;
    this.offsetY = (height - mazeHeight) / 2 + 28;
  }

  private generateMaze() {
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
        const next = Phaser.Utils.Array.GetRandom(neighbors);
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

  private drawMaze(level: MazeLevel) {
    const mazeWidth = this.cellSize * this.gridSize;
    const mazeHeight = this.cellSize * this.gridSize;
    const board = this.add.graphics();
    board.fillStyle(0xffffff, 0.86);
    board.fillRoundedRect(this.offsetX - 18, this.offsetY - 18, mazeWidth + 36, mazeHeight + 36, 24);
    board.lineStyle(5, level.accent, 0.28);
    board.strokeRoundedRect(this.offsetX - 18, this.offsetY - 18, mazeWidth + 36, mazeHeight + 36, 24);

    const cellBg = this.add.graphics();
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const x = this.offsetX + col * this.cellSize;
        const y = this.offsetY + row * this.cellSize;
        cellBg.fillStyle((row + col) % 2 === 0 ? 0xffffff : 0xF1F8E9, 0.75);
        cellBg.fillRect(x, y, this.cellSize, this.cellSize);
      }
    }

    this.trailGraphics = this.add.graphics();
    this.hintGraphics = this.add.graphics();
    this.wallGraphics = this.add.graphics();
    const wallThickness = Math.max(4, this.cellSize * 0.08);
    this.wallGraphics.lineStyle(wallThickness, level.accent, 0.95);

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.grid[row][col];
        const x = this.offsetX + col * this.cellSize;
        const y = this.offsetY + row * this.cellSize;
        if (cell.walls.top) this.wallGraphics.lineBetween(x, y, x + this.cellSize, y);
        if (cell.walls.right) this.wallGraphics.lineBetween(x + this.cellSize, y, x + this.cellSize, y + this.cellSize);
        if (cell.walls.bottom) this.wallGraphics.lineBetween(x, y + this.cellSize, x + this.cellSize, y + this.cellSize);
        if (cell.walls.left) this.wallGraphics.lineBetween(x, y, x, y + this.cellSize);
      }
    }
    this.wallGraphics.lineStyle(wallThickness * 1.35, level.accent, 1);
    this.wallGraphics.strokeRect(this.offsetX, this.offsetY, mazeWidth, mazeHeight);
  }

  private placeActors(level: MazeLevel) {
    this.playerRow = 0;
    this.playerCol = 0;
    this.goalRow = this.gridSize - 1;
    this.goalCol = this.gridSize - 1;

    const goal = this.cellCenter(this.goalRow, this.goalCol);
    this.goalStar = this.add.image(goal.x, goal.y, 'star_gold').setDisplaySize(this.cellSize * 0.58, this.cellSize * 0.58);
    this.tweens.add({ targets: this.goalStar, scale: this.goalStar.scaleX * 1.18, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const start = this.cellCenter(0, 0);
    this.player = this.add.image(start.x, start.y, level.playerKey).setDisplaySize(this.cellSize * 0.58, this.cellSize * 0.58);
    this.player.setInteractive({ useHandCursor: true });
    this.player.setScale(0);
    this.tweens.add({ targets: this.player, scale: 1, duration: 320, ease: 'Back.easeOut' });
  }

  private setupInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isComplete) return;
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.player.x, this.player.y);
      if (dist < this.cellSize * 0.78) {
        this.isDragging = true;
        this.lastBlockedKey = '';
        return;
      }
      this.tryMoveToPointer(pointer, true);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.isComplete) return;
      this.tryMoveToPointer(pointer, false);
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      this.lastBlockedKey = '';
    });
  }

  private tryMoveToPointer(pointer: Phaser.Input.Pointer, countBlocked: boolean) {
    const col = Math.floor((pointer.x - this.offsetX) / this.cellSize);
    const row = Math.floor((pointer.y - this.offsetY) / this.cellSize);
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return;
    if (row === this.playerRow && col === this.playerCol) return;

    const rowDiff = row - this.playerRow;
    const colDiff = col - this.playerCol;
    if (Math.abs(rowDiff) + Math.abs(colDiff) !== 1) return;

    if (this.isWallBlocking(this.playerRow, this.playerCol, row, col)) {
      const key = `${this.playerRow},${this.playerCol}->${row},${col}`;
      if (countBlocked || key !== this.lastBlockedKey) {
        this.bumpWall(key);
      }
      return;
    }

    this.movePlayer(row, col);
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

  private bumpWall(key: string) {
    this.lastBlockedKey = key;
    this.bumps++;
    this.audio.playWrong();
    this.cameras.main.shake(120, 0.0015);
    this.tweens.add({ targets: this.player, angle: this.player.angle + 8, duration: 45, yoyo: true, repeat: 3 });
    showFloatingToast(this, '这里有墙，换条路', 0xFFB300);
    this.updateStatus();
  }

  private movePlayer(row: number, col: number) {
    const from = this.cellCenter(this.playerRow, this.playerCol);
    const target = this.cellCenter(row, col);
    this.trailGraphics.fillStyle(LEVELS[this.levelIndex].accent, 0.28);
    this.trailGraphics.fillCircle(from.x, from.y, this.cellSize * 0.16);
    this.playerRow = row;
    this.playerCol = col;
    this.steps++;
    this.audio.playTap();
    this.hintGraphics.clear();
    this.tweens.add({ targets: this.player, x: target.x, y: target.y, duration: 90, ease: 'Linear' });
    this.updateStatus();

    if (row === this.goalRow && col === this.goalCol) {
      this.isComplete = true;
      this.isDragging = false;
      this.time.delayedCall(180, () => this.finishLevel());
    }
  }

  private cellCenter(row: number, col: number): { x: number; y: number } {
    return {
      x: this.offsetX + col * this.cellSize + this.cellSize / 2,
      y: this.offsetY + row * this.cellSize + this.cellSize / 2,
    };
  }

  private showHintPath() {
    if (this.isComplete) return;
    const path = this.findPath();
    if (path.length < 2) return;
    this.hintsUsed++;
    this.audio.playTap();
    showFloatingToast(this, '黄色路线能走到终点', 0x26A69A);
    this.hintGraphics.clear();
    this.hintGraphics.lineStyle(Math.max(5, this.cellSize * 0.09), 0xFFD54F, 0.78);
    this.hintGraphics.beginPath();
    const start = this.cellCenter(path[0].row, path[0].col);
    this.hintGraphics.moveTo(start.x, start.y);
    path.slice(1).forEach(cell => {
      const point = this.cellCenter(cell.row, cell.col);
      this.hintGraphics.lineTo(point.x, point.y);
    });
    this.hintGraphics.strokePath();
    this.tweens.add({ targets: this.hintGraphics, alpha: 0, duration: 900, delay: 1000, onComplete: () => {
      this.hintGraphics.clear();
      this.hintGraphics.setAlpha(1);
    } });
    this.updateStatus();
  }

  private findPath(): { row: number; col: number }[] {
    const queue: { row: number; col: number }[] = [{ row: this.playerRow, col: this.playerCol }];
    const seen = new Set<string>([`${this.playerRow},${this.playerCol}`]);
    const prev = new Map<string, string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.row === this.goalRow && current.col === this.goalCol) break;
      this.getOpenNeighbors(current.row, current.col).forEach(next => {
        const key = `${next.row},${next.col}`;
        if (seen.has(key)) return;
        seen.add(key);
        prev.set(key, `${current.row},${current.col}`);
        queue.push(next);
      });
    }

    const goalKey = `${this.goalRow},${this.goalCol}`;
    if (!seen.has(goalKey)) return [];
    const path: { row: number; col: number }[] = [];
    let key = goalKey;
    while (key) {
      const [row, col] = key.split(',').map(Number);
      path.unshift({ row, col });
      const next = prev.get(key);
      if (!next) break;
      key = next;
    }
    return path;
  }

  private getOpenNeighbors(row: number, col: number): { row: number; col: number }[] {
    const result: { row: number; col: number }[] = [];
    if (row > 0 && !this.isWallBlocking(row, col, row - 1, col)) result.push({ row: row - 1, col });
    if (row < this.gridSize - 1 && !this.isWallBlocking(row, col, row + 1, col)) result.push({ row: row + 1, col });
    if (col > 0 && !this.isWallBlocking(row, col, row, col - 1)) result.push({ row, col: col - 1 });
    if (col < this.gridSize - 1 && !this.isWallBlocking(row, col, row, col + 1)) result.push({ row, col: col + 1 });
    return result;
  }

  private finishLevel() {
    const level = LEVELS[this.levelIndex];
    this.audio.playSuccess();
    showStarBurst(this, this.player.x, this.player.y);
    showStarBurst(this, this.goalStar.x, this.goalStar.y);
    this.tweens.add({ targets: this.player, scale: 1.22, duration: 170, yoyo: true, repeat: 2, ease: 'Back.easeOut' });

    if (this.levelIndex < LEVELS.length - 1) {
      showFloatingToast(this, '找到出口，下一关', level.accent);
      this.time.delayedCall(900, () => {
        this.scene.restart({
          levelIndex: this.levelIndex + 1,
          steps: this.steps,
          bumps: this.bumps,
          hintsUsed: this.hintsUsed,
        });
      });
      return;
    }

    this.time.delayedCall(900, () => this.showComplete());
  }

  private updateStatus() {
    this.statusText?.setText(`步 ${this.steps}  撞墙 ${this.bumps}  提示 ${this.hintsUsed}`);
  }

  private showComplete() {
    const { width, height } = this.scale;
    const stars = this.bumps <= 3 && this.hintsUsed <= 1 ? 3 : this.bumps <= 8 && this.hintsUsed <= 4 ? 2 : 1;
    recordGameComplete(this, 'MazeGame', stars, '迷宫全部找到出口');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x263238, 0.42).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(-220, -145, 440, 290, 28);
    bg.lineStyle(4, 0x66BB6A, 0.68);
    bg.strokeRoundedRect(-220, -145, 440, 290, 28);

    const title = this.add.text(0, -92, '迷宫探险完成', {
      fontSize: '34px',
      color: '#43A047',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const detail = this.add.text(0, -50, `步数 ${this.steps} · 撞墙 ${this.bumps} · 提示 ${this.hintsUsed}`, {
      fontSize: '20px',
      color: '#607D8B',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
    panel.add([bg, title, detail]);

    for (let i = 0; i < 3; i++) {
      const star = this.add.image(-58 + i * 58, 10, i < stars ? 'star_gold' : 'star_gray');
      star.setScale(0);
      panel.add(star);
      this.tweens.add({ targets: star, scale: 1, duration: 300, delay: i * 170, ease: 'Back.easeOut' });
    }

    const againBtn = this.add.text(0, 92, '再走一次', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#43A047',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    againBtn.on('pointerdown', () => {
      this.audio.playTap();
      overlay.destroy();
      this.scene.restart({ levelIndex: 0, steps: 0, bumps: 0, hintsUsed: 0 });
    });
    panel.add(againBtn);
    panel.setScale(0.86).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }
}
