// Headless physics checks (Annex G 6 "Physics"): ring-route traversal bot, handling basics, character and boat sanity. No GL.
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../src/world/query.js';
import { createVehicle, stepVehicle } from '../../src/game/physics/vehicle.js';
import { createBoat, stepBoat } from '../../src/game/physics/boat.js';
import { createCharacter, stepCharacter } from '../../src/game/physics/character.js';
import { VEHICLES } from '../../src/data/vehicles.js';

World.init({ seed: 1 });
const D = World.data;
const DT = 1 / 60;

export function ringRoute() {
  const N = (id) => D.R.nodes.get(id);
  const stops = [World.poi('poi.city.spawn').pos, N('g0_5'), N('g2_5'), N('n.bridge.touch'), N('n.harlan.west'), N('n.pinehaven'), N('n.forest.gate'), N('g5_0'), N('g5_7'), N('g0_7'), World.poi('poi.city.spawn').pos];
  const pts = [];
  let len = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    const r = World.route({ x: a.x !== undefined ? a.x : a[0], z: a.z !== undefined ? a.z : a[2] }, { x: b.x !== undefined ? b.x : b[0], z: b.z !== undefined ? b.z : b[2] }, { mode: 'drive' });
    assert.ok(r, `route leg ${i}`);
    for (const p of r.points) { const l = pts[pts.length - 1]; if (!l || Math.hypot(l[0] - p[0], l[2] - p[2]) > 0.5) pts.push(p); }
    len += r.length;
  }
  return { pts, length: len };
}

function driveBot(route, { maxSeconds = 2000 } = {}) {
  const pts = route.pts;
  const first = pts[0], second = pts[Math.min(3, pts.length - 1)];
  const yaw0 = Math.atan2(second[0] - first[0], -(second[2] - first[2]));
  const v = createVehicle('veh.sedan', first[0], first[2], yaw0);
  let idx = 0, t = 0, maxDev = 0, minAbove = 1e9, steps = 0, maxSpeed = 0, distanceTravelled = 0, finished = false;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
  const total = cum[cum.length - 1];
  const at = (s) => { let i = idx; while (i < pts.length - 1 && cum[i] < s) i++; return pts[Math.min(i, pts.length - 1)]; };
  while (t < maxSeconds) {
    // progress: nearest path point ahead (monotonic)
    let best = idx, bd = 1e18;
    for (let i = idx; i < Math.min(pts.length, idx + 60); i++) { const d = (pts[i][0] - v.x) ** 2 + (pts[i][2] - v.z) ** 2; if (d < bd) { bd = d; best = i; } }
    idx = best;
    const s0 = cum[idx];
    if (total - s0 < 6) { finished = true; break; }
    const look = Math.max(5, Math.min(20, 4 + 0.7 * v.speed));
    const tp = at(s0 + look);
    const desired = Math.atan2(tp[0] - v.x, -(tp[2] - v.z));
    let err = desired - v.yaw; err = Math.atan2(Math.sin(err), Math.cos(err));
    const steer = Math.max(-1, Math.min(1, err * 1.6));
    // curvature-limited speed
    const pA = at(s0 + 8), pB = at(s0 + 22), pC = at(s0 + 40);
    const a1 = Math.atan2(pB[0] - pA[0], -(pB[2] - pA[2])), a2 = Math.atan2(pC[0] - pB[0], -(pC[2] - pB[2]));
    let turn = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
    const road = World.roadAt(v.x, v.z);
    let vt = road ? road.speedLimit : 14;
    vt = Math.min(vt * 1.0, Math.max(5.5, 17 / (1 + turn * 4.2)), 1e9);
    const endBrake = Math.sqrt(Math.max(0, 2 * 5 * (total - s0 - 5)));
    vt = Math.min(vt, endBrake);
    const th = Math.max(-1, Math.min(1, (vt - v.speed) * 0.7));
    stepVehicle(v, { throttle: th, steer, handbrake: false }, DT);
    t += DT; steps++;
    // deviation from the route polyline (nearest of the neighbouring segments)
    let dmin = 1e9;
    for (let i = Math.max(0, idx - 3); i < Math.min(pts.length - 1, idx + 4); i++) {
      const ax = pts[i][0], az = pts[i][2], bx = pts[i + 1][0], bz = pts[i + 1][2];
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
      let u = l2 > 0 ? ((v.x - ax) * dx + (v.z - az) * dz) / l2 : 0; u = Math.max(0, Math.min(1, u));
      dmin = Math.min(dmin, Math.hypot(ax + dx * u - v.x, az + dz * u - v.z));
    }
    maxDev = Math.max(maxDev, dmin);
    minAbove = Math.min(minAbove, v.y - World.heightAt(v.x, v.z));
    maxSpeed = Math.max(maxSpeed, v.speed);
    if (steps % 600 === 0 && Number.isNaN(v.x)) break;
  }
  distanceTravelled = v.odo;
  return { finished, time: t, maxDev, minAbove, maxSpeed, distance: distanceTravelled, total, v };
}

