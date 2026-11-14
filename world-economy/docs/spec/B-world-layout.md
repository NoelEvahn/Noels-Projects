# Annex B — World layout

Owner: Stage 2 (Sonnet). All coordinates are metres in world space: +X east, +Z south, +Y up. A coordinate written `(x, z)` omits height; height comes from the terrain. POI and site coordinates are binding to ±30 m; Stage 2 snaps them to lots and writes the final values into `src/world/layout/pois.js`, which then becomes the source of truth. Ids are binding exactly.

## 1. Extent and scale

| Quantity | Value | Rationale |
|---|---|---|
| Playable square | x ∈ [−2000, 2000], z ∈ [−2000, 2000] (16 km²) | City crossing by car ≈ 90 s; full ring drive ≈ 9 min; enough room for four distinct regions without empty travel |
| Visual skirt | Low-poly terrain and sea out to ±6000; Mt. Sable peak at (300, −3600), summit 1,150 m, snow above 700 m | Backdrops in references 5 and 12 |
| Soft boundary | Toast warning at ±1940, invisible wall at ±1990. East highway ends at a tunnel portal | |
| Sea level | y = 0 | |
| Human | Capsule radius 0.3, height 1.8; eye 1.65; walk 1.6 m/s, run 4.5, sprint 6.5; step height 0.35; jump 0.9 | |
| Storey | Residential 3.2 m, commercial ground floor 4.5 m, office 3.8 m | |
| Roads | Lane 3.5 m; parking lane 2.5 m; sidewalk 4 m (3 m outside downtown); kerb 0.15 m | |
| Speeds | City limit 14 m/s (50 km/h), boulevard 17, highway 25 (90 km/h), forest dirt 10 | |
| Chunk | 100 m × 100 m, 40 × 40 chunks; `cx = floor((x + 2000) / 100)`, `cz = floor((z + 2000) / 100)` | |

## 2. Terrain (`world/layout/terrain.js`)

`heightAt(x, z)` = base profile + regional noise, then modified by stamps. It is cached in a 4 m `HeightGrid` (1001 × 1001 Float32, bilinear), built time-sliced at boot (budget 1.5 s on the reference desktop), plus an analytic 0–0.4 m detail noise outside flattened areas.

Base profile (before stamps):

| Zone | Height |
|---|---|
| Sea bed, z > coast | −1.5 at the shoreline falling to −35 at z = 2000 |
| Coastal strip, coast − 250 < z < coast | 2 → 8 |
| City plateau, x ∈ [−290, 1500], z ∈ [−350, 900] | 8 (Northgate rises to 14 at z = −350; Eastside rolls ±2) |
| West bank, x < −410, z ∈ [−350, 450] | 3 at the river bank rising to 18–30 rolling hills |
| Foothill ramp, z ∈ [−900, −350] | smoothstep 8 → 44 |
| Lake basin, x < 0, z < −900 | 44 plateau; bowl rim rising to 90–140 toward the west and north edges |
| Forest, x > 0, z < −900 | 44 at z = −900 → 120 at z = −1500 → 200 at z = −1900, hills ±25, ridges |

Stamps, applied in order: (1) water basins (lake, ponds, river channel, harbour basin, cove); (2) city plateau flatten; (3) road corridors: cross-section flattened to the road profile with 8 m blend shoulders, max grade 8% (10% on dirt roads); (4) POI pads: flat rectangles with 6 m blend; (5) beach profile: 1:20 slope from +2 to −1.5.

Coastline: `coastZ(x) = 1150 + 45·sin(x/380) + 25·sin(x/130 + 1.3)`, overridden by: Port Calder harbour basin (x ∈ [−1120, −700], quay line z = 1140, basin to z = 1380 enclosed by the breakwater), marina basin (x ∈ [−1380, −1140], z from 1130), Palm Cove (crescent beach centred (−1650, 1130), radius 220), city docks quay (x ∈ [−250, 1100], straight at z = 1100, quay top y = 2.5).

## 3. Water bodies (`world/layout/water.js`)

