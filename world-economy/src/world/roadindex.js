// Spatial index over road-edge segments (32 m cells). Pure.
const CELL = 32;
export function buildRoadIndex(edges) {
  const cells = new Map();
  const key = (cx, cz) => cx * 100003 + cz;
  const segs = [];
  for (const e of edges) {
    const p = e.pts;
    for (let i = 0; i < e.n - 1; i++) {
      const ax = p[i * 3], az = p[i * 3 + 2], bx = p[i * 3 + 3], bz = p[i * 3 + 5];
      const pad = e.halfRow + 2;
      const x0 = Math.floor((Math.min(ax, bx) - pad) / CELL), x1 = Math.floor((Math.max(ax, bx) + pad) / CELL);
      const z0 = Math.floor((Math.min(az, bz) - pad) / CELL), z1 = Math.floor((Math.max(az, bz) + pad) / CELL);
      const id = segs.length;
      segs.push({ e, i });
      for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
        const k = key(cx, cz);
        let arr = cells.get(k);
        if (!arr) { arr = []; cells.set(k, arr); }
        arr.push(id);
      }
    }
  }
  const tmp = { x: 0, z: 0, t: 0, d2: 0 };
  /** closest segment; filter(edge) optional. Returns {edge,i,t,d,x,z,y} or null */
  function nearest(x, z, maxD = 200, filter = null) {
    // expand search by rings of cells until found within maxD
    const cx0 = Math.floor(x / CELL), cz0 = Math.floor(z / CELL);
    const R = Math.ceil(maxD / CELL);
    let best = null, bd = maxD * maxD;
    for (let r = 0; r <= R; r++) {
      for (let cx = cx0 - r; cx <= cx0 + r; cx++) for (let cz = cz0 - r; cz <= cz0 + r; cz++) {
        if (r > 0 && Math.abs(cx - cx0) !== r && Math.abs(cz - cz0) !== r) continue;
        const arr = cells.get(key(cx, cz));
        if (!arr) continue;
        for (const id of arr) {
          const s = segs[id];
          if (filter && !filter(s.e)) continue;
          const p = s.e.pts, i = s.i;
          const ax = p[i * 3], az = p[i * 3 + 2], bx = p[i * 3 + 3], bz = p[i * 3 + 5];
          const dx = bx - ax, dz = bz - az;
          const l2 = dx * dx + dz * dz;
          let t = l2 > 0 ? ((x - ax) * dx + (z - az) * dz) / l2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = ax + dx * t, qz = az + dz * t;
          const d2 = (x - qx) * (x - qx) + (z - qz) * (z - qz);
          if (d2 < bd) { bd = d2; best = { edge: s.e, i, t, x: qx, z: qz, y: p[i * 3 + 1] + (p[i * 3 + 4] - p[i * 3 + 1]) * t }; }
        }
      }
      if (best && Math.sqrt(bd) <= (r) * CELL) break;
    }
    if (best) best.d = Math.sqrt(bd);
    return best;
  }
  /** min over nearby segments of (distance - halfRow) -> negative means inside a right-of-way. */
  function clearance(x, z, includeElevated = true) {
    const arr = cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    let best = 1e9;
    if (!arr) return best;
    for (const id of arr) {
      const s = segs[id];
      if (!includeElevated && s.e.elevated[s.i]) continue;
      const p = s.e.pts, i = s.i;
      const ax = p[i * 3], az = p[i * 3 + 2], bx = p[i * 3 + 3], bz = p[i * 3 + 5];
      const dx = bx - ax, dz = bz - az;
      const l2 = dx * dx + dz * dz;
      let t = l2 > 0 ? ((x - ax) * dx + (z - az) * dz) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = ax + dx * t, qz = az + dz * t;
      const d = Math.sqrt((x - qx) * (x - qx) + (z - qz) * (z - qz)) - s.e.halfRow;
      if (d < best) best = d;
    }
    return best;
  }
  /** all segments whose padded bbox touches the cell of (x,z) */
  function near(x, z) { const arr = cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL))); return arr ? arr.map((id) => segs[id]) : []; }
  return { nearest, clearance, near, segs };
}
