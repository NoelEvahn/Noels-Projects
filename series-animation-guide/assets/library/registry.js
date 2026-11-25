// Catalogue of every library item. Each item: {id, cat, title, note, stage?, cam?, build(ctx) -> Object3D | {obj, cam, update}}
import * as THREE from 'three';
import { makeCharacter, PRESETS, POSES, FACES, ghostify, HANDS } from './character.js';
import { buildGarden } from './sets/garden.js';
import { buildStreet, postbox, mailSack } from './sets/street.js';
import { buildTheatre } from './sets/theatre.js';
import { buildLab } from './sets/lab.js';
import { buildSkyScene, skydiverHeart, SKY_STAGE } from './sets/sky.js';
import { buildSpace, buildCosmos, SPACE_STAGE } from './sets/space.js';
import { buildPlaza, plazaStage, PLAZA_CITIES } from './sets/plaza.js';
import { buildHilltop, HILL_STAGE } from './sets/hilltop.js';
import * as HOME from './props/home.js';
import * as HOLD from './props/holdables.js';
import * as STG from './props/stage.js';
import * as LAB from './props/lab.js';
import * as SKY from './props/sky.js';
import * as WORLD from './props/world.js';
import * as HEARTS from './fx/hearts.js';
import * as NAT from './props/nature.js';
import { rng } from './util.js';
import { makeAnimal, APOSES, AFACES, ANIMALS } from './animal.js';
import { makeBaby, BABY_POSES } from './baby.js';
import { buildSandPark, SANDPARK_STAGE } from './sets/sandpark.js';
import * as BEACH from './props/beach.js';

export const ITEMS = [];
const reg = (i) => ITEMS.push(i);

// --- characters: each preset shown in three poses ---
function lineup(presetName, extra = {}) {
  const views = extra.views ?? [
    { pose: POSES.idle(0.3), face: FACES.neutral },
    { pose: POSES.shock(), face: FACES.shock },
    { pose: POSES.deadpan(), face: FACES.deadpan },
  ];
  const g = new THREE.Group();
  const sp = extra.spacing ?? 1.35 * Math.max(0.85, PRESETS[presetName].height ?? 1);
  views.forEach((v, i) => {
    const ch = makeCharacter(PRESETS[presetName]);
    ch.pose(v.pose); ch.face(v.face);
    ch.root.position.x = (i - (views.length - 1) / 2) * sp * 1.15 + (v.dx ?? 0);
    ch.root.rotation.y = v.rotY ?? (i - 1) * -0.18;
    if (extra.ghost) ghostify(ch);
    g.add(ch.root);
  });
  return g;
}
for (const name of Object.keys(PRESETS)) {
  const p = PRESETS[name]; const h = (p.height ?? 1);
  const ghost = name.startsWith('ghost');
  reg({
    id: 'char_' + name, cat: 'characters', title: name, note: ghost ? 'ghost (ghostify)' : '',
    stage: { sky: ghost ? ['#1a2150', '#3a4a8a'] : ['#cfe9ff', '#fff3d6'], ground: ghost ? 0x2a3270 : 0xd9c9a8, fog: null },
    build: () => ({ obj: lineup(name, { ghost }), cam: { pos: [0, 0.95 * h + 0.2, 3.4 * Math.max(0.85, h) + 1.3], target: [0, 0.8 * h, 0], fov: 38 } }),
  });
}

// --- animals: Gerald (the recurring cat) + dog, rabbit, rat ---
function animalLine(kind, key, views) {
  const g = new THREE.Group();
  views.forEach((v, i) => { const a = makeAnimal(kind, ANIMALS[key]); a.pose(v.pose); a.face(v.face); a.root.position.x = (i - (views.length - 1) / 2) * 1.5; a.root.rotation.y = v.rotY ?? 0.5 - i * 0.5; g.add(a.root); });
  return g;
}
reg({ id: 'animal_gerald', cat: 'animals', title: 'Gerald (cat, recurring)', note: 'poses: stand / loaf / sit / shock',
  build: () => ({ obj: animalLine('cat', 'gerald', [{ pose: APOSES.stand(0.4), face: AFACES.deadpan }, { pose: APOSES.loaf(0.4), face: AFACES.bored }, { pose: APOSES.sit(0.4), face: AFACES.judging }, { pose: APOSES.shock(0.4), face: AFACES.shock }]), cam: { pos: [0, 1.0, 5.4], target: [0, 0.3, 0], fov: 38 } }) });
reg({ id: 'animal_pets', cat: 'animals', title: 'dog / rabbit / rat', note: '',
  build: () => { const g = new THREE.Group(); [['dog', 'dog'], ['rabbit', 'rabbit'], ['rat', 'rat']].forEach(([k, key], i) => { const a = makeAnimal(k, ANIMALS[key]); a.pose(APOSES.stand(0.4)); a.face({ open: 1 }); a.root.position.x = (i - 1) * 1.5; a.root.rotation.y = 0.5 - i * 0.5; g.add(a.root); }); return { obj: g, cam: { pos: [0, 1.0, 4.6], target: [0, 0.3, 0], fov: 38 } }; } });

// --- sets ---
reg({ id: 'set_garden', cat: 'sets', title: 'Garden BBQ (ep3 S1 / S7)', note: 'house back, fences, grill, table, pool, gazebo, bunting',
  stage: { sky: ['#8fd3ff', '#fff6dc'], ground: null, fog: ['#dff2ff', 25, 70], shadow: { extent: 12 } },
  build: () => { const s = buildGarden(); s.update(1.3); const ch = makeCharacter(PRESETS.hero); ch.root.position.set(0, 0, 1.5); ch.pose(POSES.idle(0.2)); ch.face({ smile: 0.6 }); s.group.add(ch.root); const cat = makeAnimal('cat', ANIMALS.gerald); cat.pose(APOSES.loaf(0)); cat.face(AFACES.deadpan); cat.root.position.copy(s.anchors.fenceTopL).add(new THREE.Vector3(0, 0.1, 0)); cat.root.rotation.y = 1.2; s.group.add(cat.root); return { obj: s.group, cam: { pos: [3, 3.2, 10.5], target: [0, 1.4, -1.5], fov: 48 } }; } });
