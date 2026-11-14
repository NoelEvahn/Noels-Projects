// Music suites as data (Annex E 7.2). Pure data + theory helpers (Node-testable).
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10],
};
/** midi note of scale degree `deg` (0-based, may exceed 6 or be negative) above `root` */
export function degree(root, mode, deg) { const s = SCALES[mode], o = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7; return root + s[i] + 12 * o; }
/** chord tones (stacked diatonic thirds) of degree d: size 3 (triad), 4 (7th), 5 (9th) */
export function chord(root, mode, d, size = 3) { const out = []; for (let k = 0; k < size; k++) out.push(degree(root, mode, d + 2 * k)); return out; }
export function inScale(root, mode, midi) { return SCALES[mode].includes((((midi - root) % 12) + 12) % 12); }

// The 8-note main theme (scale degrees) introduced in mus.menu and quoted in other suites' A sections.
export const MOTIF = [4, 2, 3, 4, 7, 6, 4, 2];

// prog entries: [scale degree, chord size]; drums: 16 steps per bar for 4/4 (12 for 6/8) 'x' hit '.' rest; comp styles:
// 'pad' sustained, 'jazz' (comp on 1 and the and-of-2), 'strum', 'arp', 'harm' (sparse high plucks)
export const SUITES = {
  'mus.menu': { root: 62, mode: 'major', tempo: 84, steps: 16, prog: [[0, 3], [5, 3], [3, 3], [4, 3]], progB: [[5, 3], [3, 4], [0, 3], [4, 4]], comp: 'arp', compIns: 'piano', padIns: 'pad', bassIns: 'bass', leadIns: 'strings', extraIns: 'guitar', lead: 74, density: 0.55, drums: null },
  'mus.city.day': { root: 65, mode: 'major', tempo: 78, swing: 0.33, steps: 16, prog: [[1, 4], [4, 4], [0, 4], [0, 5]], progB: [[5, 4], [1, 4], [4, 5], [0, 4]], comp: 'jazz', compIns: 'ep', padIns: 'pad', bassIns: 'bass', leadIns: 'ep', lead: 77, density: 0.5, drums: { kick: 'x.........x.....', snare: '....x.......x...', brush: 'x.x.x.x.x.x.x.x.' } },
  'mus.city.night': { root: 62, mode: 'dorian', tempo: 64, steps: 16, prog: [[0, 4], [3, 4], [0, 4], [6, 3]], progB: [[3, 4], [4, 4], [0, 5], [0, 4]], comp: 'pad', compIns: 'pad', padIns: null, bassIns: 'bass', bassOct: -12, leadIns: 'ep', lead: 74, density: 0.3, drums: { rim: '....x.......x...', kick: 'x.......x.......' } },
  'mus.lake.day': { root: 67, mode: 'major', tempo: 92, steps: 12, prog: [[0, 3], [3, 3], [4, 3], [0, 3]], progB: [[5, 3], [3, 3], [1, 3], [4, 3]], comp: 'arp', compIns: 'guitar', padIns: 'pad', bassIns: 'bass', leadIns: 'flute', lead: 79, density: 0.4, drums: null },
  'mus.lake.night': { root: 64, mode: 'minor', tempo: 60, steps: 16, prog: [[0, 3], [5, 3], [3, 3], [6, 3]], progB: [[3, 3], [0, 3], [4, 3], [0, 3]], comp: 'harm', compIns: 'harmonic', padIns: 'pad', bassIns: 'bass', leadIns: 'harmonic', lead: 76, density: 0.3, drums: null },
  'mus.ocean.day': { root: 60, mode: 'major', tempo: 104, steps: 16, prog: [[0, 3], [4, 3], [5, 3], [3, 3]], progB: [[3, 3], [4, 3], [0, 3], [5, 3]], comp: 'strum', compIns: 'ukulele', padIns: null, bassIns: 'bass', leadIns: 'marimba', lead: 72, density: 0.55, drums: { shaker: 'x.x.x.x.x.x.x.x.', kick: 'x.......x.......' } },
  'mus.ocean.night': { root: 69, mode: 'minor', tempo: 66, steps: 16, prog: [[0, 3], [5, 3], [2, 3], [6, 3]], progB: [[3, 3], [5, 3], [0, 3], [4, 3]], comp: 'arp', compIns: 'marimba', padIns: 'pad', bassIns: 'bass', leadIns: 'bell', lead: 81, density: 0.3, drums: null },
  'mus.forest.day': { root: 62, mode: 'dorian', tempo: 70, steps: 16, prog: [[0, 3], [0, 3], [6, 3], [3, 3]], progB: [[3, 3], [4, 3], [0, 3], [6, 3]], comp: 'harm', compIns: 'guitar', padIns: 'pad', bassIns: 'bass', leadIns: 'flute', extraIns: 'bell', lead: 74, density: 0.35, drums: null },
  'mus.forest.night': { root: 60, mode: 'aeolian', tempo: 52, steps: 16, prog: [[0, 3], [5, 3], [3, 3], [4, 3]], progB: [[5, 3], [6, 3], [0, 3], [4, 3]], comp: 'pad', compIns: 'pad', padIns: null, bassIns: 'strings', bassOct: -12, leadIns: 'strings', extraIns: 'bell', lead: 67, density: 0.25, drums: null },
};
export const LAYERS = {
  'mus.layer.work': { tempoMul: 1.06, drums: { rim: '..x...x...x...x.', shaker: 'xxxxxxxxxxxxxxxx' }, ostinato: true },
  'mus.layer.drive': { tempoMul: 1.1, drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, ostinato: true, bright: true },
};
// stingers: [offsetBeats, scale degree, instrument, beats] over a suite key (C major unless noted)
export const STINGS = {
  'mus.sting.levelup': { root: 72, mode: 'major', tempo: 120, notes: [[0, 0, 'bell', 1], [0.5, 2, 'bell', 1], [1, 4, 'bell', 1], [1.5, 7, 'bell', 2], [1.5, 0, 'ep', 3], [1.5, 4, 'ep', 3]] },
  'mus.sting.business_open': { root: 67, mode: 'major', tempo: 110, notes: [[0, 0, 'ep', 1], [1, 4, 'ep', 1], [2, 7, 'strings', 4], [2, 2, 'strings', 4], [2, -7, 'bass', 4], [3, 9, 'bell', 2]] },
  'mus.sting.purchase_big': { root: 69, mode: 'major', tempo: 120, notes: [[0, 0, 'bell', 2], [0.25, 4, 'bell', 2], [0.5, 7, 'bell', 2], [0, -7, 'bass', 2], [0.5, 2, 'strings', 3]] },
  'mus.sting.newday': { root: 62, mode: 'major', tempo: 84, notes: MOTIF.map((d, i) => [i * 0.5, d, 'piano', 1]).concat([[0, 0, 'pad', 5], [0, -7, 'bass', 4]]) },
  'mus.sting.fail': { root: 57, mode: 'minor', tempo: 90, notes: [[0, 4, 'ep', 1], [1, 3, 'ep', 1], [2, 0, 'ep', 2], [2, -7, 'bass', 2]] },
  'mus.sting.milestone': { root: 65, mode: 'major', tempo: 100, notes: [[0, 0, 'strings', 4], [0, 4, 'strings', 4], [0, -7, 'bass', 4], [0, 7, 'bell', 2], [1, 9, 'bell', 2], [2, 11, 'bell', 2], [3, 14, 'bell', 3]] },
};
