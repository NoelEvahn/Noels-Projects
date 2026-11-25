// Registry entries for the 'motion' pack (same item shape as ../registry.js). Owned by one builder; do not import other packs' registry files.
// Every demo shows MID-ANIMATION frames; one-shot effects are shown as a film strip (the same builder at several ages) so a single screenshot reads the whole arc.
import * as THREE from 'three';
import * as B from '../fx/motion_blast.js';
import * as E from '../fx/motion_elements.js';
import { makeCharacter, PRESETS, POSES, FACES } from '../character.js';
import { fakeCamera } from '../fx/motion_core.js';

export const ITEMS = [];
const reg = (i) => ITEMS.push(i);
const GROUND = { sky: ['#8fd0ff', '#fff1d4'], ground: 0x8fa66a, shadow: { extent: 14 } };
const DUSK = { sky: ['#2a3a6a', '#e8a070'], ground: 0x5a6a4a, shadow: { extent: 14 } };
const DARK = { sky: ['#12162e', '#3a3a6a'], ground: 0x2a2f45, shadow: { extent: 14 } };
const SAND = { sky: ['#9ed8ff', '#fff3d6'], ground: 0xd9c9a8, shadow: { extent: 14 } };
const TT = 0.6; // viewer's default time: update(t) maps age = base + (t - TT) so the screenshot equals the film strip's base ages

// strip(make, ages, {dx, dz}): the same effect at several ages in a 2-column grid (last row centred), youngest first. make(i) -> effect group. Returns {obj, update, fx}.
function strip(make, ages, dx, o = {}) {
  const n = ages.length, cols = o.cols ?? 2, dz = o.dz ?? dx * 0.9, rows = Math.ceil(n / cols);
  const g = new THREE.Group(), fx = ages.map((a, i) => {
    const f = make(i), row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols), c = i - row * cols;
    f.position.set((c - (inRow - 1) / 2) * dx + (o.x0 ?? 0), f.position.y, (row - (rows - 1) / 2) * dz + (o.z0 ?? 0)); g.add(f); return f;
  });
  const upd = (t = TT) => fx.forEach((f, i) => f.set(ages[i] + (t - TT)));
  upd(TT);
  return { obj: g, update: upd, fx };
}

reg({ id: 'motion_explosion', cat: 'motion', title: 'Explosion: flash, fireball, mushroom smoke, bouncing debris, ground ring, scorch (0.1 / 0.35 / 0.8 / 1.8 s)', note: 'explosion({radius}).set(age)', stage: GROUND,
  build: () => { const s = strip((i) => B.explosion({ radius: 1.8, seed: 1 + i }), [0.1, 0.35, 0.8, 1.8], 8, { dz: 9 }); return { obj: s.obj, update: s.update, cam: { pos: [0, 15, 22], target: [0, 1.6, 0], fov: 50 } }; } });
reg({ id: 'motion_shockwave_ground', cat: 'motion', title: 'Ground shockwave: standing light lip, floor ring, dust ring (0.15 / 0.4 / 0.8 s)', note: "shockwave({mode:'ground',radius}).set(age)", stage: GROUND,
  build: () => { const s = strip(() => B.shockwave({ mode: 'ground', radius: 4.5 }), [0.15, 0.4, 0.8], 10, { dz: 9 }); return { obj: s.obj, update: s.update, cam: { pos: [0, 12, 19], target: [0, 0.5, 0], fov: 46 } }; } });
reg({ id: 'motion_shockwave_air', cat: 'motion', title: 'Air shockwave: fresnel bubble + 3 staggered rings, any axis (0.15 / 0.4 / 0.8 s)', note: "shockwave({mode:'air',radius,axis}).set(age)", stage: DARK,
  build: () => { const s = strip((i) => B.shockwave({ mode: 'air', radius: 4.2, axis: [0, 1, 0.5 * i], color: 0xbfe6ff }), [0.15, 0.4, 0.8], 10, { dz: 9 }); s.obj.position.y = 3; return { obj: s.obj, update: s.update, cam: { pos: [0, 12, 19], target: [0, 3, 0], fov: 46 } }; } });
reg({ id: 'motion_dust_burst', cat: 'motion', title: 'Dust burst: lit puffs that grow, drift and shrink, never a white-out (0.2 / 0.6 / 1.2 s)', note: 'dustBurst({radius,count,color}).set(age)', stage: SAND,
  build: () => { const s = strip((i) => B.dustBurst({ radius: 2.2, seed: 2 + i }), [0.2, 0.6, 1.2], 6, { dz: 5.5 }); return { obj: s.obj, update: s.update, cam: { pos: [0, 8, 14], target: [0, 0.6, 0], fov: 44 } }; } });
