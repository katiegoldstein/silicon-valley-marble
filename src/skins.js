import * as THREE from 'three';

/**
 * The six marbles from the spec. All share the same physics; only the look
 * and a small "touch" differ.
 */
export const SKINS = [
  { id: 'rainbow', name: 'Rainbow', desc: 'The classic glossy swirl.' },
  { id: 'chrome', name: 'Chrome', desc: 'Mirror finish. Reflects the level around it.' },
  { id: 'jelly', name: 'Jelly', desc: 'Translucent pink. Wobbles when it lands.' },
  { id: 'gold', name: 'Gold', desc: 'Polished gold.', locked: 'Find all five hidden Stealth Mode gems to unlock.' },
  { id: 'disco', name: 'Disco', desc: 'Mirror-ball facets. Throws light spots as it rolls.' },
  { id: 'circuit', name: 'Circuit', desc: 'Glowing traces that run faster the faster you go.' },
];

const SPOT_COLORS = [0xffffff, 0x9fd8ff, 0xff9ff0, 0xfff59f, 0x9fffb8, 0xffffff];

/**
 * Build a marble's visuals.
 *   root    positioned at the marble's center (never rotated; carries the jelly squash)
 *   spinner child that takes the marble's rotation
 *   update(dt, { speed, landing, up, grounded }) per rendered frame
 *   captureEnv(renderer, scene) refreshes the reflection for chrome and gold
 */
export function makeMarbleLook(id, radius) {
  const root = new THREE.Group();
  let spinner;
  let envCam = null;
  let frame = 0;
  const extras = {};

  const reflective = (color, roughness) => {
    const target = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
    envCam = new THREE.CubeCamera(0.05, 1200, target);
    root.add(envCam);
    return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness, envMap: target.texture });
  };

  if (id === 'chrome') {
    spinner = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 24), reflective(0xffffff, 0.04));
  } else if (id === 'gold') {
    spinner = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 24), reflective(0xffc23a, 0.12));
  } else if (id === 'jelly') {
    const mat = new THREE.MeshPhongMaterial({
      color: 0xff6fb5,
      emissive: 0x5a0a33,
      specular: 0xffffff,
      shininess: 120,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    spinner = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), mat);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.55, 20, 12),
      new THREE.MeshPhongMaterial({ color: 0xff3b8f, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    spinner.add(core);
  } else if (id === 'disco') {
    const geo = new THREE.IcosahedronGeometry(radius, 2).toNonIndexed();
    const colors = [];
    const tones = [0xffffff, 0xcfe6ff, 0x7fb2ff, 0x3a6fe0, 0xe6f2ff, 0x2f55c0];
    const c = new THREE.Color();
    for (let i = 0; i < geo.attributes.position.count; i += 3) {
      c.setHex(tones[(i * 7 + (i >> 2)) % tones.length]);
      for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    spinner = new THREE.Mesh(
      geo,
      new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, specular: 0xffffff, shininess: 200 }),
    );
    // Light spots scattered on the floor around the marble.
    const spotGeo = new THREE.CircleGeometry(0.07, 12);
    extras.spots = SPOT_COLORS.map((color, i) => {
      const m = new THREE.Mesh(
        spotGeo,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      m.userData.angle = (i / SPOT_COLORS.length) * Math.PI * 2;
      m.userData.dist = 0.55 + (i % 3) * 0.28;
      root.add(m);
      return m;
    });
  } else if (id === 'circuit') {
    const { map, glow } = circuitTextures();
    const mat = new THREE.MeshPhongMaterial({
      map,
      emissive: 0xffffff,
      emissiveMap: glow,
      emissiveIntensity: 0.4,
      specular: 0x88ffaa,
      shininess: 90,
    });
    spinner = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), mat);
    extras.glow = glow;
    extras.mat = mat;
  } else {
    spinner = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 20),
      new THREE.MeshPhongMaterial({ map: rainbowSwirlTexture(), specular: 0xffffff, shininess: 140 }),
    );
  }
  spinner.castShadow = true;
  root.add(spinner);

  let wobble = 0;
  let wobbleT = 0;
  let pulse = 0;
  const up = new THREE.Vector3(0, 1, 0);
  const tmpQ = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0);

  return {
    id,
    root,
    spinner,
    reflective: !!envCam,

    update(dt, { speed = 0, landing = 0, up: upDir = Y, grounded = true, spin = null } = {}) {
      up.copy(upDir);
      if (id === 'jelly') {
        if (landing > 1.5) {
          wobble = Math.min(0.32, wobble + landing * 0.035);
          wobbleT = 0;
        }
        wobbleT += dt;
        wobble *= Math.exp(-dt * 4);
        const s = wobble * Math.cos(wobbleT * 22);
        // Squash along "up" in world space, whatever the gravity.
        tmpQ.setFromUnitVectors(Y, up);
        root.quaternion.copy(tmpQ);
        root.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5);
        // The spinner's world rotation must stay the marble's rotation.
        if (spin) spinner.quaternion.copy(tmpQ).invert().multiply(spin);
      } else if (spin) {
        spinner.quaternion.copy(spin);
      }
      if (id === 'disco') {
        const turn = spinner.rotation.y + spinner.rotation.x;
        tmpQ.setFromUnitVectors(Y, up);
        for (const m of extras.spots) {
          const a = m.userData.angle + turn;
          m.position.set(Math.cos(a) * m.userData.dist, -radius + 0.012, Math.sin(a) * m.userData.dist).applyQuaternion(tmpQ);
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);
          m.visible = grounded;
        }
      }
      if (id === 'circuit') {
        pulse += dt * (0.6 + speed * 0.35);
        extras.glow.offset.y = -pulse * 0.08;
        extras.mat.emissiveIntensity = 0.35 + Math.min(1.4, speed / 9) + 0.15 * Math.sin(pulse * 6);
      }
    },

    captureEnv(renderer, scene) {
      if (!envCam) return;
      frame += 1;
      if (frame % 3 !== 1) return;
      root.visible = false;
      envCam.update(renderer, scene);
      root.visible = true;
    },
  };
}