| Id | Type | Level y | Geometry | Depth | Boats |
|---|---|---|---|---|---|
| `water.ocean` | ocean | 0 (Gerstner, amplitude by weather 0.15–1.2 m) | Everything south of the coastline; harbour and marina basins are calm zones (amplitude × 0.2) | to 35 m | yes |
| `water.river` | river (Ash River) | 0, flat | Centreline x = −350 + 25·sin(z/260), from the weir pool (−350, −330) to the mouth at z ≈ 1150; width 60 m north of z = −100, 120 m south of it | 3–8 m | yes, connected to the ocean; Harbor Causeway clearance 5 m |
| `water.lake` | lake (Mirror Lake) | 40, flat with wind ripples | Centre (−1200, −1100), semi-axes 430 (E–W) × 320 (N–S), outline perturbed ±40 m by noise; two bays: Reed Bay (north-west) and Boathouse Bay (south-east) | to 18 m | yes |
| `water.pond.heron` | pond | 55 | Circle (−420, −1300), r = 80 | 3 m | rowboat only |
| `water.pond.reed` | pond | 30 | Circle (−1500, −480), r = 60 | 2 m | no |
| `water.creek.mill` | creek (decorative ribbon, flowing shader) | follows terrain | From the lake outlet weir (−860, −830) to the river weir pool (−350, −330), 4–6 m wide, small cascades | 0.3 m | no |
| `water.creek.inlet` | creek | follows terrain | From (−1900, −1150) into the lake at (−1640, −1150); crossed by the wooden footbridge | 0.3 m | no |

Ocean Gerstner set (shared by shader and physics): 4 waves, directions 200°, 170°, 225°, 140°; wavelengths 38, 21, 11, 6 m; base amplitudes 0.35, 0.18, 0.08, 0.04 m × weather factor; steepness 0.5.

## 4. Regions and districts

```js
function regionAt(x, z) {
  if (z > coastZ(x)) return 'ocean';
  if (x < -410 && z >= 450) return 'ocean';
  if (z < -400) return x < 0 ? 'lake' : 'forest';
  if (x < -410) return 'lake';            // west-bank foothills
  return 'city';
}
```

District rectangles (first match wins, in this order):

| District | x range | z range | Character |
|---|---|---|---|
| `city.oldtown` | [−290, 120] | [50, 650] | Brick lofts, cobbles, bridge approach (reference 1) |
| `city.downtown` | [260, 820] | [50, 550] | Glass towers, boulevard, park, footbridge (reference 2) |
| `city.market` | [260, 1100] | [550, 750] | Supermarket, retail strip, furniture, parking |
| `city.industrial` | [260, 1100] | [750, 950] | Depots, warehouses, hardware, factories |
| `city.docks` | [−290, 1100] | [950, 1150] and x ∈ [−290, 260], z ∈ [650, 950] | Quay, wholesale market, taxi depot, garage, used cars |
| `city.eastside` | [820, 1500] | [−150, 550] | Houses, car dealer, residential plots |
| `city.northgate` | [−290, 1100] | [−400, −150] | Apartments, walk-ups, sloping streets |
| `city.midtown` | rest of the city region | | Mixed brick and white mid-rise (reference 3) |
| `ocean.portcalder` | [−1120, −420] | [900, 1400] | Fishing harbour town (reference 7) |
| `ocean.marina` | [−1400, −1120] | [1000, 1500] | Marina, seafood market, lighthouse (reference 9) |
| `ocean.seagrass` | [−1500, −1150] | [900, 1100] | Waterfront houses |
| `ocean.palmcove` | [−1950, −1400] | [900, 1400] | Beach, palms, beach bar (reference 8) |
| `ocean.sea` | rest of the ocean region | | Open water, Gull Rock island |
| `lake.pinehaven` | [−820, −560] | [−1220, −920] | Lake village |
| `lake.westbank` | [−2000, −410] | [−400, 450] | Foothill farmland, Coast Highway |
| `lake.shore` | rest of the lake region | | Shore, cabins, campground |
| `forest.gate` | [300, 760] | [−780, −400] | Ranger station, Ridge Lots |
| `forest.sawmill` | [540, 900] | [−1050, −780] | Sawmill junction |
| `forest.timberline` | [900, 1600] | [−1600, −1050] | Logging yard and stands (reference 12) |
| `forest.highridge` | rest of the forest region | | Deep forest, fire tower, campsites (references 10, 13) |

