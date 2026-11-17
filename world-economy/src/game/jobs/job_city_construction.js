// Controller for job.city.construction (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobCityConstruction extends JobController {
  constructor(ctx) { super(ctx, 'job.city.construction'); }
  plan(task) { return PLANS['job.city.construction'](this, task); }
}
