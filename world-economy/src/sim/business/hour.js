// Hourly business simulation (Annex D 6.4, 7.x). One shared framework; `model` picks the module.
import { BIZ_BY_ID, SITE_BY_ID, ASSORTMENTS, ROLE_THROUGHPUT } from '../../data/businesses.js';
import { ITEM_BY_ID } from '../../data/items.js';
import { VEHICLE_ECON } from '../../data/vehicles.js';
import { BALANCE } from '../../data/balance.js';
import { TX } from '../../data/ids.js';
import { clamp, stochRound, weekdayOf, dayOf } from '../util.js';

export function createHour(ctx, B) {
  const rngS = () => ctx.rng.sim;
  const mult = (b, key) => { let m = 1; for (const id of b.upgrades) { const u = B.upgradeDef(b, id); if (u && u.effect[key] !== undefined) m *= u.effect[key]; } return m; };
  const add = (b, key) => { let s = 0; for (const id of b.upgrades) { const u = B.upgradeDef(b, id); if (u && u.effect[key] !== undefined) s += u.effect[key]; } return s; };
  function isOpen(b, hour, t) { const h = b.hours; if (h.days && !h.days.includes(weekdayOf(t))) return false; return h.from < h.to ? hour >= h.from && hour < h.to : hour >= h.from || hour < h.to; }
  function weekdayMult(site, t) {
    const wd = weekdayOf(t); if (!site) return 1;
    if (site.officeLike && wd >= 5) return 0.5;
    if (site.leisure || site.profile === 'leisure') return wd === 5 ? 1.25 : wd === 6 ? 1.1 : 1;
    return wd === 5 ? 1.1 : 1;
  }
  function weatherMult(site, w) {
    const type = (w && w.type) || 'clear';
    const leisure = site && (site.leisure || site.profile === 'leisure');
    if (type === 'rain') return leisure ? 0.25 : 0.7;
    if (type === 'storm') return leisure ? 0.1 : 0.4;
    if (type === 'overcast' || type === 'cloudy') return 0.9;
    return 1;
  }
  const weather = () => (ctx.services.weather ? ctx.services.weather() : { type: 'clear' });
  function skillAvg(b, roles) { let s = 0, n = 0; for (const e of b.staff) if (!roles || roles.includes(e.role)) { s += e.skill; n++; } return n ? s / n : 0; }
  function priceMult(b, p, eps, ref) { const r = p.price / ref; if (p.price > BALANCE.demandPriceCap * ref) return 0; return clamp(Math.pow(1 / r, eps), 0, 1.6); }
  function quality(b, T, assist) {
    const equip = clamp(0.4 + 0.15 * (b.tier - 1) + add(b, 'quality') + (b.upgrades.length ? 0.05 : 0), 0, 1);
    const sk = b.staff.length ? skillAvg(b) / 5 : 0.3;
    const fresh = B.freshness(b);
    const clean = 0.8;
    return clamp(0.25 * equip + 0.45 * sk + 0.20 * fresh + 0.10 * clean + assist, 0, 1.2);
  }
  /** capacity (customers per hour) per the type's capTerms; null = unconstrained */
  function capacity(b, T, hasAssist, out) {
    if (!T.capTerms || !T.capTerms.length) return null;
    let cap = Infinity;
    for (const term of T.capTerms) {
      let v;
      if (term.role) {
        v = 0; for (const e of b.staff) if (e.role === term.role) v += term.per * (0.7 + 0.1 * e.skill);
        if (hasAssist) v += term.per * (0.7 + 0.1 * 3);
        else if (v === 0 && term.ownerOk && b.ownerOperates) v = term.per * 0.7;
        v *= mult(b, 'cap');
      } else if (term.seats) v = (b.seats || T.seatsStart || 10) * term.seats;
      if (out) out[term.role || 'seats'] = Math.round(v * 10) / 10;
      cap = Math.min(cap, v);
    }
    return cap;
  }
  function hourRetail(b, T, t, hour, st) {
    const site = SITE_BY_ID[b.siteId];
    const wd = weekdayMult(site, t), wx = weatherMult(site, weather());
    const region = site ? site.region : 'city';
    const F = (site ? site.footfall[hour] : 30) * wd * wx * ctx.market.activity(region);
    const hasAssist = b.assist && b.assist.hours > 0;
    const assistBonus = hasAssist ? 0.1 * b.assist.score : 0;
    if (hasAssist) b.assist.hours -= 1;
    const q = quality(b, T, assistBonus);
    const appeal = 0.4 + 0.6 * (0.6 * q + 0.4 * b.reputation) + add(b, 'appeal');
    const eps = T.assortments ? ASSORTMENTS[b.assortment || 'convenience'].eps : T.eps;
    const capture = T.capture * mult(b, 'capture') * (1 + (b.tier - 1) * 0.1);
    let totalShare = 0; const active = b.products.filter((p) => p.active);
    for (const p of active) totalShare += p.share || 1;
    let demandTotal = 0; const dem = [];
    for (const p of active) {
      let shareMult = 1;
      if (T.assortments) shareMult = ASSORTMENTS[b.assortment || 'convenience'].demandMult || 1;
      if (T.assortments && site) { const a = ASSORTMENTS[b.assortment || 'convenience']; if (a.tag && site.tags.includes(a.tag)) shareMult = a.tagMult; if (a.district && site.district === a.district[0]) shareMult *= a.district[1]; }
      const d = stochRound(F * capture * ((p.share || 1) / (totalShare || 1)) * appeal * priceMult(b, p, eps, B.refOf(b, p)) * shareMult * (T.id === 'biz.supermarket' || T.id === 'biz.retail' ? active.length * 0.5 : 1), rngS());
      dem.push(d); demandTotal += d;
    }
    const basket = T.basket || 1;
    const capC = capacity(b, T, hasAssist, null);
    const cap = capC === null ? null : capC * basket;
    const scale = cap !== null && demandTotal > cap ? cap / demandTotal : 1;
    let revenue = 0, served = 0, lost = 0, stockout = false;
    const ticket = b.upgrades.includes('rest.signature') ? 1.25 : 1;
    for (let i = 0; i < active.length; i++) {
      const p = active[i];
      let want = Math.floor(dem[i] * scale + (rngS().float() < (dem[i] * scale) % 1 ? 1 : 0));
      if (cap === null) want = dem[i];
      const maxStock = B.maxServable(b, p);
      let n = Math.min(want, maxStock);
      if (n < want) stockout = true;
      if (n > 0) { B.consume(b, p, n); revenue += n * Math.round(p.price * (p.id === 'grilledfish' || p.id === 'steak' ? ticket : 1)); served += n; st.usage = st.usage || {}; for (const [it, q2] of Object.entries(p.recipe)) st.usage[it] = (st.usage[it] || 0) + q2 * n; }
      lost += dem[i] - n;
    }
    st.revenue += revenue; st.customers += served; st.lost += Math.max(0, lost); st.qualitySum += q; st.qualityN++;
    if (stockout) { st.stockouts++; B.raiseAlert(b, 'stockout', {}); }
    const demandAll = served + Math.max(0, lost);
    const rep = BALANCE.repGain * (demandAll > 0 ? served / demandAll - 0.85 : 0) * mult(b, 'repGain') + 0.01 * (q - 0.5) - (stockout ? 0.03 : 0);
    b.reputation = clamp(b.reputation + rep, add(b, 'repFloor') || 0, 1);
    if (T.shrink && hour === 3) B.shrink(b, T.shrink);
    return revenue;
  }
  function hourVending(b, T, t, hour, st) {
    let revenue = 0;
    const eps = T.eps;
    const wx = weather();
    for (const u of b.units) {
      if (u.kind !== 'machine') continue;
      const site = SITE_BY_ID[u.siteId]; if (!site) continue;
      if (u.condition < 0.5 && !u.jammed && rngS().float() < 0.05) { u.jammed = true; B.raiseAlert(b, 'breakdown', { unitId: u.id }); }
      if (u.jammed || u.fullBox) continue;
      const F = site.footfall[hour] * weekdayMult(site, t) * weatherMult(site, wx) * ctx.market.activity(site.region);
      const q = clamp(0.5 + 0.1 * add(b, 'quality') + 0.2 * u.condition, 0, 1.2);
      const appeal = 0.4 + 0.6 * (0.6 * q + 0.4 * b.reputation);
      const capture = T.capture * mult(b, 'capture') * (site.premium ? 1 : 1) * (u.upg && u.upg.includes('vend.card_reader') ? 1.15 : 1);
      const act = b.products.filter((p) => p.active && (!p.hot || (u.upg && u.upg.includes('vend.hotfood'))));
      let tot = 0; for (const p of act) tot += p.share;
      for (const p of act) {
        const ref = B.refOf(b, p) + (p.id === 'beverage' && u.upg && u.upg.includes('vend.cooler') ? 30 : 0);
        const d = stochRound(F * capture * (p.share / tot) * appeal * priceMult(b, p, eps, ref) * 1.0, rngS());
        const stk = Math.min(...Object.entries(p.recipe).map(([it, n]) => Math.floor((u.stock[it] || 0) / n)));
        const n = Math.min(d, stk);
        if (n > 0) { for (const [it, q2] of Object.entries(p.recipe)) { u.stock[it] -= q2 * n; if (u.stock[it] <= 0) delete u.stock[it]; } revenue += n * p.price; u.cash += n * p.price; st.customers += n; st.usage = st.usage || {}; for (const [it, q2] of Object.entries(p.recipe)) st.usage[it] = (st.usage[it] || 0) + q2 * n; }
        if (d > n) { st.lost += d - n; if (stk === 0) { st.stockouts++; B.raiseAlert(b, 'stockout', { unitId: u.id }); } }
      }
      if (u.cash >= T.cashBoxMax) { u.fullBox = true; B.raiseAlert(b, 'lowCash', { unitId: u.id, kind: 'fullBox' }); }
    }
    st.revenue += revenue;
    return revenue;
  }
  const FLEET_DEF = (T, modelId) => (T.fleet ? T.fleet[modelId] : null);
  function hourBoatRental(b, T, t, hour, st) {
    const site = SITE_BY_ID[b.siteId]; if (!site) return 0;
    const type = weather().type || 'clear';
    const wf = type === 'clear' ? 1 : type === 'cloudy' || type === 'overcast' ? 0.7 : type === 'rain' ? 0.1 : 0;
    const F = site.footfall[hour] * weekdayMult(site, t) * wf * ctx.market.activity(site.region);
    // return boats finishing a rental
    for (const u of b.units) if (u.busy > 0) { u.busy--; if (u.busy === 0) { u.condition = Math.max(0, u.condition - 0.004); } }
    const attendantCap = capacity(b, T, b.assist && b.assist.hours > 0, null);
    if (b.assist && b.assist.hours > 0) b.assist.hours -= 1;
    let rentals = stochRound(F * 0.035 * mult(b, 'capture') * (0.6 + 0.4 * b.reputation), rngS());
    if (attendantCap !== null) rentals = Math.min(rentals, Math.floor(attendantCap));
    let revenue = 0, done = 0;
    const free = b.units.filter((u) => u.kind === 'boat' && !u.busy && u.condition > 0.1);
    for (let i = 0; i < rentals && free.length; i++) {
      const u = free.shift(); const d = FLEET_DEF(T, u.modelId); if (!d) continue;
      const rate = u.price || d.rate; const eps = T.eps;
      const accept = clamp(Math.pow(d.ref / rate, eps), 0, 1.4);
      if (rate > BALANCE.demandPriceCap * d.ref || rngS().float() > accept) continue;
      const hrs = rngS().chance(0.5) ? 1 : 2; u.busy = hrs; revenue += rate * hrs; done++;
    }
    st.revenue += revenue; st.customers += done; st.lost += Math.max(0, rentals - done);
    return revenue;
  }
  function hourFishing(b, T, t, hour, st) {
    // each crewed boat leaves at 05:00 and lands after `hours` of fishing; one trip a day
    let revenue = 0;
    const wf = (() => { const ty = weather().type || 'clear'; return ty === 'storm' ? 0 : ty === 'rain' ? 0.75 : 1; })();
    for (const u of b.units) {
      if (u.kind !== 'boat') continue;
      const d = T.boats[u.modelId]; if (!d) continue;
      const crew = b.staff.filter((e) => e.unitId === u.id);
      const need = Math.max(d.crew, d.crew === 0 ? 0 : d.crew);
      const manned = d.crew === 0 ? b.ownerOperates : crew.length >= need;
      if (hour === 5 && manned && wf > 0 && u.fuel === undefined) { u.trip = { land: 5 + d.hours, skill: crew.length ? crew.reduce((s, e) => s + e.skill, 0) / crew.length : 2 }; }
      if (u.trip && hour === u.trip.land % 24) {
        const g = ctx.state.bizMeta.grounds[d.ground];
        const kg = Math.floor(d.kg * (0.6 + 0.1 * u.trip.skill) * g.rich * wf * mult(b, 'catch') * clamp(u.condition + 0.3, 0.5, 1));
        const speed = BALANCE.boatFuelPrice;
        const litres = Math.round((VEHICLE_ECON[u.modelId].tank || 25) * 0.3);
        u.trip = null;
        const fc = litres * speed;
        if (fc > 0) B.pay(b, 'ext:services', fc, TX.FUEL, 'Boat fuel');
        u.condition = Math.max(0, u.condition - 0.006); u.fuelUsed = (u.fuelUsed || 0) + litres;
        g.landed += kg;
        if (kg > 0) { st.customers += 1; B.landFish(b, d.ground, kg); }
        st.trips = (st.trips || 0) + 1;
      }
    }
    return revenue;
  }
  function hourDelivery(b, T, t, hour, st) {
    if (hour < 8 || hour >= 18) return 0;
    let revenue = 0;
    const act = ctx.market.activity('city');
    const dispatcher = b.staff.some((e) => e.role === 'dispatcher') ? 1.2 : 1;
    for (const u of b.units) {
      if (u.kind !== 'vehicle') continue;
      const d = T.vehicles[u.modelId]; if (!d) continue;
      const drv = b.staff.find((e) => e.unitId === u.id && e.role === 'driver'); if (!drv && !b.ownerOperates) continue;
      if (u.condition < 0.15) continue;
      const sk = drv ? 0.7 + 0.1 * drv.skill : 0.8;
      const routes = stochRound((d.routes / 10) * sk * mult(b, 'routes') * dispatcher * clamp(act, 0.8, 1.3) * (0.7 + 0.3 * b.reputation + 0.2), rngS());
      if (routes <= 0) continue;
      const fee = Math.round(d.fee * (0.9 + 0.2 * b.reputation));
      revenue += routes * fee; st.customers += routes;
      const km = routes * 9; const litres = Math.ceil((VEHICLE_ECON[u.modelId].use || 0.1) * km);
      B.pay(b, 'ext:services', litres * BALANCE.fuelPrice, TX.FUEL, 'Fuel');
      u.condition = Math.max(0, u.condition - BALANCE.wearPer10km * km / 10); u.km = (u.km || 0) + km;
      if (u.vehId) ctx.veh.addOdo(u.vehId, km, u.condition);
    }
    // accepted contracts add a premium when spare capacity exists (kept simple)
    for (const c of b.contracts || []) if (c.accepted && !c.done && hour === 17) { c.done = true; revenue += c.fee; }
    st.revenue += revenue; return revenue;
  }
  function hourLogging(b, T, t, hour, st) {
    if (hour !== 17) return 0;
    const meta = b.stand || (b.stand = { health: 1, harvested: 0 });
    const loggers = b.staff.filter((e) => e.role === 'logger');
    const trucks = b.units.filter((u) => u.kind === 'vehicle');
    if (!loggers.length || !trucks.length) return 0;
    const sk = loggers.reduce((s, e) => s + 0.7 + 0.1 * e.skill, 0);
    const forest = ctx.state.jobs.forestHealth;
    const output = loggers.length * 15 * (sk / loggers.length) * meta.health * mult(b, 'crew') * (0.8 + 0.4 * forest);
    const drivers = b.staff.filter((e) => e.role === 'driver').length || (b.ownerOperates ? 1 : 0);
    const trips = Math.min(trucks.length, Math.max(drivers, 0)) * 3 * mult(b, 'trips');
    const m3 = Math.floor(Math.min(output, trips * 14));
    if (m3 > 0) {
      const leaseFee = m3 * T.leaseFeePerM3; B.pay(b, 'ext:services', leaseFee, TX.OPEX_SITE, 'Timber lease fee');
      const sp = rngS().chance(0.6) ? 'item.wood.log_pine' : 'item.wood.log_spruce';
      ctx.inv.add('biz:' + b.id, sp, m3, { force: true });
      meta.harvested += m3;
      if (meta.harvested > 160) meta.health = Math.max(0.2, meta.health - 0.01 * (meta.harvested - 160) / 10);
      st.customers += m3; st.logs = (st.logs || 0) + m3;
      B.sellLogs(b);
      for (const u of trucks) { const km = 25; const litres = Math.ceil(VEHICLE_ECON[u.modelId].use * km); B.pay(b, 'ext:services', litres * BALANCE.fuelPrice, TX.FUEL, 'Fuel'); u.condition = Math.max(0, u.condition - 0.0125); }
    }
    return 0;
  }
  function hourWarehouse(b, T, t, hour, st) {
    if (hour !== 12) return 0; // daily settlement of storage rent at midday
    const ops = b.staff.filter((e) => e.role === 'forklift');
    const slots = Math.max(T.slotsBase, add(b, 'slots')) * 1;
    const price = b.slotPrice || T.slotRef;
    const target = clamp(1.3 - price / T.slotRef, 0, 0.95) * slots;
    const capOps = ops.length * 300 * mult(b, 'throughput') + (b.assist && b.assist.hours > 0 ? 200 : 0);
    const goal = Math.min(target, capOps);
    b.occupied = (b.occupied || 0) + (goal - (b.occupied || 0)) * 0.25;
    const occ = Math.floor(b.occupied);
    const revenue = occ * price;
    if (revenue > 0) { B.receive(b, 'ext:tenants', revenue, TX.RENT_RECEIVED, 'Storage rent'); }
    st.customers += occ;
    return 0;
  }
  function hourRental() { return 0; }
  /** Expected visible customers per game hour for hour `hour` (pure: no rng, no mutation). Same terms as the hourly model: footfall x weekday x
   *  weather x regional activity, appeal from quality and reputation, price response, staff/seat capacity, stock on hand. Used by the customer AI
   *  (game/ai/customers.js) so what walks into a shop follows what the ledger will book; it never books anything itself. */
  function expectedFlow(b, hour, t) {
    const T = BIZ_BY_ID[b.typeId]; const out = { open: false, perHour: 0, points: [], model: T.model };
    if (b.suspended || !isOpen(b, hour, t)) return out;
    out.open = true;
    const wx = weather();
    if (T.model === 'retail') {
      const site = SITE_BY_ID[b.siteId]; if (!site) return out;
      const F = site.footfall[hour] * weekdayMult(site, t) * weatherMult(site, wx) * ctx.market.activity(site.region);
      const hasAssist = b.assist && b.assist.hours > 0;
      const q = quality(b, T, hasAssist ? 0.1 * b.assist.score : 0);
      const appeal = 0.4 + 0.6 * (0.6 * q + 0.4 * b.reputation) + add(b, 'appeal');
      const A = T.assortments ? ASSORTMENTS[b.assortment || 'convenience'] : null;
      const eps = A ? A.eps : T.eps;
      const capture = T.capture * mult(b, 'capture') * (1 + (b.tier - 1) * 0.1);
      const active = b.products.filter((p) => p.active); let totalShare = 0; for (const p of active) totalShare += p.share || 1;
      const wide = T.id === 'biz.supermarket' || T.id === 'biz.retail' ? active.length * 0.5 : 1;
      let items = 0, itemsDemand = 0;
      for (const p of active) {
        let sm = A ? A.demandMult || 1 : 1;
        if (A && site) { if (A.tag && site.tags.includes(A.tag)) sm = A.tagMult; if (A.district && site.district === A.district[0]) sm *= A.district[1]; }
        const d = F * capture * ((p.share || 1) / (totalShare || 1)) * appeal * priceMult(b, p, eps, B.refOf(b, p)) * sm * wide;
        itemsDemand += d; items += Math.min(d, B.maxServable(b, p));
      }
      const basket = T.basket || 1, capC = capacity(b, T, hasAssist, null), cap = capC === null ? Infinity : capC * basket;
      const served = Math.min(items, cap * (itemsDemand > 0 ? 1 : 0));
      out.perHour = served / basket; out.demand = itemsDemand / basket; out.points = [{ siteId: b.siteId, perHour: out.perHour }];
    } else if (T.model === 'vending') {
      for (const u of b.units) {
        if (u.kind !== 'machine' || u.jammed || u.fullBox) continue;
        const site = SITE_BY_ID[u.siteId]; if (!site) continue;
        const F = site.footfall[hour] * weekdayMult(site, t) * weatherMult(site, wx) * ctx.market.activity(site.region);
        const qv = clamp(0.5 + 0.1 * add(b, 'quality') + 0.2 * u.condition, 0, 1.2), appeal = 0.4 + 0.6 * (0.6 * qv + 0.4 * b.reputation);
        const capture = T.capture * mult(b, 'capture') * (u.upg && u.upg.includes('vend.card_reader') ? 1.15 : 1);
        const act = b.products.filter((p) => p.active && (!p.hot || (u.upg && u.upg.includes('vend.hotfood')))); let tot = 0; for (const p of act) tot += p.share;
        let n = 0;
        for (const p of act) {
          const ref = B.refOf(b, p) + (p.id === 'beverage' && u.upg && u.upg.includes('vend.cooler') ? 30 : 0);
          const stk = Math.min(...Object.entries(p.recipe).map(([it, k]) => Math.floor((u.stock[it] || 0) / k)));
          n += Math.min(F * capture * (p.share / tot) * appeal * priceMult(b, p, T.eps, ref), stk);
        }
        if (n > 0) { out.points.push({ siteId: u.siteId, unitId: u.id, perHour: n }); out.perHour += n; }
      }
    } else if (T.model === 'boatrental') {
      const site = SITE_BY_ID[b.siteId]; if (!site) return out;
      const type = wx.type || 'clear'; const wf = type === 'clear' ? 1 : type === 'cloudy' || type === 'overcast' ? 0.7 : type === 'rain' ? 0.1 : 0;
      const free = b.units.filter((u) => u.kind === 'boat' && !u.busy && u.condition > 0.1).length;
      const r = site.footfall[hour] * weekdayMult(site, t) * wf * ctx.market.activity(site.region) * 0.035 * mult(b, 'capture') * (0.6 + 0.4 * b.reputation);
      out.perHour = Math.min(r, free); out.points = [{ siteId: b.siteId, perHour: out.perHour }];
    }
    return out;
  }
  const MODEL = { retail: hourRetail, vending: hourVending, boatrental: hourBoatRental, fishing: hourFishing, delivery: hourDelivery, logging: hourLogging, warehouse: hourWarehouse, rental: hourRental };
  /** returns revenue credited (retail-like models credit one sale.goods transfer per business per hour) */
  function simulateHour(b, hour, t) {
    const T = BIZ_BY_ID[b.typeId];
    const st = b.stats.today;
    if (b.suspended) return;
    if (!isOpen(b, hour, t) && T.model !== 'fishing' && T.model !== 'logging' && T.model !== 'warehouse') return;
    st.hoursOpen++;
    const fn = MODEL[T.model];
    const rev = fn(b, T, t, hour, st);
    if (rev > 0 && (T.model === 'retail' || T.model === 'vending' || T.model === 'boatrental' || T.model === 'delivery')) B.receive(b, 'ext:customers', rev, TX.SALE_GOODS, T.name + ' sales');
    // payroll accrues for staff on duty (up to 10 h a day)
    if (T.model === 'fishing') { for (const e of b.staff) { const u = b.units.find((x) => x.id === e.unitId); if (u && u.trip) b.finance.accrued += e.wage; } }
    else if (b.staff.length && isOpen(b, hour, t) && b.finance.hoursToday < 10) { for (const e of b.staff) b.finance.accrued += e.wage; b.finance.hoursToday++; }
    if (b.assist && b.assist.hours <= 0) b.assist = null;
    void dayOf; void ROLE_THROUGHPUT; void ITEM_BY_ID;
  }
  return { simulateHour, capacity, quality, isOpen, weekdayMult, weatherMult, expectedFlow };
}
