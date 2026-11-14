// Characters and animals (Annex A 9.1, 9.4). A character is 15 rigid segments (pelvis, torso, chest, head, upper/lower arms,
// hands, thighs, shins, feet) with rounded lathed shapes overlapping at the joints, plus hair cap / hat and clothing variation
// by segment tint and outfit (shirt, jacket, hi-vis vest, apron, hard hat, cap). No skinning: entity views place each segment
// from a procedural gait (walk, run, sprint, idle, jump). The registered builder returns the figure in a rest pose (LOD0
// ~2.5k, LOD1 ~600, LOD2 a 2-segment capsule figure) for static use and impostors.
import { GB, srng, out } from '../kit/geo.js';
import { Builders } from '../../render/builders.js';

const SKIN = [0xe8c0a0, 0xc89878, 0x9a6a4a, 0x6a4a34, 0xf0d0b8];
const HAIR = [0x2a1e16, 0x5a3a22, 0x8a6a40, 0x1a1a1a, 0xb0a090];
export const OUTFITS = {
  casual: { shirt: [0x3a5a8a, 0x8a3a3a, 0x5a7a5a, 0xd8d0c0, 0x2a2a2a], legs: [0x2a3a5a, 0x3a3a3a, 0x7a6a5a], shoes: 0x2a2420 },
  player: { shirt: [0x2a6a9a], legs: [0x2a3040], shoes: 0x3a2a20, jacket: 0x4a5a3a },
  worker: { shirt: [0x5a6a7a], legs: [0x3a4a5a], shoes: 0x3a2a1a, vest: 0xe8e020, hat: 0xf0c020 },
  chef: { shirt: [0xf0f0ec], legs: [0x2a2a2a], shoes: 0x1a1a1a, apron: 0xf8f8f4 },
  fisher: { shirt: [0x8a3a2a], legs: [0x3a4a3a], shoes: 0x2a3a2a, vest: 0xe86020, cap: 0x2a3a5a },
  logger: { shirt: [0xa82a2a], legs: [0x3a4a6a], shoes: 0x3a2a1a, hat: 0xe86020 },
};
/** segment table: name, parent, joint offset from parent joint (rest pose), lathe profile [r, y] (y down from the joint, negative) */
export const SEGMENTS = [
  ['pelvis', -1, [0, 0.95, 0]], ['torso', 0, [0, 0.08, 0]], ['chest', 1, [0, 0.22, 0]], ['head', 2, [0, 0.3, 0]],
  ['upperArmL', 2, [-0.2, 0.2, 0]], ['lowerArmL', 4, [0, -0.29, 0]], ['handL', 5, [0, -0.25, 0]],
  ['upperArmR', 2, [0.2, 0.2, 0]], ['lowerArmR', 7, [0, -0.29, 0]], ['handR', 8, [0, -0.25, 0]],
  ['thighL', 0, [-0.1, -0.04, 0]], ['shinL', 10, [0, -0.44, 0]], ['footL', 11, [0, -0.43, 0]],
  ['thighR', 0, [0.1, -0.04, 0]], ['shinR', 13, [0, -0.44, 0]], ['footR', 14, [0, -0.43, 0]],
];
function seg(g, name, o, lod) {
  const n = lod ? 6 : 10;
  switch (name) {
    case 'pelvis': g.mat('tex.fabric_cloth', o.legs); g.push().scale(1.25, 1, 0.85); g.lathe([[0.001, -0.12], [0.13, -0.1], [0.15, 0.0], [0.14, 0.1], [0.001, 0.12]], n); g.pop(); break;
    case 'torso': g.mat('tex.fabric_cloth', o.jacket || o.shirt); g.push().scale(1.3, 1, 0.8); g.lathe([[0.001, 0], [0.13, 0.02], [0.14, 0.22], [0.001, 0.24]], n); g.pop(); break;
    case 'chest': g.mat('tex.fabric_cloth', o.jacket || o.shirt); g.push().scale(1.35, 1, 0.78); g.lathe([[0.001, -0.02], [0.15, 0.0], [0.16, 0.18], [0.12, 0.28], [0.05, 0.31], [0.001, 0.31]], n); g.pop();
      if (o.vest) { g.mat('tex.fabric_cloth', o.vest); g.push().scale(1.38, 1, 0.82); g.lathe([[0.155, -0.1], [0.165, 0.16], [0.13, 0.26]], n); g.pop(); g.mat('tex.flat', 0xd0d0d0); g.box(0, 0.08, -0.13, 0.4, 0.03, 0.02); }
      if (o.apron) { g.mat('tex.fabric_cloth', o.apron); g.box(0, -0.2, -0.13, 0.32, 0.6, 0.02); }
      g.mat('tex.fabric_cloth', o.skin); g.cyl(0, 0.26, 0, 0.05, 0.05, 0.08, 6); break;
    case 'head': g.mat('tex.fabric_cloth', o.skin); g.push().scale(0.9, 1, 1); g.lathe([[0.001, 0], [0.07, 0.02], [0.1, 0.1], [0.095, 0.2], [0.06, 0.26], [0.001, 0.27]], n); g.pop();
      g.box(0, 0.13, -0.095, 0.03, 0.04, 0.03); // nose
      if (!lod) { g.mat('tex.flat', 0x1a1a1a); for (const s of [-1, 1]) g.box(s * 0.035, 0.155, -0.085, 0.02, 0.012, 0.01); }
      if (o.hat) { g.mat('tex.plastic', o.hat); g.lathe([[0.13, 0.17], [0.12, 0.2], [0.1, 0.28], [0.001, 0.3]], n); g.cyl(0, 0.17, 0, 0.15, 0.15, 0.015, n); }
      else if (o.cap) { g.mat('tex.fabric_cloth', o.cap); g.lathe([[0.105, 0.17], [0.1, 0.24], [0.001, 0.29]], n); g.box(0, 0.18, -0.12, 0.14, 0.015, 0.09); }
      else { g.mat('tex.fabric_cloth', o.hair); g.push().translate(0, 0.005, 0.008); g.lathe([[0.1, 0.12], [0.104, 0.2], [0.07, 0.265], [0.001, 0.278]], n); g.pop(); }
      break;
    case 'upperArmL': case 'upperArmR': g.mat('tex.fabric_cloth', o.jacket || o.shirt); g.lathe([[0.001, 0.02], [0.055, 0.0], [0.05, -0.26], [0.001, -0.3]], n); break;
    case 'lowerArmL': case 'lowerArmR': g.mat('tex.fabric_cloth', o.jacket ? o.jacket : o.skin); g.lathe([[0.001, 0.02], [0.045, 0.0], [0.035, -0.24], [0.001, -0.26]], n); break;
    case 'handL': case 'handR': g.mat('tex.fabric_cloth', o.skin); g.push().scale(0.8, 1, 1.3); g.lathe([[0.001, 0], [0.035, -0.03], [0.03, -0.12], [0.001, -0.14]], lod ? 4 : 6); g.pop(); break;
    case 'thighL': case 'thighR': g.mat('tex.fabric_cloth', o.legs); g.lathe([[0.001, 0.03], [0.08, 0.0], [0.06, -0.42], [0.001, -0.45]], n); break;
    case 'shinL': case 'shinR': g.mat('tex.fabric_cloth', o.legs); g.lathe([[0.001, 0.02], [0.058, 0.0], [0.045, -0.4], [0.001, -0.43]], n); break;
    default: g.mat('tex.leather', o.shoes); g.box(0, -0.04, -0.05, 0.1, 0.08, 0.26); // feet
  }
}
/** resolves an outfit (seeded tints) */
export function outfitFor(arch, seed, name) {
  const R = srng(seed || 1), O = OUTFITS[name || (arch === 'chr.player' ? 'player' : arch === 'chr.worker' ? 'worker' : 'casual')];
  const p = (a) => (Array.isArray(a) ? a[Math.floor(R() * a.length)] : a);
  return { shirt: p(O.shirt), legs: p(O.legs), shoes: O.shoes, jacket: O.jacket, vest: O.vest, hat: O.hat, cap: O.cap, apron: O.apron, skin: p(SKIN), hair: p(HAIR) };
}
/** per-segment arrays (local to the segment joint) for animated views */
const segCache = new Map();
export function segmentGeometry(arch, seed, lod = 0, outfit) {
  const key = arch + ':' + seed + ':' + lod + ':' + (outfit || '');
  let r = segCache.get(key);
  if (r) return r;
  const o = outfitFor(arch, seed, outfit), g = new GB(1024);
  r = SEGMENTS.map(([name]) => { g.reset(); g.groundAO = false; seg(g, name, o, lod); return g.toArrays(); });
  segCache.set(key, r);
  return r;
}
/**
 * procedural gait (Annex A 9.1): returns joint rotations [rx] per segment and pelvis bob for state/phase.
 * out: Float32Array(16 * 3) euler (x, y, z) per segment; returns pelvis y offset.
 */
