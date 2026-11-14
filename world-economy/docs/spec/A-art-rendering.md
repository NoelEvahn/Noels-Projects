# Annex A — Art direction and rendering

Owner: Stage 3 (Opus). Stage 2 implements only the blockout subset. Performance budgets referenced here are defined in Annex G and are binding.

## 1. Art direction pillars

| Pillar | Rule |
|---|---|
| Light first | Every scene is carried by a strong key light (sun or moon), soft sky fill, and visible atmosphere between camera and background. Flat ambient-only lighting is a defect |
| Haze and depth | Distant objects desaturate and shift toward the sky colour. All 15 references show aerial haze; no view has a crisp horizon |
| Worn, not clean | Surfaces carry dirt, moss, rust, water stains, dust. Roughness varies across a surface. Uniform colour on any surface larger than 2 m is a defect |
| Dense silhouettes | Roof lines, masts, power lines, tree crowns, fire escapes, antennas. Skyline edges are never plain boxes |
| Grounding | Every object meets the ground with contact shadow or ambient occlusion and a dirt/grass/kerb transition |
| Restraint | Muted, filmic palette; saturated colour only as accent (awnings, buoys, tail lights, the red motorcycle tank) |

## 2. Reference → requirement table

"Gap" states honestly what will not be matched.

| # | Reference | What it defines | Requirements derived | Gap / approximation |
|---|---|---|---|---|
| 1 | `17423c69` brick street under suspension bridge | Old Town identity: red-brown brick lofts, sash windows, red awnings, fire escape, wall AC units, cobbles, bike dock, map kiosk, dusty parked cars, blue steel bridge tower with X-bracing and cables, warm dusty sun shafts | `city.oldtown` district; archetypes `bld.brick_loft`, `bld.brick_walkup`; `tex.brick_red`, `tex.cobble`; props `prop.bike_dock`, `prop.map_kiosk`, `prop.ac_unit`, `prop.fire_escape`, `prop.awning`; Harlan Bridge with lattice towers, suspender cables, truss deck; dust haze + god rays at low sun; vehicle dirt layer | Brick is a normal-mapped plane with recessed windows, not displaced geometry. Cables are thin tubes at LOD0 and lines beyond. Dust is fog + particles, not volumetric |
| 2 | `850129f6` glass downtown boulevard | Downtown identity: dark curtain-wall towers, podium buildings, 6-lane boulevard with median trees, steel footbridge with stairs, park with curved paths, hazy sun, layered skyline fading to blue | `city.downtown`; `bld.glass_tower`, `bld.podium_mall`, `bld.office_midrise`; `tex.glass_curtain` with sky reflection (environment map) and interior-mapping shader; `prop.footbridge`; Founders Park; street trees every 12 m; far-skyline proxy layer with aerial perspective | Reflections are environment-map based (no ray tracing); other buildings do not reflect in glass |
| 3 | `2e5b85c5` mid-size street | Midtown identity: mixed brick and white panel mid-rises, wooden utility poles with wires, lamp posts, traffic lights, parasols, pedestrians, police car, sloping street | `city.midtown`; `bld.panel_midrise`, `bld.mixed_use`; `prop.utility_pole` + wire spans, `prop.traffic_light`, `prop.parasol`, `prop.planter`; pedestrian crowd; ambient police car; gentle slope in Northgate | Pedestrians are procedural figures (R4) |
| 4 | `c3182ce3` boathouse interior | Lake identity: dark weathered timber frame, plank floor with gaps, open side to water, rowboat with outboard, stacked crates, hanging hook, green reflective water, conifer far shore, angler | `bld.boathouse` with real interior (`int.boathouse`); `tex.wood_weathered_dark`, `tex.planks_dock`; `boat.rowboat`; `prop.crate_wood`, `prop.hook_chain`, `prop.rope_coil`; interior exposure adaptation; lake water with reflection and depth colour | Interior bounce light is faked with a low fill light and AO; water reflection is planar on Ultra, environment-based otherwise |
| 5 | `7ffa5ed1` skiff on dark lake | Lake vista: dark tannin water with sky reflection and shallow sand patches, snow-capped peak, forested ridges, aluminium skiff with outboard and wake | Mt. Sable backdrop mesh with snow line; forest ridge impostor layers; `boat.skiff`; wake and spray particles; shallow-water colour by depth | Wake is particles + normal perturbation decal, not fluid simulation |
| 6 | `7ee5b686` first-person fishing | Fishing view: rod in first person with line and guides, wooden footbridge, pines, lichen rocks, red-roof plank cabin, haze | First-person rod view model with bending rod and line; `prop.footbridge_wood`; `bld.cabin_plank` with `tex.roof_metal_red`; `veg.pine_a/b`; `prop.rock_*` with moss blend | — |
| 7 | `055be370` fishing harbour | Port Calder identity: crowded weathered boats, blue steel trawler with rust streaks, masts and rigging, orange booms, calm green harbour water, cumulus clouds | `ocean.portcalder`; `boat.trawler` (blue and red liveries), `boat.workboat`, moored ambient boats ≥ 14; rigging lines; `tex.paint_chipped`, `tex.rust`; cumulus cloud layer | Boat count is limited by the triangle budget; far boats use LOD2 |
| 8 | `30af027d` tropical beach | Palm Cove identity: leaning coconut palms, pale sand, dark volcanic rocks, turquoise water with sun sparkle and soft foam edge | `ocean.palmcove`; `veg.palm_a/b` with curved trunks; `tex.sand_pale`; `prop.rock_dark_*`; ocean shader with depth-based turquoise → deep blue, sun glitter, shoreline foam | Refraction and caustics are approximated (depth tint + animated caustic texture in shallows) |
| 9 | `1b25c2d7` seafood market and marina | Marina identity: striped awnings, timber boardwalk with rope-wrapped piles, white yachts, centre-console boats, lighthouse, gulls, golden haze | `ocean.marina`; `bld.market_stall` with striped canvas; `prop.pile_rope`, `prop.crab_pot`, `prop.fish_crate`; `boat.console`, `boat.yacht` (ambient); `bld.lighthouse`; `ani.gull` flock; golden-hour grade | — |
| 10 | `930a4ddc` wet forest road | Forest road identity: wet asphalt reflecting sky, double yellow line, moss boulders, ferns, broadleaf canopy, mist | Old Forest Road; wetness system (roughness ↓, darkening, puddle mask); `tex.asphalt` + lane-marking decals; `veg.fern`, `veg.oak_a`, `prop.rock_mossy`; height fog | Wet-road reflections are roughness-driven environment reflection, plus screen-space reflection on Ultra |
| 11 | `cb196448` log cabin interior | Cabin identity: horizontal plank walls, round log rafters and log floor, stone fireplace with fire, workbench, stump stool, wall torch | `int.cabin_log`; `tex.log_round`, `tex.planks_wall`, `tex.stone_fieldstone`; fire particles + flickering point light; `prop.workbench`, `prop.stump`, `prop.anvil` | Soft shadows from the fire come from one flickering shadowless light plus AO |
| 12 | `bb0bd8b3` logging yard | Timberline identity: overcast, dark spruce, muddy yard, log piles, flatbed log truck with crane, corrugated sheds, pointed peak, crows | `forest.timberline`; overcast weather preset; `veh.logtruck`; `prop.log_pile`, `bld.shed_corrugated`; `tex.mud`, `tex.metal_corrugated`; `ani.crow` flock; dry grass tufts | — |
| 13 | `e310396b` misty pine dirt road | Deep forest identity: tall straight pines, dirt track with ruts, sun shafts through mist, mossy boulders, low ground cover | `tex.dirt_track`; god-ray pass strongest here; fog cards between trunks; dense `veg.pine_*` with LOD impostors; `veg.groundcover` | God rays are screen-space, visible only when the sun is on or near screen |
| 14 | `658cf520` cafe-racer motorcycle | Vehicle detail target: tubular frame, finned engine, spoked wheels with treaded tyres, chrome exhaust, round headlight with glass, worn red tank, fork gaiters | `veh.moto_cafe` at 30k triangles LOD0; chrome and painted metal with clearcoat; depth of field in showroom/photo mode only | Bolts, cables and logos are simplified; brand text replaced by fictional mark |
| 15 | `0b51ac10` red trawler model | Boat detail target: red hull with black rub rail, white wheelhouse with windows, mast with radar and antennas, A-frame gantry with blue nets, green winch, floodlights, life ring, red buoys, rudder and propeller | `boat.trawler` at 45k triangles LOD0 with every listed part as separate sub-generators; net as alpha-tested mesh cards; checker-plate deck texture | Net is not simulated cloth; it has a wind sway shader |

