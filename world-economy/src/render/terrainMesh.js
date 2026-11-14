// Blockout terrain chunks: heightfield meshes with vertex-coloured biome tint and edge skirts. Uses world/ only (no three).
import { World } from '../world/query.js';
import { GeoBuilder } from '../blockout/geo.js';
import { regionAt } from '../world/layout/regions.js';
import { hash2 } from '../core/rng.js';
import { LAKE } from '../world/layout/water.js';

const CHUNK = 100;
const C = (hex) => GeoBuilder.rgb(hex, 1);
const COL = {
  grass: C(0x6b8a4a), cityGround: C(0x8b8c84), forest: C(0x3f5b38), lakeland: C(0x56744a), sand: C(0xd9c9a0), rock: C(0x7c7a74), seabed: C(0x7d8b86), lakebed: C(0x30524c),
  riverbed: C(0x59685f), dirt: C(0x7a6a50), snow: C(0xf2f4f6), highland: C(0x5d6b57), palmland: C(0x8ea363),
};
export function terrainRgb(x, z, h, slope) {
  const reg = regionAt(x, z);
  let c;
  if (h < -0.2) c = x > -1900 && x < -250 && z < 1150 && h > -9 && Math.abs(x + 350) < 150 ? COL.riverbed : COL.seabed;
  else if (h > LAKE.level - 20 && h < LAKE.level + 0.1 && x < -700 && x > -1700 && z < -700 && z > -1500) c = COL.lakebed;
  else if (slope > 0.8) c = COL.rock;
  else if (h < 3.4 && (reg === 'ocean' || reg === 'city')) c = COL.sand;
  else if (reg === 'forest') c = h > 170 ? COL.highland : COL.forest;
  else if (reg === 'lake') c = h < 41.2 && h > 38.5 ? COL.sand : (z < -900 ? COL.lakeland : COL.grass);
  else if (reg === 'ocean') c = (x < -1400 && z > 900) ? COL.palmland : COL.grass;
  else c = x > -170 && x < 1110 && z > -260 && z < 960 ? COL.cityGround : COL.grass;
  if (!c) c = COL.seabed;
  const n = 0.93 + hash2(Math.floor(x / 6), Math.floor(z / 6), 17) * 0.14;
  return [Math.min(255, c[0] * n), Math.min(255, c[1] * n), Math.min(255, c[2] * n)];
}

/** appends the terrain of chunk (cx,cz) to g; lod 0 = 4 m cells, lod 1 = 12.5 m cells. */
export function addTerrainChunk(g, cx, cz, lod) {
  const x0 = -2000 + cx * CHUNK, z0 = -2000 + cz * CHUNK;
  const n = lod === 0 ? 25 : 8;
  const step = CHUNK / n;
  const hh = new Float32Array((n + 3) * (n + 3));
  const W2 = n + 3;
  for (let j = -1; j <= n + 1; j++) for (let i = -1; i <= n + 1; i++) hh[(j + 1) * W2 + (i + 1)] = World.heightAt(x0 + i * step, z0 + j * step);
  g._grow((n + 1) * (n + 1) + 4 * (n + 1), n * n * 6 + 4 * n * 6);
  const base = g.vn;
  const skirt = lod === 0 ? 6 : 14;
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const h = hh[(j + 1) * W2 + (i + 1)];
    const dx = (hh[(j + 1) * W2 + (i + 2)] - hh[(j + 1) * W2 + i]) / (2 * step), dz = (hh[(j + 2) * W2 + (i + 1)] - hh[j * W2 + (i + 1)]) / (2 * step);
    const l = Math.sqrt(dx * dx + 1 + dz * dz);
    const x = x0 + i * step, z = z0 + j * step;
    const rgb = terrainRgb(x, z, h, Math.hypot(dx, dz));
    g.vert(x, h, z, -dx / l, 1 / l, -dz / l, rgb[0], rgb[1], rgb[2]);
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = base + j * (n + 1) + i, b = a + 1, c = a + (n + 1), d = c + 1;
    g.tri(a, c, b); g.tri(b, c, d);
  }
  // skirts hide cracks between neighbouring LODs
  const edge = (iFn, jFn) => {
    const sk = [];
    for (let k = 0; k <= n; k++) {
      const vi = base + jFn(k) * (n + 1) + iFn(k);
      const vk = g.vert(g.pos[vi * 3], g.pos[vi * 3 + 1] - skirt, g.pos[vi * 3 + 2], g.nrm[vi * 3], g.nrm[vi * 3 + 1], g.nrm[vi * 3 + 2], g.col[vi * 3] * 0.7, g.col[vi * 3 + 1] * 0.7, g.col[vi * 3 + 2] * 0.7);
      sk.push([vi, vk]);
    }
    for (let k = 0; k < n; k++) { g.tri(sk[k][0], sk[k][1], sk[k + 1][0]); g.tri(sk[k + 1][0], sk[k][1], sk[k + 1][1]); g.tri(sk[k][0], sk[k + 1][0], sk[k][1]); g.tri(sk[k + 1][0], sk[k + 1][1], sk[k][1]); }
  };
  edge((k) => k, () => 0); edge((k) => k, () => n); edge(() => 0, (k) => k); edge(() => n, (k) => k);
}
export { COL as TERRAIN_COLORS };
