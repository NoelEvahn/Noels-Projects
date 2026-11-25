// MOTION pack: camera / timing helpers and size-comparison tools.
//   pure maths (no scene objects): cameraShake, shakeCamera, punchZoom, timeRemap, slowMoDip, growthPop, growthPopSquash
//   scene helpers: whipTransition (camera pose + streak overlay), growthBurst (FX at a growing character's feet),
//                  sizeMarker (measuring pole beside a giant), rulerTape (extending tape measure), sizeLadder (real-height silhouettes), curveChart (draws a curve)
// Every function is a pure function of the time you pass in.
import * as THREE from 'three';
import { rng, clamp, smooth, easeOutCubic, easeOutBack, TAU, ph, pulse, fract, hash, pool, glowPool, finish, spindleGeo } from './motion_core.js';
import { rbox } from '../util.js';
import { shockwave, dustBurst, groundCracks } from './motion_blast.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ============================================================ cameraShake
// cameraShake(t, {amp=0.12, freq=17, decay=3.2, start=0, seed=1, rollAmp=0.02, axes=[1,1,0.4]}) -> {x,y,z,roll} offsets (metres / radians) at time t.
// Trauma model: envelope = exp(-decay*age)^2 with a 15 ms attack, noise from three incommensurate sines per axis. Zero before `start`.
export function cameraShake(t, { amp = 0.12, freq = 17, decay = 3.2, start = 0, seed = 1, rollAmp = 0.02, axes = [1, 1, 0.4] } = {}) {
  const a = t - start; if (a < 0) return { x: 0, y: 0, z: 0, roll: 0 };
  const env = Math.exp(-decay * a), e2 = env * env * smooth(a / 0.015);
  const n = (k) => { const p = hash(seed * 17 + k * 3.7) * TAU; return (Math.sin(a * freq + p) * 0.55 + Math.sin(a * freq * 1.93 + p * 1.7) * 0.3 + Math.sin(a * freq * 3.1 + p * 0.6) * 0.15); };
  return { x: amp * e2 * n(0) * axes[0], y: amp * e2 * n(1) * axes[1], z: amp * e2 * n(2) * axes[2], roll: rollAmp * e2 * n(3) };
}
// shakeCamera(cam, {pos, target, fov}, t, opts): places the camera at the base pose plus shake offsets (in camera space) and rolls it.
export function shakeCamera(cam, base, t, opts = {}) {
  const s = cameraShake(t, opts);
  cam.position.set(...base.pos); cam.lookAt(V(...base.target)); if (base.fov) { cam.fov = base.fov; cam.updateProjectionMatrix(); }
  cam.translateX(s.x); cam.translateY(s.y); cam.translateZ(s.z); cam.rotateZ(s.roll); return s;
}

// ============================================================ punchZoom
// punchZoom(t, {t0=0, baseFov=40, punch=-12, inDur=0.05, hold=0.06, outDur=0.4}) -> fov. A fast snap in (negative punch = zoom in), brief hold, soft overshoot back to base.
// Pass an array of t0 values to stack beats (beat-synced zooms): punchZoom(t, {t0: [1, 1.5, 2]}).
export function punchZoom(t, { t0 = 0, baseFov = 40, punch = -12, inDur = 0.05, hold = 0.06, outDur = 0.4 } = {}) {
  const one = (s) => { const a = t - s; if (a < 0) return 0; if (a < inDur) return 1 - Math.pow(1 - a / inDur, 3); if (a < inDur + hold) return 1; const u = clamp((a - inDur - hold) / outDur); return (1 - smooth(u)) - 0.12 * Math.sin(u * Math.PI) * (1 - u); };
  const list = Array.isArray(t0) ? t0 : [t0]; let k = 0; for (const s of list) k += one(s);
  return baseFov + punch * k;
}

