import * as THREE from 'three';
import { tuning } from '../tuning.js';
import { audio } from '../audio.js';
import { trackFrames } from './builder.js';
import { rainbowTexture } from './textures.js';
import { robot, rocket, rubberDuck, saucer, satellite, serverRack } from './props.js';

/**
 * Level 5 — The Post-ASI Future. "Everything is fine."
 * The finale: one smooth rainbow track floating in space, no guardrails,
 * roaming robots, and a grinning alien in a saucer firing lasers at you.
 *
 * Route: long rainbow straight -> banked climb to the right -> a straight
 * with robots -> a descending corkscrew (1.25 turns) -> gravity flip: Pivot
 * arrows drop you "up" onto a ceiling track, you roll it upside down and jump
 * a gap, more arrows drop you back down -> final downhill -> finish.
 * Laser hits knock the marble sideways (they don't reset you). The alien
 * can't shoot through the ceiling, so lasers pause while you're on it.
 */
export function buildPostAsi(b) {
  const R = tuning.radius;
  const P = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- Track ----------
  const pts = [P(0, 0, 10), P(0, 0, -20), P(0, 0, -50), P(3, 1, -68), P(14, 3.5, -82), P(32, 6.5, -90), P(50, 7.5, -91), P(66, 8, -90)];
  // Corkscrew: 450 degrees around (80, -108), radius 18, dropping 12 m.
  const CORK = 18;
  for (let deg = 0; deg <= 450; deg += 15) {
    const th = THREE.MathUtils.degToRad(deg);
    pts.push(P(80 + CORK * Math.sin(th), 8 - (12 * deg) / 450, -108 + CORK * Math.cos(th)));
  }
  pts.push(P(98, -4.6, -122), P(98, -5, -134));
  // Gentle banking: steeper banks pulled a marble at normal speeds off the inside edge.
  const track = trackFrames(pts, { spacing: 1, bankGain: 2.5, maxBank: 0.22 });
  const L = track.length;

  const rainbow = rainbowTexture();
  const topMat = new THREE.MeshLambertMaterial({ map: rainbow, emissive: 0xffffff, emissiveMap: rainbow, emissiveIntensity: 0.45 });
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x7ef6ff });
  b.ribbon(track, { width: 7.5, thickness: 0.5, top: topMat, side: edgeMat, uvLength: 6 });

  /** Point on the track surface: `s` meters along, `lat` meters right of center, `h` above. */
  const onTrack = (s, lat = 0, h = 0) => {
    const f = track.at(s);
    return f.p.clone().addScaledVector(f.side, lat).addScaledVector(f.up, h);
  };
  const yawAt = (s) => {
    const T = track.at(s).T;
    return Math.atan2(-T.x, -T.z);
  };

  // ---------- Gravity flip ----------
  // Floor A (y -5) runs on from the corkscrew. Ceiling C hangs 6 m above the
  // void that follows, with a 3 m hole. Floor B catches you when the second
  // row of arrows turns gravity back.
  const FLIP = { x: 98, floor: -5, ceil: 1, w: 8 };
  slab(b, topMat, edgeMat, FLIP.x, FLIP.floor - 0.3, -140, 7.5, 0.6, 12.4, false); // A: z -133.8 .. -146.2
  slab(b, topMat, edgeMat, FLIP.x, FLIP.ceil + 0.3, -148.5, FLIP.w, 0.6, 17, true); // C1: z -140 .. -157
  slab(b, topMat, edgeMat, FLIP.x, FLIP.ceil + 0.3, -169, FLIP.w, 0.6, 18, true); // C2: z -160 .. -178
  slab(b, topMat, edgeMat, FLIP.x, FLIP.floor - 0.3, -181, 9, 0.6, 18, false); // B: z -172 .. -190
  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  // A full-width row of arrows each time, so you can't slip past one.
  const pivots = [-2.5, 0, 2.5].flatMap((dx) => [
    { type: 'pivot', pos: P(FLIP.x + dx, FLIP.floor + 0.55, -144.4), down: UP, reach: 1.3 },
    { type: 'pivot', pos: P(FLIP.x + dx, FLIP.ceil - 0.55, -175.5), down: DOWN, reach: 1.3 },
  ]);
  b.sign('PIVOT\nOR PERISH', { x: FLIP.x - 5.5, y: FLIP.floor + 2.6, z: -143 }, 3.2, 1.4, { bg: '#0b0b12', fg: '#ffd21f', border: '#ffd21f' }).rotation.y = Math.PI / 2;
  b.sign('YOU ARE NOW\nUPSIDE DOWN', { x: FLIP.x + 5.5, y: FLIP.ceil - 1.6, z: -152 }, 3.2, 1.4, { bg: '#0b0b12', fg: '#7ef6ff', border: '#7ef6ff' }).rotation.set(Math.PI, Math.PI / 2, 0);

  // ---------- Stealth Mode ----------
  // A lone tile floating off the left edge of the opening straight: jump for it.
  slab(b, topMat, edgeMat, -7.2, -0.3, -34, 2.4, 0.6, 2.4, false);

  // ---------- Final downhill ----------
  const down2 = trackFrames([P(98, -5, -189.5), P(98, -5.4, -195), P(98, -9.5, -207), P(98, -13.3, -219), P(98, -14, -225), P(98, -14, -235.5)], { spacing: 1, bankGain: 0, maxBank: 0 });
  b.ribbon(down2, { width: 7.5, thickness: 0.5, top: topMat, side: edgeMat, uvLength: 6 });

  // ---------- Start and finish ----------
  b.pad({ x: 0, y: 0, z: 4 }, [[1.3, 0x2fd45a], [1.0, 0xffe94a], [0.65, 0x2f6bff]]);
  // Sits a step below the track's end so the seam can't kick the marble.
  b.block(98, -232.6, -247, 10, -14.2, { baseY: -14.8, material: b.flat(0x2b1b55) });
  const finishPos = new THREE.Vector3(98, -14.2, -241);
  b.pad(finishPos, [[1.3, 0xe8462a], [1.0, 0xffe94a], [0.65, 0xffffff]]);
  b.sign('FINISH', { x: 98, y: -10.6, z: -241 }, 2.6, 0.8, { bg: '#e8462a', fg: '#ffe94a', border: '#5a1206' });
  for (const x of [96.8, 99.2]) b.pillar(x, -241.05, 0.05, 3.3, { color: 0x2b2b2f, baseY: -14.2 });

  // ---------- Signs and easter eggs ----------
  function billboard(text, s, lat, style) {
    const base = onTrack(s, lat);
    b.pillar(base.x, base.z, 0.12, 4, { color: 0x2b2b2f, baseY: base.y - 1 });
    const sign = b.sign(text, { x: base.x, y: base.y + 3.8, z: base.z }, 5, 1.8, style);
    sign.rotation.y = yawAt(s);
  }
  billboard('POST-ASI FUTURE\nNOW LEASING', L * 0.1, 6.5, { bg: '#0b0b12', fg: '#9dff3a', border: '#9dff3a' });
  billboard('LAST HUMAN JOB:\nROLLING', L * 0.27, -7, { bg: '#2a0f0a', fg: '#ffb02e', border: '#ff7a1a', font: '"Bree Serif", Georgia, serif' });

  const floaters = [];
  const float = (obj, pos, spin) => {
    obj.position.copy(pos);
    b.decor(obj, { shadow: false });
    floaters.push({ obj, base: pos.clone(), spin });
  };
  float(rubberDuck(), P(-16, 5, -40), new THREE.Vector3(0, 0.4, 0));
  const lost = serverRack();
  float(lost, P(18, 4, -28), new THREE.Vector3(0.3, 0.5, 0.2));
  const lostTag = b.label('LOST: PROD', P(18, 6.6, -28), 2, 0.5, { bg: '#ffe94a', fg: '#1b1b1f', border: '#1b1b1f' });
  const asteroid = new THREE.Mesh(new THREE.DodecahedronGeometry(4, 0), b.flat(0x6b6070));
  float(asteroid, P(48, 20, -55), new THREE.Vector3(0.1, 0.15, 0.05));
  b.label('404', P(48, 26, -55), 3, 1.2, { bg: '#1b1b1f', fg: '#ff3b3b' });
  float(rocket(), P(-28, 24, -115), new THREE.Vector3(0.6, 0.2, 0.9));
  float(satellite(), P(40, 28, -15), new THREE.Vector3(0.1, 0.3, 0.05));

  // ---------- Robots ----------
  // Each patrols a stretch of track, weaving across the lanes. Hover robots
  // bob up and down: sometimes you can roll under them, sometimes not.
  const robots = [
    { a: 0.05, b: 0.15, lane: 2.2, hover: false, phase: 0 },
    { a: 0.12, b: 0.2, lane: 1.6, hover: true, phase: 1.3 },
    { a: 0.22, b: 0.3, lane: 2.4, hover: false, phase: 2.1 },
    { a: 0.33, b: 0.41, lane: 2.0, hover: false, phase: 0.7 },
    { a: 0.5, b: 0.6, lane: 2.2, hover: false, phase: 2.8 },
    { a: 0.66, b: 0.74, lane: 1.8, hover: true, phase: 0.4 },
    { a: 0.84, b: 0.93, lane: 2.4, hover: false, phase: 1.7 },
  ].map((r, i) => {
    const g = robot();
    const k = b.kinematic(g, [b.RAPIER.ColliderDesc.cuboid(0.42, 0.75, 0.36).setTranslation(0, 0.75, 0)]);
    if (i === 0) {
      const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture('BEEP. AGREED.') }));
      bubble.scale.set(2.2, 0.8, 1);
      bubble.position.y = 2.4;
      g.add(bubble);
    }
    const s0 = r.a * L;
    const s1 = r.b * L;
    return { ...r, k, s0, s1, w: 6 / (s1 - s0) }; // top speed about 3 m/s
  });
  const basis = new THREE.Matrix4();
  const rq = new THREE.Quaternion();
  const xAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3();

  // ---------- The alien and its lasers ----------
  const ufo = saucer();
  b.decor(ufo);
  const speech = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture('THE MARBLE IS A CUBE.') }));
  speech.scale.set(4, 1, 1);
  speech.position.set(0, 3.3, 0);
  ufo.add(speech);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.6, 32),
    new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  b.decor(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 1, 10),
    new THREE.MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.85 }),
  );
  beam.visible = false;
  b.decor(beam);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.8 }));
  flash.visible = false;
  b.decor(flash);

  const LASER = { idle: 2.2, aim: 1.0, fire: 0.25, radius: 1.7, knock: 6.5, pop: 3.5 };
  const laser = { phase: 'idle', timer: LASER.idle, target: new THREE.Vector3() };
  const ufoPos = new THREE.Vector3(0, 10, 0);
  const Y = new THREE.Vector3(0, 1, 0);

  const gemFracs = [
    [0.04, 0], [0.09, 2], [0.15, -2], [0.27, 1.6], [0.34, -2],
    [0.42, 0], [0.5, 2], [0.58, -2], [0.68, 0], [0.8, 2],
  ];
  const checkpoints = [0.25, 0.44, 0.76].map((frac) => {
    const s = frac * L;
    const center = onTrack(s, 0, 1.5);
    return {
      box: new THREE.Box3().setFromCenterAndSize(center, new THREE.Vector3(9, 5, 9)),
      spawn: onTrack(s, 0, R + 0.05),
      yaw: yawAt(s),
    };
  });
  checkpoints.push(
    { box: new THREE.Box3(P(94, -5.5, -140), P(102, -2, -134)), spawn: P(98, -5 + R + 0.05, -137), yaw: 0 },
    { box: new THREE.Box3(P(93.5, -5.5, -190), P(102.5, -2, -180)), spawn: P(98, -5 + R + 0.05, -184), yaw: 0 },
  );

  return {
    id: '5',
    name: 'The Post-ASI Future',
    tagline: 'Everything is fine.',
    par: 180,
    final: true,
    sky: 'space',
    // Exposed for the dev console's autopilot checks.
    track,
    debug: { robots, laser, LASER },
    spawn: new THREE.Vector3(0, R, 4),
    spawnYaw: 0,
    killY: -34,
    killTop: 14, // falling "up" through the hole in the ceiling
    gems: [
      ...gemFracs.map(([f, lat]) => onTrack(f * L, lat, 0.6)),
      P(FLIP.x - 2, FLIP.ceil - 0.6, -151), // upside down
      P(FLIP.x + 2.2, FLIP.ceil - 0.6, -167),
    ],
    hiddenGem: P(-7.2, 0.6, -34),
    powerups: [
      { type: 'energy', pos: onTrack(0.07 * L, -2, 0.6) },
      { type: 'energy', pos: onTrack(0.78 * L, 0, 0.6) },
      { type: 'rollback', pos: onTrack(0.47 * L, -1.5, 0.6) },
      ...pivots,
    ],
    finish: { pos: finishPos, radius: 1.1 },
    checkpoints,

    reset() {
      laser.phase = 'idle';
      laser.timer = LASER.idle + 1.5;
      ring.visible = beam.visible = flash.visible = false;
      ufoPos.set(0, 10, 0);
    },

    fixedUpdate(dt, t, ctx) {
      // Robots, beeping now and then when you're close.
      for (const r of robots) {
        if (ctx.game.state === 'playing' && r.k.object && Math.random() < dt * 0.6 && r.k.object.position.distanceTo(ctx.marble.currPos) < 7) audio.robotBeep();
        const arg = t * r.w + r.phase;
        const s = r.s0 + (r.s1 - r.s0) * (0.5 - 0.5 * Math.cos(arg));
        const dir = Math.sin(arg) >= 0 ? 1 : -1;
        const f = track.at(s);
        const lift = r.hover ? 0.95 + 0.55 * Math.sin(t * 1.3 + r.phase) : 0;
        const pos = f.p.clone().addScaledVector(f.side, r.lane * Math.sin(t * 0.7 + r.phase * 2)).addScaledVector(f.up, lift);
        zAxis.copy(f.T).multiplyScalar(-dir);
        xAxis.crossVectors(f.up, zAxis).normalize();
        basis.makeBasis(xAxis, f.up, zAxis);
        rq.setFromRotationMatrix(basis);
        r.k.place(pos, rq);
      }

      // Saucer drifts after the marble.
      const m = ctx.marble;
      const goal = m.currPos.clone().add(new THREE.Vector3(Math.sin(t * 0.4) * 6, 9, 5 + Math.cos(t * 0.3) * 3));
      ufoPos.lerp(goal, Math.min(1, dt * 1.2));
      ufo.position.copy(ufoPos);
      ufo.rotation.y += dt * 0.8;

      // Lasers only while the clock runs, and not through the ceiling.
      if (ctx.game.state !== 'playing' || ctx.game.oob > 0 || ctx.game.up.y < 0) {
        if (laser.phase !== 'idle') {
          laser.phase = 'idle';
          laser.timer = LASER.idle;
        }
        ring.visible = beam.visible = false;
        return;
      }
      laser.timer -= dt;
      if (laser.phase === 'idle' && laser.timer <= 0) {
        const v = m.body.linvel();
        laser.target.set(m.currPos.x + v.x * 0.6, m.currPos.y - R + 0.06, m.currPos.z + v.z * 0.6);
        laser.phase = 'aim';
        laser.timer = LASER.aim;
        ring.visible = true;
        audio.laserCharge(LASER.aim);
      } else if (laser.phase === 'aim') {
        ring.position.copy(laser.target);
        ring.scale.setScalar(0.6 + 0.4 * (1 - laser.timer / LASER.aim));
        if (laser.timer <= 0) {
          laser.phase = 'fire';
          laser.timer = LASER.fire;
          ring.visible = false;
          const from = ufoPos.clone().add(new THREE.Vector3(0, -0.6, 0));
          const span = laser.target.clone().sub(from);
          beam.scale.set(1, span.length(), 1);
          beam.position.copy(from).addScaledVector(span, 0.5);
          beam.quaternion.setFromUnitVectors(Y, span.normalize());
          beam.visible = true;
          flash.position.copy(laser.target);
          flash.visible = true;
          audio.laserZap();
          // Hit: knock the marble sideways, away from the impact.
          const away = m.currPos.clone().sub(laser.target);
          away.y = 0;
          if (away.length() < LASER.radius) {
            if (away.lengthSq() < 0.01) away.copy(ctx.cam.right);
            away.normalize();
            const v = m.body.linvel();
            m.body.setLinvel({ x: v.x + away.x * LASER.knock, y: Math.max(v.y, 0) + LASER.pop, z: v.z + away.z * LASER.knock }, true);
          }
        }
      } else if (laser.phase === 'fire' && laser.timer <= 0) {
        laser.phase = 'idle';
        laser.timer = LASER.idle;
        beam.visible = flash.visible = false;
      }
    },

    update(dt, now) {
      for (const f of floaters) {
        f.obj.rotation.x += f.spin.x * dt;
        f.obj.rotation.y += f.spin.y * dt;
        f.obj.rotation.z += f.spin.z * dt;
        f.obj.position.y = f.base.y + Math.sin(now * 0.8 + f.base.x) * 0.6;
      }
      lostTag.position.y = lost.position.y + 2.6;
      if (flash.visible) flash.scale.setScalar(1 + Math.sin(now * 40) * 0.15);
    },
  };
}

