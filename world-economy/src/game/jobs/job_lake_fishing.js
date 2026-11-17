// Controller for job.lake.fishing (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobLakeFishing extends JobController {
  constructor(ctx) { super(ctx, 'job.lake.fishing'); }
  plan(task) { return PLANS['job.lake.fishing'](this, task); }
  taskArgs() { return { spot: this.ctx.spot || 'poi.lake.fish.dock' }; }
  units(score, task) { return { kg: score >= 0.3 ? task.params.kg : 0 }; }
}
