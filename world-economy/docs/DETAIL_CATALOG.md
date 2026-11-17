# Detail Catalog: 200 scene detail items

Purpose: move the four regions from "blockout / low poly" to "lived-in". Design only, no code. Budgets refer to Annex A (`docs/spec/A-art-rendering.md` §6.5, §8) and Annex G §2.3 (High main pass: 450 draw calls, 1.2M tris; shadow: 280 calls, 700k tris; Low: 220 / 350k).

Baseline (from `test/screenshots/fix1/shots.json`, `docs/PERF_REPORT.md`, software GL): High V01 Old Town = 281 calls / 415k tris / 125 shadow calls; High V08 = 165 / 371k. Low worst = 138 calls / 282k tris. Headroom on High is roughly +170 calls and +780k tris; on Low roughly +80 calls and +65k tris (Low is the binding constraint).

What the renders show: flat grass splat with no blades, bare sand, empty kerbs, few props per block, uniform window grid, no animals, no water-surface life.

**Legend**
- Region: C = City, L = Lake District, O = Ocean, F = Forest, All.
- Tris = LOD0 triangles per instance (cards counted as 2 per quad).
- Tech: IM = InstancedMesh (one call per type per LOD, merged into an existing atlas material where possible); AC = alpha-tested card (atlas); DC = projected/flat decal (atlas.decals); SH = shader-only (material/terrain/water function, 0 tris); PT = particle (atlas.particles, points/quads); VS = animated in vertex shader; GC = ground-cover ring (render/vegetation.js, 60 m, no shadows).
- Motion: wind = global wind sway via vertex-colour weight; none = static.
- Pri: P1 = high visual impact for low cost; P2 = medium; P3 = polish.
- Exists: yes = generator and placement exist; partial = ID/generator exists (`src/art/**`, archetypes) but not placed, single variant, or sparse; no = new.

## 1. Ground cover and grass variety (1-20)

| # | Item | Region | Placement rule | Tris | Tech | Motion | Pri | Exists |
|---|---|---|---|---|---|---|---|---|
| 1 | Short lawn grass tufts, 3 colour variants | C, L | Park/lawn splat cells, 6-12 per m² inside 25 m, fade to 60 m | 6 | GC AC | wind | P1 | partial |
| 2 | Tall meadow grass clumps | L, F | Clearings and road verges, blue-noise 1-3 per m² | 8 | GC AC | wind | P1 | partial |
| 3 | Dry/straw grass variant | O, F | Dune backs, sunny road shoulders, gravel edges | 6 | GC AC | wind | P1 | no |
| 4 | Clover patches | C, L | Lawn edges, under benches, 0.5 m clusters | 4 | GC AC | wind | P2 | partial |
| 5 | Dandelions (flower + seed puff) | C, L | Scattered in lawns, 1 per 4 m² | 4 | GC AC | wind | P1 | no |
| 6 | Daisies / white wildflowers | L, C | Lawns and meadow patches, clustered 5-15 | 4 | GC AC | wind | P2 | no |
| 7 | Tall flower spikes (lupin, foxglove) | L, F | Lake meadows and forest road verges, groups of 3-8 | 8 | GC AC | wind | P2 | no |
| 8 | Weeds in pavement cracks | C | Kerb joints and wall bases, every 3-8 m | 4 | AC | wind | P1 | no |
| 9 | Marram dune grass | O | Dunes and beach back edge, dense bands | 6 | GC AC | wind (strong) | P1 | no |
| 10 | Moss carpets | F | Forest floor under conifers, on shaded slopes | 2 | DC + GC AC | none | P2 | no |
| 11 | Fallen leaf scatter | C, L | Under broadleaf trees, radius = crown, more in autumn | 2 | DC | none | P1 | partial (veg.litter) |
| 12 | Pine needle litter | F | Under conifers, crown radius x1.3 | 0 | SH (splat layer) | none | P2 | no |
| 13 | Pebbles and gravel scatter | L, F | Lake shore band 0-3 m, forest road edges | 8 | IM | none | P2 | no |
| 14 | Mud patches | F, L | Logging yard, trail junctions, gate entries | 2 | DC | none | P2 | no |
| 15 | Puddles (reflective) | All | Road dips and yard low points, visible scaled by wetness | 2 | DC + SH | ripple in rain | P1 | no |
| 16 | Tyre ruts | F | Along forest roads and yard tracks | 2 | DC | none | P2 | no |
| 17 | Worn foot paths through grass | C, L | Park shortcuts between path nodes | 2 | DC | none | P2 | no |
| 18 | Sand ripples and footprints | O | Beach band, footprints near towers/paths | 0 | SH (sand normal + decal) | none | P2 | no |
| 19 | Nettle / thistle clumps | F, L | Fence lines, building backs, yard edges | 8 | GC AC | wind | P3 | no |
| 20 | Low groundcover under trees (ivy, vinca) | C, L | Tree pits and park beds | 4 | GC AC | wind | P2 | partial (veg.groundcover) |

