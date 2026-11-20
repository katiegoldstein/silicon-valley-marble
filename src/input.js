// Keyboard + pointer-lock mouse. Keys are tracked by physical position
// (event.code) so WASD works on any layout.
const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
  'Space', 'KeyR',
]);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.onRestart = null;
    this.onLockChange = null;

    window.addEventListener('keydown', (e) => {
      if (!GAME_KEYS.has(e.code)) return;
      if (e.target instanceof HTMLInputElement) return; // typing in the tuning panel
      e.preventDefault();
      if (e.code === 'KeyR' && !e.repeat) this.onRestart?.();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    this.onUse = null;
    canvas.addEventListener('click', () => {
      if (!this.locked) canvas.requestPointerLock?.();
    });
    canvas.addEventListener('mousedown', (e) => {
      if (this.locked && e.button === 0) this.onUse?.();
    });
    document.addEventListener('pointerlockchange', () => this.onLockChange?.(this.locked));
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      // Browsers occasionally report one huge delta right after locking.
      this.mouseDX += Math.max(-200, Math.min(200, e.movementX));
      this.mouseDY += Math.max(-200, Math.min(200, e.movementY));
    });
  }

  get locked() {
    return document.pointerLockElement === this.canvas;
  }

  /** Stick-style axes: x = right, y = forward, length <= 1. */
  move() {
    const k = this.keys;
    let x = 0;
    let y = 0;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  get jump() {
    return this.keys.has('Space');
  }

  consumeMouse() {
    const d = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return d;
  }
}
