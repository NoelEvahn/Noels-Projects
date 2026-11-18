// 3D hair: displaced scalp cap + tapered "locks" (tubes with a radius profile) + ringlet curls.
// buildHair(headGroup, R, style, color, seed) adds meshes to the head. Head faces +Z, +Y up.
import * as THREE from 'three';
import { mat, add, sph, tor, rng, shade } from './util.js';

// Tapered tube along a smooth curve. radius(u) goes r0 -> r1 with a rounded tip.
export function lockGeo(pts, r0, r1, { segs = 10, rs = 8, tip = 0.5 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, segs, 1, rs, false);
  const pos = g.attributes.position;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, c = curve.getPointAt(u);
    const rad = (r0 + (r1 - r0) * u) * (1 - tip * Math.pow(u, 5));
    for (let j = 0; j <= rs; j++) {
      const k = i * (rs + 1) + j;
      pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * rad, c.y + (pos.getY(k) - c.y) * rad, c.z + (pos.getZ(k) - c.z) * rad);
    }
  }
  g.computeVertexNormals();
  return g;
}


// scalp cap: sphere portion with gentle seeded lumps. tilt rotates the cap backward so the hairline rises.
export function scalpGeo(R, extent = 0.52, seed = 1, lump = 0.025) {
  const g = new THREE.SphereGeometry(R * 1.035, 56, 36, 0, Math.PI * 2, 0, Math.PI * extent);
  const p = g.attributes.position, r = rng(seed), ph = [r() * 6, r() * 6, r() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), l = Math.hypot(x, y, z);
    const n = Math.sin(x * 9 + ph[0]) * Math.sin(y * 8 + ph[1]) * Math.sin(z * 9 + ph[2]);
    const k = 1 + lump * n;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}

