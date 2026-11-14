// Lots and building placement (Annex B 4-6, Annex A 6.2). Pure. Produces Placement[] with params {w,d,floors,h}.
import { ARCHETYPES } from '../archetypes.js';
import { AVE_X, ST_Z } from './roads.js';
import { districtAt } from './regions.js';
import { waterBodyAt } from './water.js';
import { yawOf, hash2Seeded } from './util.js';

const cosY = (y) => Math.cos(y), sinY = (y) => Math.sin(y);
export function obbCorners(cx, cz, w, d, yaw, out = []) {
  const c = cosY(yaw), s = sinY(yaw);
  const pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
  for (let i = 0; i < 4; i++) { const [lx, lz] = pts[i]; out[i] = [cx + lx * c - lz * s, cz + lx * s + lz * c]; }
  return out;
}
function obbOverlap(a, b, margin) {
  // SAT on 2D oriented boxes with inflation
  const axes = [[cosY(a.yaw), sinY(a.yaw)], [-sinY(a.yaw), cosY(a.yaw)], [cosY(b.yaw), sinY(b.yaw)], [-sinY(b.yaw), cosY(b.yaw)]];
  for (const [ax, az] of axes) {
    const ra = Math.abs(ax * cosY(a.yaw) + az * sinY(a.yaw)) * a.w / 2 + Math.abs(-ax * sinY(a.yaw) + az * cosY(a.yaw)) * a.d / 2;
    const rb = Math.abs(ax * cosY(b.yaw) + az * sinY(b.yaw)) * b.w / 2 + Math.abs(-ax * sinY(b.yaw) + az * cosY(b.yaw)) * b.d / 2;
    const dist = Math.abs((b.cx - a.cx) * ax + (b.cz - a.cz) * az);
    if (dist > ra + rb + margin) return false;
  }
  return true;
}

