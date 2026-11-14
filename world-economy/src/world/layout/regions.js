// Regions and districts (Annex B 4). Pure.
export function coastZ(x) { return 1150 + 45 * Math.sin(x / 380) + 25 * Math.sin(x / 130 + 1.3); }

export function regionAt(x, z) {
  if (z > coastZ(x)) return 'ocean';
  if (x < -410 && z >= 450) return 'ocean';
  if (z < -400) return x < 0 ? 'lake' : 'forest';
  if (x < -410) return 'lake';
  return 'city';
}

const R = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
const inR = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

// First match wins, in this order, within the region. The last entry of each region is the "rest of region" fallback.
export const DISTRICT_RECTS = {
  city: [
    ['city.oldtown', [R(-290, 120, 50, 650)]],
    ['city.downtown', [R(260, 820, 50, 550)]],
    ['city.market', [R(260, 1100, 550, 750)]],
    ['city.industrial', [R(260, 1100, 750, 950)]],
    ['city.docks', [R(-290, 1100, 950, 1150), R(-290, 260, 650, 950)]],
    ['city.eastside', [R(820, 1500, -150, 550)]],
    ['city.northgate', [R(-290, 1100, -400, -150)]],
  ],
  lake: [
    ['lake.pinehaven', [R(-820, -560, -1220, -920)]],
    ['lake.westbank', [R(-2000, -410, -400, 450)]],
  ],
  ocean: [
    ['ocean.portcalder', [R(-1120, -420, 900, 1400)]],
    ['ocean.marina', [R(-1400, -1120, 1000, 1500)]],
    ['ocean.seagrass', [R(-1500, -1150, 900, 1100)]],
    ['ocean.palmcove', [R(-1950, -1400, 900, 1400)]],
  ],
  forest: [
    ['forest.gate', [R(300, 760, -780, -400)]],
    ['forest.sawmill', [R(540, 900, -1050, -780)]],
    ['forest.timberline', [R(900, 1600, -1600, -1050)]],
  ],
};
const FALLBACK = { city: 'city.midtown', lake: 'lake.shore', ocean: 'ocean.sea', forest: 'forest.highridge' };

export function districtAt(x, z) {
  if (x < -2000 || x > 2000 || z < -2000 || z > 2000) return null;
  const region = regionAt(x, z);
  for (const [id, rects] of DISTRICT_RECTS[region]) {
    for (const r of rects) if (inR(r, x, z)) return id;
  }
  return FALLBACK[region];
}
