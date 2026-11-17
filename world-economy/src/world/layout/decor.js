// Decoration placements (Annex A 6.5, MASTER_SPEC 9.1 "S3 may add decoration placements"): street furniture along the road
// graph (lamps, traffic lights, benches, bins, hydrants, meters, bike docks, kiosks, mailboxes, shelters, manholes, utility
// poles), dock dressing, campsites, the logging yard, mossy boulders along forest roads, plus light definitions (lamp heads and
// fires) for the renderer's light pool. Pure and seeded; visual only (no colliders), so routes and gameplay are unchanged.
import { hash2 } from '../../core/rng.js';
import { regionAt, districtAt } from './regions.js';
import { waterBodyAt, LAKE } from './water.js';
import { valueNoise } from '../../core/math.js';

const NC = 40;
const ck = (x, z) => Math.min(NC - 1, Math.max(0, Math.floor((z + 2000) / 100))) * NC + Math.min(NC - 1, Math.max(0, Math.floor((x + 2000) / 100)));
const CITY_CLS = new Set(['street', 'boulevard', 'bridgest', 'local']);

export function generateDecor({ edges, nodes, placements, pois, heightAt, infra, seed = 1, roadIndex = null, overlaps = null }) {
  const items = [], lamps = [], fires = [];
  let sid = 1;
  const add = (archetype, x, y, z, rotY) => { items.push({ archetype, x, y, z, rotY, seed: (seed * 7919 + sid++ * 104729) >>> 0, decor: true }); };
  const nodeDeg = new Map(), nodeCar = new Map();
  for (const e of edges) if (CITY_CLS.has(e.cls)) for (const k of [e.a, e.b]) { nodeDeg.set(k, (nodeDeg.get(k) || 0) + 1); nodeCar.set(k, Math.max(nodeCar.get(k) || 0, e.carriage)); }

  for (const e of edges) {
    if (e.noRender || e.walkOnly) continue;
    const city = CITY_CLS.has(e.cls) && e.walkW > 0, rural = e.cls === 'rural' || e.cls === 'highway', forestRd = e.cls === 'gravel' || e.cls === 'dirt' || e.cls === 'loop';
    if (!city && !rural && !forestRd) continue;
    // walk the polyline at fixed spacing
    let acc = 0, lampN = 0;
    for (let i = 0; i < e.n - 1; i++) {
      if (e.elevated && (e.elevated[i] || e.elevated[i + 1])) { acc = 0; continue; }
      const ax = e.pts[i * 3], ay = e.pts[i * 3 + 1], az = e.pts[i * 3 + 2], bx = e.pts[i * 3 + 3], bz = e.pts[i * 3 + 5];
      const L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue;
      const tx = (bx - ax) / L, tz = (bz - az) / L, nx = -tz, nz = tx;
      const yaw = Math.atan2(tx, -tz);
      for (let s = 0; s < L; s += 2) {
        acc += 2;
        const x = ax + tx * s, z = az + tz * s, y = ay;
        const h = hash2(Math.round(x * 2), Math.round(z * 2), seed + 31);
        if (city) {
          const dist = districtAt(x, z) || '', old = dist === 'city.oldtown', down = dist === 'city.downtown';
          const kerb = e.carriage / 2 + 0.5, back = e.carriage / 2 + e.walkW - 0.6;
          if (acc % 28 === 0) {
            for (const sd of [-1, 1]) {
              if ((lampN + (sd > 0 ? 1 : 0)) % 2) continue; // staggered sides
              const lx = x + nx * sd * kerb, lz = z + nz * sd * kerb, id = old ? 'prop.streetlamp_a' : 'prop.streetlamp_b';
              add(id, lx, y + 0.15, lz, yaw + (sd > 0 ? Math.PI / 2 : -Math.PI / 2));
              if (old) { lamps.push([lx, y + 4.9, lz, 8, y + 0.15]); }
              else { const hx = lx - nx * sd * 1.9, hz = lz - nz * sd * 1.9; lamps.push([hx, y + 7.8, hz, 11, y]); }
            }
            lampN++;
          } else if (acc % 14 === 0 && e.walkW >= 3) {
            const sd = h < 0.5 ? -1 : 1, px = x + nx * sd * back, pz = z + nz * sd * back, ry = yaw + (sd > 0 ? -Math.PI / 2 : Math.PI / 2), r = hash2(Math.round(x), Math.round(z), seed + 77);
            if (r < 0.16) add('prop.bench', px, y + 0.15, pz, ry);
            else if (r < 0.3) add('prop.bin', x + nx * sd * kerb, y + 0.15, z + nz * sd * kerb, ry);
            else if (r < 0.36) add('prop.hydrant', x + nx * sd * kerb, y + 0.15, z + nz * sd * kerb, ry);
            else if (r < 0.42 && down) add('prop.parking_meter', x + nx * sd * kerb, y + 0.15, z + nz * sd * kerb, ry);
            else if (r < 0.47 && old) add('prop.bike_dock', px, y + 0.15, pz, yaw);
            else if (r < 0.5 && old) add('prop.map_kiosk', px, y + 0.15, pz, ry);
            else if (r < 0.53) add('prop.mailbox', px, y + 0.15, pz, ry);
            else if (r < 0.55 && e.cls !== 'local') add('prop.bus_shelter', px, y + 0.15, pz, ry);
            else if (r < 0.6 && (old || dist === 'city.market')) add('prop.planter', px, y + 0.15, pz, ry);
            else if (r < 0.63 && !down) add('prop.dumpster', x + nx * sd * (back + 1.6), y + 0.15, z + nz * sd * (back + 1.6), ry);
          }
          if (acc % 46 === 0 && e.carriage >= 10) add('prop.manhole', x + nx * 2.2 * (h < 0.5 ? -1 : 1), y + 0.02, z + nz * 2.2, yaw);
          if (acc % 34 === 0 && (dist === 'city.midtown' || dist === 'city.northgate' || dist === 'city.eastside')) add('prop.utility_pole', x + nx * (e.halfRow + 0.3), y + 0.15, z + nz * (e.halfRow + 0.3), yaw);
        } else if (rural) {
          if (acc % 46 === 0) add('prop.utility_pole', x + nx * (e.halfRow + 1.2), heightAt(x + nx * (e.halfRow + 1.2), z + nz * (e.halfRow + 1.2)), z + nz * (e.halfRow + 1.2), yaw);
          if (regionAt(x, z) === 'forest' && h < 0.05) { const sd = h < 0.025 ? -1 : 1, o = e.halfRow + 2 + h * 60, rx = x + nx * sd * o, rz = z + nz * sd * o; add(h < 0.012 ? 'prop.rock_mossy_l' : 'prop.rock_mossy_m', rx, heightAt(rx, rz) - 0.3, rz, h * 400); }
        } else if (forestRd && h < 0.06) {
          const sd = h < 0.03 ? -1 : 1, o = e.halfRow + 1.5 + h * 50, rx = x + nx * sd * o, rz = z + nz * sd * o;
          add(h < 0.015 ? 'prop.rock_mossy_m' : h < 0.04 ? 'prop.rock_mossy_s' : 'prop.stump', rx, heightAt(rx, rz) - 0.2, rz, h * 500);
        }
      }
    }
  }
  // traffic lights at city junctions (degree >= 3): one per corner, facing traffic
  for (const [id, deg] of nodeDeg) {
    if (deg < 3) continue;
    const n = nodes.get(id); if (!n || regionAt(n.x, n.z) !== 'city') continue;
    if (hash2(Math.round(n.x), Math.round(n.z), seed + 5) > 0.7) continue;
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, r = (nodeCar.get(id) || 12) * 0.5 * Math.SQRT2 + 1.4; add('prop.traffic_light', n.x + Math.sin(a) * r, n.y + 0.15, n.z - Math.cos(a) * r, a + Math.PI * 0.75); }
    add('prop.sign_street', n.x + 8, n.y + 0.15, n.z + 8, 0);
  }
  // dock / pier dressing, campsites, logging yard
  for (const p of pois) {
    const [x, y, z] = p.pos, H = (a, b) => hash2(Math.round(x) + a, Math.round(z) + b, seed + 9);
    if (p.type === 'dock' || p.type === 'fuel' || p.type === 'fishspot' || p.data.dock) {
      const ocean = p.region === 'ocean';
      const set = ocean ? ['prop.fish_crate', 'prop.crab_pot', 'prop.buoy_red', 'prop.net_pile', 'prop.ice_bin'] : ['prop.crate_wood', 'prop.rope_coil', 'prop.oar', 'prop.lantern', 'prop.barrel'];
      for (let k = 0; k < 6; k++) { const a = H(k, 1) * 6.28, r = 2.5 + H(k, 2) * 3; const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; add(set[k % set.length], px, Math.max(y, heightAt(px, pz)), pz, H(k, 3) * 6.28); }
      add('prop.life_ring', x + 1.5, y + 1.0, z - 1.5, 0);
    }
    if (p.type === 'camp') {
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + H(k, 4), px = x + Math.cos(a) * 7, pz = z + Math.sin(a) * 7; add('prop.tent', px, heightAt(px, pz), pz, a + Math.PI / 2); }
      add('prop.campfire', x, heightAt(x, z), z, 0); fires.push([x, heightAt(x, z) + 0.6, z]);
      add('prop.picnic_table', x + 4, heightAt(x + 4, z - 3), z - 3, 0.3); add('prop.log_single', x - 2, heightAt(x - 2, z + 1.5), z + 1.5, 1.2);
    }
    if (p.id === 'poi.forest.timberline') {
      for (let k = 0; k < 5; k++) { const px = x - 30 + k * 11, pz = z + 22; add('prop.log_pile', px, heightAt(px, pz), pz, 0.1 * k); }
      for (let k = 0; k < 4; k++) { const px = x + 18 + k * 1.2, pz = z - 10; add('prop.fuel_drum', px, heightAt(px, pz), pz, k); }
      add('prop.sawhorse', x + 10, heightAt(x + 10, z + 4), z + 4, 0.5); add('prop.workbench', x + 14, heightAt(x + 14, z + 6), z + 6, 0);
    }
  }
  // moored boats along piers and floating docks (static set dressing; Annex A 2 ref 7/9: crowded harbour, >= 14 boats)
  const taken = [];
  for (const gr of (infra && infra.groups) || []) {
    if (gr.archetype !== 'infra.pier_timber' && gr.archetype !== 'infra.dock_floating') continue;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const q of gr.parts) { x0 = Math.min(x0, q.x - q.sx / 2); x1 = Math.max(x1, q.x + q.sx / 2); z0 = Math.min(z0, q.z - q.sz / 2); z1 = Math.max(z1, q.z + q.sz / 2); }
    const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0; if (len < 10) continue;
    const reg = regionAt((x0 + x1) / 2, (z0 + z1) / 2), ocean = reg === 'ocean' || reg === 'city';
    const pc = Math.hypot((x0 + x1) / 2 + 880, (z0 + z1) / 2 - 1145) < 260;
    const types = ocean ? (pc ? ['boat.trawler', 'boat.workboat', 'boat.trawler', 'boat.console', 'boat.skiff'] : ['boat.yacht', 'boat.console', 'boat.sailboat', 'boat.console', 'boat.skiff']) : ['boat.rowboat', 'boat.skiff', 'boat.rowboat'];
    let k = 0;
    for (let s = 6; s < len - 4; s += pc ? 19 : ocean ? 12 : 7) for (const sd of [-1, 1]) {
      const h = hash2(Math.round(x0 + s), Math.round(z0 + s * sd), seed + 13); if (h > (ocean ? 0.7 : 0.45)) continue;
      const t = types[(k++ + Math.floor(h * 10)) % types.length], beam = t === 'boat.trawler' ? 3.6 : t === 'boat.workboat' ? 3.3 : t === 'boat.yacht' ? 2.8 : 1.9;
      const off = (alongX ? (z1 - z0) : (x1 - x0)) / 2 + beam + 0.4;
      const cx = alongX ? x0 + s : (x0 + x1) / 2 + sd * off, cz = alongX ? (z0 + z1) / 2 + sd * off : z0 + s;
      const wb = waterBodyAt(cx, cz); if (!wb || wb.level - heightAt(cx, cz) < (t === 'boat.trawler' ? 2.5 : 0.8)) continue;
      if (taken.some((q) => Math.hypot(q[0] - cx, q[1] - cz) < (pc ? 14 : 8))) continue;
      taken.push([cx, cz]);
      add(t, cx, wb.level, cz, (alongX ? Math.PI / 2 : 0) + (h < 0.35 ? Math.PI : 0));
    }
  }
  // fireplace lights in cabins (int.cabin_log fireplace on the +X wall)
  for (const b of placements) {
    if (b.archetype !== 'bld.cabin_log' && b.archetype !== 'bld.cabin_plank') continue;
    const lx = b.params.w / 2 - 1.2, c = Math.cos(b.rotY), s = Math.sin(b.rotY);
    fires.push([b.x + lx * c, b.y + 0.9, b.z + lx * s]);
  }
  const byChunk = Array.from({ length: NC * NC }, () => []);
  for (const it of items) byChunk[ck(it.x, it.z)].push(it);
  const scatter = generateScatter({ edges, nodes, placements, heightAt, roadIndex, overlaps, seed, nodeDeg, nodeCar, add });
  return { items, byChunk, lamps, fires, ...scatter };
}

