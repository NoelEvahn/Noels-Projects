// MOTION pack: elements and sustained effects. smokePlume, steamVent, fire, lightning, powerUpAura, tornado, rocketExhaust, cometTail, waterSplash, waterRipple.
// Looping ones: fx.update(t) (seamless, any t). One-shots: fx.set(age).
import * as THREE from 'three';
import {
  rng, clamp, smooth, easeOutCubic, TAU, ph, pulse, fract, hash, makeRamp, pool, glowPool, ballistic, finish,
  SPH, BOX, ROCK, spindleGeo, alignX, lambertWhite, basicWhite, glowBasic, fresnelMat, radialMat, mergeGeos,
} from './motion_core.js';
import { groundCracks, sparks } from './motion_blast.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rockMat = () => new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });

// ============================================================ smokePlume
// smokePlume({height=6, width=1, color:'dark'|'grey'|'white'|'brown', wind=[0.6,0,0], count=48, life=5, seed}) .update(t): endless rising column of lit puffs that swell, drift downwind and shrink away.
export function smokePlume({ height = 6, width = 1, color = 'grey', wind = [1.4, 0, 0.2], count = 56, life = 5, seed = 3, billow = 1 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const P = Array.from({ length: count }, (_, j) => ({ off: (j + r() * 0.8) / count, a: r() * TAU, d: r.range(0.2, 1), s: r.range(0.6, 1.5), ph: r() * TAU }));
  const pl = pool(SPH(), lambertWhite(), count, { cast: false }); g.add(pl);
  const ramps = { dark: makeRamp([[0, 0x3a3640], [1, 0x8c8a96]]), grey: makeRamp([[0, 0x8a8a94], [1, 0xc4c4ce]]), white: makeRamp([[0, 0xf4f4fa], [1, 0xdcdce8]]), brown: makeRamp([[0, 0x6a5240], [1, 0xa8927c]]) };
  const ramp = ramps[color] ?? ramps.grey, c = new THREE.Color();
  const set = (t) => {
    for (let j = 0; j < count; j++) {
      const p = P[j], k = fract(t / life + p.off);
      const sz = width * p.s * (0.3 + 1.1 * Math.pow(k, 0.7) * billow) * smooth(k / 0.07) * (1 - smooth((k - 0.62) / 0.38));
      const rise = height * Math.pow(k, 0.85), sp = width * p.d * (0.15 + 0.9 * k);
      pl.put(j, Math.cos(p.a + k * 1.5) * sp + wind[0] * k * k * height * 0.35 + Math.sin(t * 0.9 + p.ph) * width * 0.1 * k, rise + sz * 0.3, Math.sin(p.a + k * 1.5) * sp + wind[2] * k * k * height * 0.35, sz);
      pl.tint(j, ramp(k, c));
    }
    pl.flush();
  };
  set(0);
  return finish(g, set, { loop: true, sizeM: height });
}

// ============================================================ steamVent
// steamVent({power=1, period=3.2}) .update(t): iron pipe with a slowly turning valve wheel that hisses out a jet of white steam in pulses (steam is emitted continuously, the gate opens every `period` s).
export function steamVent({ power = 1, period = 3.2, seed = 4, height = 0.9 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const iron = new THREE.MeshStandardMaterial({ color: 0x5b6672, roughness: 0.5, metalness: 0.5 }), brass = new THREE.MeshStandardMaterial({ color: 0xc89a3a, roughness: 0.35, metalness: 0.7 }), red = new THREE.MeshStandardMaterial({ color: 0xd9433a, roughness: 0.5 });
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
  add(new THREE.CylinderGeometry(0.3, 0.34, 0.14, 24), iron, 0, 0.07, 0);
  add(new THREE.CylinderGeometry(0.13, 0.13, height, 20), iron, 0, height / 2, 0);
  add(new THREE.TorusGeometry(0.15, 0.035, 8, 24), brass, 0, height * 0.3, 0, Math.PI / 2); add(new THREE.TorusGeometry(0.15, 0.035, 8, 24), brass, 0, height * 0.75, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.17, 0.12, 0.1, 20), iron, 0, height + 0.05, 0);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 12), iron, 0.2, height * 0.52, 0, 0, 0, Math.PI / 2);
  const wheel = new THREE.Group(); wheel.position.set(0.36, height * 0.52, 0); g.add(wheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 24), red); rim.rotation.y = Math.PI / 2; wheel.add(rim);
  for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), red); sp.rotation.x = i * Math.PI / 4; wheel.add(sp); }
  const N = 40, P = Array.from({ length: N }, (_, j) => ({ off: (j + r() * 0.8) / N, a: r() * TAU, d: r.range(0.3, 1), s: r.range(0.7, 1.2), bend: r.range(-0.3, 0.6) }));
  const pl = pool(SPH(), lambertWhite(), N); g.add(pl); const life = 1.7, c = new THREE.Color();
  const gate = (te) => { const m = ((te % period) + period) % period; return 0.12 + 0.88 * (m < 1.3 ? Math.sin(Math.min(1, m / 0.25) * Math.PI / 2) * (1 - smooth((m - 0.9) / 0.4)) : 0); };
  const set = (t) => {
    wheel.rotation.x = Math.sin(t * 0.6) * 1.2;
    for (let j = 0; j < N; j++) {
      const p = P[j], k = fract(t / life + p.off), te = t - k * life, gt = gate(te) * power;
      const sz = 0.12 * p.s * (0.5 + 2.6 * Math.pow(k, 0.6)) * smooth(k / 0.06) * (1 - smooth((k - 0.55) / 0.45)) * (0.3 + 0.7 * gt);
      const up = (height + 0.1) + (1.4 + 2.2 * gt) * Math.pow(k, 0.75), sp = 0.1 * p.d + 0.55 * k * p.d * (0.5 + gt * 0.5);
      pl.put(j, Math.cos(p.a) * sp + p.bend * k * k * 1.2, up, Math.sin(p.a) * sp, sz); pl.tint(j, c.setRGB(1, 1, 1).multiplyScalar(1 - 0.12 * k));
    }
    pl.flush();
  };
  set(0);
  return finish(g, set, { loop: true, sizeM: height + 3 });
}