export function createPlacer({ ground, roadIndex, seed = 1 }) {
  const placements = [];
  const grid = new Map(); // 64 m cells -> rect refs
  const reserved = []; // {x0,x1,z0,z1} blocks generic placements
  const infraRects = []; // placed obstacles that are not buildings (obb {cx,cz,w,d,yaw})
  const CELL = 64;
  const key = (i, j) => i * 4099 + j;
  let counter = 0;
  const idOf = (cx, cz) => `c${String(Math.floor((cx + 2000) / 100)).padStart(2, '0')}_${String(Math.floor((cz + 2000) / 100)).padStart(2, '0')}.b${counter++}`;

  function cellsOf(r, fn) {
    const R = Math.hypot(r.w, r.d) / 2 + 2;
    for (let i = Math.floor((r.cx - R) / CELL); i <= Math.floor((r.cx + R) / CELL); i++)
      for (let j = Math.floor((r.cz - R) / CELL); j <= Math.floor((r.cz + R) / CELL); j++) fn(key(i, j));
  }
  function addRect(r) { cellsOf(r, (k) => { let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(r); }); }
  function overlapsExisting(r, margin) {
    let hit = false;
    cellsOf(r, (k) => { if (hit) return; const a = grid.get(k); if (a) for (const o of a) if (obbOverlap(r, o, margin)) { hit = true; return; } });
    if (hit) return true;
    for (const o of infraRects) if (obbOverlap(r, o, margin)) return true;
    return false;
  }
  function samplePoints(cx, cz, w, d, yaw) {
    const c = cosY(yaw), s = sinY(yaw);
    const pts = [];
    const nx = Math.max(1, Math.ceil(w / 6)), nz = Math.max(1, Math.ceil(d / 6));
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const lx = -w / 2 + (w * i) / nx, lz = -d / 2 + (d * j) / nz;
      pts.push([cx + lx * c - lz * s, cz + lx * s + lz * c]);
    }
    return pts;
  }

  /** Returns the placement or null. opts: generic (honours reserved), overWater, slopeMax, margin, tags */
  function tryPlace(archetype, cx, cz, w, d, yaw, params = {}, opts = {}) {
    const A = ARCHETYPES[archetype];
    const margin = opts.margin === undefined ? 1.0 : opts.margin;
    if (Math.abs(cx) > 1880 || Math.abs(cz) > 1880) return null;
    const rect = { cx, cz, w, d, yaw };
    if (overlapsExisting(rect, opts.gap === undefined ? 1.5 : opts.gap)) return null;
    if (opts.generic) for (const r of reserved) {
      const R = Math.hypot(w, d) / 2;
      if (cx + R > r.x0 && cx - R < r.x1 && cz + R > r.z0 && cz - R < r.z1) {
        // precise axis-aligned test against the oriented footprint corners and center
        const cs = obbCorners(cx, cz, w, d, yaw);
        let inside = false;
        for (const [px, pz] of cs.concat([[cx, cz]])) if (px > r.x0 && px < r.x1 && pz > r.z0 && pz < r.z1) inside = true;
        if (!inside && cx > r.x0 && cx < r.x1 && cz > r.z0 && cz < r.z1) inside = true;
        if (inside) return null;
      }
    }
    const pts = samplePoints(cx, cz, w, d, yaw);
    let lo = 1e9, hi = -1e9;
    for (const [px, pz] of pts) {
      if (roadIndex.clearance(px, pz, true) < margin) return null;
      const wb = waterBodyAt(px, pz);
      if (wb && !(opts.overWater || A.overWater)) return null;
      const h = ground(px, pz);
      if (h < lo) lo = h; if (h > hi) hi = h;
    }
    const slopeMax = opts.slopeMax === undefined ? 3.5 : opts.slopeMax;
    if (!(opts.overWater || A.overWater) && hi - lo > slopeMax) return null;
    const wb = waterBodyAt(cx, cz);
    let y = ground(cx, cz);
    if (opts.overWater || A.overWater) y = wb ? Math.max(y, wb.level + (A.id === 'bld.lighthouse' ? 2.3 : 0.4)) : Math.max(y, lo);
    else y = (lo + hi) / 2 > y ? Math.max(y, lo) : y; // keep the footprint above its lowest point
    const floors = params.floors || 1;
    const h = params.h || A.storey * floors;
    const p = {
      id: idOf(cx, cz), archetype, x: cx, y, z: cz, rotY: yaw, seed: (Math.floor(hash2Seeded(Math.round(cx), Math.round(cz), seed) * 1e9)) | 0,
      params: { ...params, w, d, floors, h }, tags: opts.tags || [],
    };
    placements.push(p);
    addRect(rect);
    return p;
  }

  /** place a building beside a point, facing the nearest road. */
  function autoPlace(x, z, archetype, w, d, floors, params = {}, opts = {}) {
    const road = roadIndex.nearest(x, z, 300);
    let tx = 0, tz = 1;
    if (road) { const dx = road.x - x, dz = road.z - z, l = Math.hypot(dx, dz); if (l > 0.5) { tx = dx / l; tz = dz / l; } }
    const radii = [Math.max(w, d) / 2 + 2, Math.max(w, d) / 2 + 6, Math.max(w, d) / 2 + 12, Math.max(w, d) / 2 + 20, Math.max(w, d) / 2 + 32];
    const angles = [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1, Math.PI];
    for (const rad of radii) for (const ang of angles) {
      // direction away from the road, rotated
      const ax = -tx, az = -tz;
      const c = Math.cos(ang), s = Math.sin(ang);
      const dx = ax * c - az * s, dz = ax * s + az * c;
      const cx = x + dx * rad, cz = z + dz * rad;
      // yaw faces the road from the candidate centre
      let fx = tx, fz = tz;
      const r2 = roadIndex.nearest(cx, cz, 300);
      if (r2) { const ex = r2.x - cx, ez = r2.z - cz, l = Math.hypot(ex, ez); if (l > 0.5) { fx = ex / l; fz = ez / l; } }
      const yaw = yawOf(fx, fz);
      const p = tryPlace(archetype, cx, cz, w, d, yaw, { floors, ...params }, opts);
      if (p) return p;
    }
    return null;
  }

  return { tryPlace, autoPlace, placements, reserved, infraRects, addRect, overlapsExisting };
}

// ---- city block fill -------------------------------------------------------------------------------------------------------
const STYLE = {
  'city.oldtown': { rows: 2, pool: [['bld.brick_loft', 0.55, 24, 38], ['bld.brick_walkup', 0.45, 20, 30]] },
  'city.downtown': { rows: 1, pool: [['bld.glass_tower', 0.34, 36, 46], ['bld.office_midrise', 0.32, 34, 46], ['bld.podium_mall', 0.14, 48, 64], ['bld.parking_deck', 0.2, 40, 56]] },
  'city.midtown': { rows: 2, pool: [['bld.panel_midrise', 0.35, 26, 40], ['bld.mixed_use', 0.4, 22, 36], ['bld.office_midrise', 0.25, 30, 42]] },
  'city.market': { rows: 2, pool: [['bld.mixed_use', 0.5, 24, 38], ['bld.parking_deck', 0.2, 40, 56], ['bld.panel_midrise', 0.3, 26, 40]] },
  'city.industrial': { rows: 2, pool: [['bld.warehouse', 0.6, 40, 70], ['bld.factory', 0.4, 40, 60]] },
  'city.docks': { rows: 2, pool: [['bld.warehouse', 0.5, 36, 60], ['bld.harbor_shed', 0.2, 16, 24], ['bld.garage_workshop', 0.3, 28, 40]] },
  'city.eastside': { rows: 2, pool: [['bld.house_suburban', 0.9, 13, 18], ['bld.panel_midrise', 0.1, 28, 36]] },
  'city.northgate': { rows: 2, pool: [['bld.apartment_block', 0.4, 36, 54], ['bld.brick_walkup', 0.6, 22, 32]] },
};
const FLOOR_BIAS = { 'bld.glass_tower': [18, 45], 'bld.office_midrise': [6, 12], 'bld.brick_loft': [4, 7] };

