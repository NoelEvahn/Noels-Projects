// Job controller registry (17 controllers) and the runner used by Game.jobs.
import { JobCityRestaurant } from './job_city_restaurant.js';
import { JobCitySupermarket } from './job_city_supermarket.js';
import { JobCityDelivery } from './job_city_delivery.js';
import { JobCityConstruction } from './job_city_construction.js';
import { JobCityTaxi } from './job_city_taxi.js';
import { JobCityWarehouse } from './job_city_warehouse.js';
import { JobCityMechanic } from './job_city_mechanic.js';
import { JobCityOffice } from './job_city_office.js';
import { JobLakeFishing } from './job_lake_fishing.js';
import { JobLakeFishhut } from './job_lake_fishhut.js';
import { JobLakeBoatrental } from './job_lake_boatrental.js';
import { JobLakeRestaurant } from './job_lake_restaurant.js';
import { JobOceanFisherman } from './job_ocean_fisherman.js';
import { JobOceanPort } from './job_ocean_port.js';
import { JobOceanBoatop } from './job_ocean_boatop.js';
import { JobForestLogger } from './job_forest_logger.js';
import { JobForestForestry } from './job_forest_forestry.js';

export const CONTROLLERS = {
  'job.city.restaurant': JobCityRestaurant,
  'job.city.supermarket': JobCitySupermarket,
  'job.city.delivery': JobCityDelivery,
  'job.city.construction': JobCityConstruction,
  'job.city.taxi': JobCityTaxi,
  'job.city.warehouse': JobCityWarehouse,
  'job.city.mechanic': JobCityMechanic,
  'job.city.office': JobCityOffice,
  'job.lake.fishing': JobLakeFishing,
  'job.lake.fishhut': JobLakeFishhut,
  'job.lake.boatrental': JobLakeBoatrental,
  'job.lake.restaurant': JobLakeRestaurant,
  'job.ocean.fisherman': JobOceanFisherman,
  'job.ocean.port': JobOceanPort,
  'job.ocean.boatop': JobOceanBoatop,
  'job.forest.logger': JobForestLogger,
  'job.forest.forestry': JobForestForestry,
};

export function createController(jobId, ctx) {
  const C = CONTROLLERS[jobId];
  return C ? new C(ctx) : null;
}