reg({ id: 'set_garden_wrecked', cat: 'sets', title: 'Garden BBQ wrecked (ep3 final scene)', note: '',
  stage: { sky: ['#8fd3ff', '#fff6dc'], ground: null, fog: ['#dff2ff', 25, 70], shadow: { extent: 12 } },
  build: () => { const s = buildGarden({ wrecked: 1 }); s.update(1.3); return { obj: s.group, cam: { pos: [3, 3.2, 10.5], target: [0, 1.4, -1.5], fov: 48 } }; } });

// --- detail studies ---
reg({ id: 'detail_hero_closeup', cat: 'characters', title: 'Hero close-up (hair, face, hands, shoes)', note: 'front / 3-4 / back',
  stage: { sky: ['#cfe9ff', '#fff3d6'], ground: 0xd9c9a8 },
  build: () => { const g = new THREE.Group(); [[-0.2, -0.55, 'idle'], [0.0, 0.5, 'idle'], [0.2, 3.0, 'idle']].forEach(([_, ry, k], i) => { const c = makeCharacter(PRESETS.hero); c.pose({ ...POSES.idle(0.2), aRf: 0.2, aRe: 0.6, hR: 'open' }); c.face(FACES.happy); c.root.position.x = (i - 1) * 1.05; c.root.rotation.y = ry; g.add(c.root); }); return { obj: g, cam: { pos: [0, 1.35, 3.6], target: [0, 1.05, 0], fov: 34 } }; } });
for (const [suf, names] of [['a', ['relaxed', 'open', 'fist', 'point']], ['b', ['grip', 'pinch', 'peace', 'cup']]]) reg({ id: 'detail_hands_' + suf, cat: 'characters', title: 'Hand presets: ' + names.join(' / '), note: 'ch.hand(side, name) or pose hL/hR',
  stage: { sky: ['#cfe9ff', '#fff3d6'], ground: 0xd9c9a8 },
  build: () => { const g = new THREE.Group(); names.forEach((n, i) => { const c = makeCharacter(PRESETS.hero); c.pose({ aRf: 1.7, aRe: 1.5, aRs: 0.25, hR: n, hy: 0.2 }); c.face(FACES.happy); c.root.position.set((i - 1.5) * 0.95, 0, 0); c.root.rotation.y = 0.45; g.add(c.root); }); return { obj: g, cam: { pos: [0, 1.25, 3.3], target: [0, 1.2, 0], fov: 34 } }; } });

reg({ id: 'detail_gerald_angles', cat: 'animals', title: 'Gerald: front / 3-4 / side / back (clipping check)', note: 'stand pose',
  stage: { sky: ['#cfe9ff', '#fff3d6'], ground: 0xd9c9a8 },
  build: () => { const g = new THREE.Group(); [0, 0.7, 1.57, 3.14].forEach((ry, i) => { const a = makeAnimal('cat', ANIMALS.gerald); a.pose(APOSES.stand(0.4)); a.face(AFACES.deadpan); a.root.position.x = (i - 1.5) * 1.1; a.root.rotation.y = ry; g.add(a.root); }); return { obj: g, cam: { pos: [0, 0.9, 4.2], target: [0, 0.32, 0], fov: 34 } }; } });
reg({ id: 'detail_gerald_poses', cat: 'animals', title: 'Gerald: walk / sit / loaf / sleep / pounce / stretch', note: '',
  stage: { sky: ['#cfe9ff', '#fff3d6'], ground: 0xd9c9a8 },
  build: () => { const g = new THREE.Group(); [['walk', APOSES.walk(0.3), AFACES.deadpan], ['sit', APOSES.sit(0.3), AFACES.judging], ['loaf', APOSES.loaf(0.3), AFACES.bored], ['sleep', APOSES.sleep(0.3), AFACES.closed], ['pounce', APOSES.pounce(0.3), AFACES.shock], ['stretch', APOSES.stretch(0.3), AFACES.annoyed]].forEach(([n, p, f], i) => { const a = makeAnimal('cat', ANIMALS.gerald); a.pose(p); a.face(f); a.root.position.set((i % 3 - 1) * 1.4, 0, i > 2 ? 0 : 0); a.root.position.z = i > 2 ? 1.3 : -0.4; a.root.rotation.y = 0.6; g.add(a.root); }); return { obj: g, cam: { pos: [0, 1.7, 5.2], target: [0, 0.3, 0.4], fov: 34 } }; } });

// ======================= PROPS =======================
const rowOf = (objs, gap = 1.2, y = 0) => { const g = new THREE.Group(); objs.forEach((o, i) => { o.position.x = (i - (objs.length - 1) / 2) * gap; o.position.y += y; g.add(o); }); return g; };
const PSTAGE = { sky: ['#cfe9ff', '#fff3d6'], ground: 0xd9c9a8 };
reg({ id: 'prop_holdables', cat: 'props', title: 'Holdables (authored upright, grip at origin)', note: 'spatula, ice cream, envelope, mic, megaphone, flag, sign, beaker, test tube, clipboard, tray, bouquet, foam hand', stage: PSTAGE,
  build: () => { const its = [HOLD.spatula(), HOLD.iceCream(), HOLD.envelope(), HOLD.microphone(), HOLD.megaphone(), HOLD.flagOnStick(), HOLD.beaker(), HOLD.testTube(), HOLD.bouquet(), HOLD.foamHand(), HOLD.tray(), HOLD.clipboard()]; its.forEach((o) => { if (o.userData.grip?.upright === false) o.rotation.x = -0.3; o.position.y += 0.3; }); const g = rowOf(its, 0.55, 0.3); const sign = HOLD.signBoard(); sign.position.set(0, 0.0, 0); const b = new THREE.Group(); b.add(HOLD.heartBalloon(0xff3f7f, 0.7)); b.position.set(-1.8, 0, 0.0); return { obj: g, cam: { pos: [0, 1.2, 8.5], target: [0, 0.8, 0], fov: 34 } }; } });
