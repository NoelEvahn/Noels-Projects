// Property listings (Annex D 8.2). Prices in cents. Plots are buildable land (Annex D 9).
const Pr = (id, kind, poi, name, price, o = {}) => ({ id, kind, poi, name, basePrice: price, storageKg: o.storageKg ?? (kind === 'flat' ? 40 : 80), garageSlots: o.garage || 0, berthSlots: o.berth || 0, comfortBase: o.comfort ?? 0.25, interior: o.interior || 'int.apartment_m', region: o.region || 'city', district: o.district || null, tags: o.tags || [] });
const flats = (ids, kind, poi, name, price, o) => ids.map((n) => Pr('prop_' + n, kind, poi, name + ' ' + n, price, o));
export const PROPERTIES = [
  ...flats([1, 2], 'flat', 'poi.city.apartments', 'Northgate studio', 1600000, { garage: 1, district: 'city.northgate', comfort: 0.2 }),
  ...flats([3, 4], 'flat', 'poi.city.apartments', 'Northgate one-bedroom', 2600000, { district: 'city.northgate', comfort: 0.3 }),
  ...flats([5, 6], 'flat', 'poi.city.lofts', 'Riverside loft', 5800000, { district: 'city.oldtown', comfort: 0.45, interior: 'int.loft' }),
  ...flats([7, 8], 'flat', 'poi.city.office', 'Downtown tower flat', 9500000, { district: 'city.downtown', comfort: 0.55, tags: ['needs.construction5'] }),
  ...[70, 78, 86, 94, 108, 120].map((p, i) => Pr('prop_' + (9 + i), 'house', 'poi.city.dealer', 'Eastside house ' + (i + 1), p * 100000, { garage: 2, district: 'city.eastside', comfort: 0.4 + i * 0.02, interior: 'int.house' })),
  ...[22, 27, 32, 38].map((p, i) => Pr('prop_' + (15 + i), 'cabin', 'poi.lake.cabin.' + (i + 1), 'Lake cabin ' + (i + 1), p * 100000, { region: 'lake', berth: 1, comfort: 0.3, interior: 'int.cabin_log', district: 'lake.shore' })),
  Pr('prop_19', 'boathouse', 'poi.lake.boathouse', 'Old Boathouse', 4800000, { region: 'lake', berth: 3, comfort: 0.15, interior: 'int.boathouse', district: 'lake.westbank' }),
  Pr('prop_20', 'commercial', 'poi.lake.store', 'Pinehaven shop unit', 3000000, { region: 'lake', comfort: 0.1, district: 'lake.pinehaven', tags: ['site.lake.shop.01'] }),
  ...[85, 100, 120, 140, 160].map((p, i) => Pr('prop_' + (21 + i), 'house', 'poi.ocean.seagrass', 'Seagrass Row house ' + (i + 1), p * 100000, { region: 'ocean', berth: 1, comfort: 0.45 + i * 0.03, district: 'ocean.seagrass', interior: 'int.house' })),
  ...flats([26, 27], 'flat', 'poi.ocean.portcalder', 'Port Calder flat', 2400000, { region: 'ocean', district: 'ocean.portcalder', comfort: 0.3 }),
  Pr('prop_28', 'commercial', 'poi.ocean.beachbar', "Coco's Beach Bar", 6500000, { region: 'ocean', district: 'ocean.palmcove', comfort: 0.1, tags: ['site.beachbar'] }),
  ...[14, 17, 20].map((p, i) => Pr('prop_' + (29 + i), 'cabin', 'poi.forest.cabin.' + (i + 1), 'Forest cabin ' + (i + 1), p * 100000, { region: 'forest', comfort: 0.28, interior: 'int.cabin_log', district: 'forest.timberline' })),
];
export const PLOTS = [
  ...[1, 2, 3, 4].map((n) => ({ id: 'plot_' + n, poi: 'poi.lake.lots', size: [24, 24], price: 900000, region: 'lake', mixed: false, waterfront: true })),
  ...[5, 6, 7].map((n) => ({ id: 'plot_' + n, poi: 'poi.ocean.seagrass', size: [30, 24], price: 2800000, region: 'ocean', mixed: n === 5, waterfront: false })),
  ...[8, 9, 10].map((n) => ({ id: 'plot_' + n, poi: 'poi.forest.lots', size: [30, 30], price: 450000, region: 'forest', mixed: false, waterfront: false })),
  ...[11, 12].map((n) => ({ id: 'plot_' + n, poi: 'poi.city.dealer', size: [24, 30], price: 1500000, region: 'city', mixed: true, waterfront: false })),
];
export const LEASE_ROOMS = [{ id: 'lease_room_1', poi: 'poi.city.hostel', name: 'Old Town room', rentPerDay: 3200, deposit: 6400, storageKg: 60, comfortBase: 0.2, region: 'city' }];
export const PROPERTY_BY_ID = Object.fromEntries(PROPERTIES.map((p) => [p.id, p]));
export const PLOT_BY_ID = Object.fromEntries(PLOTS.map((p) => [p.id, p]));