export function gait(state, phase, speed, out3) {
  out3.fill(0);
  const run = state === 'run' || state === 'sprint', amp = state === 'idle' ? 0 : run ? (state === 'sprint' ? 1.0 : 0.85) : 0.5;
  const s = Math.sin(phase), c = Math.cos(phase);
  const set = (i, x, y = 0, z = 0) => { out3[i * 3] = x; out3[i * 3 + 1] = y; out3[i * 3 + 2] = z; };
  if (state === 'jump') { set(10, -0.6); set(11, 0.9); set(13, -0.3); set(14, 0.5); set(4, 0, 0, -0.9); set(7, 0, 0, 0.9); return 0.05; }
  if (state === 'idle') { const b = Math.sin(phase * 0.25) * 0.03; set(1, b * 0.5); set(4, 0.05, 0, -0.08); set(7, 0.05, 0, 0.08); set(5, -0.15); set(8, -0.15); return b * 0.2; }
  set(10, s * amp * 0.9); set(13, -s * amp * 0.9);
  set(11, Math.max(0, -c) * amp * (run ? 1.6 : 1.0) + 0.05); set(14, Math.max(0, c) * amp * (run ? 1.6 : 1.0) + 0.05);
  set(12, -s * 0.2 * amp); set(15, s * 0.2 * amp);
  set(4, -s * amp * 0.8, 0, -0.06); set(7, s * amp * 0.8, 0, 0.06);
  set(5, -(run ? 1.3 : 0.35) - 0.2 * amp * Math.max(0, s)); set(8, -(run ? 1.3 : 0.35) - 0.2 * amp * Math.max(0, -s));
  set(1, run ? 0.18 : 0.04, s * 0.08 * amp); set(2, 0, -s * 0.12 * amp);
  void speed;
  return Math.abs(c) * (run ? 0.06 : 0.03);
}
for (const id of ['chr.player', 'chr.ped', 'chr.worker']) Builders.register(id, (pl, ctx) => {
  const lod = ctx.lod || 0, g = new GB(2048);
  if (lod >= 2) { const o = outfitFor(id, pl.seed); g.mat('tex.fabric_cloth', o.legs); g.cyl(0, 0, 0, 0.15, 0.17, 0.95, 6); g.mat('tex.fabric_cloth', o.shirt); g.cyl(0, 0.95, 0, 0.2, 0.12, 0.6, 6); g.mat('tex.fabric_cloth', o.skin); g.cyl(0, 1.55, 0, 0.1, 0.08, 0.22, 6); return out({ 'mat.world': g }); }
  const segs = segmentGeometry(id, pl.seed || 1, lod), world = [];
  // rest-pose world joint positions
  for (let i = 0; i < SEGMENTS.length; i++) { const [, par, off] = SEGMENTS[i]; const p = par < 0 ? [0, 0, 0] : world[par]; world.push([p[0] + off[0], p[1] + off[1], p[2] + off[2]]); }
  for (let i = 0; i < SEGMENTS.length; i++) g.append(segs[i], world[i][0], world[i][1], world[i][2], 0);
  return out({ 'mat.world': g });
}, { stage: 3 });

