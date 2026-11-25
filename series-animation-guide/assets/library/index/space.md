## Space pack (`space_*`)
Files: `fx/space_kit.js` (noise, sprite points, flow particles, atmosphere, merge builder), `fx/space_sky.js` (dome, starLayers, nebula, spiralGalaxy, distantGalaxies, starCluster, shootingStars, spaceDust, orbitRings), `props/space_rocky.js`, `props/space_giants.js`, `props/space_small.js`, `props/space_craft.js`, `props/space_craft2.js`, `sets/space_scenes.js`, `registry/space.js`.
All builders return a Group with `update(t)` (closed form, stateless). Camera far plane must be >= 2000 for backdrops. Planets record `userData.realRadiusM`, `unitsPerM`, `scaleNote` (radius in units = real radius / that scale).

| Function | Options | Real size | Animates | Screenshot |
|---|---|---|---|---|
| `earth` | R, lod, spin, sun, clouds, lights; `setSun(v)` | 6371 km radius | modelled continents (raised land), 3D cloud puffs + hurricane drift faster than ground, city lights fade by sun, rotation | space_earth, space_earth_night |
| `moonBody` | R, lod | 1737 km | modelled craters + maria, slow spin | space_moon |
| `mars` | R, lod, moons | 3390 km | Olympus Mons, Valles Marineris, caps, Phobos/Deimos orbit | space_mars |
| `mercury` `venus` `pluto` `ceres` | R, lod | real radii | spin; Venus cloud deck super-rotates; Charon orbits | space_inner |
| `jupiter` | R, lod, moons | 69,911 km | every belt turns at its own rate, GRS, Galilean moons | space_jupiter |
| `saturn` | R, lod, sun, particles; `setSun` | 58,232 km | 240-row ringlets, ring-particle orbits, baked planet shadow | space_saturn |
| `uranus` `neptune` | R, lod | real radii | tilted 98 deg + rings; dark spot, cirrus outrun the planet, Triton | space_ice_giants |
| `sun` | R, lod, light | 696,000 km | granulation turns, billboard rays pulse, prominences swell, solar wind | space_sun |
| `blackHole` | R, tilt, mass | Rs of 10 Msun = 29.5 km | orbiting disk particles, camera-facing lens halo, jets | space_blackhole |
| `comet` | R, tailLen, sunDir | nucleus 2 km (tail not to scale) | tumbling nucleus, ion + dust tails stream, vents | space_comet |
| `asteroidField` | count, area, size, drift | 1 unit = 1 m | instanced tumbling rocks wrapping through a box | space_asteroid_field |
| `asteroidBelt` | R, width, count, withCeres | 2.8 AU | rocks + dust orbit | space_asteroid_belt |
| `debrisField` | count, area, scale | panels ~2 m | tumbling shards, glints | space_debris |
| `spaceStation` | lod, spin | 109 x 73 m | array joints, Canadarm2, dish, lights | space_station |
| `commSat` `gpsSat` `weatherSat` `sputnik` `starlinkTrain` | s | 26 m / 9 m / 11 m / 0.58 m / 3 m | arrays track, dishes sway, beacons | space_satellites |
| `hubble` | door | 13.2 m | door, arrays, dishes | space_hubble |
| `jwst` | - | 21 x 14 m | 18 segments align, sunshield flutters | space_jwst |
| `spaceCapsule` | kind dragon/apollo | 8.1 m / 11 m | thruster puffs, dish | space_capsules |
| `rocket` | kind saturnV/falcon, thrust, legs; `setThrust(k)` | 110.6 m / 70 m | exhaust particles + core flicker | space_rocket_saturnv, space_rocket_falcon |
| `apolloLander` | engine | 9.4 x 7 m | dish, radar, beacon, optional descent plume | space_lander |
| `astronaut` | tether | 1.8 m | drift, tumble, limb sway, tether | space_astronaut |
| `spaceShuttle` | stack, bayOpen, thrust | 37 m / 56 m stack | bay doors, arm, launch plumes | space_shuttle |
| `ufo` | beam | 12.8 m (fictional) | 24 chasing lights, bob, alien, beam particles | space_ufo |
| `marsRover` | drive | 3 m | wheels, mast, arm | space_rover |
| `starLayers` `skyDome` | radius, density, milkyWay | - | 5 layers + Milky Way turn at different rates (parallax), twinkle | all backdrops |
| `nebula` | palette (8), R, n, shape | - | billowing particles, breathing colour | space_nebulae |
| `spiralGalaxy` `distantGalaxies` | R, arms, n | - | differential rotation | space_galaxies |
| `starCluster` `shootingStars` `spaceDust` `orbitRings` | kind, count, box | - | spin, meteors cross, dust wraps, beads orbit | space_sky_fx |
| `spaceBackdrop` | style deep/nebula/earthOrbit/moon/solar/galaxy/asteroids/blackhole/toon, seed, lod, facing | - | everything above in one call | space_backdrop_<style> |
| `solarSystemTour` | layout orbits/lineup | size law in `userData.sizeLaw`, table in `userData.table` | planets orbit, belt, `userData.cameraPath(u)` | space_tour, space_tour_lineup |
| `earthOrbitScene` | lod | station 109 m | station + backdrop + satellites | space_set_earth_orbit |
| `moonSurface` | lod | 1 unit = 1 m | crater terrain (`heightAt`), lander, flag | space_set_moon |
| `launchPad` | kind, launchTime | tower 125 m | liftoff from launchTime, smoke | space_set_launch |
