// SPACE pack sky kit: gradient dome, layered parallax starfields + Milky Way band, particle nebulae (8 palettes), spiral galaxy with differential
// rotation, distant galaxies, star clusters, shooting stars, drifting dust (parallax), orbit rings with riding beads.
// All particles (no textures); every layer moves in closed form from the time argument. Units: 1 = 1 m unless noted.
import * as THREE from 'three';
import { rng } from '../util.js';
import { TAU, rgb, mix3, V3, noise3, fbm3, sstep, sprites, spriteMat, glowDot, spriteCloud, MB } from './space_kit.js';

const addTicks = (g, list) => { g.update = g.userData.update = (t) => { for (const f of list) f(t); }; return g; };
const setOrder = (o, n) => { o.traverse((c) => { c.renderOrder = n; }); return o; };
export const BACK = -900;   // renderOrder of everything that sits behind the action
const randDir = (r) => { const z = r.range(-1, 1), a = r() * TAU, s = Math.sqrt(1 - z * z); return V3(s * Math.cos(a), z, s * Math.sin(a)); };

// ---------- gradient dome with soft colour patches (vertex colours) ----------
export function skyDome({ top = 0x01020a, mid = 0x070c24, bottom = 0x02030a, radius = 1500, patches = [0x3a1a6a, 0x0a3a6a], seed = 3, k = 0.22 } = {}) {
  const geo = new THREE.SphereGeometry(radius, 48, 32), p = geo.attributes.position, col = new Float32Array(p.count * 3), a = rgb(top), b = rgb(mid), c = rgb(bottom), pc = patches.map(rgb), r = rng(seed), off = r() * 40;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / radius, x = p.getX(i) / radius, z = p.getZ(i) / radius; let q = y > 0 ? mix3(b, a, y) : mix3(b, c, -y);
    const n1 = fbm3(x * 1.6 + off, y * 1.6, z * 1.6, 3, 4), n2 = fbm3(x * 1.4, y * 1.4 + off, z * 1.4, 3, 9);
    const w1 = sstep(0.5, 0.75, n1) * k, w2 = sstep(0.52, 0.78, n2) * k;
    q = [q[0] + pc[0][0] * w1 + pc[1 % pc.length][0] * w2, q[1] + pc[0][1] * w1 + pc[1 % pc.length][1] * w2, q[2] + pc[0][2] * w1 + pc[1 % pc.length][2] * w2];
    const lin = new THREE.Color().setRGB(q[0], q[1], q[2], THREE.SRGBColorSpace); col[i * 3] = lin.r; col[i * 3 + 1] = lin.g; col[i * 3 + 2] = lin.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }));
  m.renderOrder = BACK - 100; m.frustumCulled = false; return m;
}

