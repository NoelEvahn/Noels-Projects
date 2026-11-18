// Terrain relief (Terrain Relief pass): rolling hills, ridges, hollows, mounds, rock outcrops, beach dunes, lake-bank rims and
// roadside ditches. Pure and deterministic. This is a displacement layered ON TOP of terrainPre (which roads and building lots
// still follow), applied by world/heightgrid.js only where no road, pad, dock, POI or water edge needs flat ground:
//   final = stamped + relief * (1 - stampWeight) * maskDistance * maskDry * maskAnchors
import { smoothstep as S, fbm, valueNoise } from '../../core/math.js';
import { hash2 } from '../../core/rng.js';
import { quayWeight, shoreD, lakeParts, LAKE, PONDS } from './water.js';

const _lp = {};

/** regional amplitude weights (all smooth in x, z): city plateau, lake district, forest, eastern slopes */
export function regionWeights(x, z, out) {
  const north = S(-330, -480, z);
  const fx = S(-250, 150, x);
  const west = S(-380, -480, x);
  const east = S(1450, 1800, x);
  const forest = north * fx;
  const lake = Math.min(1, north * (1 - fx) + west * (1 - north));
  const city = Math.max(0, 1 - Math.max(forest, lake, east));
  out.city = city; out.lake = lake; out.forest = forest; out.east = east;
  return out;
}
const _rw = {};

/** sum of jittered gaussian-ish mounds (and some hollows) on a cell lattice; value roughly -0.5 .. 1.2 */
function mounds(x, z, cell, seed, prob, rMin, rMax) {
  const ci = Math.floor(x / cell), cj = Math.floor(z / cell);
  let v = 0;
  for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
    if (hash2(i, j, seed) > prob) continue;
    const cx = (i + 0.12 + 0.76 * hash2(i, j, seed + 1)) * cell, cz = (j + 0.12 + 0.76 * hash2(i, j, seed + 2)) * cell;
    const r = rMin + (rMax - rMin) * hash2(i, j, seed + 3);
    const dx = x - cx, dz = z - cz;
    // elongate each mound along a hashed direction so they read as drumlins / swells, not pimples
    const a = hash2(i, j, seed + 6) * 3.14159, ca = Math.cos(a), sa = Math.sin(a);
    const u = (dx * ca + dz * sa) / (r * 1.35), w = (-dx * sa + dz * ca) / (r * 0.8);
    const d2 = u * u + w * w;
    if (d2 >= 1) continue;
    const k = 1 - d2;
    const sgn = hash2(i, j, seed + 4) < 0.3 ? -0.6 : 1;
    v += k * k * sgn * (0.45 + 0.55 * hash2(i, j, seed + 5));
  }
  return v;
}

/** rock outcrops: returns height in metres; out.w = 0..1 exposure weight (splat rock) */
export function outcropAt(x, z, out, rw) {
  const elig = rw.lake * 0.75 + rw.forest * 1.0 + rw.east * 1.0;
  out.w = 0;
  if (elig < 0.05) return 0;
  const cell = 56, ci = Math.floor(x / cell), cj = Math.floor(z / cell);
  let hgt = 0, wgt = 0;
  for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
    if (hash2(i, j, 777) > 0.3 * elig) continue;
    const cx = (i + 0.2 + 0.6 * hash2(i, j, 778)) * cell, cz = (j + 0.2 + 0.6 * hash2(i, j, 779)) * cell;
    const r = 6 + 9 * hash2(i, j, 780), H = 1.6 + 3.2 * hash2(i, j, 781);
    const a = hash2(i, j, 782) * 3.14159, ca = Math.cos(a), sa = Math.sin(a);
    const dx = x - cx, dz = z - cz;
    // blocky footprint: super-ellipse (|u|^2.6 + |w|^2.6), so edges are steep and the top is a rough shelf
    const u = Math.abs(dx * ca + dz * sa) / (r * 1.25), w = Math.abs(-dx * sa + dz * ca) / (r * 0.8);
    const d = Math.pow(Math.pow(u, 2.6) + Math.pow(w, 2.6), 1 / 2.6);
    if (d >= 1) continue;
    const k = 1 - d;
    const shelf = S(0, 0.5, k);
    const rough = valueNoise(x / 6, z / 6, 785) * 0.6 + valueNoise(x / 3.2, z / 3.2, 786) * 0.4;
    hgt += H * shelf * (0.65 + 0.7 * rough);
    wgt = Math.max(wgt, S(0.0, 0.3, k));
  }
  out.w = wgt;
  return hgt;
}
const _oc = {};

