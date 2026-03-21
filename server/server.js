/**
 * Arena – WebSocket Game Server
 * Handles rooms and broadcasts game state between players in the same room.
 *
 * Message protocol (JSON):
 *   Client → Server:
 *     { type: 'createRoom', roomName, playerName }
 *     { type: 'joinRoom',   roomId,   playerName }
 *     { type: 'listRooms' }
 *     { type: 'playerUpdate', state: { x, y, angle, hp, score, isAlive } }
 *     { type: 'bulletFired',  bullet: { x, y, vx, vy, damage } }
 *
 *   Server → Client:
 *     { type: 'roomCreated',  room: { id, name, players } }
 *     { type: 'roomJoined',   room: { id, name, players }, playerId }
 *     { type: 'roomList',     rooms: [{ id, name, playerCount }] }
 *     { type: 'playerJoined', playerId, playerName }
 *     { type: 'playerLeft',   playerId }
 *     { type: 'playerUpdate', playerId, state }
 *     { type: 'bulletFired',  playerId, bullet }
 *     { type: 'error',        message }
 */

const { WebSocketServer, WebSocket } = require('ws');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

/** @type {Map<string, Room>} */
const rooms = new Map();

/** @type {Map<WebSocket, ClientInfo>} */
const clients = new Map();

/**
 * @typedef {{ id: string, name: string, players: Map<string, PlayerInfo> }} Room
 * @typedef {{ playerId: string, playerName: string, roomId: string|null, ws: WebSocket }} ClientInfo
 * @typedef {{ id: string, name: string }} PlayerInfo
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(room, data, excludeWs = null) {
  for (const [ws, client] of clients) {
    if (client.roomId === room.id && ws !== excludeWs) {
      send(ws, data);
    }
  }
}

function broadcastRoomList() {
  const roomList = getRoomList();
  for (const [ws] of clients) {
    send(ws, { type: 'roomList', rooms: roomList });
  }
}

function getRoomList() {
  return [...rooms.values()].map(r => ({
    id: r.id,
    name: r.name,
    playerCount: r.players.size,
  }));
}

function getPlayersInfo(room) {
  return [...room.players.values()];
}

function leaveRoom(ws) {
  const client = clients.get(ws);
  if (!client || !client.roomId) return;

  const room = rooms.get(client.roomId);
  if (room) {
    room.players.delete(client.playerId);
    broadcast(room, { type: 'playerLeft', playerId: client.playerId });

    // Clean up empty rooms
    if (room.players.size === 0) {
      rooms.delete(room.id);
    }
  }

  client.roomId = null;
  broadcastRoomList();
}

// ── Message Handlers ──────────────────────────────────────────────────────────

const handlers = {
  listRooms(ws) {
    send(ws, { type: 'roomList', rooms: getRoomList() });
  },

  createRoom(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;

    // Leave existing room first
    leaveRoom(ws);

    const roomId = randomUUID();
    const room = {
      id: roomId,
      name: (msg.roomName || 'Pokój').slice(0, 32),
      players: new Map(),
    };

    /** @type {PlayerInfo} */
    const playerInfo = { id: client.playerId, name: client.playerName };
    room.players.set(client.playerId, playerInfo);
    rooms.set(roomId, room);
    client.roomId = roomId;

    send(ws, {
      type: 'roomCreated',
      room: {
        id: room.id,
        name: room.name,
        players: getPlayersInfo(room),
      },
      playerId: client.playerId,
    });

    broadcastRoomList();
    console.log(`[room] Created "${room.name}" (${roomId}) by ${client.playerName}`);
  },

  joinRoom(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;

    const room = rooms.get(msg.roomId);
    if (!room) {
      send(ws, { type: 'error', message: 'Pokój nie istnieje.' });
      return;
    }

    // Leave existing room first
    leaveRoom(ws);

    /** @type {PlayerInfo} */
    const playerInfo = { id: client.playerId, name: client.playerName };
    room.players.set(client.playerId, playerInfo);
    client.roomId = room.id;

    // Notify the joining player
    send(ws, {
      type: 'roomJoined',
      room: {
        id: room.id,
        name: room.name,
        players: getPlayersInfo(room),
      },
      playerId: client.playerId,
    });

    // Notify other players in the room
    broadcast(room, {
      type: 'playerJoined',
      playerId: client.playerId,
      playerName: client.playerName,
    }, ws);

    broadcastRoomList();
    console.log(`[room] ${client.playerName} joined "${room.name}" (${room.id})`);
  },

  playerUpdate(ws, msg) {
    const client = clients.get(ws);
    if (!client || !client.roomId) return;

    const room = rooms.get(client.roomId);
    if (!room) return;

    broadcast(room, {
      type: 'playerUpdate',
      playerId: client.playerId,
      state: msg.state,
    }, ws);
  },

  bulletFired(ws, msg) {
    const client = clients.get(ws);
    if (!client || !client.roomId) return;

    const room = rooms.get(client.roomId);
    if (!room) return;

    broadcast(room, {
      type: 'bulletFired',
      playerId: client.playerId,
      bullet: msg.bullet,
    }, ws);
  },
};

// ── Connection ────────────────────────────────────────────────────────────────

wss.on('listening', () => {
  console.log(`\n[Server Startup] WebSocket server is officially listening on 0.0.0.0:${PORT}`);
});

wss.on('error', (err) => {
  console.error(`[Server Error] Podstawowy błąd instancji WebSocketServer:`, err);
});

wss.on('connection', (ws, req) => {
  const playerId = randomUUID();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  console.log(`[ws-connect] NOWE ODDERZENIE! Z IP: ${clientIp}, URL: ${req.url}, User-Agent: ${req.headers['user-agent']}`);

  /** @type {ClientInfo} */
  const client = {
    playerId,
    playerName: `Gracz_${playerId.slice(0, 4)}`,
    roomId: null,
    ws,
  };
  clients.set(ws, client);

  console.log(`[ws-connect] Gracz przyjęty i połączony z ID: ${playerId}`);

  // Send current room list on connect
  send(ws, { type: 'roomList', rooms: getRoomList() });
  // Send the assigned player ID
  send(ws, { type: 'connected', playerId });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    // Update player name from every message if provided
    if (msg.playerName) {
      client.playerName = String(msg.playerName).slice(0, 24);
    }

    const handler = handlers[msg.type];
    if (handler) {
      handler(ws, msg);
    }
  });

  ws.on('close', () => {
    leaveRoom(ws);
    clients.delete(ws);
    console.log(`[ws] Client disconnected: ${playerId}`);
  });

  ws.on('error', (err) => {
    console.error(`[ws] Error for ${playerId}:`, err.message);
  });
});

console.log(`Arena WebSocket server running on ws://0.0.0.0:${PORT}`);