export function fillCityBlocks(placer, rng) {
  const halfOf = (v, arr) => (v === 400 || v === 450 ? 17.5 : 10);
  for (let i = 0; i < 9; i++) for (let j = 0; j < 12; j++) {
    const x0 = AVE_X[i] + halfOf(AVE_X[i]) + 1, x1 = AVE_X[i + 1] - halfOf(AVE_X[i + 1]) - 1;
    const z0 = ST_Z[j] + halfOf(ST_Z[j]) + 1, z1 = ST_Z[j + 1] - halfOf(ST_Z[j + 1]) - 1;
    if (i === 6 && (j === 5 || j === 6)) { placer.reserved.push({ x0: AVE_X[6], x1: AVE_X[7], z0: ST_Z[j], z1: ST_Z[j + 1] }); continue; } // Founders Park
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const dist = districtAt(cx, cz);
    const style = STYLE[dist] || STYLE['city.midtown'];
    // sub-rectangles (viaduct and Bridge St split blocks in row 5)
    let rects = [[x0, x1, z0, z1]];
    if (j === 5 && i <= 1) rects = [[x0, x1, z0, 289 - 1], [x0, x1, 311 + 1, z1]];
    if (j === 5 && (i === 2 || i === 3)) rects = [[x0, x1, z0, 289 - 1], [x0, x1, 311 + 1, z1]];
    for (const [rx0, rx1, rz0, rz1] of rects) {
      const w = rx1 - rx0, d = rz1 - rz0;
      if (d < 18 || w < 18) continue;
      const rows = d >= 64 && style.rows !== 1 ? 2 : 1;
      const rowDepth = rows === 2 ? Math.min(34, (d - 5) / 2) : Math.min(46, d - 2);
      for (let r = 0; r < rows; r++) {
        let rz0r, yaw;
        if (rows === 2) { rz0r = r === 0 ? rz0 : rz1 - rowDepth; yaw = r === 0 ? 0 : Math.PI; }
        else { rz0r = rz0 + (d - rowDepth) / 2; yaw = (ST_Z[j] + ST_Z[j + 1]) / 2 > 300 ? Math.PI : 0; if (rng.chance(0.5)) yaw = yaw === 0 ? Math.PI : 0; }
        let cursor = rx0;
        let guard = 0;
        while (cursor < rx1 - 14 && guard++ < 30) {
          // pick archetype
          let u = rng.float(), pick = style.pool[0];
          for (const e of style.pool) { if (u < e[1]) { pick = e; break; } u -= e[1]; }
          const [arch, , wmin, wmax] = pick;
          let bw = rng.range(wmin, wmax);
          const remaining = rx1 - cursor;
          if (remaining - bw < wmin * 0.7) bw = remaining;
          bw = Math.min(bw, remaining);
          if (bw < 12) break;
          const A = ARCHETYPES[arch];
          let bd = Math.min(rowDepth, arch === 'bld.house_suburban' ? 14 : arch === 'bld.glass_tower' ? 44 : arch === 'bld.parking_deck' ? 34 : rowDepth);
          if (arch === 'bld.house_suburban') bd = Math.min(bd, rowDepth);
          const fr = FLOOR_BIAS[arch] || A.floors;
          const floors = A.floors[0] === A.floors[1] ? A.floors[0] : Math.round(rng.range(fr[0], fr[1] + 0.49 - (arch === 'bld.glass_tower' ? 0 : 0)));
          // keep the front on the lot edge
          const frontOffset = (rowDepth - bd) / 2;
          let ccz = rz0r + rowDepth / 2;
          if (rows === 2) ccz += (yaw === 0 ? -frontOffset : frontOffset);
          const p = placer.tryPlace(arch, cursor + bw / 2, ccz, bw, bd, yaw, { floors, h: A.storey * floors * (arch === 'bld.glass_tower' ? 1 : 1) }, { generic: true, gap: 1.0, tags: [dist] });
          cursor += bw + (p ? 2.5 : 6);
        }
      }
    }
  }
}
