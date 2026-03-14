import { Entity } from './Entity.js';
import { Vector2 } from '../Vector2.js';

/**
 * Enemy – abstract base class for all AI-controlled monsters.
 *
 * Subclass and override:
 *   - constructor options  (radius, hp, speed, damage, scoreValue, color, name)
 *   - drawBody(ctx)        for custom sprite appearance
 *   - onUpdate(dt)         for custom AI behaviour
 */
export class Enemy extends Entity {
  /**
   * @param {object}  opts
   * @param {Vector2} opts.position
   * @param {number}  opts.radius
   * @param {number}  opts.hp
   * @param {number}  opts.speed       movement speed px/s
   * @param {number}  opts.damage      damage dealt on contact per second
   * @param {number}  opts.scoreValue  points awarded when killed
   * @param {string}  opts.color
   * @param {string}  opts.name
   */
  constructor({
    position,
    radius = 18,
    hp = 60,
    speed = 80,
    damage = 15,
    scoreValue = 10,
    color = '#66bb6a',
    name = 'Enemy',
  } = {}) {
    super({ position, radius, hp, color });
    this.speed = speed;
    this.damage = damage;       // damage per second while touching player
    this.scoreValue = scoreValue;
    this.name = name;
    this.target = null;         // set to player by EntityManager
    this._hitFlash = 0;
  }

  /**
   * Move towards current target.
   */
  _chase(dt) {
    if (!this.target || this.target.isDead) return;
    const dir = this.target.position.sub(this.position);
    if (dir.magnitudeSq < 1) return;
    this.position.addSelf(dir.normalize().scale(this.speed * dt));
  }

  update(dt) {
    if (!this.isAlive) return;
    this.onUpdate(dt);
    if (this._hitFlash > 0) this._hitFlash -= dt;
  }

  /** Override in subclasses for custom AI */
  onUpdate(dt) {
    this._chase(dt);
  }

  takeDamage(amount) {
    this._hitFlash = 0.12;
    super.takeDamage(amount);
  }

  draw(ctx) {
    if (!this.isAlive) return;
    ctx.save();
    if (this._hitFlash > 0) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#fff';
    }
    this.drawBody(ctx);
    ctx.restore();
    this.drawHpBar(ctx);
  }

  /** Override for custom appearance */
  drawBody(ctx) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this._hitFlash > 0 ? '#ffffff' : this.color;
    ctx.fill();
  }
}
