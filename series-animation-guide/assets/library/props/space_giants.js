// SPACE pack: the Sun (granulation, sunspots, animated corona, prominences, solar wind), gas and ice giants (Jupiter with counter-rotating belts
// and a layered Great Red Spot, Saturn with 200-row ringlets + orbiting ring particles + planet shadow, Uranus on its side, Neptune with its dark spot),
// and a black hole (horizon, lensed halo that always faces the camera, tilted accretion disk of orbiting particles, polar jets).
// Geometry, vertex colours and particles only. realRadiusM + unitsPerM on every body.
import * as THREE from 'three';
import { rng, setShadows } from '../util.js';
import { TAU, rgb, mix3, V3, fbm3, noise3, sstep, bodyGeo, lonLat, vcMat, sprites, spriteMat, glowDot, atmosphere, flowSprites, faceCam, rockGeo } from '../fx/space_kit.js';
import { REAL, SUN_DIR, meta } from './space_rocky.js';

const D2R = Math.PI / 180;
function surf(R, lon, lat, off = 0) { const a = lon * D2R, b = lat * D2R, c = Math.cos(b); return V3(Math.sin(a) * c, Math.sin(b), Math.cos(a) * c).multiplyScalar(R + off); }
// orient an object so +Z points away from the planet centre and +X points east
function stand(o, p) { const n = p.clone().normalize(), east = V3().crossVectors(V3(0, 1, 0), n).normalize(), north = V3().crossVectors(n, east); o.position.copy(p); o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, north, n)); return o; }
function banded(R, detail, bands, { seed = 3, wob = 0.03, streak = 1, eddy = 0.25 } = {}) {
  const cols = bands.map((b) => rgb(b[1])), edges = bands.map((b) => b[0]);
  return bodyGeo(R, detail, (d, c) => {
    const [lon, lat] = lonLat(d), n = fbm3(d.x * 3 + seed, d.y * 22 * streak, d.z * 3, 4, 1), e = fbm3(d.x * 9 + seed, d.y * 9, d.z * 9, 3, 6), w = (n - 0.5) * 7 + (e - 0.5) * 3;
    let k = 0; while (k < edges.length - 1 && lat + w > edges[k]) k++;
    const base = cols[k], nxt = cols[Math.min(cols.length - 1, k + 1)], prv = cols[Math.max(0, k - 1)]; const dl = lat + w - (edges[k - 1] ?? -90), du = edges[k] - (lat + w);
    let col = base; if (du < 2.2) col = mix3(base, nxt, 0.5 * (1 - du / 2.2)); else if (dl < 2.2) col = mix3(base, prv, 0.5 * (1 - dl / 2.2));
    const sh = 0.9 + 0.22 * n + eddy * (e - 0.5); c[0] = col[0] * sh; c[1] = col[1] * sh; c[2] = col[2] * sh; return 0;
  });
}

