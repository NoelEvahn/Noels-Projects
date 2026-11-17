// Controller for job.city.taxi (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobCityTaxi extends JobController {
  constructor(ctx) { super(ctx, 'job.city.taxi'); }
  plan(task) { return PLANS['job.city.taxi'](this, task); }
}