// ============================================================ fire
// fire({radius=0.6, height=1.5, logs=true, light=true, seed}) .update(t): layered flame tongues (red / orange / yellow-white) that lick and sway, rising embers, glow, flickering point light.
export function fire({ radius = 0.6, height = 1.5, logs = true, stones = true, light = true, tongues = 9, embers = 22, seed = 21, smoke = false } = {}) {
  const g = new THREE.Group(), r = rng(seed), R = radius, H = height;
  // teardrop flame geometry with vertex colours (bright base -> deep tip)
  const flameGeo = (c0, c1, c2) => {
    const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; const rr = Math.pow(Math.sin(Math.pow(u, 0.62) * Math.PI), 0.95) * (1 - u * 0.15) * 0.5; pts.push(new THREE.Vector2(Math.max(0.0008, rr), u)); }
    const geo = new THREE.LatheGeometry(pts, 12), p = geo.attributes.position, col = new Float32Array(p.count * 3), a = new THREE.Color(), b = new THREE.Color(), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const u = clamp(p.getY(i)); if (u < 0.5) cc.setRGB(...c0).lerp(a.setRGB(...c1), u / 0.5); else cc.setRGB(...c1).lerp(b.setRGB(...c2), (u - 0.5) / 0.5); col.set([cc.r, cc.g, cc.b], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
  };
  const gOut = flameGeo([1.8, 0.55, 0.08], [1.7, 0.4, 0.04], [0.7, 0.06, 0.02]), gMid = flameGeo([2.4, 1.5, 0.3], [2.2, 1.0, 0.15], [1.4, 0.45, 0.05]), gIn = flameGeo([2.6, 2.4, 1.6], [2.5, 1.9, 0.7], [2.2, 1.2, 0.3]);
  const bm = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const T = [];
  for (let i = 0; i < tongues; i++) {
    const center = i === 0, a = (i - 1) / (tongues - 1) * TAU + r() * 0.5, d = center ? 0 : R * r.range(0.35, 0.8);
    const t = { x: Math.cos(a) * d, z: Math.sin(a) * d, h: (center ? 1 : r.range(0.5, 0.85)) * H, w: (center ? 0.62 : r.range(0.38, 0.55)) * R * 1.6, ph: r() * TAU, sp: r.range(5, 9), lean: Math.cos(a) * 0.12 };
    t.meshes = [[gOut, 1, 1], [gMid, 0.74, 0.8], [gIn, 0.46, 0.55]].map(([geo, sw, sh]) => { const m = new THREE.Mesh(geo, bm); m.userData = { sw, sh }; g.add(m); return m; });
    T.push(t);
  }
  const em = glowPool(embers, 'soft'); g.add(em);
  const E = Array.from({ length: embers }, (_, j) => ({ off: (j + r() * 0.8) / embers, a: r() * TAU, d: r() * R * 0.8, v: r.range(0.7, 1.3), s: r.range(0.03, 0.07) }));
  const gl = glowPool(2, 'soft'); gl.position.y = 0.25; g.add(gl);
  if (logs) {
    const bark = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.95 }), char = new THREE.MeshStandardMaterial({ color: 0x1e1612, roughness: 1, emissive: 0xff4a0a, emissiveIntensity: 0.5 });
    for (let i = 0; i < 4; i++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * R / 0.6, 0.085 * R / 0.6, R * 1.9, 10), i % 2 ? bark : char); lg.rotation.set(Math.PI / 2 - 0.25, (i / 4) * Math.PI + 0.5, 0); lg.rotation.order = 'YXZ'; lg.position.set(0, 0.1 * R / 0.6, 0); lg.castShadow = true; g.add(lg); }
  }
  if (stones) { const rs = pool(ROCK(), rockMat(), 12, { cast: true }); const rr = rng(seed + 1); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; rs.put(i, Math.cos(a) * R * 1.45, 0.07 * R / 0.6, Math.sin(a) * R * 1.45, 0.17 * R / 0.6 * rr.range(0.8, 1.2), 0, a, 0, 0.12 * R / 0.6, 0.15 * R / 0.6); rs.tint(i, 0.22 + 0.14 * rr(), 0.2 + 0.13 * rr(), 0.19 + 0.12 * rr()); } rs.flush(); g.add(rs); }
  let pl = null; if (light) { pl = new THREE.PointLight(0xff8a30, 0, 0, 2); pl.position.y = H * 0.6; g.add(pl); }
  const sm = smoke ? smokePlume({ height: H * 3, width: R * 0.55, color: 'dark', count: 18, life: 4, seed }) : null; if (sm) { sm.position.y = H * 0.7; g.add(sm); }
  const set = (t) => {
    for (const f of T) {
      const fl = 0.78 + 0.22 * Math.sin(t * f.sp + f.ph) + 0.1 * Math.sin(t * f.sp * 2.3 + f.ph * 1.7), sw = 1 + 0.12 * Math.sin(t * f.sp * 1.3 + f.ph);
      for (const m of f.meshes) { const { sw: a, sh: b } = m.userData; m.position.set(f.x, 0.06 * R / 0.6, f.z); m.scale.set(f.w * a * sw, f.h * b * fl, f.w * a * sw); m.rotation.set(0.25 * Math.sin(t * 2.2 + f.ph) * 0.5, 0, f.lean + 0.2 * Math.sin(t * 1.7 + f.ph) + 0.08 * Math.sin(t * 5 + f.ph * 2)); }
    }
    for (let j = 0; j < embers; j++) { const e = E[j], k = fract(t * 0.35 * e.v + e.off), sz = e.s * (1 - k) * (0.6 + 0.4 * Math.sin(t * 20 + j)); const y = 0.25 * H + k * H * 2.2; em.dot(j, Math.cos(e.a + k * 3) * e.d + Math.sin(t * 2 + j) * 0.1 * k, y, Math.sin(e.a + k * 3) * e.d, sz * 2.2, 2 * (1 - k), 0.9 * (1 - k), 0.12 * (1 - k)); }
    em.flush();
    const f0 = 0.9 + 0.1 * Math.sin(t * 13) + 0.06 * Math.sin(t * 31);
    gl.dot(0, 0, H * 0.35, 0, R * 3.2 * f0, 0.5 * f0, 0.2 * f0, 0.03); gl.dot(1, 0, H * 0.2, 0, R * 1.6, 1.0 * f0, 0.6 * f0, 0.1); gl.flush();
    if (pl) pl.intensity = (14 + 40 * R) * f0 * (H / 1.5);
    if (sm) sm.update(t);
  };
  set(0);
  return finish(g, set, { loop: true, sizeM: H });
}

