// Episode 4 (REEL): "Mama I'm a criminal". The hero digs a hole under a sitting baby while the black clapping cat watches.
// window.renderOut(t) draws second t synchronously on one 1080x1920 canvas; every frame is a pure function of t.
import * as THREE from 'three';
import { makeRenderer, makeCamera, makeStage, lookFrom, aimKey } from '../../assets/library/stage.js';
import { makeCharacter, PRESETS, CLOCK } from '../../assets/library/character.js';
import { makeBaby, BABY_POSES } from '../../assets/library/baby.js';
import { buildSandPark, SANDPARK_STAGE } from '../../assets/library/sets/sandpark.js';
import { toyShovel } from '../../assets/library/props/beach.js';
import { clipCard } from '../../assets/library/fx/clip.js';
import { updateNature } from '../../assets/library/props/nature.js';
import { clamp, smooth, lerp, easeOutBack, mat, sph } from '../../assets/library/util.js';

const q = new URLSearchParams(location.search);
const SCALE = parseFloat(q.get('scale') || '1');
const W = Math.round(1080 * SCALE), H = Math.round(1920 * SCALE), FPS = 30;
// ---- timing: the song runs at ~136 BPM (beat 0.441 s, first beat 0.72 s); every cut and big moment sits on a beat ----
const B = (k) => 0.72 + 0.4412 * k;
export const T = { s2: B(10), shush: B(14), s3: B(19), s4: B(27), wobble: B(31), fall: B(33), s5: B(35), s6: B(41), up: B(42), catUp: B(44), end: B(49), DUR: 24.5 };

// ---- page ----
const gl = new OffscreenCanvas(W, H), out = document.getElementById('out');
out.width = W; out.height = H;
const renderer = makeRenderer(gl, W, H), camera = makeCamera(W, H, 40), g2 = out.getContext('2d');
await document.fonts.load('100px Anton');

// ---- set + cast ----
const stage = makeStage(SANDPARK_STAGE), scene = stage.scene;
const park = buildSandPark(); scene.add(park.group);
const hero = makeCharacter(PRESETS.hero); scene.add(hero.root);
const shovel = hero.hold(toyShovel(), 'R', { rot: [Math.PI * 0.95, 0, 0], pos: [0, 0, 0.0] }); shovel.scale.setScalar(1.45);
const baby = makeBaby(); scene.add(baby.root);
const bShovel = baby.hold(toyShovel(0xff8a1e), 'R', { rot: [Math.PI * 0.5, 0, 0] }); bShovel.scale.setScalar(1.7);   // orange toy shovel: he scoops sand and eats it
for (const ch of [hero, baby]) ch.root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
const cat = await clipCard(new URL('../build/clip/', import.meta.url), { height: 1.2, feet: 0.184 }); scene.add(cat.group);
const CAT = [-1.05, -1.35], HERO = [0, -1.02], BABY = [0, 0.06];
cat.group.position.set(CAT[0], park.heightAt(CAT[0], CAT[1]) - 0.02, CAT[1]);
// sand clumps tossed off the shovel
const clumpM = mat(0xc9a066, { rough: 1 }), clumps = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(sph(0.035, 8, 6), clumpM); m.castShadow = true; scene.add(m); return m; });

// ---- helpers ----
const seg = (t, a, b) => clamp((t - a) / (b - a));
const P = 2 * 0.4412;   // one dig stroke = two beats
function digAmount(t) {
  if (t < T.s2) return 0.05 + 0.25 * smooth(t / T.s2);
  if (t < T.s4) return 0.3;
  if (t < T.fall) return 0.3 + 0.7 * seg(t, T.s4, T.fall);
  return 1 + 0.5 * smooth(seg(t, T.fall - 0.05, T.fall + 0.22));   // the ledge caves in under him
}
const digging = (t) => (t > 0.2 && t < T.s2 + 0.4) || (t >= T.s4 && t < T.fall + 0.1);
// kneeling behind the baby; dig stroke u 0..1: plunge, scoop, toss to his right
function digPose(t) {
  const u = ((t - 0.2) / P) % 1, plunge = smooth(u / 0.45), lift = smooth((u - 0.45) / 0.25), toss = smooth((u - 0.7) / 0.3) * (1 - smooth((u - 0.92) / 0.08));
  const reach = plunge * (1 - lift);
  return { bob: -0.25, lLf: 0.05, lRf: 0.05, lLk: 1.55, lRk: 1.55, lLs: 0.12, lRs: 0.12, lean: 0.22 + reach * 0.14, hx: -0.05, hy: -toss * 0.2,
    aRf: 0.05 + reach * 0.25 + lift * 0.2, aRe: 0.1 + lift * 0.9, aRs: 0.12 + toss * 0.45, twist: -toss * 0.25, aLf: 0.05, aLe: 0.5, aLs: 0.4, hL: 'relaxed' };
}
const KNEEL = { bob: -0.25, lLf: 0.05, lRf: 0.05, lLk: 1.55, lRk: 1.55, lLs: 0.12, lRs: 0.12 };
const turnToCat = (k) => ({ _yaw: -0.9 * k, hy: -0.25 * k });   // he turns on his knees toward the cat (_yaw = whole body), head a bit more
const poseH = (p) => { hero.root.rotation.y = p._yaw ?? 0; hero.pose(p); };

