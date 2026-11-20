import * as THREE from 'three';
import { tuning } from './tuning.js';
import { POWERUPS, makePowerupMesh } from './powerups.js';
import { audio } from './audio.js';
import { recordFinish, recordHiddenGem } from './save.js';

const READY_TIME = 1.1;
const SET_TIME = 2.2;
const OOB_TIME = 1.1;
const GEM_REACH = 0.5; // marble center to gem center
const PICKUP_REACH = 0.75;
const PICKUP_RESPAWN = 8; // seconds until a taken power-up reappears

const ENERGY_BOOST = 10; // m/s added along the camera's forward
const SERIES_A_SPEED = 13; // m/s straight up (about 4 m)
const DRONE_TIME = 5;
const DRONE_LIFT = 0.8; // fraction of gravity cancelled
const DRONE_MAX_FALL = 2.2; // m/s
const EFFECT_TIME = 5; // Hype Cycle, Severance Package, Rollback
const Y = new THREE.Vector3(0, 1, 0);

/**
 * Level rules: the Ready/Set/Go start, the clock, gems, power-ups,
 * checkpoints, wind and launch pads, out of bounds and the finish pad.
 * Levels describe themselves with a plain object (see levels/dataCenter.js);
 * this class runs it.
 *
 * Optional level hooks:
 *   fixedUpdate(dt, t, ctx)  every physics tick before the world steps; move
 *                            kinematic props here. t = seconds since restart.
 *   update(dt, now)          every rendered frame, for purely visual motion.
 *   reset()                  on restart (crumbled platforms come back, etc.)
 *   onOutOfBounds()
 *
 * Optional level fields beyond the basics: hiddenGem (the Stealth Mode gem),
 * killTop (out of bounds above this height while gravity points up),
 * checkpoints[i].up (gravity to restore on respawn there).
 *
 * States: waiting (intro card) -> countdown -> playing -> finished.
 * Sandbox levels skip straight to playing.
 */