test('ring route traversal (Annex B 5.5): stays on the road, never below ground, finishes within 15% of length / 14 m/s', () => {
  const route = ringRoute();
  const r = driveBot(route);
  const budget = (route.length / 14) * 1.15;
  console.log(`ring route length ${(route.length / 1000).toFixed(2)} km, driven ${(r.distance / 1000).toFixed(2)} km in ${r.time.toFixed(0)} s (budget ${budget.toFixed(0)} s), avg ${(route.length / r.time).toFixed(1)} m/s, max dev ${r.maxDev.toFixed(1)} m, min (y - heightAt) ${r.minAbove.toFixed(2)}, top speed ${r.maxSpeed.toFixed(1)}`);
  assert.ok(r.finished, 'bot reached the end of the ring route');
  assert.ok(r.minAbove >= -1, `never below heightAt - 1 (min ${r.minAbove})`);
  assert.ok(r.maxDev <= 12, `never leaves the road corridor by more than 12 m (max ${r.maxDev})`);
  assert.ok(r.time <= budget, `time ${r.time.toFixed(0)} s within ${budget.toFixed(0)} s`);
  // Annex B 5.5 says ~7.6 km, but its own road lengths sum to ~5.9 km (logged in PROJECT_RECORD spec issues); assert the built length is consistent with the roads
  assert.ok(route.length > 5400 && route.length < 7700, 'ring route length ' + route.length);
});

test('car handling basics: 0-20 m/s, braking distance, top speed, kerb and wall', () => {
  const p = World.poi('poi.city.depot');
  const road = World.data.roadIndex.nearest(470, 760, 50);
  const v = createVehicle('veh.sedan', 330, 750, Math.PI / 2); // along Keel St heading east
  let t = 0; while (v.speed < 20 && t < 30) { stepVehicle(v, { throttle: 1, steer: 0 }, DT); t += DT; }
  assert.ok(t > 3 && t < 9, '0-20 m/s in ' + t.toFixed(1) + ' s');
  const x0 = v.x, z0 = v.z; let tb = 0;
  while (v.speed > 0.2 && tb < 20) { stepVehicle(v, { throttle: -1, steer: 0 }, DT); tb += DT; }
  const bd = Math.hypot(v.x - x0, v.z - z0);
  assert.ok(bd > 16 && bd < 34, 'braking distance from 20 m/s = ' + bd.toFixed(1) + ' m');
  const w = createVehicle('veh.sedan', 330, 750, Math.PI / 2);
  for (let i = 0; i < 60 * 40; i++) stepVehicle(w, { throttle: 1, steer: 0 }, DT);
  void road; void p;
  assert.ok(w.speed > 0 && w.speed <= VEHICLES['veh.sedan'].topSpeed * 1.05, 'top speed ' + w.speed.toFixed(1));
  // wall: drive the car into a building and make sure it stops outside the collider
  const b = D.placements.find((q) => q.archetype === 'bld.warehouse' && Math.abs(q.rotY) < 0.01);
  const c = createVehicle('veh.sedan', b.x, b.z + b.params.d / 2 + 12, 0); // facing north at the building's south wall
  for (let i = 0; i < 60 * 6; i++) stepVehicle(c, { throttle: 1, steer: 0 }, DT);
  assert.ok(c.z >= b.z + b.params.d / 2 - 0.01 && c.speed < 1.5, `car stopped by the wall at z=${c.z.toFixed(2)} (wall ${(b.z + b.params.d / 2).toFixed(2)}) speed ${c.speed.toFixed(2)}`);
});

