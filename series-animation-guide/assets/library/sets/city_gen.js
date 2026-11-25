// City pack generators: whole dense scenes with motion, all deterministic (seeded rng, closed-form update(t)).
//   cityBlock({seed, rows, cols, zone})  one detailed block: buildings, street furniture, signals, traffic, pedestrians
//   cityGrid({size, density, detail})    aerial city of size x size blocks (instanced windows, roads, parks, traffic loops)
//   trafficFlow(path, n, opts)           low-detail instanced cars/taxis/buses/trucks driving a path in update(t)
//   pedestrians(n, opts)                 low-detail walking crowd (swinging arms/legs) on sidewalk loops
//   skylineRing({radius})                ring of towers for horizon dressing (windows, beacons)
// All return a Group with userData.update(t), userData.realWidthM / realHeightM.
import * as THREE from 'three';
import {
  Batch, PAL, anim, meta, makeWindows, makePath, inst, rng, shade, lerp, clamp, TAU, fract, hash1, lampMat, gBox, gSph, gCyl, gCone, gPlane, mat, vcMat, treeParts, birdFlock,
} from '../props/city_kit.js';
import * as BLD from '../props/city_buildings.js';
import { curtainWindows } from '../props/city_buildings.js';
import { fleet } from '../props/city_vehicles.js';
import { trafficLight, streetLamp, hydrant, bench, trashBins, mailbox, newsBox, signalPhase } from '../props/city_street.js';

// ---------------------------------------------------------------- traffic
// path: [[x,z],...] closed loop (or a makePath result). Cars drive on the right in two lanes (one per direction).
export function trafficFlow(pathIn, n = 20, { seed = 1, speed = 9, laneOffset = 2.8, radius = 9, mix = { sedan: 5, hatch: 2, suv: 2, taxi: 2, bus: 1, truck: 1 }, y = 0 } = {}) {
  const rnd = rng(seed), path = pathIn.L !== undefined ? pathIn : makePath(pathIn, { closed: true, radius });
  const g = new THREE.Group(), L = path.L, perLane = Math.ceil(n / 2);
  const types = []; for (const [k, v] of Object.entries(mix)) for (let i = 0; i < v; i++) types.push(k);
  const spacing = L / perLane, items = [], lanes = [];
  for (let lane = 0; lane < 2; lane++) for (let i = 0; i < perLane; i++) {
    if (items.length >= n) break;
    let type = rnd.pick(types); if ((type === 'bus' || type === 'truck') && spacing < 16) type = 'sedan';
    const s0 = i * spacing + rnd.range(-0.12, 0.12) * Math.max(0, spacing - 14), v = speed * (lane ? 0.92 : 1) * (1 + (hash1(seed) - 0.5) * 0.04);
    items.push({ type, color: [0xd9392f, 0x2f6fd6, 0xf6c235, 0x2fa66a, 0xf2f0ea, 0x8a52c9, 0xf08a2b, 0x2bb7b0, 0x59626f, 0x151515][Math.floor(rnd() * 10)], y }); lanes.push({ lane, s0, v });
  }
  const fl = fleet(items); g.add(fl);
  const upd = (t) => { lanes.forEach((c, i) => { const s = c.s0 + (c.lane ? -1 : 1) * c.v * t, p = path.at(s, c.lane ? -laneOffset : laneOffset); fl.move(i, p.x, y, p.z, p.h + (c.lane ? Math.PI : 0)); }); fl.commit(); };
  upd(0); g.userData.update = upd; g.userData.path = path; g.userData.count = items.length;
  return meta(g, { h: 3.5, w: L, name: 'trafficFlow' });
}

