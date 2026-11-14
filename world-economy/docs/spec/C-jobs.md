# Annex C — Jobs

Owner: Stage 4 (Sonnet) for logic and controllers; Stage 3 supplies props, uniforms and first-person tool models; Stage 5 supplies the HUD widgets. Seventeen jobs, each with its own interactive loop played in the 3D world. No job is a menu click.

## 1. Shared framework

### 1.1 Employment rules

| Rule | Value |
|---|---|
| Getting a job | Talk to the manager at the job POI or use the Jobs app. Requirements (licence, skill level, vehicle) are checked by `Sim.cmd('job.apply')` |
| Concurrent jobs | One employer at a time. `job.lake.fishing` is self-employment and can be done alongside any job |
| Switching | Any time outside a shift: `job.quit` then `job.apply`. No penalty; skill levels are kept per job |
| Shift | Starts at the job POI during opening hours with `job.startShift`. Ends when the player chooses `job.endShift`, after 8 game hours, on a failure state, or when energy reaches 0 |
| Pay | Piece rate per completed task, computed in the sim from `data/jobs.js`: `pay = basePay × (0.4 + 0.6 × score) × skillMult + bonus`. `skillMult = 1 + 0.07 × (level − 1)`. No task, no pay. The UI shows an estimated hourly rate |
| Payout | At shift end: gross = Σ task pay; income tax 10% recorded as `tax.income`; net paid as `wage` to `cash`; tips paid as `tip` (untaxed) |
| XP | `xp = round(10 × difficulty × score)` per task to the job skill; `xpToNext(level) = round(100 × level^1.5)`; max level 10 |
| Energy | Each task costs energy (0.5–2). Below 20 energy, timing windows shrink 20% |
| Uniform | Starting a shift swaps the player's outfit to the job uniform (visual only) and back at the end |
| Anti-exploit | `job.reportTask` is rejected if the task id was not issued by the sim for this shift, if it was already reported, or if elapsed time is below the task's `minSeconds` |

### 1.2 Controller contract (`game/jobs/jobBase.js`)

```js
class JobController {
  constructor(ctx)        // {bus, world, sim, game, input, rng, audio}
  start(shiftId)          // spawn job entities, set Input context, request first task
  fixedUpdate(dt)         // state machine
  getHud()                // → JobHud (below); polled by the UI at 10 Hz
  stop(reason)            // 'ended'|'failed'|'timeout'|'exhausted' → cleans up; sim computes the summary
}
/** @typedef {Object} JobHud
 *  @property {string} title  @property {string} objective
 *  @property {number} [timerSec]  @property {number} [progress] 0..1
 *  @property {Array<{type:string, id:string, ...}>} widgets   // types in 1.3
 *  @property {Array<{action:string, label:string}>} prompts
 *  @property {{tasks:number, earned:number, grade:string}} shift
 */
```

Tasks are issued by the sim (`Sim.cmd('job.nextTask', {shiftId})` → task descriptor from seeded RNG) so they are deterministic and saveable. Controllers only read `Input.axis/down/pressed`, `World` queries and `Game` entities, so scripted bots can play them headless.

### 1.3 Mechanic primitives (shared code in `game/jobs/primitives/`, shared widgets in the UI)

| Primitive | Widget type | Behaviour | Used by |
|---|---|---|---|
| Timing bar | `timingBar` | Marker sweeps; press in the green zone. Zone width from skill | cooking, chopping, riveting, hooking, torque |
| Hold ring | `holdRing` | Hold an action for a duration; release early fails | pouring, draining, tying, planting |
| Tension bar | `tensionBar` | Keep a value inside a moving zone by holding/releasing; opposing force varies | fishing fight, winch haul, chainsaw cut |
| Sequence | `sequence` | Press shown keys in order (optionally in rhythm) | lug nuts, mooring, knife work |
| Balance | `balance` | Keep a cursor centred with left/right against drift | tray carry, jackhammer, crane sway |
| Carry | world interaction | Pick up, carry (slower, cannot sprint), place on a target anchor | stocking, crates, logs, parcels |
| Service queue | `tickets` | NPC customers with orders and patience bars | diner, hut, grill, rental |
| Drive to target | `route` | Waypoints, timers, comfort/damage meters | delivery, taxi, truck, boat |
| Operate machine | `gauge` + camera | Dedicated control mapping and camera for a machine entity | forklift, cranes, loader, winch |
| Sort lanes | `sortLanes` | Items arrive; send each left/right/keep quickly | catch sorting, email triage, scanning |
| Document | `document` | In-world screen UI: compare, click, drag, type | office |
| Inspect | `inspect` | Aim at hotspots; identify by visual or audio cue | mechanic diagnosis, tree marking, fire spotting |

