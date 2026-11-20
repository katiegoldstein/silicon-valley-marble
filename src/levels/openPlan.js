import * as THREE from 'three';
import { tuning } from '../tuning.js';
import { hazardTexture } from './builder.js';
import { plankTexture } from './textures.js';
import { deskVisual, monitor, plant, rollingChair, faceQuat, walker } from './props.js';

/**
 * Level 2 — Open Plan (AI lab offices). "Stay aligned."
 * Acme Superintelligence's open-plan floor. Teaches precision on narrow paths.
 *
 * Route (forward is -z):
 *   z   0        start pad in the center aisle
 *   z -8..-30    swivel chairs roll back and forth across the aisle
 *   z -30..-46   office workers walk around and bump you
 *   z -34..-40   ramp onto the stair-stepped standing desks (right side)
 *   z -40..-61   desk-to-desk hops, each 2 m apart, climbing to 3 m
 *   z -62..-66   hazard-striped standing-desk elevator, 3 m <-> 6 m
 *   z -66..-82   glass-railed mezzanine at 6 m; finish pad; the "CEO" walks here
 */
export function buildOpenPlan(b) {
  const R = tuning.radius;
  const ROOM = { x: 12, zBack: 8, zFar: -82, ceiling: 9 };
  const MEZZ = { top: 6, zFront: -66 };
  const length = ROOM.zBack - ROOM.zFar;
  const zMid = (ROOM.zBack + ROOM.zFar) / 2;
  const noShadow = { collide: false, castShadow: false };

  // ---------- Floor and shell ----------
  const plank = new THREE.MeshLambertMaterial({ map: plankTexture() });
  b.box({ x: 0, y: -0.5, z: zMid }, { x: ROOM.x * 2, y: 1, z: length }, { material: plank });

  const wallMat = b.flat(0xeeeae2);
  b.box({ x: ROOM.x + 0.25, y: ROOM.ceiling / 2, z: zMid }, { x: 0.5, y: ROOM.ceiling, z: length }, { material: wallMat, castShadow: false });
  b.box({ x: 0, y: ROOM.ceiling / 2, z: ROOM.zBack + 0.25 }, { x: ROOM.x * 2, y: ROOM.ceiling, z: 0.5 }, { material: wallMat, castShadow: false });
  b.box({ x: 0, y: ROOM.ceiling / 2, z: ROOM.zFar - 0.25 }, { x: ROOM.x * 2, y: ROOM.ceiling, z: 0.5 }, { material: wallMat, castShadow: false });
  // Wainscot on the right wall.
  b.box({ x: ROOM.x - 0.02, y: 0.6, z: zMid }, { x: 0.05, y: 1.2, z: length }, { material: b.flat(0xc9955a), ...noShadow });

  // Window wall on the left: glass you can't roll through, with mullions.
  const glass = new THREE.MeshLambertMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.18, depthWrite: false });
  b.box({ x: -ROOM.x - 0.1, y: ROOM.ceiling / 2, z: zMid }, { x: 0.2, y: ROOM.ceiling, z: length }, { material: glass, castShadow: false });
  const mullion = b.flat(0x2b2f38);
  for (let z = ROOM.zBack; z >= ROOM.zFar; z -= 4.5) {
    b.box({ x: -ROOM.x, y: ROOM.ceiling / 2, z }, { x: 0.25, y: ROOM.ceiling, z: 0.25 }, { material: mullion, collide: false });
  }
  for (const y of [0.15, 4.5]) {
    b.box({ x: -ROOM.x, y, z: zMid }, { x: 0.25, y: 0.25, z: length }, { material: mullion, collide: false, castShadow: false });
  }

  // Ceiling, beams, ducts, pendant lights.
  b.box({ x: 0, y: ROOM.ceiling + 0.25, z: zMid }, { x: ROOM.x * 2 + 1, y: 0.5, z: length }, { color: 0x8794a8, ...noShadow });
  for (let z = 4; z > ROOM.zFar; z -= 9) {
    b.box({ x: 0, y: ROOM.ceiling - 0.25, z }, { x: ROOM.x * 2, y: 0.5, z: 0.4 }, { material: b.flat(0x1f232b), ...noShadow });
  }
  for (const x of [-6, 6]) {
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, length, 16), b.flat(0xa9b1bd));
    duct.rotation.x = Math.PI / 2;
    duct.position.set(x, ROOM.ceiling - 1, zMid);
    b.decor(duct);
  }
  const bulb = new THREE.MeshBasicMaterial({ color: 0xfff1c2 });
  for (let z = 0; z > -64; z -= 9) {
    for (const x of [-3, 3]) {
      const cordLen = 2.4;
      b.box({ x, y: ROOM.ceiling - cordLen / 2, z }, { x: 0.03, y: cordLen, z: 0.03 }, { material: mullion, ...noShadow });
      b.decor(new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), bulb)).position.set(x, ROOM.ceiling - cordLen - 0.2, z);
    }
  }

  // ---------- Mezzanine ----------
  const mezzDepth = MEZZ.zFront - ROOM.zFar;
  b.box(
    { x: 0, y: MEZZ.top - 0.2, z: (MEZZ.zFront + ROOM.zFar) / 2 },
    { x: ROOM.x * 2, y: 0.4, z: mezzDepth },
    { material: plank },
  );
  for (const x of [-9, -3, 2]) b.pillar(x, MEZZ.zFront - 0.6, 0.25, MEZZ.top - 0.4, { color: 0x2b2f38 });
  // Glass railing with an opening where the elevator arrives (x 5.5 to 8.5).
  const railY = MEZZ.top + 0.5;
  for (const [x0, x1] of [[-ROOM.x, 5.5], [8.5, ROOM.x]]) {
    b.box({ x: (x0 + x1) / 2, y: railY, z: MEZZ.zFront + 0.05 }, { x: x1 - x0, y: 1, z: 0.1 }, { material: glass, castShadow: false });
    b.box({ x: (x0 + x1) / 2, y: railY + 0.5, z: MEZZ.zFront + 0.05 }, { x: x1 - x0, y: 0.08, z: 0.14 }, { material: mullion, collide: false });
  }

  // ---------- Standing-desk staircase (the route) ----------
  const wood = 0xe2b46a;
  function routeDesk(x, z0, z1, width, top) {
    const d = deskVisual(width, top, z0 - z1, wood, 0x2b3446);
    d.position.set(x, 0, (z0 + z1) / 2);
    b.decor(d, { shadow: true });
    b.box({ x, y: top / 2, z: (z0 + z1) / 2 }, { x: width, y: top, z: z0 - z1 }, { collide: true, material: b.flat(0x2b3446), castShadow: false }).visible = false;
  }
  const hazard = new THREE.MeshLambertMaterial({ map: hazardTexture() });
  b.ramp(7, -34, 0, -40, 0.75, 2.4, { color: 0x2fb5a5 });
  routeDesk(7, -40, -43, 2.4, 0.75);
  routeDesk(7, -45, -47.5, 2.4, 1.5);
  routeDesk(4, -49.5, -52, 2.4, 2.25);
  routeDesk(7, -54, -56.5, 2.4, 3.0);
  routeDesk(7, -58.5, -61, 2.4, 3.0);
  // Monitors on the outer edge of the higher desks (solid: they narrow the landing).
  [[-46.25, 1.5, 8.05], [-55.25, 3.0, 8.05], [-59.75, 3.0, 8.05]].forEach(([z, top, x], i) => {
    const m = monitor(i + 3);
    m.position.set(x, top, z);
    m.rotation.y = -Math.PI / 2;
    b.decor(m, { shadow: true });
    b.box({ x, y: top + 0.4, z }, { x: 0.15, y: 0.8, z: 0.8 }, { collide: true, castShadow: false }).visible = false;
  });

  // Elevator desk: hold at 3 m, rise, hold at 6 m, sink. 9 s cycle.
  const ELEV = { x: 7, z: -64.25, depth: 3.5, width: 2.4, low: 3.0, high: MEZZ.top };
  const elevGroup = new THREE.Group();
  const elevTop = new THREE.Mesh(new THREE.BoxGeometry(ELEV.width, 0.3, ELEV.depth), hazard);
  elevTop.position.y = -0.15;
  elevGroup.add(elevTop);
  const elevator = b.kinematic(elevGroup, [
    b.RAPIER.ColliderDesc.cuboid(ELEV.width / 2, 0.15, ELEV.depth / 2).setTranslation(0, -0.15, 0),
  ]);
  const column = b.decor(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5), b.flat(0x2b3446)), { shadow: true });
  const elevPos = new THREE.Vector3(ELEV.x, ELEV.low, ELEV.z);
  function elevatorHeight(t) {
    const c = t % 9;
    const ease = (x) => x * x * (3 - 2 * x);
    if (c < 2) return ELEV.low;
    if (c < 4.5) return ELEV.low + (ELEV.high - ELEV.low) * ease((c - 2) / 2.5);
    if (c < 6.5) return ELEV.high;
    return ELEV.high - (ELEV.high - ELEV.low) * ease((c - 6.5) / 2.5);
  }

  // ---------- Office furniture (solid) ----------
  function furnitureDesk(x, z, w = 2.4, d = 1.2, top = 0.75, monitorSeed = 1) {
    const g = deskVisual(w, top, d, 0xf2f2f2, 0x2b3446);
    g.position.set(x, 0, z);
    b.decor(g, { shadow: true });
    const m = monitor(monitorSeed);
    m.position.set(x, top, z + (x < 0 ? 0 : 0));
    m.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2;
    b.decor(m, { shadow: true });
    b.box({ x, y: top / 2, z }, { x: w, y: top, z: d }, { castShadow: false }).visible = false;
    return m;
  }
  // Along the window wall.
  const noteMonitor = furnitureDesk(-10.3, -4, 1.2, 2.4, 0.75, 1);
  furnitureDesk(-10.3, -12, 1.2, 2.4, 0.75, 2);
  furnitureDesk(-10.3, -50, 1.2, 2.4, 1.1, 4);
  furnitureDesk(-10.3, -58, 1.2, 2.4, 1.1, 5);
  // Sticky note on the first monitor.
  b.sign('do not\ntrain on\nthis', { x: -10.0, y: 1.35, z: -3.7 }, 0.3, 0.3, {
    bg: '#ffe94a', fg: '#3a2a00', font: '"Bree Serif", Georgia, serif',
  }).rotation.y = Math.PI / 2;
  noteMonitor.userData.note = true;

  // Kombucha bar on the right wall.
  b.box({ x: 10.9, y: 0.55, z: -10 }, { x: 1.6, y: 1.1, z: 7 }, { material: b.flat(0x2fb5a5) });
  b.box({ x: 10.9, y: 1.12, z: -10 }, { x: 1.8, y: 0.06, z: 7.2 }, { material: b.flat(0xe2b46a), collide: false });
  for (let i = 0; i < 4; i++) {
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 10), b.flat([0xe8673a, 0xffd21f, 0x3fe36a, 0xff6fae][i]));
    tap.position.set(11.2, 1.4, -8 - i * 1.3);
    b.decor(tap, { shadow: true });
  }
  b.sign('KOMBUCHA ON TAP', { x: ROOM.x - 0.03, y: 2.5, z: -10 }, 4.4, 0.8, { bg: '#2fb5a5', fg: '#ffffff' }).rotation.y = -Math.PI / 2;

  // Plants by the windows.
  for (const z of [-20, -28, -64, -72]) {
    const p = plant();
    p.position.set(-10.8, 0, z);
    b.decor(p, { shadow: true });
    b.pillar(-10.8, z, 0.3, 0.5, { color: 0xe8673a });
  }

  // Logo sculpture: three interlocking rings on a plinth.
  b.box({ x: -4, y: 0.5, z: -56 }, { x: 1.6, y: 1, z: 1.6 }, { material: b.flat(0xf2f2f2) });
  [[0x2f6bff, -0.45, 0], [0xe8673a, 0.45, 0.5], [0x2fb5a5, 0, -0.5]].forEach(([c, dx, rot]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.16, 10, 28), b.flat(c));
    ring.position.set(-4 + dx, 1.95, -56);
    ring.rotation.set(0, rot, 0);
    b.decor(ring, { shadow: true });
  });
  b.sign('ACME SUPERINTELLIGENCE', { x: 0, y: 7.9, z: ROOM.zFar + 0.03 }, 12, 1.2, { bg: '#eeeae2', fg: '#1b1b1f' });

  // Whiteboard on a stand.
  b.sign('AGI by Friday', { x: -6.5, y: 1.6, z: -47.94 }, 2.6, 1.4, {
    bg: '#ffffff', fg: '#e8302a', border: '#9aa1ab', font: '"Bree Serif", Georgia, serif',
  });
  b.box({ x: -6.5, y: 1.6, z: -48 }, { x: 2.8, y: 1.6, z: 0.08 }, { material: b.flat(0x9aa1ab) });
  for (const x of [-7.7, -5.3]) b.box({ x, y: 0.4, z: -48 }, { x: 0.08, y: 0.8, z: 0.08 }, { material: mullion, collide: false });

  // Posters on the right wall.
  const poster = (text, z, bg, fg = '#ffffff') =>
    (b.sign(text, { x: ROOM.x - 0.03, y: 3.6, z }, 3, 2, { bg, fg, border: '#ffffff' }).rotation.y = -Math.PI / 2);
  poster("DON'T\nBE EVIL", -22, '#2f6bff');
  poster('FEEL THE\nDEADLINE', -34, '#1b1b1f', '#ffe94a');
  poster('SHIP IT', -50, '#e8462a');

  // Hanging sign over the route.
  b.sign('DAYS SINCE LAST REORG: 0', { x: 3, y: 7.6, z: -63 }, 5.6, 0.6, { bg: '#1b1b1f', fg: '#ffe94a' });
  for (const x of [0.4, 5.6]) b.box({ x, y: 8.4, z: -63 }, { x: 0.03, y: 1, z: 0.03 }, { material: mullion, ...noShadow });

  // ---------- Hazards: rolling chairs and walking people ----------
  const chairColors = [0xe8673a, 0x2fb5a5, 0xe8673a, 0x2fb5a5];
  const chairs = [-10, -16, -22, -28].map((z, i) => {
    const g = rollingChair(chairColors[i]);
    const k = b.kinematic(g, [b.RAPIER.ColliderDesc.cuboid(0.3, 0.55, 0.3).setTranslation(0, 0.55, 0)]);
    return { k, z, amp: 7, w: 0.75 + i * 0.17, phase: i * 1.9 };
  });
  const people = [
    walker(b, { shirt: 0x1b1b1f, pants: 0x1b2740 }, [new THREE.Vector3(-9, 0, -32), new THREE.Vector3(3, 0, -32)], { speed: 1.3 }),
    walker(b, { shirt: 0x2fa84f, pants: 0x3a3f4a, hair: 0xd8b04a }, [new THREE.Vector3(1, 0, -38.5), new THREE.Vector3(-10, 0, -38.5)], { speed: 1.1, offset: 4 }),
    walker(b, { shirt: 0x7a3fd0, pants: 0x1b2740, skin: 0x8d5a3b }, [new THREE.Vector3(-4, 0, -30), new THREE.Vector3(-4, 0, -46)], { speed: 1.2, offset: 7 }),
    walker(b, { shirt: 0xe8673a, pants: 0x2b3446, skin: 0xc58c5c }, [new THREE.Vector3(2, 0, -33), new THREE.Vector3(10.5, 0, -33)], { speed: 1.4, offset: 2 }),
    // The CEO paces the mezzanine.
    walker(b, { shirt: 0x2b2f38, pants: 0x1b1b1f, hair: 0x6b6b6b, tag: 'CEO' },
      [new THREE.Vector3(-9, MEZZ.top, -73), new THREE.Vector3(4, MEZZ.top, -73)], { speed: 1.0, offset: 3 }),
  ];

  // ---------- Pads, finish ----------
  b.pad({ x: 0, y: 0, z: 0 }, [[1.3, 0x2fd45a], [1.0, 0xffe94a], [0.65, 0x2f6bff]]);
  const finishPos = new THREE.Vector3(0, MEZZ.top, -78);
  b.pad(finishPos, [[1.3, 0xe8462a], [1.0, 0xffe94a], [0.65, 0xffffff]]);
  b.sign('FINISH', { x: 0, y: MEZZ.top + 2.4, z: finishPos.z }, 2.6, 0.8, { bg: '#e8462a', fg: '#ffe94a', border: '#5a1206' });

  const checkpoints = [
    {
      box: new THREE.Box3(new THREE.Vector3(4, -0.5, -34), new THREE.Vector3(10, 3, -29)),
      spawn: new THREE.Vector3(7, R, -31),
      yaw: 0,
    },
    {
      box: new THREE.Box3(new THREE.Vector3(3, MEZZ.top - 0.5, -70), new THREE.Vector3(11, MEZZ.top + 3, -66)),
      spawn: new THREE.Vector3(7, MEZZ.top + R, -68),
      yaw: 0,
    },
  ];

  const q = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  return {
    id: '2',
    name: 'Open Plan',
    tagline: 'Stay aligned.',
    par: 75,
    spawn: new THREE.Vector3(0, R, 0),
    spawnYaw: 0,
    killY: -10, // indoors: falling off a desk just costs you the climb
    gems: [
      new THREE.Vector3(-4, 0.6, -13), // between the chairs
      new THREE.Vector3(5, 0.6, -22),
      new THREE.Vector3(-7, 0.6, -41), // among the walkers
      new THREE.Vector3(7, 2.1, -46.25), // desk 2
      new THREE.Vector3(4, 2.85, -50.75), // desk 3, the sideways hop
      new THREE.Vector3(7, 3.6, -59.75), // desk 5
      new THREE.Vector3(-10, MEZZ.top + 0.6, -80), // far corner of the mezzanine
    ],
    // Stealth Mode: on the ground floor, tucked under the back of the mezzanine.
    hiddenGem: new THREE.Vector3(-10.5, 0.6, -80),
    powerups: [
      { type: 'energy', pos: new THREE.Vector3(9.4, 0.6, -10) },
      { type: 'rollback', pos: new THREE.Vector3(-8, 0.6, -33) },
    ],
    finish: { pos: finishPos, radius: 1.1 },
    checkpoints,

    fixedUpdate(dt, t) {
      for (const c of chairs) {
        const x = Math.sin(t * c.w + c.phase) * c.amp;
        const vx = Math.cos(t * c.w + c.phase);
        dir.set(vx >= 0 ? 1 : -1, 0, 0);
        c.k.place(new THREE.Vector3(x, 0, c.z), faceQuat(dir, q).clone());
      }
      for (const p of people) p.step(t);
      elevPos.y = elevatorHeight(t);
      elevator.place(elevPos);
      column.scale.y = elevPos.y - 0.3;
      column.position.set(ELEV.x, (elevPos.y - 0.3) / 2, ELEV.z);
    },
  };
}
