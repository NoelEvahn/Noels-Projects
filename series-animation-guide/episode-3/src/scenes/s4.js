// S4 — THE ENTIRE STATE (32–44.8): the state map glows pink, then the lab where the hero is the test subject on the Lovometer. 65,536 -> 4,194,304.
import { THREE, makeCharacter, PRESETS, POSES, FACES, randomPerson, rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, orbit, cam, shot, pick, regroup, pops, place, V, D2R } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { reliefMap, car, schoolBus } from '../../../assets/library/props/world.js';
import { buildLab } from '../../../assets/library/sets/lab.js';
import { makeAnimal, APOSES, ANIMALS } from '../../../assets/library/animal.js';
import { makeHeartField, makeHeart } from '../../../assets/library/fx/hearts.js';
import { mat, glow, add, box, sph, cyl, cap, rbox, textBoard, heartGeo, canvasTex } from '../../../assets/library/util.js';
import * as HOLD from '../../../assets/library/props/holdables.js';

const SKY = { sky: ['#9fd8ff', '#fff3d6'], ground: null, fog: ['#e8f4ff', 60, 200], shadow: { extent: 16 }, keyPos: [6, 12, 8] };
// each cut lives in its own group far apart so a single scene object can hold all of them; only one is visible at a time
const OFF = { map: [0, 0, 0], band: [200, 0, 0], hwy: [400, 0, 0], bakery: [600, 0, 0], office: [800, 0, 0], bus: [1000, 0, 0], lab: [1200, 0, 0] };

