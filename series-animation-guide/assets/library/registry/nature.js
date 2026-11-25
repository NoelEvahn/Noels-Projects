// Registry entries for the 'nature' pack (same item shape as ../registry.js). Owned by one builder; do not import other packs' registry files.
import * as THREE from 'three';
import { cumulus, cloudField, cloudSea, stormCloud } from '../props/nature_clouds.js';
import { scaled } from '../props/nature_common.js';
import { forest, meadow, jungle, palmTree } from '../props/nature_forest.js';
import { ocean, beachShore, river, lake, waterfall, sailboat } from '../props/nature_water.js';
import { skyDome, sun, rainbow, birdFlock, hotAirBalloon, balloonFleet, jetliner, contrailJet } from '../props/nature_sky.js';

export const ITEMS = [];
const reg = (i) => ITEMS.push(i);
const SKY = { sky: ['#2f7fe0', '#bfe3ff'], ground: null, env: 0.25 };
const wrap = (obj, cam) => ({ obj, cam, update: (t) => obj.userData.update?.(t) });

reg({ id: 'nature_cumulus', cat: 'nature', title: 'Cumulus cloud', note: 'puffs', stage: SKY,
  build: () => wrap(scaled(cumulus({ width: 1200, seed: 3 }), 0.25), { pos: [0, 90, 700], target: [0, 80, 0], fov: 38 }) });
reg({ id: 'nature_cloud_field', cat: 'nature', title: 'Cloud field', note: 'puffs', stage: { ...SKY, fog: ['#bfe3ff', 700, 2200] },
  build: () => wrap(scaled(cloudField({ count: 14, altitude: [800, 1800], seed: 5 }), 0.2), { pos: [0, 120, 600], target: [0, 260, -300], fov: 55 }) });
reg({ id: 'nature_cloud_sea', cat: 'nature', title: 'Cloud sea', note: 'puffs', stage: { ...SKY, fog: ['#bfe3ff', 800, 2200] },
  build: () => wrap(scaled(cloudSea({ size: 6000 }), 0.2), { pos: [0, 140, 560], target: [0, -40, -300], fov: 55 }) });
reg({ id: 'nature_storm_cloud', cat: 'nature', title: 'Storm cloud', note: 'puffs', stage: { sky: ['#2a3350', '#7a8aa8'], ground: null, env: 0.2 },
  build: () => wrap(scaled(stormCloud({ width: 2400 }), 0.25), { pos: [0, -60, 900], target: [0, 120, 0], fov: 50 }) });

const DOME = (preset) => ({ sky: ['#2f7fe0', '#bfe3ff'], ground: null, env: 0.3 });
reg({ id: 'nature_sky_sunset', cat: 'nature', title: 'Sunset sky dome', note: 'dome', stage: { sky: ['#222', '#444'], ground: null, env: 0.2 },
  build: () => { const g = new THREE.Group(); g.add(skyDome({ preset: 'sunset' })); const cf = cloudField({ count: 12, altitude: [300, 700], width: [500, 1100], seed: 8, theme: 'sunset', sun: new THREE.Vector3(0.15, 0.07, -1) }); g.add(scaled(cf, 0.3)); return wrap(g, { pos: [0, 5, 0], target: [0, 60, -400], fov: 60 }); } });
reg({ id: 'nature_sun', cat: 'nature', title: 'Sun with glow', note: 'sun', stage: { sky: ['#2f7fe0', '#bfe3ff'], ground: null },
  build: () => wrap(sun({ radius: 10 }), { pos: [0, 0, 60], target: [0, 0, 0], fov: 40 }) });
reg({ id: 'nature_rainbow', cat: 'nature', title: 'Rainbow', note: 'rainbow', stage: { sky: ['#4a7fc0', '#d8e8f4'], ground: null },
  build: () => wrap(rainbow({ R: 60, bandW: 3.6 }), { pos: [0, 18, 190], target: [0, 38, 0], fov: 45 }) });
reg({ id: 'nature_birds', cat: 'nature', title: 'Bird flock', note: 'birds', stage: { sky: ['#2f7fe0', '#bfe3ff'], ground: null },
  build: () => wrap(birdFlock({ count: 21, radius: 80, altitude: 20, span: 2.4 }), { pos: [55, 16, 28], target: [78, 22, 5], fov: 50 }) });
reg({ id: 'nature_balloons', cat: 'nature', title: 'Hot-air balloons', note: 'balloons', stage: { sky: ['#2f7fe0', '#bfe3ff'], ground: null, fog: ['#bfe3ff', 200, 700] },
  build: () => wrap(balloonFleet({ count: 6, spread: 140, near: 50 }), { pos: [0, 40, 60], target: [0, 70, -100], fov: 50 }) });
