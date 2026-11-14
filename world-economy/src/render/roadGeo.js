// Road ribbons (Annex A 6.3): carriageway (asphalt / cobble / gravel / dirt), gutter darkening, 0.15 m kerbs, sidewalks
// (concrete, pavers in Old Town), painted markings (dashed centre, double yellow on rural roads, edge lines, lane dividers),
// zebra crossings and manholes at junctions, bridge deck bodies. Continuous UVs along the road (u = lateral m, v = distance).
import { World } from '../world/query.js';
import { LAYERS } from '../art/kit/layers.js';
import { tintBytes } from '../art/kit/geo.js';
import { districtAt } from '../world/layout/regions.js';

const SIDEWALKED = new Set(['street', 'boulevard', 'bridgest', 'local']);
const SURF_LAYER = { 'surf.asphalt': 'tex.asphalt', 'surf.cobble': 'tex.cobble', 'surf.gravel': 'tex.gravel', 'surf.dirt': 'tex.dirt_track', 'surf.concrete': 'tex.concrete_cast', 'surf.paver': 'tex.paver' };
const WHITE = 0xe8e6de, YELLOW = 0xe0b440;

/** emit a strip from lateral latA to latB between arc positions s0..s1 of segment (a -> b), continuous uv */
function strip(g, ax, ay, az, bx, by, bz, sA, sB, latA, latB, yOff, layer, tint = 0xffffff, m = 1, aoA = 1, aoB = 1) {
  const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
  if (l < 1e-4) return;
  const nx = -dz / l, nz = dx / l;
  const L = LAYERS[layer], t = 1 / L.tile;
  g.L = L.index; g.tile = L.tile; g.T = tintBytes(tint, m);
  g._grow(4, 6);
  const keep = g.ao; g.groundAO = false;
  g.ao = aoA; const v0 = g.vert(ax + nx * latA, ay + yOff, az + nz * latA, 0, 1, 0, latA * t, sA * t);
  g.ao = aoB; const v1 = g.vert(ax + nx * latB, ay + yOff, az + nz * latB, 0, 1, 0, latB * t, sA * t);
  const v2 = g.vert(bx + nx * latB, by + yOff, bz + nz * latB, 0, 1, 0, latB * t, sB * t);
  g.ao = aoA; const v3 = g.vert(bx + nx * latA, by + yOff, bz + nz * latA, 0, 1, 0, latA * t, sB * t);
  g.ao = keep; g.groundAO = true;
  if (latB > latA) { g.tri(v0, v1, v2); g.tri(v0, v2, v3); } else { g.tri(v0, v2, v1); g.tri(v0, v3, v2); }
}
/** vertical kerb face at lateral lat from y0 to y1 (facing the road centre when side = +1 means left) */
function kerbFace(g, ax, ay, az, bx, by, bz, sA, sB, lat, y0, y1, side) {
  const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
  if (l < 1e-4) return;
  const nx = -dz / l, nz = dx / l;
  const L = LAYERS['tex.curb_stone'];
  g.L = L.index; g.tile = L.tile; g.T = tintBytes(0xffffff, 1);
  const t = 1 / L.tile, fx = -side * nx, fz = -side * nz;
  g._grow(4, 6); g.groundAO = false;
  const p = (x, z) => [x + nx * lat, z + nz * lat];
  const A = p(ax, az), Bq = p(bx, bz);
  const v0 = g.vert(A[0], ay + y0, A[1], fx, 0, fz, sA * t, 0), v1 = g.vert(Bq[0], by + y0, Bq[1], fx, 0, fz, sB * t, 0);
  const v2 = g.vert(Bq[0], by + y1, Bq[1], fx, 0, fz, sB * t, (y1 - y0) * t), v3 = g.vert(A[0], ay + y1, A[1], fx, 0, fz, sA * t, (y1 - y0) * t);
  g.groundAO = true;
  if (side > 0) { g.tri(v0, v2, v1); g.tri(v0, v3, v2); } else { g.tri(v0, v1, v2); g.tri(v0, v2, v3); }
}

