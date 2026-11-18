// Business types and sites (Annex D 6-7). Prices in cents. `model` picks the hourly simulation module in sim/business.
// capTerms: customers/hour = min over terms. {role,per}: sum over on-duty staff of per*(0.7+0.1*skill). {seats:t}: seats*t. {fixed:n}: flat.
const FOOT = {
  food: [2, 2, 2, 2, 3, 8, 30, 70, 90, 60, 55, 95, 110, 80, 50, 45, 55, 80, 95, 85, 60, 35, 15, 5],
  shop: [0, 0, 0, 0, 1, 4, 14, 38, 62, 80, 90, 95, 92, 88, 85, 82, 85, 78, 55, 28, 14, 6, 2, 0],
  transit: [4, 3, 2, 2, 6, 24, 60, 100, 90, 60, 50, 56, 66, 58, 50, 56, 76, 98, 80, 56, 36, 24, 14, 8],
  leisure: [0, 0, 0, 0, 0, 2, 6, 14, 28, 46, 62, 78, 90, 92, 88, 80, 66, 48, 30, 18, 8, 3, 1, 0],
  night: [30, 20, 10, 5, 2, 2, 6, 14, 24, 30, 36, 44, 52, 50, 46, 48, 60, 80, 100, 110, 100, 80, 60, 42],
  harbour: [2, 2, 2, 4, 12, 30, 50, 60, 54, 44, 40, 44, 50, 44, 38, 34, 34, 28, 18, 10, 6, 4, 3, 2],
  rural: [0, 0, 0, 0, 1, 3, 8, 14, 18, 20, 22, 26, 28, 24, 20, 18, 16, 12, 8, 4, 2, 1, 0, 0],
};
export const FOOTFALL_PROFILES = FOOT;
function scaled(profile, f) { return FOOT[profile].map((v) => Math.round(v * f * 10) / 10); }
const S = (id, kinds, district, profile, factor, o = {}) => ({ id, kinds, district, region: district.split('.')[0], profile, footfall: scaled(profile, factor), leasePerDay: o.lease || 0, deposit: o.deposit ?? (o.lease || 0) * 2, buyPrice: o.buy ?? (o.lease || 0) * 120, area: o.area || 60, seatsMax: o.seats || 0, tags: o.tags || [], near: o.near || null, pos: o.pos || null, feePerDay: o.fee || 0, officeLike: !!o.office, leisure: !!o.leisure, ...o.extra });
const sites = [];
// vending sites: 40 (Annex B 9). fee $4-$15 per machine per day; factor varies the footfall.
const VEND = [
  ['poi.city.spawn', 'city.oldtown', 'transit', 1.1, 900], ['poi.city.hostel', 'city.oldtown', 'transit', 0.8, 600], ['poi.city.depot', 'city.docks', 'shop', 0.6, 500],
  ['poi.city.office', 'city.northgate', 'transit', 1.3, 1100], ['poi.city.park', 'city.eastside', 'leisure', 1.2, 900], ['poi.city.park', 'city.eastside', 'leisure', 1.0, 800],
  ['poi.city.park', 'city.eastside', 'leisure', 0.9, 700], ['poi.city.supermarket', 'city.market', 'shop', 1.1, 900], ['poi.city.gas', 'city.industrial', 'transit', 0.7, 500],
  ['poi.lake.gas', 'lake.pinehaven', 'rural', 1.4, 400], ['poi.ocean.gas', 'ocean.portcalder', 'harbour', 0.8, 500], ['poi.forest.gas', 'forest.gate', 'rural', 1.2, 400],
  ['poi.city.dealer', 'city.eastside', 'shop', 0.6, 500], ['poi.ocean.marina', 'ocean.marina', 'harbour', 1.0, 700], ['poi.ocean.harbor', 'ocean.portcalder', 'harbour', 1.2, 800],
  ['poi.ocean.beach', 'ocean.palmcove', 'leisure', 1.5, 1000], ['poi.ocean.beach', 'ocean.palmcove', 'leisure', 1.3, 900], ['poi.lake.campground', 'lake.shore', 'leisure', 0.9, 500],
  ['poi.forest.gate', 'forest.gate', 'rural', 1.0, 500], ['poi.forest.sawmill', 'forest.sawmill', 'rural', 0.9, 500],
];
for (let i = 0; i < 40; i++) {
  const v = VEND[i % VEND.length], n = i + 1;
  const prem = n >= 36; // premium sites (tier 3): office tower, terminal, campus-like, 2x footfall
  sites.push(S('site.vend.' + String(n).padStart(2, '0'), ['biz.vending'], v[1], v[2], v[3] * (i >= VEND.length ? 0.85 : 1) * (prem ? 2 : 1), { fee: 400 + (v[4] % 11) * 100 + (i % 4) * 50, near: v[0], extra: { premium: prem, tier: prem ? 3 : 1 } }));
}
for (const [n, d, f] of [[1, 'city.oldtown', 1.0], [2, 'city.oldtown', 0.9], [3, 'city.downtown', 1.1], [4, 'city.market', 1.0], [5, 'city.market', 0.9], [6, 'city.eastside', 0.8], [7, 'city.eastside', 1.0], [8, 'city.northgate', 0.9], [9, 'city.midtown', 1.0], [10, 'city.downtown', 1.2]])
  sites.push(S('site.city.shop.' + String(n).padStart(2, '0'), ['biz.retail'], d, 'shop', f, { lease: 15000, area: 90, near: 'poi.city.spawn' }));