// ============================================================ lightning
// lightning({from, to, seed=1, width=0.12, branches=4, color=0x9fd0ff, light=true}) .set(age[, seed]): jagged bolt (midpoint displacement + branches) that strikes down in 0.07 s, flickers, re-strikes and fades. Pass a new seed to .set to change the shape per strike.
// The bolt is built as continuous tubes (core + two glow shells), so joints never band; rebuilt only when the seed changes.
export function lightning({ from = [0, 12, 0], to = [0, 0, 0], seed = 1, width = 0.12, branches = 4, color = 0x9fd0ff, light = true, segs = 5 } = {}) {
  const g = new THREE.Group(), A = V(...from), B = V(...to), L = A.distanceTo(B);
  const gl = glowPool(2, 'soft'); g.add(gl);
  const sp = sparks({ count: 22, power: 4, dir: [0, 1, 0], spread: 1.3, size: 0.03, color: 'white', loop: true, life: 0.4, floor: 0, seed: seed + 3 }); sp.position.copy(B); g.add(sp);
  let pl = null; if (light) { pl = new THREE.PointLight(color, 0, 0, 2); pl.position.copy(B).add(V(0, 1.5, 0)); g.add(pl); }
  const coreM = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), h1M = glowBasic({ color, opacity: 0.45 }), h2M = glowBasic({ color, opacity: 0.18 });
  const bolt = new THREE.Group(); g.add(bolt);
  let paths = [], builtSeed = null;
  const perp = (d) => { const a = Math.abs(d.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0); const u = a.cross(d).normalize(), v = d.clone().cross(u).normalize(); return [u, v]; };
  const jag = (p0, p1, rnd, level, amp, out) => {
    if (level === 0) { out.push(p1); return; }
    const m = p0.clone().add(p1).multiplyScalar(0.5), d = p1.clone().sub(p0), len = d.length(); d.normalize(); const [u, v] = perp(d);
    m.addScaledVector(u, rnd.range(-1, 1) * amp * len).addScaledVector(v, rnd.range(-1, 1) * amp * len);
    jag(p0, m, rnd, level - 1, amp * 0.62, out); jag(m, p1, rnd, level - 1, amp * 0.62, out);
  };
  // continuous prism tube along a polyline; radius(i) per point; returns BufferGeometry with `sides` faces per ring
  const tube = (pts, rad, sides = 6) => {
    const pos = [], idx = [], n = pts.length, t = new THREE.Vector3(), ref = V(0, 1, 0);
    for (let i = 0; i < n; i++) {
      t.copy(pts[Math.min(n - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize();
      const u = (Math.abs(t.y) > 0.95 ? V(1, 0, 0) : ref).clone().cross(t).normalize(), v = t.clone().cross(u).normalize(), r = rad(i);
      for (let k = 0; k < sides; k++) { const a = k / sides * TAU; pos.push(pts[i].x + (u.x * Math.cos(a) + v.x * Math.sin(a)) * r, pts[i].y + (u.y * Math.cos(a) + v.y * Math.sin(a)) * r, pts[i].z + (u.z * Math.cos(a) + v.z * Math.sin(a)) * r); }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) { const a = i * sides + k, b = i * sides + (k + 1) % sides, c = (i + 1) * sides + k, d = (i + 1) * sides + (k + 1) % sides; idx.push(a, b, c, b, d, c); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.userData.sides = sides; geo.userData.n = n; return geo;
  };
  function build(sd) {
    for (const p of paths) { p.meshes.forEach((m) => { bolt.remove(m); m.geometry.dispose(); }); }
    paths = [];
    const rnd = rng(sd), main = [A.clone()]; jag(A, B, rnd, segs, 0.2, main);
    const mk = (pts, w, d0, d1) => {
      const meshes = [[coreM, 0.42], [h1M, 1.9], [h2M, 4.4]].map(([m, k]) => { const mesh = new THREE.Mesh(tube(pts, (i) => width * w * k * (1 - 0.55 * i / pts.length)), m); mesh.frustumCulled = false; mesh.renderOrder = m === coreM ? 3 : 2; bolt.add(mesh); return mesh; });
      paths.push({ meshes, d0, d1, n: pts.length, sides: 6 });
    };
    mk(main, 1, 0, 1);
    const dir = B.clone().sub(A).normalize(), [u, v] = perp(dir);
    for (let b = 0; b < branches; b++) {
      const i = Math.floor(rnd.range(0.12, 0.78) * (main.length - 1)), p0 = main[i], ang = rnd.range(0.5, 1.0) * rnd.sign();
      const e = p0.clone().addScaledVector(dir, L * rnd.range(0.1, 0.28)).addScaledVector(u, Math.sin(ang) * L * rnd.range(0.14, 0.26)).addScaledVector(v, rnd.range(-1, 1) * L * 0.08);
      const bp = [p0.clone()]; jag(p0, e, rnd, 3, 0.22, bp); mk(bp, 0.5, i / (main.length - 1), 1);
    }
  }
  const c = new THREE.Color(color);
  const set = (age, sd = seed) => {
    g.visible = age >= 0 && age < 1.2; if (!g.visible) return;
    if (builtSeed !== sd) { build(sd); builtSeed = sd; }
    const reveal = clamp(age / 0.07), flick = age < 0.07 ? 1 : (0.55 + 0.45 * (Math.sin(age * 71) > -0.2 ? 1 : 0.3)) * (1 - smooth((age - 0.14) / 0.5)) + 0.9 * pulse(age - 0.26, 0.03, 0.18), I = clamp(flick, 0, 1.2);
    for (const p of paths) {
      const frac = p.d0 >= reveal ? 0 : p.d0 === 0 ? reveal : clamp((reveal - p.d0) / 0.35);   // branches shoot out once the bolt reaches them
      const cnt = Math.max(0, Math.floor(frac * (p.n - 1))) * p.sides * 6;
      p.meshes.forEach((m) => { m.geometry.setDrawRange(0, cnt); m.visible = cnt > 0 && I > 0.02; });
    }
    h1M.opacity = 0.45 * clamp(I, 0, 1); h2M.opacity = 0.18 * clamp(I, 0, 1);
    const on = reveal >= 1 ? I : 0;
    gl.dot(0, B.x, B.y + 0.2, B.z, width * 12 * on, c.r * 0.7 * on, c.g * 0.7 * on, c.b * 0.7 * on); gl.dot(1, A.x, A.y, A.z, width * 30 * I * 0.7, c.r * 0.5, c.g * 0.5, c.b * 0.5); gl.flush();
    sp.visible = on > 0.3; if (sp.visible) sp.set(age);
    if (pl) pl.intensity = 220 * on * on;
  };
  set(-1);
  return finish(g, set, { duration: 1.2, sizeM: L });
}

// ============================================================ powerUpAura
// powerUpAura({height=2, color=0xffd23f, radius=0.8, seed}) .update(t, level=1): shell of light around a character (feet at y=0), rising streaks and sparks, pulsing ground rings, lava-glow ground cracks, levitating rocks. level 0..1 = charge-up amount.
export function powerUpAura({ height = 2, color = 0xffd23f, color2 = 0xff7a1a, radius = 0.8, seed = 31, crackRadius = 2.6, rocks = 9 } = {}) {
  const g = new THREE.Group(), r = rng(seed), H = height, R = radius, col = new THREE.Color(color), col2 = new THREE.Color(color2);
  const shellM = fresnelMat(color, { power: 1.8, base: 0.06 }), shell = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1, 8, 32), shellM); g.add(shell);
  const shell2M = fresnelMat(color2, { power: 2.6, base: 0.0 }), shell2 = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1, 8, 32), shell2M); g.add(shell2);
  const NS = 40, streaks = pool(spindleGeo(), basicWhite(), NS), SP = Array.from({ length: NS }, (_, j) => ({ off: (j + r() * 0.8) / NS, a: r() * TAU, d: r.range(0.85, 1.35), len: r.range(0.5, 1.3), sp: r.range(0.9, 1.6), w: r.range(0.02, 0.045) })); g.add(streaks);
  const ND = 44, dots = glowPool(ND, 'star'), DP = Array.from({ length: ND }, (_, j) => ({ off: (j + r() * 0.8) / ND, a: r() * TAU, d: r.range(0.6, 1.5), sp: r.range(0.35, 0.7), s: r.range(0.06, 0.16), tw: r() * TAU })); g.add(dots);
  const ringMs = [0, 1, 2].map(() => new THREE.Mesh(new THREE.TorusGeometry(1, 0.022, 6, 64), glowBasic({ color }))); ringMs.forEach((m) => { m.rotation.x = Math.PI / 2; m.position.y = 0.03; g.add(m); });
  const pool_ = new THREE.Mesh(new THREE.CircleGeometry(1, 48), radialMat(color, { power: 1.3 })); pool_.rotation.x = -Math.PI / 2; pool_.position.y = 0.02; g.add(pool_);
  const cr = groundCracks({ radius: crackRadius, glow: true, lava: color2, color: 0x2a1c14, seed: seed + 2, arms: 8 }); g.add(cr);
  const rk = pool(ROCK(), rockMat(), rocks, { cast: true }); g.add(rk);
  const RK = Array.from({ length: rocks }, (_, i) => ({ a: i / rocks * TAU + r() * 0.4, d: r.range(1.1, 2.0), off: r(), s: r.range(0.07, 0.17), w: [r.range(-2, 2), r.range(-2, 2), r.range(-2, 2)] })); RK.forEach((p, i) => rk.tint(i, 0.4 + 0.15 * hash(i), 0.34 + 0.12 * hash(i), 0.3 + 0.1 * hash(i)));
  const c = new THREE.Color();
  const set = (t, level = 1) => {
    const L = clamp(level), pul = 0.92 + 0.08 * Math.sin(t * 9) + 0.04 * Math.sin(t * 23);
    g.visible = L > 0.001;
    const sr = R * (1.05 + 0.1 * Math.sin(t * 6)) * (0.6 + 0.4 * L), hh = H * (0.55 + 0.1 * Math.sin(t * 5)) * (0.7 + 0.3 * L);
    shell.scale.set(sr, hh, sr); shell.position.y = H * 0.5; shellM.uniforms.uA.value = 0.95 * L * pul;
    shell2.scale.set(sr * 1.35, hh * 1.2, sr * 1.35); shell2.position.y = H * 0.52; shell2M.uniforms.uA.value = 0.7 * L * (0.7 + 0.3 * Math.sin(t * 7 + 1));
    for (let j = 0; j < NS; j++) {
      const p = SP[j], k = fract(t * p.sp * 0.6 + p.off), y = k * H * 1.7 - 0.1, len = p.len * (0.5 + 0.5 * L), fade = Math.sin(k * Math.PI) * L;
      if (fade < 0.02) { streaks.hide(j); continue; }
      streaks.put(j, Math.cos(p.a + t * 0.7) * R * p.d, y, Math.sin(p.a + t * 0.7) * R * p.d, len * fade, 0, 0, Math.PI / 2, p.w * 1.6 * fade, p.w * 1.6 * fade); streaks.tint(j, c.copy(col).lerp(col2, k * 0.5).multiplyScalar(2.2 * fade));
    }
    streaks.flush();
    for (let j = 0; j < ND; j++) {
      const p = DP[j], k = fract(t * p.sp * 0.5 + p.off), tw = 0.6 + 0.4 * Math.sin(t * 10 + p.tw), y = k * H * 1.5, a = p.a + k * 5 + t * 1.2, d = R * p.d * (1 - k * 0.25);
      dots.dot(j, Math.cos(a) * d, y, Math.sin(a) * d, p.s * 2.6 * (1 - k * 0.5) * L * tw, 2 * L * (1 - k), 1.6 * L * (1 - k), 0.6 * L * (1 - k));
    }
    dots.flush();
    ringMs.forEach((m, i) => { const k = fract(t * 0.7 + i / 3), rr = R * (0.8 + 2.6 * k); m.scale.set(rr, rr, rr); m.material.opacity = (1 - k) * (1 - k) * L; m.visible = L > 0.01; });
    pool_.scale.setScalar(R * 2.5 * (0.7 + 0.3 * L)); pool_.material.uniforms.uA.value = 0.8 * L * pul;
    cr.set(0.08 + L * 1.0); cr.visible = L > 0.05;
    for (let i = 0; i < rocks; i++) { const p = RK[i], k = fract(t * 0.12 + p.off), y = 0.15 + k * H * 1.3, a = p.a + t * 0.5, s = p.s * (0.6 + 0.4 * L) * (1 - smooth((k - 0.8) / 0.2)) * smooth(k / 0.1); rk.put(i, Math.cos(a) * R * p.d, y, Math.sin(a) * R * p.d, s, t * p.w[0], t * p.w[1], t * p.w[2], s * 0.8, s * 1.1); }
    rk.flush();
  };
  set(0, 1);
  return finish(g, set, { loop: true, sizeM: H * 2 });
}

