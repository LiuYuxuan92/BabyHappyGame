import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { SortingGame } from './scenes/games/SortingGame';
import { PuzzleGame } from './scenes/games/PuzzleGame';
import { MatchingGame } from './scenes/games/MatchingGame';
import { PianoGame } from './scenes/games/PianoGame';
import { RhythmGame } from './scenes/games/RhythmGame';
import { CountingGame } from './scenes/games/CountingGame';
import { SizeSortGame } from './scenes/games/SizeSortGame';
import { StickerGame } from './scenes/games/StickerGame';
import { CompareGame } from './scenes/games/CompareGame';
import { ColoringGame } from './scenes/games/ColoringGame';
import { ShapeGame } from './scenes/games/ShapeGame';
import { DressUpGame } from './scenes/games/DressUpGame';
import { FoodSortGame } from './scenes/games/FoodSortGame';
import { ConnectDotsGame } from './scenes/games/ConnectDotsGame';
import { MazeGame } from './scenes/games/MazeGame';
import { FindDiffGame } from './scenes/games/FindDiffGame';
import { ShadowMatchGame } from './scenes/games/ShadowMatchGame';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  backgroundColor: '#87CEEB',
  scene: [BootScene, MenuScene, SortingGame, PuzzleGame, MatchingGame, PianoGame, RhythmGame, CountingGame, SizeSortGame, StickerGame, CompareGame, ColoringGame, ShapeGame, DressUpGame, FoodSortGame, ConnectDotsGame, MazeGame, FindDiffGame, ShadowMatchGame],
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  input: {
    activePointers: 3,
  },
};

const game = new Phaser.Game(config);

const loading = document.getElementById('loading');
if (loading) loading.style.display = 'none';
