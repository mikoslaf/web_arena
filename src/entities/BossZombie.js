import { Enemy } from './Enemy.js';
import { Vector2 } from '../Vector2.js';

function randomVariant() {
  return {
    hueShift: Math.floor(Math.random() * 46) - 15,
    spikes: 4 + Math.floor(Math.random() * 4),
    eyeColor: Math.random() > 0.5 ? '#ffeb3b' : '#ff8a65',
    scarOffset: (Math.random() - 0.5) * 10,
  };
}

/**
 * BossZombie – elite enemy spawned at wave transitions.
 * Special attacks:
 *  - Charge: fast lunge toward target.
 *  - Rage: temporary speed + contact damage boost.
 */
export class BossZombie extends Enemy {
  constructor({ position, wave = 1, variant = null } = {}) {
    const hp = 420 + (wave - 1) * 90;
    const damage = 24 + (wave - 1) * 2;
    super({
      position,
      radius: 32,
      hp,
      speed: 60,
      damage,
      scoreValue: 220 + (wave - 1) * 40,
      color: '#7b1fa2',
      name: 'BossZombie',
    });

    this.wave = wave;
    this.variant = variant || randomVariant();

    this._baseSpeed = this.speed;
    this._baseDamage = this.damage;

    this._chargeCooldown = 3.5 + Math.random() * 1.5;
    this._chargeTimer = 0;
    this._chargeDir = new Vector2(1, 0);

    this._rageCooldown = 7 + Math.random() * 2;
    this._rageTimer = 0;
  }

  onUpdate(dt) {
    // Rage mode: faster and deadlier for a short duration.
    this._rageCooldown -= dt;
    if (this._rageCooldown <= 0 && this._rageTimer <= 0) {
      this._rageTimer = 2.2;
      this._rageCooldown = 8 + Math.random() * 3;
    }

    const rageActive = this._rageTimer > 0;
    if (rageActive) {
      this._rageTimer -= dt;
      this.speed = this._baseSpeed * 1.35;
      this.damage = this._baseDamage * 2.0;
    } else {
      this.speed = this._baseSpeed;
      this.damage = this._baseDamage;
    }

    // Charge attack.
    this._chargeCooldown -= dt;
    if (this._chargeCooldown <= 0 && this._chargeTimer <= 0 && this.target && !this.target.isDead) {
      const toTarget = this.target.position.sub(this.position);
      if (toTarget.magnitudeSq > 64) {
        this._chargeDir = toTarget.normalize();
        this._chargeTimer = 0.75;
      }
      this._chargeCooldown = 4 + Math.random() * 2;
    }

    if (this._chargeTimer > 0) {
      this._chargeTimer -= dt;
      this.position.addSelf(this._chargeDir.scale(this.speed * 2.4 * dt));
      return;
    }

    this._chase(dt);
  }

  drawBody(ctx) {
    const flash = this._hitFlash > 0;
    const px = this.position.x;
    const py = this.position.y;
    const r = this.radius;
    const hue = 285 + this.variant.hueShift;
    const base = `hsl(${hue} 68% 36%)`;
    const dark = `hsl(${hue} 75% 24%)`;

    // Main body
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = flash ? '#ffffff' : base;
    ctx.fill();

    // Randomized spikes
    if (!flash) {
      ctx.fillStyle = dark;
      for (let i = 0; i < this.variant.spikes; i++) {
        const a = (Math.PI * 2 * i) / this.variant.spikes + Math.PI * 0.1;
        const sx = px + Math.cos(a) * (r + 1);
        const sy = py + Math.sin(a) * (r + 1);
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyes
      ctx.fillStyle = this.variant.eyeColor;
      ctx.beginPath();
      ctx.arc(px - r * 0.28, py - r * 0.18, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + r * 0.28, py - r * 0.18, r * 0.14, 0, Math.PI * 2);
      ctx.fill();

      // Scar line for variation
      ctx.strokeStyle = '#ffd180';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - r * 0.35, py + this.variant.scarOffset);
      ctx.lineTo(px + r * 0.35, py + this.variant.scarOffset + 5);
      ctx.stroke();
    }

    // Telegraphed aura during special attacks
    if (this._rageTimer > 0 || this._chargeTimer > 0) {
      const pulse = Math.sin(performance.now() * 0.012) * 1.8;
      ctx.strokeStyle = this._rageTimer > 0 ? 'rgba(255,82,82,0.85)' : 'rgba(255,213,79,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, r + 8 + pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
