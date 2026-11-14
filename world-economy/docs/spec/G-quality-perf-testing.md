# Annex G — Quality settings, performance, testing

Binding for every stage. Stable 60 fps on the reference desktop is a hard requirement. Headless Chromium here renders with SwiftShader (software), so **frame rate is never a pass/fail measure in this container**; budgets are verified by counters and JS timings, and real-GPU numbers come from the perf HUD on the user's machine.

## 1. Targets

| Tier | Reference hardware | Preset | Resolution | Target |
|---|---|---|---|---|
| Mid desktop (primary) | GTX 1060 6 GB / RX 580 / Apple M1 / Arc A380, 4-core CPU | High | 1920×1080 | 60 fps stable |
| High desktop | RTX 3060 / RX 6700 / M2 Pro or better | Ultra | 2560×1440 | 60 fps stable |
| Low / integrated | Intel UHD 620–Iris Xe, 8 GB RAM | Low | 1280×720 internal | ≥ 30 fps, 60 where possible |
| Mid laptop | GTX 1650 / M1 Air | Medium | 1920×1080 at 0.85 scale | 60 fps |

Frame-time requirements on the tier's hardware and preset (measured over 60 s of normal play and during the ring drive):

| Metric | Requirement |
|---|---|
| Mean frame time | ≤ 14.0 ms |
| p95 | ≤ 16.7 ms |
| p99 | ≤ 22 ms |
| Hitches > 33 ms | 0 in steady play; ≤ 1 per minute while streaming at 30 m/s |
| Hitches > 100 ms | 0 after loading (teleports and quality changes are behind a fade and excluded) |
| Startup | Menu interactive ≤ 3 s; world playable ≤ 12 s (High), ≤ 25 s (Low tier) |

## 2. Budgets

### 2.1 Frame-time breakdown (High, 16.6 ms)

| Slice | Budget | Verifiable here |
|---|---|---|
| Input, sim tick, game fixed update (physics, AI, jobs) | 2.5 ms mean, 4 ms max | yes (JS timing) |
| Animation, entity views, culling, LOD selection | 2.0 ms | yes |
| Streaming pump (chunk build, bakes, pooled spawns) | ≤ 3.0 ms, reduced to 1.5 ms when the previous frame exceeded 15 ms | yes |
| Render submission (three.js CPU side) | 3.0 ms | yes (approximate; software GL inflates driver time, so measure with a null-draw mode: `__LOE.perf.cpuOnly(true)` skips `gl.draw*` via scene visibility while still running culling and sorting) |
| UI + audio scheduling | 1.0 ms | yes |
| GPU: shadows 2.5, opaque 4.5, water/transparent 1.5, post 3.0 | 11.5 ms | **no** (counters stand in) |

### 2.2 Hitch and GC rules

| Rule | Detail | Check |
|---|---|---|
| Time-sliced generation | Chunk builds, texture bakes, impostor bakes, interior builds, view pool growth, one-shot audio pre-renders all run through `Streaming.pump` as generators with a per-frame time budget | `perf.sliceOverruns` = number of pump calls exceeding budget by > 2 ms; must be 0 on the ring fly-through |
| One heavy GPU job per frame | At most one texture map bake, one PMREM step, or one shadow-map resize per frame during play | counter |
| Shader prewarm | All material programs compiled at load (`compileAsync`); `renderer.info.programs.length` constant afterwards | `perf.programs` unchanged over a 60 s traverse |
| No per-frame allocation | Hot paths use pooled `Float32Array` scratch, object pools, preallocated arrays; no closures, `map/filter`, spread, or string building per frame in `game/`, `render/` update loops | `perf.allocPerFrame` ≤ 50 KB mean (via `performance.memory.usedJSHeapSize` deltas between GCs in Chromium); lint rule list in `test/unit/hotpath.test.mjs` |
| Geometry upload | New buffers uploaded ≤ 2 MB per frame; larger chunks are split across frames | counter |
| Sim spikes | Hourly business tick spread over the following 10 frames when > 20 businesses; daily close behind the midnight frame budget (split by business) | JS timing max |
| Autosave | Serialisation chunked (per top-level key) across frames; storage write in an idle callback | JS timing max ≤ 4 ms per frame |