// ---------- layered starfield + Milky Way ----------
const STAR_COLS = [[0x9fb8ff, 0.12], [0xdfe8ff, 0.3], [0xfff4d6, 0.3], [0xffd9a0, 0.18], [0xff9a70, 0.1]];
function starColor(r, colorful) {
  let u = r(), c = 0xffffff; for (const [h, w] of STAR_COLS) { if (u < w) { c = h; break; } u -= w; }
  const q = rgb(c); return mix3([1, 1, 1], q, 0.35 + 0.65 * colorful);
}
// layers at different depths turn at different rates: instant parallax even with a locked camera. radius = outermost layer ~1.55x
export function starLayers({ seed = 1, radius = 850, density = 1, colorful = 1, milkyWay = true, mwTilt = [0.55, 0.1, 0.35], mwColor = 0x9bb0ff, mwCore = 0xffd9a8, twinkle = 0.35 } = {}) {
  const g = new THREE.Group(), ticks = [], r = rng(seed);
  const LAYERS = [{ m: 1.6, n: 2600, s: [1.0, 1.7], rate: 0.0035 }, { m: 1.2, n: 1700, s: [1.3, 2.4], rate: 0.006 }, { m: 0.75, n: 800, s: [1.8, 3.4], rate: 0.011 }, { m: 0.32, n: 140, s: [2.6, 4.8], rate: 0.02 }];
  LAYERS.forEach((L, li) => {
    const n = Math.round(L.n * density), P = new Float32Array(n * 3), C = new Float32Array(n * 3), S = new Float32Array(n), R = radius * L.m, off = r() * 30;
    let k = 0;
    while (k < n) {
      const d = randDir(r); if (r() > 0.35 + 0.9 * fbm3(d.x * 2.6 + off, d.y * 2.6, d.z * 2.6, 3, li)) continue;
      const c = starColor(r, colorful), b = Math.pow(r(), 2.6) * 0.75 + 0.25;
      P.set([d.x * R, d.y * R, d.z * R], k * 3); C.set([c[0] * b, c[1] * b, c[2] * b], k * 3); S[k] = L.s[0] + (L.s[1] - L.s[0]) * Math.pow(r(), 2.2); k++;
    }
    const pts = sprites(P, C, S, { soft: 2.6, tw: twinkle, seed: seed + li * 17 }); const sub = new THREE.Group(); sub.add(pts); g.add(sub);
    sub.rotation.set(r.range(-1, 1), r() * TAU, 0); const ax = V3(r.range(-0.4, 0.4), 1, r.range(-0.4, 0.4)).normalize(), q0 = sub.quaternion.clone();
    ticks.push((t) => { pts.setTime(t); sub.quaternion.copy(q0).multiply(new THREE.Quaternion().setFromAxisAngle(ax, t * L.rate)); });
  });
  // bright stars with diffraction spikes
  { const n = Math.round(46 * density), P = new Float32Array(n * 3), C = new Float32Array(n * 3), S = new Float32Array(n);
    for (let i = 0; i < n; i++) { const d = randDir(r), R = radius * r.range(0.5, 1.4), c = starColor(r, colorful); P.set([d.x * R, d.y * R, d.z * R], i * 3); C.set([c[0], c[1], c[2]], i * 3); S[i] = r.range(10, 26); }
    const pts = sprites(P, C, S, { soft: 4.5, tw: 0.3, defines: { SPIKES: '' }, seed: seed + 91, op: 0.95 }); g.add(pts);
    const ax = V3(0.1, 1, 0.05).normalize(); ticks.push((t) => { pts.setTime(t); pts.quaternion.setFromAxisAngle(ax, t * 0.009); }); }
  if (milkyWay) {
    const mw = new THREE.Group(); g.add(mw); const nrm = V3(...mwTilt).normalize(), R = radius * 1.35, off = r() * 40;
    const up = Math.abs(nrm.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0), e1 = V3().crossVectors(nrm, up).normalize(), e2 = V3().crossVectors(nrm, e1).normalize(), core = e1;
    const cMW = rgb(mwColor), cCore = rgb(mwCore);
    // dense faint stars hugging the band
    { const n = Math.round(5200 * density), P = new Float32Array(n * 3), C = new Float32Array(n * 3), S = new Float32Array(n); let k = 0, guard = 0;
      while (k < n && guard++ < 400000) { const d = randDir(r), s = d.dot(nrm); if (r() > Math.exp(-(s * s) / (2 * 0.12 * 0.12))) continue; const cl = fbm3(d.x * 4 + off, d.y * 4, d.z * 4, 3, 5); if (r() > 0.25 + cl) continue;
        const toCore = Math.max(0, d.dot(core)), c = mix3(cMW, cCore, toCore * toCore), b = r.range(0.3, 0.8);
        P.set([d.x * R, d.y * R, d.z * R], k * 3); C.set([c[0] * b, c[1] * b, c[2] * b], k * 3); S[k++] = r.range(1.0, 2.2); }
      const pts = sprites(P.slice(0, k * 3), C.slice(0, k * 3), S.slice(0, k), { soft: 2.4, tw: 0.25, seed: seed + 5 }); mw.add(pts); ticks.push((t) => pts.setTime(t)); }
    // soft glowing clouds along the band, with dark dust lanes cut through them
    { const n = Math.round(260 * density), P = new Float32Array(n * 3), C = new Float32Array(n * 3), S = new Float32Array(n); let k = 0, guard = 0;
      while (k < n && guard++ < 100000) { const d = randDir(r), s = d.dot(nrm); if (r() > Math.exp(-(s * s) / (2 * 0.1 * 0.1))) continue; const cl = fbm3(d.x * 3 + off, d.y * 3, d.z * 3, 3, 8);
        const toCore = Math.max(0, d.dot(core)), c = mix3(cMW, cCore, toCore * toCore * 0.8), b = (0.05 + cl * 0.1) * (0.7 + toCore * 0.8);
        P.set([d.x * R, d.y * R, d.z * R], k * 3); C.set([c[0] * b, c[1] * b, c[2] * b], k * 3); S[k++] = r.range(90, 260); }
      mw.add(sprites(P.slice(0, k * 3), C.slice(0, k * 3), S.slice(0, k), { soft: 1.2, seed: 2 })); }
    { const n = Math.round(110 * density), P = new Float32Array(n * 3), C = new Float32Array(n * 3), S = new Float32Array(n); let k = 0, guard = 0;
      while (k < n && guard++ < 100000) { const d = randDir(r), s = d.dot(nrm) - 0.03; if (r() > Math.exp(-(s * s) / (2 * 0.05 * 0.05))) continue; const cl = fbm3(d.x * 5 + off, d.y * 5, d.z * 5, 3, 11); if (cl < 0.5) continue;
        P.set([d.x * R * 0.99, d.y * R * 0.99, d.z * R * 0.99], k * 3); C.set([0.02, 0.015, 0.05], k * 3); S[k++] = r.range(60, 180); }
      mw.add(sprites(P.slice(0, k * 3), C.slice(0, k * 3), S.slice(0, k), { soft: 1.4, additive: false, op: 1, seed: 3 })); }
    const ax = V3(0, 1, 0), q0 = new THREE.Quaternion(); ticks.push((t) => { mw.quaternion.copy(q0).multiply(new THREE.Quaternion().setFromAxisAngle(ax, t * 0.0025)); });
  }
  g.userData = { radius, layers: LAYERS.length + 1 };
  return setOrder(addTicks(g, ticks), BACK);
}

