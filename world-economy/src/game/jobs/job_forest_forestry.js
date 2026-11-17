// Controller for job.forest.forestry (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobForestForestry extends JobController {
  constructor(ctx) { super(ctx, 'job.forest.forestry'); }
  plan(task) { return PLANS['job.forest.forestry'](this, task); }
}
