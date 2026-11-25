# Asset pack builder rules (read fully before writing code)

The user's verdict on episode 6: "the storyline is good, but the renders suck. Backgrounds are empty, there are glitches, you can't see the clouds, nothing moves. There must always be action, constant movement, and something in the background that shows the size comparison." These packs exist to fix that for every future episode.

## Look
- Rounded toy look of the series (see `../screenshots/` and `../INDEX.md`): chunky, readable silhouettes, saturated but not neon colours, soft bevels (`rbox`), warm key light. Characters are ~2 m tall (`makeCharacter`, feet at y=0, facing +Z).
- **Detail = geometry, never textures** (user rule). No image maps, bump or normal maps, no procedural surface patterns. `canvasTex`/`textBoard` only for readable text on signs/screens. Vertex colours and per-instance colours are fine.
- **Dense, never empty.** A set must read as a lived-in place from any angle: layered foreground / midground / background, props at three scales, no bare floors (use `props/nature.js groundCover` outdoors), skyline or horizon dressing in every exterior.
- Lighting-friendly: use `mat()` / `glow()` from `../util.js` (cached materials), `castShadow` on hero-scale props only.

## Code
- Plain ES modules on three.js 0.170.0: `import * as THREE from 'three'`; helpers from `../util.js` (`rng, mat, glow, add, sph, box, cyl, cone, tor, rbox, shade, canvasTex, textBoard, clamp, lerp, smooth`), `../character.js`, `../animal.js`, existing props/sets. Reuse before rebuilding.
- **Deterministic:** seeded `rng(seed)` only. No `Math.random`, `Date.now`, `performance.now`. Animation is a pure function of time: export `update(t)` (or put `obj.userData.update = (t) => {…}`) computed in closed form from `t`. Never accumulate state between frames.
- **Real scale in metres.** Every landmark / building / vehicle / planet records its real size: `obj.userData.realHeightM` (and `realWidthM` where useful) and is modelled at 1 unit = 1 m (planets may use a documented scale factor). This powers size-comparison shots.
- **Constant motion built in:** anything that would move in life moves in `update(t)`: windows flicker, flags wave, traffic flows, propellers spin, birds flap, clouds drift, water ripples (geometry/vertex displacement), smoke rises, crowds bob, planets rotate, asteroid fields tumble.
- **Performance** (software GL, ~0.4 s per 1080x1920 frame budget for a whole scene): `InstancedMesh` for anything repeated more than ~20 times; keep per-asset triangle counts sane (a whole city block < ~150k tris); provide a `lod`/`detail` option ('high' | 'low') for far use; merge static geometry where easy.
- No clipping, no z-fighting (offset coplanar decals by ≥ 0.005 m), no floating props, no holes in silhouettes, no inside-out faces. Check every screenshot for these.

## Files you own (and only these)
- Your module files: `../props/<pack>_*.js`, `../sets/<pack>_*.js`, `../fx/<pack>_*.js` (names given in your task).
- `../registry/<pack>.js` — export `ITEMS` (same item shape as `../registry.js`: `{ id, cat, title, note, stage?, build }`, `build()` returns an Object3D or `{ obj, cam: { pos, target, fov }, update? }`). Ids start with your pack name: `<pack>_…`.
- `../index/<pack>.md` — the INDEX section for your pack: one table row per asset (function, options, real size, what animates, screenshot id).
- Screenshots: `../screenshots/<id>.jpg` for every item you register.
Do NOT edit `../registry.js`, `../INDEX.md`, other packs' files, episode folders, or anything outside the library. Do not run git (the planner commits).

## Screenshots and self-review
```
export LIB_DEPS=/tmp/claude-0/-home-user-Noels-Projects/0384acf5-c825-52ee-95cb-d15076c437cc/scratchpad/ws   # three + fonts live here
cd /home/user/Noels-Projects/series-animation-guide/assets/library
flock /tmp/claude-0/-home-user-Noels-Projects/0384acf5-c825-52ee-95cb-d15076c437cc/scratchpad/shoot.lock env NODE_PATH=$(npm root -g) node tools/shoot.mjs screenshots '^<pack>_' 900 1200
# ALWAYS through flock: six builders share one memory limit, so screenshot runs are queued one at a time. Shoot only the ids you changed
# (e.g. '^<pack>_city_block$') to keep the queue short. Never start a browser any other way.
```
Then LOOK at every screenshot with the image reader and fix what fails before moving on: empty areas, flat boxes, glitches, z-fighting, wrong scale, things that read as nothing. Iterate until each asset reads in under a second. A loader error in your registry file only disables your pack (the console prints `pack failed to load: <pack>`): check the shoot output for it.

## Deliverable
Aim for **30-40 distinct, high-quality assets** (an "asset" = one exported builder; variants via options count once, but list them). Quality over count: each must be visibly detailed and animated where it makes sense. Finish with a short report: files, asset list, what animates, known limits.