// ---------- Jupiter ----------
const JB = [[-62, 0x9a7458], [-46, 0xe2c89c], [-33, 0xc08850], [-22, 0xf3e4c6], [-9, 0xb4764a], [5, 0xf1dcb2], [17, 0xc68654], [29, 0xf4e8cc], [41, 0xb98456], [57, 0xe8d0a8], [90, 0xa07a5c]];
export function jupiter({ R = 4, lod = 'high', spin = 0.22, seed = 7, moons = true } = {}) {
  const g = new THREE.Group(), axis = new THREE.Group(); axis.rotation.z = -3.1 * D2R; g.add(axis);
  const bands = [], seg = lod === 'low' ? 48 : 128; let lat0 = -90;
  JB.forEach(([lat1, hex], i) => {
    const th0 = (90 - lat1) * D2R, thL = (lat1 - lat0) * D2R, rows = Math.max(3, Math.ceil((lat1 - lat0) / (lod === 'low' ? 6 : 2.2)));
    const geo = new THREE.SphereGeometry(R, seg, rows, 0, TAU, th0, thL), p = geo.attributes.position, col = new Float32Array(p.count * 3), base = rgb(hex), alt = rgb(JB[Math.max(0, i - 1)][1]), alt2 = rgb(JB[Math.min(JB.length - 1, i + 1)][1]);
    for (let v = 0; v < p.count; v++) {
      const x = p.getX(v) / R, y = p.getY(v) / R, z = p.getZ(v) / R, n = fbm3(x * 3 + seed + i, y * 30, z * 3, 4, 2), e = fbm3(x * 10, y * 10 + i, z * 10, 3, 7), lat = Math.asin(y) / D2R;
      const k = (n - 0.5) * 1.1; let cc = mix3(base, k > 0 ? alt : alt2, Math.abs(k) * 0.55);
      const wb = sstep(lat0 + 5, lat0, lat), wt = sstep(lat1 - 5, lat1, lat); if (wb > 0) cc = mix3(cc, mix3(base, alt, 0.5), wb); if (wt > 0) cc = mix3(cc, mix3(base, alt2, 0.5), wt);
      cc = mix3(cc, e > 0.55 ? [1, 0.95, 0.85] : [0.6, 0.36, 0.2], Math.abs(e - 0.5) * 0.7 * (1 - Math.max(wb, wt)));
      const sh = 0.94 + 0.16 * e, l = new THREE.Color().setRGB(cc[0] * sh, cc[1] * sh, cc[2] * sh, THREE.SRGBColorSpace); col.set([l.r, l.g, l.b], v * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const bg = new THREE.Group(); const m = new THREE.Mesh(geo, vcMat({ rough: 0.78 })); bg.add(m); axis.add(bg);
    const midLat = (lat0 + lat1) / 2; bands.push({ bg, rate: spin * (1 + (i % 2 ? 0.07 : -0.05) + 0.06 * (1 - Math.abs(midLat) / 90)), midLat }); lat0 = lat1;
  });
  // Great Red Spot: stacked, raised ovals on the south equatorial belt (turns with its band) + pale wake
  const grs = new THREE.Group(), st = [[0.28, 0.165, 0xf0d6ae], [0.22, 0.125, 0xc9532b], [0.165, 0.092, 0xdc6c3c], [0.1, 0.055, 0xe88e58], [0.045, 0.026, 0xf0b078]];
  st.forEach(([a, b, hex], i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 24), new THREE.MeshStandardMaterial({ color: hex, roughness: 0.8 })); m.scale.set(1, 1, 1); const e = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 18), m.material); e.scale.set(R * a, R * b, R * (0.03 + i * 0.012)); e.position.z = -R * 0.012; grs.add(e); });
  stand(grs, surf(R, 18, -20, 0)); bands[4].bg.add(grs);
  const r = rng(seed + 5); [[-35, 40, 0.07], [26, -60, 0.05], [24, 120, 0.06], [-42, -100, 0.05], [44, 70, 0.045], [10, 150, 0.05]].forEach(([la, lo, s], i) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: 0xfff4e0, roughness: 0.8 })); o.scale.set(R * s * 1.4, R * s * 0.8, R * 0.03); stand(o, surf(R, lo, la, -R * 0.008)); const bi = bands.findIndex((b, j) => la < JB[j][0] && (j === 0 || la >= JB[j - 1][0])); bands[Math.max(0, bi)].bg.add(o); });
  g.add(atmosphere(R, 0xffe0b0, { thick: 0.05, k: 0.35, rim: 0.5 }));
  const mn = []; if (moons) { [[0.034, 0xe8d060, 1.7, 1.2, 'Io', 1.8226e6], [0.03, 0xf0ece4, 2.2, 0.6, 'Europa', 1.5608e6], [0.04, 0x8a7a6a, 2.8, 0.3, 'Ganymede', 2.6341e6], [0.038, 0x4a4440, 3.5, 0.13, 'Callisto', 2.4103e6]].forEach(([s, hex, rr, w, name, rm], i) => { const m = new THREE.Mesh(bodyGeo(R * s * 1.6, 20, (d, c) => { const n = fbm3(d.x * 5, d.y * 5, d.z * 5, 3, i); const q = mix3(rgb(hex), [1, 1, 1], 0.15 * n); const sh = 0.8 + 0.35 * n; c[0] = q[0] * sh; c[1] = q[1] * sh; c[2] = q[2] * sh; return (n - 0.5) * 0.04; }), vcMat({ rough: 0.85 })); m.userData = { name, realRadiusM: rm }; g.add(m); mn.push([m, R * rr, w, i * 1.7]); }); }
  setShadows(g, false, false);
  g.update = g.userData.update = (t) => { for (const b of bands) b.bg.rotation.y = -0.31 + t * b.rate; for (const [m, rr, w, a0] of mn) { const a = a0 + t * w; m.position.set(Math.cos(a) * rr, Math.sin(a) * rr * 0.05, Math.sin(a) * rr); } };
  meta(g, 'Jupiter', R, REAL.jupiter, { note: 'each belt/zone spins at its own rate; Galilean moons orbit (sizes exaggerated)' }); g.update(0); return g;
}

