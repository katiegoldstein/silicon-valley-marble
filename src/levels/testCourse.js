import * as THREE from 'three';

/**
 * Gray test course for tuning marble feel. Not a real level: every piece
 * exists to answer one question about the physics.
 *
 * Layout (forward is -z, you spawn at the origin looking down the runway):
 *   center lane  runway -> ramp over a hump -> stairs -> gap jumps
 *   left lane    balance beam -> pillar slalom
 *   right lane   kicker ramp -> speed bumps -> bounce wall -> side slope
 * Everything sits on one big slab, so a missed jump just drops you to the
 * floor. Rolling off the slab's edge respawns you.
 */
export function buildTestCourse(b) {
  const FLOOR = 0xc3c7ce;
  const BLOCK = 0xaab0b9;
  const DARK = 0x7f8690;

  // Ground slab: 44 m wide, 124 m long.
  b.box({ x: 0, y: -0.5, z: -50 }, { x: 44, y: 1, z: 124 }, { color: FLOOR });

  // --- Center lane: z = 0 to -30 is open runway for top speed and braking. ---

  // Hump: gentle way up (14 deg), steep way down (27 deg).
  b.ramp(0, -30, 0, -38, 2, 6);
  b.block(0, -38, -42, 6, 2, { color: BLOCK });
  b.ramp(0, -42, 2, -46, 0, 6);

  // Stairs: 0.5 m risers. Each is one jump; none can be rolled up.
  b.block(0, -54, -57, 6, 0.5, { color: BLOCK });
  b.block(0, -57, -60, 6, 1.0, { color: BLOCK });
  b.block(0, -60, -68, 6, 1.5, { color: BLOCK });

  // Gap jumps at 1.5 m up: 2 m, 4 m, then 6 m.
  b.block(0, -70, -74, 6, 1.5, { color: BLOCK });
  b.block(0, -78, -82, 6, 1.5, { color: BLOCK });
  b.block(0, -88, -94, 6, 1.5, { color: BLOCK });
  b.ramp(0, -94, 1.5, -100, 0, 6);

  // Jump-height gauge beside the stairs: ledges at 0.75, 1.0, 1.25, 1.5 m.
  [0.75, 1.0, 1.25, 1.5].forEach((h, i) => {
    b.block(6.5, -48 - i * 2, -50 - i * 2, 3, h, { color: DARK });
  });

  // --- Left lane: precision. ---
  b.ramp(-12, -8, 0, -12, 1, 2);
  b.block(-12, -12, -14, 2, 1, { color: BLOCK });
  b.block(-12, -14, -30, 0.6, 1, { color: DARK }); // 60 cm beam, 16 m long
  b.block(-12, -30, -33, 3, 1, { color: BLOCK });
  for (let i = 0; i < 7; i++) {
    b.pillar(-12 + (i % 2 ? 1.6 : -1.6), -44 - i * 5, 0.6, 2);
  }

  // --- Right lane: momentum. ---
  b.ramp(12, -8, 0, -16, 3, 5); // kicker: launches you for air-control tests
  for (let i = 0; i < 5; i++) b.bump(12, -36 - i * 3, 6, 0.18);
  b.box({ x: 12, y: 1.5, z: -60 }, { x: 8, y: 3, z: 0.6 }, { color: DARK }); // bounce wall
  // Side slope, 25 deg, to test holding a line across a hill.
  b.box(
    { x: 14, y: 0.6, z: -80 },
    { x: 8, y: 0.5, z: 20 },
    { color: 0x9aa1ab, rot: new THREE.Euler(0, 0, 0.44) },
  );

  return {
    id: 'test',
    name: 'Test course',
    sandbox: true, // no countdown, clock or gems; tuning panel open
    spawn: new THREE.Vector3(0, 0.6, 0),
    spawnYaw: 0,
    killY: -12,
  };
}
