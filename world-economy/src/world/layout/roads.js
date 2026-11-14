// Road graph (Annex B 5). Pure. Builds nodes + edges with sampled polylines and elevation profiles.
import { terrainPre } from './terrain.js';
import { districtAt } from './regions.js';
import { catmull, segClosest } from '../../core/math.js';

export const AVE_X = Array.from({ length: 10 }, (_, i) => -160 + 140 * i);
export const ST_Z = Array.from({ length: 13 }, (_, j) => -250 + 100 * j);
export const AVE_NAMES = ['River St', '1st Ave', '2nd Ave', '3rd Ave', 'Central Ave', '5th Ave', '6th Ave', '7th Ave', '8th Ave', '9th Ave'];
export const ST_NAMES = ['Ash St', 'Birch St', 'Cedar St', 'Dover St', 'Elm St', 'Foundry St', 'Grant St', 'Harbor Blvd', 'Iron St', 'Jetty St', 'Keel St', 'Lumber St', 'Quay Rd'];
export const gid = (i, j) => `g${i}_${j}`;

/** lanes: lateral offsets (m) of travel-lane centrelines from the road centreline. */
export const ROAD_CLASSES = {
  street:    { carriage: 12, row: 20, walk: 4, speed: 14, surface: 'surf.asphalt', lanes: [-1.75, 1.75], grade: 0.08 },
  boulevard: { carriage: 25, row: 35, walk: 5, speed: 17, surface: 'surf.asphalt', lanes: [-10.75, -7.25, -3.75, 3.75, 7.25, 10.75], grade: 0.08 },
  bridgest:  { carriage: 14, row: 22, walk: 4, speed: 14, surface: 'surf.asphalt', lanes: [-5.25, -1.75, 1.75, 5.25], grade: 0.08 },
  harlan:    { carriage: 14, row: 22, walk: 4, speed: 17, surface: 'surf.asphalt', lanes: [-5.25, -1.75, 1.75, 5.25], grade: 0.06 },
  rural:     { carriage: 8, row: 12, walk: 0, speed: 20, surface: 'surf.asphalt', lanes: [-2, 2], grade: 0.08 },
  highway:   { carriage: 14, row: 18, walk: 0, speed: 25, surface: 'surf.asphalt', lanes: [-5.25, -1.75, 1.75, 5.25], grade: 0.06 },
  loop:      { carriage: 6, row: 10, walk: 0, speed: 12, surface: 'surf.gravel', lanes: [-1.5, 1.5], grade: 0.08 },
  gravel:    { carriage: 6, row: 10, walk: 0, speed: 14, surface: 'surf.gravel', lanes: [-1.5, 1.5], grade: 0.08 },
  dirt:      { carriage: 4, row: 8, walk: 0, speed: 10, surface: 'surf.dirt', lanes: [-1, 1], grade: 0.10 },
  local:     { carriage: 7, row: 12, walk: 2, speed: 10, surface: 'surf.asphalt', lanes: [-1.75, 1.75], grade: 0.08 },
  track:     { carriage: 4, row: 8, walk: 0, speed: 8, surface: 'surf.dirt', lanes: [-1, 1], grade: 0.10 },
  path:      { carriage: 2, row: 4, walk: 0, speed: 0, surface: 'surf.gravel', lanes: [], grade: 0.12 },
};

