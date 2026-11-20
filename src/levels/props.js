import * as THREE from 'three';
import { textTexture } from './builder.js';
import { codeScreenTexture, robotFaceTexture } from './textures.js';

/*
 * Low-poly props shared across levels. Each maker returns a THREE.Group with
 * its front facing -z and its base at y = 0. Movers wrap a prop in
 * LevelBuilder.kinematic() and steer it with the path helpers at the bottom.
 */

const mats = new Map();
export function mat(color, extra = {}) {
  const key = `${color}|${JSON.stringify(extra)}`;
  if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial({ color, ...extra }));
  return mats.get(key);
}

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, typeof material === 'number' ? mat(material) : material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
const cyl = (r, h, c, x, y, z, seg = 16) => mesh(new THREE.CylinderGeometry(r, r, h, seg), c, x, y, z);
const ball = (r, c, x, y, z) => mesh(new THREE.SphereGeometry(r, 14, 10), c, x, y, z);

function textPlane(text, w, h, style) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: textTexture(text, w, h, style) }),
  );
}

export function tagSprite(text, width = 1.1, style = {}) {
  const h = 0.32;
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textTexture(text, width, h, { bg: '#ffe94a', fg: '#1b1b1f', border: '#1b1b1f', ...style }),
    }),
  );
  s.scale.set(width, h, 1);
  return s;
}

// ---------------------------------------------------------------- people

/** Blocky office person, mid-stride capable. Call animate(phase) to walk. */
export function person({ shirt = 0x2f6bff, pants = 0x1b2740, skin = 0xe0b48a, hair = 0x3a2a1a, tag = null } = {}) {
  const g = new THREE.Group();
  const legs = [-0.11, 0.11].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.8, 0);
    pivot.add(box(0.18, 0.8, 0.2, pants, 0, -0.4, 0));
    pivot.add(box(0.2, 0.08, 0.3, 0xf2f2f2, 0, -0.78, -0.04));
    g.add(pivot);
    return pivot;
  });
  g.add(box(0.5, 0.62, 0.28, shirt, 0, 1.11, 0));
  g.add(box(0.1, 0.13, 0.02, 0xffffff, 0.12, 1.22, -0.15)); // badge
  const arms = [-0.32, 0.32].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.38, 0);
    pivot.add(box(0.14, 0.52, 0.16, shirt, 0, -0.26, 0));
    pivot.add(box(0.12, 0.1, 0.14, skin, 0, -0.57, 0));
    g.add(pivot);
    return pivot;
  });
  g.add(box(0.32, 0.34, 0.3, skin, 0, 1.6, 0));
  g.add(box(0.34, 0.1, 0.32, hair, 0, 1.8, 0.01));
  for (const x of [-0.07, 0.07]) g.add(box(0.05, 0.05, 0.01, 0x1b1b1f, x, 1.63, -0.155));
  if (tag) {
    const t = tagSprite(tag, Math.max(0.7, tag.length * 0.17));
    t.position.y = 2.15;
    g.add(t);
  }
  return {
    group: g,
    animate(phase) {
      const a = Math.sin(phase) * 0.6;
      legs[0].rotation.x = a;
      legs[1].rotation.x = -a;
      arms[0].rotation.x = -a * 0.8;
      arms[1].rotation.x = a * 0.8;
    },
  };
}

// ---------------------------------------------------------------- office

export function rollingChair(color = 0xe8673a) {
  const g = new THREE.Group();
  g.add(cyl(0.35, 0.05, 0x1b1b1f, 0, 0.025, 0, 20));
  g.add(cyl(0.04, 0.42, 0x555b66, 0, 0.26, 0));
  g.add(box(0.56, 0.1, 0.56, color, 0, 0.5, 0));
  g.add(box(0.56, 0.62, 0.08, color, 0, 0.86, 0.26));
  return g;
}

/** Desk visual: wood top over a dark body. Size is the whole block. */
export function deskVisual(w, h, d, wood = 0xe2b46a, body = 0x2b3446) {
  const g = new THREE.Group();
  g.add(box(w, 0.08, d, wood, 0, h - 0.04, 0));
  g.add(box(w - 0.12, h - 0.08, d - 0.12, body, 0, (h - 0.08) / 2, 0));
  return g;
}

