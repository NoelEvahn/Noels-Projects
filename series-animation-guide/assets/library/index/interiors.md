## Interiors pack (`props/interiors_*.js`, `sets/interiors_*.js`, `registry/interiors.js`)
Fully furnished, cluttered rooms and prop kits at real scale (metres, `userData.realHeightM/realWidthM`). Every room is a cut-away open towards +Z (floor + back wall + side walls + ceiling, origin = floor centre); builders return `{ group, update(t), anchors, cam, size }`. Common options: `{ seed, wrecked: 0..1, ceiling, people }`.
`wrecked` adds floor/wall cracks, a hole through the back wall (sky + city outside), rubble, toppled furniture, dangling sparking wires and smoke.
Everything is geometry (no image maps); canvas only for readable text and screen UI. Deterministic, `update(t)` is a pure function of t. Screens are shared `liveScreen` canvases (kinds: code news chart radar tv bars desktop telemetry map ecg movie countdown chat game stocks menu weather floor custom).
Helpers: `interiors_core.js` (`room()` shell, floors, rugs, `wreckFx`, `dustMotes`, `inst`, `tube`, `sign`, `INT_STAGE`), `interiors_screens.js` (`liveScreen`), `sets/interiors_common.js` (`camFor`, `door`, `wallTiles`, `stairs`, `fairyLights`, `sitter`, `stander` low-detail people).

### Prop kits (`interiors_kit_*`)
| Id | Functions (file) | Real size | Animates | Screenshot |
|---|---|---|---|---|
| interiors_kit_beds | `bed({size,color,pillows,messy,headboard})`, `bunkBed`, `cot`, `nightstand`, `wardrobe({open})`, `dresser` (furniture) | bed 1x2 m, wardrobe 2 m | none (static furniture) | interiors_kit_beds |
| interiors_kit_seating | `sofa({seats,color})`, `armchair`, `beanBag`, `ottoman`, `chair({kind: dining/office/school/folding/bar})`, `stool`, `bench` (furniture) | seat 0.45 m | office chairs swivel | interiors_kit_seating |
| interiors_kit_storage | `table({kind,cloth})`, `desk({hutch})`, `schoolDesk`, `tvStand`, `sideboard`, `shelfFilled({kind: books/toys/pantry/records/mixed})`, `locker`, `filingCabinet`, `trolley` | shelf 1.9 m | none | interiors_kit_storage |
| interiors_kit_appliances | `fridge({open})`, `cooker`, `pot`, `washingMachine`, `microwave`, `kettle`, `toaster`, `coffeeMachine`, `dishwasher`, `kitchenRun({sink,uppers})`, `faucet`, `waterCooler`, `vendingMachine` (appliances) | fridge 1.85 m | drum tumbles clothes, steam from pot/kettle/coffee, tap drips, microwave plate turns | interiors_kit_appliances |
| interiors_kit_bathroom | `toilet`, `basin`, `bathtub`, `shower`, `towelRail`, `toiletRoll` (appliances) | bath 1.7 m | drips, shower drops + steam, foam bobs | interiors_kit_bathroom |
| interiors_kit_electronics | `tv({kind})`, `crtTV`, `monitor`, `keyboard`, `mouse`, `laptop`, `phone`, `tablet`, `gameConsole`, `controller`, `speaker`, `boombox`, `router`, `desktopPC`, `tvCamera`, `projector`, `receiverRack`, `cableRun`, `powerStrip` (electronics) | TV 1.2 m | screens repaint (flicker, scrolling code, news ticker), router/rack LEDs blink, speaker pulses, camera pans | interiors_kit_electronics |
| interiors_kit_walldecor | `poster` (11 kinds), `gallery`, `wallClock`, `windowView({view})`, `curtains`, `clothPanel`, `blinds`, `mirror`, `wallShelf`, `bulletinBoard`, `coatRack` (decor) | window 1.1 m | curtains sway (vertex cloth), clocks tick, clouds drift, stars twinkle | interiors_kit_walldecor |
| interiors_kit_living | `ceilingFan`, `pendant`, `fluorescent`, `neonSign`, `floorLamp`, `tableLamp`, `lavaLamp`, `plant({kind})`, `hangingPlant`, `fishTank`, `fishBowl`, `globe`, `mug`, `steam`, `bookStack`, `flowerVase`, `pet('cat'/'dog')` (decor) | fan 1.3 m | fan spins, pendants swing, lights flicker, lava blobs rise, plants sway, fish swim + bubbles, globe turns, mug steam, pets breathe | interiors_kit_living |
| interiors_kit_clutter | `clutter(area,{seed,density,kind,y,avoid})` kinds toys books clothes dishes papers trash tools food office mixed kitchen garage bedroom (clutter) | per item 5-40 cm | static, instanced | interiors_kit_clutter |