for (const [n, d, f] of [[1, 'city.oldtown', 1.0], [2, 'city.oldtown', 0.85], [3, 'city.downtown', 1.2], [4, 'city.downtown', 1.1], [5, 'city.market', 1.0], [6, 'city.eastside', 0.9]])
  sites.push(S('site.city.food.' + String(n).padStart(2, '0'), ['biz.cafe', 'biz.restaurant'], d, 'food', f, { lease: n % 2 ? 11000 : 26000, area: 140, seats: 40, near: 'poi.city.diner' }));
for (const [n, p] of [[1, 'poi.city.warehouse'], [2, 'poi.city.warehouse'], [3, 'poi.city.warehouse']]) sites.push(S('site.city.wh.0' + n, ['biz.warehouse'], 'city.industrial', 'rural', 0.1, { lease: 42000, buy: 6000000, area: 900, near: p, extra: { slots: 400 } }));
sites.push(S('site.city.super.01', ['biz.supermarket'], 'city.market', 'shop', 4.2, { lease: 0, buy: 0, deposit: 0, area: 1800, near: 'poi.city.supermarket', extra: { population: 1 } }));
for (const n of [1, 2]) sites.push(S('site.city.yard.0' + n, ['biz.delivery'], 'city.industrial', 'rural', 0.1, { lease: 1000, buy: 12000000, area: 600, near: 'poi.city.depot' }));
for (const [n, d, prof, f] of [[1, 'city.eastside', 'leisure', 1.0], [2, 'city.eastside', 'leisure', 1.1], [3, 'city.oldtown', 'food', 0.8], [4, 'city.downtown', 'food', 1.0], [5, 'city.market', 'shop', 1.1], [6, 'ocean.marina', 'harbour', 1.2], [7, 'ocean.palmcove', 'leisure', 1.6], [8, 'ocean.palmcove', 'leisure', 1.4], [9, 'lake.shore', 'leisure', 1.0], [10, 'lake.pinehaven', 'leisure', 0.9]])
  sites.push(S('site.cart.' + String(n).padStart(2, '0'), ['biz.foodstand'], d, prof, f, { fee: 2500, near: 'poi.city.park', leisure: prof === 'leisure' }));
sites.push(S('site.lake.dock.01', ['biz.boatrental'], 'lake.pinehaven', 'leisure', 1.0, { fee: 2000, near: 'poi.lake.boathire', leisure: true }), S('site.lake.dock.02', ['biz.boatrental'], 'lake.shore', 'leisure', 0.8, { fee: 2000, near: 'poi.lake.campground', leisure: true }),
  S('site.lake.food.01', ['biz.cafe', 'biz.restaurant'], 'lake.pinehaven', 'leisure', 1.4, { lease: 14000, area: 120, seats: 30, near: 'poi.lake.grill', leisure: true }),
  S('site.lake.shop.01', ['biz.retail'], 'lake.pinehaven', 'leisure', 1.3, { lease: 9000, area: 70, near: 'poi.lake.store', leisure: true, tags: ['tackle'] }));
