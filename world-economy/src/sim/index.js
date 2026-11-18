// Sim facade (MASTER_SPEC 5.3, Annex D 11-13): the only way to change or read economic state. Pure, deterministic, integer cents.
import { createLedger } from './ledger.js';
import { openStartingAccounts, genesis } from './state.js';
import { createRng } from '../core/rng.js';
import { ERR, ACCOUNTS, TX } from '../data/ids.js';
import { BALANCE } from '../data/balance.js';
import { createInventory } from './inventory.js';
import { createSkills } from './skills.js';
import { createMarket } from './market.js';
import { createShops } from './shops.js';
import { createNeeds } from './needs.js';
import { createBank } from './bank.js';
import { createTax } from './tax.js';
import { createNotes } from './notifications.js';
import { createInvest } from './invest.js';
import { createReports } from './reports.js';
import { createJobs } from './jobsSim.js';
import { createBusiness } from './business/core.js';
import { createProperty } from './property.js';
import { createConstruction } from './construction.js';
import { createVehicles } from './vehiclesEcon.js';
import { createTutorial } from './tutorial.js';
import { ok, fail, clone, dayOf, hourOf, weekdayOf } from './util.js';

const START_MINUTE = 480;
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function createSim({ bus = null, strict = false } = {}) {
  const ctx = { bus, state: null, rng: null, services: {}, strict };
  ctx.now = () => (ctx.state ? ctx.state.t : START_MINUTE);
  ctx.hour = () => hourOf(ctx.now());
  ctx.emit = (type, payload) => { if (bus) bus.emit(type, payload); };
  ctx.ledger = createLedger({ bus, now: ctx.now });
  ctx.noteIncome = () => { const b = ctx.state.bank; if (b.incomeDay0 === null) b.incomeDay0 = dayOf(ctx.now()); };
  const M = {};
  ctx.inv = M.inv = createInventory(ctx);
  ctx.skills = M.skills = createSkills(ctx);
  ctx.market = M.market = createMarket(ctx);
  ctx.shops = M.shops = createShops(ctx);
  ctx.needs = M.needs = createNeeds(ctx);
  ctx.reports = M.reports = createReports(ctx);
  ctx.bank = M.bank = createBank(ctx);
  ctx.tax = M.tax = createTax(ctx);
  ctx.notes = M.notes = createNotes(ctx);
  ctx.note = (kind, title, body) => ctx.notes.add(kind, title, body);
  ctx.invest = M.invest = createInvest(ctx);
  ctx.jobs = M.jobs = createJobs(ctx);
  ctx.biz = M.biz = createBusiness(ctx);
  ctx.property = M.property = createProperty(ctx);
  ctx.cons = M.cons = createConstruction(ctx);
  ctx.veh = M.veh = createVehicles(ctx);
  ctx.tutorial = M.tutorial = createTutorial(ctx);

  const cmds = {}, selects = {};
  for (const m of [M.inv, M.market, M.shops, M.needs, M.bank, M.tax, M.notes, M.invest, M.jobs, M.biz, M.property, M.cons, M.veh, M.skills, M.reports, M.tutorial]) {
    Object.assign(cmds, m.cmds || {}); Object.assign(selects, m.selects || {});
  }
  cmds['debug.grant'] = ({ cents }) => {
    const r = ctx.ledger.transfer({ from: 'ext:debug', to: ACCOUNTS.CASH, amount: cents, type: TX.DEBUG, memo: 'QA grant' });
    if (r.ok) ctx.state.meta.cheated = true;
    return r;
  };
  cmds['debug.setTime'] = ({ hour }) => { ctx.state.meta.cheated = true; if (ctx.services.setTime) ctx.services.setTime(hour); return ok(); };
  cmds['settings.set'] = () => ok();
  cmds['tutorial.set'] = ({ step }) => { if (!Number.isInteger(step) || step < 0) return fail(ERR.INVALID_ARG); ctx.tutorial.setStep(step); return ok(); };

  function weatherNow() { return ctx.services.weather ? ctx.services.weather() : { type: 'clear', intensity: 0 }; }
  selects['time.now'] = () => { const t = ctx.now(); return { day: dayOf(t), minute: t % 1440, total: t, hour: hourOf(t), weekday: WEEKDAYS[weekdayOf(t)] }; };
  selects['weather.now'] = weatherNow;
  selects.cash = () => ctx.ledger.balance(ACCOUNTS.CASH);
  selects['ledger.balance'] = ({ id }) => ctx.ledger.balance(id);
  selects['ledger.invariant'] = () => ctx.ledger.checkInvariant();
  selects['ledger.recent'] = ({ limit = 20 } = {}) => ctx.ledger.query({ limit });
  selects['ledger.transactions'] = (a = {}) => ctx.ledger.query(a);
  selects['ledger.balances'] = () => { const o = {}; for (const id of ctx.ledger.accountIds()) if (!id.startsWith('ext:')) o[id] = ctx.ledger.balance(id); return o; };
  selects.cheated = () => ctx.state.meta.cheated;
  selects['player.summary'] = () => {
    const t = ctx.now(), L = ctx.ledger;
    return { cash: L.balance(ACCOUNTS.CASH), checking: L.balance(ACCOUNTS.CHECKING), savings: L.balance(ACCOUNTS.SAVINGS), netWorth: ctx.reports.netWorth().total, day: dayOf(t), weekday: WEEKDAYS[weekdayOf(t)], hour: hourOf(t), minute: t % 60, job: ctx.state.jobs.employer, home: ctx.state.properties.home, energy: Math.round(ctx.state.needs.energy * 10) / 10, hunger: Math.round(ctx.state.needs.hunger * 10) / 10, shift: !!ctx.state.jobs.shift };
  };

  function defaultState(seed) {
    return {
      t: START_MINUTE, seed, meta: { cheated: false },
      bank: ctx.bank.defaults(), tax: ctx.tax.defaults(), markets: ctx.market.defaults(), inventory: ctx.inv.defaults(), skills: ctx.skills.defaults(),
      needs: ctx.needs.defaults(), jobs: ctx.jobs.defaults(), ...ctx.biz.defaults(), properties: ctx.property.defaults(), plots: ctx.cons.defaults(),
      vehicles: ctx.veh.defaults(), invest: ctx.invest.defaults(), notes: [], flags: { tutorial: 0 },
    };
  }
  function makeRng(seed, saved) {
    const r = { sim: createRng((seed ^ 0xa5a5a5) >>> 0), jobs: createRng((seed ^ 0x123457) >>> 0), market: createRng((seed ^ 0x5678ab) >>> 0) };
    if (saved) for (const k of Object.keys(r)) if (saved[k]) r[k].setState(saved[k]);
    return r;
  }
  function init({ state, seed } = {}) {
    if (state && state.ledger) {
      const s = clone(state);
      ctx.ledger.restore(s.ledger); delete s.ledger;
      const rngSaved = s.rng; delete s.rng;
      ctx.state = { ...defaultState(s.seed || 12345), ...s };
      ctx.rng = makeRng(ctx.state.seed, rngSaved);
      ctx.state.meta = ctx.state.meta || { cheated: !!s.cheated };
      ctx.cons.restoreSites();
    } else {
      const sd = seed === undefined ? 12345 : seed;
      ctx.ledger.reset();
      ctx.state = defaultState(sd);
      ctx.rng = makeRng(sd);
      openStartingAccounts(ctx.ledger);
      genesis(ctx.ledger);
    }
  }
  /** per-minute tick (Annex D 11): needs, shift timers; hourly markets/businesses/securities; midnight closes; Monday weekly */
  function tickMinute(gt) {
    const st = ctx.state; st.t = gt.total;
    const minute = gt.minute;
    if (minute % 10 === 0) ctx.needs.tick10();
    ctx.jobs.tickMinute();
    if (minute % 5 === 0) ctx.tutorial.evaluate();
    if (minute !== 0) ctx.biz.pump(2);
    if (minute % 60 !== 0) return;
    const hour = minute / 60;
    ctx.market.hourly(hour);
    ctx.biz.hourly(hour, gt.total);
    ctx.invest.hourly();
    if (minute === 0) {
      ctx.inv.spoilage();
      ctx.biz.daily();
      ctx.property.daily();
      ctx.bank.daily();
      ctx.jobs.daily();
      ctx.market.dailyActivity();
      const h = (st.flags.nwHistory ||= []); h.push(ctx.reports.netWorth().total); if (h.length > 60) h.shift();
      if ((gt.day - 1) % 7 === 0) { ctx.bank.weekly(); ctx.tax.weekly(); ctx.property.weekly(); ctx.biz.weekly(); ctx.invest.weekly(); ctx.emit('time:week:sim', { week: Math.floor((gt.day - 1) / 7) + 1 }); }
      ctx.biz.pump(4);
      st.flags.autosaveDue = true;
    }
  }
  /** real-time accumulator used to validate task durations (minSeconds); called from the fixed step */
  function tickReal(dt) { if (ctx.state && ctx.state.jobs.shift) ctx.state.jobs.realSec = Math.round((ctx.state.jobs.realSec + dt) * 1e6) / 1e6; else if (ctx.state) ctx.state.jobs.realSec = Math.round((ctx.state.jobs.realSec + dt) * 1e6) / 1e6; }
  function cmd(name, args = {}) {
    const f = cmds[name];
    if (!f) return { ok: false, error: ERR.NOT_FOUND, detail: 'unknown command ' + name };
    if (!args || typeof args !== 'object') return fail(ERR.INVALID_ARG);
    try { const r = f(args); if (r && r.ok) ctx.tutorial.evaluate(); return r; } catch (e) { if (strict) throw e; return { ok: false, error: ERR.INVALID_ARG, detail: String(e && e.message || e) }; }
  }
  function select(name, args) {
    const f = selects[name];
    if (!f) return undefined;
    const v = f(args || {});
    return v && typeof v === 'object' ? clone(v) : v;
  }
  function serialize() {
    const s = clone(ctx.state);
    s.rng = { sim: ctx.rng.sim.state(), jobs: ctx.rng.jobs.state(), market: ctx.rng.market.state() };
    s.ledger = ctx.ledger.serialize();
    return s;
  }
  return {
    init, tickMinute, tickReal, cmd, select, serialize, ledger: ctx.ledger, ctx,
    setServices(s) { Object.assign(ctx.services, s); },
    get cheated() { return ctx.state.meta.cheated; },
    get time() { return ctx.now(); },
    cmdNames: () => Object.keys(cmds), selectNames: () => Object.keys(selects),
  };
}
export const Sim = createSim();
