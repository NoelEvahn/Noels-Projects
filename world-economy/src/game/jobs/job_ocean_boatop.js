// Controller for job.ocean.boatop (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobOceanBoatop extends JobController {
  constructor(ctx) { super(ctx, 'job.ocean.boatop'); }
  plan(task) { return PLANS['job.ocean.boatop'](this, task); }
}
