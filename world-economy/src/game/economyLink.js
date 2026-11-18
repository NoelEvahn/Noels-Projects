// Economy link (Stage 4): the only place where game state meets Sim. Gives the sim its range services (World + player position), drives job
// controllers, syncs owned vehicles (spawn on purchase, fuel/wear by distance), forwards autosave triggers. No three, no DOM.
import { World } from '../world/query.js';
import { createController } from './jobs/index.js';
import { JOB_BY_ID } from '../data/jobs.js';
import { VEHICLE_ECON } from '../data/vehicles.js';
import { SITE_BY_ID } from '../data/businesses.js';
import { createCustomers } from './ai/customers.js';
import { createAmbient } from './ai/ambient.js';

const NEAR = { default: 45, fuel: 40, atm: 30, unit: 70 };

export function createEconomyLink({ sim, game, bus, clock }) {
  const link = { controller: null, shiftId: null, jobId: null, lastHud: null };
  const entityOf = new Map(); // sim vehicle id -> game entity id
  let odoAcc = new Map(), prevPos = null;
  const here = () => game.playerPos();
  const dist2 = (p, q) => Math.hypot(p[0] - q[0], p[2] - q[2]);
  /** where a job task happens for a POI: the point just outside its building (front edge) so targets are reachable on foot */
  const poiPos = (id) => {
    const p = World.poi(id); if (!p) return null;
    const b = p.data && (p.data.building || p.data.auto); if (!b) return p.pos;
    const half = (b.d || 0) / 2, cz = b.cz !== undefined ? b.cz : p.pos[2];
    return [p.pos[0], p.pos[1], Math.max(p.pos[2], cz) + half + 3];
  };
  const snapRoad = (x, z) => { try { const h = World.data.roadIndex.nearest(x, z, 300, (e) => e.drive && !e.walkOnly && e.cls !== 'track' && e.cls !== 'path'); return h ? [h.x, h.z] : [x, z]; } catch (e) { return [x, z]; } };

  const services = {
    near(poiId) {
      const p = here();
      if (poiId === 'atm') return World.pois({ tag: 'atm' }).some((q) => dist2(p, q.pos) <= NEAR.atm);
      if (poiId === 'fuel' || poiId === 'fuel.boat') return World.pois({ type: 'fuel' }).some((q) => dist2(p, q.pos) <= NEAR.fuel);
      if (poiId === 'home') { const h = sim.select('player.summary').home; const prop = h && World.poi(homePoi(h)); return !!prop && dist2(p, prop.pos) <= NEAR.default; }
      const q = World.poi(poiId); if (!q) return true; // unknown ids (sites without a POI) are not range-gated
      return dist2(p, q.pos) <= NEAR.default + ((q.data && q.data.clear) || 0);
    },
    nearUnit(siteId) {
      const site = sim.select('biz.sites', {}).find((s) => s.id === siteId); const q = site && site.near ? World.poi(site.near) : null;
      return !q || dist2(here(), q.pos) <= NEAR.unit + 120;
    },
    nearContainer(id) {
      if (id === 'player') return true;
      if (id.startsWith('veh:')) { const e = entityOf.get(id.slice(4)); const ent = e !== undefined ? game.entities.get(e) : null; return !ent || dist2(here(), ent.pos) <= 12; }
      return true;
    },
    weather: () => ({ type: game.env.weather.type, intensity: game.env.weather.intensity }),
    vehicleInUse: (vehId) => { const e = entityOf.get(vehId); const v = e !== undefined ? game.vehicles.get(e) : null; return !!v && game.player.vehicleId === e; },
    setTime: (h) => { if (clock) { clock.setHour(h); game.env.timeOfDay = clock.hourFloat; } },
  };
  function homePoi(propId) { const ls = sim.select('prop.owned').find((p) => p.id === propId); return ls ? (propId.startsWith('prop_') ? propPoi(propId) : 'poi.city.hostel') : 'poi.city.hostel'; }
  function propPoi(id) { const n = Number(id.slice(5)); return n <= 4 ? 'poi.city.apartments' : n <= 6 ? 'poi.city.lofts' : n <= 8 ? 'poi.city.office' : n <= 14 ? 'poi.city.dealer' : n <= 18 ? 'poi.lake.cabin.' + (n - 14) : n === 19 ? 'poi.lake.boathouse' : n === 20 ? 'poi.lake.store' : n <= 25 ? 'poi.ocean.seagrass' : n <= 27 ? 'poi.ocean.portcalder' : n === 28 ? 'poi.ocean.beachbar' : 'poi.forest.cabin.' + (n - 28); }
  sim.setServices(services);

  // ---- jobs ------------------------------------------------------------------------------------------------------------------
  const env = { pos: () => here(), mode: () => (game.player.mode === 'foot' ? 'foot' : game.player.mode === 'boat' ? 'boat' : 'vehicle'), poi: (id) => poiPos(id), snap: snapRoad };
  game.jobs = {
    start(jobId, opts = {}) {
      if (link.controller) return { ok: false, error: 'ERR.BUSY' };
      const job = JOB_BY_ID[jobId]; if (!job) return { ok: false, error: 'ERR.NOT_FOUND' };
      const hired = sim.select('jobs.employer');
      if (!job.selfEmployed && hired !== jobId) { const a = sim.cmd('job.apply', { jobId }); if (!a.ok) return a; }
      const r = sim.cmd('job.startShift', { jobId }); if (!r.ok) return r;
      link.controller = createController(jobId, { sim, input: opts.input || game.inputRef, env: opts.env || env, seed: (clock ? clock.state.total : 1) | 1, spot: opts.spot, bus });
      link.shiftId = r.data.shiftId; link.jobId = jobId; link.controller.start(r.data.shiftId);
      return r;
    },
    stop(reason = 'ended') {
      if (!link.controller) return { ok: false };
      const c = link.controller; link.controller = null; c.stop(reason); return { ok: true };
    },
    hud: () => (link.controller ? link.controller.getHud() : null),
    consumesInteract: () => { const st = link.controller && link.controller.step; if (!st) return false; const h = st.hint(); return !!h && (h.press === 'interact' || h.hold === 'interact' || h.cursor !== undefined); },
    get active() { return !!link.controller; },
    get controller() { return link.controller; },
  };
  bus.on('job:shiftEnd', () => { if (link.controller) { link.controller.active = false; link.controller = null; } bus.emit('save:autosaveDue', { reason: 'shift' }); });
  bus.on('time:hour', (p) => { if (p.hour === 6) bus.emit('save:autosaveDue', { reason: 'daily' }); });
  bus.on('needs:sleep', (p) => { bus.emit('time:sleepRequested', { minutes: p.minutes, scale: 120 }); });

  // ---- vehicles --------------------------------------------------------------------------------------------------------------
  function spawnOwned(v) {
    if (entityOf.has(v.id) || !VEHICLE_ECON[v.model]) return;
    let ent;
    if (v.model.startsWith('boat.')) { const d = World.poi(v.model === 'boat.rowboat' ? 'poi.lake.fish.dock' : 'poi.ocean.marina'); const dk = d && d.data.dock ? d.data.dock : { x: 0, z: 0 }; ent = game.spawnBoat({ archetype: v.model, xz: v.pos ? [v.pos[0], v.pos[2]] : [dk.x, dk.z + 12], yaw: v.yaw || 0, id: v.id }); }
    else if (v.pos) ent = game.spawnVehicle(v.model, v.pos[0], v.pos[2], v.yaw || 0, v.id);
    else { const hp = here(), np = World.nearestPoi(hp[0], hp[2], null); ent = game.spawnRoadVehicle({ archetype: v.model, id: v.id, poi: np ? np.id : 'poi.city.spawn' }); }
    entityOf.set(v.id, ent.id);
  }
  function syncVehicles() {
    const owned = sim.select('veh.owned'); const ids = new Set(owned.map((v) => v.id));
    for (const v of owned) if (!entityOf.has(v.id)) spawnOwned(v);
    for (const [vid, eid] of entityOf) if (!ids.has(vid)) { game.vehicles.delete(eid); game.entities.destroy(eid); entityOf.delete(vid); }
  }
  bus.on('veh:changed', () => syncVehicles());
  link.syncVehicles = syncVehicles;
  // ---- customers (Stage 4b): shoppers walk to owned businesses near the player; sales themselves are booked by the sim hourly model --------------------
  link.customers = createCustomers({
    sim, entities: game.entities, bus, clock, ambient: createAmbient({ seed: 0xc057 }),
    door: (siteId) => { const s = SITE_BY_ID[siteId]; return s && s.near ? poiPos(s.near) : null; },
    groundY: (x, z, dflt) => { try { return World.groundAt(x, dflt + 3, z).y; } catch (e) { return dflt; } },
  });
  let accT = 0;
  link.poiPos = poiPos; link.snapRoad = snapRoad;
  link.update = function (dtReal) {
    sim.tickReal(dtReal);
    link.customers.update(dtReal, here());
    if (link.controller) { link.controller.fixedUpdate(dtReal); if (!link.controller.active) { const c = link.controller; link.controller = null; if (sim.select('jobs.current')) c.stop(c.stopReason || 'ended'); } }
    accT += dtReal; if (accT < 0.5) return; accT = 0;
    // odometer: distance driven by the player in an owned vehicle -> fuel and wear
    const e = game.player.vehicleId;
    for (const [vid, eid] of entityOf) {
      if (eid !== e) continue;
      const v = game.vehicles.get(eid); if (!v) continue;
      const pos = [v.sim.x, 0, v.sim.z]; const last = odoAcc.get(vid) || pos; const km = dist2(pos, last) / 1000; odoAcc.set(vid, pos);
      if (km > 0.0001) sim.cmd('veh.use', { vehId: vid, km, throttle: Math.min(1, Math.abs(v.sim.speed) / (VEHICLE_ECON[v.sim.archetype] ? 20 : 20)) });
      sim.cmd('veh.setPos', { vehId: vid, pos: [v.sim.x, v.sim.y, v.sim.z], yaw: v.sim.yaw });
    }
    empty.clear(); for (const ov of sim.select('veh.owned')) if (ov.fuel <= 0 && entityOf.has(ov.id)) empty.add(entityOf.get(ov.id));
    void prevPos;
  };
  /** engine cut when the tank is empty (Annex D 10): refreshed with the 0.5 s odometer update, read per physics step */
  const empty = new Set();
  link.blocked = (entityId) => empty.has(entityId);
  link.entityOf = entityOf;
  return link;
}
