// World props: Earth (day/night + pink-lights), Moon, solar system, galaxy, stars, billboards, skylines, landmarks, vehicles, relief map.
import * as THREE from 'three';
import { mat, glow, add, sph, box, cyl, cap, cone, tor, rbox, rng, canvasTex, textBoard, shade, C } from '../util.js';
import { makeHeart } from '../fx/hearts.js';

// -------- Earth: painted continents, night-side city lights that turn pink (earth.setPink(0..1), earth.update(t)) --------
const BLOBS = [ // [lon, lat, rx, ry, rot] degrees — rough continents
  [-100, 45, 38, 20, 0.1], [-95, 30, 22, 12, 0], [-80, 12, 8, 8, 0.4], [-60, -12, 18, 28, 0.2], [-65, -40, 8, 16, 0], [15, 8, 22, 28, 0], [10, 50, 16, 9, 0.1], [20, -20, 14, 20, 0], [75, 52, 55, 18, 0], [85, 28, 25, 14, 0.1], [105, 15, 12, 14, 0], [135, -25, 17, 11, 0], [-45, 72, 18, 9, 0], [140, 38, 6, 12, 0.5], [0, -85, 120, 6, 0],
];
export function makeEarth(R = 1, { seed = 3 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const W = 1024, H = 512;
  const toXY = (lon, lat) => [(lon + 180) / 360 * W, (90 - lat) / 180 * H];
  const dayC = document.createElement('canvas'); dayC.width = W; dayC.height = H;
  const c = dayC.getContext('2d');
  c.fillStyle = '#2a6fc4'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#3d8be0'; for (let i = 0; i < 120; i++) { c.globalAlpha = 0.18; c.beginPath(); c.ellipse(r() * W, r() * H, r.range(20, 80), r.range(4, 14), 0, 0, 7); c.fill(); } c.globalAlpha = 1;
  const land = []; for (const [lo, la, rx, ry, rot] of BLOBS) { const [x, y] = toXY(lo, la); for (let k = 0; k < 9; k++) { const ox = x + r.range(-rx, rx) * 1.4, oy = y + r.range(-ry, ry) * 1.4; const sx = r.range(rx * 0.35, rx * 0.8) * 2.8, sy = r.range(ry * 0.3, ry * 0.8) * 2.8; c.fillStyle = r() < 0.3 ? '#6aa84f' : (r() < 0.4 ? '#8bbf5a' : '#4f9a45'); c.beginPath(); c.ellipse(ox, oy, sx, sy, rot, 0, 7); c.fill(); land.push([ox, oy, sx, sy]); } }
  c.fillStyle = 'rgba(255,255,255,0.0)';
  const dayTex = new THREE.CanvasTexture(dayC); dayTex.colorSpace = THREE.SRGBColorSpace; dayTex.anisotropy = 4;
  // city lights: dots on land with a threshold in [0,1]
  const dots = []; for (let i = 0; i < 900; i++) { const [ox, oy, sx, sy] = land[Math.floor(r() * land.length)]; dots.push([ox + r.range(-sx, sx) * 0.8, oy + r.range(-sy, sy) * 0.8, r(), r.range(1.2, 3.2)]); }
  const lightC = document.createElement('canvas'); lightC.width = W; lightC.height = H; const lc = lightC.getContext('2d');
  const lightTex = new THREE.CanvasTexture(lightC); lightTex.colorSpace = THREE.SRGBColorSpace;
  const drawLights = (pink) => { lc.fillStyle = '#000'; lc.fillRect(0, 0, W, H); for (const [x, y, th, s] of dots) { const p = th < pink; lc.fillStyle = p ? '#ff5aa5' : '#ffd890'; lc.globalAlpha = 0.95; lc.beginPath(); lc.arc(x, y, s * (p ? 1.5 : 1), 0, 7); lc.fill(); if (p) { lc.globalAlpha = 0.25; lc.beginPath(); lc.arc(x, y, s * 4.2, 0, 7); lc.fill(); } } lc.globalAlpha = 1; lightTex.needsUpdate = true; };
  drawLights(0);
  const earthM = new THREE.MeshStandardMaterial({ map: dayTex, roughness: 0.75, emissive: 0xffffff, emissiveMap: lightTex, emissiveIntensity: 1.0 });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), earthM); planet.castShadow = planet.receiveShadow = true; g.add(planet);
  // clouds
  const cloudC = document.createElement('canvas'); cloudC.width = 512; cloudC.height = 256; const cc = cloudC.getContext('2d'); cc.clearRect(0, 0, 512, 256); for (let i = 0; i < 90; i++) { cc.fillStyle = `rgba(255,255,255,${r.range(0.25, 0.6)})`; cc.beginPath(); cc.ellipse(r() * 512, r() * 256, r.range(12, 50), r.range(4, 12), r.range(-0.3, 0.3), 0, 7); cc.fill(); }
  const cloudT = new THREE.CanvasTexture(cloudC); cloudT.colorSpace = THREE.SRGBColorSpace;
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 48, 36), new THREE.MeshStandardMaterial({ map: cloudT, transparent: true, depthWrite: false, roughness: 1 })); clouds.castShadow = false; g.add(clouds);
  // atmosphere rim glow (additive back-face shell)
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 48, 36), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, uniforms: { c: { value: new THREE.Color(0x6fb8ff) }, p: { value: 0 } }, vertexShader: 'varying vec3 n; void main(){ n = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'varying vec3 n; uniform vec3 c; uniform float p; void main(){ float k = pow(0.72 - dot(n, vec3(0.,0.,1.)), 3.0); vec3 col = mix(c, vec3(1.0,0.35,0.65), p); gl_FragColor = vec4(col*k*1.6, k); }' })); atmo.castShadow = false; g.add(atmo);
  g.planet = planet; g.clouds = clouds; g.atmo = atmo;
  let lastPink = -1;
  g.setPink = (k) => { const q = Math.round(k * 60) / 60; if (q !== lastPink) { lastPink = q; drawLights(q); } atmo.material.uniforms.p.value = Math.min(1, k); };
  g.update = (t) => { clouds.rotation.y = t * 0.02; };
  return g;
}
export function makeMoon(R = 0.27) { const t = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#c9c7c2'; c.fillRect(0, 0, w, h); const r = rng(9); for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h, s = r.range(4, 14); c.fillStyle = 'rgba(120,118,112,0.45)'; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); c.fillStyle = 'rgba(230,228,222,0.5)'; c.beginPath(); c.arc(x - s * 0.2, y - s * 0.2, s * 0.7, 0, 7); c.fill(); } }); const m = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), new THREE.MeshStandardMaterial({ map: t, roughness: 1 })); m.castShadow = true; return m; }
export function starfield(n = 900, R = 200, seed = 2) { const r = rng(seed), pos = new Float32Array(n * 3), col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = r() * 6.283, b = Math.acos(r.range(-1, 1)); pos.set([Math.sin(b) * Math.cos(a) * R, Math.cos(b) * R, Math.sin(b) * Math.sin(a) * R], i * 3); const k = r.range(0.6, 1); col.set([k, k, Math.min(1, k + 0.15)], i * 3); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, toneMapped: false })); p.frustumCulled = false; return p; }
export function makeGalaxy(arms = 3, n = 3000, R = 40, seed = 8) { const r = rng(seed), pos = new Float32Array(n * 3), col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const d = Math.pow(r(), 0.7) * R, arm = (i % arms) / arms * 6.283, a = arm + d * 0.18 + r.range(-0.35, 0.35); pos.set([Math.cos(a) * d, r.range(-0.6, 0.6) * (1 - d / R), Math.sin(a) * d], i * 3); const k = 1 - d / R; col.set([0.6 + 0.4 * k, 0.5 + 0.3 * k, 1 - 0.2 * k], i * 3); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); p.frustumCulled = false; return p; }
export function solarSystem(scale = 1) { const g = new THREE.Group(); const P = [[0.0, 2.2, 0xffd23f, true], [3, 0.25, 0xb0a090], [4.2, 0.4, 0xe8c07a], [5.6, 0.42, 0x3a86ff], [7.0, 0.3, 0xe5603a], [10, 1.0, 0xe8b070], [13, 0.85, 0xe8d4a0], [15.5, 0.6, 0x7ad0e0], [17.5, 0.55, 0x3a5acf]]; P.forEach(([d, r, c, sun], i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 24, 16), sun ? new THREE.MeshBasicMaterial({ color: c, toneMapped: false }) : new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })); m.position.x = d * scale; g.add(m); if (d > 0) { const o = new THREE.Mesh(new THREE.TorusGeometry(d * scale, 0.02 * scale, 4, 96), new THREE.MeshBasicMaterial({ color: 0x4a5a8a, transparent: true, opacity: 0.5, toneMapped: false })); o.rotation.x = Math.PI / 2; g.add(o); } if (i === 5) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.6 * scale, r * 0.18 * scale, 4, 48), new THREE.MeshStandardMaterial({ color: 0xe8d4a0 })); ring.rotation.x = 1.2; ring.position.x = d * scale; g.add(ring); } }); return g; }