// ---------- ring system: radial ringlets (geometry rows with colour + alpha), planet shadow baked from the sun direction ----------
function ringMesh(R, prof, { inner = 1.1, outer = 2.4, rows = 220, seg = 160, sun = SUN_DIR, shadowR = 1, seed = 5 } = {}) {
  const geo = new THREE.RingGeometry(R * inner, R * outer, seg, rows), p = geo.attributes.position, col = new Float32Array(p.count * 4), m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, roughness: 0.85, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  const fill = (sunLocal) => {
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), rr = Math.hypot(x, y) / R, q = prof(rr, Math.atan2(y, x)); let k = 1;
      if (sunLocal) { // ray from ring point toward the sun: does it hit the planet sphere (ring plane = local XZ after the -90deg turn: point (x, 0, -y))?
        const P = V3(x, 0, -y).divideScalar(R), b = P.dot(sunLocal), cc = P.lengthSq() - shadowR * shadowR, disc = b * b - cc; if (disc > 0 && -b + Math.sqrt(disc) > 0 && b < 0) k = 0.18; else if (disc > -0.05 && b < 0 && -b > 0) k = 0.18 + 0.82 * sstep(0, 0.05, -disc);
      }
      const l = new THREE.Color().setRGB(q[0] * k, q[1] * k, q[2] * k, THREE.SRGBColorSpace); col[i * 4] = l.r; col[i * 4 + 1] = l.g; col[i * 4 + 2] = l.b; col[i * 4 + 3] = q[3];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4)); geo.attributes.color.needsUpdate = true;
  };
  fill(shadowR > 0 ? V3(...sun).normalize() : null); m.userData.fill = fill; m.castShadow = false; m.receiveShadow = false; return m;
}
const ringNoise = (rr, s) => noise3(rr * 90 + s, 0.5, s * 3.3) * 0.5 + noise3(rr * 260, 1.5, s) * 0.5;

