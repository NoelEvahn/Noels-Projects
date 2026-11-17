// Controller for job.city.delivery (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobCityDelivery extends JobController {
  constructor(ctx) { super(ctx, 'job.city.delivery'); }
  plan(task) { return PLANS['job.city.delivery'](this, task); }
}
