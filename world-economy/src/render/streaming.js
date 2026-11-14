// Streaming.pump (Annex B 7, Annex G 2.2): time-sliced generator jobs with a per-frame budget and overrun accounting.
export const Streaming = (() => {
  const jobs = []; // {key, gen, priority}
  const stats = { calls: 0, sliceOverruns: 0, maxPumpMs: 0, lastPumpMs: 0, steps: 0, completed: 0, maxStepMs: 0, maxStepKey: '', maxStepIndex: 0 };
  let dirty = false;
  let stepEst = 0; // recent worst step duration: a step is not started when it would likely overshoot the budget
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const api = {
    stats,
    get size() { return jobs.length; },
    has(key) { return jobs.some((j) => j.key === key); },
    add(key, gen, priority = 0, onDone) { jobs.push({ key, gen, priority, onDone }); dirty = true; },
    cancel(key) { const i = jobs.findIndex((j) => j.key === key); if (i >= 0) { const j = jobs[i]; if (j.gen.return) j.gen.return(); jobs.splice(i, 1); } },
    setPriority(key, priority) { const j = jobs.find((q) => q.key === key); if (j) { j.priority = priority; dirty = true; } },
    clear() { for (const j of jobs) if (j.gen.return) j.gen.return(); jobs.length = 0; },
    /** run jobs for up to budgetMs (checked between steps). budgetMs = Infinity drains the queue. */
    pump(budgetMs) {
      const t0 = now();
      stats.calls++;
      if (dirty) { jobs.sort((a, b) => a.priority - b.priority); dirty = false; }
      let guard = 0;
      while (jobs.length && now() - t0 < budgetMs && guard++ < 100000) {
        if (guard > 1 && isFinite(budgetMs) && now() - t0 + stepEst * 0.9 > budgetMs) break;
        const j = jobs[0];
        const s0 = now();
        const r = j.gen.next();
        const sd = now() - s0;
        stepEst = Math.max(stepEst * 0.995, sd);
        j.n = (j.n || 0) + 1;
        if (sd > stats.maxStepMs) { stats.maxStepMs = sd; stats.maxStepKey = j.key; stats.maxStepIndex = j.n; }
        stats.steps++;
        if (r.done) { jobs.shift(); stats.completed++; if (j.onDone) j.onDone(r.value); }
      }
      const dt = now() - t0;
      stats.lastPumpMs = dt;
      if (dt > stats.maxPumpMs) stats.maxPumpMs = dt;
      if (isFinite(budgetMs) && dt > budgetMs + 2) stats.sliceOverruns++;
      return dt;
    },
  };
  return api;
})();
