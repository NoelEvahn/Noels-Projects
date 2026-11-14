// World construction pipeline (generator, time-sliceable). Pure. Produces the data model behind world/query.js.
import { terrainPre } from './layout/terrain.js';
import { buildRoads } from './layout/roads.js';
import { PATHS } from './layout/paths.js';
import { buildPoiDefs } from './layout/pois.js';
import { buildRoadIndex } from './roadindex.js';
import { createPlacer, fillCityBlocks, obbCorners } from './layout/lots.js';
import { createHeightGrid } from './heightgrid.js';
import { buildInfra } from './layout/infra.js';
import { generateTrees } from './layout/vegetation.js';
import { createColliderSet } from './colliders.js';
import { createNav, createBoatNav } from './navgraph.js';
import { createRng } from '../core/rng.js';
import { yawOf } from '../core/math.js';
import { waterBodyAt, LAKE, lakeR, PONDS, riverX, shoreD } from './layout/water.js';
import { regionAt, districtAt } from './layout/regions.js';
import { ARCHETYPES } from './archetypes.js';

const PI = Math.PI;

export function* buildWorld(seed = 1) {
  const W = { seed, warnings: [] };
  const rng = createRng((seed ^ 0x5eed1) >>> 0);
  yield 'roads';
  const R = buildRoads(terrainPre);
  W.R = R;
  const edgesRef = R.edges;
  const poiDefs = buildPoiDefs();

  // ---- access tracks to POIs that are far from any road ----------------------------------------------------------------------------
  const idx0 = buildRoadIndex(edgesRef);
  let trackN = 0;
  for (const p of poiDefs) {
    const d = p.data;
    if (d.noAccess || d.water || d.building || p.tags.includes('boatonly')) continue;
    const [x, , z] = p.pos;
    const hit = idx0.nearest(x, z, 600, (e) => e.cls !== 'path');
    if (!hit) continue;
    if (hit.d - hit.edge.halfRow > 18) {
      const from = R.splitNearest(hit.x, hit.z, 20, (e) => e.cls !== 'path');
      if (!from) continue;
      // stop a few metres short so the building sits behind the position, not on the track
      R.addLink(`e.track.${++trackN}`, 'Access track', 'track', from, [x, z], { endId: `n.poi.${p.id}`, extra: { poiTrack: p.id } });
    }
  }

  // ---- walk-only paths -----------------------------------------------------------------------------------------------------------------
  for (const P of PATHS) {
    const ids = [];
    let via = [];
    P.items.forEach((it, k) => {
      if (typeof it === 'string') { ids.push([it, via]); via = []; }
      else if (Array.isArray(it) && it.length === 3) {
        if (!R.nodes.has(it[2])) { R.addNode(it[2], it[0], it[1], P.fixedY && P.fixedY[it[2]] !== undefined ? P.fixedY[it[2]] : undefined); }
        ids.push([it[2], via]); via = [];
      } else if (Array.isArray(it)) {
        if (k === P.items.length - 1) { const id = `n.${P.id}.end`; R.addNode(id, it[0], it[1], undefined); ids.push([id, via]); via = []; } else via.push([it[0], it[1]]);
      } else if (it.attach) {
        const nid = R.splitNearest(it.attach[0], it.attach[1], 80, null);
        if (!nid) throw new Error('path attach failed ' + P.id);
        ids.push([nid, via]); via = [];
      }
    });
    for (let k = 1; k < ids.length; k++) {
      const extra = P.link ? { noStamp: true, noRender: P.id !== 'p.footbridge.span' && false, walkOnly: true } : { walkOnly: true };
      R.addLink(`e.${P.id}.${k}`, P.name, 'path', ids[k - 1][0], ids[k][0], { via: ids[k][1].length ? ids[k][1] : undefined, y: P.flatY, extra: { ...extra, drive: false, pathId: P.id } });
    }
  }
  const edges = R.edges, nodes = R.nodes;
  yield 'index';
  const roadIndex = buildRoadIndex(edges);
  W.roadIndex0 = roadIndex;

  // ---- buildings ----------------------------------------------------------------------------------------------------------------------------
  yield 'buildings';
  const placer = createPlacer({ ground: terrainPre, roadIndex, seed });
  placer.reserved.push({ x0: 355, x1: 445, z0: 196, z1: 204 }); // footbridge ramps
  const poiPlacement = new Map();
  for (const p of poiDefs) {
    const b = p.data.building;
    if (!b) continue;
    const params = { ...(b.params || {}), floors: b.floors };
    const pl = placer.tryPlace(b.a, b.cx, b.cz, b.w, b.d, b.yaw, params, { margin: 0.5, gap: 0.5, tags: [p.id], overWater: !!p.data.water, slopeMax: 6 });
    if (!pl) { W.warnings.push(`explicit building failed: ${p.id}`); continue; }
    poiPlacement.set(p.id, pl);
  }
  fillCityBlocks(placer, rng);
  for (const p of poiDefs) {
    const a = p.data.auto;
    if (!a) continue;
    const pl = placer.autoPlace(p.pos[0], p.pos[2], a.a, a.w, a.d, a.floors, a.params || {}, { tags: [p.id], margin: 0.8, slopeMax: 4 });
    if (!pl) { W.warnings.push(`auto building failed: ${p.id}`); continue; }
    poiPlacement.set(p.id, pl);
  }
  // seafood market stalls along the Port Calder quay
  {
    const sp = poiDefs.find((q) => q.id === 'poi.ocean.seafood');
    for (const sx of sp.data.stalls) placer.tryPlace('bld.market_stall', sx, 1127.5, 6, 4, PI, { floors: 1 }, { margin: 0.4, gap: 0.6, tags: [sp.id] });
  }
  // ribbon buildings along selected roads (houses, port sheds, cabins)
  function ribbon(edge, o) {
    let s = o.start === undefined ? rng.range(8, 24) : o.start;
    const p = edge.pts;
    while (s < edge.len - 10) {
      let i = 1; while (i < edge.n - 1 && edge.s[i] < s) i++;
      const t = (s - edge.s[i - 1]) / Math.max(1e-6, edge.s[i] - edge.s[i - 1]);
      const px = p[(i - 1) * 3] + (p[i * 3] - p[(i - 1) * 3]) * t, pz = p[(i - 1) * 3 + 2] + (p[i * 3 + 2] - p[(i - 1) * 3 + 2]) * t;
      const dx = p[i * 3] - p[(i - 1) * 3], dz = p[i * 3 + 2] - p[(i - 1) * 3 + 2], l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l;
      let adv = 12;
      if (!o.within || (px >= o.within[0] && px <= o.within[1] && pz >= o.within[2] && pz <= o.within[3])) {
        for (const side of o.sides || [-1, 1]) {
          const e = o.pool[Math.floor(rng.float() * o.pool.length)];
          const [arch, wr, dr, fl] = e;
          const w = rng.range(wr[0], wr[1]), d = rng.range(dr[0], dr[1]);
          const floors = fl[0] === fl[1] ? fl[0] : rng.int(fl[0], fl[1]);
          const lat = side * (edge.halfRow + (o.setback || 5) + d / 2);
          const cx = px + nx * lat, cz = pz + nz * lat;
          const yaw = yawOf(-side * nx, -side * nz);
          const pl = placer.tryPlace(arch, cx, cz, w, d, yaw, { floors }, { margin: 1.0, gap: o.gap || 2, tags: o.tags || [], slopeMax: 3.5 });
          if (pl) adv = Math.max(adv, w * 0.5 + (o.spacing || 6));
        }
      }
      s += adv + rng.range(0, o.jitter || 6);
    }
  }
  const HOUSE = [['bld.house_suburban', [11, 15], [9, 12], [1, 2]]];
  for (const e of edges) {
    if (e.roadId === 'r.eastside' || (e.roadId && e.roadId.startsWith('r.es.cds'))) ribbon(e, { pool: HOUSE, setback: 6, spacing: 5, tags: ['eastside'] });
  }
  const PORT = [['bld.harbor_shed', [12, 18], [8, 10], [1, 2]], ['bld.port_town_house', [9, 12], [8, 10], [2, 3]], ['bld.port_town_house', [9, 12], [8, 10], [2, 3]]];
  for (const e of edges) {
    if (e.roadId && e.roadId.startsWith('r.pc.')) ribbon(e, { pool: PORT, setback: 4, spacing: 3, gap: 1.5, tags: ['portcalder'], jitter: 3 });
    if (e.roadId === 'r.coast') ribbon(e, { pool: PORT, setback: 5, spacing: 4, tags: ['portcalder'], within: [-1090, -740, 1000, 1075] });
    if (e.roadId === 'r.coast') ribbon(e, { pool: HOUSE, setback: 7, spacing: 8, tags: ['seagrass'], within: [-1470, -1300, 960, 1100], jitter: 4 });
    if (e.roadId === 'r.marina.link') ribbon(e, { pool: [['bld.harbor_shed', [12, 16], [8, 10], [1, 1]]], setback: 4, tags: ['marina'] });
    if (e.roadId === 'r.pine.main') ribbon(e, { pool: [['bld.cabin_log', [8, 11], [6, 8], [1, 1]], ['bld.cabin_plank', [7, 9], [6, 7], [1, 1]], ['bld.house_suburban', [10, 13], [8, 10], [1, 1]]], setback: 5, spacing: 5, tags: ['pinehaven'] });
    if (e.roadId === 'r.lakeloop') ribbon(e, { pool: [['bld.cabin_log', [8, 10], [6, 8], [1, 1]], ['bld.cabin_plank', [7, 9], [6, 7], [1, 1]]], setback: 8, spacing: 40, tags: ['pinehaven'], within: [-860, -650, -1200, -950], jitter: 20 });
    if (e.roadId === 'r.timber' && e.id.includes('timber.2')) ribbon(e, { pool: [['bld.shed_corrugated', [14, 18], [9, 11], [1, 1]]], setback: 10, spacing: 10, tags: ['timberline'], within: [1050, 1260, -1400, -1200], jitter: 8 });
  }
  // timberline yard sheds
  {
    const y = poiDefs.find((q) => q.id === 'poi.forest.timberline');
    for (const [dx, dz, a] of [[-26, -22, 0], [8, -28, 0], [34, -10, PI / 2], [-30, 10, PI / 2]]) placer.tryPlace('bld.shed_corrugated', y.pos[0] + dx, y.pos[2] + dz, 16, 10, a, { floors: 1 }, { margin: 1, tags: [y.id], slopeMax: 6 });
  }
  W.placerRects = placer;

  // ---- generated POIs (delivery addresses and taxi stands) -----------------------------------------------------------------------------------
  yield 'pois';
  const cityB = placer.placements.filter((b) => ['bld.brick_loft', 'bld.brick_walkup', 'bld.mixed_use', 'bld.panel_midrise', 'bld.apartment_block', 'bld.house_suburban', 'bld.office_midrise'].includes(b.archetype) && regionAt(b.x, b.z) === 'city' && b.tags.every((t) => !t.startsWith('poi.')));
  const byDistrict = new Map();
  for (const b of cityB) { const d = districtAt(b.x, b.z); if (!byDistrict.has(d)) byDistrict.set(d, []); byDistrict.get(d).push(b); }
  for (const arr of byDistrict.values()) for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng.float() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  const districts = Array.from(byDistrict.keys()).sort();
  let dn = 0, guard = 0;
  while (dn < 40 && guard++ < 4000) {
    const arr = byDistrict.get(districts[guard % districts.length]);
    const b = arr && arr.pop();
    if (!b) continue;
    const fx = Math.sin(b.rotY), fz = -Math.cos(b.rotY);
    const x = b.x + fx * (b.params.d / 2 + 2.5), z = b.z + fz * (b.params.d / 2 + 2.5);
    dn++;
    poiDefs.push({ id: `poi.city.delivery.${String(dn).padStart(2, '0')}`, name: `Delivery address ${dn}`, type: 'job', types: ['job'], region: 'city', district: districtAt(x, z), pos: [x, 0, z], rotY: b.rotY, tags: ['job.city.delivery', 'delivery'], data: { building: null, auto: null, placementId: b.id, generated: true } });
  }
  const streetEdges = edges.filter((e) => (e.cls === 'street' || e.cls === 'boulevard' || e.cls === 'bridgest') && e.len > 70 && !e.elevated.some((v) => v) && !e.walkOnly);
  let tn = 0;
  for (let k = 0; tn < 30 && k < 600; k++) {
    const e = streetEdges[Math.floor(rng.float() * streetEdges.length)];
    const s = rng.range(25, e.len - 25);
    let i = 1; while (i < e.n - 1 && e.s[i] < s) i++;
    const tt = (s - e.s[i - 1]) / Math.max(1e-6, e.s[i] - e.s[i - 1]);
    const p = e.pts;
    const px = p[(i - 1) * 3] + (p[i * 3] - p[(i - 1) * 3]) * tt, pz = p[(i - 1) * 3 + 2] + (p[i * 3 + 2] - p[(i - 1) * 3 + 2]) * tt;
    const dx = p[i * 3] - p[(i - 1) * 3], dz = p[i * 3 + 2] - p[(i - 1) * 3 + 2], l = Math.hypot(dx, dz) || 1;
    const side = rng.chance(0.5) ? 1 : -1;
    const x = px + (-dz / l) * side * (e.carriage / 2 + 1.5), z = pz + (dx / l) * side * (e.carriage / 2 + 1.5);
    if (regionAt(x, z) !== 'city') continue;
    if (poiDefs.some((q) => q.id.startsWith('poi.city.taxi.') && Math.hypot(q.pos[0] - x, q.pos[2] - z) < 60)) continue;
    tn++;
    poiDefs.push({ id: `poi.city.taxi.${String(tn).padStart(2, '0')}`, name: `Taxi stand ${tn}`, type: 'job', types: ['job'], region: 'city', district: districtAt(x, z), pos: [x, 0, z], rotY: yawOf(-dz / l * -side, dx / l * -side), tags: ['job.city.taxi', 'taxi'], data: { building: null, auto: null, generated: true } });
  }
  W.warnings.push(...[]);

  // ---- pads, height grid ------------------------------------------------------------------------------------------------------------------------
  yield 'pads';
  const pads = [];
  for (const b of placer.placements) {
    const A = ARCHETYPES[b.archetype];
    if (A.overWater && waterBodyAt(b.x, b.z)) continue;
    const cs = obbCorners(b.x, b.z, b.params.w, b.params.d, b.rotY);
    const xs = cs.map((q) => q[0]), zs = cs.map((q) => q[1]);
    pads.push({ cx: (Math.min(...xs) + Math.max(...xs)) / 2, cz: (Math.min(...zs) + Math.max(...zs)) / 2, hx: (Math.max(...xs) - Math.min(...xs)) / 2 + 1.5, hz: (Math.max(...zs) - Math.min(...zs)) / 2 + 1.5, y: b.y });
  }
  for (const p of poiDefs) {
    const d = p.data;
    const [x, , z] = p.pos;
    if (d.plots) for (const [, px, pz] of d.plots) pads.push({ cx: px, cz: pz, hx: d.plotSize[0] / 2, hz: d.plotSize[1] / 2, y: terrainPre(px, pz) });
    if (d.yard) pads.push({ cx: x, cz: z, hx: 38, hz: 32, y: terrainPre(x, z) });
    if (p.tags.includes('camp')) pads.push({ cx: x, cz: z, hx: 12, hz: 12, y: terrainPre(x, z) });
    if (p.id === 'poi.ocean.palmcove_parking') pads.push({ cx: x, cz: z, hx: 24, hz: 14, y: terrainPre(x, z) });
  }
  const grid = createHeightGrid();
  W.grid = grid;
  const gen = grid.build({ edges: edges.filter((e) => !e.noStamp), pads });
  for (let r = gen.next(); !r.done; r = gen.next()) yield 'grid';
  W.pads = pads;

  // ---- infrastructure ------------------------------------------------------------------------------------------------------------------------------
  yield 'infra';
  const heightAt = grid.heightAt;
  const infra = buildInfra({ edges, nodes, roadIndex, heightAt });
  W.infra = infra;
  // walk edges along piers so dock POIs are reachable on foot
  for (const [key, pr] of Object.entries(infra.piers)) {
    if (key.startsWith('marina.f')) continue;
    const a = `n.pier.${key}.a`, b = `n.pier.${key}.b`;
    R.addNode(a, pr.x0, pr.z0, pr.y); R.addNode(b, pr.x1, pr.z1, pr.y);
    R.addLink(`e.pier.${key}`, 'Pier', 'path', a, b, { y: pr.y, extra: { walkOnly: true, drive: false, noStamp: true, noRender: true, pier: key } });
    const land = R.splitNearest(pr.x0, pr.z0, 200, (e) => e.cls !== 'path' || e.pathId);
    if (land && land !== a) R.addLink(`e.pier.${key}.land`, 'Pier access', 'path', a, land, { extra: { walkOnly: true, drive: false, noStamp: true, noRender: true, pier: key } });
  }
  W.roadIndex = buildRoadIndex(edges);

  // ---- vegetation -----------------------------------------------------------------------------------------------------------------------------------
  yield 'trees';
  W.pois = poiDefs;
  W.trees = generateTrees({ heightAt, roadIndex: W.roadIndex, placer, pois: poiDefs, edges, seed, nodes });

  // ---- POI finalisation -----------------------------------------------------------------------------------------------------------------------------
  for (const p of poiDefs) {
    const [x, , z] = p.pos;
    const wb = waterBodyAt(x, z);
    p.pos[1] = Math.max(heightAt(x, z), wb ? wb.level + 0.3 : -1e9);
    const pl = poiPlacement.get(p.id);
    if (pl) p.placementId = pl.id;
    else if (p.data.placementId) p.placementId = p.data.placementId;
  }
  W.poiPlacement = poiPlacement;
  W.placements = placer.placements;

  // ---- colliders -------------------------------------------------------------------------------------------------------------------------------------------
  yield 'colliders';
  const colliders = createColliderSet();
  for (const b of placer.placements) {
    const A = ARCHETYPES[b.archetype];
    const { w, d, h } = b.params;
    if (A.round) colliders.cyl(b.x, b.z, w / 2, b.y - (A.overWater ? 18 : 0), b.y + h, { id: b.id, tag: 'building' });
    else if (b.archetype === 'bld.market_stall' || b.archetype === 'bld.fishing_hut') colliders.box(b.x, b.y + h / 2, b.z, w / 2, h / 2, d / 2, b.rotY, { id: b.id, tag: 'building' });
    else colliders.box(b.x, b.y + h / 2 - (A.overWater ? 3 : 0), b.z, w / 2, h / 2 + (A.overWater ? 3 : 0), d / 2, b.rotY, { id: b.id, tag: 'building' });
  }
  for (const g of infra.groups) {
    for (const part of g.parts) {
      if (part.deck) { const dk = part.deck; colliders.deck(dk.ax, dk.ay, dk.az, dk.bx, dk.by, dk.bz, dk.hw, dk.thick, { id: g.id, surface: g.tags.includes('bridge') ? 'surf.asphalt' : 'surf.wood', tag: 'deck' }); continue; }
      if (!part.solid) continue;
      if (part.s === 'cyl') colliders.cyl(part.x, part.z, part.sx / 2, part.y - part.sy / 2, part.y + part.sy / 2, { id: g.id, tag: 'infra' });
      else colliders.box(part.x, part.y, part.z, part.sx / 2, part.sy / 2, part.sz / 2, part.yaw, { id: g.id, walkable: part.walk, surface: part.walk ? (g.tags.includes('breakwater') ? 'surf.rock' : 'surf.wood') : undefined, tag: 'infra' });
    }
  }
  W.colliders = colliders;

  // ---- navigation ----------------------------------------------------------------------------------------------------------------------------------------------
  yield 'nav';
  W.nav = createNav({ edges, nodes, roadIndex: W.roadIndex });
  const waterDepth = (x, z) => { const wb = waterBodyAt(x, z); return wb ? Math.max(0, wb.level - heightAt(x, z)) : 0; };
  W.waterDepth = waterDepth;
  const wp = [];
  const addWp = (id, x, z) => wp.push({ id, x, z });
  // ocean + river system
  [['o.harbor.in', -900, 1260], ['o.harbor.mouth', -900, 1405], ['o.harbor.out', -900, 1520], ['o.berth1', -940, 1185], ['o.berth2', -880, 1185], ['o.berth3', -820, 1185], ['o.fuel', -980, 1180],
    ['o.marina.in', -1260, 1330], ['o.marina.dock', -1240, 1190], ['o.marina.mouth', -1260, 1520], ['o.ferry', -1160, 1175], ['o.palm.pier', -1560, 1205], ['o.palm.bay', -1640, 1330], ['o.palm.out', -1560, 1480],
    ['o.gull', -1750, 1700], ['o.gullrock.dock', -1750, 1700], ['o.groundsA', -900, 1700], ['o.groundsB', -1500, 1780], ['o.groundsC', -300, 1800],
    ['o.mouth', -350, 1230], ['o.east1', -100, 1250], ['o.east2', 200, 1230], ['o.quay', 345, 1145], ['o.sea.mid', -600, 1600],
    ['r.1000', riverX(1000), 1000], ['r.800', riverX(800), 800], ['r.600', riverX(600) + 20, 600], ['r.dock', riverX(600) + 35, 600], ['r.400', riverX(400), 400], ['r.200', riverX(200), 200], ['r.0', riverX(0), 0], ['r.-200', riverX(-200), -200], ['r.weir', riverX(-300), -300],
    ['o.boatyard', -760, 1185], ['o.terminal', -660, 1160], ['o.harbor.mid', -900, 1330]].forEach(([id, x, z]) => addWp(id, x, z));
  // lake
  [['l.village', -805, -1070], ['l.boathire', -832, -1046], ['l.boathouse', -905, -812], ['l.camp', -1200, -1375], ['l.inlet', -1560, -1150], ['l.rocks', -1250, -850], ['l.deep', -1200, -1100], ['l.reeds', -1480, -1340], ['l.mid.e', -1000, -1100], ['l.mid.w', -1400, -1100], ['l.south', -1100, -900], ['l.north', -1100, -1300]].forEach(([id, x, z]) => addWp(id, x, z));
  W.boatNav = createBoatNav({ waterDepth, waypoints: wp });

  // ---- chunk index ----------------------------------------------------------------------------------------------------------------------------------------------
  // static interactables: a door per POI building, a marker per other POI
  W.interactables = [];
  for (const p of poiDefs) {
    const pl = poiPlacement.get(p.id);
    let pos = p.pos.slice(), kind = 'sign';
    if (pl) {
      const fx = Math.sin(pl.rotY), fz = -Math.cos(pl.rotY);
      pos = [pl.x + fx * (pl.params.d / 2 + 0.6), pl.y, pl.z + fz * (pl.params.d / 2 + 0.6)];
      kind = 'door';
    } else if (p.type === 'dock') kind = 'cleat';
    else if (p.type === 'bank') kind = 'atm';
    W.interactables.push({ id: `int.${p.id}`, kind, pos, radius: 2.5, prompt: `prompt.${p.id}`, poiId: p.id, placementId: pl ? pl.id : undefined });
  }
  yield 'chunks';
  const NC = 40;
  const ck = (x, z) => Math.min(NC - 1, Math.max(0, Math.floor((z + 2000) / 100))) * NC + Math.min(NC - 1, Math.max(0, Math.floor((x + 2000) / 100)));
  const plByChunk = Array.from({ length: NC * NC }, () => []);
  for (const b of placer.placements) plByChunk[ck(b.x, b.z)].push(b);
  const partsByChunk = Array.from({ length: NC * NC }, () => []);
  for (const g of infra.groups) for (const part of g.parts) { if (!part.invisible) partsByChunk[ck(part.x, part.z)].push({ part, group: g.id, archetype: g.archetype }); }
  const roadsByChunk = Array.from({ length: NC * NC }, () => new Map());
  for (const e of edges) {
    if (e.noRender) continue;
    for (let i = 0; i < e.n - 1; i++) {
      const mx = (e.pts[i * 3] + e.pts[i * 3 + 3]) / 2, mz = (e.pts[i * 3 + 2] + e.pts[i * 3 + 5]) / 2;
      const m = roadsByChunk[ck(mx, mz)];
      let r = m.get(e.id);
      if (!r) { r = { edgeId: e.id, i0: i, i1: i + 1, segs: [] }; m.set(e.id, r); }
      r.segs.push(i);
    }
  }
  W.plByChunk = plByChunk; W.partsByChunk = partsByChunk; W.roadsByChunk = roadsByChunk;
  W.edgeById = new Map(edges.map((e) => [e.id, e]));
  W.poiById = new Map(poiDefs.map((p) => [p.id, p]));
  yield 'done';
  return W;
}
export { LAKE, lakeR, PONDS, shoreD };
