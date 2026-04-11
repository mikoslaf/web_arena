import { PowerUp } from './PowerUp.js';

export class RapidFirePowerUp extends PowerUp {
  constructor({ position, duration = 8, cooldownScale = 0.55 } = {}) {
    super({
      position,
      radius: 14,
      ttl: 18,
      color: '#ffb74d',
      label: 'RF',
    });
    this.duration = duration;
    this.cooldownScale = cooldownScale;
  }

  applyTo(player) {
    if (!player || !player.isAlive) return false;
    player.applyRapidFire(this.duration, this.cooldownScale);
    return true;
  }
}
