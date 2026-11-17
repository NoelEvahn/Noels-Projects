// Shared sim test helpers: build a strict Sim, advance game time through the real tick path, assert the ledger invariant.
import assert from 'node:assert/strict';
import { createSim } from '../../src/sim/index.js';
import { createBus } from '../../src/core/bus.js';

export function makeSim({ seed = 12345, strict = true, bus = false } = {}) {
  const b = bus ? createBus() : null;
  const sim = createSim({ bus: b, strict });
  sim.init({ seed });
  sim.bus = b;
  return sim;
}
/** advance `minutes` game minutes through Sim.tickMinute (the same path as the Clock and as sleep fast-forward) */
export function advance(sim, minutes, { real = 60 } = {}) {
  for (let i = 0; i < minutes; i++) {
    const t = sim.time + 1;
    sim.tickReal(real / 60);
    sim.tickMinute({ day: Math.floor(t / 1440) + 1, minute: t % 1440, total: t });
  }
}
export const advanceTo = (sim, day, hour) => { const target = (day - 1) * 1440 + hour * 60; if (target > sim.time) advance(sim, target - sim.time); };
export const invariant = (sim) => { const r = sim.ledger.checkInvariant(); assert.equal(r.ok, true, 'ledger invariant broken, sum=' + r.sum); };
export const bal = (sim, id = 'cash') => sim.ledger.balance(id);
export function cmd(sim, name, args = {}) { const r = sim.cmd(name, args); invariant(sim); return r; }
export const okCmd = (sim, name, args = {}) => { const r = cmd(sim, name, args); assert.equal(r.ok, true, name + ' failed: ' + JSON.stringify(r)); return r.data; };
export const nw = (sim) => sim.select('reports.netWorth').total;
/** give the sim a permissive services object (everything is in range) */
export const give = (sim, cents) => sim.cmd('debug.grant', { cents });