// ============================================================ tornado
// tornado({height=14, baseR=1.1, topR=4.5, seed, drift}) .update(t): swirling funnel of stacked puff rings (faster at the bottom), orbiting debris chunks, dark wall-cloud cap, ground dust ring. Trunk position y=0; drift = [vx, vz] metres/s moves the base along a wobbling path.
export function tornado({ height = 14, baseR = 1.1, topR = 4.5, seed = 41, layers = 20, perLayer = 13, debris = 44, drift = [0, 0] } = {}) {
  const g = new THREE.Group(), r = rng(seed), H = height;
  const N = layers * perLayer, pl = pool(SPH(), lambertWhite(), N), PL = Array.from({ length: N }, () => ({ j: r.range(-0.12, 0.12), s: r.range(0.8, 1.25), tone: r.range(0.9, 1.1) })); g.add(pl);
  const nd = debris, db = pool(ROCK(), rockMat(), nd, { cast: true }), DB = Array.from({ length: nd }, () => ({ off: r(), a: r() * TAU, rd: r.range(1.05, 1.5), s: r.range(0.12, 0.34), w: [r.range(-6, 6), r.range(-6, 6), r.range(-6, 6)], sp: r.range(0.7, 1.3) })); g.add(db);
  db.tint && DB.forEach((p, i) => db.tint(i, 0.35 + 0.35 * hash(i), 0.28 + 0.25 * hash(i + 4), 0.2 + 0.2 * hash(i + 9)));
  const nc = 8, cap = pool(SPH(), lambertWhite(), nc), CP = Array.from({ length: nc }, (_, i) => ({ a: i / nc * TAU + r() * 0.5, d: r.range(0.9, 1.6), s: r.range(0.8, 1.3) })); g.add(cap);
  const nu = 16, du = pool(SPH(), lambertWhite(), nu), DU = Array.from({ length: nu }, (_, i) => ({ a: i / nu * TAU, s: r.range(0.7, 1.3), ph: r() })); g.add(du);
  const cLow = new THREE.Color(0xa08a6c), cHi = new THREE.Color(0x8a8a9a), c = new THREE.Color();
  const cx = (y, t) => Math.sin(y * 0.45 + t * 0.9) * 0.05 * H * (y / H) + Math.sin(y * 0.2 - t * 0.4) * 0.04 * H * (y / H);
  const set = (t) => {
    g.position.x = drift[0] * t + Math.sin(t * 0.7) * 0.6; g.position.z = drift[1] * t;
    for (let j = 0; j < layers; j++) {
      const h = j / (layers - 1), y = h * H, rr = baseR + (topR - baseR) * Math.pow(h, 1.6), om = 3.8 - 2.2 * h, x0 = cx(y, t), z0 = Math.cos(y * 0.4 + t * 0.7) * 0.04 * H * h, sz0 = (TAU * rr / perLayer) * 0.5 + 0.25 + h * 0.2;
      for (let i = 0; i < perLayer; i++) {
        const k = j * perLayer + i, p = PL[k], a = i / perLayer * TAU + t * om + j * 0.9;
        pl.put(k, x0 + Math.cos(a) * rr * (1 + p.j), y + Math.sin(a * 2 + j) * 0.12 * H / layers, z0 + Math.sin(a) * rr * (1 + p.j), sz0 * p.s);
        pl.tint(k, c.copy(cLow).lerp(cHi, h).multiplyScalar(p.tone * (0.52 + 0.48 * Math.sin(a * 1.0 + 0.6)))); // darker on the far side of each ring: a free swirl cue
      }
    }
    pl.flush();
    for (let i = 0; i < nd; i++) { const p = DB[i], k = fract(t * 0.09 * p.sp + p.off), h = k, y = h * H * 0.92, rr = (baseR + (topR - baseR) * Math.pow(h, 1.6)) * p.rd, a = p.a + t * (3.2 - 2 * h) * p.sp, s = p.s * smooth(k / 0.04) * (1 - smooth((k - 0.93) / 0.07)); db.put(i, cx(y, t) + Math.cos(a) * rr, y, Math.sin(a) * rr, s, t * p.w[0], t * p.w[1], t * p.w[2], s * 0.7, s * 1.2); }
    db.flush();
    for (let i = 0; i < nc; i++) { const p = CP[i], a = p.a + t * 0.9; cap.put(i, cx(H, t) + Math.cos(a) * topR * p.d * 0.9, H * 1.02 + Math.sin(a * 2) * 0.3, Math.sin(a) * topR * p.d * 0.9, topR * 0.34 * p.s); cap.tint(i, 0.42, 0.42, 0.5); }
    cap.flush();
    for (let i = 0; i < nu; i++) { const p = DU[i], a = p.a + t * 2.2, k = fract(t * 0.5 + p.ph), rr = baseR * (2.2 + k * 1.8), s = baseR * 0.55 * p.s * (0.7 + 0.5 * k) * (1 - smooth((k - 0.6) / 0.4)); du.put(i, Math.cos(a) * rr, s * 0.7 + k * 0.5, Math.sin(a) * rr, s); du.tint(i, c.set(0xb89c78).multiplyScalar(0.85)); }
    du.flush();
  };
  set(0);
  return finish(g, set, { loop: true, sizeM: H, extra: {} });
}

