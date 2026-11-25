// INTERIORS pack: helpers shared by the room sets (doorways, wall tiles, stairs, fairy lights, background people, cameras).
import * as THREE from 'three';
import { P, bg, rg, cg, sg, inst, setInst, tube, room, castAll, sign, PAL, COL, INT_STAGE } from '../props/interiors_core.js';
import { mat, glow, rng, shade } from '../util.js';
import { makeCharacter, PRESETS, POSES, FACES, randomPerson, CLOCK } from '../character.js';

export { INT_STAGE };
const TAU = Math.PI * 2;

// Camera in front of the open side: portrait-friendly, sees the whole back wall.
export function camFor(R, { fov = 56, y = 1.65, ty = null, tz = null, x = 0, tx = 0, fit = 1.0, minD = 4.5 } = {}) {
  const th = Math.tan(fov * Math.PI / 360) * 0.75;           // half-width factor of a 3:4 / 9:16 portrait frame
  const D = Math.max(minD, (R.w / 2 * fit) / th);              // camera -> back wall distance so the back wall fills the frame width
  return { pos: [x, y, -R.d / 2 + D], target: [tx, ty ?? Math.min(1.3, R.h * 0.44), tz ?? -R.d * 0.1], fov };
}

// Door (leaf + frame + handle) standing on the floor against a wall. origin = floor centre of the doorway, faces +Z. open 0..1 swings the leaf inward.
export function door({ w = 0.95, h = 2.05, color = 0xc8302b, frame = 0xffffff, glass = false, open = 0, knob = 0xd8b040 } = {}) {
  const g = new THREE.Group(), t = 0.07; const fm = mat(frame, { rough: 0.5 });
  P(g, bg(w + 2 * t, t, 0.1), fm, [0, h + t / 2, 0.03]); for (const s of [-1, 1]) P(g, bg(t, h + t, 0.1), fm, [s * (w / 2 + t / 2), (h + t) / 2, 0.03]);
  P(g, bg(w, h, 0.02), mat(0x2a2018, { rough: 1 }), [0, h / 2, 0.0]);  // dark gap behind an open door
  const leaf = new THREE.Group(); leaf.position.set(-w / 2, 0, 0.03); leaf.rotation.y = -open * 1.5; g.add(leaf);
  P(leaf, rg(w - 0.01, h - 0.01, 0.04, 0.012), mat(color, { rough: 0.5 }), [w / 2, h / 2, 0], [0, 0, 0], 1, true);
  if (glass) P(leaf, bg(w * 0.55, h * 0.4, 0.045), mat(0xcfeaff, { opacity: 0.45, rough: 0.05 }), [w / 2, h * 0.68, 0]);
  else for (const y of [0.3, 0.7]) P(leaf, rg(w * 0.62, h * 0.3, 0.012, 0.01), mat(shade(color, 0.88), { rough: 0.5 }), [w / 2, h * y + (y > 0.5 ? 0.08 : -0.12), 0.024]);
  P(leaf, sg(0.032, 10, 8), mat(knob, { metal: 0.8, rough: 0.3 }), [w - 0.1, h * 0.48, 0.05]); P(leaf, cg(0.01, 0.01, 0.06, 6), mat(knob, { metal: 0.8 }), [w - 0.1, h * 0.48, 0.03], [Math.PI / 2, 0, 0]);
  g.userData.realHeightM = h + t; return g;
}

