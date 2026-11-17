// Construction and furnishing (Annex D 9). Pieces on a 2 m cell grid: [typeIdx, gx, gy, gz, rot, matIdx]; furniture [typeIdx, x2, level, z2, rot].
import { PIECES, FURNITURE, MATERIALS, COMFORT_CAPS, COMFORT_TOTAL } from '../data/pieces.js';
import { PLOT_BY_ID, PROPERTY_BY_ID } from '../data/properties.js';
import { SITE_BY_ID, SITES, FOOTFALL_PROFILES } from '../data/businesses.js';
import { BALANCE } from '../data/balance.js';
import { TX } from '../data/ids.js';
import { ok, fail, ERR, clamp, payerAccount } from './util.js';

const EDGE_DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const ST = { floor: 'floor', roof: 'roof' };
export function createConstruction(ctx) {
  const S = () => ctx.state.plots;
  const defaults = () => ({});
  const pdef = (idx) => PIECES[idx];
  const idxOfPiece = (t) => (Number.isInteger(t) ? t : PIECES.findIndex((p) => p.id === t));
  const idxOfFurn = (t) => (Number.isInteger(t) ? t : FURNITURE.findIndex((p) => p.id === t));
  const plotRec = (id) => (S()[id] ||= { pieces: [], furniture: [] });
  const dims = (id) => { const p = PLOT_BY_ID[id]; if (p) return { W: Math.floor(p.size[0] / 2), D: Math.floor(p.size[1] / 2) }; const pr = PROPERTY_BY_ID[id]; return pr ? { W: 4, D: 4 } : null; };
  // canonical keys so overlapping edges/corners collide
  function edgeKey(gx, gy, gz, rot) {
    if (rot === 2) { gz += 1; rot = 0; } else if (rot === 3) { gx -= 1; rot = 1; }
    return gx + ',' + gy + ',' + gz + ',' + rot;
  }
  function cornerKey(gx, gy, gz, rot) { const dx = rot === 1 || rot === 2 ? 1 : 0, dz = rot === 2 || rot === 3 ? 1 : 0; return (gx + dx) + ',' + gy + ',' + (gz + dz); }
  function slotOf(p) {
    const d = pdef(p[0]); const [, gx, gy, gz, rot] = p;
    if (d.slot === 'edge') return d.layer === 'rail' ? 'rail:' + edgeKey(gx, gy, gz, rot) : d.layer === 'fence' ? 'fence:' + edgeKey(gx, gy, gz, rot) : 'wall:' + edgeKey(gx, gy, gz, rot);
    if (d.slot === 'corner') return 'pillar:' + cornerKey(gx, gy, gz, rot);
    const layer = d.layer === 'stairs' ? 'floor' : d.layer;
    return layer + ':' + gx + ',' + gy + ',' + gz;
  }
  /** every wall edge of every cell: set of canonical edge keys with walls; plus indexes */
  function index(pieces) {
    const idx = { floors: new Set(), roofs: new Set(), walls: new Map(), pillars: new Set(), doors: new Set(), stairs: new Map(), all: new Map(), cost: 0 };
    for (const p of pieces) {
      const d = pdef(p[0]);
      idx.all.set(slotOf(p), p);
      const [, gx, gy, gz, rot] = p;
      if ((d.layer === 'floor' && !d.open) || d.layer === 'foundation') idx.floors.add(gx + ',' + gy + ',' + gz);
      if (d.layer === 'floor' && d.open) idx.floors.add('open:' + gx + ',' + gy + ',' + gz);
      if (d.layer === 'stairs') { idx.floors.add(gx + ',' + gy + ',' + gz); idx.stairs.set(gx + ',' + gy + ',' + gz, p); }
      if (d.layer === 'roof') idx.roofs.add(gx + ',' + gy + ',' + gz);
      if (d.layer === 'wall') { const k = edgeKey(gx, gy, gz, rot); idx.walls.set(k, p); if (d.door) idx.doors.add(k); }
      if (d.layer === 'pillar') idx.pillars.add(cornerKey(gx, gy, gz, rot));
    }
    return idx;
  }
  function supported(p, idx, plot) {
    const d = pdef(p[0]); const [, gx, gy, gz, rot] = p;
    switch (d.layer) {
      case 'floor': {
        if (d.id === 'piece.foundation') return true;
        if (d.id === 'piece.dock_section') return true;
        if (d.id === 'piece.porch_deck' && gy === 0) return true;
        if (gy === 0) return idx.all.has('foundation:' + gx + ',0,' + gz);
        // upper floor: needs a wall or pillar under at least 2 corners
        let n = 0;
        for (let c = 0; c < 4; c++) {
          const cx = gx + (c === 1 || c === 2 ? 1 : 0), cz = gz + (c === 2 || c === 3 ? 1 : 0);
          const below = gy - 1;
          let sup = idx.pillars.has(cx + ',' + below + ',' + cz);
          if (!sup) for (const [dx, dz, r] of [[0, 0, 0], [0, 0, 3], [-1, 0, 0], [0, -1, 3], [-1, -1, 0], [-1, -1, 3], [0, -1, 0], [-1, 0, 3]]) { /* wall edges incident to the corner */ if (idx.walls.has(edgeKey(cx + dx, below, cz + dz, r))) { sup = true; break; } }
          if (sup) n++;
        }
        return n >= 2;
      }
      case 'wall': {
        const a = [gx, gy, gz], side = EDGE_DIRS[rot];
        const here = gx + ',' + gy + ',' + gz, other = (gx + side[0]) + ',' + gy + ',' + (gz + side[1]);
        return idx.floors.has(here) || idx.floors.has(other);
      }
      case 'pillar': return gy === 0 ? true : true;
      case 'stairs': {
        const side = EDGE_DIRS[rot];
        return idx.floors.has(gx + ',' + gy + ',' + gz) && idx.floors.has((gx + side[0]) + ',' + (gy + 1) + ',' + (gz + side[1]));
      }
      case 'roof': {
        const below = gy - 1;
        for (const r of [0, 1, 2, 3]) if (idx.walls.has(edgeKey(gx, below, gz, r))) return true;
        for (let c = 0; c < 4; c++) if (idx.pillars.has(cornerKey(gx, below, gz, c))) return true;
        return idx.roofs.has((gx - 1) + ',' + gy + ',' + gz) || idx.roofs.has((gx + 1) + ',' + gy + ',' + gz) ? roofChain(gx, gy, gz, idx) : false;
      }
      case 'foundation': return true;
      case 'rail': return true;
      case 'chimney': return true;
      case 'fence': case 'ground': return true;
      default: return true;
    }
    void plot; void a;
  }
  function roofChain(gx, gy, gz, idx) {
    // a roof cell is supported if connected (4-neighbour) to a roof cell that has walls/pillars below it
    const seen = new Set([gx + ',' + gz]), q = [[gx, gz]];
    while (q.length) {
      const [x, z] = q.pop();
      const below = gy - 1;
      for (const r of [0, 1, 2, 3]) if (idx.walls.has(edgeKey(x, below, z, r))) return true;
      for (let c = 0; c < 4; c++) if (idx.pillars.has(cornerKey(x, below, z, c))) return true;
      for (const [dx, dz] of EDGE_DIRS) { const k = (x + dx) + ',' + (z + dz); if (!seen.has(k) && idx.roofs.has((x + dx) + ',' + gy + ',' + (z + dz))) { seen.add(k); q.push([x + dx, z + dz]); } }
    }
    return false;
  }
  function validatePlacement(plotId, piece) {
    const dm = dims(plotId); if (!dm) return fail(ERR.NOT_FOUND, 'plot');
    if (!ctx.property.rec(plotId)) return fail(ERR.NOT_OWNER);
    const R = plotRec(plotId);
    const d = pdef(piece[0]); if (!d) return fail(ERR.INVALID_ARG, 'piece');
    const [, gx, gy, gz, rot, mi] = piece;
    if (![gx, gy, gz, rot, mi].every(Number.isInteger) || gy < 0 || gy > 2 || rot < 0 || rot > 3) return fail(ERR.INVALID_ARG);
    const mat = MATERIALS[mi]; if (!mat || d.mats[mat] === undefined) return fail(ERR.INVALID_ARG, 'material not available for this piece');
    const pl = PLOT_BY_ID[plotId];
    if (d.water) { if (!pl || !pl.waterfront) return fail(ERR.REQUIREMENT, 'dock pieces need a waterfront plot'); if (gz < -3 || gz > 0 || gx < 1 || gx > dm.W - 2) return fail(ERR.INVALID_ARG, 'outside the water side'); }
    else {
      const cells = d.slot === 'edge' ? [[gx, gz], ...(EDGE_DIRS[rot] ? [[gx + EDGE_DIRS[rot][0], gz + EDGE_DIRS[rot][1]]] : [])] : [[gx, gz]];
      for (let i = 0; i < cells.length; i++) { const [cx, cz] = cells[i]; const edgeOk = i === 1; if (cx < (edgeOk ? 0 : 1) || cz < (edgeOk ? 0 : 1) || cx > dm.W - (edgeOk ? 1 : 2) || cz > dm.D - (edgeOk ? 1 : 2)) return fail(ERR.INVALID_ARG, 'outside the buildable area'); }
    }
    if (R.pieces.length >= BALANCE.maxPieces) return fail(ERR.LIMIT, 'piece limit');
    if (d.id === 'piece.foundation' && gy !== 0) return fail(ERR.INVALID_ARG, 'foundations sit on the ground');
    if (d.layer === 'ground' && gy !== 0) return fail(ERR.INVALID_ARG);
    if (d.id === 'piece.foundation' && ctx.services.slope && ctx.services.slope(plotId, gx, gz) > 0.15) return fail(ERR.REQUIREMENT, 'slope too steep');
    const key = slotOf(piece);
    if (R.pieces.some((p) => slotOf(p) === key)) return fail(ERR.BUSY, 'slot occupied');
    if (d.layer === 'ground' && R.pieces.some((p) => { const k = slotOf(p); return k === 'floor:' + gx + ',0,' + gz; })) return fail(ERR.BUSY, 'slot occupied');
    const idx = index(R.pieces.concat([piece]));
    if (!supported(piece, idx, pl)) return fail(ERR.REQUIREMENT, 'unsupported: ' + d.id);
    return ok();
  }
  function cost(piece) { const d = pdef(piece[0]); return Math.round(d.cost * d.mats[MATERIALS[piece[5]]]); }
  function dependants(plotId, removing) {
    const R = plotRec(plotId);
    let remaining = R.pieces.filter((p) => !removing.includes(p));
    const gone = [];
    for (let guard = 0; guard < 50; guard++) {
      const idx = index(remaining), pl = PLOT_BY_ID[plotId];
      const bad = remaining.filter((p) => !supported(p, idx, pl));
      if (!bad.length) break;
      gone.push(...bad); remaining = remaining.filter((p) => !bad.includes(p));
    }
    return gone;
  }
  const same = (a, b) => slotOf(a) === slotOf(b);
  function placeCmd({ plotId, type, gx, gy, gz, rot = 0, mat }) {
    const ti = idxOfPiece(type); if (ti < 0) return fail(ERR.INVALID_ARG, 'unknown piece');
    const d = pdef(ti);
    const mi = Number.isInteger(mat) ? mat : MATERIALS.indexOf(mat || Object.keys(d.mats)[0]);
    const piece = [ti, gx, gy, gz, rot, mi];
    const v = validatePlacement(plotId, piece); if (!v.ok) return v;
    const c = cost(piece), acct = payerAccount(ctx.ledger, 'auto', c);
    const r = ctx.ledger.transfer({ from: acct, to: 'ext:suppliers', amount: c, type: TX.BUILD_PIECE, memo: d.name, ref: plotId });
    if (!r.ok) return r;
    plotRec(plotId).pieces.push(piece);
    ctx.emit('build:changed', { plotId }); return ok({ cost: c });
  }
  const cmds = {
    'build.place': placeCmd,
    'build.remove': ({ plotId, type, gx, gy, gz, rot = 0, cascade = false }) => {
      if (!ctx.property.rec(plotId)) return fail(ERR.NOT_OWNER);
      const R = plotRec(plotId), ti = idxOfPiece(type);
      const probe = [ti, gx, gy, gz, rot, 0];
      if (ti < 0) return fail(ERR.INVALID_ARG);
      const p = R.pieces.find((x) => x[0] === ti && same(x, probe)); if (!p) return fail(ERR.NOT_FOUND);
      const dep = dependants(plotId, [p]);
      if (dep.length && !cascade) return fail(ERR.REQUIREMENT, { dependants: dep.map((x) => pdef(x[0]).id) });
      const all = [p, ...dep];
      let refund = 0; for (const x of all) refund += Math.floor(cost(x) * BALANCE.buildRefundPct);
      if (refund > 0) ctx.ledger.transfer({ from: 'ext:suppliers', to: 'bank:checking', amount: refund, type: TX.BUILD_REFUND, memo: 'Removal refund', ref: plotId });
      R.pieces = R.pieces.filter((x) => !all.includes(x));
      ctx.emit('build:changed', { plotId }); return ok({ refund, removed: all.length });
    },
    'build.paint': ({ plotId, type, gx, gy, gz, rot = 0, mat }) => {
      if (!ctx.property.rec(plotId)) return fail(ERR.NOT_OWNER);
      const R = plotRec(plotId), ti = idxOfPiece(type); if (ti < 0) return fail(ERR.INVALID_ARG);
      const p = R.pieces.find((x) => x[0] === ti && same(x, [ti, gx, gy, gz, rot, 0])); if (!p) return fail(ERR.NOT_FOUND);
      const mi = Number.isInteger(mat) ? mat : MATERIALS.indexOf(mat); const d = pdef(ti);
      if (!MATERIALS[mi] || d.mats[MATERIALS[mi]] === undefined) return fail(ERR.INVALID_ARG);
      if (mi === p[5]) return ok({ cost: 0 });
      const c = Math.max(1, Math.round(cost([ti, gx, gy, gz, rot, mi]) * 0.2)), acct = payerAccount(ctx.ledger, 'auto', c);
      const r = ctx.ledger.transfer({ from: acct, to: 'ext:suppliers', amount: c, type: TX.BUILD_PIECE, memo: 'Repaint', ref: plotId }); if (!r.ok) return r;
      p[5] = mi; ctx.emit('build:changed', { plotId }); return ok({ cost: c });
    },
    'furn.place': ({ propId, plotId, type, x2, level = 0, z2, rot = 0 }) => {
      const id = propId || plotId; if (!id) return fail(ERR.INVALID_ARG);
      if (!ctx.property.rec(id)) return fail(ERR.NOT_OWNER);
      const fi = idxOfFurn(type); if (fi < 0) return fail(ERR.INVALID_ARG);
      const R = plotRec(id);
      if (![x2, level, z2, rot].every(Number.isInteger) || level < 0 || level > 2 || rot < 0 || rot > 23) return fail(ERR.INVALID_ARG);
      const dm = dims(id); if (!dm || x2 < 0 || z2 < 0 || x2 >= dm.W * 4 || z2 >= dm.D * 4) return fail(ERR.INVALID_ARG, 'outside');
      if (PLOT_BY_ID[id] && !habitableIn(id)) return fail(ERR.REQUIREMENT, 'needs a built room');
      if (R.furniture.length >= BALANCE.maxFurniture) return fail(ERR.LIMIT);
      if (R.furniture.some((f) => f[1] === x2 && f[2] === level && f[3] === z2)) return fail(ERR.BUSY, 'occupied');
      const c = FURNITURE[fi].cost, acct = payerAccount(ctx.ledger, 'auto', c);
      const r = ctx.ledger.transfer({ from: acct, to: 'ext:suppliers', amount: c, type: TX.BUILD_PIECE, memo: FURNITURE[fi].name, ref: id }); if (!r.ok) return r;
      R.furniture.push([fi, x2, level, z2, rot]); ctx.emit('build:changed', { plotId: id }); ctx.emit('prop:changed', { propId: id }); return ok({ cost: c });
    },
    'furn.remove': ({ propId, plotId, x2, level = 0, z2 }) => {
      const id = propId || plotId; if (!ctx.property.rec(id)) return fail(ERR.NOT_OWNER);
      const R = plotRec(id), i = R.furniture.findIndex((f) => f[1] === x2 && f[2] === level && f[3] === z2); if (i < 0) return fail(ERR.NOT_FOUND);
      const refund = Math.floor(FURNITURE[R.furniture[i][0]].cost * BALANCE.buildRefundPct);
      if (refund > 0) ctx.ledger.transfer({ from: 'ext:suppliers', to: 'bank:checking', amount: refund, type: TX.BUILD_REFUND, memo: 'Furniture refund', ref: id });
      R.furniture.splice(i, 1); ctx.emit('build:changed', { plotId: id }); return ok({ refund });
    },
    'build.registerSite': ({ plotId, kind }) => {
      const pl = PLOT_BY_ID[plotId]; if (!pl) return fail(ERR.NOT_FOUND);
      if (!ctx.property.rec(plotId)) return fail(ERR.NOT_OWNER);
      if (!pl.mixed) return fail(ERR.REQUIREMENT, 'plot is residential only');
      if (!['biz.cafe', 'biz.retail', 'biz.restaurant'].includes(kind)) return fail(ERR.INVALID_ARG);
      const info = analyse(plotId);
      const minCells = kind === 'biz.restaurant' ? 30 : 15;
      if (!info.habitable || info.groundRoomCells < minCells) return fail(ERR.REQUIREMENT, 'needs a ground-floor room of at least ' + minCells * 4 + ' m2');
      const R = plotRec(plotId);
      if (!R.pieces.some((p) => { const d = pdef(p[0]); return d.glass || d.door; })) return fail(ERR.REQUIREMENT, 'needs a glazed wall or door facing the road');
      const id = 'site.custom.' + plotId;
      if (!SITE_BY_ID[id]) {
        const district = pl.region === 'city' ? 'city.eastside' : pl.region + '.pinehaven';
        const def = { id, kinds: ['biz.cafe', 'biz.retail', 'biz.restaurant'], district, region: pl.region, profile: 'shop', footfall: FOOTFALL_PROFILES.shop.map((v) => Math.round(v * 0.9 * 10) / 10), leasePerDay: 0, deposit: 0, buyPrice: 0, area: info.groundRoomCells * 4, seatsMax: Math.floor(info.groundRoomCells * 4 / 3), tags: [], near: null, pos: null, feePerDay: 0, officeLike: false, leisure: false, custom: true, plotId };
        SITE_BY_ID[id] = def; SITES.push(def);
      }
      R.site = { id, kind };
      ctx.state.sites[id] = ctx.state.sites[id] || null; if (ctx.state.sites[id] === null) delete ctx.state.sites[id];
      return ok({ siteId: id });
    },
  };
  /** rooms: flood fill of floor cells enclosed by walls and covered above */
  function analyse(id) {
    const R = plotRec(id), idx = index(R.pieces);
    const floorCells = [];
    for (const k of idx.floors) if (!k.startsWith('open:')) floorCells.push(k);
    const seen = new Set(), rooms = [];
    for (const start of floorCells) {
      if (seen.has(start)) continue;
      const [sx, sy, sz] = start.split(',').map(Number);
      const q = [[sx, sz]], cells = [start]; seen.add(start);
      let enclosed = true, doors = false;
      while (q.length) {
        const [x, z] = q.pop();
        for (let r = 0; r < 4; r++) {
          const [dx, dz] = EDGE_DIRS[r], k = edgeKey(x, sy, z, r);
          const nk = (x + dx) + ',' + sy + ',' + (z + dz);
          const hasWall = idx.walls.has(k);
          if (hasWall) { if (idx.doors.has(k) && !idx.floors.has(nk)) doors = true; if (idx.doors.has(k) && idx.floors.has(nk) && !sameRoomLater(nk)) { /* interior door */ } continue; }
          if (idx.floors.has(nk)) { if (!seen.has(nk)) { seen.add(nk); cells.push(nk); q.push([x + dx, z + dz]); } } else enclosed = false;
        }
      }
      function sameRoomLater() { return false; }
      const covered = cells.every((c) => { const [x, y, z] = c.split(',').map(Number); return idx.roofs.has(x + ',' + (y + 1) + ',' + z) || idx.floors.has(x + ',' + (y + 1) + ',' + z); });
      if (enclosed && covered) rooms.push({ level: sy, cells: cells.length, door: doors });
    }
    const habitable = rooms.some((r) => r.cells >= 3 && r.door);
    let groundRoomCells = 0; for (const r of rooms) if (r.level === 0) groundRoomCells = Math.max(groundRoomCells, r.cells);
    return { rooms, habitable, groundRoomCells };
  }
  const habitableIn = (id) => analyse(id).habitable;
  const habitable = (id) => habitableIn(id);
  function comfort(id) {
    const R = S()[id]; if (!R) return 0;
    const cat = {};
    for (const f of R.furniture) { const d = FURNITURE[f[0]]; if (COMFORT_CAPS[d.cat] !== undefined) cat[d.cat] = (cat[d.cat] || 0) + d.pts; }
    let s = 0; for (const [c, v] of Object.entries(cat)) s += Math.min(COMFORT_CAPS[c], v);
    return Math.min(1, s / COMFORT_TOTAL);
  }
  function improvementValue(id) {
    const R = S()[id]; if (!R) return 0;
    let pieces = 0; for (const p of R.pieces) pieces += cost(p);
    let furn = 0; for (const f of R.furniture) furn += FURNITURE[f[0]].cost;
    const building = PLOT_BY_ID[id] ? Math.floor(pieces * (analyse(id).habitable ? BALANCE.habitableMult : BALANCE.shellMult)) : 0;
    return building + Math.floor(furn * BALANCE.furnitureValuePct);
  }
  function storageBonus(id) { const R = S()[id]; if (!R) return 0; let kg = 0; for (const f of R.furniture) kg += FURNITURE[f[0]].storageKg || 0; return kg; }
  function hasFridge(id) { const R = S()[id]; return !!R && R.furniture.some((f) => FURNITURE[f[0]].coldKg); }
  function clear(id) { delete S()[id]; }
  function restoreSites() { for (const [id, R] of Object.entries(S())) if (R.site) cmds['build.registerSite']({ plotId: id, kind: R.site.kind }); }
  const selects = {
    'build.plot': ({ plotId }) => { const R = S()[plotId] || { pieces: [], furniture: [] }; const a = analyse(plotId); return { plotId, pieces: R.pieces.map((p) => p.slice()), furniture: R.furniture.map((f) => f.slice()), rooms: a.rooms, habitable: a.habitable, value: improvementValue(plotId), comfort: comfort(plotId), site: R.site || null }; },
    'build.catalog': () => ({ pieces: PIECES.map((p, i) => ({ index: i, id: p.id, name: p.name, slot: p.slot, cost: p.cost, mats: p.mats })), furniture: FURNITURE.map((f, i) => ({ index: i, ...f })), materials: MATERIALS.slice() }),
  };
  return { defaults, cmds, selects, restoreSites, comfort, improvementValue, storageBonus, hasFridge, habitable, clear, analyse, validatePlacement };
}
