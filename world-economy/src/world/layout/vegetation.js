// Tree scatter (Annex A 8): deterministic seeded jittered grid with biome masks. Pure. Output is a CSR-by-chunk typed-array set.
import { hash2 } from '../../core/rng.js';
import { regionAt } from './regions.js';
import { waterBodyAt } from './water.js';
import { edgeSegments } from './roads.js';

export const TREE_TYPES = ['veg.pine_a', 'veg.pine_b', 'veg.spruce_a', 'veg.oak_a', 'veg.maple_a', 'veg.street_tree', 'veg.palm_a', 'veg.palm_b'];
const T = { PINE_A: 0, PINE_B: 1, SPRUCE: 2, OAK: 3, MAPLE: 4, STREET: 5, PALM_A: 6, PALM_B: 7 };

export function generateTrees({ heightAt, roadIndex, placer, pois, edges, seed = 1, nodes }) {
  const xs = [], zs = [], ys = [], types = [], scales = [], rots = [];
  const counts = { forest: 0, lake: 0, city: 0, ocean: 0, palms: 0 };
  const poiClear = [];
  for (const p of pois) {
    const r = p.data.clear || (p.data.building || p.data.auto ? 22 : p.data.dock ? 16 : 8);
    if (p.data.water && !p.data.building) continue;
    poiClear.push([p.pos[0], p.pos[2], r * r]);
  }
  const nearPoi = (x, z) => { for (const q of poiClear) { const dx = x - q[0], dz = z - q[1]; if (dx * dx + dz * dz < q[2]) return true; } return false; };
  const isNodeNear = (x, z) => { for (const n of nodes.values()) { const dx = x - n.x, dz = z - n.z; if (dx * dx + dz * dz < 196) return true; } return false; };

  function ok(x, z, margin) {
    if (Math.abs(x) > 1960 || Math.abs(z) > 1960) return false;
    if (roadIndex.clearance(x, z, true) < margin) return false;
    if (waterBodyAt(x, z)) return false;
    if (nearPoi(x, z)) return false;
    if (placer.overlapsExisting({ cx: x, cz: z, w: 3, d: 3, yaw: 0 }, 2.5)) return false;
    return true;
  }
  function push(x, z, type, scale, rot) {
    const y = heightAt(x, z);
    if (y < 0.4) return false;
    xs.push(x); zs.push(z); ys.push(y); types.push(type); scales.push(scale); rots.push(rot);
    return true;
  }

  // ---- natural cover on a jittered grid ---------------------------------------------------------------------------------------
  const S = 11;
  for (let gx = -2000; gx < 2000; gx += S) for (let gz = -2000; gz < 2000; gz += S) {
    const h1 = hash2(gx, gz, seed + 1), h2 = hash2(gx, gz, seed + 2), h3 = hash2(gx, gz, seed + 3), h4 = hash2(gx, gz, seed + 4);
    const x = gx + h1 * S, z = gz + h2 * S;
    const region = regionAt(x, z);
    let d = 0, kind = 'conifer';
    if (region === 'forest') d = z < -900 ? 0.97 : 0.62;
    else if (region === 'lake') { d = 0.4; if (z > -400) d = 0.27; }
    else if (region === 'ocean') {
      const dxp = x + 1650, dzp = z - 1130;
      const pc = Math.sqrt(dxp * dxp + dzp * dzp);
      if (pc < 330) { d = 0.55 * Math.max(0, 1 - pc / 330) + 0.12; kind = 'palm'; }
      else if (x < -420 && z > 450) { d = 0.06; kind = 'broad'; }
    } else if (region === 'city') {
      if (x > 1500) { d = 0.5; kind = 'conifer'; }
      else if (z < -400) d = 0.4;
    }
    if (d <= 0 || h3 > d) continue;
    const y0 = heightAt(x, z);
    if (y0 > 230) continue;
    if (!ok(x, z, 3)) continue;
    // slope mask
    const sx = heightAt(x + 4, z) - heightAt(x - 4, z), sz = heightAt(x, z + 4) - heightAt(x, z - 4);
    if (Math.hypot(sx, sz) / 8 > 0.7) continue;
    let type, scale = 0.8 + h4 * 0.55;
    if (kind === 'palm') { type = h4 < 0.5 ? T.PALM_A : T.PALM_B; counts.palms++; counts.ocean++; }
    else if (kind === 'broad') { type = h4 < 0.5 ? T.OAK : T.MAPLE; counts.ocean++; }
    else {
      const u = hash2(gx, gz, seed + 5);
      if (region === 'lake' && u < 0.28) type = T.OAK;
      else if (region === 'forest' && u < 0.1) type = T.OAK;
      else type = u < 0.5 ? T.PINE_A : u < 0.8 ? T.PINE_B : T.SPRUCE;
      if (region === 'lake') counts.lake++; else if (region === 'forest') counts.forest++; else counts.city++;
    }
    push(x, z, type, scale, h1 * 6.28);
  }

  // ---- city street trees: avenues, streets and boulevard medians ----------------------------------------------------------------------
  for (const e of edges) {
    if (!(e.cls === 'street' || e.cls === 'boulevard' || e.cls === 'bridgest')) continue;
    if (e.elevated.some((v) => v)) continue;
    const step = e.cls === 'boulevard' ? 12 : 26;
    const sides = e.cls === 'boulevard' ? [0, -1, 1] : [-1, 1];
    for (let s = step / 2; s < e.len; s += step) {
      // locate the point on the polyline
      let i = 1; while (i < e.n - 1 && e.s[i] < s) i++;
      const t = (s - e.s[i - 1]) / Math.max(1e-6, e.s[i] - e.s[i - 1]);
      const px = e.pts[(i - 1) * 3] + (e.pts[i * 3] - e.pts[(i - 1) * 3]) * t, pz = e.pts[(i - 1) * 3 + 2] + (e.pts[i * 3 + 2] - e.pts[(i - 1) * 3 + 2]) * t;
      const dx = e.pts[i * 3] - e.pts[(i - 1) * 3], dz = e.pts[i * 3 + 2] - e.pts[(i - 1) * 3 + 2], l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l;
      for (const side of sides) {
        const lat = side === 0 ? 0 : side * (e.halfRow - 2.2);
        const x = px + nx * lat, z = pz + nz * lat;
        if (side !== 0 && hash2(Math.round(x), Math.round(z), seed + 9) > 0.62) continue;
        if (isNodeNear(x, z)) continue;
        if (Math.abs(x) > 1960 || Math.abs(z) > 1960 || waterBodyAt(x, z)) continue;
        if (placer.overlapsExisting({ cx: x, cz: z, w: 2, d: 2, yaw: 0 }, 0.5)) continue;
        // keep clear of other roads' carriageways (intersections)
        const nr = roadIndex.nearest(x, z, 30, (o) => o !== e);
        if (nr && nr.d - nr.edge.halfRow < 1.5) continue;
        if (push(x, z, T.STREET, 0.85 + hash2(Math.round(x), Math.round(z), seed + 11) * 0.35, 0)) counts.city++;
      }
    }
  }
  // Founders Park: blue-noise-ish scatter inside blocks B(6,5), B(6,6)
  for (let gx = 686; gx < 814; gx += 9) for (let gz = 256; gz < 444; gz += 9) {
    const x = gx + hash2(gx, gz, seed + 21) * 8, z = gz + hash2(gx, gz, seed + 22) * 8;
    if (hash2(gx, gz, seed + 23) > 0.55) continue;
    if (Math.abs(z - 350) < 11) continue; // Grant St promenade
    if (Math.abs(x - 750) < 5 && Math.abs(z - 350) < 30) continue;
    if (roadIndex.clearance(x, z, true) < 4) continue;
    if (push(x, z, hash2(gx, gz, seed + 24) < 0.5 ? T.OAK : T.MAPLE, 0.9 + hash2(gx, gz, seed + 25) * 0.4, 0)) counts.city++;
  }

  const n = xs.length;
  const data = {
    count: n, x: Float32Array.from(xs), z: Float32Array.from(zs), y: Float32Array.from(ys), type: Uint8Array.from(types),
    scale: Float32Array.from(scales), rot: Float32Array.from(rots), counts,
  };
  // CSR index by chunk
  const NC = 40;
  const cnt = new Uint32Array(NC * NC + 1);
  const chunkOf = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    const cx = Math.min(NC - 1, Math.max(0, Math.floor((data.x[i] + 2000) / 100))), cz = Math.min(NC - 1, Math.max(0, Math.floor((data.z[i] + 2000) / 100)));
    chunkOf[i] = cz * NC + cx; cnt[chunkOf[i] + 1]++;
  }
  for (let c = 0; c < NC * NC; c++) cnt[c + 1] += cnt[c];
  const order = new Uint32Array(n), fill = cnt.slice(0, NC * NC);
  for (let i = 0; i < n; i++) order[fill[chunkOf[i]]++] = i;
  data.chunkStart = cnt; data.order = order;
  return data;
}
export { edgeSegments };