export function monitor(seed = 1) {
  const g = new THREE.Group();
  g.add(box(0.1, 0.25, 0.1, 0x1b1b1f, 0, 0.12, 0));
  g.add(box(0.75, 0.48, 0.05, 0x1b1b1f, 0, 0.5, 0));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.41),
    new THREE.MeshBasicMaterial({ map: codeScreenTexture(seed) }),
  );
  screen.position.set(0, 0.5, -0.03);
  screen.rotation.y = Math.PI;
  g.add(screen);
  return g;
}

export function plant() {
  const g = new THREE.Group();
  g.add(cyl(0.28, 0.5, 0xe8673a, 0, 0.25, 0));
  g.add(ball(0.5, 0x3a9d4a, 0, 0.85, 0));
  g.add(ball(0.35, 0x4fbf5c, 0.2, 1.15, 0.1));
  return g;
}

// ---------------------------------------------------------------- street

/** FAKEMO robotaxi: white low-poly SUV, roof sensor, green/blue stripe. */
export function robotaxi() {
  const g = new THREE.Group();
  g.add(box(1.9, 0.75, 4.4, 0xf4f4f4, 0, 0.62, 0));
  g.add(box(1.7, 0.62, 2.5, 0xf4f4f4, 0, 1.3, 0.25));
  g.add(box(1.74, 0.38, 2.3, 0x1b2232, 0, 1.33, 0.25)); // windows
  g.add(box(1.92, 0.07, 4.42, 0x2fd45a, 0, 0.5, 0));
  g.add(box(1.92, 0.07, 4.42, 0x2f6bff, 0, 0.42, 0));
  g.add(cyl(0.22, 0.26, 0x1b1b1f, 0, 1.75, 0.25));
  g.add(cyl(0.24, 0.05, 0x2fd45a, 0, 1.64, 0.25));
  for (const x of [-0.95, 0.95]) {
    for (const z of [-1.35, 1.35]) {
      const w = cyl(0.36, 0.26, 0x1b1b1f, x, 0.36, z, 14);
      w.rotation.z = Math.PI / 2;
      g.add(w);
    }
  }
  for (const x of [-0.6, 0.6]) g.add(box(0.4, 0.14, 0.04, 0xffe94a, x, 0.75, -2.21));
  for (const x of [-0.6, 0.6]) g.add(box(0.4, 0.14, 0.04, 0xe8302a, x, 0.75, 2.21));
  for (const side of [-1, 1]) {
    const t = textPlane('FAKEMO', 1.5, 0.36, { bg: '#f4f4f4', fg: '#14a06a' });
    t.position.set(side * 0.96, 0.78, 0);
    t.rotation.y = (side * Math.PI) / 2;
    g.add(t);
  }
  return g;
}

export function trafficCone() {
  const g = new THREE.Group();
  g.add(box(0.36, 0.04, 0.36, 0xff7a1a, 0, 0.02, 0));
  g.add(mesh(new THREE.ConeGeometry(0.15, 0.5, 12), 0xff7a1a, 0, 0.29, 0));
  g.add(cyl(0.1, 0.07, 0xffffff, 0, 0.3, 0));
  return g;
}

export function trafficLight() {
  const g = new THREE.Group();
  g.add(cyl(0.08, 3.4, 0x2b2b2f, 0, 1.7, 0));
  g.add(box(0.4, 1.05, 0.35, 0x1b1b1f, 0, 3.6, 0));
  [0xe8302a, 0xffd21f, 0x2fd45a].forEach((c, i) => {
    g.add(ball(0.12, mat(c, { emissive: c, emissiveIntensity: 0.5 }), 0, 3.95 - i * 0.33, -0.18));
  });
  return g;
}