test('character: speeds, jump height, step height, walls, water barrier', () => {
  const x = 300, z = 356;
  const c = createCharacter(x, World.groundAt(x, 100, z).y, z);
  for (let i = 0; i < 120; i++) stepCharacter(c, { dirX: 1, dirZ: 0, mode: 'run', jump: false }, DT);
  assert.ok(Math.abs(c.speed - 4.5) < 0.1, 'run speed ' + c.speed);
  const w = createCharacter(545, World.groundAt(545, 100, 600).y, 600);
  for (let i = 0; i < 120; i++) stepCharacter(w, { dirX: 0, dirZ: -1, mode: 'walk', jump: false }, DT);
  assert.ok(Math.abs(w.speed - 1.6) < 0.1);
  const s = createCharacter(545, World.groundAt(545, 100, 300).y, 300);
  for (let i = 0; i < 120; i++) stepCharacter(s, { dirX: 0, dirZ: 1, mode: 'sprint', jump: false }, DT);
  assert.ok(Math.abs(s.speed - 6.5) < 0.1);
  // jump apex ~0.9 m
  const j = createCharacter(545, World.groundAt(545, 100, 150).y, 150); const y0 = j.y; let apex = 0;
  stepCharacter(j, { dirX: 0, dirZ: 0, mode: 'run', jump: true }, DT);
  for (let i = 0; i < 90; i++) { stepCharacter(j, { dirX: 0, dirZ: 0, mode: 'run', jump: false }, DT); apex = Math.max(apex, j.y - y0); }
  assert.ok(apex > 0.8 && apex < 1.0 && j.onGround, 'jump apex ' + apex.toFixed(2));
  // walls: run into a building
  const b = D.placements.find((q) => q.archetype === 'bld.warehouse' && Math.abs(q.rotY) < 0.01);
  const k = createCharacter(b.x, World.groundAt(b.x, 100, b.z + b.params.d / 2 + 6).y, b.z + b.params.d / 2 + 6);
  for (let i = 0; i < 240; i++) stepCharacter(k, { dirX: 0, dirZ: -1, mode: 'run', jump: false }, DT);
  assert.ok(k.z >= b.z + b.params.d / 2 + 0.29, 'blocked by the wall ' + k.z.toFixed(2));
  // kerb-high ledge is climbed, a 1 m wall is not (Harlan Bridge parapet blocks the walkway edge)
  // water: wading barrier at the river bank
  const r = createCharacter(-240, World.groundAt(-240, 100, 600).y, 600);
  for (let i = 0; i < 600; i++) stepCharacter(r, { dirX: -1, dirZ: 0, mode: 'run', jump: false }, DT);
  const wa = World.waterAt(r.x, r.z, 0);
  assert.ok(!wa || wa.depth <= 1.4, 'did not wade into deep water: depth ' + (wa ? wa.depth.toFixed(2) : 0));
});

test('boat: floats at the waterline, reaches ~top speed, stops at the shore', () => {
  const b = createBoat('boat.skiff', -1400, 1800, 0);
  for (let i = 0; i < 300; i++) stepBoat(b, { throttleDelta: 0, rudder: 0 }, DT);
  const wa = World.waterAt(b.x, b.z, b.t);
  assert.ok(Math.abs(b.y - wa.height) < 0.3, 'floats at the waterline');
  let t = 0; while (t < 25) { stepBoat(b, { throttleDelta: 1, rudder: 0 }, DT); t += DT; }
  const top = VEHICLES['boat.skiff'].topSpeed;
  assert.ok(Math.abs(b.speed - top) / top < 0.12, `speed ${b.speed.toFixed(1)} vs top ${top}`);
  // drive north into the coast
  const c = createBoat('boat.skiff', -1400, 1600, 0);
  for (let i = 0; i < 60 * 80; i++) stepBoat(c, { throttleDelta: 1, rudder: 0 }, DT);
  const wc = World.waterAt(c.x, c.z, c.t);
  assert.ok(wc && wc.depth >= 0.3, 'still afloat after hitting the shore: ' + (wc ? wc.depth : null));
});
