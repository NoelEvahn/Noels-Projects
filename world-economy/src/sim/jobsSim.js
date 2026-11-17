// Jobs (Annex C 1): employment, shifts, seeded task issue, validated reports, payout at shift end.
import { JOB_BY_ID, JOB_TABLE } from '../data/jobs.js';
import { ITEM_BY_ID } from '../data/items.js';
import { BALANCE } from '../data/balance.js';
import { TX } from '../data/ids.js';
import { ok, fail, ERR, clamp, hourOf, weekdayOf, dayOf, posInt } from './util.js';

const TPH = { 'job.city.restaurant': 7, 'job.city.supermarket': 12.5, 'job.city.delivery': 3, 'job.city.construction': 3.5, 'job.city.taxi': 2.5, 'job.city.warehouse': 8, 'job.city.mechanic': 1.25, 'job.city.office': 4, 'job.lake.fishing': 1.2, 'job.lake.fishhut': 9, 'job.lake.boatrental': 5, 'job.lake.restaurant': 3, 'job.ocean.fisherman': 0.1, 'job.ocean.port': 8, 'job.ocean.boatop': 3, 'job.forest.logger': 2.5, 'job.forest.forestry': 3.5 };
const LAKE_SPOTS = {
  'poi.lake.fish.dock': [['item.fish.carp', 4], ['item.fish.perch', 4], ['item.fish.bass', 1]],
  'poi.lake.fish.rocks': [['item.fish.trout', 2], ['item.fish.bass', 3], ['item.fish.perch', 2]],
  'poi.lake.fish.reeds': [['item.fish.pike', 3], ['item.fish.perch', 3], ['item.fish.carp', 2]],
  'poi.lake.fish.inlet': [['item.fish.trout', 3], ['item.fish.perch', 2]],
  'poi.lake.fish.deep': [['item.fish.trout', 2], ['item.fish.pike', 2], ['item.fish.bass', 3]],
  'poi.lake.fish.heron': [['item.fish.carp', 5], ['item.fish.perch', 1]],
  default: [['item.fish.carp', 3], ['item.fish.perch', 3]],
};
const OCEAN_MIX = [['item.fish.mackerel', 4], ['item.fish.cod', 3], ['item.fish.snapper', 1.5], ['item.fish.shrimp', 1]];
const WEIGHT = { 'item.fish.carp': [1.2, 5], 'item.fish.perch': [0.5, 1.8], 'item.fish.bass': [1.2, 4.8], 'item.fish.pike': [2.2, 8], 'item.fish.trout': [1, 4.5] };