## 2. Shrubs, bushes, hedges, flower beds (21-34)

| # | Item | Region | Placement rule | Tris | Tech | Motion | Pri | Exists |
|---|---|---|---|---|---|---|---|---|
| 21 | Round shrubs, 3 sizes, tint variance | C, L | Building fronts and park edges, every 4-8 m | 120 | IM card cluster | wind | P1 | partial (veg.bush_a/b) |
| 22 | Bramble / blackberry thicket | F, L | Forest edges, fence lines, 2-5 m patches | 160 | IM card cluster | wind | P2 | no |
| 23 | Flowering hydrangea bush | C, L | Cabin fronts, Old Town courtyards | 140 | IM card cluster | wind | P2 | no |
| 24 | Large leafy shrub (rhododendron) | L, F | Lakeside gardens, under tree canopy edges | 200 | IM card cluster | wind | P2 | no |
| 25 | Clipped hedge rows | C, L | Lot borders and park perimeters, continuous runs | 80 / 3 m | IM | wind (low) | P1 | partial (veg.hedge) |
| 26 | Overgrown / gapped hedge variant | L, C | Back lots and outer streets, 30% of hedge runs | 120 / 3 m | IM | wind | P3 | no |
| 27 | Flower beds, bordered, mixed colour | C, L | Park centres, plaza corners, cabin fronts | 60 | IM border + GC flowers | wind | P1 | partial (veg.flowers) |
| 28 | Window boxes with geraniums | C, L | 25% of residential windows floors 1-3 | 24 | IM | wind | P1 | no |
| 29 | Potted plants at shop doors | C, O | Either side of 40% of shop doors | 60 | IM | wind | P1 | no |
| 30 | Tree pit with grate and small shrub | C | Base of every street tree | 40 | IM + DC | none | P2 | no |
| 31 | Climbing roses on fences | L | Cabin fences and gates | 40 | AC | wind | P3 | no |
| 32 | Coastal scrub (sea buckthorn) | O | Dune crests and seawall tops | 120 | IM card cluster | wind (strong) | P2 | no |
| 33 | Low juniper / dwarf conifer | F | Rocky outcrops, sunny clearings | 100 | IM | wind (low) | P3 | no |
| 34 | Ivy on walls | C, L | Old Town ground floors, cabin corners, 20% of walls | 8 / panel | AC on facade | wind (leaf) | P2 | partial (veg.ivy) |

## 3. Trees and tree details (35-50)

| # | Item | Region | Placement rule | Tris | Tech | Motion | Pri | Exists |
|---|---|---|---|---|---|---|---|---|
| 35 | Birch (white bark) | L, F | Lake shores and forest edges, 15% of broadleaf mix | 1.5k | IM + impostor | wind | P1 | no |
| 36 | Weeping willow | L | Lake shore within 6 m of water, 1 per 60 m | 2.5k | IM + impostor | wind (hanging cards) | P1 | no |
| 37 | Young sapling with stake and tie | C | New plantings in downtown plazas, 20% of street trees | 200 | IM | wind | P3 | no |
| 38 | Dead snag tree | F | 3% of forest trees, near clearings | 300 | IM | none | P2 | no |
| 39 | Per-instance autumn tint variance | All broadleaf | Hash per instance: green to yellow/orange/red | 0 | SH (instance attribute) | none | P1 | no |
| 40 | Exposed roots at trunk base | C, L | Park and lakeside trees > 8 m | 80 | IM (merged into trunk LOD0) | none | P2 | no |
| 41 | Fallen branches and twigs | F, L | Under trees, 1-3 per tree, shade side | 20 | IM | none | P2 | no |
| 42 | Hanging moss / lichen beards | F | Spruce lower branches in misty valley roads | 8 | AC | wind | P2 | no |
| 43 | Bark variety (3 bark textures per family) | All | Per species/instance pick | 0 | SH (atlas index) | none | P2 | partial |
| 44 | Stump variants (fresh cut, rotten, mossy) | F, L | Clear-cut areas, trail edges | 150 | IM | none | P1 | partial (prop.stump) |
| 45 | Cones and acorn scatter | F, L | Under pines/oaks within crown radius | 2 | GC AC | none | P3 | no |
| 46 | Trunk moss band (north side) | F, L | All trunks in wet biomes | 0 | SH (world-normal mask) | none | P2 | no |
| 47 | Palm coconut clusters and dead frond skirt | O | Every palm, skirt on 50% | 120 | IM (part of palm) | wind | P2 | no |
| 48 | Trees in large planters | C | Downtown glass district plazas, 1 per 15 m | 300 + tree | IM | wind | P2 | partial (prop.planter) |
| 49 | Spruce sapling undergrowth | F | Gaps between mature trees, clusters of 3-6 | 150 | IM | wind | P1 | no |
| 50 | Canopy contact shadow / AO blob | All | Under every tree and large shrub | 2 | DC | none | P1 | no |

