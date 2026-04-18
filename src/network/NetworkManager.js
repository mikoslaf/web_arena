/**
 * NetworkManager – WebSocket client wrapper.
 *
 * Connects to the Arena game server and provides a typed message API.
 * All messages are JSON.  Callbacks are registered via `on(type, fn)`.
 */
export class NetworkManager {
  /**
   * @param {string} [url]  ws:// or wss:// URL (auto-detected from location by default)
   */
  constructor(url) {
    this._url = url || NetworkManager._autoUrl();
    /** @type {Map<string, Function[]>} */
    this._handlers = new Map();
    this._ws = null;
    this.connected = false;
    this.playerId = null;
  }

  /** Derive server URL from the current page location */
  static _autoUrl() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    // Always use same-origin endpoint and let nginx reverse-proxy to the WS server.
    return `${proto}://${location.host}/ws/`;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`[NetworkManager] Znaleziono adres URL do połączenia: ${this._url}`);
      console.log(`[NetworkManager] Rozpoczynamy podłączenie WebSocket...`);

      if (this._ws) {
        console.log(`[NetworkManager] Istniejące połączenie znalezione, zamykanie starego...`);
        this._ws.close();
      }

      try {
        this._ws = new WebSocket(this._url);
      } catch (e) {
        console.error(`[NetworkManager] Wyjątek krytyczny przy tworzeniu instancji WebSocket:`, e);
        return reject(e);
      }

      this._ws.addEventListener('open', () => {
        console.log(`[NetworkManager] WebSocket (open event): Połączenie nawiązane pomyślnie.`);
        this.connected = true;
        resolve();
      });

      this._ws.addEventListener('close', (ev) => {
        console.warn(`[NetworkManager] WebSocket (close event): rozłączony. Zakończenie czyste: ${ev.wasClean}, Kod: ${ev.code}, Powód: "${ev.reason}"`);
        this.connected = false;
        this._emit('disconnect', {});
      });

      this._ws.addEventListener('error', (e) => {
        console.error(`[NetworkManager] WebSocket (error event): Wystąpił błąd w transmisji. Sprawdź tab zakładki przeglądarki Network > WS`, e);
        reject(new Error('Nie można połączyć z serwerem.'));
      });

      this._ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'connected') {
            this.playerId = msg.playerId;
          }
          this._emit(msg.type, msg);
        } catch (e) {
          console.warn('[NetworkManager] Bad message', ev.data);
        }
      });
    });
  }

  disconnect() {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this.connected = false;
  }

  /**
   * Register a handler for a message type.
   * @param {string} type
   * @param {(msg: object) => void} fn
   * @returns {() => void}  unsubscribe function
   */
  on(type, fn) {
    if (!this._handlers.has(type)) this._handlers.set(type, []);
    this._handlers.get(type).push(fn);
    return () => {
      const arr = this._handlers.get(type);
      if (arr) this._handlers.set(type, arr.filter(h => h !== fn));
    };
  }

  // ── Game actions ───────────────────────────────────────────────────────────

  listRooms() {
    this._send({ type: 'listRooms' });
  }

  /**
   * @param {string} roomName
   * @param {string} playerName
   */
  createRoom(roomName, playerName) {
    this._send({ type: 'createRoom', roomName, playerName });
  }

  /**
   * @param {string} roomId
   * @param {string} playerName
   */
  joinRoom(roomId, playerName) {
    this._send({ type: 'joinRoom', roomId, playerName });
  }

  /**
   * Send local player state to the server (called every frame).
    * @param {{ x: number, y: number, angle: number, hp: number, score: number, isAlive: boolean, color: string, shieldActive?: boolean }} state
   */
  sendPlayerUpdate(state) {
    this._send({ type: 'playerUpdate', state });
  }

  /**
   * @param {{ x: number, y: number, vx: number, vy: number, damage: number }} bullet
   */
  sendBulletFired(bullet) {
    this._send({ type: 'bulletFired', bullet });
  }

  /**
   * @param {string} enemyId
   * @param {number} damage
   */
  sendEnemyHit(enemyId, damage) {
    this._send({ type: 'enemyHit', enemyId, damage });
  }

  /**
   * Notify server that a self-detonating enemy exploded on client side.
   * @param {string} enemyId
   */
  sendEnemyDetonated(enemyId) {
    this._send({ type: 'enemyDetonated', enemyId });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _send(data) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(data));
    }
  }

  _emit(type, data) {
    const handlers = this._handlers.get(type);
    if (handlers) handlers.forEach(fn => fn(data));
  }
}
