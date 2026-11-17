// Controller for job.city.mechanic (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobCityMechanic extends JobController {
  constructor(ctx) { super(ctx, 'job.city.mechanic'); }
  plan(task) { return PLANS['job.city.mechanic'](this, task); }
}