## 4. Water life (51-70)

| # | Item | Region | Placement rule | Tris | Tech | Motion | Pri | Exists |
|---|---|---|---|---|---|---|---|---|
| 51 | Lily pad clusters | L | Calm shallows < 2 m deep, near reeds/shore, 10-40 per cluster | 4 | IM flat cards | bob + ripple (VS) | P1 | no |
| 52 | Water lily / lotus flowers | L | 10-20% of lily pad clusters | 24 | IM | bob (VS) | P1 | no |
| 53 | Duckweed / algae film | L | Sheltered coves and boathouse corners | 0 | SH (water albedo mask) | drift | P2 | no |
| 54 | Cattails | L | Shore band 0-2 m deep, mixed with reeds | 12 | GC AC | wind | P1 | no |
| 55 | Shoreline foam lines | O, L | Waterline intersection with terrain | 0 | SH (depth-based foam) | scroll | P1 | partial |
| 56 | Ripple rings around piles and reeds | L, O | Every pile, mooring post, reed cluster | 2 | DC on water | animated (SH) | P1 | no |
| 57 | Wave-break foam around rocks/breakwater | O | Rock perimeters in surf zone | 0 | SH | animated | P2 | no |
| 58 | Ducks paddling | L | 2-6 per cove, near shore and docks | 120 | IM | swim path + bob | P1 | no |
| 59 | Swans | L | 1-2 pairs per lake, open calm water | 200 | IM | swim path + bob | P2 | no |
| 60 | Gulls perched on piles, roofs, boats | O | Top of 30% of piles, roof ridges near harbor | 80 | IM | idle head turn (VS) | P1 | partial (ani.gull flying) |
| 61 | Seaweed band on rocks/piles | O | Tidal zone 0-0.8 m above waterline | 0 | SH (height band) | none | P2 | no |
| 62 | Washed-up seaweed wrack line | O | Beach high-tide line, continuous strip | 2 | DC | none | P1 | no |
| 63 | Driftwood variants | O, L | Beach wrack line and lake shore, 1 per 20 m | 150 | IM | none | P2 | partial (prop.driftwood) |
| 64 | Shells scatter | O | Wet sand and wrack line | 2 | GC AC | none | P3 | no |
| 65 | Crabs on rocks | O | Rock clusters near waterline, 2-5 | 40 | IM | scuttle (CPU) | P3 | no |
| 66 | Fish shadows and jump splashes | L, O | Below dock edges, open lake | 2 | DC + PT | swim / splash | P2 | partial (ani.fish) |
| 67 | Mooring lines boat-to-cleat | O, L | Every moored boat, 2-4 lines | 16 | IM (tube/line) | sway with boat | P1 | no |
| 68 | Coloured mooring buoys and pot floats | O, L | Harbor mooring field, 1 per 10-15 m | 60 | IM | bob (VS) | P1 | partial (prop.buoy_*) |
| 69 | Barnacles / mussels on piles | O | Pile bases, quay wall tidal band | 0 | SH | none | P3 | no |
| 70 | Dragonflies over water | L | Above lily clusters and reeds, daytime | 4 | PT | dart | P3 | no |

## 5. Street furniture and city clutter (71-94)

