// Controller for job.lake.boatrental (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobLakeBoatrental extends JobController {
  constructor(ctx) { super(ctx, 'job.lake.boatrental'); }
  plan(task) { return PLANS['job.lake.boatrental'](this, task); }
}