## 5. Road graph (`world/layout/roads.js`)

### 5.1 City grid

Avenues (north–south), index `a0…a9`, at x = −160 + 140·i: River St (−160), 1st Ave (−20), 2nd Ave (120), 3rd Ave (260), **Central Ave** (400, boulevard), 5th Ave (540), 6th Ave (680), 7th Ave (820), 8th Ave (960), 9th Ave (1100).

Streets (east–west), index `s0…s12`, at z = −250 + 100·j: Ash St (−250), Birch St (−150), Cedar St (−50), Dover St (50), Elm St (150), Foundry St (250), Grant St (350), **Harbor Blvd** (450, boulevard), Iron St (550), Jetty St (650), Keel St (750), Lumber St (850), Quay Rd (950).

| Road class | Carriageway | Right of way | Surface |
|---|---|---|---|
| Street / avenue | 2 lanes + 2 parking lanes = 12 m | 20 m (4 m sidewalks) | asphalt; cobble inside `city.oldtown` west of 2nd Ave |
| Boulevard (Central Ave, Harbor Blvd) | 6 lanes + 4 m planted median = 25 m | 35 m (5 m sidewalks) | asphalt |
| Bridge St (z = 300, 2nd Ave → Central Ave) | 4 lanes = 14 m | 22 m | asphalt |

Block `B(i, j)` lies between `a_i`, `a_{i+1}`, `s_j`, `s_{j+1}`; centre x = −90 + 140·i, z = −200 + 100·j. Riverside strip `R(j)`: x ∈ [−280, −170] west of River St, promenade along the bank.

Modifications: Grant St is closed to cars between 6th and 7th Ave (Founders Park). Blocks `B(0,5)` and `B(1,5)` carry the bridge approach viaduct along z = 300. Blocks `B(2,5)` and `B(3,5)` are split by Bridge St. Signalised intersections: every crossing on Central Ave and Harbor Blvd, plus River St × Grant St and 2nd Ave × Bridge St. Others are stop-controlled.

### 5.2 Inter-regional roads (control points; Stage 2 fits smooth splines and applies road stamps)

| Id | Name | Class | Control points (x, z) | Length |
|---|---|---|---|---|
| `r.bridge` | Harlan Bridge | 4 lanes + 2 walkways, 22 m | (120, 300) touchdown y 8 → viaduct → east tower (−250, 300) deck y 26 → west tower (−450, 300) → (−700, 300) y 18 | 820 m |
| `r.coast` | Coast Highway | 2 lanes, 8 m + shoulders | (−700, 300) → (−760, 620) → (−800, 900) → Port Calder (−900, 1040) → (−1150, 1060) → Seagrass Row (−1380, 1040) → Palm Cove parking (−1600, 1060) | 1.75 km |
| `r.lake` | Lake Road | 2 lanes | (−700, 300) → (−690, 0) → (−660, −250) → (−640, −520) → (−650, −800) → Pinehaven (−680, −1000) | 1.35 km |
| `r.mill` | Mill Bridge Road | 2 lanes | River St × Ash St (−160, −250) → Mill Bridge (−250…−450, −250), deck y 10 → (−660, −250) | 500 m |
| `r.lakeloop` | Lakeshore Loop | 1.5 lanes, 6 m | Pinehaven (−700, −1080) → south shore (−900, −740) → (−1250, −730) → (−1560, −800) → west shore (−1700, −1050) → (−1640, −1380) → north shore (−1200, −1480) → (−860, −1400) → Pinehaven | 3.0 km |
| `r.oldforest` | Old Forest Road | 2 lanes, paved, wet (reference 10) | Pinehaven (−660, −1010) → (−420, −1180) Heron Pond → (−200, −1150) → (0, −960) → (200, −760) → Forest Gate (520, −620) | 1.45 km |
| `r.north` | North Road | 2 lanes | Forest Gate (520, −620) → (540, −460) → 5th Ave × Ash St (540, −250) | 380 m |
| `r.timber` | Timber Road | 2 lanes gravel | Forest Gate (520, −620) → Sawmill (700, −900) → (900, −1100) → Timberline Yard (1150, −1300) | 1.0 km |
| `r.spur.a/b/c` | Logging spurs | dirt, 4 m (reference 13) | Yard → Stand A (1300, −1450); Yard → Stand B (950, −1500); Yard → Stand C (1450, −1100) | 0.2–0.35 km each |
| `r.tower` | Fire Tower Track | dirt | (900, −1100) → (820, −1400) → Fire Tower (800, −1650) | 0.6 km |
| `r.causeway` | Harbor Causeway | 2 lanes, low girder bridge deck y 7 | Quay Rd × River St (−160, 950) → (−250, 1000) → bridge → (−450, 1000) → Calder Terminal (−640, 1090) → Port Calder (−900, 1040) | 780 m |
| `r.east` | East Highway | 4 lanes | Harbor Blvd × 9th Ave (1100, 450) → (1500, 420) → tunnel portal (1900, 350) | 820 m |
| `r.eastside` | Eastside residential streets | 2 lanes | Loop from (1100, 50) → (1380, 80) → (1400, 350) → (1100, 250), with 3 cul-de-sacs | 1.1 km |

