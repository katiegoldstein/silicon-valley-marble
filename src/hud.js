import { POWERUPS } from './powerups.js';
import { save, LEVEL_IDS, MEDAL_NAMES, hiddenCount } from './save.js';
import { CREDITS } from './credits.js';

const $ = (id) => document.getElementById(id);
const pad2 = (n) => String(n).padStart(2, '0');

/** 83.456 -> "01:23.45" */
export function formatTime(seconds) {
  const cs = Math.floor(seconds * 100);
  return `${pad2(Math.floor(cs / 6000))}:${pad2(Math.floor(cs / 100) % 60)}.${pad2(cs % 100)}`;
}

/** 45 -> "0:45" */
export function formatPar(seconds) {
  return `${Math.floor(seconds / 60)}:${pad2(seconds % 60)}`;
}

/** DOM overlay: gem counter, clock, banners, intro card, end screen. */
export class Hud {
  constructor() {
    this.lastTimer = '';
    this.onRetry = null;
    this.onNext = null;
    this.onMenu = null;
    for (const id of ['retry', 'pause-restart', 'deck-retry']) $(id).addEventListener('click', () => this.onRetry?.());
    for (const id of ['end-menu', 'pause-menu', 'deck-menu']) $(id).addEventListener('click', () => this.onMenu?.());
    $('next').addEventListener('click', () => this.onNext?.());
    $('hud').hidden = false;
    this.effectKey = '';
  }

  /** Timers for Hype Cycle, Severance Package and Rollback under the power-up slot. */
  setEffects(e) {
    const parts = [];
    if (e.hype > 0) parts.push(['hype', e.hype]);
    if (e.severance > 0) parts.push(['severance', e.severance]);
    if (e.rollback > 0) parts.push(['rollback', e.rollback]);
    const key = parts.map(([k, t]) => `${k}${Math.ceil(t)}`).join();
    if (key === this.effectKey) return;
    this.effectKey = key;
    $('effects').innerHTML = parts
      .map(([k, t]) => `<div class="effect">${POWERUPS[k].icon}<span>${Math.ceil(t)}</span></div>`)
      .join('');
    $('timer').classList.toggle('frozen', e.rollback > 0);
  }

  setPowerup(type) {
    const slot = $('powerup');
    slot.innerHTML = type ? POWERUPS[type].icon : '';
    slot.setAttribute('aria-label', type ? `Power-up: ${POWERUPS[type].name}` : 'Power-up slot');
  }

  setLevel(level) {
    document.body.classList.toggle('sandbox', !!level.sandbox);
    $('tagline').textContent = level.tagline ?? '';
    $('intro-name').textContent = level.name;
    $('intro-par').textContent = level.par ? `Par ${formatPar(level.par)}` : '';
    $('intro-tagline').textContent = level.tagline ?? '';
    const best = save.best[level.id];
    $('intro-best').textContent = best != null ? `Best ${formatTime(best)}` : '';
  }

  setGems(count, total) {
    $('gem-count').textContent = `${pad2(count)}/${pad2(total)}`;
  }

  setTimer(seconds) {
    const text = formatTime(seconds);
    if (text === this.lastTimer) return;
    this.lastTimer = text;
    $('timer').textContent = text;
  }

  setSpeed(speed) {
    $('speed').textContent = speed.toFixed(1);
  }

  /** kind: 'ready' (red serif), 'go' (big green), 'info' (yellow). Empty text clears. */
  banner(text, kind = 'info') {
    const el = $('banner');
    if (el.textContent === text && el.className === kind) return;
    el.textContent = text;
    el.className = kind;
  }

  showIntro(show) {
    $('intro').hidden = !show;
  }

  setPaused(paused) {
    $('pause').hidden = !paused;
  }

  showEnd({ time, par, hasNext, final, best, newBest, medal }) {
    if (final) {
      this.showDeck({ time, par });
      return;
    }
    $('end-title').textContent = medal === 'platinum' ? 'Unicorn!' : time <= par ? 'Qualified!' : 'Finished!';
    $('end-sub').hidden = true;
    $('end-time').textContent = formatTime(time);
    $('end-par').textContent = formatTime(par);
    $('end-best').textContent = best != null ? formatTime(best) : '--:--.--';
    $('end-new').hidden = !newBest;
    const m = $('end-medal');
    m.hidden = !medal;
    if (medal) {
      m.className = `medal ${medal}`;
      m.textContent = MEDAL_NAMES[medal];
    }
    $('next').hidden = !hasNext;
    $('end').hidden = false;
  }

  /** After Level 5: a pitch-deck "Thank you / Questions?" slide with the credits rolling. */
  showDeck({ time, par }) {
    $('deck-time').textContent = formatTime(time);
    $('deck-par').textContent = formatTime(par);
    const all = LEVEL_IDS.every((id) => save.best[id] != null);
    $('deck-total').textContent = all ? formatTime(LEVEL_IDS.reduce((sum, id) => sum + save.best[id], 0)) : '—';
    $('deck-hidden').textContent = `${hiddenCount()}/5`;
    const roll = $('deck-credits');
    roll.innerHTML = CREDITS + CREDITS; // twice, so the scroll loops seamlessly
    $('deck').hidden = false;
  }

  hideEnd() {
    $('end').hidden = true;
    $('deck').hidden = true;
  }
}