// ============================================================ timeRemap
// timeRemap([{t, speed}, ...]) -> fn(realT) = content time. Speed is eased (smoothstep) between keys, so speed ramps are smooth. fn.speed(realT), fn.total.
// Example: timeRemap([{t:0,speed:1},{t:1.0,speed:1},{t:1.15,speed:0.12},{t:1.9,speed:0.12},{t:2.25,speed:1}]) = a slow-motion dip at t=1.
export function timeRemap(keys, { step = 1 / 240, extra = 10 } = {}) {
  const K = [...keys].sort((a, b) => a.t - b.t);
  const speed = (t) => { if (t <= K[0].t) return K[0].speed; for (let i = 1; i < K.length; i++) if (t <= K[i].t) { const u = (t - K[i - 1].t) / Math.max(1e-6, K[i].t - K[i - 1].t); return K[i - 1].speed + (K[i].speed - K[i - 1].speed) * smooth(u); } return K[K.length - 1].speed; };
  const end = K[K.length - 1].t + extra, N = Math.ceil(end / step), tab = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) tab[i] = tab[i - 1] + 0.5 * (speed((i - 1) * step) + speed(i * step)) * step;
  const fn = (t) => { if (t <= 0) return t * K[0].speed; const f = t / step, i = Math.min(N - 1, Math.floor(f)); if (i >= N - 1 && f >= N) return tab[N] + (t - N * step) * K[K.length - 1].speed; return tab[i] + (tab[i + 1] - tab[i]) * (f - i); };
  fn.speed = speed; fn.total = tab[N]; return fn;
}
// slowMoDip({at, slow=0.12, rampIn=0.1, hold=0.6, rampOut=0.35}): convenience: normal speed, dip to `slow` at `at`, ramp back.
export function slowMoDip({ at = 1, slow = 0.12, rampIn = 0.1, hold = 0.6, rampOut = 0.35 } = {}) {
  return timeRemap([{ t: 0, speed: 1 }, { t: at, speed: 1 }, { t: at + rampIn, speed: slow }, { t: at + rampIn + hold, speed: slow }, { t: at + rampIn + hold + rampOut, speed: 1 }]);
}

// ============================================================ growthPop
// growthPop(t, {t0=0, from=1, to=2, dur=0.7, anticipate=0.08, wobble=1.2}) -> uniform scale for a character that grows: tiny squat (anticipation), fast burst, springy overshoot, settle.
export function growthPop(t, { t0 = 0, from = 1, to = 2, dur = 0.7, anticipate = 0.08, wobble = 1.2, antDur = 0.14 } = {}) {
  const a = t - t0; if (a <= 0) return from; if (a < antDur) return from * (1 - anticipate * Math.sin(a / antDur * Math.PI));
  const u = (a - antDur) / dur; return to + (from - to) * Math.exp(-5.5 * u) * Math.cos(TAU * wobble * u);
}
// growthPopSquash: same curve plus squash and stretch: {s, sx, sy, sz} (apply as scale = [sx, sy, sz]; volume-ish preserving).
export function growthPopSquash(t, o = {}) {
  const s = growthPop(t, o), e = 1e-3, v = (growthPop(t + e, o) - growthPop(t - e, o)) / (2 * e), k = clamp(v / Math.max(0.2, (o.to ?? 2) - (o.from ?? 1)) * 0.06, -0.3, 0.3);
  return { s, sx: s * (1 - k * 0.55), sy: s * (1 + k), sz: s * (1 - k * 0.55) };
}

