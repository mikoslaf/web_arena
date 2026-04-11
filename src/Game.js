import { Arena } from './Arena.js';
import { Player } from './entities/Player.js';
import { RemotePlayer } from './entities/RemotePlayer.js';
import { Bullet } from './entities/Bullet.js';
import { Zombie } from './entities/Zombie.js';
import { FastZombie } from './entities/FastZombie.js';
import { MedkitPowerUp } from './entities/powerups/MedkitPowerUp.js';
import { RapidFirePowerUp } from './entities/powerups/RapidFirePowerUp.js';
import { ShieldPowerUp } from './entities/powerups/ShieldPowerUp.js';
import { EntityManager } from './managers/EntityManager.js';
import { SpawnManager } from './managers/SpawnManager.js';
import { PowerUpManager } from './managers/PowerUpManager.js';
import { InputManager } from './managers/InputManager.js';
import { HUD } from './hud/HUD.js';
import { Vector2 } from './Vector2.js';

/**
 * Game – the main game class.
 * Orchestrates the game loop, all managers and the canvas.
 */
export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize', () => this._resize());

    // Systems
    this.input   = new InputManager();
    this.arena   = new Arena(canvas.width, canvas.height);
    this.em      = new EntityManager();
    this.em.setArenaBounds(this.arena.x, this.arena.y, this.arena.w, this.arena.h);

    this.em.onEnemyHit = (enemyId, damage, killerInfo) => {
      if (this.network) {
        this.network.sendEnemyHit(enemyId, damage);
      }
    };

    // Local player
    this.player = new Player({
      position: new Vector2(this.arena.centerX, this.arena.centerY),
      input: this.input,
      name: 'Gracz',
      color: '#42a5f5',
    });
    this.em.addPlayer(this.player);

    // Spawn manager
    this.spawner = new SpawnManager(this.em, this.arena.bounds);
    this.powerUps = new PowerUpManager(this.em, this.arena.bounds);

    // HUD
    this.hud = new HUD(this.player, this.em);

    this._lastTime = null;
    this._animId   = null;
  }

  start() {
    this.remotePlayersMap = new Map();
    this.em.setPowerUpAuthority(this.network ? 'server' : 'local');
    
    // Ustawienie nazwy gracza
    if (this.localPlayerName) {
      this.player.name = this.localPlayerName;
    }

    if (this.network) {
      // Inicjalizacja graczy już będących w lobby
      if (this.remotePlayersList) {
        this.remotePlayersList.forEach(p => {
          if (p.id !== this.network.playerId) {
            this._addRemotePlayer(p.id, p.name);
          }
        });
      }

      this.network.on('playerJoined', (msg) => {
        if (msg.playerId !== this.network.playerId) {
          this._addRemotePlayer(msg.playerId, msg.playerName);
        }
      });

      this.network.on('playerLeft', (msg) => {
        this._removeRemotePlayer(msg.playerId);
      });

      this.network.on('playerUpdate', (msg) => {
        const rp = this.remotePlayersMap.get(msg.playerId);
        if (rp) {
          rp.updateState(msg.state);
        }
      });

      this.network.on('bulletFired', (msg) => {
        if (msg.playerId === this.network.playerId) return;
        const rp = this.remotePlayersMap.get(msg.playerId);
        if (rp) {
          const b = msg.bullet;
          const bullet = new Bullet({
            position: new Vector2(b.x, b.y),
            direction: new Vector2(b.vx, b.vy).normalize(),
            owner: rp,
            damage: b.damage,
            color: '#ef5350'
          });
          bullet.velocity = new Vector2(b.vx, b.vy);
          this.em.addBullet(bullet);
        }
      });

      this.network.on('roomState', (msg) => {
        // Synchronizacja paska fali
        this.spawner.wave = msg.wave;
        
        // Zaktualizuj lub dodaj potwory
        const serverEnemies = msg.enemies;
        const currentEnemies = new Map();
        
        // Aktualizacja istniejacych
        for (const e of this.em.enemies) {
          if (e.id) currentEnemies.set(e.id, e);
        }

        const aliveIds = new Set();
        
        for (const se of serverEnemies) {
          aliveIds.add(se.id);
          let enemy = currentEnemies.get(se.id);
          
          if (!enemy) {
            // Spawn na podstawie typu
            if (se.type === 'FastZombie') {
              enemy = new FastZombie({ position: new Vector2(se.x, se.y) });
            } else {
              enemy = new Zombie({ position: new Vector2(se.x, se.y) });
            }
            enemy.id = se.id;
            enemy.hp = se.hp;
            enemy.maxHp = se.maxHp;
            this.em.addEnemy(enemy);
          } else {
            // Nadpisz pozycje i hp (można by tu zrobić lerp)
            enemy.position.x = se.x;
            enemy.position.y = se.y;
            enemy.hp = se.hp;
            enemy.maxHp = se.maxHp;
          }
        }
        
        // Usuniecie tych, których już nie ma na serwerze
        for (const e of this.em.enemies) {
          if (e.id && !aliveIds.has(e.id)) {
            e.isAlive = false;
          }
        }

        // Synchronizacja power-upów z serwera
        const serverPowerUps = msg.powerUps || [];
        const currentPowerUps = new Map();
        for (const pu of this.em.powerUps) {
          if (pu.serverManaged && pu.id) {
            currentPowerUps.set(pu.id, pu);
          }
        }

        const alivePowerUpIds = new Set();
        for (const spu of serverPowerUps) {
          alivePowerUpIds.add(spu.id);
          let powerUp = currentPowerUps.get(spu.id);
          if (!powerUp) {
            powerUp = this._createPowerUpByType(spu.type, new Vector2(spu.x, spu.y));
            if (!powerUp) continue;
            powerUp.id = spu.id;
            powerUp.serverManaged = true;
            this.em.addPowerUp(powerUp);
          } else {
            powerUp.position.x = spu.x;
            powerUp.position.y = spu.y;
          }
        }

        for (const pu of this.em.powerUps) {
          if (pu.serverManaged && pu.id && !alivePowerUpIds.has(pu.id)) {
            pu.isAlive = false;
          }
        }
      });

      this.network.on('powerUpTaken', (msg) => {
        const taken = this.em.powerUps.find(pu => pu.id === msg.powerUpId);
        if (taken) {
          taken.isAlive = false;
          this.em._spawnParticles(taken.position, taken.color || '#90caf9', 10);
        }

        if (msg.playerId === this.network.playerId) {
          this._applyPowerUpTypeToLocalPlayer(msg.powerUpType);
        }
      });

      this.network.on('enemyDied', (msg) => {
        const { enemyId, killerId } = msg;
        const enemy = this.em.enemies.find(e => e.id === enemyId);

        // Always award score from server event, even if the enemy was already cleaned up locally.
        if (killerId === this.network.playerId) {
          this.player.addScore(msg.scoreValue ?? 0);
        }

        if (enemy) {
          enemy.isAlive = false;
          enemy.hp = 0; // Ensure drawing death fx? EntityManager does it if we hit locally

          // Particle efx
          this.em._spawnParticles(enemy.position, enemy.color, 12);
        }
      });
    }

    this._animId = requestAnimationFrame((t) => this._loop(t));
  }

  _addRemotePlayer(id, name) {
    if (this.remotePlayersMap.has(id)) return;
    const rp = new RemotePlayer({
      id,
      name,
      position: new Vector2(this.arena.centerX, this.arena.centerY),
    });
    this.remotePlayersMap.set(id, rp);
    this.em.addPlayer(rp);
  }

  _removeRemotePlayer(id) {
    const rp = this.remotePlayersMap.get(id);
    if (rp) {
      rp.isAlive = false;
      this.remotePlayersMap.delete(id);
    }
  }

  stop() {
    if (this._animId) cancelAnimationFrame(this._animId);
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _resize() {
    this.canvas.width  = this.canvas.parentElement
      ? this.canvas.parentElement.clientWidth
      : window.innerWidth;
    this.canvas.height = this.canvas.parentElement
      ? this.canvas.parentElement.clientHeight
      : window.innerHeight;

    if (this.arena) {
      this.arena.resize(this.canvas.width, this.canvas.height);
      this.em?.setArenaBounds(this.arena.x, this.arena.y, this.arena.w, this.arena.h);
      this.powerUps?.setBounds(this.arena.bounds);
    }
  }

  _loop(timestamp) {
    const dt = Math.min((timestamp - (this._lastTime ?? timestamp)) / 1000, 0.05);
    this._lastTime = timestamp;

    // Flush one-shot key events
    this.input.flush();

    // Wysłanie danych do sieci PRZED update (bo drainBullets pochłania pociski)
    if (this.network) {
      // 1. Wysłanie strzałów tylko gdy gracz żyje
      if (this.player.isAlive) {
        for (const b of this.player.bulletsFired) {
          this.network.sendBulletFired({
            x: b.position.x, y: b.position.y,
            vx: b.velocity.x, vy: b.velocity.y,
            damage: b.damage
          });
        }
      }

      // 2. Stan gracza wysyłamy zawsze (także isAlive=false po śmierci)
      this.network.sendPlayerUpdate({
        x: this.player.position.x,
        y: this.player.position.y,
        angle: Math.atan2(this.player.facing.y, this.player.facing.x),
        hp: this.player.hp,
        score: this.player.score,
        isAlive: this.player.isAlive,
        color: this.player.color,
        shieldActive: this.player.shieldTimer > 0
      });
    }

    // Update
    if (this.player.isAlive) {
      if (!this.network) {
        this.spawner.update(dt);
      }
    }
    if (!this.network) {
      this.powerUps.update(dt);
    }
    this.em.update(dt);

    // HUD wave sync
    this.hud.setWave(this.spawner.wave);

    // Draw
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.arena.draw(ctx);
    this.em.draw(ctx);
    this.hud.draw(ctx);

    this._animId = requestAnimationFrame((t) => this._loop(t));
  }

  _createPowerUpByType(type, position) {
    switch (type) {
      case 'Medkit':
        return new MedkitPowerUp({ position });
      case 'RapidFire':
        return new RapidFirePowerUp({ position });
      case 'Shield':
        return new ShieldPowerUp({ position });
      default:
        return null;
    }
  }

  _applyPowerUpTypeToLocalPlayer(type) {
    const bonus = this._createPowerUpByType(type, this.player.position.clone());
    if (!bonus) return;
    bonus.applyTo(this.player);
  }
}
