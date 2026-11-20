import * as THREE from 'three';
import { tuning } from '../tuning.js';
import { hazardTexture, textTexture } from './builder.js';

/**
 * Level 1 — Data Center. "Don't touch prod."
 * An enclosed data hall; a tutorial in disguise.
 *
 * Route (forward is -z):
 *   z   0        start pad, center aisle between the rack rows
 *   z -24..-34   cooling fan blows you right, toward missing floor tiles
 *   z -46..-49   cable trench: the first jump
 *   z -57..-67   two racks parked in the aisle (one of them is prod)
 *   z -82..-96   floor tiles pulled up for maintenance: hop the stepping stones
 *   z -96..-108  second cooling fan, blowing the other way
 *   z -112..-122 hazard-striped ramp
 *   z -122..-134 giant GPU; the finish pad is on top
 */
export function buildDataCenter(b) {
  const R = tuning.radius;
  const HALL = { x: 14, zBack: 8, zFar: -138, ceiling: 7, pit: -5 };
  const AISLE = 2.5; // half-width of the center aisle
  const RACK_H = 2.6;

  // ---------- Floor (5 m thick, so the gaps read as real pits) ----------
  const floorMat = new THREE.MeshLambertMaterial({ map: raisedFloorTexture() });
  const floor = (x0, x1, z0, z1) =>
    b.box(
      { x: (x0 + x1) / 2, y: HALL.pit / 2, z: (z0 + z1) / 2 },
      { x: x1 - x0, y: -HALL.pit, z: z0 - z1 },
      { material: floorMat },
    );
  floor(-HALL.x, HALL.x, HALL.zBack, -24);
  floor(-HALL.x, 1, -24, -34); // wind stretch: tiles are missing from x = 1 to 5.5
  floor(5.5, HALL.x, -24, -34);
  floor(-HALL.x, HALL.x, -34, -46);
  floor(-HALL.x, HALL.x, -49, -82); // z -46..-49 is the cable trench
  // Maintenance pit: only the strips under the outer rack rows remain...
  floor(-HALL.x, -7.4, -82, -96);
  floor(7.4, HALL.x, -82, -96);
  // ...plus four 2 m stepping stones, zig-zagging, with 1-1.5 m gaps.
  const STONES = [[0, -84], [-2.2, -87.5], [0, -91], [2.2, -94.5]];
  for (const [x, z] of STONES) floor(x - 1, x + 1, z + 1, z - 1);
  floor(-HALL.x, -5.5, -96, -108); // second wind stretch: tiles missing from x = -5.5 to -1
  floor(-1, HALL.x, -96, -108);
  floor(-HALL.x, HALL.x, -108, HALL.zFar);

  // Subfloor: what you land on when you fall. Below killY, so it's out of bounds.
  const length = HALL.zBack - HALL.zFar;
  const zMid = (HALL.zBack + HALL.zFar) / 2;
  b.box(
    { x: 0, y: HALL.pit - 0.25, z: zMid },
    { x: HALL.x * 2, y: 0.5, z: length },
    { material: b.flat(0x1a2030) },
  );
  // Cables strung along the trench floor.
  [0xffd21f, 0x39b6ff, 0xe8462a, 0x3fe36a, 0xffd21f, 0x39b6ff].forEach((color, i) => {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, HALL.x * 2, 8), b.flat(color));
    cable.rotation.z = Math.PI / 2;
    cable.position.set(0, HALL.pit + 0.1, -46.4 + i * 0.44);
    b.decor(cable);
  });

  // ---------- Room shell ----------
  const wallMat = b.flat(0xe3e7ec);
  const wallH = HALL.ceiling - HALL.pit;
  const wallY = (HALL.ceiling + HALL.pit) / 2;
  const wall = (center, size) => b.box(center, size, { material: wallMat, castShadow: false });
  wall({ x: 0, y: wallY, z: HALL.zBack + 0.25 }, { x: HALL.x * 2 + 1, y: wallH, z: 0.5 });
  wall({ x: 0, y: wallY, z: HALL.zFar - 0.25 }, { x: HALL.x * 2 + 1, y: wallH, z: 0.5 });
  wall({ x: -HALL.x - 0.25, y: wallY, z: zMid }, { x: 0.5, y: wallH, z: length });
  wall({ x: HALL.x + 0.25, y: wallY, z: zMid }, { x: 0.5, y: wallH, z: length });

  const stripe = b.flat(0x2f6bff);
  const stripeBox = (center, size) =>
    b.box(center, size, { material: stripe, collide: false, castShadow: false });
  stripeBox({ x: 0, y: 1.5, z: HALL.zBack - 0.02 }, { x: HALL.x * 2, y: 0.4, z: 0.04 });
  stripeBox({ x: 0, y: 1.5, z: HALL.zFar + 0.02 }, { x: HALL.x * 2, y: 0.4, z: 0.04 });
  stripeBox({ x: -HALL.x + 0.02, y: 1.5, z: zMid }, { x: 0.04, y: 0.4, z: length });
  stripeBox({ x: HALL.x - 0.02, y: 1.5, z: zMid }, { x: 0.04, y: 0.4, z: length });

  // Drop ceiling with light panels.
  b.box(
    { x: 0, y: HALL.ceiling + 0.25, z: zMid },
    { x: HALL.x * 2, y: 0.5, z: length },
    { color: 0x9aa8bc, collide: false, castShadow: false },
  );
  const panelGeo = new THREE.PlaneGeometry(2, 1.2);
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let z = 4; z > HALL.zFar; z -= 6) {
    for (const x of [-9, 0, 9]) {
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.rotation.x = Math.PI / 2;
      panel.position.set(x, HALL.ceiling - 0.01, z);
      b.decor(panel);
    }
  }

  // Yellow cable trays hung over each rack row.
  const trayMat = b.flat(0xffc61a);
  const hangerMat = b.flat(0x5a4a12);
  for (const x of [-8, -3.1, 3.1, 8]) {
    b.box(
      { x, y: 5.3, z: (4 - 108) / 2 },
      { x: 1, y: 0.12, z: 112 },
      { material: trayMat, collide: false, castShadow: false },
    );
    for (let z = 0; z > -108; z -= 8) {
      b.box(
        { x, y: (5.3 + HALL.ceiling) / 2, z },
        { x: 0.06, y: HALL.ceiling - 5.3, z: 0.06 },
        { material: hangerMat, collide: false, castShadow: false },
      );
    }
  }

  // ---------- Server racks ----------
  const rackFrames = [rackTexture(1), rackTexture(2), rackTexture(3)];
  const rackFace = new THREE.MeshLambertMaterial({ map: rackFrames[0] });
  const rackSide = b.flat(0x1b2740);

  /** Run of racks. `facing` is the axis its doors face: 'x' for rows along the aisle. */
  function racks(x0, x1, z0, z1, facing = 'x') {
    const w = x1 - x0;
    const d = z0 - z1;
    const geo = new THREE.BoxGeometry(w, RACK_H, d);
    const uv = geo.attributes.uv;
    const firstVertex = facing === 'x' ? 0 : 16; // +x/-x faces, or +z/-z faces
    const units = (facing === 'x' ? d : w) / 0.8; // one rack every 80 cm
    for (let i = firstVertex; i < firstVertex + 8; i++) uv.setX(i, uv.getX(i) * units);
    const mats =
      facing === 'x'
        ? [rackFace, rackFace, rackSide, rackSide, rackSide, rackSide]
        : [rackSide, rackSide, rackSide, rackSide, rackFace, rackFace];
    const mesh = new THREE.Mesh(geo, mats);
    const center = { x: (x0 + x1) / 2, y: RACK_H / 2, z: (z0 + z1) / 2 };
    mesh.position.set(center.x, center.y, center.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    b.scene.add(mesh);
    b.world.createCollider(
      b.RAPIER.ColliderDesc.cuboid(w / 2, RACK_H / 2, d / 2)
        .setTranslation(center.x, center.y, center.z)
        .setFriction(1),
    );
  }

  const INNER = [AISLE, AISLE + 1.2];
  const OUTER = [7.4, 8.6];
  // Inner rows line the center aisle.
  racks(-INNER[1], -INNER[0], 4, -24);
  racks(INNER[0], INNER[1], 4, -24);
  for (const [z0, z1] of [[-34, -46], [-49, -76]]) {
    racks(-INNER[1], -INNER[0], z0, z1);
    racks(INNER[0], INNER[1], z0, z1);
  }
  // Outer rows, running on past the maintenance pit.
  for (const [z0, z1] of [[4, -46], [-49, -108]]) {
    racks(-OUTER[1], -OUTER[0], z0, z1);
    racks(OUTER[0], OUTER[1], z0, z1);
  }
  // Two racks parked in the aisle: pass the first on the right, the second on the left.
  racks(-AISLE, 0.3, -57.4, -58.6, 'z');
  racks(-0.3, AISLE, -65.4, -66.6, 'z');
  b.sign('PROD:\nDO NOT TOUCH', { x: -1.1, y: 1.55, z: -57.38 }, 1.5, 0.9, {
    bg: '#ffd21f',
    fg: '#1b1b1f',
    border: '#1b1b1f',
    font: '"Bree Serif", Georgia, serif',
  });

  // ---------- Cooling fans and their wind zones ----------
  const WIND_ACCEL = 3.5; // m/s²; was 6.5, too strong in playtest
  const housingMat = b.flat(0x2c3a4c);
  const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  const tintMat = new THREE.MeshBasicMaterial({ color: 0x39b6ff, transparent: true, opacity: 0.13, depthWrite: false });

  /**
   * Fan housing on one side of the aisle, blowing across it toward missing tiles.
   * dir +1 blows toward +x (fan on the left), -1 toward -x (fan on the right).
   * `reach` is the x the wind stops at, past the far edge of the gap.
   */
  function coolingFan(dir, zMid, reach) {
    const faceX = -dir * AISLE;
    b.box({ x: faceX - dir * 0.6, y: 1.6, z: zMid }, { x: 1.2, y: 3.2, z: 10 }, { material: housingMat });
    const face = new THREE.Mesh(new THREE.CircleGeometry(1.45, 32), b.flat(0x141a24));
    face.rotation.y = (dir * Math.PI) / 2;
    face.position.set(faceX + dir * 0.02, 1.6, zMid);
    b.decor(face);
    const rotor = makeBlades(1.3, 0xc9d3e0, b);
    const mount = new THREE.Group(); // tips the rotor so it spins about x
    mount.add(rotor);
    mount.rotation.z = -Math.PI / 2;
    mount.position.set(faceX + dir * 0.06, 1.6, zMid);
    b.decor(mount);

    const x0 = Math.min(faceX, reach);
    const x1 = Math.max(faceX, reach);
    const zone = {
      box: new THREE.Box3(new THREE.Vector3(x0, -1, zMid - 4.5), new THREE.Vector3(x1, 3.5, zMid + 4.5)),
      accel: new THREE.Vector3(dir * WIND_ACCEL, 0, 0),
    };
    const tint = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 3.2, 9), tintMat);
    tint.position.set((x0 + x1) / 2, 1.6, zMid);
    b.decor(tint);
    const streaks = Array.from({ length: 12 }, (_, i) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.03), streakMat);
      s.position.set(x0 + ((i * 2.9) % (x1 - x0)), 0.3 + ((i * 0.77) % 2.6), zMid + 4 - ((i * 3.1) % 8));
      return b.decor(s);
    });
    const update = (dt) => {
      rotor.rotation.y += dt * 14;
      for (const s of streaks) {
        s.position.x += dir * dt * 9;
        if (s.position.x > x1) s.position.x = x0;
        if (s.position.x < x0) s.position.x = x1;
      }
    };
    return { zone, update };
  }
  const fans = [coolingFan(1, -29, 5.5), coolingFan(-1, -102, -5.5)];

  // ---------- Hazard edges, checkpoints ----------
  const hazard = new THREE.MeshLambertMaterial({ map: hazardTexture() });
  const hazardStripe = (x, z, w) =>
    b.box({ x, y: 0.005, z }, { x: w, y: 0.01, z: 0.6 }, { material: hazard, collide: false, castShadow: false });
  hazardStripe(0, -45.7, AISLE * 2); // cable trench
  hazardStripe(0, -49.3, AISLE * 2);
  hazardStripe(0, -81.7, 14.8); // maintenance pit
  hazardStripe(0, -96.3, 14.8);
  const STONE_TINT = b.flat(0xffd21f);
  for (const [x, z] of STONES) {
    // Yellow rim so each stone reads as a tile left in place.
    b.box({ x, y: 0.004, z }, { x: 2.06, y: 0.008, z: 2.06 }, { material: STONE_TINT, collide: false, castShadow: false });
    b.box({ x, y: 0.006, z }, { x: 1.86, y: 0.008, z: 1.86 }, { material: floorMat, collide: false, castShadow: false });
  }
  const checkpoints = [-38, -72, -110].map((z) => {
    b.box({ x: 0, y: 0.005, z }, { x: AISLE * 2, y: 0.01, z: 0.3 }, { material: b.flat(0x3fe36a), collide: false, castShadow: false });
    return {
      box: new THREE.Box3(new THREE.Vector3(-AISLE, -0.5, z - 1.5), new THREE.Vector3(AISLE, 4, z + 1.5)),
      spawn: new THREE.Vector3(0, R, z),
      yaw: 0,
    };
  });

  // ---------- "UPTIME" sign over the aisle; flickers off when you fall ----------
  const signStyle = { bg: '#06120a', fg: '#3fe36a' };
  const uptimeOn = textTexture('UPTIME 99.9%', 5, 0.9, signStyle);
  const uptimeOff = textTexture('UPTIME --.-%', 5, 0.9, { bg: '#06120a', fg: '#123a1c' });
  const uptime = b.sign('UPTIME 99.9%', { x: 0, y: 4.3, z: -44 }, 5, 0.9, signStyle);
  uptime.material.map = uptimeOn;
  for (const x of [-2.3, 2.3]) {
    b.box({ x, y: 5.85, z: -44 }, { x: 0.05, y: 2.3, z: 0.05 }, { material: hangerMat, collide: false, castShadow: false });
  }
  let uptimeDown = 0;

  // ---------- Ramp and the giant GPU ----------
  b.ramp(0, -112, 0, -122, 3, 4, { material: hazard });
  const GPU = { top: 3, z0: -122, z1: -134, halfW: 7 };
  const gpuMid = (GPU.z0 + GPU.z1) / 2;
  b.box(
    { x: 0, y: GPU.top / 2, z: (GPU.z0 + GPU.z1) / 2 },
    { x: GPU.halfW * 2, y: GPU.top, z: GPU.z0 - GPU.z1 },
    { material: b.flat(0x232c3b) },
  );
  // Shroud trim, gold edge connector, label.
  b.box({ x: 0, y: GPU.top + 0.005, z: gpuMid }, { x: 13.4, y: 0.01, z: 11.4 }, { material: b.flat(0x2f3b4f), collide: false, castShadow: false });
  b.box({ x: GPU.halfW + 0.03, y: 0.35, z: gpuMid }, { x: 0.06, y: 0.7, z: 9 }, { material: b.flat(0xe8b923), collide: false, castShadow: false });
  b.sign('GIGA-GPU 9000', { x: 4.6, y: 1.7, z: GPU.z0 + 0.02 }, 3.8, 0.8, { bg: '#232c3b', fg: '#9dff3a' });
  b.sign('GIGA-GPU 9000', { x: -4.6, y: 1.7, z: GPU.z0 + 0.02 }, 3.8, 0.8, { bg: '#232c3b', fg: '#9dff3a' });
  const gpuFans = [-3.9, 3.9].map((x) => {
    const well = new THREE.Mesh(new THREE.CircleGeometry(2.5, 40), b.flat(0x10151d));
    well.rotation.x = -Math.PI / 2;
    well.position.set(x, GPU.top + 0.012, gpuMid + 1.6);
    b.decor(well);
    const blades = makeBlades(2.3, 0x4a5a73, b, 0.02);
    blades.position.set(x, GPU.top + 0.03, gpuMid + 1.6);
    return b.decor(blades);
  });

  const finishPos = new THREE.Vector3(0, GPU.top, gpuMid - 3.6);
  b.pad(finishPos, [[1.3, 0xe8462a], [1.0, 0xffe94a], [0.65, 0xffffff]]);
  b.sign('FINISH', { x: 0, y: 5.6, z: finishPos.z }, 2.6, 0.8, { bg: '#e8462a', fg: '#ffe94a', border: '#5a1206' });
  for (const x of [-1.2, 1.2]) {
    b.box({ x, y: 6.5, z: finishPos.z }, { x: 0.05, y: 1, z: 0.05 }, { material: hangerMat, collide: false, castShadow: false });
  }

  // ---------- Far wall ----------
  b.sign('DATA HALL 4', { x: -6.5, y: 5, z: HALL.zFar + 0.05 }, 7, 1.2, { bg: '#e3e7ec', fg: '#2f6bff' });
  b.box({ x: 9.5, y: 1.3, z: HALL.zFar + 0.06 }, { x: 1.6, y: 2.6, z: 0.1 }, { material: b.flat(0x8794a8), collide: false, castShadow: false });
  b.sign('EXIT', { x: 9.5, y: 3.1, z: HALL.zFar + 0.05 }, 1.2, 0.45, { bg: '#2e9e5b', fg: '#ffffff' });

  // ---------- Start pad ----------
  b.pad({ x: 0, y: 0, z: 0 }, [[1.3, 0x2fd45a], [1.0, 0xffe94a], [0.65, 0x2f6bff]]);

  let blinkFrame = 0;
  return {
    id: '1',
    name: 'Data Center',
    tagline: "Don't touch prod.",
    par: 60, // spec said 0:45 for the shorter first cut; course was lengthened in playtest
    spawn: new THREE.Vector3(0, R, 0),
    spawnYaw: 0,
    killY: -2.5,
    gems: [
      new THREE.Vector3(0, 0.6, -12), // on the opening straight
      new THREE.Vector3(0.3, 0.6, -29), // in the wind, near the edge
      new THREE.Vector3(0, 1.3, -47.5), // over the trench: jump for it
      new THREE.Vector3(1.4, 0.6, -58), // squeezing past prod
      new THREE.Vector3(-2.2, 0.6, -87.5), // on a stepping stone, off the straight line
    ],
    // Stealth Mode: down the side aisle behind the right-hand racks. Roll back
    // past the start pad and around the end of the row to find it.
    hiddenGem: new THREE.Vector3(11.2, 0.6, -40),
    powerups: [{ type: 'rollback', pos: new THREE.Vector3(-1.5, 0.6, -76) }],
    finish: { pos: finishPos, radius: 1.1 },
    checkpoints,
    zones: fans.map((f) => f.zone),

    onOutOfBounds() {
      uptimeDown = 3;
    },

    update(dt, now) {
      const frame = Math.floor(now * 2.5) % rackFrames.length;
      if (frame !== blinkFrame) {
        blinkFrame = frame;
        rackFace.map = rackFrames[frame];
      }
      for (const fan of fans) fan.update(dt);
      for (const fan of gpuFans) fan.rotation.y += dt * 5;
      if (uptimeDown > 0) {
        uptimeDown -= dt;
        const lit = uptimeDown <= 0 || Math.floor(now * 14) % 5 === 0;
        uptime.material.map = lit ? uptimeOn : uptimeOff;
      }
    },
  };
}