function trims(e, nodes) {
  const t = [0, 0], c = [0, 0];
  [e.a, e.b].forEach((id, k) => {
    const n = nodes.get(id);
    if (!n || n.edges.length < 3) return;
    let m = 0, mc = 0;
    for (const o of n.edges) if (o !== e && !o.walkOnly && o.cls !== 'path') { if (SIDEWALKED.has(o.cls)) m = Math.max(m, o.halfRow); mc = Math.max(mc, o.carriage / 2); }
    t[k] = m; c[k] = mc;
  });
  return { walk: t, carr: c };
}
const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** clip [s0,s1] to [lo,hi]; returns null or the clipped endpoints as fractions */
function clip(s0, s1, lo, hi) { const a = Math.max(s0, lo), b = Math.min(s1, hi); if (b - a < 0.05) return null; return [(a - s0) / (s1 - s0), (b - s0) / (s1 - s0), a, b]; }

export function addRoadPiece(g, piece, lod) {
  const D = World.data;
  const e = D.edgeById.get(piece.edgeId);
  const p = e.pts;
  const sw = SIDEWALKED.has(e.cls);
  const tr = trims(e, D.R.nodes);
  const surf = SURF_LAYER[e.surface] || 'tex.asphalt';
  const half = e.carriage / 2, paved = e.surface === 'surf.asphalt' || e.surface === 'surf.cobble';
  const oldTown = districtAt(p[0], p[2]) === 'city.oldtown';
  for (const i of piece.segs) {
    const ax = p[i * 3], ay = p[i * 3 + 1], az = p[i * 3 + 2], bx = p[i * 3 + 3], by = p[i * 3 + 4], bz = p[i * 3 + 5];
    const s0 = e.s[i], s1 = e.s[i + 1];
    const el = e.elevated[i] && e.elevated[i + 1];
    const lerp = (f) => [ax + (bx - ax) * f, ay + (by - ay) * f, az + (bz - az) * f];
    if (e.cls === 'path') {
      const wood = e.pathId && /bridge|pier|board/.test(e.pathId);
      strip(g, ax, ay, az, bx, by, bz, s0, s1, -1.1, 1.1, 0.07, wood ? 'tex.wood_planks' : 'tex.dirt_track', wood ? 0xffffff : 0xd8ccb0, 1);
      continue;
    }
    const yo = el ? 0.02 : 0.1;
    // carriageway trimmed at junctions (the junction pad draws the crossing)
    const cc = clip(s0, s1, tr.carr[0], e.len - tr.carr[1]);
    if (cc) {
      const A = lerp(cc[0]), B = lerp(cc[1]);
      if (paved && lod <= 1) {
        strip(g, A[0], A[1], A[2], B[0], B[1], B[2], cc[2], cc[3], -half + 0.5, half - 0.5, yo, surf);
        for (const sd of [-1, 1]) strip(g, A[0], A[1], A[2], B[0], B[1], B[2], cc[2], cc[3], sd * (half - 0.5), sd * half, yo, surf, 0xb8b0a4, 0.8, 1, 0.75);
      } else strip(g, A[0], A[1], A[2], B[0], B[1], B[2], cc[2], cc[3], -half, half, yo, surf);
      if (lod <= 1 && paved) markings(g, e, A, B, cc[2], cc[3], yo + 0.018);
      if (lod === 0 && e.surface === 'surf.asphalt' && sw && hash(i, e.len | 0) < 0.25) manhole(g, A, B, (hash(i, 7) - 0.5) * half);
    }
    if (el) {
      const dx = bx - ax, dz = bz - az, hl = Math.hypot(dx, dz), dy = by - ay;
      g.push().translate((ax + bx) / 2, (ay + by) / 2 - 0.75, (az + bz) / 2).rotY(Math.atan2(dx, -dz)).rotX(Math.atan2(dy, hl));
      g.mat('tex.concrete_cast', 0xc8c4bc); g.groundAO = false; g.box(0, 0, 0, e.row, 1.4, hl + 0.05, { skip: 'z+z-' });
      g.mat('tex.metal_painted', 0x4a6888); for (const sx of [-1, 1]) g.box(sx * (e.row / 2 - 1.2), -1.2, 0, 0.5, 1.0, hl + 0.05, { skip: 'z+z-' });
      g.groundAO = true; g.pop();
      if (lod <= 1) for (const side of [-1, 1]) strip(g, ax, ay, az, bx, by, bz, s0, s1, side * half, side * (e.row / 2 - 0.4), 0.16, 'tex.concrete_cast', 0xd0ccc4);
      continue;
    }
    if (lod > 1) continue;
    if (sw) {
      const cw = clip(s0, s1, tr.walk[0], e.len - tr.walk[1]);
      if (cw) {
        const A = lerp(cw[0]), B = lerp(cw[1]);
        const swL = oldTown ? 'tex.paver' : 'tex.concrete_cast';
        for (const side of [-1, 1]) {
          strip(g, A[0], A[1], A[2], B[0], B[1], B[2], cw[2], cw[3], side * (half + 0.25), side * e.halfRow, 0.25, swL, oldTown ? 0xc8b8a8 : 0xd8d4cc, 1, 0.9, 1);
          strip(g, A[0], A[1], A[2], B[0], B[1], B[2], cw[2], cw[3], side * half, side * (half + 0.25), 0.25, 'tex.curb_stone');
          kerbFace(g, A[0], A[1], A[2], B[0], B[1], B[2], cw[2], cw[3], side * half, 0.08, 0.25, side);
        }
      }
    }
    if (e.cls === 'boulevard') {
      strip(g, ax, ay, az, bx, by, bz, s0, s1, -2, 2, 0.3, 'tex.grass_ground', 0xc8d0b0);
      for (const sd of [-1, 1]) { strip(g, ax, ay, az, bx, by, bz, s0, s1, sd * 2.2, sd * 2, 0.3, 'tex.curb_stone'); kerbFace(g, ax, ay, az, bx, by, bz, s0, s1, sd * 2.2, 0.08, 0.3, -sd); }
    }
  }
}

