// Sky props: sky domes (day/sunset/dawn/dusk/night/overcast), sun with glow + rays, rainbow, bird flocks (flapping wings),
// hot-air balloons + fleet, jetliner with contrails. Geometry + small shaders only. Metres. Animation = pure function of t.
import * as THREE from 'three';
import { rng } from '../util.js';
import { uni, TAU, mix, sstep, mergeGeos, mtx } from './nature_common.js';
import { softMaterial, contrail } from './nature_clouds.js';

// ---------- sky dome ----------
const PRESETS = {
  noon: { top: 0x2569d8, mid: 0x5fb0f0, hor: 0xcfeaff, ground: 0xbfe0f4, glow: 0xfff0c0, glowK: 0.5, sun: [0.3, 0.86, -0.42], sunCol: 0xfff3c4, stars: 0 },
  morning: { top: 0x3a7ee0, mid: 0x7cc0f2, hor: 0xffe6c4, ground: 0xe8dcc8, glow: 0xffd8a0, glowK: 0.8, sun: [0.7, 0.38, -0.6], sunCol: 0xfff0c0, stars: 0 },
  sunset: { top: 0x23306e, mid: 0xc8507a, hor: 0xffa24a, ground: 0xf08a50, glow: 0xff8a3a, glowK: 1.3, sun: [0.15, 0.07, -1], sunCol: 0xffd070, stars: 0.12 },
  dawn: { top: 0x3b4f9a, mid: 0xf0a0b4, hor: 0xffd8a0, ground: 0xf2c8a8, glow: 0xffc08a, glowK: 1.0, sun: [-0.3, 0.1, -1], sunCol: 0xffe2a0, stars: 0.2 },
  dusk: { top: 0x10163a, mid: 0x4f3878, hor: 0xff7a5a, ground: 0x9a4a5a, glow: 0xff6a4a, glowK: 0.8, sun: [0.2, -0.05, -1], sunCol: 0xff9060, stars: 0.5 },
  night: { top: 0x040716, mid: 0x0c1536, hor: 0x24366a, ground: 0x16204a, glow: 0x8fb0ff, glowK: 0.35, sun: [-0.35, 0.55, -0.75], sunCol: 0xe8f0ff, stars: 1 },
  overcast: { top: 0x7b8798, mid: 0x9aa6b6, hor: 0xc8d0da, ground: 0xb8c0cc, glow: 0xffffff, glowK: 0.08, sun: [0.3, 0.8, -0.5], sunCol: 0xffffff, stars: 0 },
  storm: { top: 0x1c2234, mid: 0x3a4660, hor: 0x6a7a96, ground: 0x56627c, glow: 0xaac0ff, glowK: 0.1, sun: [0.3, 0.8, -0.5], sunCol: 0xaabbdd, stars: 0 },
};
export const SKY_PRESETS = Object.keys(PRESETS);
export function skyDome({ preset = 'noon', radius = 1500, seed = 1 } = {}) {
  const P = PRESETS[preset] ?? PRESETS.noon, g = new THREE.Group(), U = uni(0), r = rng(seed);
  const sunDir = new THREE.Vector3(...P.sun).normalize();
  const m = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color(P.top) }, uMid: { value: new THREE.Color(P.mid) }, uHor: { value: new THREE.Color(P.hor) }, uGround: { value: new THREE.Color(P.ground) }, uGlow: { value: new THREE.Color(P.glow) }, uGlowK: { value: P.glowK }, uSun: { value: sunDir } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uTop, uMid, uHor, uGround, uGlow, uSun; uniform float uGlowK; varying vec3 vD;
