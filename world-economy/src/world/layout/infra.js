// Infrastructure geometry (Annex A 6.2): bridges, towers, piers, docks, quays, breakwater, portal. Pure.
// Everything is expressed as `parts` (boxes/cylinders in world space) so colliders and blockout meshes derive from the same data.
import { yawOf } from '../../core/math.js';
import { waterBodyAt } from './water.js';

const PI = Math.PI;
const COL = { steel: 0x3b5a82, concrete: 0x8c8c86, dark: 0x2a2d31, wood: 0x6b5238, woodDark: 0x4a3a2c, rail: 0x5a5f66, stone: 0x6d6f6c, black: 0x111214, cable: 0x9aa0a8 };

/** part: {s:'box'|'cyl', x,y,z centre, sx,sy,sz full size (cyl: sx=sz=diameter), yaw, pitch, color, solid, walk, deck:{ax,ay,az,bx,by,bz,hw,thick}} */
const box = (x, y, z, sx, sy, sz, yaw, color, flags = {}) => ({ s: 'box', x, y, z, sx, sy, sz, yaw: yaw || 0, pitch: 0, color, solid: !!flags.solid, walk: !!flags.walk });
const cyl = (x, y, z, dia, h, color, flags = {}) => ({ s: 'cyl', x, y, z, sx: dia, sy: h, sz: dia, yaw: 0, pitch: 0, color, solid: flags.solid !== false, walk: false });
function beam(a, b, t, color, flags = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const hl = Math.hypot(dx, dz), L = Math.hypot(hl, dy);
  const p = box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, t, t, L, yawOf(dx, dz), color, flags);
  p.pitch = Math.atan2(dy, hl);
  return p;
}
/** sloped walkable slab from a to b (x,y,z), width w, thickness th. */
function deckSlab(a, b, w, th, color, walk = true) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const hl = Math.hypot(dx, dz), L = Math.hypot(hl, dy);
  const p = box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - th / 2, (a[2] + b[2]) / 2, w, th, L, yawOf(dx, dz), color, { solid: false });
  p.pitch = Math.atan2(dy, hl);
  if (walk) p.deck = { ax: a[0], ay: a[1], az: a[2], bx: b[0], by: b[1], bz: b[2], hw: w / 2, thick: th };
  return p;
}

