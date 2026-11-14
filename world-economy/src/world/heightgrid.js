// HeightGrid (Annex B 2): 4 m cache, 1001 x 1001 Float32, bilinear, plus analytic detail noise outside flattened areas.
import { terrainPre, detailNoise } from './layout/terrain.js';
import { smoothstep } from '../core/math.js';

export const GRID_N = 1001;
export const GRID_STEP = 4;
export const GRID_MIN = -2000;

export function createHeightGrid() {
  const data = new Float32Array(GRID_N * GRID_N);
  const flat = new Uint8Array(GRID_N * GRID_N);
  const api = { data, flat, N: GRID_N, step: GRID_STEP, min: GRID_MIN, built: false };

  /** generator: yields every `rows` rows so callers can time-slice. */
  api.build = function* (stamps, rowsPerYield = 50) {
    const { edges = [], pads = [] } = stamps;
    for (let j = 0; j < GRID_N; j++) {
      const z = GRID_MIN + j * GRID_STEP;
      const row = j * GRID_N;
      for (let i = 0; i < GRID_N; i++) data[row + i] = terrainPre(GRID_MIN + i * GRID_STEP, z);
      if (j % rowsPerYield === 0) yield j / GRID_N;
    }
    const bestW = new Float32Array(GRID_N * GRID_N);
    const bestY = new Float32Array(GRID_N * GRID_N);
    const bestD = new Float32Array(GRID_N * GRID_N).fill(1e9);
    const stampCell = (idx, w, y, d) => { if (w > bestW[idx] || (w === bestW[idx] && d < bestD[idx])) { bestW[idx] = w; bestY[idx] = y; bestD[idx] = d; } };
    // road corridors: flatten to the road profile with 8 m blend shoulders
    let count = 0;
    for (const e of edges) {
      const p = e.pts;
      const inner = e.halfRow;
      const R = inner + 8;
      for (let k = 0; k < e.n - 1; k++) {
        if (e.elevated[k] && e.elevated[k + 1]) continue;
        const ax = p[k * 3], ay = p[k * 3 + 1], az = p[k * 3 + 2], bx = p[k * 3 + 3], by = p[k * 3 + 4], bz = p[k * 3 + 5];
        const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
        const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - R - GRID_MIN) / GRID_STEP)), i1 = Math.min(GRID_N - 1, Math.ceil((Math.max(ax, bx) + R - GRID_MIN) / GRID_STEP));
        const j0 = Math.max(0, Math.floor((Math.min(az, bz) - R - GRID_MIN) / GRID_STEP)), j1 = Math.min(GRID_N - 1, Math.ceil((Math.max(az, bz) + R - GRID_MIN) / GRID_STEP));
        for (let j = j0; j <= j1; j++) {
          const z = GRID_MIN + j * GRID_STEP;
          for (let i = i0; i <= i1; i++) {
            const x = GRID_MIN + i * GRID_STEP;
            let t = l2 > 0 ? ((x - ax) * dx + (z - az) * dz) / l2 : 0;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const qx = ax + dx * t - x, qz = az + dz * t - z;
            const d = Math.sqrt(qx * qx + qz * qz);
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
    for (let idx = 0; idx < data.length; idx++) {
      const w = bestW[idx];
      if (w > 0) data[idx] += (bestY[idx] - data[idx]) * w;
      flat[idx] = Math.min(255, Math.round(w * 255));
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