### 2.3 Counter budgets (per frame, at any standard viewpoint, steady state)

| Counter | Low | Medium | High | Ultra | S2 blockout (any) |
|---|---|---|---|---|---|
| Draw calls, main pass | 220 | 320 | 450 | 600 | 300 |
| Draw calls, all shadow cascades | 60 | 140 | 280 | 420 | 100 |
| Triangles, main pass | 350k | 700k | 1.2M | 2.0M | 300k |
| Triangles, shadow passes | 80k | 300k | 700k | 1.2M | 150k |
| Shadow-casting batches per cascade | 60 | 80 | 110 | 140 | — |
| Library texture memory (tracked) | 64 MB | 120 MB | 240 MB | 400 MB | 16 MB |
| Total GPU memory estimate (textures + shadow maps + render targets + geometry) | 200 MB | 330 MB | 520 MB | 820 MB | 120 MB |
| Geometry memory | 60 MB | 100 MB | 160 MB | 220 MB | 60 MB |
| Material programs | 40 | 50 | 60 | 60 | 12 |
| Dynamic local lights | 2 | 4 | 8 | 8 | 0 |
| Visible characters (LOD0 / total) | 6 / 20 | 12 / 40 | 20 / 80 | 30 / 120 | — |
| Active traffic vehicles (LOD0 / total) | 2 / 10 | 4 / 20 | 6 / 36 | 8 / 50 | — |
| Particles alive | 500 | 1,500 | 4,000 | 8,000 | — |
| JS heap | 350 MB | 450 MB | 600 MB | 800 MB | 250 MB |

Per-region share of the High main-pass budget (Stage 3 reports actuals against these):

| Region | Draw calls | Triangles | Dominant cost | Main lever |
|---|---|---|---|---|
| City (Old Town, Downtown) | ≤ 450 | ≤ 1.2M | Buildings, props, traffic, crowd | Chunk merging, LOD1 distance, occlusion by blocks |
| Lake | ≤ 380 | ≤ 1.0M | Trees, water reflection pass | Impostor distance, reflection LOD bias |
| Ocean | ≤ 400 | ≤ 1.0M | Boats, ocean grid, palms | Boat LOD, grid resolution |
| Forest | ≤ 350 | ≤ 1.2M | Trees, ground cover | LOD0 tree cap, ground-cover radius, alpha-test overdraw |

Overdraw rule for foliage: alpha-tested (not blended) cards, sorted front to back by batch, ≤ 4 layers average in the forest view (estimated by `perf.foliageFillEstimate` = Σ card screen area ÷ screen area).

## 3. Quality settings (first-class feature)

### 3.1 Schema (`settings`, persisted as `loe.settings`)

