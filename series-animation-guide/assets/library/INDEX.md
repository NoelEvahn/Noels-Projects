# Series Asset Library

Reusable rounded-toy 3D characters, animals, props, sets and FX for the series. Built once, reused every episode.
Everything is plain ES modules on three.js **0.170.0**, deterministic (seeded PRNG, no `Math.random`, no clocks), 9:16-friendly.

**Start here every episode:** read this file and `cat/CAT_BIBLE.md`, import what exists, and when you build something new add it to
`registry.js` (so it gets a screenshot) and to the tables below.

## Setup / viewing
```
cd <workspace> && npm i three@0.170.0 @fontsource/anton        # deps live OUTSIDE the repo
export LIB_DEPS=<workspace>                                      # dir containing node_modules
export NODE_PATH=$(npm root -g)                                  # global playwright (already installed in the cloud image)
node tools/check.mjs                                             # (needs --experimental-vm-modules) every module parses
node tools/shoot.mjs <outDir> '<id regex>' 900 600               # screenshots of registry items
tools/sheet.sh '<regex>' 3 out.jpg 640 <dir>                     # contact sheet
```
`viewer.html` + `tools/server.mjs` serve the library with an import map (`three` -> node_modules/three). Fonts: `Anton` (HUD/captions) from `@fontsource/anton`.
Render flags that matter: ACES tone mapping, sRGB, PCFSoft shadows (`stage.js: makeRenderer / makeStage`). `makeStage` also adds a cool rim light (`rimI`) and soft sky-coloured image light (`env`, auto-dimmed on bright skies; `env: 0` turns it off). Eyes have a coloured iris ring (`irisColor`, else picked by `seed`) and two catchlights. Software GL (SwiftShader) is ~0.4 s per 1080x1920 frame.

## Core modules
| File | What |
|---|---|
| `util.js` | seeded `rng`, easing, cached `mat()`, `add()` mesh helper, `heartGeo`, `canvasTex`, `textBoard`, `shade()` (never use `offsetHSL` on dark colours: it goes black), palette `C` |
| `stage.js` | `makeRenderer`, `makeStage` (hemisphere + warm key + fill, gradient sky), `aimKey`, `lookFrom` |
| `character.js` | the people rig, `PRESETS`, `POSES`, `FACES`, `HANDS`, `ghostify`, `randomPerson` (see below) |
| `hair.js` | 3D hair: displaced scalp cap + tapered locks + ringlets (styles: messy, short, parting, bun, curly, long, spiky, wispy, cavemanMop, white-fluffy, pigtails, hatHair, bald) |
| `animal.js` | quadruped rig: `makeAnimal('cat'|'dog'|'rabbit'|'rat')`, `ANIMALS.gerald`, `APOSES`, `AFACES` |
| `fx/hearts.js` | `makeHeart`, `makeHeartField` (instanced), `makeHeartTag` (pop-in heart above a head), `makeLoveAura`, `makeGlowSprite`, `makeLoveWave` (tall glowing ring + flung hearts), `makeConfetti`, `makeSparkles` |
| `registry.js` | every catalogue item (id, build, camera) — drives the screenshots |

## People (`character.js`)
```js
const hero = makeCharacter(PRESETS.hero); scene.add(hero.root);        // feet at y=0, faces +Z
hero.pose(POSES.run(t)); hero.face({ ...FACES.shock, open: env });     // open = mouth 0..1 (drive from audio envelope)
hero.hand('R','point');  hero.hold(item,'R');  hero.carry(box);        // fingered hands + grip anchors
hero.pose({ ...POSES.sit(0, 0.45), plant: true });                      // plant puts the lowest sole on y=0
```
* Joints: `bob lean twist roll hx hy hz squash rotY aL/Rf/s/e lL/Rf/k hL/hR`. Arms/legs: `f` forward swing, `s` sideways raise, `e`/`k` elbow/knee bend.
* Hands: `relaxed open fist point grip loose pinch peace spread cup flat` or `[thumb,index,mid,ring,pinky]` 0..1.
* Holding: items are authored **upright (+Y)** with the grip point at the origin and `userData.grip={upright:true,hand}`; with `POSES.holdR/holdL/holdBoth` they stand vertical in the fist. `holdUpright(obj)` keeps balloons/flags upright in world space whatever the arm does. `refreshHeld()` after moving the root.
* Faces: big eyes (`eye`, `pupil`, `pupilSize`, `lid`), brows (`brow`, `browTilt`), mouth (`open`, `smile`, `teeth`), cheeks, optional lashes/freckles.
* Crowd: `randomPerson(rng)` (low-detail, cheap) or the instanced `audience()` in `props/stage.js`.
* Ghosts: `ghostify(char)`.
* **Hero is identical in every episode** (`PRESETS.hero`): red hoodie, blue shorts, white sneakers, messy brown hair, yellow headband.

### Cast presets (screens: `screenshots/sheets/sheet_characters.jpg`, one jpg per preset `screenshots/char_<name>.jpg`)
`hero mum dad kid grandma` (core family) · `neighbourMan neighbourWoman neighbourTeen neighbourGranny postman iceCreamMan` · `magician judgeA judgeB judgeC judgeD host` ·
`scientistA scientistB chiefScientist balloonist skydiver passenger flightAttendant windowWasher plazaA` · ghosts `ghostCaveman ghostPharaoh ghostKnight ghostViking ghostVictorian`.
Accessories: headband, glasses, sunglasses, goggles, beard, stubble, mustache, bigmustache, topHat, cap, flatCap, paperHat, helmet(:horns), hardHat, crown, nemes, knightHelm, scarf, tie, bowtie, badge, backpack, parachute, mailbag, apron, cape, wand, club, harness, flower, bandage.
Outfits: hoodie tee jersey stripes coat suit dress cardigan jumpsuit toga fur armor.