### 5.3 Paths (walk graph only)
Sidewalks of every street; Harlan Bridge walkways; Founders Park paths; riverside promenade (R strip); steel footbridge over Central Ave at (400, 200); harbour promenade and marina boardwalk; breakwater path to the lighthouse; beach boardwalk; lakeshore trail (inside the loop road, at the water); wooden footbridge at the inlet (−1640, −1150); forest trails: Fern Hollow trail (350, −1050) ↔ gate, Ridge trail gate → fire tower → Eagle Ridge camp (1500, −1600).

### 5.4 Hub POIs (connectivity test set)
`poi.city.spawn`, `poi.city.depot`, `poi.city.northgate_exit`, `poi.lake.pinehaven`, `poi.ocean.portcalder`, `poi.ocean.palmcove_parking`, `poi.forest.gate`, `poi.forest.timberline`.

### 5.5 Ring route (traversal test)
Spawn → River St north → Foundry St → 2nd Ave → Bridge St → Harlan Bridge → Lake Road → Pinehaven → Old Forest Road → Forest Gate → North Road → 5th Ave south → Harbor Blvd west → River St → spawn. Length ≈ 7.6 km.

### 5.6 Boat routes (boat nav graph)
Ocean: Port Calder harbour mouth (−900, 1400) ↔ marina mouth (−1260, 1500) ↔ Palm Cove pier (−1560, 1230) ↔ Gull Rock dock (−1750, 1650) ↔ fishing grounds A (−900, 1700), B (−1500, 1780), C (−300, 1800) ↔ river mouth (−350, 1200) ↔ city quay (330, 1120) ↔ upriver to the riverside dock (−285, 600) and the weir pool. Lake: village docks, boathouse, campground dock, inlet, rocky point, centre deep. Channel markers (`prop.channel_marker`) line harbour entrances.

## 6. Points of interest (`world/layout/pois.js`)

`type` values: `job`, `shop`, `market`, `bank`, `service`, `dealer`, `fuel`, `lodging`, `civic`, `transit`, `dock`, `fishspot`, `landmark`, `resource`, `camp`.

### 6.1 City

