// Controller for job.city.restaurant (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobCityRestaurant extends JobController {
  constructor(ctx) { super(ctx, 'job.city.restaurant'); }
  plan(task) { return PLANS['job.city.restaurant'](this, task); }
}
