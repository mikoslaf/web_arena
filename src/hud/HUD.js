/**
 * HUD – draws the game heads-up display overlay.
 *
 * Layout per spec (gra.md):
 *   Top-left     : number of players on arena
 *   Top-right    : player score
 *   Bottom-left  : number of monsters on arena
 *   Bottom-right : number of enemies (opposing players – 0 in single-player)
 *   Bottom-center: player HP bar
 */
export class HUD {
  /**
   * @param {import('../entities/Player.js').Player} player  local player
   * @param {import('../managers/EntityManager.js').EntityManager} em
   */
  constructor(player, entityManager) {
    this.player = player;
    this.em = entityManager;
    this._wave = 1;
    this._deathShown = false;
  }

  setWave(wave) { this._wave = wave; }

  draw(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const pad = 16;

    ctx.save();

    // ── Panel background helper ─────────────────────────────────────────
    const panel = (x, y, w, h) => {
      ctx.fillStyle = 'rgba(10,14,26,0.72)';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(66,165,245,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    // ── Top-left: players alive ─────────────────────────────────────────
    panel(pad, pad, 150, 44);
    ctx.fillStyle = '#90caf9';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('GRACZE', pad + 10, pad + 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText(this.em.alivePlayers.length, pad + 10, pad + 36);

    // ── Top-right: score ────────────────────────────────────────────────
    const scoreStr = String(this.player ? this.player.score : 0).padStart(6, '0');
    panel(W - 180 - pad, pad, 180, 44);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#90caf9';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('PUNKTY', W - pad - 10, pad + 16);
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(scoreStr, W - pad - 10, pad + 36);

    // ── Wave indicator (top-center) ─────────────────────────────────────
    const waveText = `FALA ${this._wave}`;
    panel(W / 2 - 60, pad, 120, 36);
    ctx.fillStyle = '#ef5350';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(waveText, W / 2, pad + 23);

    // ── Bottom-left: monsters ───────────────────────────────────────────
    panel(pad, H - pad - 44, 160, 44);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a5d6a7';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('POTWORY', pad + 10, H - pad - 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText(this.em.totalMonsters, pad + 10, H - pad - 8);

    // ── Bottom-right: enemy players ─────────────────────────────────────
    panel(W - 160 - pad, H - pad - 44, 160, 44);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ef9a9a';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('PRZECIWNICY', W - pad - 10, H - pad - 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Inter, sans-serif';
    // In single-player there are no opposing players
    const enemyPlayerCount = this.em.alivePlayers.filter(p => p !== this.player).length;
    ctx.fillText(enemyPlayerCount, W - pad - 10, H - pad - 8);

    // ── Bottom-center: HP bar ───────────────────────────────────────────
    if (this.player && this.player.isAlive) {
      const barW = 220;
      const barH = 14;
      const bx = W / 2 - barW / 2;
      const by = H - pad - barH - 4;
      const pct = Math.max(0, this.player.hp / this.player.maxHp);

      ctx.fillStyle = 'rgba(10,14,26,0.72)';
      ctx.beginPath();
      ctx.roundRect(bx - 8, by - 14, barW + 16, barH + 22, 8);
      ctx.fill();

      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.roundRect(bx, by, barW, barH, 6);
      ctx.fill();

      const hpColor = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillStyle = hpColor;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW * pct, barH, 6);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`HP  ${Math.ceil(this.player.hp)} / ${this.player.maxHp}`, W / 2, by - 2);
    }

    // ── GAME OVER overlay ───────────────────────────────────────────────
    if (this.player && !this.player.isAlive) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#f44336';
      ctx.font = 'bold 64px Inter, sans-serif';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 30);

      ctx.fillStyle = '#ffe066';
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.fillText(`Wynik: ${this.player.score}`, W / 2, H / 2 + 20);

      ctx.fillStyle = '#90caf9';
      ctx.font = '18px Inter, sans-serif';
      ctx.fillText('Naciśnij F5 aby zagrać ponownie', W / 2, H / 2 + 60);
    }

    ctx.restore();
  }
}
