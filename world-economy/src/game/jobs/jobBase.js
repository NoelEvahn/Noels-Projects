// JobController base (Annex C 1.2): runs the sim-issued tasks as a chain of mechanic primitives and reports results.
// Controllers read only Input (down/pressed/axis) and env (pos/mode/poi), so scripted bots can play them headless.
import { createRng } from '../../core/rng.js';
import { JOB_BY_ID } from '../../data/jobs.js';

export class JobController {
  /** @param {{bus, sim:{cmd,select}, input, env:{pos,mode,poi}, seed?:number}} ctx */
  constructor(ctx, jobId) {
    this.ctx = ctx; this.jobId = jobId; this.job = JOB_BY_ID[jobId]; this.sim = ctx.sim; this.input = ctx.input; this.env = ctx.env;
    this.rng = createRng((ctx.seed || 1) ^ jobId.length * 7919); this.shiftId = null; this.task = null; this.steps = []; this.stepIdx = 0;
    this.stepScores = []; this.taskT = 0; this.pending = null; this.pace = ctx.pace || 1; this.scoreScale = ctx.scoreScale || 1; this.stats = { tasks: 0, failed: 0, earned: 0 }; this.active = false; this.stopReason = null; this.lastResult = null;
  }
  /** override: return an array of primitives for a sim-issued task descriptor */
  plan() { throw new Error('plan() not implemented for ' + this.jobId); }
  /** override: extra arguments for job.nextTask */
  taskArgs() { return {}; }
  /** override: units payload for job.reportTask (fish kg, logs m3 ...) */
  units(score) { void score; return undefined; }
  start(shiftId) {
    this.shiftId = shiftId; this.active = true; this.stopReason = null; this.input.setContext && this.input.setContext('minigame');
    this.next();
  }
  next() {
    const r = this.sim.cmd('job.nextTask', { shiftId: this.shiftId, ...this.taskArgs() });
    if (!r.ok) { this.task = null; this.steps = []; this.waitNext = true; return; }
    this.waitNext = false;
    this.task = r.data; this.steps = this.plan(this.task); this.stepIdx = 0; this.stepScores = []; this.taskT = 0; this.pending = null;
  }
  get step() { return this.steps[this.stepIdx] || null; }
  fixedUpdate(dt) {
    if (!this.active) return;
    if (this.waitNext) { this.next(); return; }
    if (!this.task) return;
    this.taskT += dt;
    if (this.pending) { this.tryReport(); return; }
    const st = this.step;
    if (st) {
      const res = st.update(dt, this.input, this.env);
      if (res === 'done') { this.stepScores.push(st.score); this.stepIdx++; }
      else if (res === 'fail') { this.finishTask(true); return; }
    }
    if (this.stepIdx >= this.steps.length && (this.pace <= 1 || this.taskT >= this.task.minSeconds * this.pace)) {
      const avg = this.stepScores.reduce((a, b) => a + b, 0) / Math.max(1, this.stepScores.length);
      const par = this.task.minSeconds * 2, tf = this.taskT > par ? Math.max(0.5, par / this.taskT) : 1;
      this.finishTask(false, avg * tf * this.scoreScale);
    }
  }
  finishTask(failed, score = 0) {
    this.pending = { failed, score };
    this.tryReport();
  }
  tryReport() {
    const p = this.pending, t = this.task;
    const args = { shiftId: this.shiftId, taskId: t.id, score: p.score, failed: p.failed };
    if (!p.failed) { const u = this.units(p.score, t); if (u !== undefined) args.units = u; }
    const r = this.sim.cmd('job.reportTask', args);
    if (!r.ok) {
      if (r.error === 'ERR.REQUIREMENT' && r.detail === 'too fast') return; // hold until the minimum duration has elapsed
      // unrecoverable (task gone, shift over): drop and stop when the shift is no longer running
      this.pending = null; if (!this.sim.select('jobs.current')) { this.active = false; this.stopReason = 'ended'; } else if (r.error === 'ERR.CAPACITY') { this.stats.failed++; this.next(); }
      return;
    }
    this.pending = null; this.lastResult = r.data;
    if (r.data.failed) this.stats.failed++; else { this.stats.tasks++; this.stats.earned += (r.data.pay || 0) + (r.data.tip || 0); }
    if (r.data.ended) { this.active = false; this.stopReason = r.data.ended; return; }
    this.next();
  }
  getHud() {
    const st = this.step, cur = this.sim.select('jobs.current');
    return {
      title: this.job.title, objective: st ? (st.label || st.type) : 'Waiting for the next task', timerSec: this.task ? Math.max(0, this.task.minSeconds * 2 - this.taskT) : 0,
      progress: this.steps.length ? this.stepIdx / this.steps.length : 0, widgets: st ? [st.hud()] : [],
      prompts: st && st.hint().press ? [{ action: st.hint().press, label: 'Press' }] : [],
      shift: { tasks: cur ? cur.tasks : 0, earned: cur ? cur.gross + cur.tips : 0, grade: '-' },
    };
  }
  stop(reason = 'ended') {
    this.active = false; this.stopReason = reason;
    if (this.sim.select('jobs.current')) this.sim.cmd('job.endShift', {});
    this.input.setContext && this.input.setContext('foot');
  }
}