for (const n of [1, 2, 3, 4]) sites.push(S('site.ocean.berth.0' + n, ['biz.fishing'], 'ocean.portcalder', 'harbour', 0.5, { fee: 1000, near: 'poi.ocean.harbor' }));
for (const n of [1, 2, 3]) sites.push(S('site.ocean.stall.0' + n, ['biz.fishing'], 'ocean.portcalder', 'harbour', 1.0, { fee: 1500, near: 'poi.ocean.seafood', tags: ['stall'] }));
for (const n of [1, 2]) sites.push(S('site.ocean.shop.0' + n, ['biz.retail'], 'ocean.portcalder', 'harbour', 1.0, { lease: 12000, area: 70, near: 'poi.ocean.portcalder', leisure: true, tags: ['souvenir'] }));
sites.push(S('site.ocean.dock.01', ['biz.boatrental'], 'ocean.marina', 'leisure', 1.3, { fee: 2500, near: 'poi.ocean.marina', leisure: true }));
for (const n of [1, 2, 3]) sites.push(S('site.forest.lease.0' + n, ['biz.logging'], 'forest.timberline', 'rural', 0.1, { fee: 0, near: ['poi.forest.stand.a', 'poi.forest.stand.b', 'poi.forest.stand.c'][n - 1], extra: { stand: true } }));
sites.push(S('site.forest.yard.01', ['biz.logging'], 'forest.timberline', 'rural', 0.1, { fee: 1500, near: 'poi.forest.timberline' }));
export const SITES = sites;
export const SITE_BY_ID = Object.fromEntries(SITES.map((s) => [s.id, s]));

const U = (id, name, cost, effect, o = {}) => ({ id, name, cost, effect, requires: o.requires || null, tier: o.tier || 0, perUnit: !!o.perUnit });
const Pd = (id, name, ref, recipe, share = 1, o = {}) => ({ id, name, ref, recipe, share, active: o.active !== false, hot: !!o.hot, qty: o.qty || 1 });
const R = (role, base) => ({ role, base });

