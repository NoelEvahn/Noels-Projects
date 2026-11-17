// Construction piece catalogue (Annex D 9.2). Ordered lists: indices are saved; new entries are only ever appended (9.5).
// kind: cell = 2x2 cells slot; edge = cell edge slot; corner = cell corner; furniture handled separately.
export const MATERIALS = ['concrete', 'wood', 'tile', 'timber', 'log', 'brick', 'plaster', 'stone', 'steel', 'glass', 'membrane', 'deck', 'shingle', 'metal', 'clay', 'picket', 'chain', 'hedge', 'gravel', 'paver', 'standard'];
const P = (id, name, slot, cost, mats, extra = {}) => ({ id, name, slot, cost, mats, ...extra });
export const PIECES = [
  P('piece.foundation', 'Foundation', 'cell', 6000, { concrete: 1 }, { layer: 'foundation' }),
  P('piece.floor', 'Floor', 'cell', 4500, { wood: 1.0, tile: 1.3, concrete: 0.9 }, { layer: 'floor' }),
  P('piece.wall', 'Wall', 'edge', 8000, { timber: 1.0, log: 1.2, brick: 1.4, plaster: 1.1, stone: 1.6 }, { layer: 'wall' }),
  P('piece.wall_window', 'Glazed wall opening', 'edge', 14000, { timber: 1.0, log: 1.2, brick: 1.4, plaster: 1.1, stone: 1.6 }, { layer: 'wall', glazed: true }),
  P('piece.wall_door', 'Wall with door', 'edge', 16000, { timber: 1.0, log: 1.2, brick: 1.4, plaster: 1.1, stone: 1.6 }, { layer: 'wall', door: true }),
  P('piece.wall_glass', 'Glazed wall', 'edge', 26000, { steel: 1.0, timber: 1.0 }, { layer: 'wall', glazed: true, glass: true }),
  P('piece.wall_garage', 'Garage door', 'edge', 60000, { metal: 1 }, { layer: 'wall', door: true }),
  P('piece.pillar', 'Pillar', 'corner', 5000, { timber: 1.0, steel: 1.0, stone: 1.0 }, { layer: 'pillar' }),
  P('piece.stairs', 'Stairs', 'cell', 30000, { wood: 1.0, steel: 1.0 }, { layer: 'stairs' }),
  P('piece.roof_flat', 'Flat roof', 'cell', 7000, { membrane: 1.0, deck: 1.0 }, { layer: 'roof' }),
  P('piece.roof_gable', 'Gable roof', 'cell', 9500, { shingle: 1.0, metal: 1.1, clay: 1.4 }, { layer: 'roof' }),
  P('piece.roof_ridge', 'Roof ridge', 'cell', 6000, { shingle: 1.0, metal: 1.1, clay: 1.4 }, { layer: 'roof' }),
  P('piece.roof_gable_end', 'Gable end', 'cell', 6000, { shingle: 1.0, metal: 1.1, clay: 1.4 }, { layer: 'roof' }),
  P('piece.porch_deck', 'Porch deck', 'cell', 5500, { wood: 1 }, { layer: 'floor', open: true }),
  P('piece.railing', 'Railing', 'edge', 3500, { wood: 1.0, steel: 1.0, glass: 1.2 }, { layer: 'rail' }),
  P('piece.chimney', 'Chimney', 'cell', 45000, { stone: 1.0, brick: 1.0 }, { layer: 'chimney' }),
  P('piece.fence', 'Fence', 'edge', 2500, { picket: 1.0, timber: 1.0, chain: 0.8, hedge: 1.2 }, { layer: 'fence' }),
  P('piece.gate', 'Gate', 'edge', 9000, { timber: 1 }, { layer: 'fence' }),
  P('piece.dock_section', 'Dock section', 'cell', 18000, { timber: 1 }, { layer: 'floor', water: true }),
  P('piece.path', 'Path', 'cell', 2000, { gravel: 1.0, paver: 1.2 }, { layer: 'ground' }),
  P('piece.garden_bed', 'Garden bed', 'cell', 3000, { standard: 1 }, { layer: 'ground' }),
  P('piece.tree_planting', 'Tree planting', 'cell', 12000, { standard: 1 }, { layer: 'ground' }),
];
// Furniture: comfort category and points. Categories capped (sleep 4, kitchen 4, bath 5, seat 4, dine 3, light 3, decor 4, cosy 4) / 31.
const Fu = (id, name, cost, cat, pts, extra = {}) => ({ id, name, cost, cat, pts, ...extra });
export const FURNITURE = [
  Fu('piece.furn.bed_single', 'Single bed', 18000, 'sleep', 2), Fu('piece.furn.bed_double', 'Double bed', 42000, 'sleep', 4),
  Fu('piece.furn.sofa', 'Sofa', 35000, 'seat', 3), Fu('piece.furn.armchair', 'Armchair', 16000, 'seat', 1),
  Fu('piece.furn.dining_table', 'Dining table set', 38000, 'dine', 3), Fu('piece.furn.kitchen_counter', 'Kitchen counter', 30000, 'kitchen', 2),
  Fu('piece.furn.stove', 'Stove', 45000, 'kitchen', 2), Fu('piece.furn.fridge', 'Fridge', 50000, 'kitchen', 2, { coldKg: 40 }),
  Fu('piece.furn.bathroom', 'Bathroom set', 90000, 'bath', 5), Fu('piece.furn.wardrobe', 'Wardrobe', 22000, 'storage', 0, { storageKg: 40 }),
  Fu('piece.furn.shelf', 'Shelf', 9000, 'storage', 0, { storageKg: 15 }), Fu('piece.furn.desk', 'Desk', 20000, 'work', 2),
  Fu('piece.furn.lamp', 'Lamp', 4500, 'light', 1), Fu('piece.furn.ceiling_light', 'Ceiling light', 6000, 'light', 1),
  Fu('piece.furn.rug', 'Rug', 11000, 'decor', 1), Fu('piece.furn.plant', 'Plant', 3500, 'decor', 1),
  Fu('piece.furn.painting', 'Painting', 8000, 'decor', 1), Fu('piece.furn.tv', 'TV', 60000, 'decor', 2),
  Fu('piece.furn.fireplace', 'Fireplace', 90000, 'cosy', 4), Fu('piece.furn.workbench', 'Workbench', 26000, 'work', 0, { unlocks: 'repair' }),
  Fu('piece.furn.fish_tank', 'Fish tank', 24000, 'decor', 1),
];
export const COMFORT_CAPS = { sleep: 4, kitchen: 4, bath: 5, seat: 4, dine: 3, light: 3, decor: 4, cosy: 4 };
export const COMFORT_TOTAL = 31;
