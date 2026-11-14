// World API (MASTER_SPEC 5.5). Pure; Node-testable. All gameplay, render and tests go through this module.
import { buildWorld } from './builder.js';
import { regionAt, districtAt } from './layout/regions.js';
import { waterBodyAt, gerstnerHeight, gerstnerSlope, calmFactor, SEA_LEVEL, LAKE, PONDS, CREEKS } from './layout/water.js';
import { ARCHETYPES } from './archetypes.js';
import { SURF } from '../data/ids.js';
import { terrainPre } from './layout/terrain.js';

const NC = 40;
const clampC = (v) => (v < 0 ? 0 : v > NC - 1 ? NC - 1 : v);
const BOUNDS = Object.freeze({ minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 });

const W = { data: null, waterAmp: 1, dyn: new Map(), dynInteractables: new Map(), onPlacementsChanged: null, tmp: [] };
const scratch = [];
const pen = { nx: 0, nz: 0, pen: 0 };

function need() { if (!W.data) throw new Error('World.init() has not been called'); return W.data; }

export const World = {
  get bounds() { return BOUNDS; },
  get ready() { return !!W.data; },
  /** raw builder data (for renderer, tests and tools). */
  get data() { return need(); },
  set waterAmplitude(v) { W.waterAmp = v; },

  /** synchronous init (tests, tools). Returns the data. */
  init({ seed = 1 } = {}) {
    const g = buildWorld(seed);
    let r;
    do { r = g.next(); } while (!r.done);
    W.data = r.value;
    return W.data;
  },
  /** time-sliced init: returns a generator that yields stage names; call .next() until done. */
  *initSteps({ seed = 1 } = {}) {
    const g = buildWorld(seed);
    let r = g.next();
    while (!r.done) { yield r.value; r = g.next(); }
    W.data = r.value;
    yield 'ready';
  },

  heightAt(x, z) { return need().grid.heightAt(x, z); },

  groundAt(x, y, z) {
    const d = need();
    const h = d.grid.heightAt(x, z);
    let best = h, surface = null, platform, nrm = null;
    const list = d.colliders.near(x, z, 1, scratch);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (!c.walkable || c.dead) continue;
      const top = d.colliders.topAt(c, x, z);
      if (top !== top) continue;
      if (top <= y + 0.6 && top > best) {
        best = top; surface = c.surface || SURF.CONCRETE; platform = c.id;
        if (c.shape === 'deck') { const dx = c.bx - c.ax, dz = c.bz - c.az, l = Math.hypot(dx, dz) || 1; const s = (c.by - c.ay) / l; const nl = Math.hypot(s, 1); nrm = [-s * dx / l / nl, 1 / nl, -s * dz / l / nl]; } else nrm = [0, 1, 0];
      }
    }
    if (!surface) {
      surface = World.surfaceAt(x, z);
      const e = 1.0;
      const hx = d.grid.heightAt(x + e, z) - d.grid.heightAt(x - e, z), hz = d.grid.heightAt(x, z + e) - d.grid.heightAt(x, z - e);
      const nx = -hx / (2 * e), nz = -hz / (2 * e), l = Math.sqrt(nx * nx + 1 + nz * nz);
      nrm = [nx / l, 1 / l, nz / l];
    }
    const out = { y: best, surface, normal: nrm };
    if (platform !== undefined) out.platformId = platform;
    return out;
  },

  surfaceAt(x, z) {
    const d = need();
    const h = d.grid.heightAt(x, z);
    const wb = waterBodyAt(x, z);
    if (wb && wb.level - h > 0.05) return wb.level - h < 1.0 ? SURF.WATER_SHALLOW : SURF.WATER_SHALLOW;
    const r = d.roadIndex.nearest(x, z, 25, null);
    if (r && !r.edge.elevated[r.i]) {
      const e = r.edge;
      if (r.d <= e.carriage / 2) return e.surface || SURF.ASPHALT;
      if (r.d <= e.halfRow) return e.cls === 'street' || e.cls === 'boulevard' || e.cls === 'bridgest' ? (regionAt(x, z) === 'ocean' ? SURF.PAVER : SURF.CONCRETE) : e.surface;
    }
    const e = 2;
    const sx = d.grid.heightAt(x + e, z) - d.grid.heightAt(x - e, z), sz = d.grid.heightAt(x, z + e) - d.grid.heightAt(x, z - e);
    const slope = Math.hypot(sx, sz) / (2 * e);
    if (slope > 0.85) return SURF.ROCK;
    const reg = regionAt(x, z);
    if (h < 3.2 && (reg === 'ocean' || reg === 'city')) return SURF.SAND;
    if (reg === 'lake' && h < 41.5 && h > 39) return SURF.SAND;
    if (reg === 'forest' || (reg === 'lake' && z < -700)) return SURF.FORESTFLOOR;
    return SURF.GRASS;
  },

  waterAt(x, z, t = 0) {
    const d = need();
    const wb = waterBodyAt(x, z);
    if (!wb) return null;
    const ground = d.grid.heightAt(x, z);
    const depth = wb.level - ground;
    if (depth <= 0.02) return null;
    let height = wb.level, nx = 0, nz = 0;
    if (wb.body === 'ocean' || wb.body === 'river') {
      const f = (wb.body === 'river' ? 0 : 1) * calmFactor(x, z) * W.waterAmp;
      if (f > 0) { height += gerstnerHeight(x, z, t, f); const s = [0, 0]; gerstnerSlope(x, z, t, f, s); nx = -s[0]; nz = -s[1]; }
    }
    const l = Math.sqrt(nx * nx + 1 + nz * nz);
    return { body: wb.body === 'pond' ? 'pond' : wb.body, level: wb.level, height, depth, normal: [nx / l, 1 / l, nz / l] };
  },

  regionAt, districtAt,

  collidersNear(x, z, radius, out = []) { return need().colliders.near(x, z, radius, out); },

  raycast(origin, dir, maxDist, mask) {
    const d = need();
    const ox = origin[0], oy = origin[1], oz = origin[2];
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const dx = dir[0] / l, dy = dir[1] / l, dz = dir[2] / l;
    let best = null;
    if (!mask || mask.terrain !== false) {
      let tPrev = 0, hPrev = oy - d.grid.heightAt(ox, oz);
      for (let t = 2; t <= maxDist + 2; t += 2) {
        const tt = Math.min(t, maxDist);
        const hh = oy + dy * tt - d.grid.heightAt(ox + dx * tt, oz + dz * tt);
        if (hPrev > 0 && hh <= 0) {
          let a = tPrev, b = tt;
          for (let i = 0; i < 12; i++) { const m = (a + b) / 2; if (oy + dy * m - d.grid.heightAt(ox + dx * m, oz + dz * m) > 0) a = m; else b = m; }
          const p = [ox + dx * b, oy + dy * b, oz + dz * b];
          best = { dist: b, point: p, normal: World.groundAt(p[0], p[1] + 1, p[2]).normal, collider: null };
          break;
        }
        tPrev = tt; hPrev = hh;
        if (tt >= maxDist) break;
      }
    }
    if (!mask || mask.colliders !== false) {
      const seen = new Set();
      for (let t = 0; t <= maxDist; t += 16) {
        const list = d.colliders.near(ox + dx * t, oz + dz * t, 20, scratch);
        for (const c of list) {
          if (seen.has(c)) continue; seen.add(c);
          const hit = d.colliders.rayHit(c, ox, oy, oz, dx, dy, dz, best ? best.dist : maxDist);
          if (hit >= 0 && (!best || hit < best.dist)) best = { dist: hit, point: [ox + dx * hit, oy + dy * hit, oz + dz * hit], normal: [0, 1, 0], collider: c };
        }
      }
    }
    return best;
  },

  poi(id) { return need().poiById.get(id); },
  pois(q = {}) {
    const d = need();
    return d.pois.filter((p) => (!q.type || p.types.includes(q.type)) && (!q.region || p.region === q.region) && (!q.tag || p.tags.includes(q.tag)));
  },
  nearestPoi(x, z, type) {
    let best = null, bd = Infinity;
    for (const p of need().pois) {
      if (type && !p.types.includes(type)) continue;
      const dd = (p.pos[0] - x) ** 2 + (p.pos[2] - z) ** 2;
      if (dd < bd) { bd = dd; best = p; }
    }
    return best;
  },

  /** from/to: Vec3, {x,z} or a poi id. mode 'drive'|'walk'|'boat'. */
  route(from, to, { mode = 'drive' } = {}) {
    const d = need();
    const pt = (v) => {
      if (typeof v === 'string') { const p = d.poiById.get(v); if (!p) return null; return [p.pos[0], p.pos[2]]; }
      if (Array.isArray(v)) return [v[0], v[2] !== undefined ? v[2] : v[1]];
      return [v.x, v.z];
    };
    const a = pt(from), b = pt(to);
    if (!a || !b) return null;
    if (mode === 'boat') {
      const poi = (v) => (typeof v === 'string' ? d.poiById.get(v) : null);
      const wa = poi(from) && poi(from).data.dock ? [poi(from).data.dock.x, poi(from).data.dock.z] : a;
      const wb = poi(to) && poi(to).data.dock ? [poi(to).data.dock.x, poi(to).data.dock.z] : b;
      return d.boatNav.route(wa[0], wa[1], wb[0], wb[1], (x, z) => Math.max(0, SEA_LEVEL));
    }
    const r = d.nav.route(mode, a[0], a[1], b[0], b[1], (x, z) => d.grid.heightAt(x, z));
    return r ? { points: r.points, length: r.length, snapStart: r.snapStart, snapEnd: r.snapEnd, edges: r.edges } : null;
  },

  roadAt(x, z) {
    const d = need();
    let best = null, bd = 1e9;
    for (const s of d.roadIndex.near(x, z)) {
      const e = s.e;
      if (!e.drive || e.walkOnly) continue;
      const p = e.pts, i = s.i;
      const ax = p[i * 3], az = p[i * 3 + 2], bx = p[i * 3 + 3], bz = p[i * 3 + 5];
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
      let t = l2 > 0 ? ((x - ax) * dx + (z - az) * dz) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = ax + dx * t, qz = az + dz * t;
      const dist = Math.hypot(x - qx, z - qz);
      if (dist <= e.carriage / 2 + 0.01 && dist < bd) {
        bd = dist;
        const nx = -dz, nz = dx, side = ((x - qx) * nx + (z - qz) * nz) >= 0 ? 1 : -1; // left of travel is positive
        const off = side * dist;
        let lane = 0, ld = 1e9;
        for (let k = 0; k < e.laneOffsets.length; k++) { const q = Math.abs(e.laneOffsets[k] - off); if (q < ld) { ld = q; lane = k; } }
        best = { edgeId: e.id, lane, t: (e.s[i] + (e.s[i + 1] - e.s[i]) * t) / e.len, speedLimit: e.speed };
      }
    }
    return best;
  },

  chunkKey(x, z) { return `${clampC(Math.floor((x + 2000) / 100))},${clampC(Math.floor((z + 2000) / 100))}`; },
  chunkContents(cx, cz) {
    const d = need();
    const k = clampC(cz) * NC + clampC(cx);
    const placements = d.plByChunk[k].slice();
    for (const p of W.dyn.values()) if (World.chunkKey(p.x, p.z) === `${cx},${cz}`) placements.push(p);
    const roads = Array.from(d.roadsByChunk[k].values());
    const water = [];
    const x0 = -2000 + cx * 100, z0 = -2000 + cz * 100;
    const touches = (bx0, bx1, bz0, bz1) => bx1 >= x0 && bx0 <= x0 + 100 && bz1 >= z0 && bz0 <= z0 + 100;
    if (touches(LAKE.cx - LAKE.a * 1.1, LAKE.cx + LAKE.a * 1.1, LAKE.cz - LAKE.b * 1.1, LAKE.cz + LAKE.b * 1.1)) water.push({ id: 'water.lake', body: 'lake', level: LAKE.level });
    for (const id in PONDS) { const p = PONDS[id]; if (touches(p.cx - p.r, p.cx + p.r, p.cz - p.r, p.cz + p.r)) water.push({ id, body: 'pond', level: p.level }); }
    for (const id in CREEKS) { const c = CREEKS[id]; const xs = c.pts.map((q) => q[0]), zs = c.pts.map((q) => q[1]); if (touches(Math.min(...xs) - 5, Math.max(...xs) + 5, Math.min(...zs) - 5, Math.max(...zs) + 5)) water.push({ id, body: 'creek', level: 0, pts: c.pts, width: c.width }); }
    let sea = false;
    for (const [px, pz] of [[x0, z0], [x0 + 100, z0], [x0, z0 + 100], [x0 + 100, z0 + 100], [x0 + 50, z0 + 50]]) { const wb = waterBodyAt(px, pz); if (wb && (wb.body === 'ocean' || wb.body === 'river')) sea = true; }
    if (sea) water.push({ id: 'water.ocean', body: 'ocean', level: 0 });
    return { cx, cz, placements, roads, water, parts: d.partsByChunk[k], trees: { start: d.trees.chunkStart[k], end: d.trees.chunkStart[k + 1] } };
  },

  addPlacement(p) {
    need();
    W.dyn.set(p.id, p);
    const A = ARCHETYPES[p.archetype];
    if (A && A.colliders.length) for (const c of A.colliders) {
      const col = need().colliders.box(p.x + c.pos[0], p.y + c.pos[1], p.z + c.pos[2], (c.half || [c.radius, 0, c.radius])[0], (c.half || [0, c.height / 2, 0])[1], (c.half || [c.radius, 0, c.radius])[2], p.rotY || 0, { id: p.id, tag: 'dynamic' });
      (p._cols ||= []).push(col);
    }
    if (W.onPlacementsChanged) W.onPlacementsChanged([World.chunkKey(p.x, p.z)]);
  },
  removePlacement(id) {
    const p = W.dyn.get(id);
    if (!p) return;
    for (const c of p._cols || []) c.dead = true;
    W.dyn.delete(id);
    if (W.onPlacementsChanged) W.onPlacementsChanged([World.chunkKey(p.x, p.z)]);
  },
  set onPlacementsChanged(fn) { W.onPlacementsChanged = fn; },

  interactablesNear(x, y, z, radius) {
    const d = need();
    const out = [];
    for (const i of d.interactables) if ((i.pos[0] - x) ** 2 + (i.pos[2] - z) ** 2 <= radius * radius) out.push(i);
    for (const i of W.dynInteractables.values()) if ((i.pos[0] - x) ** 2 + (i.pos[2] - z) ** 2 <= (radius + (i.radius || 0)) ** 2) out.push(i);
    return out;
  },
  /** dynamic interactables (vehicles etc.) are owned by game/ */
  registerInteractable(i) { W.dynInteractables.set(i.id, i); },
  unregisterInteractable(id) { W.dynInteractables.delete(id); },

  terrainPre,
};
export default World;
