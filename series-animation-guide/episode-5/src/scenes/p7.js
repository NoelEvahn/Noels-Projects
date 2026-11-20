// P7 · OUTSIDE THE UNIVERSE (story 68.4-82.8): black void, the universe-ball, the silhouette hero, tricks, dribble + steps, THE DUNK, drop and dive.
import { THREE, makeHero, P, POSES, FACES, clamp, smooth, lerp, easeOutBack, easeOutCubic, cam, orbit, mixCam, seg, hash, glowPoints, rng, mat, add, sph } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { universeBall, hoop, shockwave, floorRings, voidFloor, silhouette, cosmicWeb } from '../../../assets/library/fx/dunk.js';
import { makeGalaxy, makeEarth } from '../../../assets/library/props/world.js';
import { roofWithHole } from '../../../assets/library/sets/livingroom.js';

const RIM = new THREE.Vector3(0, 3.05, 0.387);
const PLANT = [-1.25, 0, 1.75];
// dribble contacts and steps (BRIEF §6)
const DRIB = [76.4, 77.2, 78.0, 78.8], STEPS = [76.8, 77.6, 78.4, 79.2];
// action clock (video t -> action seconds) for the jump
const AK = [[79.2, 0], [79.4, 0.16], [79.8, 0.24], [80.0, 0.40]];
const actionAt = (t) => { if (t <= 79.2) return t - 79.2; if (t >= 80.0) return 0.40 + (t - 80.0); for (let i = 0; i < 3; i++) if (t <= AK[i + 1][0]) return lerp(AK[i][1], AK[i + 1][1], (t - AK[i][0]) / (AK[i + 1][0] - AK[i][0])); return 0.4; };
// hero x along the dribble run (76.0 -> 79.2), eased steps
const runX = (t) => { const xs = [-6.6, -6.6, -5.0, -3.6, -2.3, PLANT[0]]; const ts = [70, 76.4, 76.8, 77.6, 78.4, 79.2]; if (t <= ts[1]) return xs[0]; for (let i = 1; i < ts.length - 1; i++) if (t <= ts[i + 1]) return lerp(xs[i], xs[i + 1], smooth((t - ts[i]) / (ts[i + 1] - ts[i])) * 0.5 + (t - ts[i]) / (ts[i + 1] - ts[i]) * 0.5); return xs[xs.length - 1]; };

