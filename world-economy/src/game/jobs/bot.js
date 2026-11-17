// Scripted input bots for job controllers (headless QA, `__LOE.bots`, tests). A 'good' bot reads each primitive's hint() and plays it
// correctly; a 'bad' bot mashes jump at random so every task fails. Controllers cannot tell a bot from a player: both go through Input.
import { createController } from './index.js';
import { createRng } from '../../core/rng.js';

export function createFakeInput() {
  const down = new Set(), pressed = new Set(), axes = {};
  return {
    down: (a) => down.has(a), pressed: (a) => pressed.has(a), axis: (n) => axes[n] || 0,
    setDown(a, on) { if (on) down.add(a); else down.delete(a); }, press(a) { pressed.add(a); }, setAxis(n, v) { axes[n] = v; },
    endFrame() { pressed.clear(); down.clear(); for (const k of Object.keys(axes)) axes[k] = 0; }, setContext() {},
  };
}
function hashPos(id) { let h = 7; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return [(h % 400) * 5, 0, ((h >> 9) % 400) * 5]; }
export function createFakeEnv() {
  let pos = [0, 0, 0], mode = 'foot';
  return { pos: () => pos, mode: () => mode, poi: (id) => hashPos(id), teleport(p, m) { pos = p.slice(); if (m) mode = m; }, setMode(m) { mode = m; } };
}
export function botTick(ctrl, inp, env, style, st, dt) {
  inp.endFrame();
  st.cool = Math.max(0, st.cool - dt);
  const step = ctrl.step; if (!step || ctrl.pending) return;
  if (style === 'bad') { if (st.cool <= 0) { inp.press('jump'); st.cool = 0.4; } return; }
  const h = step.hint(); if (!h) return;
  if (h.goto) {
    const here = env.pos(), d = Math.hypot(here[0] - h.goto[0], here[2] - h.goto[2]);
    if (d > h.radius * 0.8) { env.teleport(h.goto, h.mode || env.mode()); return; }
    if (h.mode && env.mode() !== h.mode) env.setMode(h.mode);
    if (h.press && st.cool <= 0) { inp.press(h.press); st.cool = 0.1; }
    return;
  }
  if (h.cursor !== undefined) { if (st.cool <= 0) { inp.press(h.cursor !== h.correct ? 'turnRight' : 'interact'); st.cool = 0.08; } return; }
  if (h.axis) { for (const [k, v] of Object.entries(h.axis)) inp.setAxis(k, v); return; }
  if (h.hold) { if (h.when === undefined || h.when) inp.setDown(h.hold, true); return; }
  if (h.press && (h.when === undefined || h.when) && st.cool <= 0) { inp.press(h.press); st.cool = 0.12; }
}
/** Play one shift headless. `clock.minute()` is called once per 60 fixed steps (1 game minute at scale 1). */
export function runShift({ sim, jobId, style = 'good', minutes = 60, seed = 1, env = createFakeEnv(), onMinute = null, bus = null, spot, pace = 1, scoreScale = 1 }) {
  const inp = createFakeInput();
  const ap = sim.cmd('job.apply', { jobId });
  if (!ap.ok && ap.error !== 'ERR.BUSY') return { ok: false, error: ap.error, detail: ap.detail };
  const st = sim.cmd('job.startShift', { jobId });
  if (!st.ok) return { ok: false, error: st.error, detail: st.detail };
  let summary = null; const off = bus ? bus.on('job:shiftEnd', (p) => { summary = p.summary; }) : null;
  const ctrl = createController(jobId, { sim, input: inp, env, seed, spot, pace, scoreScale });
  ctrl.start(st.data.shiftId);
  const bst = { cool: 0 }, dt = 1 / 60; let steps = 0;
  const max = minutes * 60;
  while (ctrl.active && steps < max) {
    botTick(ctrl, inp, env, style, bst, dt);
    sim.tickReal(dt); ctrl.fixedUpdate(dt); steps++;
    if (steps % 60 === 0 && onMinute) onMinute();
  }
  const reason = ctrl.stopReason;
  if (ctrl.active) ctrl.stop('ended');
  if (off) off();
  return { ok: true, summary, reason, stats: ctrl.stats, minutes: steps / 60, ctrl };
}
void createRng;
