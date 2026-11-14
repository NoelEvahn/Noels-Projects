# Annex E — Audio

Owner: Stage 3 (Opus) for the engine, ambience, music and P0/P1 sounds; Stage 6 (Sonnet) completes P2 sound patches. Gameplay and UI code trigger sounds by id only (MASTER_SPEC §5.8).

## 1. Constraints

| Constraint | Consequence |
|---|---|
| All audio is synthesised by our code with WebAudio. No samples, no audio files | Every sound is a **patch**: a function that builds a node graph or renders a buffer |
| AudioWorklet fails from `blob:` on `file://` (verified) | Only built-in nodes: Oscillator, AudioBufferSource, Gain, BiquadFilter, WaveShaper, Delay, Convolver, DynamicsCompressor, Panner, StereoPanner, ConstantSource. No AudioWorklet, no ScriptProcessor |
| Audio must start from a user gesture | `Audio.init()` is called in the Start click; if the context is still `suspended`, retry on the next pointer or key event |
| Cannot be auditioned in this container | Verification by offline rendering and signal analysis (section 8). A human listening pass is required before release (risk R12) |
| Memory | Cached buffers ≤ 24 MB (about 136 s of mono float at 44.1 kHz). Long sounds are live graphs, not buffers |
| CPU | ≤ 1.0 ms mean per frame of main-thread audio scheduling; ≤ 48 simultaneous voices at Ultra |

Patches MUST accept any `BaseAudioContext` so the same code renders in an `OfflineAudioContext` for tests.

## 2. Engine architecture (`audio/engine.js`, `audio/buses.js`)

