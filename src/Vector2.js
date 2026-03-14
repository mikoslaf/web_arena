/**
 * Vector2 - 2D vector math utility
 */
export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vector2(this.x - v.x, this.y - v.y); }
  scale(s) { return new Vector2(this.x * s, this.y * s); }
  dot(v) { return this.x * v.x + this.y * v.y; }

  get magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  get magnitudeSq() { return this.x * this.x + this.y * this.y; }

  normalize() {
    const m = this.magnitude;
    if (m === 0) return new Vector2(0, 0);
    return new Vector2(this.x / m, this.y / m);
  }

  distance(v) { return this.sub(v).magnitude; }

  clone() { return new Vector2(this.x, this.y); }

  set(x, y) { this.x = x; this.y = y; return this; }
  addSelf(v) { this.x += v.x; this.y += v.y; return this; }
  scaleSelf(s) { this.x *= s; this.y *= s; return this; }

  static lerp(a, b, t) {
    return new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }
  static fromAngle(angle) {
    return new Vector2(Math.cos(angle), Math.sin(angle));
  }
}