export function createJobs(ctx) {
  const S = () => ctx.state.jobs;
  const defaults = () => ({ employer: null, history: {}, licences: [], shift: null, nextShift: 1, nextTask: 1, realSec: 0, siteTasks: 0, stand: { health: 1, harvested: 0 }, forestHealth: 0.5 });
  const rng = () => ctx.rng.jobs;
  const hasLicence = (id) => S().licences.includes(id);
  const level = (job) => ctx.skills.level(job.skill);
  const shiftActive = () => !!S().shift;
  const securitiesOpen = () => ctx.skills.level('skill.city.office') >= 5;
  const hist = (id) => (S().history[id] ||= { shifts: 0, tasks: 0, earned: 0 });
  const inHours = (job, t) => {
    if (job.days && !job.days.includes(weekdayOf(t))) return false;
    const h = hourOf(t); return h >= job.hours[0] && h < job.hours[1];
  };
  function pickWeighted(items) { // [[value, w]]
    let tot = 0; for (const [, w] of items) tot += w;
    let r = rng().float() * tot; for (const [v, w] of items) { r -= w; if (r <= 0) return v; }
    return items[items.length - 1][0];
  }
  const rankMult = (job) => { if (!job.ranks) return 1; let m = 1; const l = level(job); for (const [lv, mm] of job.ranks) if (l >= lv) m = mm; return m; };
  function estimate(job) {
    let tot = 0, wt = 0;
    for (const t of Object.values(job.tasks)) { tot += (t.basePay + t.perMetre * 900) * t.w; wt += t.w; }
    return Math.round((tot / wt) * 0.82 * (TPH[job.id] || 3) * (1 + 0.07 * (level(job) - 1)));
  }
  function jobInfo(job) {
    const need = job.requires || {};
    const unmet = [];
    if (need.licence && !hasLicence(need.licence)) unmet.push(need.licence);
    return { id: job.id, title: job.title, employer: job.employer, poi: job.poi, hours: job.hours, days: job.days, requires: need, unmet, estHourly: estimate(job), skill: ctx.skills.level(job.skill), hired: S().employer === job.id || (job.selfEmployed && true), selfEmployed: job.selfEmployed, mechanics: job.mechanics, unlocks: job.unlocks, implemented: true };
  }
  function endShift(reason = 'ended') {
    const sh = S().shift; if (!sh) return fail(ERR.NOT_FOUND);
    const job = JOB_BY_ID[sh.jobId];
    const gross = sh.gross, tax = gross > 0 ? Math.ceil(gross * BALANCE.incomeTax) : 0, net = gross - tax;
    if (net > 0) ctx.ledger.transfer({ from: 'ext:employers', to: 'cash', amount: net, type: TX.WAGE, memo: job.title + ' shift ' + sh.id, ref: sh.id });
    if (tax > 0) ctx.ledger.transfer({ from: 'ext:employers', to: 'ext:tax', amount: tax, type: TX.TAX_INCOME, memo: 'Income tax withheld', ref: sh.id });
    if (sh.tips > 0) ctx.ledger.transfer({ from: 'ext:customers', to: 'cash', amount: sh.tips, type: TX.TIP, memo: 'Tips', ref: sh.id });
    if (gross + sh.tips > 0) ctx.noteIncome();
    const avg = sh.scoreN ? sh.scoreSum / sh.scoreN : 0;
    const grade = sh.tasks === 0 ? '-' : avg >= 0.9 ? 'A' : avg >= 0.75 ? 'B' : avg >= 0.6 ? 'C' : avg >= 0.4 ? 'D' : 'F';
    const h = hist(job.id); h.shifts++; h.tasks += sh.tasks; h.earned += net + sh.tips;
    const summary = { tasks: sh.tasks, gross, tax, tips: sh.tips, net, xp: sh.xp, grade, reason, strikes: sh.strikes };
    S().shift = null;
    ctx.emit('job:shiftEnd', { jobId: job.id, shiftId: sh.id, summary });
    if (net + sh.tips >= 100000) ctx.state.flags.autosaveDue = true;
    ctx.state.flags.autosaveDue = true;
    return ok(summary);
  }
  const forceEnd = (reason) => endShift(reason);
  function issueTask(sh, job, args) {
    const lvl = level(job);
    let kind;
    const kinds = Object.entries(job.tasks).filter(([, t]) => !t.minLevel || lvl >= t.minLevel);
    if (job.phaseEvery) { const phase = Math.floor(sh.issued / job.phaseEvery) % 2 === 0 ? 'A' : 'B'; const m = kinds.filter(([, t]) => t.phase === phase); kind = (m.length ? m : kinds)[0][0]; }
    else if (kinds.length > 1 && kinds.some(([, t]) => t.phase)) { const phase = rng().chance(0.7) ? 'A' : 'B'; const m = kinds.filter(([, t]) => t.phase === phase); kind = (m.length ? m : kinds)[0][0]; }
    else kind = pickWeighted(kinds.map(([k, t]) => [k, t.w || 1]));
    const spec = job.tasks[kind];
    const task = { id: 't' + S().nextTask++, kind, shiftId: sh.id, difficulty: spec.difficulty, minSeconds: spec.minSeconds, issuedReal: S().realSec, reported: false, params: {} };
    if (spec.needsDistance) task.params.distance = Math.round(rng().range(300, 1800));
    if (job.id === 'job.city.restaurant') task.params.components = rng().int(2, 4) + (lvl >= 5 ? 1 : 0);
    if (job.id === 'job.city.mechanic') task.params.fault = rng().pick(['misfire', 'belt', 'knock', 'brakes', 'exhaust']);
    if (job.id === 'job.city.taxi') { task.params.surge = (hourOf(ctx.now()) >= 22 || hourOf(ctx.now()) < 5) ? job.nightSurge : 1; }
    if (job.id === 'job.lake.fishing') {
      const spot = args.spot || 'default';
      const table = LAKE_SPOTS[spot] || LAKE_SPOTS.default;
      const species = pickWeighted(table);
      const [lo, hi] = WEIGHT[species]; const rod = ctx.jobs ? bestRod() : { maxKg: 4 };
      const kg = Math.max(1, Math.min(rod.maxKg, Math.round(rng().range(lo, hi) * (1 + 0.07 * (level(job) - 1)))));
      task.params = { spot, species, kg };
    }
    if (job.id === 'job.ocean.fisherman') {
      const mix = {}; let t = 0;
      for (let i = 0; i < 4; i++) { const sp = pickWeighted(OCEAN_MIX); mix[sp] = (mix[sp] || 0) + 1; t++; }
      task.params = { mix, maxKg: spec.maxKg };
    }
    if (job.id === 'job.forest.logger') task.params = { stand: args.stand || 'a', species: rng().chance(0.6) ? 'item.wood.log_pine' : 'item.wood.log_spruce', maxM3: 4 };
    if (job.id === 'job.forest.forestry') task.params.kind = kind;
    sh.issued++;
    sh.tasksOpen[task.id] = task;
    return task;
  }
  function bestRod() {
    const inv = ctx.state.inventory.containers.player.items; let best = { maxKg: 2, tension: 0.8 };
    for (const id of ['item.tool.rod_master', 'item.tool.rod_pro', 'item.tool.rod_basic']) if (inv[id] && inv[id].qty > 0) { best = ITEM_BY_ID[id].rod; break; }
    return best;
  }
  function hasRod() { const inv = ctx.state.inventory.containers.player.items; return ['item.tool.rod_basic', 'item.tool.rod_pro', 'item.tool.rod_master'].some((id) => inv[id] && inv[id].qty > 0); }
  const cmds = {
    'job.apply': ({ jobId }) => {
      const job = JOB_BY_ID[jobId]; if (!job) return fail(ERR.NOT_FOUND);
      if (job.selfEmployed) return ok({ selfEmployed: true });
      if (S().employer === jobId) return fail(ERR.BUSY, 'already hired');
      if (S().employer) return fail(ERR.BUSY, 'quit your current job first');
      const need = job.requires || {};
      if (need.licence && !hasLicence(need.licence)) return fail(ERR.REQUIREMENT, need.licence);
      if (need.skill && ctx.skills.level(need.skill.id) < need.skill.level) return fail(ERR.REQUIREMENT, 'skill');
      S().employer = jobId; ctx.emit('job:hired', { jobId });
      return ok({ jobId });
    },
    'job.quit': ({ jobId } = {}) => {
      if (!S().employer || (jobId && S().employer !== jobId)) return fail(ERR.NOT_FOUND);
      if (S().shift) return fail(ERR.BUSY, 'shift active');
      const id = S().employer; S().employer = null; ctx.emit('job:quit', { jobId: id });
      return ok();
    },
    'job.startShift': ({ jobId }) => {
      const job = JOB_BY_ID[jobId]; if (!job) return fail(ERR.NOT_FOUND);
      if (S().shift) return fail(ERR.BUSY, 'shift in progress');
      if (!job.selfEmployed && S().employer !== jobId) return fail(ERR.REQUIREMENT, 'not hired');
      if (ctx.state.needs.sleeping) return fail(ERR.BUSY, 'asleep');
      if (!inHours(job, ctx.now())) return fail(ERR.CLOSED);
      if (ctx.needs.energy() < 5) return fail(ERR.REQUIREMENT, 'too tired');
      if (job.id === 'job.lake.fishing' && !hasRod()) return fail(ERR.REQUIREMENT, 'need a rod');
      if (!job.selfEmployed && ctx.services.near && !ctx.services.near(job.poi)) return fail(ERR.OUT_OF_RANGE);
      const sh = { id: 's' + S().nextShift++, jobId, startT: ctx.now(), tasks: 0, issued: 0, tasksOpen: {}, gross: 0, tips: 0, xp: 0, strikes: 0, scoreSum: 0, scoreN: 0, inaccurate: 0 };
      S().shift = sh;
      ctx.emit('job:shiftStart', { jobId, shiftId: sh.id });
      return ok({ shiftId: sh.id, uniform: job.uniform });
    },
    'job.endShift': () => endShift('ended'),
    'job.nextTask': ({ shiftId, spot, stand } = {}) => {
      const sh = S().shift; if (!sh || sh.id !== shiftId) return fail(ERR.NOT_FOUND);
      if (Object.keys(sh.tasksOpen).length >= 3) return fail(ERR.LIMIT, 'too many open tasks');
      const job = JOB_BY_ID[sh.jobId];
      const t = issueTask(sh, job, { spot, stand });
      ctx.emit('job:task', { jobId: job.id, shiftId: sh.id, task: { id: t.id, kind: t.kind, params: t.params, difficulty: t.difficulty } });
      return ok({ ...t, reported: undefined });
    },
    'job.reportTask': ({ shiftId, taskId, score = 0, units, failed = false, partial }) => {
      const sh = S().shift; if (!sh || sh.id !== shiftId) return fail(ERR.NOT_FOUND);
      const task = sh.tasksOpen[taskId]; if (!task) return fail(ERR.NOT_FOUND, 'unknown or reported task');
      if (!Number.isFinite(score)) return fail(ERR.INVALID_ARG);
      if (!failed && S().realSec - task.issuedReal + 1e-6 < task.minSeconds) return fail(ERR.REQUIREMENT, 'too fast');
      const job = JOB_BY_ID[sh.jobId], spec = job.tasks[task.kind];
      score = clamp(score, 0, 1);
      delete sh.tasksOpen[taskId];
      sh.tasks += 0; // counted on success only
      if (failed) {
        sh.strikes++; sh.inaccurate++;
        ctx.needs.spend(spec.energy);
        ctx.emit('job:taskDone', { jobId: job.id, shiftId, score: 0, pay: 0, bonus: 0, failed: true });
        if (job.failure.maxStrikes > 0 && sh.strikes >= job.failure.maxStrikes) { endShift('failed'); return ok({ pay: 0, failed: true, ended: 'failed' }); }
        if (job.failure.consecutiveInaccurate && sh.inaccurate >= job.failure.consecutiveInaccurate) { endShift('failed'); return ok({ pay: 0, failed: true, ended: 'failed' }); }
        return ok({ pay: 0, failed: true, strikes: sh.strikes });
      }
      sh.inaccurate = 0;
      const lvl = level(job);
      let mult = (1 + BALANCE.skillMultPerLevel * (lvl - 1)) * rankMult(job);
      if (job.id === 'job.city.restaurant' && lvl >= 8) mult *= 1.25;
      if (task.params.surge) mult *= task.params.surge;
      let pay = 0, extra = {};
      const q = 0.4 + 0.6 * score;
      if (job.id === 'job.ocean.fisherman') {
        const kg = clamp(Math.floor((units && units.kg) || 0), 0, task.params.maxKg);
        if (kg <= 0) { ctx.emit('job:taskDone', { jobId: job.id, shiftId, score, pay: 0, bonus: 0 }); return ok({ pay: 0 }); }
        let value = 0, tot = 0; for (const n of Object.values(task.params.mix)) tot += n;
        const MK = 'mkt.ocean.seafood';
        for (const [sp, n] of Object.entries(task.params.mix)) { const k = Math.floor(kg * n / tot); if (k > 0) { value += ctx.market.quote(MK, sp, k, 'sell').total; ctx.market.addStock(MK, sp, k); } }
        pay = Math.floor(value * (spec.share + spec.sharePerLevel * (lvl - 1)) * q); extra = { kg, value };
      } else if (job.id === 'job.forest.logger') {
        const m3 = clamp(Math.floor((units && units.m3) || 0), 0, task.params.maxM3);
        const st = S().stand;
        const eff = Math.max(0, m3 * st.health);
        pay = Math.floor(spec.basePay * eff * q * mult); extra = { m3, eff };
        if (m3 > 0) {
          ctx.market.addStock('mkt.forest.sawmill', task.params.species, m3);
          st.harvested += m3; if (st.harvested > 60) st.health = Math.max(0.2, st.health - 0.01 * m3);
        }
      } else if (job.id === 'job.lake.fishing') {
        pay = 0;
        const p = task.params; const kg = clamp(Math.floor((units && units.kg) || 0), 0, p.kg);
        if (kg > 0) {
          const a = ctx.inv.add('player', p.species, kg);
          if (!a.ok) { sh.tasksOpen[taskId] = task; return a; }
          extra = { species: p.species, kg };
        }
      } else {
        const base = spec.basePay + spec.perMetre * (task.params.distance || 0);
        pay = Math.floor(base * q * mult);
      }
      let tip = 0;
      if (job.tips && pay > 0) tip = Math.floor(pay * Math.min(job.tips, BALANCE.tipCap) * clamp((score - 0.5) * 2, 0, 1));
      if (partial === true) { pay = Math.floor(pay / 2); tip = 0; }
      const xp = job.id === 'job.lake.fishing' && (extra.kg || 0) > 0 ? Math.round(10 * spec.difficulty * Math.max(score, 0.3) * (1 + extra.kg / 10)) : Math.round(10 * task.difficulty * score);
      sh.gross += pay; sh.tips += tip; sh.xp += xp; sh.tasks++; sh.scoreSum += score; sh.scoreN++;
      ctx.skills.addXp(job.skill, xp);
      ctx.needs.spend(spec.energy);
      hist(job.id).tasksTotal = (hist(job.id).tasksTotal || 0) + 1;
      applyLinks(job, spec, task);
      ctx.emit('job:taskDone', { jobId: job.id, shiftId, score, pay, bonus: tip });
      if (ctx.needs.energy() <= 0) { endShift('exhausted'); return ok({ pay, tip, ended: 'exhausted', ...extra }); }
      return ok({ pay, tip, xp, ...extra });
    },
  };
  function applyLinks(job, spec, task) {
    const L = job.links || {};
    if (L.activity) ctx.market.bumpActivity(L.activity[0], L.activity[1]);
    if (L.market) ctx.market.addStock(L.market[0], L.market[1], L.market[2]);
    if (L.forestHealth) S().forestHealth = clamp(S().forestHealth + (spec.health || L.forestHealth * 0.5), 0, 1);
    if (spec.links && spec.links.site) { S().siteTasks++; if (S().siteTasks % 40 === 0) ctx.emit('build:changed', { plotId: 'site.construction' }); }
    if (spec.links && spec.links.stock) ctx.market.addStock('mkt.city.wholesale', spec.links.stock[0], -spec.links.stock[1]);
    void task;
  }
  const siteStage = () => Math.min(5, Math.floor(S().siteTasks / 40));
  /** per-minute shift timer (Annex C 1.1: ends after 8 game hours) */
  function tickMinute() {
    const sh = S().shift; if (!sh) return;
    if (ctx.now() - sh.startT >= BALANCE.shiftMaxMinutes) endShift('timeout');
  }
  function daily() {
    const st = S().stand;
    st.health = Math.min(1, st.health + (1 / 12) * (0.5 + S().forestHealth));
    st.harvested = Math.max(0, st.harvested - 60 / 7);
    S().forestHealth = clamp(S().forestHealth - 0.002, 0, 1);
  }
  const selects = {
    'jobs.list': () => JOB_TABLE.map(jobInfo),
    'jobs.current': () => { const sh = S().shift; if (!sh) return null; return { shiftId: sh.id, jobId: sh.jobId, startT: sh.startT, tasks: sh.tasks, gross: sh.gross, tips: sh.tips, strikes: sh.strikes, open: Object.keys(sh.tasksOpen) }; },
    'jobs.employer': () => S().employer,
    'jobs.licences': () => S().licences.slice(),
    'jobs.siteStage': () => siteStage(),
  };
  return { defaults, cmds, selects, tickMinute, daily, hasLicence, shiftActive, forceEnd, securitiesOpen, siteStage, hasRod, estimate, posInt, dayOf };
}