## 3. Render pipeline (`render/pipeline.js`)

Forward rendering, HDR (half-float targets), linear workflow, `renderer.outputColorSpace = SRGBColorSpace`, tone mapping done in the final pass.

| Order | Pass | Resolution (of internal) | Presets | Notes |
|---|---|---|---|---|
| 0 | Shadow cascades (CSM) | per preset | all except Low-off | 2–4 cascades, PCF soft, stabilised (texel-snapped) |
| 1 | Planar reflection (lake or sea, whichever is nearer and visible) | 0.5 | Ultra (High optional toggle) | Clipped at water plane; LOD-biased; no shadows, no particles |
| 2 | Opaque scene → HDR target with depth texture | 1.0 | all | MSAA ×4 when `antialiasing='msaa4'` (Ultra default) |
| 3 | Sky dome + clouds | 1.0 | all | Drawn after opaque with depth test, before water |
| 4 | Water + transparents | 1.0 | all | Samples opaque colour copy and depth (refraction tint, soft edges, foam) |
| 5 | GTAO | 0.5 | Medium (low), High, Ultra | Bilateral upsample; applied to ambient term approximation (multiply) |
| 6 | Screen-space reflection (wet roads, water detail) | 0.5 | Ultra only | Optional; off by default below Ultra |
| 7 | God rays (radial scatter from sun screen position, occlusion from depth) | 0.5, 32–48 samples | High, Ultra | Enabled only when sun elevation < 35° or fog > 0.3 and sun within 1.3 screen radii |
| 8 | Bloom (threshold 1.0 HDR, 5 mips) | 0.5 downsample chain | Medium+ | |
| 9 | Composite: tone map (ACES filmic), exposure (auto, slow adapt 1.5 s), colour grade (per-region lift/gamma/gain + saturation), vignette, grain, dithering | 1.0 | all (grade/grain toggle) | Single full-screen shader |
| 10 | AA: SMAA (High/Ultra when MSAA off) or FXAA (Medium) | 1.0 | per setting | |
| 11 | Upscale to canvas when resolution scale < 1 | — | all | Bilinear + light sharpening |

Rules: at most 2 full-resolution full-screen passes after the scene (composite, AA). Depth is reconstructed from the depth texture; there is no separate normal pre-pass (GTAO reconstructs normals from depth). The pipeline is built once per quality change, not per frame.

Per-region grade (applied by blending when `player:region` changes, 3 s lerp):

| Region | Temperature | Saturation | Contrast | Fog tint (day) | Fog density base |
|---|---|---|---|---|---|
| city | warm +6% (dusty) | 0.95 | 1.05 | `#cfc6b4` | 0.0016 |
| lake | neutral-cool | 0.92 | 1.02 | `#b9c8cf` | 0.0022 |
| ocean | warm +3%, cyan lift | 1.05 | 1.00 | `#d6e3e8` | 0.0012 |
| forest | green-cool −4% | 0.88 | 1.06 | `#aebcb2` | 0.0040 |

## 4. Lighting, sky, atmosphere, time and weather

