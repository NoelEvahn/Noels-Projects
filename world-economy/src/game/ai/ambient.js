// Ambient life v0 (Visual Fix Round 1): cars on the road-graph lanes, pedestrians on sidewalks, gulls and crows.
// Pure JS (no three, no DOM, no allocation per update). Agents live in fixed typed arrays; render views read them.
// A pool is kept around the camera: agents farther than the despawn radius are re-spawned inside the spawn annulus.
// Kinematic only: no collisions, no gameplay, no interaction with the player beyond "never spawn on the player".
// TO BE SUPERSEDED / EXTENDED BY STAGE 4 AI (traffic.js, pedestrians.js, animals); this file is self-contained so that stage can
// reuse the road-graph helpers (pointAt, lane choice, signal phases) or replace it. See docs/DECISIONS.md "Ambient v0".
import { World } from '../../world/query.js';

export const CAR_KINDS = ['veh.sedan', 'veh.sedan', 'veh.hatch_used', 'veh.coupe', 'veh.pickup', 'veh.van', 'veh.taxi', 'veh.police', 'veh.boxtruck'];
export const MAX_CARS = 72, MAX_PEDS = 90, MAX_GULLS = 30, MAX_CROWS = 12;
export const PED_VARIANTS = 4;

/** sites birds circle around: [x, z, radius, minAlt, maxAlt] */
const GULL_SITES = [[-880, 1138, 70, 14, 40], [-1040, 1134, 60, 12, 36], [-1115, 1415, 90, 20, 50], [-1650, 1146, 80, 14, 40], [-1300, 1250, 120, 18, 55], [-900, 1290, 100, 16, 46], [-790, -1070, 80, 14, 38], [-1000, -1000, 140, 18, 60]];
const CROW_SITES = [[1150, -1300, 45, 16, 34], [1190, -1340, 40, 14, 30], [-200, -1150, 60, 18, 38], [250, -800, 50, 16, 34]];