/** Victorian row house, front facing -z. */
export function rowHouse(w, h, d, color, trim = 0xffffff, roof = 0x6a3b8f) {
  const g = new THREE.Group();
  g.add(box(w, h, d, color, 0, h / 2, 0));
  const shape = new THREE.Shape([
    new THREE.Vector2(-w / 2 - 0.3, 0),
    new THREE.Vector2(w / 2 + 0.3, 0),
    new THREE.Vector2(0, w * 0.45),
  ]);
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.4, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + 0.4) / 2);
  g.add(mesh(roofGeo, roof, 0, h, 0));
  const gable = new THREE.Shape([
    new THREE.Vector2(-w / 2 + 0.4, 0.2),
    new THREE.Vector2(w / 2 - 0.4, 0.2),
    new THREE.Vector2(0, w * 0.45 - 0.5),
  ]);
  const gableMesh = mesh(new THREE.ShapeGeometry(gable), trim, 0, h, -d / 2 - 0.21);
  gableMesh.rotation.y = Math.PI;
  g.add(gableMesh);
  const floors = Math.max(1, Math.floor(h / 3));
  for (let f = 0; f < floors; f++) {
    for (const x of [-w / 4, w / 4]) {
      if (f === 0 && x < 0) continue; // door goes here
      g.add(box(1.0, 1.3, 0.05, trim, x, 1.6 + f * 3, -d / 2 - 0.02));
      g.add(box(0.8, 1.1, 0.06, 0x6fa8dc, x, 1.6 + f * 3, -d / 2 - 0.03));
    }
  }
  g.add(box(0.95, 2.0, 0.06, 0x8e2f2f, -w / 4, 1.0, -d / 2 - 0.03));
  return g;
}

export function tree(scale = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.18 * scale, 2.4 * scale, 0x6b4423, 0, 1.2 * scale, 0, 8));
  g.add(ball(1.1 * scale, 0x3a9d4a, 0, 2.8 * scale, 0));
  g.add(ball(0.8 * scale, 0x4fbf5c, 0.5 * scale, 3.4 * scale, 0.2 * scale));
  return g;
}

export function palmTree() {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const seg = cyl(0.17 - i * 0.012, 0.9, 0x9a7444, i * 0.06, 0.45 + i * 0.85, 0, 8);
    g.add(seg);
  }
  for (let i = 0; i < 7; i++) {
    const leaf = box(0.5, 0.06, 2.4, 0x3fae4f, 0, 0, -1.1);
    const pivot = new THREE.Group();
    pivot.add(leaf);
    pivot.position.set(0.36, 5.2, 0);
    pivot.rotation.set(-0.45, (i / 7) * Math.PI * 2, 0, 'YXZ');
    g.add(pivot);
  }
  return g;
}

export function blimp(text = 'MONACO') {
  const g = new THREE.Group();
  const body = ball(1, mat(0x141418), 0, 0, 0);
  body.scale.set(4.2, 3.2, 12);
  g.add(body);
  for (const [x, y, w, h] of [[0, 3, 0.25, 3], [0, -3, 0.25, 3], [3, 0, 3, 0.25], [-3, 0, 3, 0.25]]) {
    g.add(box(w, h, 2.6, 0x141418, x * 0.7, y * 0.7, 10.6));
  }
  g.add(box(1.6, 0.9, 3.2, 0x2b2b2f, 0, -3.35, -1));
  g.add(box(1.62, 0.4, 2.6, 0x6fa8dc, 0, -3.3, -1));
  for (const side of [-1, 1]) {
    const t = textPlane(text, 9, 1.8, { bg: '#141418', fg: '#ffffff' });
    t.position.set(side * 4.05, 0.4, -1);
    t.rotation.y = (side * Math.PI) / 2;
    g.add(t);
  }
  return g;
}

// ---------------------------------------------------------------- house party

export function couch(color = 0x7a4a2a) {
  const g = new THREE.Group();
  g.add(box(3.2, 0.45, 1.1, color, 0, 0.225, 0));
  g.add(box(3.2, 0.7, 0.3, color, 0, 0.8, 0.4));
  for (const x of [-1.5, 1.5]) g.add(box(0.25, 0.65, 1.1, color, x, 0.55, 0));
  for (const x of [-0.75, 0.75]) g.add(box(1.4, 0.15, 0.85, 0x8f5a36, x, 0.52, -0.08));
  return g;
}