// ---------- nebulae: particle volumes shaped by fbm with filaments, dark dust and embedded young stars ----------
export const NEBULA_PALETTES = {
  orion: { c: [0x2a4ec8, 0xff4fa0, 0xffd0e8], star: 0xbfd4ff }, eagle: { c: [0x7a3a1c, 0xff9a3a, 0xffe6a0], star: 0x9fd0ff }, carina: { c: [0x127a8a, 0x4adcc8, 0xd0fff0], star: 0xffe8c0 },
  crimson: { c: [0x7a1030, 0xe8384c, 0xffb8a8], star: 0xffe0d0 }, emerald: { c: [0x0a6a50, 0x30d08a, 0xd8ffd8], star: 0xfff0b0 }, sunset: { c: [0x5a2a9a, 0xff6a7a, 0xffd070], star: 0xffffff },
  icy: { c: [0x2a4aa0, 0x6ac8ff, 0xe8f8ff], star: 0xffffff }, violet: { c: [0x40187a, 0xb060ff, 0xffd0ff], star: 0xffe6ff },
};
export function nebula({ palette = 'orion', R = 100, n = 800, seed = 1, flat = 0.65, stars = 70, dark = true, lod = 'high', drift = 1, bright = 1, shape = 'cloud' } = {}) {
  const P0 = NEBULA_PALETTES[palette] ?? palette, cs = P0.c.map(rgb), g = new THREE.Group(), r = rng(seed), off = r() * 60, off2 = r() * 60, ticks = [];
  if (lod === 'low') n = Math.round(n * 0.45);
  const cp = [], pp = []; let guard = 0;
  while (cp.length < n && guard++ < n * 60) {
    const p = V3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)); const rad = p.length(); if (rad > 1) continue;
    let w = 1 - rad * rad; if (shape === 'pillar') { p.x *= 0.35; p.z *= 0.35; w = 1 - Math.abs(p.y) * 0.8 - (p.x * p.x + p.z * p.z) * 2; } if (shape === 'ring') { const q = Math.sqrt(p.x * p.x + p.z * p.z); w = Math.exp(-Math.pow((q - 0.65) / 0.17, 2)) * (1 - Math.abs(p.y) * 1.3); }
    const dn = fbm3(p.x * 2.1 + off, p.y * 2.1, p.z * 2.1, 4, seed), ridge = 1 - Math.abs(dn - 0.5) * 2;
    const d = (0.55 * dn + 0.45 * ridge * ridge) * w; if (d < 0.28 + r() * 0.2) continue;
    cp.push([p.x * R, p.y * R * flat, p.z * R * 0.85, d, fbm3(p.x * 1.2 + off2, p.y * 1.2, p.z * 1.2, 3, 5)]);
  }
  const nn = cp.length, P = new Float32Array(nn * 3), C = new Float32Array(nn * 3), S = new Float32Array(nn);
  cp.forEach((q, i) => { const u = Math.min(1, q[3] * 1.6), hue = q[4]; const lo = mix3(cs[0], cs[1], Math.min(1, hue * 1.5)), c = mix3(lo, cs[2], Math.max(0, u - 0.55) * 1.6); const b = (0.07 + 0.14 * u) * bright;
    P.set([q[0], q[1], q[2]], i * 3); C.set([c[0] * b, c[1] * b, c[2] * b], i * 3); S[i] = R * (0.16 + 0.26 * r()); });
  const posCode = `vec3 ph = vec3(aPh * 31.0, aPh * 57.0, aPh * 83.0); P += ${(R * 0.03 * drift).toFixed(3)} * vec3(sin(uTime * 0.17 + ph.x), cos(uTime * 0.13 + ph.y), sin(uTime * 0.11 + ph.z)); col *= 1.0 + 0.18 * sin(uTime * 0.35 + ph.x * 3.0);`;
  const cloud = sprites(P, C, S, { atten: true, soft: 1.7, max: 300, seed: seed + 3, pos: posCode }); g.add(cloud); ticks.push((t) => cloud.setTime(t));
  if (dark) { const m = Math.round(nn * 0.14), P2 = new Float32Array(m * 3), C2 = new Float32Array(m * 3), S2 = new Float32Array(m);
    for (let i = 0; i < m; i++) { const q = cp[Math.floor(r() * nn)]; P2.set([q[0] * 0.8 + r.range(-1, 1) * R * 0.1, q[1] * 0.8 + R * 0.04, q[2] * 0.8 + R * 0.25], i * 3); const c = mix3([0.01, 0.01, 0.03], cs[0], 0.18); C2.set(c, i * 3); S2[i] = R * r.range(0.12, 0.28); }
    const d = sprites(P2, C2, S2, { atten: true, soft: 1.6, additive: false, op: 0.55, max: 300, seed: seed + 8, pos: posCode }); g.add(d); ticks.push((t) => d.setTime(t)); }
  { const m = stars, P3 = new Float32Array(m * 3), C3 = new Float32Array(m * 3), S3 = new Float32Array(m);
    for (let i = 0; i < m; i++) { const q = cp[Math.floor(r() * nn)]; P3.set([q[0] + r.range(-1, 1) * R * 0.05, q[1], q[2] + R * 0.02], i * 3); const c = mix3(rgb(P0.star), [1, 1, 1], r() * 0.6); const b = r.range(0.5, 1); C3.set([c[0] * b, c[1] * b, c[2] * b], i * 3); S3[i] = r() < 0.12 ? r.range(12, 22) : r.range(2.2, 4.5); }
    const st = sprites(P3, C3, S3, { soft: 3.5, tw: 0.35, defines: { SPIKES: '' }, seed: seed + 12 }); g.add(st); ticks.push((t) => st.setTime(t)); }
  g.userData = { radius: R, palette, particles: nn };
  const ax = V3(0.05, 1, 0.02).normalize(), q0 = new THREE.Quaternion(); const base = g.quaternion.clone();
  ticks.push((t) => { g.quaternion.copy(base).multiply(new THREE.Quaternion().setFromAxisAngle(ax, t * 0.01)); });
  return addTicks(g, ticks);
}