### 1.4 Pay table (initial values in `data/jobs.js`; tuned by bots against Annex D §14)

"≈ $/h" is the expected gross per game hour for an average player (score 0.7) including typical tips; L1 → L10.

| Job | Task unit | Base pay per unit | Units per game hour | ≈ $/h L1 | ≈ $/h L10 | Tips |
|---|---|---|---|---|---|---|
| `job.city.restaurant` | order served | $2.60 | 6–8 | 16 | 32 | yes |
| `job.city.supermarket` | box stocked / customer checked out | $0.95 / $1.45 | 15 / 10 | 14 | 27 | no |
| `job.city.delivery` | parcel delivered | $5.00 + $0.004 per metre | 2.5–3.5 | 20 | 40 | yes |
| `job.city.construction` | site task | $5.60 | 3–4 | 18 | 35 | no |
| `job.city.taxi` | fare completed | $2.00 + $0.006 per metre | 2–3 | 20 | 41 | yes |
| `job.city.warehouse` | pallet moved / order picked | $1.55 / $3.20 | 11 / 5 | 16 | 32 | no |
| `job.city.mechanic` | repair job | $9–$22 by difficulty | 1–1.5 | 19 | 40 | rare |
| `job.city.office` | desk task | $4.20 × rank multiplier | 4 | 17 | 46 | no |
| `job.lake.fishing` | fish sold (market value) | market | 0.8–1.6 fish | 14 | 38 | — |
| `job.lake.fishhut` | customer served | $1.75 | 8–10 | 15 | 28 | some |
| `job.lake.boatrental` | rental cycle | $3.30 | 4–6 | 16 | 31 | some |
| `job.lake.restaurant` | table completed | $4.60 | 3 | 19 | 37 | yes (high) |
| `job.ocean.fisherman` | crew share of landed catch | 12% of value at L1, +1% per level | 1 trip per 9–12 h | 23 | 45 | — |
| `job.ocean.port` | container move / mooring / crate | $2.45 / $6 / $1.2 | 8 | 19 | 37 | no |
| `job.ocean.boatop` | passenger leg | $6.20 | 3 | 20 | 39 | yes |
| `job.forest.logger` | log delivered (m³) | $7.20 × quality | 2.5 | 18 | 38 | no |
| `job.forest.forestry` | task | $5.10 | 3.5 | 17 | 33 | no |

### 1.5 Job record (`data/jobs.js`)

```js
{ id:'job.city.delivery', title:'Courier', employer:'Swift Parcel', poi:'poi.city.depot',
  hours:[6,22], requires:{ licence:null, skill:null, vehicleClass:null },
  uniform:'outfit.courier', skill:'skill.city.delivery',
  tasks:{ parcel:{ basePay:500, perMetre:0.4, difficulty:1.0, minSeconds:20, energy:1.0 } },
  unlocks:[ {level:3, id:'company_van'}, {level:5, id:'fragile_routes'}, {level:8, id:'express_contracts'} ],
  failure:{ maxStrikes:3 } }
```

## 2. City jobs

### 2.1 `job.city.restaurant` — Line cook and server (P0)

| Field | Spec |
|---|---|
| Location | `poi.city.diner`, `int.diner`. Open 07:00–23:00 |
| Uniform / props | White apron, cap. Knife, pan, spatula, plates, order tickets |
| Input | Move WASD; `E` interact with the focused station; `Space` timing action; `1–4` select ingredient at the fridge |
| Loop | 1. A ticket prints at the pass (2–4 components: for example grilled fish, salad, fries). 2. Fridge: pick the listed ingredients (wrong pick costs time). 3. Board: `sequence` of 3–6 chops in rhythm. 4. Grill or fryer: place, then `timingBar` to flip and again to remove; late removal burns. 5. Plate at the pass (`holdRing` 1 s). 6. Carry the plate to the numbered table and set it down. 7. Up to 3 tickets overlap; patience bars run on each |
| Score | Timing accuracy (50%), ticket time against par (30%), correct components (20%) |
| Pay | Per order; tips from tables scale with score and speed |
| Progression | L3: two grills usable at once. L5: specials (higher pay, 5 components). L8: head-cook role, base pay +25% |
| Failure | Burnt or wrong dish = strike and no pay for that order. 3 strikes end the shift. Patience expiry = lost order, no strike |
| Economy link | Each order consumes ingredients from the diner's stock, which the diner buys from `mkt.city.wholesale` (raising demand for fish and produce). In the player's own restaurant the same loop runs with `staffAssist`: the hour's quality and throughput rise and one cook wage is saved |

