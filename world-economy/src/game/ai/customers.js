// Customer AI (Stage 4b, MASTER_SPEC 6.1): shoppers walk to the doors of the player's businesses while the player is nearby.
// Pure JS (no three, no DOM). Extends ambient.js: spawn points come from its pedestrian network (`ambient.approachPoint`), the agents are `npc`
// entities (archetype chr.ped) so the existing entity views draw them, and every spawn emits `npc:customer {bizId, entityId}`.
//
// Money: this module NEVER moves money. Sales are booked by the hourly business model (sim/business/hour.js) as ext:customers -> biz:<id>,
// type sale.goods. The visual flow only mirrors the model: its rate is `Sim.select('biz.demand')`, the expected customers per hour from the same terms
// the hourly model uses (footfall of the site and hour, weekday, weather, regional activity, appeal from quality and reputation, price response,
// staff and seat capacity, stock on hand), so a closed, suspended, understaffed, out-of-stock or overpriced business gets fewer or no visitors.
// Own RNG stream: running or not running the customer AI cannot change any ledger result (tested in test/sim/customers.sim.mjs).
import { createRng } from '../../core/rng.js';
import { ENTITY_FLAGS } from '../../data/ids.js';
import { setPose, snapPose } from '../entities.js';

const CFG = { radius: 150, maxAgents: 24, maxPerPoint: 6, maxScale: 6, listEvery: 5, flowEvery: 1, approach: [16, 38], exit: [14, 26], walk: [1.2, 1.7], dwell: [3, 9], doorR: 1.3, despawnR: 190 };

