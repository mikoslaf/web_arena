import { NetworkManager } from '../network/NetworkManager.js';

/**
 * LobbyScreen – manages the pre-game lobby UI.
 *
 * Renders the lobby into #lobbyScreen (injected by index.html).
 * Fires a custom DOM event 'roomJoined' on window when the player
 * successfully creates or joins a room, containing:
 *   { detail: { network: NetworkManager, roomId, roomName, playerName, players } }
 */
export class LobbyScreen {
  constructor() {
    this.network = new NetworkManager();
    this._pollInterval = null;
    this._rooms = [];
    this._el = document.getElementById('lobbyScreen');
    this._nameInput = document.getElementById('playerNameInput');
    this._roomNameInput = document.getElementById('roomNameInput');
    this._createBtn = document.getElementById('createRoomBtn');
    this._roomListEl = document.getElementById('roomList');
    this._statusEl = document.getElementById('lobbyStatus');

    this._bindButtons();
    this._connect();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  async _connect() {
    console.log(`[LobbyScreen] Wywoływanie logiki _connect(), ustawienie statusu na "Łączenie z serwerem"`);
    this._setStatus('Łączenie z serwerem…', 'muted');
    try {
      await this.network.connect();
      console.log(`[LobbyScreen] connect() zakończone pomyślnie, status -> Połączono ✓`);
      this._setStatus('Połączono ✓', 'ok');

      this.network.on('roomList', (msg) => {
        console.log(`[LobbyScreen] Otrzymano event 'roomList', liczba pokoi: ${msg.rooms?.length || 0}`);
        this._rooms = msg.rooms || [];
        this._renderRoomList();
      });

      this.network.on('roomCreated', (msg) => {
        console.log(`[LobbyScreen] Otrzymano event 'roomCreated':`, msg);
        this._onEnterRoom(msg);
      });
      this.network.on('roomJoined',  (msg) => {
        console.log(`[LobbyScreen] Otrzymano event 'roomJoined':`, msg);
        this._onEnterRoom(msg);
      });

      this.network.on('disconnect', () => {
        console.warn(`[LobbyScreen] Otrzymano event 'disconnect', ustawiono interfejs na "Rozłączono"`);
        this._setStatus('Rozłączono z serwerem', 'error');
        clearInterval(this._pollInterval);
      });

      // Poll for room list every 3 s
      this.network.listRooms();
      this._pollInterval = setInterval(() => {
        if (this.network.connected) this.network.listRooms();
      }, 3000);

    } catch (err) {
      console.error(`[LobbyScreen] Błąd rzucony podczas _connect():`, err.message);
      this._setStatus('Brak serwera, ponawiam…', 'error');
      console.warn('[LobbyScreen] Stacktrace:', err);
      console.log(`[LobbyScreen] Zaplanowano ponowną próbę połączenia za 2s...`);
      setTimeout(() => this._connect(), 2000);
    }
  }

  _bindButtons() {
    this._createBtn.addEventListener('click', () => this._createRoom());
  }

  _createRoom() {
    const playerName = this._nameInput.value.trim() || 'Gracz';
    const roomName   = this._roomNameInput.value.trim() || `Pokój ${playerName}`;
    if (!this.network.connected) {
      this._setStatus('Brak połączenia z serwerem!', 'error');
      return;
    }
    this.network.createRoom(roomName, playerName);
  }

  _joinRoom(roomId) {
    const playerName = this._nameInput.value.trim() || 'Gracz';
    if (!this.network.connected) {
      this._setStatus('Brak połączenia z serwerem!', 'error');
      return;
    }
    this.network.joinRoom(roomId, playerName);
  }

  _onEnterRoom(msg) {
    clearInterval(this._pollInterval);

    const playerName = this._nameInput.value.trim() || 'Gracz';
    window.dispatchEvent(new CustomEvent('roomJoined', {
      detail: {
        network:    this.network,
        roomId:     msg.room.id,
        roomName:   msg.room.name,
        playerName,
        players:    msg.room.players,
      },
    }));
  }

  _renderRoomList() {
    if (this._rooms.length === 0) {
      this._roomListEl.innerHTML = '<p class="lobby-empty">Brak dostępnych pokojów. Utwórz nowy!</p>';
      return;
    }

    this._roomListEl.innerHTML = this._rooms.map(r => `
      <div class="room-card" id="room-${r.id}">
        <div class="room-info">
          <span class="room-name">${this._esc(r.name)}</span>
          <span class="room-players">${r.playerCount} gracz${this._plural(r.playerCount)}</span>
        </div>
        <button class="room-join-btn" data-room-id="${r.id}">DOŁĄCZ</button>
      </div>
    `).join('');

    this._roomListEl.querySelectorAll('.room-join-btn').forEach(btn => {
      btn.addEventListener('click', () => this._joinRoom(btn.dataset.roomId));
    });
  }

  _setStatus(text, level = 'muted') {
    if (!this._statusEl) return;
    this._statusEl.textContent = text;
    this._statusEl.className = `lobby-status lobby-status--${level}`;
  }

  _plural(n) {
    if (n === 1) return '';
    if (n >= 2 && n <= 4) return 'y';
    return 'y';
  }

  _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