// ---------------------------------------------------------------- pedestrians
// paths: array of closed or open point lists [[x,z],...] (default: a 30 x 20 m pavement loop). Walkers loop around closed paths and ping-pong on open ones.
export function pedestrians(n = 60, { paths = null, seed = 2, speed = 1.35, lat = 0.9, scale = 1 } = {}) {
  const rnd = rng(seed), g = new THREE.Group();
  const P = (paths ?? [[[-15, -10], [15, -10], [15, 10], [-15, 10]]]).map((p) => (p.L !== undefined ? p : makePath(p, { closed: p.length >= 3, radius: 1.5 })));
  const geos = {
    torso: gCyl(0.2, 0.17, 0.62, 8), head: gSph(0.15, 8, 6), leg: gCyl(0.075, 0.065, 0.82, 6), arm: gCyl(0.055, 0.048, 0.6, 6), shoe: gBox(0.12, 0.07, 0.24), hair: gSph(0.16, 8, 4),
  };
  const mk = (geo, count, color = 0xffffff) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }), count); m.castShadow = false; m.frustumCulled = false; g.add(m); return m; };
  const torso = mk(geos.torso, n), head = mk(geos.head, n), legL = mk(geos.leg, n), legR = mk(geos.leg, n), armL = mk(geos.arm, n), armR = mk(geos.arm, n), shoeL = mk(geos.shoe, n, 0x20232b), shoeR = mk(geos.shoe, n, 0x20232b), hair = mk(geos.hair, n);
  const shirts = [0xd9392f, 0x2f6fd6, 0xf6c235, 0x2fa66a, 0xf2f0ea, 0x8a52c9, 0xf08a2b, 0x2bb7b0, 0xe86a98, 0x59626f], pants = [0x2b3a6a, 0x3a3f4a, 0x5a4a3a, 0x20232b, 0x6a7380], skins = [0xf2b98f, 0xd99a6c, 0x9b6338, 0xf8d5b8, 0x6b4226], hairs = [0x2a1a10, 0x6b4a2a, 0xd9b45a, 0x15151c, 0xb5573f, 0xcfcfd4];
  const W = []; const col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const w = { p: Math.floor(rnd() * P.length), dir: rnd() < 0.5 ? 1 : -1, s0: rnd() * 1000, v: speed * rnd.range(0.75, 1.3), lat: (rnd() < 0.5 ? 1 : -1) * rnd.range(0.4, lat), sc: scale * rnd.range(0.9, 1.06), ph: rnd() * TAU, idle: rnd() < 0.12 };
    W.push(w);
    torso.setColorAt(i, col.set(shirts[Math.floor(rnd() * shirts.length)])); armL.setColorAt(i, col); armR.setColorAt(i, col);
    const pc = pants[Math.floor(rnd() * pants.length)]; legL.setColorAt(i, col.set(pc)); legR.setColorAt(i, col);
    head.setColorAt(i, col.set(skins[Math.floor(rnd() * skins.length)])); hair.setColorAt(i, col.set(hairs[Math.floor(rnd() * hairs.length)]));
  }
  for (const m of [torso, head, legL, legR, armL, armR, hair]) m.instanceColor.needsUpdate = true;
  const base = new THREE.Matrix4(), tmp = new THREE.Matrix4(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), sv = new THREE.Vector3();
  const limb = (mesh, i, hx, hy, swing, len, sc, bendZ = 0) => { tmp.makeTranslation(hx, hy, 0); m.copy(base).multiply(tmp); e.set(swing, 0, bendZ); q.setFromEuler(e); tmp.makeRotationFromQuaternion(q); m.multiply(tmp); tmp.makeTranslation(0, -len / 2, 0); m.multiply(tmp); mesh.setMatrixAt(i, m); };
  const upd = (t) => {
    for (let i = 0; i < n; i++) {
      const w = W[i], path = P[w.p]; let s = w.s0 + (w.idle ? 0 : w.v * t * w.dir), h;
      let pos;
      if (path.closed) pos = path.at(s, w.lat * w.dir); else { const L = path.L, u = ((s % (2 * L)) + 2 * L) % (2 * L), fwd = u < L; pos = path.at(fwd ? u : 2 * L - u, w.lat); pos.h += fwd ? 0 : Math.PI; }
      h = pos.h + (w.dir < 0 && path.closed ? Math.PI : 0);
      const gait = w.idle ? 0 : (s * 2.3 * w.dir * (w.dir < 0 && path.closed ? -1 : 1)) + w.ph, sw = w.idle ? 0 : Math.sin(gait) * 0.55, bob = w.idle ? Math.sin(t * 1.5 + w.ph) * 0.01 : Math.abs(Math.cos(gait)) * 0.035;
      e.set(0, h, 0); q.setFromEuler(e); base.compose(v3.set(pos.x, bob * w.sc, pos.z), q, sv.set(w.sc, w.sc, w.sc));
      limb(legL, i, -0.1, 0.84, sw, 0.82, 1); limb(legR, i, 0.1, 0.84, -sw, 0.82, 1);
      tmp.makeTranslation(-0.1, 0.84 - 0.82 * Math.cos(sw) + 0.04, -0.82 * Math.sin(sw) + 0.05); m.copy(base).multiply(tmp); shoeL.setMatrixAt(i, m);
      tmp.makeTranslation(0.1, 0.84 - 0.82 * Math.cos(-sw) + 0.04, -0.82 * Math.sin(-sw) + 0.05); m.copy(base).multiply(tmp); shoeR.setMatrixAt(i, m);
      limb(armL, i, -0.26, 1.46, -sw * 0.8, 0.6, 1, 0.08); limb(armR, i, 0.26, 1.46, sw * 0.8, 0.6, 1, -0.08);
      tmp.makeTranslation(0, 1.17, 0); m.copy(base).multiply(tmp); torso.setMatrixAt(i, m);
      tmp.makeTranslation(0, 1.68, 0); m.copy(base).multiply(tmp); head.setMatrixAt(i, m);
      tmp.makeTranslation(0, 1.74, -0.02); m.copy(base).multiply(tmp); hair.setMatrixAt(i, m);
    }
    for (const mm of [torso, head, legL, legR, armL, armR, shoeL, shoeR, hair]) mm.instanceMatrix.needsUpdate = true;
  };
  upd(0); g.userData.update = upd; g.userData.count = n;
  return meta(g, { h: 1.85 * scale, w: 30, name: 'pedestrians' });
}