### 4.1 Sun, moon, sky
- Sun direction from time of day (sunrise 06:00, sunset 20:00, max elevation 62°). Moon opposite with 0.08 intensity, cool colour.
- Sky: custom dome shader. Analytic gradient scattering (Rayleigh/Mie approximation, as in three's `Sky` addon, which MAY be used as a base) + sun disk + procedural cloud layer (2 octaves of baked tiling noise scrolled, lit by sun direction, coverage from weather) + stars and moon at night.
- Environment lighting: a 64² cube render of sky + far proxies, filtered with `PMREMGenerator`, refreshed when the sun moves > 3° or weather changes, amortised (one cube face per frame, then PMREM in a separate frame). Used as `scene.environment` for reflections and ambient.
- Hemisphere fill light matched to sky zenith and ground bounce colours.

### 4.2 Fog and aerial perspective (`render/fog.js`)
Patched into every world material (section 5.2): exponential distance fog × exponential height falloff, with sun-direction in-scatter tint: `fogColour = mix(fogBase, sunColour, pow(max(dot(viewDir, sunDir),0), 8) * 0.6)`. Density and height falloff come from region and weather. Fog cards (soft alpha quads with noise, ≤ 40 visible) add local mist in forest valleys and on the lake at dawn.

### 4.3 Shadows
Cascaded shadow maps (three `CSM` addon, practical split, fade between cascades), counts and sizes per preset in Annex G §3.3. Beyond the last cascade, objects rely on baked vertex AO and blob shadows. Interior lights do not cast shadows; the sun through openings does.

### 4.4 Night lighting
- Forward renderer limit: at most **8 dynamic local lights** active (`render/lightPool.js`), assigned each 0.25 s to the lamps and headlights nearest the camera, with intensity fade-in.
- All other lamps are emissive heads with bloom plus a **light-pool decal** (additive radial gradient quad on the ground, instanced), so streets read as lit.
- Windows: per-instance emissive on/off from a hash and the hour (more lit at 19:00–23:00, few after 01:00). Glass towers use the interior-mapping shader with lit/unlit rooms.
- Player vehicle headlights: one spot light (counts toward the 8); traffic headlights are emissive + light-pool decal + bloom.

### 4.5 Weather (`game/env/weather.js` state, visuals in `render/`)

| Type | Sky/cloud cover | Fog mult | Wetness | Wind | Particles | Regional bias |
|---|---|---|---|---|---|---|
| `clear` | 0.1–0.3 | 1.0 | 0 | low | dust motes (city), pollen (forest) | ocean, city |
| `cloudy` | 0.5–0.7 | 1.2 | 0 | medium | — | all |
| `overcast` | 0.95 | 1.6 | 0–0.2 | medium | — | forest |
| `mist` | 0.6 | 3.5 | 0.3 | low | fog cards × 2 | lake and forest at 05:00–09:00 |
| `rain` | 1.0 | 2.0 | 1.0 | medium | rain streaks (instanced lines in a camera-following volume), splash sprites, ripples on water | all |
| `storm` | 1.0 dark | 2.4 | 1.0 | high | rain × 2, lightning flash (sky + directional pulse), thunder audio | ocean |

Weather is a seeded Markov chain evaluated every 3 game hours with 20-minute transitions. Wetness drives a global uniform: albedo ×0.75, roughness → 0.15–0.35 on `surf.asphalt/cobble/concrete`, puddle mask from low-frequency noise.

## 5. Materials and textures

### 5.1 MatLib (`render/materials/matlib.js`)

```js
MatLib.get(matId, variant?) → THREE.Material     // cached; variant = {tint?, wet?:bool, emissive?, instanced?, doubleSided?}
MatLib.textureSet(texId) → {map, normalMap, ormMap} | null   // null while not yet baked (flat fallback colour is used)
MatLib.ensure(texIds[]) → Promise                // schedule bakes
MatLib.release(region)                           // LRU eviction hook
MatLib.stats() → {materials, programs, textureBytes}
```

All world materials are `MeshStandardMaterial` (or `MeshPhysicalMaterial` only for car paint clearcoat and glass, ≤ 6 such materials) created here. Direct `new MeshStandardMaterial` in `art/` or `blockout/` is forbidden (lint test).

### 5.2 Shared shader patches (`render/materials/patches.js`)
One `onBeforeCompile` chain, applied in fixed order, with a shared `customProgramCacheKey` so identical patch sets share programs:

1. CSM (from the addon's shader chunks).
2. Height fog and aerial perspective (4.2).
3. Macro variation: world-space low-frequency noise (sampled from a shared 256² noise texture) modulates albedo ±8% and roughness ±10% to break tiling.
4. Wetness and puddles (flagged surfaces only).
5. Wind vertex animation (vegetation, awnings, nets, flags; flagged only).
6. Per-instance attributes: tint, emissive on/off, dirt amount.
7. Optional triplanar mapping (terrain cliffs and rocks only).

Each flag combination is a distinct program; allowed combinations are enumerated in `patches.js` (≤ 24).

### 5.3 Texture library (`render/textures/library.js`)

Each set is three maps: **albedo** (sRGB), **normal** (tangent space, from a generated height field), **ORM** (R = AO, G = roughness, B = metalness). All tile seamlessly (periodic noise). Tier H = hero (1024² albedo and normal, 512² ORM on High), S = standard (512² on High), D = detail/small (256²). Per-preset sizes: Annex G §3.3.

| Texture id | Tier | Tile size (m) | Generator recipe (GLSL building blocks) | Used by |
|---|---|---|---|---|
| `tex.brick_red` | H | 2.4 | Running-bond brick cells, per-brick hue jitter, mortar recess, edge chipping, soot gradient, efflorescence stains | Old Town |
| `tex.brick_brown` | S | 2.4 | Same generator, darker palette, more soot | Old Town, industrial |
| `tex.brick_painted_white` | S | 2.4 | Brick height under flaking paint mask | Midtown |
| `tex.concrete_cast` | H | 4 | Fbm base, formwork panel lines, tie holes, drip stains, pores | Bridges, quays, sidewalks |
| `tex.concrete_panel` | S | 3 | Precast panels with joints, mild streaking | Midtown mid-rises |
| `tex.stucco` | S | 3 | Fine noise bumps, water stains under sills | Houses, port town |
| `tex.asphalt` | H | 6 | Aggregate speckle (Worley), cracks (ridged noise), tar patches, oil stains; wetness-ready roughness | Roads |
| `tex.asphalt_worn` | S | 6 | More cracks, faded | Alleys, lots |
| `tex.cobble` | H | 2 | Offset rows of rounded setts (Worley F1 cells stretched), worn tops, dirt-filled joints | Old Town streets |
| `tex.paver` | S | 2 | Herringbone pavers | Plazas, marina |
| `tex.curb_stone` | D | 1 | Granite speckle | Kerbs |
| `tex.glass_curtain` | S | 3.6 × 3.6 | Mullion grid mask, slight per-pane normal tilt, dirt at edges; alpha/metal channel marks glass vs frame | Towers |
| `tex.glass_window` | D | — | Smudge and dust roughness map | Windows, vehicles |
| `tex.metal_painted` | S | 2 | Smooth paint with edge wear mask, rivet rows optional | Bridge steel, street furniture |
| `tex.metal_galvanized` | S | 2 | Spangle pattern | Poles, railings |
| `tex.metal_corrugated` | S | 2 | Sine profile height, rust streaks from fasteners | Sheds, warehouses |
| `tex.metal_checker` | D | 0.5 | Diamond tread plate | Trawler deck, ramps |
| `tex.metal_aluminium` | D | 1 | Brushed anisotropic streaks, dents | Skiff |
| `tex.rust` | S | 2 | Layered fbm orange-brown, pitting | Blended by mask on metals |
| `tex.paint_chipped` | S | 2 | Paint layer over primer over rust via thresholded noise | Boats, signs |
| `tex.wood_planks` | H | 2 | Plank rows with gaps, grain (stretched noise + rings), knots, nail heads | Docks, floors, cabins |
| `tex.wood_weathered_dark` | H | 2 | Same, grey-brown, deep grain, splits | Boathouse, piles |
| `tex.planks_wall` | S | 2.4 | Horizontal boards, warmer tone | Cabin interiors |
| `tex.log_round` | S | 1 | Half-round profile height, bark-less grain, end checks | Log cabin |
| `tex.wood_painted` | S | 2 | Planks under worn paint | Boats, huts |
| `tex.bark_pine` | S | 1 × 2 | Vertical plated ridges | Conifers |
| `tex.bark_oak` | S | 1 × 2 | Deep furrows | Broadleaf |
| `tex.bark_palm` | D | 1 × 1 | Ring scars | Palms |
| `tex.leaf_atlas` | H | — | Canvas2D + SDF: 8 leaf/needle/frond cluster cards with alpha, baked normals | All foliage |
| `tex.grass_ground` | H | 4 | Blade direction noise, clover patches, dirt show-through | Parks, shores |
| `tex.forest_floor` | H | 4 | Needles, twigs, moss patches, small stones | Forest |
| `tex.moss` | D | 2 | Soft clumpy fbm | Blended on rocks, roofs, logs |
| `tex.dirt_track` | S | 4 | Compacted dirt, ruts, pebbles | Forest roads |
| `tex.mud` | S | 4 | Glossy low areas, tyre tracks | Logging yard |
| `tex.gravel` | S | 3 | Worley stones | Yards, shoulders |
| `tex.sand_pale` | H | 4 | Fine grain, wind ripples, wet band near water | Beach |
| `tex.sand_lake` | D | 4 | Coarser, darker | Lake shore |
| `tex.rock_granite` | H | 4 | Ridged multifractal, lichen spots, strata | Lake rocks, cliffs |
| `tex.rock_dark` | S | 4 | Basalt, pitted, wet sheen | Beach rocks, breakwater |
| `tex.stone_fieldstone` | S | 2 | Irregular Voronoi stones with mortar | Fireplace, walls |
| `tex.roof_shingle` | S | 2 | Overlapping asphalt shingles | Houses |
| `tex.roof_metal_red` | S | 2 | Standing seam, faded red, rust at seams | Cabins, sheds |
| `tex.roof_tile` | S | 2 | Clay barrel tiles | Port town |
| `tex.fabric_canvas` | D | 1 | Weave, stripe variants by uniform (red, blue-white, green) | Awnings, parasols |
| `tex.fabric_cloth` | D | 0.5 | Fine weave, used with tint for clothing and upholstery | Characters, seats |
| `tex.rubber_tire` | D | — | Tread pattern height (sidewall and tread UV zones) | Tyres |
| `tex.carpaint_flake` | D | 0.5 | Metallic flake normal noise | Vehicles |
| `tex.leather` | D | 0.5 | Pebble grain | Seats |
| `tex.plastic` | D | 0.5 | Fine bump | Interiors, crates |
| `tex.tile_floor` | D | 1 | Square tiles with grout | Diner, supermarket |
| `tex.plaster_interior` | D | 3 | Subtle trowel variation | Interiors |
| `tex.snow_rock` | D | 8 | Snow over rock by slope mask (Mt. Sable only) | Backdrop |
| `tex.water_normal_a/b` | S | 8 / 23 | Two tiling wave normal maps from summed periodic sines + noise | All water |
| `tex.foam` | D | 4 | Cellular foam mask | Shorelines, wakes |
| `tex.caustics` | D | 3 | Animated by scrolling two layers | Shallows |
| `tex.noise_shared` | D | — | RGBA: value, Worley, blue noise, fbm (256²) | Shader patches, particles |
| `tex.cloud_noise` | S | — | Tiling fbm + Worley | Sky clouds |

Canvas2D atlases (`render/textures/canvasTex.js`): `atlas.signage` (shop signs, street names, billboards from `data/strings.js`), `atlas.decals` (lane markings, crossings, arrows, manholes, stains, parking bays), `atlas.plates` (licence plates, boat registration), `atlas.ui_world` (map kiosk, menus, price boards rendered from live sim data on demand), `atlas.particles` (smoke puff, splash, spark, leaf, drop, dust, flare). Each ≤ 2048² on High.

### 5.4 Baking pipeline (`render/textures/texbaker.js`)

```js
TexBaker.bake(texId, size) → Promise<{map, normalMap, ormMap, bytes}>
```
1. A recipe is a GLSL fragment function `vec4 height_albedo(vec2 uv)` plus `vec3 orm(vec2 uv, float h)` built from a shared GLSL library (`glsl/noise.js`: hash, periodic value/gradient/Worley noise, fbm, ridged; `glsl/patterns.js`: bricks, planks, tiles, cells, weave; `glsl/weather.js`: stains, rust, moss masks).
2. Pass 1 renders height + albedo into a mipmapped sRGB RGBA8 target (alpha = height).
3. Pass 2 renders the normal map from the height (Sobel, strength per recipe) into a linear RGBA8 target.
4. Pass 3 renders ORM (AO from height blur difference, roughness and metal from the recipe).
5. Mipmaps generated; anisotropy per preset; wrap = repeat.
6. `MemTracker` records bytes (`w*h*4*1.333` per map).

Scheduling: the bake queue is processed by `Streaming.pump`; **one map per frame** during gameplay; unlimited during the loading screen. Verified cost on software GL: about 0.1–0.2 s per 1024² map, 0.03 s per 512² map; a real GPU is expected to be far faster (not measurable here).

### 5.5 Boot set and streaming of textures
- Boot set (baked before the first playable frame): `tex.noise_shared`, `tex.cloud_noise`, `tex.water_normal_a/b`, `tex.asphalt`, `tex.concrete_cast`, `tex.brick_red`, `tex.cobble`, `tex.grass_ground`, `tex.metal_painted`, `tex.glass_window`, `tex.leaf_atlas`, `tex.bark_oak`, `atlas.decals`, `atlas.particles`. Budget: ≤ 2.5 s on the reference desktop, ≤ 20 s on software GL.
- All other sets bake when the player is within 600 m of a chunk that references them, lowest priority first for distant ones. Until baked, a material renders with the recipe's average colour and roughness (stored as constants), so there is never a missing-texture look.
- Eviction: when tracked texture bytes exceed the preset budget, the least recently used sets not referenced by any loaded chunk are disposed.

## 6. Geometry kit (`src/art/`)

### 6.1 Kit helpers (`art/kit/`)

| Helper | Purpose |
|---|---|
| `GeoBuilder` | Append-only typed-array mesh writer (positions, normals, uvs, vertex colour AO, material groups). All builders write into it; no intermediate `BufferGeometry` objects |
| `box/bevelBox/prism/cylinder/tube/lathe` | Primitives with correct UV scale in metres |
| `loft(sections[])` | Skin a surface through cross-section polylines (hulls, car bodies, tanks) |
| `sweep(profile, path)` | Pipes, railings, cables, exhausts, kerbs |
| `extrudePoly(points, h)` | Footprints, sidewalks, awnings |
| `arrayAlong / scatter` | Repetition with seeded jitter |
| `bakeVertexAO(geo, rules)` | Analytic AO: darken by height from ground, inside corners, under overhangs |
| `uvWorld / uvBox` | Texel-density-correct UVs (target 512 texels per tile size) |
| `mergeByMaterial(parts)` | Final batches for ChunkManager |

### 6.2 Buildings (façade grammar)

A building = footprint (rectangle or L) + floors + style. Each façade is divided into bays (2.8–4.0 m); each bay × floor gets a module from the style's module set. Recessed windows (0.12–0.25 m), sills, lintels, cornices and parapets are real geometry at LOD0.

| Archetype | Style | Floors | Module set | LOD0 tris | Districts |
|---|---|---|---|---|---|
| `bld.brick_loft` | 19th-century brick warehouse | 4–7 | Arched or flat sash windows, brick pilasters, corbelled cornice, ground-floor storefronts with awnings, fire escapes on 30% of façades, wall AC units, roof water tower (20%) | 9–16k | oldtown |
| `bld.brick_walkup` | Brick apartment | 3–5 | Sash windows, stoop, cornice, fire escape | 6–10k | oldtown, northgate |
| `bld.mixed_use` | Shop below, flats above | 3–6 | Storefront, signage band, panel or brick upper | 6–10k | midtown, market |
| `bld.panel_midrise` | White/grey panel residential | 6–10 | Punched windows, balconies (40%), ground-floor glazing | 8–14k | midtown, eastside |
| `bld.office_midrise` | Concrete and glass office | 6–12 | Ribbon windows, entrance canopy, roof plant | 6–12k | downtown, midtown |
| `bld.glass_tower` | Curtain-wall tower | 18–45 | Flat curtain wall with interior-mapping shader, podium, crown, roof mast | 3–6k | downtown |
| `bld.podium_mall` | Curved dark-glass podium | 3–5 | Curved curtain wall, roof terrace | 4–8k | downtown |
| `bld.house_suburban` | Timber or stucco house | 1–2 | Porch, pitched shingle roof, garage | 3–6k | eastside, seagrass |
| `bld.apartment_block` | Purchasable apartments | 4–8 | Balconies, lobby | 8–12k | northgate |
| `bld.warehouse` | Corrugated or brick shed | 1 (8–10 m) | Roller doors, loading docks, roof vents | 2–5k | industrial, docks |
| `bld.factory` | Brick with sawtooth roof, chimney | 2 | Industrial windows | 5–8k | industrial |
| `bld.gas_station` | Canopy, pumps, kiosk | 1 | Pumps are props with interact anchors | 5k | 5 sites |
| `bld.supermarket` | Big box with glazed front | 1 | Trolley bays, parking lot | 4k | market |
| `bld.diner` | Brick corner unit with red awnings | 1 + flats | Large windows into `int.diner` | 8k | oldtown |
| `bld.garage_workshop` | Mechanic shop | 1 | 3 roller bays into `int.garage` | 4k | oldtown south |
| `bld.bank` | Stone-clad with columns | 3 | — | 8k | downtown |
| `bld.bus_station` | Canopy terminal | 1 | — | 5k | oldtown |
| `bld.parking_deck` | Open concrete deck | 3–4 | — | 5k | downtown, market |
| `bld.construction_site` | Staged tower frame (stage 0–5), crane, hoarding | — | Stage-dependent | 6–15k | downtown |
| `bld.cabin_log` | Log cabin with stone chimney | 1 | Porch, shingle or metal roof | 6k | lake, forest |
| `bld.cabin_plank` | Plank cabin, red metal roof | 1 | Shutters, ivy cards | 4k | lake |
| `bld.fishing_hut` | Small plank hut on piles | 1 | Counter window, racks | 3k | lake |
| `bld.boathouse` | Open timber frame over water | 1 | Slips, hoists; interior always real | 8k | lake |
| `bld.lodge_restaurant` | Timber lodge with terrace | 1–2 | Terrace deck, large glazing | 10k | lake |
| `bld.general_store` | Timber false-front store | 1 | Porch | 4k | lake, forest |
| `bld.market_stall` | Timber stall with striped awning | 1 | Counter, produce crates | 2k | marina |
| `bld.harbor_shed` | Net lofts, fish sheds | 1–2 | Painted timber, corrugated roof | 3k | portcalder |
| `bld.port_town_house` | Stucco with tile roof | 2–3 | Shutters, balconies | 5k | portcalder |
| `bld.lighthouse` | Tapered tower, lantern room, gallery | — | Rotating beam at night | 4k | marina |
| `bld.beach_bar` | Thatched open bar | 1 | — | 4k | palmcove |
| `bld.container_terminal` | Gantry crane, stacks, reefer racks | — | Crane is an entity when operated | 12k | portcalder |
| `bld.sawmill` | Open shed, conveyor, log deck, sawdust pile | 1 | — | 8k | forest.sawmill |
| `bld.shed_corrugated` | Machinery shed | 1 | — | 2k | timberline |
| `bld.ranger_station` | Timber office with flagpole | 1 | — | 5k | forest.gate |
| `bld.fire_tower` | Steel lattice tower with cab | — | Climbable stairs | 4k | highridge |
| `bld.player_built` | Assembled from `piece.*` | — | Annex D §9 | variable | plots |

LOD1 (120–400 m): windows become flat insets with the same materials, details dropped (≈ 15% of LOD0 triangles). LOD2 (> 400 m): box mass with a baked façade colour and window emissive pattern via vertex colour, merged per chunk (≈ 12–40 triangles per building).

Infrastructure archetypes: `infra.bridge_suspension` (Harlan Bridge: 2 lattice towers 70 m, main cables as swept tubes, suspenders, truss deck, walkway, approach viaduct on piers; 60k tris LOD0, split into 6 chunks), `infra.bridge_girder` (Harbor Causeway), `infra.bridge_small` (Mill Bridge), `infra.footbridge_steel`, `infra.footbridge_wood`, `infra.quay_wall`, `infra.breakwater`, `infra.pier_timber`, `infra.dock_floating`, `infra.tunnel_portal`, `infra.retaining_wall`, `infra.weir`.

### 6.3 Roads and ground
- Roads are ribbons generated from the road graph: carriageway (`tex.asphalt` or `tex.cobble`), kerbs (0.15 m), sidewalks (`tex.concrete_cast` or `tex.paver`), gutters with darker dirt gradient (vertex colour), crossings and markings from `atlas.decals` as a second coplanar-offset mesh layer.
- Intersections are generated polygons with corner radii 6 m.
- Terrain uses a 4-layer splat (grass, dirt/forest floor, rock, sand) chosen by slope, height and masks, blended in one shader with triplanar on slopes > 40°.

### 6.4 Interiors (in place, lazily built within 40 m of a door)

| Interior id | For | Priority | Contents |
|---|---|---|---|
| `int.diner` | `job.city.restaurant`, `biz.restaurant` template | P0 | Kitchen line (fridge, board, grill, fryer, pass), counter, 8 tables, till |
| `int.hostel_room` | Starter lodging | P0 | Bed, locker, window |
| `int.bank_lobby` | Bank | P1 | Teller counter, ATMs |
| `int.supermarket` | Job and business | P1 | 6 aisles, checkout, backroom |
| `int.warehouse` | Job and business | P1 | Pallet racks 3 levels, bays, forklift |
| `int.garage` | Mechanic | P1 | Lifts, tool wall, parts shelf |
| `int.cafe` | `biz.cafe` template | P1 | Counter, machine, 5 tables |
| `int.shop_small` | `biz.retail` template, tackle hut, general store | P1 | Shelving, counter |
| `int.boathouse` | Reference 4 | P1 | Slips, crates, hoist |
| `int.cabin_log` | Reference 11; purchasable cabins | P1 | Fireplace, workbench, bed |
| `int.apartment_s/m/l` | Purchasable flats | P1 | Empty shell + furniture grid |
| `int.office_floor` | Office job | P2 | Desks, monitors |
| `int.lodge_restaurant` | Lakeside Grill | P2 | Dining room, terrace |
| `int.sawmill` | Forest | P2 | Saw line |
| `int.wheelhouse` | Trawler cab | P2 | Helm, sonar screen |

Interior lighting: 2–4 shadowless lights from the light pool, emissive fixtures, baked vertex AO, exposure adaptation when `player:interior` changes. Exterior chunks beyond the door portal frustum are culled while inside (Annex G §4.4).

### 6.5 Prop vocabulary (all instanced; LOD0 tris in brackets)

City: `prop.streetlamp_a` [600], `prop.streetlamp_b` [500], `prop.traffic_light` [800], `prop.utility_pole` [300] + wires, `prop.bike_dock` [2.5k per 6 bikes], `prop.map_kiosk` [200], `prop.bench` [400], `prop.bin` [200], `prop.hydrant` [300], `prop.mailbox` [150], `prop.bollard` [60], `prop.planter` [300], `prop.parasol` [250], `prop.cafe_table_set` [600], `prop.newsstand` [500], `prop.bus_shelter` [600], `prop.sign_street` [80], `prop.sign_shop` [40], `prop.billboard` [200], `prop.ac_unit` [120], `prop.fire_escape` [1.5k per floor], `prop.awning` [150], `prop.water_tower` [1.2k], `prop.roof_vent` [100], `prop.antenna` [80], `prop.dumpster` [300], `prop.pallet` [200], `prop.crate_wood` [120], `prop.barrel` [200], `prop.traffic_cone` [80], `prop.barrier` [150], `prop.fence_chainlink` [per 3 m, alpha card], `prop.railing` [per 2 m, 120], `prop.manhole` (decal), `prop.vending_machine` [400], `prop.atm` [200], `prop.gas_pump` [500], `prop.parking_meter` [100], `prop.scaffold` [800], `prop.container` [300], `prop.forklift_static` [2k].

Lake: `prop.dock_section` [300], `prop.pile` [60], `prop.pile_rope` [200], `prop.rope_coil` [200], `prop.hook_chain` [150], `prop.oar` [80], `prop.outboard` [600], `prop.fish_rack` [300], `prop.net_drying` [alpha card], `prop.lantern` [200], `prop.picnic_table` [300], `prop.campfire` [300], `prop.tent` [300], `prop.kayak` [500], `prop.life_ring` [200], `prop.rock_granite_s/m/l` [80/200/500], `prop.reeds` [card cluster], `prop.buoy_small` [120], `prop.sign_wood` [80], `prop.footbridge_wood` [1.5k].

Ocean: `prop.fish_crate` [100], `prop.crab_pot` [300], `prop.buoy_red` [200], `prop.net_pile` [300], `prop.bollard_mooring` [150], `prop.pile_rope`, `prop.gangway` [300], `prop.harbor_crane_small` [1.5k], `prop.ice_bin` [150], `prop.sun_lounger` [250], `prop.beach_umbrella` [250], `prop.rock_dark_s/m/l`, `prop.driftwood` [150], `prop.lifeguard_tower` [800], `prop.channel_marker` [300].

Forest: `prop.log_pile` [1.5k], `prop.log_single` [60], `prop.stump` [150], `prop.rock_mossy_s/m/l`, `prop.fallen_tree` [600], `prop.trail_sign` [100], `prop.sawhorse` [150], `prop.fuel_drum` [200], `prop.workbench` [500], `prop.anvil` [200], `prop.hunting_stand` [500], `prop.gate_barrier` [200].

## 7. Vehicles and boats

### 7.1 Land vehicles (generators in `art/vehicles/`)

Bodies are lofted from 9–13 cross-sections defined per model (parametric: length, width, height, hood/roof/trunk profile, wheelbase, arch radius). Separate meshes: body, doors (hinged, 2–4), hood, trunk, glass, lights (emissive), wheels (lathe tyre with tread normal, rim with 5–10 spokes, brake disc), interior (seats, dashboard, steering wheel), mirrors, plates, wipers. Dirt: per-instance `dirt` attribute darkens lower body and adds roughness (reference 1).

| Archetype | Class | LOD0 / LOD1 / LOD2 tris | Seats | Notes |
|---|---|---|---|---|
| `veh.hatch_used` | Car | 22k / 5k / 400 | 4 | Starter car, faded paint |
| `veh.sedan` | Car | 28k / 6k / 400 | 4 | Also `veh.taxi` (roof sign, livery) and ambient `veh.police` |
| `veh.pickup` | Car/utility | 28k / 6k / 400 | 2 | Bed carries cargo; yellow variant from reference 1 |
| `veh.coupe` | Car | 30k / 6k / 400 | 2 | Late-game |
| `veh.moto_125` | Motorcycle | 14k / 3k / 200 | 1 | Starter |
| `veh.moto_cafe` | Motorcycle | 30k / 5k / 200 | 1 | Reference 14: tubular frame, finned twin, spoked wheels, chrome exhaust, round headlight, gaiters |
| `veh.van` | Delivery van | 24k / 5k / 400 | 2 | Sliding door, rear doors open, cargo volume |
| `veh.boxtruck` | Truck | 26k / 6k / 500 | 2 | Tail lift |
| `veh.logtruck` | Truck | 34k / 7k / 600 | 2 | Reference 12: flatbed with bunks, loader crane with grapple (articulated, operated in the logger job) |
| `veh.forklift` | Work vehicle | 12k / 3k | 1 | Rear steer, mast with forks |
| `veh.utv` | Work vehicle | 12k / 3k | 2 | Forestry |

Only the player's current vehicle and vehicles within 25 m use LOD0 with interior; traffic uses LOD1 beyond 25 m.

### 7.2 Boats (generators in `art/boats/`)

Hulls are lofted from station sections (keel, chine, sheer) with a separate deck and gunwale sweep.

| Archetype | Class | LOD0 / LOD1 / LOD2 | Crew | Notes |
|---|---|---|---|---|
| `boat.rowboat` | Fishing boat | 8k / 2k / 200 | 2 | Reference 4: clinker hull, thwarts, oars, small outboard |
| `boat.skiff` | Fishing boat | 12k / 3k / 300 | 3 | Reference 5: aluminium, 25 hp outboard, seats, stripe |
| `boat.console` | Sport/charter | 20k / 4k / 300 | 5 | Reference 9: centre console, T-top, rod holders |
| `boat.trawler` | Commercial fishing | 45k / 9k / 800 | 4 | Reference 15: full part list (hull, rub rail, wheelhouse with 9 windows, mast, radar, antennas, floodlights, gantry A-frame, nets, winch, hatch, life ring, buoys, rudder, propeller, anchor, rails) |
| `boat.workboat` | Commercial vessel | 30k / 6k / 600 | 3 | Harbour tug/cargo lighter with push knees, tyres, deck crane |
| `boat.ferry` | Commercial vessel | 26k / 6k / 600 | 12 pax | Water taxi for `job.ocean.boatop` |
| `boat.yacht`, `boat.sailboat` | Ambient only | 12k / 3k / 300 | — | Marina dressing |
| `boat.cargo_ship` | Ambient only | 20k / 5k / 600 | — | Moored at terminal; distant traffic on the horizon |

### 7.3 Vehicle physics (`game/physics/vehicle.js`, pure JS, 60 Hz with 2 sub-steps)

Rigid body: position, quaternion, linear and angular velocity, mass, inertia box.

| Aspect | Model |
|---|---|
| Suspension | 4 rays (2 for motorcycles) from hard points down the body's local −Y against `World.groundAt`. Spring force `k·compression`, damper `c·compressionVelocity`, bump stop; rest length and travel per model. Kerbs (0.15 m), speed bumps, and terrain steps produce visible jolts; an impulse above threshold triggers `sfx.veh.suspension_thump` and camera shake |
| Tyre forces | Per wheel: longitudinal from engine/brake torque limited by `μ·N`; lateral from slip angle with a saturating curve (`F = μ·N·sat(slip/peak)`); combined by friction circle. `μ` by surface: asphalt 1.0, cobble 0.85, wet ×0.75, dirt 0.7, grass 0.6, mud 0.5, sand 0.5 |
| Engine/gearbox | Torque curve table, automatic gearbox with 4–6 ratios, RPM exposed in `parts.rpm` for audio. Reverse. Engine braking |
| Brakes | Front-biased; hand brake locks rear wheels; ABS-like slip limit on player car when assist is on |
| Steering | Speed-sensitive max angle (35° at rest → 8° at 30 m/s), Ackermann approximation, self-centring |
| Stability | Anti-roll bar term; centre of mass low; flip recovery: holding `R` for 1.5 s resets upright (costs nothing, logs `veh:reset`) |
| Motorcycles | Two-wheel kinematic bicycle model with lean angle `φ = atan(v²/(g·r))` applied visually and to the contact patch; cannot fall at speed; low-speed balance assisted |
| Collisions | Body OBB against static colliders and other vehicle OBBs (SAT in the ground plane with a height overlap test), impulse response with restitution 0.15 and friction; pedestrians are bumped and ragdoll-lite (pushed, play stumble). Impulse magnitude maps to damage (`condition` loss), `veh:collision`, crash audio, sparks, glass particles |
| Doors and animation | Enter: player walks to door anchor, door opens 0.4 s, seat transition 0.5 s, door closes. Wheels spin and steer, suspension compresses visually per wheel, brake and reverse lights, indicators (traffic only), exhaust puffs, body roll and pitch from the physics state |
| Trailers/loads | Cargo items are counted, not simulated, except logs on the log truck (visual stack that grows) and forklift pallets (kinematic attach with tilt-fail check) |

Handling tests (headless): 0–20 m/s time, braking distance from 20 m/s (target 22–30 m dry), steady turning radius at 10 m/s, no rollover when crossing a kerb at 8 m/s, top speed per model within ±5% of `data/vehicles.js`.

### 7.4 Boat physics (`game/physics/boat.js`)

Rigid body with 6 buoyancy sample points on the hull. Each point: `depth = waterHeight(x,z,t) − pointY`; force `ρ·g·volumeShare·clamp(depth)` upward plus vertical damping. Thrust at the stern along the hull's forward axis rotated by rudder/outboard angle; planing lift proportional to speed² (skiff and console rise and trim); hydrodynamic drag linear + quadratic with strong lateral resistance (keel); wind and wave drift. Water height uses the same Gerstner parameters as the shader (`world/layout/water.js`). Docking: soft collisions with pier colliders and fender damping. Outputs `parts.heel`, `parts.trim`, wake intensity for particles and audio. Tests: floats at rest at the design waterline ±5 cm; reaches top speed ±10%; turns within a specified circle; does not capsize in storm waves when stationary.

## 8. Vegetation (`art/vegetation/`)

| Archetype | LOD0 | LOD1 | LOD2 | Notes |
|---|---|---|---|---|
| `veg.pine_a`, `veg.pine_b`, `veg.spruce_a` | Tapered trunk + 20–40 drooping branch cards with needle texture (3–5k tris) | 3 crossed card tiers (400) | Billboard impostor from a runtime-baked 8-angle atlas | Tall bare lower trunks in deep forest (reference 13) |
| `veg.oak_a`, `veg.maple_a`, `veg.street_tree` | Trunk + 3 branch levels + 60–120 leaf cluster cards (4–6k) | Simplified crown shell + cards (500) | Impostor | City and lakeside broadleaf |
| `veg.palm_a`, `veg.palm_b` | Curved swept trunk + 14–18 frond meshes with leaflet alpha (3k) | 6 frond cards (300) | Impostor | Lean angle parameter (reference 8) |
| `veg.bush_a/b`, `veg.hedge` | Card clusters (300) | (80) | culled | |
| `veg.fern`, `veg.grass_tuft`, `veg.reeds`, `veg.groundcover`, `veg.flowers` | Instanced cards in a 60 m ring around the camera, density from the chunk's biome mask and the vegetation setting | — | — | Never cast shadows |
| `veg.ivy` | Alpha cards on walls | — | — | Cabins, Old Town walls |

Wind: vertex shader sway using a per-vertex weight (vertex colour alpha) with trunk bend, branch flutter and leaf shimmer, driven by the global wind vector. Impostor atlas is rendered once per tree species at load (8 yaw angles, albedo + normal), ≤ 2048² total.

Tree counts (placement by seeded blue-noise scatter with biome masks): forest ≈ 22,000; lake ≈ 9,000; city ≈ 1,400; ocean ≈ 900 (palms 500). At most 300 at LOD0 and 2,500 at LOD1 visible on High.

## 9. Characters, crowd, traffic, animals

### 9.1 Character rig (`art/characters/`)
- A character is a hierarchy of 15 rigid segments (pelvis, torso, chest, head, upper/lower arms, hands, thighs, shins, feet) with rounded lofted shapes that overlap at joints, plus hair cap/hat, and clothing variation by segment shape and tint (jacket, shirt, trousers, skirt, shorts, apron, hi-vis vest, hard hat, cap). Faces are low-detail geometry with baked shading; no facial animation.
- LOD0 3.5k tris (player 6k), LOD1 900, LOD2 a 2-segment capsule figure (120).
- Animation is procedural: parametric gait cycle (walk, run, idle shift, carry, sit, drive, row, cast, reel, chop, saw, type, cook, stand-talk) computed as joint angles from phase; blended on state change over 0.2 s. No skinning and no animation files.
- Rendering: one `InstancedMesh` per segment type per LOD; segment matrices are written per frame for visible characters only.

### 9.2 Crowd (`game/ai/pedestrians.js`)
Pedestrians spawn on sidewalk nav-graph edges within 140 m of the camera and despawn beyond 180 m (pooled). Density per district and hour from `data/balance.js` schedules (peaks 08:00, 12:30, 18:00). Behaviours: walk route, wait at crossings, sit on benches, queue at stalls, enter/leave buildings, shelter in rain. Avoidance: simple separation steering. Caps per preset: Annex G §2.3 and §3.3.

### 9.3 Traffic (`game/ai/traffic.js`)
Cars follow lane centrelines of the road graph with a car-following model (target headway 1.5 s), obey traffic lights (fixed-cycle state machines at signalised intersections), yield at stops, slow for the player and pedestrians. They are kinematic; a hit by the player switches the car to a simple dynamic response for 3 s. Spawn ring 150–250 m, pooled, mix by district (taxis downtown, trucks industrial, pickups in rural regions). Parked cars are static instances at kerbs and lots. Boats: 3–6 ambient boats follow water routes at the port and marina.

### 9.4 Animals
`ani.gull` (flock boids around marina and harbour, land on piles), `ani.crow` (logging yard, circle and perch), `ani.songbird` (flit between trees, mostly audio), `ani.deer` (forest meadows, graze, flee within 25 m; procedural quadruped gait), `ani.rabbit` (P2), `ani.fish` (jump ripples and shadows near the surface at fishing spots; the catchable fish itself is a first-person model when landed), `ani.butterfly/firefly` (particles).

## 10. Water (`render/water.js`)

One shader, three profiles.

| Feature | Ocean | Lake / pond | River |
|---|---|---|---|
| Surface motion | 4 Gerstner waves (vertex) + 2 scrolling normal maps | Normal maps only; wind gust patches | Normal maps scrolled along flow |
| Colour | Depth-based: turquoise `#3fd0c0` (0–3 m) → `#0f6a8a` → deep `#0a3350` (reference 8) | Tannin: `#3a4a36` shallow green-brown → `#11201c` (references 4, 5) | Green-grey `#445548` |
| Reflection | Environment map everywhere; planar reflection on Ultra (High optional); sun glitter term with sparkle noise | Same; planar reflection matters most here | Environment |
| Refraction/soft edge | Opaque-pass colour sampled with normal offset, depth-difference alpha at shore | Same | Same |
| Foam | Shore foam band from depth, wave crests | Thin shore line only | Around piers |
| Extras | Caustics on seabed < 4 m, wake and spray particles, rain ripples | Fish ripples, mist cards | — |

Wave parameters live in `world/layout/water.js` and are shared with physics. Water meshes: a camera-centred radial grid for the ocean (denser near the camera), fitted polygons for lake, ponds and river.

## 11. Particles, decals, effects

Pooled GPU-instanced quads (`render/particles.js`), soft-particle depth fade, max counts per preset (Annex G §2.3). Systems: exhaust, dust (tyres on dirt, city dust motes), smoke (chimneys, campfires, sawmill), fire, sparks (collision, welding, chainsaw), sawdust and wood chips, leaves, rain and splashes, water spray/wake/splash, fish jump, mist cards, god-ray dust, steam (kitchen), confetti (business opening), money pop (UI-in-world sale tick). Decals: skid marks, tyre tracks in mud, puddles, oil stains, light pools.

## 12. Region identity summary

| | City | Lake | Ocean | Forest |
|---|---|---|---|---|
| Palette | Brick red-brown `#8a4a3a`, steel blue `#2f4a6b`, glass navy, asphalt grey, awning red `#b3272d` | Dark timber `#4a3a2c`, water green-black, conifer `#2f4a34`, cabin red `#a8452f` | Sand `#e6d5b0`, turquoise, white hulls, hull blue `#2e63a6`, buoy red-orange `#e8452c` | Spruce `#24382a`, moss `#6b8a3a`, mud brown, wet asphalt, mist grey |
| Light mood | Warm dusty sun, long shadows between buildings | Soft, slightly overcast-clear, mirror reflections | Bright high sun or golden haze, sparkle | Diffuse, shafts through mist, darker exposure |
| Materials | Brick, cast concrete, glass, painted steel, cobble | Weathered wood, granite, shingle, galvanised metal | Painted and chipped wood/steel, rust, rope, canvas, stucco, sand | Bark, moss, mud, corrugated metal, logs |
| Signature props | Fire escapes, bike docks, utility wires, parasols, kiosks | Docks, crates, oars, lanterns, footbridge | Buoys, nets, crab pots, masts, lighthouse, striped awnings | Log piles, stumps, loader truck, fire tower |
| Atmosphere | Dust haze, steam vents, night neon/bloom | Dawn mist over water, fish ripples | Sea haze, gulls, spray | Ground mist, god rays, crows, drifting needles |
| Ambience (Annex E) | Traffic hum, distant sirens, footsteps, HVAC | Lapping water, loons, wind in pines, creaking wood | Surf, gulls, rigging clink, engine thrum | Wind, birdsong, woodpecker, distant chainsaw |