export function buildInfra({ edges, nodes, roadIndex, heightAt }) {
  const groups = [];
  const add = (id, archetype, parts, tags = []) => { groups.push({ id, archetype, parts, tags }); };

  // ---- road bridges: deck colliders, parapets, piers ---------------------------------------------------------------
  for (const e of edges) {
    if (!e.spans.length) continue;
    const parts = [];
    const p = e.pts;
    const arch = e.roadId === 'r.bridge' ? 'infra.bridge_suspension' : e.roadId === 'r.causeway' ? 'infra.bridge_girder' : 'infra.bridge_small';
    for (const [i0, i1] of e.spans) {
      let lastPier = -1e9;
      for (let i = i0; i < i1; i++) {
        const ax = p[i * 3], ay = p[i * 3 + 1], az = p[i * 3 + 2], bx = p[i * 3 + 3], by = p[i * 3 + 4], bz = p[i * 3 + 5];
        const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
        if (l < 1e-3) continue;
        const nx = -dz / l, nz = dx / l; // left normal
        const yaw = yawOf(dx, dz);
        const w = e.row;
        // walkable + drivable deck collider (visual deck is drawn by the road ribbon)
        const d = deckSlab([ax, ay, az], [bx, by, bz], w, 1.4, COL.concrete);
        d.invisible = true; // road ribbon draws the deck surface and underside
        parts.push(d);
        for (const side of [-1, 1]) {
          const lat = side * (w / 2 - 0.35);
          parts.push(box((ax + bx) / 2 + nx * lat, (ay + by) / 2 + 0.55, (az + bz) / 2 + nz * lat, 0.4, 1.1, l * 1.02, yaw, COL.rail, { solid: true }));
        }
        // piers every ~30 m over land / shallows
        const sMid = (e.s[i] + e.s[i + 1]) / 2;
        const gx = (ax + bx) / 2, gz = (az + bz) / 2, gy = heightAt(gx, gz);
        if (sMid - lastPier >= 30 && gy > -0.3 && (by + ay) / 2 - gy > 3) {
          const near = roadIndex.nearest(gx, gz, 40, (o) => o !== e && !o.elevated.every((v) => v));
          const ok = !near || near.d - near.edge.halfRow > 3;
          if (ok) {
            lastPier = sMid;
            const top = (ay + by) / 2 - 1.4;
            parts.push(box(gx, (gy - 1 + top) / 2, gz, 4, top - gy + 1, 3, yaw, COL.concrete, { solid: true }));
          }
        } else if (e.roadId === 'r.causeway' && gy <= -0.3 && sMid - lastPier >= 40) {
          lastPier = sMid;
          const top = (ay + by) / 2 - 1.4;
          parts.push(box(gx, (gy - 1 + top) / 2, gz, 4, top - gy + 1, 3, yaw, COL.concrete, { solid: true }));
        }
      }
    }
    add(`infra.${e.id}`, arch, parts, ['bridge']);
  }

  // ---- Harlan Bridge towers and cables -------------------------------------------------------------------------------
  {
    const parts = [];
    const deckY = 26, topY = 72;
    const towerXs = [-250, -450];
    for (const tx of towerXs) {
      const g = heightAt(tx, 300);
      for (const side of [-1, 1]) {
        const z = 300 + side * 13.5;
        parts.push(box(tx, (g - 2 + topY) / 2, z, 3.2, topY - g + 2, 3.2, 0, COL.steel, { solid: true }));
      }
      for (const by of [38, 54, 68]) parts.push(box(tx, by, 300, 2, 1.8, 27, 0, COL.steel, { solid: true }));
      // X bracing between beam levels
      const lv = [deckY + 2, 38, 54, 68];
      for (let k = 0; k < lv.length - 1; k++) {
        parts.push(beam([tx, lv[k], 300 - 13.5], [tx, lv[k + 1], 300 + 13.5], 0.9, COL.steel));
        parts.push(beam([tx, lv[k], 300 + 13.5], [tx, lv[k + 1], 300 - 13.5], 0.9, COL.steel));
      }
    }
    // main cables: parabolic main span, straight side spans
    for (const side of [-1, 1]) {
      const z = 300 + side * 13.5;
      const pts = [];
      for (let k = 0; k <= 16; k++) { const t = k / 16; const x = -250 + (-450 + 250) * t; const y = topY - (topY - 40) * (1 - Math.pow(2 * t - 1, 2)); pts.push([x, y, z]); }
      for (let k = 0; k < pts.length - 1; k++) parts.push(beam(pts[k], pts[k + 1], 0.55, COL.cable));
      parts.push(beam([-250, topY, z], [-120, 31, z], 0.55, COL.cable));
      parts.push(beam([-450, topY, z], [-585, 32, z], 0.55, COL.cable));
      for (let k = 1; k < 16; k += 2) { const q = pts[k]; parts.push(beam([q[0], q[1], z], [q[0], deckY + 1, z * 0.0 + 300 + side * 11.2], 0.2, COL.cable)); }
    }
    add('infra.harlan.towers', 'infra.bridge_suspension', parts, ['landmark']);
  }

  // ---- footbridge over Central Ave --------------------------------------------------------------------------------------
  {
    const parts = [];
    const g = heightAt(400, 200), dy = g + 6.2;
    parts.push(deckSlab([383, dy, 200], [417, dy, 200], 3.6, 0.5, COL.steel));
    parts.push(deckSlab([361, g + 0.05, 200], [383, dy, 200], 3.6, 0.5, COL.steel));
    parts.push(deckSlab([439, g + 0.05, 200], [417, dy, 200], 3.6, 0.5, COL.steel));
    for (const side of [-1, 1]) {
      parts.push(box(400, dy + 0.55, 200 + side * 1.9, 34, 1.1, 0.15, 0, COL.rail, { solid: true }));
      parts.push(box(372, (g + dy) / 2 + 0.55, 200 + side * 1.9, 22.5, 1.1, 0.15, 0, COL.rail));
      parts.push(box(428, (g + dy) / 2 + 0.55, 200 + side * 1.9, 22.5, 1.1, 0.15, 0, COL.rail));
    }
    parts.push(box(381.5, (g + dy) / 2 - 0.2, 200, 1.2, dy - g - 0.4, 1.2, 0, COL.steel, { solid: true }));
    parts.push(box(418.5, (g + dy) / 2 - 0.2, 200, 1.2, dy - g - 0.4, 1.2, 0, COL.steel, { solid: true }));
    add('infra.footbridge.central', 'infra.footbridge_steel', parts, ['footbridge']);
  }

  // ---- generic pier builder -------------------------------------------------------------------------------------------------
  function pier(id, archetype, sx, sz, dx, dz, length, w, y, opts = {}) {
    const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    // march from the start until water is found, then start 4 m before it
    let t0 = 0;
    if (!opts.fromStart) {
      let found = -1;
      for (let t = 0; t < 120; t += 1) if (waterBodyAt(sx + dx * t, sz + dz * t)) { found = t; break; }
      t0 = found < 0 ? 0 : Math.max(0, found - 4);
    }
    const x0 = sx + dx * t0, z0 = sz + dz * t0, x1 = x0 + dx * length, z1 = z0 + dz * length;
    const parts = [];
    const yaw = yawOf(dx, dz);
    const d = box((x0 + x1) / 2, y - 0.15, (z0 + z1) / 2, w, 0.3, length, yaw, opts.color || COL.wood, { solid: true, walk: true });
    parts.push(d);
    const nx = -dz, nz = dx;
    for (let t = 1; t < length; t += 5) for (const side of [-1, 1]) {
      const px = x0 + dx * t + nx * side * (w / 2 - 0.2), pz = z0 + dz * t + nz * side * (w / 2 - 0.2);
      parts.push(cyl(px, (y - 0.3 + Math.min(heightAt(px, pz), y - 4)) / 2, pz, 0.35, y - 0.3 - Math.min(heightAt(px, pz), y - 4), COL.woodDark));
    }
    if (opts.kiosk) parts.push(box(x0 + dx * 6, y + 1.4, z0 + dz * 6, 3, 2.8, 3, yaw, 0x8a6a48, { solid: true }));
    add(id, archetype, parts, ['pier']);
    return { x0, z0, x1, z1, y };
  }
  const piers = {};
  const P = (key, ...a) => { piers[key] = pier(...a); };
  // lake piers (deck 0.3 above the 40 m water level)
  P('lake.village', 'infra.pier.lake.village', 'infra.pier_timber', -740, -1070, -1, 0, 58, 3.5, 40.35);
  P('lake.boathire', 'infra.pier.lake.boathire', 'infra.pier_timber', -738, -1038, -1, 0, 46, 3.2, 40.35, { kiosk: true });
  P('lake.campground', 'infra.pier.lake.camp', 'infra.pier_timber', -1200, -1460, 0, 1, 52, 3, 40.35);
  // ocean piers and docks
  P('ocean.berth1', 'infra.pier.ocean.berth1', 'infra.pier_timber', -940, 1132, 0, 1, 46, 3.2, 2.4);
  P('ocean.berth2', 'infra.pier.ocean.berth2', 'infra.pier_timber', -880, 1132, 0, 1, 46, 3.2, 2.4);
  P('ocean.berth3', 'infra.pier.ocean.berth3', 'infra.pier_timber', -820, 1132, 0, 1, 46, 3.2, 2.4);
  P('ocean.fuel', 'infra.pier.ocean.fuel', 'infra.pier_timber', -980, 1132, 0, 1, 40, 3, 2.4);
  P('ocean.ferry', 'infra.pier.ocean.ferry', 'infra.pier_timber', -1160, 1105, 0, 1, 52, 3.4, 2.0);
  P('marina.main', 'infra.pier.marina.main', 'infra.dock_floating', -1240, 1104, 0, 1, 62, 3.4, 2.0);
  for (let k = 0; k < 4; k++) {
    const m = piers['marina.main'];
    for (const side of [-1, 1]) {
      const fz = m.z0 + 14 + k * 12;
      pier(`infra.pier.marina.f${k}${side < 0 ? 'w' : 'e'}`, 'infra.dock_floating', -1240 + side * 1.7, fz, side, 0, 18, 2.2, 2.0, { fromStart: true, color: 0xb8b0a0 });
    }
  }
  P('ocean.palmcove', 'infra.pier.ocean.palmcove', 'infra.pier_timber', -1560, 1100, 0, 1, 96, 3.2, 2.0);
  // city quay slip and riverside dock: ramp from the bank down to a floating deck
  {
    const parts = [];
    parts.push(deckSlab([330, 2.5, 1100], [330, 0.5, 1108], 5, 0.4, COL.concrete));
    parts.push(box(330, 0.35, 1120, 5, 0.3, 24, 0, 0xb8b0a0, { solid: true, walk: true }));
    add('infra.dock.city.quay', 'infra.dock_floating', parts, ['dock']);
  }
  {
    const parts = [];
    const bankY = heightAt(-252, 600);
    parts.push(deckSlab([-252, bankY, 600], [-270, 0.55, 600], 3.6, 0.4, COL.wood));
    parts.push(box(-287, 0.4, 600, 33, 0.3, 4, PI / 2, COL.wood, { solid: true, walk: true }));
    add('infra.dock.city.river', 'infra.dock_floating', parts, ['dock']);
  }
  {
    const parts = [];
    parts.push(box(-1750, 0.45, 1692, 6, 0.3, 3.5, 0, COL.wood, { solid: true, walk: true }));
    add('infra.dock.gullrock', 'infra.dock_floating', parts, ['dock']);
  }

  // ---- quay walls ------------------------------------------------------------------------------------------------------------------
  function longWall(id, archetype, x0, z0, x1, z1, top, bottom, thick, color) {
    const parts = [];
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 50);
    const yaw = yawOf(x1 - x0, z1 - z0);
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n;
      parts.push(box(x0 + (x1 - x0) * (a + b) / 2, (top + bottom) / 2, z0 + (z1 - z0) * (a + b) / 2, thick, top - bottom, L / n + 0.1, yaw, color, { solid: true }));
    }
    add(id, archetype, parts, ['wall']);
  }
  longWall('infra.quay.city', 'infra.quay_wall', -240, 1101.2, 1090, 1101.2, 2.5, -8, 2, COL.concrete);
  longWall('infra.quay.port', 'infra.quay_wall', -1118, 1141.2, -702, 1141.2, 2.5, -8, 2, COL.concrete);
  // breakwater arms (walkable top 2.3 m, 6 m wide)
  function breakwater(id, pts) {
    const parts = [];
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
      const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 40), yaw = yawOf(bx - ax, bz - az);
      for (let i = 0; i < n; i++) {
        const a = i / n, b = (i + 1) / n;
        parts.push(box(ax + (bx - ax) * (a + b) / 2, (2.3 - 16) / 2, az + (bz - az) * (a + b) / 2, 6, 18.3, L / n + 0.2, yaw, COL.stone, { solid: true, walk: true }));
      }
    }
    add(id, 'infra.breakwater', parts, ['breakwater']);
  }
  breakwater('infra.breakwater.west', [[-1120, 1145], [-1120, 1420], [-960, 1405]]);
  breakwater('infra.breakwater.east', [[-690, 1145], [-690, 1380], [-840, 1405]]);

  // ---- weir, tunnel portal, wooden footbridge -----------------------------------------------------------------------------------
  add('infra.weir.mirror', 'infra.weir', [box(-860, 40.4, -830, 12, 1.6, 1.4, PI / 4, COL.concrete, { solid: false })], ['weir']);
  {
    const n = nodes.get('n.east.tunnel');
    const ny = n.y, gx = n.x;
    const parts = [];
    for (const side of [-1, 1]) parts.push(box(gx + 3, ny + 5, 350 + side * 11.5, 6, 10.5, 4, 0, COL.concrete, { solid: true }));
    parts.push(box(gx + 3, ny + 9.5, 350, 6, 2, 27, 0, COL.concrete, { solid: true }));
    parts.push(box(gx + 5.2, ny + 3.5, 350, 2, 7, 19, 0, COL.black, { solid: true }));
    parts.push(box(gx + 9, ny + 8, 350, 4, 18, 64, 0, COL.stone, { solid: true }));
    add('infra.tunnel.east', 'infra.tunnel_portal', parts, ['portal']);
  }
  {
    const g = Math.max(heightAt(-1722, -1158), heightAt(-1722, -1142));
    add('infra.footbridge.inlet', 'infra.footbridge_wood', [box(-1722, g + 0.3 - 0.15, -1150, 3, 0.3, 16, 0, COL.wood, { solid: true, walk: true })], ['footbridge']);
  }
  return { groups, piers };
}
