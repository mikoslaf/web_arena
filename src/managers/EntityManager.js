import { Vector2 } from '../Vector2.js';
import { Corpse } from '../entities/Corpse.js';

/**
 * EntityManager – owns all live entities and handles collision detection.
 */
export class EntityManager {
  constructor() {
    /** @type {import('../entities/Player.js').Player[]} */
    this.players = [];
    /** @type {import('../entities/Enemy.js').Enemy[]} */
    this.enemies = [];
    /** @type {import('../entities/Bullet.js').Bullet[]} */
    this.bullets = [];

    /** Particle effects (visual only) */
    this.particles = [];
    /** Static corpses with timeout */
    this.corpses = [];
    /** Active power-ups on arena */
    this.powerUps = [];
    /** local | server */
    this.powerUpAuthority = 'local';
  }

  addPlayer(player) { this.players.push(player); }
  addEnemy(enemy)   { this.enemies.push(enemy); }
  addBullet(bullet) { this.bullets.push(bullet); }
  addCorpse(corpse) { this.corpses.push(corpse); }
  addPowerUp(powerUp) { this.powerUps.push(powerUp); }
  setPowerUpAuthority(authority) { this.powerUpAuthority = authority; }

  /** Update all entities and check collisions */
  update(dt) {
    // Collect new bullets from players
    for (const p of this.players) {
      if (p.isAlive) {
        const newBullets = typeof p.drainBullets === 'function' ? p.drainBullets() : [];
        this.bullets.push(...newBullets);
      }
    }

    // Update bullets
    for (const b of this.bullets) b.update(dt);

    // Update power-ups
    for (const pu of this.powerUps) pu.update(dt);

    // Update enemies – assign nearest player as target
    for (const e of this.enemies) {
      if (!e.isAlive) continue;
      e.target = this._nearestAlivePlayer(e.position);
      e.update(dt);
    }

    // Update players
    for (const p of this.players) p.update(dt);

    // Spawn static corpse once death animation is finished
    for (const p of this.players) {
      if (p.isAlive) continue;
      if (p._corpseSpawned) continue;
      if ((p._deathAnim || 0) > 0) continue;

      this.addCorpse(new Corpse({
        position: p.position,
        name: p.name,
        ttl: 30,
      }));
      p._corpseSpawned = true;
    }

    // === Collision: bullet → enemy & bullet → player (PVP) ===
    for (const b of this.bullets) {
      if (!b.isAlive) continue;

      // 1. Z wrogami (PvE)
      for (const e of this.enemies) {
        if (!e.isAlive) continue;
        if (this._circles(b, e)) {
          
          // Wysyłamy informację na serwer, jeśli pocisk jest nasz
          if (b.owner && b.owner.inputManager && this.onEnemyHit && e.id) {
            this.onEnemyHit(e.id, b.damage, b.owner);
          }

          e.takeDamage(b.damage);
          b.isAlive = false;
          this._spawnParticles(b.position, '#ffe066', 6);

          // Punkty naliczamy lokalnie tylko dla potworów bez ID (singleplayer)
          // Dla potworów z ID czekamy na "enemyDied" od serwera, ale możemy je schować
          if (e.isDead) {
             if (!e.id && b.owner) {
               b.owner.addScore(e.scoreValue);
             }
             this._spawnParticles(e.position, e.color, 12);
          }
          break;
        }
      }

      if (!b.isAlive) continue;

      // 2. Z innymi graczami (PvP)
      for (const p of this.players) {
        if (!p.isAlive) continue;
        // Pocisk nie zadaje obrażeń strzelcowi
        if (b.owner === p || p === b.owner) continue;

        if (this._circles(b, p)) {
          // Aby uniknąć podwójnego zliczania, każdy klient odejmuje HP "tylko własnemu graczowi" 
          // (lub strzelający narzuca DMG, zależy od modelu - my uznajemy, że cel odlicza lokalnie).
          // W prostym modelu zdejmujemy HP jeśli obiekt to P (instancja z inputManager - nasz własny), 
          // a jak trafiliśmy w Remote - to uszkody tylko na jego ekranie (u niego będzie to Player lokalnie).
          if (p.inputManager) {
            p.takeDamage(b.damage);
          } else if (b.owner && b.owner.inputManager) {
            // nasz pocisk uderza obcego (nabicie punktów na ten moment)
            b.owner.addScore(10); 
          }
          
          b.isAlive = false;
          this._spawnParticles(b.position, '#f44336', 8);
          break;
        }
      }
    }

    // === Collision: enemy → player (contact damage) ===
    // Sum contact DPS from all touching enemies in this frame.
    const contactDamageByPlayer = new Map();
    for (const e of this.enemies) {
      if (!e.isAlive) continue;
      for (const p of this.players) {
        if (!p.isAlive) continue;
        if (this._circles(e, p)) {
          const acc = contactDamageByPlayer.get(p) || 0;
          contactDamageByPlayer.set(p, acc + e.damage * dt);
        }
      }
    }

    for (const [p, damage] of contactDamageByPlayer) {
      p.takeDamage(damage, { bypassIframes: true });
    }

    // === Collision: player → power-up ===
    // In multiplayer the server is authoritative and handles pickup resolution.
    if (this.powerUpAuthority === 'local') {
      for (const pu of this.powerUps) {
        if (!pu.isAlive) continue;
        for (const p of this.players) {
          if (!p.isAlive) continue;
          if (!p.inputManager) continue;

          if (this._circles(pu, p)) {
            if (pu.applyTo(p)) {
              pu.isAlive = false;
              this._spawnParticles(pu.position, pu.color || '#90caf9', 10);
            }
            break;
          }
        }
      }
    }

    // === Arena wall clamp for players ===
    // (Arena will inject its bounds via setArenaBounds)
    if (this._arenaBounds) {
      const { x, y, w, h } = this._arenaBounds;
      for (const p of this.players) {
        if (!p.isAlive) continue;
        p.position.x = Math.max(x + p.radius, Math.min(x + w - p.radius, p.position.x));
        p.position.y = Math.max(y + p.radius, Math.min(y + h - p.radius, p.position.y));
      }
      // Keep enemies inside too
      for (const e of this.enemies) {
        if (!e.isAlive) continue;
        e.position.x = Math.max(x + e.radius, Math.min(x + w - e.radius, e.position.x));
        e.position.y = Math.max(y + e.radius, Math.min(y + h - e.radius, e.position.y));
      }
    }

    // Update particles
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 60 * dt; // gravity
    }

