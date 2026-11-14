// Decoration placements (Annex A 6.5, MASTER_SPEC 9.1 "S3 may add decoration placements"): street furniture along the road
// graph (lamps, traffic lights, benches, bins, hydrants, meters, bike docks, kiosks, mailboxes, shelters, manholes, utility
// poles), dock dressing, campsites, the logging yard, mossy boulders along forest roads, plus light definitions (lamp heads and
// fires) for the renderer's light pool. Pure and seeded; visual only (no colliders), so routes and gameplay are unchanged.
import { hash2 } from '../../core/rng.js';
import { regionAt, districtAt } from './regions.js';
import { waterBodyAt } from './water.js';

const NC = 40;
const ck = (x, z) => Math.min(NC - 1, Math.max(0, Math.floor((z + 2000) / 100))) * NC + Math.min(NC - 1, Math.max(0, Math.floor((x + 2000) / 100)));
const CITY_CLS = new Set(['street', 'boulevard', 'bridgest', 'local']);

export function generateDecor({ edges, nodes, placements, pois, heightAt, infra, seed = 1 }) {
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
  return { items, byChunk, lamps, fires };
}
