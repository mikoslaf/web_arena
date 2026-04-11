import { Vector2 } from '../Vector2.js';
import { MedkitPowerUp } from '../entities/powerups/MedkitPowerUp.js';
import { RapidFirePowerUp } from '../entities/powerups/RapidFirePowerUp.js';
import { ShieldPowerUp } from '../entities/powerups/ShieldPowerUp.js';

/**
 * POWERUP_TYPES registry.
 * Add new types here for easy extension.
 */
const POWERUP_TYPES = [
  {
    factory: (pos) => new MedkitPowerUp({ position: pos }),
    weight: 2.5,
  },
  {
    factory: (pos) => new RapidFirePowerUp({ position: pos }),
    weight: 1.8,
  },
  {
    factory: (pos) => new ShieldPowerUp({ position: pos }),
    weight: 1.5,
  },
];

export class PowerUpManager {
  /**
   * @param {import('./EntityManager.js').EntityManager} entityManager
   * @param {{x:number,y:number,w:number,h:number}} arenaBounds
   */
  constructor(entityManager, arenaBounds) {
    this.entityManager = entityManager;
    this.bounds = arenaBounds;

    this.maxOnArena = 4;
    this.minSpawnInterval = 9;
    this.maxSpawnInterval = 16;
    this._spawnTimer = this._nextSpawnTime();
  }

  setBounds(bounds) {
    this.bounds = bounds;
  }

  update(dt) {
    if (this.entityManager.powerUps.length >= this.maxOnArena) return;

    this._spawnTimer -= dt;
    if (this._spawnTimer > 0) return;

    this._spawnTimer = this._nextSpawnTime();
    this._spawnOne();
  }

  _nextSpawnTime() {
    return this.minSpawnInterval + Math.random() * (this.maxSpawnInterval - this.minSpawnInterval);
  }

  _spawnOne() {
    if (!POWERUP_TYPES.length) return;

    const totalWeight = POWERUP_TYPES.reduce((sum, item) => sum + item.weight, 0);
    let r = Math.random() * totalWeight;
    let chosen = POWERUP_TYPES[POWERUP_TYPES.length - 1];

    for (const item of POWERUP_TYPES) {
      r -= item.weight;
      if (r <= 0) {
        chosen = item;
        break;
      }
    }

    const pos = this._randomInnerPosition();
    this.entityManager.addPowerUp(chosen.factory(pos));
  }

  _randomInnerPosition() {
    const { x, y, w, h } = this.bounds;
    const margin = 30;
    const rx = x + margin + Math.random() * Math.max(1, w - margin * 2);
    const ry = y + margin + Math.random() * Math.max(1, h - margin * 2);
    return new Vector2(rx, ry);
  }
}
