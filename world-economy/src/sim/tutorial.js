// Tutorial flow (Stage 4b): evaluates the data in data/tutorial.js against sim state and bus events; the Stage 5 UI reads `tutorial.state` and the
// tutorial:* events and calls tutorial.ack / tutorial.signal / tutorial.skip. No UI here. State lives in flags.tut (JSON) and mirrors the step
// index in flags.tutorial (the original save field, still settable with tutorial.set).
//   events:  tutorial:step {index, id, title, body, ui}   the current step changed (also fired once at the start)
//            tutorial:progress {id, have, need}            counter of the current step moved
//            tutorial:tip {id, title, body, ui}            a one-shot hint triggered
//            tutorial:done {skipped}
import { TUTORIAL_STEPS, TUTORIAL_TIPS } from '../data/tutorial.js';
import { ACCOUNTS } from '../data/ids.js';
import { ok, fail, ERR } from './util.js';

const get = (o, path) => path.split('.').reduce((v, k) => (v === undefined || v === null ? undefined : v[k]), o);
const cmp = (v, c) => (c.gte !== undefined ? v >= c.gte : true) && (c.lte !== undefined ? v <= c.lte : true) && (c.gt !== undefined ? v > c.gt : true) && (c.lt !== undefined ? v < c.lt : true) && (c.eq !== undefined ? v === c.eq : true);
const whereOk = (where, payload) => { if (!where) return true; for (const [path, want] of Object.entries(where)) { const v = get(payload, path); if (want !== null && typeof want === 'object') { if (typeof v !== 'number' || !cmp(v, want)) return false; } else if (v !== want) return false; } return true; };
const keyOf = (name, where) => name + '#' + (where ? JSON.stringify(where) : '');

