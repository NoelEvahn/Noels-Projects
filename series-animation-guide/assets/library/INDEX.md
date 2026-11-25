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
| `nature.js` | **groundCover**(area, clear, density, scale, heightFn) fills any floor with wind-swaying grass tufts + flowers + pebbles (+ rocks, logs); `grass`, `flowers`, `pebbles`, `rock`, `log`, `stump`, `roundTree`, `pineTree`, `birchTree`, `bushClump(dots)`, `treeLine(points)`; call `updateNature(t)` once per frame. Lawns where people walk: `scale ≈ 0.45`. Geometry + vertex colours only |
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
* **No bare floors:** every outdoor ground gets `groundCover` (and a tree line or bushes at the edges).
* Animals are auto-grounded (`plantA`, tail excluded) and breathe/blink/sway by themselves; people blink and breathe from `CLOCK.t` (set it once per frame).
* Never `offsetHSL` dark colours (use `shade(hex, factor)`); never `Math.random`/`Date.now` (use `rng(seed)`); instanced meshes are updated with explicit matrices.
* Text on boards/billboards is head-on and authored with `textBoard`/canvas so it can auto-fit.
* Do not name anything after the repository; keep new additions inside `series-animation-guide/`.

## Screenshots
`screenshots/<id>.jpg` for every registry item; contact sheets in `screenshots/sheets/`.

