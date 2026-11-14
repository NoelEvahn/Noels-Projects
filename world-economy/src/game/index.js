// Game facade (MASTER_SPEC 5.6): player controller, vehicles and boats, camera, interactions, environment. Pure (DOM only via game/input).
import { World } from '../world/query.js';
import { createEntityStore, setPose, snapPose } from './entities.js';
import { createCharacter, stepCharacter } from './physics/character.js';
import { createVehicle, stepVehicle } from './physics/vehicle.js';
import { createBoat, stepBoat } from './physics/boat.js';
import { createCamera, updateCamera } from './camera.js';
import { createInteractions } from './interactions.js';
import { createEnv, sunDirection, phaseAt } from './env/daynight.js';
import { PLAYER_SPAWN, VEHICLE_SPAWNS, BOAT_SPAWNS } from '../world/layout/spawns.js';
import { ENTITY_FLAGS, INT, SCALE } from '../data/ids.js';
import { ARCHETYPES } from '../world/archetypes.js';

export function createGame() {
  const G = { entities: createEntityStore(), env: createEnv(), camera: createCamera(), jobs: { start() { return { ok: false }; }, stop() {} } };
  let bus = null, input = null, settings = null, clock = null;
  let char = createCharacter();
  const player = { entityId: 0, mode: 'foot', vehicleId: null, interiorId: null };
  G.player = player;
  const vehicles = new Map(); // entityId -> {kind, ent, sim, id}
  G.vehicles = vehicles;
  let interactions = null;
  let playerEnt = null;
  let firstPerson = false;
  let region = null, district = null, surface = null;
  let resetHold = 0;
  let stepDist = 0;
  G.char = () => char;
  const tmpRoad = { x: 0, z: 0 };

  function spawnRoadVehicle(spec) {
    let x, z, yaw;
    if (spec.at) { x = spec.at[0]; z = spec.at[1]; yaw = spec.yaw || 0; }
    else {
      const p = World.poi(spec.poi);
      const hit = World.data.roadIndex.nearest(p.pos[0], p.pos[2], 300, (e) => e.drive && !e.walkOnly && e.cls !== 'track' && e.cls !== 'path');
      const e = hit.edge, i = hit.i;
      const dx = e.pts[i * 3 + 3] - e.pts[i * 3], dz = e.pts[i * 3 + 5] - e.pts[i * 3 + 2], l = Math.hypot(dx, dz) || 1;
      const lat = e.carriage / 2 - (e.cls === 'street' || e.cls === 'boulevard' ? 1.2 : 1.5);
      x = hit.x + (-dz / l) * -lat; z = hit.z + (dx / l) * -lat; // right-hand side
      yaw = Math.atan2(dx, -dz);
    }
    return spawnVehicle(spec.archetype, x, z, yaw, spec.id);
  }
  function spawnVehicle(archetype, x, z, yaw, id) {
    const sim = createVehicle(archetype, x, z, yaw);
    const ent = G.entities.create('vehicle', archetype, { pos: [x, sim.y, z], yaw, parts: { steer: 0, wheelSpin: [0, 0, 0, 0], susp: [0, 0, 0, 0], doors: [0, 0, 0, 0], lights: 0, brake: 0, rpm: 0, gear: 1, damage: 0 } });
    snapPose(ent, x, sim.y, z, yaw);
    vehicles.set(ent.id, { kind: 'vehicle', ent, sim, id: id || archetype });
    return ent;
  }
  function spawnBoat(spec) {
    let x, z;
    if (spec.xz) { x = spec.xz[0]; z = spec.xz[1]; }
    else { const p = World.poi(spec.poi); x = p.data.dock ? p.data.dock.x : p.pos[0]; z = p.data.dock ? p.data.dock.z : p.pos[2]; }
    const sim = createBoat(spec.archetype, x, z, spec.yaw || 0);
    const ent = G.entities.create('boat', spec.archetype, { pos: [x, sim.y, z], yaw: spec.yaw || 0, parts: { throttle: 0, rudder: 0, propSpin: 0, heel: 0, trim: 0 } });
    snapPose(ent, x, sim.y, z, spec.yaw || 0);
    vehicles.set(ent.id, { kind: 'boat', ent, sim, id: spec.id });
    return ent;
  }
  G.spawnVehicle = spawnVehicle;

  G.init = function ({ bus: b, input: inp, settings: s, clock: c }) {
    bus = b; input = inp; settings = s; clock = c;
    interactions = createInteractions(bus);
    const p = World.poi(PLAYER_SPAWN.poi);
    char = createCharacter(p.pos[0], p.pos[1], p.pos[2]);
    char.yaw = PLAYER_SPAWN.yaw;
    G.camera.yaw = PLAYER_SPAWN.yaw;
    playerEnt = G.entities.create('player', 'chr.player', { pos: [char.x, char.y, char.z], yaw: char.yaw, flags: ENTITY_FLAGS.VISIBLE | ENTITY_FLAGS.PLAYER_CONTROLLED });
    player.entityId = playerEnt.id;
    for (const v of VEHICLE_SPAWNS) spawnRoadVehicle(v);
    for (const bt of BOAT_SPAWNS) spawnBoat(bt);
    input.setContext('foot');
    region = World.regionAt(char.x, char.z); district = World.districtAt(char.x, char.z);
    snapPose(playerEnt, char.x, char.y, char.z, char.yaw);
    updateCameraNow(0.016, 0, 0);
  };

  function activeSim() { const v = player.vehicleId !== null ? vehicles.get(player.vehicleId) : null; return v; }

  G.fixedUpdate = function (dt) {
    if (!input) return;
    const mode = player.mode;
    if (mode === 'foot') {
      const mx = input.axis('moveX'), my = input.axis('moveY');
      const cy = G.camera.yaw;
      const dirX = Math.sin(cy) * my + Math.cos(cy) * mx, dirZ = -Math.cos(cy) * my + Math.sin(cy) * mx;
      const m = input.down('walk') ? 'walk' : input.down('sprint') ? 'sprint' : 'run';
      stepCharacter(char, { dirX, dirZ, mode: m, jump: input.down('jump') }, dt);
      setPose(playerEnt, char.x, char.y, char.z, char.yaw);
      playerEnt.vel[0] = char.vx; playerEnt.vel[1] = char.vy; playerEnt.vel[2] = char.vz;
      playerEnt.anim.state = !char.onGround ? 'jump' : char.speed > 5.2 ? 'sprint' : char.speed > 2.4 ? 'run' : char.speed > 0.3 ? 'walk' : 'idle';
      playerEnt.anim.speed = char.speed;
      stepDist += char.speed * dt;
      if (stepDist > 1.4 && char.onGround && bus) { stepDist = 0; bus.emit('player:step', { surface: char.surface, speed: char.speed, foot: 0 }); }
      if (surface !== char.surface) { surface = char.surface; if (bus) bus.emit('player:surface', { surface }); }
    }
    for (const [id, v] of vehicles) {
      const driven = player.vehicleId === id;
      if (v.kind === 'vehicle') {
        const s = v.sim;
        const inp = driven ? { throttle: input.axis('throttle'), steer: input.axis('steer'), handbrake: input.down('handbrake') } : { throttle: 0, steer: 0, handbrake: true };
        if (driven || s.speed !== 0 || !s.onGround || Math.abs(s.vlat) > 0.01) stepVehicle(s, inp, dt);
        setPose(v.ent, s.x, s.y, s.z, s.yaw, s.pitch, s.roll);
        const p = v.ent.parts; p.steer = s.steerAngle; p.brake = s.brake; p.rpm = s.rpm; p.gear = s.gear; p.lights = 0;
        for (let k = 0; k < 4; k++) p.wheelSpin[k] = s.wheelSpin;
      } else {
        const s = v.sim;
        const inp = driven ? { throttleDelta: input.axis('throttle'), rudder: input.axis('steer'), brake: input.down('handbrake') } : { throttleDelta: 0, rudder: 0, brake: false };
        stepBoat(s, inp, dt);
        setPose(v.ent, s.x, s.y, s.z, s.yaw, s.pitch, s.roll);
        const p = v.ent.parts; p.throttle = s.throttle; p.rudder = s.rudder; p.propSpin = s.propSpin; p.heel = s.heel; p.trim = s.trim;
      }
      // driven vehicle carries the player entity
      if (driven) { setPose(playerEnt, v.sim.x, v.sim.y, v.sim.z, v.sim.yaw); }
    }
    // region / district events
    const px = playerEnt.pos[0], pz = playerEnt.pos[2];
    const r = World.regionAt(px, pz), d = World.districtAt(px, pz);
    if (r !== region) { if (bus) bus.emit('player:region', { from: region, to: r }); region = r; }
    if (d !== district) { if (bus) bus.emit('player:district', { from: district, to: d }); district = d; }
  };

  function nearestVehicle(x, z, maxD) {
    let best = null, bd = maxD * maxD;
    for (const [id, v] of vehicles) { const d = (v.ent.pos[0] - x) ** 2 + (v.ent.pos[2] - z) ** 2; if (d < bd) { bd = d; best = id; } }
    return best;
  }
  G.enterVehicle = function (id) {
    const v = vehicles.get(id);
    if (!v || player.vehicleId !== null) return { ok: false };
    player.vehicleId = id;
    player.mode = v.kind === 'boat' ? 'boat' : 'vehicle';
    playerEnt.flags &= ~ENTITY_FLAGS.VISIBLE;
    input.setContext(player.mode);
    G.camera.yaw = v.sim.yaw; G.camera.dist = 8;
    if (bus) bus.emit('veh:enter', { entityId: playerEnt.id, vehId: id, seat: 0 });
    return { ok: true };
  };
  G.exitVehicle = function () {
    const id = player.vehicleId;
    if (id === null) return { ok: false };
    const v = vehicles.get(id);
    const s = v.sim;
    // find a standable spot beside the vehicle (left side first)
    const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
    const half = s.size[0] / 2 + 1.0;
    const cands = [];
    for (const r of [half, half + 1.5, half + 3.5, half + 6, half + 9]) for (const a of [-1, 1, 0, 2]) {
      if (a === 0) cands.push([s.x - sy * (s.size[2] / 2 + r - half + 1), s.z + cy * (s.size[2] / 2 + r - half + 1)]);
      else if (a === 2) cands.push([s.x + sy * (s.size[2] / 2 + r - half + 1), s.z - cy * (s.size[2] / 2 + r - half + 1)]);
      else cands.push([s.x + cy * a * r, s.z + sy * a * r]);
    }
    for (const [x, z] of cands) {
      const wa = World.waterAt(x, z, 0);
      const g = World.groundAt(x, s.y + 2, z);
      if (wa && wa.depth > 1.0 && !g.platformId) continue;
      if (Math.abs(g.y - s.y) > (v.kind === 'boat' ? 3.2 : 2.0)) continue;
      let blocked = false;
      for (const c of World.collidersNear(x, z, 1, [])) { if (c.dead) continue; if (World.data.colliders.penetration(c, x, z, 0.35, g.y + 0.4, g.y + 1.8, { nx: 0, nz: 0, pen: 0 })) { blocked = true; break; } }
      if (blocked) continue;
      player.vehicleId = null; player.mode = 'foot';
      char.x = x; char.z = z; char.y = g.y; char.vx = char.vz = char.vy = 0; char.onGround = true; char.yaw = s.yaw;
      snapPose(playerEnt, x, g.y, z, char.yaw);
      playerEnt.flags |= ENTITY_FLAGS.VISIBLE;
      input.setContext('foot');
      if (bus) bus.emit('veh:exit', { entityId: playerEnt.id, vehId: id, seat: 0 });
      return { ok: true };
    }
    if (bus) bus.emit('ui:toast', { kind: 'info', title: 'No safe place to get out here', body: '' });
    return { ok: false };
  };
  G.interact = function () {
    if (player.mode !== 'foot') return G.exitVehicle();
    const vid = nearestVehicle(char.x, char.z, 4.2);
    if (vid !== null) return G.enterVehicle(vid);
    const f = interactions && interactions.focus;
    if (f && bus) { bus.emit('interact:used', { interactable: f }); return { ok: true }; }
    return { ok: false };
  };
  G.teleport = function (pos, yaw) {
    const x = pos[0], z = pos[2] !== undefined ? pos[2] : pos[1];
    if (player.mode !== 'foot') {
      const v = activeSim();
      if (v) { v.sim.x = x; v.sim.z = z; v.sim.y = pos[1] !== undefined && pos.length > 2 ? pos[1] : World.groundAt(x, 500, z).y; v.sim.speed = 0; v.sim.vlat = 0; if (yaw !== undefined) v.sim.yaw = yaw; }
      return;
    }
    const g = World.groundAt(x, pos.length > 2 && pos[1] !== undefined ? pos[1] + 2 : 500, z);
    const wa = World.waterAt(x, z, 0);
    char.x = x; char.z = z; char.y = Math.max(g.y, wa ? wa.height : -1e9); char.vx = char.vz = char.vy = 0; char.onGround = true;
    if (yaw !== undefined) { char.yaw = yaw; G.camera.yaw = yaw; }
    snapPose(playerEnt, char.x, char.y, char.z, char.yaw);
  };

  function updateCameraNow(dtReal, lookX, lookY) {
    const v = activeSim();
    if (v) updateCamera(G.camera, dtReal, { x: lookX, y: lookY }, { x: v.sim.x, y: v.sim.y, z: v.sim.z, yaw: v.sim.yaw, speed: v.sim.speed }, v.kind, false);
    else updateCamera(G.camera, dtReal, { x: lookX, y: lookY }, { x: char.x, y: char.y, z: char.z, yaw: char.yaw, speed: char.speed }, 'foot', firstPerson);
  }

  G.update = function (dtReal, alpha) {
    if (!input) return;
    const sens = (settings && settings.controls ? settings.controls.mouseSensitivity : 1) * 0.0024;
    const inv = settings && settings.controls && settings.controls.invertY ? -1 : 1;
    const lx = input.axis('lookX') * sens, ly = input.axis('lookY') * sens * inv;
    if (input.pressed('camera')) firstPerson = !firstPerson;
    if (input.pressed('interact')) G.interact();
    if (input.down('reset') && player.mode === 'vehicle') { resetHold += dtReal; if (resetHold > 1.5) { resetHold = 0; resetVehicle(); } } else resetHold = 0;
    updateCameraNow(dtReal, lx, ly);
    G.camera.fov = settings && settings.graphics ? settings.graphics.fov : 60;
    if (interactions && player.mode === 'foot') interactions.update(char.x, char.y, char.z, char.yaw);
    if (clock) { G.env.timeOfDay = clock.hourFloat; sunDirection(G.env.timeOfDay, G.env.sunDir); }
    void alpha;
  };
  function resetVehicle() {
    const v = activeSim(); if (!v) return;
    const hit = World.data.roadIndex.nearest(v.sim.x, v.sim.z, 300, (e) => e.drive && !e.walkOnly);
    if (!hit) return;
    const e = hit.edge, i = hit.i;
    v.sim.x = hit.x; v.sim.z = hit.z; v.sim.y = hit.y; v.sim.yaw = Math.atan2(e.pts[i * 3 + 3] - e.pts[i * 3], -(e.pts[i * 3 + 5] - e.pts[i * 3 + 2])); v.sim.speed = 0; v.sim.vlat = 0;
  }
  G.resetVehicle = resetVehicle;
  G.phase = () => phaseAt(G.env.timeOfDay);
  G.regionNow = () => region; G.districtNow = () => district;
  G.interactionFocus = () => (interactions ? interactions.focus : null);
  G.playerPos = () => (player.mode === 'foot' ? [char.x, char.y, char.z] : (() => { const v = activeSim(); return [v.sim.x, v.sim.y, v.sim.z]; })());
  G.activeVehicle = () => activeSim();
  G.firstPerson = () => firstPerson;
  void INT; void SCALE; void ARCHETYPES; void tmpRoad;
  return G;
}
export const Game = createGame();
