// Controller for job.city.warehouse (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobCityWarehouse extends JobController {
  constructor(ctx) { super(ctx, 'job.city.warehouse'); }
  plan(task) { return PLANS['job.city.warehouse'](this, task); }
}
