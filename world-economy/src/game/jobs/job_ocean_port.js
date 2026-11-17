// Controller for job.ocean.port (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobOceanPort extends JobController {
  constructor(ctx) { super(ctx, 'job.ocean.port'); }
  plan(task) { return PLANS['job.ocean.port'](this, task); }
}
