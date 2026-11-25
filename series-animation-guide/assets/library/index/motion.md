## Motion / FX / dopamine pack (`fx/motion_*.js`, registry `registry/motion.js`, screenshots `screenshots/motion_*.jpg`)
Goal: guarantee constant motion and punchy beats. Every effect is deterministic and a pure function of time. **One-shots** expose `.set(age)` (age = seconds since start, age < 0 = hidden / pre-state); **loops** expose `.update(t)` (seamless, any t). Both names exist on every effect. Add the returned group to the scene. `userData.duration` / `userData.sizeM` record length and real size in metres.
Files: `motion_core.js` (pool / glow billboards / ballistic / ramps), `motion_blast.js`, `motion_elements.js`, `motion_ambient.js`, `motion_cam.js`. Soft glows are procedural shaders (no textures); smoke / dust / fire are lit instanced geometry that shrinks away (never a white-out).

| Function (file) | Options | Real size | Animates | Screenshot |
|---|---|---|---|---|
| `explosion` (blast) | `radius=3, seed, light, smoke, debris, scorch`; `.set(age)` | fireball radius = `radius` m | flash, fireball (white to char), mushroom smoke, bouncing debris, shock ring, dust ring, scorch, point light | `motion_explosion` |
| `shockwave` (blast) | `mode:'ground'\|'air', radius, color, height, axis, dust, dur`; `.set(age)` | `2*radius` | standing light lip + floor ring + dust (ground); fresnel bubble + 3 rings on any axis (air) | `motion_shockwave_ground`, `motion_shockwave_air` |
| `dustBurst` (blast) | `radius, count, color, rise, life`; `.set(age)` | `2*radius` | lit puffs grow, drift, shrink | `motion_dust_burst` |
| `rubbleBurst` (blast) | `count, power, size, origin, colors, floor, life`; `.set(age)` | `~0.8*power` | flat-shaded chunks, gravity + bounce + tumble, rest | `motion_rubble_burst` |
| `glassShatter` (blast) | `width, height, impact:[x,y], push, floor, rays, rings`; `.set(age)` (age<0 = intact cracked pane) | pane size | radial/ring fracture, shards fly + spin + glints | `motion_glass_shatter` |
| `sparks` (blast) | `count, power, dir, spread, size, color:'orange'\|'blue'\|'white', loop, life, floor`; `.set(age)` | `~0.6*power` | velocity-stretched streaks cool white to red; `loop:true` = endless grinder | `motion_sparks` |
| `groundCracks` (blast) | `radius, arms, glow, color, lava, dur`; `.set(age)` | `2*radius` | branching cracks spread outward; lava cores pulse | `motion_ground_cracks` |
| `crater` (blast) | `radius, rimHeight, rocks`; `.set(age)` | `~4*radius` | thump-in overshoot, glowing floor cools, ejecta, wisps (raised-rim bowl on y=0) | `motion_crater` |
| `meteor` (blast) | `size, from, to, dur, trailT`; `.set(age)`; `.impact`, `.impactAge` | path length | accelerating rock, fire + smoke trail; chain explosion at `impactAge` | `motion_meteor` |
| `laserBeam` (blast) | `from, to, width, color, charge, fire, fade`; `.set(age)` | beam length | charge orb, beam core + glow + travelling rings + flicker, impact flash + sparks | `motion_laser_beam` |
| `smokePlume` (elements) | `height, width, color:'dark'\|'grey'\|'white'\|'brown', wind, count, life`; `.update(t)` | `height` m | endless rising column | `motion_smoke_plume` |
| `steamVent` (elements) | `power, period, height`; `.update(t)` | ~0.9 m pipe + 3 m jet | turning valve wheel, pulsed steam | `motion_steam_vent` |
| `fire` (elements) | `radius, height, logs, stones, light, tongues, embers, smoke`; `.update(t)` | `height` m | licking flame tongues, embers, glow, flickering light | `motion_fire` |
| `lightning` (elements) | `from, to, seed, width, branches, color, light`; `.set(age[, seed])` | bolt length | strike travels down in 0.07 s, branches, flicker, re-strike, impact glow + sparks | `motion_lightning` |
| `powerUpAura` (elements) | `height, color, color2, radius, crackRadius, rocks`; `.update(t, level=0..1)` | `2*height` | glow shell, rising streaks + stars, ground rings, lava cracks, levitating rocks | `motion_power_up_aura` |
| `tornado` (elements) | `height, baseR, topR, drift:[vx,vz]`; `.update(t)` | `height` m | swirling puff funnel, orbiting debris, wall cloud, dust ring | `motion_tornado` |
| `rocketExhaust` (elements) | `length, radius, speed, light`; `.update(t, thrust)` | `length` m | flame layers, shock diamonds, smoke trail left behind | `motion_rocket_exhaust` |
| `cometTail` (elements) | `length, headR, dir, count`; `.update(t)` | any scale | faceted head, coma, ion tail + curved dust tail | `motion_comet_tail` |
| `waterSplash` (elements) | `radius, height, y`; `.set(age)` | `height` m | jet + bulb, crown sheet, droplets, foam, rings, mist | `motion_water_splash` |
| `waterRipple` (elements) | `radius, drops:[{x,z,t0,amp}], idle, period, color`; `.update(t)` | `2*radius` | real displaced surface, ring waves, endless seeded raindrops | `motion_water_ripple` |
| `speedLines` (ambient) | `count, inner, outer, style:'flow'\|'focus', color, depth`; `.set(t, camera, k=0..1)` | camera-relative | 3D radial streaks with a clear centre (faces stay readable); follows camera | `motion_speed_lines` |
| `windStreaks` (ambient) | `area, dir, count, speed, color`; `.update(t)` | `area[0]` m | wavy / curled ribbons slide through | `motion_wind_streaks` |
| `motionTrail` (ambient) | `path:(t)=>[x,y,z], radius, seconds, head, tail, glow`; `.set(t)` | n/a | tapered glowing tube behind any path | `motion_trail` |
| `impactStar` (ambient) | `color, color2, size, spikes, rays`; `.set(age, camera)` | `2*size` | geometry "POW" burst: pop, shake, rays, ring, shrink; faces camera | `motion_impact_star` |
| `confettiBurst` (ambient) | `origin, count, power, floor, colors, streamers, waves`; `.set(age)` | `~power` m | drag, flutter, tumble, lands flat | `motion_confetti` |
| `fallingLeaves` (ambient) | `area, count, wind, palette`; `.update(t)` | `area[1]` m | swing, tumble, rest, re-enter | `motion_falling_leaves` |
| `birdsScatter` (ambient) | `count, area, scareFrom, scale, palette`; `.set(age)` | birds ~0.3 m | pecking and hopping (age<0), takeoff + flapping flight fanning away | `motion_birds_scatter` |
| `ambientMotes` (ambient) | `area, kind:'dust'\|'pollen'\|'fireflies'\|'snow'\|'rain'\|'embers'\|'bubbles'\|'sparkle', count, wind`; `.update(t)` | `area[1]` m | wrap-around drifting particles for any shot | `motion_ambient_motes`, `motion_ambient_motes_b` |
| `coinShower` (ambient) | `mode:'rain'\|'fountain', count, area, height, origin, floor, size`; `.set(age)` | coin 0.5 m | gold coins pour / burst, bounce, spin, settle flat, glints | `motion_coin_shower` |
| `parallaxLayers` (ambient) | `width, speed, camZ, layers?, hillColor`; `.update(t, camX)` | `width` m | hills, 2 cloud decks, far + mid trees, foreground bushes drift at depth-based speeds; `.layerInfo` | `motion_parallax_layers` |
| `cameraShake` / `shakeCamera` (cam) | `cameraShake(t,{amp,freq,decay,start,seed,rollAmp,axes}) -> {x,y,z,roll}`; `shakeCamera(cam, {pos,target,fov}, t, opts)` | metres / radians | trauma-decay noise | `motion_camera_shake` |
| `punchZoom` (cam) | `punchZoom(t,{t0 (number or array of beats), baseFov, punch, inDur, hold, outDur}) -> fov` | fov degrees | snap in, hold, spring back | `motion_punch_zoom` |
| `timeRemap` / `slowMoDip` (cam) | `timeRemap([{t,speed}]) -> fn(realT)=contentT` (+`.speed`, `.total`); `slowMoDip({at,slow,rampIn,hold,rampOut})` | seconds | eased speed ramps | `motion_time_remap` |
| `whipTransition` (cam) | `whipTransition({t0,dur,yaw,fovKick,roll}) -> {pose(t,A,B), blur(t), cutT, overlay.set(t,cam)}` | n/a | camera whip with fov kick + streak bands, cut at `cutT` | `motion_whip_transition` |
| `growthPop` / `growthPopSquash` / `growthBurst` (cam) | `growthPop(t,{t0,from,to,dur,anticipate,wobble}) -> scale`; `growthPopSquash -> {s,sx,sy,sz}`; `growthBurst({radius}).set(age)` | scale / `~3*radius` | anticipation squat, springy overshoot; ring + dust + cracks + star glints at the feet | `motion_growth_pop` |
| `sizeMarker` (cam) | `sizeMarker({heightM,label,maxM,side,ref}).set(h, t)` | `userData.realHeightM = pole height` | banded metre pole (auto 1/2/2.5/5/10 ticks), flag reads the giant's height, dashed height line, 1.8 m person | `motion_size_marker` |
| `rulerTape` (cam) | `rulerTape({length,vertical,step}).set(reveal)` | `userData.realWidthM = length` | tape rolls out with ticks, numbers, hook | `motion_ruler_tape` |
| `sizeLadder` (cam) | `sizeLadder({items:[{kind,h,name}]}).set(t, guideH)`; kinds person, house, tree, tower, skyscraper, mountain, giant | real heights in metres | silhouettes pop in one by one with name + metre tags, guide line | `motion_size_ladder` |
| `glyphLabel`, `curveChart` (cam) | helpers: atlas text row `.text(str)` (cheap per-frame text), little 3D curve plot | n/a | n/a | used in the chart screenshots |

Usage tips: for "always something moving" stack `parallaxLayers` + `ambientMotes` + `windStreaks` / `fallingLeaves` behind every shot; for dopamine hits chain `meteor` -> `explosion` + `shockwave` + `crater` + `groundCracks` + `cameraShake` + `punchZoom` at the same impact age; for a giant growing use `growthPopSquash` + `growthBurst` + `sizeMarker` + `sizeLadder`.
