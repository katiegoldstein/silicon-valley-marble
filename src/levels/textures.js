import * as THREE from 'three';

/** Draw into a canvas and wrap it as a repeating sRGB texture. */
export function canvasTexture(w, h, draw, { repeat = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function rng(seed) {
  let n = seed;
  return () => {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    return n / 0x7fffffff;
  };
}

function speckle(ctx, w, h, colors, count, size, seed) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    ctx.fillRect(r() * w, r() * h, size, size);
  }
}

/** Blond plywood planks, staggered. One texture = 2 x 2 m. */
export function plankTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const rows = 8;
    const rh = h / rows;
    const r = rng(11);
    ctx.fillStyle = '#e8b878';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < rows; i++) {
      const offset = ((i % 2) * (w / 2) + (i % 3) * 30) % (w / 2);
      for (let k = -1; k < 3; k++) {
        const x = offset + k * (w / 2);
        const tone = 200 + Math.floor(r() * 30);
        ctx.fillStyle = `rgb(${tone + 30}, ${tone - 20}, ${tone - 110})`;
        ctx.fillRect(x, i * rh, w / 2, rh);
        ctx.strokeStyle = 'rgba(120, 70, 20, 0.25)';
        ctx.lineWidth = 1.5;
        for (let g = 0; g < 3; g++) {
          ctx.beginPath();
          const gy = i * rh + 5 + g * 9 + r() * 3;
          ctx.moveTo(x + 10, gy);
          ctx.bezierCurveTo(x + 50, gy - 3, x + 80, gy + 3, x + w / 2 - 10, gy);
          ctx.stroke();
        }
        ctx.strokeStyle = '#9a6420';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, i * rh, w / 2, rh);
      }
    }
  });
}

/** Asphalt: dark gray with flecks. */
export function asphaltTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4a4e57';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#3d4048', '#5a5e68', '#62666f', '#373a41'], 2600, 3, 5);
  });
}

/** Sidewalk concrete: pale slabs with seams every meter. */
export function concreteTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d9d4c7';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#cfc9bb', '#e2ddd1'], 900, 3, 9);
    ctx.strokeStyle = '#b3ad9f';
    ctx.lineWidth = 4;
    for (const p of [0, w / 2]) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, h);
      ctx.moveTo(0, p);
      ctx.lineTo(w, p);
      ctx.stroke();
    }
  });
}

/** Beige carpet. */
export function carpetTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d6b98a';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#c9aa78', '#e2c799', '#bf9f6c', '#ead3a8'], 5000, 3, 21);
  });
}

/** Terracotta patio tiles with cream grout. */
export function patioTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#efe3c8';
    ctx.fillRect(0, 0, w, h);
    const t = w / 4;
    const r = rng(3);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const tone = r() * 20;
        ctx.fillStyle = `rgb(${206 + tone}, ${118 + tone}, ${78 + tone})`;
        ctx.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
      }
    }
  });
}

/** Checkerboard kitchen tile. */
export function kitchenTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const t = w / 8;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#2b3446' : '#f2f2f2';
        ctx.fillRect(i * t, j * t, t, t);
      }
    }
  });
}

/** Rainbow track: seven stripes across the width, lane dashes, glowing edges. */
export function rainbowTexture() {
  return canvasTexture(512, 256, (ctx, w, h) => {
    const colors = ['#ff3b4f', '#ff8a1f', '#ffd91a', '#2fd45a', '#19c2d8', '#2f6bff', '#a23bff'];
    const edge = 22;
    const sw = (w - edge * 2) / colors.length;
    ctx.fillStyle = '#ff7ad9';
    ctx.fillRect(0, 0, edge, h);
    ctx.fillStyle = '#7ef6ff';
    ctx.fillRect(w - edge, 0, edge, h);
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(edge + i * sw, 0, sw + 1, h);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 1; i < colors.length; i++) {
      ctx.fillRect(edge + i * sw - 2, 40, 4, 60);
      ctx.fillRect(edge + i * sw - 2, 168, 4, 60);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(edge, 0, w - edge * 2, 3);
  });
}

/** Monitor full of code. */
export function codeScreenTexture(seed = 1) {
  return canvasTexture(
    128,
    80,
    (ctx, w, h) => {
      ctx.fillStyle = '#0f1726';
      ctx.fillRect(0, 0, w, h);
      const r = rng(seed * 97);
      const colors = ['#3fe36a', '#39b6ff', '#ffb02e', '#ff6fae', '#e8e8e8'];
      for (let line = 0; line < 9; line++) {
        let x = 6 + (r() < 0.4 ? 10 : 0);
        while (x < w - 20) {
          const len = 8 + r() * 26;
          ctx.fillStyle = colors[Math.floor(r() * colors.length)];
          ctx.fillRect(x, 6 + line * 8, len, 4);
          x += len + 5;
          if (r() < 0.3) break;
        }
      }
    },
    { repeat: false },
  );
}

/** Angry robot face for the boxy robots. */
export function robotFaceTexture() {
  return canvasTexture(
    128,
    96,
    (ctx, w, h) => {
      ctx.fillStyle = '#121626';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ff3b3b';
      ctx.save();
      ctx.translate(38, 38);
      ctx.rotate(0.35);
      ctx.fillRect(-16, -6, 32, 12);
      ctx.restore();
      ctx.save();
      ctx.translate(90, 38);
      ctx.rotate(-0.35);
      ctx.fillRect(-16, -6, 32, 12);
      ctx.restore();
      ctx.fillRect(34, 66, 60, 8);
      ctx.fillRect(26, 58, 10, 10);
      ctx.fillRect(92, 58, 10, 10);
    },
    { repeat: false },
  );
}

/** Title-screen floor: blue tiles with an inset square and bold yellow grid lines. */
export function menuTileTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#3a78e0';
    ctx.fillRect(0, 0, w, h);
    const t = w / 2; // 2 x 2 tiles per texture: 1 m tiles
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.strokeStyle = '#1f4fae';
        ctx.lineWidth = 7;
        ctx.strokeRect(i * t + t * 0.27, j * t + t * 0.27, t * 0.46, t * 0.46);
        ctx.fillStyle = '#ffd92e';
        ctx.fillRect(i * t, j * t, t, 6);
        ctx.fillRect(i * t, j * t, 6, t);
      }
    }
  });
}

/** Cream bricks for platform edges. */
export function brickTexture() {
  return canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#9a8350';
    ctx.fillRect(0, 0, w, h);
    const rows = 2;
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (w / 4);
      for (let k = -1; k < 3; k++) {
        const x = off + k * (w / 2);
        ctx.fillStyle = '#d8c79a';
        ctx.fillRect(x + 4, r * rh + 4, w / 2 - 8, rh - 8);
      }
    }
  });
}