reg({ id: 'prop_holding_demo', cat: 'props', title: 'Holding demo: spatula, ice cream, envelope, mic, balloons', note: 'ch.hold(item, side) â€” items sit in the palm; poses holdR/holdL/holdBoth/carry', stage: PSTAGE,
  build: () => { const g = new THREE.Group(); const mk = (preset, pose, item, side, x, ry = 0.5) => { const c = makeCharacter(PRESETS[preset]); c.pose({ ...POSES.idle(0), ...pose }); c.hold(item, side); c.face(FACES.happy); c.root.position.x = x; c.root.rotation.y = ry; g.add(c.root); return c; }; mk('hero', POSES.holdR(), HOLD.spatula(), 'R', -2.4); mk('iceCreamMan', POSES.holdL(), HOLD.iceCream(3), 'L', -0.8, -0.4); mk('postman', { ...POSES.holdR(), hR: 'pinch' }, HOLD.envelope(), 'R', 0.8); mk('host', POSES.holdR(), HOLD.microphone(), 'R', 2.4, -0.5); { const kd = makeCharacter(PRESETS.kid); kd.pose({ ...POSES.holdR(), aRf: 0.5, aRe: 0.3, aRs: 0.4 }); kd.face(FACES.happy); kd.root.position.x = 3.8; kd.root.rotation.y = 0.2; g.add(kd.root); kd.holdUpright(HOLD.balloonBunch(6, 0.9), 'R'); kd.pose({ ...POSES.holdR(), aRf: 0.5, aRe: 0.3, aRs: 0.4 }); } const car = makeCharacter(PRESETS.mum); car.pose(POSES.carry()); const bx = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xc89a5a })); car.carry(bx); car.face(FACES.happy); car.root.position.x = -4.2; car.root.rotation.y = 0.4; g.add(car.root); return { obj: g, cam: { pos: [-0.2, 1.7, 9.6], target: [-0.2, 1.2, 0], fov: 38 } }; } });
reg({ id: 'prop_home', cat: 'props', title: 'Home / garden props', note: 'tree, bush, flowers, grill, burger, picnic table, chair, pool, gazebo, trash can, lamp post, tablet, phone', stage: PSTAGE,
  build: () => { const r = rng(2); const g = new THREE.Group(); const put = (o, x, z, s = 1) => { o.position.set(x, 0, z); o.scale.setScalar(s); g.add(o); return o; }; put(HOME.tree(r, { h: 3 }), -4.5, 0, 0.9); put(HOME.bush(), -3.2, 0.5, 1.2); put(HOME.flowerPatch(rng(3), 14, 0.8), -2.3, 0.4); put(HOME.grill(), -1.2, 0); put(HOME.burger(), -0.2, 0.2, 2.5); put(HOME.picnicTable(), 1.4, 0, 0.7); put(HOME.lawnChair(), 2.9, 0.2); put(HOME.pool(0.7), 4.1, 0.1); put(HOME.gazebo(2, 2), 6.2, -0.5, 0.8); put(HOME.trashCan(), -5.6, 1); put(HOME.lamppost(2.6), -6.5, 0); const t = HOME.tablet(); t.position.set(-0.5, 0.2, 1.0); g.add(t); const p = HOME.phone(); p.position.set(0.1, 0.2, 1.0); g.add(p); const f = HOME.fence(3); f.position.set(5, 0, 1.3); g.add(f); return { obj: g, cam: { pos: [0.5, 2.8, 11.5], target: [0.5, 0.9, 0], fov: 44 } }; } });
reg({ id: 'prop_house_front', cat: 'props', title: 'Detailed terraced house front', note: 'tiled roof, chimney, windows w/ shutters + flower boxes, door, plinth', stage: PSTAGE,
  build: () => { const g = new THREE.Group(); [[0xf0d8b0, 0xb4503a, 0xc8302b, 2], [0xf4b8a8, 0x6a4a3a, 0x2f6fd6, 3], [0xbfe0c8, 0x8a3a3a, 0xffd23f, 2]].forEach(([w, r, d, f], i) => { const h = HOME.houseFront({ wall: w, roof: r, doorColor: d, floors: f, seed: i }); h.position.x = (i - 1) * 3.8; g.add(h); }); return { obj: g, cam: { pos: [0, 3.2, 11], target: [0, 2.6, 0], fov: 38 } }; } });
reg({ id: 'prop_stage', cat: 'props', title: 'Theatre props', note: 'curtain, marquee, seats, audience, judges table, spotlight, cannon, golden buzzer, scoreboard', stage: { sky: ['#2a0e16', '#4a1a28'], ground: 0x3a1420 },
  build: () => { const g = new THREE.Group(); const c = STG.curtain(2.4, 3.4); c.position.set(-4.2, 0, 0); g.add(c); const mq = STG.marquee(3, 8); mq.position.set(-1.4, 3.3, 0); g.add(mq); const seats = STG.seatRows(3, 5, { gap: 0.95, rowGap: -1.1, rise: 0.3 }); seats.position.set(1.8, 0, 0); g.add(seats); const a = STG.audience(seats.seatPos, { seed: 3, fill: 0.9 }); a.position.copy(seats.position); a.update(1.2, 0.8); g.add(a); const jt = STG.judgesTable(3); jt.position.set(-1.4, 0, 2.2); g.add(jt); const gb = HOLD.goldenBuzzerButton(); gb.position.set(-1.4, 0.95, 2.1); gb.scale.setScalar(1.4); g.add(gb); const cn = STG.confettiCannon(); cn.position.set(-6, 0, 2); g.add(cn); const sb = STG.scoreboard([{ text: 'ACT 12', size: 0.09, color: '#ffd23f', y: 0.2, font: 'Anton, Inter', weight: 400 }, { text: 'JUST WAVED', size: 0.09, color: '#fff', y: 0.45 }, { text: '10 / 10', size: 0.2, color: '#4cd07a', y: 0.72, font: 'Anton, Inter', weight: 400 }]); sb.position.set(4.6, 2.6, 2.2); g.add(sb); return { obj: g, cam: { pos: [0, 3.4, 9], target: [0, 1.5, 0], fov: 46 } }; } });
