import { Entity } from '../Entity.js';

/**
 * PowerUp base class.
 *
 * Extend this class and override `applyTo(player)` for new bonus types.
 */
export class PowerUp extends Entity {
  constructor({ position, radius = 14, ttl = 15, color = '#90caf9', label = '?' } = {}) {
    super({ position, radius, hp: 1, color });
    this.ttl = ttl;
    this.maxTtl = ttl;
    this.label = label;
    this.pulse = Math.random() * Math.PI * 2;
  }

  update(dt) {
    if (this.serverManaged) return;
    this.ttl -= dt;
    this.pulse += dt * 5;
    if (this.ttl <= 0) {
      this.isAlive = false;
    }
  }

  /**
   * Override in subclasses. Return true if applied successfully.
   * @param {import('../Player.js').Player} _player
   */
  applyTo(_player) {
    return false;
  }

  draw(ctx) {
    if (!this.isAlive) return;

    const alpha = Math.max(0.25, Math.min(1, this.ttl / this.maxTtl));
    const r = this.radius + Math.sin(this.pulse) * 1.5;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Glow ring
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 14;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, r + 4, 0, Math.PI * 2);
    ctx.stroke();

    // Core
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,14,26,0.9)';
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.stroke();

    // Icon
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.color;
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.label, this.position.x, this.position.y + 4);

    ctx.restore();
  }
}