## Animals (`animal.js`) — screens `animal_gerald.jpg`, `animal_pets.jpg`, `detail_gerald_angles.jpg`, `detail_gerald_poses.jpg`
`makeAnimal('cat', ANIMALS.gerald)` is **Gerald**, the recurring cat (see `cat/CAT_BIBLE.md`). Poses `stand walk trot sit loaf sleep stare pounce stretch shock lookAway`; faces `deadpan bored annoyed shock judging sleepy happy closed` (half-lidded eyes are his signature).

## Props (`props/`) — screens `prop_*.jpg`
| File | Items |
|---|---|
| `holdables.js` | spatula, iceCream, envelope, microphone, megaphone, flagOnStick, signBoard(text), beaker, testTube, clipboard, tray, bouquet, heartBalloon, balloonBunch, foamHand, goldenBuzzerButton |
| `home.js` | tree, bush, flowerPatch, fence, grill, burger, picnicTable, lawnChair, pool, bunting, gazebo, windowFrame, door, **houseFront** (tiled roof, chimney, shuttered windows, flower boxes), houseBack, tablet, phone, trashCan, lamppost |
| `stage.js` | curtain, velvetStage, marquee, seatRows, **audience** (instanced, cheer anim), judgesTable, spotlightBeam, scoreboard, confettiCannon |
| `lab.js` | **lovometer** (`setLevel`, `snap` = needle breaks off), labBench, flask, bubbles, testTubeRack, ratCage, wallMonitor, heartOGram, pinkTank, wallChart |
| `sky.js` | cloud, cloudFloor, hotAirBalloon, airliner, cabinWall, parachuteCanopy, rainbow, sunDisc, bird |
| `world.js` | **makeEarth** (`setPink(0..1)` turns the night lights pink), makeMoon, starfield, makeGalaxy, solarSystem, drawHeroFace, **billboard** (`redraw(counterText)` repaints the screen every frame), skyline, landmark(bigben/sydney/tokyo/burj/empire/christ/pyramid/liberty), car, iceCreamTruck, schoolBus, reliefMap |

## Sets (`sets/`) — screens `set_*.jpg`
| Set | Builder | Notes |
|---|---|---|
| Garden BBQ | `buildGarden({wrecked})` | house back, fences, grill+smoke, table, chairs, pool, gazebo, bunting; wrecked variant: hearts, toppled table/fence, stuck balloons |
| Terraced street | `buildStreet()` | houses both sides, road, lamps, cars, postbox, bunting; `mailSack`, `postbox` exported |
| Talent-show theatre | `buildTheatre({rows, cols, freeSeats})` | gold proscenium, curtains, marquee, footlights; **raked house**: rows climb away from the stage, three blocks split by two aisles with step lights, armrests, risers, everyone seated facing the stage; balconies, sconces, EXIT signs, back wall with booth; `anchors.seatWorld(i)`; `freeSeats` stay empty (Gerald). Views: `set_theatre`, `set_theatre_house` |
| Love-research lab | `buildLab()` | Lovometer on wall (`update(t,{level,snapK})`), benches, glassware, rat cage |
| Cloud Nine sky | `buildSkyScene()`, `skydiverHeart()` | cloud floor, clouds, sun, rainbow, balloons, airliner; `SKY_STAGE` |
| Earth at night | `buildSpace()` (+`buildCosmos()` solar system + galaxy) | `update(t,{pink})`; `SPACE_STAGE` |
| Billboard plazas | `buildPlaza(city)` | tokyo nyc london dubai rio sydney; billboard + landmark + skyline + crowd; paved plaza with kerbs, zebra crossing, lamps, planters, bins. `skyline({night})` towers are all geometry: floor ledges, instanced framed windows (some lit), setbacks, parapets, water tanks / AC / antennas, shopfronts with awnings |
| Hilltop golden hour | `buildHilltop()` | rounded instanced trees, flowers, distant town; `update(waveR)` bends trees as a shockwave passes; `HILL_STAGE` |
| Relief map | `reliefMap()` | stylised "state" heightfield |
Each set pairs with a `*_STAGE` lighting preset (or `plazaStage(city)`) for `makeStage()`.

## Rules (learned the hard way)
* **Never add textures.** "More detail" means more geometry (real windows, trims, seams, bolts, props), better shapes, colour and lighting, never image maps, bump/normal maps or procedural surface patterns. Canvas is only for readable text (signs, boards, screens).
* Characters, props and sets never clip: arms/legs are tapered lathe limbs with overlapping joint spheres, held items sit in the palm anchor, seated characters use `POSES.sit(t, seatHeight)` + `plant`.
* Never `offsetHSL` dark colours (use `shade(hex, factor)`); never `Math.random`/`Date.now` (use `rng(seed)`); instanced meshes are updated with explicit matrices.
* Text on boards/billboards is head-on and authored with `textBoard`/canvas so it can auto-fit.
* Do not name anything after the repository; keep new additions inside `series-animation-guide/`.

## Screenshots
`screenshots/<id>.jpg` for every registry item; contact sheets in `screenshots/sheets/`.

## Episode usage notes (ep3)
* `makeLovers(scene)` in `episode-N/src/common.js` (heart tag above each lover's head, pops in at its birth time) is a good pattern to copy for "count of X" gags.
* Instanced crowds: `props/stage.js audience()` (seated or standing, cheer animation, faces) and `randomPerson(rng)` low-detail characters.
* Scenes that need many places in one page: put each place in its own `Group` far apart, toggle `.visible` per shot, swap `scene.background` per shot.