/** Free-form roads. ctrl items: 'nodeId' | [x,z] free control | [x,z,'nodeId'] free control that is also a node. */
const SPLINES = [
  { id: 'r.bridge', bridges: true, name: 'Harlan Bridge', cls: 'harlan', ctrl: ['n.bridge.touch', [-60, 300], [-250, 300], [-450, 300], 'n.harlan.west'],
    pins: [[-250, 300, 26], [-450, 300, 26], [-160, 300, 21.6]], grade: 0.06, straight: true },
  { id: 'r.coast', name: 'Coast Highway', cls: 'rural', ctrl: ['n.harlan.west', [-760, 620], [-800, 900], 'n.portcalder', [-1000, 1048], [-1100, 1056, 'n.coast.pcw'], [-1150, 1060, 'n.coast.marina'], [-1380, 1040, 'n.seagrass'], [-1600, 1060, 'n.palmcove.parking']] },
  { id: 'r.lake', name: 'Lake Road', cls: 'rural', ctrl: ['n.harlan.west', [-690, 0], [-660, -250, 'n.lake.mill'], [-640, -520], [-650, -800], 'n.pinehaven'] },
  { id: 'r.mill', bridges: true, name: 'Mill Bridge Road', cls: 'rural', ctrl: [gid(0, 0), [-250, -250], [-450, -250], 'n.lake.mill'], pins: [[-250, -250, 10], [-350, -250, 10], [-450, -250, 10]], straight: true },
  { id: 'r.lakeloop', name: 'Lakeshore Loop', cls: 'loop', ctrl: ['n.pinehaven.sq', [-900, -740], [-1250, -730], [-1560, -800], [-1700, -1050], [-1640, -1380], [-1200, -1480, 'n.lakeloop.n'], [-860, -1400], 'n.pinehaven.sq'], closed: false },
  { id: 'r.pine.main', name: 'Pinehaven Main St', cls: 'local', ctrl: ['n.pinehaven', 'n.pinehaven.sq'], straight: true },
  { id: 'r.oldforest', name: 'Old Forest Road', cls: 'rural', ctrl: ['n.pinehaven', [-420, -1180], [-200, -1150], [0, -960], [200, -760], 'n.forest.gate'], grade: 0.08 },
  { id: 'r.north', name: 'North Road', cls: 'rural', ctrl: ['n.forest.gate', [540, -460], [540, -350, 'n.north.exit'], gid(5, 0)] },
  { id: 'r.timber', name: 'Timber Road', cls: 'gravel', ctrl: ['n.forest.gate', 'n.sawmill', [900, -1100, 'n.tower.junction'], 'n.timber.yard'] },
  { id: 'r.spur.a', name: 'Logging Spur A', cls: 'dirt', ctrl: ['n.timber.yard', [1230, -1380], 'n.stand.a'] },
  { id: 'r.spur.b', name: 'Logging Spur B', cls: 'dirt', ctrl: ['n.timber.yard', [1050, -1400], 'n.stand.b'] },
  { id: 'r.spur.c', name: 'Logging Spur C', cls: 'dirt', ctrl: ['n.timber.yard', [1300, -1200], 'n.stand.c'] },
  { id: 'r.tower', name: 'Fire Tower Track', cls: 'dirt', ctrl: ['n.tower.junction', [820, -1400], 'n.firetower'] },
  { id: 'r.causeway', bridges: true, name: 'Harbor Causeway', cls: 'rural', ctrl: [gid(0, 12), [-250, 1000], [-450, 1000], 'n.calder.terminal', [-760, 1067, 'n.cause.pce'], 'n.portcalder'], pins: [[-250, 1000, 7], [-350, 1000, 7], [-450, 1000, 7]] },
  { id: 'r.east', name: 'East Highway', cls: 'highway', ctrl: [gid(9, 7), [1500, 420], 'n.east.tunnel'], grade: 0.075 },
  { id: 'r.eastside', name: 'Eastside Loop', cls: 'street', ctrl: [gid(9, 3), [1200, 58], [1290, 70, 'n.es.a'], [1380, 80], [1396, 200, 'n.es.b'], [1400, 350], [1250, 300, 'n.es.c'], gid(9, 5)] },
  { id: 'r.es.cds1', name: 'Eastside Court A', cls: 'local', ctrl: ['n.es.a', [1290, -10]], straight: true, deadEnd: true },
  { id: 'r.es.cds2', name: 'Eastside Court B', cls: 'local', ctrl: ['n.es.b', [1478, 205]], straight: true, deadEnd: true },
  { id: 'r.es.cds3', name: 'Eastside Court C', cls: 'local', ctrl: ['n.es.c', [1250, 385]], straight: true, deadEnd: true },
  { id: 'r.pc.harbor', name: 'Harbour Road', cls: 'local', ctrl: [[-1100, 1112, 'n.pc.w'], [-900, 1112, 'n.pc.c'], [-725, 1112, 'n.pc.e']], straight: true },
  { id: 'r.pc.mid', name: 'Calder Street', cls: 'local', ctrl: ['n.portcalder', 'n.pc.c'], straight: true },
  { id: 'r.pc.west', name: 'Net Loft Lane', cls: 'local', ctrl: ['n.coast.pcw', 'n.pc.w'], straight: true },
  { id: 'r.pc.east', name: 'Terminal Lane', cls: 'local', ctrl: ['n.cause.pce', 'n.pc.e'], straight: true },
  { id: 'r.marina.link', name: 'Marina Way', cls: 'local', ctrl: ['n.coast.marina', [-1170, 1090], [-1205, 1108, 'n.marina']] },
];

