import { Zombie } from '../entities/Zombie.js';
import { FastZombie } from '../entities/FastZombie.js';
import { Vector2 } from '../Vector2.js';

/**
 * ENEMY_TYPES registry – add new enemy types here.
 *
 * Fields:
 *   factory(pos)  – creates a new instance
 *   weight        – relative spawn probability
 *   minWave       – earliest wave this type appears
 */
const ENEMY_TYPES = [
  {
    factory: (pos) => new Zombie({ position: pos }),
    weight: 3,
    minWave: 1,
  },
  {
    factory: (pos) => new FastZombie({ position: pos }),
    weight: 1,
    minWave: 2,
  },
  // ── Add new enemy types below ──────────────────────────────────
  // {
  //   factory: (pos) => new BossZombie({ position: pos }),
  //   weight: 0.3,
  //   minWave: 5,
  // },
];

/**
 * SpawnManager – time-based wave spawning of enemies.
 */
export class SpawnManager {
  /**
   * @param {import('./EntityManager.js').EntityManager} entityManager
   * @param {object} arenaBounds  { x, y, w, h }
   */
  constructor(entityManager, arenaBounds) {
    this.entityManager = entityManager;
    this.bounds = arenaBounds;

    this.wave = 1;
    this.spawnInterval = 4.0;  // seconds between individual spawns
    this._spawnTimer = 1.5;    // first spawn is quick

    this.maxEnemies = 20;       // hard cap so game stays playable
    this.waveTimer = 0;
    this.waveDuration = 40;    // seconds per wave
  }

  update(dt) {
    // Advance wave
    this.waveTimer += dt;
    if (this.waveTimer >= this.waveDuration) {
      this.waveTimer = 0;
      this.wave++;
      // Scale difficulty: more enemies, shorter intervals per wave
      this.spawnInterval = Math.max(1.2, this.spawnInterval - 0.3);
      this.maxEnemies    = Math.min(40, this.maxEnemies + 3);
    }

    if (this.entityManager.totalMonsters >= this.maxEnemies) return;

    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      this._spawnTimer = this.spawnInterval;
      this._spawnOne();
    }
  }

  _spawnOne() {
    const eligible = ENEMY_TYPES.filter(t => t.minWave <= this.wave);
    if (eligible.length === 0) return;

    const totalWeight = eligible.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * totalWeight;
    let chosen = eligible[eligible.length - 1];
    for (const t of eligible) {
      r -= t.weight;
      if (r <= 0) { chosen = t; break; }
    }

    const pos = this._randomEdgePosition();
    const enemy = chosen.factory(pos);
    this.entityManager.addEnemy(enemy);
  }

  /** Spawn at a random point along the arena perimeter */
  _randomEdgePosition() {
    const { x, y, w, h } = this.bounds;
    const perimeter = 2 * (w + h);
    let t = Math.random() * perimeter;
    const margin = 10;

    if (t < w)          return new Vector2(x + t,     y + margin);
    t -= w;
    if (t < h)          return new Vector2(x + w - margin, y + t);
    t -= h;
    if (t < w)          return new Vector2(x + w - t,   y + h - margin);
    t -= w;
    return              new Vector2(x + margin, y + h - t);
  }
}
