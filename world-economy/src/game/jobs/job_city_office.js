// Controller for job.city.office (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobCityOffice extends JobController {
  constructor(ctx) { super(ctx, 'job.city.office'); }
  plan(task) { return PLANS['job.city.office'](this, task); }
}