function heroAt(t) {
  hero.root.position.set(HERO[0], park.heightAt(HERO[0], HERO[1]), HERO[1]); 
  shovel.visible = true;
  const grin = { smile: 1, wide: 1.35, brow: 0.45, lid: 0.25 };
  if (t < T.s2 + 0.4 || (t >= T.s4 && t < T.fall + 0.1)) { poseH(digPose(t)); hero.face({ ...grin, pupil: [0, -0.4] }); return; }
  if (t < T.s4) {
    // hears the clapping, turns, covers his mouth (giggling), then shushes the cat; then covers his mouth + repeated sorry gesture
    const turn = smooth(seg(t, T.s2 + 0.4, T.s2 + 0.9)), giggle = Math.abs(Math.sin(t * 14)) * 0.04;
    const cover = { aRf: 1.4, aRe: 2.02, aRs: -0.12, hR: 'flat', wR: 1.5 };   // right hand: the side the side-camera sees
    if (t < T.shush) { const c = smooth(seg(t, T.s2 + 0.6, T.s2 + 1.0)); poseH({ ...KNEEL, lean: 0.12, ...turnToCat(turn), hx: 0.05 - giggle * 2, bob: -0.25 + giggle, aRf: 0.6 + 0.8 * c, aRe: 0.4 + 1.62 * c, aRs: 0.2 - 0.32 * c, hR: c > 0.3 ? 'flat' : 'grip', wR: 1.5 * c, aLf: 0.1, aLe: 0.5, aLs: 0.35 }); shovel.visible = c < 0.3;
      hero.face({ smile: 1, wide: 1.2, lid: 0.55, brow: 0.6, pupil: [-0.8, 0] }); return; }
    if (t < T.s3) { const k = smooth(seg(t, T.shush, T.shush + 0.3)), wag = Math.sin((t - T.shush) * 9) * 0.05;
      shovel.visible = false;   // dropped to free the hand (it rests in the sand)
      // SHH: index finger up on the lips, leaning toward the cat (arm angles solved so the wrist sits just under the mouth)
      const lean2 = 0.08 * Math.sin((t - T.shush) * Math.PI / 0.4412) ** 2;
      poseH({ ...KNEEL, lean: 0.15 + lean2, ...turnToCat(1), hx: 0.05, aRf: lerp(1.4, 1.78, k), aRe: lerp(2.0, 0.42, k), aRs: lerp(-0.12, -0.25, k), hR: k > 0.4 ? 'point' : 'flat', wR: wag, aLf: 0.1, aLe: 0.5, aLs: 0.35 });
      hero.face({ open: 0.14, wide: 0.45, smile: 0, lid: 0.15, brow: 1, browTilt: 0.2, eye: 1.2, pupil: [-0.8, 0] }); return; }
    // sorry: hand over the mouth, the other hand chops up and down in front of his chest on every beat, little bows
    const b = ((t - T.s3) / 0.4412) % 1, chop = Math.sin(b * Math.PI), back = smooth(seg(t, T.s4 - 0.35, T.s4));
    shovel.visible = false;
    poseH({ ...KNEEL, lean: 0.12 + chop * 0.28, ...turnToCat(0.8 * (1 - back)), hx: 0.08 + chop * 0.3, aLf: 1.85, aLe: 0.4, aLs: -0.55, hL: 'flat', wL: 0, aRf: 1.85, aRe: 0.4, aRs: -0.55, hR: 'flat', wR: 0 });   // sorry: palms pressed together over the mouth, bowing on every beat
    hero.face({ smile: 0.6, wide: 1.1, lid: 0.45, brow: 0.7, browTilt: 0.6, pupil: [-0.6, -0.2] }); return;
  }
  // after the fall: freezes, then both hands up ("it wasn't me")
  const up = smooth(seg(t, T.up, T.up + 0.3)), shock = seg(t, T.fall + 0.1, T.fall + 0.3);
  shovel.visible = t < T.s5;
  poseH({ ...KNEEL, lean: 0.1 - 0.12 * up, hx: 0.25 * (1 - up) - 0.05 * up, hy: -0.3 * up, aRf: 0.3 * (1 - up) + 0.85 * up, aRe: 0.4 + 0.2 * up, aRs: 0.15 + 1.85 * up, aLf: 0.15 * (1 - up) + 0.85 * up, aLe: 0.6 * (1 - up) + 0.2 * up, aLs: 0.25 + 1.75 * up, hL: up > 0.3 ? 'open' : 'relaxed', hR: up > 0.3 ? 'open' : 'grip', wL: -1.2 * up, wR: 1.2 * up });
  hero.face(up > 0.1 ? { open: 0.25, wide: 0.7, smile: 0, brow: 1, eye: 1.25, pupil: [-0.9, 0.2] } : { open: 0.5 * shock, brow: shock, eye: 1 + 0.3 * shock, smile: 0.2 * (1 - shock), pupil: [0, -0.6] });
}

