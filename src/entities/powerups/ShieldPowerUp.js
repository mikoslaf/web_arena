import { PowerUp } from './PowerUp.js';

export class ShieldPowerUp extends PowerUp {
  constructor({ position, duration = 6 } = {}) {
    super({
      position,
      radius: 14,
      ttl: 18,
      color: '#64b5f6',
      label: 'S',
    });
    this.duration = duration;
  }

  applyTo(player) {
    if (!player || !player.isAlive) return false;
    player.applyShield(this.duration);
    return true;
  }
}
