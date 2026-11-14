// Terrain base profile (Annex B 2). Pure. Stamps (roads, pads) are applied in world/heightgrid.js.
import { smoothstep as S, fbm, valueNoise } from '../../core/math.js';
import { shoreD, quayWeight, coastEff, GULL_ROCK, LAKE, lakeR, PONDS, riverMetrics, RIVER } from './water.js';

const mix = (a, b, t) => a + (b - a) * t;

function westH(x, z) { return 3 + 24 * S(-420, -950, x) + 5 * fbm(x / 170, z / 170, 2, 11); }

function cityH(x, z) {
  let h = 8 + 6 * S(-150, -350, z);
  h += 2 * fbm(x / 190, z / 190, 2, 5) * S(780, 860, x) * S(1560, 1440, x) * S(-200, -100, z);
  h += 28 * S(1400, 1850, x) + 45 * S(1850, 2050, x);
  return h;
}

function ramp(z) {
  const t = Math.min(1, Math.max(0, (-350 - z) / 550));
  return 14 + 30 * (0.5 * t + 0.5 * S(0, 1, t));
}

function forestH(z) {
  const d = Math.max(0, -900 - z);
  return d < 600 ? 44 + 76 * (d / 600) : 120 + 80 * (d - 600) / 400;
}

function northH(x, z) {
  const blendX = S(-250, 150, x);
  const wFar = S(-860, -940, z);
  const lakeH0 = 44;
  const far = mix(lakeH0, forestH(z), blendX);
  let h = mix(ramp(z), far, wFar);
  const rimW = 70 * S(-1750, -2000, x);
  const rimN = 70 * S(-1550, -2000, z) * (1 - blendX) * wFar;
  const hillAmp = 4 + wFar * mix(6, 22, S(0, 500, x));
  h += rimW + rimN + hillAmp * fbm(x / 240, z / 240, 3, 13);
  return h;
}

/** land profile + coast + seabed + island; no inland water carving. */
export function baseRaw(x, z) {
  const hSouth = mix(westH(x, z), cityH(x, z), S(-420, -300, x));
  let h = mix(hSouth, northH(x, z), S(-250, -450, z));
  const d = shoreD(x, z);
  if (d >= 0) {
    const qw = quayWeight(x);
    const h0 = 2 + 0.5 * qw;
    if (d < 250) h = Math.min(h, h0 + (8 - h0) * S(0, 250, d));
  } else {
    const nd = -d;
    const beach = 2 - 3.5 * S(0, 70, nd) - 33.5 * S(70, 850, nd);
    const quay = 2.5 - 9 * S(0, 6, nd) - 29 * S(6, 850, nd);
    const qw = quayWeight(x);
    h = mix(beach, quay, qw) + 0.4 * fbm(x / 60, z / 60, 2, 21);
  }
  // Gull Rock island
  const gx = x - GULL_ROCK.cx, gz = z - GULL_ROCK.cz;
  const gr = Math.sqrt(gx * gx + gz * gz) / GULL_ROCK.r;
  if (gr < 1.5) h = Math.max(h, 10 - 30 * S(0.15, 1.4, gr) + 1.5 * fbm(x / 20, z / 20, 2, 33));
  return h;
}

/** base terrain with lake, pond and river basins stamped (everything the road profiles may follow). */
export function terrainPre(x, z) {
  let h = baseRaw(x, z);
  // lake
  const lr = lakeR(x, z);
  if (lr < 1.06) {
    if (lr < 1) h = LAKE.level - LAKE.maxDepth * S(1, 0.4, lr);
    else h = mix(LAKE.level, Math.max(h, LAKE.level + 0.2), S(1, 1.06, lr));
  }
  // ponds (raised mounds so the pond holds its level)
  for (const id in PONDS) {
    const p = PONDS[id];
    const dx = x - p.cx, dz = z - p.cz;
    const r = Math.sqrt(dx * dx + dz * dz) / p.r;
    const outer = 1 + p.bank / p.r;
    if (r < outer) {
      if (r < 1) h = p.level - p.depth * S(1, 0.4, r);
      else h = mix(p.level, h, S(1, outer, r));
    }
  }
  // river channel
  if (z > RIVER.z0 - 80 && z < RIVER.z1) {
    const m = riverMetrics(x, z);
    if (m.lat < m.hw + 24) {
      const l = m.lat / m.hw;
      if (l < 1) h = Math.min(h, -m.depth * S(1, 0.55, l));
      else h = mix(h < 0 ? h : 0, h, S(1, 1 + 24 / m.hw, l));
    }
  }
  return h;
}

export function detailNoise(x, z) { return 0.4 * (valueNoise(x / 7, z / 7, 91) * 0.65 + valueNoise(x / 2.7, z / 2.7, 92) * 0.35); }
export { coastEff };