// instanced tiles covering a rectangle on a wall plane. plane 'back' (z fixed) | 'left' | 'right'. rect in wall coords [u0,u1,y0,y1]; returns InstancedMesh
export function wallTiles(R, plane, [u0, u1, y0, y1], { size = 0.2, c1 = 0xf4f4f0, c2 = 0x6ab0d8, pattern = 'rows', grout = 0xd8d8d0, seed = 1, parent = null, off = 0.012 } = {}) {
  const r = rng(seed + 21); const g = parent ?? R.g; const items = [];
  const nu = Math.ceil((u1 - u0) / size), ny = Math.ceil((y1 - y0) / size);
  const place = (u, y, sx, sy, col) => {
    if (plane === 'back') items.push({ p: [u, y, -R.d / 2 + off], s: [sx, sy, 0.012], c: col });
    else if (plane === 'left') items.push({ p: [-R.w / 2 + off, y, u], s: [0.012, sy, sx], c: col });
    else items.push({ p: [R.w / 2 - off, y, u], s: [0.012, sy, sx], c: col });
  };
  for (let i = 0; i < nu; i++) for (let j = 0; j < ny; j++) {
    const u = u0 + (i + 0.5) * size, y = y0 + (j + 0.5) * size; if (u > u1 + 0.001 || y > y1 + 0.001) continue;
    const col = pattern === 'checker' ? ((i + j) % 2 ? c2 : c1) : pattern === 'band' ? (j === ny - 2 ? c2 : c1) : pattern === 'rows' ? (j % 4 === 3 ? c2 : c1) : c1;
    place(u, y, size - 0.012, size - 0.012, shade(col, 1 + (r() - 0.5) * 0.05));
  }
  // grout backing
  const backing = plane === 'back' ? P(g, bg(u1 - u0, y1 - y0, 0.01), mat(grout, { rough: 1 }), [(u0 + u1) / 2, (y0 + y1) / 2, -R.d / 2 + 0.007]) : P(g, bg(0.01, y1 - y0, u1 - u0), mat(grout, { rough: 1 }), [plane === 'left' ? -R.w / 2 + 0.007 : R.w / 2 - 0.007, (y0 + y1) / 2, (u0 + u1) / 2]);
  return inst(g, bg(1, 1, 1), mat(0xffffff, { rough: 0.25 }), items);
}

// staircase: n steps rising along +Y while advancing along -Z (local), with side stringer, handrail + balusters. origin at the first step's front-bottom centre.
export function stairs({ n = 12, w = 1.0, rise = 0.19, run = 0.27, color = 0xc99a62, rail = 0x6a4428, carpet = 0xb04a4a, side = 1 } = {}) {
  const g = new THREE.Group(); const H = n * rise, L = n * run;
  const items = [], runner = [];
  for (let i = 0; i < n; i++) { items.push({ p: [0, rise * (i + 1) - 0.02, -run * (i + 0.5)], s: [w, 0.04, run + 0.02], c: color }); items.push({ p: [0, rise * (i + 0.5), -run * i - 0.01], s: [w - 0.02, rise, 0.02], c: shade(color, 0.85) }); runner.push({ p: [0, rise * (i + 1) + 0.0, -run * (i + 0.5)], s: [w * 0.55, 0.012, run * 0.98], c: carpet }); }
  inst(g, bg(1, 1, 1), mat(0xffffff, { rough: 0.6 }), items, { cast: true }); inst(g, bg(1, 1, 1), mat(0xffffff, { rough: 0.95 }), runner);
  const ang = Math.atan2(H, L), len = Math.hypot(H, L);
  for (const s of [-1, 1]) P(g, bg(0.04, 0.22, len), mat(shade(color, 0.7), { rough: 0.6 }), [s * (w / 2 - 0.01), H / 2 - 0.05, -L / 2], [ang, 0, 0]);
  // solid underside
  P(g, bg(w, 0.05, len), mat(shade(color, 0.6), { rough: 0.8 }), [0, H / 2 - 0.2, -L / 2], [ang, 0, 0]);
  const rx = side * (w / 2 + 0.02);
  const bal = []; for (let i = 0; i < n; i++) bal.push({ p: [rx, rise * (i + 1) + 0.45, -run * (i + 0.5)], s: [0.025, 0.9, 0.025], c: 0xf2ead8 });
  inst(g, bg(1, 1, 1), mat(0xffffff, { rough: 0.5 }), bal);
  P(g, bg(0.06, 0.06, len), mat(rail, { rough: 0.45 }), [rx, H / 2 + 0.93, -L / 2], [ang, 0, 0], 1, true); P(g, sg(0.06, 10, 8), mat(rail, { rough: 0.45 }), [rx, 1.0, 0.0]);
  g.userData.top = [0, H, -L]; g.userData.realHeightM = H; return g;
}

