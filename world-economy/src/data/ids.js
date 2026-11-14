// Identifier constants (MASTER_SPEC 7). Exact ids; do not rename. Frozen after tag s2a-scaffold.
export const REGION = Object.freeze({ CITY: 'city', LAKE: 'lake', OCEAN: 'ocean', FOREST: 'forest' });

export const DISTRICT = Object.freeze({
  city: ['city.oldtown', 'city.downtown', 'city.midtown', 'city.northgate', 'city.eastside', 'city.market', 'city.industrial', 'city.docks'],
  lake: ['lake.pinehaven', 'lake.shore', 'lake.westbank'],
  ocean: ['ocean.portcalder', 'ocean.marina', 'ocean.seagrass', 'ocean.palmcove', 'ocean.sea'],
  forest: ['forest.gate', 'forest.sawmill', 'forest.timberline', 'forest.highridge'],
});

export const JOBS = Object.freeze([
  'job.city.restaurant', 'job.city.supermarket', 'job.city.delivery', 'job.city.construction', 'job.city.taxi',
  'job.city.warehouse', 'job.city.mechanic', 'job.city.office', 'job.lake.fishing', 'job.lake.fishhut',
  'job.lake.boatrental', 'job.lake.restaurant', 'job.ocean.fisherman', 'job.ocean.port', 'job.ocean.boatop',
  'job.forest.logger', 'job.forest.forestry',
]);

export const BIZ = Object.freeze([
  'biz.vending', 'biz.foodstand', 'biz.cafe', 'biz.restaurant', 'biz.fishing', 'biz.delivery', 'biz.retail',
  'biz.boatrental', 'biz.logging', 'biz.warehouse', 'biz.supermarket', 'biz.rental',
]);

export const ACCOUNTS = Object.freeze({
  CASH: 'cash', CHECKING: 'bank:checking', SAVINGS: 'bank:savings', INVEST: 'invest:cash',
  EXT: ['ext:genesis', 'ext:employers', 'ext:customers', 'ext:suppliers', 'ext:market', 'ext:staff', 'ext:landlords',
    'ext:tenants', 'ext:sellers', 'ext:buyers', 'ext:services', 'ext:tax', 'ext:bank', 'ext:securities', 'ext:debug'],
});

export const TX = Object.freeze({
  GENESIS: 'genesis', WAGE: 'wage', TIP: 'tip', TAX_INCOME: 'tax.income', TAX_BUSINESS: 'tax.business', TAX_PROPERTY: 'tax.property',
  SALE_GOODS: 'sale.goods', PURCHASE_GOODS: 'purchase.goods', PURCHASE_ITEM: 'purchase.item', PURCHASE_VEHICLE: 'purchase.vehicle',
  SALE_VEHICLE: 'sale.vehicle', PURCHASE_PROPERTY: 'purchase.property', SALE_PROPERTY: 'sale.property',
  PURCHASE_EQUIPMENT: 'purchase.equipment', PURCHASE_UPGRADE: 'purchase.upgrade', BUILD_PIECE: 'build.piece', BUILD_REFUND: 'build.refund',
  RENT_PAID: 'rent.paid', RENT_RECEIVED: 'rent.received', PAYROLL: 'payroll', OPEX_UTILITIES: 'opex.utilities',
  OPEX_MAINTENANCE: 'opex.maintenance', OPEX_SITE: 'opex.site', OPEX_LICENSE: 'opex.license', OPEX_MARKETING: 'opex.marketing',
  FUEL: 'fuel', REPAIR: 'repair', INSURANCE: 'insurance', PARKING: 'parking', TRANSFER: 'transfer', EQUITY_IN: 'equity.in',
  EQUITY_OUT: 'equity.out', LOAN_PRINCIPAL: 'loan.principal', LOAN_REPAY: 'loan.repay', LOAN_INTEREST: 'loan.interest',
  INTEREST_SAVINGS: 'interest.savings', INVEST_BUY: 'invest.buy', INVEST_SELL: 'invest.sell', INVEST_DIVIDEND: 'invest.dividend',
  FINE: 'fine', FEE: 'fee', DEBUG: 'debug',
});

export const ERR = Object.freeze({
  INSUFFICIENT_FUNDS: 'ERR.INSUFFICIENT_FUNDS', NOT_FOUND: 'ERR.NOT_FOUND', INVALID_ARG: 'ERR.INVALID_ARG',
  REQUIREMENT: 'ERR.REQUIREMENT', CAPACITY: 'ERR.CAPACITY', NOT_OWNER: 'ERR.NOT_OWNER', OUT_OF_RANGE: 'ERR.OUT_OF_RANGE',
  CLOSED: 'ERR.CLOSED', BUSY: 'ERR.BUSY', LIMIT: 'ERR.LIMIT', SAVE_INVALID: 'ERR.SAVE_INVALID',
});

/** Ground surfaces (`surf.*`). */
export const SURF = Object.freeze({
  ASPHALT: 'surf.asphalt', COBBLE: 'surf.cobble', CONCRETE: 'surf.concrete', PAVER: 'surf.paver', GRASS: 'surf.grass',
  DIRT: 'surf.dirt', GRAVEL: 'surf.gravel', SAND: 'surf.sand', ROCK: 'surf.rock', WOOD: 'surf.wood', METAL: 'surf.metal',
  MUD: 'surf.mud', FORESTFLOOR: 'surf.forestfloor', WATER_SHALLOW: 'surf.water_shallow', CARPET: 'surf.carpet', TILE: 'surf.tile',
});

/** Interactable kinds (`INT.*`). */
export const INT = Object.freeze({
  DOOR: 'door', COUNTER: 'counter', ATM: 'atm', PUMP: 'pump', VEHICLE: 'vehicle', SEAT: 'seat', BED: 'bed',
  STATION: 'station', PICKUP: 'pickup', NPC: 'npc', MACHINE: 'machine', CLEAT: 'cleat', SIGN: 'sign', BOARD: 'board',
});

export const ENTITY_FLAGS = Object.freeze({ VISIBLE: 1, SLEEPING: 2, PLAYER_CONTROLLED: 4, INTERIOR: 8 });

/** Standard QA viewpoint ids (Annex G 7.2). */
export const VIEWPOINTS = Object.freeze(['V01', 'V02', 'V03', 'V04', 'V05', 'V06', 'V07', 'V08', 'V09', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'H1', 'H2']);

/** Scale constants shared by world, physics and tests (Annex B 1). */
export const SCALE = Object.freeze({
  laneWidth: 3.5, parkingLane: 2.5, sidewalk: 4, sidewalkOutside: 3, kerb: 0.15, doorHeight: 2.1,
  storeyResidential: 3.2, storeyGround: 4.5, storeyOffice: 3.8,
  capsuleRadius: 0.3, capsuleHeight: 1.8, eye: 1.65, walk: 1.6, run: 4.5, sprint: 6.5, stepHeight: 0.35, jump: 0.9,
  chunk: 100, chunks: 40, worldHalf: 2000, speedCity: 14, speedBoulevard: 17, speedHighway: 25, speedDirt: 10,
});