/** Extra named nodes: [id, x, z, yOverride?]. Grid nodes (gI_J) are generated. */
const NODES = [
  ['n.bridge.touch', 120, 300], ['n.bridge.3rd', 260, 300], ['n.bridge.central', 400, 300], ['n.footbridge', 400, 200],
  ['n.harlan.west', -700, 300, 18],
  ['n.pinehaven', -670, -1005], ['n.pinehaven.sq', -700, -1080],
  ['n.forest.gate', 520, -620], ['n.sawmill', 700, -900], ['n.timber.yard', 1150, -1300],
  ['n.stand.a', 1300, -1450], ['n.stand.b', 950, -1500], ['n.stand.c', 1450, -1100], ['n.firetower', 800, -1650],
  ['n.portcalder', -900, 1040], ['n.calder.terminal', -640, 1090], ['n.east.tunnel', 1900, 350],
];

export function buildRoads(ground = terrainPre) {
  const nodes = new Map();
  const edges = [];
  const addNode = (id, x, z, y) => {
    if (nodes.has(id)) return nodes.get(id);
    const n = { id, x, z, y, fixed: y !== undefined, edges: [] };
    nodes.set(id, n);
    return n;
  };
  for (let i = 0; i < 10; i++) for (let j = 0; j < 13; j++) addNode(gid(i, j), AVE_X[i], ST_Z[j], ground(AVE_X[i], ST_Z[j]));
  for (const [id, x, z, y] of NODES) addNode(id, x, z, y !== undefined ? y : (id.startsWith('n.bridge') || id === 'n.footbridge') ? ground(x, z) : undefined);

  // ---- sample + profile helper -------------------------------------------------------------------------------
  function sampleControls(ctrl, straight) {
    // returns {xs, zs, ctrlIdx[]} with ~8 m spacing
    const P = ctrl.map((c) => (typeof c === 'string' ? [nodes.get(c).x, nodes.get(c).z] : [c[0], c[1]]));
    const xs = [], zs = [], idx = [];
    for (let k = 0; k < P.length - 1; k++) {
      const p1 = P[k], p2 = P[k + 1];
      const p0 = P[Math.max(0, k - 1)], p3 = P[Math.min(P.length - 1, k + 2)];
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const n = Math.max(1, Math.ceil(len / 8));
      for (let s = 0; s < n; s++) {
        const t = s / n;
        if (s === 0) idx.push(xs.length);
        if (straight) { xs.push(p1[0] + (p2[0] - p1[0]) * t); zs.push(p1[1] + (p2[1] - p1[1]) * t); }
        else { xs.push(catmull(p0[0], p1[0], p2[0], p3[0], t)); zs.push(catmull(p0[1], p1[1], p2[1], p3[1], t)); }
      }
    }
    idx.push(xs.length);
    xs.push(P[P.length - 1][0]); zs.push(P[P.length - 1][1]);
    return { xs, zs, idx };
  }

  function profile(xs, zs, pinsIdx, grade) {
    const n = xs.length;
    const s = new Float64Array(n);
    for (let i = 1; i < n; i++) s[i] = s[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
    const g = new Float64Array(n);
    for (let i = 0; i < n; i++) g[i] = ground(xs[i], zs[i]);
    const y = new Float64Array(n);
    const W = 6;
    for (let i = 0; i < n; i++) {
      let a = 0, c = 0;
      for (let k = Math.max(0, i - W); k <= Math.min(n - 1, i + W); k++) { a += g[k]; c++; }
      y[i] = a / c;
    }
    const pinned = new Uint8Array(n);
    for (const [i, py] of pinsIdx) { y[i] = py; pinned[i] = 1; }
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 1; i < n; i++) { if (pinned[i]) continue; const d = grade * (s[i] - s[i - 1]); y[i] = Math.min(y[i - 1] + d, Math.max(y[i - 1] - d, y[i])); }
      for (let i = n - 2; i >= 0; i--) { if (pinned[i]) continue; const d = grade * (s[i + 1] - s[i]); y[i] = Math.min(y[i + 1] + d, Math.max(y[i + 1] - d, y[i])); }
    }
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < n - 1; i++) { if (pinned[i]) continue; y[i] = 0.25 * y[i - 1] + 0.5 * y[i] + 0.25 * y[i + 1]; }
    }
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < n; i++) { if (pinned[i]) continue; const d = grade * (s[i] - s[i - 1]); y[i] = Math.min(y[i - 1] + d, Math.max(y[i - 1] - d, y[i])); }
      for (let i = n - 2; i >= 0; i--) { if (pinned[i]) continue; const d = grade * (s[i + 1] - s[i]); y[i] = Math.min(y[i + 1] + d, Math.max(y[i + 1] - d, y[i])); }
    }
    return { y, s, g };
  }

  function makeEdge(id, name, cls, aId, bId, xs, zs, ys, gs, extra = {}) {
    const n = xs.length;
    const pts = new Float32Array(n * 3);
    const cum = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pts[i * 3] = xs[i]; pts[i * 3 + 1] = ys[i]; pts[i * 3 + 2] = zs[i];
      if (i > 0) cum[i] = cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
    }
    const C = ROAD_CLASSES[cls];
    const elevated = new Uint8Array(n);
    for (let i = 0; i < n; i++) elevated[i] = ((gs[i] < -0.3 && ys[i] - gs[i] > 1.5) || (extra.bridges && ys[i] - gs[i] > 3.0)) ? 1 : 0;
    // dilate by 1 sample and drop runs shorter than 3 samples
    const el2 = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (elevated[i]) { el2[Math.max(0, i - 1)] = 1; el2[i] = 1; el2[Math.min(n - 1, i + 1)] = 1; }
    const spans = [];
    for (let i = 0; i < n; ) {
      if (!el2[i]) { i++; continue; }
      let j = i; while (j + 1 < n && el2[j + 1]) j++;
      if (j - i >= 2) spans.push([i, j]);
      i = j + 1;
    }
    const flagged = new Uint8Array(n);
    for (const [i0, j0] of spans) for (let k = i0; k <= j0; k++) flagged[k] = 1;
    let overWater = false;
    for (const [i0, j0] of spans) for (let k = i0; k <= j0; k++) if (gs[k] < -0.3) overWater = true;
    const e = {
      id, name, cls, a: aId, b: bId, pts, s: cum, n, len: cum[n - 1], carriage: C.carriage, row: C.row, halfRow: C.row / 2,
      walkW: C.walk, speed: C.speed, surface: C.surface, laneOffsets: C.lanes, elevated: flagged, spans, overWater,
      drive: cls !== 'path', walk: true, g: Float32Array.from(gs), extra, ...extra,
    };
    edges.push(e);
    nodes.get(aId).edges.push(e); if (bId !== aId) nodes.get(bId).edges.push(e);
    return e;
  }

  // ---- city grid ---------------------------------------------------------------------------------------------
  const extraOnAve = { 2: [[300, 'n.bridge.touch']], 3: [[300, 'n.bridge.3rd']], 4: [[200, 'n.footbridge'], [300, 'n.bridge.central']] };
  function addGridLine(chain, cls, nameBase, extraProps = (a, b) => ({})) {
    for (let k = 0; k < chain.length - 1; k++) {
      const A = nodes.get(chain[k]), B = nodes.get(chain[k + 1]);
      const ds = Math.hypot(B.x - A.x, B.z - A.z);
      const m = Math.max(1, Math.ceil(ds / 10));
      const xs = [], zs = [];
      for (let q = 0; q <= m; q++) { xs.push(A.x + (B.x - A.x) * q / m); zs.push(A.z + (B.z - A.z) * q / m); }
      const pr = profile(xs, zs, [[0, A.y], [m, B.y]], ROAD_CLASSES[cls].grade);
      makeEdge(`e.${nameBase}.${k}`, nameBase, cls, A.id, B.id, xs, zs, pr.y, pr.g, extraProps(A, B));
    }
  }
  const cobbleAt = (A, B) => {
    const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
    return mx < 120 && districtAt(mx, mz) === 'city.oldtown';
  };
  for (let i = 0; i < 10; i++) {
    const list = [];
    for (let j = 0; j < 13; j++) list.push([ST_Z[j], gid(i, j)]);
    for (const [zz, id] of (extraOnAve[i] || [])) list.push([zz, id]);
    list.sort((p, q) => p[0] - q[0]);
    const cls = i === 4 ? 'boulevard' : 'street';
    addGridLine(list.map((p) => p[1]), cls, AVE_NAMES[i], (A, B) => ({ surface: cobbleAt(A, B) ? 'surf.cobble' : undefined }));
  }
  for (let j = 0; j < 13; j++) {
    const chain = [];
    for (let i = 0; i < 10; i++) chain.push(gid(i, j));
    const cls = j === 7 ? 'boulevard' : 'street';
    addGridLine(chain, cls, ST_NAMES[j], (A, B) => {
      const o = { surface: cobbleAt(A, B) ? 'surf.cobble' : undefined };
      if (j === 6 && A.x === 680 && B.x === 820) { o.drive = false; o.walkOnly = true; }
      return o;
    });
  }
  // Bridge St (z = 300): 2nd Ave -> 3rd Ave -> Central Ave
  addGridLine(['n.bridge.touch', 'n.bridge.3rd', 'n.bridge.central'], 'bridgest', 'Bridge St');
  for (const e of edges) if (e.surface === undefined) { e.surface = ROAD_CLASSES[e.cls].surface; }

  // ---- spline roads ------------------------------------------------------------------------------------------
  for (const R of SPLINES) {
    // register free-node controls first
    const ctrl = R.ctrl.map((c, k) => {
      if (typeof c === 'string') return c;
      if (c.length === 3) { addNode(c[2], c[0], c[1]); return c[2]; }
      if (k === R.ctrl.length - 1 || k === 0) { const id = `n.${R.id}.${k === 0 ? 'start' : 'end'}`; addNode(id, c[0], c[1]); return id; }
      return [c[0], c[1]];
    });
    const { xs, zs, idx } = sampleControls(ctrl, !!R.straight);
    const pins = [];
    const first = nodes.get(typeof ctrl[0] === 'string' ? ctrl[0] : null);
    // pin every node control to its node elevation
    ctrl.forEach((c, k) => { if (typeof c === 'string' && nodes.get(c).fixed) pins.push([idx[k], nodes.get(c).y]); });
    for (const [px, pz, py] of (R.pins || [])) {
      let bi = 0, bd = 1e18;
      for (let i = 0; i < xs.length; i++) { const d = (xs[i] - px) ** 2 + (zs[i] - pz) ** 2; if (d < bd) { bd = d; bi = i; } }
      pins.push([bi, py]);
    }
    void first;
    const pr = profile(xs, zs, pins, R.grade || ROAD_CLASSES[R.cls].grade);
    // free nodes take their elevation from this road's profile
    ctrl.forEach((c, k) => { if (typeof c === 'string') { const nd = nodes.get(c); if (!nd.fixed) { nd.y = pr.y[idx[k]]; nd.fixed = true; } } });
    // cut into edges at node controls
    const cuts = [];
    ctrl.forEach((c, k) => { if (typeof c === 'string') cuts.push([k, idx[k], c]); });
    if (cuts.length < 2) throw new Error('road ' + R.id + ' needs >= 2 nodes');
    for (let m = 0; m < cuts.length - 1; m++) {
      const i0 = cuts[m][1], i1 = cuts[m + 1][1];
      const sl = (a) => Array.from(a).slice(i0, i1 + 1);
      makeEdge(`e.${R.id}.${m}`, R.name, R.cls, cuts[m][2], cuts[m + 1][2], sl(xs), sl(zs), sl(pr.y), sl(pr.g), { roadId: R.id, deadEnd: !!R.deadEnd, bridges: !!R.bridges });
    }
  }

  // ---- editing helpers (tracks, paths, splitting) --------------------------------------------------------------------
  let splitCount = 0;
  function removeEdge(e) {
    edges.splice(edges.indexOf(e), 1);
    for (const id of [e.a, e.b]) { const n = nodes.get(id); const k = n.edges.indexOf(e); if (k >= 0) n.edges.splice(k, 1); }
  }
  /** find (or create by splitting) a node at the closest point of an edge accepted by filter. */
  function splitNearest(x, z, maxD = 80, filter = null) {
    let best = null, bd = maxD * maxD;
    for (const [id, nd] of nodes) { const d2 = (nd.x - x) ** 2 + (nd.z - z) ** 2; if (d2 < 16 && (!filter || nd.edges.some(filter))) return id; }
    const tmp = {};
    for (const e of edges) {
      if (filter && !filter(e)) continue;
      const p = e.pts;
      for (let i = 0; i < e.n - 1; i++) {
        segClosest(x, z, p[i * 3], p[i * 3 + 2], p[i * 3 + 3], p[i * 3 + 5], tmp);
        if (tmp.d2 < bd) { bd = tmp.d2; best = { e, i, t: tmp.t }; }
      }
    }
    if (!best) return null;
    const { e, i, t } = best;
    const p = e.pts;
    // snap to an end node when close
    const sAt = e.s[i] + (e.s[i + 1] - e.s[i]) * t;
    if (sAt < 5) return e.a;
    if (e.len - sAt < 5) return e.b;
    const px = p[i * 3] + (p[i * 3 + 3] - p[i * 3]) * t, py = p[i * 3 + 1] + (p[i * 3 + 4] - p[i * 3 + 1]) * t, pz = p[i * 3 + 2] + (p[i * 3 + 5] - p[i * 3 + 2]) * t;
    const nid = `n.s${++splitCount}`;
    addNode(nid, px, pz, py);
    const a = [], b = [];
    const col = (arr, k) => [p[k * 3], p[k * 3 + 1], p[k * 3 + 2], e.g[k]];
    const g0 = e.g[i] + (e.g[i + 1] - e.g[i]) * t;
    for (let k = 0; k <= i; k++) a.push(col(null, k));
    a.push([px, py, pz, g0]);
    b.push([px, py, pz, g0]);
    for (let k = i + 1; k < e.n; k++) b.push(col(null, k));
    removeEdge(e);
    const mk = (arr, id, an, bn) => makeEdge(id, e.name, e.cls, an, bn, arr.map((q) => q[0]), arr.map((q) => q[2]), arr.map((q) => q[1]), arr.map((q) => q[3]), e.extra);
    mk(a, e.id + '.a', e.a, nid);
    mk(b, e.id + '.b', nid, e.b);
    return nid;
  }
  /** straight-ish connector between two node ids or a node and a free point. cls: track|path|local */
  function addLink(id, name, cls, fromId, to, o = {}) {
    const A = nodes.get(fromId);
    let toId;
    if (typeof to === 'string') toId = to;
    else { toId = o.endId || `n.${id}.end`; addNode(toId, to[0], to[1], o.endY); }
    const B = nodes.get(toId);
    const ds = Math.hypot(B.x - A.x, B.z - A.z);
    const m = Math.max(1, Math.ceil(ds / 8));
    const xs = [], zs = [];
    const mid = o.via;
    if (mid) {
      const pts = [[A.x, A.z], ...mid, [B.x, B.z]];
      const c = sampleControls(pts.map((q) => [q[0], q[1]]), false);
      xs.push(...c.xs); zs.push(...c.zs);
    } else for (let q = 0; q <= m; q++) { xs.push(A.x + (B.x - A.x) * q / m); zs.push(A.z + (B.z - A.z) * q / m); }
    let pr;
    if (o.y !== undefined) { const n = xs.length; pr = { y: new Float64Array(n).fill(o.y), g: new Float64Array(n).fill(o.y) }; }
    else {
      const pins = [[0, A.y]];
      if (B.fixed) pins.push([xs.length - 1, B.y]);
      pr = profile(xs, zs, pins, ROAD_CLASSES[cls].grade);
    }
    if (!B.fixed) { B.y = pr.y[pr.y.length - 1]; B.fixed = true; }
    const flags = { ...o.extra };
    return makeEdge(id, name, cls, fromId, toId, xs, zs, pr.y, pr.g, flags);
  }
  return { nodes, edges, addNode, makeEdge, profile, sampleControls, splitNearest, addLink, removeEdge };
}

