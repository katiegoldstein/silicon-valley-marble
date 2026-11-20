import * as THREE from 'three';
import { tuning } from './tuning.js';

const PITCH_MIN = -0.35;
const PITCH_MAX = 1.45;
const START_PITCH = 0.38;
const TURN_RATE = 7; // how fast the view swings round after gravity changes

const Y = new THREE.Vector3(0, 1, 0);

/**
 * Mouse-orbit chase camera. It is locked rigidly to the marble (no lag), so
 * what you feel is the marble's motion rather than the camera's.
 * yaw = 0 sits behind the marble on +z, looking down -z.
 *
 * Yaw and pitch are measured in a "gravity frame": normally the world, but
 * when a Pivot turns gravity the frame rotates with it (smoothly on screen),
 * so the floor is always down and WASD keeps meaning what you see.
 */
export class OrbitCamera {
  constructor(RAPIER, world, excludeCollider) {
    this.RAPIER = RAPIER;
    this.world = world;
    this.exclude = excludeCollider;
    this.camera = new THREE.PerspectiveCamera(tuning.fov, 1, 0.05, 1200);
    this.yaw = 0;
    this.pitch = START_PITCH;
    this.target = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, -1);
    this.right = new THREE.Vector3(1, 0, 0);
    this.frame = new THREE.Quaternion();
    this.frameTarget = new THREE.Quaternion();
    this.up = new THREE.Vector3(0, 1, 0);
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
  }

  reset(yaw = 0, up = Y) {
    this.yaw = yaw;
    this.pitch = START_PITCH;
    this.frameTarget.setFromUnitVectors(Y, up);
    if (up.y < -0.99) this.frameTarget.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
    this.frame.copy(this.frameTarget);
  }

  /** Gravity changed: swing the view so `up` is up, keeping the heading. */
  setUp(up) {
    const oldUp = this._v.copy(Y).applyQuaternion(this.frameTarget);
    if (oldUp.dot(up) < -0.99) {
      // Straight flip: roll about the direction we're facing, so forward stays forward.
      this.updateBasis(this.frameTarget);
      this._q.setFromAxisAngle(this.forward, Math.PI);
    } else {
      this._q.setFromUnitVectors(oldUp, up);
    }
    this.frameTarget.premultiply(this._q).normalize();
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  look(dx, dy) {
    this.yaw -= dx * tuning.mouseSens;
    this.pitch += dy * tuning.mouseSens * (tuning.invertY ? -1 : 1);
    this.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this.pitch));
  }

  /** Ground-plane basis that "forward" and "right" on the keys map onto. */
  updateBasis(frame = this.frame) {
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).applyQuaternion(frame);
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).applyQuaternion(frame);
  }

  update(marblePos, dt = 1 / 60) {
    if (this.camera.fov !== tuning.fov) {
      this.camera.fov = tuning.fov;
      this.camera.updateProjectionMatrix();
    }
    this.frame.slerp(this.frameTarget, 1 - Math.exp(-dt * TURN_RATE));
    this.up.copy(Y).applyQuaternion(this.frame);
    this.updateBasis();
    this.target.copy(marblePos).addScaledVector(this.up, tuning.camLift);

    const cp = Math.cos(this.pitch);
    const dir = this._v
      .set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp)
      .applyQuaternion(this.frame);

    // Pull the camera in when level geometry is between it and the marble.
    // Moving props (people, cars, robots) and the marble itself are ignored.
    let dist = tuning.camDistance;
    const ray = new this.RAPIER.Ray(this.target, dir);
    const flags = this.RAPIER.QueryFilterFlags;
    const hit = this.world.castRay(
      ray,
      dist + 0.2,
      true,
      flags.EXCLUDE_KINEMATIC | flags.EXCLUDE_DYNAMIC,
      undefined,
      this.exclude,
    );
    if (hit) {
      const toi = hit.timeOfImpact ?? hit.toi;
      dist = Math.max(0.35, Math.min(dist, toi - 0.2));
    }

    this.camera.position.copy(this.target).addScaledVector(dir, dist);
    this.camera.up.copy(this.up);
    this.camera.lookAt(this.target);
  }
}