void main(){ vec3 d = normalize(vD); float e = d.y;
  float t = pow(max(e, 0.0), 0.5);
  vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.45, t)); c = mix(c, uTop, smoothstep(0.35, 1.0, t));
  c = mix(c, uGround, smoothstep(0.0, -0.25, e));
  float sd = max(dot(d, normalize(uSun)), 0.0);
  float hz = exp(-abs(e) * 5.0);
  c += uGlow * uGlowK * (pow(sd, 3.0) * 0.28 * (0.4 + hz) + pow(sd, 14.0) * 0.5 + pow(sd, 120.0) * 0.6) * (0.35 + 0.65 * hz);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`,
    side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), m); dome.renderOrder = -1000; dome.frustumCulled = false; g.add(dome);
  // stars (night/dusk/dawn): twinkling points
  if (P.stars > 0) {
    const n = Math.round(900 * P.stars) + 60, pos = new Float32Array(n * 3), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) { const a = r() * TAU, y = r.range(0.04, 1), rr = Math.sqrt(1 - y * y); pos.set([Math.cos(a) * rr * radius * 0.97, y * radius * 0.97, Math.sin(a) * rr * radius * 0.97], i * 3); ph[i] = r() * 6.28; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
    const sm = new THREE.ShaderMaterial({ uniforms: { uT: U, uK: { value: P.stars } }, transparent: true, depthWrite: false, toneMapped: false, fog: false,
      vertexShader: 'attribute float ph; uniform float uT; varying float vB; void main(){ vB = 0.55 + 0.45 * sin(uT * 2.0 + ph * 3.0); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; gl_PointSize = 2.0 + 2.2 * fract(ph * 7.31) * vB; }',
      fragmentShader: 'uniform float uK; varying float vB; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), vB * uK * smoothstep(0.5, 0.1, d));\n#include <colorspace_fragment>\n}' });
    const pts = new THREE.Points(geo, sm); pts.frustumCulled = false; pts.renderOrder = -999; g.add(pts);
  }
  // sun / moon disc placed on the dome (angular diameter ~5 deg)
  const body = sun({ radius: radius * 0.034, moon: preset === 'night', rays: preset !== 'night' && preset !== 'overcast' && preset !== 'storm', color: P.sunCol });
  body.position.copy(sunDir).multiplyScalar(radius * 0.86); body.visible = preset !== 'overcast' && preset !== 'storm'; g.add(body);
  g.userData = { sunDir, preset, sunBody: body, update: (t) => { U.value = t; body.userData.update(t); } };
  return g;
}

// ---------- sun (3D: bright core, fresnel glow shells that look the same from any angle, spinning ray spikes) ----------
export function glowShell(R, color, k, p) {
  return new THREE.Mesh(new THREE.SphereGeometry(R, 24, 16), new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(color) }, uK: { value: k } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 uC; uniform float uK; varying vec3 vN; varying vec3 vV; void main(){ float a = pow(clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), ${p.toFixed(2)}) * uK; gl_FragColor = vec4(uC * a, a);
#include <colorspace_fragment>
}` }));
}
export function sun({ radius = 30, color = 0xfff0b0, rays = true, moon = false } = {}) {
  const g = new THREE.Group(), core = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), new THREE.MeshBasicMaterial({ color: moon ? 0xf2efe0 : color, toneMapped: false, fog: false }));
  g.add(core);
  if (moon) { const cr = rng(5); for (let i = 0; i < 9; i++) { const a = cr() * TAU, b = cr.range(-0.7, 0.7), rr = radius * cr.range(0.1, 0.22), c = new THREE.Mesh(new THREE.SphereGeometry(rr, 12, 8), new THREE.MeshBasicMaterial({ color: 0xcfcab8, toneMapped: false, fog: false })); c.position.set(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)).multiplyScalar(radius * 0.97); c.scale.set(1, 1, 0.12); c.lookAt(c.position.clone().multiplyScalar(2)); g.add(c); } }
  const shells = [glowShell(radius * 1.35, color, 0.85, 1.6), glowShell(radius * 2.3, color, 0.5, 2.2), glowShell(radius * 4.2, color, 0.3, 3.2)]; shells.forEach((s) => g.add(s));
  const rayG = new THREE.Group(); const cm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, toneMapped: false, fog: false, depthWrite: false });
  if (rays) { const n = 24; for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996, d = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr), c = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.12, radius * (1.4 + (i % 3) * 0.35), 5), cm); c.position.copy(d).multiplyScalar(radius * 1.35 + radius * 0.4); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); c.userData.k = i; rayG.add(c); } g.add(rayG); }
  g.userData = { realWidthM: 1392700000, update: (t) => { rayG.rotation.y = t * 0.15; rayG.rotation.z = t * 0.07; rayG.children.forEach((c) => c.scale.set(1, 1 + 0.18 * Math.sin(t * 2.2 + c.userData.k * 1.7), 1)); shells.forEach((s, i) => s.scale.setScalar(1 + 0.03 * Math.sin(t * 1.3 + i))); } };
  return g;
}