// baby before the fall: scoops sand with his toy shovel, eats it with gusto, kicks his feet, pats the sand (2.65 s loop = 6 beats)
function babyPlay(t) {
  const u = ((t + 0.4) / 2.647) % 1, scoop = smooth(seg(u, 0.0, 0.22)) * (1 - smooth(seg(u, 0.28, 0.45))), eat = smooth(seg(u, 0.3, 0.45)) * (1 - smooth(seg(u, 0.85, 1.0)));
  const chew = eat > 0.9 ? Math.abs(Math.sin((u - 0.45) * 40)) : 0, pat = Math.abs(Math.sin(t * 7)) * (1 - eat), kick = Math.sin(t * 10);
  baby.pose(BABY_POSES.sit(t, { lean: 0.1 + 0.25 * scoop + 0.1 * eat, hx: 0.35 * scoop - 0.1 * eat + chew * 0.08, hy: 0.25 * Math.sin(t * 1.3) * (1 - eat), bob: -0.43 + Math.abs(Math.sin(t * 5)) * 0.03,
    aRf: lerp(lerp(0.7, 1.0, scoop), 1.75, eat), aRs: lerp(lerp(0.35, 0.15, scoop), -0.45, eat), aRe: lerp(lerp(0.5, 0.15, scoop), 0.0, eat), hR: 'grip',
    aLf: 0.75 + 0.35 * pat, aLe: 0.5 - 0.3 * pat, aLs: 0.5 + 0.3 * eat, hL: eat > 0.5 ? 'spread' : 'relaxed',
    lLf: 1.5 + kick * 0.25, lRf: 1.5 - kick * 0.25, lLk: 0.2 + Math.max(0, kick) * 0.4, lRk: 0.2 + Math.max(0, -kick) * 0.4, squash: 1 + chew * 0.04 }));
  baby.face(eat > 0.5 ? { open: eat > 0.9 ? 0.2 + 0.55 * chew : 1, wide: 1.4, smile: 0, eye: 1.25 - 0.3 * chew, lid: 0.5 * chew, brow: 0.7, pupil: [0, -0.3] } : { smile: 1, wide: 1.5, eye: 1.2, pupil: [0, -0.7 * scoop], brow: 0.5 });
}
function babyAt(t) {
  const g0 = park.heightAt(BABY[0], BABY[1]);
  bShovel.visible = t < T.fall + 0.1;
  if (t < T.wobble) { baby.root.position.set(BABY[0], 0.07, BABY[1]); baby.root.rotation.set(0, 0, 0); babyPlay(t); return; }
  if (t < T.fall) {   // the ground gives: wobbles harder and harder, arms windmilling, eyes huge
    const k = seg(t, T.wobble, T.fall), w = Math.sin((t - T.wobble) * 24) * k;
    baby.root.position.set(BABY[0], 0.07 - 0.03 * k, BABY[1]); baby.root.rotation.set(-0.12 * k, 0, w * 0.18);
    baby.pose({ ...BABY_POSES.tip(t, 0.35 + 0.4 * k), aLf: 1.4 + Math.sin(t * 18) * 0.8, aRf: 1.4 + Math.sin(t * 18 + 3) * 0.8 });
    baby.face({ open: 0.6 + 0.3 * k, wide: 1.3, eye: 1.5, pupilSize: 0.5, brow: 1, smile: 0 }); return; }
  // falls back into the hole as the ledge collapses, slams the bottom (squash), bounces, then a full tantrum
  const f = seg(t, T.fall, T.fall + 0.32), fall = f * f, land = seg(t, T.fall + 0.32, T.fall + 0.62);
  const bottom = g0 + 0.03;   // the (collapsed) hole floor
  const bounce = land > 0 && land < 1 ? Math.abs(Math.sin(land * Math.PI * 2)) * 0.06 * (1 - land) : 0;
  baby.root.position.set(BABY[0], lerp(0.07, bottom, fall) + bounce, lerp(BABY[1], BABY[1] - 0.18, fall));
  baby.root.rotation.set(-0.8 * Math.sin(f * Math.PI), 0, 0.15 * Math.sin(f * Math.PI));
  const imp = land > 0 && land < 1 ? Math.sin(land * Math.PI * 2) * (1 - land) : 0;   // squash on impact, stretch on the rebound
  const cryK = smooth(seg(t, T.fall + 0.45, T.fall + 0.7)) * (1 - 0.6 * smooth(seg(t, T.catUp, T.catUp + 1.2)));
  if (f < 1) { baby.pose({ ...BABY_POSES.tip(t, 1), aLs: 1.8, aRs: 1.8, lLf: 2.2, lRf: 2.2 }); baby.face({ open: 1, wide: 1.5, eye: 1.6, pupilSize: 0.45, brow: 1, smile: 0 }); return; }
  const wk = smooth(seg(t, T.fall + 0.45, T.fall + 0.8)) * (1 - 0.7 * smooth(seg(t, T.catUp, T.catUp + 1.2)));
  baby.pose({ ...BABY_POSES.wail(t, wk), squash: 1 - imp * 0.28 });
  baby.cry(Math.max(cryK, 0.001), t);
}

