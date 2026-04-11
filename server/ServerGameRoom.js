const { randomUUID } = require('crypto');

const PLAYER_RADIUS = 18;

const POWERUP_TYPES = [
  { type: 'Medkit', weight: 2.5, radius: 14, ttl: 20 },
  { type: 'RapidFire', weight: 1.8, radius: 14, ttl: 18 },
  { type: 'Shield', weight: 1.5, radius: 14, ttl: 18 }
];

class ServerGameRoom {
  constructor(id, name, onBroadcast) {
    this.id = id;
    this.name = name;
    this.players = new Map(); // playerId -> { id, name, x, y, isAlive, ws }
    this.enemies = new Map(); // enemyId -> { id, type, x, y, speed, hp, maxHp }
    this.powerUps = new Map(); // powerUpId -> { id, type, x, y, radius, ttl }
    this.onBroadcast = onBroadcast;

    this.wave = 1;
    this.waveTimer = 0;
    this.spawnInterval = 4.0;
    this.spawnTimer = 1.5;
    this.maxEnemies = 20;
    this.waveDuration = 40;

    this.maxPowerUps = 4;
    this.powerUpMinInterval = 8;
    this.powerUpMaxInterval = 15;
    this.powerUpSpawnTimer = 6;

    // Arena bounds (zakĹ‚adamy typowe, klient musi byÄ‡ podobnego rozmiaru lub poinformowaÄ‡)
    // Aby byĹ‚o uniwersalnie: zakĹ‚adamy obszar bliski ekranowi.
    this.bounds = { x: 0, y: 0, w: 1200, h: 800 }; 

    this._lastTime = Date.now();
    this._interval = setInterval(() => this.update(), 50); // 20 FPS (update potworĂłw)
  }

  addPlayer(playerId, info) {
    this.players.set(playerId, { id: playerId, name: info.name, x: null, y: null, isAlive: true, score: 0, ws: info.ws });
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  updatePlayerState(playerId, state) {
    const p = this.players.get(playerId);
    if (p) {
      p.x = state.x;
      p.y = state.y;
      p.isAlive = state.isAlive;
    }
  }

  setBounds(bounds) {
    this.bounds = bounds;
  }

  hitEnemy(playerId, enemyId, damage) {
    const e = this.enemies.get(enemyId);
    if (!e) return;
    
    e.hp -= damage;
    if (e.hp <= 0) {
      const killer = this.players.get(playerId);
      const scoreValue = e.scoreValue || 0;
      if (killer) {
        killer.score += scoreValue;
      }

      this.enemies.delete(enemyId);
      this.onBroadcast(this, {
        type: 'enemyDied',
        enemyId,
        killerId: playerId,
        scoreValue,
        killerScore: killer ? killer.score : 0,
      });
    }
  }

  update() {
    const now = Date.now();
    const dt = (now - this._lastTime) / 1000;
    this._lastTime = now;

    let livingPlayers = 0;
    const targets = [];
    this.players.forEach(p => { 
      if (p.isAlive && p.x !== null) {
        livingPlayers++; 
        targets.push(p);
      }
    });

    if (livingPlayers > 0) {
      this.waveTimer += dt;
      if (this.waveTimer >= this.waveDuration) {
        this.waveTimer = 0;
        this.wave++;
        this.spawnInterval = Math.max(1.2, this.spawnInterval - 0.3);
        this.maxEnemies = Math.min(40, this.maxEnemies + 3);
      }

      if (this.enemies.size < this.maxEnemies) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawnTimer = this.spawnInterval;
          this.spawnEnemy();
        }
      }

      if (this.powerUps.size < this.maxPowerUps) {
        this.powerUpSpawnTimer -= dt;
        if (this.powerUpSpawnTimer <= 0) {
          this.powerUpSpawnTimer = this._nextPowerUpSpawnTime();
          this.spawnPowerUp();
        }
      }

      // Move enemies toward closest player
      this.enemies.forEach(e => {
        let closestDist = Infinity;
        let target = null;
        
        targets.forEach(p => {
          const dx = p.x - e.x;
          const dy = p.y - e.y;
          const dist = dx * dx + dy * dy;
          if (dist < closestDist) {
            closestDist = dist;
            target = { dx, dy, d: Math.sqrt(dist) };
          }
        });

        if (target && target.d > 0) {
          // simple collision avoid to not overlap all enemies? Skip to save CPU on server
          e.x += (target.dx / target.d) * e.speed * dt;
          e.y += (target.dy / target.d) * e.speed * dt;
        }
      });

      // Update power-up lifetime and resolve pickup once for all players.
      for (const pu of this.powerUps.values()) {
        pu.ttl -= dt;
        if (pu.ttl <= 0) {
          this.powerUps.delete(pu.id);
          continue;
        }

        let pickedBy = null;
        for (const p of targets) {
          const dx = p.x - pu.x;
          const dy = p.y - pu.y;
          const rr = PLAYER_RADIUS + pu.radius;
          if ((dx * dx + dy * dy) <= rr * rr) {
            pickedBy = p;
            break;
          }
        }

        if (pickedBy) {
          this.powerUps.delete(pu.id);
          this.onBroadcast(this, {
            type: 'powerUpTaken',
            powerUpId: pu.id,
            powerUpType: pu.type,
            playerId: pickedBy.id,
          });
        }
      }
    }

