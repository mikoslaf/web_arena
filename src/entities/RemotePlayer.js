import { Entity } from './Entity.js';
import { Vector2 } from '../Vector2.js';

/**
 * RemotePlayer – represents another player in the game over the network.
 */
export class RemotePlayer extends Entity {
  constructor({ id, position, name = 'Remote Gracz', color = '#ef5350', hp = 150 } = {}) {
    super({ position, radius: 18, hp, color });
    this.networkId = id;
    this.name = name;
    this.score = 0;
    this.facing = new Vector2(1, 0); // last move direction received
    this.targetPosition = this.position.clone();
    
    // visual
    this._hitFlash = 0;
    this._deathAnim = 0;
    this._deathAnimDuration = 0.6;
    this._corpseSpawned = false;
  }

  update(dt) {
    if (!this.isAlive) {
      if (this._deathAnim > 0) this._deathAnim -= dt;
      return;
    }

    // Interpolate towards the target position for smooth movement
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    
    this.position.x += dx * 10 * dt;
    this.position.y += dy * 10 * dt;

    if (this._hitFlash > 0) this._hitFlash -= dt;
  }

  updateState(state) {
    this.targetPosition.x = state.x;
    this.targetPosition.y = state.y;
    this.facing.x = Math.cos(state.angle);
    this.facing.y = Math.sin(state.angle);
    
    const lastHp = this.hp;
    this.hp = state.hp;
    if (this.hp < lastHp) {
      this._hitFlash = 0.15;
    }
    
    this.score = state.score;

    if (this.isAlive && !state.isAlive) {
      this.onDeath();
    }
    this.isAlive = state.isAlive;
  }

  onDeath() {
    this._deathAnim = this._deathAnimDuration;
  }

  drainBullets() {
    // Remote players do not spawn bullets locally in this class.
    return [];
  }

  draw(ctx) {
    if (!this.isAlive && this._deathAnim <= 0) return;
    ctx.save();

    const isDying = !this.isAlive;
    const deathPct = isDying ? Math.max(0, this._deathAnim / this._deathAnimDuration) : 1;
    if (isDying) {
      ctx.globalAlpha = deathPct;
    }

    // Body glow on hit
    if (this._hitFlash > 0) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#f44336';
    }

    // Body
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this._hitFlash > 0 ? '#f44336' : this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Direction indicator (gun barrel)
    const tip = this.position.add(this.facing.scale(this.radius));
    ctx.beginPath();
    ctx.moveTo(this.position.x, this.position.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // HP bar
    if (this.isAlive) {
      this.drawHpBar(ctx);
    }

    // Name label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.position.x, this.position.y - this.radius - 12);
  }
}