// ---------- rainbow: soft spectrum ribbon, fades at both feet, shimmers; faint secondary bow optional ----------
const SPECTRUM = [0xff3b3b, 0xff8a2b, 0xffe14a, 0x4acb6a, 0x3a9aff, 0x5a4aff, 0x9a4aff];
export function rainbow({ R = 600, bandW = 36, secondary = true, mist = true } = {}) {
  const g = new THREE.Group(), U = uni(0), n = 7;
  const bow = (R0, w, op, rev) => {
    const SEG = 72, ROW = 28, pos = [], aA = [], aC = [], idx = [], c = new THREE.Color();
    for (let i = 0; i <= SEG; i++) { const u = i / SEG, a = u * Math.PI, fade = Math.pow(Math.sin(Math.PI * (0.02 + 0.96 * u)), 0.55) * sstep(0, 0.08, u) * sstep(0, 0.08, 1 - u) + 0.0;
      for (let j = 0; j <= ROW; j++) { const v = j / ROW, rr = R0 - v * w * n; pos.push(Math.cos(a) * rr, Math.sin(a) * rr, 0);
        const sv = rev ? 1 - v : v, k = Math.min(n - 1.001, sv * n), i0 = Math.floor(k), f = k - i0; c.set(SPECTRUM[i0]).lerp(new THREE.Color(SPECTRUM[Math.min(n - 1, i0 + 1)]), sstep(0.42, 0.58, f)); aC.push(c.r, c.g, c.b);
        aA.push(fade * Math.pow(Math.sin(Math.PI * (j + 0.5) / (ROW + 1)), 0.5)); }
      if (i < SEG) for (let j = 0; j < ROW; j++) { const b = i * (ROW + 1) + j, d = (ROW + 1); idx.push(b, b + d, b + 1, b + 1, b + d, b + d + 1); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aA', new THREE.Float32BufferAttribute(aA, 1)); geo.setAttribute('aCol', new THREE.Float32BufferAttribute(aC, 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, softMaterial(U, { vc: true, opacity: op, shimmer: 0.12 })); m.renderOrder = 4; m.frustumCulled = false; return m;
  };
  g.add(bow(R, bandW, 0.95, false));
  if (secondary) g.add(bow(R * 1.6, bandW * 1.0, 0.3, true));
  if (mist) for (const sx of [-1, 1]) { const mm = new THREE.Mesh(new THREE.SphereGeometry(R * 0.12, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false, fog: false })); mm.scale.set(1.4, 0.7, 0.6); mm.position.set(sx * (R - bandW * 3.5), R * 0.03, 0); g.add(mm); }
  g.userData = { realWidthM: R * 2, realHeightM: R, update: (t) => { U.value = t; } };
  return g;
}

// ---------- birds ----------
function wingGeos() {
  const tri = (pts) => { const p = []; const q = [[0, 1, 2], [0, 2, 3]]; for (const t of q) for (const i of t) p.push(...pts[i]); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g; };
  const inner = tri([[0, 0, 0.16], [0.55, 0.02, 0.1], [0.55, 0.02, -0.14], [0, 0, -0.26]]);
  const outer = tri([[0, 0, 0.1], [0.5, 0, -0.1], [0.46, 0, -0.26], [0, 0, -0.14]]);
  return { inner, outer };
}
function birdBodyGeo() {
  const part = (g, color, m) => ({ g, color, m });
  const body = new THREE.SphereGeometry(0.1, 10, 8), head = new THREE.SphereGeometry(0.065, 8, 6), beak = new THREE.ConeGeometry(0.025, 0.1, 5), tail = new THREE.ConeGeometry(0.07, 0.24, 4);
  beak.rotateX(Math.PI / 2); tail.rotateX(-Math.PI / 2);
  return mergeGeos([part(body, 0xffffff, mtx(0, 0, 0, 0, 0.9, 0.9, 2.3)), part(head, 0xffffff, mtx(0, 0.02, 0.21)), part(beak, 0xffa030, mtx(0, 0.01, 0.31)), part(tail, 0xdddddd, mtx(0, 0, -0.27, 0, 1, 0.25, 1))]);
}
const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _m3 = new THREE.Matrix4();
// pattern: 'v' (formation), 'line', 'swarm' (murmuration ball), 'soar' (a few big birds circling). span = wingspan in metres.
export function birdFlock({ count = 21, pattern = 'v', radius = 140, altitude = 70, speed = 13, span = 1.1, color = 0xffffff, tip = 0x303642, seed = 3, flapHz = 2.6 } = {}) {
  const r = rng(seed), g = new THREE.Group(), L = span / 2;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }), wmat = new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide });
  const { inner, outer } = wingGeos();
  const bodyM = new THREE.InstancedMesh(birdBodyGeo(), mat, count), inM = new THREE.InstancedMesh(inner, wmat, count * 2), outM = new THREE.InstancedMesh(outer, wmat, count * 2);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) { const k = r.range(0.85, 1.05); bodyM.setColorAt(i, c.set(color).multiplyScalar(k)); for (const s of [0, 1]) { inM.setColorAt(i * 2 + s, c.set(color).multiplyScalar(k)); outM.setColorAt(i * 2 + s, c.set(tip).lerp(new THREE.Color(color), pattern === 'swarm' ? 0 : 0.25)); } }
  [bodyM, inM, outM].forEach((m) => { m.frustumCulled = false; m.castShadow = false; g.add(m); });
  const P = Array.from({ length: count }, (_, i) => ({ ph: r() * TAU, u: new THREE.Vector3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize(), rr: Math.cbrt(r()), sc: r.range(0.9, 1.15) }));
  const lead = (t) => { const a = speed * t / radius; return [Math.cos(a) * radius, altitude + 3 * Math.sin(0.3 * t) , Math.sin(a) * radius * 0.6]; };
  const spacing = span * 1.5;
  const posOf = (i, t) => {
    const p = P[i];
    if (pattern === 'swarm') { const a = speed * t / radius * 0.8, cx = Math.cos(a) * radius, cz = Math.sin(a) * radius * 0.6, w = 0.6 * t + p.ph * 0.15, R = radius * 0.28 * p.rr * (1 + 0.35 * Math.sin(t * 0.7 + p.u.x * 3)), ca = Math.cos(w), sa = Math.sin(w), ux = p.u.x * ca - p.u.z * sa, uz = p.u.x * sa + p.u.z * ca; return [cx + ux * R * 1.9, altitude + p.u.y * R * 0.55 + 4 * Math.sin(0.4 * t + p.ph), cz + uz * R * 0.9]; }
    if (pattern === 'soar') { const a = 0.12 * t * (1 + 0.08 * i) + p.ph, rr = radius * (0.5 + 0.5 * p.rr); return [Math.cos(a) * rr, altitude + i * 6 + 3 * Math.sin(0.5 * t + p.ph), Math.sin(a) * rr]; }
    const row = pattern === 'line' ? i : Math.ceil(i / 2), side = pattern === 'line' ? 0 : (i % 2 ? 1 : -1), d = row * spacing * 0.9 / speed, tt = t - d, l = lead(tt), a = speed * tt / radius;
    const tx = -Math.sin(a), tz = 0.6 * Math.cos(a), tl = Math.hypot(tx, tz), nx = tz / tl, nz = -tx / tl;
    return [l[0] + nx * side * row * spacing, l[1] - row * 0.15 + 0.35 * Math.sin(1.7 * t + p.ph), l[2] + nz * side * row * spacing];
  };
  const update = (t) => {
    for (let i = 0; i < count; i++) {
      const p0 = posOf(i, t - 0.25), p1 = posOf(i, t), p2 = posOf(i, t + 0.25);
      const f = _v.set(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]).normalize();
      const fx = f.x, fy = f.y, fz = f.z;
      const f0x = p1[0] - p0[0], f0z = p1[2] - p0[2], f1x = p2[0] - p1[0], f1z = p2[2] - p1[2];
      const yaw = Math.atan2(f0x * f1z - f0z * f1x, f0x * f1x + f0z * f1z), bank = Math.max(-0.7, Math.min(0.7, -yaw * (pattern === 'soar' ? 14 : 5)));
      const rx = fz, ry = 0, rz = -fx, rl = Math.hypot(rx, rz) || 1;           // right = Y x f
      const R = new THREE.Vector3(rx / rl, 0, rz / rl), F = new THREE.Vector3(fx, fy, fz), Up = new THREE.Vector3().crossVectors(F, R).normalize();
      const cb = Math.cos(bank), sb = Math.sin(bank), R2 = R.clone().multiplyScalar(cb).addScaledVector(Up, sb), U2 = Up.clone().multiplyScalar(cb).addScaledVector(R, -sb);
      _m.makeBasis(R2, U2, F); _m.setPosition(p1[0], p1[1], p1[2]); const sc = L * P[i].sc; _m3.makeScale(sc, sc, sc); _m.multiply(_m3);
      bodyM.setMatrixAt(i, _m);
      const hz = pattern === 'soar' ? 0.35 : flapHz * (0.92 + 0.16 * P[i].sc), ph = TAU * hz * t + P[i].ph + (pattern === 'v' || pattern === 'line' ? i * 0.35 : 0);
      const glide = pattern === 'soar' ? 0.12 : 1, th = (0.55 * Math.sin(ph) + 0.1) * glide, th2 = (0.5 * Math.sin(ph - 0.9) + 0.05) * glide;
      for (const s of [0, 1]) {
        const mir = s ? -1 : 1;
        _m2.makeScale(mir, 1, 1); _m3.makeRotationZ(th); _m2.multiply(_m3); _m2.premultiply(_m);                       // body * mirror * rot
        inM.setMatrixAt(i * 2 + s, _m2);
        _m3.makeTranslation(0.55, 0.02, 0); _m2.multiply(_m3); _m3.makeRotationZ(th2); _m2.multiply(_m3);
        outM.setMatrixAt(i * 2 + s, _m2);
      }
    }
    bodyM.instanceMatrix.needsUpdate = inM.instanceMatrix.needsUpdate = outM.instanceMatrix.needsUpdate = true;
  };
  update(0); g.userData = { count, wingspanM: span, update };
  return g;
}

