// Vehicle ownership economy (Annex D 10): buy/sell, fuel, wear, repair. Positions are kept by the game layer via veh.setPos.
import { VEHICLE_ECON, DEALERS, PAINTS } from '../data/vehicles.js';
import { PROPERTY_BY_ID } from '../data/properties.js';
import { BALANCE } from '../data/balance.js';
import { ACCOUNTS, TX } from '../data/ids.js';
import { ok, fail, ERR, posInt, clamp, payerAccount, payUp } from './util.js';

export function createVehicles(ctx) {
  const S = () => ctx.state.vehicles;
  const defaults = () => [];
  const get = (id) => S().find((v) => v.id === id);
  const isBoat = (m) => m.startsWith('boat.');
  const refPrice = (m) => { const e = VEHICLE_ECON[m]; return e.price || (e.used ? e.used * 2 : 0); };
  function usedValue(v) { const e = VEHICLE_ECON[v.model]; return Math.floor(refPrice(v.model) * (0.45 + 0.35 * v.condition) * Math.max(0.5, 1 - v.odo / 4000)); }
  const value = (v) => usedValue(v);
  const totalValue = () => S().reduce((s, v) => s + value(v), 0);
  const count = () => S().length;
  function view(v) { return { ...v, value: value(v), tank: VEHICLE_ECON[v.model].tank, fuelPct: v.fuel / VEHICLE_ECON[v.model].tank }; }
  function buyInternal({ modelId, used, colour = 0, payFrom, poiId, fee = 0, from }) {
    const e = VEHICLE_ECON[modelId];
    if (!e) return fail(ERR.NOT_FOUND, 'model');
    if (!Number.isInteger(colour) || colour < 0 || colour >= PAINTS) return fail(ERR.INVALID_ARG, 'colour');
    const price = used ? e.used : e.price;
    if (!price) return fail(ERR.REQUIREMENT, used ? 'no used stock of this model' : 'only sold used');
    if (poiId) {
      const D = DEALERS[poiId];
      if (!D || !D.models.includes(modelId)) return fail(ERR.NOT_FOUND, 'dealer does not stock this');
      if (D.used && !used) return fail(ERR.REQUIREMENT, 'used dealer');
      if (!D.used && used && !D.usedOk) return fail(ERR.REQUIREMENT, 'new-car dealer');
      if (ctx.services.near && !ctx.services.near(poiId)) return fail(ERR.OUT_OF_RANGE);
    }
    const total = price + fee + (modelId === 'boat.rowboat' && false ? 0 : 0);
    const acctId = from || payerAccount(ctx.ledger, payFrom, total);
    if (!ctx.ledger.canAfford(acctId, total)) return fail(ERR.INSUFFICIENT_FUNDS);
    const id = 'v' + (ctx.state.flags.nextVeh = (ctx.state.flags.nextVeh || 0) + 1);
    const r = ctx.ledger.transfer({ from: acctId, to: 'ext:sellers', amount: total, type: TX.PURCHASE_VEHICLE, memo: modelId + (used ? ' (used)' : ''), ref: id });
    if (!r.ok) { ctx.state.flags.nextVeh--; return r; }
    const rng = ctx.rng.sim;
    const v = { id, model: modelId, fuel: Math.round(e.tank * (used ? 0.3 : 0.5) * 10) / 10, condition: used ? Math.round(rng.range(0.5, 0.85) * 100) / 100 : 1, odo: used ? rng.int(4000, 9000) : 0, pos: null, yaw: 0, colour, bizId: null, home: false, boughtFor: price };
    S().push(v);
    ctx.emit('veh:changed', { vehId: id });
    if (price >= 100000) ctx.state.flags.autosaveDue = true;
    return ok({ vehId: id, price: total });
  }
  const cmds = {
    'veh.buy': ({ modelId, used = false, colour = 0, payFrom, poiId }) => buyInternal({ modelId, used: !!used, colour, payFrom, poiId, fee: poiId ? 0 : BALANCE.vehDeliveryFee }),
    'veh.sell': ({ vehId }) => {
      const v = get(vehId); if (!v) return fail(ERR.NOT_FOUND);
      if (v.bizId) return fail(ERR.BUSY, 'assigned to a business');
      if (ctx.services.vehicleInUse && ctx.services.vehicleInUse(vehId)) return fail(ERR.BUSY, 'in use');
      const val = usedValue(v);
      if (val <= 0) return fail(ERR.INVALID_ARG);
      const r = ctx.ledger.transfer({ from: 'ext:buyers', to: ACCOUNTS.CHECKING, amount: val, type: TX.SALE_VEHICLE, memo: v.model, ref: v.id });
      if (!r.ok) return r;
      S().splice(S().indexOf(v), 1); delete ctx.state.inventory.containers['veh:' + vehId];
      ctx.emit('veh:changed', { vehId }); return ok({ value: val });
    },
    'veh.refuel': ({ vehId, litres }) => {
      const v = get(vehId); if (!v) return fail(ERR.NOT_FOUND);
      if (!(litres > 0) || !Number.isFinite(litres)) return fail(ERR.INVALID_ARG);
      const e = VEHICLE_ECON[v.model];
      if (ctx.services.near && !ctx.services.near(isBoat(v.model) ? 'fuel.boat' : 'fuel')) return fail(ERR.OUT_OF_RANGE);
      const l = Math.min(litres, e.tank - v.fuel);
      if (l <= 0.05) return fail(ERR.CAPACITY, 'tank full');
      const cost = payUp(l * (isBoat(v.model) ? BALANCE.boatFuelPrice : BALANCE.fuelPrice));
      const r = ctx.ledger.charge({ amount: cost, to: 'ext:services', type: TX.FUEL, memo: 'Fuel ' + l.toFixed(1) + ' L', ref: v.id, method: 'auto' });
      if (!r.ok) return r;
      v.fuel = Math.round((v.fuel + l) * 10) / 10; ctx.emit('veh:changed', { vehId }); return ok({ litres: l, cost });
    },
    'veh.repair': ({ vehId }) => {
      const v = get(vehId); if (!v) return fail(ERR.NOT_FOUND);
      if (v.condition >= 0.999) return fail(ERR.INVALID_ARG, 'nothing to repair');
      if (ctx.services.near && !ctx.services.near(isBoat(v.model) ? 'poi.ocean.boatyard' : 'poi.city.mechanic')) return fail(ERR.OUT_OF_RANGE);
      const disc = Math.min(0.45, 0.05 * (ctx.skills.level('skill.city.mechanic') - 1));
      const cost = payUp((1 - v.condition) * refPrice(v.model) * BALANCE.repairRate * (1 - disc));
      if (cost <= 0) { v.condition = 1; return ok({ cost: 0 }); }
      const r = ctx.ledger.charge({ amount: cost, to: 'ext:services', type: TX.REPAIR, memo: v.model + ' repair', ref: v.id, method: 'auto' });
      if (!r.ok) return r;
      v.condition = 1; ctx.emit('veh:changed', { vehId }); return ok({ cost });
    },
    /** Phone delivery (Annex D 10): the vehicle appears next to the player; with a free home garage (cars) or berth (boats) slot it is brought from home for $10.
     *  The game layer moves or spawns the vehicle through Sim.setServices({placeVehicle}); the sim keeps the new position in `pos`. */
    'veh.deliver': ({ vehId }) => {
      const v = get(vehId); if (!v) return fail(ERR.NOT_FOUND);
      if (v.bizId) return fail(ERR.BUSY);
      if (ctx.services.vehicleInUse && ctx.services.vehicleInUse(vehId)) return fail(ERR.BUSY, 'in use');
      const boat = isBoat(v.model), home = ctx.property.homeId(), def = home ? PROPERTY_BY_ID[home] : null;
      const slots = def ? (boat ? def.berthSlots : def.garageSlots) : 0;
      const used = S().filter((x) => x !== v && x.home && isBoat(x.model) === boat).length;
      const atHome = !!def && slots > used;
      const fee = atHome ? BALANCE.vehHomeDeliver : BALANCE.vehDeliveryFee;
      const r = ctx.ledger.charge({ amount: fee, to: 'ext:services', type: TX.FEE, memo: 'Vehicle delivery', ref: v.id, method: 'auto' });
      if (!r.ok) return r;
      v.home = atHome;
      const placed = ctx.services.placeVehicle ? ctx.services.placeVehicle(vehId, 'deliver', { home: atHome ? home : null }) : null;
      if (placed && placed.pos) { v.pos = placed.pos.map((n) => Math.round(n * 100) / 100); v.yaw = Math.round((placed.yaw || 0) * 1000) / 1000; }
      ctx.emit('veh:changed', { vehId, deliver: true, pos: v.pos }); return ok({ fee, atHome });
    },
    /** Phone tow: the tow truck takes the vehicle to the nearest fuel stop (boats: nearest boat fuel dock) with 5 L in the tank. */
    'veh.tow': ({ vehId }) => {
      const v = get(vehId); if (!v) return fail(ERR.NOT_FOUND);
      if (ctx.services.vehicleInUse && ctx.services.vehicleInUse(vehId)) return fail(ERR.BUSY, 'in use');
      const r = ctx.ledger.charge({ amount: BALANCE.fineTow, to: 'ext:services', type: TX.FEE, memo: 'Tow', ref: v.id, method: 'auto' });
      if (!r.ok) return r;
      v.fuel = Math.max(v.fuel, Math.min(5, VEHICLE_ECON[v.model].tank)); v.home = false;
      const placed = ctx.services.placeVehicle ? ctx.services.placeVehicle(vehId, 'tow', {}) : null;
      if (placed && placed.pos) { v.pos = placed.pos.map((n) => Math.round(n * 100) / 100); v.yaw = Math.round((placed.yaw || 0) * 1000) / 1000; }
      ctx.emit('veh:changed', { vehId, tow: true, pos: v.pos }); return ok({ fee: BALANCE.fineTow });
    },
    /** game-driven usage: distance, throttle factor and collision impulse */
    'veh.use': ({ vehId, km = 0, throttle = 1, impulse = 0 }) => {
      const v = get(vehId); if (!v) return fail(ERR.NOT_FOUND);
      if (!(km >= 0) || !Number.isFinite(km)) return fail(ERR.INVALID_ARG);
      const e = VEHICLE_ECON[v.model], lvl = ctx.skills.level(isBoat(v.model) ? 'skill.boating' : 'skill.driving');
      const use = e.use * km * clamp(0.7 + 0.9 * throttle, 0.7, 1.6) * (1 - 0.03 * (lvl - 1));
      v.fuel = Math.max(0, Math.round((v.fuel - use) * 10000) / 10000);
      v.odo = Math.round((v.odo + km) * 100) / 100;
      v.condition = clamp(Math.round((v.condition - BALANCE.wearPer10km * km / 10 - Math.max(0, impulse) * 0.002) * 10000) / 10000, 0, 1);
      if (impulse <= 0 && km > 0) ctx.skills.addXp(isBoat(v.model) ? 'skill.boating' : 'skill.driving', Math.round(km * 2));
      return ok({ fuel: v.fuel, condition: v.condition });
    },
    'veh.setPos': ({ vehId, pos, yaw = 0 }) => { const v = get(vehId); if (!v) return fail(ERR.NOT_FOUND); v.pos = pos.map((n) => Math.round(n * 100) / 100); v.yaw = Math.round(yaw * 1000) / 1000; return ok(); },
  };
  function addOdo(id, km, cond) { const v = get(id); if (v) { v.odo += km; v.condition = Math.min(v.condition, cond); } }
  function forceSellCheapest() {
    const c = S().filter((v) => !v.bizId).sort((a, b) => usedValue(a) - usedValue(b))[0]; if (!c) return false;
    const val = usedValue(c); if (val > 0) ctx.ledger.transfer({ from: 'ext:buyers', to: ACCOUNTS.CHECKING, amount: val, type: TX.SALE_VEHICLE, memo: 'Seized ' + c.model, ref: c.id });
    S().splice(S().indexOf(c), 1); return true;
  }
  const selects = {
    'veh.owned': () => S().map(view),
    'veh.dealer': ({ poiId }) => { const D = DEALERS[poiId]; if (!D) return []; return D.models.map((m) => ({ modelId: m, price: D.used ? null : VEHICLE_ECON[m].price, usedPrice: D.used || D.usedOk ? VEHICLE_ECON[m].used : null, licence: VEHICLE_ECON[m].licence })); },
  };
  return { defaults, get, cmds, selects, totalValue, count, buyInternal, addOdo, forceSellCheapest, assign: (id, bizId) => { const v = get(id); if (v) v.bizId = bizId; }, unassign: (id) => { const v = get(id); if (v) v.bizId = null; }, usedValue, refPrice };
}