```js
settings = {
  graphics: {
    preset: 'auto',            // 'auto'|'low'|'medium'|'high'|'ultra'|'custom'
    adaptive: true,            // governor may lower effects to hold the frame target
    targetFps: 60,             // 30|60|0 (0 = uncapped, governor targets 60)
    resolutionScale: 1.0,      // 0.5..1.0 step 0.05, × min(devicePixelRatio, maxPixelRatio)
    maxPixelRatio: 1.5,        // 1|1.25|1.5|2
    shadows: 'high',           // 'off'|'low'|'medium'|'high'|'ultra'
    shadowDistance: 220,       // metres, 40..400
    ao: 'high',                // 'off'|'low'|'high'
    bloom: true,
    reflections: 'env',        // 'off'|'env'|'planar'|'planar+ssr'
    antialiasing: 'smaa',      // 'off'|'fxaa'|'smaa'|'msaa4'
    godRays: true,
    fogCards: 'on',            // 'off'|'low'|'on'
    postGrade: true,           // colour grade, vignette, grain
    interiorMapping: true,     // fake interiors behind tower glass
    textureSize: 'high',       // 'low'|'medium'|'high'|'ultra'
    anisotropy: 8,             // 1|2|4|8|16
    drawDistance: 1.0,         // 0.6..1.4 multiplier on chunk rings and far clip
    lodBias: 1.0,              // 0.6..1.5 multiplier on LOD switch distances
    vegetationDensity: 1.0,    // 0..1.25
    groundCoverRadius: 60,     // 0..80 m
    crowdDensity: 1.0,         // 0..1.25
    trafficDensity: 1.0,       // 0..1.25
    particles: 'high',         // 'low'|'medium'|'high'|'ultra'
    lightPool: 8,              // 0..8 dynamic local lights
    cameraShake: 1.0, motionReduce: false, fov: 60
  },
  audio: { master: 0.8, music: 0.6, ambience: 0.8, sfx: 0.9, vehicles: 0.8, ui: 0.7,
           voiceLimit: 32, hrtf: true, reverb: true, muteOnBlur: true },
  controls: { bindings: {}, mouseSensitivity: 1.0, invertY: false, toggleSprint: false, holdToReel: true, vibration: true },
  gameplay: { cameraDefault: 'third', units: 'metric', timingLeniency: 'standard', autosave: true, tutorial: true, northUpMinimap: false },
  accessibility: { uiScale: 1.0, cueIcons: true, colourBlindSafe: false, reducedMotion: false },
  debug: { blockout: false, perfHud: false }
}
```

Rules: selecting a preset writes all graphics fields from the table below; editing any graphics field sets `preset: 'custom'`; every field applies at runtime through `Quality.apply(patch)` without reload; `Quality.apply` is idempotent and time-slices expensive changes (texture re-bake, shadow resize) behind an "Applying…" indicator.

### 3.2 What each option changes

| Option | Mechanism |
|---|---|
| `resolutionScale`, `maxPixelRatio` | Internal render size; UI stays at native resolution |
| `shadows`, `shadowDistance` | Cascade count, map size, PCF taps, `maxFar`; `off` enables blob shadows under characters and vehicles |
| `ao` | GTAO pass off / half-res 8 samples / half-res 16 samples with bilateral upsample |
| `bloom`, `godRays`, `postGrade` | Pass toggles |
| `reflections` | `off`: static sky colour; `env`: PMREM environment refreshed over time; `planar`: reflection pass for the nearest water body at 0.5 res; `planar+ssr`: adds SSR for wet roads |
| `antialiasing` | Pass selection; `msaa4` uses a multisampled scene target |
| `textureSize` | Bake sizes (3.3) and atlas sizes; triggers re-bake |
| `drawDistance` | Near/mid chunk radii, far clip, fog start |
| `lodBias` | Multiplies every archetype LOD distance and impostor distance |
| `vegetationDensity`, `groundCoverRadius` | Tree scatter keep-probability (deterministic hash threshold), ground-cover ring |
| `crowdDensity`, `trafficDensity` | Spawn targets and caps |
| `particles` | Max alive, emission multipliers |
| `lightPool` | Number of real local lights |
| `audio.voiceLimit`, `hrtf`, `reverb` | Voice pool size, panning model, convolver bypass |

### 3.3 Presets