| # | Item | Region | Placement rule | Tris | Tech | Motion | Pri | Exists |
|---|---|---|---|---|---|---|---|---|
| 71 | Mailbox variety (street box, post-mounted, wall) | C, L | Street boxes at corners; post mailboxes at every cabin/house lot | 60-150 | IM | none | P1 | partial (prop.mailbox) |
| 72 | Newspaper box cluster (3-4 colours) | C | Busy corners and bus stops | 80 | IM | none | P1 | no |
| 73 | Trash bag piles | C | Beside 40% of shop doors and dumpsters | 40 | IM | none | P1 | no |
| 74 | Litter (cans, cups, paper) | C, O | Gutters, bench bases, near bins | 2-12 | DC + IM | paper flutter (VS) | P2 | no |
| 75 | Traffic cones | C | Works zones, kerb lanes, 3-8 per group | 80 | IM | none | P1 | partial (generator, unplaced) |
| 76 | Barriers (plastic, Jersey, sawhorse) | C | Around works zones and closed lanes | 150 | IM | none | P2 | partial (prop.barrier) |
| 77 | Sidewalk grates and basement vents | C | Building fronts, 1 per 15-25 m | 2 | DC | none | P2 | no |
| 78 | Fire escapes on brick lofts | C | Side/rear facades of 60% of Old Town lofts | 1.5k / floor | IM | none | P1 | partial (prop.fire_escape) |
| 79 | Wall AC units with drip stain | C | 30% of residential windows floors 2+ | 120 | IM + DC | fan spin (VS) | P1 | partial (prop.ac_unit) |
| 80 | Awning variety (stripes, colours, scallop) | C, O | Every ground-floor shop, colour per lot hash | 150 | IM | wind flap (VS) | P1 | partial (prop.awning) |
| 81 | Hanging blade signs | C | 50% of shops, perpendicular above door | 40 | IM + atlas.signage | gentle swing (VS) | P1 | partial (prop.sign_shop) |
| 82 | Graffiti tags | C, O | Old Town back alleys, harbor walls, shutters | 2 | DC | none | P2 | no |
| 83 | Posters and flyers | C | Poles, hoardings, blank walls | 2 | DC | corner flutter (VS) | P2 | no |
| 84 | Street planters with flowers | C | Pedestrian zones, every 20-30 m | 300 | IM | wind | P2 | partial (prop.planter) |
| 85 | Bike racks with locked bikes | C | Shop fronts, parks, 1 per block face | 200 + bikes | IM | none | P1 | no |
| 86 | E-scooters (parked, tipped over) | C | Downtown corners, 2-4 per block | 150 | IM | none | P2 | no |
| 87 | Laundry lines between buildings | C | Old Town alleys, 1 per 2 alleys, floors 2-4 | 40 | IM + AC | wind (VS) | P1 | no |
| 88 | Overhead wires between facades/poles | C, L | Every utility pole span, alley crossings | 8 | IM lines/tubes | sag sway | P2 | partial (utility_pole wires) |
| 89 | Satellite dishes | C, L | 15% of balconies and roofs | 60 | IM | none | P2 | no |
| 90 | Rooftop water tanks | C | 30% of Old Town roofs | 1.2k | IM | none | P2 | partial (prop.water_tower) |
| 91 | Bollards along kerbs | C | Plaza edges, every 1.5-2 m | 60 | IM | none | P2 | partial (prop.bollard) |
| 92 | Café tables, chairs, parasols on sidewalk | C, O | In front of 50% of cafés/restaurants | 600 | IM | parasol wind | P1 | partial (prop.cafe_table_set) |
| 93 | Payphone / public clock / info pillar | C | Squares and major corners, 1 per square | 200 | IM | none | P3 | no |
| 94 | Sign variety (no parking, bus stop, one way, speed) | C | Kerbs every 30-50 m, at stops and junctions | 40 | IM + atlas | none | P2 | partial (prop.sign_street) |

## 6. Vehicles and traffic variety (95-110)

| # | Item | Region | Placement rule | Tris | Tech | Motion | Pri | Exists |
|---|---|---|---|---|---|---|---|---|
| 95 | Parked car palette + dirt + roof racks per instance | All | Hash per slot: 12-colour palette, dirt 0-1 | 1-2.5k (LOD0 as built) | IM attribute | none | P1 | partial |
| 96 | Kerbside parking fill rule | C | 60-80% of parking bays filled, gaps at hydrants/corners | - | placement | none | P1 | partial |
| 97 | Double-parked delivery van, hazards on | C | 1 per 2 blocks, outside shops | 1.5k | IM + emissive flash | flashing lights | P2 | partial (veh.van) |
| 98 | Taxi rank | C | Downtown and station, 3-5 taxis | 1.5k | IM | none | P2 | partial (veh.taxi) |
| 99 | City bus (parked at stops / depot) | C | 1 per 2 bus shelters | 2.5k | IM | none | P2 | no |
| 100 | Bicycles leaning on poles/railings | C, L | Random street furniture, 1 per 30 m | 300 | IM | none | P1 | no |
| 101 | Parked motorcycles/scooters at kerb | C, O | Between cars, 1 per 40 m | 800 | IM | none | P2 | partial (veh.moto_*) |
| 102 | Pickups with loaded beds (logs, crates, tarps) | L, F | Cabins, yard, rural driveways | 1.8k | IM + cargo IM | none | P2 | partial (veh.pickup) |
| 103 | Log trucks staged at yard | F | Logging yard bays, 1-3 | 2.5k | IM | none | P2 | partial (veh.logtruck) |
| 104 | Boat trailers (empty / with boat) | L, O | Slipways and cabin driveways | 300 | IM | none | P2 | no |
| 105 | Rowboats pulled up on shore, upturned | L | Beaches near cabins, 1 per 80 m of shore | 600 | IM | none | P1 | partial (boat.rowboat) |
| 106 | Kayak/canoe racks | L | Boathouse and rental docks | 500 + rack | IM | none | P2 | partial (prop.kayak) |
| 107 | Dinghies tied off dock ends | O, L | Marina finger piers, 1 per 3 berths | 400 | IM | bob (VS) | P2 | no |
| 108 | Car under tarp cover | C, L | Driveways, back lots, 5% of parked slots | 300 | IM | tarp flap (VS) | P3 | no |
| 109 | Abandoned rusty car | F, O | Logging yard edge, harbor back lots, 1-2 per region | 1k | IM + tex.rust | none | P3 | no |
| 110 | Shopping carts | C | Supermarket lots and stray on sidewalks | 120 | IM | none | P3 | no |