export default {
  async build(ctx) {
    const stage = makeStage({ ...SKY, shadow: { extent: 18, size: 2048 } }), scene = stage.scene;
    const S = { stage, scene, g: {} };
    const grp = (k) => { const g = new THREE.Group(); g.position.set(...OFF[k]); scene.add(g); S.g[k] = g; return g; };
    // ---------- relief map ----------
    { const g = grp('map'); const rm = reliefMap({ size: 12, seed: 5 }); g.add(rm); S.rm = rm; const mesh = rm.children[0]; const col = mesh.geometry.attributes.color; S.mapBase = Float32Array.from(col.array); S.mapPos = mesh.geometry.attributes.position; S.land = Float32Array.from({ length: S.mapPos.count }, (_, i) => clamp((rm.mask(S.mapPos.getX(i), S.mapPos.getZ(i)) - 0.08) * 8));   // pink spreads over land only (never the sea)
      S.pins = []; const r = rng(11); const pp = S.mapPos; for (let i = 0; i < 16; i++) { let x, z, tries = 0; do { x = r.range(-5, 5); z = r.range(-5, 5); } while (rm.mask(x, z) < 0.12 && tries++ < 200); let best = 1e9, y = 0; for (let k = 0; k < pp.count; k += 3) { const d = (pp.getX(k) - x) ** 2 + (pp.getZ(k) - z) ** 2; if (d < best) { best = d; y = pp.getY(k); } } const pin = new THREE.Group(); const stem = add(pin, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), mat(0xffffff), [0, 0.25, 0]); const h = makeHeart(0xff3f7f, 0.5, 0.5); h.position.y = 0.7; pin.add(h); pin.position.set(x, y, z); pin.userData = { x, z, h }; g.add(pin); S.pins.push(pin); }
      S.home = [-3.0, 0, 2.6]; S.mapBg = add(g, new THREE.CylinderGeometry(14, 14, 0.3, 32), mat(0x2a5a8a), [0, -0.3, 0]); }
    // ---------- marching band ----------
    { const g = grp('band'); add(g, box(30, 0.2, 40), mat(0x4fae52), [0, -0.1, 0]); for (let i = -8; i <= 8; i++) add(g, box(30, 0.02, 0.12), mat(0xffffff), [0, 0.01, i * 2]);
      S.bandN = 160; const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 10), new THREE.MeshStandardMaterial({ roughness: 0.6 }), S.bandN); im.castShadow = true; g.add(im); S.bandIM = im; const c = new THREE.Color(); S.bandFrom = []; S.bandTo = []; const r = rng(7);
      for (let i = 0; i < S.bandN; i++) { c.set(i % 3 === 0 ? 0xffffff : i % 3 === 1 ? 0xe5173f : 0xffd23f); im.setColorAt(i, c); const gx = (i % 16 - 7.5) * 1.5, gz = (Math.floor(i / 16) - 4.5) * 1.5; S.bandFrom.push([gx, gz]); const tt = (i / S.bandN) * Math.PI * 2; const ring = i < 110; const hx = 16 * Math.pow(Math.sin(tt * (ring ? 1 : 1)), 3), hy = 13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt); const sc = ring ? 0.62 : 0.36; S.bandTo.push([hx * sc, -hy * sc + 0.5]); } }
    // ---------- highway ----------
    { const g = grp('hwy'); add(g, box(40, 0.1, 400), mat(0x44485a), [0, -0.05, -150]); for (let i = 0; i < 60; i++) add(g, box(0.25, 0.02, 2.2), mat(0xffffff), [0, 0.02, -i * 5 + 20]); add(g, box(14, 0.1, 400), mat(0x4fae52), [-20, -0.1, -150]); add(g, box(14, 0.1, 400), mat(0x4fae52), [20, -0.1, -150]);
      S.cars = []; const cols = [0xe53935, 0x2f6fd6, 0xffd23f, 0x2fa66a, 0xff8a2b, 0x8a52c9, 0xffffff, 0xff5c9a]; for (let i = 0; i < 28; i++) { const cr = car(cols[i % 8]); cr.rotation.y = Math.PI / 2; cr.position.set((i % 2 ? 2.8 : -2.8) + (i % 3 - 1) * 0.0, 0, -Math.floor(i / 2) * 4.2 + 3); g.add(cr); S.cars.push(cr); }
      S.hwyHearts = makeHeartField(28, { color: 0xff3f7f }); g.add(S.hwyHearts); }
    // ---------- bakery ----------
    { const g = grp('bakery'); add(g, box(40, 0.2, 30), mat(0xd4c9b4), [0, -0.1, 4]); add(g, box(9, 5.2, 0.6), mat(0xf6c4b4), [0, 2.6, -1.5]); add(g, box(9.4, 0.4, 1.0), mat(0xb4503a), [0, 5.3, -1.3]);
      for (let i = 0; i < 12; i++) add(g, box(0.78, 0.9, 1.2), mat(i % 2 ? 0xe5173f : 0xffffff), [-4.3 + i * 0.78, 4.1, -0.5], [0.45, 0, 0]);               // striped awning
      const sign = textBoard(5.5, 1.1, [{ text: 'BAKERY ♥', size: 0.14, color: '#fff2d6', y: 0.52, font: 'Anton, Inter', weight: 400 }], { bg: '#7a3a1a', border: '#ffd23f' }); sign.position.set(0, 4.7, -1.1); g.add(sign);
      add(g, box(5.2, 2.3, 0.2), mat(0x2a1a14), [-0.8, 2.0, -1.12]);                                                                                   // window interior (dark)
      for (const [x, y, w, h] of [[-0.8, 3.2, 5.6, 0.14], [-0.8, 0.8, 5.6, 0.14], [-3.5, 2.0, 0.14, 2.5], [1.9, 2.0, 0.14, 2.5]]) add(g, box(w, h, 0.25), mat(0xfff2d6), [x, y, -1.0]);
      add(g, box(5.4, 0.12, 1.2), mat(0xb98a54), [-0.8, 0.9, -0.55]);                                                                                  // sill/counter
      for (let i = 0; i < 9; i++) add(g, cap(0.17, 0.5, 4, 10), mat(i % 3 === 0 ? 0xd9954a : 0xe8b06a), [-3.0 + i * 0.55, 1.2, -0.95], [0, 0, Math.PI / 2]);  // loaves
      const reg = new THREE.Group(); add(reg, rbox(0.8, 0.5, 0.6, 0.06), mat(0x9a9aa6, { metal: 0.5 }), [0, 0.25, 0]); add(reg, rbox(0.7, 0.3, 0.1, 0.03), mat(0x2a2a35), [0, 0.55, -0.15], [-0.4, 0, 0]); reg.position.set(1.3, 0.96, -0.55); g.add(reg); S.reg = reg;
      add(g, box(1.6, 2.6, 0.2), mat(0x3a8a6a), [3.6, 1.4, -1.15]);                                                                                    // door
      S.queue = Array.from({ length: 9 }, (_, i) => { const c = randomPerson(rng(40 + i)); g.add(c.root); c.root.position.set(4.9 + i * 1.15, 0, 0.5 + (i % 2) * 0.2); c.root.rotation.y = -1.0; return c; });
      S.bakeCat = makeAnimal('cat', ANIMALS.gerald); g.add(S.bakeCat.root); S.bakeCat.root.position.set(1.3, 0.96 + 0.58, -0.55); S.bakeCat.root.rotation.y = 0.15; }
    // ---------- office window (washer pins sticky notes) ----------
    { const g = grp('office'); add(g, box(24, 16, 0.6), mat(0x6a7a9a), [0, 8, -1]); const win = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#9fd0f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#7ab0d8'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) c.fillRect(i * 64 + 4, j * 64 + 4, 56, 56); }, { repeat: [3, 3] }); g.add(new THREE.Mesh(new THREE.PlaneGeometry(22, 14), new THREE.MeshStandardMaterial({ map: win, roughness: 0.2, metalness: 0.3, emissive: 0x335577, emissiveIntensity: 0.4 }))); g.children[g.children.length - 1].position.set(0, 8, -0.68);
      S.notes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.85, 0.85, 0.04), new THREE.MeshBasicMaterial({}), 90); const r = rng(3), c = new THREE.Color(), d = new THREE.Object3D(); S.noteP = []; for (let i = 0; i < 90; i++) { c.set([0xff8fb8, 0xffd23f, 0xffffff, 0x9be0c0][i % 4]); S.notes.setColorAt(i, c); S.noteP.push({ x: r.range(-9, 9), y: r.range(1, 14), a: r.range(-0.2, 0.2), t: 33.6 + (i / 90) * 4.0 }); } g.add(S.notes); S.noteD = d;
      S.washer = makeCharacter(PRESETS.windowWasher); g.add(S.washer.root); S.washer.root.position.set(0, 7.5, -0.4); S.rope = add(g, cyl(0.02, 0.02, 12, 4), mat(0x333333), [0.4, 13.2, -0.3]);
      S.off1 = makeHeartField(1, { color: 0xff3f7f }); }
    // ---------- school bus ----------
    { const g = grp('bus'); add(g, box(40, 0.2, 20), mat(0x44485a), [0, -0.1, 0]); const bus = schoolBus(); bus.position.set(0, 0, -2.5); g.add(bus); S.busM = bus; S.kids = Array.from({ length: 8 }, (_, i) => { const c = makeCharacter({ ...PRESETS.kid, seed: i }); g.add(c.root); c.root.position.set(-5 + i * 1.5, 0, 1.4 + (i % 2) * 0.5); c.root.rotation.y = 0.0; return c; }); }
    // ---------- lab ----------
    { const g = grp('lab'); const lab = buildLab(); g.add(lab.group); S.lab = lab; const mk = (p) => { const c = makeCharacter(PRESETS[p]); g.add(c.root); return c; }; S.assist = mk('scientistA'); S.chief = mk('chiefScientist'); S.sciB = mk('scientistB'); S.clip = HOLD.clipboard(); S.sciB.hold(S.clip, 'R', { rot: [Math.PI / 2, 0, 0.0], pos: [0, 0.05, 0.12] }); S.heroLab = mk('hero');   // the hero is the test subject: the Lovometer is measuring how loved HE is
      { const pf = new THREE.Group(); add(pf, new THREE.CylinderGeometry(0.75, 0.82, 0.18, 32), mat(0xdfe6ee, { rough: 0.4, metal: 0.3 }), [0, 0.09, 0]); add(pf, new THREE.TorusGeometry(0.76, 0.03, 8, 40), glow(0xff5c9a, 1.4), [0, 0.18, 0], [Math.PI / 2, 0, 0]);
        for (const sx of [-1, 1]) { add(pf, new THREE.CylinderGeometry(0.03, 0.03, 1.9, 8), mat(0x9aa4b0, { metal: 0.6, rough: 0.3 }), [sx * 0.85, 0.95, -0.2]); add(pf, new THREE.SphereGeometry(0.08, 12, 8), glow(0xff5c9a, 1.2), [sx * 0.85, 1.92, -0.2]); }
        const sign = textBoard(1.3, 0.36, [{ text: 'TEST SUBJECT: THAT GUY', size: 0.095, color: '#ffffff', y: 0.52, weight: 900 }], { bg: '#ff4f8b', border: null, radius: 10 }); sign.position.set(-1.45, 1.05, -0.1); sign.rotation.y = 0.25; pf.add(sign);
        pf.position.set(0, 0, -0.6); g.add(pf); }
      S.labCat = makeAnimal('cat', ANIMALS.gerald); g.add(S.labCat.root); S.labCat.root.position.set(-1.25, 0.96, -2.05); /* on the bench right behind the test platform: his love does not register */ S.labCat.root.scale.setScalar(1.0); S.labCat.root.rotation.y = -0.25; S.lab.anchors.rat.root.position.set(5.6, 0.99 + 0.4, -4.6); }
    // ---------- shots ----------
    const O = (k, v) => v.map((n, i) => n + OFF[k][i]);
    const oc = (k, p, t, fov) => cam(O(k, p), O(k, t), fov);
    S.shots = [
      { ...shot(32.0, 33.6, oc('map', [0, 15, 13], [0, 0, 0], 46), oc('map', [0, 11, 9], [0, 0, 0.5], 46)), g: 'map' },                      // aerial relief map (banner THE ENTIRE STATE)
      { ...shot(33.6, 34.4, oc('band', [0, 40, 8], [0, 0, 0.5], 50), oc('band', [0, 36, 7], [0, 0, 0.5], 50)), g: 'band' },                          // marching band forms a heart
      { ...shot(34.4, 35.2, oc('hwy', [0, 2.6, 14], [0, 1.6, -30], 56), oc('hwy', [0, 2.4, 9], [0, 1.6, -30], 56)), g: 'hwy' },                // rush-hour traffic honks hearts
      { ...shot(35.2, 36.4, oc('bakery', [3.6, 2.2, 3.6], [1.2, 1.5, -0.6], 40), oc('bakery', [3.0, 2.0, 3.0], [1.2, 1.5, -0.6], 40)), g: 'bakery' }, // bakery: Gerald on the cash register (roast)
      { ...shot(36.4, 37.2, oc('office', [0, 8.5, 11], [0, 8.6, 0], 40), oc('office', [0, 8.3, 7], [0, 8.4, 0], 40)), g: 'office' },            // office window sticky notes
      { ...shot(37.2, 38.0, oc('bus', [-6, 1.6, 5.5], [0, 1.3, -0.5], 50), oc('bus', [-2, 1.6, 5.0], [0, 1.3, -0.5], 50)), g: 'bus' },         // school bus + kids
      { ...shot(38.0, 38.4, oc('map', [0, 10, 9], [0, 0, 0], 46)), g: 'map' },                                                                // map again, solid pink
      { ...shot(38.4, 39.2, oc('lab', [0, 3.2, 10], [0, 2.8, -4], 52), oc('lab', [0, 3.0, 8], [0, 2.8, -4], 52)), g: 'lab' },                   // lab wide: needle rising
      { ...shot(39.2, 39.6, oc('lab', [-0.6, 4.2, 4.0], [0, 3.6, -5.7], 34)), g: 'lab' },                                                     // Lovometer close
      { ...shot(39.6, 40.0, oc('lab', [-2.0, 2.2, 4.4], [-1.6, 2.1, 1.2], 34)), g: 'lab' },                                                   // assistant face building up
      { ...shot(40.0, 40.8, oc('lab', [-1.9, 2.2, 4.4], [-1.6, 2.1, 1.2], 32)), g: 'lab' },                                                   // snap! assistant BOMBOCLAT
      { ...shot(40.8, 41.2, oc('lab', [0, 4.4, 3.0], [0, 4.3, -5.7], 36)), g: 'lab' },                                                        // needle flies off
      { ...shot(41.2, 42.0, oc('lab', [5.6, 2.2, 0.0], [5.4, 1.5, -4.4], 40), oc('lab', [5.0, 2.0, -0.4], [5.4, 1.5, -4.4], 40)), g: 'lab' },   // rat + cage (narration)
      { ...shot(42.0, 42.8, oc('lab', [-5.2, 3.0, 2.5], [-5.5, 3.9, -5.6], 44)), g: 'lab' },                                                 // monitor curve goes vertical
      { ...shot(42.8, 43.6, oc('lab', [-1.2, 2.3, 5.6], [-1.2, 2.0, 1.0], 40)), g: 'lab' },                                                  // chief + sciB deadpan
      { ...shot(43.6, 44.4, oc('lab', [3.4, 2.8, 9], [0, 2.6, -5], 50)), g: 'lab' },                                                          // wide: pink tank overflows
      { ...shot(44.4, 44.8, oc('lab', [0.6, 2.2, 4.6], [1.0, 2.1, 1.0], 32)), g: 'lab' },                                                       // chief "Bombo."
    ];
    // slower edit: ~2 s shots, each holding the camera of the gag / voiced line it covers
    S.shots = regroup(S.shots, [[32.0, 34.4, 32.0], [34.4, 36.8, 38.4], [36.8, 39.2, 38.4], [39.2, 41.2, 40.0], [41.2, 43.2, 43.6], [43.2, 44.8, 44.4]]);
    S.shots[2] = { ...S.shots[2], a: oc('lab', [0.3, 1.8, 3.6], [-0.2, 1.55, -0.6], 44), b: oc('lab', [0.2, 1.75, 3.1], [-0.2, 1.55, -0.6], 42), g: 'lab' };   // hero on the test platform, Lovometer behind him (narration)
    return S;
  },
  frame(t, S, ctx) {
    const P = pick(S.shots, t), c = P.cam, mo = ctx.mouth; const key = P.shot.g;
    for (const k of Object.keys(S.g)) S.g[k].visible = k === key;
    let r = { cam: c, keyFocus: c.target, keyDist: key === 'map' ? 14 : 12 };
    if (key === 'map') {
      // pink spreads from home across the state
      const R = 1.6 + (t - 32) * 2.2, col = S.rm.children[0].geometry.attributes.color, p = S.mapPos;
      for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i) - S.home[0], p.getZ(i) - S.home[2]); const k = clamp((R - d) / 0.8) * 0.85 * S.land[i]; const j = i * 3; col.array[j] = lerp(S.mapBase[j], 1.0, k); col.array[j + 1] = lerp(S.mapBase[j + 1], 0.32, k); col.array[j + 2] = lerp(S.mapBase[j + 2], 0.58, k); }
      col.needsUpdate = true;
      S.pins.forEach((pin) => { const d = Math.hypot(pin.userData.x - S.home[0], pin.userData.z - S.home[2]); const k = easeOutBack(clamp((R - d) / 0.6)); pin.scale.setScalar(Math.max(0.0001, k)); pin.userData.h.rotation.y = t * 2; });
      r.banner = t < 33.6 ? { text: 'THE ENTIRE STATE', y: 1180, t0: 32.0, rot: -0.03 } : t >= 38.0 && t < 38.4 ? { text: 'ALL OF IT', y: 1180, t0: 38.0 } : null;
    }
    if (key === 'band') {
      const k = smooth(clamp((t - 33.65) / 0.3)); const d = new THREE.Object3D();
      for (let i = 0; i < S.bandN; i++) { const f = S.bandFrom[i], to = S.bandTo[i]; d.position.set(lerp(f[0], to[0], k), 0.25 + Math.abs(Math.sin(t * 6 + i)) * 0.08, lerp(f[1], to[1], k)); d.scale.setScalar(1); d.updateMatrix(); S.bandIM.setMatrixAt(i, d.matrix); } S.bandIM.instanceMatrix.needsUpdate = true;
    }
    if (key === 'hwy') {
      S.cars.forEach((cr, i) => { cr.position.z = -Math.floor(i / 2) * 4.2 + 3 - ((t - 34.4) * 0.5); cr.scale.setScalar(1 + Math.max(0, Math.sin(t * 14 + i * 1.7)) * 0.06); });
      S.hwyHearts.update((i) => { const cr = S.cars[i]; const a = t - 34.5 - (i % 7) * 0.08; if (a < 0) return null; return { x: cr.position.x, y: 2.1 + Math.sin(t * 5 + i) * 0.08, z: cr.position.z, s: 0.5 * easeOutBack(clamp(a / 0.3)), ry: 0 }; });
    }
    if (key === 'bakery') { S.bakeCat.pose(APOSES.loaf(t)); S.bakeCat.face({ lid: 0.5 }); S.queue.forEach((q, i) => { q.pose(POSES.idle(t + i)); q.face(FACES.love); }); }
    if (key === 'office') {
      const d = S.noteD; S.noteP.forEach((n, i) => { const k = easeOutBack(clamp((t - n.t) / 0.25)); d.position.set(n.x, n.y, -0.64); d.rotation.set(0, 0, n.a); d.scale.setScalar(Math.max(0.0001, k)); d.updateMatrix(); S.notes.setMatrixAt(i, d.matrix); }); S.notes.instanceMatrix.needsUpdate = true;
      S.washer.pose({ ...POSES.idle(t), aRs: 1.2 + Math.sin(t * 8) * 0.3, aRf: 0.9, aRe: 0.6, hR: 'open' }); S.washer.face(FACES.happy); S.washer.root.position.y = 7.5 + Math.sin(t) * 0.1;
    }
    if (key === 'bus') { S.kids.forEach((k, i) => { k.pose(POSES.cheer(t + i * 0.4)); k.face(FACES.excited); }); S.busM.position.x = ((t - 37.2) * 1.2); }
    if (key === 'lab') {
      const level = t < 38.4 ? 0.1 : t < 40.0 ? lerp(0.1, 1.0, clamp((t - 38.4) / 1.6)) : 1.2;
      S.lab.update(t, { level, snapK: Math.max(0, t - 40.0) });
      place(S.heroLab, 0, 0.18, -0.6, 0);
      S.heroLab.pose(t < 40.0 ? { ...POSES.idle(t), aRs: 0.5 + Math.max(0, Math.sin(t * 2.2)) * 1.2, aRe: 0.8, hR: 'open', hz: 0.06 } : { ...POSES.shock(t), lean: -0.1 });
      S.heroLab.face(t < 40.0 ? { ...FACES.happy, smile: 0.5 } : { ...FACES.shock, open: 0.5 });
      place(S.assist, -1.6, 0, 1.2, 0.2); place(S.chief, 1.2, 0, 1.0, -0.2); place(S.sciB, -4.4, 0, 0.6, 0.5);
      const warn = clamp((t - 38.4) / 1.6);
      S.assist.pose(t < 40.0 ? { ...POSES.idle(t), aRf: 0.5, aRe: 1.0, lean: warn * -0.2, hx: -warn * 0.15 } : { ...POSES.shock(t), lean: -0.2, aLs: 1.4 + Math.sin(t * 12) * 0.2 }); S.assist.face(t < 39.6 ? { ...FACES.question, open: 0.2 } : t < 40.0 ? { ...FACES.shock, open: 0.3 } : { ...FACES.scream, open: mo('labassistant', t) });
      S.chief.pose(t < 44.4 ? { ...POSES.deadpan(t), aRf: 0.6, aRe: 1.6, hR: 'point' } : POSES.deadpan(t)); S.chief.face(t >= 44.4 ? { ...FACES.deadpan, open: mo('chief_mono', t) * 0.7 } : t < 40 ? FACES.question : FACES.deadpan);
      S.sciB.pose({ ...POSES.holdR(t), aRf: 1.0, hy: Math.sin(t) * 0.2 }); S.sciB.face(t < 41.2 ? FACES.question : FACES.shock);
      S.labCat.pose(APOSES.sit(t)); S.labCat.face({ lid: 0.5 });
      if (t >= 40.0 && t < 40.35) r.flash = 0.55 * (1 - (t - 40.0) / 0.35);
    }
    return r;
  },
};
