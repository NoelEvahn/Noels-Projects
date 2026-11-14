// Blockout road ribbons (Annex A 6.3 simplified): carriageway, kerb-raised sidewalks, boulevard median, centre lines, bridge decks, intersections.
import { World } from '../world/query.js';
import { GeoBuilder } from '../blockout/geo.js';

const C = (hex) => GeoBuilder.rgb(hex, 1);
const SURF_COLOR = { 'surf.asphalt': C(0x3b3e41), 'surf.cobble': C(0x6e655c), 'surf.gravel': C(0x9a9078), 'surf.dirt': C(0x7b6448), 'surf.concrete': C(0x8a8a84), 'surf.paver': C(0x9a8f80) };
const WALK = C(0x9c9a92), MEDIAN = C(0x4d6e3c), LINE = C(0xcfcfc6), YELLOW = C(0xd6b84a), PATH = C(0x8b7f68), DECK = 0x8a8a84, PLATE = C(0x6a6c66);
const SIDEWALKED = new Set(['street', 'boulevard', 'bridgest', 'local']);

function strip(g, ax, ay, az, bx, by, bz, latA, latB, rgb, yOff, shade = 1) {
  const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
  if (l < 1e-4) return;
  const nx = -dz / l, nz = dx / l;
  g.quad([ax + nx * latA, ay + yOff, az + nz * latA], [ax + nx * latB, ay + yOff, az + nz * latB], [bx + nx * latB, by + yOff, bz + nz * latB], [bx + nx * latA, by + yOff, bz + nz * latA], rgb, shade);
}

/** trim distance of sidewalks near junctions (so they do not cross the crossing carriageway) */
function trims(e, nodes) {
  const t = [0, 0];
  [e.a, e.b].forEach((id, k) => {
    const n = nodes.get(id);
    if (!n || n.edges.length < 3) return;
    let m = 0;
    for (const o of n.edges) if (o !== e && SIDEWALKED.has(o.cls)) m = Math.max(m, o.halfRow);
    t[k] = m;
  });
  return t;
}

export function addRoadPiece(g, piece, lod) {
  const D = World.data;
  const e = D.edgeById.get(piece.edgeId);
  const p = e.pts;
  const sw = SIDEWALKED.has(e.cls);
  const trim = sw ? trims(e, D.R.nodes) : [0, 0];
  const surf = SURF_COLOR[e.surface] || SURF_COLOR['surf.asphalt'];
  for (const i of piece.segs) {
    const ax = p[i * 3], ay = p[i * 3 + 1], az = p[i * 3 + 2], bx = p[i * 3 + 3], by = p[i * 3 + 4], bz = p[i * 3 + 5];
    const el = e.elevated[i] && e.elevated[i + 1];
    if (e.cls === 'path') { strip(g, ax, ay, az, bx, by, bz, -1.1, 1.1, PATH, 0.07); continue; }
    const half = e.carriage / 2;
    const yo = el ? 0.02 : 0.1;
    strip(g, ax, ay, az, bx, by, bz, -half, half, surf, yo);
    if (el) {
      // deck body below the carriageway
      const dx = bx - ax, dz = bz - az, hl = Math.hypot(dx, dz), dy = by - ay;
      g.box((ax + bx) / 2, (ay + by) / 2 - 0.75, (az + bz) / 2, e.row, 1.4, hl, Math.atan2(dx, -dz), DECK, { pitch: Math.atan2(dy, hl), top: 1.0 });
      if (lod === 0) for (const side of [-1, 1]) strip(g, ax, ay, az, bx, by, bz, side * half, side * (e.row / 2 - 0.4), WALK, 0.16);
      continue;
    }
    if (lod > 0) continue;
    if (sw) {
      const s = (e.s[i] + e.s[i + 1]) / 2;
      if (s > trim[0] && s < e.len - trim[1]) for (const side of [-1, 1]) strip(g, ax, ay, az, bx, by, bz, side * half, side * e.halfRow, WALK, 0.24);
    }
    if (e.cls === 'boulevard') strip(g, ax, ay, az, bx, by, bz, -2, 2, MEDIAN, 0.2);
    else if (e.cls === 'rural' || e.cls === 'highway' || e.cls === 'harlan' || e.cls === 'bridgest') strip(g, ax, ay, az, bx, by, bz, -0.12, 0.12, YELLOW, 0.115);
    else if ((i & 1) === 0 && (e.cls === 'street' || e.cls === 'local' || e.cls === 'loop' || e.cls === 'gravel')) strip(g, ax, ay, az, bx, by, bz, -0.08, 0.08, LINE, 0.115);
    if (e.cls === 'highway' || e.cls === 'bridgest' || e.cls === 'harlan') for (const lat of [-3.5, 3.5]) if ((i & 1) === 0) strip(g, ax, ay, az, bx, by, bz, lat - 0.07, lat + 0.07, LINE, 0.115);
  }
}

/** intersection pads for junction nodes inside this chunk (concrete square so sidewalk corners read as paved) */
export function addIntersections(g, cx, cz) {
  const D = World.data;
  const x0 = -2000 + cx * 100, z0 = -2000 + cz * 100;
  for (const n of D.R.nodes.values()) {
    if (n.x < x0 || n.x >= x0 + 100 || n.z < z0 || n.z >= z0 + 100) continue;
    if (n.edges.length < 3) continue;
    let h = 0;
    for (const e of n.edges) if (SIDEWALKED.has(e.cls)) h = Math.max(h, e.halfRow);
    if (!h) continue;
    g.quad([n.x - h, n.y + 0.05, n.z - h], [n.x - h, n.y + 0.05, n.z + h], [n.x + h, n.y + 0.05, n.z + h], [n.x + h, n.y + 0.05, n.z - h], WALK, 0.95);
  }
}
void PLATE;