// ---- animals -------------------------------------------------------------------------------------------------------------------------------------------
const ANI = {
  'ani.gull': (g) => { g.mat('tex.fabric_cloth', 0xf0f0ec); g.push().scale(1, 0.8, 1); g.lathe([[0.001, -0.18], [0.07, -0.1], [0.08, 0.08], [0.001, 0.2]].map(([r, y]) => [r, y]), 8); g.pop(); g.mat('tex.fabric_cloth', 0x9aa0a8); for (const s of [-1, 1]) g.quad([0, 0.04, -0.05], [0, 0.04, 0.08], [s * 0.55, 0.08, 0.12], [s * 0.55, 0.08, 0.0]); g.mat('tex.plastic', 0xe8c040); g.box(0, 0.02, -0.22, 0.02, 0.02, 0.06); },
  'ani.crow': (g) => { g.mat('tex.fabric_cloth', 0x18181c); g.lathe([[0.001, -0.15], [0.06, -0.08], [0.07, 0.06], [0.001, 0.18]], 8); for (const s of [-1, 1]) g.quad([0, 0.03, -0.04], [0, 0.03, 0.07], [s * 0.42, 0.05, 0.1], [s * 0.42, 0.05, 0.0]); g.box(0, 0.0, -0.19, 0.02, 0.02, 0.05); },
  'ani.songbird': (g) => { g.mat('tex.fabric_cloth', 0x8a6a40); g.lathe([[0.001, -0.07], [0.035, -0.03], [0.04, 0.03], [0.001, 0.08]], 6); },
  'ani.deer': (g) => {
    g.mat('tex.fabric_cloth', 0x8a6040);
    g.push().translate(0, 1.0, 0).rotX(Math.PI / 2); g.push().scale(1, 1, 1.1); g.lathe([[0.001, -0.62], [0.18, -0.5], [0.24, -0.1], [0.22, 0.35], [0.16, 0.55], [0.001, 0.62]], 10); g.pop(); g.pop();
    g.beam([0, 1.15, -0.55], [0, 1.55, -0.75], 0.14); g.push().translate(0, 1.55, -0.82).rotX(-0.3); g.lathe([[0.001, -0.15], [0.08, -0.1], [0.07, 0.1], [0.03, 0.16]], 8); g.pop();
    for (const [x, z] of [[-0.12, -0.45], [0.12, -0.45], [-0.12, 0.45], [0.12, 0.45]]) g.tube([x, 0.95, z], [x, 0.0, z + 0.05], 0.045, 0.03, 5);
    g.mat('tex.fabric_cloth', 0xe8e0d0); g.box(0, 1.05, 0.62, 0.1, 0.12, 0.05);
  },
  'ani.rabbit': (g) => { g.mat('tex.fabric_cloth', 0x9a8a70); g.push().scale(1, 0.9, 1.4); g.lathe([[0.001, 0], [0.08, 0.04], [0.09, 0.12], [0.001, 0.2]], 8); g.pop(); g.box(0, 0.22, -0.12, 0.08, 0.08, 0.08); for (const s of [-1, 1]) g.box(s * 0.02, 0.32, -0.1, 0.02, 0.12, 0.03); },
  'ani.fish': (g) => { g.mat('tex.metal_aluminium', 0x8a9a7a); g.push().rotX(Math.PI / 2); g.push().scale(0.5, 1, 1); g.lathe([[0.001, -0.2], [0.05, -0.1], [0.05, 0.08], [0.001, 0.16]], 6); g.pop(); g.pop(); g.quad([0, -0.04, 0.16], [0, 0.04, 0.16], [0, 0.08, 0.24], [0, -0.08, 0.24]); },
  'ani.butterfly': (g) => { g.mat('tex.flat', 0xe8a020); for (const s of [-1, 1]) g.quad([0, 0, -0.03], [0, 0, 0.03], [s * 0.05, 0.01, 0.04], [s * 0.05, 0.01, -0.04]); },
  'ani.firefly': (g) => { g.mat('tex.flat', 0xc8ff60); g.emit(255); g.box(0, 0, 0, 0.02, 0.02, 0.03); g.emit(0); },
};
for (const id in ANI) Builders.register(id, () => { const g = new GB(512); g.groundAO = false; ANI[id](g); return out({ 'mat.world_ds': g }); }, { stage: 3 });
