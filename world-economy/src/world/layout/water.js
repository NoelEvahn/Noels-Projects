// Water bodies (Annex B 3). Geometry only; depth comes from the height grid in world/query.js. Pure.
import { clamp, smoothstep, fbm } from '../../core/math.js';
import { coastZ } from './regions.js';

export const SEA_LEVEL = 0;

// ---- shared Gerstner set (shader + boat physics) -------------------------------------------------------------
export const GERSTNER = {
  dirsDeg: [200, 170, 225, 140],
  wavelengths: [38, 21, 11, 6],
  amplitudes: [0.35, 0.18, 0.08, 0.04],
  steepness: 0.5,
};
const G_DIRS = GERSTNER.dirsDeg.map((d) => [Math.cos(d * Math.PI / 180), Math.sin(d * Math.PI / 180)]);
const G_K = GERSTNER.wavelengths.map((l) => (2 * Math.PI) / l);
const G_W = G_K.map((k) => Math.sqrt(9.81 * k));
/** weatherFactor scales the amplitude (0.15 .. 1.2 / base); calm zones multiply by 0.2. */
export function gerstnerHeight(x, z, t, weatherFactor = 1) {
  let h = 0;
  for (let i = 0; i < 4; i++) {
    const d = G_DIRS[i];
    h += GERSTNER.amplitudes[i] * weatherFactor * Math.sin(G_K[i] * (d[0] * x + d[1] * z) - G_W[i] * t);
  }
  return h;
}
export function gerstnerSlope(x, z, t, weatherFactor, out) {
  let sx = 0, sz = 0;
  for (let i = 0; i < 4; i++) {
    const d = G_DIRS[i];
    const c = GERSTNER.amplitudes[i] * weatherFactor * G_K[i] * Math.cos(G_K[i] * (d[0] * x + d[1] * z) - G_W[i] * t);
    sx += c * d[0]; sz += c * d[1];
  }
  out[0] = sx; out[1] = sz;
}

// ---- calm zones (harbour and marina basins) ------------------------------------------------------------------
export function calmFactor(x, z) {
  const inHarbour = smoothstep(-1140, -1100, x) * smoothstep(-660, -700, x) * smoothstep(1130, 1160, z);
  const inMarina = smoothstep(-1400, -1370, x) * smoothstep(-1120, -1150, x) * smoothstep(1120, 1150, z) * smoothstep(1480, 1440, z);
  const f = Math.max(inHarbour, inMarina);
  return 1 - 0.8 * f;
}

// ---- coastline -----------------------------------------------------------------------------------------------
export const PALM_COVE = { cx: -1650, cz: 1330, r: 200 };
export const GULL_ROCK = { cx: -1750, cz: 1650, r: 70 };

/** effective coastline z (quay lines straighten the natural curve). */
export function coastEff(x) {
  const c = coastZ(x);
  const wCity = smoothstep(-330, -250, x) * smoothstep(1180, 1100, x);
  const wPort = smoothstep(-1160, -1120, x) * smoothstep(-660, -700, x);
  let z = c + (1100 - c) * wCity;
  z = z + (1140 - z) * wPort;
  return z;
}
/** signed land distance: >0 land, <0 sea (metres, approximate). */
export function shoreD(x, z) {
  const dc = coastEff(x) - z;
  const dx = x - PALM_COVE.cx, dz = z - PALM_COVE.cz;
  const dp = Math.sqrt(dx * dx + dz * dz) - PALM_COVE.r;
  return Math.min(dc, dp);
}
/** weight of the straight quay profile (deeper water at the wall) */
export function quayWeight(x) { return smoothstep(-1400, -1360, x) * smoothstep(1160, 1120, x); }

// ---- river (Ash River) ---------------------------------------------------------------------------------------
export const RIVER = { z0: -330, z1: 1250 };
export const riverX = (z) => -350 + 25 * Math.sin(z / 260);
export const riverHalfWidth = (z) => 30 + 30 * smoothstep(-130, -70, z);
export const riverDepth = (z) => 3 + 5 * smoothstep(-300, 1000, z);
/** returns lateral distance to the channel centre, normalised later by caller; null outside z range cap */
export function riverMetrics(x, z) {
  let zc = z;
  let lat;
  if (z < RIVER.z0) { const dx = x - riverX(RIVER.z0); const dz = z - RIVER.z0; lat = Math.sqrt(dx * dx + dz * dz); zc = RIVER.z0; }
  else if (z > RIVER.z1) { lat = 1e9; }
  else lat = Math.abs(x - riverX(z));
  return { lat, hw: riverHalfWidth(zc), depth: riverDepth(zc) };
}

// ---- lake (Mirror Lake) --------------------------------------------------------------------------------------
export const LAKE = { cx: -1200, cz: -1100, a: 430, b: 320, level: 40, maxDepth: 18 };
const LAKE_BAYS = [
  { cx: -1480, cz: -1340, r: 70 }, // Reed Bay (north-west)
  { cx: -905, cz: -805, r: 65 },   // Boathouse Bay (south-east)
  { cx: -795, cz: -1085, r: 45 },  // Pinehaven village docks
];
/** normalised radius: <1 inside the lake outline */
export function lakeR(x, z) {
  const dx = (x - LAKE.cx) / LAKE.a, dz = (z - LAKE.cz) / LAKE.b;
  let r = Math.sqrt(dx * dx + dz * dz);
  if (r < 2) r *= 1 + 0.06 * fbm(x / 260, z / 260, 2, 7);
  for (const b of LAKE_BAYS) {
    const ex = x - b.cx, ez = z - b.cz;
    r = Math.min(r, Math.sqrt(ex * ex + ez * ez) / b.r);
  }
  return r;
}

// ---- ponds ---------------------------------------------------------------------------------------------------
export const PONDS = {
  'water.pond.heron': { cx: -420, cz: -1300, r: 80, level: 55, depth: 3, bank: 45 },
  'water.pond.reed': { cx: -1500, cz: -480, r: 60, level: 30, depth: 2, bank: 50 },
};

// ---- creeks (decorative ribbons that follow terrain) ----------------------------------------------------------
export const CREEKS = {
  'water.creek.mill': { width: 5, pts: [[-860, -830], [-780, -760], [-700, -690], [-640, -620], [-570, -560], [-500, -480], [-430, -400], [-370, -340]] },
  'water.creek.inlet': { width: 4, pts: [[-1900, -1150], [-1820, -1148], [-1740, -1152], [-1670, -1150], [-1640, -1150]] },
};

/** Geometry-only water body test. Returns {body, level} or null. Ocean/river share level 0. */
export function waterBodyAt(x, z) {
  const lr = lakeR(x, z);
  if (lr < 1) return { body: 'lake', level: LAKE.level };
  for (const id in PONDS) {
    const p = PONDS[id];
    const dx = x - p.cx, dz = z - p.cz;
    if (dx * dx + dz * dz < p.r * p.r) return { body: 'pond', level: p.level, id };
  }
  const rm = riverMetrics(x, z);
  if (rm.lat < rm.hw && z < 1100) return { body: 'river', level: 0 };
  if (shoreD(x, z) < 0) return { body: 'ocean', level: 0 };
  if (rm.lat < rm.hw) return { body: 'ocean', level: 0 };
  return null;
}
export function inWaterGeom(x, z, margin = 0) {
  if (waterBodyAt(x, z)) return true;
  if (margin <= 0) return false;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    if (waterBodyAt(x + Math.cos(a) * margin, z + Math.sin(a) * margin)) return true;
  }
  return false;
}
export const waterClamp = clamp;