## 7. People and animals (111-126)

| # | Item | Region | Placement rule | Tris | Tech | Motion | Pri | Exists |
|---|---|---|---|---|---|---|---|---|
| 111 | Pedestrian palette variety (tops, legs, hair, skin, height) | All | Per-spawn hash, 16+ combos | 0 | IM attribute | gait | P1 | partial |
| 112 | Carried items (bags, umbrellas, coffee, phones) | C | 40% of pedestrians | 30-80 | IM attached | follows rig | P1 | no |
| 113 | Dog walkers (dog on leash) | C, L | Parks and residential streets, 1 per 20 peds | 300 dog | IM | trot gait | P1 | no |
| 114 | Seated people on benches/café chairs | C, O | 30% of benches, 50% of café seats in hours | 3.5k (shared rig) | IM | idle | P2 | partial |
| 115 | Anglers on docks/shore with rods | L, O | Dock ends and breakwater, 1-3 | 3.5k + 40 rod | IM | cast/idle | P1 | no |
| 116 | Workers in hi-vis (docks, yard, works) | O, F, C | Harbor, logging yard, road works zones | 3.5k | IM | carry/idle | P2 | no |
| 117 | Joggers and cyclists | C, L | Park paths, lake promenade | 3.5k + 300 bike | IM | run/pedal | P2 | no |
| 118 | Cats on steps and window sills | C, L | Doorsteps and sills, 1 per 2 blocks | 150 | IM | tail flick (VS) | P2 | no |
| 119 | Pigeon flocks on plazas | C | Squares, near benches, 6-20 birds | 30 | IM | peck, scatter on approach | P1 | no |
| 120 | Squirrels | C, L, F | Park lawns and tree bases | 60 | IM | hop | P3 | no |
| 121 | Deer at forest edge | F, L | Clearings at dawn/dusk, groups of 2-4 | 600 | IM | graze, flee | P2 | partial (ani.deer) |
| 122 | Songbirds on wires and branches | All | Wire spans and hedge tops, rows of 3-8 | 20 | IM | hop/fly off | P2 | partial (ani.songbird) |
| 123 | Crows on bins/fields | C, F | Dumpsters, fields, road kill-free edges | 40 | IM | hop | P3 | partial (ani.crow) |
| 124 | Butterflies over flowers | L, C | Above flower beds/meadows, day only | 4 | PT / IM | flutter | P2 | partial (ani.butterfly) |
| 125 | Distant bird flocks in sky | All | 1-2 flocks orbiting at 80-150 m | 2 / bird | PT | flock path | P2 | no |
| 126 | Beachgoers on towels/loungers | O | Beach, density by hour/weather | 3.5k + towel 2 | IM + DC | idle | P2 | no |

## 8. Building details (127-144)

| # | Item | Region | Placement rule | Tris | Tech | Motion | Pri | Exists |
|---|---|---|---|---|---|---|---|---|
| 127 | Window state variety (lit, dark, blinds half/closed) | All | Per-window hash on facade shader | 0 | SH | night lights on/off | P1 | partial |
| 128 | Interior parallax (curtains, rooms) | C, L | All window panes LOD0 | 0 | SH (interior mapping) | none | P1 | no |
| 129 | Shutters (open/closed, colour) | C, L | Old Town walk-ups, cabins, 50% of windows | 16 | IM | none | P2 | no |
| 130 | Balconies with plants, chairs, bikes | C | 20% of residential windows floors 2+ | 200 | IM | plant wind | P2 | no |
| 131 | Chimney variety (brick stacks, metal flues, caps) | C, L, F | Every pitched roof, 1-3 per roof | 60 | IM | none | P2 | partial |
| 132 | Gutters and downpipes | C, L | Every roof edge, downpipe per 8-12 m | 20 / run | IM | none | P2 | no |
| 133 | Brick damage, patched brick, painted ads | C | Old Town facades, 1-3 per facade | 2 | DC | none | P2 | no |
| 134 | Neon signs | C, O | Bars, diners, market, 20% of shops | 40 | IM emissive + bloom | flicker | P1 | no |
| 135 | String lights over patios and alleys | C, L, O | Café terraces, marina boardwalk, cabin decks | 4 / bulb | IM points + line | sway, glow at night | P1 | no |
| 136 | Stoops with steps and railings | C | Every walk-up entrance | 200 | IM | none | P2 | no |
| 137 | Rooftop HVAC boxes and vents | C | Flat roofs, 2-6 per roof | 100 | IM | fan spin (VS) | P2 | partial (prop.roof_vent) |
| 138 | TV aerials and antennas | C, L | 30% of residential roofs | 80 | IM | none | P3 | partial (prop.antenna) |
| 139 | Storefront displays behind glass | C, O | All shop windows ground floor | 0 / 4 | SH or AC | none | P1 | no |
| 140 | Roll-down security shutters | C | 25% of shops, closed at night | 2 | SH/DC | open by hour | P2 | no |
| 141 | Wall lamps over doors | C, L | Every entrance | 40 | IM emissive | on at night | P1 | no |
| 142 | House numbers, buzzers, plaques | C | Entrances | 2 | DC | none | P3 | no |
| 143 | Cabin porch dressing (rocking chair, boots, lantern) | L, F | Every cabin porch | 400 | IM | chair rock (VS) | P2 | no |
| 144 | Roof weathering and moss | L, F, C | Cabin and Old Town roofs, north slopes | 0 | SH | none | P2 | no |

