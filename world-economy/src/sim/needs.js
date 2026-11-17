// Needs (Annex D 5.5): energy and hunger, sleep, pass-out. Updated every 10 game minutes.
import { BALANCE } from '../data/balance.js';
import { TX } from '../data/ids.js';
import { ok, fail, ERR, clamp, dayOf } from './util.js';

export function createNeeds(ctx) {
  const S = () => ctx.state.needs;
  const defaults = () => ({ energy: 100, hunger: 100, sleeping: null });
  function apply(effect) {
    const n = S();
    if (effect.hunger) n.hunger = clamp(n.hunger + effect.hunger, 0, 100);
    if (effect.energy) n.energy = clamp(n.energy + effect.energy, 0, n.hunger <= 0 ? 50 : 100);
    ctx.emit('needs:changed', { energy: n.energy, hunger: n.hunger });
  }
  /** task energy cost (jobs) */
  function spend(e) { const n = S(); n.energy = Math.max(0, n.energy - e); ctx.emit('needs:changed', { energy: n.energy, hunger: n.hunger }); return n.energy; }
  const energy = () => S().energy;
  function tick10() {
    const n = S(), dt = 10 / 60;
    const fit = 1 - 0.02 * (ctx.skills.level('skill.fitness') - 1);
    if (n.sleeping) {
      n.energy = clamp(n.energy + n.sleeping.rate * dt, 0, n.hunger <= 0 ? 50 : 100);
      n.hunger = clamp(n.hunger - BALANCE.hungerDrainPerHour * dt * 0.5, 0, 100);
      if (ctx.now() >= n.sleeping.until) { const w = n.sleeping; n.sleeping = null; ctx.emit('needs:wake', { passedOut: !!w.passedOut }); ctx.note('needs', w.passedOut ? 'You passed out' : 'You woke up', ''); }
    } else {
      n.hunger = clamp(n.hunger - BALANCE.hungerDrainPerHour * dt, 0, 100);
      n.energy = clamp(n.energy - BALANCE.energyDrainPerHour * dt * (n.hunger < 20 ? 1.5 : 1) * fit, 0, n.hunger <= 0 ? 50 : 100);
      if (n.energy <= 0) passOut();
    }
    ctx.emit('needs:changed', { energy: n.energy, hunger: n.hunger });
  }
  function passOut() {
    const n = S();
    const home = ctx.property.homeId();
    n.sleeping = { until: ctx.now() + BALANCE.passOutHours * 60, rate: (home ? BALANCE.sleepHomePerHour : BALANCE.sleepHostelPerHour), passedOut: true };
    if (!home) ctx.ledger.charge({ amount: BALANCE.passOutFee, to: 'ext:services', type: TX.FEE, memo: 'Passed out at the hostel' });
    ctx.emit('needs:sleep', { minutes: BALANCE.passOutHours * 60, passedOut: true });
    if (ctx.jobs.shiftActive()) ctx.jobs.forceEnd('exhausted');
  }
  const cmds = {
    'needs.sleep': ({ untilHour, where = 'hostel' } = {}) => {
      const n = S();
      if (n.sleeping) return fail(ERR.BUSY);
      if (!Number.isFinite(untilHour) || untilHour < 0 || untilHour > 24) return fail(ERR.INVALID_ARG);
      if (ctx.jobs.shiftActive()) return fail(ERR.BUSY, 'shift active');
      const now = ctx.now();
      let until = Math.floor(now / 1440) * 1440 + Math.round(untilHour * 60);
      if (until <= now + 30) until += 1440;
      let rate;
      if (where === 'home') {
        if (!ctx.property.homeId()) return fail(ERR.REQUIREMENT, 'no home');
        if (ctx.services.near && !ctx.services.near('home')) return fail(ERR.OUT_OF_RANGE);
        rate = BALANCE.sleepHomePerHour * (1 + 0.3 * ctx.property.homeComfort());
      } else {
        if (ctx.services.near && !ctx.services.near('poi.city.hostel')) return fail(ERR.OUT_OF_RANGE);
        const r = ctx.ledger.charge({ amount: BALANCE.hostelNight, to: 'ext:landlords', type: TX.RENT_PAID, memo: 'Hostel bed' });
        if (!r.ok) return r;
        rate = BALANCE.sleepHostelPerHour;
      }
      n.sleeping = { until, rate };
      ctx.emit('needs:sleep', { minutes: until - now });
      return ok({ minutes: until - now, scale: 120, until });
    },
  };
  const selects = { 'needs.state': () => ({ energy: Math.round(S().energy * 10) / 10, hunger: Math.round(S().hunger * 10) / 10, sleeping: !!S().sleeping }) };
  return { defaults, apply, spend, energy, tick10, cmds, selects, dayOf };
}
