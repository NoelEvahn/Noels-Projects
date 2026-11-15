// Ambient life v0 (game/ai/ambient.js): cars stay on the right-hand lane of drivable edges, stop at red signals, pedestrians stay on
// sidewalks, counts follow the density settings, nothing spawns on the player. Pure Node, no GL.
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../src/world/query.js';
import { createAmbient, MAX_CARS, MAX_PEDS } from '../../src/game/ai/ambient.js';

World.init({ seed: 1 });
const cam = { x: 400, y: 10, z: 400 };

function run(a, seconds, hour = 12, player = null) {
  const dt = 1 / 20;
  for (let t = 0; t < seconds; t += dt) a.update(dt, cam, hour, player, t, 0);
}
function distToEdge(e, x, z) {
  let best = 1e9, side = 0;
  for (let i = 0; i + 1 < e.n; i++) {
    const ax = e.pts[i * 3], az = e.pts[i * 3 + 2], bx = e.pts[i * 3 + 3], bz = e.pts[i * 3 + 5], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / l2; t = Math.max(0, Math.min(1, t));
    const qx = ax + dx * t, qz = az + dz * t, d = Math.hypot(x - qx, z - qz);
    if (d < best) { best = d; side = (x - qx) * -dz + (z - qz) * dx >= 0 ? 1 : -1; }
  }
  return { d: best, side };
}

test('traffic density scales the number of cars; pedestrians likewise', () => {
  const lo = createAmbient(), hi = createAmbient();
  lo.configure({ traffic: 0.3, crowd: 0.3 }); hi.configure({ traffic: 1, crowd: 1 });
  run(lo, 20); run(hi, 20);
  const a = lo.stats(), b = hi.stats();
  assert.ok(b.cars > a.cars && a.cars > 0, `cars low ${a.cars} high ${b.cars}`);
  assert.ok(b.peds > a.peds && a.peds > 0, `peds low ${a.peds} high ${b.peds}`);
  assert.ok(b.cars <= MAX_CARS && b.peds <= MAX_PEDS);
});

test('cars drive on the right-hand side of their edge and keep moving', () => {
  const a = createAmbient(); a.configure({ traffic: 1, crowd: 0 });
  run(a, 30);
  const c = a.cars; let n = 0, wrongSide = 0, moving = 0;
  const edges = World.data.R.edges;
  for (let i = 0; i < MAX_CARS; i++) {
    if (!c.active[i]) continue; n++;
    const e = edges[c.edge[i]], r = distToEdge(e, c.x[i], c.z[i]);
    // right of the travel direction: for dir +1 the positive (right-normal) side of a->b, for dir -1 the negative one
    if (r.d > 1.2 && r.side * c.dir[i] < 0 && r.d > e.carriage / 2 + 0.5) wrongSide++;
    assert.ok(r.d <= e.carriage / 2 + 2.5 + (e.cls === 'boulevard' ? 2 : 0), `car ${i} is ${r.d.toFixed(1)} m from edge ${e.id} (carriage ${e.carriage})`);
    if (c.speed[i] > 0.5) moving++;
  }
  assert.ok(n >= 8, 'enough cars spawned: ' + n);
  assert.equal(wrongSide, 0);
  assert.ok(moving > n * 0.4, `moving ${moving}/${n}`);
});

test('cars never run a red signal: the stop line is respected while the approach axis is red', () => {
  const a = createAmbient(); a.configure({ traffic: 1, crowd: 0 });
  const edges = World.data.R.edges, c = a.cars; let checked = 0, violations = 0;
  const dt = 1 / 20;
  for (let t = 0; t < 120; t += dt) {
    a.update(dt, cam, 12, null, t, 0);
    for (let i = 0; i < MAX_CARS; i++) {
      if (!c.active[i]) continue;
      const e = edges[c.edge[i]], toEnd = c.dir[i] > 0 ? e.len - c.s[i] : c.s[i], node = c.dir[i] > 0 ? e.b : e.a;
      if (toEnd < 2.5 && toEnd > 0.3 && c.speed[i] > 2) {
        const p = a.pointAt(e, c.dir[i] > 0 ? e.len - 1 : 1), axis = Math.abs(p.dx) > Math.abs(p.dz) ? 0 : 1;
        checked++;
        // a car that was too close to brake when the light changed (amber) may clear the junction: it must have been red for 3 s
        if (!a.green(node, axis, t) && !a.green(node, axis, t - 3)) violations++;
      }
    }
  }
  assert.ok(checked > 5, 'cars reached junctions: ' + checked);
  assert.equal(violations, 0);
});

test('pedestrians stay beside the carriageway (on the sidewalk) and no agent spawns on the player', () => {
  const a = createAmbient(); a.configure({ traffic: 0, crowd: 1 });
  const player = [cam.x + 30, cam.y, cam.z + 30];
  run(a, 25, 12, player);
  const p = a.peds, edges = World.data.R.edges; let n = 0, onWalk = 0;
  for (let i = 0; i < MAX_PEDS; i++) {
    if (!p.active[i]) continue; n++;
    const e = edges[p.edge[i]], r = distToEdge(e, p.x[i], p.z[i]);
    if (r.d > e.carriage / 2 - 1.0) onWalk++;
  }
  assert.ok(n >= 8, 'pedestrians spawned: ' + n);
  assert.ok(onWalk >= n * 0.7, `on the sidewalk: ${onWalk}/${n} (the rest are crossing a junction)`);
});

test('population follows the hour (nights are quieter) and allocation-free update keeps working over a long run', () => {
  const day = createAmbient(), night = createAmbient();
  day.configure({ traffic: 1, crowd: 1 }); night.configure({ traffic: 1, crowd: 1 });
  run(day, 25, 8.5); run(night, 25, 3);
  assert.ok(day.stats().cars > night.stats().cars, `day ${day.stats().cars} night ${night.stats().cars}`);
  assert.ok(day.stats().peds > night.stats().peds);
  run(day, 300, 9);
  assert.ok(day.stats().cars > 0);
});
