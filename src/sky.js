import * as THREE from 'three';

/**
 * Sky and lighting. One sun with hard shadows, no bloom.
 *   'day'   blue gradient, puffy clouds, green hills far below
 *   'space' deep purple starfield with a ringed planet
 */
export function createSky(scene, kind = 'day') {
  const space = kind === 'space';
  // Everything in `far` rides along with the camera, so it reads as infinitely distant.
  const far = new THREE.Group();
  scene.add(far);

  far.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(900, 24, 16),
      new THREE.MeshBasicMaterial({
        map: gradientTexture(
          space
            ? [[0, '#0b0420'], [0.42, '#1d0a45'], [0.5, '#3a1670'], [0.6, '#1d0a45'], [1, '#0b0420']]
            : [[0, '#2f95ee'], [0.38, '#4fb4f5'], [0.5, '#a9e4fb'], [0.62, '#6fd3f7'], [1, '#4fb4f5']],
        ),
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    ),
  );

  const rand = mulberry32(7);
  if (space) {
    const pts = [];
    for (let i = 0; i < 1800; i++) {
      const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize().multiplyScalar(800);
      pts.push(v.x, v.y, v.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    far.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false })));

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(90, 40, 24),
      new THREE.MeshBasicMaterial({ map: planetTexture() }),
    );
    planet.position.set(320, 140, -560);
    planet.rotation.z = 0.35;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(120, 185, 64),
      new THREE.MeshBasicMaterial({ color: 0xc9a25a, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
    );
    ring.position.copy(planet.position);
    ring.rotation.set(-1.15, 0.35, 0.2);
    far.add(planet, ring);
  } else {
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const puff = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 26; i++) {
      const cloud = new THREE.Group();
      const puffs = 3 + Math.floor(rand() * 3);
      for (let p = 0; p < puffs; p++) {
        const m = new THREE.Mesh(puff, cloudMat);
        const s = 9 + rand() * 9;
        m.scale.set(s * 1.5, s * 0.6, s);
        m.position.set((p - puffs / 2) * 13, rand() * 3, rand() * 6);
        cloud.add(m);
      }
      const angle = rand() * Math.PI * 2;
      const radius = 260 + rand() * 300;
      cloud.position.set(Math.cos(angle) * radius, 40 + rand() * 160, Math.sin(angle) * radius);
      cloud.rotation.y = rand() * Math.PI;
      far.add(cloud);
    }
    // Green hills far below the playfield.
    const hillMat = new THREE.MeshLambertMaterial({ color: 0x6fc25a });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(880, 48), hillMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -90;
    far.add(ground);
    for (let i = 0; i < 18; i++) {
      const a = rand() * Math.PI * 2;
      const r = 350 + rand() * 400;
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), i % 2 ? hillMat : new THREE.MeshLambertMaterial({ color: 0x8fd16f }));
      const s = 60 + rand() * 90;
      hill.scale.set(s * 1.6, s * 0.5, s);
      hill.position.set(Math.cos(a) * r, -90, Math.sin(a) * r);
      far.add(hill);
    }
  }

  scene.add(space ? new THREE.HemisphereLight(0xd8c8ff, 0x3a2470, 1.3) : new THREE.HemisphereLight(0xffffff, 0x8fa3b8, 1.1));

  const sun = new THREE.DirectionalLight(0xffffff, space ? 1.8 : 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const cam = sun.shadow.camera;
  cam.left = cam.bottom = -18;
  cam.right = cam.top = 18;
  cam.near = 1;
  cam.far = 80;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  const sunOffset = new THREE.Vector3(10, 26, 12);
  return {
    /** Keep the sky centered on the camera and the shadow box on the marble. */
    follow(cameraPos, marblePos) {
      far.position.copy(cameraPos);
      sun.target.position.copy(marblePos);
      sun.position.copy(marblePos).add(sunOffset);
    },
  };
}

function gradientTexture(stops) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [t, color] of stops) g.addColorStop(t, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function planetTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d');
  const bands = ['#8b5cf6', '#c084fc', '#f472b6', '#a855f7', '#e879f9', '#7c3aed', '#f9a8d4'];
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = bands[i % bands.length];
    ctx.fillRect(0, i * 16, 64, 16);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
