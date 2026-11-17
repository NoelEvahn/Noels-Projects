// Controller for job.forest.logger (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobForestLogger extends JobController {
  constructor(ctx) { super(ctx, 'job.forest.logger'); }
  plan(task) { return PLANS['job.forest.logger'](this, task); }
  units(score) { return { m3: Math.max(1, Math.round(1 + score * 3)) }; }
}