### 2.2 `job.city.supermarket` — Stocker and cashier (P1)

| Field | Spec |
|---|---|
| Location | `poi.city.supermarket`, `int.supermarket`. 06:00–22:00 |
| Uniform / props | Green polo, name badge. Stock cart, boxes, price gun, scanner |
| Input | WASD; `E` pick/place; mouse aim; `Space` scan; `1–3` choose |
| Loop A (stocking) | Take a cart of 6 colour-labelled boxes from the backroom, find the matching aisle and shelf bay (signs overhead), `E` to shelve each (`holdRing` 0.6 s). Return the cart |
| Loop B (checkout) | Customers queue. Items slide along the belt: aim at the barcode and `Space` to scan (`sortLanes` variant). Loose produce needs a code: pick the right icon of 3. Take payment: choose the correct change of 3 options within 5 s |
| Phases | The shift alternates A and B every 4 tasks, following store need (empty shelves increase A) |
| Score | A: time per box and correct bay. B: scan speed, zero mis-scans, correct change |
| Progression | L3: pallet jack (12 boxes). L5: customer-service desk tasks (refund check). L8: shift supervisor pay |
| Failure | Wrong change or mis-scan = strike; 3 strikes end the shift. Queue of 6+ for 60 s lowers tips to 0 |
| Economy link | Shelf stock is the store inventory; stocking moves goods from backroom to shelf, which the store's demand model needs to make sales. Same loop in a player-owned supermarket |

### 2.3 `job.city.delivery` — Courier (P0)

| Field | Spec |
|---|---|
| Location | `poi.city.depot`. 06:00–22:00 |
| Uniform / props | Courier jacket, cap, handheld scanner. Parcels (S, M, L; some fragile) |
| Vehicle | L1–2: own vehicle or the depot's cargo scooter (`veh.moto_125` with box). L3+: company `veh.van` |
| Input | On foot + vehicle controls; `E` load, unload, ring bell; `Tab` route list |
| Loop | 1. At the loading bay, pick up 3–8 parcels (capacity by vehicle) and place them in the vehicle (`Carry`). 2. The route shows numbered stops (`poi.city.delivery.*`) on the minimap. 3. Drive; park within 12 m of the stop marker. 4. Carry the right parcel to the door anchor, `E` to ring; hand over (signature `holdRing` 0.8 s). 5. Next stop; return to depot when empty |
| Meters | Per-parcel countdown; fragile meter drops with collisions and hard jolts (from `veh:collision` impulse and suspension spikes) |
| Score | Time against par for the route distance (60%), parcel condition (30%), correct parcel first try (10%) |
| Pay | Per parcel + distance; tips for fast delivery |
| Progression | L3: van. L5: fragile and bulky routes (+40%). L8: express inter-region contracts (Pinehaven, Port Calder, sawmill) |
| Failure | Parcel condition 0 = no pay and a strike. Timer expiry = half pay. 3 strikes end the shift. Running a red light in front of police: `fine` $40 |
| Economy link | Parcels originate from retail and wholesale demand; delivered volume raises `regionActivity` for the destination district. A player-owned `biz.delivery` uses the same controller for self-driven contracts |

### 2.4 `job.city.construction` — Construction worker (P2)

