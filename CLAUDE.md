# Silicon Valley marble game

A five-level 3D marble platformer for desktop browsers.

- **Spec:** https://claude.ai/artifact/WSn6Bhq1EXmzfnamc5RVoe (read it before building; follow its build plan one step per session)
- **Concept art:** https://claude.ai/code/artifact/78a2f9c6-4d7a-42ed-98e0-2dc082e0c4da, renders saved in `reference/`. Use it for look (palette, HUD type, materials), not layout code.

## Ground rules

- Stack: three.js, Rapier (`@dimforge/rapier3d-compat`), Vite. No framework.
- Marble feel first. Every feel number lives in `src/tuning.js`; don't hard-code physics constants elsewhere.
- One file per level in `src/levels/`, built with the `LevelBuilder` helpers in `src/levels/builder.js` (each helper adds a mesh and its collider together).
- Physics runs at a fixed 120 Hz step; rendering interpolates. Control code goes in `fixedStep`, never in the render loop.
- +y is up, courses run forward along -z, units are meters. Gravity can turn (Pivot): marble control, ground checks and the camera use `game.up` / `marble.up`, never a hard-coded +y.
- Art target: low-poly, saturated, tiled textures, one sun, hard shadows, no bloom.
- HUD: Luckiest Guy, yellow `#ffe94a` with dark outline `#3a2a00`; one-liners in Bree Serif.

## Build plan status

1. Marble feel on the gray test course: done, signed off by the user.
2. Level 1 end to end: done; playtested (fans weakened, level lengthened, par 1:00).
3. Levels 2–3: built, awaiting playtest.
4. Levels 4–5: built, awaiting playtest, including Level 5's gravity-flip section.
5. Menus and saves: built (title, level select, marble select, options, credits, medals, best times, unlocks).
6. Audio and polish: synthesized SFX and per-level music built. Deployed (see Deploy). Not done: playtest with 5+ players, par/ultra tuning.

All seven power-ups and all five hidden "Stealth Mode" gems are in. Open spec questions still unanswered: Level 4 difficulty options, Level 6.

## Layout

- `src/main.js` routes: no query = menu (`src/menu.js`), `?level=N` = a level. Each switch is a page load.
- `src/game.js` level rules (countdown, clock, gems, hidden gem, power-ups, gravity, wind/launch zones, checkpoints, finish). Level hooks: `fixedUpdate(dt, t, ctx)`, `update`, `reset`, `onOutOfBounds`. Optional level fields: `hiddenGem`, `killTop`, `checkpoints[i].up`, pickup `reach`/`down`.
- `src/save.js` localStorage progress (key `svmarble.save.v1`), level names/pars/ultra times for menus, medals.
- `src/skins.js` the six marble looks; `src/audio.js` Web Audio SFX and music; `src/credits.js` credits text.
- `src/levels/builder.js` solid pieces, `kinematic()` movers, `ribbon()` + `trackFrames()` for smooth curved track.
- `src/levels/props.js` shared low-poly props and path helpers; `textures.js` canvas textures.

## Run

`npm run dev`, then open http://localhost:5173 (title screen), `?level=1`…`?level=5` to jump straight into a level (not gated by unlocks), or `?level=test` (gray test course). Scripted tests write real saves: clear `svmarble.save.v1` afterwards. T toggles the tuning panel. `window.__game` exposes the simulation in dev; Level 5 also exposes `level.track` and `level.debug` for autopilot checks.

## Deploy

Public repo https://github.com/katiegoldstein/silicon-valley-marble. Every push to `main` builds and publishes to GitHub Pages via `.github/workflows/deploy.yml`: https://katiegoldstein.github.io/silicon-valley-marble/. The build's base path is set in `vite.config.js`; `npx vite preview` serves the built copy at http://localhost:4173/silicon-valley-marble/.