// collapse FX: sand grains spraying out and dust puffs where he lands, chunks of the ledge tumbling in
const grainM = mat(0xd8b276, { rough: 1 }), grains = Array.from({ length: 28 }, (_, i) => { const m = new THREE.Mesh(sph(0.018 + (i % 4) * 0.006, 6, 5), grainM); m.castShadow = true; scene.add(m); return m; });
const chunks = Array.from({ length: 9 }, (_, i) => { const m = new THREE.Mesh(sph(0.05 + (i % 3) * 0.02, 8, 6), clumpM); m.castShadow = true; m.scale.set(1, 0.7, 1); scene.add(m); return m; });
const puffs = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(sph(0.1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xe8cfa0, roughness: 1, transparent: true, depthWrite: false })); scene.add(m); return m; });
const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
function collapseFx(t) {
  const L = T.fall + 0.32, a = t - L, c = t - T.fall;
  grains.forEach((m, i) => { const u = a - hash(i, 3) * 0.05; m.visible = u > 0 && u < 0.9; if (!m.visible) return;
    const ang = hash(i, 1) * Math.PI * 2, sp = 0.6 + hash(i, 2) * 1.1, vy = 1.6 + hash(i, 4) * 1.6;
    m.position.set(BABY[0] + Math.cos(ang) * sp * u, -0.25 + vy * u - 4.9 * u * u, BABY[1] - 0.15 + Math.sin(ang) * sp * u); });
  chunks.forEach((m, i) => { const u = c - i * 0.03; m.visible = u > 0 && u < 0.55; if (!m.visible) return;
    const x0 = -0.3 + i * 0.075, z0 = 0.2 + hash(i, 6) * 0.08;
    m.position.set(x0 * (1 - u * 0.4), 0.06 - 4.9 * u * u, z0 - u * 0.35); m.rotation.set(u * 6 + i, u * 3, 0); });
  puffs.forEach((m, i) => { const u = (a - i * 0.025) / 1.1; m.visible = u > 0 && u < 1; if (!m.visible) return;
    const ang = i / puffs.length * Math.PI * 2, r = 0.12 + 0.45 * Math.sqrt(u);
    m.position.set(BABY[0] + Math.cos(ang) * r, -0.15 + 0.35 * u + (i % 3) * 0.05, BABY[1] - 0.15 + Math.sin(ang) * r); m.scale.setScalar(0.6 + 1.6 * u); m.material.opacity = 0.75 * (1 - u) * (1 - u); });
}
const landShake = (t) => { const a = t - (T.fall + 0.32); return a > 0 && a < 0.35 ? (1 - a / 0.35) * 0.035 : 0; };