## 9. Harbor and industrial (145-160)

| # | Item | Region | Placement rule | Tris | Tech | Motion | Pri | Exists |
|---|---|---|---|---|---|---|---|---|
| 145 | Crate stacks, mixed sizes/labels | O, C | Quays, warehouse doors, stalls; stacks of 3-12 | 120 | IM | none | P1 | partial (prop.crate_wood) |
| 146 | Barrel clusters (painted, rusted) | O, F | Quay corners, yard, 3-8 per group | 200 | IM | none | P2 | partial (prop.barrel) |
| 147 | Nets draped on rails and piled | O | Trawler decks, quay rails, net lofts | 300 | IM + AC | wind (VS) | P1 | partial (prop.net_*) |
| 148 | Pallet stacks with wrapped goods | O, C | Warehouse fronts and market loading | 250 | IM | none | P2 | partial (prop.pallet) |
| 149 | Container stacks with livery colours | O | Freight quay, 2-4 high | 300 | IM attribute | none | P2 | partial (prop.container) |
| 150 | Harbor cranes (small jib, gantry) | O | Quay edge, 1 per 80 m | 1.5k | IM | slow slew | P2 | partial (prop.harbor_crane_small) |
| 151 | Mooring bollards with rope loops | O, L | Quay edge every 10-15 m | 200 | IM | none | P1 | partial (prop.bollard_mooring) |
| 152 | Crab/lobster pot stacks | O | Fishermen's quay, 4-20 per stack | 300 | IM | none | P1 | partial (prop.crab_pot) |
| 153 | Ice boxes and fish bins | O | Market stalls, trawler unload points | 150 | IM | none | P2 | partial (prop.ice_bin) |
| 154 | Tyre fenders on quay walls and boats | O | Quay wall every 4 m, 3 per boat side | 60 | IM | none | P1 | no |
| 155 | Fish on ice in market trays | O | Every seafood stall counter | 4 | AC/DC | none | P2 | no |
| 156 | Anchors and rusty chains | O | Quay displays, workboat decks, yard heaps | 150 | IM | none | P3 | no |
| 157 | Propane cylinder cages | O, C, L | Behind restaurants, marina fuel dock | 120 | IM | none | P3 | no |
| 158 | Hose reels and fuel dock pumps | O, L | Marina fuel dock, fish quay | 200 | IM | none | P3 | no |
| 159 | Tarps over cargo | O, F | Pallets, boat covers, log trailers | 40 | IM | flap (VS) | P2 | no |
| 160 | Pallet jacks and parked forklifts | O, C | Warehouse doors, quay | 200 / 2k | IM | none | P3 | partial (prop.forklift_static) |

## 10. Forest and logging (161-174)

| # | Item | Region | Placement rule | Tris | Tech | Motion | Pri | Exists |
|---|---|---|---|---|---|---|---|---|
| 161 | Log pile variants (stacked, decked, sorted by length) | F | Logging yard bays and roadside landings | 1.5k | IM | none | P1 | partial (prop.log_pile) |
| 162 | Sawdust and bark ground layer | F | Yard, mill and around log piles | 0 | SH (splat) + DC | none | P1 | no |
| 163 | Wood chip piles | F | Near chipper/mill, 1-3 | 200 | IM | none | P3 | no |
| 164 | Axe in chopping block | F, L | Cabin yards, beside firewood | 120 | IM | none | P2 | no |
| 165 | Chainsaw and fuel can on stump | F | Yard benches and fresh stumps | 200 | IM | none | P3 | no |
| 166 | Split firewood stacks | L, F | Against every cabin wall and shed | 300 | IM | none | P1 | no |
| 167 | Split-rail and post fences | L, F | Cabin lots, pasture edges, yard perimeter | 60 / 3 m | IM | none | P1 | no |
| 168 | Lichen boulders, size variety | F, L | Forest floor, trail edges, clusters | 80-500 | IM | none | P2 | partial (prop.rock_*) |
| 169 | Fern variety (sword fern, bracken) | F | Shaded forest floor, dense patches | 16 | GC AC | wind | P1 | partial (veg.fern) |
| 170 | Mushroom clusters | F | On logs, stumps, damp ground | 12 | IM | none | P2 | no |
| 171 | Survey tape and marking paint on trees | F | Trees at clear-cut boundaries | 2 | DC/AC | tape flutter (VS) | P3 | no |
| 172 | Slash piles (branch heaps) | F | Clear-cuts, 1 per 30 m | 300 | IM card cluster | none | P2 | no |
| 173 | Parked skidder / loader | F | Yard and active cut, 1 each | 2k | IM | none | P3 | no |
| 174 | Trail markers and cairns | F, L | Trail junctions, every 100-150 m | 60 | IM | none | P3 | partial (prop.trail_sign) |