reg({ id: 'motion_rubble_burst', cat: 'motion', title: 'Rubble burst: flat-shaded chunks, gravity + bounce, tumbling to rest (0.25 / 0.7 / 2.5 s)', note: 'rubbleBurst({count,power,size}).set(age)', stage: SAND,
  build: () => { const s = strip((i) => B.rubbleBurst({ seed: 5 + i, count: 40, power: 6, size: 0.22 }), [0.25, 0.7, 2.5], 7, { dz: 7 }); return { obj: s.obj, update: s.update, cam: { pos: [0, 9, 14], target: [0, 1, 0], fov: 46 } }; } });
reg({ id: 'motion_glass_shatter', cat: 'motion', title: 'Glass shatter: intact pane to shards with glints (-0.1 / 0.12 / 0.45 s)', note: 'glassShatter({width,height,impact}).set(age)', stage: DUSK,
  build: () => { const s = strip(() => { const g = B.glassShatter({ seed: 6 }); g.position.y = 1.8; return g; }, [-0.1, 0.12, 0.45], 3.4, { dz: 0, cols: 3 }); return { obj: s.obj, update: s.update, cam: { pos: [0.4, 3.2, 12], target: [0, 1.7, 0], fov: 50 } }; } });
reg({ id: 'motion_sparks', cat: 'motion', title: 'Sparks: orange burst, blue burst and an endless grinder fountain', note: "sparks({power,spread,color,loop}).set(age)", stage: DARK,
  build: () => { const g = new THREE.Group(); const a = B.sparks({ count: 70, power: 7, spread: 1.2, seed: 1 }); a.position.set(-1.5, 0.3, 0); const b = B.sparks({ count: 70, power: 7, spread: 1.2, seed: 2, color: 'blue' }); b.position.set(1.5, 0.3, 0); const c = B.sparks({ count: 60, power: 5, dir: [1, 1, 0], spread: 0.35, loop: true, floor: 0, seed: 3, size: 0.025 }); c.position.set(-1.2, 0.3, 4); g.add(a, b, c); const upd = (t = TT) => { a.set(0.25 + t - TT); b.set(0.45 + t - TT); c.set(t); }; upd(); return { obj: g, update: upd, cam: { pos: [0, 3.2, 11], target: [0, 1.6, 1], fov: 46 } }; } });
reg({ id: 'motion_ground_cracks', cat: 'motion', title: 'Ground cracks spreading (0.15 / 0.35 / 1.0 s), lava variant', note: 'groundCracks({radius,glow}).set(age)', stage: SAND,
  build: () => { const s = strip((i) => B.groundCracks({ radius: 4, seed: 8 + i, glow: i === 2 }), [0.15, 0.35, 1.0], 9, { dz: 9 }); return { obj: s.obj, update: s.update, cam: { pos: [0, 17, 11], target: [0, 0, 0], fov: 46 } }; } });
reg({ id: 'motion_crater', cat: 'motion', title: 'Crater: thump-in, glowing floor, ejecta, wisps (0.1 / 0.4 / 1.5 s)', note: 'crater({radius,rimHeight}).set(age)', stage: SAND,
  build: () => { const s = strip((i) => B.crater({ radius: 2.2, seed: 10 + i }), [0.1, 0.4, 1.5], 8, { dz: 8 }); return { obj: s.obj, update: s.update, cam: { pos: [0, 12, 15], target: [0, 0.3, 0], fov: 46 } }; } });
reg({ id: 'motion_meteor', cat: 'motion', title: 'Meteor with fiery trail (0.5 / 1.0 / 1.45 s)', note: 'meteor({size,from,to}).set(age)', stage: DUSK,
  build: () => { const g = new THREE.Group(); const ages = [0.5, 1.0, 1.45]; const fx = ages.map((a, i) => { const m = B.meteor({ size: 0.8, from: [-8 + i * 7, 26, -4], to: [-5 + i * 5, 0, 0], dur: 1.6, seed: 12 + i }); g.add(m); return m; }); const upd = (t = TT) => fx.forEach((f, i) => f.set(ages[i] + t - TT)); upd(); return { obj: g, update: upd, cam: { pos: [0, 12, 34], target: [0, 11, 0], fov: 50 } }; } });
