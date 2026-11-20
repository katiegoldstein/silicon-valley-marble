import * as THREE from 'three';

/**
 * Shared level-building kit. Solid pieces add a mesh to the scene and a
 * matching fixed collider to the physics world in one call; decor pieces are
 * mesh-only. Levels are built by calling these.
 * Convention: +y is up and the course runs "forward" along -z. Units are meters.
 */
export class LevelBuilder {
  constructor(RAPIER, world, scene) {
    this.RAPIER = RAPIER;
    this.world = world;
    this.scene = scene;
    this.tiles = tileTexture();
    this.tiled = new Map();
    this.flats = new Map();
  }

  /** Tiled 1 m grid material in the given tint. */
  material(color) {
    if (!this.tiled.has(color)) {
      this.tiled.set(color, new THREE.MeshLambertMaterial({ color, map: this.tiles }));
    }
    return this.tiled.get(color);
  }

  /** Plain flat-colored material. */
  flat(color) {
    if (!this.flats.has(color)) {
      this.flats.set(color, new THREE.MeshLambertMaterial({ color }));
    }
    return this.flats.get(color);
  }

  /** Add a mesh with no collider. */
  decor(mesh, { shadow = false } = {}) {
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    this.scene.add(mesh);
    return mesh;
  }

  /**
   * Box, axis-aligned or rotated.
   * @param {{x:number,y:number,z:number}} center
   * @param {{x:number,y:number,z:number}} size full extents
   * @param {object} [opts] color | material, rot (THREE.Euler), friction,
   *   collide (false = decor only), castShadow
   */
  box(center, size, opts = {}) {
    const {
      color = 0xb9bec6,
      material = null,
      rot = null,
      friction = 1,
      collide = true,
      castShadow = true,
    } = opts;
    const mesh = new THREE.Mesh(tiledBox(size.x, size.y, size.z), material ?? this.material(color));
    mesh.position.set(center.x, center.y, center.z);
    if (rot) mesh.rotation.copy(rot);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    if (collide) {
      const q = mesh.quaternion;
      mesh.userData.collider = this.world.createCollider(
        this.RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
          .setTranslation(center.x, center.y, center.z)
          .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
          .setFriction(friction),
      );
    }
    return mesh;
  }

  /** Solid block sitting on `baseY`, with its top surface at `topY`. */
  block(x, z0, z1, width, topY, { baseY = 0, ...opts } = {}) {
    const h = topY - baseY;
    return this.box(
      { x, y: baseY + h / 2, z: (z0 + z1) / 2 },
      { x: width, y: h, z: Math.abs(z1 - z0) },
      opts,
    );
  }

  /**
   * Ramp slab whose top surface runs from (z0, y0) to (z1, y1) along -z.
   * Negative rise makes a down-ramp.
   */
  ramp(x, z0, y0, z1, y1, width, opts = {}) {
    const run = z0 - z1;
    const rise = y1 - y0;
    const angle = Math.atan2(rise, run);
    const thickness = 0.5;
    const ny = Math.cos(angle);
    const nz = Math.sin(angle);
    return this.box(
      {
        x,
        y: (y0 + y1) / 2 - (ny * thickness) / 2,
        z: (z0 + z1) / 2 - (nz * thickness) / 2,
      },
      { x: width, y: thickness, z: Math.hypot(run, rise) },
      { color: 0x9aa1ab, ...opts, rot: new THREE.Euler(angle, 0, 0) },
    );
  }