/** Glossy rainbow swirl, after the default marble in the concept art. */
export function rainbowSwirlTexture() {
  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const bands = ['#ff3b6b', '#ff8a1f', '#ffd91a', '#2fd45a', '#19c2d8', '#2f6bff', '#a23bff'];
  const bw = W / bands.length;
  for (let y = 0; y < H; y++) {
    const t = (y / H) * Math.PI * 2;
    const offset = 90 * Math.sin(t) + 40 * Math.sin(t * 3 + 1);
    for (let i = 0; i < bands.length; i++) {
      const x = (((i * bw + offset) % W) + W) % W;
      ctx.fillStyle = bands[i];
      ctx.fillRect(x, y, bw + 1, 1);
      if (x + bw > W) ctx.fillRect(x - W, y, bw + 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Dark green board with traces; a second, traces-only texture glows. */
function circuitTextures() {
  const W = 512;
  const H = 256;
  const draw = (glowOnly) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = glowOnly ? '#000000' : '#0d2a14';
    ctx.fillRect(0, 0, W, H);
    let n = 17;
    const r = () => {
      n = (n * 16807) % 2147483647;
      return n / 2147483647;
    };
    if (!glowOnly) {
      ctx.fillStyle = '#081a0c';
      for (let i = 0; i < 8; i++) ctx.fillRect(r() * W, r() * H, 30 + r() * 30, 20 + r() * 26);
    }
    ctx.strokeStyle = glowOnly ? '#3dff7a' : '#2fd45a';
    ctx.lineWidth = 4;
    for (let i = 0; i < 26; i++) {
      let x = r() * W;
      let y = r() * H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 3; k++) {
        if (r() < 0.5) x += (r() - 0.5) * 160;
        else y += (r() - 0.5) * 110;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = glowOnly ? '#ffe94a' : '#e8c22a';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  };
  return { map: draw(false), glow: draw(true) };
}