reg({ id: 'motion_laser_beam', cat: 'motion', title: 'Laser beam: charge orb, beam with rings, impact flash (0.3 / 0.8 / 1.75 s)', note: 'laserBeam({from,to,width,color}).set(age)', stage: DARK,
  build: () => { const g = new THREE.Group(); const ages = [0.3, 0.8, 1.75]; const fx = ages.map((a, i) => { const x = -3.2 + i * 3.2; const l = B.laserBeam({ from: [x, 3.2, 0], to: [x + 0.2, 0.05, -6], width: 0.3, color: [0xff3a5a, 0x3ad0ff, 0x7cff5a][i] }); g.add(l); return l; }); const upd = (t = TT) => fx.forEach((f, i) => f.set(ages[i] + t - TT)); upd(); return { obj: g, update: upd, cam: { pos: [0, 4.2, 11], target: [0, 1.2, -2], fov: 52 } }; } });

reg({ id: 'motion_smoke_plume', cat: 'motion', title: 'Smoke plumes: dark, white and brown columns that swell, drift and shrink (loop)', note: "smokePlume({height,width,color,wind}).update(t)", stage: SAND,
  build: () => { const g = new THREE.Group(); const ps = [['dark', -2.6], ['white', 0], ['brown', 2.6]].map(([c, x], i) => { const p = E.smokePlume({ height: 6.5, width: 0.7, color: c, seed: 3 + i }); p.position.x = x; g.add(p); return p; }); const upd = (t = TT) => ps.forEach((p) => p.update(t + 2.4)); upd(); return { obj: g, update: upd, cam: { pos: [0, 4.2, 15], target: [0, 3.4, 0], fov: 46 } }; } });
reg({ id: 'motion_steam_vent', cat: 'motion', title: 'Steam vent: pipe with turning valve and pulsing jets of steam (loop)', note: 'steamVent({power,period}).update(t)', stage: SAND,
  build: () => { const v = E.steamVent({}); const upd = (t = TT) => v.update(t + 0.3); upd(); return { obj: v, update: upd, cam: { pos: [2.5, 2.6, 6.5], target: [0, 1.8, 0], fov: 46 } }; } });
reg({ id: 'motion_fire', cat: 'motion', title: 'Fire: campfire (logs + stones) and a tall bonfire, flickering tongues, embers, glow (loop)', note: 'fire({radius,height,logs,light}).update(t)', stage: DUSK,
  build: () => { const g = new THREE.Group(); const a = E.fire({ radius: 0.5, height: 1.2, seed: 21 }); a.position.set(-1.6, 0, 1); const b = E.fire({ radius: 0.9, height: 2.4, seed: 25, tongues: 11, embers: 30 }); b.position.set(1.8, 0, -0.5); g.add(a, b); const upd = (t = TT) => { a.update(t); b.update(t + 0.4); }; upd(); return { obj: g, update: upd, cam: { pos: [0, 2.8, 9], target: [0, 1.5, 0], fov: 46 } }; } });
reg({ id: 'motion_lightning', cat: 'motion', title: 'Lightning: three strikes with branches, flicker and impact sparks (0.05 / 0.12 / 0.3 s)', note: 'lightning({from,to,seed}).set(age[,seed])', stage: DARK,
  build: () => { const g = new THREE.Group(); const ages = [0.05, 0.12, 0.3]; const fx = ages.map((a, i) => { const l = E.lightning({ from: [-2 + i * 2.2, 12, -1], to: [-2.6 + i * 2.6, 0, 0], seed: 3 + i * 5, width: 0.1 }); g.add(l); return l; }); const upd = (t = TT) => fx.forEach((f, i) => f.set(ages[i] + t - TT)); upd(); return { obj: g, update: upd, cam: { pos: [0, 5.6, 17], target: [0, 5.2, 0], fov: 46 } }; } });
reg({ id: 'motion_power_up_aura', cat: 'motion', title: 'Power-up aura: shell, rising streaks, ground rings, lava cracks, levitating rocks (level 1 and 0.45)', note: 'powerUpAura({height,color}).update(t, level)', stage: DARK,
  build: () => { const g = new THREE.Group(); const mk = (x, col, lv, preset) => { const ch = makeCharacter(PRESETS[preset]); ch.pose(POSES.idle(0.2)); ch.face({ ...FACES.neutral, brow: 1 }); ch.root.position.x = x; g.add(ch.root); const a = E.powerUpAura({ color: col[0], color2: col[1], seed: 31 + x }); a.position.x = x; g.add(a); return [a, lv]; }; const A = [mk(-1.7, [0xffd23f, 0xff7a1a], 1, 'hero'), mk(1.9, [0x6ad8ff, 0x7a5aff], 0.45, 'kid')]; const upd = (t = TT) => A.forEach(([a, lv]) => a.update(t + 0.3, lv)); upd(); return { obj: g, update: upd, cam: { pos: [0, 2.3, 8], target: [0, 1.2, 0], fov: 48 } }; } });
