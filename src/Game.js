import { Arena } from './Arena.js';
import { Player } from './entities/Player.js';
import { EntityManager } from './managers/EntityManager.js';
import { SpawnManager } from './managers/SpawnManager.js';
import { InputManager } from './managers/InputManager.js';
import { HUD } from './hud/HUD.js';
import { Vector2 } from './Vector2.js';

/**
 * Game – the main game class.
 * Orchestrates the game loop, all managers and the canvas.
 */
export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize', () => this._resize());

    // Systems
    this.input   = new InputManager();
    this.arena   = new Arena(canvas.width, canvas.height);
    this.em      = new EntityManager();
    this.em.setArenaBounds(this.arena.x, this.arena.y, this.arena.w, this.arena.h);

    // Local player
    this.player = new Player({
      position: new Vector2(this.arena.centerX, this.arena.centerY),
      input: this.input,
      name: 'Gracz',
      color: '#42a5f5',
    });
    this.em.addPlayer(this.player);

    // Spawn manager
    this.spawner = new SpawnManager(this.em, this.arena.bounds);

    // HUD
    this.hud = new HUD(this.player, this.em);

    this._lastTime = null;
    this._animId   = null;
  }

  start() {
    this._animId = requestAnimationFrame((t) => this._loop(t));
  }

  stop() {
    if (this._animId) cancelAnimationFrame(this._animId);
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _resize() {
    this.canvas.width  = this.canvas.parentElement
      ? this.canvas.parentElement.clientWidth
      : window.innerWidth;
    this.canvas.height = this.canvas.parentElement
      ? this.canvas.parentElement.clientHeight
      : window.innerHeight;

    if (this.arena) {
      this.arena.resize(this.canvas.width, this.canvas.height);
      this.em?.setArenaBounds(this.arena.x, this.arena.y, this.arena.w, this.arena.h);
    }
  }

  _loop(timestamp) {
    const dt = Math.min((timestamp - (this._lastTime ?? timestamp)) / 1000, 0.05);
    this._lastTime = timestamp;

    // Flush one-shot key events
    this.input.flush();

    // Update
    if (this.player.isAlive) {
      this.spawner.update(dt);
    }
    this.em.update(dt);

    // HUD wave sync
    this.hud.setWave(this.spawner.wave);

    // Draw
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.arena.draw(ctx);
    this.em.draw(ctx);
    this.hud.draw(ctx);

    this._animId = requestAnimationFrame((t) => this._loop(t));
  }
}