export function serverRack() {
  const g = new THREE.Group();
  g.add(box(0.8, 2.0, 1.0, 0x1b2740, 0, 1.0, 0));
  for (let i = 0; i < 8; i++) {
    g.add(box(0.7, 0.16, 0.02, 0x2c3a5c, 0, 0.3 + i * 0.22, -0.51));
    g.add(box(0.05, 0.05, 0.02, i % 3 ? 0x3fe36a : 0xffb02e, -0.25, 0.3 + i * 0.22, -0.53));
  }
  return g;
}

export function foosball() {
  const g = new THREE.Group();
  g.add(box(1.4, 0.3, 0.8, 0x2b6a3a, 0, 0.85, 0));
  for (const [x, z] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) g.add(box(0.08, 0.7, 0.08, 0x1b1b1f, x, 0.35, z));
  for (let i = 0; i < 6; i++) g.add(cyl(0.02, 1.4, 0xcccccc, -0.55 + i * 0.22, 0.95, 0, 6).rotateX(Math.PI / 2));
  return g;
}

/** Hot dog on a roll, lying along z. */
export function hotDog() {
  const g = new THREE.Group();
  const bun = mesh(new THREE.CapsuleGeometry(0.32, 1.1, 4, 10), 0xe0a659);
  bun.rotation.x = Math.PI / 2;
  bun.scale.set(1.25, 1, 0.75);
  g.add(bun);
  const sausage = mesh(new THREE.CapsuleGeometry(0.17, 1.5, 4, 10), 0xb5482a, 0, 0.2, 0);
  sausage.rotation.x = Math.PI / 2;
  g.add(sausage);
  return g;
}

// ---------------------------------------------------------------- space

/** Boxy robot with an angry screen face. */
export function robot() {
  const g = new THREE.Group();
  g.add(box(0.85, 0.22, 0.7, 0x2b2b2f, 0, 0.11, 0));
  g.add(box(0.75, 0.6, 0.55, 0xc9ced8, 0, 0.52, 0));
  g.add(box(0.3, 0.14, 0.02, 0xffb02e, 0, 0.55, -0.28));
  for (const x of [-0.45, 0.45]) g.add(box(0.14, 0.3, 0.2, 0xe8302a, x, 0.6, 0));
  const head = box(0.68, 0.52, 0.5, 0xc9ced8, 0, 1.12, 0);
  g.add(head);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.4),
    new THREE.MeshBasicMaterial({ map: robotFaceTexture() }),
  );
  face.position.set(0, 1.12, -0.26);
  face.rotation.y = Math.PI;
  g.add(face);
  g.add(cyl(0.02, 0.3, 0x2b2b2f, 0, 1.53, 0, 6));
  g.add(ball(0.05, mat(0xe8302a, { emissive: 0xe8302a }), 0, 1.7, 0));
  return g;
}

/** Flying saucer with a grinning green alien under a glass dome. */
export function saucer() {
  const g = new THREE.Group();
  const disc = mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.6, 28), 0xb5bccb);
  g.add(disc);
  g.add(mesh(new THREE.CylinderGeometry(1.4, 2.2, 0.5, 24), 0x8890a0, 0, -0.5, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.add(ball(0.14, mat(0x7dff6a, { emissive: 0x3fe36a }), Math.cos(a) * 3.3, 0, Math.sin(a) * 3.3));
  }
  g.add(ball(0.75, 0x3fe36a, 0, 0.95, 0));
  for (const x of [-0.28, 0.28]) {
    g.add(ball(0.18, 0xffffff, x, 1.1, -0.6));
    g.add(ball(0.09, 0x1b1b1f, x, 1.1, -0.75));
    g.add(cyl(0.03, 0.5, 0x3fe36a, x * 1.2, 1.85, 0, 6));
    g.add(ball(0.08, 0x3fe36a, x * 1.2, 2.1, 0));
  }
  g.add(box(0.6, 0.08, 0.05, 0x1b1b1f, 0, 0.7, -0.72));
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  dome.position.y = 0.3;
  g.add(dome);
  const plate = textPlane('JUST VISITING', 3.6, 0.5, { bg: '#123a1c', fg: '#7dff6a', border: '#7dff6a' });
  plate.position.set(0, -0.1, -3.62);
  plate.rotation.y = Math.PI;
  g.add(plate);
  return g;
}