// ---------- spiral galaxy: log-spiral arms, bar, bulge, HII knots, dust lanes; each star orbits (differential rotation) ----------
export function spiralGalaxy({ R = 60, n = 9000, arms = 2, twist = 3.4, seed = 8, core = 0xffe2a8, armCol = 0x9ab8ff, hii = 0xff6aa8, bar = true, tilt = 1.05, spin = 0.05, dust = true, lod = 'high' } = {}) {
  if (lod === 'low') n = Math.round(n * 0.4);
  const r = rng(seed), g = new THREE.Group(), ticks = [], cc = rgb(core), ca = rgb(armCol), ch = rgb(hii);
  const arr = []; const push = (rad, ang, y, c, s) => arr.push([rad, ang, y, c, s, spin * (0.5 + 0.5 * (1 - rad / R * 0.8)) * (rad < R * 0.18 ? 0.7 : 1)]);
  const gauss = () => (r() + r() + r() - 1.5) * 0.8165;
  const nArm = Math.round(n * 0.62), nBulge = Math.round(n * 0.22), nBar = bar ? Math.round(n * 0.08) : 0, nField = n - nArm - nBulge - nBar;
  for (let i = 0; i < nArm; i++) {
    const t = Math.pow(r(), 0.75), rad = R * (0.1 + 0.9 * t), arm = i % arms, th = arm * TAU / arms + twist * Math.log(1 + 5 * rad / R) / Math.log(6) * 1.4 + gauss() * (0.3 - 0.12 * t);
    const c = mix3(mix3(cc, ca, Math.min(1, t * 1.4)), [1, 1, 1], r() * 0.25); const knot = r() < 0.07, cx = knot ? mix3(ch, [1, 1, 1], 0.2) : c, b = knot ? r.range(0.7, 1) : r.range(0.35, 0.95);
    push(rad, th, gauss() * R * 0.018 * (1 - 0.5 * t), [cx[0] * b, cx[1] * b, cx[2] * b], R * (knot ? r.range(0.035, 0.06) : r.range(0.008, 0.022)) * (knot ? 1 : 1));
  }
  for (let i = 0; i < nField; i++) { const rad = R * Math.pow(r(), 0.8) * 1.0, th = r() * TAU, c = mix3(cc, ca, rad / R), b = r.range(0.15, 0.45); push(rad, th, gauss() * R * 0.04, [c[0] * b, c[1] * b, c[2] * b], R * r.range(0.007, 0.016)); }
  for (let i = 0; i < nBulge; i++) { const rr = Math.abs(gauss()) * R * 0.16, th = r() * TAU, c = mix3(cc, [1, 0.95, 0.85], r() * 0.5), b = r.range(0.4, 1); push(rr, th, gauss() * R * 0.07 * (1 - rr / (R * 0.4)), [c[0] * b, c[1] * b, c[2] * b], R * r.range(0.01, 0.03)); }
  for (let i = 0; i < nBar; i++) { const u = r.range(-1, 1), th0 = u < 0 ? Math.PI : 0, rad = Math.abs(u) * R * 0.3, c = mix3(cc, [1, 0.9, 0.7], 0.4), b = r.range(0.4, 0.9); arr.push([rad, th0 + gauss() * 0.1, gauss() * R * 0.02, [c[0] * b, c[1] * b, c[2] * b], R * r.range(0.01, 0.025), spin * 0.8]); }
  const m = arr.length, P = new Float32Array(m * 3), C = new Float32Array(m * 3), S = new Float32Array(m), O = new Float32Array(m * 4);
  arr.forEach((q, i) => { C.set(q[3], i * 3); S[i] = q[4]; O.set([q[1], q[5], q[0], q[2]], i * 4); });
  const disc = sprites(P, C, S, { orbit: O, atten: true, soft: 2.4, max: 90, seed: seed + 2 }); g.add(disc); ticks.push((t) => disc.setTime(t));
  if (dust) { const k = Math.round(n * 0.06), P2 = new Float32Array(k * 3), C2 = new Float32Array(k * 3), S2 = new Float32Array(k), O2 = new Float32Array(k * 4);
    for (let i = 0; i < k; i++) { const t = Math.pow(r(), 0.8), rad = R * (0.14 + 0.8 * t), arm = i % arms, th = arm * TAU / arms + twist * Math.log(1 + 5 * rad / R) / Math.log(6) * 1.4 - 0.2 + gauss() * 0.08; O2.set([th, spin * (0.5 + 0.5 * (1 - rad / R * 0.8)), rad, R * 0.012 * gauss()], i * 4); C2.set([0.03, 0.02, 0.05], i * 3); S2[i] = R * r.range(0.03, 0.07); }
    const d = sprites(P2, C2, S2, { orbit: O2, atten: true, soft: 1.5, additive: false, op: 0.6, max: 120, seed: seed + 9 }); g.add(d); ticks.push((t) => d.setTime(t)); }
  const halo = glowDot(core, R * 0.55, { k: 0.5, soft: 2.0, max: 512 }); g.add(halo); const halo2 = glowDot(armCol, R * 2.3, { k: 0.06, soft: 1.2, max: 700 }); g.add(halo2);
  g.rotation.x = tilt; g.userData = { radiusUnits: R, arms, stars: m, note: 'inner stars orbit faster than outer ones; 1 unit = 1 unit (scale as you like)' };
  return addTicks(g, ticks);
}

