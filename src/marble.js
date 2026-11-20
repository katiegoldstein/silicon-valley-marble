import * as THREE from 'three';
import { tuning } from './tuning.js';
import { makeMarbleLook } from './skins.js';

const MASS = 1;

/**
 * The player marble: a Rapier ball driven by torque (so it really rolls and
 * carries momentum), with a small direct push in the air and a jump that
 * fires off whatever surface it is touching.
 *
 * `up` is the opposite of gravity. It is +y except while a Pivot has turned
 * gravity onto a wall or ceiling; rolling, jumping and "is this ground?" are
 * all measured against it.
 */
export class Marble {
  constructor(RAPIER, world, scene, skin = 'rainbow') {
    this.RAPIER = RAPIER;
    this.world = world;
    this.scene = scene;

    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setCcdEnabled(true).setCanSleep(false),
    );
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.ball(tuning.radius)
        .setMass(MASS)
        // Surface friction scales the marble's; the marble's bounce is a floor.
        .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
        .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max),
      this.body,
    );
    this.bounceOverride = null; // Hype Cycle / Severance Package
    this.applyTuning();

    this.setSkin(skin);

    this.up = new THREE.Vector3(0, 1, 0);
    this.grounded = false;
    this.wasGrounded = false;
    this.landing = 0; // impact speed of the latest landing, for sounds and the jelly wobble
    this.groundNormal = new THREE.Vector3(0, 1, 0);
    this.prevPos = new THREE.Vector3();
    this.currPos = new THREE.Vector3();
    this.prevRot = new THREE.Quaternion();
    this.currRot = new THREE.Quaternion();
    this.renderPos = new THREE.Vector3();
    this.renderRot = new THREE.Quaternion();
    this.lastVel = new THREE.Vector3();
    this.onLand = null; // (impactSpeed) => void
  }

  setSkin(id) {
    if (this.look) this.scene.remove(this.look.root);
    this.look = makeMarbleLook(id, tuning.radius);
    this.mesh = this.look.root;
    this.scene.add(this.mesh);
  }

  /** Push the values the physics engine caches. Call after editing `tuning`. */
  applyTuning() {
    const RAPIER = this.RAPIER;
    this.collider.setFriction(tuning.friction);
    if (this.bounceOverride === 'dead') {
      // Severance Package: no bounce at all, even off bouncy surfaces.
      this.collider.setRestitution(0);
      this.collider.setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Min);
    } else {
      this.collider.setRestitution(this.bounceOverride === 'bouncy' ? 0.92 : tuning.bounce);
      this.collider.setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max);
    }
    this.body.setAngularDamping(tuning.spinDamping);
  }

  setBounce(mode) {
    this.bounceOverride = mode;
    this.applyTuning();
  }

  reset(pos) {
    const zero = { x: 0, y: 0, z: 0 };
    this.body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
    this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.body.setLinvel(zero, true);
    this.body.setAngvel(zero, true);
    this.body.setLinearDamping(0);
    this.grounded = false;
    this.wasGrounded = true; // no landing thud on spawn
    this.lastVel.set(0, 0, 0);
    this.syncFromBody();
    this.prevPos.copy(this.currPos);
    this.prevRot.copy(this.currRot);
  }

  /** Speed across the ground in m/s, for the HUD and sounds. */
  get speed() {
    const v = this.body.linvel();
    const along = v.x * this.up.x + v.y * this.up.y + v.z * this.up.z;
    return Math.sqrt(Math.max(0, v.x * v.x + v.y * v.y + v.z * v.z - along * along));
  }

  /**
   * One physics tick of control, run before world.step().
   * @param {THREE.Vector3} dir desired roll direction on the ground plane, length <= 1
   * @param {boolean} jumpHeld
   * @returns {boolean} true if a jump fired this tick
   */
  fixedUpdate(dt, dir, jumpHeld) {
    this.findGround();
    const r = tuning.radius;
    const strength = dir.length();
    const up = this.up;

    if (strength > 0.001) {
      // Rolling toward `dir` means spinning about up x dir.
      const ax = (up.y * dir.z - up.z * dir.y) / strength;
      const ay = (up.z * dir.x - up.x * dir.z) / strength;
      const az = (up.x * dir.y - up.y * dir.x) / strength;
      const w = this.body.angvel();
      const spin = w.x * ax + w.y * ay + w.z * az;
      if (spin < tuning.maxRollSpeed / r) {
        // Torque that yields `rollAccel` for a solid sphere rolling without slip.
        const inertia = 0.4 * MASS * r * r;
        const torque = (tuning.rollAccel * strength * (inertia + MASS * r * r)) / r;
        this.body.applyTorqueImpulse({ x: ax * torque * dt, y: ay * torque * dt, z: az * torque * dt }, true);
      }
      if (!this.grounded) {
        const push = tuning.airAccel * MASS * dt;
        this.body.applyImpulse({ x: dir.x * push, y: dir.y * push, z: dir.z * push }, true);
      }
    }

    // Holding jump re-fires on every landing, so there is no input to mistime.
    if (jumpHeld && this.grounded) {
      const n = this.groundNormal;
      const v = this.body.linvel();
      const along = v.x * n.x + v.y * n.y + v.z * n.z;
      if (along < tuning.jumpSpeed) {
        const add = tuning.jumpSpeed - along;
        this.body.setLinvel({ x: v.x + n.x * add, y: v.y + n.y * add, z: v.z + n.z * add }, true);
        this.grounded = false;
        this.wasGrounded = false;
        return true;
      }
    }
    return false;
  }

  /** Outside acceleration for one tick (wind, lasers). */
  push(accel, dt) {
    const k = MASS * dt;
    this.body.applyImpulse({ x: accel.x * k, y: accel.y * k, z: accel.z * k }, true);
  }

  /** Call after world.step(). */
  afterStep() {
    this.prevPos.copy(this.currPos);
    this.prevRot.copy(this.currRot);
    this.syncFromBody();

    // Landing: the speed we were falling at just before touching down.
    this.findGround();
    if (this.grounded && !this.wasGrounded) {
      const impact = -this.lastVel.dot(this.up);
      if (impact > 0.8) {
        this.landing = impact;
        this.onLand?.(impact);
      }
    }
    this.wasGrounded = this.grounded;
    const v = this.body.linvel();
    this.lastVel.set(v.x, v.y, v.z);
  }

  /** Blend between the last two physics states so motion is smooth at any frame rate. */
  render(alpha, dt = 0) {
    this.renderPos.lerpVectors(this.prevPos, this.currPos, alpha);
    this.renderRot.slerpQuaternions(this.prevRot, this.currRot, alpha);
    this.mesh.position.copy(this.renderPos);
    this.look.update(dt, {
      speed: this.speed,
      landing: this.landing,
      up: this.up,
      grounded: this.grounded,
      spin: this.renderRot,
    });
    this.landing = 0;
  }

  syncFromBody() {
    const t = this.body.translation();
    const q = this.body.rotation();
    this.currPos.set(t.x, t.y, t.z);
    this.currRot.set(q.x, q.y, q.z, q.w);
  }

  /** Find the most floor-like surface in contact; walls don't count as ground. */
  findGround() {
    let best = 0.2;
    let found = false;
    const up = this.up;
    this.world.contactPairsWith(this.collider, (other) => {
      this.world.contactPair(this.collider, other, (manifold, flipped) => {
        let touching = false;
        for (let i = 0; i < manifold.numContacts(); i++) {
          if (manifold.contactDist(i) < 0.01) touching = true;
        }
        if (!touching) return;
        // The manifold normal points from its first collider to its second;
        // we want it pointing from the surface into the marble.
        const n = manifold.normal();
        const s = flipped ? 1 : -1;
        const along = (n.x * up.x + n.y * up.y + n.z * up.z) * s;
        if (along > best) {
          best = along;
          this.groundNormal.set(n.x * s, n.y * s, n.z * s);
          found = true;
        }
      });
    });
    this.grounded = found;
  }
}
