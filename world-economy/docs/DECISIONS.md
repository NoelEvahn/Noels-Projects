# Decisions log

Entries are appended by the stage that makes them. "CONTRACT CHANGE" entries would amend frozen files; none so far.

## Stage 2 (Sonnet)

- **New archetype ids** (not named in Annex A, needed by Annex B POIs): `bld.showroom` (Harlan Motors, Budget Wheels, Calder Marine; `params.variant` = `used` / `marine`) and `bld.market_hall` (Harlan Wholesale Market). Everything else is a variant (`params.variant`) of an existing id: City Hall = `bld.bank` `cityhall`, 3rd Precinct = `bld.mixed_use` `police`, Metro Cab depot and BuildRight = `bld.warehouse` `taxi` / `hardware`.
- **Snapped POI coordinates** (all within the 30 m tolerance): `poi.ocean.seagrass` (-1380,1040) -> (-1410,1040), because by Annex B 4's first-match rule the annex position falls in `ocean.marina`, not `ocean.seagrass`. Other POIs keep the annex coordinate and their buildings are placed on lots beside it. `poi.lake.*` dock points for boats (`data.dock`) are in open water next to the pier, not on the shore.
- **S2 scaffold and S2 are one delivery.** The repo was empty, so the S2a scaffold (core, ids, ledger, save, harness, build, tests) and the blockout were built together. Tags: `checkpoint/stage2-blockout` on the final commit.
- **World as data, meshes as builders.** Infrastructure (bridges, towers, piers, docks, quays, breakwater, portal) is a list of world-space `parts` (boxes and cylinders) in `world/layout/infra.js`; colliders and blockout meshes are derived from the same parts. Bridge decks are `deck` colliders (sloped oriented strips) and are drawn by the road ribbon.
- **Added world API extras** (additive, signatures in section 5.5 unchanged): `World.registerInteractable/unregisterInteractable` (dynamic interactables owned by game/), `World.data` (raw builder data for renderer and tests), `World.initSteps()` (time-sliced init generator), `waterAmplitude`.
- **Road classes beyond Annex B:** `local` (Port Calder, marina and Eastside court streets), `track` (4 m access tracks generated to every POI more than 18 m beyond a road), `path` (walk-only, Annex B 5.3). Pier decks carry walk-only `path` edges so dock POIs are reachable on foot.
- **Forest road grades.** Annex B's forest terrain climbs about 12.7 %, above the 8 % / 10 % road grade limits. Paved roads keep 8 %; gravel, dirt and tracks use 11 % (path 16 %), the Fire Tower Track is routed with switchbacks (about 1.0 km instead of 0.6 km), forest hills are damped to +-9 m, and the terrain stamp cuts the remaining difference (at most about 8 m) into the hillside.
- **Far proxy** is one masked mesh pair (terrain at 25 m, LOD2 masses plus far road strips) plus a 200 m skirt out to +-6000 m with Mt. Sable; chunks that are loaded uncover their far proxy in the same frame.
- **Streaming budget under software GL:** `Streaming.pump` uses 3 ms (1.5 ms after a >15 ms frame) on real GPUs; when the renderer string contains SwiftShader/llvmpipe it uses 45 ms because frames are slow there.
- **Test scripts are .mjs/.cjs** and run with `node --test` (unit, sim) and `node test/...` (Playwright). `npm test` = unit + sim.