// ---- Detail Batch 1: scattered small vegetation, parked cars and water plants (drawn by render/detail.js, instanced) ---------------------------------------
// All placement is deterministic (hash of position + seed) and visual only. Output per 100 m chunk, flat number arrays:
//   shrubs: [x, y, z, type(0 round bush A, 1 round bush B, 2 hedge run), scale, rotY, tint(0..7)] * n
//   parked: [x, y, z, yaw, kind(0 sedan, 1 hatch, 2 pickup, 3 van), colour(0..11), dirt(0..1)] * n
//   lilies: [x, y, z, kind(0 pad, 1 flower), scale, rotY, tint(0..3)] * n
const SHRUB_BLD = { 'bld.house_suburban': 0.85, 'bld.cabin_log': 0.7, 'bld.cabin_plank': 0.7, 'bld.apartment_block': 0.5, 'bld.brick_walkup': 0.5, 'bld.port_town_house': 0.65, 'bld.general_store': 0.4, 'bld.lodge_restaurant': 0.55, 'bld.bank': 0.4, 'bld.panel_midrise': 0.4, 'bld.diner': 0.3, 'bld.ranger_station': 0.6, 'bld.beach_bar': 0.3, 'bld.brick_loft': 0.18 };
const PARK_KIND_W = [0.34, 0.3, 0.2, 0.16]; // sedan, hatch, pickup, van
function generateScatter({ edges, nodes, placements, heightAt, roadIndex, overlaps, seed, nodeDeg, nodeCar, add }) {
  const shrubs = Array.from({ length: NC * NC }, () => []), parked = Array.from({ length: NC * NC }, () => []), lilies = Array.from({ length: NC * NC }, () => []);
  let nShrub = 0, nParked = 0, nLily = 0;
  const H = (a, b, o = 0) => hash2(Math.round(a * 4) + o, Math.round(b * 4), seed + 211);
  const okSpot = (x, z, r) => {
    if (roadIndex && roadIndex.clearance(x, z, true) < 0.3) return false;
    if (overlaps && overlaps({ cx: x, cz: z, w: r, d: r, yaw: 0 }, 0.1)) return false;
    return true;
  };
  const addShrub = (x, z, type, sc, rot, tint) => { const y = heightAt(x, z); shrubs[ck(x, z)].push(x, y, z, type, sc, rot, tint); nShrub++; };
  // ---- shrubs along building fronts (every 3.5-6.5 m, skipping the door zone), at house corners and sides ----------------------------------------------
  for (const b of placements) {
    const pr = SHRUB_BLD[b.archetype]; if (!pr) continue;
    const reg = regionAt(b.x, b.z);
    const w = b.params.w, d = b.params.d, c = Math.cos(b.rotY), sn = Math.sin(b.rotY);
    const at = (lx, lz) => [b.x + lx * c - lz * sn, b.z + lx * sn + lz * c];
    const lot = hash2(Math.round(b.x), Math.round(b.z), seed + 91);
    if (lot > pr) continue; // not every lot gets planting
    let lx = -w / 2 + 1 + lot * 2;
    for (let k = 0; lx < w / 2 - 0.6 && k < 14; k++) {
      const h = H(b.x + lx, b.z, k), lz = -d / 2 - 0.85 - h * 0.5;
      if (Math.abs(lx) > 1.9 || b.archetype === 'bld.cabin_log' || b.archetype === 'bld.cabin_plank') { // leave the door bay (x = 0) open
        if (Math.abs(lx) > 1.9 || reg === 'lake') { const [x, z] = at(lx, lz); if (okSpot(x, z, 1.4)) addShrub(x, z, h < 0.5 ? 0 : 1, 0.85 + h * 0.5, h * 9, Math.floor(h * 97) & 7); }
      }
      lx += 3.4 + H(b.x, b.z + lx, 5) * 3;
    }
    // back / side planting for houses and cabins
    if (b.archetype === 'bld.house_suburban' || b.archetype.startsWith('bld.cabin') || b.archetype === 'bld.port_town_house') {
      for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) {
        const h = H(b.x + sd * 3, b.z + k, 9); if (h > 0.55) continue;
        const [x, z] = at(sd * (w / 2 + 0.9 + h), -d / 2 + 1.5 + k * (d * 0.45)); if (okSpot(x, z, 1.4)) addShrub(x, z, h < 0.25 ? 0 : 1, 0.9 + h * 0.6, h * 12, Math.floor(h * 331) & 7);
      }
    }
  }
  // ---- boulevard medians and street verge clumps; roadside shrubs on rural roads near cabins -------------------------------------------------------------
  for (const e of edges) {
    if (e.noRender || e.walkOnly || e.elevated.some((v) => v)) continue;
    if (e.cls === 'boulevard') {
      for (let s0 = 6; s0 < e.len - 6; s0 += 7.5) {
        const p = pointAt(e, s0); if (!p) continue;
        const h = H(p.x, p.z, 3); if (h > 0.8) continue;
        if (nodeDeg.get(e.a) >= 3 && s0 < 16 || nodeDeg.get(e.b) >= 3 && s0 > e.len - 16) continue;
        addShrub(p.x + (h - 0.4) * 0.8, p.z, h < 0.5 ? 0 : 1, 0.9 + h * 0.6, h * 20, Math.floor(h * 211) & 7);
      }
    }
  }
  // ---- parked cars: kerbside parking lane of city streets (12 m carriageway: parking lane centre 4.85 m from the axis) -------------------------------------
  for (const e of edges) {
    if (e.cls !== 'street' || e.noRender || e.walkOnly || e.elevated.some((v) => v)) continue;
    const dist0 = districtAt(e.pts[0], e.pts[2]) || '';
    const fill = dist0 === 'city.oldtown' ? 0.62 : dist0 === 'city.downtown' ? 0.42 : dist0 === 'city.industrial' ? 0.35 : dist0 === 'city.docks' ? 0.4 : 0.52;
    let sIdx = 0;
    for (let s0 = 14 + H(e.len, e.n, 1) * 3; s0 < e.len - 14; s0 += 6.3, sIdx++) {
      const p = pointAt(e, s0); if (!p) continue;
      // keep junction mouths, crossings and fire hydrants clear
      if (nodeDeg.get(e.a) >= 3 && s0 < 22 || nodeDeg.get(e.b) >= 3 && s0 > e.len - 22) continue;
      for (const sd of [-1, 1]) {
        const h = H(p.x, p.z, sd * 7 + 2); if (h > fill) continue;
        const lat = sd * (e.carriage / 2 - 1.15 + (H(p.x, p.z, 11) - 0.5) * 0.25), x = p.x - p.tz * lat, z = p.z + p.tx * lat;
        if (regionAt(x, z) !== 'city') continue;
        const yaw = Math.atan2(p.tx, -p.tz) + (sd < 0 ? 0 : Math.PI) + (H(x, z, 13) - 0.5) * 0.06;
        const kr = H(x, z, 17); let kind = 0, acc = 0; for (let k = 0; k < 4; k++) { acc += PARK_KIND_W[k]; if (kr < acc) { kind = k; break; } kind = 3; }
        parked[ck(x, z)].push(x, p.y + 0.1, z, yaw, kind, Math.floor(H(x, z, 19) * 12) % 12, Math.pow(H(x, z, 23), 1.6)); nParked++;
      }
    }
  }
  // ---- cabin and house driveways: a pickup or hatchback beside a share of the lots (lake, forest and ocean regions) ------------------------------------
  for (const b of placements) {
    if (!(b.archetype === 'bld.cabin_log' || b.archetype === 'bld.cabin_plank' || b.archetype === 'bld.house_suburban' || b.archetype === 'bld.port_town_house')) continue;
    const h = hash2(Math.round(b.x), Math.round(b.z), seed + 131); if (h > 0.34) continue;
    const c = Math.cos(b.rotY), sn = Math.sin(b.rotY), w = b.params.w, d = b.params.d, lx = w / 2 + 2.6, lz = -d / 2 + 0.5;
    const x = b.x + lx * c - lz * sn, z = b.z + lx * sn + lz * c;
    if (!okSpot(x, z, 3)) continue;
    parked[ck(x, z)].push(x, heightAt(x, z), z, b.rotY + (h < 0.17 ? 0 : Math.PI) + (h - 0.17) * 0.5, h < 0.12 ? 2 : h < 0.24 ? 1 : 0, Math.floor(h * 997) % 12, 0.3 + h); nParked++;
  }

  // ---- street dressing merged into the chunk batches (no extra draw calls): post mailboxes at house and cabin lots, bin-bag piles by shop and walk-up fronts,
  //      newspaper boxes at corners, traffic-cone groups at occasional lane closures ---------------------------------------------------------------------
  const onWalk = (x, z) => { if (!roadIndex) return false; const r = roadIndex.nearest(x, z, 25, (q) => q.walkW > 0 && !q.elevated.some((v) => v)); return !!r && r.d > r.edge.carriage / 2 + 0.5 && r.d < r.edge.halfRow - 0.3; };
  for (const b of placements) {
    const w = b.params.w, d = b.params.d, c = Math.cos(b.rotY), sn = Math.sin(b.rotY), lot = hash2(Math.round(b.x), Math.round(b.z), seed + 171);
    const homes = b.archetype === 'bld.house_suburban' || b.archetype === 'bld.cabin_log' || b.archetype === 'bld.cabin_plank' || b.archetype === 'bld.port_town_house';
    if (homes && roadIndex && lot < 0.78) {
      const fx = b.x + sn * (d / 2 + 0.5) + c * (w * 0.3), fz = b.z - c * (d / 2 + 0.5) + sn * (w * 0.3), r = roadIndex.nearest(fx, fz, 40, (q) => !q.walkOnly && q.cls !== 'path');
      if (r && r.d > r.edge.halfRow + 1.2) {
        const ux = (fx - r.x) / r.d, uz = (fz - r.z) / r.d, mx = r.x + ux * (r.edge.halfRow + 0.7), mz = r.z + uz * (r.edge.halfRow + 0.7);
        if (okSpot(mx, mz, 0.6)) add('prop.mailbox_post', mx, heightAt(mx, mz), mz, Math.atan2(-ux, uz) + Math.PI / 2 * 0);
      }
    }
    if ((b.archetype === 'bld.mixed_use' || b.archetype === 'bld.brick_walkup' || b.archetype === 'bld.brick_loft' || b.archetype === 'bld.general_store') && lot > 0.55) {
      const lx = (lot - 0.55) * w * 1.6 - w * 0.35, lz = -d / 2 - 1.0, x = b.x + lx * c - lz * sn, z = b.z + lx * sn + lz * c;
      if (onWalk(x, z)) add('prop.trash_bags', x, heightAt(x, z) + 0.25, z, lot * 31);
    }
  }
  for (const [id, deg] of nodeDeg) {
    if (deg < 3) continue;
    const n = nodes.get(id); if (!n || regionAt(n.x, n.z) !== 'city') continue;
    const h = hash2(Math.round(n.x), Math.round(n.z), seed + 181);
    if (h < 0.3) { const a = Math.floor(h * 40) * Math.PI / 2 + Math.PI / 4, r = (nodeCar.get(id) || 12) * 0.5 * Math.SQRT2 + 3.1, x = n.x + Math.sin(a) * r, z = n.z - Math.cos(a) * r; if (onWalk(x, z)) add('prop.newspaper_box', x, n.y + 0.25, z, a + Math.PI); }
  }
  for (const e of edges) {
    if (e.cls !== 'street' || e.noRender || e.elevated.some((v) => v)) continue;
    for (let s0 = 30; s0 < e.len - 30; s0 += 38) {
      const p = pointAt(e, s0); if (!p || hash2(Math.round(p.x), Math.round(p.z), seed + 191) > 0.07) continue;
      const sd = hash2(Math.round(p.z), Math.round(p.x), seed + 192) < 0.5 ? -1 : 1;
      for (let k = 0; k < 5; k++) { const lat = sd * (3.7 + k * 0.1), q = s0 + k * 1.6, pp = pointAt(e, q); if (!pp) continue; add('prop.traffic_cone', pp.x - pp.tz * lat, pp.y + 0.1, pp.z + pp.tx * lat, 0); }
    }
  }
  // ---- lily-pad clusters in calm shallows (lake and ponds): 0.3-2.1 m deep, sheltered by a noise mask ---------------------------------------------------------
  for (let gx = -1700; gx < -700; gx += 11) for (let gz = -1450; gz < -750; gz += 11) {
    const h1 = hash2(gx, gz, seed + 301), h2 = hash2(gx, gz, seed + 302), x = gx + h1 * 11, z = gz + h2 * 11;
    const wb = waterBodyAt(x, z); if (!wb || (wb.body !== 'lake' && wb.body !== 'pond')) continue;
    const depth = wb.level - heightAt(x, z); if (depth < 0.3 || depth > 2.1) continue;
    if (valueNoise(x / 38, z / 38, 61) < 0.46 || hash2(gx, gz, seed + 303) > 0.78) continue;
    const n = 22 + Math.floor(hash2(gx, gz, seed + 304) * 40), R = 1.8 + hash2(gx, gz, seed + 305) * 2.8;
    for (let k = 0; k < n; k++) {
      const a = hash2(gx + k, gz, seed + 306) * 6.2832, r = R * Math.sqrt(hash2(gx, gz + k, seed + 307)), px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      const wb2 = waterBodyAt(px, pz); if (!wb2 || wb2.level - heightAt(px, pz) < 0.25) continue;
      const sc = 0.55 + hash2(gx + k, gz + k, seed + 308) * 0.7, tint = Math.floor(hash2(gx - k, gz, seed + 309) * 4);
      lilies[ck(px, pz)].push(px, wb2.level + 0.025, pz, 0, sc, hash2(gx + k, gz - k, seed + 310) * 6.2832, tint); nLily++;
      if (hash2(gx - k, gz + k, seed + 311) < 0.13) { lilies[ck(px, pz)].push(px + 0.15, wb2.level + 0.03, pz, 1, 0.8 + hash2(k, gx, seed + 312) * 0.5, hash2(gx, k, seed + 313) * 6.2832, tint); nLily++; }
    }
  }
  const pack = (arr) => arr.map((a) => Float32Array.from(a));
  void LAKE;
  return { shrubs: pack(shrubs), parked: pack(parked), lilies: pack(lilies), scatterCounts: { shrubs: nShrub, parked: nParked, lilies: nLily } };
}
/** point on an edge polyline at arc length s: {x, y, z, tx, tz} (unit tangent) */
function pointAt(e, s) {
  let i = 1; while (i < e.n - 1 && e.s[i] < s) i++;
  const t = (s - e.s[i - 1]) / Math.max(1e-6, e.s[i] - e.s[i - 1]), p = e.pts;
  const dx = p[i * 3] - p[(i - 1) * 3], dz = p[i * 3 + 2] - p[(i - 1) * 3 + 2], l = Math.hypot(dx, dz);
  if (l < 1e-4) return null;
  return { x: p[(i - 1) * 3] + dx * t, y: p[(i - 1) * 3 + 1] + (p[i * 3 + 1] - p[(i - 1) * 3 + 1]) * t, z: p[(i - 1) * 3 + 2] + dz * t, tx: dx / l, tz: dz / l };
}