export function saturn({ R = 4, lod = 'high', spin = 0.2, sun = SUN_DIR, particles = true, seed = 9 } = {}) {
  const g = new THREE.Group(), axis = new THREE.Group(); axis.rotation.z = -26.7 * D2R; axis.rotation.x = 0.0; g.add(axis);
  const body = new THREE.Mesh(banded(R, lod === 'low' ? 30 : 56, [[-74, 0xb8a070], [-52, 0xd8c08c], [-30, 0xecd9a6], [-14, 0xf4e6b8], [-4, 0xe2c88c], [10, 0xf2e2b0], [28, 0xe0c488], [48, 0xd0b27c], [78, 0xc2a070], [90, 0x8a9a9a]], { seed: 9, wob: 0.02, eddy: 0.12 }), vcMat({ rough: 0.8 }));
  // polar hexagon: a darker six-sided patch (vertex colours already carry the bluish pole) raised a touch
  axis.add(body); const rings = new THREE.Group(); axis.add(rings);
  const prof = (rr, th) => {
    const nz = ringNoise(rr, seed);
    if (rr < 1.24) return [0.35, 0.3, 0.26, 0.06 * (rr - 1.1) / 0.14];
    if (rr < 1.53) { const t = (rr - 1.24) / 0.29; return [0.5 + 0.1 * nz, 0.44 + 0.1 * nz, 0.36, 0.28 + 0.2 * nz + 0.1 * t]; }
    if (rr < 1.95) { const t = (rr - 1.53) / 0.42, st = 0.72 + 0.4 * nz; return [Math.min(1, 0.93 * st), Math.min(1, 0.84 * st), Math.min(1, 0.66 * st), 0.8 + 0.2 * Math.sin(t * 40 + nz * 6) * 0.5 + 0.1]; }
    if (rr < 2.03) return [0.3, 0.26, 0.2, 0.07];
    if (rr < 2.27) { if (rr > 2.208 && rr < 2.216) return [0.2, 0.2, 0.2, 0.02]; const st = 0.75 + 0.35 * nz; return [0.85 * st, 0.78 * st, 0.62 * st, 0.72]; }
    if (rr > 2.31 && rr < 2.34) return [0.8, 0.76, 0.66, 0.5]; return [0.5, 0.45, 0.4, 0];
  };
  const rm = ringMesh(R, prof, { inner: 1.1, outer: 2.36, sun, seed, shadowR: 1, rows: lod === 'low' ? 90 : 240 }); rings.add(rm);
  let pts = null; if (particles) { const r = rng(seed), n = lod === 'low' ? 700 : 2600, O = new Float32Array(n * 4), C = new Float32Array(n * 3), S = new Float32Array(n), P = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { let rr; do { rr = r.range(1.2, 2.3); } while (prof(rr, 0)[3] < r() * 0.9); const b = r.range(0.6, 1), w = 0.28 / Math.pow(rr, 1.5); O.set([r() * TAU, w, rr * R, (r() - 0.5) * R * 0.01], i * 4); C.set([b * 0.55, b * 0.5, b * 0.42], i * 3); S[i] = R * r.range(0.003, 0.007); }
    pts = sprites(P, C, S, { orbit: O, atten: true, soft: 1.6, max: 14, seed: seed + 3 }); rings.add(pts); }
  g.add(atmosphere(R, 0xf0d890, { thick: 0.06, k: 0.4, rim: 0.4 })); setShadows(g, false, false);
  g.setSun = (v) => { const q = new THREE.Quaternion(); axis.updateWorldMatrix(true, false); axis.getWorldQuaternion(q); rm.userData.fill(V3(...v).normalize().applyQuaternion(q.invert())); };
  g.update = g.userData.update = (t) => { body.rotation.y = t * spin; pts?.setTime(t); };
  g.userData.ringOuterR = R * 2.34; g.userData.rings = rings;
  return meta(g, 'Saturn', R, REAL.saturn, { ringOuterRadiusM: 1.368e8, note: 'rings ~140,000 km wide but only ~10 m thick; ring particles orbit (inner faster)' });
}

// ---------- Uranus: tilted 98 degrees, pale cyan, thin dark rings ----------
export function uranus({ R = 2.6, lod = 'high', spin = 0.12, seed = 11 } = {}) {
  const g = new THREE.Group(), axis = new THREE.Group(); axis.rotation.z = -97.8 * D2R; g.add(axis);
  const body = new THREE.Mesh(banded(R, lod === 'low' ? 28 : 50, [[-60, 0x8ed6dc], [-30, 0xa2e4e8], [0, 0xb0ecee], [30, 0xa2e4e8], [60, 0x94dade], [90, 0xc0f2f0]], { wob: 0.01, eddy: 0.05, streak: 0.6 }), vcMat({ rough: 0.55 })); axis.add(body);
  const prof = (rr) => { const ring = (a, b, al, c = 0.32) => (rr > a && rr < b ? [c, c * 1.05, c * 1.1, al] : null); return ring(1.64, 1.66, 0.7) ?? ring(1.69, 1.71, 0.6) ?? ring(1.74, 1.76, 0.6) ?? ring(1.83, 1.85, 0.7) ?? ring(1.99, 2.01, 0.7) ?? ring(2.07, 2.09, 0.6) ?? ring(2.3, 2.34, 0.85, 0.5) ?? ring(2.62, 2.66, 0.45, 0.3) ?? [0, 0, 0, 0]; };
  const rm = ringMesh(R, prof, { inner: 1.6, outer: 2.7, rows: 140, seg: 96, sun: [0.45, 0.8, 0.6], shadowR: 0.0 }); axis.add(rm);
  const mn = [], r = rng(seed); [[0.9, 3.3, 0.5, 0xb0aaa4], [0.8, 4.0, 0.33, 0x9a948e], [0.45, 2.9, 0.9, 0xc8c2bc]].forEach(([s, rr, w, hex], i) => { const m = new THREE.Mesh(rockGeo(20 + i, 2, { lump: 0.1, craters: 3 }), vcMat({ flat: true, rough: 0.9 })); m.scale.setScalar(R * 0.07 * s); axis.add(m); mn.push([m, R * rr, w, i * 2.1]); });
  g.add(atmosphere(R, 0x9ff0f0, { thick: 0.07, k: 0.55 })); setShadows(g, false, false);
  g.update = g.userData.update = (t) => { body.rotation.y = t * spin; for (const [m, rr, w, a0] of mn) { const a = a0 + t * w; m.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); } };
  return meta(g, 'Uranus', R, REAL.uranus, { axialTiltDeg: 97.8, note: 'rolls on its side; 13 thin dark rings (9 main ones shown) and moons Titania/Oberon-style' });
}