// ============================================================ rocketExhaust
// rocketExhaust({length=3, radius=0.4, speed=0, light=true}) .update(t, thrust=1): flame (nozzle at origin, pointing -Y) with orange sheath, white-blue core, shock diamonds, glow and a smoke trail
// that stays behind in the air (speed = how fast the rocket climbs in m/s, so old smoke is left behind; 0 = hovering, smoke blows outward and down).
export function rocketExhaust({ length = 3, radius = 0.4, speed = 0, light = true, seed = 51, smokeLife = 2.6, count = 72 } = {}) {
  const g = new THREE.Group(), r = rng(seed), Lg = length, R = radius;
  const mk = (rr, ll, color, op) => { const geo = new THREE.ConeGeometry(rr, ll, 20, 1, true); geo.rotateZ(Math.PI); geo.translate(0, -ll / 2, 0); return new THREE.Mesh(geo, glowBasic({ color, opacity: op, side: THREE.DoubleSide })); };   // wide end at the nozzle (y=0), tip at -length
  const outer = mk(R, Lg, 0xff6a14, 1), mid = mk(R * 0.74, Lg * 0.78, 0xffb52e, 1), core = mk(R * 0.42, Lg * 0.52, 0xfff2c8, 1); [outer, mid, core].forEach((m) => { m.material.blending = THREE.NormalBlending; m.material.depthWrite = true; m.material.transparent = false; m.material.toneMapped = false; }); g.add(outer, mid, core);
  const dia = glowPool(6, 'soft'); g.add(dia); const gl = glowPool(1, 'soft'); g.add(gl);
  const N = count, P = Array.from({ length: N }, (_, j) => ({ off: (j + r() * 0.8) / N, a: r() * TAU, d: r.range(0.3, 1), s: r.range(0.6, 1.4) }));
  const sm = pool(SPH(), lambertWhite(), N); g.add(sm); const c = new THREE.Color();
  let pl = null; if (light) { pl = new THREE.PointLight(0xffa040, 0, 0, 2); pl.position.y = -Lg * 0.3; g.add(pl); }
  const set = (t, thrust = 1) => {
    const f = 0.9 + 0.1 * Math.sin(t * 47) + 0.06 * Math.sin(t * 91 + 2), T = clamp(thrust, 0, 1.3);
    const sc = (m, a, b) => { m.scale.set((1 + 0.08 * Math.sin(t * 60 + a)) * T, T * (f * b), (1 + 0.08 * Math.cos(t * 55 + a)) * T); m.visible = T > 0.02; };
    sc(outer, 0, 1); sc(mid, 1, 1); sc(core, 2, 1);
    for (let i = 0; i < 6; i++) { const y = -(0.25 + i * 0.28) * Lg * 0.55 * T, sz = R * (1.2 - i * 0.13) * T; dia.dot(i, 0, y, 0, sz * (0.8 + 0.2 * Math.sin(t * 30 + i)), 1.6 * (1 - i * 0.12) * T, 1.8 * (1 - i * 0.1) * T, 2 * T); }
    dia.flush(); gl.dot(0, 0, -R * 0.4, 0, R * 4 * T * f, 1.0 * T, 0.5 * T, 0.12 * T); gl.flush();
    for (let j = 0; j < N; j++) {
      const p = P[j], k = fract(t / smokeLife + p.off), tau = k * smokeLife, sz = R * p.s * (0.9 + 3.2 * k) * smooth(k / 0.05) * (1 - smooth((k - 0.55) / 0.45)) * (T > 0.02 ? 1 : 0);
      const out = R * 0.4 + (speed > 0 ? 1.2 : 3.4) * k * p.d, y = -speed * tau - (speed > 0 ? 0 : 2.2 * k * k) - Lg * 0.45;
      sm.put(j, Math.cos(p.a) * out, y, Math.sin(p.a) * out, sz); sm.tint(j, c.setRGB(1, 0.96, 0.9).multiplyScalar(0.95 - 0.35 * k));
    }
    sm.flush();
    if (pl) pl.intensity = 90 * T * f;
  };
  set(0);
  return finish(g, set, { loop: true, sizeM: Lg });
}

