// Detail Batch 2/3 placements (docs/DETAIL_CATALOG.md), pure and seeded, visual only. Called by decor.js after the Batch 1 scatter:
//   * adds prop items (merged into chunk batches by the chunk manager, no extra draw calls): bike racks, poster columns, graffiti walls, steam vents,
//     firewood stacks, split-rail fences, laundry lines, string lights, crate / barrel / pallet stacks at harbour and yard fronts, tyre fenders and
//     rope bollards along quays and piers, stump / log variety along forest roads and at the logging yard;
//   * returns flat lists drawn by render/detail2.js and render/effects.js: wire spans between utility poles, perched birds (wires, bridge rails,
//     bollards), swimming duck / swan groups, fish shadows, ripple rings (piles), boat hull collars, steam vents, chimney tops.
import { hash2 } from '../../core/rng.js';
import { regionAt, districtAt } from './regions.js';
import { waterBodyAt } from './water.js';
import { valueNoise } from '../../core/math.js';
import { ARCHETYPES } from '../archetypes.js';

const PIN_X = [-1.05, -0.35, 0.35, 1.05], PIN_Y = 8.98;
const CITY_CLS = new Set(['street', 'boulevard', 'bridgest', 'local']);

function pointAt(e, s) {
  let i = 1; while (i < e.n - 1 && e.s[i] < s) i++;
  const t = (s - e.s[i - 1]) / Math.max(1e-6, e.s[i] - e.s[i - 1]), p = e.pts;
  const dx = p[i * 3] - p[(i - 1) * 3], dz = p[i * 3 + 2] - p[(i - 1) * 3 + 2], l = Math.hypot(dx, dz);
  if (l < 1e-4) return null;
  return { x: p[(i - 1) * 3] + dx * t, y: p[(i - 1) * 3 + 1] + (p[i * 3 + 1] - p[(i - 1) * 3 + 1]) * t, z: p[(i - 1) * 3 + 2] + dz * t, tx: dx / l, tz: dz / l };
}