// ---------------------------------------------------------------- shared city pieces (batched)
function streetTrees(b, list, rnd, color = 0x4aa84e) { for (const [x, z] of list) treeParts(b, x, z, rnd.range(4.6, 6.4), shade(color, rnd.range(0.85, 1.1))); }
const rectPath = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

// ---------------------------------------------------------------- cityBlock
export function cityBlock({ seed = 1, rows = 2, cols = 4, zone = 'mixed', detail = 'high', traffic = 14, walkers = 36, road = 13, sw = 3.6 } = {}) {
  const rnd = rng(seed), g = new THREE.Group(), A = anim(g), b = new Batch(), gb = new Batch();
  const lod = detail === 'high' ? 'high' : 'low';
  rows = clamp(Math.round(rows), 1, 2);
  const pick = {
    residential: [['brownstone', 4], ['apartment', 2], ['shop', 2], ['church', 0.3]],
    mixed: [['brownstone', 3], ['apartment', 2], ['shop', 1.5], ['office', 1.5], ['church', 0.2]],
    downtown: [['office', 4], ['apartment', 1], ['shop', 0.5], ['sky', 0.3]],
  }[zone] ?? [];
  const make = (kind, i) => {
    const o = { seed: seed * 31 + i, lod, sidewalk: false };
    switch (kind) {
      case 'brownstone': return BLD.brownstone({ ...o, w: rnd.pick([6.2, 6.6, 7.0]), floors: rnd.pick([3, 3, 4]), color: rnd.pick([0x8f5242, 0x9a5a3e, 0x7e4a3c, 0xa0644a, 0x8a6a56]), d: rnd.pick([12, 13, 14]) });
      case 'apartment': return BLD.apartmentBlock({ ...o, w: rnd.pick([20, 24, 27]), floors: rnd.pick([6, 8, 9]), color: rnd.pick([0xe9b77c, 0xd8cfa8, 0xe9a89a, 0xc2d4b0, 0xb7c8e0]), accent: rnd.pick([0x2f8f8f, 0xc9573a, 0x4a6aa8]) });
      case 'shop': return BLD.cornerShop({ ...o, w: rnd.pick([8, 9, 10]), color: rnd.pick([0xf0c38a, 0xf4b8a8, 0xbfe0c8, 0xb7d3ee]), name: rnd.pick(['CORNER SHOP', 'BAKERY', 'CAFE', 'DELI', 'BOOKS']) });
      case 'office': return BLD.officeTower({ ...o, lod: 'low', w: rnd.pick([12, 14, 16]), d: rnd.pick([12, 14]), floors: rnd.pick([10, 14, 18, 24, 30]), name: rnd.pick(['NOVA', 'ATLAS', 'ORBIT', 'ZENITH']), tint: rnd.pick([0x5a93c0, 0x6aa8a0, 0x7a8fc8]) });
      case 'church': return BLD.church({ ...o });
      default: return BLD.skyscraper({ ...o, lod: 'low' });
    }
  };
  const total = pick.reduce((s, p) => s + p[1], 0), choose = () => { let r = rnd() * total; for (const [k, w] of pick) { r -= w; if (r <= 0) return k; } return pick[0][0]; };
  const rowsData = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const items = []; let width = 0, dmax = 0;
    for (let c = 0; c < cols; c++) { const kind = choose(); const o = make(kind, idx++); const fp = o.userData.footprint ?? { w: 10, d: 10 }; items.push({ o, w: fp.w, d: fp.d }); width += fp.w + (kind === 'brownstone' ? 0.05 : 0.8); dmax = Math.max(dmax, fp.d); }
    rowsData.push({ items, width, dmax });
  }
  const W = Math.max(...rowsData.map((r) => r.width)), alley = 3, D = rows === 2 ? rowsData[0].dmax + rowsData[1].dmax + alley : rowsData[0].dmax;
  rowsData.forEach((r, ri) => {
    let x = -r.width / 2;
    r.items.forEach((it) => { x += it.w / 2; const o = it.o; if (ri === 0) { o.position.set(x, 0.15, D / 2 - it.d / 2); } else { o.position.set(-x, 0.15, -D / 2 + it.d / 2); o.rotation.y = Math.PI; } A.add(o); x += it.w / 2 + 0.4; });
  });
  // fix duplicate update registration: A.add pushes update and group add already done
  const ox = W / 2 + sw, oz = D / 2 + sw, rx = ox + road, rz = oz + road;
  // ground: road ring, sidewalks, block slab, markings, crosswalks, manholes
  gb.layer = 1; gb.box(2 * rx + 30, 0.08, 2 * rz + 30, 0x3b3e48, [0, 0.0, 0], { rough: 0.95 });
  gb.layer = 2; gb.box(2 * ox, 0.15, 2 * oz, 0xc9c5ba, [0, 0.07, 0], { rough: 0.9 });
  gb.layer = 3;
  for (const [x, z, w, d] of [[0, oz, 2 * ox + 0.4, 0.3], [0, -oz, 2 * ox + 0.4, 0.3], [ox, 0, 0.3, 2 * oz], [-ox, 0, 0.3, 2 * oz]]) gb.box(w, 0.2, d, 0xe0ddd4, [x, 0.1, z], { rough: 0.8 });
  const cx = ox + road / 2, cz = oz + road / 2; gb.layer = 5;
  for (let i = -Math.floor(rx / 3); i <= Math.floor(rx / 3); i++) for (const z of [cz, -cz]) if (Math.abs(i * 3) < ox - 6 || Math.abs(i * 3) > ox + 6) gb.box(1.6, 0.02, 0.2, 0xf6c235, [i * 3, 0.09, z]);
  for (let i = -Math.floor(rz / 3); i <= Math.floor(rz / 3); i++) for (const x of [cx, -cx]) if (Math.abs(i * 3) < oz - 6 || Math.abs(i * 3) > oz + 6) gb.box(0.2, 0.02, 1.6, 0xf6c235, [x, 0.09, i * 3]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (let i = 0; i < 7; i++) { gb.box(3.0, 0.02, 0.6, 0xf4f4ee, [sx * (ox - 2.8), 0.09, sz * (oz + 1.0 + i * (road - 2) / 6)]); gb.box(0.6, 0.02, 3.0, 0xf4f4ee, [sx * (ox + 1.0 + i * (road - 2) / 6), 0.09, sz * (oz - 2.8)]); }
  }
  for (const [x, z] of [[ox + road / 2 - 3, oz + road / 2 + 2.5], [-ox - road / 2 + 3, -oz - road / 2 - 2.5]]) { gb.cyl(0.55, 0.55, 0.03, 18, 0x4a4f5a, [x, 0.095, z], { metal: 0.3 }); gb.add(new THREE.TorusGeometry(0.3, 0.012, 4, 18), 0x20232b, { p: [x, 0.115, z], r: [Math.PI / 2, 0, 0] }); }
  // street trees, hydrants, benches along the pavement
  const trees = []; for (let x = -ox + 6; x < ox - 4; x += 12 + rnd.range(0, 4)) { trees.push([x, oz - 0.9], [x + 3, -oz + 0.9]); } for (let z = -oz + 8; z < oz - 4; z += 14) { trees.push([ox - 0.9, z], [-ox + 0.9, z + 2]); }
  streetTrees(b, trees, rnd);
  { const gg = gb.build(new THREE.Group(), { shadow: false }); gg.children.forEach((m) => { m.receiveShadow = false; }); g.add(gg); }
  b.build(g);
  // props
  const place = (o, x, z, ry = 0) => { o.position.set(x, 0.15, z); o.rotation.y = ry; g.add(o); A.add(o); return o; };
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const tl = trafficLight({ dir: sx * sz > 0 ? 0 : 1, side: -sx, arm: 6 }); place(tl, sx * (ox + 0.6), sz * (oz + 0.6), sz > 0 ? 0 : Math.PI); }
  for (let i = 0; i < 6; i++) { const x = -ox + 8 + i * (2 * ox - 16) / 5; const l = streetLamp({ kind: i % 2 ? 'cobra' : 'classic', seed: i + seed, }); place(l, x, (i % 2 ? 1 : -1) * (oz - 1.2), i % 2 ? Math.PI : 0); if (i % 2 === 0) l.rotation.y = 0; }
  place(hydrant(), ox * 0.3, oz - 0.5); place(hydrant({ spray: rnd() < 0.3 }), -ox * 0.5, -oz + 0.5); place(bench({ seed }), -ox * 0.6, oz - 1.4, 0); place(trashBins({ seed }), ox * 0.6, oz - 0.8, 0); place(mailbox(), -ox * 0.2, -oz + 0.7, Math.PI); place(newsBox({ seed }), ox * 0.1, -oz + 0.8, Math.PI);
  // parked cars along both long kerbs (static) + moving traffic + walkers
  const parked = []; const cols2 = [0xd9392f, 0x2f6fd6, 0xf6c235, 0x2fa66a, 0xf2f0ea, 0x59626f, 0x8a52c9];
  for (let x = -ox + 6; x < ox - 6; x += 7 + rnd.range(0, 3)) { if (rnd() < 0.35) continue; parked.push({ type: rnd.pick(['sedan', 'sedan', 'hatch', 'suv']), color: rnd.pick(cols2), x, y: 0.04, z: oz + 2.0, ry: Math.PI / 2 }); }
  for (let x = -ox + 8; x < ox - 6; x += 7 + rnd.range(0, 3)) { if (rnd() < 0.35) continue; parked.push({ type: rnd.pick(['sedan', 'hatch', 'suv', 'taxi']), color: rnd.pick(cols2), x, y: 0.04, z: -oz - 2.0, ry: -Math.PI / 2 }); }
  if (parked.length) g.add(fleet(parked));
  if (traffic) { const tf = trafficFlow(rectPath(-cx, -cz, cx, cz), traffic, { seed: seed + 5, speed: 8.5, radius: 8, laneOffset: 3.0 }); A.add(tf); }
  if (walkers) { const pd = pedestrians(walkers, { seed: seed + 9, paths: [rectPath(-ox + 1.4, -oz + 1.4, ox - 1.4, oz - 1.4)], lat: 0.7 }); pd.position.y = 0.15; A.add(pd); }
  meta(g, { h: Math.max(...rowsData.flatMap((r) => r.items.map((i) => i.o.userData.realHeightM))), w: 2 * rx, d: 2 * rz, name: 'cityBlock' }); g.userData.footprint = { w: 2 * ox, d: 2 * oz }; g.userData.roadLoop = rectPath(-cx, -cz, cx, cz);
  return g;
}