| POI id | Name | Type | Position (x, z) | Archetype | Notes |
|---|---|---|---|---|---|
| `poi.city.spawn` | Harlan Central Bus Terminal, River St exit | transit | (−147, 372), yaw 0 | `bld.bus_station` at (−90, 400) | New-game spawn. Looking north: viaduct overhead at z = 300, bridge tower at (−250, 300) |
| `poi.city.hostel` | Bridgeview Hostel | lodging | (−100, 339) | `bld.brick_walkup` + `int.hostel_room` | $18 per night |
| `poi.city.diner` | Marlowe's Diner | job | (0, 368) | `bld.diner` + `int.diner` | `job.city.restaurant`; red awnings |
| `poi.city.jobcentre` | WorkLink Job Centre | service | (90, 368) | `bld.mixed_use` | Job board (also in the phone) |
| `poi.city.bank` | First Harlan Bank | bank | (330, 361) | `bld.bank` + `int.bank_lobby` | ATMs also at 6 other locations |
| `poi.city.cityhall` | City Hall | civic | (470, 400) | `bld.bank` variant | Licences, tax office |
| `poi.city.realty` | Harlan Realty | service | (330, 200) | `bld.office_midrise` | Property listings |
| `poi.city.office` | Northgate Financial Tower | job | (610, 300) | `bld.glass_tower` + `int.office_floor` | `job.city.office` |
| `poi.city.construction` | Harlan Yards site | job | (470, 200) | `bld.construction_site` | `job.city.construction`; rises over game weeks |
| `poi.city.footbridge` | Central Ave footbridge | landmark | (400, 200) | `infra.footbridge_steel` | Reference 2 |
| `poi.city.park` | Founders Park | landmark | (750, 350) | park blocks `B(6,5)`, `B(6,6)` | Vending and food-cart sites |
| `poi.city.police` | 3rd Precinct | civic | (190, 100) | `bld.mixed_use` variant | Ambient police cars |
| `poi.city.supermarket` | FreshWay | job, shop | (750, 600) | `bld.supermarket` + `int.supermarket` | `job.city.supermarket`; groceries |
| `poi.city.furniture` | Loft & Home | shop | (610, 600) | `bld.mixed_use` | Furniture catalogue |
| `poi.city.dealer` | Harlan Motors | dealer | (890, 400) | showroom | New cars, motorcycles, vans, trucks |
| `poi.city.usedcars` | Budget Wheels | dealer | (−90, 700) | lot | Used vehicles |
| `poi.city.mechanic` | Torque & Sons | job, service | (50, 700) | `bld.garage_workshop` + `int.garage` | `job.city.mechanic`; repairs |
| `poi.city.taxi` | Metro Cab depot | job | (50, 600) | `bld.warehouse` variant | `job.city.taxi` |
| `poi.city.gas` | Harlan Fuel | fuel | (140, 670) | `bld.gas_station` | |
| `poi.city.depot` | Swift Parcel depot | job | (470, 800) | `bld.warehouse` | `job.city.delivery` |
| `poi.city.hardware` | BuildRight | shop | (610, 800) | `bld.warehouse` variant | Tools, building materials |
| `poi.city.warehouse` | Calder Logistics | job | (890, 800) | `bld.warehouse` + `int.warehouse` | `job.city.warehouse` |
| `poi.city.wholesale` | Harlan Wholesale Market | market | (330, 900) | market hall | `mkt.city.wholesale` |
| `poi.city.quay` | City Quay public slip | dock | (330, 1095) | `infra.quay_wall` | Boat access |
| `poi.city.riverdock` | Riverside dock | dock | (−285, 600) | `infra.dock_floating` | |
| `poi.city.apartments` | Northgate Apartments | landmark | (330, −200) | `bld.apartment_block` | Purchasable flats |
| `poi.city.lofts` | Riverside Lofts | landmark | (−225, 200) | `bld.brick_loft` | Purchasable lofts, bridge view |
| `poi.city.northgate_exit` | North Road junction | transit | (540, −350) | — | |
| `poi.city.east_tunnel` | East Highway tunnel | transit | (1900, 350) | `infra.tunnel_portal` | Traffic source/sink |
| `poi.city.delivery.*` | 40 delivery addresses | job | spread over all city districts | door anchors | Generated from lots; ids `poi.city.delivery.01…40` |
| `poi.city.taxi.*` | 30 taxi stands / hail points | job | kerb points | — | `poi.city.taxi.01…30` |

### 6.2 Lake District

