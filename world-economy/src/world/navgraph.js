// Navigation graphs (drive, walk, boat) and route queries. Pure.
import { waterBodyAt } from './layout/water.js';

class MinHeap {
  constructor() { this.a = []; }
  push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

/** points of an edge between arc distances s0..s1 (either direction), as [x,y,z] arrays */
function slice(edge, s0, s1, out) {
  const p = edge.pts, rev = s1 < s0;
  const lo = Math.min(s0, s1), hi = Math.max(s0, s1);
  const seg = [];
  const at = (s) => {
    let a = 0, b = edge.n - 1;
    while (b - a > 1) { const m = (a + b) >> 1; if (edge.s[m] <= s) a = m; else b = m; }
    const L = edge.s[b] - edge.s[a], t = L > 0 ? (s - edge.s[a]) / L : 0;
    return [p[a * 3] + (p[b * 3] - p[a * 3]) * t, p[a * 3 + 1] + (p[b * 3 + 1] - p[a * 3 + 1]) * t, p[a * 3 + 2] + (p[b * 3 + 2] - p[a * 3 + 2]) * t];
  };
  seg.push(at(lo));
  for (let i = 0; i < edge.n; i++) if (edge.s[i] > lo + 0.01 && edge.s[i] < hi - 0.01) seg.push([p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]);
  seg.push(at(hi));
  if (rev) seg.reverse();
  for (const q of seg) out.push(q);
}

export function createNav({ edges, nodes, roadIndex }) {
  const adj = { drive: new Map(), walk: new Map() };
  for (const [id] of nodes) { adj.drive.set(id, []); adj.walk.set(id, []); }
  for (const e of edges) {
    const modes = [];
    if (e.drive && !e.walkOnly) modes.push('drive');
    if (e.walk !== false) modes.push('walk');
    for (const m of modes) { adj[m].get(e.a).push({ e, to: e.b, fwd: true }); if (e.a !== e.b) adj[m].get(e.b).push({ e, to: e.a, fwd: false }); else adj[m].get(e.a).push({ e, to: e.a, fwd: false }); }
  }
  const modeFilter = { drive: (e) => e.drive && !e.walkOnly, walk: (e) => e.walk !== false };

  function snap(mode, x, z) {
    const hit = roadIndex.nearest(x, z, 600, modeFilter[mode]);
    return hit;
  }

  /** returns {points:[x,y,z][], length, snapStart, snapEnd, edges:[ids]} or null */
  function route(mode, ax, az, bx, bz, groundY = null) {
    const s = snap(mode, ax, az), t = snap(mode, bx, bz);
    if (!s || !t) return null;
    const es = s.edge, et = t.edge;
    const sS = es.s[s.i] + (es.s[s.i + 1] - es.s[s.i]) * s.t, sT = et.s[t.i] + (et.s[t.i + 1] - et.s[t.i]) * t.t;
    const out = [];
    const usedEdges = [];
    if (es === et) {
      slice(es, sS, sT, out); usedEdges.push(es.id);
    } else {
      // multi-source dijkstra from the two end nodes of the start edge to the two end nodes of the target edge
      const dist = new Map(), prev = new Map();
      const heap = new MinHeap();
      const start = (id, d) => { if (d < (dist.get(id) ?? Infinity)) { dist.set(id, d); prev.set(id, null); heap.push(d, id); } };
      start(es.a, sS); if (es.b !== es.a) start(es.b, es.len - sS);
      const goalA = et.a, goalB = et.b;
      let best = Infinity, bestGoal = null;
      while (heap.size) {
        const [d, id] = heap.pop();
        if (d > (dist.get(id) ?? Infinity)) continue;
        if (d >= best) break;
        if (id === goalA) { const tot = d + sT; if (tot < best) { best = tot; bestGoal = goalA; } }
        if (id === goalB) { const tot = d + (et.len - sT); if (tot < best) { best = tot; bestGoal = goalB; } }
        for (const nb of adj[mode].get(id)) {
          const nd = d + nb.e.len;
          if (nd < (dist.get(nb.to) ?? Infinity)) { dist.set(nb.to, nd); prev.set(nb.to, { from: id, e: nb.e, fwd: nb.fwd }); heap.push(nd, nb.to); }
        }
      }
      if (bestGoal === null) return null;
      // reconstruct
      const chain = [];
      let cur = bestGoal;
      while (prev.get(cur)) { const pv = prev.get(cur); chain.push(pv); cur = pv.from; }
      chain.reverse();
      const startNode = cur;
      slice(es, sS, startNode === es.a ? 0 : es.len, out); usedEdges.push(es.id);
      for (const c of chain) { slice(c.e, c.fwd ? 0 : c.e.len, c.fwd ? c.e.len : 0, out); usedEdges.push(c.e.id); }
      slice(et, bestGoal === et.a ? 0 : et.len, sT, out); usedEdges.push(et.id);
    }
    // dedupe consecutive identical points and add endpoints
    const pts = [];
    const push = (q) => { const l = pts[pts.length - 1]; if (!l || Math.abs(l[0] - q[0]) + Math.abs(l[2] - q[2]) > 0.05) pts.push(q); };
    push([ax, groundY ? groundY(ax, az) : s.y, az]);
    for (const q of out) push(q);
    push([bx, groundY ? groundY(bx, bz) : t.y, bz]);
    let length = 0;
    for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
    return { points: pts, length, snapStart: s.d, snapEnd: t.d, edges: usedEdges };
  }
  return { route, snap, adj };
}

// ---- boat graph ------------------------------------------------------------------------------------------------------------------------
export function createBoatNav({ waterDepth, waypoints }) {
  // waypoints: [{id, x, z, body}] ; edges auto-created between mutually visible waypoints
  const nodes = waypoints.map((w) => ({ ...w, nbrs: [] }));
  const clear = (ax, az, bx, bz, minDepth = 1.4) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.ceil(L / 6));
    for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; if (waterDepth(x, z) < minDepth) return false; }
    return true;
  };
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j];
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d > 900) continue;
    if (clear(a.x, a.z, b.x, b.z)) { a.nbrs.push({ n: b, d }); b.nbrs.push({ n: a, d }); }
  }
  function nearest(x, z) {
    let best = null, bd = Infinity;
    for (const n of nodes) { const d = Math.hypot(n.x - x, n.z - z); if (d < bd && (clear(x, z, n.x, n.z, 0.6) || d < 6)) { bd = d; best = n; } }
    if (!best) for (const n of nodes) { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = n; } }
    return best;
  }
  function route(ax, az, bx, bz, groundY) {
    const s = nearest(ax, az), t = nearest(bx, bz);
    if (!s || !t) return null;
    const dist = new Map([[s, 0]]), prev = new Map();
    const heap = new MinHeap(); heap.push(0, s);
    while (heap.size) {
      const [d, n] = heap.pop();
      if (d > dist.get(n)) continue;
      if (n === t) break;
      for (const nb of n.nbrs) { const nd = d + nb.d; if (nd < (dist.get(nb.n) ?? Infinity)) { dist.set(nb.n, nd); prev.set(nb.n, n); heap.push(nd, nb.n); } }
    }
    if (!dist.has(t)) return null;
    const chain = [];
    for (let n = t; n; n = prev.get(n)) chain.push(n);
    chain.reverse();
    const pts = [[ax, groundY(ax, az), az], ...chain.map((n) => [n.x, 0, n.z]), [bx, groundY(bx, bz), bz]];
    let length = 0; for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
    return { points: pts, length, ids: chain.map((n) => n.id) };
  }
  return { route, nodes, nearest };
}
export { waterBodyAt };