## 11. Lighting, atmosphere, particles (175-188)

| # | Item | Region | Placement rule | Tris | Tech | Motion | Pri | Exists |
|---|---|---|---|---|---|---|---|---|
| 175 | Dust motes in sun shafts | C, F | Alleys, interiors, forest gaps at low sun | 2 / mote | PT | drift | P2 | no |
| 176 | Pollen and seed fluff | L, F | Meadows, summer afternoons | 2 | PT | drift with wind | P3 | no |
| 177 | Fireflies | L, F | Meadows and lake edge, dusk/night summer | 2 | PT | blink drift | P2 | partial (ani.firefly) |
| 178 | Steam from manholes and vents | C | 20% of manholes, cold mornings | 2 | PT | rise, wind | P1 | no |
| 179 | Chimney smoke | C, L, F | Cabins and Old Town chimneys by hour/temp | 2 | PT | rise, wind | P1 | no |
| 180 | Falling leaves | C, L, F | Under broadleaf trees, rate by wind/season | 2 | PT | tumble | P1 | no |
| 181 | Midge swarms | L, F | Over water edges and under trees at dusk | 1 | PT | swarm | P3 | no |
| 182 | God rays at low sun | All | Post pass, sun near horizon | 0 | SH | none | P2 | partial (pipeline) |
| 183 | Ground mist patches | F, L | Valley roads, lake surface at dawn | 2 | AC volume cards / SH fog | slow drift | P1 | partial (height fog) |
| 184 | Wet surface sheen after rain | All | Roads/sidewalks, darkened albedo + roughness by wetness | 0 | SH | drying over time | P2 | no |
| 185 | Spray at breakwater and rocks | O | Wave impacts on breakwater | 2 | PT | burst | P2 | no |
| 186 | Lamp light pools on ground | C, L, O | Under every street lamp at night | 2 | DC additive | none | P1 | no |
| 187 | Window light spill on sidewalks | C | Lit shop windows at night | 2 | DC additive | none | P2 | no |
| 188 | Heat shimmer over asphalt / exhaust | C | Summer noon roads, vehicle exhaust | 0 | SH (screen distort) | shimmer | P3 | no |

## 12. Surface and material variety (189-200)

| # | Item | Region | Placement rule | Tris | Tech | Motion | Pri | Exists |
|---|---|---|---|---|---|---|---|---|
| 189 | Road cracks | All roads | Hash-scattered, more on old/rural roads | 2 | DC / SH | none | P1 | no |
| 190 | Asphalt repair patches | C | 1-3 per road segment | 2 | DC | none | P1 | no |
| 191 | Oil stains in parking bays | C, O | Every parking bay, centre | 2 | DC | none | P1 | partial (atlas.decals) |
| 192 | Worn painted lines | All roads | All lane markings: break-up mask | 0 | SH | none | P1 | partial |
| 193 | Gum spots and stains on sidewalks | C | Sidewalks near shops/stops | 0 | SH (sidewalk detail) | none | P3 | no |
| 194 | Rust streaks on metal | O, F, C | Boats, containers, rails, drums | 0 | SH (tex.rust mask) | none | P2 | partial |
| 195 | Moss on wall bases and stone | L, F, C | Wall bottoms 0-0.6 m, north faces | 0 | SH | none | P2 | no |
| 196 | Dirt streaks under sills, grime gradient | C, L | All facades: ground-up grime + sill streaks | 0 | SH | none | P1 | no |
| 197 | Kerb/gutter grime line | C | Along all kerbs, 20 cm band | 0 | SH (road edge) | none | P1 | no |
| 198 | Storm drains with gutter wetness | C | Every 30-40 m along kerbs | 2 | DC | none | P2 | partial |
| 199 | Tyre skid marks | C | Junctions and bends | 2 | DC | none | P3 | no |
| 200 | Cobble/brick paver colour variation, missing pavers | C | All cobble/brick paving | 0 | SH (per-tile hash) | none | P2 | no |

## Top 25 quick wins (impact per cost, best first)