export function generateDetail2({ items, edges, placements, heightAt, infra, seed, roadIndex, overlaps, add }) {
  const H = (a, b, o = 0) => hash2(Math.round(a * 4) + o, Math.round(b * 4), seed + 611);
  const okSpot = (x, z, r) => {
    if (roadIndex && roadIndex.clearance(x, z, true) < 0.3) return false;
    if (overlaps && overlaps({ cx: x, cz: z, w: r, d: r, yaw: 0 }, 0.1)) return false;
    return true;
  };
  const okWalk = (x, z, r) => !(overlaps && overlaps({ cx: x, cz: z, w: r, d: r, yaw: 0 }, 0.1)); // sidewalks lie inside the road row: only buildings block
  const out = { wires: [], perches: [], fowl: [], fish: [], rings: [], hullFoam: [], steam: [], chimneys: [], weeds: [] };
  const alongYaw = (tx, tz) => Math.atan2(tz, tx);       // local +x along (tx, tz)
  const lenYaw = (tx, tz) => Math.atan2(-tx, tz);        // local +z along (tx, tz)

  // ---- city sidewalks: bike racks, poster columns, graffiti walls, extra benches and planters ----------------------------------------------------------
  for (const e of edges) {
    if (e.noRender || e.walkOnly || !CITY_CLS.has(e.cls) || !(e.walkW > 0) || (e.elevated && e.elevated.some((v) => v))) continue;
    for (let s0 = 10; s0 < e.len - 10; s0 += 9) {
      const p = pointAt(e, s0); if (!p) continue;
      const dist = districtAt(p.x, p.z) || '', old = dist === 'city.oldtown', down = dist === 'city.downtown', mk = dist === 'city.market', mid = dist === 'city.midtown';
      for (const sd of [-1, 1]) { // weeds in the kerb joint: [x, y, z, scale, tint, rot] every few metres
        const hw = H(p.x, p.z, sd * 3 + 9); if (hw < 0.72) { const kl = sd * (e.carriage / 2 + 0.12), wx = p.x - p.tz * kl + p.tx * (hw * 9 - 4), wz = p.z + p.tx * kl + p.tz * (hw * 9 - 4); out.weeds.push(wx, p.y + 0.16, wz, 0.45 + hw * 0.7, Math.floor(hw * 977) % 4, hw * 60); if (hw < 0.3) out.weeds.push(wx + p.tx * 1.7, p.y + 0.16, wz + p.tz * 1.7, 0.4 + hw, Math.floor(hw * 331) % 4, hw * 33); }
      }
      for (const sd of [-1, 1]) {
        const h = H(p.x, p.z, sd * 5 + 1), lat = sd * (e.carriage / 2 + Math.min(e.walkW, 6) * 0.55), x = p.x - p.tz * lat, z = p.z + p.tx * lat;
        const busy = old || down || mk || mid;
        if (h < 0.05 * (busy ? 1 : 0.35)) { if (okWalk(x, z, 1.6)) add('prop.bike_rack', x, p.y + 0.15, z, lenYaw(p.tx, p.tz)); }
        else if (h < 0.058 && (old || mk || down)) { if (okWalk(x, z, 0.8)) add('prop.poster_column', x, p.y + 0.15, z, h * 40); }
        else if (h < 0.068 && (old || dist === 'city.docks' || dist === 'city.industrial')) { const bx = p.x - p.tz * sd * (e.halfRow + 1.4), bz = p.z + p.tx * sd * (e.halfRow + 1.4); if (okWalk(bx, bz, 2.6)) add('prop.graffiti_wall', bx, heightAt(bx, bz), bz, alongYaw(p.tx, p.tz)); }
        else if (h < 0.1 && busy) { if (okWalk(x, z, 0.9)) add('prop.bench', x + p.tz * sd * 0.0, p.y + 0.15, z, lenYaw(p.tx, p.tz) + (sd > 0 ? Math.PI : 0)); }
        else if (h < 0.12 && (old || down)) { if (okWalk(x, z, 0.9)) add('prop.planter', x, p.y + 0.15, z, h * 50); }
        else if (h < 0.135 && (old || mk)) { const px = x + p.tx * 1.7, pz = z + p.tz * 1.7; if (okWalk(px, pz, 0.6)) add('prop.potted_plant', px, p.y + 0.15, pz, h * 30); }
      }
    }
  }
  // steam: a vent stack beside a fifth of the city manholes
  for (const it of items.slice()) if (it.archetype === 'prop.manhole' && regionAt(it.x, it.z) === 'city') {
    const h = hash2(Math.round(it.x), Math.round(it.z), seed + 641);
    if (h < 0.2) { const x = it.x + 0.9, z = it.z + 0.4; add('prop.steam_vent', x, it.y + 0.02, z, h * 20); out.steam.push(x, it.y + 1.25, z); }
  }

  // ---- buildings: firewood, fences, laundry, string lights, harbour fronts, chimneys ------------------------------------------------------------------
  for (const b of placements) {
    const w = b.params.w, d = b.params.d, c = Math.cos(b.rotY), sn = Math.sin(b.rotY), lot = hash2(Math.round(b.x), Math.round(b.z), seed + 651), lot2 = hash2(Math.round(b.z), Math.round(b.x), seed + 652);
    const at = (lx, lz) => [b.x + lx * c - lz * sn, b.z + lx * sn + lz * c];
    const cabin = b.archetype === 'bld.cabin_log' || b.archetype === 'bld.cabin_plank', house = b.archetype === 'bld.house_suburban', pth = b.archetype === 'bld.port_town_house';
    if (cabin || house || pth) {
      // chimney smoke (position of the stack top: cabins and houses carry one chimney; heights follow the builders)
      const [cx, cz] = cabin ? (b.archetype === 'bld.cabin_log' ? at(w / 2 + 0.6, 0) : at(-w * 0.3, d * 0.2)) : at(w * 0.3, d * 0.15);
      if (cabin || (house && lot < 0.6)) out.chimneys.push(cx, b.y + (b.params.h || 5.6) + (cabin ? 1.5 : 1.1), cz);
      if (cabin ? lot < 0.85 : lot < 0.18) { const sd = lot2 < 0.5 ? -1 : 1, [x, z] = at(sd * (w / 2 + 0.7), d * 0.12); if (okSpot(x, z, 1.2)) add('prop.firewood_stack', x, heightAt(x, z), z, b.rotY + Math.PI / 2 + (sd > 0 ? Math.PI : 0)); }
      if (house && lot2 < 0.28) { const [x, z] = at(0, d / 2 + 3.4); if (okSpot(x, z, 2.4)) add('prop.laundry_line', x, heightAt(x, z), z, b.rotY); }
      if (cabin && lot < 0.6) { // split-rail fence on three sides of the lot (front left open for the path)
        const R2 = 6.5 + lot2 * 2, hx = w / 2 + R2, hz = d / 2 + R2;
        const run = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 3.2)); for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, [x, z] = at(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t); if (!okSpot(x, z, 1.3)) continue; add('prop.rail_fence', x, heightAt(x, z), z, b.rotY + (Math.abs(x1 - x0) > Math.abs(z1 - z0) ? 0 : Math.PI / 2)); } };
        run(-hx, hz, hx, hz); run(-hx, -hz, -hx, hz); run(hx, -hz, hx, hz); run(-hx, -hz, -hx * 0.2, -hz); run(hx * 0.2, -hz, hx, -hz);
      }
    }
    if (cabin && lot < 0.35) { const [x, z] = at(0, -d / 2 - 3.2); if (okSpot(x, z, 3.2)) add('prop.string_lights', x, heightAt(x, z), z, b.rotY); }
    if ((b.archetype === 'bld.diner' || b.archetype === 'bld.lodge_restaurant' || b.archetype === 'bld.beach_bar' || b.archetype === 'bld.general_store' || (b.archetype === 'bld.mixed_use' && lot < 0.16)) && lot2 < 0.8) {
      const [x, z] = at(0, -d / 2 - 3.8); if (okSpot(x, z, 3.2)) add('prop.string_lights', x, heightAt(x, z), z, b.rotY);
    }
    if (b.archetype === 'bld.harbor_shed' || b.archetype === 'bld.warehouse' || b.archetype === 'bld.sawmill' || b.archetype === 'bld.factory' || b.archetype === 'bld.container_terminal') {
      const reg = regionAt(b.x, b.z), ids = reg === 'forest' ? ['prop.pallet_stack', 'prop.barrel_group', 'prop.crate_stack', 'prop.firewood_stack'] : ['prop.crate_stack', 'prop.barrel_group', 'prop.pallet_stack', 'prop.crate_stack', 'prop.pallet_stack'];
      const n = b.archetype === 'bld.harbor_shed' ? 3 : 2;
      for (let k = 0; k < n; k++) { const hh = hash2(Math.round(b.x) + k * 7, Math.round(b.z), seed + 661); if (hh > 0.8) continue; const [x, z] = at((hh - 0.4) * w * 0.9, -d / 2 - 2.2 - k * 1.6); if (okSpot(x, z, 1.4)) add(ids[Math.floor(hh * 50) % ids.length], x, heightAt(x, z), z, b.rotY + (hh - 0.5) * 0.6); }
    }
  }

  // ---- quays, piers and docks: crates, barrels, pallets, fenders, rope bollards; rings around piles; pier-end birds ------------------------------------
  const harbourIds = ['prop.crate_stack', 'prop.barrel_group', 'prop.pallet_stack', 'prop.crab_pot', 'prop.net_pile', 'prop.crate_stack', 'prop.ice_bin', 'prop.barrel_group'];
  for (const gr of (infra && infra.groups) || []) {
    if (gr.archetype === 'infra.pier_timber' || gr.archetype === 'infra.dock_floating') {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, top = -1e9;
      for (const q of gr.parts) { x0 = Math.min(x0, q.x - q.sx / 2); x1 = Math.max(x1, q.x + q.sx / 2); z0 = Math.min(z0, q.z - q.sz / 2); z1 = Math.max(z1, q.z + q.sz / 2); if (q.sy <= 0.9 && q.s !== 'cyl') top = Math.max(top, q.y + q.sy / 2); }
      for (const q of gr.parts) if (q.s === 'cyl' && q.sx <= 0.55) { const wb = waterBodyAt(q.x, q.z); if (wb) out.rings.push(q.x, wb.level + 0.03, q.z, 0.8 + q.sx); }
      if (top < -1e8) continue;
      const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0, ocean = regionAt((x0 + x1) / 2, (z0 + z1) / 2) !== 'lake', cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, half = (alongX ? z1 - z0 : x1 - x0) / 2;
      if (len < 8) continue;
      for (let s = 3; s < len - 2; s += 6) {
        const hh = hash2(Math.round(x0 + s), Math.round(z0 + s * 3), seed + 671), side = hh < 0.5 ? -1 : 1;
        const px = alongX ? x0 + s : cx + side * Math.max(0, half - 0.5), pz = alongX ? cz + side * Math.max(0, half - 0.5) : z0 + s, yaw = alongX ? 0 : Math.PI / 2;
        if (hh < 0.2) add('prop.bollard_rope', px, top, pz, hh * 30);
        else if (hh < 0.34 && ocean) add('prop.tyre_fender', px + (alongX ? 0 : side * 0.22), top - 0.35, pz + (alongX ? side * 0.22 : 0), yaw + (side > 0 ? 0 : Math.PI));
        else if (hh < 0.62 && s > 6) { const o = Math.max(0, half - 1.4) * side * 0.5, qx = alongX ? px : cx + o, qz = alongX ? cz + o : pz; add(ocean ? harbourIds[Math.floor(hh * 100) % harbourIds.length] : ['prop.crate_stack', 'prop.barrel_group', 'prop.rope_coil', 'prop.oar'][Math.floor(hh * 100) % 4], qx, top, qz, hh * 40); }
        else if (hh >= 0.62 && hh < 0.76 && s > 4 && s < len - 7) add('prop.string_lights', px, top, pz, yaw);
        if (hh > 0.88 && ocean) out.perches.push(px, top + 0.66, pz, 2, hh * 20, 0);
      }
    }
  }
  // quay walls: props on the land side at 8-14 m spacing
  for (const gr of (infra && infra.groups) || []) {
    if (gr.archetype !== 'infra.quay_wall') continue;
    const port = gr.id === 'infra.quay.port';
    for (const q of gr.parts) {
      if (q.s === 'cyl' || Math.max(q.sx, q.sz) < 12 || q.sy < 1.2) continue;
      const along = q.sx >= q.sz, L = along ? q.sx : q.sz, ca = Math.cos(q.yaw || 0), sa = Math.sin(q.yaw || 0);
      const dirx = along ? ca : -sa, dirz = along ? -sa : ca; // local x -> (cos, -sin) in the three.js rotY convention used by the parts
      for (let s = -L / 2 + 5; s < L / 2 - 3; s += port ? 7 : 16) {
        const hh = hash2(Math.round(q.x + dirx * s), Math.round(q.z + dirz * s), seed + 681); if (hh > (port ? 0.8 : 0.4)) continue;
        for (const sd of [-1, 1]) {
          const lx = q.x + dirx * s - dirz * sd * (Math.min(q.sx, q.sz) / 2 + 2.2 + hh * 2.5), lz = q.z + dirz * s + dirx * sd * (Math.min(q.sx, q.sz) / 2 + 2.2 + hh * 2.5);
          const wb = waterBodyAt(lx, lz); if (wb) continue; const gy = heightAt(lx, lz); if (gy < 0.6 || !okSpot(lx, lz, 1.4)) continue;
          { const fx = q.x + dirx * s + dirz * sd * -(Math.min(q.sx, q.sz) / 2 + 0.7), fz = q.z + dirz * s - dirx * sd * -(Math.min(q.sx, q.sz) / 2 + 0.7), fwb = waterBodyAt(fx, fz); if (fwb) out.hullFoam.push(fx, fz, fwb.level, 7, 0.5, lenYaw(dirx, dirz)); }
          const id = harbourIds[Math.floor(hh * 977) % harbourIds.length];
          add(id, lx, gy, lz, hh * 60);
          // tyre fenders and rope bollards on the water side
          const ex = q.x + dirx * s + dirz * sd * (Math.min(q.sx, q.sz) / 2 + 0.2), ez = q.z + dirz * s - dirx * sd * (Math.min(q.sx, q.sz) / 2 + 0.2), ewb = waterBodyAt(ex, ez);
          if (!ewb && hh < 0.5 && port) add('prop.bollard_rope', ex, heightAt(ex, ez), ez, hh * 50);
          break;
        }
      }
    }
  }

  // ---- forest roads and the logging yard: stump and log variety --------------------------------------------------------------------------------------
  for (const e of edges) {
    if (e.noRender || e.walkOnly || !(e.cls === 'gravel' || e.cls === 'dirt' || e.cls === 'loop' || e.cls === 'rural')) continue;
    for (let s0 = 8; s0 < e.len - 8; s0 += 10) {
      const p = pointAt(e, s0); if (!p || regionAt(p.x, p.z) !== 'forest') continue;
      const hh = H(p.x, p.z, 17); if (hh > 0.22) continue;
      const sd = hh < 0.11 ? -1 : 1, o = e.halfRow + 1.6 + hh * 30, x = p.x - p.tz * sd * o, z = p.z + p.tx * sd * o, y = heightAt(x, z) - 0.1;
      if (hh < 0.05) add('prop.stump_mossy', x, y, z, hh * 90); else if (hh < 0.09) add('prop.stump_rotten', x, y, z, hh * 90); else if (hh < 0.13) add('prop.stump_fresh', x, y, z, hh * 90);
      else if (hh < 0.15) add('prop.fallen_tree', x, y + 0.1, z, alongYaw(p.tx, p.tz) + hh * 3); else if (hh < 0.17 && (e.cls === 'gravel' || e.cls === 'dirt')) add('prop.log_pile', x, y + 0.1, z, alongYaw(p.tx, p.tz) + Math.PI / 2);
      else add('prop.stump_fresh', x, y, z, hh * 90);
    }
  }
  for (const b of placements) if (b.archetype === 'bld.sawmill') {
    for (let k = 0; k < 14; k++) { const a = hash2(k, Math.round(b.x), seed + 691) * 6.283, r = 14 + hash2(k, Math.round(b.z), seed + 692) * 30, x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r; if (okSpot(x, z, 1.2)) add(k % 3 ? 'prop.stump_fresh' : 'prop.stump_rotten', x, heightAt(x, z) - 0.1, z, k * 7.3); }
  }

  // ---- utility wires between consecutive poles, perched birds on them ---------------------------------------------------------------------------------
  const poles = items.filter((it) => it.archetype === 'prop.utility_pole');
  for (let i = 0; i + 1 < poles.length; i++) {
    const A = poles[i], B = poles[i + 1], dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz);
    if (L > 62 || L < 8) continue;
    const ca = Math.cos(A.rotY), sa = Math.sin(A.rotY), cb = Math.cos(B.rotY), sb = Math.sin(B.rotY);
    if (ca * cb + sa * sb < 0.6) continue; // crossarms not parallel (corner): no span
    const span = out.wires.length / 7;
    for (let k = 0; k < 4; k++) out.wires.push(A.x + ca * PIN_X[k], A.y + PIN_Y, A.z + sa * PIN_X[k], B.x + cb * PIN_X[k], B.y + PIN_Y, B.z + sb * PIN_X[k]);
    // out.wires is stride 6; one sag value is derived from the span length at draw time
    void span;
    const hs = hash2(Math.round(A.x), Math.round(A.z), seed + 701);
    if (hs < 0.5) {
      const nb = 2 + Math.floor(hs * 8), city = regionAt(A.x, A.z) === 'city';
      for (let q = 0; q < nb; q++) {
        const t = 0.14 + 0.72 * hash2(q, Math.round(A.x * 3), seed + 702), wi = Math.floor(hash2(q, Math.round(A.z * 3), seed + 703) * 4), sag = 0.0125 * L * 4 * t * (1 - t);
        const x = A.x + ca * PIN_X[wi] + (B.x + cb * PIN_X[wi] - A.x - ca * PIN_X[wi]) * t, z = A.z + sa * PIN_X[wi] + (B.z + sb * PIN_X[wi] - A.z - sa * PIN_X[wi]) * t, y = A.y + PIN_Y + (B.y - A.y) * t - sag + 0.045;
        out.perches.push(x, y, z, city && hash2(q, Math.round(A.x), seed + 704) < 0.45 ? 1 : 0, Math.atan2(-dz, -dx) + (q & 1 ? Math.PI : 0) + Math.PI / 2 * 0 + hash2(q, 5, seed) * 0.5, hash2(q, 9, seed + 705));
      }
    }
  }
  // perched birds along bridge and footbridge top rails
  for (const gr of (infra && infra.groups) || []) {
    if (!(gr.archetype === 'infra.bridge_small' || gr.archetype === 'infra.bridge_girder' || gr.archetype === 'infra.footbridge_steel' || gr.archetype === 'infra.footbridge_wood')) continue;
    for (const q of gr.parts) {
      if (q.s === 'cyl' || q.sy > 1.4 || q.sz < 6 && q.sx < 6) continue;
      const hh = hash2(Math.round(q.x), Math.round(q.z), seed + 711); if (hh > 0.5) continue;
      const alongZ = q.sz >= q.sx, L = alongZ ? q.sz : q.sx, ca = Math.cos(q.yaw || 0), sa = Math.sin(q.yaw || 0), dirx = alongZ ? sa : ca, dirz = alongZ ? ca : -sa;
      const nb = 2 + Math.floor(hh * 6);
      for (let k = 0; k < nb; k++) { const t = (hash2(k, Math.round(q.x), seed + 712) - 0.5) * L * 0.8; out.perches.push(q.x + dirx * t, q.y + q.sy / 2 + 0.01, q.z + dirz * t, hh < 0.2 ? 2 : (k & 1), Math.atan2(dirz, dirx) + 1.57 + hash2(k, 3, seed) * 0.6, hash2(k, 7, seed + 713)); }
    }
  }

  // ---- boats: hull collars (foam + contact shadow) ---------------------------------------------------------------------------------------------------
  for (const it of items) if (it.archetype.startsWith('boat.')) { const A = ARCHETYPES[it.archetype]; if (A) out.hullFoam.push(it.x, it.z, it.y, A.size[2], A.size[0], it.rotY); }

  // ---- waterfowl and fish -----------------------------------------------------------------------------------------------------------------------------
  // fowl: [cx, cz, level, kind (0 duck, 1 swan), radius, phase, speed, count, tint]
  let swans = 0;
  for (let gx = -1700; gx < -700; gx += 36) for (let gz = -1450; gz < -750; gz += 36) {
    const x = gx + hash2(gx, gz, seed + 721) * 36, z = gz + hash2(gz, gx, seed + 722) * 36, wb = waterBodyAt(x, z); if (!wb || wb.body !== 'lake') continue;
    const depth = wb.level - heightAt(x, z), hh = hash2(gx, gz, seed + 723), calm = valueNoise(x / 90, z / 90, 91);
    if (depth > 0.8 && depth < 3.2 && hh < 0.22 * (0.4 + calm)) out.fowl.push(x, z, wb.level, 0, 5 + hh * 25, hh * 6.28, 0.12 + hh * 0.2, 3 + Math.floor(hh * 18) % 4, Math.floor(hh * 977) % 3);
    else if (depth > 3.5 && depth < 14 && hh < 0.045 && swans < 9) { swans++; out.fowl.push(x, z, wb.level, 1, 14 + hh * 120, hh * 6.28, 0.07 + hh * 0.5, 2, 0); }
    if (depth > 0.5 && depth < 6 && hash2(gx, gz, seed + 724) < 0.2) out.fish.push(x, z, wb.level, 2 + hh * 7, hh * 6.28, 0.15 + hh * 0.3, 0.7 + hh * 0.9);
  }
  for (const id of ['water.pond.heron', 'water.pond.reed']) { /* ponds: a pair of ducks each (positions from the pond list are looked up by waterBodyAt probes) */ void id; }
  for (const [cx, cz, lv] of [[-420, -1300, 55], [-1500, -480, 30]]) { const wb = waterBodyAt(cx, cz); if (wb) out.fowl.push(cx + 10, cz - 8, lv, 0, 12, 0.5, 0.2, 4, 1); }
  // fish near piers and docks (shadows under the planks)
  for (const gr of (infra && infra.groups) || []) {
    if (gr.archetype !== 'infra.pier_timber' && gr.archetype !== 'infra.dock_floating') continue;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of gr.parts) { x0 = Math.min(x0, q.x - q.sx / 2); x1 = Math.max(x1, q.x + q.sx / 2); z0 = Math.min(z0, q.z - q.sz / 2); z1 = Math.max(z1, q.z + q.sz / 2); }
    for (let k = 0; k < 3; k++) { const hh = hash2(Math.round(x0) + k, Math.round(z0), seed + 731), x = x0 + (x1 - x0) * hh + (hh - 0.5) * 6, z = z0 + (z1 - z0) * hash2(k, Math.round(z1), seed + 732) + (hh - 0.5) * 6, wb = waterBodyAt(x, z); if (wb && wb.level - heightAt(x, z) > 0.8) out.fish.push(x, z, wb.level, 1.5 + hh * 2.5, hh * 6.28, 0.2 + hh * 0.3, 0.6 + hh * 0.6); }
  }
  return out;
}