    // Broadcast state to room
    if (this.players.size > 0) {
      this.onBroadcast(this, {
        type: 'roomState',
        wave: this.wave,
        enemies: Array.from(this.enemies.values()),
        powerUps: Array.from(this.powerUps.values()),
      });
    }
  }

  spawnEnemy() {
    const types = [
      { type: 'Zombie', weight: 3, minWave: 1, hp: 50, speed: 60, radius: 15, scoreValue: 10 },
      { type: 'FastZombie', weight: 1, minWave: 2, hp: 30, speed: 120, radius: 12, scoreValue: 25 }
    ];

    const eligible = types.filter(t => t.minWave <= this.wave);
    if (!eligible.length) return;

    const totalWeight = eligible.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * totalWeight;
    let chosen = eligible[eligible.length - 1];
    for (const t of eligible) {
      r -= t.weight;
      if (r <= 0) { chosen = t; break; }
    }

    const pos = this._randomEdgePosition(chosen.radius);
    const enemyId = randomUUID();
    
    this.enemies.set(enemyId, {
      id: enemyId,
      type: chosen.type,
      x: pos.x,
      y: pos.y,
      hp: chosen.hp,
      maxHp: chosen.hp,
      speed: chosen.speed,
      radius: chosen.radius,
      scoreValue: chosen.scoreValue,
    });
  }

  spawnPowerUp() {
    if (!POWERUP_TYPES.length) return;

    const totalWeight = POWERUP_TYPES.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * totalWeight;
    let chosen = POWERUP_TYPES[POWERUP_TYPES.length - 1];
    for (const t of POWERUP_TYPES) {
      r -= t.weight;
      if (r <= 0) {
        chosen = t;
        break;
      }
    }

    const pos = this._randomInnerPosition();
    const id = randomUUID();
    this.powerUps.set(id, {
      id,
      type: chosen.type,
      x: pos.x,
      y: pos.y,
      radius: chosen.radius,
      ttl: chosen.ttl,
      maxTtl: chosen.ttl,
    });
  }

  _nextPowerUpSpawnTime() {
    return this.powerUpMinInterval + Math.random() * (this.powerUpMaxInterval - this.powerUpMinInterval);
  }

  _randomInnerPosition() {
    const { x, y, w, h } = this.bounds;
    const margin = 30;
    const rx = x + margin + Math.random() * Math.max(1, w - margin * 2);
    const ry = y + margin + Math.random() * Math.max(1, h - margin * 2);
    return { x: rx, y: ry };
  }

  _randomEdgePosition(radius = 14) {
    const { x, y, w, h } = this.bounds;
    const perimeter = 2 * (w + h);
    let t = Math.random() * perimeter;
    // Keep spawn point fully inside map so enemy does not clip into walls.
    const margin = Math.max(10, radius + 2);

    if (t < w) return { x: x + t, y: y + margin };
    t -= w;
    if (t < h) return { x: x + w - margin, y: y + t };
    t -= h;
    if (t < w) return { x: x + w - t, y: y + h - margin };
    t -= w;
    return { x: x + margin, y: y + h - t };
  }

  destroy() {
    clearInterval(this._interval);
  }
}

module.exports = ServerGameRoom;
