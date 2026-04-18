import { Enemy } from './Enemy.js';
import { Bullet } from './Bullet.js';
import { Vector2 } from '../Vector2.js';

/**
 * ShooterZombie - keeps medium distance and fires projectiles at the target.
 */
export class ShooterZombie extends Enemy {
  constructor({ position } = {}) {
    super({
      position,
      radius: 16,
      hp: 55,
      speed: 95,
      damage: 6,
      scoreValue: 35,
      color: '#5c6bc0',
      name: 'ShooterZombie',
    });

    this.shootCooldown = 0.9 + Math.random() * 0.6;
    this.preferredDistance = 230;
    this._strafePhase = Math.random() * Math.PI * 2;
    this._bulletsFired = [];
  }

  onUpdate(dt) {
    if (!this.target || this.target.isDead) return;

    this._strafePhase += dt * 3.2;

    const toTarget = this.target.position.sub(this.position);
    const dist = toTarget.magnitude;
    if (dist > 0.0001) {
      const dir = toTarget.scale(1 / dist);
      const perp = new Vector2(-dir.y, dir.x);

      // Approach when too far, retreat when too close, and strafe constantly.
      const distanceError = dist - this.preferredDistance;
      const radialSpeed = Math.max(-1, Math.min(1, distanceError / 90));
      const move = dir.scale(radialSpeed).add(perp.scale(Math.sin(this._strafePhase) * 0.7));
      this.position.addSelf(move.normalize().scale(this.speed * dt));
    }

    this.shootCooldown -= dt;
    if (this.shootCooldown <= 0 && dist > 60) {
      this.shootCooldown = 1.0 + Math.random() * 0.7;

      const spread = (Math.random() - 0.5) * 0.22;
      const angle = Math.atan2(toTarget.y, toTarget.x) + spread;
      const direction = Vector2.fromAngle(angle);

      const bullet = new Bullet({
        position: this.position.add(direction.scale(this.radius + 5)),
        direction,
        speed: 340,
        damage: 14,
        owner: this,
        color: '#ff8a65',
      });
      bullet.radius = 4;
      bullet.ttl = 2.0;
      bullet.faction = 'enemy';

      this._bulletsFired.push(bullet);
    }
  }

  drainBullets() {
    return this._bulletsFired.splice(0);
  }

  drawBody(ctx) {
    const flash = this._hitFlash > 0;
    const px = this.position.x;
    const py = this.position.y;
    const r = this.radius;

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = flash ? '#ffffff' : '#3949ab';
    ctx.fill();

    if (!flash) {
      // Visor
      ctx.fillStyle = '#b3e5fc';
      ctx.beginPath();
      ctx.ellipse(px, py - r * 0.1, r * 0.55, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cannon
      ctx.strokeStyle = '#ffcc80';
      ctx.lineWidth = 3;
      const target = this.target && !this.target.isDead ? this.target.position.sub(this.position).normalize() : new Vector2(1, 0);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + target.x * (r + 8), py + target.y * (r + 8));
      ctx.stroke();
    }
  }
}