  /** Upright cylinder standing on `baseY`. */
  pillar(x, z, radius, height, { color = 0x8d949e, baseY = 0 } = {}) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 20),
      this.flat(color),
    );
    mesh.position.set(x, baseY + height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.world.createCollider(
      this.RAPIER.ColliderDesc.cylinder(height / 2, radius)
        .setTranslation(x, baseY + height / 2, z)
        .setFriction(1),
    );
    return mesh;
  }

  /** Rounded speed bump lying across the lane (axis along x), poking `height` above `baseY`. */
  bump(x, z, width, height, { color = 0x8d949e, baseY = 0 } = {}) {
    const radius = 0.6;
    const y = baseY + height - radius;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, width, 24),
      this.flat(color),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.z = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    const q = mesh.quaternion;
    this.world.createCollider(
      this.RAPIER.ColliderDesc.cylinder(width / 2, radius)
        .setTranslation(x, y, z)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        .setFriction(1),
    );
    return mesh;
  }

  /**
   * Flat text sign (decor), facing +z unless rotated. Unlit so it always reads.
   * `text` may contain \n.
   */
  sign(text, center, width, height, style = {}) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: textTexture(text, width, height, style) }),
    );
    mesh.position.set(center.x, center.y, center.z);
    this.scene.add(mesh);
    return mesh;
  }

  /**
   * Moving solid (people, cars, robots, platforms). `colliders` are
   * ColliderDescs in the object's local frame. Move it with `place()` once per
   * physics tick; anything it touches gets shoved.
   */
  kinematic(object, colliders) {
    const body = this.world.createRigidBody(this.RAPIER.RigidBodyDesc.kinematicPositionBased());
    for (const desc of colliders) this.world.createCollider(desc.setFriction(1), body);
    object.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    this.scene.add(object);
    let placed = false;
    const teleport = (pos, quat) => {
      body.setTranslation(pos, true);
      body.setRotation(quat, true);
      placed = true;
    };
    return {
      body,
      object,
      /** Move to a new pose this tick. Big jumps (restarts) teleport instead of sweeping. */
      place(pos, quat = IDENTITY) {
        if (!placed || object.position.distanceToSquared(pos) > 9) teleport(pos, quat);
        else {
          body.setNextKinematicTranslation(pos);
          body.setNextKinematicRotation(quat);
        }
        object.position.copy(pos);
        object.quaternion.copy(quat);
      },
    };
  }

  /**
   * Smooth track surface along `track` (from trackFrames). Rendered as a slab;
   * the collider is the top surface as one triangle mesh, so there are no
   * seams for the marble to catch on.
   */
  ribbon(track, { width = 6, thickness = 0.6, top, side, uvLength = 4 }) {
    const { frames } = track;
    const pos = [];
    const uv = [];
    const half = width / 2;
    const corner = (f, s, down) =>
      f.p.clone().addScaledVector(f.side, s * half).addScaledVector(f.up, -down * thickness);
    // Per frame, 8 vertices: top L/R, bottom L/R, left side top/bottom, right side top/bottom.
    for (const f of frames) {
      const v = f.s / uvLength;
      const pts = [
        corner(f, -1, 0), corner(f, 1, 0),
        corner(f, -1, 1), corner(f, 1, 1),
        corner(f, -1, 0), corner(f, -1, 1),
        corner(f, 1, 0), corner(f, 1, 1),
      ];
      const us = [0, 1, 0, 1, 0, 0, 1, 1];
      pts.forEach((p, k) => {
        pos.push(p.x, p.y, p.z);
        uv.push(us[k], v);
      });
    }
    const topIdx = [];
    const restIdx = [];
    for (let i = 0; i < frames.length - 1; i++) {
      const a = i * 8;
      const b2 = (i + 1) * 8;
      topIdx.push(a, a + 1, b2, a + 1, b2 + 1, b2);
      restIdx.push(a + 2, b2 + 2, a + 3, a + 3, b2 + 2, b2 + 3); // bottom
      restIdx.push(a + 4, b2 + 4, a + 5, b2 + 4, b2 + 5, a + 5); // left
      restIdx.push(a + 6, a + 7, b2 + 6, b2 + 6, a + 7, b2 + 7); // right
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex([...topIdx, ...restIdx]);
    geo.addGroup(0, topIdx.length, 0);
    geo.addGroup(topIdx.length, restIdx.length, 1);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, [top, side]);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Collider: top surface only, with shared vertices so internal edges are smooth.
    const verts = new Float32Array(frames.length * 6);
    const idx = [];
    frames.forEach((f, i) => {
      const l = corner(f, -1, 0);
      const r = corner(f, 1, 0);
      verts.set([l.x, l.y, l.z, r.x, r.y, r.z], i * 6);
      if (i < frames.length - 1) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const flags = this.RAPIER.TriMeshFlags?.FIX_INTERNAL_EDGES;
    const desc =
      flags !== undefined
        ? this.RAPIER.ColliderDesc.trimesh(verts, new Uint32Array(idx), flags)
        : this.RAPIER.ColliderDesc.trimesh(verts, new Uint32Array(idx));
    this.world.createCollider(desc.setFriction(1));
    return mesh;
  }

  /** Text that always faces the camera (name tags, speech bubbles). */
  label(text, pos, width, height, style = {}) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: textTexture(text, width, height, style) }),
    );
    sprite.scale.set(width, height, 1);
    sprite.position.set(pos.x, pos.y, pos.z);
    this.scene.add(sprite);
    return sprite;
  }

  /** Start/finish pad: stacked concentric discs, outermost first. Decor only. */
  pad(center, rings) {
    const group = new THREE.Group();
    rings.forEach(([radius, color], i) => {
      const h = 0.03 * (i + 1);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, h, 32), this.flat(color));
      disc.position.y = h / 2;
      disc.receiveShadow = true;
      group.add(disc);
    });
    group.position.set(center.x, center.y, center.z);
    this.scene.add(group);
    return group;
  }
}

const IDENTITY = new THREE.Quaternion();

