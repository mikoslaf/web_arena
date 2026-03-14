import { Enemy } from './Enemy.js';
import { Vector2 } from '../Vector2.js';

/**
 * FastZombie – fast, fragile, high-score monster.
 * Example of a second enemy type added alongside Zombie.
 */
export class FastZombie extends Enemy {
  constructor({ position } = {}) {
    super({
      position,
      radius: 13,
      hp: 30,
      speed: 175,
      damage: 8,
      scoreValue: 25,
      color: '#ef5350',
      name: 'Runner',
    });
    this._zigzag = 0;
  }

  onUpdate(dt) {
    this._zigzag += dt * 6;
    // Zigzag towards player
    if (!this.target || this.target.isDead) return;
    const toTarget = this.target.position.sub(this.position);
    const dist = toTarget.magnitude;
    if (dist < 1) return;

    const perp = new Vector2(-toTarget.y / dist, toTarget.x / dist);
    const zigzagAmount = dist < 120 ? 0 : 60; // stop zigzag close-range
    const dir = toTarget.normalize().add(perp.scale(Math.sin(this._zigzag) * zigzagAmount / dist));
    this.position.addSelf(dir.normalize().scale(this.speed * dt));
  }

  drawBody(ctx) {
    const flash = this._hitFlash > 0;
    const px = this.position.x;
    const py = this.position.y;
    const r = this.radius;

    // Sleek diamond/capsule shape
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = flash ? '#ffffff' : '#c62828';
    ctx.fill();

    if (!flash) {
      // Eyes – narrow angry slits
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.ellipse(px - r * 0.3, py - r * 0.1, r * 0.2, r * 0.1, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(px + r * 0.3, py - r * 0.1, r * 0.2, r * 0.1, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Speed lines
      ctx.strokeStyle = 'rgba(255,160,0,0.5)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const oy = (i - 1) * r * 0.35;
        ctx.beginPath();
        ctx.moveTo(px - r * 1.5, py + oy);
        ctx.lineTo(px - r, py + oy);
        ctx.stroke();
      }
    }
  }
}