reg({ id: 'motion_tornado', cat: 'motion', title: 'Tornado: swirling puff funnel, orbiting debris, wall cloud, dust ring (loop)', note: 'tornado({height,baseR,topR,drift}).update(t)', stage: GROUND,
  build: () => { const tn = E.tornado({ height: 14, baseR: 1.1, topR: 4.6 }); const upd = (t = TT) => tn.update(t + 1.4); upd(); return { obj: tn, update: upd, cam: { pos: [0, 6.5, 30], target: [0, 7, 0], fov: 50 } }; } });
reg({ id: 'motion_rocket_exhaust', cat: 'motion', title: 'Rocket exhaust: flame sheath, core, shock diamonds, smoke trail left behind a climbing rocket (loop)', note: 'rocketExhaust({length,radius,speed}).update(t, thrust)', stage: SAND,
  build: () => { const g = new THREE.Group(); const body = new THREE.Group(); const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }); const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 3, 24), M(0xf4f4f8)); bm.position.y = 1.5; const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 24), M(0xe5483a)); nose.position.y = 3.55; const win = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), M(0x55b8ff)); win.position.set(0, 2.2, 0.5); body.add(bm, nose, win); for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.7), M(0xe5483a)); const a = i / 3 * Math.PI * 2; f.position.set(Math.sin(a) * 0.7, 0.45, Math.cos(a) * 0.7); f.rotation.y = a; body.add(f); } const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.35, 20), M(0x333a46)); nz.position.y = -0.1; body.add(nz); body.position.y = 9; g.add(body); const ex = E.rocketExhaust({ length: 3.4, radius: 0.42, speed: 14 }); ex.position.y = 9; g.add(ex); const upd = (t = TT) => ex.update(t + 1.1, 1); upd(); return { obj: g, update: upd, cam: { pos: [3, 6.5, 15], target: [0, 5.5, 0], fov: 50 } }; } });
reg({ id: 'motion_comet_tail', cat: 'motion', title: 'Comet: icy faceted head, coma glow, blue ion tail and curved dust tail (loop)', note: 'cometTail({length,headR,dir}).update(t)', stage: { sky: ['#04061a', '#141a3a'], ground: null },
  build: () => { const c = E.cometTail({ length: 40, headR: 1.3, dir: [-1, 0.1, 0.15] }); c.position.set(11, 5, 0); const upd = (t = TT) => c.update(t + 1); upd(); return { obj: c, update: upd, cam: { pos: [-4, 4, 46], target: [-4, 4.5, 0], fov: 50 } }; } });
reg({ id: 'motion_water_splash', cat: 'motion', title: 'Water splash: jet + bulb, jagged crown sheet, droplets, foam, rings (0.1 / 0.28 / 0.6 / 1.3 s)', note: 'waterSplash({radius,height,y}).set(age)', stage: { sky: ['#8fd0ff', '#fff1d4'], ground: null },
  build: () => { const g = new THREE.Group(); const pond = E.waterRipple({ radius: 9, idle: true }); pond.update(0.8); g.add(pond); const s = strip((i) => E.waterSplash({ radius: 0.9, height: 2.2, seed: 71 + i }), [0.1, 0.28, 0.6, 1.3], 4.6, { dz: 4.6 }); g.add(s.obj); const upd = (t = TT) => { pond.update(t); s.update(t); }; return { obj: g, update: upd, cam: { pos: [0, 6.5, 12], target: [0, 1.2, 0], fov: 46 } }; } });
reg({ id: 'motion_water_ripple', cat: 'motion', title: 'Water ripple: displaced surface with expanding ring waves, seeded raindrops that never stop (loop)', note: 'waterRipple({radius,drops,idle}).set(t)', stage: { sky: ['#8fd0ff', '#fff1d4'], ground: null },
  build: () => { const w = E.waterRipple({ radius: 8, idle: true, drops: [{ x: 0, z: 0, t0: 0.15, amp: 1.2 }] }); const upd = (t = TT) => w.update(t + 1.4); upd(); return { obj: w, update: upd, cam: { pos: [0, 6, 9], target: [0, 0, 0], fov: 46 } }; } });