export function buildHair(head, R, style, color, seed = 1) {
  const r = rng(seed * 977 + 13);
  const S2 = { side: THREE.DoubleSide }; const dark = mat(shade(color, 0.78), { rough: 0.7, ...S2 }), base = mat(color, { rough: 0.62, ...S2 }), light = mat(shade(color, 1.3), { rough: 0.55, ...S2 });
  const hairMats = [dark, base, base, light];
  const g = new THREE.Group(); head.add(g);
  const cap = (extent = 0.52, tilt = -0.5, lump = 0.025, y = 0.06, z = -0.05) => { const m = new THREE.Mesh(scalpGeo(R, extent, seed, lump), base); m.rotation.x = tilt; m.position.set(0, R * y, R * z); m.castShadow = true; g.add(m); return m; };
  // point on head surface: theta from top (0..π), phi around (0 = +Z front, +π/2 = +X)
  const P = (theta, phi, k = 1.0) => [Math.sin(theta) * Math.sin(phi) * R * k, Math.cos(theta) * R * k, Math.sin(theta) * Math.cos(phi) * R * k];
  const lock = (a, b, c, r0, r1, m = null, o = {}) => { const mesh = new THREE.Mesh(lockGeo([a, b, c].filter(Boolean), r0 * R, r1 * R, o), m ?? r.pick(hairMats)); mesh.castShadow = true; g.add(mesh); return mesh; };
  // lock from surface point outward then to target offset (all in R units), with bulge
  const strand = (theta, phi, tx, ty, tz, r0 = 0.15, r1 = 0.05, bulge = [0, 0.2, 0], o = {}) => {
    const s = P(theta, phi, 0.96), e = [s[0] + tx * R, s[1] + ty * R, s[2] + tz * R];
    const m = [(s[0] + e[0]) / 2 + bulge[0] * R, (s[1] + e[1]) / 2 + bulge[1] * R, (s[2] + e[2]) / 2 + bulge[2] * R];
    return lock(s, m, e, r0, r1, null, o);
  };
  // lock that lies along the skull: from (theta0,phi) sweeping dTheta toward the nape/forehead, optionally twisting in phi
  const flow = (th0, phi, dth, twist = 0, r0 = 0.2, r1 = 0.09, lift = 0.07, o = {}) => lock(P(th0, phi, 1.0), P(th0 + dth / 2, phi + twist / 2, 1.0 + lift), P(th0 + dth, phi + twist, 1.0 + lift * 0.4), r0, r1, null, { segs: 8, tip: 0.45, ...o });
  const ringlet = (theta, phi, s = 0.16, m = null) => { const p = P(theta, phi, 1.0); const t = new THREE.Mesh(new THREE.TorusGeometry(R * s, R * s * 0.55, 10, 18, Math.PI * 1.7), m ?? r.pick(hairMats)); t.position.set(...p); t.lookAt(p[0] * 2, p[1] * 2, p[2] * 2); t.rotateZ(r() * 6.28); t.castShadow = true; g.add(t); return t; };
  const puff = (x, y, z, s, m = null) => { const q = new THREE.Mesh(new THREE.SphereGeometry(R * s, 16, 12), m ?? r.pick(hairMats)); q.position.set(x * R, y * R, z * R); q.castShadow = true; g.add(q); return q; };
  const d2r = Math.PI / 180;

  switch (style) {
    case 'bald': break;

    case 'hatHair': { // hair visible under hats/helmets: fringe + nape only
      for (let i = 0; i < 8; i++) { const ph = -0.8 + i * 0.23; strand(70 * d2r, ph, ph * 0.1, -0.1, 0.2, 0.12, 0.06, [0, 0.05, 0.05], { segs: 6 }); }
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) strand((84 + k * 4) * d2r, s * (1.3 + k * 0.12), s * 0.1, -0.25, -0.05, 0.12, 0.06, [0, 0, 0], { segs: 6 });
      for (let i = 0; i < 8; i++) strand((92 + r() * 6) * d2r, 3.14 + (i - 3.5) * 0.3, 0, -0.3, -0.12, 0.14, 0.06, [0, 0, -0.04], { segs: 6 });
      break; }
    case 'short': { // neat cap with a short fringe and side tufts
      cap(0.5, -0.55);
      for (let i = 0; i < 14; i++) flow((8 + r() * 30) * d2r, (i / 14) * 6.283, (26 + r() * 10) * d2r, r.range(-0.3, 0.3), 0.17, 0.08, 0.05);
      for (let i = 0; i < 9; i++) { const ph = (-0.8 + i * 0.2) * 1; strand(62 * d2r, ph, ph * 0.18, -0.12, 0.2, 0.13, 0.045, [0, 0.1, 0.05], { segs: 6 }); }
      for (const s of [-1, 1]) strand(84 * d2r, s * 1.4, s * 0.04, -0.3, -0.04, 0.11, 0.04, [s * 0.05, 0, 0], { segs: 6 });
      for (let i = 0; i < 7; i++) strand(92 * d2r, 3.14 + (i - 3) * 0.3, 0, -0.3, -0.1, 0.12, 0.05, [0, 0, -0.05], { segs: 6 });
      break;
    }
    case 'messy': { // hero: layered swept locks lying over the skull + forward fringe + a couple of cowlicks
      cap(0.55, -0.45, 0.03);
      for (let i = 0; i < 20; i++) { const ph = (i / 20) * 6.283 + r() * 0.3, th = (7 + r() * 36) * d2r; flow(th, ph, (28 + r() * 18) * d2r, r.range(-0.5, 0.5), 0.22, 0.09, 0.09); }
      for (let i = 0; i < 9; i++) { const ph = -0.9 + i * 0.225; strand(46 * d2r, ph, ph * 0.28 + 0.1, -0.15, 0.32, 0.15, 0.06, [0.04, 0.2, 0.1], { segs: 8 }); }
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) strand((64 + k * 7) * d2r, s * (1.15 + k * 0.09), s * 0.28, -0.12 - k * 0.04, -0.12, 0.19, 0.07, [s * 0.1, 0.05, 0], { segs: 8 });
      for (let i = 0; i < 10; i++) flow((62 + r() * 12) * d2r, 3.14 + (i - 4.5) * 0.3, (30 + r() * 10) * d2r, 0, 0.23, 0.1, 0.06);
      for (let i = 0; i < 3; i++) strand(18 * d2r, 1 + i * 2.1, Math.sin(1 + i * 2.1) * 0.3, 0.32, Math.cos(1 + i * 2.1) * 0.3, 0.17, 0.07, [0.0, 0.25, 0.0], { segs: 8 });
      break; }
    case 'parting': { // side part, swept
      cap(0.55, -0.5);
      for (let i = 0; i < 10; i++) { const ph = -0.2 - i * 0.14; strand(36 * d2r, ph, -0.3 - i * 0.03, -0.2, 0.28, 0.15, 0.04, [-0.05, 0.22, 0.12], { segs: 8 }); }
      for (let i = 0; i < 7; i++) { const ph = 0.15 + i * 0.12; strand(34 * d2r, ph, 0.08 + i * 0.02, -0.12, 0.3, 0.14, 0.04, [0.08, 0.2, 0.1], { segs: 8 }); }
      for (let i = 0; i < 9; i++) strand((70 + r() * 20) * d2r, 3.14 + (i - 4) * 0.34, 0, -0.3, -0.18, 0.18, 0.05, [0, 0, -0.06], { segs: 7 });
      for (const s of [-1, 1]) strand(80 * d2r, s * 1.3, s * 0.08, -0.35, 0, 0.12, 0.04, [0, 0, 0], { segs: 6 });
      break;
    }
    case 'bun': {
      cap(0.55, -0.55);
      for (let i = 0; i < 9; i++) { const ph = -0.9 + i * 0.225; strand(46 * d2r, ph, ph * 0.15, -0.15, 0.25, 0.13, 0.04, [0, 0.14, 0.1], { segs: 7 }); }
      for (let i = 0; i < 6; i++) strand((72 + r() * 10) * d2r, 3.14 + (i - 2.5) * 0.3, 0, 0.25, -0.2, 0.17, 0.08, [0, 0.1, -0.1], { segs: 7 });
      puff(0, 1.18, -0.38, 0.34, base); const t = new THREE.Mesh(new THREE.TorusGeometry(R * 0.3, R * 0.07, 8, 20), light); t.position.set(0, R * 1.18, -R * 0.38); t.rotation.set(0.4, 0.3, 0); g.add(t);
      break;
    }
    case 'curly': {
      cap(0.5, -0.5, 0.02);
      for (let i = 0; i < 34; i++) { const th = (18 + r() * 62) * d2r; ringlet(th, r() * 6.28, 0.12 + r() * 0.05); }
      for (let i = 0; i < 12; i++) puff(Math.cos(i * 0.9) * 0.55, 0.78 + (i % 3) * 0.12, Math.sin(i * 1.1) * 0.5 - 0.1, 0.2);
      for (let i = 0; i < 10; i++) ringlet((75 + r() * 20) * d2r, 3.14 + (i - 4.5) * 0.4, 0.14);
      break;
    }
    case 'long': {
      cap(0.55, -0.5);
      for (let i = 0; i < 10; i++) { const ph = -0.9 + i * 0.2; strand(40 * d2r, ph, ph * 0.1, -0.2, 0.28, 0.14, 0.04, [ph * 0.05, 0.2, 0.1], { segs: 8 }); }
      for (const s of [-1, 1]) for (let k = 0; k < 5; k++) strand((60 + k * 4) * d2r, s * (1.25 + k * 0.07), s * 0.12, -1.1 - k * 0.05, -0.1 - k * 0.07, 0.2, 0.06, [s * 0.14, -0.1, 0], { segs: 12 });
      for (let i = 0; i < 12; i++) strand((72 + r() * 15) * d2r, 3.14 + (i - 5.5) * 0.28, 0, -1.25 - r() * 0.2, -0.2, 0.2, 0.07, [0, -0.2, -0.12], { segs: 12 });
      break;
    }
    case 'spiky': {
      cap(0.46, -0.45, 0.02);
      for (let i = 0; i < 14; i++) { const th = (10 + (i % 3) * 22) * d2r, ph = (i / 14) * 6.28; strand(th, ph, Math.sin(ph) * 0.5, 0.55, Math.cos(ph) * 0.5, 0.2, 0.01, [0, 0, 0], { segs: 5, tip: 0.0 }); }
      break;
    }
    case 'wispy': {
      cap(0.42, -0.4, 0.02);
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) strand((78 + k * 4) * d2r, s * (1.2 + k * 0.1), s * 0.25, -0.1, -0.05, 0.1, 0.03, [s * 0.1, 0.1, 0], { segs: 7 });
      for (let i = 0; i < 5; i++) strand(26 * d2r, i * 1.26, 0.1, 0.3, 0.1, 0.06, 0.01, [0.1, 0.1, 0], { segs: 6 });
      break;
    }
    case 'cavemanMop': {
      cap(0.6, -0.4, 0.03);
      for (let i = 0; i < 26; i++) { const th = (30 + r() * 55) * d2r, ph = r() * 6.28; strand(th, ph, Math.sin(ph) * 0.45, -0.5 - r() * 0.5, Math.cos(ph) * 0.45, 0.24, 0.07, [Math.sin(ph) * 0.2, 0.1, Math.cos(ph) * 0.2], { segs: 8 }); }
      break;
    }
    case 'white-fluffy': { // grandma: cloud of ringlets + low bun
      cap(0.46, -0.5, 0.02);
      for (let i = 0; i < 26; i++) { const th = (24 + r() * 46) * d2r; let ph = r() * 6.28; if (th > 0.7 && Math.abs(Math.sin(ph / 2 + 0.0)) > 0.0) { const dz = Math.cos(ph); if (dz > 0.3 && th > 0.6) ph += 3.14; } ringlet(th, ph, 0.13 + r() * 0.04); }
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) puff(s * (0.95 + k * 0.03), 0.3 - k * 0.2, -0.2 - k * 0.05, 0.2);
      puff(0, 0.55, -0.85, 0.4, base);
      break;
    }
    case 'pigtails': {
      cap(0.5, -0.5);
      for (let i = 0; i < 8; i++) { const ph = -0.8 + i * 0.23; strand(46 * d2r, ph, ph * 0.12, -0.15, 0.25, 0.13, 0.04, [0, 0.14, 0.1], { segs: 7 }); }
      for (const s of [-1, 1]) { puff(s * 1.05, 0.25, -0.1, 0.17); for (let k = 0; k < 3; k++) strand(80 * d2r, s * (1.2 + k * 0.1), s * 0.4, -0.9, 0.0, 0.17, 0.05, [s * 0.25, -0.2, 0], { segs: 8 }); }
      break;
    }
  }
  return g;
}