/** Flat fan rotor in the x-z plane, spinning about y. */
function makeBlades(radius, color, b, thickness = 0.04) {
  const rotor = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(radius * 0.36, thickness, radius * 0.92);
  for (let i = 0; i < 6; i++) {
    const arm = new THREE.Group();
    const blade = new THREE.Mesh(bladeGeo, b.flat(color));
    blade.position.z = radius * 0.52;
    arm.add(blade);
    arm.rotation.y = (i * Math.PI) / 3;
    rotor.add(arm);
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, thickness * 2, 16),
    b.flat(0xffd21f),
  );
  rotor.add(hub);
  return rotor;
}

/** Perforated raised-floor tiles: pale gray, yellow grid every 2 m. */
function raisedFloorTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#cdd3dc';
  ctx.fillRect(0, 0, S, S);
  const half = S / 2;
  for (let tx = 0; tx < 2; tx++) {
    for (let ty = 0; ty < 2; ty++) {
      ctx.fillStyle = '#d9dee6';
      ctx.fillRect(tx * half + 6, ty * half + 6, half - 12, half - 12);
      ctx.fillStyle = '#8f99aa';
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          ctx.beginPath();
          ctx.ellipse(tx * half + 25 + i * 26, ty * half + 25 + j * 26, 5, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  ctx.strokeStyle = '#aab2bf';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(half, 0);
  ctx.lineTo(half, S);
  ctx.moveTo(0, half);
  ctx.lineTo(S, half);
  ctx.stroke();
  ctx.strokeStyle = '#ffd21f';
  ctx.lineWidth = 9;
  ctx.strokeRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** One 80 cm rack door: stacked servers, each with status LEDs and vents. */
function rackTexture(seed) {
  const W = 128;
  const H = 416;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2c3a5c';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#141c30';
  ctx.fillRect(8, 8, W - 16, H - 16);
  const leds = ['#3fe36a', '#39b6ff', '#ffb02e', '#3fe36a'];
  let n = seed * 7919;
  const rand = () => {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    return n / 0x7fffffff;
  };
  for (let row = 0; row < 13; row++) {
    const y = 16 + row * 30;
    ctx.fillStyle = '#1e2a44';
    ctx.fillRect(14, y, W - 28, 22);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rand() < 0.8 ? leds[Math.floor(rand() * leds.length)] : '#0c1220';
      ctx.fillRect(20 + i * 11, y + 6, 8, 9);
    }
    ctx.fillStyle = '#0c1220';
    for (let i = 0; i < 8; i++) ctx.fillRect(58 + i * 7, y + 5, 3, 12);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}
