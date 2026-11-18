// S1 — GARDEN BBQ (0–9.6): hearts appear above heads: 1 (grandma) -> 2 (kid) -> 4 (mum,dad) -> 8 (4 neighbours) -> 16 (8 more).
import { THREE, makeCharacter, PRESETS, POSES, FACES, randomPerson, makeLoveAura, rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, orbit, cam, shot, pick, regroup, pops, place, makeLovers, V, yawTo, D2R } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { buildGarden } from '../../../assets/library/sets/garden.js';
import { makeAnimal, APOSES, AFACES, ANIMALS } from '../../../assets/library/animal.js';
import * as HOLD from '../../../assets/library/props/holdables.js';
import { lawnChair } from '../../../assets/library/props/home.js';
import { burger } from '../../../assets/library/props/home.js';
import { makeSparkles } from '../../../assets/library/fx/hearts.js';

const STAGE = { sky: ['#7fd0ff', '#fff6dc'], ground: null, fog: ['#dff2ff', 30, 80], shadow: { extent: 12 }, keyPos: [5, 9, 7] };

export default {
  async build(ctx) {
    const stage = makeStage(STAGE), scene = stage.scene;
    const gd = buildGarden(); scene.add(gd.group);
    // remove the set's default chairs so we can seat people precisely
    gd.anchors.chairs.forEach((c) => (c.visible = false));
    const lovers = makeLovers(scene);
    const S = { stage, scene, gd, lovers, cast: {} };
    const mk = (name, preset = name) => { const c = makeCharacter(PRESETS[preset]); scene.add(c.root); S.cast[name] = c; return c; };
    // family
    const hero = mk('hero'), mum = mk('mum'), dad = mk('dad'), kid = mk('kid'), grandma = mk('grandma');
    const tray = (() => { const t = HOLD.tray(true); t.userData.grip = { ...t.userData.grip }; return t; })(); hero.hold(tray, 'R'); S.tray = tray;
    // furniture for seating
    const gch = lawnChair(0x2bb7b0); gch.position.set(-4.2, 0, 1.0); gch.rotation.y = 0.9; scene.add(gch);
    const stool = new THREE.Group(); { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.22, 16), new THREE.MeshStandardMaterial({ color: 0xff8a2b })); m.position.y = 0.11; m.castShadow = true; stool.add(m); } stool.position.set(2.0, 0, 2.7); scene.add(stool);
    // dad at the grill: spatula
    const spat = HOLD.spatula(); dad.hold(spat, 'R'); S.spat = spat;
    const phone = (() => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.19), new THREE.MeshStandardMaterial({ color: 0x15151c })); g.add(b); const s = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.004, 0.17), new THREE.MeshBasicMaterial({ color: 0x4aa0e0 })); s.position.y = 0.008; g.add(s); g.userData.grip = { upright: false, hand: 'grip', pos: [0, 0.02, 0.06], rot: [0, 0, 0] }; return g; })(); mum.hold(phone, 'R', { grip: 'grip' });
    const tablet = HOLD.beaker; // placeholder never used
    const tab = (() => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.22), new THREE.MeshStandardMaterial({ color: 0x15151c })); g.add(b); const s = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.005, 0.19), new THREE.MeshBasicMaterial({ color: 0x55c0ff })); s.position.y = 0.012; g.add(s); return g; })(); kid.hold(tab, 'R', { pos: [0, 0.06, 0.1], rot: [0.4, 0, 0], grip: 'flat' }); S.tab = tab;
    // dog + cat
    const dog = makeAnimal('dog', ANIMALS.dog); scene.add(dog.root); S.dog = dog; place(dog, 5.0, 0, 2.2, -0.6);
    const cat = makeAnimal('cat', ANIMALS.gerald); scene.add(cat.root); S.cat = cat; cat.root.position.set(-7.5, 1.15 + 0.05, 1.6); cat.root.rotation.y = 1.25;
    // neighbours: 4 over the fences at 6.0, 8 more at 8.0
    const nbPresets = ['neighbourMan', 'neighbourWoman', 'neighbourTeen', 'neighbourGranny'];
    S.wave1 = nbPresets.map((p, i) => { const c = mk('nb' + i, p); const left = i < 2; place(c, left ? -8.5 : 8.5, 0.0, left ? -1.6 + i * 3.2 : 1.8 - (i - 2) * 3.4, left ? Math.PI / 2 : -Math.PI / 2); c.root.position.y = 0.35; return c; });
    const r = rng(17);
    S.wave2 = Array.from({ length: 8 }, (_, i) => { const c = randomPerson(r); scene.add(c.root); const left = i % 2 === 0; const k = Math.floor(i / 2); place(c, (left ? -1 : 1) * (5.6 + (k % 2) * 1.1), 0, 3.0 + k * 1.5, left ? 0.8 : -0.8); return c; });
    lovers.add(grandma, 0.0); lovers.add(kid, 2.0); lovers.add(mum, 4.0); lovers.add(dad, 4.0);
    S.wave1.forEach((c) => lovers.add(c, 6.0)); S.wave2.forEach((c) => lovers.add(c, 8.0));
    // love aura around the hero grows with the count
    const aura = makeLoveAura(1.2); scene.add(aura); S.aura = aura;
    // flying burger (dad's voiced moment)
    const fb = burger(); fb.scale.setScalar(2.2); scene.add(fb); S.fb = fb;
    // sparkles near hero
    // shots (camera plan, 24 units of 0.4 s)
    const H = [0, 1.3, 0.8], GR = [-4.1, 1.0, 1.0], KID = [2.0, 0.8, 2.7], DAD = [-2.3, 1.45, -2.4], MUM = [3.0, 1.0, -0.4];
    S.shots = [
      shot(0.0, 0.8, cam([7.5, 4.2, 12.5], [0.5, 1.4, -1.5], 52), cam([5.0, 3.4, 11], [0.5, 1.4, -1.5], 52)),             // establishing wide (cat on fence visible)
      shot(0.8, 1.6, orbit([0.2, 1.2, 0.5], 18, 4.6, 0.4, 40), orbit([0.2, 1.25, 0.8], 10, 4.0, 0.35, 40)),               // hero medium with tray
      shot(1.6, 2.0, orbit([-4.1, 1.05, 1.0], -20, 2.4, 0.15, 38)),                                                       // grandma + heart close
      shot(2.0, 2.8, orbit([2.0, 0.95, 2.7], 25, 2.4, 0.1, 38), orbit([2.0, 0.95, 2.7], 12, 2.0, 0.1, 38)),              // kid heart pops
      shot(2.8, 3.2, orbit([0.2, 1.6, 0.8], -15, 2.2, 0.1, 36)),                                                          // hero reaction close
      shot(3.2, 4.0, cam([0.2, 1.7, 5.5], [-2, 1.0, -2], 46), cam([0.6, 1.9, 4.2], [-1.5, 1.0, -2], 46)),                // behind hero toward family
      shot(4.0, 4.4, orbit([3.0, 1.1, -0.4], -10, 2.5, 0.1, 38)),                                                         // mum looks up
      shot(4.4, 5.2, orbit([-7.3, 1.45, 1.6], 55, 2.9, 0.0, 36), orbit([-7.3, 1.45, 1.6], 42, 2.5, 0.0, 36)),             // Gerald on the fence (roast)
      shot(5.2, 6.0, orbit([0.2, 1.25, 0.8], 22, 3.8, 0.35, 42)),                                                         // hero medium shocked
      shot(6.0, 6.4, cam([-3.2, 1.9, 5.5], [-8.5, 1.6, 0.2], 42)),                                                        // neighbours pop (left)
      shot(6.4, 7.2, cam([3.0, 1.9, 5.5], [8.5, 1.6, 0.5], 42), cam([3.6, 1.9, 5.0], [8.5, 1.6, 0.5], 42)),              // neighbours pop (right)
      shot(7.2, 8.0, orbit([-2.3, 1.55, -2.4], 14, 3.4, 0.0, 40), orbit([-2.3, 1.55, -2.4], 8, 1.9, 0.0, 34), { ease: 'in' }), // punch-zoom dad + voice 7.6
      shot(8.0, 8.4, cam([0.0, 5.0, 11.5], [0, 1.0, 0.5], 56)),                                                           // wide: 8 more pop (16)
      shot(8.4, 8.8, orbit([0.2, 1.7, 0.8], 0, 1.9, 0.0, 34)),                                                            // hero eyes
      shot(8.8, 9.6, orbit([2.0, 0.95, 2.7], -8, 2.2, 0.15, 34), orbit([2.0, 0.95, 2.7], -4, 1.5, 0.15, 32)),            // kid voice + tablet drops
    ];
    // slower edit: ~2 s shots, each holding the camera of the gag / voiced line it covers
    S.shots = regroup(S.shots, [[0, 2.0, 1.2], [2.0, 4.0, 0.4], [4.0, 5.6, 4.8], [5.6, 7.2, 5.6], [7.2, 9.6, 8.0]]);
    S.shots[2] = { ...S.shots[2], a: cam([-5.0, 1.75, 1.7], [-7.5, 1.32, 1.6], 34), b: cam([-5.3, 1.72, 1.65], [-7.5, 1.34, 1.6], 32) };   // Gerald on the fence: camera just above the rail so he is clearly sitting on it
    return S;
  },
  frame(t, S, ctx) {
    const { cast, lovers } = S; const { hero, mum, dad, kid, grandma } = cast;
    const p = pick(S.shots, t), c = p.cam;
    const mo = ctx.mouth;
    // ---- hero: walks out of the back door with a tray of burgers, then freezes in awe
    const wk = clamp(t / 2.2);
    const hp = [lerp(0, 0.3, wk), 0, lerp(-4.6, 0.7, easeOutCubic(wk))];
    place(hero, hp[0], hp[1], hp[2], 0.0);
    const moving = t < 2.2;
    const shock = clamp((t - 2.4) / 5.0);
    hero.pose({ ...POSES.walk(t, 7), ...(moving ? {} : POSES.idle(t)), ...POSES.tray(), lean: 0.02, hx: shock * -0.08 });
    hero.pose(moving ? { ...POSES.walk(t, 6.5), aRf: 1.2, aRe: 1.9, aRs: 0.3, aLf: -0.2 * Math.sin(t * 6.5), hR: 'flat' } : { ...POSES.tray(), aLf: 0.3 + shock * 1.0, aLs: 0.2 + shock * 0.9, aLe: 0.5, bob: 0.01 + shock * 0.03, squash: 1 + shock * 0.03 });
    hero.face(moving ? { smile: 0.6 } : { ...FACES.shock, open: 0.1 + shock * 0.6, eye: 1 + shock * 0.35, brow: shock, pupilSize: 1 - shock * 0.35, smile: 0.1 });
    S.tray.rotation.set(0, 0, 0); S.tray.position.set(0, 0.0, 0.06);
    // ---- grandma: waves, sits in the lawn chair, the only one who loves him
    place(grandma, -4.2, 0, 1.0, 0.9); grandma.pose({ ...POSES.sitOn(t, 0.34 / 0.92), aRs: 1.9 + Math.sin(t * 7) * 0.4, aRf: 0.2, aRe: 0.7, hR: 'open', hz: 0.1 + Math.sin(t * 2) * 0.03 }); grandma.face({ ...FACES.love, open: mo('grandma_confused', t) });
    // ---- kid: on the stool with a tablet; looks up at 2.0; drops tablet on the line at 8.8
    place(kid, 2.0, 0, 2.7, -0.4); const kUp = t > 2.0 ? 1 : 0, kdrop = t > 8.8 ? clamp((t - 8.8) / 0.5) : 0;
    kid.pose({ ...POSES.sitOn(t, 0.22 / 0.62), aRf: 0.9 - kdrop * 0.4, aRe: 1.2 - kdrop * 0.8, hy: kUp ? 0.3 * Math.sin(t) : 0, hx: kUp ? -0.1 : 0.3, hR: kdrop ? 'open' : 'flat' });
    kid.face(t < 2.0 ? { smile: 0.1, pupil: [0, -0.6], lid: 0.2 } : t < 8.8 ? { ...FACES.question, open: 0.2 } : { ...FACES.scream, open: mo('kid_high', t) });
    S.tab.position.set(0, 0.06 + kdrop * -0.25, 0.1 + kdrop * 0.1); S.tab.rotation.set(0.4 + kdrop * 2, 0, kdrop * 1.5);
    // ---- mum: on the bench with her phone, looks up at 4.0
    place(mum, 3.0, 0, -0.1, 0.0); mum.pose({ ...POSES.sitOn(t, 0.34), aRf: 0.95, aRe: 1.3, aRs: 0.25, hx: t < 4.0 ? 0.35 : -0.05, hR: 'grip' }); mum.face(t < 4.0 ? { smile: 0, lid: 0.25 } : { ...FACES.shock, open: 0.15 + clamp((t - 4.0) / 2) * 0.6 });
    // ---- dad: flips burgers; at 7.6 the burger flies and he shouts
    place(dad, -2.3, 0, -2.4, -0.15); const flip = Math.sin(t * 5) * 0.5; const dd = t > 7.2;
    dad.pose({ ...POSES.holdR(), aRf: 1.0 + (dd ? 0.8 : flip * 0.3), aRe: 1.2, hy: dd ? 0 : 0.35, hx: dd ? -0.12 : 0.1, bob: 0, squash: dd ? 1.05 : 1 }); dad.face(t < 7.2 ? { smile: 0.4, lid: 0.1 } : { ...FACES.scream, open: mo('dad_shout', t) });
    const bt = t - 7.6; S.fb.visible = bt > 0 && bt < 1.6; if (S.fb.visible) S.fb.position.set(-3.2 + bt * 1.2, 1.7 + bt * 4.2 - 4.9 * bt * bt, -2.4 + bt * 0.4), S.fb.rotation.set(bt * 8, bt * 5, 0);
    // ---- neighbours pop in
    S.wave1.forEach((n, i) => { const k = pops(t, 6.0 + (i % 4) * 0.08); n.root.visible = k > 0; n.root.scale.setScalar(Math.max(0.0001, k) * n.opts.height); n.pose({ ...POSES.cheer(t + i), bob: 0 }); n.face({ ...FACES.happy, open: 0.5 }); });
    S.wave2.forEach((n, i) => { const k = pops(t, 8.0 + i * 0.04); n.root.visible = k > 0; n.root.scale.setScalar(Math.max(0.0001, k) * n.opts.height); n.pose({ ...POSES.cheer(t + i * 0.7) }); n.face({ ...FACES.excited }); });
    // ---- dog + Gerald (not impressed)
    S.dog.pose(APOSES.stand(t)); S.dog.face({ open: 1 }); S.dog.root.position.set(5.0 - Math.min(1, Math.max(0, (t - 8.0))) * 1.0, 0, 2.2);
    const look = t > 5.0 ? 1 : 0; S.cat.pose(look ? { ...APOSES.loaf(t), hy: 0.8 } : APOSES.loaf(t)); S.cat.face(t > 8.4 ? { lid: 0.55 } : { lid: 0.45 + Math.max(0, Math.sin(t * 0.9) - 0.9) * 4 });
    // ---- hearts, aura
    lovers.update(t, c.pos, c);
    const n = Math.max(1, lovers.count(t)); S.aura.position.set(hp[0], 0.02, hp[2]); S.aura.setR(0.9 + 0.35 * Math.log2(n), 0.9);
    S.gd.update(t);
    // seed grandma's heart at t=0
    return { cam: c, keyFocus: c.target };
  },
};