// ---------------------------------------------------------------- cityGrid (aerial)
export function cityGrid({ size = 6, density = 0.85, detail = 'high', seed = 3, block = 62, road = 16, hmax = 150, traffic = 1 } = {}) {
  const rnd = rng(seed), g = new THREE.Group(), A = anim(g), b = new Batch(), gb = new Batch(), pitch = block + road, N = size, half = (N * pitch) / 2;
  const hi = detail === 'high';
  gb.layer = 1; gb.box(N * pitch + road + 20, 0.1, N * pitch + road + 20, 0x3b3e48, [0, 0, 0], { rough: 0.95 });
  // lane dashes + crosswalk stripes (instanced via batch planes for cheap)
  const dashes = [];
  for (let i = 0; i <= N; i++) { const c = -half + i * pitch - road / 2 * 0 - (i === 0 ? 0 : 0); const line = -half + i * pitch; for (let k = 0; k < N; k++) for (let j = 0; j < 7; j++) { const t0 = -half + k * pitch + road / 2 + 3 + j * (block - 2) / 6.4; dashes.push({ p: [line - road / 2 * 0 + 0, 0.07, t0], s: [0.25, 1, 3.2], r: [0, 0, 0] }); dashes.push({ p: [t0, 0.07, line], s: [3.2, 1, 0.25], r: [0, 0, 0] }); } }
  const decal = (c, l) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -l, polygonOffsetUnits: -l * 4 });
  const dm = inst(gBox(1, 0.02, 1), decal(0xf6c235, 6), dashes); g.add(dm);
  const zebra = []; for (let i = 0; i <= N; i++) for (let k = 0; k <= N; k++) { const x = -half + i * pitch, z = -half + k * pitch; for (let j = -3; j <= 3; j++) { zebra.push({ p: [x + j * 1.7, 0.07, z + road / 2 + 2.2], s: [0.8, 1, 3.0] }); zebra.push({ p: [x + j * 1.7, 0.07, z - road / 2 - 2.2], s: [0.8, 1, 3.0] }); zebra.push({ p: [x + road / 2 + 2.2, 0.07, z + j * 1.7], s: [3.0, 1, 0.8] }); zebra.push({ p: [x - road / 2 - 2.2, 0.07, z + j * 1.7], s: [3.0, 1, 0.8] }); } }
  g.add(inst(gBox(1, 0.02, 1), decal(0xf4f4ee, 6), zebra.slice(0, hi ? 99999 : 2000)));
  const wins = [], beacons = [], canopies = [], trunks = [];
  let bcount = 0;
  const glassCols = [0x5a93c0, 0x6aa8a0, 0x7a8fc8, 0x8ab0c8];
  const bodyCols = [0xb5573f, 0xd8cfa8, 0xa8a094, 0xc9b896, 0x8a96a8, 0xd6c0a0, 0xe0d8c8, 0x9a8a7a, 0xbfb4a0];
  for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) {
    const bx = -half + road / 2 + i * pitch + block / 2 + (road / 2) * 0 + pitch * 0 + 0, bz = -half + road / 2 + k * pitch + block / 2;
    const bxc = -half + (i + 0.5) * pitch, bzc = -half + (k + 0.5) * pitch;
    const dist = Math.hypot(bxc, bzc) / (half * 1.2), core = Math.pow(clamp(1 - dist), 1.4);
    gb.layer = 2; gb.box(block, 0.18, block, 0xc9c5ba, [bxc, 0.1, bzc], { rough: 0.9 });
    if (rnd() < 0.12 * (1 - density * 0.3) || (i === Math.floor(N / 2) && k === Math.floor(N / 2) && N > 3 && false)) { // park
      gb.layer = 3; gb.box(block - 6, 0.12, block - 6, 0x5fae4a, [bxc, 0.24, bzc], { rough: 1 }); gb.layer = 4; gb.box(block - 18, 0.1, 8, 0xb89a6a, [bxc, 0.3, bzc]); gb.cyl(7, 7, 0.1, 24, 0x4aa0d8, [bxc + 12, 0.32, bzc - 10], { metal: 0.2, rough: 0.2 });
      for (let t = 0; t < 14; t++) { const tx = bxc + rnd.range(-block / 2 + 5, block / 2 - 5), tz = bzc + rnd.range(-block / 2 + 5, block / 2 - 5); canopies.push({ p: [tx, 5.5, tz], s: rnd.range(2.2, 3.4), c: rnd.pick([0x4aa84e, 0x5fb85a, 0x3f9a46]) }); trunks.push({ p: [tx, 2.2, tz], s: [0.35, 4, 0.35] }); }
      continue;
    }
    const lots = 3 + (density > 0.7 ? 0 : -1), lw = block / lots;
    for (let a = 0; a < lots; a++) for (let c = 0; c < lots; c++) {
      if (rnd() > density) continue;
      const w = lw - rnd.range(1.5, 4), d = lw - rnd.range(1.5, 4), x = bxc - block / 2 + lw * (a + 0.5), z = bzc - block / 2 + lw * (c + 0.5);
      const cdist = Math.hypot(x, z) / (half * 1.15), h0 = lerp(10, hmax, Math.pow(clamp(1 - cdist), 1.6)) * rnd.range(0.4, 1.0), h = Math.max(9, h0), col = rnd.pick(bodyCols), isGlass = h > 50 && rnd() < 0.6;
      const tiers = h > 70 ? 2 + (rnd() < 0.5 ? 1 : 0) : 1; let th = h, tw = w, td = d, y = 0.19;
      for (let t = 0; t < tiers; t++) {
        const hh = t === tiers - 1 ? th : th * rnd.range(0.55, 0.7), c = isGlass ? shade(rnd.pick(glassCols), 0.55) : shade(col, 1 - t * 0.04);
        b.box(tw, hh, td, c, [x, y + hh / 2, z], { rough: isGlass ? 0.3 : 0.8, metal: isGlass ? 0.3 : 0 });
        b.box(tw + 0.3, 0.5, td + 0.3, shade(c, 0.8), [x, y + hh + 0.25, z]);
        const fh = isGlass ? 4 : 3.6, floors = Math.max(1, Math.floor(hh / fh));
        const out = []; curtainWindows(out, { cx: x, cz: z, w: tw, d: td, y0: y, floors, fh, colW: hi ? 3.0 : 5.0, band: isGlass ? 1.0 : 1.2, rnd, lit: 0.2, lo: 0x4a7aa5, hi: 0x9ac8e8, from: 0 });
        if (!hi) for (let q2 = out.length - 1; q2 >= 0; q2--) if (q2 % 2) out.splice(q2, 1);
        if (isGlass) for (const wd of out) wd.c = new THREE.Color(0x7fb2d8).lerp(new THREE.Color(0xd6ecfa), rnd() * 0.5).getHex();
        for (const wd of out) wins.push(wd);
        y += hh; tw *= 0.72; td *= 0.72; th -= hh;
        if (t < tiers - 1) th = Math.max(8, th);
      }
      const top = y; tw = Math.max(tw, 3);
      // roof kit: AC boxes, water tank, antenna, helipad on some
      for (let q2 = 0; q2 < 2; q2++) b.box(1.8, 1.0, 1.4, 0xc9ced6, [x + rnd.range(-w * 0.3, w * 0.3), top + 0.5, z + rnd.range(-d * 0.3, d * 0.3)], { metal: 0.3 });
      if (rnd() < 0.3) { b.cyl(1.1, 1.1, 2, 10, 0x8a5f3c, [x + 1.5, top + 1.5, z - 1.5]); b.cone(1.2, 0.8, 10, 0x5a4028, [x + 1.5, top + 2.9, z - 1.5]); }
      if (h > 60) { b.cyl(0.12, 0.25, 12, 6, 0xdfe3ea, [x, top + 6, z]); if (bcount++ % 2 === 0) beacons.push([x, top + 12.3, z]); }
      else if (rnd() < 0.4) b.cyl(0.1, 0.15, 4, 6, 0xdfe3ea, [x - 1, top + 2, z]);
    }
  }
  // street trees (instanced canopies)
  const lineTree = []; for (let i = 0; i <= N; i++) for (let k = 0; k < N * 3; k++) if (rnd() < 0.7) { const t = -half + (k + 0.5) * (N * pitch) / (N * 3); const l = -half + i * pitch + (rnd() < 0.5 ? -1 : 1) * (road / 2 - 1.2); lineTree.push([l, t], [t, l]); }
  lineTree.forEach(([x, z]) => { if (Math.abs(x) < half + road / 2 && Math.abs(z) < half + road / 2) { canopies.push({ p: [x, 4.2, z], s: rnd.range(1.5, 2.2), c: rnd.pick([0x4aa84e, 0x5fb85a, 0x3f9a46]) }); trunks.push({ p: [x, 1.6, z], s: [0.25, 3.2, 0.25] }); } });
  if (canopies.length) { const cm = inst(gSph(1, 7, 5), mat(0xffffff, { rough: 0.9 }), canopies.map((c) => ({ p: c.p, s: [c.s, c.s * 0.9, c.s], c: c.c }))); g.add(cm); g.add(inst(gBox(1, 1, 1), mat(0x7a5232), trunks)); }
  { const gg = gb.build(new THREE.Group(), { shadow: false }); gg.children.forEach((m) => { m.receiveShadow = false; }); g.add(gg); }
  b.build(g);
  const winG = makeWindows(wins, { lod: 'low', depthK: Math.max(2, block / 25) }); A.add(winG);
  // beacons blink in two alternating groups
  const bm = [lampMat(0xff3030, 1), lampMat(0xff3030, 1)], bi = [[], []]; beacons.forEach((p, i) => bi[i % 2].push({ p })); for (let q2 = 0; q2 < 2; q2++) if (bi[q2].length) g.add(inst(gSph(0.7, 6, 5), bm[q2], bi[q2]));
  A.on((t) => { bm[0].userData.set(fract(t / 1.8) < 0.2 ? 1.6 : 0.1); bm[1].userData.set(fract(t / 1.8 + 0.5) < 0.2 ? 1.6 : 0.1); });
  // traffic loops on concentric avenues (every grid line pair) + a few big loops for ring roads
  const tfn = Math.max(0, Math.round(traffic * 1));
  if (tfn) for (let k = 0; k < Math.floor(N / 2) + 0; k++) { const a = -half + (k + 0) * pitch, c = half - (k + 0) * pitch; const loop = rectPath(a, a, c, c); const Lp = 4 * (c - a); const n = Math.round((Lp / 22) * traffic * (0.6 + density * 0.5)); if (n > 1 && Lp > 60) A.add(trafficFlow(loop, n, { seed: seed + k, speed: 9 + k, radius: 10, laneOffset: 3.2 })); }
  // a few birds high above
  A.add(birdFlock({ n: 14, center: [0, 160, 0], radius: half * 0.6, spread: 30, speed: 0.04, seed: 4, size: 5, color: 0xf4f1e8 }));
  meta(g, { h: hmax + 20, w: N * pitch, name: 'cityGrid' }); g.userData.footprint = { w: N * pitch, d: N * pitch };
  return g;
}