export function rubberDuck() {
  const g = new THREE.Group();
  const body = ball(1, 0xffd21f, 0, 0, 0);
  body.scale.set(1.3, 0.9, 1);
  g.add(body);
  g.add(ball(0.6, 0xffd21f, 0.7, 0.9, 0));
  g.add(box(0.5, 0.15, 0.4, 0xff7a1a, 1.3, 0.85, 0));
  for (const z of [-0.3, 0.3]) g.add(ball(0.08, 0x1b1b1f, 1.05, 1.1, z));
  return g;
}

export function rocket() {
  const g = new THREE.Group();
  g.add(cyl(0.7, 4, 0xe8e8ee, 0, 0, 0, 16));
  g.add(mesh(new THREE.ConeGeometry(0.7, 1.4, 16), 0xe8302a, 0, 2.7, 0));
  g.add(cyl(0.72, 0.3, 0x1b1b1f, 0, 0.6, 0, 16));
  for (let i = 0; i < 3; i++) {
    const fin = box(0.1, 1.2, 0.9, 0xe8302a, 0, -1.6, 0);
    const pivot = new THREE.Group();
    fin.position.set(0, -1.6, 0.9);
    pivot.add(fin);
    pivot.rotation.y = (i / 3) * Math.PI * 2;
    g.add(pivot);
  }
  return g;
}

export function satellite() {
  const g = new THREE.Group();
  g.add(box(1.1, 1.1, 1.1, 0xb5884a, 0, 0, 0));
  for (const x of [-1.9, 1.9]) g.add(box(2.4, 0.06, 0.9, 0x2a4fbf, x, 0, 0));
  g.add(mesh(new THREE.ConeGeometry(0.45, 0.5, 12), 0xe8e8ee, 0, 0.8, 0));
  return g;
}

// ---------------------------------------------------------------- motion

/** Ping-pong along a polyline. Returns fn(distance) -> {pos, dir}. */
export function pingPong(points) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const len = points[i].distanceTo(points[i + 1]);
    segs.push({ a: points[i], b: points[i + 1], len, start: total });
    total += len;
  }
  return (d) => {
    let x = ((d % (total * 2)) + total * 2) % (total * 2);
    const back = x > total;
    if (back) x = total * 2 - x;
    const seg = segs.find((s) => x <= s.start + s.len) ?? segs[segs.length - 1];
    const t = (x - seg.start) / seg.len;
    const pos = seg.a.clone().lerp(seg.b, t);
    const dir = seg.b.clone().sub(seg.a).normalize();
    if (back) dir.negate();
    return { pos, dir };
  };
}

const UP = new THREE.Vector3(0, 1, 0);
/** Quaternion that turns a prop's -z front toward horizontal direction `dir`. */
export function faceQuat(dir, q = new THREE.Quaternion()) {
  return q.setFromAxisAngle(UP, Math.atan2(-dir.x, -dir.z));
}

/** A walking person on a ping-pong path, with a body collider. */
export function walker(b, look, path, { speed = 1.2, offset = 0 } = {}) {
  const p = person(look);
  const k = b.kinematic(p.group, [b.RAPIER.ColliderDesc.cuboid(0.28, 0.85, 0.2).setTranslation(0, 0.85, 0)]);
  const along = pingPong(path);
  const q = new THREE.Quaternion();
  const step = (t) => {
    const d = speed * t + offset;
    const { pos, dir } = along(d);
    k.place(pos, faceQuat(dir, q));
    p.animate(d * 3.4);
  };
  step(0);
  return { step, person: p, kinematic: k };
}