export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#000000', '#05060c'], ground: null, hemiI: 0.06, keyI: 0.0, fillI: 0.05, rimI: 0.25, rimC: 0x6a8cff, env: 0 });
    const scene = stage.scene; stage.key.castShadow = false;
    const floor = voidFloor(400); scene.add(floor);
    // soft pool of ball light on the floor (additive radial disc)
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { k: { value: 1 } },
      vertexShader: 'varying vec2 u; void main(){ u = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform float k; varying vec2 u; void main(){ float r = length(u); gl_FragColor = vec4(vec3(1.0,0.55,0.22) * exp(-r*r*4.0) * 0.55 * k, 1.0); }' }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.006; scene.add(pool);
    // faint distant dust so the void has depth
    const r = rng(77), n = 500, dp = new Float32Array(n * 3), dc = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = r.range(30, 160); dp.set([Math.cos(a) * d, r.range(0.5, 60), Math.sin(a) * d], i * 3); const k = r.range(0.08, 0.3); dc.set([k * 0.8, k * 0.85, k], i * 3); }
    scene.add(glowPoints(dp, dc, { size: 2.0, attenuate: false }));
    const hero = makeHero(scene); const sil = silhouette(hero.root);
    const ball = universeBall(0.12, { light: 5 }); scene.add(ball);
    const hp = hoop(); scene.add(hp);
    const wave = shockwave({ maxR: 40, dur: 0.8 }); wave.position.set(0, 0, 0.4); scene.add(wave);
    const evts = [...DRIB.map((t) => ({ t, x: 0, z: 0, kind: 'ball' })), ...STEPS.map((t) => ({ t, x: 0, z: 0, kind: 'foot', s: 0.7 })), { t: 80.95, x: -0.2, z: 1.2, s: 2.2, life: 0.6 }, { t: 81.6, x: 0.4, z: 2.6, s: 1.2 }];
    const rings = floorRings(evts, { max: 10 }); scene.add(rings);
    // the dive-back ladder (shot 34, 82.0-82.8): its own scene (web -> galaxy + Earth -> the roof with its hole)
    const L = new THREE.Scene(); L.background = new THREE.Color(0x000000);
    L.add(new THREE.HemisphereLight(0xdfeeff, 0x445566, 1.2)); const lk = new THREE.DirectionalLight(0xfff0d6, 2.4); lk.position.set(5, 8, 6); L.add(lk);
    const web = cosmicWeb(30, 9000, 44); L.add(web);
    const gal = makeGalaxy(3, 6000, 40, 8); gal.position.set(0, 0, -260); gal.rotation.x = 1.0; L.add(gal);
    const earth = makeEarth(6); earth.position.set(0, 0, -400); L.add(earth);
    const roof = roofWithHole(); roof.position.set(0, -2, -700); L.add(roof);
    const skyBall = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ color: 0x8fd0ff, side: THREE.BackSide })); skyBall.position.copy(roof.position); L.add(skyBall);
    return { stage, scene, floor, pool, hero, sil, ball, hp, wave, rings, evts, L, web, gal, earth, roof, skyBall };
  },
  frame(t, S, ctx) {
    const { hero, ball, hp, sil } = S;
    const out = { keyFocus: false };
    let hx = -4.6, hz = 1.6, yaw = Math.PI / 2, y0 = 0;
    let pose = POSES.idle(t), ballPos = null, ballSpin = 0, squash = 1;
    hero.root.visible = true; ball.visible = true;
    // ---------- shots 29-31: void, the ball, tricks
    const BALLHOME = new THREE.Vector3(-4.0, 1.25, 1.6);
    if (t < 76.0) {
      // 68.4-70.8: he walks in from the left to the hovering ball
      const wk = seg(t, 68.4, 70.2); hx = lerp(-7.2, -4.55, smooth(wk)); yaw = Math.PI / 2 - 0.35 * smooth(seg(t, 69.8, 70.6));
      pose = wk < 1 ? { ...POSES.walk(t, 6.5), hx: -0.05 } : POSES.idle(t);
      ballPos = BALLHOME.clone(); ballPos.y += Math.sin(t * 2.2) * 0.04; ballSpin = t * 0.6;
      if (t >= 70.8) {
        // 70.8: finger up (left index), the ball drops onto it and spins up; 72.0 la peace with the right hand
        yaw = Math.PI / 2 - 0.35 - 0.35 * smooth(seg(t, 70.8, 71.4));
        const fin = smooth(seg(t, 70.8, 71.2));
        pose = { ...POSES.idle(t), aLs: 0.2 + 2.6 * fin, aLf: 0.35 * fin, aLe: 0.15, hL: fin > 0.5 ? 'point' : 'relaxed', hx: -0.18 * fin };
        if (t >= 71.8 && t < 73.6) { const k = smooth(seg(t, 71.8, 72.0)) * (1 - smooth(seg(t, 73.2, 73.6))); pose = { ...pose, ...Object.fromEntries(Object.entries(POSES.laPeace(t)).filter(([kk]) => kk.startsWith('aR') || kk === 'hR' || kk === 'wR').map(([kk, v]) => [kk, typeof v === 'number' ? v * k : (k > 0.5 ? v : 'relaxed')])) }; }
      }
      if (t >= 73.6) {
        // tricks 73.6-76.0: finger -> roll across the shoulders -> behind the back -> back to the finger (ball path is authored around the body)
        yaw = Math.PI / 2 - 0.7;
        const u = seg(t, 73.6, 76.0);
        pose = { ...POSES.idle(t), aLs: u < 0.25 ? 2.8 : u < 0.5 ? 1.6 : u < 0.8 ? 0.4 : 2.8 * smooth(seg(u, 0.8, 0.95)), aRs: u > 0.2 && u < 0.5 ? 1.6 : 0.3, aLe: u < 0.5 ? 0.4 : 0.9, aRe: 0.6, hL: u < 0.25 || u > 0.92 ? 'point' : 'open', hR: 'open', lean: u > 0.5 && u < 0.8 ? 0.12 : 0, twist: Math.sin(u * Math.PI * 2) * 0.25, hx: -0.1 };
      }
    } else if (t < 79.2) {
      // ---------- shot 32: dribble and steps
      hx = runX(t); hz = PLANT[2]; yaw = Math.PI / 2;
      const stepPh = ((t - 76.4) / 0.8) * Math.PI * 2;
      pose = t < 76.4 ? { ...POSES.idle(t), aRf: 0.5, aRe: 0.8, hR: 'open' } : { ...POSES.run(t, Math.PI / 0.8 * 2 * 0.5 * 2), lean: 0.22, aRf: 0.45, aRs: 0.2, aRe: 0.7, hR: 'open', bob: Math.abs(Math.sin(stepPh / 2)) * 0.05 };
      if (t > 79.0) pose = { ...pose, ...P.crouch(smooth(seg(t, 79.0, 79.2)) * 0.6) };
    } else {
      // ---------- shot 33-34: the jump (action clock), slam, hang, drop, superhero landing
      const A = actionAt(t);
      yaw = Math.PI / 2 - 0.55 * smooth(seg(A, 0, 0.3));
      if (A < 0.16) { const k = 1 - A / 0.16; hx = PLANT[0]; hz = PLANT[2]; pose = { ...P.crouch(0.6 + 0.4 * Math.sin(Math.PI * A / 0.16)), aRs: 1.0, aRf: 0.8, aRe: 1.2, hR: 'open' }; squash = 1 - 0.15 * Math.sin(Math.PI * clamp(A / 0.16)) * k; }
      else if (A < 0.40) {
        const u = (A - 0.16) / 0.24, ar = Math.sin(Math.PI * Math.min(1, u * 0.85));
        hx = lerp(PLANT[0], -0.55, smooth(u)); hz = lerp(PLANT[2], 1.0, smooth(u)); y0 = 1.75 * Math.sin(Math.PI / 2 * Math.min(1, u * 1.25));
        // ball swings behind the head (u<0.4), then forward over the rim
        const back = 1 - smooth(seg(u, 0.35, 1.0));
        pose = { lLf: 0.6 - 0.5 * u, lRf: -0.2, lLk: 1.1 - 0.6 * u, lRk: 0.5, aRs: 2.7 + 0.3 * back, aRf: 0.5 - 0.6 * back, aRe: 0.9 * back + 0.1, aLs: 1.2, aLf: 0.4, aLe: 0.3, hR: 'open', hL: 'open', lean: -0.25 * back + 0.15 * (1 - back), hx: -0.3, bob: 0 };
      } else if (t < 80.8) {
        // hang from the rim, swinging (both hands up)
        const a = t - 80.0, sw = Math.sin(a * 7) * Math.exp(-a * 1.5) * 0.35;
        hx = -0.42; hz = 0.5 + sw * 0.25; y0 = 3.05 - 1.62 + Math.sin(a * 14) * 0.02;
        pose = { aRs: 2.95, aLs: 2.95, aRf: 0.15, aLf: 0.15, aRe: 0.05, aLe: 0.05, hR: 'grip', hL: 'grip', lLf: 0.3 + sw, lRf: 0.1 + sw, lLk: 0.4, lRk: 0.6, lean: sw * 0.4, hx: -0.15, bob: 0 };
        yaw = Math.PI / 2 + 0.3;
      } else {
        // drop + superhero landing (80.95), one fist on the floor
        const a = t - 80.8; yaw = Math.PI - 0.4;
        const fall = clamp(a / 0.15); hx = lerp(-0.42, -0.3, fall); hz = lerp(0.5, 1.2, fall); y0 = Math.max(0, 1.47 * (1 - fall * fall));
        const land = smooth(seg(t, 80.9, 81.05));
        pose = { ...P.crouch(land), lLf: 1.5 * land, lLk: 2.0 * land, lRf: -0.2 * land, lRk: 1.9 * land, aRf: 1.3 * land, aRs: 0.1, aRe: 0.2, hR: 'fist', aLs: 0.9 * land, aLe: 0.6, lean: 0.45 * land, bob: -0.42 * land, hx: -0.25 * land };
      }
    }
    hero.root.position.set(hx, y0, hz); hero.root.rotation.y = yaw; hero.pose({ ...pose, squash: (pose.squash ?? 1) * squash }); hero.face({ ...FACES.deadpan });
    hero.root.updateMatrixWorld(true);
    // ---------- the ball
    const hand = (side) => { const h = new THREE.Vector3(), e = new THREE.Vector3(); (side === 'L' ? hero.holdL : hero.holdR).getWorldPosition(h); (side === 'L' ? hero.aL.el : hero.aR.el).getWorldPosition(e); return { h, d: h.clone().sub(e).normalize() }; };
    const inHand = (side, off = 0.11) => { const { h, d } = hand(side); return h.clone().addScaledVector(d, off); };
    if (t >= 70.8 && t < 73.6) { const tip = inHand('L', 0.1 + 0.12); const drop = smooth(seg(t, 70.8, 71.3)); ballPos = BALLHOME.clone().lerp(tip, drop); ballSpin = t * 0.6 + Math.max(0, t - 71.0) ** 1.4 * 14; }
    if (t >= 73.6 && t < 76.0) {
      const u = seg(t, 73.6, 76.0), head = new THREE.Vector3(); hero.head.getWorldPosition(head);
      const tipL = inHand('L', 0.22), back = new THREE.Vector3(Math.cos(yaw + Math.PI) * 0.0, 0, 0);
      const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const shoulderPath = (k) => head.clone().addScaledVector(side, lerp(0.32, -0.32, k)).addScaledVector(fwd, -0.18).add(new THREE.Vector3(0, -0.22 + Math.sin(Math.PI * k) * 0.05, 0));
      const waistPath = (k) => { const a = lerp(-Math.PI / 2, Math.PI * 1.5, k); return new THREE.Vector3(hx, 0.82, hz).addScaledVector(side, Math.cos(a) * 0.36).addScaledVector(fwd, Math.sin(a) * 0.32); };
      if (u < 0.2) ballPos = tipL; else if (u < 0.28) ballPos = tipL.clone().lerp(shoulderPath(0), smooth((u - 0.2) / 0.08));
      else if (u < 0.5) ballPos = shoulderPath(smooth((u - 0.28) / 0.22)); else if (u < 0.56) ballPos = shoulderPath(1).lerp(waistPath(0), smooth((u - 0.5) / 0.06));
      else if (u < 0.86) ballPos = waistPath((u - 0.56) / 0.3); else ballPos = waistPath(1).lerp(tipL, smooth((u - 0.86) / 0.1));
      ballSpin = t * 8;
    }
    if (t >= 76.0 && t < 79.2) {
      // dribble: held in the right palm, pushed down 0.2 s before each contact, back in the palm 0.2 s after (parabolic per bounce)
      const palm = inHand('R', 0.12); ballPos = palm; ballSpin = -t * 6;
      if (t < 76.4) ballPos = inHand('L', 0.22).lerp(palm, smooth(seg(t, 76.0, 76.3)));
      for (const c of DRIB) { const a = t - c; if (a > -0.2 && a < 0.2) { const ground = new THREE.Vector3(hx + 0.35, 0.12, hz + 0.18); const k = Math.abs(a) / 0.2; ballPos = ground.clone().lerp(palm, c === 78.8 && a < 0 ? k * k : k * (2 - k)); if (Math.abs(a) < 0.035) squash = 0.8; } }
      if (t > 79.0) ballPos = palm.clone().lerp(inHand('L', 0.12), 0.5);
    }
    if (t >= 79.2) {
      const A = actionAt(t);
      if (A < 0.40) ballPos = inHand('R', 0.12);
      else if (t < 81.2) { // squashed in the net, net whips; hangs there until 81.2
        const a = t - 80.0; ballPos = RIM.clone().add(new THREE.Vector3(0, -0.12 - 0.16 * smooth(a / 0.12), 0)); ballSpin = 0; if (a < 0.1) squash = 0.8 + a * 2;
      } else { // falls out, bounces once at 81.6, then rides to the lens (82.0)
        const a = t - 81.2; const g = 9.8;
        if (t < 81.6) ballPos = new THREE.Vector3(RIM.x + a * 1.0, Math.max(0.12, RIM.y - 0.28 - 0.5 * g * a * a * 1.05), RIM.z + a * 5.5);
        else { const b = t - 81.6; ballPos = new THREE.Vector3(RIM.x + 0.4 + b * 1.2, 0.12 + 5.2 * b - 0.5 * g * b * b, RIM.z + 2.2 + b * 6.0); if (b < 0.04) squash = 0.75; }
        ballSpin = t * 5;
      }
    }
    ball.position.copy(ballPos); ball.rotation.set(0.4, ballSpin, 0.2); ball.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    S.pool.position.set(ballPos.x, 0.006, ballPos.z); S.pool.scale.setScalar(0.8 + ballPos.y * 0.9); S.pool.material.uniforms.k.value = clamp(1.4 / (0.3 + ballPos.y));
    // ---------- hoop, wave, rings, floor ripple
    const a = t - 80.0;
    hp.update(a, { hang: t > 80.0 && t < 80.8 ? 1 : 0 });
    S.wave.set(a);
    S.floor.material.userData.U ??= null; const U = S.floor.userData.U; U.rippleR.value = a < 0 ? -10 : 0.3 + 39.7 * (1 - Math.pow(1 - clamp(a / 0.8), 3)); U.rippleA.value = a < 0 ? 0 : 0.18 * Math.exp(-a * 1.8);
    for (const e of S.evts) if (e.kind) { if (e.kind === 'ball') { e.x = runX(e.t) + 0.35; e.z = PLANT[2] + 0.18; } else { e.x = runX(e.t); e.z = PLANT[2] - 0.15; } }
    S.evts.push(); S.rings.set(t);
    // ---------- cameras
    let c;
    if (t < 70.8) { const u = seg(t, 68.4, 70.8); c = mixCam(cam([-2.2, 1.2, 6.2], [-4.6, 1.15, 1.6], 40), cam([-2.8, 1.2, 5.0], [-4.4, 1.15, 1.6], 38), smooth(u)); }
    else if (t < 73.6) { const u = seg(t, 70.8, 73.6), az = lerp(10, 60, smooth(u)) * Math.PI / 180, d = lerp(4.6, 4.0, smooth(u)); c = cam([hx + Math.sin(az + yaw - Math.PI / 2) * d, 1.5, hz + Math.cos(az + yaw - Math.PI / 2) * d], [hx, 1.6, hz], 40); }
    else if (t < 76.0) { const u = seg(t, 73.6, 76.0); c = mixCam(cam([hx - 1.2, 1.3, hz + 3.9], [hx, 1.35, hz], 42), cam([hx + 0.9, 1.25, hz + 3.8], [hx, 1.3, hz], 42), smooth(u)); }
    else if (t < 79.2) { const u = seg(t, 76.0, 79.2), d = lerp(7.5, 4.2, smooth(u)), az = 30 * Math.PI / 180; c = cam([hx + Math.sin(az) * d + 0.8, lerp(1.0, 0.85, u), hz + Math.cos(az) * d], [hx + 0.9 * (1 - u) + 0.3, 1.0, hz], 42); }
    else if (t < 81.2) {
      const tilt = smooth(seg(t, 79.2, 80.0)), back = a > 0 ? 0.8 * easeOutCubic(clamp(a / 0.5)) : 0;
      c = ctx.hook ? cam([-2.3 - back * 0.4, 1.0, 3.9 + back], [-0.35, 3.0, 0.6], 52) : cam([-2.8 - back * 0.5, 0.4 + 1.0 * smooth(seg(t, 80.1, 80.6)), 5.6 + back], [-0.4, lerp(2.0, 2.75, tilt) - 0.3 * smooth(seg(t, 80.1, 80.6)), 0.6], 58);
      if (a > 0 && a < 0.5) { const s = 0.12 * (1 - a / 0.5), n = Math.floor(t * 30); c.pos = [c.pos[0] + (hash(n, 1) - 0.5) * 2 * s, c.pos[1] + (hash(n, 2) - 0.5) * 2 * s, c.pos[2] + (hash(n, 3) - 0.5) * 2 * s]; }
      if (a > 0) { const p = RIM.clone().add(new THREE.Vector3(0.9, 1.5, 0)); out.plus2Pos = p; }
    } else if (t < 82.0) {
      // follow the ball down, low behind it; 81.6 bounce; 82.0 the ball rides into the lens
      const u = seg(t, 81.2, 82.0), b = ball.position;
      c = cam([b.x - 0.3 + 0.6 * u, lerp(1.6, 0.35, smooth(u)), b.z + lerp(2.6, 0.5, smooth(seg(t, 81.55, 82.0)))], [b.x, b.y, b.z], 50);
    }
    out.cam = c;
    // the dive back home: its own scene
    if (t >= 82.0) {
      const u = seg(t, 82.0, 82.8); out.scene = S.L; hero.root.visible = false;
      S.roof.updateMatrixWorld(true); const hw = S.roof.userData.holeWorld();
      if (t < 82.4) { const k = seg(t, 82.0, 82.4); const z = lerp(36, -24, k); out.cam = cam([0, 0.5, z], [0, 0, z - 30], 64); }
      else if (t < 82.65) { const k = seg(t, 82.4, 82.65); const z = lerp(-120, -385, Math.pow(k, 1.3)); out.cam = cam([0, 1.5, z], [0, 0, z - 40], 60); }
      else { const k = seg(t, 82.65, 82.8); out.cam = cam([hw.x + 0.4, hw.y + lerp(14, 3.2, smooth(k)), hw.z + lerp(4, 1.2, k)], [hw.x, hw.y, hw.z], 58); }
      S.web.rotation.y = u * 0.8; S.gal.rotation.z = u * 0.6; S.earth.rotation.y = u * 0.5;
      S.skyBall.visible = t >= 82.65; S.L.background.set(t >= 82.65 ? 0x8fd0ff : 0x000000);
      out.flash = u < 0.08 ? 0.9 * (1 - u / 0.08) : 0; out.flashColor = '255,200,140';
      out.hideHud = false;
    }
    // the plant / slam flashes
    if (a >= 0 && a < 0.4) { const fr = Math.floor(a * 30 + 1e-6); out.flash = fr < 2 ? 1 : Math.max(0, 1 - (fr - 1) / 10); }
    if (t >= 81.95 && t < 82.0) out.flash = 0.85;
    out.after = (camera) => {
      sil.set(t >= 82.0 ? 0 : 1, ball.position, camera);
      if (out.plus2Pos) { const p = out.plus2Pos.clone().project(camera); out.plus2 = { x: (p.x * 0.5 + 0.5) * 1080, y: (1 - (p.y * 0.5 + 0.5)) * 1920, age: a }; if (out.plus2.y < 620) out.plus2.y = 620; }
    };
    out.voiceY = { hero_deep: 1560 };
    return out;
  },
};
