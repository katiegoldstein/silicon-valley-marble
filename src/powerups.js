import * as THREE from 'three';

/**
 * Power-ups from the spec's table (same functions as the classics, reskinned).
 * All are picked up and fired with a left click, except Pivot, which turns
 * gravity the moment you touch it (like the classic gravity modifier), so it
 * can be placed exactly where the wall or ceiling starts.
 */
export const POWERUPS = {
  energy: {
    name: 'Energy Drink',
    icon: `<svg viewBox="0 0 52 52" aria-hidden="true"><rect x="16" y="8" width="20" height="36" rx="4" fill="#3fe36a" stroke="#0b3a14" stroke-width="2.5"/><rect x="18" y="5" width="16" height="5" rx="2" fill="#c9ced8" stroke="#0b3a14" stroke-width="2"/><path d="M28 15 L21 28 H26 L23 38 L31 24 H26 Z" fill="#ffe94a" stroke="#0b3a14" stroke-width="1.5"/></svg>`,
  },
  seriesA: {
    name: 'Series A',
    icon: `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="27" r="17" fill="#ffd21f" stroke="#3a2a00" stroke-width="3"/><text x="26" y="35" text-anchor="middle" font-family="Luckiest Guy, sans-serif" font-size="22" fill="#3a2a00">A</text><path d="M26 2 L18 11 H34 Z" fill="#3fe36a" stroke="#0b3a14" stroke-width="2"/></svg>`,
  },
  drone: {
    name: 'Drone',
    icon: `<svg viewBox="0 0 52 52" aria-hidden="true"><rect x="18" y="22" width="16" height="10" rx="3" fill="#2b3446"/><g stroke="#2b3446" stroke-width="3"><line x1="18" y1="24" x2="8" y2="16"/><line x1="34" y1="24" x2="44" y2="16"/></g><ellipse cx="8" cy="14" rx="8" ry="3" fill="#ffe94a" stroke="#3a2a00" stroke-width="1.5"/><ellipse cx="44" cy="14" rx="8" ry="3" fill="#ffe94a" stroke="#3a2a00" stroke-width="1.5"/></svg>`,
  },
  hype: {
    name: 'Hype Cycle',
    hint: 'Bouncy for 5 s',
    icon: `<svg viewBox="0 0 52 52" aria-hidden="true"><path d="M4 40 C12 40 12 10 20 10 C28 10 26 34 34 34 C40 34 40 22 48 22" fill="none" stroke="#ff4fb8" stroke-width="5" stroke-linecap="round"/><circle cx="20" cy="10" r="6" fill="#ffe94a" stroke="#3a2a00" stroke-width="2"/></svg>`,
  },
  severance: {
    name: 'Severance Package',
    hint: 'No bounce for 5 s',
    icon: `<svg viewBox="0 0 52 52" aria-hidden="true"><rect x="8" y="16" width="36" height="26" rx="3" fill="#c98a3a" stroke="#3a2a00" stroke-width="2.5"/><rect x="19" y="10" width="14" height="8" rx="2" fill="none" stroke="#3a2a00" stroke-width="2.5"/><rect x="8" y="26" width="36" height="4" fill="#3a2a00"/><text x="26" y="40" text-anchor="middle" font-family="Luckiest Guy, sans-serif" font-size="11" fill="#ffe94a">$$$</text></svg>`,
  },
  pivot: {
    name: 'Pivot',
    hint: 'Gravity turned',
    icon: `<svg viewBox="0 0 52 52" aria-hidden="true"><path d="M12 30 A14 14 0 1 1 26 40" fill="none" stroke="#ffd21f" stroke-width="5"/><path d="M4 26 L12 36 L20 26 Z" fill="#ffd21f" stroke="#3a2a00" stroke-width="2"/></svg>`,
  },
  rollback: {
    name: 'Rollback',
    hint: 'Clock frozen for 5 s',
    icon: `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="27" cy="27" r="17" fill="#19c2d8" stroke="#0d2560" stroke-width="3"/><path d="M27 15 V27 L35 31" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M4 18 L12 10 L13 21 Z" fill="#ffe94a" stroke="#3a2a00" stroke-width="2"/></svg>`,
  },
};

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

/** Floating pickup model, about 0.7 m tall, centered on its position. */
export function makePowerupMesh(type) {
  const g = new THREE.Group();
  if (type === 'energy') {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.55, 18), lambert(0x3fe36a, { emissive: 0x0b3a14 }));
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 18), lambert(0xc9ced8));
    lid.position.y = 0.3;
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.02), lambert(0xffe94a, { emissive: 0x6a5a00 }));
    bolt.position.set(0, 0, -0.19);
    bolt.rotation.z = 0.4;
    g.add(can, lid, bolt);
  } else if (type === 'seriesA') {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 24), lambert(0xffd21f, { emissive: 0x5a4200 }));
    coin.rotation.x = Math.PI / 2;
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 4), lambert(0x3fe36a, { emissive: 0x0b3a14 }));
    arrow.position.y = 0.48;
    g.add(coin, arrow);
  } else if (type === 'drone') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), lambert(0x2b3446));
    g.add(body);
    for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.42), lambert(0x2b3446));
      arm.position.set(x / 2, 0, z / 2);
      arm.rotation.y = Math.atan2(x, z);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16), lambert(0xffe94a, { emissive: 0x6a5a00 }));
      rotor.position.set(x, 0.08, z);
      g.add(arm, rotor);
    }
  } else if (type === 'hype') {
    // A bouncing ball over a little hype curve.
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), lambert(0xff4fb8, { emissive: 0x5a0a33 }));
    ball.position.y = 0.12;
    const spring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 20), lambert(0xffe94a, { emissive: 0x6a5a00 }));
    spring.rotation.x = Math.PI / 2;
    spring.position.y = -0.16;
    const spring2 = spring.clone();
    spring2.position.y = -0.28;
    g.add(ball, spring, spring2);
  } else if (type === 'severance') {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.38, 0.2), lambert(0xc98a3a));
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.21), lambert(0x3a2a00));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 16, Math.PI), lambert(0x3a2a00));
    handle.position.y = 0.19;
    g.add(bag, strap, handle);
  } else if (type === 'pivot') {
    // Arrow pointing down its local -y; the level orients it along the new gravity.
    const spin = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 10), lambert(0xffd21f, { emissive: 0x5a4200 }));
    shaft.position.y = 0.15;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 4), lambert(0xffd21f, { emissive: 0x5a4200 }));
    head.rotation.x = Math.PI;
    head.position.y = -0.18;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 8, 28), lambert(0x19c2d8, { emissive: 0x0a3a44 }));
    ring.rotation.x = Math.PI / 2;
    spin.add(shaft, head, ring);
    g.add(spin);
    g.userData.spin = spin;
  } else if (type === 'rollback') {
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 24), lambert(0x19c2d8, { emissive: 0x0a3a44 }));
    face.rotation.x = Math.PI / 2;
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.11, 24), lambert(0xffffff));
    dial.rotation.x = Math.PI / 2;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.13), lambert(0x0d2560));
    hand.position.y = 0.07;
    const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.13), lambert(0x0d2560));
    hand2.position.x = 0.05;
    g.add(face, dial, hand, hand2);
  }
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}