// ---------- hot-air balloon ----------
export function hotAirBalloon({ seed = 1, colors = [0xe53935, 0xffd23f, 0x2f6fd6], pattern = 'stripes', scale = 1, gores = 16 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const H = 20, Rmax = 8.7, y0 = 5.0, prof = [];
  for (let i = 0; i <= 34; i++) { const s = i / 34, rr = Rmax * Math.sin(Math.PI * (0.13 + 0.87 * Math.pow(s, 1.55))) ** 0.9; prof.push(new THREE.Vector2(Math.max(0.02, rr), y0 + s * H)); }
  prof[0].x = 1.75;
  const lg = new THREE.LatheGeometry(prof, gores * 3).toNonIndexed(), p = lg.attributes.position, col = new Float32Array(p.count * 3), cc = new THREE.Color();
  for (let f = 0; f < p.count; f += 3) {
    const cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3, cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3, cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
    const gi = Math.floor(((Math.atan2(cx, cz) / TAU + 1) % 1) * gores), s = (cy - y0) / H;
    let k = gi; if (pattern === 'bands') k = Math.floor(s * 7); else if (pattern === 'chevron') k = gi + Math.floor(s * 6 + (gi % 2) * 0.5); else if (pattern === 'checker') k = gi + Math.floor(s * 8);
    cc.set(colors[((k % colors.length) + colors.length) % colors.length]); if (s > 0.94) cc.set(colors[0]); if (s < 0.04) cc.set(0x2a2a30);
    col.set([cc.r, cc.g, cc.b, cc.r, cc.g, cc.b, cc.r, cc.g, cc.b], f * 3);
  }
  lg.setAttribute('color', new THREE.BufferAttribute(col, 3)); lg.computeVertexNormals();
  const env = new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide })); env.castShadow = true; g.add(env);
  // seam ribs (thin tubes along the gores) and a mouth ring
  const rib = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.6 });
  for (let i = 0; i < gores; i += 1) { const a = i / gores * TAU, pts = prof.filter((_, k) => k % 3 === 0 || k === prof.length - 1).map((q) => new THREE.Vector3(Math.sin(a) * (q.x + 0.03), q.y, Math.cos(a) * (q.x + 0.03))); const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.045, 4), rib); g.add(t); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.09, 6, 24), new THREE.MeshStandardMaterial({ color: 0x2a2a30 })); ring.rotation.x = Math.PI / 2; ring.position.y = y0; g.add(ring);
  // basket (wicker: rounded box + horizontal weave rings), burner frame, flame
  const bm = new THREE.MeshStandardMaterial({ color: 0xb98a54, roughness: 0.9 }), basket = new THREE.Group();
  const bw = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.05, 1.5), bm); bw.position.y = 0.52; basket.add(bw);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.045, 1.56), new THREE.MeshStandardMaterial({ color: 0x8a6034, roughness: 0.95 })); b.position.y = 0.12 + i * 0.17; basket.add(b); }
  const rim = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.1, 1.62), new THREE.MeshStandardMaterial({ color: 0x6a4a2a })); rim.position.y = 1.06; basket.add(rim);
  g.add(basket);
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa4b4, metalness: 0.6, roughness: 0.35 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.1, 5), new THREE.MeshStandardMaterial({ color: 0x5a4a38 })); const top = new THREE.Vector3(sx * 1.35, y0 + 0.1, sz * 1.35), bot = new THREE.Vector3(sx * 0.7, 1.05, sz * 0.7); rope.position.copy(top).add(bot).multiplyScalar(0.5); rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize()); rope.scale.y = top.distanceTo(bot) / 4.1; g.add(rope); }
  for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), steel); post.position.set(sx * 0.6, 2.1, 0); basket.add(post); }
  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.4, 10), steel); burner.position.y = 3.2; g.add(burner);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.2, 10), new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.9, toneMapped: false })); flame.position.y = 4.4; g.add(flame);
  const flameIn = new THREE.Mesh(new THREE.ConeGeometry(0.17, 1.5, 8), new THREE.MeshBasicMaterial({ color: 0xfff2b0, toneMapped: false })); flameIn.position.y = 4.1; g.add(flameIn);
  g.scale.setScalar(scale);
  const ph = r() * TAU;
  g.userData = { realHeightM: (y0 + H) * scale, realWidthM: Rmax * 2 * scale, update: (t, k = 0) => {
    const tt = t + ph + k;
    basket.rotation.z = 0.04 * Math.sin(tt * 0.7); basket.rotation.x = 0.03 * Math.sin(tt * 0.53 + 1);
    env.scale.set(1 + 0.012 * Math.sin(tt * 0.9), 1 + 0.01 * Math.sin(tt * 1.3), 1 + 0.012 * Math.cos(tt * 0.9));
    const burst = Math.max(0, Math.sin(tt * 0.9)) ** 3, fl = 0.55 + 0.45 * burst + 0.1 * Math.sin(tt * 31);
    flame.scale.set(1 + 0.2 * Math.sin(tt * 27), fl * 1.3, 1 + 0.2 * Math.cos(tt * 23)); flame.position.y = 3.4 + fl * 1.1; flameIn.scale.set(1, fl * 1.2, 1); flameIn.position.y = 3.3 + fl * 0.75;
    g.rotation.y = 0.25 * Math.sin(tt * 0.2); g.rotation.z = 0.015 * Math.sin(tt * 0.45);
  } };
  return g;
}
export function balloonFleet({ count = 7, spread = 260, seed = 4, near = 40, drift = 1.4 } = {}) {
  const r = rng(seed), g = new THREE.Group(), items = [];
  const pals = [[0xe53935, 0xffd23f, 0x2f6fd6], [0xff8a2b, 0xffffff, 0x2bb7b0], [0x8a52c9, 0xffd23f, 0xff5c8a], [0x2fa66a, 0xffffff, 0xe53935], [0x2f6fd6, 0xffffff, 0xffd23f], [0xff5c8a, 0xffffff, 0x8a52c9]], pats = ['stripes', 'bands', 'chevron', 'checker'];
  for (let i = 0; i < count; i++) {
    const b = hotAirBalloon({ seed: seed + i, colors: pals[i % pals.length], pattern: pats[i % pats.length], scale: r.range(0.85, 1.15) });
    const x = (i / Math.max(1, count - 1) - 0.5) * spread + r.range(-20, 20), z = -near - r.range(0, spread * 0.8), y = r.range(60, 160) + z * 0.1;
    b.position.set(x, y, z); g.add(b); items.push({ b, x, y, z, ph: r() * TAU, sp: r.range(0.7, 1.3) });
  }
  g.userData = { realHeightM: 25, update: (t) => { for (const it of items) { it.b.userData.update(t, it.ph); it.b.position.set(it.x + drift * it.sp * t, it.y + 6 * Math.sin(t * 0.18 * it.sp + it.ph) + 2 * Math.sin(t * 0.5 + it.ph), it.z); } } };
  return g;
}

