// Markets (Annex D 5.1). `items[id] = {target, k, factor, buys, sells, supply, demand}`:
//  buys = the market buys it from the player; sells = it sells to the player; factor scales base price; supply/demand = NPC flow per hour at activity 1.
const ELAS = { fish: 0.8, staple: 0.5, wood: 0.6, material: 0.6 };
function fishItems(ids, o = {}) { const r = {}; for (const [id, f] of ids) r[id] = { target: o.target || 200, k: ELAS.fish, factor: f, buys: true, sells: !!o.sells, supply: (o.target || 200) * 0.012, demand: (o.target || 200) * 0.012 }; return r; }
const stock = (ids, target, k = ELAS.staple, extra = {}) => Object.fromEntries(ids.map((id) => [id, { target, k, factor: 1, buys: false, sells: true, supply: target * 0.01, demand: target * 0.01, ...extra }]));
export const MARKETS = {
  'mkt.city.wholesale': {
    poi: 'poi.city.wholesale', region: 'city', name: 'Harlan Wholesale Market',
    items: {
      ...fishItems([['item.fish.carp', 0.9], ['item.fish.perch', 0.9], ['item.fish.bass', 0.9], ['item.fish.pike', 0.9], ['item.fish.trout', 0.9], ['item.fish.mackerel', 0.9], ['item.fish.cod', 0.9], ['item.fish.snapper', 0.9], ['item.fish.tuna', 0.9], ['item.fish.shrimp', 0.9], ['item.fish.crab', 0.9], ['item.fish.lobster', 0.9]], { target: 400 }),
      'item.wood.lumber': { target: 150, k: ELAS.wood, factor: 1, buys: true, sells: true, supply: 1.5, demand: 1.5 },
      'item.wood.firewood': { target: 300, k: ELAS.wood, factor: 1, buys: true, sells: true, supply: 3, demand: 3 },
      ...stock(['item.ing.produce', 'item.ing.meat', 'item.ing.bread', 'item.ing.dairy', 'item.ing.fish', 'item.ing.fish_premium', 'item.ing.coffee', 'item.ing.beverage', 'item.ing.snack'], 12000),
      ...stock(['item.goods.grocery', 'item.goods.household', 'item.goods.clothing', 'item.goods.electronics', 'item.goods.tools', 'item.goods.souvenir', 'item.goods.tackle', 'item.goods.bait', 'item.parts', 'item.fuel'], 6000),
      ...stock(['item.mat.concrete', 'item.mat.brick', 'item.mat.steel', 'item.mat.glass', 'item.mat.fixtures'], 300, ELAS.material),
    },
  },
  'mkt.lake.fish': {
    poi: 'poi.lake.store', region: 'lake', name: 'Pinehaven Fish Counter',
    items: {
      ...fishItems([['item.fish.carp', 1], ['item.fish.perch', 1], ['item.fish.bass', 1], ['item.fish.pike', 1], ['item.fish.trout', 1]], { target: 60 }),
      'item.food.fishfillet': { target: 40, k: ELAS.fish, factor: 1, buys: true, sells: false, supply: 0.5, demand: 0.5 },
      'item.food.smokedfish': { target: 30, k: ELAS.fish, factor: 1, buys: true, sells: false, supply: 0.3, demand: 0.3 },
      'item.goods.bait': { target: 80, k: ELAS.staple, factor: 1, buys: false, sells: true, supply: 1, demand: 1 },
    },
  },
  'mkt.ocean.seafood': {
    poi: 'poi.ocean.seafood', region: 'ocean', name: 'Calder Seafood Market',
    items: {
      ...fishItems([['item.fish.carp', 0.95], ['item.fish.perch', 0.95], ['item.fish.bass', 0.95], ['item.fish.pike', 0.95], ['item.fish.trout', 0.95]], { target: 250, sells: true }),
      ...fishItems([['item.fish.mackerel', 1], ['item.fish.cod', 1], ['item.fish.snapper', 1], ['item.fish.tuna', 1], ['item.fish.shrimp', 1], ['item.fish.crab', 1], ['item.fish.lobster', 1]], { target: 500, sells: true }),
      'item.food.fishfillet': { target: 100, k: ELAS.fish, factor: 1, buys: true, sells: true, supply: 1, demand: 1 },
    },
  },
  'mkt.forest.sawmill': {
    poi: 'poi.forest.sawmill', region: 'forest', name: 'Sawmill Junction',
    items: {
      'item.wood.log_pine': { target: 600, k: ELAS.wood, factor: 1, buys: true, sells: false, supply: 6, demand: 6 },
      'item.wood.log_spruce': { target: 500, k: ELAS.wood, factor: 1, buys: true, sells: false, supply: 5, demand: 5 },
      'item.wood.lumber': { target: 150, k: ELAS.wood, factor: 1, buys: false, sells: true, supply: 1.5, demand: 1.5 },
      'item.wood.firewood': { target: 300, k: ELAS.wood, factor: 1, buys: true, sells: true, supply: 3, demand: 3 },
    },
  },
};
export const MARKET_IDS = Object.keys(MARKETS);
/** seasonal amplitude per item (Annex D 5.2): a <= 0.12 */
export function seasonParams(itemId) {
  let h = 0; for (let i = 0; i < itemId.length; i++) h = (h * 31 + itemId.charCodeAt(i)) >>> 0;
  return { a: 0.04 + (h % 9) * 0.01, phi: (h % 628) / 100 };
}