/**
 * Raw relief displacement in metres (before masks). hPre = terrainPre height (used for altitude scaling and dune zone).
 * Negative values are allowed (hollows, swales).
 */
export function reliefAt(x, z, hPre) {
  const rw = regionWeights(x, z, _rw);
  const park = S(130, 50, Math.hypot(x - 750, z - 350));
  const roll = (3.0 + 3.5 * park) * rw.city + 5.2 * rw.lake + 8.0 * rw.forest + 5.5 * rw.east;
  const mAmp = 0.55 * rw.city + 0.8 * rw.lake + 1.0 * rw.forest + 0.9 * rw.east;
  const rdg = 0.5 * rw.city + 2.8 * rw.lake + 5.0 * rw.forest + 2.6 * rw.east;
  let v = 0;
  // rolling swells
  v += roll * (0.75 * fbm(x / 52, z / 52, 3, 301) + 0.55 * fbm(x / 140 + 9, z / 140 - 4, 2, 302));
  // ridges (crest lines) and hollows (valley lines) from two noise iso-lines
  if (rdg > 0.05) {
    const n1 = valueNoise(x / 84 + 3, z / 84 + 11, 303) * 0.7 + valueNoise(x / 37, z / 37, 304) * 0.3;
    const r1 = 1 - Math.abs(2 * n1 - 1);
    v += rdg * (Math.pow(r1, 2.6) - 0.22);
    const n2 = valueNoise(x / 66 - 5, z / 66 + 2, 305) * 0.75 + valueNoise(x / 29, z / 29, 306) * 0.25;
    const r2 = 1 - Math.abs(2 * n2 - 1);
    v -= rdg * 0.55 * Math.pow(r2, 3.2);
  }
  // knolls, swells and hollows
  v += mAmp * 2.0 * mounds(x, z, 40, 321, 0.6, 9, 17);
  // rock outcrops
  const oh = outcropAt(x, z, _oc, rw);
  v += oh; reliefAt.rock = _oc.w;
  // beach dunes: ridges parallel to the shore on the natural (non-quay) beaches
  const qw = quayWeight(x);
  if (qw < 0.95 && hPre > 1.2 && hPre < 14 && z > 700) {
    const d = shoreD(x, z);
    if (d > 6 && d < 280) {
      const k = S(10, 40, d) * S(280, 150, d) * (1 - qw);
      const ph = d / 34 + 0.55 * fbm(x / 70, z / 70, 2, 331) + 0.2 * valueNoise(x / 25, z / 25, 332);
      const crest = Math.pow(0.5 + 0.5 * Math.sin(ph * 6.28318), 1.7);
      const lat = 0.55 + 0.45 * valueNoise(x / 55 + 2, z / 55, 333);
      v += k * lat * (1.7 * crest - 0.5) + k * 0.5 * mounds(x, z, 22, 335, 0.4, 4, 8);
    }
  }
  // lake banks: the shore rises into a wooded rim 40-120 m back from the water
  if (z < -500 && x < -300 && x > -1900) {
    lakeParts(x, z, _lp);
    const lr = _lp.r;
    if (lr > 1.02 && lr < 2.1) {
      const rim = S(1.04, 1.26, lr) * S(2.1, 1.5, lr);
      v += rim * (2.2 + 4.2 * (0.5 + 0.5 * fbm(x / 80, z / 80, 2, 341)));
    }
  }
  return v;
}

/** height of the terrain above the nearest relevant water surface (sea level, lake or pond level) */
export function dryHeight(x, z, hPre) { return hPre - waterLevelNear(x, z); }
function waterLevelNear(x, z) {
  lakeParts(x, z, _lp);
  if (_lp.r < 2.2) return LAKE.level;
  for (const id in PONDS) {
    const p = PONDS[id], dx = x - p.cx, dz = z - p.cz, lim = p.r + p.bank + 30;
    if (dx * dx + dz * dz < lim * lim) return p.level;
  }
  return 0;
}

/** relief multiplier from water edges: 0 within 0.5 m of a surface (water boundary stays exactly where it was), 1 from 2.8 m up */
export function dryMask(x, z, hPre) {
  if (hPre < 0.5) return 0;
  return S(0.5, 2.8, hPre - waterLevelNear(x, z));
}
