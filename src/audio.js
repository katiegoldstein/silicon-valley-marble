// All sound is synthesized with Web Audio: no files to load. Sound effects are
// short envelopes on oscillators and noise; the music is a small step
// sequencer playing a chiptune-flavored loop, one per level.
//
// Browsers only allow audio after a user gesture, so nothing plays until
// unlock() is called from a click or key press.

import { save } from './save.js';

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

// Each loop: tempo, chords (root MIDI note + 'M'/'m'), and a lead motif over
// 32 sixteenth-notes. Motif numbers index the current chord's tones
// [root, third, fifth, octave, octave+third]; null is a rest.
const TRACKS = {
  menu: {
    bpm: 112, lead: 'square', bass: 'triangle',
    chords: [[60, 'M'], [67, 'M'], [69, 'm'], [65, 'M']],
    motif: [3, null, 2, null, 1, null, 2, 3, null, 4, null, 3, 2, null, null, null, 0, null, 1, 2, null, 2, null, 1, 3, null, 2, null, 1, null, 0, null],
  },
  1: {
    bpm: 120, lead: 'square', bass: 'square',
    chords: [[57, 'm'], [53, 'M'], [60, 'M'], [55, 'M']],
    motif: [0, null, 2, 3, null, 2, null, 1, 0, null, null, 2, null, 3, 4, null, 3, null, 2, null, 1, null, 2, null, 0, null, 1, null, 2, null, null, null],
  },
  2: {
    bpm: 104, lead: 'triangle', bass: 'triangle',
    chords: [[65, 'M'], [62, 'm'], [70, 'M'], [72, 'M']],
    motif: [2, null, null, 3, null, null, 2, null, 1, null, 0, null, 1, null, null, null, 2, null, null, 3, null, null, 4, null, 3, null, 2, null, null, null, null, null],
  },
  3: {
    bpm: 128, lead: 'square', bass: 'square',
    chords: [[67, 'M'], [64, 'm'], [60, 'M'], [62, 'M']],
    motif: [0, 1, 2, null, 2, null, 3, null, 2, 1, 0, null, 1, null, 2, null, 4, null, 3, null, 2, null, 3, null, 2, null, 1, null, 0, null, null, null],
  },
  4: {
    bpm: 116, lead: 'sawtooth', bass: 'square',
    chords: [[62, 'M'], [60, 'M'], [67, 'M'], [62, 'M']],
    motif: [3, null, 3, 2, null, 0, null, 1, 2, null, null, 0, null, 1, 2, null, 3, null, 3, 4, null, 3, null, 2, 1, null, 0, null, 1, null, null, null],
  },
  5: {
    bpm: 132, lead: 'sawtooth', bass: 'sawtooth',
    chords: [[64, 'm'], [60, 'M'], [67, 'M'], [62, 'M']],
    motif: [0, 2, 3, 2, 4, 2, 3, 2, 0, 2, 3, 2, 4, null, 3, null, 1, 2, 3, 2, 1, 2, 3, 2, 4, 3, 2, 1, 0, null, null, null],
  },
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  /** Create or resume the audio context. Call from a user gesture. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.music = ctx.createGain();
      this.sfx = ctx.createGain();
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.noise = this.makeNoise();
      this.setupRoll();
      this.applyVolumes();
      if (this.pending) this.playMusic(this.pending);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const { music, sound } = save.options;
    this.music.gain.value = music * 0.32;
    this.sfx.gain.value = sound;
  }

  makeNoise() {
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---------- Building blocks ----------

  tone(freq, { at = 0, dur = 0.15, type = 'square', gain = 0.2, slide = null, attack = 0.005, dest = this.sfx } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  burst({ at = 0, dur = 0.1, gain = 0.2, freq = 1000, q = 1, type = 'bandpass', slide = null, dest = this.sfx, when = null } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = when ?? ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // ---------- Sound effects ----------

  gem() {
    this.tone(1568, { dur: 0.12, type: 'triangle', gain: 0.3 });
    this.tone(2093, { at: 0.07, dur: 0.35, type: 'triangle', gain: 0.3 });
    this.tone(4186, { at: 0.07, dur: 0.2, type: 'sine', gain: 0.06 });
  }

  hiddenGem() {
    [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, { at: i * 0.07, dur: 0.3, type: 'triangle', gain: 0.22 }));
  }

  jump() {
    this.tone(260, { dur: 0.12, type: 'square', gain: 0.07, slide: 520 });
  }

  /** Rubbery thud, louder for harder landings. */
  land(impact) {
    const g = Math.min(0.5, 0.06 + impact * 0.04);
    this.tone(150, { dur: 0.14, type: 'sine', gain: g, slide: 60 });
    this.burst({ dur: 0.06, gain: g * 0.5, freq: 600, q: 0.8 });
  }

  pickup() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, { at: i * 0.05, dur: 0.12, type: 'square', gain: 0.09 }));
  }

  use(type) {
    if (type === 'energy') {
      this.burst({ dur: 0.45, gain: 0.25, freq: 400, slide: 3000, q: 2 });
      this.tone(200, { dur: 0.4, type: 'sawtooth', gain: 0.08, slide: 900 });
    } else if (type === 'seriesA') {
      this.tone(180, { dur: 0.5, type: 'square', gain: 0.12, slide: 1200 });
      this.tone(1568, { at: 0.2, dur: 0.25, type: 'triangle', gain: 0.15 });
    } else if (type === 'drone') {
      this.burst({ dur: 0.9, gain: 0.12, freq: 220, q: 6 });
      this.tone(110, { dur: 0.9, type: 'sawtooth', gain: 0.05 });
    } else if (type === 'hype') {
      [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, { at: i * 0.06, dur: 0.16, type: 'square', gain: 0.08, slide: f * 1.5 }));
    } else if (type === 'severance') {
      this.tone(330, { dur: 0.25, type: 'triangle', gain: 0.15, slide: 165 });
      this.tone(220, { at: 0.2, dur: 0.4, type: 'triangle', gain: 0.15, slide: 110 });
    } else if (type === 'pivot') {
      this.tone(300, { dur: 0.6, type: 'sine', gain: 0.18, slide: 900 });
      this.tone(450, { dur: 0.6, type: 'triangle', gain: 0.08, slide: 1350 });
    } else if (type === 'rollback') {
      [1047, 880, 698, 523].forEach((f, i) => this.tone(f, { at: i * 0.08, dur: 0.18, type: 'triangle', gain: 0.15 }));
    }
  }

  checkpoint() {
    this.tone(784, { dur: 0.12, type: 'square', gain: 0.08 });
    this.tone(1175, { at: 0.1, dur: 0.25, type: 'square', gain: 0.08 });
  }

  outOfBounds() {
    this.tone(523, { dur: 0.7, type: 'square', gain: 0.08, slide: 110 });
  }

  /** 0 = Ready, 1 = Set, 2 = Go. */
  countdown(n) {
    if (n < 2) this.tone(n ? 660 : 523, { dur: 0.25, type: 'square', gain: 0.1 });
    else {
      this.tone(1047, { dur: 0.5, type: 'square', gain: 0.1 });
      this.tone(1319, { dur: 0.5, type: 'triangle', gain: 0.08 });
    }
  }

  finish() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone(f, { at: i * 0.11, dur: i === notes.length - 1 ? 0.7 : 0.14, type: 'square', gain: 0.1 }));
    notes.forEach((f, i) => this.tone(f / 2, { at: i * 0.11, dur: 0.14, type: 'triangle', gain: 0.1 }));
  }

  warn() {
    this.tone(220, { dur: 0.12, type: 'square', gain: 0.07 });
    this.tone(196, { at: 0.13, dur: 0.18, type: 'square', gain: 0.07 });
  }

  click() {
    this.tone(880, { dur: 0.05, type: 'square', gain: 0.06 });
  }

  /** Robotaxi stopping in front of you: a polite two-note chime. */
  chime() {
    this.tone(1319, { dur: 0.35, type: 'sine', gain: 0.14 });
    this.tone(988, { at: 0.18, dur: 0.5, type: 'sine', gain: 0.14 });
  }

  robotBeep() {
    const f = [880, 1175, 660][Math.floor(Math.random() * 3)];
    this.tone(f, { dur: 0.07, type: 'square', gain: 0.05 });
    this.tone(f * 1.25, { at: 0.09, dur: 0.07, type: 'square', gain: 0.05 });
  }

  laserCharge(seconds) {
    this.tone(200, { dur: seconds, type: 'sawtooth', gain: 0.04, slide: 1400, attack: seconds * 0.8 });
  }

  laserZap() {
    this.tone(1800, { dur: 0.3, type: 'sawtooth', gain: 0.12, slide: 120 });
    this.burst({ dur: 0.35, gain: 0.25, freq: 900, q: 0.7, slide: 120 });
  }

  crumble() {
    this.burst({ dur: 0.4, gain: 0.2, freq: 300, q: 0.6, slide: 80 });
  }

  // ---------- Rolling ----------

  setupRoll() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    this.rollFilter = ctx.createBiquadFilter();
    this.rollFilter.type = 'bandpass';
    this.rollFilter.Q.value = 1.4;
    this.rollGain = ctx.createGain();
    this.rollGain.gain.value = 0;
    src.connect(this.rollFilter).connect(this.rollGain).connect(this.sfx);
    src.start();
    // A hollow low tone under the hiss: the plastic-ball rumble.
    this.rumble = ctx.createOscillator();
    this.rumble.type = 'triangle';
    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.value = 0;
    this.rumble.connect(this.rumbleGain).connect(this.sfx);
    this.rumble.start();
  }

  /** Call every frame. */
  roll(speed, grounded) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const amount = grounded ? Math.min(1, speed / 12) : 0;
    this.rollGain.gain.setTargetAtTime(amount * 0.22, t, 0.05);
    this.rollFilter.frequency.setTargetAtTime(220 + speed * 55, t, 0.05);
    this.rumbleGain.gain.setTargetAtTime(amount * 0.07, t, 0.05);
    this.rumble.frequency.setTargetAtTime(55 + speed * 5, t, 0.05);
  }

  // ---------- Music ----------

  playMusic(id) {
    this.pending = id;
    if (!this.ctx) return;
    const track = TRACKS[id] ?? TRACKS.menu;
    if (this.track === track) return;
    this.stopMusic();
    this.track = track;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  /** Soften the music (pause menu) without stopping it. */
  duck(on) {
    if (!this.ctx) return;
    this.music.gain.setTargetAtTime(save.options.music * 0.32 * (on ? 0.35 : 1), this.ctx.currentTime, 0.1);
  }

  schedule() {
    const ctx = this.ctx;
    const tr = this.track;
    if (!tr) return;
    const sixteenth = 60 / tr.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(tr, this.step, this.nextTime, sixteenth);
      this.step += 1;
      this.nextTime += sixteenth;
    }
  }

  playStep(tr, i, when, len) {
    const at = when - this.ctx.currentTime;
    const [root, quality] = tr.chords[Math.floor(i / 16) % tr.chords.length];
    const tones = [root, root + (quality === 'M' ? 4 : 3), root + 7, root + 12, root + (quality === 'M' ? 16 : 15)];
    const s = i % 16;
    const d = this.music;

    // Bass on the beat and the "and" of 3.
    if (s === 0 || s === 6 || s === 8 || s === 14) {
      this.tone(mtof(root - 24), { at, dur: len * 1.8, type: tr.bass, gain: 0.32, dest: d });
    }
    // Arpeggio.
    if (s % 2 === 0) {
      this.tone(mtof(tones[(s / 2) % 3] - 12 + 12), { at, dur: len * 0.9, type: 'triangle', gain: 0.07, dest: d });
    }
    // Lead.
    const note = tr.motif[i % tr.motif.length];
    if (note != null) {
      this.tone(mtof(tones[note] + 12), { at, dur: len * 1.6, type: tr.lead, gain: 0.08, dest: d });
    }
    // Drums.
    if (s === 0 || s === 8 || s === 10) this.tone(120, { at, dur: 0.16, type: 'sine', gain: 0.5, slide: 40, dest: d });
    if (s === 4 || s === 12) this.burst({ when, dur: 0.12, gain: 0.25, freq: 1800, q: 0.8, dest: d });
    if (s % 2 === 0) this.burst({ when, dur: 0.035, gain: 0.08, freq: 8000, type: 'highpass', dest: d });
  }
}

export const audio = new AudioEngine();