| POI id | Name | Type | Position | Archetype | Notes |
|---|---|---|---|---|---|
| `poi.lake.pinehaven` | Pinehaven village square | transit | (−700, −1080) | — | Hub |
| `poi.lake.store` | Pinehaven General Store and Fish Counter | market, shop | (−700, −1050) | `bld.general_store` | `mkt.lake.fish`; groceries, basic gear |
| `poi.lake.fishhut` | Pinehaven Bait & Tackle | job, shop | (−775, −1120) | `bld.fishing_hut` + `int.shop_small` | `job.lake.fishhut`; rods, bait, licence |
| `poi.lake.boathire` | Mirror Lake Boat Hire | job | (−780, −1040) | `infra.pier_timber` + kiosk | `job.lake.boatrental` |
| `poi.lake.grill` | The Lakeside Grill | job | (−765, −980) | `bld.lodge_restaurant` + `int.lodge_restaurant` | `job.lake.restaurant` |
| `poi.lake.gas` | Pinehaven Fuel (road and boat fuel) | fuel | (−660, −1010) | `bld.gas_station` small | |
| `poi.lake.boathouse` | Old Boathouse | landmark, dock | (−900, −800) | `bld.boathouse` + `int.boathouse` | Reference 4; purchasable; fishing business base |
| `poi.lake.campground` | North Shore Campground | camp | (−1200, −1440) | tents, tables, dock | Recreation; vending and food-cart site |
| `poi.lake.redcabin` | Red Roof Cabin and footbridge | landmark | (−1640, −1150) | `bld.cabin_plank`, `infra.footbridge_wood` | Reference 6 |
| `poi.lake.weir` | Mirror Lake weir | landmark | (−860, −830) | `infra.weir` | Creek outlet |
| `poi.lake.fish.dock` | Village dock | fishspot | (−790, −1070) | — | Perch, bass |
| `poi.lake.fish.rocks` | Rocky Point | fishspot | (−1250, −785) | — | Trout, pike |
| `poi.lake.fish.reeds` | Reed Bay | fishspot | (−1480, −1340) | — | Pike, carp |
| `poi.lake.fish.inlet` | Inlet footbridge | fishspot | (−1630, −1150) | — | Trout |
| `poi.lake.fish.deep` | Lake centre (boat only) | fishspot | (−1200, −1100) | — | Large trout, pike |
| `poi.lake.fish.heron` | Heron Pond | fishspot | (−420, −1300) | — | Carp, perch |
| `poi.lake.cabin.1…4` | Shore cabins | landmark | (−1000, −1420), (−1400, −1400), (−1700, −1000), (−1450, −770) | `bld.cabin_log` ×2, `bld.cabin_plank` ×2 | Purchasable |
| `poi.lake.lots` | Lakeview Lots | landmark | (−640, −1160) | 4 land plots | Build your own house |

### 6.3 Ocean Region

| POI id | Name | Type | Position | Archetype | Notes |
|---|---|---|---|---|---|
| `poi.ocean.portcalder` | Port Calder harbour square | transit | (−900, 1040) | — | Hub |
| `poi.ocean.harbor` | Fishing harbour, trawler berths | job, dock | (−880, 1150) | `infra.quay_wall`, moored trawlers | `job.ocean.fisherman` (trawler "Calder Star") |
| `poi.ocean.seafood` | Calder Seafood Market | market | (−1040, 1125) | `bld.market_stall` ×6, striped awnings | `mkt.ocean.seafood` |
| `poi.ocean.terminal` | Calder Terminal | job | (−640, 1100) | `bld.container_terminal` | `job.ocean.port` |
| `poi.ocean.boatyard` | Calder Boatyard | service | (−760, 1160) | `bld.harbor_shed`, slipway | Boat repair |
| `poi.ocean.fueldock` | Harbour fuel dock | fuel | (−980, 1165) | — | Boat and road fuel |
| `poi.ocean.marina` | Calder Marina | dock | (−1240, 1150) | `infra.dock_floating` fingers | Player berths |
| `poi.ocean.marine_dealer` | Calder Marine | dealer | (−1200, 1090) | showroom | Boats |
| `poi.ocean.ferry` | Water-taxi pier | job, dock | (−1160, 1150) | `infra.pier_timber` | `job.ocean.boatop` |
| `poi.ocean.lighthouse` | Calder Light | landmark | (−1120, 1420) | `bld.lighthouse` on `infra.breakwater` | Reference 9 |
| `poi.ocean.seagrass` | Seagrass Row | landmark | (−1380, 1040) | `bld.house_suburban` ×8 | Waterfront houses, purchasable |
| `poi.ocean.palmcove_parking` | Palm Cove car park | transit | (−1600, 1060) | — | Hub |
| `poi.ocean.beach` | Palm Cove beach | landmark | (−1650, 1130) | palms, rocks, loungers | Reference 8 |
| `poi.ocean.beachbar` | Coco's Beach Bar | shop | (−1700, 1090) | `bld.beach_bar` | Food business site |
| `poi.ocean.pier` | Palm Cove pier | dock, fishspot | (−1560, 1230) | `infra.pier_timber` | Shore sea fishing |
| `poi.ocean.gullrock` | Gull Rock | landmark, dock | (−1750, 1650) | island, small dock | Ferry stop |
| `poi.ocean.grounds.a/b/c` | Fishing grounds | fishspot | (−900, 1700), (−1500, 1780), (−300, 1800) | — | Trawl zones, radius 200 m; school positions drift |
| `poi.ocean.gas` | Coast Fuel | fuel | (−820, 1020) | `bld.gas_station` small | |