// ---------- distant galaxies: little tilted smudges scattered on a far shell ----------
export function distantGalaxies({ n = 36, radius = 1000, seed = 21, size = 1 } = {}) {
  const r = rng(seed), g = new THREE.Group(), pts = [];
  const cols = [0xffe2b0, 0xbfd0ff, 0xffc8e0, 0xe0f0ff];
  const P = [], C = [], S = [];
  for (let gi = 0; gi < n; gi++) {
    const d = randDir(r), up = Math.abs(d.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0), e1 = V3().crossVectors(d, up).normalize(), e2 = V3().crossVectors(d, e1).normalize(), ang = r() * TAU;
    const a = radius * r.range(0.012, 0.034) * size, inc = r.range(0.25, 1), cc = rgb(r.pick(cols)), arms = r() < 0.7 ? 2 : 0, base = d.clone().multiplyScalar(radius);
    const cnt = 46; const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let k = 0; k < cnt; k++) {
      const t = Math.pow(r(), 0.8), rad = a * t, th = (arms ? 2.6 * t * 2 + (k % 2) * Math.PI : r() * TAU) + (r() - 0.5) * (arms ? 0.5 : 6.28);
      let x = Math.cos(th) * rad, y = Math.sin(th) * rad * inc; const xr = x * ca - y * sa, yr = x * sa + y * ca; const q = base.clone().addScaledVector(e1, xr).addScaledVector(e2, yr);
      const b = (1 - t * 0.7) * 0.55; P.push(q.x, q.y, q.z); C.push(cc[0] * b, cc[1] * b, cc[2] * b); S.push(a * r.range(0.12, 0.3));
    }
    P.push(base.x, base.y, base.z); C.push(cc[0] * 0.9, cc[1] * 0.9, cc[2] * 0.9); S.push(a * 0.55);
  }
  const p = sprites(new Float32Array(P), new Float32Array(C), new Float32Array(S), { atten: true, soft: 2.0, max: 64, seed: seed + 1 }); g.add(p);
  const ax = V3(0.2, 1, 0.1).normalize();
  g.userData = { count: n }; g.update = g.userData.update = (t) => { p.setTime(t); g.quaternion.setFromAxisAngle(ax, t * 0.002); };
  return setOrder(g, BACK);
}