| Field | Low | Medium | High | Ultra |
|---|---|---|---|---|
| `resolutionScale` / `maxPixelRatio` | 0.7 / 1 | 0.85 / 1.25 | 1.0 / 1.5 | 1.0 / 2 |
| `shadows` → cascades × size, PCF | `low`: 1 × 1024, hard | `medium`: 2 × 1024, soft 5-tap | `high`: 3 × 2048, soft 9-tap | `ultra`: 4 × 2048, soft 16-tap |
| `shadowDistance` | 60 | 120 | 220 | 350 |
| `ao` | off | low | high | high |
| `bloom` | off | on | on | on |
| `reflections` | off | env | env | planar+ssr |
| `antialiasing` | off | fxaa | smaa | msaa4 |
| `godRays` / `fogCards` | off / off | off / low | on / on | on / on |
| `postGrade` / `interiorMapping` | on (no grain) / off | on / off | on / on | on / on |
| `textureSize` → tier H (albedo, normal / ORM), S, D, atlases | `low`: 512 / 256, 256, 128, 1024 | `medium`: 512 / 512, 512, 256, 1024 | `high`: 1024 / 512, 512, 256, 2048 | `ultra`: 1024 / 1024, 512, 512, 2048 |
| `anisotropy` | 2 | 4 | 8 | 16 |
| `drawDistance` → near / mid chunk radius | 0.7 → 2 / 5 | 0.85 → 3 / 6 | 1.0 → 3 / 8 | 1.25 → 4 / 10 |
| `lodBias` | 0.7 | 0.85 | 1.0 | 1.3 |
| `vegetationDensity` / `groundCoverRadius` | 0.4 / 0 | 0.7 / 40 | 1.0 / 60 | 1.25 / 80 |
| Trees at LOD0 / LOD1 (caps) | 80 / 800 | 160 / 1,500 | 300 / 2,500 | 450 / 4,000 |
| `crowdDensity` / `trafficDensity` | 0.3 / 0.3 | 0.6 / 0.6 | 1.0 / 1.0 | 1.25 / 1.25 |
| `particles` | low | medium | high | ultra |
| `lightPool` | 2 | 4 | 8 | 8 |
| `audio.voiceLimit` / `hrtf` | 16 / off | 24 / on | 32 / on | 48 / on |
| UI backdrop blur | off | on | on | on |

### 3.4 Auto preset
On first launch (and from Settings → "Re-run benchmark"): after the boot set is ready, render a fixed benchmark view (Old Town, High settings at 0.75 scale) for 90 frames, discard the first 30, take the median frame time *t*. Choose: *t* ≤ 7 ms → Ultra; ≤ 12 ms → High; ≤ 20 ms → Medium; else Low. Also read `WEBGL_debug_renderer_info`: a renderer string containing `SwiftShader`, `llvmpipe` or `Software` forces Low with `adaptive` on. `auto` keeps `adaptive: true` and stores the chosen preset as `autoResolved`.

## 4. Governor and optimisation techniques

### 4.1 Adaptive quality governor (`render/governor.js`)
Inputs: frame times over a sliding 120-frame window (mean, p95). Target *T* = 1000 / `targetFps`.

