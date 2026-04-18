import { Enemy } from './Enemy.js';

/**
 * ExploderZombie - rushes the target and detonates on contact.
 */
export class ExploderZombie extends Enemy {
  constructor({ position } = {}) {
    super({
      position,
      radius: 17,
      hp: 36,
      speed: 135,
      damage: 0,
      scoreValue: 30,
      color: '#ff7043',
      name: 'ExploderZombie',
    });

    this.explodeOnTouch = true;
    this.dealsContactDamage = false;
    this.explosionRadius = 72;
    this.explosionDamage = 46;

    this._pulse = Math.random() * Math.PI * 2;
  }

  onUpdate(dt) {
    this._pulse += dt * 9;
    this._chase(dt);
  }

  drawBody(ctx) {
    const flash = this._hitFlash > 0;
    const px = this.position.x;
    const py = this.position.y;
    const r = this.radius;

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = flash ? '#ffffff' : '#e64a19';
    ctx.fill();

    if (!flash) {
      const pulse = (Math.sin(this._pulse) + 1) * 0.5;
      ctx.strokeStyle = `rgba(255, 235, 59, ${0.25 + pulse * 0.55})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, r + 4 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fff176';
      ctx.beginPath();
      ctx.arc(px - r * 0.25, py - r * 0.15, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + r * 0.25, py - r * 0.15, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