// ============================================================ cometTail
// cometTail({length=60, headR=2, dir=[-1,0.12,0], seed}) .update(t): faceted icy head with coma glow, straight blue ion tail and a broader curved dusty tail made of drifting glow dots. Real-scale friendly: length/headR in metres (use any scale).
export function cometTail({ length = 60, headR = 2, dir = [-1, 0.12, 0], seed = 61, count = 150 } = {}) {
  const g = new THREE.Group(), r = rng(seed), L = length, hr = headR, D = new THREE.Vector3(...dir).normalize(), up = V(0, 1, 0), side = D.clone().cross(up).normalize(), curve = up.clone().sub(D.clone().multiplyScalar(up.dot(D))).normalize();
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(hr, 1), new THREE.MeshStandardMaterial({ color: 0xdfe9f2, roughness: 0.6, emissive: 0x6a9acf, emissiveIntensity: 0.35, flatShading: true }));
  const pg = head.geometry.attributes.position; for (let i = 0; i < pg.count; i++) { const k = 1 + 0.14 * Math.sin(pg.getX(i) * 2.7 / hr + pg.getY(i) * 1.9 / hr) + 0.1 * Math.sin(pg.getZ(i) * 4.1 / hr + 1); pg.setXYZ(i, pg.getX(i) * k, pg.getY(i) * k, pg.getZ(i) * k); } head.geometry.computeVertexNormals(); g.add(head);
  const coma = glowPool(3, 'soft'); g.add(coma);
  const ion = glowPool(count, 'soft'), dust = glowPool(count, 'soft'); g.add(ion, dust);
  const IP = Array.from({ length: count }, (_, j) => ({ off: (j + r() * 0.8) / count, a: r() * TAU, d: r.range(0.1, 1), s: r.range(0.7, 1.2) })), DP = Array.from({ length: count }, (_, j) => ({ off: (j + r() * 0.8) / count, a: r() * TAU, d: r.range(0.1, 1), s: r.range(0.7, 1.2) }));
  const v = new THREE.Vector3();
  const set = (t) => {
    head.rotation.set(t * 0.15, t * 0.22, 0);
    coma.dot(0, 0, 0, 0, hr * 5 * (1 + 0.04 * Math.sin(t * 3)), 0.05, 0.12, 0.2); coma.dot(1, 0, 0, 0, hr * 3.0, 0.1, 0.2, 0.3); coma.dot(2, 0, 0, 0, hr * 2.2, 0.22, 0.32, 0.4); coma.flush();
    for (let j = 0; j < count; j++) {
      let p = IP[j], k = fract(t * 0.32 + p.off); const spread = hr * (0.4 + 1.9 * k) * p.d;
      v.copy(D).multiplyScalar(hr * 0.5 + L * k).addScaledVector(side, Math.cos(p.a) * spread).addScaledVector(up, Math.sin(p.a) * spread);
      let f = Math.pow(1 - k, 1.4) * smooth(k / 0.03); ion.dot(j, v.x, v.y, v.z, hr * (0.9 + 1.8 * k) * p.s, 0.03 * f, 0.1 * f, 0.22 * f);
      p = DP[j]; k = fract(t * 0.2 + p.off); const spread2 = hr * (0.6 + 3.8 * k) * p.d;
      v.copy(D).multiplyScalar(hr * 0.5 + L * 0.72 * k).addScaledVector(curve, L * 0.16 * k * k).addScaledVector(side, Math.cos(p.a) * spread2).addScaledVector(up, Math.sin(p.a) * spread2 * 0.6);
      f = Math.pow(1 - k, 1.2) * smooth(k / 0.03); dust.dot(j, v.x, v.y, v.z, hr * (1.4 + 3.0 * k) * p.s, 0.1 * f, 0.08 * f, 0.035 * f);
    }
    ion.flush(); dust.flush();
  };
  set(0);
  return finish(g, set, { loop: true, sizeM: L, extra: {} });
}