export class Game {
  constructor({ level, world, scene, marble, cam, input, hud, hasNext = false }) {
    Object.assign(this, { level, world, scene, marble, cam, input, hud, hasNext });
    this.moveDir = new THREE.Vector3();
    this.frozenCam = new THREE.Vector3();
    this.started = false;
    this.paused = false;
    this.ctx = { marble, cam, game: this };
    this.zoneInside = new Set();
    this.up = new THREE.Vector3(0, 1, 0);
    this.effects = { hype: 0, severance: 0, rollback: 0 };
    marble.onLand = (impact) => {
      if (this.state !== 'waiting') audio.land(impact);
    };

    // A gem is a Vector3, or {pos, reach} for one that needs a bigger pickup radius.
    this.gems = (level.gems ?? []).map((g) => {
      const pos = g.isVector3 ? g : g.pos;
      const mesh = makeGem();
      mesh.position.copy(pos);
      scene.add(mesh);
      return { pos, reach: g.reach ?? GEM_REACH, mesh, taken: false };
    });
    this.pickups = (level.powerups ?? []).map(({ type, pos, down, reach }) => {
      const mesh = makePowerupMesh(type);
      mesh.position.copy(pos);
      if (down) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), down.clone().normalize());
      scene.add(mesh);
      return { type, pos, mesh, cooldown: 0, reach: reach ?? PICKUP_REACH, down: down?.clone().normalize() };
    });
    // The Stealth Mode gem: off the beaten path, not needed to finish.
    if (level.hiddenGem) {
      const mesh = makeGem(true);
      mesh.position.copy(level.hiddenGem);
      scene.add(mesh);
      this.hidden = { pos: level.hiddenGem, mesh, taken: false };
    }

    hud.setLevel(level);
    this.restart();
  }

  /** Full restart: gems back, clock to zero, marble on the start pad. */
  restart() {
    const { level, hud } = this;
    this.time = 0;
    this.simTime = 0;
    this.countdown = 0;
    this.oob = 0;
    this.bannerTime = 0;
    this.warnCooldown = 0;
    this.checkpoint = -1;
    this.collected = 0;
    this.held = null;
    this.drone = 0;
    this.clearEffects();
    this.zoneInside.clear();
    this.setGravity(level.up ?? Y, { snap: true });
    if (this.hidden) {
      this.hidden.taken = false;
      this.hidden.mesh.visible = true;
    }
    for (const g of this.gems) {
      g.taken = false;
      g.mesh.visible = true;
    }
    for (const p of this.pickups) {
      p.cooldown = 0;
      p.mesh.visible = true;
    }
    level.reset?.();
    level.fixedUpdate?.(0, 0, this.ctx); // put moving props in their start poses
    this.marble.reset(level.spawn);
    this.cam.reset(level.spawnYaw, this.up);
    hud.hideEnd();
    hud.setGems(0, this.gems.length);
    hud.setTimer(0);
    hud.setPowerup(null);
    hud.banner('');
    if (level.sandbox) this.state = 'playing';
    else this.state = this.started ? 'countdown' : 'waiting';
    hud.showIntro(this.state === 'waiting');
  }

  /** First click: leave the intro card and start the countdown. */
  begin() {
    if (this.state !== 'waiting') return;
    this.started = true;
    this.state = 'countdown';
    this.hud.showIntro(false);
  }

  /** Turn gravity so it pulls along -up. */
  setGravity(up, { snap = false } = {}) {
    this.up.copy(up).normalize();
    this.marble.up.copy(this.up);
    this.world.gravity = { x: -this.up.x * tuning.gravity, y: -this.up.y * tuning.gravity, z: -this.up.z * tuning.gravity };
    if (!snap) this.cam.setUp(this.up);
  }

  clearEffects() {
    this.effects.hype = this.effects.severance = this.effects.rollback = 0;
    this.marble.setBounce(null);
    this.hud.setEffects?.(this.effects);
  }

  setPaused(paused) {
    if (paused && this.state !== 'countdown' && this.state !== 'playing') return;
    if (this.level.sandbox) return;
    this.paused = paused;
    this.hud.setPaused(paused);
    audio.duck(paused);
  }

  /** Left click: fire the held power-up. */
  use() {
    if (!this.held || this.paused || this.state !== 'playing' || this.oob > 0) return;
    const type = this.held;
    this.held = null;
    this.hud.setPowerup(null);
    const body = this.marble.body;
    const v = body.linvel();
    const up = this.up;
    audio.use(type);
    if (type === 'energy') {
      this.cam.updateBasis();
      const f = this.cam.forward;
      body.setLinvel({ x: v.x + f.x * ENERGY_BOOST, y: v.y + f.y * ENERGY_BOOST, z: v.z + f.z * ENERGY_BOOST }, true);
    } else if (type === 'seriesA') {
      // Replace the speed along "up" with a big launch; keep the rest.
      const along = v.x * up.x + v.y * up.y + v.z * up.z;
      const add = SERIES_A_SPEED - along;
      body.setLinvel({ x: v.x + up.x * add, y: v.y + up.y * add, z: v.z + up.z * add }, true);
    } else if (type === 'drone') {
      this.drone = DRONE_TIME;
    } else if (type === 'hype' || type === 'severance') {
      // Opposites: one cancels the other.
      this.effects.hype = type === 'hype' ? EFFECT_TIME : 0;
      this.effects.severance = type === 'severance' ? EFFECT_TIME : 0;
      this.marble.setBounce(type === 'hype' ? 'bouncy' : 'dead');
    } else if (type === 'rollback') {
      this.effects.rollback = EFFECT_TIME;
    }
    this.showBanner(POWERUPS[type].hint ?? POWERUPS[type].name, 'info', 1.2);
  }

  /** Where the camera should look this frame. */
  cameraTarget() {
    return this.oob > 0 ? this.frozenCam : this.marble.renderPos;
  }

  fixedStep(dt) {
    if (this.paused || this.state === 'waiting') return;
    const { marble, level, hud } = this;

    if (this.bannerTime > 0) {
      this.bannerTime -= dt;
      if (this.bannerTime <= 0) hud.banner('');
    }

    if (this.state === 'countdown') {
      this.countdown += dt;
      const before = this.countdown - dt;
      if (before <= 0) audio.countdown(0);
      else if (before < READY_TIME && this.countdown >= READY_TIME) audio.countdown(1);
      if (this.countdown < READY_TIME) hud.banner('Ready...', 'ready');
      else if (this.countdown < SET_TIME) hud.banner('Set...', 'ready');
      else {
        this.state = 'playing';
        this.showBanner('GO!', 'go', 1);
        audio.countdown(2);
      }
      return;
    }

    const playing = this.state === 'playing';
    if (playing && !level.sandbox && this.effects.rollback <= 0) this.time += dt;

    // Timed power-up effects.
    if (playing) {
      const e = this.effects;
      for (const k of ['hype', 'severance', 'rollback']) {
        if (e[k] > 0) {
          e[k] -= dt;
          if (e[k] <= 0) {
            e[k] = 0;
            if (k !== 'rollback') this.marble.setBounce(null);
          }
        }
      }
      hud.setEffects?.(e);
    }

    // Control. No steering while falling out of bounds or after the finish.
    if (playing && this.oob <= 0) {
      const move = this.input.move();
      this.cam.updateBasis();
      this.moveDir
        .set(0, 0, 0)
        .addScaledVector(this.cam.forward, move.y)
        .addScaledVector(this.cam.right, move.x);
      if (marble.fixedUpdate(dt, this.moveDir, this.input.jump)) audio.jump();
    } else {
      marble.fixedUpdate(dt, this.moveDir.set(0, 0, 0), false);
    }

    // Wind pushes while inside; launch pads fire once on entry.
    for (const zone of level.zones ?? []) {
      const inside = zone.box.containsPoint(marble.currPos);
      if (inside && zone.accel) marble.push(zone.accel, dt);
      if (inside && zone.launch && !this.zoneInside.has(zone) && this.oob <= 0) {
        marble.body.setLinvel(zone.launch, true);
        marble.grounded = false;
        audio.use('seriesA');
      }
      if (inside) this.zoneInside.add(zone);
      else this.zoneInside.delete(zone);
    }

    if (this.drone > 0) {
      this.drone -= dt;
      const up = this.up;
      const lift = tuning.gravity * DRONE_LIFT;
      marble.push({ x: up.x * lift, y: up.y * lift, z: up.z * lift }, dt);
      const v = marble.body.linvel();
      const along = v.x * up.x + v.y * up.y + v.z * up.z;
      if (along < -DRONE_MAX_FALL) {
        const add = -DRONE_MAX_FALL - along;
        marble.body.setLinvel({ x: v.x + up.x * add, y: v.y + up.y * add, z: v.z + up.z * add }, true);
      }
    }

    level.fixedUpdate?.(dt, this.simTime, this.ctx);
    this.simTime += dt;
    this.world.step();
    marble.afterStep();
    if (!playing) return;

    const p = marble.currPos;

    if (this.oob > 0) {
      this.oob -= dt;
      if (this.oob <= 0) this.respawn();
      return;
    }
    const fellUp = this.up.y < 0 && p.y > (level.killTop ?? 40);
    if (p.y < level.killY || fellUp) {
      this.oob = OOB_TIME;
      this.drone = 0;
      this.clearEffects();
      this.frozenCam.copy(p);
      this.showBanner('Out of Bounds', 'ready', OOB_TIME);
      audio.outOfBounds();
      level.onOutOfBounds?.();
      return;
    }

    for (const g of this.gems) {
      if (!g.taken && g.pos.distanceTo(p) < g.reach) {
        g.taken = true;
        g.mesh.visible = false;
        this.collected += 1;
        hud.setGems(this.collected, this.gems.length);
        audio.gem();
      }
    }

    const h = this.hidden;
    if (h && !h.taken && h.pos.distanceTo(p) < GEM_REACH + 0.1) {
      h.taken = true;
      h.mesh.visible = false;
      const first = recordHiddenGem(level.id);
      audio.hiddenGem();
      this.showBanner(first ? 'Stealth Mode gem found!' : 'Stealth Mode gem (already found)', 'info', 2.2);
    }

    for (const pu of this.pickups) {
      if (pu.cooldown > 0) {
        pu.cooldown -= dt;
        if (pu.cooldown <= 0) pu.mesh.visible = true;
        continue;
      }
      // Pivot fires on touch, and only if it would change anything.
      if (pu.type === 'pivot') {
        const newUp = pu.down.clone().negate();
        if (pu.pos.distanceTo(p) < pu.reach && newUp.dot(this.up) < 0.99) {
          this.setGravity(newUp);
          this.drone = 0;
          pu.cooldown = 2;
          pu.mesh.visible = false;
          audio.use('pivot');
          this.showBanner('Pivot!', 'info', 1);
        }
        continue;
      }
      if (!this.held && pu.pos.distanceTo(p) < pu.reach) {
        this.held = pu.type;
        pu.cooldown = PICKUP_RESPAWN;
        pu.mesh.visible = false;
        hud.setPowerup(pu.type);
        audio.pickup();
        this.showBanner(`${POWERUPS[pu.type].name}! Click to use`, 'info', 1.6);
      }
    }

    (level.checkpoints ?? []).forEach((cp, i) => {
      if (i > this.checkpoint && cp.box.containsPoint(p)) {
        this.checkpoint = i;
        this.showBanner('Checkpoint', 'info', 1);
        audio.checkpoint();
      }
    });

    const f = level.finish;
    if (f) {
      this.warnCooldown -= dt;
      const onPad =
        marble.grounded &&
        Math.hypot(p.x - f.pos.x, p.z - f.pos.z) < f.radius &&
        Math.abs(p.y - f.pos.y - tuning.radius) < 0.4;
      if (onPad && this.collected === this.gems.length) this.finish();
      else if (onPad && this.warnCooldown <= 0) {
        this.warnCooldown = 2.5;
        this.showBanner('Collect every gem first!', 'info', 2);
        audio.warn();
      }
    }
  }

  /** Per-frame visuals. */
  render(dt, now) {
    for (const g of this.gems) {
      if (g.taken) continue;
      g.mesh.rotation.y = now * 1.8;
      g.mesh.position.y = g.pos.y + Math.sin(now * 2.4 + g.pos.z) * 0.07;
    }
    for (const pu of this.pickups) {
      const spin = pu.mesh.userData.spin;
      if (spin) spin.rotation.y = now * 2.5;
      else {
        pu.mesh.rotation.y = now * 1.5;
        pu.mesh.position.y = pu.pos.y + Math.sin(now * 2 + pu.pos.x) * 0.08;
      }
    }
    if (this.hidden && !this.hidden.taken) {
      const m = this.hidden.mesh;
      m.rotation.y = now * 2.4;
      m.position.y = this.hidden.pos.y + Math.sin(now * 3) * 0.08;
    }
    audio.roll(this.state === 'waiting' || this.paused ? 0 : this.marble.speed, this.marble.grounded);
    if (!this.paused) this.level.update?.(dt, now);
    this.hud.setTimer(this.time);
  }

  showBanner(text, kind, seconds) {
    this.hud.banner(text, kind);
    this.bannerTime = seconds;
  }

  /** Back to the last checkpoint. The clock keeps running. */
  respawn() {
    const cp = this.checkpoint >= 0 ? this.level.checkpoints[this.checkpoint] : null;
    this.setGravity(cp?.up ?? this.level.up ?? Y, { snap: true });
    this.marble.reset(cp ? cp.spawn : this.level.spawn);
    this.cam.reset(cp ? (cp.yaw ?? 0) : this.level.spawnYaw, this.up);
    this.zoneInside.clear();
    this.oob = 0;
  }

  finish() {
    this.state = 'finished';
    this.drone = 0;
    this.marble.body.setLinearDamping(3); // roll to a stop on the pad
    this.clearEffects();
    this.hud.banner('');
    this.bannerTime = 0;
    audio.finish();
    const result = this.level.sandbox ? {} : recordFinish(this.level.id, this.time);
    this.onFinish?.(result);
    this.hud.showEnd({
      time: this.time,
      par: this.level.par,
      hasNext: this.hasNext,
      final: !!this.level.final,
      ...result,
    });
    document.exitPointerLock?.();
  }
}

/** Pink crystal "data token"; the hidden Stealth Mode gem is dark violet. */
function makeGem(hidden = false) {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.26),
    new THREE.MeshPhongMaterial({
      color: hidden ? 0x6a3bff : 0xff4fb8,
      emissive: hidden ? 0x1a0a55 : 0x7a0a4f,
      specular: 0xffffff,
      shininess: 90,
      flatShading: true,
    }),
  );
  mesh.scale.y = 1.45;
  mesh.castShadow = true;
  return mesh;
}