reg({ id: 'nature_jet', cat: 'nature', title: 'Jetliner + contrails', note: 'contrail', stage: SKY,
  build: () => wrap(scaled(contrailJet({ altitude: 0, length: 39 }), 0.35), { pos: [52, 3, 60], target: [0, 1, 30], fov: 55 }) });

const LAND = (o = {}) => ({ sky: ['#6fb4f0', '#e4f3ff'], ground: 0x6aa84f, groundR: 900, keyPos: [60, 90, 70], shadow: { extent: 60 }, fog: ['#dff0ff', 250, 900], ...o });
reg({ id: 'nature_forest_mixed', cat: 'nature', title: 'Mixed forest', note: 'forest', stage: LAND(),
  build: () => wrap(forest({ area: [-150, -300, 150, 20], count: 2600, kinds: { pine: 0.4, round: 0.35, birch: 0.25 }, nearR: 120, center: [0, -40], seed: 3 }), { pos: [0, 14, 70], target: [0, 8, -80], fov: 50 }) });
reg({ id: 'nature_forest_pine', cat: 'nature', title: 'Pine forest (snow)', note: 'forest', stage: LAND({ sky: ['#9ab8d8', '#eef4fa'], ground: 0xeef4fa, fog: ['#e8f0f8', 150, 600] }),
  build: () => wrap(forest({ area: [-150, -300, 150, 20], count: 2600, kinds: { pine: 1 }, nearR: 120, center: [0, -40], seed: 4, snow: 0.8 }), { pos: [0, 14, 70], target: [0, 8, -80], fov: 50 }) });
reg({ id: 'nature_forest_palm', cat: 'nature', title: 'Palm grove', note: 'forest', stage: LAND({ ground: 0xe8d6a0 }),
  build: () => wrap(forest({ area: [-60, -120, 60, 10], count: 150, kinds: { palm: 1 }, lod: 'high', clump: 0, scale: [0.9, 1.4], seed: 8 }), { pos: [0, 6, 30], target: [0, 8, -40], fov: 55 }) });
reg({ id: 'nature_meadow', cat: 'nature', title: 'Flower meadow', note: 'meadow', stage: LAND({ ground: 0x4a8a30, fog: ['#dff0ff', 40, 160] }),
  build: () => wrap(meadow({ area: [-25, -35, 25, 8], density: 18 }), { pos: [0, 1.5, 8], target: [0, 0.6, -6], fov: 55 }) });
reg({ id: 'nature_jungle', cat: 'nature', title: 'Jungle', note: 'jungle', stage: LAND({ ground: 0x2a5a2a, sky: ['#5fa88a', '#d8f0d0'], fog: ['#cfe6c8', 60, 260] }),
  build: () => wrap(jungle({ area: [-70, -120, 70, 10], giants: 22, trees: 260 }), { pos: [0, 20, 110], target: [0, 16, -20], fov: 50 }) });

reg({ id: 'nature_ocean', cat: 'nature', title: 'Ocean waves', note: 'ocean', stage: LAND({ ground: null, sky: ['#3f8fe0', '#cfe8ff'], fog: ['#cfe8ff', 300, 1400] }),
  build: () => wrap(ocean({ size: 1600 }), { pos: [0, 8, 50], target: [6, 1, -60], fov: 55 }) });
reg({ id: 'nature_beach', cat: 'nature', title: 'Beach shoreline', note: 'beach', stage: LAND({ ground: null, sky: ['#3f8fe0', '#cfe8ff'], fog: ['#cfe8ff', 250, 900] }),
  build: () => wrap(beachShore({}), { pos: [-60, 3.2, 16], target: [30, 1.5, -18], fov: 62 }) });
reg({ id: 'nature_river', cat: 'nature', title: 'River', note: 'river', stage: LAND({ ground: null, fog: ['#dff0ff', 200, 700] }),
  build: () => wrap(river({}), { pos: [10, 18, 24], target: [0, 0, -70], fov: 55 }) });
reg({ id: 'nature_lake', cat: 'nature', title: 'Lake', note: 'lake', stage: LAND({ ground: null, fog: ['#dff0ff', 400, 1600] }),
  build: () => wrap(lake({}), { pos: [-20, 12, 150], target: [0, 20, -150], fov: 55 }) });
reg({ id: 'nature_waterfall', cat: 'nature', title: 'Waterfall', note: 'waterfall', stage: LAND({ ground: null, fog: ['#dff0ff', 200, 600], shadow: { extent: 80 } }),
  build: () => wrap(waterfall({ height: 60 }), { pos: [0, 22, 105], target: [0, 28, 0], fov: 50 }) });
