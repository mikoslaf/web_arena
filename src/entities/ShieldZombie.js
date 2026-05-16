import { Enemy } from './Enemy.js';
import { Vector2 } from '../Vector2.js';

const SIDES = ['top', 'right', 'bottom', 'left'];

/**
 * ShieldZombie - can only be damaged from one random side.
 */
export class ShieldZombie extends Enemy {
  constructor({ position } = {}) {
    super({
      position,
      radius: 19,
      hp: 110,
      speed: 78,
      damage: 14,
      scoreValue: 45,
      color: '#78909c',
      name: 'ShieldZombie',
    });

    this.vulnerableSide = SIDES[Math.floor(Math.random() * SIDES.length)];
    this._pulse = Math.random() * Math.PI * 2;
  }

  onUpdate(dt) {
    this._pulse += dt * 2.5;
    this._chase(dt);
  }

  canTakeBulletDamage(bullet) {
    // We resolve the hit side using impact point relative to enemy center.
    const impact = bullet.position.sub(this.position);
    const absX = Math.abs(impact.x);
    const absY = Math.abs(impact.y);

    let side;
    if (absX > absY) {
      side = impact.x >= 0 ? 'right' : 'left';
    } else {
      side = impact.y >= 0 ? 'bottom' : 'top';
    }

    return side === this.vulnerableSide;
  }

  drawBody(ctx) {
    const flash = this._hitFlash > 0;
    const px = this.position.x;
    const py = this.position.y;
    const r = this.radius;

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = flash ? '#ffffff' : '#546e7a';
    ctx.fill();

    if (!flash) {
      // Outer ring suggests armored body.
      ctx.strokeStyle = 'rgba(207, 216, 220, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, r + 2, 0, Math.PI * 2);
      ctx.stroke();

      // A small glowing marker shows the vulnerable side.
      const pulse = 0.75 + (Math.sin(this._pulse) + 1) * 0.2;
      const markerDir = this._sideToVector();
      const markerPos = this.position.add(markerDir.scale(r * 0.78));
      ctx.beginPath();
      ctx.arc(markerPos.x, markerPos.y, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 241, 118, ${pulse})`;
      ctx.fill();

      // Inner eye.
      ctx.beginPath();
      ctx.arc(px, py, r * 0.26, 0, Math.PI * 2);
      ctx.fillStyle = '#263238';
      ctx.fill();
    }
  }

  _sideToVector() {
    if (this.vulnerableSide === 'top') return new Vector2(0, -1);
    if (this.vulnerableSide === 'right') return new Vector2(1, 0);
    if (this.vulnerableSide === 'bottom') return new Vector2(0, 1);
    return new Vector2(-1, 0);
  }
}