// ---------- Neptune: deep blue, Great Dark Spot with bright cirrus, fast white cirrus streaks, Triton ----------
export function neptune({ R = 2.5, lod = 'high', spin = 0.14, seed = 13 } = {}) {
  const g = new THREE.Group(), axis = new THREE.Group(); axis.rotation.z = -28.3 * D2R; g.add(axis);
  const body = new THREE.Group(); axis.add(body);
  body.add(new THREE.Mesh(banded(R, lod === 'low' ? 28 : 50, [[-60, 0x2c4fd0], [-35, 0x3a62e0], [-12, 0x2f55d8], [8, 0x28489c], [30, 0x3560dc], [55, 0x2c52d2], [90, 0x4a74e8]], { seed: 13, wob: 0.02, eddy: 0.2, streak: 0.8 }), vcMat({ rough: 0.5 })));
  const gds = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 18), new THREE.MeshStandardMaterial({ color: 0x0f1c5e, roughness: 0.6 })); gds.scale.set(R * 0.2, R * 0.12, R * 0.02); body.add(stand(gds, surf(R, 15, -22)));
  const r = rng(seed), cir = new THREE.Group(); axis.add(cir);   // white cirrus: thin streaks that outrun the planet
  const cm = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.9, emissive: 0x6a8ae8, emissiveIntensity: 0.25 });
  for (let i = 0; i < 26; i++) { const lo = r.range(-180, 180), la = r() < 0.4 ? r.range(-34, -18) : r.range(-60, 50), m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), cm); m.scale.set(R * r.range(0.1, 0.22), R * 0.012, R * 0.02); stand(m, surf(R, lo, la, R * 0.005)); cir.add(m); }
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), cm); m.scale.set(R * 0.1, R * 0.022, R * 0.025); body.add(stand(m, surf(R, 14 + i * 6 - 6, -17 - i * 3, R * 0.01))); }
  const tri = new THREE.Mesh(bodyGeo(R * 0.09, 20, (d, c) => { const n = fbm3(d.x * 4, d.y * 4, d.z * 4, 3, 1); const q = mix3(rgb(0xe8c8c0), rgb(0xf4ece4), n); c[0] = q[0]; c[1] = q[1]; c[2] = q[2]; return (n - 0.5) * 0.04; }), vcMat({ rough: 0.8 })); g.add(tri);
  g.add(atmosphere(R, 0x5a8aff, { thick: 0.08, k: 0.8 })); setShadows(g, false, false);
  g.update = g.userData.update = (t) => { body.rotation.y = t * spin; cir.rotation.y = t * spin * 1.35; const a = -t * 0.4; tri.position.set(Math.cos(a) * R * 2.3, Math.sin(a) * R * 0.5, Math.sin(a) * R * 2.3); };
  return meta(g, 'Neptune', R, REAL.neptune, { note: 'cirrus streaks outrun the planet; Triton orbits backwards (retrograde)' });
}

