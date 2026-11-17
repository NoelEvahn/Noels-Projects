// Items and licences (Annex D 4). Prices in cents. `price` = fixed retail price for personal items; `base` = wholesale/market base.
const F = (id, name, base, extra = {}) => ({ id, name, category: 'fish', unit: 'kg', weight: 1, base, perishable: { freshDays: 1, coldDays: 4 }, stack: 999, tags: [], ...extra });
const I = (id, name, category, unit, base, weight, extra = {}) => ({ id, name, category, unit, weight, base, stack: 999, tags: [], ...extra });
export const ITEMS = [
  F('item.fish.carp', 'Carp', 400, { tags: ['lake'] }), F('item.fish.perch', 'Perch', 600, { tags: ['lake'] }),
  F('item.fish.bass', 'Bass', 1000, { tags: ['lake'] }), F('item.fish.pike', 'Pike', 1200, { tags: ['lake'] }),
  F('item.fish.trout', 'Trout', 1400, { tags: ['lake', 'premium'] }),
  F('item.fish.mackerel', 'Mackerel', 500, { tags: ['ocean'] }), F('item.fish.cod', 'Cod', 900, { tags: ['ocean'] }),
  F('item.fish.snapper', 'Snapper', 1400, { tags: ['ocean', 'premium'] }), F('item.fish.tuna', 'Tuna', 2200, { tags: ['ocean', 'premium'] }),
  F('item.fish.shrimp', 'Shrimp', 1600, { tags: ['ocean', 'premium'] }), F('item.fish.crab', 'Crab', 1800, { tags: ['ocean', 'premium'] }),
  F('item.fish.lobster', 'Lobster', 3400, { tags: ['ocean', 'premium'] }),
  I('item.food.fishfillet', 'Fish fillet', 'food', 'kg', 1700, 1, { perishable: { freshDays: 1, coldDays: 4 } }),
  I('item.food.smokedfish', 'Smoked fish', 'food', 'kg', 2400, 1, { perishable: { freshDays: 6, coldDays: 12 } }),
  I('item.wood.log_pine', 'Pine log', 'wood', 'm3', 5500, 600), I('item.wood.log_spruce', 'Spruce log', 'wood', 'm3', 6500, 550),
  I('item.wood.lumber', 'Lumber bundle', 'wood', 'bundle', 9500, 350), I('item.wood.firewood', 'Firewood bundle', 'wood', 'bundle', 600, 20),
  I('item.ing.produce', 'Produce', 'ingredient', 'portion', 60, 0.3, { perishable: { freshDays: 3, coldDays: 8 } }),
  I('item.ing.meat', 'Meat', 'ingredient', 'portion', 160, 0.3, { perishable: { freshDays: 2, coldDays: 6 } }),
  I('item.ing.bread', 'Bread', 'ingredient', 'portion', 30, 0.2, { perishable: { freshDays: 3, coldDays: 5 } }),
  I('item.ing.dairy', 'Dairy', 'ingredient', 'portion', 50, 0.3, { perishable: { freshDays: 3, coldDays: 8 } }),
  I('item.ing.fish', 'Fish portion', 'ingredient', 'portion', 200, 0.25, { perishable: { freshDays: 1, coldDays: 4 } }),
  I('item.ing.fish_premium', 'Premium fish portion', 'ingredient', 'portion', 350, 0.25, { perishable: { freshDays: 1, coldDays: 4 } }),
  I('item.ing.coffee', 'Coffee dose', 'ingredient', 'dose', 35, 0.02), I('item.ing.beverage', 'Beverage', 'ingredient', 'bottle', 70, 0.5),
  I('item.ing.snack', 'Snack', 'ingredient', 'pack', 60, 0.15),
  I('item.goods.grocery', 'Grocery basket unit', 'goods', 'unit', 200, 0.8), I('item.goods.household', 'Household', 'goods', 'unit', 400, 1),
  I('item.goods.clothing', 'Clothing', 'goods', 'unit', 1200, 0.5), I('item.goods.electronics', 'Electronics', 'goods', 'unit', 6000, 1),
  I('item.goods.tools', 'Tools', 'goods', 'unit', 1800, 2), I('item.goods.souvenir', 'Souvenir', 'goods', 'unit', 300, 0.3),
  I('item.goods.tackle', 'Tackle', 'goods', 'unit', 600, 0.3), I('item.goods.bait', 'Bait tub', 'goods', 'tub', 100, 0.2),
  I('item.parts', 'Parts', 'parts', 'unit', 2500, 2), I('item.fuel', 'Fuel', 'fuel', 'litre', 160, 0.8),
  I('item.mat.concrete', 'Concrete pallet', 'material', 'pallet', 4000, 500), I('item.mat.brick', 'Brick pallet', 'material', 'pallet', 5000, 500),
  I('item.mat.steel', 'Steel bundle', 'material', 'bundle', 9000, 400), I('item.mat.glass', 'Glass crate', 'material', 'crate', 7000, 100),
  I('item.mat.fixtures', 'Fixtures crate', 'material', 'crate', 11000, 80),
  // personal items and tools (retail prices)
  I('item.food.sandwich', 'Sandwich', 'personal', 'unit', 300, 0.3, { price: 600, effect: { hunger: 35 }, perishable: { freshDays: 2, coldDays: 4 } }),
  I('item.food.meal', 'Meal', 'personal', 'unit', 700, 0.5, { price: 1400, effect: { hunger: 80, energy: 5 } }),
  I('item.food.coffee_cup', 'Coffee', 'personal', 'unit', 150, 0.3, { price: 300, effect: { energy: 12 } }),
  I('item.tool.rod_basic', 'Basic rod', 'tool', 'unit', 1750, 1, { price: 3500, rod: { tension: 1.0, maxKg: 4 } }),
  I('item.tool.rod_pro', 'Pro rod', 'tool', 'unit', 12000, 1, { price: 24000, rod: { tension: 1.25, maxKg: 12 } }),
  I('item.tool.rod_master', 'Master rod', 'tool', 'unit', 45000, 1, { price: 90000, rod: { tension: 1.5, maxKg: 40 } }),
  I('item.tool.keepnet', 'Keep-net', 'tool', 'unit', 1000, 1, { price: 2000, storageKg: 10 }),
  I('item.tool.cooler', 'Cooler', 'tool', 'unit', 4500, 3, { price: 9000, storageKg: 60, cold: true }),
  I('item.tool.axe', 'Axe', 'tool', 'unit', 2000, 2, { price: 4000 }), I('item.tool.chainsaw', 'Chainsaw', 'tool', 'unit', 19000, 5, { price: 38000 }),
  I('item.tool.toolbox', 'Toolbox', 'tool', 'unit', 6000, 4, { price: 12000 }), I('item.tool.camera', 'Camera', 'tool', 'unit', 7500, 1, { price: 15000 }),
  I('item.gear.backpack', 'Backpack', 'gear', 'unit', 3000, 1, { price: 6000, carryKg: 40 }),
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const LICENCES = [
  { id: 'lic.fishing_commercial', name: 'Commercial fishing licence', price: 15000, poi: 'poi.city.cityhall' },
  { id: 'lic.boat', name: 'Boat licence', price: 25000, poi: 'poi.city.cityhall' },
  { id: 'lic.driver_commercial', name: 'Commercial driver licence', price: 30000, poi: 'poi.city.cityhall' },
  { id: 'lic.business', name: 'Business licence', price: 10000, poi: 'poi.city.cityhall', perBusiness: true },
  { id: 'lic.logging', name: 'Logging licence', price: 40000, poi: 'poi.city.cityhall' },
  { id: 'lic.food', name: 'Food licence', price: 20000, poi: 'poi.city.cityhall' },
];
export const LICENCE_BY_ID = Object.fromEntries(LICENCES.map((l) => [l.id, l]));
// Retail shops (shop.buy): poi -> item ids sold at fixed retail price; licences are sold at poi.city.cityhall.
export const SHOPS = {
  'poi.city.diner': ['item.food.meal', 'item.food.coffee_cup'],
  'poi.city.supermarket': ['item.food.sandwich', 'item.food.coffee_cup', 'item.food.meal', 'item.gear.backpack'],
  'poi.city.hardware': ['item.tool.axe', 'item.tool.toolbox', 'item.tool.cooler', 'item.tool.keepnet', 'item.gear.backpack', 'item.tool.camera', 'item.tool.rod_basic'],
  'poi.lake.store': ['item.food.sandwich', 'item.food.coffee_cup', 'item.tool.rod_basic', 'item.tool.rod_pro', 'item.tool.keepnet', 'item.tool.cooler', 'item.goods.bait'],
  'poi.lake.fishhut': ['item.tool.rod_basic', 'item.tool.rod_pro', 'item.tool.rod_master', 'item.tool.keepnet', 'item.goods.bait', 'item.food.sandwich'],
  'poi.forest.store': ['item.tool.axe', 'item.tool.chainsaw', 'item.food.sandwich', 'item.food.coffee_cup'],
  'poi.city.cityhall': [],
};