// ============================================================ waterSplash
// waterSplash({radius=1, height=2.2, y=0, seed}) .set(age): big cartoon splash (stone / person dropped into a pond): central jet with bulb, jagged crown sheet that rises and collapses, ballistic droplets, foam disc, 3 ripple rings, mist puffs. Needs a water surface at y.
export function waterSplash({ radius = 1, height = 2.2, y = 0, seed = 71, drops = 36 } = {}) {
  const g = new THREE.Group(), r = rng(seed), R = radius, H = height; g.position.y = y;
  const water = new THREE.MeshStandardMaterial({ color: 0x8fd6ff, roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.88, emissive: 0x2a6a9a, emissiveIntensity: 0.15 });
  const sheetM = new THREE.MeshStandardMaterial({ color: 0xb8e8ff, roughness: 0.15, transparent: true, opacity: 0.55, side: THREE.DoubleSide, emissive: 0x4a8ab0, emissiveIntensity: 0.2 });
  const jetG = new THREE.CylinderGeometry(0.6, 1, 1, 20, 1, false); jetG.translate(0, 0.5, 0);
  const jet = new THREE.Mesh(jetG, water), bulb = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), water); g.add(jet, bulb);
  const sg = new THREE.CylinderGeometry(1, 0.78, 1, 48, 1, true); sg.translate(0, 0.5, 0); const sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) if (sp.getY(i) > 0.9) sp.setY(i, 1 + (Math.floor(Math.atan2(sp.getZ(i), sp.getX(i)) * 48 / TAU) % 2 ? 0.28 : -0.08) + 0.1 * Math.sin(i * 1.7)); sg.computeVertexNormals();
  const sheet = new THREE.Mesh(sg, sheetM); g.add(sheet);
  const DR = Array.from({ length: drops }, () => ({ az: r() * TAU, el: r.range(0.9, 1.45), sp: r.range(0.6, 1.1), s: r.range(0.035, 0.1), tint: r() }));
  const dp = pool(SPH(), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, emissive: 0x3a7aa0, emissiveIntensity: 0.25 }), drops); g.add(dp);
  const foamM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), foam = new THREE.Mesh(new THREE.RingGeometry(0.55, 1, 48), foamM); foam.rotation.x = -Math.PI / 2; foam.position.y = 0.02; g.add(foam);
  const rings = [0, 0.12, 0.26].map(() => { const m = new THREE.MeshBasicMaterial({ color: 0xe8f8ff, transparent: true, depthWrite: false }), t = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 6, 64), m); t.rotation.x = Math.PI / 2; t.position.y = 0.03; g.add(t); return { t, m }; });
  const mist = pool(SPH(), lambertWhite(), 10); g.add(mist);
  const c = new THREE.Color();
  const set = (age) => {
    g.visible = age >= 0 && age < 2.8;
    const vj = Math.sqrt(2 * 9.8 * H * 0.9), a = Math.max(0, age), top = clamp(vj * a - 0.5 * 9.8 * a * a, 0, H * 1.2) * (1 - smooth((a - 0.7) / 0.35)) + 0.0001;
    const jw = R * 0.34 * (1 - 0.35 * smooth(a / 0.6)) * (1 - smooth((a - 0.75) / 0.3));
    jet.scale.set(jw, top, jw); bulb.scale.set(jw * 1.35, jw * 1.55, jw * 1.35); bulb.position.y = top + jw * 0.4; bulb.visible = jet.visible = top > 0.01 && jw > 0.01;
    const sk = smooth(a / 0.18) * (1 - smooth((a - 0.5) / 0.35)), sr = R * (0.35 + 1.1 * easeOutCubic(clamp(a / 0.5)));
    sheet.scale.set(sr, H * 0.62 * sk + 0.001, sr); sheet.visible = sk > 0.01; sheetM.opacity = 0.55 * (1 - smooth((a - 0.4) / 0.4));
    for (let i = 0; i < drops; i++) {
      const p = DR[i], sp_ = 5.2 * Math.sqrt(H / 2.2) * p.sp, ce = Math.cos(p.el), b = ballistic(Math.cos(p.az) * R * 0.3, 0.1, Math.sin(p.az) * R * 0.3, Math.cos(p.az) * ce * sp_ * R, Math.sin(p.el) * sp_, Math.sin(p.az) * ce * sp_ * R, a - 0.02, { floor: -0.5, e: 0, maxB: 0 });
      const alive = a > 0.02 && b.y > 0.0; dp.put(i, b.x, b.y, b.z, alive ? p.s : 0);
      dp.tint(i, c.setRGB(0.75 + 0.25 * p.tint, 0.92, 1));
    }
    dp.flush();
    const fk = clamp(a / 0.9); foam.scale.setScalar(R * (0.5 + 1.7 * easeOutCubic(fk))); foamM.opacity = 0.9 * (1 - smooth((a - 0.3) / 1.3)) * (a > 0 ? 1 : 0); foam.visible = a > 0;
    rings.forEach((o, i) => { const k = clamp((a - i * 0.12) / 1.3), rr = R * (0.6 + 3.2 * easeOutCubic(k)); o.t.scale.setScalar(rr); o.m.opacity = (1 - k) * 0.9; o.t.visible = k > 0 && k < 1; });
    for (let i = 0; i < 10; i++) { const k = clamp((a - 0.1 - i * 0.04) / 1.0), s = R * 0.13 * (0.6 + k) * (1 - smooth((k - 0.5) / 0.5)) * smooth(k / 0.1); mist.put(i, Math.cos(i * 2.4) * R * (0.5 + k * 0.9), 0.15 + k * H * 0.5 * (0.5 + 0.1 * i % 3), Math.sin(i * 2.4) * R * (0.5 + k * 0.9), k > 0 ? s : 0); mist.tint(i, 0.95, 0.98, 1); }
    mist.flush();
  };
  set(-1);
  return finish(g, set, { duration: 2.8, sizeM: H });
}