reg({ id: 'prop_lab', cat: 'props', title: 'Lab props', note: 'Lovometer (setLevel / snap), glassware, bubbles, rack, rat cage, monitor, heart-o-gram, tank, chart', stage: { sky: ['#dfeef4', '#f6fbff'], ground: 0xcfdbe2 },
  build: () => { const g = new THREE.Group(); const lm = LAB.lovometer(1.0); lm.position.set(-3, 1.6, 0); lm.setLevel(0.7); g.add(lm); const lm2 = LAB.lovometer(1.0); lm2.position.set(-0.8, 1.6, 0); lm2.setLevel(1.12, 0.05); lm2.snap(0.5); g.add(lm2); const fl = [0xff5c9a, 0x7bff9a, 0xffd23f].map((c, i) => { const f = LAB.flask(c); f.position.set(1.2 + i * 0.6, 0, 0.4); g.add(f); }); const rk = LAB.testTubeRack(); rk.position.set(1.8, 0, 1.4); g.add(rk); const cg = LAB.ratCage(); cg.position.set(3.6, 0, 0.5); g.add(cg); const hg = LAB.heartOGram(); hg.position.set(-3, 0, 1.6); hg.update(0.5); g.add(hg); const tk = LAB.pinkTank(1.4, 0.4); tk.position.set(-4.6, 0, 1.0); g.add(tk); const wm = LAB.wallMonitor(1.8, 1.0); wm.position.set(0.2, 3.2, -0.5); g.add(wm); const ch = LAB.wallChart(); ch.position.set(2.5, 3.2, -0.5); g.add(ch); return { obj: g, cam: { pos: [0, 2.2, 8.5], target: [0, 1.5, 0], fov: 44 } }; } });
reg({ id: 'prop_sky', cat: 'props', title: 'Sky props', note: 'cloud, hot-air balloon, airliner, cabin wall, parachute, rainbow, sun, heart balloons', stage: SKY_STAGE,
  build: () => { const g = new THREE.Group(); const r = rng(3); const c = SKY.cloud(r, 1.2); c.position.set(-4, 3.4, 0); g.add(c); const hb = SKY.hotAirBalloon(); hb.position.set(-1.0, 0.5, 0); hb.scale.setScalar(0.8); g.add(hb); const al = SKY.airliner(0.5); al.position.set(3.5, 3.8, 0); al.rotation.set(0.2, -0.7, 0); g.add(al); const cb = SKY.cabinWall(2, 3.2, 2.2); cb.position.set(-4.2, 0, 2); cb.scale.setScalar(0.6); g.add(cb); const pc = SKY.parachuteCanopy(); pc.position.set(3.5, 0.4, 1.5); g.add(pc); const rb = SKY.rainbow(3, 0.7); rb.position.set(1.0, 2.2, -2); g.add(rb); const bb = HOLD.balloonBunch(9, 1.2); bb.position.set(-2.4, 0, 2.2); g.add(bb); const sd = SKY.sunDisc(0.6); sd.position.set(5, 5, -3); g.add(sd); return { obj: g, cam: { pos: [0, 3.0, 11], target: [0, 2.2, 0], fov: 42 } }; } });
reg({ id: 'prop_world', cat: 'props', title: 'World props', note: 'landmarks, billboard, vehicles, skyline, hero face', stage: PSTAGE,
  build: () => { const g = new THREE.Group(); ['bigben', 'sydney', 'tokyo', 'burj', 'empire', 'christ', 'pyramid', 'liberty'].forEach((n, i) => { const l = WORLD.landmark(n); l.position.set(-14 + i * 4.0, 0, -3 - (i % 2) * 2); l.scale.setScalar(0.28); g.add(l); }); const bb = WORLD.billboard(3.2, 1.8, {}); bb.position.set(-5, 2.2, 1); g.add(bb); const c1 = WORLD.car(0xe53935); c1.position.set(-1, 0, 2.4); g.add(c1); const it = WORLD.iceCreamTruck(); it.position.set(3.2, 0, 2.6); g.add(it); const sb = WORLD.schoolBus(); sb.position.set(8.5, 0, 2.6); g.add(sb); const pb = postbox(); pb.position.set(-7, 0, 3.2); g.add(pb); const ms = mailSack(); ms.position.set(-6, 0, 3.4); g.add(ms); return { obj: g, cam: { pos: [-1, 3.6, 14], target: [-1, 1.6, 0], fov: 46 } }; } });