export function createCustomers({ sim, entities, bus, ambient = null, door, groundY = null, clock = null, seed = 0x5c0de, config = {} }) {
  const cfg = { ...CFG, ...config };
  const rng = createRng(seed);
  const agents = [];
  let bizList = [], tList = 1e9, tFlow = 1e9, spawned = 0;
  const flows = new Map();       // point key -> {bizId, siteId, pos:[x,y,z], rate: customers per REAL second}
  const accs = new Map();        // point key -> fractional customers carried between refreshes
  const doorCache = new Map();   // siteId -> [x,y,z] | null
  const scratch = { x: 0, y: 0, z: 0, edge: -1 };
  const rnd = () => rng.float();
  const doorOf = (siteId) => { if (!siteId) return null; let d = doorCache.get(siteId); if (d === undefined) { d = door(siteId) || null; doorCache.set(siteId, d); } return d; };
  const yAt = (x, z, dflt) => (groundY ? groundY(x, z, dflt) : dflt);

  function refreshList() { bizList = sim.select('biz.list').filter((b) => b.siteId || b.typeId === 'biz.vending'); }
  function refreshFlows(player) {
    flows.clear();
    const scale = clock ? clock.scale : 1;
    for (const b of bizList) {
      const f = sim.select('biz.demand', { bizId: b.id }); if (!f || !f.open) continue;
      for (const p of f.points) {
        const d = doorOf(p.siteId); if (!d) continue;
        if (Math.hypot(d[0] - player[0], d[2] - player[2]) > cfg.radius) continue;
        const key = b.id + ':' + (p.unitId || p.siteId);
        // customers per game hour -> per real second: scale game minutes pass per real second, 60 minutes per hour
        flows.set(key, { bizId: b.id, siteId: p.siteId, pos: d, rate: p.perHour * scale / 60 }); if (!accs.has(key)) accs.set(key, rnd());
      }
    }
  }
  function countAt(key) { let n = 0; for (const a of agents) if (a.key === key) n++; return n; }
  function spawn(fl, key) {
    const dist = rng.range(cfg.approach[0], cfg.approach[1]);
    let sp = ambient && ambient.approachPoint ? ambient.approachPoint(fl.pos[0], fl.pos[2], dist, rnd, scratch) : null;
    let sx, sz;
    if (sp) { sx = sp.x; sz = sp.z; } else { const a = rng.range(0, 6.283); sx = fl.pos[0] + Math.cos(a) * dist; sz = fl.pos[2] + Math.sin(a) * dist; }
    const sy = yAt(sx, sz, fl.pos[1]);
    const ent = entities.create('npc', 'chr.ped', { pos: [sx, sy, sz], yaw: Math.atan2(fl.pos[0] - sx, -(fl.pos[2] - sz)), parts: { outfitSeed: rng.int(0, 0xfffff) } });
    ent.anim.state = 'walk';
    const ag = { ent, bizId: fl.bizId, key, phase: 0, speed: rng.range(cfg.walk[0], cfg.walk[1]), tx: fl.pos[0], tz: fl.pos[2], ty: fl.pos[1], dwell: rng.range(cfg.dwell[0], cfg.dwell[1]), start: [sx, sy, sz] };
    agents.push(ag); spawned++;
    if (bus) bus.emit('npc:customer', { bizId: fl.bizId, entityId: ent.id });
  }
  function kill(i) { entities.destroy(agents[i].ent.id); agents.splice(i, 1); }
  function step(a, dt) {
    const e = a.ent;
    if (a.phase === 1) { a.dwell -= dt; if (a.dwell <= 0) { e.flags |= ENTITY_FLAGS.VISIBLE; a.phase = 2; a.speed = rng.range(cfg.walk[0], cfg.walk[1]); const dst = rng.range(cfg.exit[0], cfg.exit[1]), s = a.start; const dx = s[0] - a.tx, dz = s[2] - a.tz, l = Math.hypot(dx, dz) || 1; a.tx = a.tx + dx / l * dst; a.tz = a.tz + dz / l * dst; a.ty = yAt(a.tx, a.tz, e.pos[1]); e.anim.state = 'walk'; } return false; }
    const dx = a.tx - e.pos[0], dz = a.tz - e.pos[2], d = Math.hypot(dx, dz), mv = Math.min(d, a.speed * dt);
    if (d > 0.001) { const nx = e.pos[0] + dx / d * mv, nz = e.pos[2] + dz / d * mv; setPose(e, nx, a.phase === 0 ? e.pos[1] + (a.ty - e.pos[1]) * Math.min(1, mv / Math.max(d, 0.001)) : yAt(nx, nz, e.pos[1]), nz, Math.atan2(dx, -dz)); e.vel[0] = dx / d * a.speed; e.vel[2] = dz / d * a.speed; e.anim.speed = a.speed; }
    if (a.phase === 0 && d <= cfg.doorR) { a.phase = 1; e.flags &= ~ENTITY_FLAGS.VISIBLE; e.anim.state = 'idle'; e.vel[0] = e.vel[2] = 0; return false; }
    return a.phase === 2 && d <= cfg.doorR;
  }
  return {
    cfg, agents,
    /** dtReal real seconds; player = [x, y, z]. Cheap when no business is within `radius` of the player (one list refresh every 5 s). */
    update(dtReal, player) {
      const scale = clock ? clock.scale : 1;
      if (scale <= 0 || scale > cfg.maxScale) { for (let i = agents.length - 1; i >= 0; i--) kill(i); flows.clear(); accs.clear(); return; }   // sleeping / fast-forward: no visuals
      const dt = Math.min(dtReal, 0.1);
      tList += dt; tFlow += dt;
      if (tList >= cfg.listEvery) { tList = 0; refreshList(); tFlow = cfg.flowEvery; }
      if (tFlow >= cfg.flowEvery) { tFlow = 0; refreshFlows(player); }
      for (const [key, fl] of flows) {
        let acc = (accs.get(key) || 0) + fl.rate * dt;
        while (acc >= 1) { acc -= 1; if (agents.length < cfg.maxAgents && countAt(key) < cfg.maxPerPoint) spawn(fl, key); }
        accs.set(key, acc);
      }
      for (let i = agents.length - 1; i >= 0; i--) {
        const a = agents[i];
        if (Math.hypot(a.ent.pos[0] - player[0], a.ent.pos[2] - player[2]) > cfg.despawnR) { kill(i); continue; }
        if (step(a, dt)) kill(i);
      }
    },
    stats() { return { agents: agents.length, spawned, points: flows.size }; },
    clear() { for (let i = agents.length - 1; i >= 0; i--) kill(i); flows.clear(); },
    /** test hook: force the flow table now */
    refresh(player) { refreshList(); refreshFlows(player); },
    snapAll() { for (const a of agents) snapPose(a.ent, a.ent.pos[0], a.ent.pos[1], a.ent.pos[2], 0); },
  };
}
