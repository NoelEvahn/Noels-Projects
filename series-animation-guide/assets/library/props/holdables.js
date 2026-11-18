// Things characters hold. Authored upright (+Y), grip point at the origin, userData.grip = {upright:true, hand:'grip'|'pinch'|'flat'|…}.
// Use with: ch.pose(POSES.holdR()); ch.hold(item, 'R');
import * as THREE from 'three';
import { mat, glow, add, sph, box, cyl, cap, cone, tor, rbox, textBoard, canvasTex, C } from '../util.js';
import { makeHeart } from '../fx/hearts.js';

const G = (o, d = {}) => { o.userData.grip = { upright: true, hand: 'grip', ...d }; return o; };

export function spatula() { const g = new THREE.Group(); add(g, cyl(0.014, 0.014, 0.3, 8), mat(0x3a2a22), [0, 0.04, 0]); add(g, rbox(0.1, 0.12, 0.015, 0.01), mat(0xb8bcc8, { metal: 0.7, rough: 0.3 }), [0, 0.25, 0]); return G(g); }
export function iceCream(scoops = 2, cols = [0xff8fb8, 0xfff1c0, 0x9be0c0]) {
  const g = new THREE.Group(); add(g, cone(0.045, 0.16, 12), mat(0xd9a05a), [0, 0.05, 0], [Math.PI, 0, 0]);
  for (let i = 0; i < scoops; i++) add(g, sph(0.055 - i * 0.004, 16, 12), mat(cols[i % cols.length], { rough: 0.5 }), [0, 0.14 + i * 0.085, 0]);
  add(g, sph(0.018, 8, 6), mat(0xe53935), [0, 0.14 + scoops * 0.085, 0]);
  return G(g, { hand: 'grip' });
}
export function envelope(heart = true) { const g = new THREE.Group(); add(g, rbox(0.2, 0.13, 0.01, 0.004), mat(0xfaf3e0), [0, 0, 0]); add(g, cone(0.1, 0.07, 3), mat(0xefe3c4), [0, 0.03, 0.006], [0, 0, Math.PI], [1, 1, 0.05]); if (heart) { const h = makeHeart(0xff3f7f, 0.05, 0.1); h.position.set(0, 0.0, 0.011); g.add(h); } return G(g, { upright: false, hand: 'pinch', pos: [0, -0.04, 0.0], rot: [0, 0, 0.3] }); }
export function microphone() { const g = new THREE.Group(); add(g, cyl(0.022, 0.018, 0.2, 10), mat(0x25252c, { metal: 0.5, rough: 0.4 }), [0, 0.04, 0]); add(g, sph(0.05, 14, 10), mat(0x9a9aa6, { metal: 0.7, rough: 0.3 }), [0, 0.18, 0]); add(g, cyl(0.052, 0.052, 0.018, 14), mat(0xe53935), [0, 0.14, 0]); return G(g); }
export function megaphone() { const g = new THREE.Group(); add(g, cyl(0.12, 0.03, 0.28, 16, 1, true), mat(0xe8e8ee, { side: THREE.DoubleSide, rough: 0.4 }), [0, 0.18, 0]); add(g, cyl(0.032, 0.032, 0.08, 10), mat(0x25252c), [0, -0.02, 0]); return G(g); }
export function flagOnStick(col = 0xff3f7f) { const g = new THREE.Group(); add(g, cyl(0.012, 0.012, 0.7, 6), mat(0xd8d0c0), [0, 0.25, 0]); add(g, box(0.3, 0.2, 0.01), mat(col, { side: THREE.DoubleSide }), [0.16, 0.5, 0]); const h = makeHeart(0xffffff, 0.12, 0.2); h.position.set(0.16, 0.5, 0.008); g.add(h); return G(g); }
export function signBoard(text = 'WE ♥ THAT GUY', bg = '#ff3f7f', fg = '#ffffff') {
  const g = new THREE.Group(); add(g, cyl(0.014, 0.014, 0.8, 6), mat(0xc9a06a), [0, 0.1, 0]);
  const b = textBoard(0.62, 0.36, [{ text, size: 0.14, color: fg, y: 0.5, font: 'Anton, Inter, sans-serif', weight: 400 }], { bg, border: '#ffffff' }); b.position.set(0, 0.58, 0.012); g.add(b);
  add(g, box(0.64, 0.38, 0.016), mat(0x222222), [0, 0.58, 0]);
  return G(g);
}
export function beaker(color = 0xff5c9a) { const g = new THREE.Group(); add(g, cyl(0.06, 0.06, 0.14, 16, 1, true), mat(0xdff3ff, { opacity: 0.35, side: THREE.DoubleSide, rough: 0.05 }), [0, 0.07, 0]); add(g, cyl(0.055, 0.055, 0.09, 16), mat(color, { emissive: color, emissiveIntensity: 0.25, rough: 0.2 }), [0, 0.05, 0]); return G(g, { pos: [0, -0.04, 0] }); }
export function testTube(color = 0x7bff9a) { const g = new THREE.Group(); add(g, cap(0.02, 0.14, 4, 10), mat(0xdff3ff, { opacity: 0.4 }), [0, 0.05, 0]); add(g, cap(0.016, 0.08, 4, 10), mat(color, { emissive: color, emissiveIntensity: 0.35 }), [0, 0.02, 0]); return G(g); }
export function clipboard() { const g = new THREE.Group(); add(g, rbox(0.24, 0.32, 0.018, 0.01), mat(0xb08a5a), [0, 0, 0]); add(g, box(0.2, 0.28, 0.004), mat(0xffffff), [0, -0.01, 0.01]); add(g, box(0.08, 0.025, 0.012), mat(0x999999, { metal: 0.7 }), [0, 0.15, 0.012]); return G(g, { upright: false, hand: 'flat', pos: [0, -0.1, 0.0], rot: [0, 0, 0] }); }
export function tray(withFood = true) { const g = new THREE.Group(); add(g, cyl(0.2, 0.19, 0.02, 24), mat(0xc0c4d0, { metal: 0.8, rough: 0.25 }), [0, 0, 0]); if (withFood) for (let i = 0; i < 3; i++) add(g, sph(0.05, 10, 8), mat([0xff8a2b, 0xffd23f, 0xff5c8a][i]), [(i - 1) * 0.1, 0.05, 0]); return G(g, { upright: true, hand: 'flat', pos: [0, 0, 0.02] }); }
export function bouquet() { const g = new THREE.Group(); add(g, cone(0.07, 0.2, 10), mat(0x7a9a5a), [0, 0.02, 0], [Math.PI, 0, 0]); for (let i = 0; i < 7; i++) { const a = i * 0.9; add(g, sph(0.05, 8, 6), mat([0xff5c8a, 0xffd23f, 0xffffff, 0xb07aff][i % 4]), [Math.cos(a) * 0.05, 0.16 + (i % 3) * 0.02, Math.sin(a) * 0.05]); } return G(g); }
// A single heart balloon with its string; grip point = bottom of the string.
export function heartBalloon(color = 0xff3f7f, len = 1.2) { const g = new THREE.Group(); const h = makeHeart(color, 0.5, 0.25); h.position.y = len + 0.28; h.material.roughness = 0.12; g.add(h); add(g, cyl(0.004, 0.004, len, 4), mat(0xf0f0f0), [0, len / 2, 0]).castShadow = false; add(g, cone(0.03, 0.05, 6), mat(color), [0, len + 0.0, 0], [Math.PI, 0, 0]); return G(g, { hand: 'pinch' }); }
// Bunch of heart balloons (n) on strings gathered at the grip point.
export function balloonBunch(n = 7, len = 1.1, colors = [0xff3f7f, 0xff8fb8, 0xffd23f, 0x4aa0e0, 0xb07aff, 0xff5c5c, 0xffffff]) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, k = 0.12 + (i % 3) * 0.05, L = len + (i % 3) * 0.2; const b = heartBalloon(colors[i % colors.length], L); b.rotation.set(Math.sin(a) * k, 0, -Math.cos(a) * k); g.add(b); }
  return G(g, { hand: 'grip' });
}
export function foamHand() { const g = new THREE.Group(); add(g, rbox(0.2, 0.3, 0.06, 0.05), mat(0xffd23f), [0, 0.15, 0]); add(g, cap(0.035, 0.14, 4, 8), mat(0xffd23f), [0.0, 0.34, 0]); for (const x of [-0.07, 0.0, 0.07]) add(g, cap(0.03, 0.1, 4, 8), mat(0xffd23f), [x, 0.31, 0]); return G(g); }
export function goldenBuzzerButton() { const g = new THREE.Group(); add(g, cyl(0.18, 0.2, 0.08, 24), mat(0x3a2a1a), [0, 0.04, 0]); add(g, cyl(0.13, 0.15, 0.1, 24), mat(0xffc830, { metal: 0.9, rough: 0.2, emissive: 0xffa010, emissiveIntensity: 0.35 }), [0, 0.12, 0]); add(g, tor(0.15, 0.02, 8, 24), mat(0xffe27a, { metal: 0.8 }), [0, 0.09, 0], [Math.PI / 2, 0, 0]); return g; }
