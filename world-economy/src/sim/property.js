// Property (Annex D 8): listings, purchase, lease, renting out, home, weekly tax.
import { PROPERTIES, PROPERTY_BY_ID, PLOTS, PLOT_BY_ID, LEASE_ROOMS } from '../data/properties.js';
import { BALANCE } from '../data/balance.js';
import { ACCOUNTS, TX } from '../data/ids.js';
import { ok, fail, ERR, clamp, payerAccount, dayOf } from './util.js';

export function createProperty(ctx) {
  const S = () => ctx.state.properties;
  const defaults = () => ({ owned: [], leases: [], home: null, listings: {}, drift: {} });
  const def = (id) => PROPERTY_BY_ID[id] || PLOT_BY_ID[id];
  const rec = (id) => S().owned.find((o) => o.id === id);
  const isPlot = (id) => !!PLOT_BY_ID[id];
  function normal() { const r = ctx.rng.sim; const u = Math.max(1e-9, r.float()), v = r.float(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const comfortOf = (id) => clamp((def(id) && def(id).comfortBase || 0.2) + (ctx.cons ? ctx.cons.comfort(id) * (1 - (def(id) && def(id).comfortBase || 0.2)) : 0), 0, 1);
  const improvements = (id) => (ctx.cons ? ctx.cons.improvementValue(id) : 0);
  const valueOf = (o) => o.value + improvements(o.id);
  const totalValue = () => S().owned.reduce((s, o) => s + valueOf(o), 0);
  const homeId = () => S().home;
  const homeComfort = () => (S().home ? (S().home.startsWith('lease_') ? 0.2 : comfortOf(S().home)) : 0);
  const listed = (id) => { const d = def(id); if (!d) return false; if (d.tags && d.tags.includes('needs.construction5') && ctx.jobs.siteStage() < 5) return false; return true; };
  function marketRent(o) { return Math.floor(valueOf(o) * BALANCE.rentValuePct * (0.8 + 0.4 * comfortOf(o.id))); }
  const near = (id) => !ctx.services.near || ctx.services.near('poi.city.realty') || ctx.services.near(def(id) ? def(id).poi : 'x');
  const cmds = {
    'prop.buy': ({ propId, payFrom }) => {
      const d = def(propId); if (!d) return fail(ERR.NOT_FOUND);
      if (rec(propId)) return fail(ERR.BUSY, 'already owned');
      if (!listed(propId)) return fail(ERR.CLOSED, 'not listed yet');
      if (!near(propId)) return fail(ERR.OUT_OF_RANGE);
      const price = d.basePrice || d.price;
      const acct = payerAccount(ctx.ledger, payFrom, price);
      const r = ctx.ledger.transfer({ from: acct, to: 'ext:sellers', amount: price, type: TX.PURCHASE_PROPERTY, memo: d.name || propId, ref: propId });
      if (!r.ok) return r;
      S().owned.push({ id: propId, value: price, paid: price, rentOut: null, bizId: null, since: dayOf(ctx.now()), tenantRepairs: 0 });
      if (!S().home && !isPlot(propId) && d.kind !== 'commercial') S().home = propId;
      ctx.emit('prop:changed', { propId }); ctx.state.flags.autosaveDue = true;
      return ok({ price });
    },
    'prop.sell': ({ propId }) => {
      const o = rec(propId); if (!o) return fail(ERR.NOT_OWNER);
      if (o.bizId) ctx.state.businesses.find((b) => b.id === o.bizId); // rental business keeps no claim after sale
      const val = Math.floor(valueOf(o) * BALANCE.propertySellPct);
      const r = ctx.ledger.transfer({ from: 'ext:buyers', to: ACCOUNTS.CHECKING, amount: val, type: TX.SALE_PROPERTY, memo: propId, ref: propId });
      if (!r.ok) return r;
      S().owned = S().owned.filter((x) => x !== o); if (S().home === propId) S().home = null;
      if (ctx.cons) ctx.cons.clear(propId);
      ctx.emit('prop:changed', { propId }); return ok({ value: val });
    },
    'prop.lease': ({ leaseId }) => {
      const L = LEASE_ROOMS.find((x) => x.id === leaseId); if (!L) return fail(ERR.NOT_FOUND);
      if (S().leases.some((x) => x.id === leaseId)) return fail(ERR.BUSY);
      if (ctx.services.near && !ctx.services.near(L.poi)) return fail(ERR.OUT_OF_RANGE);
      const acct = payerAccount(ctx.ledger, 'auto', L.deposit + L.rentPerDay);
      const r = ctx.ledger.transfer({ from: acct, to: 'ext:landlords', amount: L.deposit, type: TX.RENT_PAID, memo: 'Deposit ' + leaseId, ref: leaseId });
      if (!r.ok) return r;
      S().leases.push({ id: leaseId, rentPerDay: L.rentPerDay, deposit: L.deposit, since: dayOf(ctx.now()), missed: 0 });
      if (!S().home) S().home = leaseId;
      ctx.emit('prop:changed', { propId: leaseId }); return ok();
    },
    'prop.endLease': ({ leaseId }) => {
      const l = S().leases.find((x) => x.id === leaseId); if (!l) return fail(ERR.NOT_FOUND);
      ctx.ledger.transfer({ from: 'ext:landlords', to: ACCOUNTS.CHECKING, amount: l.deposit, type: TX.RENT_RECEIVED, memo: 'Deposit refund', ref: leaseId });
      S().leases = S().leases.filter((x) => x !== l); if (S().home === leaseId) S().home = null;
      ctx.emit('prop:changed', { propId: leaseId }); return ok();
    },
    'prop.setRentOut': ({ propId, rentPerDay }) => {
      const o = rec(propId); if (!o) return fail(ERR.NOT_OWNER);
      const d = def(propId); if (isPlot(propId) && !(ctx.cons && ctx.cons.habitable(propId))) return fail(ERR.REQUIREMENT, 'needs a habitable building');
      if (rentPerDay === null) {
        if (!o.rentOut) return fail(ERR.NOT_FOUND);
        if (o.rentOut.occupied) o.rentOut.noticeUntil = ctx.now() + 2 * 1440; else o.rentOut = null;
        ctx.emit('prop:changed', { propId }); return ok();
      }
      if (!Number.isInteger(rentPerDay) || rentPerDay <= 0) return fail(ERR.INVALID_ARG);
      if (S().home === propId) return fail(ERR.BUSY, 'this is your home');
      o.rentOut = { rentPerDay, occupied: o.rentOut ? o.rentOut.occupied : false, since: o.rentOut ? o.rentOut.since : null, wait: ctx.rng.sim.int(1, 3), noticeUntil: null };
      void d; ctx.emit('prop:changed', { propId }); return ok({ marketRent: marketRent(o) });
    },
    'prop.setHome': ({ propId }) => {
      if (propId !== null && !S().leases.some((l) => l.id === propId)) { const o = rec(propId); if (!o) return fail(ERR.NOT_OWNER); if (isPlot(propId) && !(ctx.cons && ctx.cons.habitable(propId))) return fail(ERR.REQUIREMENT, 'not habitable'); if (o.rentOut && o.rentOut.occupied) return fail(ERR.BUSY, 'let to a tenant'); if (def(propId).kind === 'commercial') return fail(ERR.INVALID_ARG); }
      S().home = propId; ctx.emit('prop:changed', { propId }); return ok();
    },
  };
  /** midnight: values, rents, tenancies, lease rent */
  function daily() {
    const act = ctx.market.activity('city');
    for (const o of S().owned) {
      const d = 1 + BALANCE.propertyDrift + BALANCE.propertyVol * normal() + BALANCE.propertyActivity * (act - 1);
      o.value = Math.max(1, Math.floor(o.value * d));
      const ro = o.rentOut;
      if (!ro) continue;
      if (ro.occupied) {
        const rent = ro.rentPerDay;
        const dest = o.bizId && ctx.biz.get(o.bizId) ? 'biz:' + o.bizId : ACCOUNTS.CHECKING;
        ctx.ledger.transfer({ from: 'ext:tenants', to: dest, amount: rent, type: TX.RENT_RECEIVED, memo: 'Rent ' + o.id, ref: o.id });
        if (o.bizId && ctx.biz.get(o.bizId)) { ctx.biz.get(o.bizId).finance.lifetimeRevenue += rent; }
        const upkeep = Math.ceil(rent * BALANCE.upkeepPctOfRent);
        const payer = dest;
        ctx.ledger.transfer({ from: payer, to: 'ext:services', amount: upkeep, type: TX.OPEX_MAINTENANCE, memo: 'Upkeep ' + o.id, ref: o.id });
        if (ctx.rng.sim.float() < 0.03) { const rep = ctx.rng.sim.int(5000, 40000); ctx.ledger.transfer({ from: payer, to: 'ext:services', amount: Math.min(rep, ctx.ledger.balance(payer)) || 1, type: TX.OPEX_MAINTENANCE, memo: 'Repairs ' + o.id, ref: o.id }); }
        if (ro.noticeUntil && ctx.now() >= ro.noticeUntil) o.rentOut = null;
        // agent fee 8% when the rental business has an agent
        if (o.bizId) { const b = ctx.biz.get(o.bizId); if (b && b.upgrades.includes('rental.agent')) ctx.ledger.transfer({ from: dest, to: 'ext:staff', amount: Math.ceil(rent * 0.08), type: TX.PAYROLL, memo: 'Agent fee', ref: o.id }); }
      } else {
        const mr = marketRent(o);
        if (ro.rentPerDay <= mr * 1.4) {
          ro.wait -= 1;
          const chance = ro.rentPerDay <= mr ? 1 : clamp(1 - (ro.rentPerDay - mr) / (0.4 * mr), 0, 1);
          if (ro.wait <= 0 && ctx.rng.sim.float() < chance) { ro.occupied = true; ro.since = dayOf(ctx.now()); }
          else if (ro.wait <= 0) ro.wait = 1;
        }
      }
    }
    for (const l of S().leases) {
      const r = ctx.ledger.charge({ amount: l.rentPerDay, to: 'ext:landlords', type: TX.RENT_PAID, memo: 'Rent ' + l.id, method: 'auto' });
      if (!r.ok) { l.missed++; if (l.missed >= 3) { S().leases = S().leases.filter((x) => x !== l); if (S().home === l.id) S().home = null; ctx.note('property', 'Evicted', 'You fell behind on rent for ' + l.id); break; } } else l.missed = 0;
    }
  }
  function weekly() { for (const o of S().owned) ctx.tax.payOrAccrue(Math.ceil(valueOf(o) * BALANCE.propertyTaxWeekly), TX.TAX_PROPERTY, 'Property tax ' + o.id); }
  function assignToRental(propId, bizId) {
    const o = rec(propId); if (!o) return fail(ERR.NOT_OWNER);
    if (o.bizId) return fail(ERR.BUSY); o.bizId = bizId; return ok();
  }
  function releaseRental(bizId) { for (const o of S().owned) if (o.bizId === bizId) o.bizId = null; }
  const rentalCount = (bizId) => S().owned.filter((o) => o.bizId === bizId).length;
  const view = (o) => ({ id: o.id, name: (def(o.id) || {}).name || o.id, kind: isPlot(o.id) ? 'plot' : def(o.id).kind, value: valueOf(o), comfort: comfortOf(o.id), rentOut: o.rentOut, marketRent: marketRent(o), isHome: S().home === o.id, bizId: o.bizId });
  const selects = {
    'prop.listings': ({ region, kind } = {}) => [...PROPERTIES, ...PLOTS.map((p) => ({ ...p, kind: 'plot', basePrice: p.price, name: p.id }))].filter((d) => (!region || d.region === region) && (!kind || d.kind === kind) && !rec(d.id) && listed(d.id)).map((d) => ({ id: d.id, kind: d.kind, name: d.name, price: d.basePrice, region: d.region, poi: d.poi, forSale: true })).concat(LEASE_ROOMS.filter((l) => !S().leases.some((x) => x.id === l.id)).map((l) => ({ id: l.id, kind: 'room', name: l.name, rentPerDay: l.rentPerDay, deposit: l.deposit, region: l.region, poi: l.poi, forLease: true }))),
    'prop.owned': () => S().owned.map(view).concat(S().leases.map((l) => ({ id: l.id, name: 'Old Town room', kind: 'lease', rentPerDay: l.rentPerDay, deposit: l.deposit, isHome: S().home === l.id }))),
  };
  return { defaults, cmds, selects, daily, weekly, homeId, homeComfort, totalValue, assignToRental, releaseRental, rentalCount, valueOf, rec, def, isPlot, comfortOf };
}
