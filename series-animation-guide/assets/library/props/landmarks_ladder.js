// Landmarks pack: scaleReference(name) and sizeLadder(items, {spacing}) -- true-scale comparison lines with height boards.
import { THREE, animator, heightBoard, lmat, box } from './landmarks_kit.js';
import * as TW from './landmarks_towers.js';
import * as LT from './landmarks_lattice.js';
import * as MA from './landmarks_monuments.js';
import * as MB from './landmarks_monuments_b.js';
import * as MC from './landmarks_monuments_c.js';

export const LANDMARKS = {
  empire: TW.empireState, burj: TW.burjKhalifa, wtc: TW.oneWTC, shanghai: TW.shanghaiTower, taipei101: TW.taipei101, petronas: TW.petronasTowers,
  eiffel: LT.eiffelTower, tokyotower: LT.tokyoTower, skytree: LT.tokyoSkytree, cntower: LT.cnTower, spaceneedle: LT.spaceNeedle,
  liberty: MA.statueOfLiberty, bigben: MA.bigBen, pisa: MA.leaningTowerPisa, colosseum: MA.colosseum, giza: MA.pyramidsGiza, tajmahal: MA.tajMahal, christ: MA.christRedeemer,
  sydney: MB.sydneyOperaHouse, goldengate: MB.goldenGate, towerbridge: MB.towerBridge, arc: MB.arcDeTriomphe, stbasils: MB.stBasils, kremlin: MB.kremlinTower, washington: MB.washingtonMonument, gatewayarch: MB.gatewayArch,
  greatwall: MC.greatWall, rushmore: MC.mountRushmore, stonehenge: MC.stonehenge, hoover: MC.hooverDam, angkor: MC.angkorWat, machupicchu: MC.machuPicchu, hollywood: MC.hollywoodSign,
};
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const ALIAS = { eiffeltower: 'eiffel', empirestatebuilding: 'empire', burjkhalifa: 'burj', oneworldtradecenter: 'wtc', statueofliberty: 'liberty', bigbenelizabethtower: 'bigben', elizabethtower: 'bigben', leaningtowerofpisa: 'pisa', pyramids: 'giza', pyramidsofgiza: 'giza', greatpyramid: 'giza', cn: 'cntower', skytree: 'skytree', tokyoskytree: 'skytree', petronastowers: 'petronas', christtheredeemer: 'christ', operahouse: 'sydney', harbourbridge: 'sydney', gateway: 'gatewayarch', mountrushmore: 'rushmore', hooverdam: 'hoover', angkorwat: 'angkor', hollywoodsign: 'hollywood', stbasil: 'stbasils', spasskaya: 'kremlin', washingtonmonument: 'washington' };
export function scaleReference(name, opts = {}) {
  const k = ALIAS[norm(name)] ?? norm(name); const fn = LANDMARKS[k];
  if (!fn) throw new Error('scaleReference: unknown landmark ' + name + ' (try ' + Object.keys(LANDMARKS).join(', ') + ')');
  const o = fn({ base: false, ...opts }); o.userData.key = k; return o;
}
// items: names (or built landmarks). Lined up along X at true scale, ground y=0, each with a height board in front.
export function sizeLadder(items, { spacing = 30, labels = true, ruler = true } = {}) {
  const g = new THREE.Group(), kids = []; let x = 0;
  const objs = items.map((it) => (typeof it === 'string' ? scaleReference(it) : it));
  const maxH = Math.max(...objs.map((o) => o.userData.realHeightM ?? 10));
  objs.forEach((o, i) => {
    const w = o.userData.realWidthM ?? o.userData.realHeightM * 0.3, h = o.userData.realHeightM ?? 10;
    x += w / 2; o.position.x = x; g.add(o); kids.push(o);
    if (labels) { const bw = Math.max(8, Math.min(w * 1.1, maxH * 0.35)), b = heightBoard(o.userData.name ?? 'item', `${Math.round(h)} m`, { w: bw, h: bw * 0.46 }); b.position.set(x, bw * 0.23 + 0.05, w * 0.55 + 4); g.add(b); }
    x += w / 2 + spacing;
  });
  if (ruler) for (let y = 100; y <= maxH; y += 100) { const l = new THREE.Mesh(new THREE.BoxGeometry(x + 40, Math.max(0.3, maxH * 0.0015), 0.3), lmat(0xffffff, { opacity: 0.5, rough: 1 })); l.position.set(x / 2, y, -2); g.add(l); }
  const A = animator(); kids.forEach((k) => k.userData.update && A.add((t) => k.userData.update(t)));
  g.userData.update = (t) => A.update(t); g.userData.realWidthM = x; g.userData.realHeightM = maxH;
  return g;
}