export const BIZ_TABLE = [
  { id: 'biz.vending', name: 'Vending machine route', p: 0, model: 'vending', startup: 0, unitCost: 45000, licences: ['lic.business'], needsSite: false, siteKinds: ['biz.vending'], eps: 1.2, capture: 0.30, fixedPerDay: {}, roles: ['maintainer'], capTerms: [],
    unitSlots: 60, cashBoxMax: 40000,
    products: [Pd('snack', 'Snack', 150, { 'item.ing.snack': 1 }, 0.5), Pd('beverage', 'Beverage', 200, { 'item.ing.beverage': 1 }, 0.5), Pd('hot', 'Hot snack', 350, { 'item.ing.snack': 1, 'item.ing.dairy': 1 }, 0.3, { active: false, hot: true })],
    upgrades: [U('vend.card_reader', 'Card reader', 12000, { capture: 1.15 }, { perUnit: true }), U('vend.telemetry', 'Telemetry', 60000, { telemetry: true }), U('vend.cooler', 'Cooler', 20000, { beverageRef: 30 }, { perUnit: true }), U('vend.hotfood', 'Hot food', 70000, { product: 'hot' }, { perUnit: true }), U('vend.branding', 'Branding', 150000, { repFloor: 0.6 })],
    tiers: [{ tier: 2, cost: 120000, minUnits: 5, bulkDiscount: 0.10 }, { tier: 3, cost: 900000, minUnits: 20 }] },
  { id: 'biz.foodstand', name: 'Food cart', p: 1, model: 'retail', startup: 240000, truckStartup: 1600000, licences: ['lic.business', 'lic.food'], needsSite: true, siteKinds: ['biz.foodstand'], eps: 1.4, capture: 0.20, fixedPerDay: { site: 2500 }, roles: ['cook'], capTerms: [{ role: 'cook', per: 40, ownerOk: true }], seatsMax: 0, basket: 1.3, utilPerHour: 100,
    products: [Pd('hotdog', 'Hot dog', 450, { 'item.ing.meat': 1, 'item.ing.bread': 1 }, 0.3), Pd('fishroll', 'Fish roll', 600, { 'item.ing.fish': 1, 'item.ing.bread': 1 }, 0.2), Pd('fries', 'Fries', 300, { 'item.ing.produce': 1 }, 0.2), Pd('softdrink', 'Soft drink', 250, { 'item.ing.beverage': 1 }, 0.2), Pd('coffee', 'Coffee', 300, { 'item.ing.coffee': 1 }, 0.1)],
    upgrades: [U('stand.grill', 'Grill plate', 80000, { cap: 1.25 }), U('stand.fridge', 'Fridge', 60000, { coldDays: 2, quality: 0.05 }), U('stand.signage', 'Signage', 40000, { capture: 1.1 }), U('stand.pitch2', 'Second pitch licence', 100000, { cap: 1.2, capture: 1.1 })],
    tiers: [{ tier: 2, cost: 500000, minRevenue: 2000000 }, { tier: 3, cost: 2000000, minRevenue: 20000000 }] },
  { id: 'biz.cafe', name: 'Cafe', p: 1, model: 'retail', startup: 1400000, licences: ['lic.business', 'lic.food'], needsSite: true, siteKinds: ['biz.cafe'], eps: 1.5, capture: 0.50, fixedPerDay: { lease: 'site', utilities: 3000 }, roles: ['barista'], capTerms: [{ role: 'barista', per: 28 }, { seats: 1.5 }], seatsStart: 20, basket: 1.4, utilPerHour: 125,
    products: [Pd('coffee', 'Coffee', 320, { 'item.ing.coffee': 1 }, 0.35), Pd('latte', 'Latte', 420, { 'item.ing.coffee': 1, 'item.ing.dairy': 1 }, 0.25), Pd('pastry', 'Pastry', 350, { 'item.ing.bread': 1, 'item.ing.dairy': 1 }, 0.15), Pd('sandwich', 'Sandwich', 650, { 'item.ing.bread': 1, 'item.ing.produce': 1, 'item.ing.meat': 1 }, 0.15), Pd('juice', 'Juice', 380, { 'item.ing.produce': 2 }, 0.1)],
    upgrades: [U('cafe.machine2', '2-group machine', 250000, { cap: 1.96 }), U('cafe.machine3', '3-group machine', 600000, { cap: 2.85 }, { requires: 'cafe.machine2' }), U('cafe.oven', 'Pastry oven', 180000, { quality: 0.06 }), U('cafe.terrace', 'Terrace seating', 150000, { seats: 8 }), U('cafe.loyalty', 'Loyalty cards', 100000, { repGain: 1.5 }), U('cafe.roastery', 'Roastery', 400000, { cogs: 0.7, coffeeOnly: true })],
    tiers: [{ tier: 2, cost: 600000, minRevenue: 5000000 }, { tier: 3, cost: 2500000, minRevenue: 30000000 }] },
  { id: 'biz.restaurant', name: 'Restaurant', p: 1, model: 'retail', startup: 3800000, licences: ['lic.business', 'lic.food'], needsSite: true, siteKinds: ['biz.restaurant'], eps: 1.6, capture: 0.76, fixedPerDay: { lease: 'site', utilities: 9000 }, roles: ['cook', 'server'], capTerms: [{ role: 'cook', per: 18 }, { role: 'server', per: 14 }, { seats: 1.2 }], seatsStart: 32, basket: 1.5, utilPerHour: 375,
    products: [Pd('burger', 'Burger', 900, { 'item.ing.meat': 1, 'item.ing.bread': 1, 'item.ing.produce': 1 }, 0.2), Pd('fishchips', 'Fish and chips', 1100, { 'item.ing.fish': 1, 'item.ing.produce': 1, 'item.ing.bread': 1 }, 0.15), Pd('grilledfish', 'Grilled premium fish', 1800, { 'item.ing.fish_premium': 1, 'item.ing.produce': 1, 'item.ing.dairy': 1 }, 0.1), Pd('pasta', 'Pasta', 800, { 'item.ing.bread': 1, 'item.ing.dairy': 1, 'item.ing.produce': 1 }, 0.15), Pd('steak', 'Steak', 1900, { 'item.ing.meat': 2, 'item.ing.produce': 1 }, 0.1), Pd('salad', 'Salad', 700, { 'item.ing.produce': 2, 'item.ing.dairy': 1 }, 0.1), Pd('soup', 'Soup', 500, { 'item.ing.produce': 1, 'item.ing.dairy': 1 }, 0.1), Pd('dessert', 'Dessert', 500, { 'item.ing.dairy': 1, 'item.ing.bread': 1 }, 0.05), Pd('drinks', 'Drinks', 250, { 'item.ing.beverage': 1 }, 0.3)],
    upgrades: [U('rest.station1', 'Kitchen station tier 2', 600000, { cap: 1.25, quality: 0.05 }), U('rest.station2', 'Kitchen station tier 3', 1400000, { cap: 1.6, quality: 0.1 }, { requires: 'rest.station1' }), U('rest.tables', 'More tables', 140000, { seats: 8 }), U('rest.decor', 'Decor', 300000, { appeal: 0.05 }), U('rest.terrace', 'Terrace', 400000, { seats: 12 }), U('rest.delivery', 'Delivery service', 250000, { capture: 1.2 }), U('rest.signature', 'Signature seafood menu', 350000, { ticket: 1.25 })],
    tiers: [{ tier: 2, cost: 3000000, minRevenue: 15000000 }, { tier: 3, cost: 12000000, minRevenue: 80000000 }] },
  { id: 'biz.fishing', name: 'Fishing business', p: 1, model: 'fishing', startup: 30000, licences: ['lic.business', 'lic.fishing_commercial'], needsSite: true, siteKinds: ['biz.fishing'], eps: 1.0, capture: 0, fixedPerDay: { site: 1000 }, roles: ['fisher', 'skipper', 'deckhand'], capTerms: [],
    boats: { 'boat.rowboat': { crew: 0, kg: 18, hours: 6, ground: 'lake' }, 'boat.skiff': { crew: 1, kg: 45, hours: 8, ground: 'lake' }, 'boat.console': { crew: 2, kg: 120, hours: 9, ground: 'ocean' }, 'boat.trawler': { crew: 3, kg: 800, hours: 12, ground: 'ocean' } },
    products: [], upgrades: [U('fish.sonar', 'Sonar', 400000, { catch: 1.15 }), U('fish.ice', 'Ice machine', 250000, { coldDays: 2 }), U('fish.nets', 'Bigger nets', 300000, { catch: 1.1 }), U('fish.smokehouse', 'Smokehouse', 500000, { smoke: true }), U('fish.processing', 'Processing room', 450000, { fillet: true })],
    tiers: [{ tier: 2, cost: 500000, minRevenue: 5000000 }, { tier: 3, cost: 5000000, minRevenue: 50000000 }] },
  { id: 'biz.delivery', name: 'Delivery company', p: 1, model: 'delivery', startup: 0, licences: ['lic.business'], needsSite: false, siteKinds: ['biz.delivery'], eps: 1.0, capture: 0, fixedPerDay: { parking: 1000 }, roles: ['driver', 'dispatcher'], capTerms: [],
    vehicles: { 'veh.moto_125': { routes: 7, fee: 3600 }, 'veh.van': { routes: 8, fee: 5200 }, 'veh.boxtruck': { routes: 3, fee: 45000 } },
    products: [], upgrades: [U('del.gps', 'Fleet GPS', 150000, { routes: 1.1 }), U('del.yard', 'Depot yard', 800000, { dispatcher: true })],
    tiers: [{ tier: 2, cost: 800000, minRevenue: 5000000 }, { tier: 3, cost: 4000000, minRevenue: 40000000 }] },
  { id: 'biz.retail', name: 'Retail store', p: 1, model: 'retail', startup: 2200000, stock: 400000, licences: ['lic.business'], needsSite: true, siteKinds: ['biz.retail'], eps: 2.0, capture: 0.40, fixedPerDay: { lease: 'site', utilities: 2500 }, roles: ['clerk'], capTerms: [{ role: 'clerk', per: 16 }], shelfStart: 120, basket: 3, utilPerHour: 100, assortments: true,
    products: [], upgrades: [U('retail.shelves', 'More shelving', 300000, { shelf: 80 }), U('retail.display', 'Shop-front display', 200000, { capture: 1.1 }), U('retail.security', 'Security', 250000, { shrink: 0.005 }), U('retail.online', 'Online orders', 350000, { capture: 1.12 })],
    tiers: [{ tier: 2, cost: 1500000, minRevenue: 10000000 }, { tier: 3, cost: 6000000, minRevenue: 60000000 }] },
  { id: 'biz.boatrental', name: 'Boat rental', p: 2, model: 'boatrental', startup: 300000, licences: ['lic.business'], needsSite: true, siteKinds: ['biz.boatrental'], eps: 1.2, capture: 0, fixedPerDay: { site: 2000, upkeep: 2000 }, roles: ['attendant'], capTerms: [{ role: 'attendant', per: 8 }],
    fleet: { 'boat.rowboat': { price: 40000, rate: 1200, ref: 1200 }, 'boat.kayak': { price: 25000, rate: 1000, ref: 1000 }, 'boat.skiff': { price: 380000, rate: 3000, ref: 3000 }, 'boat.pedal': { price: 60000, rate: 1400, ref: 1400 } },
    products: [], upgrades: [U('rent.fenders', 'Fenders and lifejackets', 100000, { quality: 0.05 }), U('rent.kiosk', 'Kiosk', 200000, { capture: 1.1 })],
    tiers: [{ tier: 2, cost: 500000, minRevenue: 3000000 }, { tier: 3, cost: 2500000, minRevenue: 25000000 }] },
  { id: 'biz.logging', name: 'Logging company', p: 2, model: 'logging', startup: 2936000, licences: ['lic.business', 'lic.logging', 'lic.driver_commercial'], needsSite: true, siteKinds: ['biz.logging'], eps: 1.0, capture: 0, fixedPerDay: {}, roles: ['logger', 'driver'], capTerms: [], leaseFeePerM3: 500,
    products: [], upgrades: [U('log.saw2', 'Second saw team', 800000, { crew: 1.5 }), U('log.skidder', 'Skidder', 1500000, { crew: 1.3 }), U('log.mill', 'Portable mill', 2000000, { mill: true }), U('log.haul', 'Haul contract', 500000, { trips: 1.2 })],
    tiers: [{ tier: 2, cost: 3000000, minRevenue: 20000000 }, { tier: 3, cost: 10000000, minRevenue: 80000000 }] },
  { id: 'biz.warehouse', name: 'Warehouse', p: 2, model: 'warehouse', startup: 0, licences: ['lic.business'], needsSite: true, siteKinds: ['biz.warehouse'], eps: 1.0, capture: 0, fixedPerDay: { utilities: 4000 }, roles: ['forklift'], capTerms: [], slotRef: 600, slotsBase: 400,
    products: [], upgrades: [U('wh.racking2', 'Racking tier 2', 1500000, { slots: 900 }), U('wh.racking3', 'Racking tier 3 and cold room', 4000000, { slots: 2000, coldDays: 4 }, { requires: 'wh.racking2' }), U('wh.bays', 'Loading bays', 600000, { throughput: 1.3 }), U('wh.security', 'Security', 300000, { shrink: 0.005 })],
    tiers: [{ tier: 2, cost: 3000000, minRevenue: 10000000 }, { tier: 3, cost: 12000000, minRevenue: 60000000 }] },
  { id: 'biz.supermarket', name: 'Supermarket', p: 2, model: 'retail', startup: 18000000, licences: ['lic.business'], needsSite: true, siteKinds: ['biz.supermarket'], eps: 1.3, capture: 0.40, fixedPerDay: { utilities: 25000 }, roles: ['cashier', 'manager'], capTerms: [{ role: 'cashier', per: 30 }], shelfStart: 2000, basket: 6, utilPerHour: 1040, shrink: 0.01,
    products: [Pd('grocery', 'Grocery', 440, { 'item.goods.grocery': 1 }, 0.4), Pd('produce', 'Produce', 160, { 'item.ing.produce': 1 }, 0.2), Pd('dairymeat', 'Dairy and meat', 500, { 'item.ing.dairy': 1, 'item.ing.meat': 1 }, 0.15), Pd('household', 'Household', 880, { 'item.goods.household': 1 }, 0.1), Pd('snackbev', 'Beverages and snacks', 250, { 'item.ing.beverage': 1, 'item.ing.snack': 1 }, 0.15)],
    upgrades: [U('super.selfcheck', 'Self-checkouts', 1800000, { cap: 1.6 }), U('super.bakery', 'Bakery and fish counter', 1200000, { capture: 1.08 }), U('super.loyalty', 'Loyalty programme', 500000, { repGain: 1.5 }), U('super.store2', 'Second store in Port Calder', 6000000, { capture: 1.4 })],
    tiers: [{ tier: 2, cost: 8000000, minRevenue: 100000000 }, { tier: 3, cost: 30000000, minRevenue: 500000000 }] },
  { id: 'biz.rental', name: 'Property rental company', p: 2, model: 'rental', startup: 0, licences: ['lic.business'], needsSite: false, siteKinds: [], eps: 1.0, capture: 0, fixedPerDay: {}, roles: ['agent'], capTerms: [],
    products: [], upgrades: [U('rental.agent', 'Letting agent (8% of rent)', 0, { agent: 0.08 })], tiers: [{ tier: 2, cost: 0, minUnits: 5 }, { tier: 3, cost: 0, minUnits: 12 }] },
];
export const BIZ_BY_ID = Object.fromEntries(BIZ_TABLE.map((b) => [b.id, b]));
// Retail assortments (biz.retail): products with ref = wholesale base x 2.0 (convenience x 1.6); site tag multipliers on share.
const wp = (id, k) => ({ id: id.split('.').pop(), name: id.split('.').pop(), item: id, k });
// demandMult normalises customers per hour by ticket size: an electronics store sells far fewer (and dearer) items than a snack shelf, so every
// assortment lands near the Annex D 7 typical revenue of about $2,600 a day at a typical site. refMult = retail ref over wholesale base.
export const ASSORTMENTS = {
  convenience: { refMult: 2.5, eps: 1.3, items: ['item.ing.snack', 'item.ing.beverage', 'item.goods.grocery', 'item.goods.household'], tag: null, demandMult: 0.95 },
  tackle: { refMult: 2.55, eps: 2.0, items: ['item.goods.tackle', 'item.goods.bait', 'item.goods.tools'], tag: 'tackle', tagMult: 2.5, demandMult: 0.22 },
  clothing: { refMult: 2.55, eps: 2.0, items: ['item.goods.clothing'], tag: null, demandMult: 0.45 },
  electronics: { refMult: 2.55, eps: 2.0, items: ['item.goods.electronics'], tag: null, district: ['city.downtown', 1.5], demandMult: 0.072 },
  hardware: { refMult: 2.55, eps: 2.0, items: ['item.goods.tools', 'item.mat.fixtures', 'item.mat.concrete'], tag: null, demandMult: 0.077 },
  souvenir: { refMult: 2.5, eps: 2.0, items: ['item.goods.souvenir'], tag: 'souvenir', tagMult: 3, demandMult: 1.6 },
};
void wp;
export const ROLE_WAGE = { cashier: 1200, clerk: 1200, server: 1250, barista: 1300, cook: 1500, maintainer: 1400, driver: 1500, fisher: 1500, deckhand: 1500, skipper: 2000, logger: 1700, forklift: 1500, attendant: 1250, manager: 2400, dispatcher: 1800, agent: 1500 };
export const ROLE_THROUGHPUT = { cook: 18, server: 14, barista: 28, cashier: 30, clerk: 16, maintainer: 12, attendant: 8, forklift: 60 };
export const FIRST_NAMES = ['Ava', 'Ben', 'Cleo', 'Dan', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jo', 'Kit', 'Lia', 'Max', 'Nia', 'Oz', 'Pia', 'Quin', 'Rae', 'Sam', 'Tia', 'Uma', 'Vic', 'Wes', 'Xan', 'Yara', 'Zed'];
export const LAST_NAMES = ['Ames', 'Bell', 'Cruz', 'Dunn', 'Egan', 'Frost', 'Gray', 'Hale', 'Ito', 'Jain', 'Kerr', 'Lund', 'Moss', 'Nash', 'Orr', 'Pace', 'Quill', 'Rowe', 'Shaw', 'Tran'];