// ---------- the Sun ----------
export function sun({ R = 6, lod = 'high', spin = 0.04, seed = 17, light = false } = {}) {
  const g = new THREE.Group(), r = rng(seed), ticks = [];
  const spots = Array.from({ length: 6 }, () => ({ d: surf(1, r.range(-180, 180), r.range(-30, 30)).normalize(), s: r.range(0.05, 0.1) }));
  const geo = bodyGeo(R, lod === 'low' ? 24 : 48, (d, c) => {
    const cell = fbm3(d.x * 18, d.y * 18, d.z * 18, 2, 3), n = fbm3(d.x * 4 + seed, d.y * 4, d.z * 4, 3, 1), gr = Math.abs(cell - 0.5) * 2;
    let col = mix3(rgb(0xff8a14), rgb(0xffd23a), 0.15 + 0.85 * sstep(0.2, 0.8, n * 0.5 + (1 - gr) * 0.6)); col = mix3(col, rgb(0xfff2a8), sstep(0.7, 1, 1 - gr) * 0.5);
    for (const s of spots) { const a = Math.acos(Math.min(1, d.dot(s.d))); if (a < s.s * 1.8) col = mix3(col, rgb(a < s.s ? 0x5a2208 : 0xc4601a), a < s.s ? 0.9 : 0.55 * (1 - (a - s.s) / (s.s * 0.8))); }
    c[0] = col[0]; c[1] = col[1]; c[2] = col[2]; return (cell - 0.5) * 0.006;
  });
  const body = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); g.add(body);
  g.add(glowDot(0xffa83a, R * 3.4, { k: 0.4, soft: 2.4, max: 640 }), glowDot(0xff6a1a, R * 7.5, { k: 0.12, soft: 1.8, max: 900 }));
  // corona rays: flat flame triangles in a plane that always faces the camera (so they ring the disc and never poke through it), growing and shrinking out of phase
  const N = 64, rg = new THREE.BufferGeometry(), pos = new Float32Array(N * 9), colA = new Float32Array(N * 12), ph = [], base = [];
  for (let i = 0; i < N; i++) { ph.push(r() * TAU); base.push(i / N * TAU + r() * 0.03); for (let k = 0; k < 3; k++) { const o = i * 12 + k * 4; const tip = k === 2; colA.set(tip ? [1, 0.55, 0.12, 0] : [1, 0.72, 0.2, 0.95], o); } }
  rg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rg.setAttribute('color', new THREE.BufferAttribute(colA, 4));
  const rays = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); rays.frustumCulled = false;
  const rayG = new THREE.Group(); rayG.add(rays); g.add(rayG);
  { const q = new THREE.Quaternion(); rays.onBeforeRender = (rd, sc, cam) => { if (rayG.parent) { rayG.parent.getWorldQuaternion(q).invert().multiply(cam.quaternion); rayG.quaternion.copy(q); rayG.updateMatrix(); rayG.matrixWorld.multiplyMatrices(rayG.parent.matrixWorld, rayG.matrix); rayG.updateMatrixWorld(true); } }; }
  const updRays = (t) => { for (let i = 0; i < N; i++) { const a = base[i] + 0.04 * Math.sin(t * 0.5 + ph[i]), L = R * (0.22 + 0.2 * (0.5 + 0.5 * Math.sin(t * 1.7 + ph[i])) + 0.14 * Math.sin(t * 3.1 + ph[i] * 2) + (i % 2 ? 0.28 : 0)), w = (i % 2 ? 0.05 : 0.075) * R, c = Math.cos(a), s2 = Math.sin(a), r0 = R * 0.97, o = i * 9; pos[o] = (c * r0 - s2 * w); pos[o + 1] = (s2 * r0 + c * w); pos[o + 2] = 0; pos[o + 3] = (c * r0 + s2 * w); pos[o + 4] = (s2 * r0 - c * w); pos[o + 5] = 0; pos[o + 6] = c * (r0 + L); pos[o + 7] = s2 * (r0 + L); pos[o + 8] = 0; } rg.attributes.position.needsUpdate = true; };
  ticks.push(updRays);
  // prominences: tube arcs that swell and fade
  const proms = [];
  for (let i = 0; i < 7; i++) { const base = surf(1, r.range(-180, 180), r.range(-50, 50)).normalize(), up = base.clone(), side = V3().crossVectors(up, V3(0, 1, 0)).normalize(); if (side.lengthSq() < 0.01) side.set(1, 0, 0); const span = R * r.range(0.25, 0.5), hgt = R * r.range(0.25, 0.55);
    const pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12 * 2 - 1, y = (1 - u * u) * hgt; pts.push(base.clone().multiplyScalar(R * 0.98).addScaledVector(side, u * span).addScaledVector(up, y)); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, R * 0.012, 6, false), new THREE.MeshBasicMaterial({ color: 0xff5a1e, toneMapped: false, transparent: true, opacity: 0.9 })); const grp = new THREE.Group(); grp.add(tube); g.add(grp); proms.push({ grp, base, ph: r() * TAU }); }
  ticks.push((t) => { for (const p of proms) { const k = 0.55 + 0.45 * Math.sin(t * 0.8 + p.ph); p.grp.scale.setScalar(0.75 + 0.45 * k); p.grp.children[0].material.opacity = 0.45 + 0.5 * k; p.grp.position.copy(p.base).multiplyScalar(R * 0.98 * (1 - (0.75 + 0.45 * k))); } });
  // solar wind: particles stream outward in every direction
  { const n = lod === 'low' ? 300 : 900, P = new Float32Array(n * 3), C = new Float32Array(n * 3), S = new Float32Array(n);
    for (let i = 0; i < n; i++) { const d = V3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize(); P.set([d.x, d.y, d.z], i * 3); const b = r.range(0.6, 1); C.set([1 * b, 0.62 * b, 0.2 * b], i * 3); S[i] = R * r.range(0.015, 0.045); }
    const mat = spriteMat({ atten: true, soft: 2.2, max: 60, uniforms: { uR: { value: R } }, unis: 'uniform float uR;', pos: 'float age = fract(aPh * 3.7 + uTime * (0.06 + fract(aPh * 9.1) * 0.08)); P = normalize(position) * uR * (1.0 + age * 2.4); fade = (1.0 - age) * smoothstep(0.0, 0.08, age); sz = aSize * (1.0 - age * 0.5);' });
    const wp = sprites(P, C, S, { material: mat, seed: seed + 9 }); g.add(wp); ticks.push((t) => wp.setTime(t)); }
  let lt = null; if (light) { lt = new THREE.PointLight(0xfff0d0, 6, 0, 0); g.add(lt); }
  g.update = g.userData.update = (t) => { body.rotation.y = t * spin; for (const f of ticks) f(t); };
  meta(g, 'Sun', R, REAL.sun, { note: 'rays and prominences breathe; surface granulation turns' }); g.update(0); return g;
}