## Episode usage notes (ep3)
* `makeLovers(scene)` in `episode-N/src/common.js` (heart tag above each lover's head, pops in at its birth time) is a good pattern to copy for "count of X" gags.
* Instanced crowds: `props/stage.js audience()` (seated or standing, cheer animation, faces) and `randomPerson(rng)` low-detail characters.
* Scenes that need many places in one page: put each place in its own `Group` far apart, toggle `.visible` per shot, swap `scene.background` per shot.


## Series look (2026-11-19)
Default faces are the episode 1-2 style: white ball eyes, black dot pupils, bulb nose, ball hands (`fingers: true` for fingered hands). Hero hair is `curly`. Gerald uses the same dot eyes. The detailed rig is archived in `archive/detailed-2026-11/`.
Heart eyes: people `face({ hearts: 0..1 })` (or `FACES.love` / `FACES.lovestruck`), Gerald `face({ hearts: 0..1 })` / `AFACES.love`. Modelled hearts that pop in and throb; pop them in with `easeOutBack`. Screenshot: `detail_love_eyes`.

## Gestures, clips, catchphrase SFX (2026-11-19)
- Hands are balls (series look) but swap to fingers for finger gestures: `hR: 'ok' | 'point' | 'peace'` (gesture hands grow 1.6x so the sign reads). `'ok'` is a modelled OK sign (thumb-index ring + three fingers). Wrist twist: pose keys `wL` / `wR`.
- **La peace:** `POSES.laPeace(t)` (OK hand up beside the face, chin up) + `FACES.mew` (clean mewing: sharp V jawline, firm chin, pressed lips that part with `open`, half lids; `face({ mew: 0..1, open })`). The `'ok'` hand follows a real OK sign: back of the hand to camera, three long fanned fingers, index curling over to meet the thumb in a round circle. Gerald: `AFACES.mew` / `face({ mew })` (firm cheeks, chin, pursed lips). Screenshots: `detail_la_peace`, `detail_mew_close`, `detail_ok_hand`, `detail_gerald_mew`.
- Catchphrase samples live one level up in `assets/`: `bomboclat.mp3`, `la_peace.mp3` (1.1 s, first phrase only).
- **Clips:** `clips/clap_cat.webm` (clapping black cat, green screen removed, VP9 with alpha + sound; poster `clips/clap_cat_poster.png`; it holds a paw out at about 6.0 s). `python tools/clip_frames.py clips/clap_cat.webm <episode>/build/clip <episode>/build/audio/clip.wav` makes the frames, then `await clipCard(dirURL, { height: 1.65, feet: 0.184 })` from `fx/clip.js` and call `card.show(t - t0, camera.position)` every frame. The script's header shows how to key a new green-screen clip.

## Episode 4 additions (2026-11-19)
- **Baby** (`baby.js`): `makeBaby()` = the people rig at toddler proportions (bald, white tee with black stripes, grey trousers, bare feet with toes). `BABY_POSES.sit(t)` (on the ground, legs splayed), `.tip(t, k)` (falling back), `.cry(t)`; `baby.cry(k, t)` = scrunched eyes, wailing mouth, modelled tears. Screenshot `char_baby`.
- **Sand toys** (`props/beach.js`): `toyShovel(color)` (holdable, grip at origin; ep4 holds it with `rot: [PI*0.95,0,0]`, scale 1.45), `sandBucket(color)`. Screenshot `prop_beach`.
- **Park sand pit** (`sets/sandpark.js`): `buildSandPark()` + `SANDPARK_STAGE` (no stage ground: the set has its own lawn ring so the pit stays open). `dig(k)` grows the hole (`PIT`) forward under whoever sits at the origin; `heightAt(x, z)`. Screenshot `set_sandpark`.
- **`clips/oiia_cat.webm`** (2026-11-25): the OIIA spinning tabby meme, background removed (VP9 + alpha + its sound, 480×853, 16.9 s, poster `clips/oiia_cat_poster.png`). Alternates a standing stare with fast spins every 1–2 s. Keyed with `tools/key_clip.py` (handles a background that flashes light green / white; keeps only the largest blob). Used in ep6 as one of the space-fight audience cats.
- The clapping black cat clip (`clips/clap_cat.webm`) frame map used in ep4: 0-56 grinning clap loop, 84-150 shocked / paw over mouth, ~24 both paws raised and spread.

## Episode 5 additions (2026-11-20)
- **Dunk kit** (`fx/dunk.js`): `universeBall(r)` (fresnel shell, cosmic-web points, 8 seams, warm point light; `setGlow(k)`), `hoop()` (gold rim at 3.05 m, 24-thread light net, 1.8 x 1.05 m glass backboard pre-fractured into 14 shards; `update(a)` with a = s since the slam: rim spring, net whip, shards turn to stars with trails), `shockwave()` (`set(a)`: tall ring + wall + sparks), `floorRings(events)`, `voidFloor()` (glossy, travelling ripple uniforms), `silhouette(root)` (clones the materials; `set(k, ballWorldPos, camera)`: black with a warm rim toward the ball + cold back rim, headband stays dim yellow), `cosmicWeb(R, n)`, `glowPoints()` (procedural soft dots, no texture). Screens `fx_dunk`, `fx_dunk_slam`.
- **Space props** (`props/space.js`): `issStation()` (cupola `userData.cupola`), `satellite()`, `voyager1()` (googly eyes, `look(t)`), `sunFace()` (`setShades(k)`, `setMouth(k)`), `bandedPlanet()` (vertex-colour bands), `saturn()`, `icyRock()`, `comet()`, `nebulaPillar()`, `picnicBlanket()`, `telescope()`, `tinyPlanet()`, `moonFlag()`, `cockpitNose()` (see-through windscreen, `userData.seat`). Screens `prop_space`, `prop_space_b`.
- **Living room + bungalow** (`sets/livingroom.js`): `buildLivingRoom()` (sofa, armchair, coffee table, rug, lamp, windows, door, frames; `setHole(k)` punches the ceiling above `HOLE`), `houseExterior()` (pitched tiled roof, front chimney `userData.chimneyTop`, `setHole(k)`, `userData.holeWorld()`), `roofWithHole()`, `LIVING_STAGE`. Screens `set_livingroom`, `set_house_exterior`.
- Episode-level cast (in `episode-5/src/common.js`, not presets): tourist, pilot, astronauts (with `helmet(ch)` glass bubble), aliens (`antennae(ch)`), Gerald's suit + tie (`geraldSuit(cat)`) and `briefcase()`.
