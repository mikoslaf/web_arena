import { PowerUp } from './PowerUp.js';

export class MedkitPowerUp extends PowerUp {
  constructor({ position, healAmount = 45 } = {}) {
    super({
      position,
      radius: 14,
      ttl: 20,
      color: '#66bb6a',
      label: '+',
    });
    this.healAmount = healAmount;
  }

  applyTo(player) {
    if (!player || !player.isAlive) return false;
    player.heal(this.healAmount);
    return true;
  }
}