// ============================================================ growthBurst
// growthBurst({radius=3}) .set(age): effects at a character's feet while it grows: ground shockwave ring, dust ring, glowing cracks, 4-point star glints flying out.
export function growthBurst({ radius = 3, seed = 9 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const sw = shockwave({ mode: 'ground', radius: radius * 1.6, height: radius * 0.25, dur: 0.8 }), du = dustBurst({ radius, count: 22, life: 1.2, seed }), cr = groundCracks({ radius: radius * 0.9, glow: true, lava: 0xffc23a, seed, arms: 7, dur: 0.5 });
  const NS = 14, st = glowPool(NS, 'star'), P = Array.from({ length: NS }, () => ({ a: r() * TAU, v: r.range(2, 5) * radius / 3, up: r.range(1.5, 4) * radius / 3, s: r.range(0.25, 0.5) * radius / 3, d: r() * 0.1 }));
  g.add(sw, du, cr, st);
  const set = (age) => {
    sw.set(age); du.set(age); cr.set(age);
    for (let i = 0; i < NS; i++) { const p = P[i], a = age - p.d; if (a < 0 || a > 1.0) { st.hide(i); continue; } const k = a / 1.0, y = 0.2 + p.up * a - 4.9 * a * a * 0.6; st.dot(i, Math.cos(p.a) * p.v * a, Math.max(0.05, y), Math.sin(p.a) * p.v * a, p.s * (1 - k) * 2.5, 2.2 * (1 - k), 1.8 * (1 - k), 0.7 * (1 - k)); }
    st.flush();
  };
  return finish(g, set, { duration: 1.4, sizeM: radius * 3.2 });
}

// ============================================================ whipTransition
// whipTransition({t0=0, dur=0.4, yaw=1.4, fovKick=16, roll=0.1}) -> {pose(t, A, B), blur(t), cutT, overlay}. pose(): camera A whips sideways away (accelerating), at cutT the shot swaps to B, B whips in and settles.
// A, B = {pos:[x,y,z], target:[x,y,z], fov}. Returns {pos, target, fov, roll}. overlay is a camera-relative group of horizontal speed bands: add it to the scene and call overlay.set(t, camera).
export function whipTransition({ t0 = 0, dur = 0.4, yaw = 1.4, fovKick = 16, roll = 0.1, bands = 18, seed = 6 } = {}) {
  const cutT = t0 + dur / 2, blur = (t) => { const u = clamp((t - t0) / dur); return u <= 0 || u >= 1 ? 0 : Math.pow(Math.sin(u * Math.PI), 0.8); };
  const rot = (P, Tg, ang) => { const d = V(...Tg).sub(V(...P)); d.applyAxisAngle(V(0, 1, 0), ang); return V(...P).add(d).toArray(); };
  const pose = (t, A, B) => {
    const u = clamp((t - t0) / dur), first = u < 0.5, base = first ? A : B;
    const ang = u <= 0 || u >= 1 ? 0 : first ? yaw * Math.pow(u * 2, 2.2) : -yaw * Math.pow(1 - (u - 0.5) * 2, 2.2);
    return { pos: base.pos, target: rot(base.pos, base.target, ang), fov: (base.fov ?? 40) + fovKick * Math.sin(Math.PI * u) * (u > 0 && u < 1 ? 1 : 0), roll: roll * Math.sin(Math.PI * u) * Math.sign(ang || 1) };
  };
  const g = new THREE.Group(), r = rng(seed), m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, fog: false });
  const pl = pool(spindleGeo(), m, bands); pl.renderOrder = 998; g.add(pl);
  const B = Array.from({ length: bands }, (_, i) => ({ y: (i + r.range(0.1, 0.9)) / bands * 2 - 1, len: r.range(0.9, 2.2), th: r.range(0.01, 0.045), sp: r.range(2.5, 5), ph: r() }));
  const set = (t, cam) => {
    const b = blur(t); g.visible = b > 0.02; if (!g.visible || !cam) return; cam.updateMatrixWorld(true); cam.matrixWorld.decompose(g.position, g.quaternion, g.scale); g.scale.set(1, 1, 1);
    const z = 2, halfH = z * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), halfW = halfH * (cam.aspect || 0.75); m.opacity = 0.55 * b;
    for (let i = 0; i < bands; i++) { const p = B[i], x = (fract(t * p.sp + p.ph) * 2 - 1) * halfW * 1.6, len = p.len * halfW * b; pl.put(i, x, p.y * halfH, -z, len, 0, 0, 0, p.th * halfH, p.th * halfH); }
    pl.flush();
  };
  return { pose, blur, cutT, overlay: finish(g, set, { loop: true }), dur, t0 };
}