/** Edge polyline helpers (used by lots, colliders, nav, render) */
export function edgeSegments(edge, fn) {
  const p = edge.pts;
  for (let i = 0; i < edge.n - 1; i++) fn(i, p[i * 3], p[i * 3 + 2], p[i * 3 + 3], p[i * 3 + 5]);
}
export function pointOnEdge(edge, s, out) {
  const L = edge.len;
  s = s < 0 ? 0 : s > L ? L : s;
  let lo = 0, hi = edge.n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (edge.s[mid] <= s) lo = mid; else hi = mid; }
  const seg = edge.s[hi] - edge.s[lo];
  const t = seg > 0 ? (s - edge.s[lo]) / seg : 0;
  const p = edge.pts;
  out.x = p[lo * 3] + (p[hi * 3] - p[lo * 3]) * t;
  out.y = p[lo * 3 + 1] + (p[hi * 3 + 1] - p[lo * 3 + 1]) * t;
  out.z = p[lo * 3 + 2] + (p[hi * 3 + 2] - p[lo * 3 + 2]) * t;
  const dx = p[hi * 3] - p[lo * 3], dz = p[hi * 3 + 2] - p[lo * 3 + 2];
  const l = Math.hypot(dx, dz) || 1;
  out.dx = dx / l; out.dz = dz / l; out.i = lo; out.t = t;
  return out;
}
export { segClosest };
