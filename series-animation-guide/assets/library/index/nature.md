## Nature / terrain / sky pack (`nature_*`)
Files: `props/nature_common.js` (noise, heightfield, instancing, wind sway, water material), `nature_clouds.js`, `nature_sky.js`, `nature_forest.js`, `nature_water.js`, `nature_terrain.js`; registry `registry/nature.js`. Units are metres, 1 unit = 1 m.
Real-scale terrain is km-wide: the viewer camera far plane is 2000, so previews wrap the asset in `scaled(obj, k)` (nature_common.js); `userData.realHeightM/realWidthM` stay real. Episode cameras need `far` of 60000+ for 1:1 mountains, or use `scaled()`.
Every builder returns a Group with `userData.update(t)` (pure function of t, no state); call it each frame.
Clouds are instanced shaded puffs (lit tops, shadowed flat bottoms, silver lining) plus a translucent halo shell per puff for soft edges (`cloudMaterials`, `cumulusPuffs`, `puffMeshes`).

| Asset (id) | Function (file) | Options | Real size | Animates | Screenshot |
|---|---|---|---|---|---|
| nature_cumulus | `cumulus` (clouds) | width, height, seed, theme, lod, anvil | width param (default 1200 m) | billow, drift | nature_cumulus |
| nature_cloud_field | `cloudField` (clouds) | count, area, altitude, width, theme, lod | km field | each cloud drifts + wraps with edge fade, billow | nature_cloud_field |
| nature_cloud_sea | `cloudSea` (clouds) | size, seed, sun | 6 km | deck drift, billow; lit tops, dark valleys, shadow discs | nature_cloud_sea |
| nature_storm_cloud | `stormCloud` (clouds) | width, period, rain, lightning | 2.4 km wide | rain shafts fall, lightning bolt + cloud flash every `period` s | nature_storm_cloud |
| nature_sky_sunset | `skyDome` (sky) | preset noon/morning/sunset/dawn/dusk/night/overcast/storm | dome r=1500 | star twinkle, sun rays | nature_sky_sunset |
| nature_sun | `sun` (sky) | radius, color, rays, moon | - | ray spin/pulse, glow breathing | nature_sun |
| nature_rainbow | `rainbow` (sky) | R, bandW, secondary, mist | R param | shimmer | nature_rainbow |
| nature_birds | `birdFlock` (sky) | count, pattern v/line/swarm/soar, radius, span | wingspan param | wing flap (2-segment wings), path flight, banking | nature_birds |
| nature_balloons | `balloonFleet` / `hotAirBalloon` (sky) | count, colors, pattern stripes/bands/chevron/checker | 25 m tall, 17 m wide | burner flame flicker, sway, bob, drift | nature_balloons |
| nature_jet | `contrailJet` / `jetliner` (sky) | altitude, speed, length | 39 m long | flies at 230 m/s, twin contrails widen + fade | nature_jet |
| nature_forest_mixed | `forest` (forest) | kinds pine/round/birch/palm/giant/cypress, lod high/low/auto, snow, heightFn | trees 9-12 m | wind gusts travel across the canopy | nature_forest_mixed |
| nature_forest_pine | `forest` (snowy pines) | snow | 12 m | wind sway | nature_forest_pine |
| nature_forest_palm | `forest` / `palmTree` | kinds palm | 9 m | sway + frond flutter | nature_forest_palm |
| nature_meadow | `meadow` (forest) | area, density, flowerK, height, butterfliesN | grass 0.7 m | grass/flower sway, butterflies flapping on paths | nature_meadow |
| nature_jungle | `jungle` (forest) | area, giants, trees | giants 34 m | canopy sway, light shafts, fern sway | nature_jungle |
| nature_ocean | `ocean` (water) | size, waveH, boats | 1.6 km | vertex waves + foam crests, sailboats ride the waves | nature_ocean |
| nature_beach | `beachShore` (water) | length, depth, palms | 260 m | waves, swash foam runs up and back, gulls, palms | nature_beach |
| nature_river | `river` (water) | length, width, speed, trees | 340 m long, 16 m wide | flowing ripples, drifting foam streaks, rock rings, reeds | nature_river |
| nature_lake | `lake` (water) | radius, hillsH | 260 m across | ripples, ring ripples, ducks, boat bob, mirrored mountains | nature_lake |
| nature_waterfall | `waterfall` (water) | height, width | 60 m | falling streaks, spray, pool rings, foam, rising mist | nature_waterfall |
| nature_mountain_range | `mountainRange` (terrain) | length, depth, height, snowLine, clouds | 16 km x 7 km, 3.8 km high | drifting clouds | nature_mountain_range |
| nature_everest | `famousPeak` (terrain) | height, base, size | `realHeightM` 8849 | banner plume streaming off the summit, clouds | nature_everest |
| nature_cliffs | `cliffs` (terrain) | width, height | 120 m high, 520 m wide | surf foam, waves, seabird swarm + soaring birds | nature_cliffs |
| nature_canyon | `canyon` (terrain) | length, width, depth | 620 m deep | river flow, clouds, soaring birds | nature_canyon |
| nature_dunes | `dunes` (terrain) | size, wind, camels | dunes ~40 m | blown sand streaks, walking camels | nature_dunes |
| nature_volcano | `volcano` (terrain) | height, radius, erupting | 2800 m | lava pulse + flowing blobs, smoke column, embers, crater glow | nature_volcano |
| nature_glacier | `glacier` (terrain) | width, length | 2.4 km x 3.6 km | icebergs bob, ice glints twinkle, bay waves | nature_glacier |
| nature_hills | `rollingHills` / `windmill` (terrain) | size, sheep, trees | 700 m | windmill spins, sheep graze, tree sway, clouds, birds | nature_hills |
| nature_island | `island` (terrain) | radius, height | 520 m across, 95 m high | waves, surf foam rings, palm sway, boat, gulls, clouds | nature_island |

Also exported but not registered: `cirrus` (wispy streak layer), `sailboat`, `balloon` single `hotAirBalloon`, `palmTree`, `butterflies`, `jetliner`, `contrail`, `waterMaterial`/`riverMat`/`ribbonGeo`, `floatOn`.
Not built (out of time): weather (rain/snow/fog/dust devil/leaves), `atmosphereLayers`, `earthHorizon`, backdrop sets.