// ============================================================ glyph labels (atlas, no per-frame textures)
const CHARS = ' 0123456789.,mMkx+-%ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let _atlas = null;
function atlas() {
  if (_atlas) return _atlas; const cw = 56, ch = 80, c = document.createElement('canvas'); c.width = cw * CHARS.length; c.height = ch;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.font = `400 ${ch * 0.86}px Anton, Impact, "Arial Narrow", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < CHARS.length; i++) g.fillText(CHARS[i], i * cw + cw / 2, ch * 0.54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; _atlas = { tex: t, n: CHARS.length, ratio: cw / ch }; return _atlas;
}
// glyphLabel(slots, height, color): row of quads sharing one atlas; .text('12.5 M') swaps glyph UVs (cheap, any number of times). Width = slots * height * ratio.
export function glyphLabel(slots = 6, height = 0.5, color = 0xffffff) {
  const A = atlas(), g = new THREE.Group(), w = height * A.ratio, m = new THREE.MeshBasicMaterial({ map: A.tex, color, transparent: true, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const quads = [];
  for (let i = 0; i < slots; i++) { const geo = new THREE.PlaneGeometry(w * 1.02, height), q = new THREE.Mesh(geo, m); q.position.x = (i - (slots - 1) / 2) * w * 0.82; g.add(q); quads.push(geo); }
  g.text = (str, align = 'center') => {
    str = String(str).toUpperCase(); const pad = Math.max(0, slots - str.length), s = align === 'left' ? str : align === 'right' ? ' '.repeat(pad) + str : ' '.repeat(Math.floor(pad / 2)) + str;
    quads.forEach((geo, i) => { const k = Math.max(0, CHARS.indexOf(s[i] ?? ' ')), uv = geo.attributes.uv; for (let v = 0; v < 4; v++) uv.setX(v, (k + (v % 2)) / A.n); uv.needsUpdate = true; });
    return g;
  };
  g.widthM = slots * w * 0.82; g.text(''); return g;
}
const nice = (x) => { const ns = [1, 2, 2.5, 5, 10]; const e = Math.pow(10, Math.floor(Math.log10(x))); return e * (ns.find((n) => n * e >= x) ?? 10); };
const fmt = (h, unit = 'M') => (h < 10 ? h.toFixed(1) : h < 1000 ? h.toFixed(0) : (h / 1000).toFixed(2)) + (h >= 1000 ? ' KM' : ' ' + unit);

// ============================================================ sizeMarker
// sizeMarker({heightM=10, label='GIANT', maxM, side=1, ref=true}) .set(h, t=0): a banded measuring pole with metre numbers and a flag that rides at height h reading "9.4 M" (plus a dashed height line to the giant's head).
// Stand it beside a growing character: marker.set(characterHeightMetres, t). Auto-scales ticks (1, 2, 2.5, 5, 10 ... m). Pole base at y=0, ref=true adds a 1.8 m person silhouette for scale.
export function sizeMarker({ heightM = 10, label = 'GIANT', maxM = null, side = 1, ref = true, reach = null, color = 0xffd23f, color2 = 0x1b2a5c } = {}) {
  const g = new THREE.Group(), MAX = maxM ?? heightM * 1.25, step = nice(MAX / 8), nb = Math.ceil(MAX / step), tall = nb * step, th = Math.max(0.05, tall * 0.012);
  const bands = pool(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), nb); const cA = new THREE.Color(color), cB = new THREE.Color(color2);
  for (let i = 0; i < nb; i++) { bands.put(i, 0, (i + 0.5) * step, 0, th * 2, 0, 0, 0, step, th * 2); bands.tint(i, i % 2 ? cB : cA); } bands.flush(); g.add(bands);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(th * 1.6, 12, 8), new THREE.MeshStandardMaterial({ color: 0xe5483a, roughness: 0.4 })); cap.position.y = tall + th; g.add(cap);
  const base = new THREE.Mesh(rbox(th * 9, th * 1.6, th * 9, th * 0.5), new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.6 })); base.position.y = th * 0.8; base.castShadow = true; g.add(base);
  const lh = Math.min(step * 0.55, tall * 0.045), tk = pool(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), nb + 1);
  for (let i = 0; i <= nb; i++) { const major = i % 2 === 0; tk.put(i, side * th * (major ? 5.5 : 3.5), i * step, th * 1.1, th * (major ? 7 : 4.5), 0, 0, 0, th * 0.7, th * 0.5); tk.tint(i, 1, 1, 1); } tk.flush(); g.add(tk);
  for (let i = 0; i <= nb; i += 2) { const L = glyphLabel(5, lh, 0xffffff); L.text(i === 0 ? '0' : (i * step >= 1000 ? (i * step / 1000) + 'K' : String(i * step)), side > 0 ? 'left' : 'right'); L.position.set(side * (th * 9.5 + L.widthM / 2), i * step, th * 1.2); g.add(L); }
  const flag = new THREE.Group(); g.add(flag);
  const fw = Math.max(lh * 7.2, 1), fh = lh * 2.9, board = new THREE.Mesh(rbox(fw, fh, th * 1.5, fh * 0.2), new THREE.MeshStandardMaterial({ color: 0xe5483a, roughness: 0.45 })); board.position.set(side * (th * 3 + fw / 2), 0, 0); board.castShadow = true; flag.add(board);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(fh * 0.5, fh * 0.6, 4).rotateZ(-side * Math.PI / 2), board.material); arrow.position.set(side * (th * 3 - fh * 0.1), 0, 0); arrow.rotation.z = side > 0 ? Math.PI / 2 : -Math.PI / 2; flag.add(arrow);
  const val = glyphLabel(7, lh * 1.25, 0xffffff), name = glyphLabel(8, lh * 0.72, 0xffe9a0); val.position.set(board.position.x, -fh * 0.1, th * 0.9); name.position.set(board.position.x, fh * 0.32, th * 0.9); flag.add(val, name); name.text(label);
  const RC = reach ?? tall * 0.45, nd = 18, dash = pool(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xff5a4a, toneMapped: false }), nd); g.add(dash);
  if (ref) { const p = new THREE.Group(), pm = new THREE.MeshStandardMaterial({ color: 0x6a7a96, roughness: 0.7 }); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 6, 12), pm); b.position.y = 0.75; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), pm); hd.position.y = 1.58; p.add(b, hd); p.position.set(-side * (th * 12 + 0.5), 0, 0.2); p.userData.realHeightM = 1.8; g.add(p); }
  const set = (h, t = 0) => {
    h = Math.max(0, Math.min(h, tall)); const pop = 1 + 0.06 * Math.sin(t * 7);
    flag.position.set(0, h, th * 1.3); flag.scale.setScalar(pop); val.text(fmt(h));
    for (let i = 0; i < nd; i++) { const u = fract(i / nd + t * 0.8), len = RC / nd * 0.55, x = side * (th * 6 + fw + RC * 0.1 + u * RC); dash.put(i, x, h, 0, len, 0, 0, 0, th * 0.9 * Math.sin(u * Math.PI) + 0.001, th * 0.5); }
    dash.flush();
  };
  set(heightM);
  g.userData.realHeightM = tall; g.userData.stepM = step;
  return finish(g, set, { loop: true, sizeM: tall });
}

// ============================================================ rulerTape
// rulerTape({length=10, vertical=false, step=null}) .set(reveal, t=0): a yellow tape measure that rolls out to `reveal` metres (0..length); black ticks every 1/10 step, taller at half-steps, numbered majors; hooked end tab.
export function rulerTape({ length = 10, vertical = false, step = null, thick = null } = {}) {
  const g = new THREE.Group(), st = step ?? nice(length / 8), W = thick ?? Math.max(0.12, length * 0.03), nt = Math.floor(length / (st / 10)) + 1;
  const root = new THREE.Group(); g.add(root); if (vertical) root.rotation.z = Math.PI / 2;
  const tapeM = new THREE.MeshStandardMaterial({ color: 0xf6c92a, roughness: 0.55 }), tape = new THREE.Mesh(new THREE.BoxGeometry(1, W, W * 0.04), tapeM); tape.castShadow = true; root.add(tape);
  const tk = pool(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), nt); root.add(tk); for (let i = 0; i < nt; i++) tk.tint(i, 0.08, 0.08, 0.1);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(W * 0.12, W * 1.5, W * 0.3), new THREE.MeshStandardMaterial({ color: 0xcfd6de, metalness: 0.7, roughness: 0.35 })); root.add(hook);
  const nl = Math.floor(length / st) + 1, labels = []; for (let i = 0; i < nl; i++) { const L = glyphLabel(4, W * 0.34, 0x15151c); L.text(i * st >= 1000 ? (i * st / 1000) + 'K' : String(+(i * st).toFixed(2))); L.position.set(i * st + L.widthM * 0.55, -W * 0.18, W * 0.03); if (vertical) { /* labels stay readable when the whole tape is rotated: rotate them back */ } root.add(L); labels.push(L); }
  const set = (reveal) => {
    const R = Math.max(0.001, Math.min(length, reveal)); tape.scale.x = R; tape.position.x = R / 2; hook.position.x = R + W * 0.06;
    for (let i = 0; i < nt; i++) { const x = i * st / 10, vis = x <= R + 1e-6, major = i % 10 === 0, half = i % 5 === 0; if (!vis) { tk.hide(i); continue; } const hh = W * (major ? 0.38 : half ? 0.26 : 0.16); tk.put(i, x, W / 2 - hh / 2, W * 0.025, Math.max(W * 0.014, st * 0.012), 0, 0, 0, hh, W * 0.02); }
    tk.flush(); labels.forEach((L, i) => { L.visible = i * st <= R; });
  };
  set(length);
  g.userData.realWidthM = length;
  return finish(g, set, { sizeM: length });
}

// ============================================================ sizeLadder
// sizeLadder({items:[{kind, h, name}], gap}) .set(t): row of toy silhouettes at their REAL heights (metres) standing on one baseline, each with a name + height tag, pop in one after another and sway.
// kinds: person | house | tree | tower | skyscraper | mountain | giant. Default: person 1.8, house 9, tree 25, tower 96, skyscraper 300. Use as the background size comparison behind a growing character.
export function sizeLadder({ items = null, gap = 0.35, popEvery = 0.22, seed = 4 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const list = items ?? [{ kind: 'person', h: 1.8, name: 'PERSON' }, { kind: 'house', h: 9, name: 'HOUSE' }, { kind: 'tree', h: 25, name: 'TREE' }, { kind: 'tower', h: 96, name: 'BIG TOWER' }, { kind: 'skyscraper', h: 300, name: 'SKYSCRAPER' }];
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
  const build = (it) => {
    const h = it.h, grp = new THREE.Group(); const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; grp.add(o); return o; };
    let w = h * 0.3;
    switch (it.kind) {
      case 'person': w = 0.7; add(new THREE.CapsuleGeometry(h * 0.16, h * 0.42, 6, 14), M(0xe5483a), 0, h * 0.42, 0); add(new THREE.SphereGeometry(h * 0.13, 16, 12), M(0xf2b98f), 0, h * 0.86, 0); add(new THREE.CylinderGeometry(h * 0.07, h * 0.07, h * 0.28, 10), M(0x2f6fd6), 0, h * 0.14, 0); break;
      case 'house': w = h * 1.1; add(rbox(w, h * 0.6, w * 0.8, h * 0.03), M(0xf6ecd5), 0, h * 0.3, 0); add(new THREE.ConeGeometry(w * 0.78, h * 0.4, 4), M(0xd9533f), 0, h * 0.8, 0, 0, Math.PI / 4, 0); add(box(w * 0.2, h * 0.32, 0.05 * h), M(0x6a4a30), 0, h * 0.16, w * 0.41); break;
      case 'tree': w = h * 0.5; add(new THREE.CylinderGeometry(h * 0.05, h * 0.07, h * 0.4, 10), M(0x6a4a30), 0, h * 0.2, 0); add(new THREE.SphereGeometry(h * 0.3, 16, 12), M(0x3f9f55), 0, h * 0.62, 0); add(new THREE.SphereGeometry(h * 0.2, 14, 10), M(0x4fb066), h * 0.12, h * 0.85, 0); break;
      case 'tower': w = h * 0.16; add(new THREE.CylinderGeometry(w * 0.12, w * 0.5, h * 0.78, 12), M(0xc8d0dc), 0, h * 0.39, 0); add(new THREE.SphereGeometry(w * 0.34, 14, 10), M(0xe5483a), 0, h * 0.78, 0); add(new THREE.ConeGeometry(w * 0.1, h * 0.22, 10), M(0xe5483a), 0, h * 0.89, 0); break;
      case 'skyscraper': w = h * 0.14; add(rbox(w, h * 0.92, w, w * 0.05), M(0x5aa0d6, { metalness: 0.2, roughness: 0.3 }), 0, h * 0.46, 0); add(rbox(w * 0.6, h * 0.06, w * 0.6, w * 0.03), M(0x8fb8e0), 0, h * 0.95, 0); add(new THREE.CylinderGeometry(w * 0.02, w * 0.02, h * 0.1, 6), M(0xe5483a), 0, h * 1.02 - h * 0.05, 0); break;
      case 'mountain': w = h * 1.4; add(new THREE.ConeGeometry(w * 0.5, h, 6), M(0x8a8f9c), 0, h / 2, 0); add(new THREE.ConeGeometry(w * 0.16, h * 0.28, 6), M(0xffffff), 0, h * 0.86, 0); break;
      default: w = h * 0.4; add(new THREE.CapsuleGeometry(h * 0.18, h * 0.4, 6, 14), M(0xff8a2b), 0, h * 0.45, 0); add(new THREE.SphereGeometry(h * 0.16, 16, 12), M(0xf2b98f), 0, h * 0.87, 0);
    }
    return { grp, w };
  };
  const maxH = Math.max(...list.map((i) => i.h)), lh = Math.max(0.5, maxH * 0.03); let x = 0; const E = [];
  const box = (a, b, c) => new THREE.BoxGeometry(a, b, c);
  list.forEach((it, i) => {
    const { grp, w } = build(it); const wrap = new THREE.Group(); x += w / 2; wrap.position.x = x; wrap.add(grp); g.add(wrap);
    const tag = glyphLabel(12, lh, 0xffffff), val = glyphLabel(8, lh * 0.8, 0xffd23f); tag.text(it.name ?? it.kind, 'center'); val.text(fmt(it.h), 'center');
    const bw = Math.max(tag.widthM, val.widthM) + lh, bg = new THREE.Mesh(rbox(bw, lh * 2.5, lh * 0.2, lh * 0.2), new THREE.MeshBasicMaterial({ color: 0x1b2a5c })); const ty = it.h + lh * 2.1; bg.position.set(0, ty, 0.02); tag.position.set(0, ty + lh * 0.55, lh * 0.3); val.position.set(0, ty - lh * 0.5, lh * 0.3); const lab = new THREE.Group(); lab.add(bg, tag, val); wrap.add(lab);
    E.push({ wrap, grp, lab, it, sway: r() * 6, i }); x += w / 2 + maxH * gap * 0.12 + w * 0.15;
  });
  const dash = pool(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }), 60); g.add(dash);
  const set = (t, guideH = null) => {
    for (const e of E) { const a = t - e.i * popEvery, s = a <= 0 ? 0.0001 : 1 + (-1) * Math.exp(-6 * a) * Math.cos(TAU * 1.1 * a); e.wrap.scale.set(1, Math.max(1e-4, s), 1); e.lab.scale.set(1, 1 / Math.max(1e-4, s), 1); e.lab.position.y = 0; e.wrap.visible = a > 0; e.grp.rotation.z = Math.sin(t * 0.8 + e.sway) * 0.01 * (e.it.kind === 'tree' ? 2 : 0); }
    const gh = guideH ?? E[0].it.h; dash.hide(0); for (let i = 0; i < 60; i++) { const xx = i / 60 * (x + 2) - 1; dash.put(i, xx, gh, -0.1, (x + 2) / 60 * 0.5, 0, 0, 0, Math.max(0.03, maxH * 0.002), 0.02); } dash.flush();
  };
  set(10);
  g.userData.realHeightM = maxH; g.userData.widthM = x;
  return finish(g, set, { sizeM: maxH, extra: { heights: list.map((i) => i.h) } });
}

// ============================================================ curveChart (for demos / debugging curves)
// curveChart({fn, t0, t1, y0, y1, w, h, color}) .set(t): a little 3D plot of fn(t) over [t0,t1] with a moving cursor. Used to show the shake / fov / time-remap curves.
export function curveChart({ fn, t0 = 0, t1 = 1, y0 = -1, y1 = 1, w = 4, h = 2.2, color = 0x7cff5a, n = 120 } = {}) {
  const g = new THREE.Group(), board = new THREE.Mesh(rbox(w + 0.3, h + 0.3, 0.06, 0.08), new THREE.MeshStandardMaterial({ color: 0x1b2a5c, roughness: 0.7 })); g.add(board);
  const X = (t) => (t - t0) / (t1 - t0) * w - w / 2, Y = (y) => (y - y0) / (y1 - y0) * h - h / 2, pts = []; for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n; pts.push(V(X(t), Y(fn(t)), 0.05)); }
  const line = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.035, 6), new THREE.MeshBasicMaterial({ color, toneMapped: false })); g.add(line);
  const ax = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, 0.02), new THREE.MeshBasicMaterial({ color: 0x8fa0c8 })); ax.position.set(0, Y(Math.max(y0, Math.min(y1, 0))), 0.04); g.add(ax);
  const cur = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff5a4a, toneMapped: false })); g.add(cur); const cv = new THREE.Mesh(new THREE.BoxGeometry(0.015, h, 0.02), new THREE.MeshBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0.5 })); g.add(cv);
  const set = (t) => { const tc = clamp(t, t0, t1); cur.position.set(X(tc), Y(fn(tc)), 0.07); cv.position.set(X(tc), 0, 0.03); };
  set(t0);
  return finish(g, set, { sizeM: w });
}
