// World invariants (MASTER_SPEC 9.2 acceptance 1, 2, 4, 5). Node only, no GL.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { World } from '../../src/world/query.js';
import { ARCHETYPES } from '../../src/world/archetypes.js';
import { ROAD_CLASSES } from '../../src/world/layout/roads.js';
import { waterBodyAt } from '../../src/world/layout/water.js';
import { regionAt, districtAt } from '../../src/world/layout/regions.js';
import { obbCorners } from '../../src/world/layout/lots.js';
import { SCALE, DISTRICT } from '../../src/data/ids.js';

World.init({ seed: 1 });
const D = World.data;

// ---- Annex B section 6 coordinates, as printed (binding to +-30 m; snapped values are logged in docs/DECISIONS.md) --------------------------
const ANNEX = {
  'poi.city.spawn': [-147, 372], 'poi.city.hostel': [-100, 339], 'poi.city.diner': [0, 368], 'poi.city.jobcentre': [90, 368], 'poi.city.bank': [330, 361],
  'poi.city.cityhall': [470, 400], 'poi.city.realty': [330, 200], 'poi.city.office': [610, 300], 'poi.city.construction': [470, 200], 'poi.city.footbridge': [400, 200],
  'poi.city.park': [750, 350], 'poi.city.police': [190, 100], 'poi.city.supermarket': [750, 600], 'poi.city.furniture': [610, 600], 'poi.city.dealer': [890, 400],
  'poi.city.usedcars': [-90, 700], 'poi.city.mechanic': [50, 700], 'poi.city.taxi': [50, 600], 'poi.city.gas': [140, 670], 'poi.city.depot': [470, 800],
  'poi.city.hardware': [610, 800], 'poi.city.warehouse': [890, 800], 'poi.city.wholesale': [330, 900], 'poi.city.quay': [330, 1095], 'poi.city.riverdock': [-285, 600],
  'poi.city.apartments': [330, -200], 'poi.city.lofts': [-225, 200], 'poi.city.northgate_exit': [540, -350], 'poi.city.east_tunnel': [1900, 350],
  'poi.lake.pinehaven': [-700, -1080], 'poi.lake.store': [-700, -1050], 'poi.lake.fishhut': [-775, -1120], 'poi.lake.boathire': [-780, -1040], 'poi.lake.grill': [-765, -980],
  'poi.lake.gas': [-660, -1010], 'poi.lake.boathouse': [-900, -800], 'poi.lake.campground': [-1200, -1440], 'poi.lake.redcabin': [-1640, -1150], 'poi.lake.weir': [-860, -830],
  'poi.lake.fish.dock': [-790, -1070], 'poi.lake.fish.rocks': [-1250, -785], 'poi.lake.fish.reeds': [-1480, -1340], 'poi.lake.fish.inlet': [-1630, -1150],
  'poi.lake.fish.deep': [-1200, -1100], 'poi.lake.fish.heron': [-420, -1300], 'poi.lake.cabin.1': [-1000, -1420], 'poi.lake.cabin.2': [-1400, -1400],
  'poi.lake.cabin.3': [-1700, -1000], 'poi.lake.cabin.4': [-1450, -770], 'poi.lake.lots': [-640, -1160],
  'poi.ocean.portcalder': [-900, 1040], 'poi.ocean.harbor': [-880, 1150], 'poi.ocean.seafood': [-1040, 1125], 'poi.ocean.terminal': [-640, 1100], 'poi.ocean.boatyard': [-760, 1160],
  'poi.ocean.fueldock': [-980, 1165], 'poi.ocean.marina': [-1240, 1150], 'poi.ocean.marine_dealer': [-1200, 1090], 'poi.ocean.ferry': [-1160, 1150], 'poi.ocean.lighthouse': [-1120, 1420],
  'poi.ocean.seagrass': [-1380, 1040], 'poi.ocean.palmcove_parking': [-1600, 1060], 'poi.ocean.beach': [-1650, 1130], 'poi.ocean.beachbar': [-1700, 1090], 'poi.ocean.pier': [-1560, 1230],
  'poi.ocean.gullrock': [-1750, 1650], 'poi.ocean.grounds.a': [-900, 1700], 'poi.ocean.grounds.b': [-1500, 1780], 'poi.ocean.grounds.c': [-300, 1800], 'poi.ocean.gas': [-820, 1020],
  'poi.forest.gate': [520, -620], 'poi.forest.store': [480, -650], 'poi.forest.gas': [560, -600], 'poi.forest.sawmill': [700, -900], 'poi.forest.timberline': [1150, -1300],
  'poi.forest.stand.a': [1300, -1450], 'poi.forest.stand.b': [950, -1500], 'poi.forest.stand.c': [1450, -1100], 'poi.forest.firetower': [800, -1650],
  'poi.forest.camp.fern': [350, -1050], 'poi.forest.camp.eagle': [1500, -1600], 'poi.forest.meadow': [900, -1150], 'poi.forest.cabin.1': [250, -800], 'poi.forest.cabin.2': [600, -1300],
  'poi.forest.cabin.3': [1300, -900], 'poi.forest.lots': [420, -760],
};
const NO_COORDS = ['poi.forest.plant.1', 'poi.forest.plant.2', 'poi.forest.plant.3', 'poi.forest.plant.4']; // Annex B: "cleared areas near stands"