reg({ id: 'prop_fx_hearts', cat: 'fx', title: 'Heart FX', note: 'makeHeart, heart tags above heads, aura, glow sprite, confetti, sparkles, love-wave ring', stage: { sky: ['#2a1a3a', '#6a3a6a'], ground: 0x3a2a4a },
  build: () => { const g = new THREE.Group(); const h = HEARTS.makeHeart(0xff3f7f, 1.2); h.position.set(-4, 1.2, 0); g.add(h); const c = makeCharacter(PRESETS.hero); c.root.position.set(-1.8, 0, 0); c.face(FACES.love); g.add(c.root); const tg = HEARTS.makeHeartTag(); tg.position.set(-1.8, 2.15, 0); tg.set(0.6, null, 0.5); g.add(tg); const au = HEARTS.makeLoveAura(1.6); au.position.set(-1.8, 0.02, 0); g.add(au); const hf = HEARTS.makeHeartField(40); hf.update((i) => ({ x: 0.4 + (i % 8) * 0.28, y: 0.4 + Math.floor(i / 8) * 0.4, z: 0, s: 0.22, ry: i * 0.3 })); g.add(hf); const cf = HEARTS.makeConfetti(160, { origin: [3.4, 0.2, 0], spread: [1.4, 3.4, 1.4] }); cf.update(0.9); g.add(cf); const sp = HEARTS.makeSparkles(60, { area: [1.5, 1.8, 1.0] }); sp.position.set(3.4, 0.5, 0); sp.update(0.5); g.add(sp); const wv = HEARTS.makeLoveWave({ maxR: 5.5, height: 1.6, debris: 60 }); wv.position.set(0.5, 0, -2.5); wv.update(0.55, 1.2); g.add(wv); return { obj: g, cam: { pos: [0, 2.2, 8.5], target: [0, 1.2, 0], fov: 44 } }; } });

// ======================= SETS =======================
reg({ id: 'set_street', cat: 'sets', title: 'Terraced street (ep3 S2)', note: 'houses both sides, road, lamps, cars, postbox, bunting', stage: { sky: ['#8fd3ff', '#fff6dc'], ground: null, fog: ['#dff2ff', 40, 120], shadow: { extent: 18 } },
  build: () => { const s = buildStreet(); const it = WORLD.iceCreamTruck(); it.position.set(3, 0, 2.6); s.group.add(it); const ms = mailSack(); ms.position.set(1.2, 0, -1.2); s.group.add(ms); return { obj: s.group, cam: { pos: [-13, 2.6, 2.4], target: [6, 1.8, 1.0], fov: 62 } }; } });
reg({ id: 'set_theatre', cat: 'sets', title: 'Talent-show theatre (ep3 S3)', note: 'stage, curtains, marquee, tiered seats + instanced audience, judges at table', stage: { sky: ['#1a0a10', '#3a1420'], ground: null, hemiI: 0.9, keyPos: [0, 14, 10], shadow: { extent: 16 } },
  build: () => { const s = buildTheatre(); s.update(1.4, { cheer: 0.5 }); return { obj: s.group, cam: { pos: [0, 5.0, 9.6], target: [0, 2.2, -6], fov: 55 } }; } });
reg({ id: 'set_theatre_house', cat: 'sets', title: 'Theatre house from the stage', note: 'raked rows, aisles with step lights, seated audience facing the stage, balconies, booth', stage: { sky: ['#1a0a10', '#3a1420'], ground: null, hemiI: 0.9, keyPos: [0, 14, -6], shadow: { extent: 16 } },
  build: () => { const s = buildTheatre(); s.update(1.4, { cheer: 0.3 }); return { obj: s.group, cam: { pos: [0, 3.2, -7.5], target: [0, 2.0, 6], fov: 60 } }; } });
reg({ id: 'set_lab', cat: 'sets', title: 'Love-research lab (ep3 S4)', note: 'Lovometer on wall, benches, glassware, rat cage, monitor', stage: { sky: ['#dfeef4', '#f6fbff'], ground: null, hemiI: 1.2, keyPos: [0, 10, 8], shadow: { extent: 14 } },
  build: () => { const s = buildLab(); s.update(1.0, { level: 0.9 }); const a = makeCharacter(PRESETS.scientistA); a.pose(POSES.shock()); a.face(FACES.shock); a.root.position.set(-1.6, 0, 1.2); s.group.add(a.root); const b = makeCharacter(PRESETS.chiefScientist); b.pose(POSES.deadpan()); b.face(FACES.deadpan); b.root.position.set(1.6, 0, 1.2); s.group.add(b.root); return { obj: s.group, cam: { pos: [0, 2.8, 9], target: [0, 2.4, -3], fov: 50 } }; } });
reg({ id: 'set_sky', cat: 'sets', title: 'Cloud Nine sky (ep3 S5)', note: 'cloud floor, clouds, sun, rainbow, hot-air balloons, airliner', stage: SKY_STAGE,
  build: () => { const s = buildSkyScene(); s.update(0.5); const hero = makeCharacter(PRESETS.hero); hero.pose(POSES.cheer(0.3)); hero.face(FACES.excited); hero.root.position.set(0, 3, 6); s.group.add(hero.root); const bb = HOLD.balloonBunch(12, 1.4); hero.holdUpright(bb, 'R'); hero.pose(POSES.cheer(0.3)); return { obj: s.group, cam: { pos: [2, 4.6, 14], target: [0, 5, 0], fov: 50 } }; } });
reg({ id: 'set_space', cat: 'sets', title: 'Earth at night (ep3 S6): lights turning pink', note: 'setPink(0..1)', stage: SPACE_STAGE,
  build: () => { const s = buildSpace(); s.update(0, { pink: 0.5 }); return { obj: s.group, cam: { pos: [0, 1.5, 12], target: [0, 0, 0], fov: 40 } }; } });
reg({ id: 'set_cosmos', cat: 'sets', title: 'Cosmos pull-back: solar system + galaxy', note: '', stage: SPACE_STAGE,
  build: () => { const s = buildCosmos(); return { obj: s.group, cam: { pos: [3, 14, 30], target: [8, 0, 0], fov: 50 } }; } });
for (const city of PLAZA_CITIES) reg({ id: 'set_plaza_' + city, cat: 'sets', title: 'Billboard plaza: ' + city, note: 'billboard + landmark + skyline + crowd', stage: plazaStage(city),
  build: () => { const s = buildPlaza(city); s.update(1.0, 0.6); return { obj: s.group, cam: { pos: [0, 2.6, 8.5], target: [0, 5.4, -10], fov: 55 } }; } });
