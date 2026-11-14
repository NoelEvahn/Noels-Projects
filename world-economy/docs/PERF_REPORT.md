# Perf report — Stage 3A (audio, quality, governor, perf HUD) — 2026-11-14

Stage 3 is split in two. This file was created by **3A** from the Annex G §8 template and fills the audio and quality
parts (§1, §2 audio rows, §5 audio column, §9, §10, §12, plus the audio annex). Sections marked **[3B]** are filled by the
visual Stage 3B (renderer, textures, builders) and are intentionally empty here.

## 1. Environment
Renderer string: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))` (software GL: **yes**). Headless Chromium
(Playwright). Build size: `dist/life.html` 0.77 MB (3A adds about 0.13 MB of audio, quality and HUD code).
Audio: `AudioContext` and `OfflineAudioContext` at 44.1 kHz in headless Chromium; no audio device is listened to.

## 2. Startup (JS-side timings; GL is software here)
| Step | ms | Budget |
|---|---|---|
| World generation (Stage 2) | 770 | — |
| Audio sample data (`Audio.prewarm`: 3 noise + 11 texture loops, behind the loading screen) | 237 | inside the 3 s menu budget |
| Ready (menu interactive) | 1189 | 3000 |
| Height grid, boot textures, far proxies, shader prewarm | **[3B]** | |

## 3. Counters per viewpoint and preset
**[3B]** (16 viewpoints × 4 presets). Presets now switch at runtime through `__LOE.setQuality('low'|'medium'|'high'|'ultra')`,
which applies the whole Annex G §3.3 row (`test/e2e/quality.spec.cjs` verifies each row reaches settings, derived params and the renderer pixel ratio).

## 4. Per-region worst case vs budget (High)
**[3B]**

## 5. JS frame cost (cpuOnly mode), mean / max ms
| Viewpoint | sim | physics | ai | anim | cull | stream | render submit | ui | audio | total |
|---|---|---|---|---|---|---|---|---|---|---|
| Spawn (City, Old Town), live loop with 4 beds, city-day music, 3 emitters, one engine loop | — | — | — | — | — | — | **[3B]** | — | 0.29 / 6.2 | — |
| Same, `Audio.update` timed directly over 600 calls | | | | | | | | | 0.02 / 4.6 | |

Audio budget (Annex E §1): ≤ 1.0 ms mean main-thread scheduling: **met** (0.02–0.29 ms mean). The worst single update is a
bed or emitter graph build (2–6 ms in this container) when the environment changes; builds are time-sliced to one per update.
Per-part worst cases are exposed in `Audio.stats().updateMaxMs` (ambience, emitters, music, prerender).

## 6. Streaming and hitches (ring fly-through at 30 m/s)
**[3B]** for render streaming. Stage-2 fly-through re-run after the 3A hooks: slice overruns 0, max pump 3.0–3.6 ms,
program count 4 → 4 (`npm run test:perf`, unchanged pass). Audio work is not part of `Streaming.pump`; one-shot pre-renders
run one per `Audio.update` (`OfflineAudioContext.startRendering` is asynchronous).

## 7. Texture library
**[3B]**

## 8. LOD and instancing audit
**[3B]**

## 9. Governor test result and preset table as implemented
**Governor** (`src/render/governor.js`, `test/unit/governor.test.mjs`, 7 tests, all pass):
- Steps down after 45 consecutive frames with window p95 > 1.08 T (first step at frame 45–60 of a 25 ms sequence at 60 fps target); 90-frame cooldown verified; next step exactly 45 frames after the cooldown.
- Restores with hysteresis: frames between 0.72 T and 1.08 T (14 ms at 60 fps) hold the level indefinitely; 300 consecutive frames with mean < 0.72 T step up one level; never above level 0.
- Ladder order exactly Annex G §4.1 (each level asserted field by field, levels 0–11); monotone (no field rises with the level).
- Never raises a value the user set lower (AO off, reflections off, AA off, particles low, shadows off stay so at every level); resolution floor = user − 0.3, never below 0.5.
- Attached to Quality: overrides effective settings only (saved settings untouched), emits `quality:changed` with the level, follows user edits while governed, returns to level 0 when `adaptive` is turned off; 30 fps target respected; single hitches ignored; no heap growth over 100k samples.
- In the real build (`test/e2e/quality.spec.cjs`): synthetic 40 ms frames drive it to level 3 (`snapshot().quality.governorLevel` = 3, effective resolution 0.7, user value 1.0), 8 ms frames bring it back to 0; the F3 HUD shows the level.

**Presets as implemented** (`src/render/quality.js`, `PRESETS` + `TABLES`): identical to Annex G §3.3 — every field of each row is asserted in `test/unit/quality.test.mjs`
(resolution/pixel ratio, shadows → cascades × size × PCF, shadow distance, AO, bloom, reflections, AA, god rays/fog cards, grade/interior mapping, texture tiers, anisotropy,
draw distance → chunk radii, LOD bias, vegetation/ground cover, tree caps, crowd/traffic, particles, light pool, audio voice limit/HRTF, UI blur). Deviations: none.
Auto (§3.4): renderer strings with SwiftShader/llvmpipe/Software force Low with adaptive on (verified in the build); the GPU benchmark path (`benchmarkMedian`, `resolveAuto({medianFrameMs})`) is implemented and unit-tested, but the 90-frame Old Town benchmark render itself needs the 3B renderer.
Persistence: `loe.settings`, per-field validation, round-trip across a reload verified in the build; storage-throws path verified (boots, works in memory, no errors).

## 10. Not verifiable here (needs a real GPU / human)
- Frame time and pacing; GPU memory behaviour; MSAA cost; forest fill rate (3B list). Requested user check: open `dist/life.html`, press **F3**, visit V01, V03, V08, V13 on High, press "Copy report".
- **Sound quality by ear is NOT verified.** Every check below is signal analysis (levels, spectra, pitch, seams, onsets). A human listening pass is required before release (risk R12), ideally with `tools/audio-dump` style WAV exports (not built yet).
- Real-device audio: latency, HRTF perception, autoplay policy in the live artifact frame (verified only in headless Chromium, where the Start click unlocks the context).
- Governor behaviour against real frame times (only synthetic sequences here; software GL frames are ~0.5–1.6 fps).

## 11. Visual checklist results (Annex G §7.3)
**[3B]**

## 12. Known issues and deferred optimisations (3A)
- One-off 2–6 ms audio updates when a bed graph is built (environment change; the crowd bed is about 60 nodes). Could be split across frames per voice.
- `performance.memory` is quantised in Chromium without `--enable-precise-memory-info`, so `__LOE.perf.allocPerFrame()` can read 0 (below resolution).
- 48 P1/P2 sound ids are registered stubs (Annex E allows Stage 6 to complete them); calling them logs once and plays nothing.
- Shore-distance ambience (lake lap within 40 m, waves within 150 m, river) follows region/district until gameplay passes `env.waterDist`.
- Audio is bundled statically; MASTER_SPEC §3.4 suggests a dynamic `import()` split for patches in the multi-file build (optional).
- The quality → renderer adapter in `main.js` only applies pixel ratio; all other derived parameters wait for the 3B adapter.

---

## Annex: audio verification (Annex E §8, MASTER_SPEC §9.3 acceptance 9)
Command: `npm run test:audio` (= `node --test test/audio/*.test.mjs` + `node test/audio/audio.spec.cjs`). Offline rendering in headless
Chromium; analysis in `test/audio/analysis.mjs` (self-tested on synthetic signals in `logic.test.mjs`).
Criteria: no NaN/Inf, not silent; peak ≤ 0.98 (one-shots ≥ 0.2); |DC| ≤ 0.005; level in the record's range (one-shots: RMS of
10 ms frames within 30 dB of the loudest; loops: whole render); magnitude-weighted spectral centroid in range; one-shot tail
below −60 dBFS within seconds + 20 %; live-graph loop seam: RMS of first vs last window within 3 dB (window 1 s, longer for
slow-cycle beds, see DECISIONS); buffer loops: wrap step not larger than the largest neighbouring step by ≥ 0.02; engines: YIN
fundamental at idle/mid/redline monotonic and within 8 % of the firing rate; music: 40 s, ≥ 20 onsets (stingers ≥ 3), ≥ 90 % of
pitched notes in the suite scale, RMS 0.03–0.2.

Summary (two consecutive runs, identical pass sets): **250/250 rendered ids pass** (all 50 `amb.*`, all 17 `mus.*`, all 10 `eng.*`,
all P0 `sfx.*`, and 118 P1 patches implemented early); 10/10 engines track rpm; 8/8 buffer loops seam-free;
full city-day mix: peak 0.59–0.62 after the limiter, RMS −18.4 dBFS (target −24 … −14); 351 nodes alive in the worst 2 s slice (≤ 400);
171 one-shots pre-rendered = 20.9 MB (cap 24 MB). Live engine in `dist/life.html`: context `running` after the Start click,
4 beds + `mus.city.day` + `ir.city` reverb, rain bed added on `env:weather`, voice limit 16 held under a 40-sound flood,
unknown/stub ids return `null`, zero console errors.

| Id | Kind | Prio | Level (rms) | Range | Peak | Centroid Hz | Range | Seam dB / tail s / onsets | Pass |
|---|---|---|---|---|---|---|---|---|---|
| `amb.city.traffic_hum` | loop | P0 | 0.179 | 0.03–0.25 | 0.715 | 205 | 60–500 | seam 0.15 | yes |
| `amb.city.crowd` | loop | P0 | 0.0333 | 0.03–0.25 | 0.271 | 1014 | 250–2200 | seam -1.76 | yes |
| `amb.city.hvac` | loop | P0 | 0.1006 | 0.03–0.25 | 0.251 | 208 | 60–700 | seam 0.19 | yes |
| `amb.wind.open` | loop | P0 | 0.0452 | 0.03–0.25 | 0.322 | 912 | 200–1300 | seam -0.7 | yes |
| `amb.wind.trees` | loop | P0 | 0.041 | 0.03–0.25 | 0.312 | 4985 | 1800–9000 | seam 0.08 | yes |
| `amb.wind.pines` | loop | P0 | 0.0499 | 0.03–0.25 | 0.31 | 810 | 250–1200 | seam -1.34 | yes |
| `amb.water.lake_lap` | loop | P0 | 0.0445 | 0.03–0.25 | 0.213 | 343 | 150–1500 | seam 0 | yes |
| `amb.water.river` | loop | P0 | 0.0484 | 0.03–0.25 | 0.239 | 1903 | 500–3000 | seam 0.19 | yes |
| `amb.water.ocean_waves` | loop | P0 | 0.0563 | 0.03–0.25 | 0.507 | 988 | 150–3000 | seam 0.34 | yes |
| `amb.water.harbor` | loop | P0 | 0.0374 | 0.03–0.25 | 0.25 | 450 | 150–1800 | seam 0.07 | yes |
| `amb.rain.light` | loop | P0 | 0.0412 | 0.03–0.25 | 0.396 | 6136 | 1500–9000 | seam 0.43 | yes |
| `amb.rain.heavy` | loop | P0 | 0.0533 | 0.03–0.25 | 0.316 | 5686 | 1200–8000 | seam 0.12 | yes |
| `amb.night.crickets` | loop | P0 | 0.1105 | 0.03–0.25 | 0.61 | 5239 | 3500–5500 | seam 0.28 | yes |
| `amb.night.frogs` | loop | P0 | 0.0444 | 0.03–0.25 | 0.66 | 1014 | 250–2200 | seam 0.74 | yes |
| `amb.forest.day` | loop | P0 | 0.0144 | 0.008–0.06 | 0.074 | 3299 | 1000–4500 | seam -1.45 | yes |
| `amb.interior.room` | loop | P0 | 0.0115 | 0.002–0.03 | 0.039 | 168 | 30–400 | seam 0.76 | yes |
| `amb.interior.diner` | loop | P0 | 0.0727 | 0.03–0.25 | 0.363 | 786 | 200–3500 | seam 0.65 | yes |
| `amb.interior.vehicle` | loop | P0 | 0.1005 | 0.03–0.25 | 0.391 | 310 | 40–1500 | seam 0.33 | yes |
| `amb.boat.hull` | loop | P0 | 0.0423 | 0.03–0.25 | 0.336 | 1086 | 150–2200 | seam -0.12 | yes |
| `amb.emit.fountain` | loop | P0 | 0.0525 | 0.03–0.25 | 0.23 | 4642 | 1200–6500 | seam 0.29 | yes |
| `amb.emit.neon_buzz` | loop | P0 | 0.0313 | 0.03–0.25 | 0.24 | 1712 | 250–3000 | seam 0.21 | yes |
| `amb.emit.generator` | loop | P0 | 0.1614 | 0.03–0.25 | 0.487 | 117 | 80–1500 | seam 0.27 | yes |
| `amb.emit.rigging` | loop | P0 | 0.0486 | 0.03–0.25 | 0.441 | 1665 | 600–5000 | seam 0.17 | yes |
| `amb.emit.flag` | loop | P0 | 0.0499 | 0.03–0.25 | 0.365 | 997 | 250–2500 | seam -0.21 | yes |
| `amb.emit.campfire` | loop | P0 | 0.2086 | 0.03–0.25 | 0.884 | 751 | 150–3500 | seam 0.7 | yes |
| `amb.emit.fireplace` | loop | P0 | 0.1706 | 0.03–0.25 | 0.729 | 751 | 120–3000 | seam 0.54 | yes |
| `amb.emit.sawmill` | loop | P0 | 0.064 | 0.03–0.25 | 0.291 | 1383 | 400–4000 | seam 0.03 | yes |
| `amb.emit.weir` | loop | P0 | 0.1306 | 0.03–0.25 | 0.483 | 1743 | 500–4500 | seam 0.28 | yes |
| `amb.emit.buoy_bell` | loop | P0 | 0.0339 | 0.03–0.25 | 0.355 | 872 | 300–3000 | seam -0.19 | yes |
| `amb.emit.lighthouse_horn` | loop | P0 | 0.0718 | 0.03–0.25 | 0.373 | 339 | 80–600 | seam n/a (intermittent) | yes |
| `amb.emit.crane` | loop | P0 | 0.0888 | 0.03–0.25 | 0.3 | 506 | 250–3000 | seam 0.03 | yes |
| `amb.emit.pa_station` | loop | P0 | 0.0395 | 0.03–0.25 | 0.379 | 1136 | 300–3000 | seam 0.71 | yes |
| `amb.emit.dock_creak` | loop | P0 | 0.0322 | 0.03–0.25 | 0.2 | 731 | 150–2200 | seam 0.06 | yes |
| `amb.emit.power_hum` | loop | P0 | 0.0865 | 0.03–0.25 | 0.157 | 108 | 50–400 | seam 0.15 | yes |
| `amb.once.bird_song_a` | oneshot | P0 | 0.2191 | 0.03–0.35 | 0.4 | 3080 | 2000–6500 | tail 0.83 | yes |
| `amb.once.bird_song_b` | oneshot | P0 | 0.2468 | 0.03–0.35 | 0.45 | 2634 | 1800–5500 | tail 0.94 | yes |
| `amb.once.bird_song_c` | oneshot | P0 | 0.1779 | 0.03–0.35 | 0.4 | 3676 | 2000–6500 | tail 1.31 | yes |
| `amb.once.gull` | oneshot | P0 | 0.1065 | 0.03–0.35 | 0.371 | 2992 | 700–3800 | tail 0.8 | yes |
| `amb.once.crow` | oneshot | P0 | 0.0513 | 0.03–0.35 | 0.315 | 2364 | 600–3200 | tail 0.39 | yes |
| `amb.once.loon` | oneshot | P0 | 0.2141 | 0.03–0.35 | 0.67 | 811 | 350–1600 | tail 4.04 | yes |
| `amb.once.owl` | oneshot | P0 | 0.2737 | 0.03–0.35 | 0.514 | 362 | 200–900 | tail 1.51 | yes |
| `amb.once.woodpecker` | oneshot | P0 | 0.066 | 0.03–0.35 | 0.421 | 3393 | 400–3500 | tail 0.76 | yes |
| `amb.once.dog_bark` | oneshot | P0 | 0.0627 | 0.03–0.35 | 0.274 | 1945 | 350–2600 | tail 0.51 | yes |
| `amb.once.car_horn` | oneshot | P0 | 0.2906 | 0.03–0.35 | 0.591 | 1071 | 350–2500 | tail 0.6 | yes |
| `amb.once.siren` | oneshot | P0 | 0.0579 | 0.03–0.35 | 0.334 | 2103 | 450–2200 | tail 3.01 | yes |
| `amb.once.boat_horn` | oneshot | P0 | 0.2009 | 0.03–0.35 | 0.574 | 409 | 90–800 | tail 2.7 | yes |
| `amb.once.chainsaw_far` | oneshot | P0 | 0.1412 | 0.03–0.35 | 0.518 | 387 | 120–1400 | tail 3.11 | yes |
| `amb.once.thunder` | oneshot | P0 | 0.1192 | 0.03–0.35 | 0.958 | 633 | 40–800 | tail 5.28 | yes |
| `amb.once.fish_jump` | oneshot | P0 | 0.0716 | 0.03–0.35 | 0.443 | 1901 | 400–4500 | tail 0.36 | yes |
| `amb.once.train_far` | oneshot | P0 | 0.1587 | 0.03–0.35 | 0.864 | 382 | 70–900 | tail 4.73 | yes |
| `mus.menu` | music | P0 | 0.0561 | 0.03–0.2 | 0.421 | 1319 | 150–3500 | 99 onsets, 100 % in scale | yes |
| `mus.city.day` | music | P0 | 0.0704 | 0.03–0.2 | 0.789 | 1428 | 150–3500 | 93 onsets, 100 % in scale | yes |
| `mus.city.night` | music | P0 | 0.0607 | 0.03–0.2 | 0.57 | 696 | 100–3000 | 41 onsets, 100 % in scale | yes |
| `mus.lake.day` | music | P0 | 0.0701 | 0.03–0.2 | 0.399 | 1139 | 150–3500 | 112 onsets, 100 % in scale | yes |
| `mus.lake.night` | music | P0 | 0.05 | 0.03–0.2 | 0.388 | 791 | 150–3500 | 34 onsets, 100 % in scale | yes |
| `mus.ocean.day` | music | P0 | 0.0597 | 0.03–0.2 | 0.704 | 2138 | 150–4000 | 165 onsets, 100 % in scale | yes |
| `mus.ocean.night` | music | P0 | 0.0548 | 0.03–0.2 | 0.511 | 914 | 150–3500 | 74 onsets, 100 % in scale | yes |
| `mus.forest.day` | music | P0 | 0.061 | 0.03–0.2 | 0.395 | 738 | 150–3500 | 25 onsets, 100 % in scale | yes |
| `mus.forest.night` | music | P0 | 0.0446 | 0.03–0.2 | 0.251 | 783 | 80–3000 | 67 onsets, 100 % in scale | yes |
| `mus.layer.work` | music | P0 | 0.0428 | 0.03–0.2 | 0.231 | 1751 | 100–5000 | 221 onsets, 100 % in scale | yes |
| `mus.layer.drive` | music | P0 | 0.0483 | 0.03–0.2 | 0.389 | 3286 | 80–5000 | 182 onsets, 100 % in scale | yes |
| `mus.sting.levelup` | sting | P0 | 0.0334 | 0.03–0.2 | 0.417 | 1614 | 300–4500 | 11 onsets, 100 % in scale | yes |
| `mus.sting.business_open` | sting | P0 | 0.0387 | 0.03–0.2 | 0.281 | 2525 | 250–4000 | 6 onsets, 100 % in scale | yes |
| `mus.sting.purchase_big` | sting | P0 | 0.0408 | 0.03–0.2 | 0.341 | 1986 | 200–4000 | 6 onsets, 100 % in scale | yes |
| `mus.sting.newday` | sting | P0 | 0.0386 | 0.03–0.2 | 0.308 | 1337 | 200–4000 | 10 onsets, 100 % in scale | yes |
| `mus.sting.fail` | sting | P0 | 0.0444 | 0.03–0.2 | 0.409 | 318 | 100–2500 | 12 onsets, 100 % in scale | yes |
| `mus.sting.milestone` | sting | P0 | 0.04 | 0.03–0.2 | 0.375 | 2345 | 250–4500 | 7 onsets, 100 % in scale | yes |
| `eng.car_i4` | engine | P0 | 0.1745 | 0.03–0.25 | 0.532 | 118 | 60–1500 | seam 0.11 | yes |
| `eng.van_diesel` | engine | P0 | 0.1805 | 0.03–0.25 | 0.651 | 845 | 60–1500 | seam 0.24 | yes |
| `eng.outboard` | engine | P0 | 0.1736 | 0.03–0.25 | 0.651 | 346 | 80–2500 | seam 0.22 | yes |
| `eng.moto_small` | engine | P1 | 0.1529 | 0.03–0.25 | 0.637 | 135 | 80–3000 | seam 0.45 | yes |
| `eng.moto_twin` | engine | P1 | 0.1969 | 0.03–0.25 | 0.656 | 131 | 60–2000 | seam 0.31 | yes |
| `eng.car_v6` | engine | P1 | 0.2062 | 0.03–0.25 | 0.697 | 142 | 50–1600 | seam 0.07 | yes |
| `eng.truck_diesel` | engine | P1 | 0.2006 | 0.03–0.25 | 0.745 | 657 | 80–700 | seam 0.28 | yes |
| `eng.forklift` | engine | P1 | 0.1282 | 0.03–0.25 | 0.35 | 108 | 60–1500 | seam 0.13 | yes |
| `eng.boat_diesel` | engine | P1 | 0.2119 | 0.03–0.25 | 0.713 | 568 | 40–800 | seam 0.17 | yes |
| `eng.chainsaw` | engine | P1 | 0.1635 | 0.03–0.25 | 0.617 | 266 | 200–4500 | seam 0.13 | yes |
| `sfx.ui.click` | oneshot | P0 | 0.0918 | 0.03–0.35 | 0.401 | 2722 | 1500–6000 | tail 0.05 | yes |
| `sfx.ui.hover` | oneshot | P1 | 0.0829 | 0.03–0.35 | 0.297 | 1841 | 1200–4000 | tail 0.05 | yes |
| `sfx.ui.back` | oneshot | P0 | 0.1132 | 0.03–0.35 | 0.657 | 1323 | 400–3000 | tail 0.19 | yes |
| `sfx.ui.open` | oneshot | P0 | 0.1006 | 0.03–0.35 | 0.392 | 1837 | 500–3500 | tail 0.19 | yes |
| `sfx.ui.close` | oneshot | P0 | 0.0905 | 0.03–0.35 | 0.471 | 2159 | 400–3000 | tail 0.19 | yes |
| `sfx.ui.toggle_on` | oneshot | P1 | 0.095 | 0.03–0.35 | 0.346 | 1187 | 600–4000 | tail 0.2 | yes |
| `sfx.ui.toggle_off` | oneshot | P1 | 0.095 | 0.03–0.35 | 0.346 | 1094 | 500–3500 | tail 0.2 | yes |
| `sfx.ui.error` | oneshot | P0 | 0.2571 | 0.03–0.35 | 0.579 | 723 | 150–1500 | tail 0.33 | yes |
| `sfx.ui.confirm` | oneshot | P0 | 0.1173 | 0.03–0.35 | 0.455 | 2056 | 600–4000 | tail 0.63 | yes |
| `sfx.ui.notify` | oneshot | P0 | 0.1386 | 0.03–0.35 | 0.55 | 3918 | 600–4500 | tail 0.58 | yes |
| `sfx.ui.phone_open` | oneshot | P1 | 0.0575 | 0.03–0.35 | 0.285 | 2705 | 500–5000 | tail 0.26 | yes |
| `sfx.ui.phone_close` | oneshot | P1 | 0.0548 | 0.03–0.35 | 0.282 | 2664 | 500–5000 | tail 0.26 | yes |
| `sfx.ui.type` | oneshot | P1 | 0.0649 | 0.03–0.35 | 0.297 | 5021 | 1500–7000 | tail 0.02 | yes |
| `sfx.ui.map_ping` | oneshot | P1 | 0.067 | 0.03–0.35 | 0.349 | 1514 | 600–3500 | tail 0.55 | yes |
| `sfx.money.cash_register` | oneshot | P0 | 0.072 | 0.03–0.35 | 0.489 | 3529 | 400–5000 | tail 0.85 | yes |
| `sfx.money.coins` | oneshot | P0 | 0.0709 | 0.03–0.35 | 0.552 | 4788 | 1500–8000 | tail 0.72 | yes |
| `sfx.money.pay` | oneshot | P0 | 0.2201 | 0.03–0.35 | 0.35 | 1284 | 800–3000 | tail 0.29 | yes |
| `sfx.money.income_tick` | oneshot | P1 | 0.1072 | 0.03–0.35 | 0.395 | 3097 | 800–5000 | tail 0.32 | yes |
| `sfx.money.big_purchase` | oneshot | P1 | 0.1411 | 0.03–0.35 | 0.703 | 1601 | 150–4000 | tail 1.16 | yes |
| `sfx.level_up` | oneshot | P0 | 0.1191 | 0.03–0.35 | 0.438 | 2379 | 500–5000 | tail 1.04 | yes |
| `sfx.job.task_ok` | oneshot | P0 | 0.0788 | 0.03–0.35 | 0.438 | 1795 | 500–4500 | tail 0.54 | yes |
| `sfx.job.task_perfect` | oneshot | P0 | 0.0823 | 0.03–0.35 | 0.414 | 5357 | 800–7000 | tail 0.7 | yes |
| `sfx.job.task_fail` | oneshot | P0 | 0.2454 | 0.03–0.35 | 0.801 | 663 | 100–1500 | tail 0.4 | yes |
| `sfx.job.shift_start` | oneshot | P1 | 0.1783 | 0.03–0.35 | 0.3 | 1801 | 600–3500 | tail 0.66 | yes |
| `sfx.job.shift_end` | oneshot | P1 | 0.0785 | 0.03–0.35 | 0.446 | 2174 | 200–4000 | tail 0.23 | yes |
| `sfx.build.place` | oneshot | P1 | 0.0971 | 0.03–0.35 | 0.532 | 1631 | 200–2500 | tail 0.11 | yes |
| `sfx.build.remove` | oneshot | P1 | 0.0669 | 0.03–0.35 | 0.334 | 1873 | 200–2500 | tail 0.19 | yes |
| `sfx.build.invalid` | oneshot | P1 | 0.1489 | 0.03–0.35 | 0.646 | 321 | 60–800 | tail 0.19 | yes |
| `sfx.step.asphalt` | oneshot | P0 | 0.046 | 0.03–0.35 | 0.263 | 2140 | 300–5000 | tail 0.11 | yes |
| `sfx.step.concrete` | oneshot | P0 | 0.0459 | 0.03–0.35 | 0.289 | 2465 | 300–5000 | tail 0.11 | yes |
| `sfx.step.cobble` | oneshot | P1 | 0.0521 | 0.03–0.35 | 0.374 | 1836 | 300–5000 | tail 0.1 | yes |
| `sfx.step.paver` | oneshot | P1 | 0.0515 | 0.03–0.35 | 0.299 | 2333 | 300–5000 | tail 0.1 | yes |
| `sfx.step.tile` | oneshot | P1 | 0.059 | 0.03–0.35 | 0.33 | 2702 | 300–5000 | tail 0.08 | yes |
| `sfx.step.carpet` | oneshot | P1 | 0.0495 | 0.03–0.35 | 0.211 | 981 | 150–2500 | tail 0.12 | yes |
| `sfx.step.wood` | oneshot | P0 | 0.1124 | 0.03–0.35 | 0.555 | 1191 | 150–2000 | tail 0.16 | yes |
| `sfx.step.metal` | oneshot | P1 | 0.0841 | 0.03–0.35 | 0.531 | 2538 | 400–6000 | tail 0.29 | yes |
| `sfx.step.grass` | oneshot | P0 | 0.0482 | 0.03–0.35 | 0.245 | 5665 | 300–6000 | tail 0.15 | yes |
| `sfx.step.forestfloor` | oneshot | P1 | 0.0437 | 0.03–0.35 | 0.29 | 5413 | 300–6000 | tail 0.15 | yes |
| `sfx.step.dirt` | oneshot | P0 | 0.05 | 0.03–0.35 | 0.218 | 4248 | 300–6000 | tail 0.1 | yes |
| `sfx.step.gravel` | oneshot | P1 | 0.0544 | 0.03–0.35 | 0.268 | 5942 | 1000–7000 | tail 0.12 | yes |
| `sfx.step.sand` | oneshot | P1 | 0.0389 | 0.03–0.35 | 0.224 | 4578 | 300–6000 | tail 0.17 | yes |
| `sfx.step.mud` | oneshot | P1 | 0.047 | 0.03–0.35 | 0.312 | 721 | 150–2500 | tail 0.23 | yes |
| `sfx.step.snow` | oneshot | P1 | 0.0432 | 0.03–0.35 | 0.251 | 5204 | 300–6000 | tail 0.17 | yes |
| `sfx.step.water_shallow` | oneshot | P1 | 0.0805 | 0.03–0.35 | 0.408 | 1909 | 300–4500 | tail 0.36 | yes |
| `sfx.player.jump` | oneshot | P1 | 0.0702 | 0.03–0.35 | 0.36 | 2268 | 300–4000 | tail 0.23 | yes |
| `sfx.player.land_soft` | oneshot | P1 | 0.0788 | 0.03–0.35 | 0.413 | 1365 | 80–2000 | tail 0.16 | yes |
| `sfx.player.land_hard` | oneshot | P1 | 0.1343 | 0.03–0.35 | 0.573 | 726 | 60–1500 | tail 0.19 | yes |
| `sfx.player.eat` | oneshot | P1 | 0.0339 | 0.03–0.35 | 0.268 | 4849 | 500–5000 | tail 0.54 | yes |
| `sfx.player.drink` | oneshot | P1 | 0.0978 | 0.03–0.35 | 0.298 | 390 | 200–2000 | tail 0.63 | yes |
| `sfx.player.sleep` | oneshot | P1 | 0.1154 | 0.03–0.35 | 0.437 | 938 | 150–2000 | tail 2.21 | yes |
| `sfx.item.pickup` | oneshot | P0 | 0.0384 | 0.03–0.35 | 0.226 | 2024 | 200–4000 | tail 0.19 | yes |
| `sfx.item.drop` | oneshot | P0 | 0.118 | 0.03–0.35 | 0.51 | 521 | 80–2500 | tail 0.17 | yes |
| `sfx.item.carry_set` | oneshot | P0 | 0.0683 | 0.03–0.35 | 0.435 | 1426 | 80–2500 | tail 0.21 | yes |
| `sfx.door.open` | oneshot | P0 | 0.0627 | 0.03–0.35 | 0.298 | 1206 | 200–3000 | tail 0.68 | yes |
| `sfx.door.close` | oneshot | P0 | 0.1377 | 0.03–0.35 | 0.66 | 1543 | 100–2500 | tail 0.23 | yes |
| `sfx.door.locked` | oneshot | P0 | 0.068 | 0.03–0.35 | 0.451 | 4176 | 400–4500 | tail 0.17 | yes |
| `sfx.door.shop_bell` | oneshot | P1 | 0.0862 | 0.03–0.35 | 0.406 | 2909 | 1500–6000 | tail 0.82 | yes |
| `sfx.npc.murmur_a` | oneshot | P1 | 0.0763 | 0.03–0.35 | 0.259 | 1548 | 250–2500 | tail 0.7 | yes |
| `sfx.npc.murmur_b` | oneshot | P1 | 0.082 | 0.03–0.35 | 0.277 | 1533 | 250–2500 | tail 0.7 | yes |
| `sfx.npc.murmur_c` | oneshot | P1 | 0.0674 | 0.03–0.35 | 0.282 | 1492 | 200–2500 | tail 0.7 | yes |
| `sfx.npc.whistle_hail` | oneshot | P1 | 0.1798 | 0.03–0.35 | 0.3 | 2270 | 1500–4000 | tail 0.66 | yes |
| `sfx.veh.start` | oneshot | P0 | 0.1569 | 0.03–0.35 | 0.475 | 598 | 80–2500 | tail 1.61 | yes |
| `sfx.veh.stop` | oneshot | P0 | 0.2035 | 0.03–0.35 | 0.725 | 204 | 40–1500 | tail 1 | yes |
| `sfx.veh.door_open` | oneshot | P0 | 0.0444 | 0.03–0.35 | 0.388 | 2845 | 150–3500 | tail 0.12 | yes |
| `sfx.veh.door_close` | oneshot | P0 | 0.1607 | 0.03–0.35 | 0.728 | 1434 | 60–2500 | tail 0.19 | yes |
| `sfx.veh.horn_car` | oneshot | P1 | 0.2882 | 0.03–0.35 | 0.584 | 1342 | 350–2500 | tail 0.55 | yes |
| `sfx.veh.horn_truck` | oneshot | P1 | 0.2831 | 0.03–0.35 | 0.566 | 650 | 150–1500 | tail 0.8 | yes |
| `sfx.veh.horn_moto` | oneshot | P1 | 0.285 | 0.03–0.35 | 0.589 | 1658 | 500–3000 | tail 0.45 | yes |
| `sfx.veh.suspension_thump` | oneshot | P0 | 0.1632 | 0.03–0.35 | 0.711 | 525 | 50–1500 | tail 0.23 | yes |
| `sfx.veh.crash_light` | oneshot | P0 | 0.1456 | 0.03–0.35 | 0.701 | 1162 | 200–4000 | tail 0.21 | yes |
| `sfx.veh.crash_heavy` | oneshot | P0 | 0.1473 | 0.03–0.35 | 0.769 | 1840 | 150–5000 | tail 0.98 | yes |
| `sfx.veh.indicator` | oneshot | P1 | 0.1098 | 0.03–0.35 | 0.461 | 4318 | 800–5000 | tail 0.03 | yes |
| `sfx.veh.reverse_beep` | oneshot | P1 | 0.2391 | 0.03–0.35 | 0.35 | 1003 | 900–1300 | tail 0.4 | yes |
| `sfx.veh.handbrake` | oneshot | P1 | 0.0416 | 0.03–0.35 | 0.254 | 2988 | 500–5000 | tail 0.27 | yes |
| `sfx.veh.gear_shift` | oneshot | P1 | 0.1189 | 0.03–0.35 | 0.535 | 1220 | 100–3000 | tail 0.08 | yes |
| `sfx.veh.fuel_cap` | oneshot | P1 | 0.0769 | 0.03–0.35 | 0.389 | 3664 | 400–4000 | tail 0.05 | yes |
| `sfx.veh.fuel_done` | oneshot | P1 | 0.1222 | 0.03–0.35 | 0.519 | 1216 | 100–2500 | tail 0.1 | yes |
| `sfx.veh.air_brake` | oneshot | P1 | 0.067 | 0.03–0.35 | 0.363 | 3152 | 600–6000 | tail 1.01 | yes |
| `sfx.veh.taxi_meter` | oneshot | P1 | 0.0772 | 0.03–0.35 | 0.422 | 4349 | 1000–5000 | tail 0.03 | yes |
| `sfx.veh.passenger_in` | oneshot | P1 | 0.1016 | 0.03–0.35 | 0.706 | 576 | 60–2500 | tail 0.49 | yes |
| `sfx.veh.passenger_out` | oneshot | P1 | 0.1086 | 0.03–0.35 | 0.702 | 571 | 60–2500 | tail 0.42 | yes |
| `sfx.veh.pallet_set` | oneshot | P1 | 0.1272 | 0.03–0.35 | 0.603 | 712 | 80–1500 | tail 0.18 | yes |
| `sfx.veh.pallet_drop` | oneshot | P1 | 0.1393 | 0.03–0.35 | 0.702 | 1253 | 80–3000 | tail 0.31 | yes |
| `sfx.veh.loader_grapple` | oneshot | P1 | 0.1094 | 0.03–0.35 | 0.437 | 691 | 100–2500 | tail 0.98 | yes |
| `sfx.veh.log_drop` | oneshot | P1 | 0.1466 | 0.03–0.35 | 0.75 | 338 | 50–1200 | tail 0.54 | yes |
| `sfx.veh.log_roll` | oneshot | P1 | 0.0892 | 0.03–0.35 | 0.462 | 501 | 60–1500 | tail 0.89 | yes |
| `sfx.veh.tyre_roll` | loop | P0 | 0.0567 | 0.03–0.25 | 0.247 | 2694 | 150–3000 | seam 0.44 | yes |
| `sfx.veh.skid` | loop | P0 | 0.0693 | 0.03–0.25 | 0.287 | 2247 | 500–2500 | seam 0.11 | yes |
| `sfx.veh.wind` | loop | P0 | 0.0463 | 0.03–0.25 | 0.228 | 2687 | 150–3000 | seam -0.12 | yes |
| `sfx.veh.fuel_pump` | loop | P1 | 0.0646 | 0.03–0.25 | 0.205 | 797 | 80–2000 | seam 0.05 | yes |
| `sfx.veh.forklift_mast` | loop | P1 | 0.0654 | 0.03–0.25 | 0.191 | 1353 | 200–2500 | seam 0.22 | yes |
| `sfx.boat.bow_slap` | oneshot | P1 | 0.1445 | 0.03–0.35 | 0.592 | 1097 | 80–2500 | tail 0.22 | yes |
| `sfx.boat.hull_bump` | oneshot | P0 | 0.1087 | 0.03–0.35 | 0.582 | 510 | 80–2000 | tail 0.49 | yes |
| `sfx.boat.dock_bump` | oneshot | P0 | 0.1319 | 0.03–0.35 | 0.659 | 422 | 60–1200 | tail 0.27 | yes |
| `sfx.boat.rope_tie` | oneshot | P1 | 0.1412 | 0.03–0.35 | 0.346 | 1317 | 200–2500 | tail 0.65 | yes |
| `sfx.boat.rope_throw` | oneshot | P1 | 0.0686 | 0.03–0.35 | 0.333 | 1779 | 300–3000 | tail 0.46 | yes |
| `sfx.boat.cleat` | oneshot | P1 | 0.1198 | 0.03–0.35 | 0.589 | 1756 | 150–3000 | tail 0.11 | yes |
| `sfx.boat.oar_stroke` | oneshot | P1 | 0.0327 | 0.03–0.35 | 0.316 | 1468 | 200–3000 | tail 0.7 | yes |
| `sfx.boat.horn` | oneshot | P1 | 0.1761 | 0.03–0.35 | 0.509 | 452 | 90–800 | tail 1.74 | yes |
| `sfx.boat.net_out` | oneshot | P1 | 0.0636 | 0.03–0.35 | 0.423 | 1317 | 200–3000 | tail 1.01 | yes |
| `sfx.boat.net_in` | oneshot | P1 | 0.0634 | 0.03–0.35 | 0.35 | 1464 | 200–4000 | tail 1.01 | yes |
| `sfx.boat.net_tear` | oneshot | P1 | 0.0579 | 0.03–0.35 | 0.361 | 3000 | 600–5000 | tail 0.47 | yes |
| `sfx.boat.wake` | loop | P0 | 0.076 | 0.03–0.25 | 0.416 | 3532 | 400–4000 | seam -0.71 | yes |
| `sfx.boat.winch` | loop | P1 | 0.1144 | 0.03–0.25 | 0.382 | 1542 | 100–2500 | seam 0.21 | yes |
| `sfx.water.splash_small` | oneshot | P0 | 0.0689 | 0.03–0.35 | 0.363 | 1842 | 400–4500 | tail 0.43 | yes |
| `sfx.water.splash_big` | oneshot | P1 | 0.0922 | 0.03–0.35 | 0.387 | 1478 | 250–4000 | tail 0.92 | yes |
| `sfx.water.wade` | oneshot | P1 | 0.0385 | 0.03–0.35 | 0.234 | 1199 | 300–3500 | tail 0.61 | yes |
| `sfx.water.drip` | oneshot | P1 | 0.1179 | 0.03–0.35 | 0.448 | 1152 | 500–4000 | tail 0.06 | yes |
| `sfx.fish.cast_whoosh` | oneshot | P0 | 0.0694 | 0.03–0.35 | 0.417 | 1981 | 400–3500 | tail 0.39 | yes |
| `sfx.fish.line_out` | oneshot | P0 | 0.0306 | 0.03–0.35 | 0.269 | 6578 | 1500–7000 | tail 1.38 | yes |
| `sfx.fish.bobber_plop` | oneshot | P0 | 0.1183 | 0.03–0.35 | 0.544 | 1478 | 150–3000 | tail 0.31 | yes |
| `sfx.fish.nibble` | oneshot | P0 | 0.0848 | 0.03–0.35 | 0.44 | 1068 | 400–4000 | tail 0.12 | yes |
| `sfx.fish.bite` | oneshot | P0 | 0.1317 | 0.03–0.35 | 0.487 | 827 | 80–3000 | tail 0.19 | yes |
| `sfx.fish.line_snap` | oneshot | P0 | 0.0902 | 0.03–0.35 | 0.542 | 4653 | 300–6000 | tail 0.51 | yes |
| `sfx.fish.thrash` | oneshot | P0 | 0.0651 | 0.03–0.35 | 0.395 | 1891 | 300–4500 | tail 1.55 | yes |
| `sfx.fish.landed` | oneshot | P0 | 0.0972 | 0.03–0.35 | 0.636 | 2051 | 150–4000 | tail 1.05 | yes |
| `sfx.fish.reel` | loop | P0 | 0.0485 | 0.03–0.25 | 0.75 | 6005 | 1200–6500 | seam 0.09 | yes |
| `sfx.fish.drag_scream` | loop | P0 | 0.0305 | 0.03–0.25 | 0.306 | 7376 | 2000–8000 | seam -0.18 | yes |
| `sfx.fish.line_tension` | loop | P1 | 0.1408 | 0.03–0.25 | 0.2 | 1050 | 400–4000 | seam 0.15 | yes |
| `sfx.tool.axe_swing` | oneshot | P1 | 0.0667 | 0.03–0.35 | 0.331 | 2189 | 300–3500 | tail 0.31 | yes |
| `sfx.tool.axe_chop` | oneshot | P1 | 0.1246 | 0.03–0.35 | 0.857 | 2328 | 200–3500 | tail 0.14 | yes |
| `sfx.tool.axe_stuck` | oneshot | P1 | 0.1221 | 0.03–0.35 | 0.519 | 612 | 80–1500 | tail 0.11 | yes |
| `sfx.tool.chainsaw_start` | oneshot | P1 | 0.083 | 0.03–0.35 | 0.32 | 366 | 100–3500 | tail 1.59 | yes |
| `sfx.tool.chainsaw_kick` | oneshot | P1 | 0.1241 | 0.03–0.35 | 0.524 | 1861 | 150–4000 | tail 0.23 | yes |
| `sfx.tree.crack` | oneshot | P1 | 0.081 | 0.03–0.35 | 0.59 | 3231 | 200–4000 | tail 1.31 | yes |
| `sfx.tree.fall` | oneshot | P1 | 0.0373 | 0.03–0.35 | 0.217 | 2105 | 150–3500 | tail 2.2 | yes |
| `sfx.tree.impact` | oneshot | P1 | 0.1724 | 0.03–0.35 | 0.793 | 768 | 40–1500 | tail 0.84 | yes |
| `sfx.tool.wrench_ratchet` | oneshot | P1 | 0.049 | 0.03–0.35 | 0.35 | 3754 | 800–6000 | tail 0.44 | yes |
| `sfx.tool.impact_gun` | oneshot | P1 | 0.0687 | 0.03–0.35 | 0.419 | 3219 | 200–3500 | tail 0.6 | yes |
| `sfx.tool.torque_click` | oneshot | P1 | 0.0987 | 0.03–0.35 | 0.534 | 4794 | 800–6000 | tail 0.04 | yes |
| `sfx.tool.oil_drain` | oneshot | P1 | 0.068 | 0.03–0.35 | 0.254 | 704 | 150–2000 | tail 1.4 | yes |
| `sfx.tool.hood` | oneshot | P1 | 0.1414 | 0.03–0.35 | 0.623 | 406 | 60–1800 | tail 0.27 | yes |
| `sfx.fire.ignite` | oneshot | P1 | 0.0722 | 0.03–0.35 | 0.443 | 1114 | 100–2500 | tail 0.81 | yes |
| `sfx.tool.chainsaw_cut` | loop | P1 | 0.0494 | 0.03–0.25 | 0.427 | 3337 | 300–5000 | seam -0.73 | yes |
| `sfx.fire.loop` | loop | P1 | 0.2064 | 0.03–0.25 | 0.861 | 760 | 150–3500 | seam -1.44 | yes |
| `sfx.kitchen.chop` | oneshot | P0 | 0.1163 | 0.03–0.35 | 0.69 | 3076 | 250–4000 | tail 0.08 | yes |
| `sfx.kitchen.flip` | oneshot | P1 | 0.0345 | 0.03–0.35 | 0.257 | 2823 | 500–5000 | tail 0.29 | yes |
| `sfx.kitchen.plate` | oneshot | P0 | 0.066 | 0.03–0.35 | 0.45 | 3647 | 1200–7000 | tail 0.33 | yes |
| `sfx.kitchen.bell` | oneshot | P0 | 0.0776 | 0.03–0.35 | 0.499 | 3319 | 1500–7500 | tail 1.2 | yes |
| `sfx.kitchen.burn` | oneshot | P1 | 0.0404 | 0.03–0.35 | 0.266 | 5770 | 1500–8000 | tail 0.87 | yes |
| `sfx.kitchen.fridge_door` | oneshot | P1 | 0.1261 | 0.03–0.35 | 0.593 | 460 | 60–1500 | tail 0.14 | yes |
| `sfx.kitchen.pour_coffee` | oneshot | P1 | 0.0679 | 0.03–0.35 | 0.296 | 2274 | 300–3000 | tail 1.31 | yes |
| `sfx.shop.scan_beep` | oneshot | P1 | 0.2118 | 0.03–0.35 | 0.297 | 2750 | 1500–3500 | tail 0.11 | yes |
| `sfx.shop.bag` | oneshot | P1 | 0.041 | 0.03–0.35 | 0.349 | 6101 | 1000–7000 | tail 0.38 | yes |
| `sfx.shop.till_open` | oneshot | P1 | 0.0318 | 0.03–0.35 | 0.408 | 2074 | 300–4000 | tail 0.49 | yes |
| `sfx.shop.shelf_place` | oneshot | P1 | 0.1201 | 0.03–0.35 | 0.597 | 582 | 80–2000 | tail 0.11 | yes |
| `sfx.parcel.pickup` | oneshot | P0 | 0.0705 | 0.03–0.35 | 0.467 | 746 | 80–2000 | tail 0.2 | yes |
| `sfx.parcel.drop` | oneshot | P0 | 0.136 | 0.03–0.35 | 0.527 | 582 | 60–1800 | tail 0.11 | yes |
| `sfx.parcel.doorbell` | oneshot | P0 | 0.1099 | 0.03–0.35 | 0.415 | 999 | 400–2500 | tail 1.42 | yes |
| `sfx.parcel.sign` | oneshot | P0 | 0.0664 | 0.03–0.35 | 0.304 | 5874 | 1500–7000 | tail 0.73 | yes |
| `sfx.vend.restock` | oneshot | P0 | 0.0483 | 0.03–0.35 | 0.383 | 3416 | 500–5000 | tail 0.85 | yes |
| `sfx.vend.coin_box` | oneshot | P0 | 0.0821 | 0.03–0.35 | 0.443 | 4603 | 1500–8000 | tail 0.43 | yes |
| `sfx.vend.dispense` | oneshot | P0 | 0.1441 | 0.03–0.35 | 0.635 | 552 | 80–2500 | tail 0.24 | yes |
| `sfx.vend.jam` | oneshot | P0 | 0.2316 | 0.03–0.35 | 0.429 | 480 | 100–2000 | tail 0.61 | yes |
| `sfx.vend.repair` | oneshot | P0 | 0.0321 | 0.03–0.35 | 0.342 | 3614 | 800–6000 | tail 0.54 | yes |
| `sfx.dock.crate_set` | oneshot | P1 | 0.1358 | 0.03–0.35 | 0.624 | 530 | 60–1500 | tail 0.19 | yes |
| `sfx.dock.ice_shovel` | oneshot | P1 | 0.0391 | 0.03–0.35 | 0.28 | 6156 | 1500–8000 | tail 0.36 | yes |
| `sfx.dock.fish_dump` | oneshot | P1 | 0.0786 | 0.03–0.35 | 0.367 | 1491 | 200–3000 | tail 0.88 | yes |
| `sfx.rental.life_jacket` | oneshot | P1 | 0.0642 | 0.03–0.35 | 0.359 | 2019 | 300–4000 | tail 0.36 | yes |
| `sfx.rental.boat_push` | oneshot | P1 | 0.0487 | 0.03–0.35 | 0.269 | 1259 | 150–3500 | tail 1 | yes |
| `sfx.rental.whistle` | oneshot | P1 | 0.1723 | 0.03–0.35 | 0.343 | 3208 | 1800–4500 | tail 0.46 | yes |
| `sfx.kitchen.sizzle` | loop | P0 | 0.0529 | 0.03–0.25 | 0.581 | 5147 | 1500–8000 | seam 0.13 | yes |
| `sfx.kitchen.fryer` | loop | P1 | 0.0371 | 0.03–0.25 | 0.214 | 1479 | 400–5000 | seam 0.22 | yes |
| `sfx.kitchen.espresso` | loop | P1 | 0.1014 | 0.03–0.25 | 0.272 | 1055 | 200–4000 | seam 0.15 | yes |
| `sfx.shop.belt` | loop | P1 | 0.1204 | 0.03–0.25 | 0.452 | 253 | 80–1500 | seam 0.1 | yes |
| `sfx.shop.cart_roll` | loop | P1 | 0.0766 | 0.03–0.25 | 0.447 | 934 | 100–3000 | seam -0.14 | yes |
| `sfx.dock.conveyor` | loop | P1 | 0.1041 | 0.03–0.25 | 0.469 | 990 | 80–2000 | seam 0.32 | yes |
| `sfx.weather.lightning_crack` | oneshot | P1 | 0.0651 | 0.03–0.35 | 0.363 | 1300 | 100–5000 | tail 2.69 | yes |
| `sfx.weather.gust` | oneshot | P1 | 0.0592 | 0.03–0.35 | 0.328 | 835 | 200–1500 | tail 2.5 | yes |
| `sfx.world.crossing_beep` | oneshot | P1 | 0.2043 | 0.03–0.35 | 0.293 | 1757 | 800–3000 | tail 0.16 | yes |
| `sfx.world.bus_brake` | oneshot | P1 | 0.0362 | 0.03–0.35 | 0.281 | 4042 | 500–6000 | tail 1.22 | yes |
| `sfx.world.church_bell` | oneshot | P1 | 0.0872 | 0.03–0.35 | 0.628 | 442 | 200–2500 | tail 2.87 | yes |
| `sfx.world.construction_clank` | oneshot | P1 | 0.0795 | 0.03–0.35 | 0.474 | 1929 | 300–5000 | tail 0.33 | yes |

| Engine | idle rpm: expected / detected Hz | mid | redline | Monotonic, within 8 % |
|---|---|---|---|---|
| `eng.moto_small` | 1400: 11.7 / 11.7 | 5200: 43.3 / 43.4 | 9000: 75 / 75 | yes |
| `eng.moto_twin` | 1100: 18.3 / 18.3 | 4300: 71.7 / 71.7 | 7500: 125 / 125.1 | yes |
| `eng.car_i4` | 800: 26.7 / 26.7 | 3650: 121.7 / 121.8 | 6500: 216.7 / 217 | yes |
| `eng.car_v6` | 750: 37.5 / 37.5 | 3875: 193.8 / 194 | 7000: 350 / 350.2 | yes |
| `eng.van_diesel` | 800: 26.7 / 26.7 | 2650: 88.3 / 88.4 | 4500: 150 / 152.7 | yes |
| `eng.truck_diesel` | 650: 32.5 / 32.5 | 1725: 86.3 / 86.5 | 2800: 140 / 147.2 | yes |
| `eng.forklift` | 1000: 16.7 / 16.7 | 2300: 38.3 / 38.4 | 3600: 60 / 60 | yes |
| `eng.outboard` | 900: 30 / 30 | 3200: 106.7 / 106.7 | 5500: 183.3 / 183.4 | yes |
| `eng.boat_diesel` | 450: 22.5 / 22.5 | 1125: 56.3 / 56.3 | 1800: 90 / 90.1 | yes |
| `eng.chainsaw` | 2800: 46.7 / 46.7 | 7400: 123.3 / 123.3 | 12000: 200 / 200 | yes |

Stubs (48 P1/P2 ids registered in `data/sounds.js`, patches added by Stage 6): `sfx.ui.slider`, `sfx.player.cloth`, `sfx.player.breath_tired`, `sfx.door.garage_roll`, `sfx.door.sliding`, `sfx.switch.light`, `sfx.veh.brake_squeal`, `sfx.veh.crane_hook`, `sfx.veh.container_lock`, `sfx.veh.container_set`, `sfx.veh.scrape`, `sfx.veh.crane_slew`, `sfx.boat.anchor_chain`, `sfx.boat.bilge`, `sfx.boat.sonar_ping`, `sfx.water.pour`, `sfx.water.bail`, `sfx.fish.net_scoop`, `sfx.fish.cooler_lid`, `sfx.fish.scale_beep`, `sfx.fish.fillet_cut`, `sfx.tool.dig`, `sfx.tool.tamp`, `sfx.tool.plant`, `sfx.tool.hammer`, `sfx.tool.nailgun`, `sfx.tool.rivet`, `sfx.tool.extinguish`, `sfx.tool.camera_shutter`, `sfx.tool.binoculars`, `sfx.tool.saw_hand`, `sfx.tool.jackhammer`, `sfx.tool.wheelbarrow`, `sfx.tool.spray_hose`, `sfx.office.key`, `sfx.office.mouse`, `sfx.office.printer`, `sfx.office.paper`, `sfx.office.phone_ring`, `sfx.office.stamp`, `sfx.tray.wobble`, `sfx.tray.tray_spill`, `sfx.tray.glass_clink`, `sfx.tray.bill`, `sfx.weather.rain_start`, `sfx.world.traffic_light_tick`, `sfx.world.ship_bell`, `sfx.world.crowd_cheer`

Rendered: 250 ids (132 P0, 118 P1, 0 P2), passing: 250.