// ---------------------------------------------------------------- skylineRing: towers around the origin on the horizon
export function skylineRing({ radius = 380, n = 70, seed = 5, hmin = 40, hmax = 260, night = 0, layers = 2, arc = 360, startDeg = 0 } = {}) {
  const rnd = rng(seed), g = new THREE.Group(), A = anim(g), b = new Batch(), wins = [], beacons = [];
  const bodies = [0x8a96a8, 0xa8a094, 0x6f7f96, 0xb5a58c, 0x7a8aa0, 0x9aa6b8, 0xb8c0cc, 0x5f6f86];
  for (let L = 0; L < layers; L++) for (let i = 0; i < n; i++) {
    const a = ((startDeg + (i + rnd() * 0.8) / n * arc) * Math.PI) / 180, r = radius + L * 60 + rnd.range(-25, 25), x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = rnd.range(hmin, hmax) * (L ? 0.7 : 1) * (rnd() < 0.12 ? 1.35 : 1), w = rnd.range(18, 38), d = rnd.range(18, 34), col = rnd.pick(bodies), glass = rnd() < 0.5;
    const o = new THREE.Object3D(); o.position.set(x, 0, z); o.rotation.y = -a + Math.PI / 2; o.updateMatrix();
    const tiers = h > 120 ? 3 : h > 70 ? 2 : 1; let y = 0, tw = w, td = d, th = h;
    const loc = (px, py, pz) => new THREE.Vector3(px, py, pz).applyMatrix4(o.matrix);
    for (let t = 0; t < tiers; t++) {
      const hh = t === tiers - 1 ? th : th * rnd.range(0.5, 0.62), c = glass ? shade(0x7fa6d0, 0.8 + 0.1 * t) : shade(col, 1.1 - 0.05 * t);
      b.box(tw, hh, td, c, [x, y + hh / 2, z], { r: [0, -a + Math.PI / 2, 0], rough: glass ? 0.3 : 0.8, metal: glass ? 0.3 : 0 });
      const out = []; curtainWindows(out, { cx: 0, cz: 0, w: tw, d: td, y0: y, floors: Math.max(1, Math.floor(hh / 4.2)), fh: 4.2, colW: 4.5, band: 1.2, rnd, lit: 0.14 + night * 0.55, lo: 0x4a7aa5, hi: 0x9ac8e8, faces: 'BLR' });
      for (const e of out) { const p = loc(e.x, e.y, e.z); e.x = p.x; e.z = p.z; e.ry += -a + Math.PI / 2; wins.push(e); }
      y += hh; tw *= 0.7; td *= 0.7; th -= hh;
    }
    b.box(tw + 2, 1.2, td + 2, shade(col, 0.7), [x, y + 0.6, z], { r: [0, -a + Math.PI / 2, 0] });
    if (rnd() < 0.5) b.box(5, 3, 4, 0xc9ced6, [x, y + 2.7, z], { r: [0, -a + Math.PI / 2, 0], metal: 0.3 });
    if (h > 90) { const mh = rnd.range(14, 34); b.cyl(0.2, 0.7, mh, 6, 0xdfe3ea, [x, y + mh / 2 + 1, z]); if (rnd() < 0.65) beacons.push([x, y + mh + 1.5, z]); }
  }
  b.build(g);
  const rd = Math.max(3, radius / 90); A.add(makeWindows(wins, { lod: 'low', depthK: rd }));
  const bm = [lampMat(0xff3030, 1), lampMat(0xff3030, 1)], bi = [[], []]; beacons.forEach((p, i) => bi[i % 2].push({ p, s: Math.max(1.2, radius / 140) })); for (let q2 = 0; q2 < 2; q2++) if (bi[q2].length) g.add(inst(gSph(1, 6, 5), bm[q2], bi[q2]));
  A.on((t) => { bm[0].userData.set(fract(t / 2) < 0.18 ? 1.6 : 0.1); bm[1].userData.set(fract(t / 2 + 0.5) < 0.18 ? 1.6 : 0.1); });
  meta(g, { h: hmax * 1.35, w: radius * 2, name: 'skylineRing' });
  return g;
}