export function createTutorial(ctx) {
  const F = () => ctx.state.flags;
  const SELECTORS = {
    cash: () => ctx.ledger.balance(ACCOUNTS.CASH), checking: () => ctx.ledger.balance(ACCOUNTS.CHECKING),
    liquid: () => ctx.ledger.balance(ACCOUNTS.CASH) + ctx.ledger.balance(ACCOUNTS.CHECKING) + ctx.ledger.balance(ACCOUNTS.SAVINGS),
    energy: () => ctx.state.needs.energy, hunger: () => ctx.state.needs.hunger, employer: () => ctx.state.jobs.employer,
    vendingUnits: () => ctx.state.businesses.filter((b) => b.typeId === 'biz.vending').reduce((s, b) => s + b.units.length, 0),
    businesses: () => ctx.state.businesses.length,
  };
  // every (event name, where) pair used by any condition gets a counter so events that happen before a step is current still count
  const evConds = new Map();   // event name -> [{key, where}]
  (function collect(c) {
    if (!c) return;
    if (c.ev || c.signal) { const name = c.ev || 'sig:' + c.signal; const k = keyOf(name, c.where); const l = evConds.get(name) || []; if (!l.some((x) => x.key === k)) l.push({ key: k, where: c.where }); evConds.set(name, l); }
    for (const x of c.any || []) collect(x); for (const x of c.all || []) collect(x);
  })({ all: [...TUTORIAL_STEPS.map((s) => s.done), ...TUTORIAL_TIPS.map((t) => t.when)] });
  const fresh = () => ({ i: 0, seen: {}, ack: {}, tips: {}, skipped: false, done: false, announced: -1, progress: -1 });
  const T = () => { const f = F(); if (!f.tut) { f.tut = fresh(); f.tut.i = Number.isInteger(f.tutorial) ? Math.max(0, Math.min(TUTORIAL_STEPS.length, f.tutorial)) : 0; } return f.tut; };
  function count(c) { return T().seen[keyOf(c.ev || 'sig:' + c.signal, c.where)] || 0; }
  function test(c, stepId) {
    if (!c) return true;
    if (c.all) return c.all.every((x) => test(x, stepId));
    if (c.any) return c.any.some((x) => test(x, stepId));
    if (c.ack) return !!T().ack[stepId];
    if (c.ev || c.signal) return count(c) >= (c.min || 1);
    if (c.sel) { const f = SELECTORS[c.sel]; if (!f) return false; const v = f(); return c.truthy ? !!v : cmp(v, c); }
    return false;
  }
  function primary(c) { if (!c) return null; if (c.ev || c.signal) return c; for (const x of c.all || c.any || []) { const p = primary(x); if (p && (p.min || 1) > 1) return p; } return null; }
  const stepView = (s) => ({ id: s.id, title: s.title, body: s.body, ui: s.ui });
  function progressOf(s) { const p = primary(s.done); return p ? { have: Math.min(count(p), p.min || 1), need: p.min || 1 } : null; }
  function evaluate() {
    const t = T(); if (t.done) return;
    let moved = false;
    while (t.i < TUTORIAL_STEPS.length && test(TUTORIAL_STEPS[t.i].done, TUTORIAL_STEPS[t.i].id)) { t.i++; moved = true; }
    F().tutorial = t.i;
    if (t.i >= TUTORIAL_STEPS.length) { t.done = true; ctx.emit('tutorial:step', { index: t.i, id: null, done: true }); ctx.emit('tutorial:done', { skipped: false }); }
    else {
      const s = TUTORIAL_STEPS[t.i];
      if (t.announced !== t.i || moved) { t.announced = t.i; t.progress = -1; ctx.emit('tutorial:step', { index: t.i, ...stepView(s) }); }
      const pr = progressOf(s); if (pr && pr.have !== t.progress) { t.progress = pr.have; ctx.emit('tutorial:progress', { id: s.id, have: pr.have, need: pr.need }); }
    }
    for (const tip of TUTORIAL_TIPS) if (!t.tips[tip.id] && test(tip.when, tip.id)) { t.tips[tip.id] = true; ctx.emit('tutorial:tip', { id: tip.id, title: tip.title, body: tip.body, ui: tip.ui }); }
  }
  function note(name, payload) {
    const l = evConds.get(name); if (!l) return;
    const t = T(); if (t.done) return;
    for (const c of l) if (whereOk(c.where, payload || {})) t.seen[c.key] = (t.seen[c.key] || 0) + 1;
    evaluate();
  }
  // sim-side events arrive through the bus
  if (ctx.bus) for (const name of evConds.keys()) if (!name.startsWith('sig:')) ctx.bus.on(name, (p) => { if (ctx.state) note(name, p); });
  const cmds = {
    /** game/UI-side signal (player:step -> 'moved', ui:open -> 'ui:open' with {screen}); ignored once the tutorial is over */
    'tutorial.signal': ({ name, data = {} }) => { if (typeof name !== 'string') return fail(ERR.INVALID_ARG); note('sig:' + name, data); return ok(); },
    /** the UI dismissed the coach mark of a step (current step when stepId is omitted) */
    'tutorial.ack': ({ stepId } = {}) => {
      const t = T(), id = stepId || (TUTORIAL_STEPS[t.i] && TUTORIAL_STEPS[t.i].id);
      if (!id || !TUTORIAL_STEPS.some((s) => s.id === id)) return fail(ERR.NOT_FOUND);
      t.ack[id] = true; evaluate(); return ok();
    },
    'tutorial.skip': () => { const t = T(); if (!t.done) { t.done = true; t.skipped = true; t.i = TUTORIAL_STEPS.length; F().tutorial = t.i; ctx.emit('tutorial:done', { skipped: true }); } return ok(); },
  };
  /** QA / dev jump (kept from the original command): `tutorial.set {step}` */
  function setStep(step) { const t = T(); t.i = Math.max(0, Math.min(TUTORIAL_STEPS.length, step | 0)); t.done = t.i >= TUTORIAL_STEPS.length; t.announced = -1; F().tutorial = t.i; evaluate(); }
  const selects = {
    'tutorial.state': () => {
      const t = T(), cur = TUTORIAL_STEPS[t.i] || null;
      return {
        step: t.i, total: TUTORIAL_STEPS.length, done: t.done, skipped: t.skipped, current: cur ? { ...stepView(cur), progress: progressOf(cur) } : null,
        steps: TUTORIAL_STEPS.map((s, i) => ({ id: s.id, title: s.title, state: i < t.i ? 'done' : i === t.i && !t.done ? 'active' : 'todo' })), tips: Object.keys(t.tips),
      };
    },
  };
  return { cmds, selects, note, evaluate, setStep, steps: TUTORIAL_STEPS };
}
