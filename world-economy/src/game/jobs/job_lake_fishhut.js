// Controller for job.lake.fishhut (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobLakeFishhut extends JobController {
  constructor(ctx) { super(ctx, 'job.lake.fishhut'); }
  plan(task) { return PLANS['job.lake.fishhut'](this, task); }
}