function markings(g, e, A, B, sA, sB, y) {
  const half = e.carriage / 2;
  const dashes = (lat, w, col, dash, gap) => {
    const per = dash + gap;
    let s = Math.ceil(sA / per) * per;
    for (; s < sB; s += per) {
      const s2 = Math.min(sB, s + dash), f0 = (s - sA) / (sB - sA), f1 = (s2 - sA) / (sB - sA);
      const P = [A[0] + (B[0] - A[0]) * f0, A[1] + (B[1] - A[1]) * f0, A[2] + (B[2] - A[2]) * f0], Q = [A[0] + (B[0] - A[0]) * f1, A[1] + (B[1] - A[1]) * f1, A[2] + (B[2] - A[2]) * f1];
      strip(g, P[0], P[1], P[2], Q[0], Q[1], Q[2], s, s2, lat - w, lat + w, y, 'tex.flat', col, 1.15);
    }
  };
  const solid = (lat, w, col) => strip(g, A[0], A[1], A[2], B[0], B[1], B[2], sA, sB, lat - w, lat + w, y, 'tex.flat', col, 1.15);
  switch (e.cls) {
    case 'rural': solid(-0.12, 0.06, YELLOW); solid(0.12, 0.06, YELLOW); solid(-half + 0.35, 0.07, WHITE); solid(half - 0.35, 0.07, WHITE); break;
    case 'highway': case 'harlan': case 'bridgest': solid(-0.12, 0.06, YELLOW); solid(0.12, 0.06, YELLOW); dashes(-3.5, 0.07, WHITE, 3, 6); dashes(3.5, 0.07, WHITE, 3, 6); solid(-half + 0.3, 0.08, WHITE); solid(half - 0.3, 0.08, WHITE); break;
    case 'boulevard': for (const l of [-9, -5.5, 5.5, 9]) dashes(l, 0.07, WHITE, 3, 6); break;
    case 'street': case 'local': if (e.surface !== 'surf.cobble') dashes(0, 0.07, WHITE, 3, 6); break;
    default: break;
  }
}
function manhole(g, A, B, lat) {
  const dx = B[0] - A[0], dz = B[2] - A[2], l = Math.hypot(dx, dz) || 1;
  const x = (A[0] + B[0]) / 2 + (-dz / l) * lat, z = (A[2] + B[2]) / 2 + (dx / l) * lat, y = (A[1] + B[1]) / 2 + 0.112;
  g.mat('tex.metal_checker', 0x6a6a68); g.groundAO = false;
  const n = 10, b = g.vn; g._grow(n + 1, n * 3);
  const c = g.vert(x, y, z, 0, 1, 0, 0.5, 0.5);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.vert(x + Math.cos(a) * 0.35, y, z + Math.sin(a) * 0.35, 0, 1, 0, Math.cos(a) * 0.7 + 0.5, Math.sin(a) * 0.7 + 0.5); }
  for (let i = 0; i < n; i++) g.tri(c, b + 1 + ((i + 1) % n), b + 1 + i);
  g.groundAO = true;
}