// cat clip: frames 0-56 = grinning clap loop, 84-150 = shocked, paw over mouth, ~24 = both paws raised and spread
const pingpong = (x, a, b) => { const n = b - a, m = Math.floor(x) % (2 * n); return a + (m < n ? m : 2 * n - m); };
function catFrame(t) {
  if (t < T.shush + 0.2) return Math.floor(Math.max(0, t - T.s2) * 30) % 57;
  if (t < T.s3 + 0.6) return Math.min(150, 84 + Math.floor((t - T.shush - 0.2) * 30));
  if (t < T.s4) return pingpong((t - T.s3 - 0.6) * 24, 112, 150);
  if (t < T.catUp) return 92;
  const r = seg(t, T.catUp, T.catUp + 0.45);
  return r < 1 ? 12 + Math.floor(r * 12) : pingpong((t - T.catUp - 0.45) * 10, 23, 27);
}

// sand clumps: launched at the toss phase of each stroke, from the hole to the pile beside him
function clumpsAt(t) {
  const on = digging(t), u = ((t - 0.2) / P) % 1;
  clumps.forEach((m, i) => {
    const a = (u - 0.62 - i * 0.025) / 0.3; m.visible = on && a > 0 && a < 1;
    if (!m.visible) return;
    const x0 = -0.05 + (i % 3) * 0.03, z0 = -0.45, x1 = -0.62 - (i % 2) * 0.12, z1 = -0.7 - (i % 3) * 0.06;
    m.position.set(lerp(x0, x1, a), park.heightAt(x1, z1) * a + 0.05 + Math.sin(a * Math.PI) * (0.3 + (i % 3) * 0.05), lerp(z0, z1, a));
    m.scale.setScalar(0.8 + (i % 3) * 0.3);
  });
}

// ---- shots: [t0, t1, camA, camB]; the camera eases A->B (slow push-in) across the shot ----
const C = (pos, target, fov = 40) => ({ pos, target, fov });
const SHOTS = [
  [0, T.s2, C([2.3, 2.0, 3.6], [0, 0.5, -0.6]), C([2.0, 1.8, 3.15], [0, 0.48, -0.6])],                              // 1 digging: baby up front, hero behind, the hole between
  [T.s2, T.shush, C([-4.0, 1.45, 1.3], [-0.75, 0.62, -1.05]), C([-3.7, 1.4, 1.15], [-0.75, 0.62, -1.05])],                 // 2 side: cat claps, hero covers his mouth
  [T.shush, T.s3, C([-3.2, 1.32, 0.55], [-0.5, 0.92, -1.15]), C([-2.95, 1.3, 0.45], [-0.5, 0.95, -1.15])],                 // 2b close on his face + the cat: SHH (finger on the lips)
  [T.s3, T.s4, C([-3.6, 1.4, 0.9], [-0.5, 0.75, -1.15]), C([-3.3, 1.38, 0.8], [-0.5, 0.78, -1.15])],                   // 3 sorry gesture, cat still reacting
  [T.s4, T.s5, C([2.0, 1.9, 3.2], [0, 0.42, -0.55]), C([1.75, 1.7, 2.8], [0, 0.4, -0.5])],                            // 4 digs on until the baby falls
  [T.s5, T.s6, C([0.8, 1.6, 1.9], [0, 0.05, -0.15], 38), C([0.7, 1.45, 1.7], [0, 0.05, -0.15], 38)],                  // 5 baby in the hole, crying
  [T.s6, T.DUR, C([-4.8, 1.7, 2.6], [-0.55, 0.6, -0.75]), C([-4.4, 1.6, 2.35], [-0.55, 0.6, -0.75])],                // 6 hands up, the cat copies
];
function camAt(t) {
  let s = SHOTS[0]; for (const x of SHOTS) if (t >= x[0] - 1e-6) s = x;
  const u = smooth(seg(Math.min(t, T.end), s[0], s[1] === T.DUR ? T.end : s[1])), a = s[2], b = s[3];
  return { pos: a.pos.map((v, i) => lerp(v, b.pos[i], u)), target: a.target.map((v, i) => lerp(v, b.target[i], u)), fov: lerp(a.fov, b.fov, u) };
}