### 6.4 Forest Region

| POI id | Name | Type | Position | Archetype | Notes |
|---|---|---|---|---|---|
| `poi.forest.gate` | Timberline Ranger Station | job | (520, −620) | `bld.ranger_station` | `job.forest.forestry`; hub |
| `poi.forest.store` | Gate Trading Post | shop | (480, −650) | `bld.general_store` | Tools, supplies |
| `poi.forest.gas` | Forest Fuel | fuel | (560, −600) | `bld.gas_station` small | |
| `poi.forest.sawmill` | Sawmill Junction | market, service | (700, −900) | `bld.sawmill` + `int.sawmill` | `mkt.forest.sawmill`; mills logs into lumber |
| `poi.forest.timberline` | Timberline Yard | job | (1150, −1300) | sheds, log piles, loader, trucks | `job.forest.logger`; hub (reference 12) |
| `poi.forest.stand.a/b/c` | Logging stands | resource | (1300, −1450), (950, −1500), (1450, −1100) | marked trees | Regrow over time |
| `poi.forest.firetower` | High Ridge Fire Tower | landmark | (800, −1650) | `bld.fire_tower` | Forestry tasks |
| `poi.forest.camp.fern` | Fern Hollow Campsite | camp | (350, −1050) | tents, fire ring | |
| `poi.forest.camp.eagle` | Eagle Ridge Campsite | camp | (1500, −1600) | | |
| `poi.forest.meadow` | Elk Meadow | landmark | (900, −1150) | clearing | Wildlife |
| `poi.forest.cabin.1…3` | Forest cabins | landmark | (250, −800), (600, −1300), (1300, −900) | `bld.cabin_log` + `int.cabin_log` | Purchasable (reference 11) |
| `poi.forest.lots` | Ridge Lots | landmark | (420, −760) | 3 land plots | |
| `poi.forest.plant.1…4` | Replanting plots | resource | cleared areas near stands | — | Forestry planting |

## 7. Streaming and far view (`world/chunks.js`, `render/chunkManager.js`)

| Ring | Radius (High) | Content |
|---|---|---|
| Near (LOD0) | ≤ 3 chunks (300 m) | Full builders, props, ground cover ring 60 m, colliders active |
| Mid (LOD1) | ≤ 8 chunks (800 m) | LOD1 builders, trees as LOD1/impostors, no small props |
| Far (LOD2) | whole world | Per-region far proxy built once at load: terrain at 32 m grid, merged LOD2 buildings, forest canopy impostor clusters, bridge and lighthouse silhouettes |

Radii scale with `drawDistance` (Annex G §3). Rules:
- Chunk build is a generator: `function* buildChunk(cx, cz, lod)` yielding after each builder call; `Streaming.pump` resumes generators until the frame budget is used.
- Priority = distance to the camera along the movement direction (look-ahead 1.5 s of velocity).
- Hysteresis: unload at load radius + 1 chunk. Disposed geometry returns typed arrays to a pool.
- Colliders, nav graph and POIs for the whole world are always in memory (pure data, about 10 MB); only meshes stream.
- Interiors build when the player is within 40 m of the door and dispose beyond 80 m.
- Teleport and fast travel show a 0.6 s fade while the near ring builds without budget.