reg({ id: 'set_hilltop', cat: 'sets', title: 'Hilltop at golden hour (ep3 S7)', note: 'rounded trees, flowers, distant town; update(waveR) bends trees', stage: HILL_STAGE,
  build: () => { const s = buildHilltop(); s.update(12, 1); const h = makeCharacter(PRESETS.hero); h.pose(POSES.hugOpen(0, 1)); h.face(FACES.deadpan); h.root.position.set(0, 3.2, 3); h.root.rotation.y = 0.3; s.group.add(h.root); return { obj: s.group, cam: { pos: [3, 5, 14], target: [0, 3.6, 0], fov: 50 } }; } });
reg({ id: 'set_relief_map', cat: 'sets', title: 'Relief map of "the entire state" (ep3 S4)', note: 'tan/green heightfield, border by mask', stage: { sky: ['#bfe0ff', '#fff6dc'], ground: null },
  build: () => { const m = WORLD.reliefMap({ size: 12, seed: 5 }); return { obj: m, cam: { pos: [0, 12, 11], target: [0, 0, 0], fov: 40 } }; } });

reg({ id: 'detail_seated', cat: 'characters', title: 'Seated physics: sitOn(seat) puts hips on the seat and soles on the floor', note: 'grandma + hero in lawn chairs, mum on the picnic bench, kid on a stool',
  stage: { sky: ['#cfe9ff', '#fff3d6'], ground: 0xcfe0a8 },
  build: () => { const g = new THREE.Group(); const seat = (preset, S, x, ry, chairObj, face) => { const c = makeCharacter(PRESETS[preset]); const sc = PRESETS[preset].height ?? 1; c.pose({ ...POSES.sitOn(0, S / sc), aLf: 0.6, aRf: 0.6 }); c.face(face); c.root.position.set(x, 0, 0.02); c.root.rotation.y = ry; g.add(c.root); if (chairObj) { chairObj.position.set(x, 0, 0); chairObj.rotation.y = ry; g.add(chairObj); } return c; };
    seat('grandma', 0.34, -2.2, 0.35, HOME.lawnChair(0x2bb7b0), FACES.happy); seat('hero', 0.34, -0.7, -0.3, HOME.lawnChair(0xff8a2b), FACES.smug); const t = HOME.picnicTable(); t.position.set(1.8, 0, 0.0); t.scale.setScalar(0.8); g.add(t); const m = makeCharacter(PRESETS.mum); m.pose({ ...POSES.sitOn(0, 0.34), aLf: 0.7, aRf: 0.7 }); m.face(FACES.happy); m.root.position.set(1.4, 0, 0.62); m.root.rotation.y = Math.PI; g.add(m.root);
    return { obj: g, cam: { pos: [1.0, 1.3, 5.2], target: [0.2, 0.7, 0], fov: 38 } }; } });

reg({ id: 'prop_nature', cat: 'props', title: 'Nature kit', note: 'roundTree, pineTree, birchTree, bushClump(dots), rock, log, stump, grass/flowers/pebbles via groundCover (wind: updateNature(t))', stage: { sky: ['#8ccaf5', '#eaf6ff'], ground: 0x6aa84f, keyPos: [5, 9, 7], shadow: { extent: 9 } },
  build: () => { const g = new THREE.Group(); g.add(NAT.groundCover({ area: [-6, -4, 6, 4], density: 9, rocks: 0, seed: 3 }));
    [[NAT.roundTree({ seed: 1 }), -3.8, -2.2], [NAT.pineTree({ seed: 2 }), -1.4, -2.8], [NAT.birchTree({ seed: 3 }), 1.2, -2.6], [NAT.roundTree({ seed: 4, leaf: 0x7cb342, h: 2.2 }), 3.6, -2.0], [NAT.bushClump({ seed: 5, dots: 0xff5c8a }), -2.4, 0.4], [NAT.bushClump({ seed: 6 }), 2.6, 0.6], [NAT.rock({ seed: 7, size: 0.7 }), -0.6, 0.8], [NAT.rock({ seed: 8, size: 0.35 }), 0.4, 1.4], [NAT.log({}), 1.4, 1.2], [NAT.stump({}), -1.4, 1.8]].forEach(([o, x, z]) => { o.position.set(x, 0, z); g.add(o); });
    NAT.updateNature(1.3); return { obj: g, cam: { pos: [0, 2.6, 7.5], target: [0, 1.0, -0.6], fov: 50 } }; } });
reg({ id: 'prop_grass_close', cat: 'props', title: 'Grass close-up', note: 'groundCover density 14: tufts graded dark->light, flowers, pebbles', stage: { sky: ['#8ccaf5', '#eaf6ff'], ground: 0x5a9a40, keyPos: [5, 9, 7], shadow: { extent: 5 } },
  build: () => { const g = NAT.groundCover({ area: [-3, -3, 3, 2], density: 14, flowerK: 0.12, pebbleK: 0.06, seed: 9 }); NAT.updateNature(0.4); return { obj: g, cam: { pos: [0, 0.7, 2.4], target: [0, 0.15, 0], fov: 45 } }; } });
reg({ id: 'detail_love_eyes', cat: 'characters', title: 'Heart eyes: face({hearts:1}) / FACES.love / AFACES.love', note: 'hero, mum, Gerald',
  build: () => { const g = new THREE.Group(); [['hero', -0.6], ['mum', 0.6]].forEach(([n, x]) => { const c = makeCharacter(PRESETS[n]); c.pose(POSES.idle(0.2)); c.face(FACES.love); c.root.position.x = x; g.add(c.root); }); const cat = makeAnimal('cat', ANIMALS.gerald); cat.pose(APOSES.sit(0.4)); cat.face(AFACES.love); cat.root.position.set(0, 0, 0.6); g.add(cat.root); return { obj: g, cam: { pos: [0, 1.3, 3.4], target: [0, 0.95, 0], fov: 36 } }; } });
