import { Enemy } from './Enemy.js';
import { Vector2 } from '../Vector2.js';

/**
 * Zombie – slow, tanky, close-combat monster.
 *
 * Template for adding new enemies:
 *  1. Copy this file
 *  2. Rename class, adjust constructor options
 *  3. Optionally override drawBody(ctx) and onUpdate(dt)
 *  4. Register in SpawnManager ENEMY_TYPES table
 */
export class Zombie extends Enemy {
  constructor({ position } = {}) {
    super({
      position,
      radius: 20,
      hp: 80,
      speed: 70,
      damage: 12, // per second
      scoreValue: 10,
      color: '#4caf50',
      name: 'Zombie',
    });
    this._wobble = Math.random() * Math.PI * 2; // wobble offset for idle animation
  }

  onUpdate(dt) {
    this._wobble += dt * 3;
    this._chase(dt);
  }

  drawBody(ctx) {
    const flash = this._hitFlash > 0;
    const px = this.position.x;
    const py = this.position.y;
    const r = this.radius;

    // Body
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = flash ? '#ffffff' : '#388e3c';
    ctx.fill();

    if (!flash) {
      // Face features
      ctx.fillStyle = '#1b5e20';
      // Eyes
      ctx.beginPath();
      ctx.arc(px - r * 0.3, py - r * 0.15, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + r * 0.3, py - r * 0.15, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      // Red pupils
      ctx.fillStyle = '#f44336';
      ctx.beginPath();
      ctx.arc(px - r * 0.3, py - r * 0.15, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + r * 0.3, py - r * 0.15, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      // Mouth (jagged)
      ctx.strokeStyle = '#1b5e20';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - r * 0.35, py + r * 0.3);
      ctx.lineTo(px - r * 0.15, py + r * 0.2);
      ctx.lineTo(px, py + r * 0.35);
      ctx.lineTo(px + r * 0.15, py + r * 0.2);
      ctx.lineTo(px + r * 0.35, py + r * 0.3);
      ctx.stroke();
    }
  }
}