// ============================================================ waterRipple
// waterRipple({radius=6, drops:[{x,z,t0,amp}], idle=true, color}) .set(t): a real displaced water surface (vertex heights + normals) with expanding ring waves from the listed drops; idle=true adds seeded raindrops that never stop. y=0 surface.
export function waterRipple({ radius = 6, drops = [], idle = true, period = 0.9, color = 0x2f9ad6, seed = 81, nr = 64, ns = 120, amp = 0.014, rimFoam = true } = {}) {
  const g = new THREE.Group(), R = radius;
  const positions = [], uvs = [], idx = [], xz = [];
  positions.push(0, 0, 0); xz.push([0, 0, 0]);
  for (let i = 1; i <= nr; i++) { const rr = R * Math.pow(i / nr, 0.85); for (let j = 0; j < ns; j++) { const a = j / ns * TAU; positions.push(Math.cos(a) * rr, 0, Math.sin(a) * rr); xz.push([Math.cos(a) * rr, Math.sin(a) * rr, rr]); } }
  for (let j = 0; j < ns; j++) idx.push(0, 1 + (j + 1) % ns, 1 + j);
  for (let i = 1; i < nr; i++) for (let j = 0; j < ns; j++) { const a = 1 + (i - 1) * ns + j, b = 1 + (i - 1) * ns + (j + 1) % ns, c2 = 1 + i * ns + j, d = 1 + i * ns + (j + 1) % ns; idx.push(a, b, c2, b, d, c2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setIndex(idx);
  const col = new Float32Array(positions.length); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.12, metalness: 0.05, envMapIntensity: 1.4 })); mesh.receiveShadow = true; g.add(mesh);
  const r = rng(seed), idleN = 8, base = new THREE.Color(color), deep = base.clone().multiplyScalar(0.7), foam = new THREE.Color(0xdff6ff), cc = new THREE.Color();
  const idleDrop = (n) => ({ x: (hash(n * 3.1) - 0.5) * 1.5 * R * 0.7, z: (hash(n * 7.7 + 2) - 0.5) * 1.5 * R * 0.7, t0: n * period + hash(n * 1.3) * period * 0.8, amp: 0.5 + 0.5 * hash(n * 5.3) });
  const wave = (rr, a, A) => { const c = 1.6, d = rr - c * a, front = Math.exp(-(d * d) / 0.28), trail = d < 0 ? Math.exp(-((-d) * (-d)) / 1.8) : 0; return A * (front * Math.cos(d * 9) * 0.9 + trail * Math.cos(d * 9) * 0.5) * Math.exp(-a * 0.55) / (1 + rr * 0.9); };
  const set = (t) => {
    const list = [...drops];
    if (idle) { const n1 = Math.floor(t / period); for (let n = n1; n > n1 - 6 && n >= 0; n--) list.push(idleDrop(n)); }
    const pos = geo.attributes.position, cl = geo.attributes.color;
    for (let i = 0; i < xz.length; i++) {
      let h = 0; const [x, z] = xz[i];
      for (const d of list) { const a = t - d.t0; if (a < 0 || a > 5) continue; const dx = x - (d.x ?? 0), dz = z - (d.z ?? 0); h += wave(Math.hypot(dx, dz), a, (d.amp ?? 1) * amp * 8); }
      pos.setY(i, h);
      cc.copy(deep).lerp(base, 0.6 + clamp(h * 6, -0.4, 0.4)).lerp(foam, clamp(h * 7 - 0.15, 0, 0.7));
      if (rimFoam && xz[i][2] > R * 0.965) cc.lerp(foam, 0.8);
      cl.setXYZ(i, cc.r, cc.g, cc.b);
    }
    pos.needsUpdate = true; cl.needsUpdate = true; geo.computeVertexNormals();
  };
  set(0);
  return finish(g, set, { loop: true, sizeM: R * 2 });
}