reg({ id: 'detail_la_peace', cat: 'characters', title: 'La peace: POSES.laPeace + FACES.mew (OK hand, mewing face)', note: 'hero, mum, dad',
  build: () => { const g = new THREE.Group(); [['hero', -0.9], ['mum', 0.0], ['dad', 0.95]].forEach(([n, x], i) => { const c = makeCharacter(PRESETS[n]); c.pose(POSES.laPeace(i)); c.face(FACES.mew); c.root.position.x = x; c.root.rotation.y = 0.1; g.add(c.root); }); return { obj: g, cam: { pos: [0, 1.5, 3.9], target: [0, 1.3, 0], fov: 38 } }; } });
reg({ id: 'detail_mew_close', cat: 'characters', title: 'Mewing face close-up: FACES.mew (+ POSES.laPeace); middle one mid-word (open 0.6)', note: 'hero, mum, dad',
  build: () => { const g = new THREE.Group(); [['hero', -0.85], ['mum', 0.0], ['dad', 0.9]].forEach(([n, x], i) => { const c = makeCharacter(PRESETS[n]); c.pose(POSES.laPeace(i)); c.face({ ...FACES.mew, open: i === 1 ? 0.6 : 0 }); c.root.position.x = x; g.add(c.root); }); return { obj: g, cam: { pos: [0, 1.75, 2.4], target: [0, 1.5, 0], fov: 40 } }; } });
reg({ id: 'detail_ok_hand', cat: 'characters', title: 'OK hand close-up (hR: ok)', note: '',
  build: () => { const c = makeCharacter(PRESETS.mum); c.pose(POSES.laPeace(0)); c.face(FACES.mew); const p = new THREE.Vector3(); c.root.updateMatrixWorld(true); c.aR.hand.root.getWorldPosition(p); return { obj: c.root, cam: { pos: [p.x + 0.1, p.y + 0.15, p.z + 1.2], target: [p.x, p.y + 0.12, p.z], fov: 30 } }; } });
reg({ id: 'detail_gerald_mew', cat: 'animals', title: 'Mewing Gerald: AFACES.mew (firm cheeks, chin, pursed lips)', note: 'front / 3-4',
  build: () => { const g = new THREE.Group(); [[-0.36, 0.0], [0.4, 0.55]].forEach(([x, ry]) => { const c = makeAnimal('cat', ANIMALS.gerald); c.pose({ ...APOSES.sit(0.3), hx: -0.12 }); c.face(AFACES.mew); c.root.position.x = x; c.root.rotation.y = ry; g.add(c.root); }); return { obj: g, cam: { pos: [0, 0.6, 2.1], target: [0, 0.45, 0], fov: 34 } }; } });

// --- episode 4: baby, sand pit, sand toys ---
reg({ id: 'char_baby', cat: 'characters', title: 'Baby: makeBaby() (bald, striped tee, bare feet) sitting, tipping, crying', note: 'BABY_POSES.sit / tip / cry, baby.cry(k, t) adds modelled tears',
  stage: { sky: ['#cfe9ff', '#fff3d6'], ground: 0xdcb57c },
  build: () => { const g = new THREE.Group(); [[BABY_POSES.sit(0.3), 0], [BABY_POSES.tip(0, 0.8), 1], [BABY_POSES.cry(0.2), 2]].forEach(([p, k], i) => { const b = makeBaby(); b.pose(p); if (k === 2) b.cry(1, 0.3); else b.face(k ? { open: 0.9, eye: 1.4, brow: 1, smile: 0 } : { smile: 0.4 }); b.root.position.set((i - 1) * 0.75, 0.07, 0); g.add(b.root); }); return { obj: g, cam: { pos: [0, 0.9, 2.6], target: [0, 0.3, 0], fov: 40 } }; } });
reg({ id: 'prop_beach', cat: 'props', title: 'Sand toys: toyShovel (holdable), sandBucket', note: 'shovel authored upright, grip at origin',
  stage: { sky: ['#cfe9ff', '#fff3d6'], ground: 0xdcb57c },
  build: () => { const g = new THREE.Group(); const s = BEACH.toyShovel(); s.position.set(-0.25, 0.2, 0); s.scale.setScalar(1.5); g.add(s); const b = BEACH.sandBucket(); b.position.set(0.25, 0, 0); g.add(b); const b2 = BEACH.sandBucket(0xff7ab0); b2.position.set(0.6, 0, -0.2); g.add(b2); return { obj: g, cam: { pos: [0, 0.6, 1.6], target: [0.15, 0.2, 0], fov: 40 } }; } });
reg({ id: 'set_sandpark', cat: 'sets', title: 'Park sand pit (ep4): diggable hole, kerb, lawn, trees, bench, toys', note: 'sp.dig(k) grows the hole under whoever sits at the origin; heightAt(x,z)', stage: SANDPARK_STAGE,
  build: () => { const s = buildSandPark(); s.dig(0.4); const b = makeBaby(); b.pose(BABY_POSES.sit(0)); b.root.position.set(0, 0.07, 0.06); s.group.add(b.root); return { obj: s.group, cam: { pos: [3, 2.6, 4.4], target: [0, 0.2, -0.4], fov: 45 } }; } });