/** junction pads: asphalt crossing square, sidewalk corner squares, zebra crossings on each sidewalked arm */
export function addIntersections(g, cx, cz, lod = 0) {
  const D = World.data;
  const x0 = -2000 + cx * 100, z0 = -2000 + cz * 100;
  for (const n of D.R.nodes.values()) {
    if (n.x < x0 || n.x >= x0 + 100 || n.z < z0 || n.z >= z0 + 100) continue;
    if (n.edges.length < 3) continue;
    let hw = 0, hc = 0, surf = 'tex.asphalt';
    for (const e of n.edges) { if (e.walkOnly || e.cls === 'path') continue; if (SIDEWALKED.has(e.cls)) hw = Math.max(hw, e.halfRow); hc = Math.max(hc, e.carriage / 2); if (e.surface === 'surf.cobble') surf = 'tex.cobble'; }
    if (!hc) continue;
    const y = n.y;
    // crossing pad (axis-aligned; city grid junctions are axis-aligned)
    strip(g, n.x, y, n.z - hc, n.x, y, n.z + hc, n.z - hc, n.z + hc, -hc, hc, 0.1, surf);
    if (!hw) continue;
    if (lod <= 1) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cxp = n.x + sx * (hc + hw) / 2, czp = n.z + sz * (hc + hw) / 2, s = (hw - hc) / 2;
      strip(g, cxp, y, czp - s, cxp, y, czp + s, czp - s, czp + s, -s, s, 0.25, 'tex.concrete_cast', 0xd8d4cc);
    }
    if (lod > 0) continue;
    for (const e of n.edges) {
      if (!SIDEWALKED.has(e.cls) || e.walkOnly) continue;
      const atA = e.a === n.id, p = e.pts, k = atA ? 0 : e.n - 1, k2 = atA ? 1 : e.n - 2;
      const dx = p[k2 * 3] - p[k * 3], dz = p[k2 * 3 + 2] - p[k * 3 + 2], l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
      const half = e.carriage / 2;
      for (let q = -half + 0.6; q < half - 0.3; q += 1.0) {
        const d0 = hc + 0.8, d1 = hc + 3.6;
        const px = n.x - uz * q, pz = n.z + ux * q;
        strip(g, px + ux * d0, y, pz + uz * d0, px + ux * d1, y, pz + uz * d1, d0, d1, -0.25, 0.25, 0.128, 'tex.flat', WHITE, 1.1);
      }
    }
  }
}
