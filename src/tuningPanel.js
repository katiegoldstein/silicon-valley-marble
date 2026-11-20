import GUI from 'lil-gui';
import { tuning, DEFAULTS } from './tuning.js';

/** Live sliders for the feel pass. T toggles it; Esc frees the mouse to use it. */
export function createTuningPanel({ world, marble }) {
  const gui = new GUI({ title: 'Marble feel' });
  const apply = () => {
    const g = tuning.gravity;
    world.gravity = { x: -marble.up.x * g, y: -marble.up.y * g, z: -marble.up.z * g };
    marble.applyTuning();
  };

  const m = gui.addFolder('Marble');
  m.add(tuning, 'rollAccel', 2, 30, 0.5).name('roll accel (m/s²)');
  m.add(tuning, 'maxRollSpeed', 4, 30, 0.5).name('top speed (m/s)');
  m.add(tuning, 'airAccel', 0, 15, 0.25).name('air control (m/s²)');
  m.add(tuning, 'jumpSpeed', 3, 14, 0.25).name('jump speed (m/s)');
  m.add(tuning, 'gravity', 8, 40, 0.5).name('gravity (m/s²)').onChange(apply);
  m.add(tuning, 'friction', 0.1, 2, 0.05).onChange(apply);
  m.add(tuning, 'bounce', 0, 0.95, 0.05).onChange(apply);
  m.add(tuning, 'spinDamping', 0, 1, 0.01).name('spin damping').onChange(apply);

  const c = gui.addFolder('Camera');
  c.add(tuning, 'camDistance', 1, 6, 0.1).name('distance');
  c.add(tuning, 'camLift', 0, 1, 0.05).name('look-at height');
  c.add(tuning, 'fov', 50, 100, 1);
  c.add(tuning, 'mouseSens', 0.0005, 0.008, 0.0001).name('mouse sensitivity');
  c.add(tuning, 'invertY').name('invert Y');

  const actions = {
    copy() {
      navigator.clipboard?.writeText(JSON.stringify(tuning, null, 2));
    },
    reset() {
      Object.assign(tuning, DEFAULTS);
      apply();
      gui.controllersRecursive().forEach((ctl) => ctl.updateDisplay());
    },
  };
  gui.add(actions, 'copy').name('Copy values');
  gui.add(actions, 'reset').name('Reset to defaults');
  return gui;
}