// ---------- black hole ----------
export function blackHole({ R = 3, lod = 'high', seed = 19, tilt = 0.3, mass = 10 } = {}) {
  const g = new THREE.Group(), r = rng(seed), ticks = [];
  g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })));
  const disk = new THREE.Group(); disk.rotation.x = tilt; g.add(disk);
  const palette = (u) => (u < 0.2 ? mix3([1, 0.98, 0.9], [1, 0.85, 0.5], u / 0.2) : u < 0.55 ? mix3([1, 0.85, 0.5], [1, 0.5, 0.15], (u - 0.2) / 0.35) : mix3([1, 0.5, 0.15], [0.55, 0.12, 0.06], (u - 0.55) / 0.45));
  { const n = lod === 'low' ? 4000 : 22000, O = new Float32Array(n * 4), C = new Float32Array(n * 3), S = new Float32Array(n), P = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = Math.pow(r(), 0.85), rr = R * (1.7 + u * 3.0), c = palette(u), b = r.range(0.5, 1.3) * (1.0 - 0.45 * u), w = 1.6 / Math.pow(rr / R, 1.5); O.set([r() * TAU, w, rr, (r() - 0.5) * R * 0.03 * (0.4 + u)], i * 4); C.set([c[0] * b, c[1] * b, c[2] * b], i * 3); S[i] = R * r.range(0.012, 0.04) * (1.2 - 0.5 * u); }
    const d = sprites(P, C, S, { orbit: O, atten: true, soft: 2.4, max: 40, seed: seed + 1 }); disk.add(d); ticks.push((t) => d.setTime(t)); }
  // smooth glowing base of the disk (geometry with a radial colour/alpha gradient and a Doppler-bright side), particles sparkle on top
  { const rg = new THREE.RingGeometry(R * 1.55, R * 5.2, 128, 24), p = rg.attributes.position, col = new Float32Array(p.count * 4);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), u = Math.min(1, Math.max(0, (Math.hypot(x, y) / R - 1.55) / 3.65)), c = palette(Math.pow(u, 0.8) * 0.9), dop = 0.55 + 0.45 * Math.cos(Math.atan2(y, x)), a = Math.pow(1 - u, 1.7) * 0.9 * dop; col.set([c[0], c[1], c[2], a], i * 4); }
    rg.setAttribute('color', new THREE.BufferAttribute(col, 4)); const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); m.rotation.x = -Math.PI / 2; disk.add(m); }
  // lensed image of the far side of the disk: a ring of glowing particles that always faces the viewer
  const lens = new THREE.Group(), inner = new THREE.Group(); inner.rotation.x = Math.PI / 2; lens.add(inner); g.add(lens);
  { const n = lod === 'low' ? 2000 : 7000, O = new Float32Array(n * 4), C = new Float32Array(n * 3), S = new Float32Array(n), P = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = Math.pow(r(), 1.4), rr = R * (1.45 + u * 1.15), c = palette(0.05 + u * 0.55), b = r.range(0.4, 1) * (1.05 - 0.5 * u); O.set([r() * TAU, 0.9 / Math.pow(rr / R, 1.5), rr, (r() - 0.5) * R * 0.04], i * 4); C.set([c[0] * b, c[1] * b, c[2] * b], i * 3); S[i] = R * r.range(0.015, 0.04); }
    const d = sprites(P, C, S, { orbit: O, atten: true, soft: 2.4, max: 40, seed: seed + 2 }); inner.add(d); ticks.push((t) => d.setTime(t)); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.26, R * 0.012, 10, 128), new THREE.MeshBasicMaterial({ color: 0xfff2d0, toneMapped: false })); lens.add(ring);
  // the billboard needs a renderable child to hook the camera: ring mesh does it
  { const prev = ring.onBeforeRender, q = new THREE.Quaternion(); ring.onBeforeRender = (rd, sc, cam, ...rest) => { if (lens.parent) { lens.parent.getWorldQuaternion(q).invert().multiply(cam.quaternion); lens.quaternion.copy(q); lens.updateMatrix(); lens.matrixWorld.multiplyMatrices(lens.parent.matrixWorld, lens.matrix); lens.updateMatrixWorld(true); } }; }
  g.add(glowDot(0xffa040, R * 5, { k: 0.18, soft: 2, max: 700 }), glowDot(0xffe0b0, R * 2.8, { k: 0.25, soft: 3, max: 500 }));
  for (const s of [1, -1]) { const j = flowSprites({ n: lod === 'low' ? 160 : 420, dir: [0, s, 0], length: R * 7, spread: R * 0.16, speed: 0.55, size: [R * 0.1, R * 0.34], colors: [0xe8f4ff, 0x7ab8ff, 0x2a5ad8], pow: 1.1, seed: seed + s, spread0: 0.25 }); j.position.y = s * R * 0.6; g.add(j); ticks.push((t) => j.setTime(t)); }
  g.userData.horizon = R; g.update = g.userData.update = (t) => { for (const f of ticks) f(t); };
  const rsM = 2953 * mass; meta(g, 'Black hole', R, rsM, { note: `Schwarzschild radius of a ${mass} solar-mass hole = ${(rsM / 1000).toFixed(1)} km; the disk and lens halo are artistic, not to scale` });
  g.update(0); return g;
}
