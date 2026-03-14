import { Vector2 } from '../Vector2.js';

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
  }

  addPlayer(player) { this.players.push(player); }
  addEnemy(enemy)   { this.enemies.push(enemy); }
  addBullet(bullet) { this.bullets.push(bullet); }

  /** Update all entities and check collisions */
  update(dt) {
    // Collect new bullets from players
    for (const p of this.players) {
      if (p.isAlive) {
        const newBullets = p.drainBullets();
        this.bullets.push(...newBullets);
      }
    }

    // Update bullets
    for (const b of this.bullets) b.update(dt);

    // Update enemies – assign nearest player as target
    for (const e of this.enemies) {
      if (!e.isAlive) continue;
      e.target = this._nearestAlivePlayer(e.position);
      e.update(dt);
    }

    // Update players
    for (const p of this.players) p.update(dt);

    // === Collision: bullet → enemy ===
    for (const b of this.bullets) {
      if (!b.isAlive) continue;
      for (const e of this.enemies) {
        if (!e.isAlive) continue;
        if (this._circles(b, e)) {
          e.takeDamage(b.damage);
          b.isAlive = false;
          this._spawnParticles(b.position, '#ffe066', 6);

          if (e.isDead && b.owner) {
            b.owner.addScore(e.scoreValue);
            this._spawnParticles(e.position, e.color, 12);
          }
          break;
        }
      }
    }

    // === Collision: enemy → player (contact damage) ===
    for (const e of this.enemies) {
      if (!e.isAlive) continue;
      for (const p of this.players) {
        if (!p.isAlive) continue;
        if (this._circles(e, p)) {
          p.takeDamage(e.damage * dt);
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
    // Keep dead players (show death screen) – just flag isAlive = false
  }
}