| Field | Spec |
|---|---|
| Location | `poi.city.construction` (Harlan Yards). 07:00–18:00, not in storms |
| Uniform / props | Hi-vis vest, hard hat, gloves. Wheelbarrow, rivet gun, jackhammer, tower crane |
| Tasks (rotating) | (a) **Haul**: push a wheelbarrow of material along a plank route to a marked bay (`balance` on ramps). (b) **Crane**: in the crane cab view, slew `A/D`, trolley `W/S`, hoist `Q/E`; pick a beam and place it on target pins; the load swings as a pendulum, so stop smoothly. (c) **Rivet**: walk a beam line; `timingBar` at each of 6 points. (d) **Break**: jackhammer a slab; hold `Space` and keep the `balance` cursor inside the circle |
| Score | Precision (placement error, timing), time against par |
| Progression | L3: crane unlocked. L5: night concrete pour task (`holdRing` + timing). L8: foreman bonus per stage completed |
| Failure | Dropped beam or load collision = strike + `fine` $25. 3 strikes end the shift |
| Economy link | Completed tasks advance the site stage (0–5); the tower visibly rises. At stage 5 new property listings and commercial sites open (Downtown tower flats, 2 shop units), then a new site starts at an Eastside plot. Consumes `item.mat.*` from the wholesale market, moving its prices |

### 2.5 `job.city.taxi` — Taxi driver (P1)

| Field | Spec |
|---|---|
| Location | `poi.city.taxi`. 24 h. Company cab provided (`veh.taxi`); fuel paid by the company |
| Uniform / props | Shirt and flat cap. Roof light on when free |
| Loop | 1. Hailing passengers appear at `poi.city.taxi.*` points (marker and wave animation). 2. Stop within 4 m; passenger enters (door animation). 3. Destination and par time appear. 4. Drive; the **comfort** meter drops with hard braking, cornering g, collisions, and rises with smooth driving. 5. Stop at the destination zone; fare and tip are paid. 6. Chain fares: the next hail tends to be near the last drop |
| Score | Time against par (50%), comfort (50%) |
| Pay | Flag + per metre; tip = up to 30% × comfort. Night (22:00–05:00) and rain surge × 1.3 |
| Progression | L3: airport-style long fares to Pinehaven and Port Calder. L5: VIP clients (strict comfort, 2× tip). L8: may use an own vehicle of class car (share rises from 55% to 80% of fare) |
| Failure | Comfort 0 or collision above the impulse threshold: passenger leaves, no pay, strike. 3 strikes end the shift |
| Economy link | Fare demand follows pedestrian density schedules (Annex B §8). Taxi trips into a district raise its footfall slightly for the hour |

### 2.6 `job.city.warehouse` — Forklift operator and picker (P1)

| Field | Spec |
|---|---|
| Location | `poi.city.warehouse`, `int.warehouse`. 05:00–23:00 |
| Uniform / props | Coverall, safety boots. `veh.forklift`, pallets, pick cart, handheld |
| Loop A (forklift) | Order sheet lists pallets by rack address (aisle, bay, level 1–3). Drive the forklift (rear-wheel steering), raise forks `R`/lower `F`, tilt `T/G`, enter the pallet squarely, lift, reverse, carry low, and set it in the marked truck bay. Tilt or speed with a raised load risks a drop |
| Loop B (picking) | Pick list of 6–10 SKUs; walk the aisles with a cart, `E` at the right bin, confirm quantity `1–5`. Route efficiency matters |
| Score | Time against par, placement accuracy, no drops |
| Progression | L3: level-3 racks. L5: unloading inbound trucks (reverse docking guidance). L8: inventory controller tasks (cycle counts, `document`) |
| Failure | Dropped pallet = strike and `fine` $30. 3 strikes end the shift |
| Economy link | Throughput feeds the city wholesale market's restock rate; a strong shift lowers wholesale prices slightly next day. Same loop in a player-owned `biz.warehouse` |

### 2.7 `job.city.mechanic` — Mechanic (P1)

| Field | Spec |
|---|---|
| Location | `poi.city.mechanic`, `int.garage`. 07:00–19:00 |
| Uniform / props | Navy coverall, rag. Lift, wheel gun, torque wrench, drain pan, parts shelf |
| Loop | 1. A customer vehicle arrives with a symptom card. 2. **Diagnose** (`inspect`): start the engine and listen (audio cue: misfire stutter, belt squeal, knock, brake grind, exhaust leak), look at 3 hotspots (tyres, leaks, warning lamp). Choose the fault from 4 options. 3. **Repair** steps by fault: wheel swap (`sequence` of 5 lug nuts in star order, off and on); oil change (`holdRing` drain, fill to the line with a `timingBar` stop); spark plugs (`sequence` + torque `timingBar`); brake pads (remove caliper bolts, swap, bleed with `holdRing`); belt (route the belt: pick the correct path of 3). 4. Test: engine sound is clean; hand over |
| Score | Correct diagnosis first time (40%), repair accuracy (40%), time (20%) |
| Progression | L3: engine jobs. L5: motorcycles and vans. L8: boat outboards at the boatyard |
| Failure | Wrong diagnosis: time penalty, half pay. Over-torque or overfill: strike. 3 strikes end the shift |
| Economy link | Consumes `item.parts`. The skill gives the player a discount on own vehicle repairs (5% per level, up to 45%) and allows self-repair with parts at the garage |

