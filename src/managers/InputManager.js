/**
 * InputManager – tracks keyboard state
 */
export class InputManager {
  constructor() {
    this._held = new Set();
    this._justPressed = new Set();
    this._justReleased = new Set();
    this._queued = new Set();

    window.addEventListener('keydown', (e) => {
      if (!this._held.has(e.code)) {
        this._queued.add(e.code);
      }
      this._held.add(e.code);
      // Prevent page scroll on arrow/space keys
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this._held.delete(e.code);
      this._justReleased.add(e.code);
    });
  }

  /** Call once at the start of each frame to flush one-shot events */
  flush() {
    this._justPressed = new Set(this._queued);
    this._queued.clear();
    this._justReleased.clear();
  }

  isDown(code) { return this._held.has(code); }
  isPressed(code) { return this._justPressed.has(code); }
  isReleased(code) { return this._justReleased.has(code); }
}
