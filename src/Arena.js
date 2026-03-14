/**
 * Arena – renders the battlefield background and provides boundary data.
 */
export class Arena {
  /**
   * @param {number} canvasW
   * @param {number} canvasH
   * @param {number} padding  space between canvas edge and arena wall
   */
  constructor(canvasW, canvasH, padding = 40) {
    this.x = padding;
    this.y = padding;
    this.w = canvasW - padding * 2;
    this.h = canvasH - padding * 2;
    this.padding = padding;

    // Pre-generate grid lines
    this._gridSize = 60;
    this._offscreenCanvas = null;
    this._dirty = true;
  }

  resize(canvasW, canvasH) {
    this.w = canvasW - this.padding * 2;
    this.h = canvasH - this.padding * 2;
    this._dirty = true;
  }

  get bounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  draw(ctx) {
    // Dark outer border area
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Floor
    ctx.fillStyle = '#1a1f2e';
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let gx = this.x; gx <= this.x + this.w; gx += this._gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, this.y);
      ctx.lineTo(gx, this.y + this.h);
      ctx.stroke();
    }
    for (let gy = this.y; gy <= this.y + this.h; gy += this._gridSize) {
      ctx.beginPath();
      ctx.moveTo(this.x, gy);
      ctx.lineTo(this.x + this.w, gy);
      ctx.stroke();
    }

    // Inner glow on floor edges
    const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.w, this.y + this.h);
    grad.addColorStop(0,   'rgba(66,165,245,0.03)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1,   'rgba(239,83,80,0.03)');
    ctx.fillStyle = grad;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Wall
    ctx.strokeStyle = '#42a5f5';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#42a5f5';
    ctx.strokeRect(this.x, this.y, this.w, this.h);
    ctx.shadowBlur = 0;

    // Corner accents
    this._drawCorner(ctx, this.x,              this.y,              1,  1);
    this._drawCorner(ctx, this.x + this.w,     this.y,             -1,  1);
    this._drawCorner(ctx, this.x,              this.y + this.h,     1, -1);
    this._drawCorner(ctx, this.x + this.w,     this.y + this.h,    -1, -1);
  }

  _drawCorner(ctx, cx, cy, sx, sy) {
    const len = 20;
    ctx.strokeStyle = '#90caf9';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#90caf9';
    ctx.beginPath();
    ctx.moveTo(cx + sx * len, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * len);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
