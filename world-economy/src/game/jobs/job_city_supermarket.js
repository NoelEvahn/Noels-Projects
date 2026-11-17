// Controller for job.city.supermarket (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobCitySupermarket extends JobController {
  constructor(ctx) { super(ctx, 'job.city.supermarket'); }
  plan(task) { return PLANS['job.city.supermarket'](this, task); }
}
