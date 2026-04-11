import { Vector2 } from '../Vector2.js';

/**
 * Entity – base class for all game objects
 */
export class Entity {
  constructor({ position, radius = 16, hp = 100, color = '#ffffff' } = {}) {
    this.position = position ? position.clone() : new Vector2();
    this.velocity = new Vector2();
    this.radius = radius;
    this.hp = hp;
    this.maxHp = hp;
    this.color = color;
    this.isAlive = true;
    this.id = Entity._nextId++;
  }

  get isDead() { return !this.isAlive || this.hp <= 0; }

  takeDamage(amount) {
    const wasAlive = this.isAlive;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      if (wasAlive && typeof this.onDeath === 'function') {
        this.onDeath();
      }
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  update(dt) {
    this.position.addSelf(this.velocity.scale(dt));
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  drawHpBar(ctx) {
    const barW = this.radius * 2;
    const barH = 4;
    const x = this.position.x - this.radius;
    const y = this.position.y - this.radius - 8;
    const pct = Math.max(0, this.hp / this.maxHp);

    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(x, y, barW * pct, barH);
  }
}
Entity._nextId = 0;
