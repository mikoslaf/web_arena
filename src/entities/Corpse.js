import { Entity } from './Entity.js';

/**
 * Corpse – static remains left after a player dies.
 * It is not a player and is ignored by enemy targeting logic.
 */
export class Corpse extends Entity {
  constructor({ position, name = 'Gracz', ttl = 30 } = {}) {
    super({ position, radius: 18, hp: 1, color: '#6d4c41' });
    this.name = name;
    this.ttl = ttl;
    this.maxTtl = ttl;
    this.isAlive = true;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.isAlive = false;
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;

    const fade = Math.max(0.15, Math.min(1, this.ttl / this.maxTtl));
    const x = this.position.x;
    const y = this.position.y;

    ctx.save();
    ctx.globalAlpha = fade;

    // Body on the ground (same size as player)
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Simple cross marker
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const marker = this.radius * 0.5;
    ctx.moveTo(x - marker, y - marker * 0.25);
    ctx.lineTo(x + marker, y + marker * 0.75);
    ctx.moveTo(x + marker, y - marker * 0.25);
    ctx.lineTo(x - marker, y + marker * 0.75);
    ctx.stroke();

    // Name label above corpse
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, x, y - this.radius - 10);

    ctx.restore();
  }
}