function annexIds() {
  const txt = readFileSync(new URL('../../docs/spec/B-world-layout.md', import.meta.url), 'utf8');
  const sec = txt.slice(txt.indexOf('## 6. Points of interest'), txt.indexOf('## 7. Streaming'));
  const ids = new Set();
  for (const m of sec.matchAll(/^\| `(poi\.[^`]+)`/gm)) {
    let id = m[1];
    if (id.includes('*')) continue;
    let mm;
    if ((mm = id.match(/^(.*)\.(\d)…(\d)$/))) { for (let i = +mm[2]; i <= +mm[3]; i++) ids.add(`${mm[1]}.${i}`); continue; }
    if ((mm = id.match(/^(.*)\.([a-z](?:\/[a-z])+)$/))) { for (const s of mm[2].split('/')) ids.add(`${mm[1]}.${s}`); continue; }
    ids.add(id);
  }
  return ids;
}

test('every POI in Annex B section 6 exists (ids and count)', () => {
  const expected = annexIds();
  const have = new Set(World.pois().map((p) => p.id));
  const missing = [...expected].filter((i) => !have.has(i));
  assert.deepEqual(missing, [], 'missing POIs: ' + missing.join(', '));
  assert.equal(expected.size, Object.keys(ANNEX).length + NO_COORDS.length, 'test table covers the annex');
  const gen = World.pois().filter((p) => /^poi\.city\.(delivery|taxi)\.\d\d$/.test(p.id));
  assert.equal(gen.filter((p) => p.id.includes('.delivery.')).length, 40);
  assert.equal(gen.filter((p) => p.id.includes('.taxi.')).length, 30);
  assert.equal(World.pois().length, expected.size + 70);
  for (let i = 1; i <= 40; i++) assert.ok(World.poi(`poi.city.delivery.${String(i).padStart(2, '0')}`));
  for (let i = 1; i <= 30; i++) assert.ok(World.poi(`poi.city.taxi.${String(i).padStart(2, '0')}`));
});

test('POI ids follow the glossary and carry valid region, district and archetype tags', () => {
  const validDistricts = new Set(Object.values(DISTRICT).flat());
  for (const p of World.pois()) {
    assert.match(p.id, /^poi\.(city|lake|ocean|forest)\.[a-z0-9_.]+$/);
    assert.equal(p.id.split('.')[1], p.region, p.id);
    assert.equal(regionAt(p.pos[0], p.pos[2]), p.region, p.id + ' region');
    assert.equal(districtAt(p.pos[0], p.pos[2]), p.district, p.id + ' district');
    assert.ok(validDistricts.has(p.district), p.id + ' district id');
    assert.ok(p.district.startsWith(p.region + '.'), p.id + ' district belongs to region');
    assert.ok(Math.abs(p.pos[0]) <= 2000 && Math.abs(p.pos[2]) <= 2000);
  }
});

test('POI coordinates match Annex B within 30 m', () => {
  for (const [id, [x, z]] of Object.entries(ANNEX)) {
    const p = World.poi(id);
    assert.ok(p, id);
    const d = Math.hypot(p.pos[0] - x, p.pos[2] - z);
    assert.ok(d <= 30, `${id} is ${d.toFixed(1)} m from the annex coordinate`);
  }
  // Annex: spawn yaw 0 at (-147, 372), bus station at (-90, 400)
  assert.equal(World.poi('poi.city.spawn').rotY, 0);
  const bus = D.placements.find((b) => b.archetype === 'bld.bus_station');
  assert.ok(Math.hypot(bus.x + 90, bus.z - 400) <= 30);
});

test('annex districts: key POIs sit in the intended district', () => {
  const want = { 'poi.city.diner': 'city.oldtown', 'poi.city.bank': 'city.downtown', 'poi.city.police': 'city.midtown', 'poi.city.depot': 'city.industrial', 'poi.city.supermarket': 'city.market',
    'poi.city.quay': 'city.docks', 'poi.city.dealer': 'city.eastside', 'poi.city.apartments': 'city.northgate', 'poi.lake.pinehaven': 'lake.pinehaven', 'poi.ocean.portcalder': 'ocean.portcalder',
    'poi.ocean.seagrass': 'ocean.seagrass', 'poi.ocean.beach': 'ocean.palmcove', 'poi.forest.gate': 'forest.gate', 'poi.forest.sawmill': 'forest.sawmill', 'poi.forest.timberline': 'forest.timberline',
    'poi.forest.firetower': 'forest.highridge', 'poi.ocean.marina': 'ocean.marina', 'poi.lake.redcabin': 'lake.shore' };
  for (const [id, d] of Object.entries(want)) assert.equal(World.poi(id).district, d, id);
});

test('all POI explicit buildings were placed (no builder warnings)', () => {
  assert.deepEqual(D.warnings, []);
  for (const p of World.pois()) if (p.data.building || p.data.auto) assert.ok(p.placementId, p.id + ' has a placement');
});

test('drive routes exist between every pair of the 8 hub POIs', () => {
  const hubs = ['poi.city.spawn', 'poi.city.depot', 'poi.city.northgate_exit', 'poi.lake.pinehaven', 'poi.ocean.portcalder', 'poi.ocean.palmcove_parking', 'poi.forest.gate', 'poi.forest.timberline'];
  let n = 0;
  for (const a of hubs) for (const b of hubs) {
    if (a >= b) continue;
    const r = World.route(a, b, { mode: 'drive' });
    assert.ok(r && r.length > 0, `${a} -> ${b}`);
    assert.ok(r.snapStart < 60 && r.snapEnd < 60, `${a} -> ${b} snap`);
    n++;
  }
  assert.equal(n, 28);
});

test('all four regions are joined by roads and bridges', () => {
  const r = World.route('poi.city.spawn', 'poi.lake.pinehaven', { mode: 'drive' });
  assert.ok(r);
  const regions = (route) => new Set(route.points.map((p) => regionAt(p[0], p[2])));
  for (const [id, reg] of [['poi.lake.pinehaven', 'lake'], ['poi.ocean.portcalder', 'ocean'], ['poi.forest.gate', 'forest']]) {
    const rt = World.route('poi.city.spawn', id, { mode: 'drive' });
    assert.ok(rt && regions(rt).has('city') && regions(rt).has(reg), id);
  }
  // each region reaches every other region (graph connected)
  for (const [a, b] of [['poi.lake.pinehaven', 'poi.ocean.portcalder'], ['poi.ocean.palmcove_parking', 'poi.forest.timberline'], ['poi.lake.pinehaven', 'poi.forest.gate']]) assert.ok(World.route(a, b, { mode: 'drive' }), `${a} ${b}`);
  // both the Harlan Bridge and the Mill Bridge carry a span over water
  const bridges = D.R.edges.filter((e) => e.overWater);
  assert.ok(bridges.some((e) => e.roadId === 'r.bridge') && bridges.some((e) => e.roadId === 'r.mill') && bridges.some((e) => e.roadId === 'r.causeway'));
});

test('walk routes reach every on-foot POI from spawn', () => {
  const fails = [];
  for (const p of World.pois()) {
    if (p.tags.includes('boatonly') || p.data.noAccess) continue;
    const r = World.route('poi.city.spawn', p.id, { mode: 'walk' });
    if (!r || r.snapEnd > 80) fails.push(`${p.id}${r ? ' snap ' + r.snapEnd.toFixed(0) : ''}`);
  }
  assert.deepEqual(fails, []);
});

test('boat routes join every pair of docks on the same water body', () => {
  const docks = World.pois().filter((p) => p.tags.includes('dock') && p.data.dock);
  assert.ok(docks.length >= 10);
  const bodyOf = (p) => { const wb = waterBodyAt(p.data.dock.x, p.data.dock.z); return wb ? (wb.body === 'river' ? 'ocean' : wb.body) : null; };
  const groups = new Map();
  for (const d of docks) { const b = bodyOf(d); assert.ok(b, `${d.id} dock point is in water`); (groups.get(b) || groups.set(b, []).get(b)).push(d); }
  assert.ok(groups.get('ocean').length >= 8 && groups.get('lake').length >= 3);
  for (const [, list] of groups) for (const a of list) for (const b of list) {
    if (a.id >= b.id) continue;
    const r = World.route(a.id, b.id, { mode: 'boat' });
    assert.ok(r && r.length > 0, `${a.id} -> ${b.id}`);
  }
});

test('no building overlaps a road right-of-way or (unless on piles) water', () => {
  let checked = 0;
  for (const b of D.placements) {
    const A = ARCHETYPES[b.archetype];
    const { w, d } = b.params;
    const nx = Math.max(2, Math.ceil(w / 2)), nz = Math.max(2, Math.ceil(d / 2));
    const c = Math.cos(b.rotY), s = Math.sin(b.rotY);
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const lx = -w / 2 + (w * i) / nx, lz = -d / 2 + (d * j) / nz;
      const x = b.x + lx * c - lz * s, z = b.z + lx * s + lz * c;
      assert.ok(D.roadIndex.clearance(x, z, true) >= 0.4, `${b.id} (${b.archetype}) overlaps a road at ${x.toFixed(1)},${z.toFixed(1)}`);
      if (!A.overWater) assert.equal(waterBodyAt(x, z), null, `${b.id} (${b.archetype}) in water at ${x.toFixed(1)},${z.toFixed(1)}`);
    }
    checked++;
  }
  assert.ok(checked > 700);
});

test('buildings do not overlap each other', () => {
  const list = D.placements;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (Math.hypot(a.x - b.x, a.z - b.z) > 120) continue;
    const ca = obbCorners(a.x, a.z, a.params.w, a.params.d, a.rotY), cb = obbCorners(b.x, b.z, b.params.w, b.params.d, b.rotY);
    const inside = (p, q) => { const dx = p[0] - q.x, dz = p[1] - q.z; const c = Math.cos(q.rotY), s = Math.sin(q.rotY); const lx = dx * c + dz * s, lz = -dx * s + dz * c; return Math.abs(lx) < q.params.w / 2 - 0.05 && Math.abs(lz) < q.params.d / 2 - 0.05; };
    for (const p of ca) assert.ok(!inside(p, b), `${a.id} corner inside ${b.id}`);
    for (const p of cb) assert.ok(!inside(p, a), `${b.id} corner inside ${a.id}`);
  }
});

test('no collider blocks a road lane (lane centrelines sampled every 2 m)', () => {
  let samples = 0, bad = [];
  const out = [];
  for (const e of D.R.edges) {
    if (!e.drive || e.walkOnly) continue;
    const p = e.pts;
    for (const off of e.laneOffsets) {
      for (let sDist = 0; sDist <= e.len; sDist += 2) {
        let i = 1; while (i < e.n - 1 && e.s[i] < sDist) i++;
        const t = (sDist - e.s[i - 1]) / Math.max(1e-6, e.s[i] - e.s[i - 1]);
        const dx = p[i * 3] - p[(i - 1) * 3], dz = p[i * 3 + 2] - p[(i - 1) * 3 + 2], l = Math.hypot(dx, dz) || 1;
        const x = p[(i - 1) * 3] + dx * t + (-dz / l) * off, z = p[(i - 1) * 3 + 2] + dz * t + (dx / l) * off;
        const y = p[(i - 1) * 3 + 1] + (p[i * 3 + 1] - p[(i - 1) * 3 + 1]) * t;
        samples++;
        for (const c of D.colliders.near(x, z, 0.2, out)) {
          if (c.shape === 'deck') continue;
          // vertical rule: a car (1.5 m tall, 0.3 m ground clearance) at lane height y
          if (!(c.yMin < y + 1.5 && c.yMax > y + 0.3)) continue;
          const o = { nx: 0, nz: 0, pen: 0 };
          if (D.colliders.penetration(c, x, z, 0.0, y + 0.3, y + 1.5, o)) bad.push(`${e.id} lane ${off} s=${sDist} hits ${c.id || c.tag}`);
        }
      }
    }
  }
  assert.ok(samples > 50000, 'sampled ' + samples);
  assert.deepEqual(bad.slice(0, 10), []);
});

test('scale checks: lane 3.5 m, door 2.1 m, storey 3.2-4.5 m, capsule 1.8 m', () => {
  assert.equal(SCALE.laneWidth, 3.5);
  for (const cls of ['street', 'bridgest', 'harlan', 'highway']) {
    const lo = ROAD_CLASSES[cls].lanes;
    for (let i = 1; i < lo.length; i++) if (Math.sign(lo[i]) === Math.sign(lo[i - 1])) assert.ok(Math.abs(Math.abs(lo[i] - lo[i - 1]) - 3.5) < 1e-9, cls);
    assert.ok(Math.abs(lo[1] - lo[0]) >= 3.5 - 1e-9, cls + ' centre spacing');
  }
  assert.equal(ROAD_CLASSES.street.carriage, 12); assert.equal(ROAD_CLASSES.boulevard.carriage, 25);
  for (const A of Object.values(ARCHETYPES)) {
    if (A.category !== 'building') continue;
    const door = A.anchors.find((a) => a.kind === 'door');
    assert.ok(door && door.size[1] === 2.1, A.id + ' door height');
    if (A.floors[1] > 1) assert.ok(A.storey >= 3.2 && A.storey <= 4.5, `${A.id} storey ${A.storey}`);
  }
  const player = ARCHETYPES['chr.player'];
  assert.equal(player.size[1], 1.8); assert.equal(player.colliders[0].height, 1.8); assert.equal(player.colliders[0].radius, 0.3);
  assert.equal(SCALE.capsuleHeight, 1.8); assert.equal(SCALE.doorHeight, 2.1);
});

test('terrain: roads sit on the heightfield, grades are drivable, bridges clear the water', () => {
  for (const e of D.R.edges) {
    if (e.noStamp) continue;
    const p = e.pts;
    let maxGrade = 0;
    for (let i = 0; i < e.n; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
      assert.ok(Number.isFinite(y));
      if (e.elevated[i]) assert.ok(y > World.heightAt(x, z) - 0.2 || World.heightAt(x, z) < -0.2, `${e.id} elevated sample above ground`);
      else if (e.cls !== 'path') assert.ok(Math.abs(World.heightAt(x, z) - y) < (["gravel", "dirt", "track", "loop"].includes(e.cls) ? 1.3 : 0.75), `${e.id} sample ${i}: road y ${y.toFixed(2)} vs ground ${World.heightAt(x, z).toFixed(2)}`);
      if (i > 0 && !(e.elevated[i] && e.elevated[i - 1])) maxGrade = Math.max(maxGrade, Math.abs(y - p[(i - 1) * 3 + 1]) / Math.max(1e-6, e.s[i] - e.s[i - 1]));
    }
    const lim = e.cls === 'path' ? 0.17 : ['gravel', 'dirt', 'track'].includes(e.cls) ? 0.115 : 0.085; // paved 8%, unpaved 10-11% (docs/PROJECT_RECORD.md spec issues)
    assert.ok(maxGrade <= lim, `${e.id} grade ${maxGrade.toFixed(3)}`);
  }
  for (const e of D.R.edges) if (e.overWater) for (let i = 0; i < e.n; i++) if (e.elevated[i] && World.heightAt(e.pts[i * 3], e.pts[i * 3 + 2]) < -0.3) assert.ok(e.pts[i * 3 + 1] - 1.4 >= 5, `${e.id} clearance`);
});

test('water queries: ocean, river, lake and ponds', () => {
  assert.ok(World.waterAt(-1000, 1700, 0).body === 'ocean');
  assert.equal(World.waterAt(-147, 372, 0), null);
  const riv = World.waterAt(-340, 200, 0);
  assert.ok(riv && riv.body === 'river' && riv.depth > 2);
  const lake = World.waterAt(-1200, -1100, 0);
  assert.ok(lake && lake.body === 'lake' && lake.level === 40 && lake.depth > 10);
  assert.ok(World.waterAt(-420, -1300, 0).body === 'pond');
  assert.equal(World.waterAt(540, -620, 0), null);
  for (let i = 0; i < 2000; i++) { const x = ((i * 7919) % 3800) - 1900, z = ((i * 104729) % 3800) - 1900; assert.ok(Number.isFinite(World.heightAt(x, z))); }
});

test('World.groundAt follows decks and terrain, regions/chunks are consistent', () => {
  const g = World.groundAt(-250, 40, 300);
  assert.ok(g.platformId && Math.abs(g.y - 26) < 0.6, 'Harlan Bridge deck at the east tower: ' + g.y);
  const t = World.groundAt(-147, 20, 372);
  assert.ok(Math.abs(t.y - World.heightAt(-147, 372)) < 1e-6 && !t.platformId);
  assert.equal(World.chunkKey(-2000, -2000), '0,0'); assert.equal(World.chunkKey(1999.9, 1999.9), '39,39');
  const c = World.chunkContents(Math.floor((-90 + 2000) / 100), Math.floor((400 + 2000) / 100));
  assert.ok(c.placements.length > 0 && c.roads.length > 0);
  assert.equal(World.nearestPoi(-100, 380, 'transit').id, 'poi.city.spawn');
  assert.ok(World.roadAt(-160, 380) && World.roadAt(-160, 380).speedLimit === 14);
});