// --- episode 5: dunk kit, space props, living room ---
import * as DUNK from './fx/dunk.js';
import * as SPACE from './props/space.js';
import { buildLivingRoom, houseExterior, LIVING_STAGE } from './sets/livingroom.js';
const VOID = { sky: ['#000000', '#05060c'], ground: null, hemiI: 0.08, keyI: 0.0, fillI: 0.05, rimI: 0.3, rimC: 0x6a8cff, env: 0 };
const SPACE5 = { sky: ['#000003', '#02030a'], ground: null, hemiI: 0.6, keyI: 2.6, keyPos: [8, 4, 9], fillI: 0.75, env: 0 };
reg({ id: 'fx_dunk', cat: 'fx', title: 'Dunk kit (ep5): universe-ball, floating hoop + light net + glass backboard, silhouette hero, floor rings, void floor', note: 'universeBall(r), hoop().update(a), shockwave().set(a), floorRings(events).set(t), voidFloor(), silhouette(root).set(k, ballPos, camera)', stage: VOID,
  build: () => { const g = new THREE.Group(); const f = DUNK.voidFloor(60); g.add(f); const h = DUNK.hoop(); g.add(h); const b = DUNK.universeBall(0.12, { light: 5 }); b.position.set(-0.9, 1.25, 1.2); g.add(b); const c = makeCharacter(PRESETS.hero); c.root.position.set(-1.2, 0, 1.4); c.root.rotation.y = 0.9; c.pose({ aLs: 1.6, aLf: 0.6, hL: 'open' }); g.add(c.root); const s = DUNK.silhouette(c.root); s.U.uSil.value = 1; s.U.uBallV.value.set(0.4, -0.2, -2.8); const r = DUNK.floorRings([{ t: 0, x: -0.9, z: 1.2 }]); r.set(0.15); g.add(r); return { obj: g, cam: { pos: [-2.2, 1.4, 5.2], target: [-0.6, 1.7, 0.6], fov: 50 } }; } });
reg({ id: 'fx_dunk_slam', cat: 'fx', title: 'Dunk kit: the slam (backboard shards as stars, shockwave ring with sparks)', note: 'hoop.update(0.15), shockwave.set(0.25)', stage: VOID,
  build: () => { const g = new THREE.Group(); g.add(DUNK.voidFloor(80)); const h = DUNK.hoop(); h.update(0.15); g.add(h); const w = DUNK.shockwave(); w.set(0.25); g.add(w); return { obj: g, cam: { pos: [-3.2, 1.0, 7.5], target: [0, 2.4, 0], fov: 55 } }; } });
reg({ id: 'prop_space', cat: 'props', title: 'Space props (ep5): ISS, satellite, Voyager 1 with googly eyes, Sun with sunglasses, Jupiter, Saturn', note: 'issStation, satellite, voyager1().look(t), sunFace().setShades(k), bandedPlanet, saturn', stage: SPACE5,
  build: () => { const g = new THREE.Group(); const i = SPACE.issStation(); i.scale.setScalar(0.5); i.position.set(-2.5, 3.2, 0); g.add(i); const s = SPACE.satellite(2, 0.5); s.position.set(2.6, 3.2, 0); g.add(s); const v = SPACE.voyager1(); v.scale.setScalar(0.55); v.rotation.x = 1.1; v.position.set(-2.4, 0.4, 0); g.add(v); const su = SPACE.sunFace(1.3); su.setShades(1); su.position.set(1.8, 0.6, 0); g.add(su); const j = SPACE.bandedPlanet(1.0); j.position.set(-2.0, -2.4, 0); g.add(j); const sa = SPACE.saturn(0.75); sa.rotation.x = 0.4; sa.position.set(1.8, -2.4, 0); g.add(sa); return { obj: g, cam: { pos: [0, 0.4, 13], target: [0, 0.4, 0], fov: 50 } }; } });
reg({ id: 'prop_space_b', cat: 'props', title: 'Space props (ep5): cockpit nose, icy rocks + comet, nebula pillar, picnic blanket, telescope, tiny planet, Moon flag', note: 'cockpitNose (see-through windscreen, userData.seat), comet, nebulaPillar, picnicBlanket, telescope, tinyPlanet, moonFlag', stage: SPACE5,
  build: () => { const g = new THREE.Group(); const n = SPACE.cockpitNose(); n.scale.setScalar(0.6); n.rotation.y = 0.6; n.position.set(-2.2, 3.0, -2); g.add(n); const c = SPACE.comet(0.5); c.position.set(2.4, 3.2, 0); g.add(c); for (let k = 0; k < 3; k++) { const r = SPACE.icyRock(k + 2, 0.3); r.position.set(1.4 + k * 0.6, 1.8, 0); g.add(r); } const p = SPACE.nebulaPillar(5, 3); p.scale.setScalar(0.35); p.position.set(-2.4, -3.4, 0); g.add(p); const b = SPACE.picnicBlanket(); b.position.set(0.8, -1.2, 0.5); g.add(b); const t = SPACE.telescope(); t.position.set(2.4, -1.2, 0.5); g.add(t); const tp = SPACE.tinyPlanet(0.8); tp.position.set(0.4, -3.2, 0); g.add(tp); const f = SPACE.moonFlag(); f.position.set(-0.6, -0.6, 0.5); g.add(f); return { obj: g, cam: { pos: [0, 0, 12], target: [0, 0, 0], fov: 50 } }; } });
reg({ id: 'set_livingroom', cat: 'sets', title: 'Living room (ep5) with the ceiling hole: sofa, armchair, coffee table, rug, lamp, windows', note: 'buildLivingRoom().setHole(k); HOLE above the rug', stage: LIVING_STAGE,
  build: () => { const s = buildLivingRoom(); s.setHole(1); return { obj: s.group, cam: { pos: [0.6, 1.7, 5.8], target: [0, 1.1, -1], fov: 52 } }; } });
reg({ id: 'set_house_exterior', cat: 'sets', title: 'Bungalow outside (ep5) with the roof hole and chimney', note: 'houseExterior().setHole(k), userData.chimneyTop, holeWorld()', stage: { sky: ['#7fc8ff', '#e9f6ff'], ground: 0x6fbf4a },
  build: () => { const h = houseExterior(); h.setHole(1); return { obj: h, cam: { pos: [-5, 4.4, 11], target: [0, 3.2, 0], fov: 50 } }; } });

// --- asset packs (2026-11-25): each pack registers its items in registry/<pack>.js; a broken pack only logs a warning ---
for (const p of ['city', 'nature', 'landmarks', 'space', 'interiors', 'motion']) {
  try { const m = await import(`./registry/${p}.js`); ITEMS.push(...m.ITEMS); } catch (e) { console.warn('pack failed to load:', p, e.message); }
}