// Fairy lights along a catenary between two points; bulbs twinkle through 3 colours
export function fairyLights(a, b, { n = 16, sag = 0.18, colors = [0xff5c8a, 0xffd23f, 0x6ad0ff, 0x7dff9a], seed = 1 } = {}) {
  const g = new THREE.Group(); const pts = []; const bulbs = [];
  for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * sag, a[2] + (b[2] - a[2]) * u]); }
  tube(g, pts, 0.004, 0x15151c, { seg: 24, sides: 3 });
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; const p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * sag - 0.03, a[2] + (b[2] - a[2]) * u]; bulbs.push(P(g, sg(0.022, 6, 5), glow(colors[i % colors.length], 1.4), p)); }
  g.userData.update = (t) => bulbs.forEach((m, i) => { m.visible = ((Math.floor(t * 2.5 + i * 0.7) + i) % 4) !== 0 || i % 2 === 0; m.scale.setScalar(0.8 + 0.3 * Math.sin(t * 5 + i * 1.3)); }); g.userData.update(0.6); return g;
}

// ---- background people (low-detail rig) ----
const PEOPLE_COLS = [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x264653, 0xf4a261, 0x7b2cbf, 0x3a86ff, 0xff006e];
export function sitter(r, { seat = 0.46, ry = 0, typing = false, preset = null, scale = 0.875, lookAround = 0.25, accs = null } = {}) {
  const p = preset ? makeCharacter({ ...PRESETS[preset], detail: 'low' }) : randomPerson(r, PEOPLE_COLS); const ph = r() * 6, g = new THREE.Group(); g.add(p.root); g.rotation.y = ry; g.scale.setScalar(scale);
  const f = FACES.neutral;
  g.userData.update = (t) => { CLOCK.t = t; const ex = typing ? { aLf: 0.75 + Math.sin(t * 7 + ph) * 0.04, aRf: 0.75 + Math.sin(t * 8 + ph) * 0.04, aLe: 1.3 + Math.sin(t * 9 + ph) * 0.08, aRe: 1.3 + Math.cos(t * 9 + ph) * 0.08, hx: 0.12, hy: Math.sin(t * 0.4 + ph) * 0.06 } : { hy: Math.sin(t * 0.5 + ph) * lookAround, hx: Math.sin(t * 0.3 + ph) * 0.05 }; p.pose({ ...POSES.sitOn(t, seat / scale), ...ex, plant: true }); p.face(f); };
  g.userData.update(0.6); g.userData.person = p; return g;
}
export function stander(r, { pose = 'idle', preset = null, ry = 0, scale = 0.875, talk = false } = {}) {
  const p = preset ? makeCharacter({ ...PRESETS[preset], detail: 'low' }) : randomPerson(r, PEOPLE_COLS); const ph = r() * 6, g = new THREE.Group(); g.add(p.root); g.rotation.y = ry; g.scale.setScalar(scale);
  g.userData.update = (t) => { CLOCK.t = t; const base = (POSES[pose] ?? POSES.idle)(t + ph); p.pose({ ...base, hy: (base.hy ?? 0) + Math.sin(t * 0.6 + ph) * 0.15 }); p.face(talk ? { ...FACES.neutral, open: 0.3 + 0.3 * Math.abs(Math.sin(t * 7 + ph)) } : FACES.neutral); };
  g.userData.update(0.6); g.userData.person = p; return g;
}

// a clipboard / paper plaque on a wall etc.
export function plaque(text, w = 0.5, h = 0.18, { bg: b = '#1b2a5c', fg = '#fff', size = 0.55 } = {}) { const g = new THREE.Group(); P(g, bg(w + 0.03, h + 0.03, 0.02), mat(0x15151c), [0, 0, 0.01]); const s = sign(text, w, h, { bg: b, fg, size, px: 256 }); s.position.z = 0.022; g.add(s); return g; }
export const mountOnWall = (R, obj, u, y, plane = 'back') => { if (plane === 'back') obj.position.set(u, y, -R.d / 2); else if (plane === 'left') { obj.position.set(-R.w / 2, y, u); obj.rotation.y = Math.PI / 2; } else { obj.position.set(R.w / 2, y, u); obj.rotation.y = -Math.PI / 2; } R.g.add(obj); if (obj.userData.update) R.anim(obj.userData.update); return obj; };
export function updatesOf(g) { const l = []; g.traverse((o) => { if (o.userData.update && !l.includes(o.userData.update)) l.push(o.userData.update); }); return l; }