## 8. Population and ambient life (data in `data/balance.js`, behaviour in `game/ai/`)

| District group | Pedestrian density (per 100 m of sidewalk, peak) | Traffic (vehicles per km of lane, peak) | Parked cars (share of kerb slots) |
|---|---|---|---|
| Downtown, market | 10 | 14 | 60% |
| Old Town, midtown | 7 | 9 | 70% |
| Northgate, Eastside | 3 | 4 | 50% |
| Industrial, docks | 2 | 6 (40% trucks/vans) | 30% |
| Pinehaven, Port Calder, marina | 5 | 3 | 40% |
| Palm Cove (daytime, clear) | 8 on the beach | 1 | car park 50% |
| Rural roads, forest | 0.2 | 1 | — |

Hour multipliers: 00–05: 0.1; 06–07: 0.5; 08–09: 1.0; 10–11: 0.7; 12–13: 1.0; 14–16: 0.7; 17–19: 1.0; 20–22: 0.5; 23: 0.2. Rain × 0.5 for pedestrians. Final counts are multiplied by the crowd and traffic density settings and capped by the preset.

Ambient set pieces: moored boats (Port Calder 14, marina 18, lake 6); 2 trawlers leaving and returning daily (06:00, 16:00); log truck shuttling yard ↔ sawmill; delivery vans at the depot; construction crane slewing; gull flocks at the harbour and marina; crows at the yard; anglers at 3 lake spots.

## 9. Land plots, properties and business sites (positions; economics in Annex D)

| Group | Ids | Location |
|---|---|---|
| City flats | `prop_1…8` | Northgate Apartments (4), Riverside Lofts (2), Downtown tower flats (2) at (540, 150) |
| City houses | `prop_9…14` | Eastside loop |
| City commercial units | `site.city.shop.01…10` | Old Town ground floors (4), Market strip (4), Downtown podium (2) |
| City cafe/restaurant units | `site.city.food.01…06` | Old Town (2), Downtown (2), Market (1), Park edge (1) |
| City warehouses | `site.city.wh.01…03` | Industrial: (750, 800), (1030, 800), (750, 900) |
| City supermarket lot | `site.city.super.01` | (1030, 600) |
| City depot yards | `site.city.yard.01…02` | (330, 800), (1030, 900) |
| Vending sites | `site.vend.01…40` | Bus terminal, hostel, depot, office lobby, park ×3, supermarket front, gas stations ×5, marina, harbour, beach ×2, campground, ranger station, sawmill, others on busy sidewalks |
| Food-cart pitches | `site.cart.01…10` | Park ×2, Old Town bridge view, Downtown plaza, market, marina, beach ×2, campground, Pinehaven square |
| Lake properties | `prop_15…20` | 4 cabins, boathouse, Pinehaven shop unit `site.lake.shop.01` |
| Lake business sites | `site.lake.dock.01…02`, `site.lake.food.01` | Boat-hire docks at (−800, −1100) and campground; lakeside cafe unit |
| Lake plots | `plot_1…4` | Lakeview Lots, each 24 m × 24 m |
| Ocean properties | `prop_21…28` | Seagrass Row houses (5), Port Calder flats (2), beach bar |
| Ocean business sites | `site.ocean.berth.01…04`, `site.ocean.stall.01…03`, `site.ocean.shop.01…02`, `site.ocean.dock.01` | Harbour berths, seafood stalls, town shops, marina rental dock |
| Ocean plots | `plot_5…7` | Clifftop lots at (−1480, 960), 30 m × 24 m |
| Forest properties | `prop_29…31` | 3 forest cabins |
| Forest business sites | `site.forest.lease.01…03`, `site.forest.yard.01` | Timber leases at the stands, yard pitch at (1050, −1250) |
| Forest plots | `plot_8…10` | Ridge Lots, 30 m × 30 m |
| Eastside plots | `plot_11…12` | (1380, 200), 24 m × 30 m |