```
voices ──► bus:sfx ───────┐
voices ──► bus:vehicles ──┤                         ┌─► reverb send ─► Convolver A/B (crossfaded) ─┐
loops  ──► bus:ambience ──┼─► per-bus Gain ─► per-bus Lowpass (occlusion) ─┴─────────────────────────┼─► master Gain ─► DynamicsCompressor (limiter) ─► destination
music  ──► bus:music ─────┤                                                                          │
ui     ──► bus:ui ────────┘ (ui bypasses lowpass and reverb) ────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| Buses | `music`, `ambience`, `sfx`, `vehicles`, `ui`, plus `master`. User volumes 0–1 per bus (settings), mapped with a squared curve |
| Limiter | `DynamicsCompressor`: threshold −8 dB, knee 6, ratio 12, attack 3 ms, release 200 ms. Master headroom so that typical mix RMS is about −20 dBFS |
| Reverb | Two `ConvolverNode`s crossfaded over 1.5 s when the environment changes. Impulse responses are generated: stereo noise × exponential decay × lowpass sweep. Set: `ir.open` (0.5 s, wet 0.06), `ir.city` (1.3 s, early slap, wet 0.12), `ir.forest` (0.9 s, dark, wet 0.14), `ir.room_small` (0.35 s, wet 0.18), `ir.room_large` (1.6 s boathouse/warehouse, wet 0.22), `ir.cabin` (0.5 s warm, wet 0.15) |
| Voice manager | Fixed pool sized by `settings.audio.voiceLimit` (16, 24, 32, 48). Each `play` has a priority class (ui 5, player 4, vehicle-own 4, job 3, world 2, ambient-oneshot 1). When full: steal the quietest voice of the lowest class; never steal a higher class. Sounds beyond their `maxDistance` are not started |
| Parameter smoothing | All gain and filter changes use `setTargetAtTime` or linear ramps ≥ 10 ms. No clicks |
| Update | `Audio.update(dt)` each frame: listener transform, environment blending, loop parameter updates (engine RPM, wind), stochastic schedulers, music sequencer lookahead (schedules 200 ms ahead) |

## 3. Synthesis toolkit (`audio/synth/`)

| Module | Technique | Used for |
|---|---|---|
| `noise.js` | Pre-rendered 2 s loopable white, pink (Kellet filter) and brown noise buffers with crossfaded ends | Wind, water, rain, tyres, breath, hiss |
| `env.js` | ADSR and multi-segment envelopes on AudioParams | Everything |
| `osc.js` | Oscillators and custom `PeriodicWave` tables (harmonic recipes) | Engines, tones, pads |
| `fm.js` | 2-operator FM (modulator gain into carrier frequency) | Electric piano, bells, marimba, UI tones |
| `pluck.js` | Karplus–Strong rendered in JS into buffers, one per pitch class and octave, cached | Guitar, ukulele, harp-like plucks, rope twang |
| `modal.js` | Impulse or noise burst through a bank of 3–8 resonant bandpass filters with per-mode decay | Wood knocks, metal clanks, glass, hull thumps, bells, buoys, crates |
| `grain.js` | Clouds of short enveloped noise or tone grains with randomised pitch, filter, pan, timing | Rain, fire crackle, gravel, leaves, splashes, crowd texture, sawdust |
| `formant.js` | Sawtooth or noise through 2–3 moving bandpass formants | Gull, crow, crowd murmur, loon, frog |
| `chirp.js` | Sine with pitch contour and amplitude modulation, phrase lists | Songbirds, crickets, woodpecker rhythm, UI blips |
| `engine.js` | Section 4.3 | All engines |
| `shaper.js` | WaveShaper curves (soft clip, fold) | Engines, chainsaw, distortion |
| `render.js` | `renderToBuffer(patch, seconds)` via `OfflineAudioContext`, with cache and a time-sliced pre-render queue | Complex one-shots |

One-shots that need more than about 6 nodes are rendered once to a mono buffer on first use (or pre-rendered per region in the background, one per frame) and then played from the buffer with pitch and gain variation (±6% pitch, ±2 dB, random start offset for textures) so repeats do not sound identical.

## 4. Spatialisation and motion

### 4.1 Positioning
- Listener = camera position and orientation.
- Spatial voices use `PannerNode`: `panningModel` `'HRTF'` for at most 6 voices nearest the listener when `settings.audio.hrtf` is on, otherwise `'equalpower'`; `distanceModel: 'inverse'`, `refDistance` and `maxDistance` per sound (table in section 6), `rolloffFactor` 1.
- Non-spatial: UI, music, ambience beds, the player's own vehicle interior layer.
- Occlusion (cheap): if the listener is in an interior and the source is outside (or the reverse), apply −9 dB and a 900 Hz lowpass on that voice.

### 4.2 Environment state (`Audio.setEnvironment`)
Inputs: region, district, interior id, time of day, weather type and intensity, wetness, underwater flag, player speed. Effects: ambience layer targets (section 5), reverb selection, bus lowpass (interior: ambience 1.2 kHz; inside a closed vehicle: ambience and world sfx 1.8 kHz, −4 dB; underwater: all but UI 400 Hz), wind and tyre layers.

### 4.3 Engine model (`audio/synth/engine.js`)

```
firing f = rpm / 60 × cylinders / 2
core   : PeriodicWave oscillator at f (harmonic recipe per engine) + sub oscillator at f/2
lump   : amplitude modulation at f/cylinders (uneven firing depth per engine)
drive  : WaveShaper (amount rises with load)
tone   : lowpass cutoff = 300 Hz + load × (1,800–4,000 Hz); resonant bandpass "exhaust" at 90–220 Hz
noise  : brown noise × (firing-rate tremolo) for exhaust; pink noise highpassed for intake at high rpm
extras : turbo whistle (sine 4–9 kHz, level by load), diesel clatter (grain bursts per firing), gear whine (sine ∝ speed)
output : interior and exterior versions (interior = lowpassed + more sub), crossfaded by camera mode
```

Inputs per frame: `rpm`, `load` (throttle 0–1), `speed`, `gearChange` trigger (short dip), `starting`, `stopping`. Doppler for other vehicles: `detune = 1200 × log2((c + vListener) / (c − vSource))` clamped to ±300 cents.

| Engine id | Vehicle | Cylinders / idle–redline rpm | Character |
|---|---|---|---|
| `eng.moto_small` | `veh.moto_125` | 1 / 1,400–9,000 | Thin, buzzy single |
| `eng.moto_twin` | `veh.moto_cafe` | 2 uneven / 1,100–7,500 | Thumping parallel twin, loud exhaust band at 140 Hz |
| `eng.car_i4` | hatch, sedan, taxi | 4 / 800–6,500 | Smooth, muffled |
| `eng.car_v6` | pickup, coupe | 6 / 750–7,000 | Deeper, growl under load |
| `eng.van_diesel` | `veh.van` | 4 diesel / 800–4,500 | Clatter grains, turbo whistle |
| `eng.truck_diesel` | boxtruck, logtruck | 6 diesel / 650–2,800 | Low rumble, strong turbo, air-brake hiss on stop |
| `eng.forklift` | `veh.forklift`, `veh.utv` | electric whine / small 2-cyl | Sine whine ∝ speed + reverse beeper |
| `eng.outboard` | rowboat outboard, skiff, console | 2-stroke 2 / 900–5,500 | Raspy, with water gurgle layer (bubbling bandpassed noise) |
| `eng.boat_diesel` | trawler, workboat, ferry | 6 slow diesel / 450–1,800 | Chugging thump with hull resonance (modal lows) |
| `eng.chainsaw` | chainsaw | 1 two-stroke / 2,800–12,000 | Harsh, shaped, bogs down (rpm and lowpass drop) under cut load |

## 5. Ambience system (`audio/patches/ambience.js`)

Three kinds of ambience, mixed by `Audio.setEnvironment`:

1. **Beds**: continuous non-spatial stereo loops built from live graphs (noise + filters + slow LFOs). Crossfade time 3 s.
2. **Emitters**: spatial loops attached to world positions (registered by POI or archetype anchor); started within `maxDistance`, stopped beyond it.
3. **Schedulers**: Poisson-timed one-shots at random positions around the listener (distance 15–80 m), rates by region, hour and weather.

| Bed id | Recipe | Active when |
|---|---|---|
| `amb.city.traffic_hum` | Brown noise, lowpass 220 Hz + bandpass 90 Hz with slow level LFO; distant tyre hiss layer (pink, bandpass 1.2 kHz, low level) | City districts; level by hour multiplier (Annex B §8) |
| `amb.city.crowd` | Formant babble: 6 detuned formant voices with random syllable envelopes, heavily blended | Pedestrian density > 4 nearby |
| `amb.city.hvac` | Hum 100/120 Hz + filtered noise | Downtown, industrial, night emphasis |
| `amb.wind.open` | Pink noise through a bandpass (300–900 Hz) whose frequency and gain follow a gust LFO; stereo decorrelated | Everywhere; level by wind speed and altitude |
| `amb.wind.trees` | White noise highpassed 2 kHz with flutter AM (leaf rustle) | Forest, lake shore, parks; by wind |
| `amb.wind.pines` | Pink noise bandpass 500 Hz, slow swell (soughing) | Conifer areas |
| `amb.water.lake_lap` | Grain clusters of lowpassed noise "laps" every 1.5–4 s + soft continuous wash | Within 40 m of lake or pond shore |
| `amb.water.river` | Continuous pink noise bandpass 700 Hz–2 kHz with fast random AM | Near the river, creek, weir (louder) |
| `amb.water.ocean_waves` | Wave cycle synthesis: 7–11 s period envelope shaping brown→white noise sweep (approach, break, hiss retreat) with random period and stereo movement | Within 150 m of the ocean shore; harbour version quieter and shorter |
| `amb.water.harbor` | Small slaps (modal + noise) against hulls and piles, gentle wash | Harbour, marina, docks |
| `amb.rain.light` / `amb.rain.heavy` | Dense grain cloud (highpassed noise ticks) + pink wash; surface-dependent layer (roof drumming indoors, patter on water, hiss on asphalt) | Weather rain/storm; by intensity |
| `amb.night.crickets` | Pulsed 4.2–4.8 kHz tones in 3 detuned groups with independent rhythm | 20:00–05:00, not city core, not in rain |
| `amb.night.frogs` | Formant croaks in call-and-response | Night at lake, ponds |
| `amb.forest.day` | Sparse insect buzz (narrow bandpassed noise), very low level | Forest by day |
| `amb.interior.room` | Low room tone (brown noise at −50 dB) + fridge hum where relevant | Interiors |
| `amb.interior.diner` | Kitchen sizzle, extractor fan, muffled crowd | `int.diner`, restaurants |
| `amb.interior.vehicle` | Cabin rumble by speed + wind hiss by speed² | Inside vehicles |
| `amb.boat.hull` | Water rush by speed + hull slaps by wave impacts | On boats |

| Emitter id | Recipe | Where |
|---|---|---|
| `amb.emit.fountain` | Bright filtered noise + drip grains | Founders Park |
| `amb.emit.neon_buzz` | 120 Hz saw, bandpassed, flicker | Signs at night |
| `amb.emit.generator` | Small engine loop | Construction site, food trucks |
| `amb.emit.rigging` | Random metallic clinks (modal, high) + rope creaks (bandpassed saw glide) | Marina, harbour masts |
| `amb.emit.flag` | Flutter bursts of filtered noise | Flagpoles, awnings in wind |
| `amb.emit.campfire` / `amb.emit.fireplace` | Crackle grains + low roar | Campsites, cabins |
| `amb.emit.sawmill` | Blade whine (saw with rising pitch under load) + conveyor rattle | Sawmill |
| `amb.emit.weir` | Loud broadband water | Weir, cascades |
| `amb.emit.buoy_bell` | Modal bell struck by wave timing | Harbour mouth |
| `amb.emit.lighthouse_horn` | Low two-tone horn, 30 s interval, fog only | Lighthouse |
| `amb.emit.crane` | Electric whine, clanks | Terminal, construction |
| `amb.emit.pa_station` | Formant "announcement" murmur | Bus terminal |
| `amb.emit.dock_creak` | Wood creaks (slow filtered saw glides), rope stretch | Docks, boathouse |
| `amb.emit.power_hum` | 60 Hz + harmonics | Utility poles, substations |

| Scheduler id | Recipe | Rate (per minute, peak) |
|---|---|---|
| `amb.once.bird_song_a/b/c` | Chirp phrases (3 species: trills, two-note calls, warbles) | Forest 10, lake 7, parks 4; dawn × 2 |
| `amb.once.gull` | Formant cry, descending, 2–4 repeats | Ocean 6, city docks 2 |
| `amb.once.crow` | Harsh formant caw × 1–3 | Forest yard 3, city 0.3 |
| `amb.once.loon` | Sine with slow rising yodel + reverb | Lake at dusk and night 0.5 |
| `amb.once.owl` | Soft low hoots | Forest night 0.4 |
| `amb.once.woodpecker` | Rapid modal wood knocks burst | Forest day 0.6 |
| `amb.once.dog_bark` | Formant barks | Residential 0.4 |
| `amb.once.car_horn` | Two detuned square-ish tones | City 1.5 |
| `amb.once.siren` | Sweeping tone pair, distant, lowpassed | City 0.15 |
| `amb.once.boat_horn` | Low horn | Harbour 0.2 |
| `amb.once.chainsaw_far` | Distant, lowpassed `eng.chainsaw` phrase | Forest day 0.3 |
| `amb.once.thunder` | Noise burst → lowpass sweep, long rumble tail with random re-triggers | Storm 1.2; delay after flash by distance |
| `amb.once.fish_jump` | Small splash | Lake dawn and dusk 1 |
| `amb.once.train_far` | Low horn + rumble (off-map) | City night 0.05 |

## 6. Sound inventory (`data/sounds.js`)

Record: `{ id, bus, kind:'oneshot'|'loop'|'engine', spatial, refDistance, maxDistance, priority, patch, prio:'P0'|'P1'|'P2', rms:[min,max], centroid:[minHz,maxHz], seconds }`.

### 6.1 UI (`bus: ui`, non-spatial)

| Id | Recipe | Prio |
|---|---|---|
| `sfx.ui.click` | 2 ms noise tick + 2.4 kHz sine blip, 40 ms | P0 |
| `sfx.ui.hover` | Soft 1.8 kHz blip, −12 dB | P1 |
| `sfx.ui.back`, `sfx.ui.open`, `sfx.ui.close` | Short FM tones (down, up-sweep, down-sweep) | P0 |
| `sfx.ui.toggle_on` / `_off` | Two-note rise / fall | P1 |
| `sfx.ui.error` | Two low detuned buzz pulses | P0 |
| `sfx.ui.confirm` | Major third FM chime | P0 |
| `sfx.ui.notify` | Soft marimba two-note | P0 |
| `sfx.ui.phone_open` / `_close` | Whoosh (bandpassed noise sweep) + click | P1 |
| `sfx.ui.type` | Random-pitched key tick | P1 |
| `sfx.ui.slider` | Granular ticks by movement | P2 |
| `sfx.ui.map_ping` | Sine ping with echo | P1 |
| `sfx.money.cash_register` | Mechanical clunk (modal) + bell (FM, 2.6 kHz) + drawer slide (noise sweep) | P0 |
| `sfx.money.coins` | 4–8 modal metallic pings, random | P0 |
| `sfx.money.pay` | Card beep (two sines) | P0 |
| `sfx.money.income_tick` | Tiny chime for hourly business income | P1 |
| `sfx.money.big_purchase` | Chord chime + low thump | P1 |
| `sfx.level_up` | Rising arpeggio (FM bells) | P0 |
| `sfx.job.task_ok` / `task_perfect` / `task_fail` | Short chimes / chime + sparkle / low buzz | P0 |
| `sfx.job.shift_start` / `shift_end` | Whistle-like tone / time-clock punch (modal) | P1 |
| `sfx.build.place` / `remove` / `invalid` | Wood knock (modal) / reverse knock / dull thud | P1 |

### 6.2 Player and foley (`bus: sfx`, spatial at the player)

| Id | Recipe | Prio |
|---|---|---|
| `sfx.step.asphalt`, `.concrete`, `.cobble`, `.paver`, `.tile`, `.carpet` | Heel (lowpassed click) + sole scuff (bandpassed noise); hardness and brightness per surface | P0 (asphalt, concrete), P1 |
| `sfx.step.wood`, `.metal` | Modal resonance (hollow wood on docks: 180/420/900 Hz; metal: bright ring) | P0 wood |
| `sfx.step.grass`, `.forestfloor`, `.dirt`, `.gravel`, `.sand`, `.mud`, `.snow` | Grain bursts: soft swish, twig snaps (rare), crunch, squelch | P0 (grass, dirt), P1 |
| `sfx.step.water_shallow` | Splash grains + slosh | P1 |
| `sfx.player.jump`, `.land_soft`, `.land_hard` | Cloth swish, thump by surface | P1 |
| `sfx.player.cloth` | Faint swish on run cycles | P2 |
| `sfx.player.breath_tired` | Filtered noise breaths at low energy | P2 |
| `sfx.player.eat`, `.drink` | Crunch grains / gulps (formant pops) | P1 |
| `sfx.player.sleep` | Soft descending pad | P1 |
| `sfx.item.pickup`, `.drop`, `.carry_set` | Cloth + thump variants by weight | P0 |
| `sfx.door.open`, `.close`, `.locked` | Latch click (modal) + hinge creak (saw glide) + wood thump | P0 |
| `sfx.door.shop_bell` | Small bell (modal, 2 partials) | P1 |
| `sfx.door.garage_roll` | Rattle grains over motor hum | P1 |
| `sfx.door.sliding` | Roller rumble + stop clunk | P2 |
| `sfx.switch.light` | Click | P2 |
| `sfx.npc.murmur_a/b/c` | Short formant babble phrases (greeting, thanks, complaint tones) | P1 |
| `sfx.npc.whistle_hail` | Two-tone whistle (taxi hail) | P1 |

### 6.3 Vehicles (`bus: vehicles`)

| Id | Recipe | Prio |
|---|---|---|
| `eng.*` (10 engines, section 4.3) | Engine model loops | P0: `car_i4`, `van_diesel`, `outboard`; P1: rest |
| `sfx.veh.start`, `.stop` | Starter whirr (pulsed saw) → catch → idle; shutdown shudder | P0 |
| `sfx.veh.door_open`, `.door_close` | Latch + seal thump (modal low + noise) | P0 |
| `sfx.veh.horn_car`, `.horn_truck`, `.horn_moto` | Detuned tone pairs | P1 |
| `sfx.veh.tyre_roll` (loop) | Noise by speed; filter by surface (asphalt hiss, cobble rumble with periodic thumps, gravel crunch grains, wet spray hiss) | P0 |
| `sfx.veh.skid` (loop) | Resonant bandpassed noise 800 Hz–1.4 kHz, level by slip | P0 |
| `sfx.veh.brake_squeal` | Narrow 2.8 kHz resonance at low speed, hard brake | P2 |
| `sfx.veh.suspension_thump` | Modal low thump + rattle by impulse | P0 |
| `sfx.veh.crash_light`, `.crash_heavy` | Metal crunch (modal cluster + noise burst), glass tinkle grains on heavy | P0 |
| `sfx.veh.scrape` (loop) | Metal-on-concrete noise | P2 |
| `sfx.veh.indicator`, `.reverse_beep`, `.handbrake`, `.gear_shift` | Clicks, 1 kHz beeps, ratchet, clunk | P1 |
| `sfx.veh.fuel_pump` (loop), `.fuel_cap`, `.fuel_done` | Pump hum + gurgle, click, clunk | P1 |
| `sfx.veh.air_brake` | Noise burst with falling lowpass | P1 |
| `sfx.veh.wind` (loop) | Pink noise by speed² | P0 |
| `sfx.veh.taxi_meter`, `.passenger_in`, `.passenger_out` | Tick, door + seat | P1 |
| `sfx.veh.forklift_mast` (loop), `.pallet_set`, `.pallet_drop` | Hydraulic whine, wood thump, crash | P1 |
| `sfx.veh.crane_slew` (loop), `.crane_hook`, `.container_lock`, `.container_set` | Motor whine, clank, twist-lock clunk, deep boom | P2 |
| `sfx.veh.loader_grapple`, `.log_drop`, `.log_roll` | Hydraulic + wood modal lows | P1 |

### 6.4 Boats and water

| Id | Recipe | Prio |
|---|---|---|
| `sfx.boat.wake` (loop) | White noise bandpass by speed, stereo spread | P0 |
| `sfx.boat.bow_slap` | Low thump + spray burst on wave impact | P1 |
| `sfx.boat.hull_bump`, `.dock_bump` | Modal thud (aluminium ring for the skiff, dull for wood) | P0 |
| `sfx.boat.rope_tie`, `.rope_throw`, `.cleat` | Creak, whoosh, thunk | P1 |
| `sfx.boat.oar_stroke` | Water swirl grains + rowlock clunk | P1 |
| `sfx.boat.anchor_chain` | Rapid modal clinks | P2 |
| `sfx.boat.horn` | Low horn | P1 |
| `sfx.boat.winch` (loop), `.net_out`, `.net_in`, `.net_tear` | Motor grind, wet rope run, heavy drips, rip (noise burst) | P1 |
| `sfx.boat.bilge`, `.sonar_ping` | Pump gurgle, sine ping with echo | P2 |
| `sfx.water.splash_small`, `.splash_big`, `.wade`, `.drip` | Splash synthesis: noise burst with fast rising then falling bandpass + bubble chirps | P0 small, P1 rest |
| `sfx.water.pour`, `.bail` | Filtered noise glug | P2 |

### 6.5 Fishing

| Id | Recipe | Prio |
|---|---|---|
| `sfx.fish.cast_whoosh` | Fast bandpassed noise sweep (rod swish) | P0 |
| `sfx.fish.line_out` | High ratchet whirr (pulsed noise) fading | P0 |
| `sfx.fish.bobber_plop` | Small splash + low "bloop" sine drop | P0 |
| `sfx.fish.nibble`, `.bite` | Tiny blips of water; bite adds a tug thunk | P0 |
| `sfx.fish.reel` (loop) | Clicking ratchet, rate by reel speed | P0 |
| `sfx.fish.drag_scream` (loop) | Fast high ratchet when the fish runs | P0 |
| `sfx.fish.line_tension` (loop) | Thin sine "sing" rising with tension | P1 |
| `sfx.fish.line_snap` | Sharp twang (pluck) + whip noise | P0 |
| `sfx.fish.thrash` | Repeated splashes | P0 |
| `sfx.fish.landed` | Wet flop (modal low + splash) + success chime | P0 |
| `sfx.fish.net_scoop`, `.cooler_lid`, `.scale_beep`, `.fillet_cut` | Water scoop, plastic thunk, beep, wet slice | P2 |

### 6.6 Forest and tools

| Id | Recipe | Prio |
|---|---|---|
| `sfx.tool.axe_swing`, `.axe_chop`, `.axe_stuck` | Swish; woody crack (modal 300/700/1,500 Hz + noise snap); dull thunk | P1 |
| `eng.chainsaw` + `sfx.tool.chainsaw_start`, `.chainsaw_cut` (loop layer), `.chainsaw_kick` | Pull-cord rattle then catch; cutting adds gritty noise and load; kickback bark | P1 |
| `sfx.tree.crack`, `.fall`, `.impact` | Slow splintering cracks (grain bursts, descending), rustling whoosh, ground thud with branch crackle | P1 |
| `sfx.tool.saw_hand` (loop) | Rhythmic bandpassed noise strokes | P2 |
| `sfx.tool.dig`, `.tamp`, `.plant` | Gritty scoop, thuds | P2 |
| `sfx.tool.hammer`, `.nailgun`, `.rivet`, `.jackhammer` (loop), `.wheelbarrow` (loop) | Modal hits; pneumatic pop; fast pulsed impacts; squeaky wheel + rattle | P2 |
| `sfx.tool.wrench_ratchet`, `.impact_gun`, `.torque_click`, `.oil_drain`, `.hood` | Ratchet clicks, burst whirr, click, glug, thump | P1 |
| `sfx.tool.spray_hose` (loop), `.extinguish` | Hiss, steam burst | P2 |
| `sfx.tool.camera_shutter`, `.binoculars` | Click, soft swish | P2 |
| `sfx.fire.ignite`, `sfx.fire.loop` | Whoomp, crackle grains | P1 |

### 6.7 Work environments

| Id | Recipe | Prio |
|---|---|---|
| `sfx.kitchen.chop`, `.sizzle` (loop), `.flip`, `.fryer` (loop), `.plate`, `.bell`, `.burn`, `.fridge_door`, `.pour_coffee`, `.espresso` (loop) | Knife knocks, crackly highpassed noise, scrape, bubbling, ceramic clink (modal), order bell, harsh hiss, seal thump, pour, pump hum + hiss | P0: chop, sizzle, plate, bell; P1 rest |
| `sfx.shop.scan_beep`, `.belt` (loop), `.bag`, `.till_open`, `.shelf_place`, `.cart_roll` (loop) | Beep, motor, rustle, drawer, box thud, rattle | P1 |
| `sfx.parcel.pickup`, `.drop`, `.doorbell`, `.sign` | Cardboard thuds, ding-dong (FM), pen scratch | P0 |
| `sfx.office.key` , `.mouse`, `.printer`, `.paper`, `.phone_ring`, `.stamp` | Ticks, whirr, rustle, FM ring, thump | P2 |
| `sfx.vend.restock`, `.coin_box`, `.dispense`, `.jam`, `.repair` | Can clatter (modal), coins, drop thunk, buzz, ratchet | P0 |
| `sfx.dock.crate_set`, `.ice_shovel`, `.fish_dump`, `.conveyor` (loop) | Wood thump, crunch, wet slap cascade, rumble | P1 |
| `sfx.rental.life_jacket`, `.boat_push`, `.whistle` | Fabric, wood scrape + splash, pea whistle | P1 |
| `sfx.tray.wobble`, `.tray_spill`, `.glass_clink`, `.bill` | Rattle, crash of glass and plates, clink, paper | P2 |

### 6.8 Weather and world one-shots

`sfx.weather.rain_start`, `sfx.weather.lightning_crack` (near strike), `sfx.weather.gust`, `sfx.world.traffic_light_tick`, `sfx.world.crossing_beep`, `sfx.world.bus_brake`, `sfx.world.church_bell` (hourly, Old Town), `sfx.world.ship_bell`, `sfx.world.crowd_cheer` (business opening), `sfx.world.construction_clank`. Priority P1–P2.

Totals: about 190 ids. Each is a row in `data/sounds.js`; Stage 4 may call any id before its patch exists (the engine logs once and plays nothing).

## 7. Music (`audio/music/`)

### 7.1 Approach
A generative sequencer plays **suites** composed by us as data: key, mode, tempo, chord progressions, bass patterns, drum patterns, motifs and instrument patches. A seeded melody generator picks chord tones and passing notes around each suite's motif, so pieces vary without sounding random. A piece lasts 2–3 minutes (intro, A, B, A′, outro), followed by 40–90 s without music (ambience only). Context changes crossfade at the next bar line over 4 beats.

| Instrument patch | Synthesis |
|---|---|
| `ins.ep` electric piano | 2-op FM, ratio 1:1 and 1:14 tine, tremolo |
| `ins.pad` | 3 detuned saws → lowpass with slow envelope → chorus (two modulated delays) |
| `ins.strings` | Saw + slow attack, bandpass formant, vibrato |
| `ins.bass` | Sine + filtered saw, short decay |
| `ins.guitar`, `ins.ukulele` | Karplus–Strong buffers (different damping and pitch range), strum = 15–30 ms staggered notes |
| `ins.marimba` | FM 1:4 with fast decay + modal tap |
| `ins.flute` | Sine + filtered breath noise, delayed vibrato |
| `ins.piano` | Karplus–Strong body + FM attack, per-note lowpass by velocity (approximation; stated honestly) |
| `ins.bell` | FM inharmonic ratios |
| `ins.kick`, `ins.snare`, `ins.hat`, `ins.brush`, `ins.shaker`, `ins.rim` | Sine pitch drop; noise + 180 Hz tone; highpassed noise; swept pink noise; grain bursts; modal click |

### 7.2 Suites

| Id | Context | Key / mode | Tempo | Instrumentation | Feel |
|---|---|---|---|---|---|
| `mus.menu` | Main menu | D major ↔ B minor | 84 | piano, pad, strings, sparse guitar | Hopeful main theme; the 8-note motif recurs in other suites |
| `mus.city.day` | City, day | F major, ii–V–I with 7ths and 9ths | 78 swing | ep, bass, brush kit, pad | Relaxed jazz-hop |
| `mus.city.night` | City, night | D minor (dorian) | 64 | pad, ep sparse, sub bass, rim | Late-night neon ambience |
| `mus.lake.day` | Lake, day | G major, 6/8 | 92 | fingerpicked guitar, pad, flute answers | Calm, pastoral |
| `mus.lake.night` | Lake, night | E minor | 60 | guitar harmonics (high plucks), pad | Still, spacious |
| `mus.ocean.day` | Ocean, day | C major, I–V–vi–IV family | 104 | ukulele strum, marimba, shaker, bass | Breezy |
| `mus.ocean.night` | Ocean, night | A minor | 66 | marimba slow, pad, bell | Moonlit |
| `mus.forest.day` | Forest, day | D dorian | 70 | pad drones, flute, sparse guitar, bell | Misty, open |
| `mus.forest.night` | Forest, night | C minor (aeolian) | 52 | dark pad, low strings, distant bell | Quiet tension |
| `mus.layer.work` | During a job shift (`activity:'work'`) | follows suite | +6% | adds rim/shaker pulse and a bass ostinato | Focus |
| `mus.layer.drive` | Driving or boating (`activity:'drive'`) | follows suite | +10% | fuller drums and bass, brighter filter | Motion |
| `mus.sting.levelup`, `.business_open`, `.purchase_big`, `.newday`, `.fail`, `.milestone` | Stingers, 1.5–4 s, on `bus:music` with ducking | | | bell, ep, strings | |

### 7.3 Mixing rules
- Music bus default −6 dB relative to ambience peaks; user volume applies on top.
- `Mixer.duck(bus, dB, attack, hold, release)`: music −8 dB while a stinger plays or a blocking dialog with sound is open; ambience and music −4 dB for 1.5 s on `sfx.veh.crash_heavy` and thunder; ambience −3 dB during job minigame timing cues so cues are audible.
- Music lowpasses to 2.5 kHz when a phone screen or pause menu is open.
- Night variants also apply a gentle lowpass (6 kHz) and wider reverb.

## 8. Verification (runs in headless Chromium, `test/audio/audio.spec.cjs`)

For every id in `data/sounds.js`, `Audio.renderOffline(id, seconds)` and assert:

| Check | Criterion |
|---|---|
| Validity | No NaN or Infinity; length > 0; not all zeros |
| Peak | ≤ 0.98; one-shots ≥ 0.2 (audible) |
| Level | RMS within the record's `rms` range (default one-shot 0.03–0.35 over its active part; loops 0.03–0.25) |
| Spectrum | Spectral centroid (computed by FFT in the test) within the record's `centroid` range. Examples: `eng.truck_diesel` 80–700 Hz; `sfx.ui.click` 1.5–6 kHz; `amb.night.crickets` 3.5–5.5 kHz; `amb.city.traffic_hum` 60–500 Hz |
| Duration | One-shots end (tail below −60 dB) within `seconds` + 20% |
| Loop seam | Buffer loops: discontinuity between last and first 64 samples below 0.02. Live-graph loops: RMS of the first and last second within 3 dB |
| Engines | Rendered at idle, mid, redline: fundamental (autocorrelation peak) rises monotonically with rpm and matches `rpm/60 × cyl/2` within 8% |
| Music | Each suite scheduled for 40 s offline: ≥ 20 note onsets; ≥ 90% of pitched notes in the suite's scale; RMS 0.03–0.2; no clipping |
| Mix | Full scene render (city day: beds + 6 one-shots + engine + music) peaks ≤ 0.98 after the limiter; RMS −24 to −14 dBFS |
| Budget | Cached buffer bytes ≤ 24 MB after pre-rendering all one-shots; node count for the full scene ≤ 400 |

A WAV dump tool (`tools/audio-dump.mjs`, via Playwright) writes any id to `tmp/audio/*.wav` for a human to audition; these files are never committed.