// -------- hero face drawn on a canvas (billboards / phone wallpapers) --------
export function drawHeroFace(c, cx, cy, s, { mouth = 0.6, heartEyes = false } = {}) {
  c.save(); c.translate(cx, cy); c.scale(s, s);
  c.fillStyle = '#4a2f1c'; c.beginPath(); c.ellipse(0, -0.1, 0.62, 0.62, 0, 0, 7); c.fill();
  c.fillStyle = '#f2b98f'; c.beginPath(); c.ellipse(0, 0.05, 0.55, 0.55, 0, 0, 7); c.fill();
  c.fillStyle = '#4a2f1c'; c.beginPath(); c.moveTo(-0.58, -0.05); c.bezierCurveTo(-0.4, -0.6, 0.4, -0.6, 0.58, -0.05); c.bezierCurveTo(0.3, -0.25, -0.3, -0.25, -0.58, -0.05); c.fill();
  c.fillStyle = '#ffd23f'; c.fillRect(-0.58, -0.17, 1.16, 0.1);
  for (const sd of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(sd * 0.22, 0.08, 0.17, 0.2, 0, 0, 7); c.fill(); if (heartEyes) { c.fillStyle = '#ff3f7f'; c.font = '0.24px sans-serif'; c.textAlign = 'center'; c.fillText('♥', sd * 0.22, 0.17); } else { c.fillStyle = '#15151c'; c.beginPath(); c.arc(sd * 0.22, 0.1, 0.075, 0, 7); c.fill(); } }
  c.fillStyle = '#4a1218'; c.beginPath(); c.ellipse(0, 0.35, 0.16, 0.04 + 0.12 * mouth, 0, 0, 7); c.fill();
  c.restore();
}
// Head-on LED billboard: frame + screen with hero face + heart count. Faces +Z.
export function billboard(w = 6, h = 3.4, { label = 'THAT GUY', counter = '♥ 8,589,934,592', bg = '#ff3f7f' } = {}) {
  const g = new THREE.Group();
  add(g, rbox(w + 0.5, h + 0.5, 0.35, 0.1), mat(0x20222c, { metal: 0.4 }), [0, 0, 0]);
  const draw = (c, ww, hh, lab, cnt) => { const gr = c.createLinearGradient(0, 0, ww, hh); gr.addColorStop(0, bg); gr.addColorStop(1, '#ffb3d1'); c.fillStyle = gr; c.fillRect(0, 0, ww, hh); drawHeroFace(c, ww * 0.3, hh * 0.5, hh * 0.9, { heartEyes: true }); c.fillStyle = '#fff'; c.strokeStyle = '#7a0f3a'; c.lineWidth = 10; c.textAlign = 'center'; c.font = `${hh * 0.2}px Anton, Impact, sans-serif`; c.strokeText(lab, ww * 0.7, hh * 0.42); c.fillText(lab, ww * 0.7, hh * 0.42); c.font = `${hh * 0.1}px Inter, sans-serif`; c.lineWidth = 6; const px = Math.min(hh * 0.1, (ww * 0.5) / (cnt.length * 0.62)); c.font = `800 ${px}px Inter, sans-serif`; c.strokeText(cnt, ww * 0.7, hh * 0.7); c.fillText(cnt, ww * 0.7, hh * 0.7); };
  const tex = canvasTex(1024, Math.round(1024 * h / w), (c, ww, hh) => draw(c, ww, hh, label, counter));
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); sc.position.z = 0.19; g.add(sc);
  add(g, cyl(0.12, 0.12, 4, 8), mat(0x20222c), [-w * 0.3, -h / 2 - 2, -0.1]); add(g, cyl(0.12, 0.12, 4, 8), mat(0x20222c), [w * 0.3, -h / 2 - 2, -0.1]);
  g.screen = sc; g.redraw = (cnt, lab = label) => { const cv = tex.image, c = cv.getContext('2d'); draw(c, cv.width, cv.height, lab, cnt); tex.needsUpdate = true; };
  return g;
}
// Instanced skyline of boxy buildings with lit windows (faces +Z). Returns Group.
// City skyline built from geometry only (no textures): each tower has floor ledges, instanced glass windows on the three
// visible faces (some warmly lit), an optional setback tier, a parapet and rooftop kit (water tank, AC units, antenna),
// and a street-level shopfront band with a coloured awning. Faces +Z. night: 0..1 lights more windows.
export function skyline({ n = 14, spread = 40, hmin = 6, hmax = 28, seed = 1, palette = [0x4a5a7a, 0x5a6a8a, 0x3a4a6a, 0x6a7a9a, 0x7a6a8a], night = 0 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const wins = [], ledges = [], kit = [];
  const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.2 });
  const AWN = [0xe5483a, 0x2f8f6a, 0xf5b82e, 0x2f6fd6, 0x8a52c9];
  const tower = (x, z, w, h, d, col, base) => {
    const body = add(g, box(w, h, d), mat(col, { rough: 0.8 }), [x, base + h / 2, z]);
    const trim = shade(col, 0.72), floors = Math.max(1, Math.floor(h / 3));
    for (let f = 1; f <= floors; f++) ledges.push({ x, y: base + f * 3 - 0.05, z, w: w + 0.12, d: d + 0.12, col: trim });
    const faces = [[0, 1, w], [1, 0, d], [-1, 0, d]];       // +Z front, +X side, -X side
    for (const [fx, fz, span] of faces) {
      const cols = Math.max(1, Math.floor(span / 1.3)), step = span / cols;
      for (let f = base === 0 ? 1 : 0; f < floors; f++) for (let c = 0; c < cols; c++) {
        const u = -span / 2 + step * (c + 0.5), y = base + f * 3 + 1.55;
        const lit = r() < 0.12 + night * 0.5;
        wins.push({ x: x + (fz ? u : fx * (w / 2 + 0.02)), y, z: z + (fz ? d / 2 + 0.02 : u), ry: fz ? 0 : fx * Math.PI / 2, w: step * 0.62, lit });
      }
    }
    return body;
  };
  for (let i = 0; i < n; i++) {
    const w = r.range(3.2, 6), h = r.range(hmin, hmax), d = r.range(3, 5), col = r.pick(palette);
    const x = (i / (n - 1) - 0.5) * spread + r.range(-1, 1), z = -r.range(0, 8);
    tower(x, z, w, h, d, col, 0);
    let top = h, tw = w, td = d;
    if (h > 14 && r() < 0.45) { tw = w * 0.68; td = d * 0.68; const h2 = r.range(3, 7); tower(x, z, tw, h2, td, shade(col, 1.08), h); top = h + h2; }
    const pc = shade(col, 0.65);                                                    // parapet ring
    for (const [px, pz, pw, pd] of [[0, td / 2, tw, 0.18], [0, -td / 2, tw, 0.18], [tw / 2, 0, 0.18, td], [-tw / 2, 0, 0.18, td]]) add(g, box(pw, 0.5, pd), mat(pc), [x + px, top + 0.25, z + pz]);
    const k = r();
    if (k < 0.35) { add(g, cyl(0.55, 0.55, 1.1, 12), mat(0x7a5a3a), [x + tw * 0.2, top + 1.6, z]); add(g, cone(0.62, 0.5, 12), mat(0x5a4028), [x + tw * 0.2, top + 2.4, z]); for (const s of [-1, 1]) add(g, cyl(0.05, 0.05, 1.1, 5), mat(0x3a3a40), [x + tw * 0.2 + s * 0.4, top + 0.55, z]); }
    else if (k < 0.7) { for (let j = 0; j < 2; j++) add(g, box(0.9, 0.55, 0.7), mat(0xb8bcc4, { rough: 0.5, metal: 0.3 }), [x - tw * 0.2 + j * 1.1, top + 0.28, z + 0.3]); }
    else { add(g, cyl(0.06, 0.1, 3.2, 6), mat(0xc8ccd4, { metal: 0.6, rough: 0.3 }), [x, top + 1.6, z]); add(g, sph(0.12, 8, 6), glow(0xff3a3a, 1.2), [x, top + 3.25, z]); }
    // street level: dark shopfront glass band + awning
    add(g, box(w * 0.86, 1.8, 0.1), mat(0x2a3440, { rough: 0.2, metal: 0.3 }), [x, 1.0, z + d / 2 + 0.03]);
    add(g, box(w * 0.92, 0.08, 0.9), mat(r.pick(AWN)), [x, 2.15, z + d / 2 + 0.45], [0.28, 0, 0]);
  }
  // instanced windows (frame + glass) and floor ledges: few draw calls, lots of detail
  const frameM = new THREE.InstancedMesh(box(1, 1.7, 0.06), mat(0xe8e4dc, { rough: 0.6 }), wins.length);
  const glassM = new THREE.InstancedMesh(box(1, 1, 0.08), glass, wins.length);
  const ledgeM = new THREE.InstancedMesh(box(1, 0.14, 1), mat(0xffffff, { rough: 0.7 }), ledges.length);
  const o = new THREE.Object3D(), cc = new THREE.Color();
  wins.forEach((w, i) => {
    o.position.set(w.x, w.y, w.z); o.rotation.set(0, w.ry, 0); o.scale.set(w.w + 0.14, 1, 1); o.updateMatrix(); frameM.setMatrixAt(i, o.matrix);
    o.scale.set(w.w, 1.5, 1); o.updateMatrix(); glassM.setMatrixAt(i, o.matrix);
    glassM.setColorAt(i, cc.setHex(w.lit ? 0xffd88a : 0x5a7aa0));
  });
  ledges.forEach((l, i) => { o.position.set(l.x, l.y, l.z); o.rotation.set(0, 0, 0); o.scale.set(l.w, 1, l.d); o.updateMatrix(); ledgeM.setMatrixAt(i, o.matrix); ledgeM.setColorAt(i, cc.setHex(l.col)); });
  glassM.material.emissive = new THREE.Color(0x000000);
  for (const m of [frameM, glassM, ledgeM]) { m.castShadow = false; m.receiveShadow = true; g.add(m); }
  // lit windows glow: a second instanced layer only for lit ones (emissive), so daylight glass stays glass
  const litW = wins.filter((w) => w.lit);
  if (litW.length) { const lm = new THREE.InstancedMesh(box(1, 1, 0.02), glow(0xffd27a, 0.7 + night), litW.length); litW.forEach((w, i) => { o.position.set(w.x, w.y, w.z); o.rotation.set(0, w.ry, 0); o.translateZ(0.05); o.scale.set(w.w * 0.92, 1.4, 1); o.updateMatrix(); lm.setMatrixAt(i, o.matrix); }); g.add(lm); }
  return g;
}
// -------- landmarks (primitive, instantly recognisable silhouettes) --------
export function landmark(name) {
  const g = new THREE.Group(), stone = mat(0xd8c9a0, { rough: 0.8 }), dark = mat(0x3a3a48), red = mat(0xe5483a);
  switch (name) {
    case 'bigben': add(g, box(3, 12, 3), stone, [0, 6, 0]); add(g, box(3.6, 1.4, 3.6), stone, [0, 12.5, 0]); const cf = add(g, cyl(1.2, 1.2, 0.2, 32), mat(0xfff6dc, { emissive: 0xffe9a0, emissiveIntensity: 0.4 }), [0, 11, 1.6], [Math.PI / 2, 0, 0]); add(g, cone(2.2, 4.5, 4), mat(0x4a6a5a), [0, 15.4, 0], [0, Math.PI / 4, 0]); add(g, box(0.4, 0.4, 0.2), dark, [0, 11, 1.72]); break;
    case 'sydney': for (let i = 0; i < 5; i++) add(g, sph(3 - i * 0.35, 24, 12, 0, 3.14, 0, 1.57), mat(0xf6f4ee, { rough: 0.5, side: THREE.DoubleSide }), [i * 1.8 - 3.6, 0, i * -0.8], [0, -0.5 - i * 0.05, Math.PI * 0.5 + 0.6], [0.5 + i * 0.08, 1.2, 1]); add(g, box(14, 1, 7), mat(0xd9d2c4), [0, -0.5, 0]); break;
    case 'tokyo': { const lat = mat(0xe5483a, { rough: 0.5 }); add(g, cone(3.2, 14, 4), lat, [0, 7, 0], [0, Math.PI / 4, 0], [1, 1, 1]); add(g, box(4.8, 0.5, 4.8), mat(0xffffff), [0, 6, 0]); add(g, box(2.6, 0.5, 2.6), mat(0xffffff), [0, 10, 0]); add(g, cyl(0.1, 0.4, 5, 6), lat, [0, 16.5, 0]); break; }
    case 'burj': for (let i = 0; i < 6; i++) add(g, cyl(1.7 - i * 0.26, 2.0 - i * 0.26, 4.2, 6), mat(0x9ec4e8, { metal: 0.6, rough: 0.2 }), [0, 2.1 + i * 3.6, 0]); add(g, cyl(0.04, 0.12, 5, 6), mat(0xc8d4e0), [0, 25, 0]); break;
    case 'empire': for (let i = 0; i < 5; i++) add(g, box(7 - i * 1.2, 4, 7 - i * 1.2), mat(0xc2b8a0), [0, 2 + i * 4, 0]); add(g, cyl(0.1, 0.4, 7, 6), mat(0x8a8a92), [0, 24, 0]); break;
    case 'christ': add(g, sph(7, 24, 12, 0, 6.28, 0, 1.4), mat(0x5a9a4a, { rough: 1 }), [0, -6, 0], [0, 0, 0], [1.8, 1, 1.4]); add(g, box(1.2, 5, 1), mat(0xf2f0e8), [0, 2.5, 0]); add(g, box(6.5, 0.9, 0.9), mat(0xf2f0e8), [0, 4.3, 0]); add(g, sph(0.6, 14, 10), mat(0xf2f0e8), [0, 5.6, 0]); break;
    case 'pyramid': for (const [x, z, s] of [[-4, 0, 1], [4, 2, 0.75], [10, -1, 0.55]]) add(g, cone(6 * s, 6.5 * s, 4), mat(0xe0c070, { rough: 0.9 }), [x * 1.5, 3.2 * s, z], [0, Math.PI / 4, 0]); break;
    case 'liberty': add(g, box(3, 3, 3), stone, [0, 1.5, 0]); add(g, cyl(0.9, 1.4, 7, 10), mat(0x6ab59a), [0, 6.5, 0]); add(g, sph(0.9, 14, 10), mat(0x6ab59a), [0, 10.4, 0]); add(g, cyl(0.12, 0.12, 3, 6), mat(0x6ab59a), [1.3, 11.4, 0], [0, 0, -0.3]); add(g, cone(0.4, 1.0, 8), glow(0xffd23f, 1.3), [1.9, 13.2, 0]); for (let i = 0; i < 7; i++) add(g, cone(0.12, 0.8, 4), mat(0x6ab59a), [Math.cos(i * 0.9) * 0.9, 11.2, Math.sin(i * 0.9) * 0.9 - 0.3], [0.8, 0, i * 0.2]); break;
  }
  return g;
}
export function car(color = 0xe53935) { const g = new THREE.Group(); add(g, rbox(2.0, 0.6, 1.0, 0.18), mat(color, { rough: 0.3, metal: 0.3 }), [0, 0.5, 0]); add(g, rbox(1.1, 0.5, 0.9, 0.18), mat(0x9fd6ff, { rough: 0.1, metal: 0.3 }), [-0.1, 0.95, 0]); for (const x of [-0.65, 0.65]) for (const z of [-0.5, 0.5]) add(g, cyl(0.24, 0.24, 0.18, 14), mat(0x15151c), [x, 0.26, z], [Math.PI / 2, 0, 0]); for (const z of [-0.3, 0.3]) add(g, sph(0.1, 8, 6), glow(0xfff2b0, 1.2), [1.0, 0.55, z]); return g; }
export function iceCreamTruck() { const g = new THREE.Group(); add(g, rbox(3.2, 1.5, 1.5, 0.2), mat(0xfff2f6, { rough: 0.4 }), [0, 1.0, 0]); add(g, rbox(1.0, 1.1, 1.4, 0.2), mat(0xff8fb8), [1.9, 0.8, 0]); add(g, rbox(0.9, 0.5, 1.42, 0.1), mat(0x9fd6ff, { rough: 0.1 }), [2.0, 1.05, 0]); add(g, rbox(1.4, 0.8, 0.04, 0.05), mat(0x5a3a2a), [-0.2, 1.1, 0.78]); for (const x of [-1.0, 1.0, 1.9]) for (const z of [-0.65, 0.65]) add(g, cyl(0.3, 0.3, 0.2, 16), mat(0x15151c), [x, 0.3, z], [Math.PI / 2, 0, 0]); add(g, cone(0.35, 0.8, 12), mat(0xd9a05a), [0, 2.2, 0], [Math.PI, 0, 0]); add(g, sph(0.34, 14, 10), mat(0xff8fb8), [0, 2.75, 0]); add(g, sph(0.3, 14, 10), mat(0xfff1c0), [0, 3.1, 0]); add(g, box(2.4, 0.3, 1.6), mat(0xff3f7f), [-0.2, 1.9, 0]); return g; }
export function schoolBus() { const g = new THREE.Group(); add(g, rbox(5.2, 1.8, 1.7, 0.2), mat(0xffc20e, { rough: 0.45 }), [0, 1.2, 0]); for (let i = 0; i < 6; i++) add(g, rbox(0.55, 0.5, 0.04, 0.05), mat(0x9fd6ff, { rough: 0.1 }), [-2.0 + i * 0.75, 1.5, 0.86]); add(g, box(5.2, 0.1, 1.72), mat(0x15151c), [0, 1.0, 0]); for (const x of [-1.6, 1.6]) for (const z of [-0.8, 0.8]) add(g, cyl(0.38, 0.38, 0.24, 16), mat(0x15151c), [x, 0.38, z], [Math.PI / 2, 0, 0]); return g; }
// Relief map of a stylised state: heightfield with border blob, tan/green colours. map.setGlow(0..1) pink spread from a point.
export function reliefMap({ size = 12, seed = 5 } = {}) {
  const r = rng(seed), seg = 160, geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const ph = [r() * 6, r() * 6, r() * 6];
  const mask = (x, z) => { const a = Math.atan2(z, x), d = Math.hypot(x, z) / (size * 0.45); const edge = 0.78 + 0.18 * Math.sin(a * 3 + ph[0]) + 0.1 * Math.sin(a * 5 + ph[1]) + 0.05 * Math.sin(a * 9 + ph[2]); return edge - d; };
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), m = mask(x, z); const h = Math.max(0, m) > 0 ? (0.25 + 0.5 * (Math.sin(x * 1.2 + ph[0]) * Math.cos(z * 1.1 + ph[1]) * 0.5 + 0.5)) * Math.min(1, m * 5) : 0; p.setY(i, m > 0 ? h : -0.15); const c = new THREE.Color(0x2a5a8a); if (m > 0) { const k = Math.min(1, h / 0.7); c.set(0xc9d98a).lerp(new THREE.Color(0x78b552), Math.min(1, k * 1.6)).lerp(new THREE.Color(0x9a8a6a), Math.max(0, (k - 0.6) * 2.5)); if (m < 0.04) c.set(0xe8d9a0); } col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: false })); m.receiveShadow = m.castShadow = true;
  const g = new THREE.Group(); g.add(m); g.mask = mask; g.size = size; return g;
}