1. #1 Lawn grass tufts (GC ring already exists; fixes the flat green carpet)
2. #50 Tree/shrub contact shadow decals
3. #196 Facade grime and sill streaks (shader, 0 tris)
4. #197 Kerb grime line + #192 worn lines (shader)
5. #189 Road cracks + #190 patches (one decal batch)
6. #21 Round shrubs along building fronts
7. #51 Lily pads + #52 lilies (one IM batch, flat cards)
8. #9 Marram dune grass (fixes empty beach)
9. #96 Kerbside parking fill + #95 colour/dirt variety
10. #127 Window state variety + #128 interior parallax (shader)
11. #8 Pavement crack weeds
12. #54 Cattails in reed bands
13. #39 Per-instance autumn/tint variance
14. #80 Awning colour variety + #81 blade signs
15. #79 Wall AC units + #78 fire escapes (generators exist, just place)
16. #73 Trash bag piles + #72 newspaper boxes
17. #55 Shoreline foam + #56 pile ripple rings
18. #179 Chimney smoke + #178 manhole steam
19. #119 Pigeon flocks
20. #5 Dandelions + #27 flower beds
21. #29 Potted plants at shop doors + #28 window boxes
22. #67 Mooring lines + #154 tyre fenders
23. #60 Perched gulls
24. #166 Firewood stacks + #167 split-rail fences
25. #186 Lamp light pools at night

## Implementation order (3 batches)

Impact numbers are design estimates against Annex G §2.3. Measured baseline is software GL (SwiftShader-class) in this container; real-GPU fps is unmeasured, so every batch must be re-run through the PERF_REPORT viewpoint suite on all 4 presets, and Low is the binding preset.

**Batch 1: shaders, decals, ground-cover ring (items 1-3, 5, 8, 9, 11, 39, 50, 54, 55, 56, 127, 128, 189-192, 196, 197, 200)**
- Mostly 0-tri shader work plus GC card types added to the existing ring and one shared decal batch per chunk.
- Est. High: +6-10 draw calls, +40-90k tris (GC cards inside 25-60 m). Low: GC density x0.4, radius 30 m, +4 calls, +15-25k tris (fits under 350k from 282k worst).
- No shadow-pass cost (GC and decals never cast). Fill-rate risk from cards: hold `perf.foliageFillEstimate` ≤ 4.

**Batch 2: instanced props and placement density (items 21, 25, 27-29, 44, 49, 51, 52, 60, 67, 71-73, 75, 78-81, 85, 87, 95, 96, 100, 105, 145, 147, 151, 152, 154, 161, 166, 167, 169)**
- Reuse existing generators; add ~25 new IM types, merged into `mat.world` / prop atlas so each type is 1 call per LOD.
- Est. High: +30-50 draw calls, +120-250k tris main, +15-30 shadow calls (LOD0 props < 40 m cast only). City worst ~330 calls / ~650k tris vs 450 / 1.2M. Low: props beyond 40 m culled, small items (< 100 tris) culled beyond 25 m, +12-18 calls, must stay under 220 calls (138 worst now) and 350k tris; expect to drop Low LOD0 fire escapes and window boxes.

**Batch 3: life, particles, night (items 58, 59, 66, 112, 113, 115, 118, 119, 134, 135, 141, 175, 178-180, 183, 185, 186 and remaining P2/P3)**
- Animals as tiny IM with CPU paths; particles through one pooled atlas.particles system; emissive via existing bloom.
- Est. High: +15-25 calls, +30-60k tris, particles ≤ 2-4k quads. Low: particles x0.25, animals capped at 20, neon/string lights emissive without extra lights.
- Total after all three (High, City worst): ~350-380 calls, ~0.75-1.0M tris; inside budget on paper, unverified on GPU.

## Risks

- Perf: Low preset has only ~80 calls / ~65k tris headroom; every new type needs a Low cull distance or a density=0 setting. Forest alpha-card overdraw (ferns + grass + moss + saplings) is the most likely real-GPU bottleneck and is not measurable under software GL.
- Draw-call creep: each new material or atlas page is a new call; enforce one shared prop atlas and per-type InstancedMesh, merge static decals per chunk.
- Memory: more atlas pages (flowers, litter, posters, graffiti, interior parallax) push texture bytes; keep new art in existing `atlas.decals`, `tex.leaf_atlas`, `atlas.signage` at ≤ 2048² and check MemTracker.
- Popping: GC ring and small props popping at fixed radii; use dithered fade over the last 15% of radius and hash-stable placement so items don't reshuffle when the ring rebuilds (> 6 m move).
- Shadows: small props casting shadows would blow the shadow-call budget; only LOD0 props > 0.5 m within 40 m cast.
- CPU: per-frame matrix writes for animals/peds/boats; cap counts and update off-screen ones at low rate.
- Consistency: wind and wetness must drive grass, shrubs, cards, flags, awnings and puddles from the same globals, or scenes look out of sync.