// ---------- star clusters: globular (Plummer sphere, orange core, blue stragglers) / open (loose blue group) ----------
export function starCluster({ kind = 'globular', R = 20, n = 1600, seed = 4, lod = 'high' } = {}) {
  const r = rng(seed), g = new THREE.Group(); if (lod === 'low') n = Math.round(n * 0.45);
  const P = new Float32Array(n * 3), C = new Float32Array(n * 3), S = new Float32Array(n), gl = kind === 'globular';
  for (let i = 0; i < n; i++) {
    const u = r.range(0.02, 0.98), rad = gl ? R * 0.28 / Math.sqrt(Math.pow(u, -2 / 3) - 1) : R * Math.pow(r(), 0.55) * 0.9, d = randDir(r), rr = Math.min(R, rad), q = d.multiplyScalar(rr);
    P.set([q.x, q.y * (gl ? 1 : 0.7), q.z], i * 3); const t = Math.min(1, rr / R);
    let c = gl ? mix3([1, 0.72, 0.4], [0.9, 0.9, 1], Math.pow(t, 0.7)) : mix3([0.55, 0.7, 1], [0.9, 0.95, 1], r()); if (gl && r() < 0.05) c = [0.6, 0.75, 1];
    const b = r.range(0.4, 1); C.set([c[0] * b, c[1] * b, c[2] * b], i * 3); S[i] = R * (r() < 0.04 ? r.range(0.06, 0.1) : r.range(0.012, 0.04));
  }
  const pts = sprites(P, C, S, { atten: true, soft: 3, tw: 0.4, max: 80, seed: seed + 3 }); g.add(pts);
  g.add(glowDot(gl ? 0xffc080 : 0x8ab0ff, R * (gl ? 0.9 : 1.3), { k: gl ? 0.35 : 0.12, soft: 1.8 }));
  if (!gl) { const w = nebula({ palette: 'icy', R: R * 0.9, n: 160, seed: seed + 5, stars: 0, dark: false, bright: 0.7 }); g.add(w); g.userData.wisps = w; }
  g.userData = { ...g.userData, kind, radiusUnits: R, stars: n };
  g.update = g.userData.update = (t) => { pts.setTime(t); g.userData.wisps?.update(t); pts.rotation.y = t * 0.03; };
  return g;
}