// ---------- jetliner (narrow-body, 1 unit = 1 m) + contrails ----------
export function jetliner({ length = 39, color = 0xf4f6fa, accent = 0x2f6fd6 } = {}) {
  const g = new THREE.Group(), k = length / 39.5;
  const white = new THREE.MeshStandardMaterial({ color, roughness: 0.35 }), acc = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4 }), dark = new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 0.3 }), grey = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, roughness: 0.4, metalness: 0.4 });
  const prof = [[0.12, -19.7], [0.75, -17.4], [1.5, -12.5], [1.88, -6], [1.88, 10], [1.78, 14.5], [1.35, 17.4], [0.6, 19.1], [0.02, 19.75]].map(([rr, y]) => new THREE.Vector2(rr, y));
  const fg = new THREE.LatheGeometry(prof, 28); fg.rotateX(Math.PI / 2);
  const p = fg.attributes.position, cl = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); c.set(color); if (y < -0.9 && Math.abs(p.getX(i)) < 2) c.set(0xd8dee8); if (z > 15.8) c.set(0x2a2f3a); if (y > -0.5 && y < -0.2 && z > -14 && z < 14) c.set(accent); cl[i * 3] = c.r; cl[i * 3 + 1] = c.g; cl[i * 3 + 2] = c.b; }
  fg.setAttribute('color', new THREE.BufferAttribute(cl, 3)); fg.computeVertexNormals();
  const fus = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 })); fus.castShadow = true; g.add(fus);
  const wingShape = (pts, depth, mt) => { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach((q) => s.lineTo(...q)); const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); geo.rotateX(Math.PI / 2); geo.translate(0, depth / 2, 0); return new THREE.Mesh(geo, mt); };
  for (const sd of [-1, 1]) {
    const w = wingShape([[1.5, 3.5], [17, -4.2], [17.2, -6.2], [1.5, -3.2]].map(([x, z]) => [x * sd, z]), 0.34, white); w.position.set(0, -0.9, 0); w.rotation.z = sd * 0.06; g.add(w);
    const wl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 1.6), acc); wl.position.set(sd * 17.1, 0.1, -5.2); wl.rotation.z = sd * -0.15; g.add(wl);
    const st = wingShape([[1, -14.2], [6.4, -18], [6.4, -19.4], [1, -17.4]].map(([x, z]) => [x * sd, z]), 0.2, white); st.position.set(0, 1.0, 0); g.add(st);
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.0, 3.8, 18), grey); eng.rotation.x = Math.PI / 2; eng.position.set(sd * 5.6, -1.9, 1.6); eng.castShadow = true; g.add(eng);
    const inl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.12, 16), dark); inl.rotation.x = Math.PI / 2; inl.position.set(sd * 5.6, -1.9, 3.55); g.add(inl);
    const ex = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 14), dark); ex.rotation.x = -Math.PI / 2; ex.position.set(sd * 5.6, -1.9, -0.9); g.add(ex);
    const pyl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 2.6), white); pyl.position.set(sd * 5.6, -1.15, 1.2); g.add(pyl);
  }
  const fs = new THREE.Shape(); [[-11, 1.6], [-19.4, 1.6], [-19.8, 9.6], [-17.6, 9.6]].forEach(([u, v], i) => (i ? fs.lineTo(u, v) : fs.moveTo(u, v)));
  const fgeo = new THREE.ExtrudeGeometry(fs, { depth: 0.3, bevelEnabled: false }); fgeo.translate(0, 0, -0.15); fgeo.rotateY(-Math.PI / 2);
  const fin = new THREE.Mesh(fgeo, acc); fin.castShadow = true; g.add(fin);
  // windows: instanced dark ovals along both sides + cockpit
  const wg = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.42, 0.3), dark, 62), o = new THREE.Object3D(); let n = 0;
  for (const sd of [-1, 1]) for (let i = 0; i < 30; i++) { o.position.set(sd * 1.86, 0.62, -12.5 + i * 0.84 + 1.6); o.updateMatrix(); wg.setMatrixAt(n++, o.matrix); }
  for (const sd of [-1, 1]) { o.position.set(sd * 1.0, 0.75, 17.15); o.rotation.set(0.35, sd * 0.9, 0); o.updateMatrix(); wg.setMatrixAt(n++, o.matrix); o.rotation.set(0, 0, 0); }
  wg.count = n; g.add(wg);
  g.scale.setScalar(k);
  g.userData = { realWidthM: 35.8 * k, realLengthM: length, realHeightM: 12.5 * k, update: () => {} };
  return g;
}
// plane flying straight along +z at cruise speed, two contrails (one per engine) that widen and fade behind it. Real scale (11 km, 230 m/s).
export function contrailJet({ altitude = 11000, speed = 230, length = 39, count = 130, seed = 2 } = {}) {
  const g = new THREE.Group(), jet = jetliner({ length }), k = length / 39.5;
  const src = (t) => { const a = [0, 0, speed * t]; a.speed = speed; return a; };
  const ct = contrail({ source: src, offsets: [[-5.6 * k, -1.9 * k, -4 * k], [5.6 * k, -1.9 * k, -4 * k]], count, maxAge: 40, grow: 1.5, r0: 2.6 * k });
  g.add(jet, ct.group);
  g.position.y = altitude;
  g.userData = { realHeightM: 12.5 * k, altitudeM: altitude, update: (t) => { jet.position.set(0, 0, speed * t); ct.update(t); } };
  return g;
}
