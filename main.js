import { Game } from './src/Game.js';

// Create the game instance upfront (loads assets, sets up canvas)
const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

// Start the loop only after the user clicks "ROZPOCZNIJ GRĘ"
window.addEventListener('gameStart', () => {
  game.start();
}, { once: true });
