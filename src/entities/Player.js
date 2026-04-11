import { Entity } from './Entity.js';
import { Bullet } from './Bullet.js';
import { Vector2 } from '../Vector2.js';

/**
 * Player – controlled by keyboard (WASD + Space)
 */
export class Player extends Entity {
  /**
   * @param {object}       opts
   * @param {Vector2}      opts.position
   * @param {InputManager} opts.input
   * @param {string}       opts.name
   * @param {string}       opts.color
   * @param {number}       opts.speed
   */
  constructor({ position, input, name = 'Player', color = '#42a5f5', speed = 220 } = {}) {
    super({ position, radius: 18, hp: 150, color });
    this.inputManager = input;
    this.name = name;
    this.speed = speed;
    this.score = 0;
    this.shootCooldown = 0;
    this.shootRate = 0.25; // seconds between shots
    this.bulletsFired = [];
    this.iframes = 0;       // invincibility frames after hit
    this.facing = new Vector2(1, 0); // last move direction

    // visual
    this._hitFlash = 0;
    this._deathAnim = 0;
    this._deathAnimDuration = 0.6;
    this._corpseSpawned = false;
  }

  update(dt) {
    if (!this.isAlive) {
      if (this._deathAnim > 0) this._deathAnim -= dt;
      return;
    }

    const input = this.inputManager;
    const dx = (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0);
    const dy = (input.isDown('KeyS') ? 1 : 0) - (input.isDown('KeyW') ? 1 : 0);
    const dir = new Vector2(dx, dy);

    if (dir.magnitudeSq > 0) {
      this.facing = dir.normalize();
    }

    this.velocity = dir.magnitudeSq > 0 ? dir.normalize().scale(this.speed) : new Vector2();
    this.position.addSelf(this.velocity.scale(dt));

    // Shoot
    this.shootCooldown -= dt;
    if (input.isDown('Space') && this.shootCooldown <= 0) {
      this.shootCooldown = this.shootRate;
      const bullet = new Bullet({
        position: this.position.add(this.facing.scale(this.radius + 6)),
        direction: this.facing.clone(),
        damage: 25,
        owner: this,
        color: '#ffe066',
      });
      this.bulletsFired.push(bullet);
    }

    // Cooldown iframes
    if (this.iframes > 0) this.iframes -= dt;
    if (this._hitFlash > 0) this._hitFlash -= dt;
  }

  takeDamage(amount, { bypassIframes = false } = {}) {
    if (!bypassIframes && this.iframes > 0) return;
    if (!bypassIframes) {
      this.iframes = 0.5;
    }
    this._hitFlash = 0.15;
    super.takeDamage(amount);
  }

  onDeath() {
    this._deathAnim = this._deathAnimDuration;
  }

  addScore(points) {
    this.score += points;
  }

  drainBullets() {
    const bullets = this.bulletsFired.splice(0);
    return bullets;
  }

  draw(ctx) {
    if (!this.isAlive && this._deathAnim <= 0) return;
    ctx.save();

    const isDying = !this.isAlive;
    const deathPct = isDying ? Math.max(0, this._deathAnim / this._deathAnimDuration) : 1;
    if (isDying) {
      ctx.globalAlpha = deathPct;
    }

    // Body glow on hit
    if (this._hitFlash > 0) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#f44336';
    }

    // Body
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this._hitFlash > 0 ? '#f44336' : this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Direction indicator (gun barrel)
    const tip = this.position.add(this.facing.scale(this.radius));
    ctx.beginPath();
    ctx.moveTo(this.position.x, this.position.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // HP bar
    if (this.isAlive) {
      this.drawHpBar(ctx);
    }

    // Name label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.position.x, this.position.y - this.radius - 12);
  }
}
