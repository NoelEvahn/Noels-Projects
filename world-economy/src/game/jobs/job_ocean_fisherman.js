// Controller for job.ocean.fisherman (Annex C): task plan in plans.js, pay and validation in sim/jobsSim.js.
import { JobController } from './jobBase.js';
import { PLANS } from './plans.js';

export class JobOceanFisherman extends JobController {
  constructor(ctx) { super(ctx, 'job.ocean.fisherman'); }
  plan(task) { return PLANS['job.ocean.fisherman'](this, task); }
  units(score) { return { kg: Math.floor(220 * Math.min(1, score + 0.1)) }; }
}