function rngFn(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

export function createAmbient({ seed = 0x1ef3 } = {}) {
  const R = rngFn(seed);
  const cfg = { traffic: 1, crowd: 1, enabled: true, spawnMin: 45, spawnMax: 230, despawn: 300, pedMin: 14, pedMax: 120, pedDespawn: 170 };
  // ---- road graph tables (built lazily from World.data.R) -------------------------------------------------------------------------------
  let edges = null, nodeEdges = null, carEdges = null, pedEdges = null, nodePhase = null;
  const nodeIndex = new Map();
  function init() {
    const D = World.data; if (!D || !D.R) return false;
    edges = D.R.edges; carEdges = []; pedEdges = [];
    nodeEdges = new Map();
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      e._i = i;
      if (e.drive && !e.walkOnly && e.speed > 0 && e.len > 14 && e.laneOffsets.length) carEdges.push(i);
      if (e.walkW > 0 && e.len > 10) pedEdges.push(i);
      for (const nid of [e.a, e.b]) { let l = nodeEdges.get(nid); if (!l) { l = []; nodeEdges.set(nid, l); } if (!l.includes(i)) l.push(i); }
    }
    // signalised nodes: three or more city-class drive edges
    const city = (e) => e.cls === 'street' || e.cls === 'boulevard' || e.cls === 'bridgest' || e.cls === 'harlan' || e.cls === 'local';
    for (const [nid, list] of nodeEdges) {
      let c = 0; for (const i of list) if (city(edges[i]) && edges[i].drive) c++;
      nodeIndex.set(nid, { sig: c >= 3, off: (hashStr(nid) % 1000) / 1000 * 24, list });
    }
    return true;
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // signal phase for a node and an approach axis (0 / 1): green during 10.5 s, all red 1.5 s, other axis 10.5 s, all red 1.5 s
  function green(nodeId, axis, t) {
    const n = nodeIndex.get(nodeId); if (!n || !n.sig) return true;
    const c = (t + n.off) % 24;
    return axis === 0 ? c < 10.5 : c >= 12 && c < 22.5;
  }
  // ---- geometry helper: point and tangent at arc length s on an edge ------------------------------------------------------------------------
  const P = { x: 0, y: 0, z: 0, dx: 0, dz: 1, slope: 0 };
  function pointAt(e, s) {
    const cum = e.s, p = e.pts; let a = 0, b = e.n - 1;
    if (s <= 0) s = 0; else if (s >= e.len) s = e.len;
    while (b - a > 1) { const m = (a + b) >> 1; if (cum[m] <= s) a = m; else b = m; }
    const L = cum[b] - cum[a] || 1, t = (s - cum[a]) / L;
    P.x = p[a * 3] + (p[b * 3] - p[a * 3]) * t; P.y = p[a * 3 + 1] + (p[b * 3 + 1] - p[a * 3 + 1]) * t; P.z = p[a * 3 + 2] + (p[b * 3 + 2] - p[a * 3 + 2]) * t;
    const dx = p[b * 3] - p[a * 3], dz = p[b * 3 + 2] - p[a * 3 + 2], l = Math.hypot(dx, dz) || 1;
    P.dx = dx / l; P.dz = dz / l; P.slope = (p[b * 3 + 1] - p[a * 3 + 1]) / L;
    return P;
  }
  // ---- cars -----------------------------------------------------------------------------------------------------------------------------------------
  const cars = {
    n: 0, active: new Uint8Array(MAX_CARS), edge: new Int32Array(MAX_CARS), dir: new Int8Array(MAX_CARS), s: new Float32Array(MAX_CARS), lat: new Float32Array(MAX_CARS), laneOff: new Float32Array(MAX_CARS),
    speed: new Float32Array(MAX_CARS), vmax: new Float32Array(MAX_CARS), kind: new Uint8Array(MAX_CARS), variant: new Uint8Array(MAX_CARS), len: new Float32Array(MAX_CARS),
    x: new Float32Array(MAX_CARS), y: new Float32Array(MAX_CARS), z: new Float32Array(MAX_CARS), yaw: new Float32Array(MAX_CARS), pitch: new Float32Array(MAX_CARS), spin: new Float32Array(MAX_CARS),
    wait: new Float32Array(MAX_CARS), target: 0,
  };
  const KIND_LEN = { 'veh.sedan': 4.6, 'veh.hatch_used': 4.0, 'veh.coupe': 4.4, 'veh.pickup': 5.3, 'veh.van': 5.4, 'veh.taxi': 4.6, 'veh.police': 4.6, 'veh.boxtruck': 7.2 };
  function pickKind(e) {
    const r = R();
    const rural = e.cls === 'rural' || e.cls === 'gravel' || e.cls === 'highway' || e.cls === 'loop' || e.cls === 'dirt' || e.cls === 'track';
    if (rural) return r < 0.4 ? 4 : r < 0.55 ? 5 : r < 0.7 ? 8 : r < 0.85 ? 0 : 2;
    return r < 0.3 ? 0 : r < 0.42 ? 1 : r < 0.52 ? 2 : r < 0.6 ? 3 : r < 0.7 ? 4 : r < 0.8 ? 5 : r < 0.9 ? 6 : r < 0.94 ? 7 : 8;
  }
  function placeCar(i, ei, dir, s) {
    const e = edges[ei]; cars.edge[i] = ei; cars.dir[i] = dir; cars.s[i] = s;
    const right = [], offs = e.laneOffsets;
    let pick = -1, cnt = 0;
    for (let k = 0; k < offs.length; k++) if ((dir > 0) === (offs[k] > 0)) { cnt++; if (R() * cnt < 1) pick = k; }
    if (pick < 0) pick = 0;
    void right;
    cars.laneOff[i] = offs[pick];
  }
  function spawnCar(i, cam) {
    if (!carEdges.length) return false;
    for (let tries = 0; tries < 14; tries++) {
      const ei = carEdges[(R() * carEdges.length) | 0], e = edges[ei];
      const s = R() * e.len; pointAt(e, s);
      const dx = P.x - cam.x, dz = P.z - cam.z, d = Math.hypot(dx, dz);
      if (d < cfg.spawnMin || d > cfg.spawnMax) continue;
      if (Math.abs(P.y - cam.y) > 60) continue;
      const dir = R() < 0.5 ? 1 : -1;
      if ((dir > 0 ? e.len - s : s) < Math.min(22, e.len * 0.4)) continue; // never spawn inside a junction approach
      placeCar(i, ei, dir, s);
      // not on top of another car in the same lane
      let clear = true;
      for (let j = 0; j < MAX_CARS; j++) if (j !== i && cars.active[j] && cars.edge[j] === ei && cars.dir[j] === dir && cars.laneOff[j] === cars.laneOff[i] && Math.abs(cars.s[j] - s) < 12) { clear = false; break; }
      if (!clear) continue;
      cars.kind[i] = pickKind(e); cars.variant[i] = (R() * 3) | 0; cars.len[i] = KIND_LEN[CAR_KINDS[cars.kind[i]]] || 4.6;
      cars.vmax[i] = e.speed * (0.7 + 0.25 * R()); cars.speed[i] = cars.vmax[i] * 0.8; cars.lat[i] = cars.laneOff[i]; cars.active[i] = 1; cars.wait[i] = 0;
      return true;
    }
    return false;
  }
  function nextEdge(i, nodeId, fromEdge) {
    const list = nodeEdges.get(nodeId); if (!list) return -1;
    const e0 = edges[fromEdge];
    // heading when arriving
    const dirIn = cars.dir[i]; pointAt(e0, dirIn > 0 ? e0.len - 1 : 1); const hx = P.dx * dirIn, hz = P.dz * dirIn;
    let best = -1, tot = 0; let sel = -1;
    for (let k = 0; k < list.length; k++) {
      const ei = list[k]; if (ei === fromEdge && list.length > 1) continue;
      const e = edges[ei]; if (!(e.drive && !e.walkOnly && e.speed > 0 && e.laneOffsets.length)) continue;
      const atA = e.a === nodeId; pointAt(e, atA ? 1 : e.len - 1); const ox = P.dx * (atA ? 1 : -1), oz = P.dz * (atA ? 1 : -1);
      const cosT = hx * ox + hz * oz;
      if (cosT < -0.7 && list.length > 2) continue; // no U-turns at junctions
      const w = cosT > 0.8 ? 3 : cosT > -0.2 ? 1.2 : 0.8; tot += w; if (R() * tot < w) sel = ei;
      best = ei;
    }
    return sel >= 0 ? sel : best;
  }
  function updateCars(dt, cam, t, density) {
    const target = Math.round(MAX_CARS * Math.min(1, density));
    cars.target = target;
    let spawnBudget = 2;
    for (let i = 0; i < MAX_CARS; i++) {
      if (i >= target) { cars.active[i] = 0; continue; }
      if (!cars.active[i]) { if (spawnBudget > 0) { spawnBudget--; spawnCar(i, cam); } continue; }
      const e = edges[cars.edge[i]], dir = cars.dir[i];
      pointAt(e, cars.s[i]);
      if (Math.hypot(P.x - cam.x, P.z - cam.z) > cfg.despawn) { cars.active[i] = 0; continue; }
      // ---- desired speed: limit, leader, signal
      let vd = cars.vmax[i];
      const toEnd = dir > 0 ? e.len - cars.s[i] : cars.s[i];
      // leader on the same edge / direction / lane
      let gapMin = 1e9;
      for (let j = 0; j < MAX_CARS; j++) {
        if (j === i || !cars.active[j] || cars.edge[j] !== cars.edge[i] || cars.dir[j] !== dir || cars.laneOff[j] !== cars.laneOff[i]) continue;
        const g = (cars.s[j] - cars.s[i]) * dir - (cars.len[i] + cars.len[j]) * 0.5;
        if (g > -1 && g < gapMin) gapMin = g;
      }
      if (gapMin < 1e8) { const vf = Math.max(0, (gapMin - 2.5) / 1.4); if (vf < vd) vd = vf; }
      // junction approach: slow to a turning speed, and stop 6 m before the node while the approach axis is red
      const nodeId = dir > 0 ? e.b : e.a;
      if (toEnd < 30) { const vt = 5.5 + toEnd * 0.5; if (vt < vd) vd = vt; }
      if (toEnd < 40) {
        const ni = nodeIndex.get(nodeId);
        if (ni && ni.sig) {
          pointAt(e, dir > 0 ? e.len - 1 : 1); const axis = Math.abs(P.dx) > Math.abs(P.dz) ? 0 : 1;
          // red: stop at the line if the car can still brake for it, otherwise it is committed and clears the junction
          if (!green(nodeId, axis, t) && toEnd > 0.5 && cars.speed[i] * cars.speed[i] / (2 * 4.5) <= toEnd - 1) { const room = Math.max(0, toEnd - 6); const vs = Math.sqrt(2 * 3.2 * room); if (vs < vd) vd = vs; }
        }
      }
      const acc = vd > cars.speed[i] ? 2.4 : 5.0;
      cars.speed[i] += Math.max(-acc * dt, Math.min(acc * dt, vd - cars.speed[i]));
      if (cars.speed[i] < 0.02) cars.speed[i] = 0;
      cars.s[i] += cars.speed[i] * dt * dir;
      cars.spin[i] += cars.speed[i] * dt / 0.33;
      // ---- node crossing
      if ((dir > 0 && cars.s[i] >= e.len) || (dir < 0 && cars.s[i] <= 0)) {
        const ne = nextEdge(i, nodeId, cars.edge[i]);
        if (ne < 0) { cars.active[i] = 0; continue; }
        // keep the world position: switch edge, re-derive lateral offset
        pointAt(e, dir > 0 ? e.len : 0); const wx = P.x - P.dz * cars.lat[i], wz = P.z + P.dx * cars.lat[i];
        const e2 = edges[ne], atA = e2.a === nodeId, ndir = atA ? 1 : -1;
        const old = cars.laneOff[i];
        placeCar(i, ne, ndir, atA ? 0.01 : e2.len - 0.01);
        pointAt(e2, cars.s[i]);
        // signed lateral offset of the carried world position in the new edge's frame (right of a->b is positive)
        cars.lat[i] = (wx - P.x) * (-P.dz) + (wz - P.z) * P.dx;
        void old;
        cars.vmax[i] = Math.min(cars.vmax[i] * 1.0, e2.speed * 0.92) || e2.speed * 0.8;
        if (cars.vmax[i] < e2.speed * 0.6) cars.vmax[i] = e2.speed * (0.7 + 0.25 * R());
      }
      // ---- pose
      const e3 = edges[cars.edge[i]];
      pointAt(e3, cars.s[i]);
      const dd = cars.dir[i];
      const lt = cars.lat[i], lo = cars.laneOff[i];
      cars.lat[i] = lt + Math.max(-3.5 * dt, Math.min(3.5 * dt, lo - lt));
      const nx = -P.dz, nz = P.dx; // right of the a->b direction
      const px = P.x + nx * cars.lat[i], pz = P.z + nz * cars.lat[i];
      const hx = P.dx * dd, hz = P.dz * dd;
      // smooth yaw toward the heading (shortest way)
      const yawT = Math.atan2(hx, -hz); let dy = yawT - cars.yaw[i]; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      cars.yaw[i] += cars.speed[i] > 0.05 ? dy * Math.min(1, dt * 6) : 0;
      cars.pitch[i] = Math.atan(P.slope * dd);
      cars.x[i] = px; cars.y[i] = P.y; cars.z[i] = pz;
    }
  }
  // ---- pedestrians -----------------------------------------------------------------------------------------------------------------------------------
  const peds = {
    n: 0, active: new Uint8Array(MAX_PEDS), edge: new Int32Array(MAX_PEDS), dir: new Int8Array(MAX_PEDS), s: new Float32Array(MAX_PEDS), side: new Int8Array(MAX_PEDS),
    speed: new Float32Array(MAX_PEDS), variant: new Uint8Array(MAX_PEDS), x: new Float32Array(MAX_PEDS), y: new Float32Array(MAX_PEDS), z: new Float32Array(MAX_PEDS),
    yaw: new Float32Array(MAX_PEDS), phase: new Float32Array(MAX_PEDS), idle: new Float32Array(MAX_PEDS), state: new Uint8Array(MAX_PEDS), // 0 walk, 1 idle
  };
  function pedOffset(e, side) { return side * (e.carriage / 2 + e.walkW / 2); }
  function spawnPed(i, cam) {
    if (!pedEdges.length) return false;
    for (let tries = 0; tries < 12; tries++) {
      const ei = pedEdges[(R() * pedEdges.length) | 0], e = edges[ei];
      const s = R() * e.len; pointAt(e, s);
      const d = Math.hypot(P.x - cam.x, P.z - cam.z);
      if (d < cfg.pedMin || d > cfg.pedMax) continue;
      if (Math.abs(P.y - cam.y) > 25) continue;
      peds.edge[i] = ei; peds.dir[i] = R() < 0.5 ? 1 : -1; peds.s[i] = s; peds.side[i] = R() < 0.5 ? 1 : -1;
      const off = pedOffset(e, peds.side[i]);
      peds.x[i] = P.x - P.dz * off; peds.z[i] = P.z + P.dx * off; peds.y[i] = P.y + 0.12;
      peds.speed[i] = 1.15 + R() * 0.55; peds.variant[i] = (R() * PED_VARIANTS) | 0; peds.state[i] = 0; peds.idle[i] = 0; peds.phase[i] = R() * 6.28; peds.active[i] = 1;
      peds.yaw[i] = Math.atan2(P.dx * peds.dir[i], -P.dz * peds.dir[i]);
      return true;
    }
    return false;
  }
  function updatePeds(dt, cam, density, player) {
    const target = Math.round(MAX_PEDS * Math.min(1, density));
    peds.n = target;
    let spawnBudget = 3;
    for (let i = 0; i < MAX_PEDS; i++) {
      if (i >= target) { peds.active[i] = 0; continue; }
      if (!peds.active[i]) { if (spawnBudget > 0) { spawnBudget--; spawnPed(i, cam); } continue; }
      if (Math.hypot(peds.x[i] - cam.x, peds.z[i] - cam.z) > cfg.pedDespawn) { peds.active[i] = 0; continue; }
      if (player && Math.hypot(peds.x[i] - player[0], peds.z[i] - player[2]) < 1.2) { peds.state[i] = 1; peds.idle[i] = 1.5; }
      const e = edges[peds.edge[i]];
      if (peds.state[i] === 1) { peds.idle[i] -= dt; peds.phase[i] += dt * 1.2; if (peds.idle[i] <= 0) peds.state[i] = 0; continue; }
      if (R() < dt * 0.01) { peds.state[i] = 1; peds.idle[i] = 2 + R() * 6; continue; }
      const dir = peds.dir[i];
      peds.s[i] += peds.speed[i] * dt * dir;
      if (peds.s[i] > e.len || peds.s[i] < 0) {
        const nodeId = dir > 0 ? e.b : e.a, list = nodeEdges.get(nodeId);
        let ne = -1, tot = 0;
        pointAt(e, dir > 0 ? e.len - 1 : 1); const hx = P.dx * dir, hz = P.dz * dir;
        // mostly keep walking straight along the same street (turning corners cuts across the junction)
        if (list) for (const k of list) {
          if (k === peds.edge[i] && list.length > 1) continue; const q = edges[k]; if (!(q.walkW > 0 && q.len > 8)) continue;
          const atA = q.a === nodeId; pointAt(q, atA ? 1 : q.len - 1); const cosT = hx * P.dx * (atA ? 1 : -1) + hz * P.dz * (atA ? 1 : -1);
          const w = cosT > 0.8 ? 8 : cosT > -0.2 ? 1 : 0.3; tot += w; if (R() * tot < w) ne = k;
        }
        if (ne < 0) { peds.dir[i] = -dir; peds.s[i] = Math.max(0, Math.min(e.len, peds.s[i])); continue; }
        const e2 = edges[ne], atA = e2.a === nodeId;
        peds.edge[i] = ne; peds.dir[i] = atA ? 1 : -1; peds.s[i] = atA ? 0.2 : e2.len - 0.2; if (R() < 0.35) peds.side[i] = -peds.side[i];
      }
      const e3 = edges[peds.edge[i]]; pointAt(e3, peds.s[i]);
      const off = pedOffset(e3, peds.side[i]);
      const tx = P.x - P.dz * off, tz = P.z + P.dx * off, k = Math.min(1, dt * 3.5);
      const ox = peds.x[i], oz = peds.z[i];
      peds.x[i] += (tx - ox) * k; peds.z[i] += (tz - oz) * k; peds.y[i] += (P.y + 0.12 - peds.y[i]) * Math.min(1, dt * 8);
      const mx = peds.x[i] - ox, mz = peds.z[i] - oz;
      if (mx * mx + mz * mz > 1e-8) { const yawT = Math.atan2(mx, -mz); let dy = yawT - peds.yaw[i]; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; peds.yaw[i] += dy * Math.min(1, dt * 8); }
      peds.phase[i] += peds.speed[i] * dt * 4.4;
    }
  }
  // ---- birds -----------------------------------------------------------------------------------------------------------------------------------------
  const birds = {
    gulls: { n: 0, site: new Uint8Array(MAX_GULLS), ang: new Float32Array(MAX_GULLS), rad: new Float32Array(MAX_GULLS), alt: new Float32Array(MAX_GULLS), w: new Float32Array(MAX_GULLS), phase: new Float32Array(MAX_GULLS), x: new Float32Array(MAX_GULLS), y: new Float32Array(MAX_GULLS), z: new Float32Array(MAX_GULLS), yaw: new Float32Array(MAX_GULLS), bank: new Float32Array(MAX_GULLS), flap: new Float32Array(MAX_GULLS) },
    crows: { n: 0, site: new Uint8Array(MAX_CROWS), ang: new Float32Array(MAX_CROWS), rad: new Float32Array(MAX_CROWS), alt: new Float32Array(MAX_CROWS), w: new Float32Array(MAX_CROWS), phase: new Float32Array(MAX_CROWS), x: new Float32Array(MAX_CROWS), y: new Float32Array(MAX_CROWS), z: new Float32Array(MAX_CROWS), yaw: new Float32Array(MAX_CROWS), bank: new Float32Array(MAX_CROWS), flap: new Float32Array(MAX_CROWS) },
  };
  function initBirds(set, sites, n) {
    set.n = n;
    for (let i = 0; i < n; i++) {
      const si = i % sites.length, S = sites[si];
      set.site[i] = si; set.ang[i] = R() * 6.28; set.rad[i] = S[2] * (0.45 + 0.7 * R()); set.alt[i] = S[3] + (S[4] - S[3]) * R();
      set.w[i] = (0.18 + 0.16 * R()) * (R() < 0.5 ? 1 : -1); set.phase[i] = R() * 6.28;
    }
  }
  function updateBirds(set, sites, dt, t, speedK) {
    for (let i = 0; i < set.n; i++) {
      const S = sites[set.site[i]];
      set.ang[i] += set.w[i] * dt * speedK;
      const a = set.ang[i], r = set.rad[i];
      const x = S[0] + Math.cos(a) * r, z = S[1] + Math.sin(a) * r;
      set.y[i] = set.alt[i] + Math.sin(t * 0.3 + set.phase[i]) * 3 + (World.heightAt ? Math.max(0, World.heightAt(S[0], S[1])) : 0);
      // tangent heading and bank into the turn
      const sg = set.w[i] > 0 ? 1 : -1;
      const hx = -Math.sin(a) * sg, hz = Math.cos(a) * sg;
      set.x[i] = x; set.z[i] = z; set.yaw[i] = Math.atan2(hx, -hz); set.bank[i] = -0.35 * sg;
      set.flap[i] = Math.sin(t * (5.5 + 1.5 * Math.sin(set.phase[i] * 3)) + set.phase[i]);
    }
  }
  const cam0 = { x: 0, y: 0, z: 0 };
  const api = {
    cars, peds, birds, CAR_KINDS, config: cfg, get ready() { return !!edges; },
    /** quality: {traffic, crowd} densities (Annex G crowdDensity / trafficDensity), enabled flag */
    configure(q) {
      if (q.traffic !== undefined) cfg.traffic = q.traffic;
      if (q.crowd !== undefined) cfg.crowd = q.crowd;
      if (q.enabled !== undefined) cfg.enabled = q.enabled;
      const g = Math.round(MAX_GULLS * Math.min(1, 0.3 + 0.7 * cfg.crowd)), c = Math.round(MAX_CROWS * Math.min(1, 0.3 + 0.7 * cfg.crowd));
      if (birds.gulls.n !== g) initBirds(birds.gulls, GULL_SITES, g);
      if (birds.crows.n !== c) initBirds(birds.crows, CROW_SITES, c);
    },
    /** dt real seconds, cam = {x,y,z}, hour 0..24, player = [x,y,z] or null, weather = {rain:0..1} */
    update(dt, cam, hour, player, time, rain = 0) {
      if (!cfg.enabled) { cars.n = 0; return; }
      if (!edges && !init()) return;
      if (!birds.gulls.n && !birds.crows.n) api.configure({});
      dt = Math.min(dt, 0.1);
      const h = ((hour % 24) + 24) % 24;
      // schedule: rush hours peak, nights nearly empty (Annex A 9.2 / 9.3 shape)
      const rush = Math.exp(-((h - 8) ** 2) / 3) + Math.exp(-((h - 17.5) ** 2) / 4) + 0.5 * Math.exp(-((h - 12.5) ** 2) / 3);
      const day = h >= 6 && h < 22 ? 1 : h >= 22 || h < 1 ? 0.5 : 0.25;
      const carK = Math.min(1.1, (0.3 + 0.5 * rush) * day + 0.25 * day), pedK = Math.min(1.1, (0.25 + 0.6 * rush) * day * (1 - 0.6 * rain));
      cam0.x = cam.x; cam0.y = cam.y; cam0.z = cam.z;
      updateCars(dt, cam0, time, cfg.traffic * carK * (48 / MAX_CARS));
      updatePeds(dt, cam0, cfg.crowd * pedK * (60 / MAX_PEDS), player);
      updateBirds(birds.gulls, GULL_SITES, dt, time, 1);
      updateBirds(birds.crows, CROW_SITES, dt, time, 1.3);
    },
    /** counts of live agents (tests, perf HUD) */
    stats() { let c = 0, p = 0; for (let i = 0; i < MAX_CARS; i++) c += cars.active[i]; for (let i = 0; i < MAX_PEDS; i++) p += peds.active[i]; return { cars: c, peds: p, gulls: birds.gulls.n, crows: birds.crows.n }; },
    /** helpers Stage 4 can reuse */
    pointAt, green,
  };
  return api;
}