    // Update corpse timers
    for (const c of this.corpses) c.update(dt);

    // Cleanup dead entities
    this._cleanup();
  }

  setArenaBounds(x, y, w, h) {
    this._arenaBounds = { x, y, w, h };
  }

  draw(ctx) {
    // Particles (below entities)
    for (const pt of this.particles) {
      const alpha = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const e of this.enemies)  e.draw(ctx);
    for (const pu of this.powerUps) pu.draw(ctx);
    for (const c of this.corpses)  c.draw(ctx);
    for (const p of this.players)  p.draw(ctx);
    for (const b of this.bullets)  b.draw(ctx);
  }

  get aliveEnemies() { return this.enemies.filter(e => e.isAlive); }
  get alivePlayers() { return this.players.filter(p => p.isAlive); }
  get totalMonsters() { return this.aliveEnemies.length; }

  // ── Private helpers ──────────────────────────────────────────────────────

  _circles(a, b) {
    return a.position.distance(b.position) < a.radius + b.radius;
  }

  _nearestAlivePlayer(pos) {
    let nearest = null, minDist = Infinity;
    for (const p of this.players) {
      if (!p.isAlive) continue;
      const d = pos.distance(p.position);
      if (d < minDist) { minDist = d; nearest = p; }
    }
    return nearest;
  }

  _spawnParticles(pos, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x: pos.x, y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 3,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.7,
      });
    }
  }

  _cleanup() {
    this.bullets  = this.bullets.filter(b => b.isAlive);
    this.enemies  = this.enemies.filter(e => e.isAlive);
    this.particles = this.particles.filter(p => p.life > 0);
    this.corpses = this.corpses.filter(c => c.isAlive);
    this.powerUps = this.powerUps.filter(pu => pu.isAlive);

    // Remove dead remote players once their corpse exists; keep local player for HUD/game over.
    this.players = this.players.filter((p) => p.isAlive || !!p.inputManager);
  }
}
