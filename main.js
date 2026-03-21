import { Game } from './src/Game.js';
import { LobbyScreen } from './src/lobby/LobbyScreen.js';

// Create the game instance upfront (loads assets, sets up canvas)
const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

// Initialize lobby screen UI and networking
const lobby = new LobbyScreen();

// Start the loop and switch screens on successful room join
window.addEventListener('roomJoined', (e) => {
  // Hide lobby, show canvas
  document.getElementById('lobbyScreen').style.display = 'none';
  canvas.style.display = 'block';

  // Inform the game instance about the established network
  game.network = e.detail.network;
  game.roomId = e.detail.roomId;
  game.localPlayerName = e.detail.playerName;

  // Render initialization
  window.dispatchEvent(new Event('resize'));
  game.start();
}, { once: true });
