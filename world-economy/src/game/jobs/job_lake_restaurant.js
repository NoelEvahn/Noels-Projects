// Controller for job.lake.restaurant (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobLakeRestaurant extends JobController {
  constructor(ctx) { super(ctx, 'job.lake.restaurant'); }
  plan(task) { return PLANS['job.lake.restaurant'](this, task); }
}