/**
 * Sample a smooth curve through `points` into evenly spaced frames
 * {p, T, side, up, s}. The track banks into turns automatically (left turns
 * raise the right edge), scaled by how sharp the turn is.
 */
export function trackFrames(points, { spacing = 1, bankGain = 4.5, maxBank = 0.4, smooth = 6 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const length = curve.getLength();
  const n = Math.max(2, Math.round(length / spacing));
  const ds = length / n;
  const worldUp = new THREE.Vector3(0, 1, 0);
  const frames = [];
  const headings = [];
  let prev = null;
  let unwrapped = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const T = curve.getTangentAt(u).normalize();
    const h = Math.atan2(-T.x, -T.z); // 0 = facing -z; grows turning left
    if (prev === null) unwrapped = h;
    else {
      let d = h - prev;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      unwrapped += d;
    }
    prev = h;
    headings.push(unwrapped);
    frames.push({ p: curve.getPointAt(u), T, s: u * length });
  }
  const raw = headings.map((_, i) => {
    const a = Math.max(0, i - 1);
    const c = Math.min(n, i + 1);
    return THREE.MathUtils.clamp(((headings[c] - headings[a]) / ((c - a) * ds)) * bankGain, -maxBank, maxBank);
  });
  frames.forEach((f, i) => {
    let sum = 0;
    let count = 0;
    for (let j = i - smooth; j <= i + smooth; j++) {
      if (j >= 0 && j <= n) {
        sum += raw[j];
        count++;
      }
    }
    const bank = sum / count;
    const side0 = new THREE.Vector3().crossVectors(f.T, worldUp).normalize();
    const up0 = new THREE.Vector3().crossVectors(side0, f.T).normalize();
    f.side = side0.clone().multiplyScalar(Math.cos(bank)).addScaledVector(up0, Math.sin(bank));
    f.up = up0.clone().multiplyScalar(Math.cos(bank)).addScaledVector(side0, -Math.sin(bank));
  });
  return {
    frames,
    length,
    /** Interpolated frame at distance s along the track. */
    at(s) {
      const x = THREE.MathUtils.clamp((s / length) * n, 0, n);
      const i = Math.min(n - 1, Math.floor(x));
      const t = x - i;
      const a = frames[i];
      const b = frames[i + 1];
      return {
        p: a.p.clone().lerp(b.p, t),
        T: a.T.clone().lerp(b.T, t).normalize(),
        side: a.side.clone().lerp(b.side, t).normalize(),
        up: a.up.clone().lerp(b.up, t).normalize(),
        s,
      };
    },
  };
}

/** Canvas texture with centered text, sized to fit. Used for signs. */
export function textTexture(text, width, height, style = {}) {
  const {
    bg = '#ffffff',
    fg = '#0d2560',
    border = null,
    font = '"Luckiest Guy", system-ui, sans-serif',
  } = style;
  const scale = Math.min(160, 1024 / Math.max(width, height));
  const W = Math.round(width * scale);
  const H = Math.round(height * scale);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  if (border) {
    const bw = Math.max(4, H * 0.06);
    ctx.strokeStyle = border;
    ctx.lineWidth = bw;
    ctx.strokeRect(bw / 2, bw / 2, W - bw, H - bw);
  }
  const lines = text.split('\n');
  let size = (H * 0.8) / lines.length;
  const fits = () => {
    ctx.font = `${size}px ${font}`;
    return lines.every((l) => ctx.measureText(l).width <= W * 0.86);
  };
  while (!fits() && size > 8) size *= 0.94;
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    // Luckiest Guy sits high in its box; nudge down a touch.
    ctx.fillText(line, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.05 + size * 0.06);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Yellow/black diagonal hazard stripes, repeating every 2 m. */
export function hazardTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffd21f';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#1b1b1f';
  const band = S / 4;
  for (let i = -2; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(i * band * 2, 0);
    ctx.lineTo(i * band * 2 + band, 0);
    ctx.lineTo(i * band * 2 + band - S, S);
    ctx.lineTo(i * band * 2 - S, S);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Box whose UVs repeat once per 2 m, so tiles stay square on every face. */
export function tiledBox(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 vertices each).
  const spans = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let face = 0; face < 6; face++) {
    for (let k = 0; k < 4; k++) {
      const i = face * 4 + k;
      uv.setXY(i, (uv.getX(i) * spans[face][0]) / 2, (uv.getY(i) * spans[face][1]) / 2);
    }
  }
  return geo;
}

/** 2 x 2 m checker of 1 m tiles with grid lines; tinted by the material color. */
function tileTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const half = S / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#e2e5ea';
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);
  ctx.strokeStyle = '#8f96a1';
  ctx.lineWidth = 6;
  for (const p of [0, half, S]) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, S);
    ctx.moveTo(0, p);
    ctx.lineTo(S, p);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}
