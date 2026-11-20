import * as THREE from 'three';
import { createSky } from './sky.js';
import { tuning } from './tuning.js';
import { audio } from './audio.js';
import { SKINS, makeMarbleLook } from './skins.js';
import { CREDITS } from './credits.js';
import { formatTime, formatPar } from './hud.js';
import {
  save,
  persist,
  LEVEL_IDS,
  LEVEL_INFO,
  MEDAL_NAMES,
  medalFor,
  hiddenCount,
  isUnlocked,
  nextLevelToPlay,
} from './save.js';
import { LevelBuilder } from './levels/builder.js';
import { brickTexture, menuTileTexture, rainbowTexture } from './levels/textures.js';
import { blimp, deskVisual, monitor, rollingChair, robotaxi, rowHouse, serverRack, tree } from './levels/props.js';

const $ = (id) => document.getElementById(id);

// Two camera poses: the title vignette, and the row of pedestals.
const POSES = {
  title: { pos: new THREE.Vector3(-0.3, 1.0, -6.2), look: new THREE.Vector3(0.3, 1.25, -14) },
  marbles: { pos: new THREE.Vector3(0, 1.15, -2.3), look: new THREE.Vector3(0, 0.12, -6.5) },
};

/** Title screen, level select, marble select, options and credits. */
export function runMenu({ RAPIER, renderer, canvas }) {
  document.body.classList.add('in-menu');
  $('menu').hidden = false;

  const scene = new THREE.Scene();
  const world = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
  const b = new LevelBuilder(RAPIER, world, scene);
  const sky = createSky(scene, 'day');
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 1200);

  buildStage(b);

  // Title marble on its pad, in the chosen skin.
  b.pad({ x: 1.0, y: 0, z: -9.4 }, [[0.75, 0x2fd45a], [0.58, 0xffe94a], [0.4, 0x2f6bff]]);
  let titleLook = null;
  const titleSpin = new THREE.Quaternion();
  function setTitleMarble(id) {
    if (titleLook) scene.remove(titleLook.root);
    titleLook = makeMarbleLook(id, 0.32);
    titleLook.root.position.set(1.0, 0.32 + 0.09, -9.4);
    scene.add(titleLook.root);
  }
  setTitleMarble(save.marble);

  // Six pedestals.
  const pedestals = SKINS.map((skin, i) => {
    const x = (i - 2.5) * 0.85;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.14, 32), b.flat(0xf2c12e));
    base.position.set(x, 0.07, -6.5);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.1, 32), b.flat(0x2fd45a));
    top.position.set(x, 0.19, -6.5);
    base.castShadow = top.castShadow = true;
    base.receiveShadow = top.receiveShadow = true;
    scene.add(base, top);
    const look = makeMarbleLook(skin.id, 0.2);
    look.root.position.set(x, 0.44, -6.5);
    scene.add(look.root);
    look.spinner.userData.skin = skin.id;
    return { skin, look, x, spin: new THREE.Quaternion(), hop: 0 };
  });

  // ---------- Screens ----------
  let screen = 'title';
  let pose = 'title';
  let selected = Math.max(0, SKINS.findIndex((s) => s.id === save.marble));
  let targetLevel = '1';
  let marblesFrom = 'title';

  function show(id) {
    screen = id;
    for (const el of document.querySelectorAll('#menu .screen')) el.hidden = el.id !== `screen-${id}`;
    pose = id === 'marbles' ? 'marbles' : 'title';
    if (id === 'title') renderTitle();
    if (id === 'levels') renderLevels();
    if (id === 'marbles') renderMarbles();
    if (id === 'options') renderOptions();
  }

  const goldUnlocked = () => hiddenCount() >= 5;

  function renderTitle() {
    const done = LEVEL_IDS.filter((id) => save.best[id] != null).length;
    $('title-progress').textContent = done
      ? `${done}/5 levels cleared · ${hiddenCount()}/5 Stealth Mode gems`
      : 'Roll from the data center to the post-ASI future.';
  }

  function renderLevels() {
    $('level-grid').innerHTML = LEVEL_IDS.map((id) => {
      const info = LEVEL_INFO[id];
      const open = isUnlocked(id);
      const best = save.best[id];
      const medal = medalFor(id, best);
      return `
        <button type="button" class="level-card ${open ? '' : 'locked'}" data-level="${id}" ${open ? '' : 'disabled'}>
          <span class="lc-num">${id}</span>
          <span class="lc-name">${info.name}</span>
          <span class="lc-tag">${open ? info.tagline : 'Locked: beat the level before'}</span>
          <span class="lc-row"><span>Par</span><b>${formatPar(info.par)}</b></span>
          <span class="lc-row"><span>Best</span><b>${best != null ? formatTime(best) : '—'}</b></span>
          <span class="lc-foot">
            ${medal ? `<span class="medal ${medal}">${MEDAL_NAMES[medal]}</span>` : '<span></span>'}
            <span class="stealth ${save.hidden[id] ? 'found' : ''}" title="Stealth Mode gem ${save.hidden[id] ? 'found' : 'not found'}"></span>
          </span>
        </button>`;
    }).join('');
    $('levels-foot').textContent = `Stealth Mode gems: ${hiddenCount()}/5. Each level hides one. Find all five to unlock the Gold marble.`;
  }

  function renderMarbles() {
    const skin = SKINS[selected];
    const locked = skin.id === 'gold' && !goldUnlocked();
    $('marble-name').textContent = skin.name;
    $('marble-desc').textContent = locked ? `${skin.locked} (${hiddenCount()}/5 found)` : skin.desc;
    $('roll').disabled = locked;
    $('marble-level').textContent = `Level ${targetLevel}: ${LEVEL_INFO[targetLevel].name}`;
  }

  function renderOptions() {
    const o = save.options;
    $('opt-music').value = o.music;
    $('opt-sound').value = o.sound;
    $('opt-sens').value = o.mouseSens;
    $('opt-invert').checked = o.invertY;
    $('opt-reset-confirm').hidden = true;
  }

  function pick(i) {
    selected = (i + SKINS.length) % SKINS.length;
    pedestals[selected].hop = 1;
    const skin = SKINS[selected];
    if (skin.id !== 'gold' || goldUnlocked()) {
      save.marble = skin.id;
      persist();
      setTitleMarble(skin.id);
    }
    renderMarbles();
  }

  function startLevel(id) {
    location.search = `?level=${id}`;
  }

  $('menu').addEventListener('click', (e) => {
    audio.unlock();
    audio.playMusic('menu');
    const btn = e.target.closest('button');
    if (!btn) return;
    audio.click();
    const go = btn.dataset.go;
    if (go === 'play') {
      targetLevel = nextLevelToPlay();
      marblesFrom = 'title';
      show('marbles');
    } else if (go === 'back-from-marbles') {
      show(marblesFrom);
    } else if (go) {
      show(go);
    } else if (btn.dataset.level) {
      targetLevel = btn.dataset.level;
      marblesFrom = 'levels';
      show('marbles');
    }
  });
  $('marble-prev').addEventListener('click', () => pick(selected - 1));
  $('marble-next').addEventListener('click', () => pick(selected + 1));
  $('roll').addEventListener('click', () => {
    if (!$('roll').disabled) startLevel(targetLevel);
  });

  // Options apply live.
  const opt = (id, key, read) =>
    $(id).addEventListener('input', () => {
      save.options[key] = read($(id));
      persist();
      audio.applyVolumes();
    });
  opt('opt-music', 'music', (el) => Number(el.value));
  opt('opt-sound', 'sound', (el) => Number(el.value));
  opt('opt-sens', 'mouseSens', (el) => Number(el.value));
  opt('opt-invert', 'invertY', (el) => el.checked);
  $('opt-sound').addEventListener('change', () => audio.gem());
  $('opt-reset').addEventListener('click', () => ($('opt-reset-confirm').hidden = false));
  $('opt-reset-no').addEventListener('click', () => ($('opt-reset-confirm').hidden = true));
  $('opt-reset-yes').addEventListener('click', () => {
    save.unlocked = 1;
    save.best = {};
    save.hidden = {};
    if (save.marble === 'gold') save.marble = 'rainbow';
    persist();
    setTitleMarble(save.marble);
    selected = Math.max(0, SKINS.findIndex((s) => s.id === save.marble));
    renderOptions();
  });

  $('credits-text').innerHTML = CREDITS;

  // Click a marble in the 3D view to pick it.
  const ray = new THREE.Raycaster();
  canvas.addEventListener('click', (e) => {
    audio.unlock();
    audio.playMusic('menu');
    if (screen !== 'marbles') return;
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pedestals.map((p) => p.look.spinner), false)[0];
    if (hit) {
      audio.click();
      pick(pedestals.findIndex((p) => p.look.spinner === hit.object));
    }
  });
  window.addEventListener('keydown', (e) => {
    audio.unlock();
    audio.playMusic('menu');
    if (screen === 'marbles') {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') pick(selected - 1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') pick(selected + 1);
      if ((e.code === 'Enter' || e.code === 'Space') && !$('roll').disabled) startLevel(targetLevel);
    }
    if (e.code === 'Escape' && screen !== 'title') show('title');
  });

  // ---------- Loop ----------
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    // Keep all six pedestals in frame on narrow windows.
    camera.fov = camera.aspect < 1.75 ? 40 * (1.75 / camera.aspect) ** 0.9 : 40;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const camPos = POSES.title.pos.clone();
  const camLook = POSES.title.look.clone();
  const axis = new THREE.Vector3();
  const dq = new THREE.Quaternion();
  let last = performance.now();
  show('title');

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const t = now / 1000;
    const p = POSES[pose];
    const k = 1 - Math.exp(-dt * 4);
    camPos.lerp(p.pos, k);
    camLook.lerp(p.look, k);
    // A slow drift on the title so the scene feels alive.
    const sway = pose === 'title' ? Math.sin(t * 0.3) * 0.12 : 0;
    camera.position.set(camPos.x + sway, camPos.y, camPos.z);
    camera.lookAt(camLook);

    // Marbles turn slowly; the chosen one turns faster and hops.
    titleSpin.multiply(dq.setFromAxisAngle(axis.set(1, 0, 0.3).normalize(), dt * 0.8));
    titleLook.update(dt, { speed: 4, spin: titleSpin });
    titleLook.root.position.y = 0.41 + Math.abs(Math.sin(t * 1.6)) * 0.05;
    titleLook.captureEnv(renderer, scene);
    pedestals.forEach((pd, i) => {
      const chosen = i === selected;
      pd.spin.multiply(dq.setFromAxisAngle(axis.set(0, 1, 0), dt * (chosen ? 2.2 : 0.4)));
      pd.hop = Math.max(0, pd.hop - dt * 1.6);
      const hop = chosen ? Math.sin((1 - pd.hop) * Math.PI) * 0.18 * pd.hop + Math.abs(Math.sin(t * 3)) * 0.04 : 0;
      pd.look.root.position.y = 0.44 + hop;
      pd.look.update(dt, { speed: chosen ? 8 : 1, spin: pd.spin, landing: pd.hop > 0.95 ? 3 : 0 });
      if (pose === 'marbles') pd.look.captureEnv(renderer, scene);
      const lockedGold = pd.skin.id === 'gold' && !goldUnlocked();
      pd.look.root.traverse((o) => {
        if (o.material && 'color' in o.material && o.userData.baseColor == null) o.userData.baseColor = o.material.color.getHex();
        if (o.material?.color) o.material.color.setHex(lockedGold ? 0x4a4a4a : o.userData.baseColor);
      });
    });

    sky.follow(camera.position, new THREE.Vector3(0, 0, -9));
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/** The title-screen set: a tiled platform with a sampler of every level. */
function buildStage(b) {
  const tile = new THREE.MeshLambertMaterial({ map: menuTileTexture() });
  const brick = new THREE.MeshLambertMaterial({ map: brickTexture() });
  // Platform: blue tiles on top, cream bricks on the front face.
  const platform = new THREE.Mesh(
    (() => {
      const g = new THREE.BoxGeometry(40, 0.9, 40);
      const uv = g.attributes.uv;
      // Faces: +x, -x, +y, -y, +z, -z (4 vertices each). 1 m tiles on top; one row pair of bricks on the sides.
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 20, uv.getY(i) * (i >= 8 && i < 16 ? 20 : 1));
      return g;
    })(),
    [brick, brick, tile, tile, brick, brick],
  );
  platform.position.set(0, -0.45, -25.2);
  platform.receiveShadow = true;
  b.scene.add(platform);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), b.flat(0x5fc24a));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.9;
  grass.receiveShadow = true;
  b.scene.add(grass);

  // Data center: three racks.
  for (let i = 0; i < 3; i++) {
    const r = serverRack();
    r.position.set(-4.2 + i * 0.82, 0, -16.5);
    r.rotation.y = Math.PI;
    shadowed(r);
    b.scene.add(r);
  }
  // Open plan: a desk, a monitor and an orange chair.
  const desk = deskVisual(1.4, 0.75, 0.7);
  desk.position.set(-7.6, 0, -15.2);
  const mon = monitor(3);
  mon.position.set(-7.6, 0.75, -15.35);
  const chair = rollingChair();
  chair.position.set(-7.2, 0, -14.4);
  chair.rotation.y = 0.6;
  for (const o of [desk, mon, chair]) {
    shadowed(o);
    b.scene.add(o);
  }
  // Mission Street: a pink house, a FAKEMO and a tree.
  const house = rowHouse(3.4, 4.6, 3, 0xf2a2c0, 0xffffff, 0xb0457a);
  house.position.set(7.2, 0, -21);
  house.rotation.y = -0.35;
  const taxi = robotaxi();
  taxi.position.set(4.6, 0, -16.8);
  taxi.rotation.y = -1.9;
  const t = tree(0.9);
  t.position.set(-10, 0, -22);
  for (const o of [house, taxi, t]) {
    shadowed(o);
    b.scene.add(o);
  }
  // The blimp, and a rainbow over everything.
  const bl = blimp('MONACO');
  bl.scale.setScalar(0.32);
  bl.position.set(9, 9.5, -32);
  bl.rotation.y = Math.PI / 2 - 0.2;
  b.scene.add(bl);
  const rb = rainbowTexture();
  rb.rotation = Math.PI / 2;
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(11, 0.32, 8, 80, Math.PI),
    new THREE.MeshBasicMaterial({ map: rb, transparent: true, opacity: 0.9 }),
  );
  arc.scale.z = 0.25;
  arc.position.set(0, -1.5, -30);
  b.scene.add(arc);

  // Two data-token gems.
  for (const [x, z] of [[-1.7, -10.4], [-0.6, -11.6]]) {
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.26),
      new THREE.MeshPhongMaterial({ color: 0xff4fb8, emissive: 0x7a0a4f, specular: 0xffffff, shininess: 90, flatShading: true }),
    );
    gem.scale.y = 1.45;
    gem.position.set(x, 0.5, z);
    gem.rotation.y = x;
    gem.castShadow = true;
    b.scene.add(gem);
  }
}

function shadowed(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}