// ---------- shooting stars: head + 12-point tail, each meteor cycles with its own period (closed form) ----------
export function shootingStars({ count = 10, radius = 420, seed = 12, rate = 1, color = 0xcfe6ff } = {}) {
  const r = rng(seed), TR = 13, n = count * TR, P = new Float32Array(n * 3), C = new Float32Array(n * 3), S = new Float32Array(n);
  const ms = Array.from({ length: count }, () => { const d = randDir(r), tan = V3().crossVectors(d, randDir(r)).normalize(); return { s: d.multiplyScalar(radius * r.range(0.5, 1)), v: tan.multiplyScalar(radius * r.range(0.35, 0.7)), T: r.range(3.5, 8) / rate, ph: r(), dur: r.range(0.7, 1.3), w: r.range(0.7, 1.2) }; });
  const cc = rgb(color), geoPts = sprites(P, C, S, { soft: 2.2, op: 1, seed: seed + 1 });
  const upd = (t) => {
    geoPts.setTime(t);
    ms.forEach((m, i) => {
      const s = ((t + m.ph * m.T) % m.T + m.T) % m.T, u = s / m.dur, live = u >= 0 && u <= 1.25;
      for (let k = 0; k < TR; k++) {
        const j = (i * TR + k) * 3, uu = u - k * 0.018, ok = live && uu > 0 && uu < 1; const f = ok ? Math.pow(1 - k / TR, 1.4) * Math.sin(Math.min(1, uu) * Math.PI) ** 0.5 : 0;
        P[j] = m.s.x + m.v.x * uu; P[j + 1] = m.s.y + m.v.y * uu; P[j + 2] = m.s.z + m.v.z * uu;
        const w = k === 0 ? 1 : 0.9 - k * 0.05; C[j] = (cc[0] * w + (k > 4 ? 0.3 : 0)) * f; C[j + 1] = cc[1] * w * f * (k > 5 ? 0.8 : 1); C[j + 2] = cc[2] * w * f * (k > 6 ? 0.6 : 1); S[i * TR + k] = (k === 0 ? 9 : 6 * (1 - k / TR) + 1.5) * m.w * ok;
      }
    });
    const g = geoPts.geometry; g.attributes.position.needsUpdate = true; g.attributes.aCol.needsUpdate = true; g.attributes.aSize.needsUpdate = true;
  };
  geoPts.update = geoPts.userData.update = upd; upd(0); geoPts.renderOrder = BACK + 20; return geoPts;
}

