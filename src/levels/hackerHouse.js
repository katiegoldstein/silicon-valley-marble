import * as THREE from 'three';
import { tuning } from '../tuning.js';
import { audio } from '../audio.js';
import { hazardTexture, textTexture } from './builder.js';
import { carpetTexture, kitchenTexture, patioTexture } from './textures.js';
import {
  couch, foosball, hotDog, monitor, palmTree, person, serverRack, walker,
} from './props.js';

/**
 * Level 4 — Hacker House. "Pivot or perish."
 * A suburban ranch house turned startup incubator for "Squeezr".
 * The crew (Founder, Engineer, VC, Intern, Growth) and the company are original.
 *
 * Route (forward is -z):
 *   z   6..-11   living room: coder desks left, couch right; the Founder paces
 *   z -11..-21   hole in the floor; the hazard-striped Pivot bridge rotates
 *                over it (holds lined up, swings across, holds, swings back)
 *   z -21..-30   kitchen corner, foosball, server rack; the Intern wanders
 *   z -30..-50   out the back doors: patio, pool, palm trees, a rolling hot dog
 *   z -51..-72   "runway" platforms that crumble a second after you land
 *   z -74..-90   the floating Pitch Arena stage; finish
 */
export function buildHackerHouse(b) {
  const R = tuning.radius;
  const ROOM = { x: 10, zBack: 6, zDoor: -30, ceiling: 3.4 };
  const PIT = { z0: -11, z1: -21, floor: -4 };
  const noShadow = { collide: false, castShadow: false };
  const hidden = (center, size) => (b.box(center, size, { castShadow: false }).visible = false);

  // ---------- Living room shell ----------
  const carpet = new THREE.MeshLambertMaterial({ map: carpetTexture() });
  const floorSlab = (x0, x1, z0, z1, material, top = 0) =>
    b.box({ x: (x0 + x1) / 2, y: top - 0.5, z: (z0 + z1) / 2 }, { x: x1 - x0, y: 1, z: z0 - z1 }, { material });
  floorSlab(-ROOM.x, ROOM.x, ROOM.zBack, PIT.z0, carpet);
  floorSlab(-ROOM.x, ROOM.x, PIT.z1, ROOM.zDoor, carpet);
  b.box({ x: 0, y: PIT.floor - 0.25, z: (PIT.z0 + PIT.z1) / 2 }, { x: ROOM.x * 2, y: 0.5, z: PIT.z0 - PIT.z1 }, { material: b.flat(0x2a2620) });
  for (const z of [PIT.z0, PIT.z1]) {
    b.box({ x: 0, y: (PIT.floor - 1) / 2, z: z + (z === PIT.z0 ? 0.25 : -0.25) }, { x: ROOM.x * 2, y: -PIT.floor - 1, z: 0.5 }, { material: b.flat(0x6b5a44), castShadow: false });
  }
  const kitchenTile = new THREE.MeshLambertMaterial({ map: kitchenTexture() });
  b.box({ x: 7, y: 0.004, z: -25.5 }, { x: 6, y: 0.008, z: 9 }, { material: kitchenTile, ...noShadow });

  const wallMat = b.flat(0xe9dcc3);
  const wallLen = ROOM.zBack - ROOM.zDoor;
  const wallZ = (ROOM.zBack + ROOM.zDoor) / 2;
  const wallY = (ROOM.ceiling + PIT.floor) / 2;
  const wallH = ROOM.ceiling - PIT.floor;
  b.box({ x: -ROOM.x - 0.25, y: wallY, z: wallZ }, { x: 0.5, y: wallH, z: wallLen }, { material: wallMat, castShadow: false });
  b.box({ x: ROOM.x + 0.25, y: wallY, z: wallZ }, { x: 0.5, y: wallH, z: wallLen }, { material: wallMat, castShadow: false });
  b.box({ x: 0, y: ROOM.ceiling / 2, z: ROOM.zBack + 0.25 }, { x: ROOM.x * 2 + 1, y: ROOM.ceiling, z: 0.5 }, { material: wallMat, castShadow: false });
  // Back wall with open double doors (x -3..3, 2.4 m tall).
  for (const [x0, x1] of [[-ROOM.x - 0.5, -3], [3, ROOM.x + 0.5]]) {
    b.box({ x: (x0 + x1) / 2, y: ROOM.ceiling / 2, z: ROOM.zDoor - 0.25 }, { x: x1 - x0, y: ROOM.ceiling, z: 0.5 }, { material: wallMat, castShadow: false });
  }
  b.box({ x: 0, y: (2.4 + ROOM.ceiling) / 2, z: ROOM.zDoor - 0.25 }, { x: 6, y: ROOM.ceiling - 2.4, z: 0.5 }, { material: wallMat, castShadow: false });
  for (const x of [-3.6, 3.6]) {
    b.box({ x, y: 1.2, z: ROOM.zDoor - 0.9 }, { x: 0.08, y: 2.4, z: 1.2 }, { material: new THREE.MeshLambertMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.35 }), collide: false });
  }
  // Ceiling, wooden beams, recessed lights.
  b.box({ x: 0, y: ROOM.ceiling + 0.25, z: wallZ }, { x: ROOM.x * 2 + 1, y: 0.5, z: wallLen + 0.5 }, { color: 0x8794a8, ...noShadow });
  for (let z = 4; z > ROOM.zDoor; z -= 6) {
    b.box({ x: 0, y: ROOM.ceiling - 0.12, z }, { x: ROOM.x * 2, y: 0.24, z: 0.3 }, { material: b.flat(0x7a4a2a), ...noShadow });
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff1c2 });
  for (let z = 1; z > ROOM.zDoor; z -= 6) {
    for (const x of [-5, 5]) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.35, 20), lightMat);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(x, ROOM.ceiling - 0.01, z);
      b.decor(disc);
    }
  }
  // A window on the right wall.
  const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshBasicMaterial({ color: 0x8fd3f7 }));
  windowPane.position.set(ROOM.x - 0.02, 2, -15);
  windowPane.rotation.y = -Math.PI / 2;
  b.decor(windowPane);

  // ---------- Furniture ----------
  // Coder desks along the left wall, monitors facing the room.
  b.box({ x: -8.7, y: 0.375, z: -2.5 }, { x: 1.6, y: 0.75, z: 11 }, { material: b.flat(0xf2f2f2) });
  for (let i = 0; i < 5; i++) {
    const m = monitor(i + 11);
    m.position.set(-9.1, 0.75, 2 - i * 2.2);
    m.rotation.y = -Math.PI / 2;
    b.decor(m, { shadow: true });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), b.flat(i % 2 ? 0x3fe36a : 0xe8302a));
    can.position.set(-8.2, 0.83, 1.2 - i * 2.2);
    b.decor(can);
  }
  // Couch, coffee table with pizza, TV.
  const c = couch();
  c.position.set(8.4, 0, -4);
  c.rotation.y = Math.PI / 2;
  b.decor(c, { shadow: true });
  hidden({ x: 8.4, y: 0.5, z: -4 }, { x: 1.1, y: 1, z: 3.2 });
  b.box({ x: 6.2, y: 0.225, z: -4 }, { x: 1, y: 0.45, z: 2 }, { material: b.flat(0xb5824a) });
  b.box({ x: 6.2, y: 0.49, z: -4.3 }, { x: 0.7, y: 0.08, z: 0.7 }, { material: b.flat(0xf2e6d0), collide: false });
  b.sign('PIZZA', { x: 6.2, y: 0.535, z: -4.3 }, 0.6, 0.2, { bg: '#f2e6d0', fg: '#e8302a' }).rotation.x = -Math.PI / 2;
  b.box({ x: ROOM.x - 0.05, y: 2.0, z: -4 }, { x: 0.1, y: 1.4, z: 2.6 }, { material: b.flat(0x1b1b1f), collide: false });
  b.sign('BUILD FAILED\n412 errors, 3 warnings, 0 revenue', { x: ROOM.x - 0.11, y: 2.0, z: -4 }, 2.4, 1.2, {
    bg: '#1a0606', fg: '#ff3b3b', font: '"Bree Serif", Georgia, serif',
  }).rotation.y = -Math.PI / 2;

  // Back half: server rack, foosball, kitchen counter and fridge.
  const rack = serverRack();
  rack.position.set(-9.2, 0, -26);
  rack.rotation.y = -Math.PI / 2;
  b.decor(rack, { shadow: true });
  hidden({ x: -9.2, y: 1, z: -26 }, { x: 1, y: 2, z: 0.8 });
  const fb = foosball();
  fb.position.set(-5, 0, -25);
  b.decor(fb, { shadow: true });
  hidden({ x: -5, y: 0.5, z: -25 }, { x: 1.4, y: 1, z: 0.8 });
  b.box({ x: 9.3, y: 0.475, z: -25.5 }, { x: 1.2, y: 0.95, z: 7 }, { material: b.flat(0x2b3446) });
  b.box({ x: 9.3, y: 0.97, z: -25.5 }, { x: 1.3, y: 0.05, z: 7.1 }, { material: b.flat(0xf2f2f2), collide: false });
  b.box({ x: 5.5, y: 1, z: -29.3 }, { x: 0.9, y: 2, z: 0.8 }, { material: b.flat(0xe6e6e6) });

  // Signs and posters.
  const wallSign = (text, x, y, z, w, h, style, rotY) => {
    b.sign(text, { x, y, z }, w, h, style).rotation.y = rotY;
  };
  wallSign('NOW HIRING\n(EQUITY ONLY)', -ROOM.x + 0.03, 2.3, 2, 2.2, 1.2, { bg: '#1f4fbf', fg: '#ffffff', border: '#ffffff' }, Math.PI / 2);
  wallSign('PRE-REVENUE,\nPOST-SHAME', -ROOM.x + 0.03, 2.3, -6, 2.2, 1.2, { bg: '#1b6a3a', fg: '#9dff3a', border: '#ffffff' }, Math.PI / 2);
  wallSign('RUNWAY: 3 WEEKS', -ROOM.x + 0.03, 1.9, -16, 3, 1.2, {
    bg: '#ffffff', fg: '#e8302a', border: '#9aa1ab', font: '"Bree Serif", Georgia, serif',
  }, Math.PI / 2);
  wallSign('MOVE FAST,\nBREAK PROD', ROOM.x - 0.03, 2.3, -22, 2.2, 1.2, { bg: '#e8462a', fg: '#ffe94a', border: '#ffffff' }, -Math.PI / 2);
  wallSign('SQUEEZR', 0, 2.1, ROOM.zBack - 0.03, 4, 0.9, { bg: '#1b6a3a', fg: '#9dff3a', border: '#9dff3a' }, Math.PI);
  b.sign('SQUEEZR', { x: 0, y: 2.85, z: PIT.z0 + 0.6 }, 4, 0.7, { bg: '#1b6a3a', fg: '#9dff3a', border: '#9dff3a' });

  // ---------- The crew ----------
  function standing(look, x, z, rotY) {
    const p = person(look);
    p.group.position.set(x, 0, z);
    p.group.rotation.y = rotY;
    b.decor(p.group, { shadow: true });
    p.group.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    hidden({ x, y: 0.85, z }, { x: 0.56, y: 1.7, z: 0.56 });
  }
  standing({ shirt: 0x2fa84f, pants: 0x1b2740, skin: 0x8d5a3b, tag: 'ENGINEER' }, -7.2, 0.5, -Math.PI / 2);
  standing({ shirt: 0x1f3f8f, pants: 0x3a3f4a, hair: 0xb0b0b0, tag: 'VC' }, -6.5, -28.6, Math.PI);
  standing({ shirt: 0x7a3fd0, pants: 0x1b1b1f, tag: 'GROWTH' }, -9.5, -38, -Math.PI / 2);
  const movers = [
    walker(b, { shirt: 0x1b1b1f, pants: 0x2b3446, hair: 0x3a2a1a, tag: 'FOUNDER' },
      [new THREE.Vector3(-6, 0, -6), new THREE.Vector3(6, 0, -6)], { speed: 1.7 }),
    walker(b, { shirt: 0xe8673a, pants: 0x2b3446, skin: 0xc58c5c, tag: 'INTERN' },
      [new THREE.Vector3(-3.5, 0, -23.5), new THREE.Vector3(3, 0, -23.5), new THREE.Vector3(3, 0, -27.5), new THREE.Vector3(-2, 0, -27.5)],
      { speed: 1.0, offset: 3 }),
  ];

  // ---------- Pivot bridge ----------
  const hazard = new THREE.MeshLambertMaterial({ map: hazardTexture() });
  const BRIDGE = { len: 11, width: 2.2, thick: 0.35, z: (PIT.z0 + PIT.z1) / 2 };
  const beam = new THREE.Group();
  const beamMesh = new THREE.Mesh(new THREE.BoxGeometry(BRIDGE.width, BRIDGE.thick, BRIDGE.len), hazard);
  beamMesh.position.y = -BRIDGE.thick / 2;
  beam.add(beamMesh);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4.2, 12), b.flat(0x2b2b2f));
  hub.position.y = -2.2;
  beam.add(hub);
  const bridge = b.kinematic(beam, [
    b.RAPIER.ColliderDesc.cuboid(BRIDGE.width / 2, BRIDGE.thick / 2, BRIDGE.len / 2).setTranslation(0, -BRIDGE.thick / 2, 0),
  ]);
  const bridgePos = new THREE.Vector3(0, 0, BRIDGE.z);
  const bridgeQ = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);
  // 10 s cycle: lined up 3.5 s, swing 90 degrees in 1.5 s, hold 3 s, swing on to 180 (lined up again).
  function bridgeAngle(t) {
    const cycle = Math.floor(t / 10);
    const c = t - cycle * 10;
    const ease = (x) => x * x * (3 - 2 * x);
    let a;
    if (c < 3.5) a = 0;
    else if (c < 5) a = (Math.PI / 2) * ease((c - 3.5) / 1.5);
    else if (c < 8) a = Math.PI / 2;
    else if (c < 9.5) a = Math.PI / 2 + (Math.PI / 2) * ease((c - 8) / 1.5);
    else a = Math.PI;
    return cycle * Math.PI + a; // keeps growing, so the motion never snaps back
  }
  b.sign('PIVOT!', { x: 6.5, y: 1.9, z: PIT.z0 + 0.3 }, 2.2, 0.8, { bg: '#ffd21f', fg: '#e8302a', border: '#1b1b1f' });
  b.box({ x: 6.5, y: 0.75, z: PIT.z0 + 0.25 }, { x: 0.1, y: 1.5, z: 0.1 }, { material: b.flat(0x2b2b2f), collide: false });

  // ---------- Patio ----------
  const patio = new THREE.MeshLambertMaterial({ map: patioTexture() });
  const POOL = { x0: 3, x1: 10, z0: -34, z1: -46 };
  floorSlab(-12, POOL.x0, ROOM.zDoor, -50, patio);
  floorSlab(POOL.x1, 12, ROOM.zDoor, -50, patio);
  floorSlab(POOL.x0, POOL.x1, ROOM.zDoor, POOL.z0, patio);
  floorSlab(POOL.x0, POOL.x1, POOL.z1, -50, patio);
  floorSlab(POOL.x0, POOL.x1, POOL.z0, POOL.z1, b.flat(0x3fa9d8), -0.8);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(POOL.x1 - POOL.x0, POOL.z0 - POOL.z1),
    new THREE.MeshLambertMaterial({ color: 0x39c2f0, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set((POOL.x0 + POOL.x1) / 2, -0.15, (POOL.z0 + POOL.z1) / 2);
  b.decor(water);
  for (const side of [-1, 1]) {
    b.box({ x: side * 12.2, y: 0.4, z: -40 }, { x: 0.3, y: 0.8, z: 20 }, { material: b.flat(0xf2f2f2) });
  }
  for (const [x, z] of [[-10.8, -32], [-10.8, -48.5], [11, -48.5], [11, -31.5]]) {
    const palm = palmTree();
    palm.position.set(x, 0, z);
    b.decor(palm, { shadow: true });
    b.pillar(x, z, 0.2, 5, { color: 0x9a7444 });
  }
  // Rolling hot dog.
  const dog = hotDog();
  const dogGroup = new THREE.Group();
  dogGroup.add(dog);
  const dogBody = b.kinematic(dogGroup, [
    b.RAPIER.ColliderDesc.capsule(0.75, 0.38)
      .setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)),
  ]);
  const dogPos = new THREE.Vector3(0, 0.38, -40);
  const dogQ = new THREE.Quaternion();
  const Z = new THREE.Vector3(0, 0, 1);

  // ---------- Runway platforms (crumble) ----------
  const runwayTop = new THREE.MeshLambertMaterial({ map: textTexture('RUNWAY', 2.6, 2.6, { bg: '#c9955a', fg: '#5a3a1a', border: '#5a3a1a' }) });
  const runwaySide = b.flat(0x8f5a36);
  const PLATS = [[0, 0, -53], [-2, 0.5, -57.5], [0.5, 1.0, -62], [3, 1.0, -66.5], [1, 1.5, -71]];
  const crumbles = PLATS.map(([x, top, z]) => {
    const m = b.box({ x, y: top - 0.2, z }, { x: 2.6, y: 0.4, z: 2.6 }, { material: runwaySide });
    m.material = [runwaySide, runwaySide, runwayTop, runwaySide, runwaySide, runwaySide];
    return { mesh: m, x, top, z, touched: -1, down: 0 };
  });
  const CRUMBLE_DELAY = 0.9;
  const CRUMBLE_BACK = 5;

  // ---------- Pitch Arena ----------
  const STAGE = { top: 1.5, z0: -74.5, z1: -90 };
  b.box({ x: 0, y: STAGE.top - 0.5, z: (STAGE.z0 + STAGE.z1) / 2 }, { x: 12, y: 1, z: STAGE.z0 - STAGE.z1 }, { material: b.flat(0x2b2f38) });
  b.box({ x: 0, y: STAGE.top + 0.004, z: (STAGE.z0 + STAGE.z1) / 2 }, { x: 11.4, y: 0.008, z: 14.9 }, { material: b.flat(0x7a3fd0), ...noShadow });
  b.box({ x: 0, y: STAGE.top + 2, z: STAGE.z1 + 0.2 }, { x: 11, y: 4, z: 0.4 }, { material: b.flat(0x1b1b1f) });
  b.sign('PITCH ARENA', { x: 0, y: STAGE.top + 2.7, z: STAGE.z1 + 0.42 }, 9, 1.4, { bg: '#c23bd0', fg: '#ffffff' });
  b.sign('changing the world, one pivot at a time', { x: 0, y: STAGE.top + 1.5, z: STAGE.z1 + 0.42 }, 9, 0.6, {
    bg: '#c23bd0', fg: '#ffe94a', font: '"Bree Serif", Georgia, serif',
  });

  const finishPos = new THREE.Vector3(0, STAGE.top, -85);
  b.pad(finishPos, [[1.3, 0xe8462a], [1.0, 0xffe94a], [0.65, 0xffffff]]);
  b.pad({ x: 0, y: 0, z: 2 }, [[1.3, 0x2fd45a], [1.0, 0xffe94a], [0.65, 0x2f6bff]]);

  const checkpoints = [
    { box: new THREE.Box3(new THREE.Vector3(-ROOM.x, -0.5, -24), new THREE.Vector3(ROOM.x, 3, -21)), spawn: new THREE.Vector3(0, R, -22.5), yaw: 0 },
    { box: new THREE.Box3(new THREE.Vector3(-12, -0.5, -50), new THREE.Vector3(12, 3, -46.5)), spawn: new THREE.Vector3(0, R, -48.5), yaw: 0 },
  ];

  return {
    id: '4',
    name: 'Hacker House',
    tagline: 'Pivot or perish.',
    par: 135,
    spawn: new THREE.Vector3(0, R, 2),
    spawnYaw: 0,
    killY: -2,
    gems: [
      new THREE.Vector3(-5, 0.6, -3),
      new THREE.Vector3(5.2, 0.6, 1),
      new THREE.Vector3(7, 0.6, -23.5), // kitchen
      new THREE.Vector3(0, 0.6, BRIDGE.z), // middle of the Pivot bridge
      new THREE.Vector3(-3, 0.6, -26),
      new THREE.Vector3(-8, 0.6, -45), // patio corner
      new THREE.Vector3(1.5, 0.6, -47.8), // poolside
      new THREE.Vector3(-2, 1.1, -57.5), // on a crumbling platform
      new THREE.Vector3(-5, STAGE.top + 0.6, -88), // back corner of the stage
    ],
    // Stealth Mode: at the bottom of the pool (it's shallow; jump out).
    hiddenGem: new THREE.Vector3(9.3, -0.2, -45.2),
    powerups: [
      { type: 'seriesA', pos: new THREE.Vector3(-5, 0.6, -34) },
      { type: 'rollback', pos: new THREE.Vector3(5, 0.6, -3) },
      { type: 'hype', pos: new THREE.Vector3(-9, 0.6, -40) },
      { type: 'severance', pos: new THREE.Vector3(-9, 0.6, -48) },
    ],
    finish: { pos: finishPos, radius: 1.1 },
    checkpoints,

    reset() {
      for (const p of crumbles) {
        p.touched = -1;
        p.down = 0;
        p.mesh.visible = true;
        p.mesh.position.y = p.top - 0.2;
        p.mesh.userData.collider.setEnabled(true);
      }
    },

    fixedUpdate(dt, t, ctx) {
      for (const m of movers) m.step(t);
      bridgeQ.setFromAxisAngle(UP, bridgeAngle(t));
      bridge.place(bridgePos, bridgeQ);

      // Hot dog rolls 11 m back and forth along x, spinning as it goes.
      const span = 11.5;
      const d = (t * 2.2) % (span * 2);
      const x = d < span ? -10 + d : -10 + span * 2 - d;
      dogPos.x = x;
      dogQ.setFromAxisAngle(Z, -x / 0.38);
      dogBody.place(dogPos, dogQ);

      // Crumbling platforms: land on one and it drops 0.9 s later; back after 5 s.
      const m = ctx.marble;
      const p = m.currPos;
      for (const plat of crumbles) {
        if (plat.down > 0) {
          plat.down -= dt;
          plat.mesh.position.y -= dt * 6;
          if (plat.down < CRUMBLE_BACK - 1.5) plat.mesh.visible = false; // fallen out of sight
          if (plat.down <= 0) {
            plat.mesh.position.y = plat.top - 0.2;
            plat.mesh.visible = true;
            plat.mesh.userData.collider.setEnabled(true);
            plat.touched = -1;
          }
          continue;
        }
        const on =
          m.grounded &&
          Math.abs(p.x - plat.x) < 1.4 &&
          Math.abs(p.z - plat.z) < 1.4 &&
          Math.abs(p.y - plat.top - R) < 0.25;
        if (on && plat.touched < 0) plat.touched = t;
        if (plat.touched >= 0) {
          const since = t - plat.touched;
          plat.mesh.position.x = plat.x + Math.sin(t * 60) * 0.03; // shake
          if (since > CRUMBLE_DELAY) {
            plat.mesh.position.x = plat.x;
            plat.mesh.userData.collider.setEnabled(false);
            plat.down = CRUMBLE_BACK;
            audio.crumble();
          }
        }
      }
    },
  };
}
