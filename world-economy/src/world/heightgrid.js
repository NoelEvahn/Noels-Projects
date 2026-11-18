// HeightGrid (Annex B 2): 4 m cache, 1001 x 1001 Float32, bilinear, plus analytic detail noise outside flattened areas.
import { terrainPre, detailNoise } from './layout/terrain.js';
import { reliefAt, dryMask, dryHeight } from './layout/relief.js';
import { CREEKS } from './layout/water.js';
import { smoothstep } from '../core/math.js';

export const GRID_N = 1001;
export const GRID_STEP = 4;
export const GRID_MIN = -2000;

/** roadside ditch depth (m) by road class: rural and unpaved roads only (city kerbs, quays and village streets stay flat) */
const DITCH = { rural: 0.6, highway: 0.65, gravel: 0.55, loop: 0.5, dirt: 0.4, track: 0.35 };

export function createHeightGrid() {
  const data = new Float32Array(GRID_N * GRID_N);
  const flat = new Uint8Array(GRID_N * GRID_N);
  const rock = new Uint8Array(GRID_N * GRID_N); // outcrop exposure 0..255 (render: splat rock weight)
  const api = { data, flat, rock, N: GRID_N, step: GRID_STEP, min: GRID_MIN, built: false };

  /** generator: yields every `rows` rows so callers can time-slice. */
  api.build = function* (stamps, rowsPerYield = 50) {
    const { edges = [], pads = [], anchors = [] } = stamps;
    for (let j = 0; j < GRID_N; j++) {
      const z = GRID_MIN + j * GRID_STEP;
      const row = j * GRID_N;
      for (let i = 0; i < GRID_N; i++) data[row + i] = terrainPre(GRID_MIN + i * GRID_STEP, z);
      if (j % rowsPerYield === 0) yield j / GRID_N;
    }
    const bestW = new Float32Array(GRID_N * GRID_N);
    const bestY = new Float32Array(GRID_N * GRID_N);
    const bestD = new Float32Array(GRID_N * GRID_N).fill(1e9);
    const preH = Float32Array.from(data); // terrainPre values (relief altitude / water tests)
    const seed = new Uint8Array(GRID_N * GRID_N); // cells that keep relief away (elevated road corridors, creeks, POI anchors)
    const ditch = new Float32Array(GRID_N * GRID_N); // roadside ditch displacement (<= 0)
    const mark = (cx, cz, R) => {
      const i0 = Math.max(0, Math.floor((cx - R - GRID_MIN) / GRID_STEP)), i1 = Math.min(GRID_N - 1, Math.ceil((cx + R - GRID_MIN) / GRID_STEP));
      const j0 = Math.max(0, Math.floor((cz - R - GRID_MIN) / GRID_STEP)), j1 = Math.min(GRID_N - 1, Math.ceil((cz + R - GRID_MIN) / GRID_STEP));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const dx = GRID_MIN + i * GRID_STEP - cx, dz = GRID_MIN + j * GRID_STEP - cz; if (dx * dx + dz * dz <= R * R) seed[j * GRID_N + i] = 1; }
    };
    const stampCell = (idx, w, y, d) => { if (w > bestW[idx] || (w === bestW[idx] && d < bestD[idx])) { bestW[idx] = w; bestY[idx] = y; bestD[idx] = d; } };
    // road corridors: flatten to the road profile with 8 m blend shoulders
    let count = 0;
    for (const e of edges) {
      const p = e.pts;
      const inner = e.halfRow;
      const R = inner + 8;
      const dD = DITCH[e.cls] || 0, R2 = dD ? inner + 15 : R;
      for (let k = 0; k < e.n - 1; k++) {
        if (e.elevated[k] && e.elevated[k + 1]) { mark(e.pts[k * 3], e.pts[k * 3 + 2], inner + 12); continue; }
        const ax = p[k * 3], ay = p[k * 3 + 1], az = p[k * 3 + 2], bx = p[k * 3 + 3], by = p[k * 3 + 4], bz = p[k * 3 + 5];
        const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
        const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - R2 - GRID_MIN) / GRID_STEP)), i1 = Math.min(GRID_N - 1, Math.ceil((Math.max(ax, bx) + R2 - GRID_MIN) / GRID_STEP));
        const j0 = Math.max(0, Math.floor((Math.min(az, bz) - R2 - GRID_MIN) / GRID_STEP)), j1 = Math.min(GRID_N - 1, Math.ceil((Math.max(az, bz) + R2 - GRID_MIN) / GRID_STEP));
        for (let j = j0; j <= j1; j++) {
          const z = GRID_MIN + j * GRID_STEP;
          for (let i = i0; i <= i1; i++) {
            const x = GRID_MIN + i * GRID_STEP;
            let t = l2 > 0 ? ((x - ax) * dx + (z - az) * dz) / l2 : 0;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const qx = ax + dx * t - x, qz = az + dz * t - z;
            const d = Math.sqrt(qx * qx + qz * qz);
            if (d > R2) continue;
            if (dD && d > inner + 1.5) { const q = (d - inner - 5.4) / 2.5, v = -dD * Math.exp(-q * q); if (v < ditch[j * GRID_N + i]) ditch[j * GRID_N + i] = v; }
            if (d > R) continue;
            const w = d <= inner ? 1 : 1 - smoothstep(0, 8, d - inner);
            stampCell(j * GRID_N + i, w, ay + (by - ay) * t, d);
          }
        }
        if (++count % 400 === 0) yield 1;
      }
    }
    // POI / building pads: flat rectangles with 6 m blend
    for (const pd of pads) {
      const R = 6;
      const i0 = Math.max(0, Math.floor((pd.cx - pd.hx - R - GRID_MIN) / GRID_STEP)), i1 = Math.min(GRID_N - 1, Math.ceil((pd.cx + pd.hx + R - GRID_MIN) / GRID_STEP));
      const j0 = Math.max(0, Math.floor((pd.cz - pd.hz - R - GRID_MIN) / GRID_STEP)), j1 = Math.min(GRID_N - 1, Math.ceil((pd.cz + pd.hz + R - GRID_MIN) / GRID_STEP));
      for (let j = j0; j <= j1; j++) {
        const z = GRID_MIN + j * GRID_STEP;
        for (let i = i0; i <= i1; i++) {
          const x = GRID_MIN + i * GRID_STEP;
          const ox = Math.max(0, Math.abs(x - pd.cx) - pd.hx), oz = Math.max(0, Math.abs(z - pd.cz) - pd.hz);
          const d = Math.sqrt(ox * ox + oz * oz);
          if (d > R) continue;
          stampCell(j * GRID_N + i, (d <= 0 ? 1 : 1 - smoothstep(0, R, d)) * 0.98, pd.y, d + 100);
        }
      }
    }
    // creeks (decorative ribbons that follow the terrain), POI anchors: keep relief away
    for (const id in CREEKS) { const pts = CREEKS[id].pts; for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1]; const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 6); for (let q = 0; q <= n; q++) mark(ax + (bx - ax) * q / n, az + (bz - az) * q / n, 12); } }
    for (const a of anchors) mark(a.x, a.z, a.r);
    for (let idx = 0; idx < data.length; idx++) {
      const w = bestW[idx];
      if (w > 0) data[idx] += (bestY[idx] - data[idx]) * w;
      flat[idx] = Math.min(255, Math.round(w * 255));
    }
    yield 1;
    // distance (m, chamfer 4 / 5.66 per cell) from stamped corridors, pads and anchors: relief fades in from 0 to 14 m away
    const dist = new Float32Array(GRID_N * GRID_N);
    for (let idx = 0; idx < dist.length; idx++) dist[idx] = bestW[idx] > 0.02 || seed[idx] ? 0 : 1e4;
    const D1 = GRID_STEP, D2 = GRID_STEP * 1.4142;
    for (let j = 0; j < GRID_N; j++) for (let i = 0; i < GRID_N; i++) {
      const k = j * GRID_N + i; let d = dist[k];
      if (i > 0 && dist[k - 1] + D1 < d) d = dist[k - 1] + D1;
      if (j > 0) {
        if (dist[k - GRID_N] + D1 < d) d = dist[k - GRID_N] + D1;
        if (i > 0 && dist[k - GRID_N - 1] + D2 < d) d = dist[k - GRID_N - 1] + D2;
        if (i < GRID_N - 1 && dist[k - GRID_N + 1] + D2 < d) d = dist[k - GRID_N + 1] + D2;
      }
      dist[k] = d;
    }
    for (let j = GRID_N - 1; j >= 0; j--) for (let i = GRID_N - 1; i >= 0; i--) {
      const k = j * GRID_N + i; let d = dist[k];
      if (i < GRID_N - 1 && dist[k + 1] + D1 < d) d = dist[k + 1] + D1;
      if (j < GRID_N - 1) {
        if (dist[k + GRID_N] + D1 < d) d = dist[k + GRID_N] + D1;
        if (i < GRID_N - 1 && dist[k + GRID_N + 1] + D2 < d) d = dist[k + GRID_N + 1] + D2;
        if (i > 0 && dist[k + GRID_N - 1] + D2 < d) d = dist[k + GRID_N - 1] + D2;
      }
      dist[k] = d;
    }
    yield 1;
    // relief is smooth (features >= 8 m), so it is evaluated on an 8 m lattice and interpolated to the 4 m cells
    const LN = (GRID_N + 1) >> 1;
    const rel = new Float32Array(LN * LN), relRock = new Float32Array(LN * LN);
    for (let lj = 0; lj < LN; lj++) {
      const j = lj * 2, z = GRID_MIN + j * GRID_STEP;
      for (let li = 0; li < LN; li++) {
        const i = li * 2, k = j * GRID_N + i;
        if (preH[k] < 0.5) continue;
        if (dist[k] <= 2 && (i === 0 || dist[k - 1] <= 2) && (i >= GRID_N - 1 || dist[k + 1] <= 2) && (j === 0 || dist[k - GRID_N] <= 2) && (j >= GRID_N - 1 || dist[k + GRID_N] <= 2)) continue;
        rel[lj * LN + li] = reliefAt(GRID_MIN + i * GRID_STEP, z, preH[k]); relRock[lj * LN + li] = reliefAt.rock;
      }
      if (lj % 40 === 0) yield 1;
    }
    const lat = (arr, i, j) => { // bilinear sample of a lattice array at 4 m cell (i, j)
      const li = i >> 1, lj = j >> 1, ox = i & 1, oz = j & 1;
      const li2 = Math.min(LN - 1, li + ox), lj2 = Math.min(LN - 1, lj + oz);
      return (arr[lj * LN + li] + arr[lj * LN + li2] + arr[lj2 * LN + li] + arr[lj2 * LN + li2]) * 0.25;
    };
    for (let j = 0; j < GRID_N; j++) {
      const z = GRID_MIN + j * GRID_STEP;
      for (let i = 0; i < GRID_N; i++) {
        const k = j * GRID_N + i, pre = preH[k];
        if (pre < 0.5) continue;
        const x = GRID_MIN + i * GRID_STEP;
        const w1 = 1 - bestW[k];
        const dm = dryMask(x, z, pre);
        if (dm <= 0) continue;
        if (ditch[k] < 0) data[k] += ditch[k] * w1 * dm;
        const md = smoothstep(0, 14, dist[k]) * dm;
        if (md <= 0.002) continue;
        let rv = lat(rel, i, j);
        if (rv < 0) { const room = dryHeight(x, z, pre) - 0.3; rv = rv > -0.7 * room ? rv : -0.7 * room; } // hollows never reach a water surface
        data[k] += rv * md * w1;
        rock[k] = Math.round(Math.min(1, lat(relRock, i, j)) * md * 255);
      }
      if (j % 80 === 0) yield 1;
    }
    api.built = true;
    yield 1;
  };

  /** raw bilinear grid value (no detail noise) */
  api.sampleGrid = function (x, z) {
    let fx = (x - GRID_MIN) / GRID_STEP, fz = (z - GRID_MIN) / GRID_STEP;
    fx = fx < 0 ? 0 : fx > GRID_N - 1.001 ? GRID_N - 1.001 : fx;
    fz = fz < 0 ? 0 : fz > GRID_N - 1.001 ? GRID_N - 1.001 : fz;
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const k = j * GRID_N + i;
    const a = data[k], b = data[k + 1], c = data[k + GRID_N], d = data[k + GRID_N + 1];
    return { v: (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * tz, k };
  };
  api.heightAt = function (x, z) {
    let fx = (x - GRID_MIN) / GRID_STEP, fz = (z - GRID_MIN) / GRID_STEP;
    fx = fx < 0 ? 0 : fx > GRID_N - 1.001 ? GRID_N - 1.001 : fx;
    fz = fz < 0 ? 0 : fz > GRID_N - 1.001 ? GRID_N - 1.001 : fz;
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const k = j * GRID_N + i;
    const a = data[k], b = data[k + 1], c = data[k + GRID_N], d = data[k + GRID_N + 1];
    const v = (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * tz;
    const fl = (flat[k] + flat[k + 1] + flat[k + GRID_N] + flat[k + GRID_N + 1]) * (1 / 1020);
    // detail noise only above the waterline and away from stamped areas
    const wet = v < 0.3 ? 0 : 1;
    return v + detailNoise(x, z) * (1 - fl) * wet;
  };
  return api;
}