### Rooms (`interiors_set_*`)
| Id | Builder (file) | Real size (w x d x h) | Animates | Screenshot |
|---|---|---|---|---|
| interiors_set_teenbedroom (+`_wrecked`) | `buildTeenBedroom({time,wrecked})` (home) | 5.4x4.6x2.8 | curtains, ceiling fan, fairy lights twinkle, code monitor, TV, sleeping cat, lava lamp | interiors_set_teenbedroom, interiors_set_teenbedroom_wrecked |
| interiors_set_kitchen (+`_wrecked`) | `buildKitchen` (home) | 5.6x4.6x2.8 | steam (pot, kettle, coffee), swinging pot rack + pendants, dripping tap, washer, dog, curtains | interiors_set_kitchen, interiors_set_kitchen_wrecked |
| interiors_set_diningroom | `buildDiningRoom` (home) | 5.8x4.8x2.9 | candle flames flicker, roast steam, swinging chandelier, curtains | interiors_set_diningroom |
| interiors_set_bathroom | `buildBathroom` (home) | 3.9x3.6x2.6 | bobbing duck, foam, shower drops + steam, dripping tap | interiors_set_bathroom |
| interiors_set_livingroom (+`_wrecked`) | `buildLivingRoomFull` (home) | 6.6x5.4x2.9 | fireplace flames, TV, ceiling fan, curtains, cat + dog, hanging plant | interiors_set_livingroom, interiors_set_livingroom_wrecked |
| interiors_set_hallway | `buildHallwayStairs` (home) | 4x7.6x3.3 | swinging pendants, ticking clock, cat on the stairs, hanging plant | interiors_set_hallway |
| interiors_set_garage | `buildGarage` (home) | 6.6x5.8x3.0 | swinging bulbs, flickering strip light + neon, oscillating fan | interiors_set_garage |
| interiors_set_classroom | `buildClassroom({people})` (public) | 7.6x6.8x3.0 | ticking clock, ceiling fans, flag, fish tank, pupils, flicker light | interiors_set_classroom |
| interiors_set_supermarket | `buildSupermarketAisle` (public) | 8x11x3.6 | swinging aisle signs, flickering lights, pulsing exit sign, shoppers | interiors_set_supermarket |
| interiors_set_diner | `buildDiner` (public) | 8.6x6x3.0 | milkshake mixers spin, coffee steam, jukebox bars, neon flicker, ceiling fans | interiors_set_diner |
| interiors_set_gym | `buildGym` (public) | 9.2x7.4x3.8 | treadmill belts, spin-bike flywheels, swinging punching bag, TVs, fans | interiors_set_gym |
| interiors_set_cinema | `buildCinema({rows,cols})` (public) | 10x11x5.0 | movie screen, flickering projector beam, swaying curtains, exit signs | interiors_set_cinema |
| interiors_set_hospital | `buildHospitalRoom` (public) | 5.2x4.8x2.8 | ECG monitor, IV drops, swaying privacy curtain, clock | interiors_set_hospital |
| interiors_set_elevator | `buildElevator({doorsOpen})` (public) | 2.5x2.3x2.7 | doors open/close, floor indicator, blinking buttons | interiors_set_elevator |
| interiors_set_office | `buildOfficeCubicles` (work) | 10.4x7.6x2.9 | monitor screens, printer LEDs, steam, typing staff, fan | interiors_set_office |
| interiors_set_newsstudio | `buildNewsStudio` (work) | 10.4x7.8x4.6 | LED wall news/map/weather, panning cameras, ON AIR blink | interiors_set_newsstudio |
| interiors_set_missioncontrol | `buildMissionControl({rows,perRow})` (work) | 14x11x6.0 | giant map, telemetry, radar, countdown, console screens, rotating beacons | interiors_set_missioncontrol |
| interiors_set_secretcontrol (+`_wrecked`) | `buildSecretControlRoom` (work) | 9.4x8.2x3.8 | radar sweep, holo table blips, rack LEDs, rotating beacons, steam vent | interiors_set_secretcontrol, interiors_set_secretcontrol_wrecked |
| interiors_set_lab | `buildLab` (work) | 9x6.8x3.4 | bubbling glassware, Bunsen flame, centrifuge, tesla-coil arcs, rat wheel, steam | interiors_set_lab |