// ---- THE EDIT (retention cut, v4): film time -> story time. The story above is a 24.5 s clock; the film re-orders it.
// Hook = flash-forward to the fall in the first second, a rewind, then the story tight. Ends on the cat copying (loops back).
// [filmT0, filmT1, storyS0, storyS1, camOverride?]  cuts on the film's beat grid (song starts on a beat at film 0)
const FB = (k) => 0.4412 * k;
const CC = (a, b) => [a, b];
const EDL = [
  [0, FB(3), 14.95, 14.95 + FB(3), CC(C([1.9, 1.95, 3.0], [0, 0.78, -0.45], 40), C([1.65, 1.8, 2.6], [0, 0.72, -0.42], 40))],   // HOOK: the baby drops into the hole, sand explodes
  [FB(3), FB(4), 16.27, 1.0, null],                                                                                          // REWIND (story runs backwards)
  [FB(4), FB(10), 1.0, 1.0 + FB(6), CC(C([1.75, 1.85, 2.8], [0, 0.92, -0.62]), C([1.45, 1.7, 2.3], [0, 0.9, -0.62]))],         // the evil grin, digging under the baby (close)
  [FB(10), FB(14), T.s2, T.s2 + FB(4), null],                                                                                // cat claps
  [FB(14), FB(18), T.shush, T.shush + FB(4), null],                                                                          // SHH close-up
  [FB(18), FB(22), T.s3, T.s3 + FB(4), null],                                                                                // sorry, palms over the mouth
  [FB(22), FB(27), 15.6 - FB(5), 15.6, null],                                                                                // digs on -> the fall, for real this time
  [FB(27), FB(31), 15.75, 15.75 + FB(4), CC(C([0.8, 1.6, 1.9], [0, 0.05, -0.15], 38), C([0.7, 1.45, 1.7], [0, 0.05, -0.15], 38))],   // tantrum in the hole
  [FB(31), 17.0, 18.9, 18.9 + (17.0 - FB(31)), null],                                                                        // hands up, the cat copies (+ voiceover)
];
export const FILM_DUR = 17.0, VO = { t0: 15.0, text: 'Send this to someone who would do this', words: [[0, 0.36], [0.36, 0.56], [0.56, 0.76], [0.76, 1.04], [1.04, 1.2], [1.2, 1.36], [1.36, 1.52], [1.52, 1.88]] };
const FRAMES = Math.round(FILM_DUR * FPS);
function edit(t) {
  let e = EDL[0]; for (const x of EDL) if (t >= x[0] - 1e-6) e = x;
  const u = clamp((t - e[0]) / (e[1] - e[0])), s = lerp(e[2], e[3], u);
  return { s, u, cam: e[4] ? (() => { const a = e[4][0], b = e[4][1], k = smooth(u); return { pos: a.pos.map((v, i) => lerp(v, b.pos[i], k)), target: a.target.map((v, i) => lerp(v, b.target[i], k)), fov: lerp(a.fov, b.fov, k) }; })() : null, rewind: e[2] > e[3] };
}