/**
 * Straight rainbow slab with a collider. The stripes run across its width on
 * the top face, or on the bottom face for a ceiling (`ceiling` = true).
 */
function slab(b, topMat, edgeMat, x, y, z, w, h, d, ceiling) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  // Faces: +x, -x, +y, -y, +z, -z (4 vertices each). Stripes across x, 6 m repeats along z.
  for (const face of [2, 3]) {
    for (let k = 0; k < 4; k++) {
      const i = face * 4 + k;
      uv.setXY(i, uv.getX(i), (uv.getY(i) * d) / 6);
    }
  }
  const mats = [edgeMat, edgeMat, ceiling ? edgeMat : topMat, ceiling ? topMat : edgeMat, edgeMat, edgeMat];
  const mesh = new THREE.Mesh(geo, mats);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  b.scene.add(mesh);
  b.world.createCollider(b.RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(x, y, z));
  return mesh;
}

/** White comic speech bubble. */
function bubbleTexture(text) {
  const W = 512;
  const H = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1b1b1f';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(6, 6, W - 12, H - 30, 26);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 - 20, H - 26);
  ctx.lineTo(W / 2, H - 4);
  ctx.lineTo(W / 2 + 14, H - 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(W / 2 - 16, H - 30, 28, 8);
  ctx.fillStyle = '#1b1b1f';
  ctx.font = '44px "Bree Serif", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 44;
  while (ctx.measureText(text).width > W - 60 && size > 16) {
    size -= 2;
    ctx.font = `${size}px "Bree Serif", Georgia, serif`;
  }
  ctx.fillText(text, W / 2, (H - 24) / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
