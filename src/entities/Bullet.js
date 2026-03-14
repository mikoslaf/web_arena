import { Entity } from './Entity.js';
import { Vector2 } from '../Vector2.js';

/**
 * Bullet – a projectile fired by a player
 */
export class Bullet extends Entity {
  /**
   * @param {object} opts
   * @param {Vector2} opts.position
   * @param {Vector2} opts.direction  normalized
   * @param {number}  opts.speed
   * @param {number}  opts.damage
   * @param {Entity}  opts.owner
   * @param {string}  opts.color
   */
  constructor({ position, direction, speed = 500, damage = 25, owner = null, color = '#ffe066' } = {}) {
    super({ position, radius: 5, hp: 1, color });
    this.speed = speed;
    this.damage = damage;
    this.owner = owner;
    this.ttl = 2.5; // seconds before auto-destroy
    this.velocity = direction.scale(speed);
  }

  update(dt) {
    this.position.addSelf(this.velocity.scale(dt));
    this.ttl -= dt;
    if (this.ttl <= 0) this.isAlive = false;
  }

  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.restore();
  }
}