| Condition | Action |
|---|---|
| p95 > 1.08 × *T* for 45 frames | Step **down** one level |
| mean < 0.72 × *T* for 300 frames | Step **up** one level (never above the user's settings) |
| After any step | Cooldown 90 frames |

Step-down ladder (level 0 = user settings; each level adds to the previous):

| Level | Change |
|---|---|
| 1–3 | `resolutionScale` −0.1 each (floor: user value − 0.3, never below 0.5) |
| 4 | God rays off; fog cards low |
| 5 | AO high → low; SSR off |
| 6 | Planar reflection → env |
| 7 | Shadow distance × 0.7; cascades −1 (min 1) |
| 8 | Ground-cover radius × 0.5; vegetation density × 0.75 |
| 9 | Crowd and traffic × 0.7; particles one step down |
| 10 | AO off; bloom off; AA → fxaa |
| 11 | `lodBias` × 0.8; mid chunk radius −2 |

Effects are dropped before frames: the governor acts on p95, not on visible stutter. It never changes saved settings, shows its level in the perf HUD, emits `quality:changed`, and is disabled when `adaptive` is false. It is unit-tested with synthetic frame-time sequences (MASTER_SPEC §9.3, criterion 7).

### 4.2 Mandatory techniques (Stage 3 mandates O1–O12 in MASTER_SPEC §9.3)

| Area | Technique |
|---|---|
| Static geometry | Per chunk, per material: merged `BufferGeometry` (Uint16 indices where possible, quantised normals optional); repeated parts as `InstancedMesh` |
| LOD | 3 levels per archetype + far proxies; hysteresis 10%; cross-fade by dither on High/Ultra |
| Materials | Shared via MatLib; per-instance variation through instance attributes and vertex colours, not new materials |
| Textures | Size caps (3.3); atlases for signage, decals, particles, impostors; LRU eviction to the library budget; mipmaps always |
| Shadows | Caster flag only for LOD0/LOD1 buildings, vehicles, characters within 40 m, trees at LOD0/LOD1; last cascade updates every 2nd frame on Medium and below |
| Culling | 4.4 |
| Animation | Characters and vegetation animated in vertex shader or by instance matrices; no per-vertex CPU work |
| Pools | Entity views, particles, decals, audio voices, pathfinding nodes, math scratch |
| Streaming | Generators with budgets (2.2) |
| Water | Ocean grid ≤ 20k triangles; reflection pass renders LOD-biased (×0.5) scene without shadows, particles, ground cover |
| Post | Half-resolution AO, god rays, bloom chain; one composite shader |
| UI | Event-driven DOM updates; `backdrop-filter` only on ≤ 3 visible surfaces |

### 4.3 Memory tracking (`render/perf.js` `MemTracker`)
three.js reports counts, not bytes, so the project tracks bytes itself: every texture creation goes through `TexBaker`/`canvasTex` and registers `w × h × bytesPerPixel × 1.333`; every render target and shadow map registers its size; every geometry registers its attribute byte lengths. Disposal unregisters. Budgets in 2.3 are compared with these totals.

### 4.4 Culling and occlusion
1. Frustum culling per batch with correct bounds (chunk-level bounds for merged meshes; per-cell bounds for instanced groups split into 50 m cells).
2. Distance culling per archetype (`lod[2]`).
3. City occlusion: each chunk stores a conservative occluder height per side; chunks fully hidden behind nearer taller chunks along the view ray (2D horizon test on the chunk grid, 16 rays) are skipped. Disabled above 40 m camera height.
4. Interiors: while `player:interior` is set, only chunks intersecting the frusta through that interior's door and window portals are drawn at LOD0; others drop to far proxies. From outside, interiors are built only within 40 m and drawn only through their portals.
5. Small-object cull: batches whose bounding sphere projects below 4 px are skipped.

## 5. Instrumentation (`render/perf.js`) and perf HUD

```js
/** @typedef {Object} PerfSnapshot
 * fps, frameMs:{mean,p95,p99,max}, hitches:{over33,over100},
 * cpu:{sim,physics,ai,anim,cull,stream,render,ui,audio},         // ms, rolling mean
 * draw:{calls,shadowCalls,triangles,shadowTriangles,points,lines},
 * mem:{textureBytes,libraryTextureBytes,renderTargetBytes,geometryBytes,jsHeap?,audioBufferBytes},
 * counts:{programs,materials,geometries,textures,chunksNear,chunksMid,entities,characters,vehicles,particles,lights,voices},
 * stream:{queue,sliceOverruns,bakesPending}, allocPerFrame?, foliageFillEstimate,
 * quality:{preset,resolutionScale,governorLevel}, blockoutFallbacks, renderer:string }
 */
```

Counters come from `renderer.info` (reset per frame, summed over all passes with a pass label), `MemTracker`, and `performance.now()` scopes around each system. The **perf HUD** (`F3`, also Settings → Graphics) shows all fields in a compact panel with a 120-frame frame-time graph, budget-coloured values (green within budget, amber within 10%, red over), and a "Copy report" button that puts the snapshot JSON in a text area (for the user to paste back to the team).

## 6. Test plan

`npm test` runs unit + sim (Node); `npm run test:e2e` runs Playwright suites (Chromium headless, `chromium.launch()` without options, pages opened from `file://dist/life.html` and from `http://localhost` for `dist/artifact/`).

| Suite | File | What it checks | Introduced |
|---|---|---|---|
| Unit | `test/unit/*.test.mjs` | Bus, RNG, clock, ledger invariant, save round-trip and migration, import rules, world queries, routes, colliders vs lanes, archetype completeness, construction validation, governor logic, hot-path lint | S2a onward |
| Economy invariants | `test/sim/invariant.sim.mjs` | Σ balances = 0 after every command in a 60-day random-command soak; no negative player or business balance; reports equal ledger totals | S2a (ledger), S4 (full) |
| Economy bots | `test/sim/bots/*.mjs` | Balance targets (Annex D §14) and exploit tests (Annex D §15) | S4 |
| Physics | `test/sim/physics.sim.mjs` | Vehicle and boat handling tests (Annex A §7.3–7.4), ring-route traversal bot | S2 (basic), S4 (full) |
| Job bots | `test/sim/jobs.sim.mjs` | Each of 17 jobs: good bot paid, bad bot fails | S4 |
| Smoke | `test/e2e/smoke.spec.cjs` | Both builds load; `__LOE.ready` resolves; zero console errors and unhandled rejections; new game cash = $100.00; walk, enter vehicle, open phone via input events | S2a |
| Save | `test/e2e/save.spec.cjs` | Slot save/load, code export/import, storage-throws path | S2a, S5 |
| Perf regression | `test/perf/perf.spec.cjs` | For each preset × 16 viewpoints: counters ≤ budgets (2.3) and ≤ `baseline.json` × 1.10; JS slices ≤ 2.1 budgets × 1.5 (container CPU allowance); `sliceOverruns` = 0 and program count constant on the scripted ring fly-through (camera on rails at 30 m/s, sim frozen, `cpuOnly` mode to keep the run under 10 minutes) | S2 (blockout budgets), S3 onward |
| Texture | `test/visual/textures.spec.cjs` | Every `tex.*` bakes; tileable; non-flat; byte totals per preset | S3 |
| Visual capture | `test/visual/shots.cjs` | Screenshot matrix (7.2); non-blank; saved to `test-results/shots/` | S2 onward |
| Audio | `test/audio/audio.spec.cjs` | Annex E §8 | S3, S6 |
| UI | `test/e2e/ui-*.spec.cjs` | Every screen opens at 1440×900 and 1024×768 without overflow; binding test; settings apply; pointer-lock refusal path; keyboard-only navigation | S5 |
| Build | `tools/size-report.mjs` | Size budget table (MASTER_SPEC §3.5); forbidden API grep (`alert(`, `confirm(`, `prompt(`, `eval(`, `new Function`, `AudioWorklet`, `Math.random` in pure layers) | S2a |

What these tests cannot establish, and who covers it: real frame rate and pacing (user, perf HUD); audio quality by ear (user); behaviour in the real artifact frame (orchestrator after publishing: load the artifact once and check the perf HUD report, pointer lock, audio start, save banner).

## 7. Visual QA

### 7.1 Capture method (software GL)
`__LOE.freeze(true)`; `__LOE.setQuality('high')`; set time and weather; `__LOE.camera.set(...)`; `await __LOE.settle(120000)` (streaming idle, bakes done, 3 frames rendered); `page.screenshot()` at 960×540. Run up to 3 pages in parallel. Expected 30–90 s per shot; the full matrix (about 60 shots) fits in roughly 30–45 minutes.

### 7.2 Standard viewpoints (also the perf viewpoints)

| Id | Location and view | Reference |
|---|---|---|
| V01 | Spawn on River St, eye height, looking north to the viaduct and bridge tower | 1 |
| V02 | Old Town, under the viaduct at (−160, 310), looking west to the tower and river | 1 |
| V03 | On the Central Ave footbridge (400, 200), 8 m up, looking south along the boulevard | 2 |
| V04 | Midtown corner near the precinct (190, 100), looking north-east uphill | 3 |
| V05 | Swift Parcel depot yard (470, 800), looking east across the industrial street | — |
| V06 | Harlan Bridge mid-span walkway, looking east to the skyline | 2 |
| V07 | Inside the Old Boathouse looking out to the lake | 4 |
| V08 | Village dock (−790, −1070), looking north-west across the lake to Mt. Sable | 5 |
| V09 | Inlet footbridge, first-person with rod, looking at the red-roof cabin | 6 |
| V10 | Port Calder quay (−880, 1145), 6 m up, looking west over the berths | 7 |
| V11 | Marina boardwalk by the seafood market (−1040, 1135), looking south-west to the lighthouse | 9 |
| V12 | Palm Cove beach (−1650, 1140), low camera at the waterline looking west along the shore | 8 |
| V13 | Old Forest Road (−200, −1150), on the centre line, looking along the road | 10 |
| V14 | Inside forest cabin 1, looking at the fireplace and door | 11 |
| V15 | Timberline Yard (1150, −1300), 10 m up, looking north to the peak | 12 |
| V16 | Logging spur A, eye height, looking up the dirt track toward the sun | 13 |
| H1, H2 | Asset turntables: `veh.moto_cafe` on Old Forest Road at golden hour; `boat.trawler` at the quay | 14, 15 |

Matrix: V01–V16 × {08:00 clear, 18:30 golden hour, 22:00 night}; plus rain at V01, V13; mist at V08, V16; overcast at V15; storm at V10; H1 and H2 once each.

### 7.3 Visual checklist (each row pass/fail per viewpoint)

| # | Check |
|---|---|
| 1 | No untextured, flat-colour or blockout geometry visible; no missing-material magenta or black |
| 2 | Sun shadows present and attached (no peter-panning > 10 cm, no acne); cascade seams not visible |
| 3 | Aerial haze present: far objects lighter and bluer than near ones; no hard far-clip edge |
| 4 | Ground contact: AO or contact darkening under buildings, vehicles, props; nothing floats or sinks |
| 5 | Surfaces show variation: no visible tiling repetition over more than 4 tiles, roughness varies |
| 6 | Skyline and roofs have detail silhouettes (not plain boxes) within 400 m |
| 7 | Water shows reflection, depth colour change at shore, and motion; shoreline has no z-fighting |
| 8 | Vegetation has believable density and LOD transitions are not obvious pops in a still |
| 9 | Night: lamps glow with bloom and lit ground pools; windows lit plausibly; scene not black |
| 10 | Exposure: no large blown-out or crushed regions; interiors readable |
| 11 | Region identity matches Annex A §12 palette and prop vocabulary |
| 12 | Scale reads correctly against the character and vehicles (doors, kerbs, lanes) |
| 13 | No z-fighting, cracks between chunks, holes in terrain, or texture stretching |
| 14 | Reference match: the listed reference's key elements (Annex A §2 "requirements derived") are all present |
| 15 | HUD and UI legible over the scene; no overlap or clipping at 1440×900 and 1024×768 |

## 8. Perf report template (`docs/PERF_REPORT.md`, written by Stage 3, updated by Stages 4–6)

```markdown
# Perf report — <stage tag> — <date>
## 1. Environment
Renderer string: …   (software GL: yes/no)   Build size: life.html … MB
## 2. Startup (JS-side timings; note GL is software here)
| Step | ms | Budget |  (height grid, boot texture set, far proxies, first chunks, shader prewarm, total)
## 3. Counters per viewpoint and preset
| Viewpoint | Preset | Draw calls | Shadow calls | Tris | Shadow tris | Lib tex MB | GPU est MB | Geo MB | Programs | Lights | Budget OK |
(16 viewpoints × 4 presets; worst case per region highlighted)
## 4. Per-region worst case vs budget (High)
| Region | Draw calls | Tris | Tex MB | Dominant batches (top 5 by tris) | Action taken |
## 5. JS frame cost (cpuOnly mode), mean / max ms
| Viewpoint | sim | physics | ai | anim | cull | stream | render submit | ui | audio | total |
## 6. Streaming and hitches (ring fly-through at 30 m/s)
slice overruns: …   max pump ms: …   program count start/end: …   max geometry upload per frame: …   alloc per frame: …
## 7. Texture library
| Tex id | Tier | Size per preset | Bake ms (software) | Bytes | Used by regions |
## 8. LOD and instancing audit
| Archetype | LOD0/1/2 tris | Switch distances | Instanced? | Casts shadow at | Notes |
## 9. Governor test result and preset table as implemented (any deviation from Annex G §3.3 with reason)
## 10. Not verifiable here (needs a real GPU)
Frame time and pacing; GPU memory behaviour; MSAA cost; fill-rate in forest. Requested user check: open dist/life.html, press F3, visit V01, V03, V08, V13 on High, use "Copy report".
## 11. Visual checklist results (Annex G §7.3) with screenshot file names
## 12. Known issues and deferred optimisations
```
