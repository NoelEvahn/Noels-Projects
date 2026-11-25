## Landmarks pack (`props/landmarks_*.js`, `registry/landmarks.js`)
True scale, 1 unit = 1 m. Every builder returns a Group with `userData.realHeightM` (+ `realWidthM`, `source`) and `userData.update(t)` (closed-form animation). All take `{ base: true|false }`: `base:false` drops the local plaza/city/water dressing (used by `sizeLadder`). Helpers in `props/landmarks_ladder.js`: `scaleReference(name, opts)` (name or alias, e.g. `'eiffel'`, `'Eiffel Tower'`) and `sizeLadder(items, {spacing, labels, ruler})` (true-scale line-up with canvas height boards and 100 m ruler lines). Toolkit: `props/landmarks_kit.js` (loft/lattice beams, flags, water, crowds, traffic, boats, bases, `bigStage`, `prepCamera`).
**Camera note:** for shots of 100 m+ landmarks set `camera.near ~ distance/1500` and `far ~ 30 x distance` (`prepCamera(cam, dist)`), or depth precision z-fights; the registry does this via `bigStage(ctx, R, camPos)`.

| Function | Real size (m) | Animates | Screenshot |
|---|---|---|---|
| `empireState` (`props/landmarks_towers.js`) | 381 roof / 443 mast | colour-cycling crown lamp, tip beacon, Manhattan taxis, crowd | landmarks_empire |
| `burjKhalifa` | 828 | Dubai Fountain jets, beacons, ring-road traffic, crowd | landmarks_burj |
| `oneWTC` | 541 (roof 417) | spire beacon pulse, memorial pool ripples, Hudson boats, traffic | landmarks_wtc |
| `shanghaiTower` | 632 | crown beacon, river boats, traffic (+ Jin Mao, SWFC context) | landmarks_shanghai |
| `taipei101` | 508 | climbing light-ring on the pagoda segments, beacon, 12 flags, crowd | landmarks_taipei101 |
| `petronasTowers` | 452 (skybridge 170) | fountain jets, beacons, flags, traffic | landmarks_petronas |
| `eiffelTower` (`landmarks_lattice.js`) | 330 (platforms 57/115/276) | rotating beacon, sparkle bulbs, lifts on the legs, Seine boats, traffic, crowd | landmarks_eiffel |
| `tokyoTower` | 333 | beacons, flags, crowd | landmarks_tokyotower |
| `tokyoSkytree` | 634 | pulsing deck light ring, elevator, river boat, beacons | landmarks_skytree |
| `cnTower` | 553 | rotating restaurant ring, glass lifts, beacons, train, lake boats | landmarks_cntower |
| `spaceNeedle` | 184 | rotating loupe ring, elevator, fountain jets, monorail, traffic | landmarks_spaceneedle |
| `statueOfLiberty` (`landmarks_monuments.js`) | 93 (torch tip) | flickering torch flame, ferries circling, gulls, crowd | landmarks_liberty |
| `bigBen` | 96 (Victoria Tower 98.5) | clock hands x4 faces, lantern, Union Jack, buses on bridge, London Eye, boats | landmarks_bigben |
| `leaningTowerPisa` | 56 (3.97 deg lean) | swinging bells, pigeons, crowd, traffic | landmarks_pisa |
| `colosseum` | 48 (188 x 156) | banners, ring-road traffic, crowd | landmarks_colosseum |
| `pyramidsGiza` | 138.8 (Sphinx 20 x 73) | camel caravan with walking legs, crowd, traffic, birds | landmarks_giza |
| `tajMahal` | 73 (minarets 40) | fountain jets, pool ripple, boats, birds, crowd | landmarks_tajmahal |
| `christRedeemer` | 38 (30 + 8 pedestal) | passing clouds, cog tram, birds, bay boats, crowd | landmarks_christ |
| `sydneyOperaHouse` (`landmarks_monuments_b.js`) | 65 (bridge 134) | ferries and yachts, Harbour Bridge trains/traffic, gulls | landmarks_sydney |
| `goldenGate` | 227 towers (deck 67, span 1,280) | rolling fog banks, deck traffic, container ship, sailboats | landmarks_goldengate |
| `towerBridge` | 65 (244 long) | bascules raise and lower, buses, river boats, crowd | landmarks_towerbridge |
| `arcDeTriomphe` | 50 | eternal flame, waving tricolour, roundabout traffic, crowd | landmarks_arc |
| `stBasils` | 47 | glinting finial, flags, Red Square crowd, pigeons | landmarks_stbasils |
| `kremlinTower` | 71 | clock hands, pulsing ruby star, flags, crowd | landmarks_kremlin |
| `washingtonMonument` | 169.3 | 50 flags, blinking tip lights, helicopter, traffic, crowd | landmarks_washington |
| `gatewayArch` | 192 | tram pods in the legs, paddle steamers, traffic, crowd | landmarks_gatewayarch |
| `greatWall` (`landmarks_monuments_c.js`) | ~8 wall / 12 towers (UNCERTAIN, varies) | walkers on the wall, cable car, flags, clouds | landmarks_greatwall |
| `mountRushmore` | heads 18 | flags, crowd, traffic, birds, clouds | landmarks_rushmore |
| `stonehenge` | 7.3 tallest trilithon | sheep, walkers, crows, clouds, traffic | landmarks_stonehenge |
| `hooverDam` | 221 (crest 379) | flowing river, spillway mist, crest traffic, boats | landmarks_hoover |
| `angkorWat` | 65 central tower | tethered balloon, boats, monks/tourists, egrets | landmarks_angkor |
| `machuPicchu` | ~290 peak above site (UNCERTAIN) | llamas, walkers, drifting cloud, river | landmarks_machupicchu |
| `hollywoodSign` | letters 13.7 (106 wide) | helicopter + rotors, hikers, traffic below, clouds | landmarks_hollywood |
| `sizeLadder` / `scaleReference` (`landmarks_ladder.js`) | any of the above | each item's own update | landmarks_ladder_towers |

Written but NOT registered / not yet screenshotted (untested): `props/landmarks_ships.js` (aircraftCarrier 333 m long, cruiseShip 362 m, titanic 269 m, blueWhale 30 m, leaningLighthouse ~40 m stylised). Still to do: Saturn V (110.6 m), giraffe (5.5 m), human (2 m).