// opening title: big, on screen from frame 1 (no fade in), meme style
const CAP_T1 = FB(10);
function topCaption(t) {
  const k = 1 - smooth(seg(t, CAP_T1 - 0.2, CAP_T1)); if (k <= 0) return;
  g2.save(); g2.globalAlpha = k; g2.translate(540, 165);
  g2.textAlign = 'center'; g2.lineJoin = 'round'; g2.font = '900 86px "Segoe UI", Arial, sans-serif';
  g2.lineWidth = 18; g2.strokeStyle = '#000'; g2.strokeText("mama i'm a criminal", 0, 0); g2.fillStyle = '#fff'; g2.fillText("mama i'm a criminal", 0, 0);
  g2.restore();
}
// rewind look: dimmed, scanlines, a "<<" badge
function rewindFx(u) {
  g2.fillStyle = 'rgba(20,30,60,0.25)'; g2.fillRect(0, 0, 1080, 1920);
  g2.fillStyle = 'rgba(255,255,255,0.10)'; for (let y = (u * 400) % 24; y < 1920; y += 24) g2.fillRect(0, y, 1080, 6);
  g2.font = '900 120px "Segoe UI", Arial, sans-serif'; g2.textAlign = 'left'; g2.lineWidth = 14; g2.strokeStyle = '#000'; g2.strokeText('\u25C0\u25C0', 70, 1660); g2.fillStyle = '#fff'; g2.fillText('\u25C0\u25C0', 70, 1660);
}
// voiceover captions: word by word, white, key words yellow, bottom band
function voCaption(t) {
  const a = t - VO.t0; if (a < -0.05 || a > 2.3) return;
  const ws = VO.text.split(' '), key = new Set(['someone', 'this']);
  const shown = ws.filter((_, i) => a >= VO.words[i][0] - 0.03);
  if (!shown.length) return;
  g2.save(); g2.textAlign = 'center'; g2.lineJoin = 'round'; g2.font = '96px Anton';
  const lines = [shown.slice(0, 4), shown.slice(4)].filter((l) => l.length);
  lines.forEach((l, li) => {
    const y = 1420 + li * 115, full = l.join(' ').toUpperCase(), wFull = g2.measureText(full).width; let x = 540 - wFull / 2;
    l.forEach((w, wi) => { const txt = w.toUpperCase() + (wi < l.length - 1 ? ' ' : ''), ww = g2.measureText(txt).width; g2.textAlign = 'left';
      g2.lineWidth = 16; g2.strokeStyle = '#000'; g2.strokeText(txt, x, y); g2.fillStyle = key.has(w) && li === 1 ? '#ffd23f' : key.has(w) && w === 'someone' ? '#ffd23f' : '#fff'; g2.fillText(txt, x, y); x += ww; });
  });
  g2.restore();
}

function draw(i) {
  const t = i / FPS, ed = edit(t), s = ed.s;   // t = film time, s = story time
  CLOCK.t = s; updateNature(s);
  park.dig(digAmount(s));
  heroAt(s); babyAt(s); clumpsAt(s); collapseFx(s);
  const c = window.DBG_CAM ?? ed.cam ?? camAt(s);   // DBG_CAM: inspection only (set from the console)
  cat.show(catFrame(s) / 30 + 1e-4, new THREE.Vector3(...c.pos));
  if (s < T.s2 || (s >= T.s4 && s < T.s6)) cat.group.visible = false;   // the cat is only in the side shots
  const sh = landShake(s), n = Math.floor(s * 30); lookFrom(camera, [c.pos[0] + (hash(n, 7) - 0.5) * sh * 2, c.pos[1] + (hash(n, 8) - 0.5) * sh * 2, c.pos[2]], c.target, c.fov);
  aimKey(stage, new THREE.Vector3(-0.3, 0.3, -0.5), 8);
  renderer.render(scene, camera);
  g2.setTransform(1, 0, 0, 1, 0, 0); g2.drawImage(gl, 0, 0, W, H);
  g2.save(); g2.scale(SCALE, SCALE); if (ed.rewind) rewindFx(ed.u); topCaption(t); voCaption(t); g2.restore();
}

window.renderOut = (t) => draw(Math.min(FRAMES - 1, Math.round(t * FPS)));
window.VH_SCENES = [
  { name: 'Hook: the fall', t0: 0, t1: FB(3) }, { name: 'Rewind', t0: FB(3), t1: FB(4) }, { name: 'Digging', t0: FB(4), t1: FB(10) }, { name: 'Cat claps', t0: FB(10), t1: FB(14) },
  { name: 'Shush', t0: FB(14), t1: FB(18) }, { name: 'Sorry', t0: FB(18), t1: FB(22) }, { name: 'The fall', t0: FB(22), t1: FB(27) }, { name: 'Crying', t0: FB(27), t1: FB(31) }, { name: 'Hands up + send this', t0: FB(31), t1: FILM_DUR },
];
window.EP_T = T; window.EP = { hero, baby, KNEEL, turnToCat, BABY_POSES, THREE };   // inspection / pose solving from the console
window.renderOut(0);
window.READY = true;