### 2.8 `job.city.office` — Office analyst (P2)

| Field | Spec |
|---|---|
| Location | `poi.city.office`, `int.office_floor`. Mon–Fri 08:00–18:00 |
| Uniform / props | Shirt, lanyard. Desk, monitor (in-world screen that fills the view when seated) |
| Loop (`document` tasks on the desk computer) | (a) **Invoice match**: two documents side by side; click the 1–3 mismatching fields. (b) **Ledger sort**: drag 8 transactions into the right category (the game's own `TX` categories, teaching the finance UI). (c) **Typing**: type a displayed sentence; accuracy and speed. (d) **Mail triage**: `sortLanes` into urgent, delegate, archive, spam by reading subject cues. (e) Occasionally walk a file to the printer or a manager |
| Score | Accuracy first, then time |
| Progression | Ranks: Junior (L1), Associate (L3, ×1.3), Analyst (L5, ×1.7), Manager (L8, ×2.3). L5 unlocks all securities in the Invest app; L8 lowers the player's loan rate by 20% |
| Failure | 3 inaccurate tasks in a row end the shift early with half pay for the last task |
| Economy link | `skill.city.office` level improves business report detail (forecast lines) and reduces accounting fees for owned businesses |

## 3. Lake jobs

### 3.1 `job.lake.fishing` — Angler (P0, self-employed)

| Field | Spec |
|---|---|
| Location | Any `fishspot` POI, any shore within 3 m of water, or from a boat. All hours; species vary by hour, weather, spot and depth |
| Gear | Rod (`item.tool.rod_basic`, `rod_pro`, `rod_master`), bait (`item.goods.bait`, lures), keep-net (capacity 10 kg, cooler in a boat 60 kg). First-person view with the rod (reference 6) |
| Input | Mouse aim; hold LMB to charge the cast, release to cast; LMB click to strike; hold LMB to reel; `A/D` steer the rod; `R` reel in; `1–3` bait |
| Loop | 1. **Cast**: power meter; distance and accuracy decide the water cell (depth, cover). 2. **Wait**: bobber floats; bite chance per second from spot quality × time-of-day × weather × bait match. Nibbles (small dips) come before a bite (full dip + sound). 3. **Strike**: click within 0.4–1.0 s (by skill). 4. **Fight** (`tensionBar`): the fish pulls in bursts and changes direction; hold to reel, release to give line; steer the rod opposite to the run. Tension too high for 1.5 s snaps the line (lose bait); too low for 3 s lets the fish off. Stamina bar of the fish drops while tension is in the zone. 5. **Land**: fish shown with species, weight, quality; goes to the keep-net as kg of `item.fish.<species>` |
| Selling | `mkt.lake.fish` at the general store, the bait hut, `mkt.ocean.seafood`, restaurants on contract, or transfer to an own business |
| Rules | Without `lic.fishing_commercial` ($150): may sell 10 kg per day (the rest can be eaten, stored or used in own restaurant). With it: unlimited, +10% price |
| Score / XP | By fish weight class and a clean fight |
| Progression | L3: lure types and reading water (bite hotspots visible). L5: night fishing bonus species, trophy fish. L8: sonar on boats; guide trips (take an NPC client for a fee) |
| Failure | Line snap (bait lost), fish escapes. No strikes; it is self-paced |
| Economy link | First producer in the fish supply chain: fish → fish markets (price falls as stock rises) → restaurants and seafood stalls. Contracts board at the hut posts timed orders (for example 8 kg trout for the Lakeside Grill, +30%) |

### 3.2 `job.lake.fishhut` — Bait and tackle hut employee (P2)

| Field | Spec |
|---|---|
| Location | `poi.lake.fishhut`. 05:00–20:00 |
| Uniform / props | Flannel shirt, waders or apron. Bait tanks, scoop net, scale, fillet board, shelves |
| Loop (service queue) | Customers arrive with one request each: (a) **Live bait**: scoop N minnows from the tank: move the net (`A/D`, `W/S`) to trap darting fish, count shown. (b) **Tackle**: fetch 2–3 labelled items from shelves. (c) **Buy catch**: an angler sells fish: place on the scale, read the weight, choose grade A/B/C from visual cues (eye clarity, colour); the price follows. (d) **Fillet**: `sequence` swipe pattern on the board to turn fish into `item.food.fishfillet`. (e) **Licence**: fill a short form (`document`) |
| Score | Correct items, grading accuracy, time against patience |
| Progression | L3: rod repair task. L5: runs the smokehouse (smoked fish, higher value). L8: manager role (ordering stock) |
| Failure | Wrong grade twice or wrong items three times ends the shift |
| Economy link | Fish bought enter `mkt.lake.fish` stock; fillets raise the value of stock. Bait and tackle sales draw down hut inventory restocked from the city wholesale market |

### 3.3 `job.lake.boatrental` — Boat rental operator (P1)

| Field | Spec |
|---|---|
| Location | `poi.lake.boathire`. 07:00–20:00, closed in storms |
| Uniform / props | Polo, sun hat, whistle. 6 rowboats, 3 kayaks, 2 skiffs, life jackets, fuel cans, service skiff |
| Loop | 1. A party (1–4 people) asks for a boat. Assign the right boat type and hand out the right number of life jackets (`1–4`). 2. Take the deposit at the kiosk. 3. **Launch**: untie (`holdRing`), steady the boat while they board (`balance`), push off. 4. **Returns**: when a boat comes back to the buoy line, the player boards it and **docks** it in a numbered berth using real boat physics; bumps cost score. 5. **Turnaround**: bail water (`holdRing`), refuel skiffs to the line (`timingBar`), stow jackets. 6. **Rescue** (random): a renter is stranded; take the service skiff, attach a tow line (`E`), tow them in slowly |
| Score | Docking precision (final position and bump impulse), queue time, correct equipment |
| Progression | L3: skiff rentals. L5: guided sunset tours (drive a 4-seat boat along buoys smoothly). L8: manager |
| Failure | Hard collision (damage) = strike + repair `fine` $35. Wrong jacket count = safety strike. 3 strikes end the shift |
| Economy link | Rental demand follows weather and day of week. Same loop in a player-owned `biz.boatrental`. Trains `skill.boating` |

### 3.4 `job.lake.restaurant` — Waiter at The Lakeside Grill (P2)

| Field | Spec |
|---|---|
| Location | `poi.lake.grill`, terrace and dining room. 11:00–22:00 |
| Uniform / props | Black apron, white shirt. Order pad, tray, bill folder |
| Loop (front of house; different from the diner's kitchen loop) | 1. **Seat**: match the party size to a free table (wrong size wastes capacity). 2. **Take order**: guests speak 2–5 items shown for 4 s; then enter them on the pad from memory (pick from the menu grid). 3. **Carry**: collect the tray at the pass and walk it to the table with the `balance` mechanic (tilt grows with speed and turns; spill ruins the dish). 4. **Fish of the day**: guests may ask what is fresh; the answer list is the grill's real fish stock (from `mkt.lake.fish`); out-of-stock choices must be declined. 5. **Bill**: bring the folder, collect, clear the table (`holdRing`) |
| Score | Order accuracy, wait times against patience, no spills |
| Pay | Per table + high tips (up to 25% of the bill × satisfaction) |
| Progression | L3: carries 2 trays' worth (larger tray, harder balance). L5: sommelier upsell choice. L8: maître d' (table planning puzzle for bonus) |
| Failure | Spill = strike. Wrong order served = strike. 3 strikes end the shift |
| Economy link | Menu availability and prices depend on lake fish supply; a day with good catches (including the player's) shows more fish dishes and higher revenue |

## 4. Ocean jobs

### 4.1 `job.ocean.fisherman` — Commercial fisherman (P1)

| Field | Spec |
|---|---|
| Location | `poi.ocean.harbor`, trawler "Calder Star" (`boat.trawler`). Departures 05:00–15:00; no departures in storms |
| Uniform / props | Orange oilskin bib, boots, gloves. Winch, gantry, net, sorting table, ice hold |
| Roles | L1–4 deckhand (an NPC skipper steers; the player works the deck). L5+ may skipper (steers too). With an own trawler the player is always skipper |
| Loop | 1. **Steam out** to a fishing ground; the sonar screen in the wheelhouse shows drifting school blobs. 2. **Shoot the net**: lower the gantry (`holdRing`), pay out the winch to the school's depth (`gauge`: match depth 20–60 m). 3. **Trawl**: hold 1.5–2.5 m/s through the school for 60–120 s; the catch meter fills faster when centred on the blob and at the right depth. 4. **Haul** (`tensionBar`): winch in; swell and catch weight jerk the tension; over-tension tears the net (lose 40% of the haul). 5. **Sort** (`sortLanes`): the catch spills on the table; keep target species to the hold, throw back undersized fish and by-catch; speed and accuracy raise landed quality. 6. Repeat until the hold (800 kg) is full or the shift time ends. 7. **Land**: return, moor, unload with the quay crane (`holdRing` per crate) |
| Score | Catch efficiency, net intact, sorting accuracy |
| Pay | Crew share of the landed value at `mkt.ocean.seafood` prices at landing time |
| Progression | L3: crab-pot strings (drop pots with buoys, haul next trip). L5: skipper. L8: tuna long-line trips to ground C (high value, longer) |
| Failure | Torn net twice ends fishing for the trip. Going overboard in heavy sea (not holding on during a wave warning) = respawn on deck, lose 60 s |
| Economy link | Largest fish source: landings raise seafood market stock and lower the price for the day; restaurants and stalls restock from it. Own-boat trips are a `biz.fishing` unit run |

### 4.2 `job.ocean.port` — Port worker (P2)

| Field | Spec |
|---|---|
| Location | `poi.ocean.terminal`. 06:00–22:00 |
| Uniform / props | Orange hi-vis jacket, white hard hat, radio. Gantry crane, reach truck, mooring lines |
| Tasks | (a) **Crane**: cab view from above; trolley `W/S`, gantry `A/D`, hoist `Q/E`; lower the spreader onto a container's corner posts (alignment indicator), lock `Space`, lift, travel, set onto a truck chassis; sway must settle before release. (b) **Mooring**: when a vessel arrives, catch the heaving line (`timingBar`), drag the hawser to the bollard and wrap (`sequence`). (c) **Reefer crates**: drive the reach truck to move fish crates from the quay to the cold store (`Carry` with vehicle). (d) **Tally**: check container numbers against the manifest (`document`) |
| Score | Moves per hour, placement precision, no collisions |
| Progression | L3: crane. L5: ship-to-ship night shifts (+30%). L8: berth planner (puzzle for bonus) |
| Failure | Container collision or drop = strike + `fine` $40. 3 strikes end the shift |
| Economy link | Container moves set the import restock rate of `mkt.city.wholesale` for retail goods and building materials; fish crates moved affect seafood spoilage (faster cold-store transfer keeps quality) |

### 4.3 `job.ocean.boatop` — Boat operator (P2)

| Field | Spec |
|---|---|
| Location | `poi.ocean.ferry`. 07:00–21:00. Requires `lic.boat` ($250) |
| Uniform / props | White shirt with epaulettes, captain's cap. `boat.ferry` (water taxi), later `boat.console` for charters |
| Loop | 1. Passengers wait at a pier with destination tags (marina, Palm Cove pier, Gull Rock, city quay, riverside dock). 2. Board them (hold steady at the pier within 1.5 m and under 0.3 m/s). 3. Navigate channel markers; the **comfort** meter reacts to slamming into waves, sharp turns and wake crossings. 4. Dock at the destination: approach angle, speed and final gap are scored; fenders forgive small bumps. 5. Timetable bonus if on time |
| Charter variant (L5) | Take 3 tourists fishing: position the boat over a school using the sonar; their catch count pays a bonus |
| Score | Docking precision (40%), comfort (30%), schedule (30%) |
| Progression | L3: night runs with navigation lights and the lighthouse sector light. L5: charters. L8: harbour pilot jobs (guide a cargo ship in with the workboat) |
| Failure | Hard collision = strike + `fine`. Passenger overboard (extreme heel) ends the shift |
| Economy link | Brings visitors to Palm Cove and Gull Rock, raising footfall for beach and marina businesses that hour. Trains `skill.boating` |

## 5. Forest jobs

### 5.1 `job.forest.logger` — Logger (P1)

| Field | Spec |
|---|---|
| Location | `poi.forest.timberline`, stands A–C. 06:00–19:00. `item.tool.axe` supplied at L1; chainsaw from L2 |
| Uniform / props | Check shirt, orange helmet with visor and ear defenders, chaps. Axe, chainsaw, wedges, log tongs, `veh.logtruck` with loader crane |
| Loop | 1. **Select** a tree marked with paint in the assigned stand. 2. **Notch**: choose the felling direction by standing on that side; cut the notch: axe = alternating `timingBar` swings; chainsaw = hold throttle (LMB) and guide the bar along a line (`tensionBar` for bar pressure; pinching stalls the saw, kickback if the tip touches). 3. **Back cut** from the opposite side; when the hinge fails the tree topples as a rigid body in the notch direction; a danger cone is shown: move out. 4. **Limb**: walk the trunk, cut each branch stub (`timingBar`). 5. **Buck**: cut at the painted marks into 4 m logs. 6. **Load**: enter the truck's crane seat; boom `W/S`, slew `A/D`, extend `Q/E`, grapple `Space`; stack logs on the bunks (reference 12). 7. **Haul**: drive the loaded truck to the sawmill (handling changes with load), unload at the log deck |
| Score | Felling accuracy (direction error), cut quality (straight bucking raises grade), time |
| Pay | Per m³ delivered × grade |
| Progression | L2: chainsaw. L4: drives the log truck (before that an NPC hauls and the player is paid at the landing). L6: skidder/winch for steep stands. L8: crew boss (bonus on stand completion) |
| Failure | Tree falls on the player or the truck = knocked down, `fine` $50, strike. Stalled saw 3 times = strike. 3 strikes end the shift |
| Economy link | Logs enter `mkt.forest.sawmill` stock → lumber → construction materials and the player's own building costs. Felled stands regrow over 12 game days; forestry planting speeds this up. Over-harvest lowers the stand's yield (sustainable quota) |

### 5.2 `job.forest.forestry` — Forestry worker (P2)

| Field | Spec |
|---|---|
| Location | `poi.forest.gate`. 06:00–20:00 |
| Uniform / props | Green ranger shirt, brimmed hat, radio. Planting spade, marking paint, binoculars, hand saw, `veh.utv` with water tank |
| Tasks (assigned from a board, 3–4 per hour) | (a) **Plant**: in a replanting plot, plant a grid of saplings: dig (`holdRing`), place, tamp (`timingBar`); spacing is scored. (b) **Mark**: survey a stand and paint trees for thinning: `inspect` to spot diseased or crowded trees by bark colour, crown thinning, fungus; wrong marks cost score. (c) **Trail**: clear a fallen tree with the hand saw (`tensionBar`), replace 3 footbridge planks (`Carry` + `sequence` nailing). (d) **Fire watch**: climb the fire tower, scan with binoculars for a smoke column, read its bearing on the alidade and report it (pick the bearing within ±5°); then drive the UTV to the fire and extinguish it with the hose (`holdRing` while aiming). (e) **Wildlife survey**: photograph 3 animals; framing and distance are scored |
| Score | Task-specific accuracy and time |
| Progression | L3: UTV and fire tasks. L5: controlled-thinning with chainsaw. L8: district ranger (sets the weekly quota and earns a bonus when the forest health index rises) |
| Failure | A fire left more than 6 game hours spreads to a visual burn patch and removes yield from one stand for 6 days; the shift ends |
| Economy link | Planting and thinning raise the forest health index, which sets stand regrowth rate and log grade for `job.forest.logger` and `biz.logging`. Health also raises campsite and trading-post footfall |

## 6. Implementation checklist per job (Stage 4 acceptance)

1. Record in `data/jobs.js` with every field in 1.5.
2. Controller file `game/jobs/<id with dots replaced by underscores>.js` extending `JobController`.
3. Task generator in `sim/jobsSim.js` (seeded, saveable).
4. Good-play bot and bad-play bot in `qa/bots/`.
5. Sound ids triggered by name (Annex E §6), HUD via `getHud()` only.
6. Unit test: pay equals the formula in 1.1; failure state reachable; no pay without task completion.
