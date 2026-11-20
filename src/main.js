import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { tuning } from './tuning.js';
import { Input } from './input.js';
import { Marble } from './marble.js';
import { OrbitCamera } from './camera.js';
import { Hud } from './hud.js';
import { Game } from './game.js';
import { createSky } from './sky.js';
import { LevelBuilder } from './levels/builder.js';
import { buildDataCenter } from './levels/dataCenter.js';
import { buildOpenPlan } from './levels/openPlan.js';
import { buildMissionStreet } from './levels/missionStreet.js';
import { buildHackerHouse } from './levels/hackerHouse.js';
import { buildPostAsi } from './levels/postAsi.js';
import { buildTestCourse } from './levels/testCourse.js';
import { createTuningPanel } from './tuningPanel.js';
import { runMenu } from './menu.js';
import { audio } from './audio.js';
import { save } from './save.js';
import { SKINS } from './skins.js';

const STEP = 1 / 120; // physics tick; rendering interpolates between ticks

// No query: the title screen. ?level=2 etc. plays a level; ?level=test opens
// the gray feel-test course.
const LEVELS = {
  1: buildDataCenter,
  2: buildOpenPlan,
  3: buildMissionStreet,
  4: buildHackerHouse,
  5: buildPostAsi,
  test: buildTestCourse,
};
const ORDER = ['1', '2', '3', '4', '5'];
const requested = new URLSearchParams(location.search).get('level');

await RAPIER.init();
// Signs are drawn to canvas textures, so the display fonts must be ready first.
await Promise.race([
  Promise.all([document.fonts.load('48px "Luckiest Guy"'), document.fonts.load('48px "Bree Serif"')]),
  new Promise((resolve) => setTimeout(resolve, 1500)),
]).catch(() => {});

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('loading').hidden = true;

// Saved options feed the tuning values the camera reads.
tuning.mouseSens = save.options.mouseSens;
tuning.invertY = save.options.invertY;

if (LEVELS[requested]) playLevel(requested);
else runMenu({ RAPIER, renderer, canvas });

function playLevel(levelId) {
  const buildLevel = LEVELS[levelId];
  const nextId = ORDER[ORDER.indexOf(levelId) + 1] ?? null;
  const scene = new THREE.Scene();
  const world = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
  world.timestep = STEP;

  const level = buildLevel(new LevelBuilder(RAPIER, world, scene));
  const sky = createSky(scene, level.sky ?? 'day');
  const skin = SKINS.some((s) => s.id === save.marble) ? save.marble : 'rainbow';
  const marble = new Marble(RAPIER, world, scene, skin);
  const cam = new OrbitCamera(RAPIER, world, marble.collider);
  const input = new Input(canvas);
  const hud = new Hud();
  const game = new Game({ level, world, scene, marble, cam, input, hud, hasNext: !!nextId });
  input.onUse = () => game.use();
  hud.onNext = () => {
    location.search = `?level=${nextId}`;
  };
  hud.onMenu = () => {
    location.href = location.pathname;
  };
  // The first click or key unlocks audio (a browser rule), then the level's music starts.
  const startAudio = () => {
    audio.unlock();
    audio.playMusic(level.sandbox ? 'menu' : levelId);
  };
  window.addEventListener('pointerdown', startAudio);
  window.addEventListener('keydown', startAudio);

  // Tuning panel: open on the test course, otherwise hidden behind T.
  const panel = createTuningPanel({ world, marble });
  if (!level.sandbox) panel.hide();
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyT' || e.repeat || e.target instanceof HTMLInputElement) return;
    panel.show(panel._hidden);
    document.body.classList.toggle('tuning', !panel._hidden);
  });

  input.onRestart = () => game.restart();
  canvas.addEventListener('click', () => game.begin());
  // Esc releases the mouse, which pauses; clicking back in resumes.
  input.onLockChange = (locked) => game.setPaused(!locked);
  hud.onRetry = () => {
    game.restart();
    canvas.requestPointerLock?.();
  };

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    cam.resize(window.innerWidth / window.innerHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  let acc = 0;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    acc += dt;

    const mouse = input.consumeMouse();
    if (!game.paused) cam.look(mouse.x, mouse.y);

    while (acc >= STEP) {
      game.fixedStep(STEP);
      acc -= STEP;
    }

    marble.render(acc / STEP, dt);
    game.render(dt, now / 1000);
    cam.update(game.cameraTarget(), dt);
    marble.look.captureEnv(renderer, scene);
    sky.follow(cam.camera.position, marble.renderPos);
    hud.setSpeed(marble.speed);
    renderer.render(scene, cam.camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Dev-only handle for poking at the simulation from the console.
  if (import.meta.env.DEV) {
    window.__game = {
      tuning,
      game,
      marble,
      cam,
      input,
      world,
      level,
      /** Run the simulation forward without waiting for frames. */
      advance(seconds) {
        for (let i = 0; i < Math.round(seconds / STEP); i++) game.fixedStep(STEP);
      },
    };
  }
}
