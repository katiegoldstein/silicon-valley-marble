import * as THREE from 'three';
import { tuning } from '../tuning.js';
import { audio } from '../audio.js';
import { asphaltTexture, concreteTexture } from './textures.js';
import { blimp, robotaxi, rowHouse, tagSprite, trafficCone, trafficLight, tree, faceQuat } from './props.js';

/**
 * Level 3 — Mission Street (robotaxis + blimp). "No driver. No mercy."
 * The one outdoor level: a sunny street, an intersection full of robotaxis,
 * launch pads up to a blimp, and a glide down to the top of the hill.
 *
 * Route (forward is -z):
 *   z   0        start pad on the street
 *   z -25..-37   intersection: two robotaxis in a nose-to-nose standoff block
 *                the middle; moving robotaxis use the lanes on either side
 *   z -48        Series A launch pad -> platform at 5 m -> second pad -> blimp
 *   z -76..-92   landing deck on top of the blimp (17 m up); Drone power-up
 *   z -95..-125  the hill; glide onto it from the blimp
 *   z -125..-146 hilltop and finish
 *
 * Robotaxis drive fixed back-and-forth routes and shove the marble. If you
 * sit in front of one, it creeps; after 2 seconds it gives up and stops.
 */
export function buildMissionStreet(b) {
  const R = tuning.radius;
  const asphalt = new THREE.MeshLambertMaterial({ map: asphaltTexture() });
  const concrete = new THREE.MeshLambertMaterial({ map: concreteTexture() });
  const noShadow = { collide: false, castShadow: false };
  const line = (x, z, w, d, color) =>
    b.box({ x, y: 0.006, z }, { x: w, y: 0.012, z: d }, { material: b.flat(color), ...noShadow });

  // ---------- Street ----------
  b.box({ x: 0, y: -0.5, z: -42.5 }, { x: 12, y: 1, z: 105 }, { material: asphalt }); // z 10..-95
  b.box({ x: 0, y: -0.5, z: -31 }, { x: 48, y: 1, z: 12 }, { material: asphalt }); // cross street
  for (const side of [-1, 1]) {
    // Sidewalks (raised 12 cm), broken by the cross street.
    for (const [z0, z1] of [[10, -25], [-37, -95]]) {
      b.box({ x: side * 7.5, y: -0.44, z: (z0 + z1) / 2 }, { x: 3, y: 1.12, z: z0 - z1 }, { material: concrete });
    }
    for (const [z0, z1] of [[-22, -25], [-37, -40]]) {
      b.box({ x: side * 16.5, y: -0.44, z: (z0 + z1) / 2 }, { x: 15, y: 1.12, z: z0 - z1 }, { material: concrete });
    }
  }
  // Paint: center dashes, cable-car rails, crosswalks.
  for (let z = 8; z > -95; z -= 4) {
    if (z < -24 && z > -38) continue;
    line(0, z, 0.2, 2, 0xffd21f);
  }
  for (const x of [-2.2, -0.8, 0.8, 2.2]) line(x, -42.5, 0.1, 105, 0x9aa1ab);
  for (const z of [-24.2, -37.8]) {
    for (let x = -5; x <= 5; x += 1.2) line(x, z, 0.6, 1.4, 0xf2f2f2);
  }
  for (let x = -22; x <= 22; x += 4) {
    if (Math.abs(x) < 7) continue;
    line(x, -31, 2, 0.2, 0xffd21f);
  }

  // ---------- Houses (they double as the walls of the level) ----------
  const pastel = [0xf4a7b9, 0xa8d8ea, 0xffd6a5, 0xb8e0b8, 0xd7b8f3, 0xf7c59f, 0x9fd8cb, 0xf9e79f];
  const roofs = [0x8e44ad, 0xd35400, 0x2f6bff, 0x27ae60, 0xc0392b];
  let hi = 0;
  function house(x, z, facing, baseY = 0, width = 7, height = 7.5) {
    const g = rowHouse(width, height, 8, pastel[hi % pastel.length], 0xffffff, roofs[hi % roofs.length]);
    hi++;
    g.position.set(x, baseY, z);
    g.rotation.y = facing; // 0 = front faces -z
    b.decor(g, { shadow: true });
    const sx = Math.abs(Math.sin(facing)) > 0.5 ? 8 : width;
    const sz = Math.abs(Math.sin(facing)) > 0.5 ? width : 8;
    // Solid from below street level to the eaves.
    const top = baseY + height;
    b.box({ x, y: (top - 1) / 2, z }, { x: sx, y: top + 1, z: sz }, { castShadow: false }).visible = false;
  }
  for (const side of [-1, 1]) {
    const facing = (side * Math.PI) / 2; // fronts face the street
    for (let z = 6.5; z > -24; z -= 7) house(side * 13, z, facing);
    for (let z = -41.5; z > -96; z -= 7) house(side * 13, z, facing);
    // Houses climbing the hill.
    for (let z = -99.5; z > -147; z -= 7) {
      const ground = THREE.MathUtils.clamp(((-95 - z) / 30) * 9, 0, 9);
      house(side * 13, z, facing, ground);
    }
    // Ends of the cross street.
    house(side * 27.5, -31, facing, 0, 12, 8);
    for (const x of [20.5]) {
      house(side * x, -18.5, 0, 0, 7, 7.5);
      house(side * x, -43.5, Math.PI, 0, 7, 7.5);
    }
  }
  house(0, 14.5, 0, 0, 18, 8); // closes the street behind the start
  house(0, -150, Math.PI, 9, 18, 8); // top of the hill, facing you

  // Trees and traffic lights.
  for (const side of [-1, 1]) {
    for (const z of [2, -14, -50, -66, -82]) {
      const t = tree(1);
      t.position.set(side * 8, 0.12, z);
      b.decor(t, { shadow: true });
      b.pillar(side * 8, z, 0.2, 2.4, { color: 0x6b4423 });
    }
  }
  for (const [x, z] of [[-6.6, -23.6], [6.6, -38.4]]) {
    const tl = trafficLight();
    tl.position.set(x, 0.12, z);
    tl.rotation.y = x < 0 ? 0 : Math.PI;
    b.decor(tl, { shadow: true });
    b.pillar(x, z, 0.1, 3.4, { color: 0x2b2b2f });
  }

  // ---------- Robotaxis ----------
  // Standoff: two cars nose to nose across the middle of the intersection.
  const standoff = [
    { x: -2.6, yaw: -Math.PI / 2 }, // facing +x
    { x: 2.6, yaw: Math.PI / 2 }, // facing -x
  ];
  standoff.forEach(({ x, yaw }, i) => {
    const car = robotaxi();
    car.position.set(x, 0, -31);
    car.rotation.y = yaw;
    b.decor(car, { shadow: true });
    b.box({ x, y: 0.8, z: -31 }, { x: 4.4, y: 1.6, z: 1.9 }, { castShadow: false }).visible = false;
    const qm = tagSprite('?', 0.5, { bg: '#ffe94a' });
    qm.scale.set(0.55, 0.55, 1);
    qm.position.set(x, 2.6, -31);
    b.scene.add(qm);
    if (i === 0) {
      const cone = trafficCone();
      cone.position.set(x + 1.4, 1.0, -31);
      b.decor(cone, { shadow: true });
    }
  });

  /** Back-and-forth robotaxi along one axis. */
  function taxi({ axis, fixed, from, to, speed, startDelay = 0 }) {
    const car = robotaxi();
    const k = b.kinematic(car, [b.RAPIER.ColliderDesc.cuboid(0.95, 0.75, 2.2).setTranslation(0, 0.8, 0)]);
    const qm = tagSprite('?', 0.5, { bg: '#ffe94a' });
    qm.scale.set(0.55, 0.55, 1);
    qm.position.y = 2.6;
    qm.visible = false;
    car.add(qm);
    const unit = axis === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const s = {};
    const reset = () => Object.assign(s, { d: from, dir: Math.sign(to - from), pause: startDelay, blocked: 0, yaw: 0, turnFrom: 0 });
    reset();
    const pos = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const heading = new THREE.Vector3();
    const yawOf = (dir) => Math.atan2(-unit.x * dir, -unit.z * dir);
    s.yaw = s.turnFrom = yawOf(s.dir);
    const place = () => {
      pos.copy(unit).multiplyScalar(s.d);
      if (axis === 'x') pos.z = fixed;
      else pos.x = fixed;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw);
      k.place(pos, q);
    };
    return {
      reset() {
        reset();
        s.yaw = s.turnFrom = yawOf(s.dir);
        qm.visible = false;
      },
      step(dt, marblePos) {
        if (s.pause > 0) {
          s.pause -= dt;
          // Turn around in place during the pause (it's a cartoon).
          const target = yawOf(s.dir);
          const t = 1 - Math.max(0, s.pause) / 1.2;
          s.yaw = s.turnFrom + (target - s.turnFrom) * Math.min(1, t);
          place();
          return;
        }
        heading.copy(unit).multiplyScalar(s.dir);
        const rel = marblePos.clone().sub(pos);
        const ahead = rel.dot(heading);
        const lateral = Math.abs(rel.x * heading.z - rel.z * heading.x);
        const inFront = ahead > 2 && ahead < 5.5 && lateral < 1.4 && marblePos.y < 2;
        s.blocked = inFront ? s.blocked + dt : Math.max(0, s.blocked - dt * 2);
        const v = inFront ? (s.blocked > 2 ? 0 : speed * 0.25) : speed;
        if (s.blocked > 2 && !qm.visible) audio.chime(); // stopped for you, politely
        qm.visible = s.blocked > 2;
        s.d += s.dir * v * dt;
        if ((s.dir > 0 && s.d >= Math.max(from, to)) || (s.dir < 0 && s.d <= Math.min(from, to))) {
          s.d = THREE.MathUtils.clamp(s.d, Math.min(from, to), Math.max(from, to));
          s.dir = -s.dir;
          s.pause = 1.2;
          s.turnFrom = s.yaw;
        }
        place();
      },
    };
  }
  const taxis = [
    taxi({ axis: 'x', fixed: -27.7, from: -20, to: 20, speed: 5 }),
    taxi({ axis: 'x', fixed: -34.3, from: 20, to: -20, speed: 4.2, startDelay: 1.5 }),
    taxi({ axis: 'z', fixed: -3.6, from: -90, to: -40, speed: 5 }),
  ];

  // ---------- Launch pads, billboard platform, blimp ----------
  const padRings = [[1.4, 0x1b8a4a], [1.1, 0x2fd45a], [0.6, 0xffe94a]];
  b.pad({ x: 0, y: 0, z: -48 }, padRings);
  b.label('SERIES A', { x: 0, y: 1.6, z: -48 }, 1.6, 0.4, { bg: '#2fd45a', fg: '#0b3a14' });
  // Platform on two posts: "Series B" pad on top.
  const PLAT = { top: 5, z0: -59, z1: -67 };
  b.box({ x: 0, y: PLAT.top - 0.2, z: (PLAT.z0 + PLAT.z1) / 2 }, { x: 5, y: 0.4, z: 8 }, { material: concrete });
  for (const x of [-1.8, 1.8]) b.pillar(x, -63, 0.25, PLAT.top - 0.4, { color: 0x6b6f78 });
  b.sign('FUNDING SECURED*', { x: 0, y: PLAT.top - 1.0, z: PLAT.z0 + 0.03 }, 5, 1.2, { bg: '#1b1b1f', fg: '#2fd45a' });
  b.pad({ x: 0, y: PLAT.top, z: -65.5 }, padRings);
  b.label('SERIES B', { x: 0, y: PLAT.top + 1.6, z: -65.5 }, 1.6, 0.4, { bg: '#2fd45a', fg: '#0b3a14' });

  const BLIMP = { y: 14, z: -84, deck: 17.4 };
  const bl = blimp('MONACO');
  bl.position.set(0, BLIMP.y, BLIMP.z);
  b.decor(bl, { shadow: true });
  b.world.createCollider(
    b.RAPIER.ColliderDesc.capsule(8, 3.2)
      .setTranslation(0, BLIMP.y, BLIMP.z)
      .setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)),
  );
  b.box({ x: 0, y: BLIMP.deck - 0.15, z: BLIMP.z }, { x: 3.2, y: 0.3, z: 16 }, { material: b.flat(0x2b2b2f) });
  for (const x of [-1.6, 1.6]) {
    b.box({ x, y: BLIMP.deck + 0.03, z: BLIMP.z }, { x: 0.12, y: 0.06, z: 16 }, { material: b.flat(0xffd21f), ...noShadow });
  }

  // Launch velocities: aimed so a marble entering the pad lands on the next target.
  const zones = [
    {
      box: new THREE.Box3(new THREE.Vector3(-1.3, -0.5, -49.3), new THREE.Vector3(1.3, 0.7, -46.7)),
      launch: { x: 0, y: 16, z: -12.8 },
    },
    {
      box: new THREE.Box3(new THREE.Vector3(-1.3, PLAT.top - 0.5, -66.8), new THREE.Vector3(1.3, PLAT.top + 0.7, -64.2)),
      launch: { x: 0, y: 24, z: -11.4 },
    },
  ];

  // ---------- Hill and finish ----------
  b.ramp(0, -95, 0, -125, 9, 18, { material: asphalt });
  b.block(0, -125, -146, 18, 9, { baseY: -1, material: asphalt });
  const finishPos = new THREE.Vector3(0, 9, -138);
  b.pad(finishPos, [[1.3, 0xe8462a], [1.0, 0xffe94a], [0.65, 0xffffff]]);
  b.sign('FINISH', { x: 0, y: 12.4, z: -138 }, 2.6, 0.8, { bg: '#e8462a', fg: '#ffe94a', border: '#5a1206' });
  for (const x of [-1.2, 1.2]) b.pillar(x, -138.05, 0.05, 3.1, { color: 0x2b2b2f, baseY: 9 });

  b.pad({ x: 0, y: 0, z: 0 }, [[1.3, 0x2fd45a], [1.0, 0xffe94a], [0.65, 0x2f6bff]]);

  const checkpoints = [
    { box: new THREE.Box3(new THREE.Vector3(-6, -0.5, -44), new THREE.Vector3(6, 3, -39)), spawn: new THREE.Vector3(0, R, -41), yaw: 0 },
    { box: new THREE.Box3(new THREE.Vector3(-2.5, PLAT.top - 0.5, -64), new THREE.Vector3(2.5, PLAT.top + 3, -59)), spawn: new THREE.Vector3(0, PLAT.top + R, -60), yaw: 0 },
    { box: new THREE.Box3(new THREE.Vector3(-1.6, BLIMP.deck - 0.5, -92), new THREE.Vector3(1.6, BLIMP.deck + 3, -76)), spawn: new THREE.Vector3(0, BLIMP.deck + R, -78), yaw: 0 },
  ];

  return {
    id: '3',
    name: 'Mission Street',
    tagline: 'No driver. No mercy.',
    par: 105,
    spawn: new THREE.Vector3(0, R, 0),
    spawnYaw: 0,
    killY: -6,
    gems: [
      new THREE.Vector3(-3, 0.6, -12),
      new THREE.Vector3(0, 0.6, -27.5), // in a taxi lane, right by the standoff
      new THREE.Vector3(-15, 0.6, -34.5), // down the cross street
      new THREE.Vector3(0, PLAT.top + 0.6, -61), // on the platform
      new THREE.Vector3(1, BLIMP.deck + 0.6, -79),
      new THREE.Vector3(-1, BLIMP.deck + 0.6, -90),
      // Mid-air: only reachable gliding with the Drone. Big pickup radius so
      // any sensible glide speed gets it; falling without the Drone misses by 10 m.
      { pos: new THREE.Vector3(0, 14.8, -104), reach: 1.5 },
      new THREE.Vector3(-7, 9.6, -144), // hilltop corner
    ],
    // Stealth Mode: behind the start pad, at the dead end nobody looks back at.
    hiddenGem: new THREE.Vector3(-6, 0.6, 9),
    powerups: [
      { type: 'drone', pos: new THREE.Vector3(0, BLIMP.deck + 0.6, -85) },
      { type: 'hype', pos: new THREE.Vector3(12, 0.6, -33) },
      { type: 'severance', pos: new THREE.Vector3(1.5, PLAT.top + 0.6, -62.5) },
    ],
    finish: { pos: finishPos, radius: 1.1 },
    checkpoints,
    zones,

    reset() {
      for (const t of taxis) t.reset();
    },
    fixedUpdate(dt, t, ctx) {
      for (const taxiCar of taxis) taxiCar.step(dt, ctx.marble.currPos);
    },
    update(dt, now) {
      bl.position.y = BLIMP.y + Math.sin(now * 0.6) * 0.05;
    },
  };
}