// ---------- drifting dust motes: wrap inside a box, so any camera move shows strong parallax ----------
export function spaceDust({ n = 600, box = [80, 50, 80], vel = [0.5, 0.05, -0.8], seed = 17, color = 0xcfd8ff, size = [0.04, 0.16], lod = 'high' } = {}) {
  const r = rng(seed); if (lod === 'low') n = Math.round(n * 0.5);
  const P = new Float32Array(n * 3), C = new Float32Array(n * 3), S = new Float32Array(n), cc = rgb(color);
  for (let i = 0; i < n; i++) { P.set([r.range(-0.5, 0.5) * box[0], r.range(-0.5, 0.5) * box[1], r.range(-0.5, 0.5) * box[2]], i * 3); const b = r.range(0.25, 0.9), w = r() < 0.15 ? mix3(cc, [1, 0.8, 0.5], 0.6) : cc; C.set([w[0] * b, w[1] * b, w[2] * b], i * 3); S[i] = r.range(size[0], size[1]); }
  const U = (v) => ({ value: v });
  const mat = spriteMat({ atten: true, soft: 2.2, tw: 0.3, max: 40, uniforms: { uBox: U(V3(...box)), uVel: U(V3(...vel)) }, unis: 'uniform vec3 uBox; uniform vec3 uVel;',
    pos: 'vec3 q = mod(position + uVel * uTime + uBox * 0.5, uBox); P = q - uBox * 0.5; vec3 e = min(q, uBox - q) / (uBox * 0.14); fade = clamp(min(e.x, min(e.y, e.z)), 0.0, 1.0);' });
  const p = sprites(P, C, S, { material: mat, seed: seed + 1 }); p.userData.update = p.setTime; p.update = p.setTime; return p;
}

// ---------- orbit rings (dashed or solid) with a bead riding each; period ~ r^1.5 ----------
export function orbitRings({ radii = [4, 6, 8], colors = [0x8ab8ff], tilt = 0, dashed = true, tube = 0.02, beads = true, bead = 0.12, speed = 0.4, eccentric = 0, seed = 2 } = {}) {
  const g = new THREE.Group(), r = rng(seed), beadList = [];
  radii.forEach((R, i) => {
    const col = colors[i % colors.length], segs = 96;
    const ring = new THREE.Group(); g.add(ring);
    const w = tube * (1 + R * 0.02), mb = new MB();
    for (let s = 0; s < segs; s += dashed ? 2 : 1) { const arc = (dashed ? 1 : 1.05) / segs * TAU; mb.g(new THREE.TorusGeometry(R, w, 5, 3, arc), col, [0, 0, 0], [0, 0, s / segs * TAU]); }
    const m = mb.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false }), false); m.rotation.x = -Math.PI / 2; ring.add(m);
    if (beads) { const b = new THREE.Mesh(new THREE.SphereGeometry(bead * (1 + R * 0.03), 16, 12), new THREE.MeshBasicMaterial({ color: col, toneMapped: false })); const gl = glowDot(col, bead * 6 * (1 + R * 0.03), { k: 0.55 }); b.add(gl); ring.add(b); beadList.push({ b, R, a0: r() * TAU }); }
  });
  g.rotation.x = tilt; g.userData = { radii };
  g.update = g.userData.update = (t) => { for (const q of beadList) { const a = q.a0 + speed * t / Math.pow(q.R, 1.5) * 6; q.b.position.set(Math.cos(a) * q.R, 0, Math.sin(a) * q.R); q.b.children[0].setTime?.(t); } };
  g.update(0); return g;
}
