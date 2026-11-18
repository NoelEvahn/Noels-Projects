// World-city billboard plaza. city: tokyo|nyc|london|dubai|rio|sydney. Billboard faces +Z; camera looks from +Z toward -Z.
import * as THREE from 'three';
import { mat, add, box, rng, C } from '../util.js';
import { billboard, skyline, landmark } from '../props/world.js';
import { audience } from '../props/stage.js';

const CITIES = {
  tokyo: { sky: ['#1b2a6a', '#ff9acb'], pal: [0x3a2a5a, 0x4a3a6a, 0x5a4a7a], lm: 'tokyo', ground: 0x2a2a38, label: 'TOKYO' },
  nyc: { sky: ['#7fb8f0', '#ffe6c0'], pal: [0x8a7a6a, 0x6a5a4a, 0x9a8a7a], lm: 'empire', ground: 0x4a4a52, label: 'NEW YORK' },
  london: { sky: ['#9fb0c4', '#e8e4dc'], pal: [0x8a6a5a, 0x7a5a4a, 0x9a7a6a], lm: 'bigben', ground: 0x5a5a60, label: 'LONDON' },
  dubai: { sky: ['#f0c070', '#fff0c8'], pal: [0x9ab4d0, 0x7a9ac0, 0xb0c8e0], lm: 'burj', ground: 0xc8b490, label: 'DUBAI' },
  rio: { sky: ['#2f9ef0', '#c8f0ff'], pal: [0xd8a060, 0xc88050, 0xe8c080], lm: 'christ', ground: 0xd8c898, label: 'RIO' },
  sydney: { sky: ['#4aa8f0', '#e0f4ff'], pal: [0x7a9ac0, 0x9ab4d0, 0x6a88b0], lm: 'sydney', ground: 0xd9d2c4, label: 'SYDNEY' },
};
export const PLAZA_CITIES = Object.keys(CITIES);
export function plazaStage(city) { const c = CITIES[city]; return { sky: c.sky, ground: c.ground, groundR: 80, fog: [c.sky[1], 50, 180], shadow: { extent: 16 }, keyPos: [-4, 12, 10] }; }
export function buildPlaza(city = 'nyc', { seed = 1, crowd = 90, counter = '♥ 8,589,934,592' } = {}) {
  const c = CITIES[city], r = rng(seed), g = new THREE.Group();
  const sky = skyline({ n: 16, spread: 70, hmin: 8, hmax: 26, seed, palette: c.pal }); sky.position.set(0, 0, -22); g.add(sky);
  const lm = landmark(c.lm); lm.position.set(city === 'dubai' ? 11 : -9.5, 0, -15); lm.scale.setScalar(city === 'sydney' ? 1.1 : city === 'christ' ? 1 : 0.95); g.add(lm);
  const bb = billboard(7, 3.9, { label: 'THAT GUY', counter }); bb.position.set(0, 7.4, -10); g.add(bb);
  add(g, box(14, 0.12, 12), mat(0x707080, { rough: 0.9 }), [0, 0.06, 0]);
  const pos = []; for (let i = 0; i < crowd; i++) pos.push([r.range(-6, 6), 0, r.range(-4, 5)]);
  const aud = audience(pos, { seed, fill: 1 }); g.add(aud);
  return { group: g, crowd: aud, billboard: bb, landmark: lm, update: (t, cheer = 0) => aud.update(t, cheer) };
}
