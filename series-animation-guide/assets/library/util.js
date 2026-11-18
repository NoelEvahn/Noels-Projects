// Shared helpers: deterministic PRNG, easing, cached materials, canvas textures, mesh shortcuts.
import * as THREE from 'three';

export function rng(seed = 1) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.pick = (arr) => arr[Math.floor(f() * arr.length) % arr.length];
  f.sign = () => (f() < 0.5 ? -1 : 1);
  return f;
}

// Darken/lighten a hex colour by multiplying in linear space (safe for dark colours; offsetHSL goes black).
export function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); }

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOutBack = (t, s = 1.70158) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutElastic = (t) => {
  t = clamp(t);
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
};

const _mats = new Map();
// Cached standard material. mat(0xff0000, {rough, metal, emissive, emissiveIntensity, transparent, opacity, side})
export function mat(color, o = {}) {
  const key = JSON.stringify([color, o]);
  if (_mats.has(key)) return _mats.get(key);
  const m = new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.72, metalness: o.metal ?? 0,
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 1,
    transparent: !!o.transparent || (o.opacity !== undefined && o.opacity < 1),
    opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide, flatShading: !!o.flat,
    map: o.map ?? null,
  });
  if (o.depthWrite === false) m.depthWrite = false;
  _mats.set(key, m);
  return m;
}
export const glow = (color, k = 1, o = {}) => mat(color, { emissive: color, emissiveIntensity: k, rough: 0.5, ...o });

// Add a mesh to a parent: add(parent, geometry, material, [x,y,z], [rx,ry,rz], scale|[sx,sy,sz])
export function add(parent, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(pos[0], pos[1], pos[2]);
  m.rotation.set(rot[0], rot[1], rot[2]);
  if (Array.isArray(scale)) m.scale.set(scale[0], scale[1], scale[2]); else m.scale.setScalar(scale);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

export const sph = (r = 1, w = 24, h = 16, ps = 0, pl = Math.PI * 2, ts = 0, tl = Math.PI) => new THREE.SphereGeometry(r, w, h, ps, pl, ts, tl);
export const box = (w = 1, h = 1, d = 1) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt = 1, rb = 1, h = 1, s = 24, hs = 1, open = false, ts = 0, tl = Math.PI * 2) => new THREE.CylinderGeometry(rt, rb, h, s, hs, open, ts, tl);
export const cap = (r = 0.1, len = 0.3, cs = 6, rs = 16) => new THREE.CapsuleGeometry(r, len, cs, rs);
export const cone = (r = 1, h = 1, s = 24) => new THREE.ConeGeometry(r, h, s);
export const tor = (R = 1, r = 0.2, rs = 12, ts = 32, arc = Math.PI * 2) => new THREE.TorusGeometry(R, r, rs, ts, arc);

// Rounded box (bevelled) via extruded rounded rectangle shape.
export function rbox(w, h, d, r = 0.05) {
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001);
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * Math.min(r, d / 2 - 0.001), bevelEnabled: true, bevelThickness: Math.min(r, d / 2 - 0.001), bevelSize: 0, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * Math.min(r, d / 2 - 0.001)) / 2);
  return g;
}

// Heart shape in XY plane, unit-ish size (width ~1). extrude depth d.
export function heartGeo(d = 0.3, bevel = 0.08) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.35, -0.55, -0.1, -0.55, 0.18);
  s.bezierCurveTo(-0.55, 0.42, -0.32, 0.5, -0.18, 0.5);
  s.bezierCurveTo(-0.08, 0.5, 0, 0.42, 0, 0.32);
  s.bezierCurveTo(0, 0.42, 0.08, 0.5, 0.18, 0.5);
  s.bezierCurveTo(0.32, 0.5, 0.55, 0.42, 0.55, 0.18);
  s.bezierCurveTo(0.55, -0.1, 0.15, -0.35, 0, -0.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 16 });
  g.translate(0, 0, -d / 2);
  return g;
}

// Canvas texture helper: canvasTex(w,h,(ctx,w,h)=>{...})
export function canvasTex(w, h, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// Flat board with text (head-on). lines: [{text, size, color, y, font}]
export function textBoard(w, h, lines, { bg = '#101a3a', border = '#ffffff', px = 512, radius = 24 } = {}) {
  const aspect = h / w;
  const tex = canvasTex(px, Math.round(px * aspect), (g, cw, ch) => {
    g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, cw, ch, radius); g.fill();
    if (border) { g.strokeStyle = border; g.lineWidth = 8; g.beginPath(); g.roundRect(8, 8, cw - 16, ch - 16, radius - 6); g.stroke(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const l of lines) {
      g.font = `${l.weight ?? 800} ${(l.size ?? 0.12) * cw}px ${l.font ?? 'Inter, sans-serif'}`;
      g.fillStyle = l.color ?? '#fff';
      g.fillText(l.text, cw / 2, (l.y ?? 0.5) * ch, cw * 0.92);
    }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  return m;
}

export function setShadows(obj, cast = true, receive = true) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
  return obj;
}

// Colours
export const C = {
  skinPeach: 0xf2b98f, skinTan: 0xd99a6c, skinBrown: 0x9b6338, skinDark: 0x6b4226, skinPale: 0xf8d5b8, skinPink: 0xeda98c,
  red: 0xe53935, blue: 0x2f6fd6, yellow: 0xffd23f, green: 0x2fa66a, purple: 0x8a52c9, pink: 0xff5c8a, orange: 0xff8a2b,
  teal: 0x2bb7b0, white: 0xffffff, black: 0x15151c, cream: 0xf6ecd5, navy: 0x1b2a5c, gold: 0xf5b82e, brown: 0x5a3820,
};
