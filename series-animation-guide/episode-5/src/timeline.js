// Single source of truth for episode 5 ("What if every 2 seconds, you jumped 5x higher?").
// Story clock T: 0 -> 95.2 s. Film clock = story + 1.6 s (H1 hook: flash-forward + rewind). Pure data + pure functions: used by the page AND the audio build.
export const FPS = 30, FILM_DUR = 96.8, FRAMES = 2904, STORY_DUR = 95.2, HOOK = 1.6;
export const DUR = FILM_DUR;
export const TITLE = 'WHAT IF YOU JUMPED 5× HIGHER EVERY 2 SECONDS?';

// ---- the edit (film -> story). [film0, film1, story0, story1, kind]
export const EDL = [
  [0.0, 1.2, 79.8, 81.0, 'hook'],     // flash-forward: the dunk
  [1.2, 1.6, 81.0, 0.0, 'rewind'],    // the whole story runs backwards in 0.4 s
  [1.6, 96.8, 0.0, 95.2, 'story'],
];
export function edit(f) {
  let e = EDL[0]; for (const x of EDL) if (f >= x[0] - 1e-9) e = x;
  const u = Math.min(1, Math.max(0, (f - e[0]) / (e[1] - e[0])));
  const k = e[4] === 'rewind' ? 1 - Math.pow(1 - u, 1.6) : u;    // rewind decelerates into story 0
  return { s: e[2] + (e[3] - e[2]) * k, u, kind: e[4] };
}

// ---- parts (story time)
export const PARTS = [
  { id: 'p1', name: 'Home', t0: 0, t1: 10.0 }, { id: 'p2', name: 'Tower and sky', t0: 10.0, t1: 21.2 }, { id: 'p3', name: 'Moon and Sun', t0: 21.2, t1: 39.2 },
  { id: 'p4', name: 'Voyager and beyond', t0: 39.2, t1: 53.2 }, { id: 'p5', name: 'Stars and galaxy', t0: 53.2, t1: 60.4 }, { id: 'p6', name: 'The break', t0: 60.4, t1: 68.4 },
  { id: 'p7', name: 'Outside the universe', t0: 68.4, t1: 82.8 }, { id: 'p8', name: 'Home', t0: 82.8, t1: 95.2 },
];
export const partAt = (t) => PARTS.find((p) => t < p.t1) ?? PARTS[PARTS.length - 1];
// the 40 shots (cut list on the 0.4 s grid), BRIEF §5
export const SHOTS = [0, 2, 4, 6, 8, 10, 12.8, 14.8, 18, 21.2, 23.6, 26, 29.2, 32, 34.4, 36, 39.2, 41.2, 43.6, 45.6, 48, 50.4, 53.2, 55.6, 58, 60.4, 62.8, 65.2, 68.4, 70.8, 73.6, 76, 79.2, 81.2, 82.8, 85.2, 87.6, 89.2, 91.6];
export const shotAt = (t) => { let i = 0; for (let k = 0; k < SHOTS.length; k++) if (t >= SHOTS[k] - 1e-6) i = k; return { n: i + 1, t0: SHOTS[i], t1: SHOTS[i + 1] ?? STORY_DUR }; };

// ---- counter: height = 5^n m, n = floor(T/2), exact BigInt; breaks at 62.0
export const BREAK = 62.0, NOTFOUND = 68.4;
export const nAt = (t) => Math.min(30, Math.floor(Math.max(0, t) / 2 + 1e-9));
export const heightBig = (t) => 5n ** BigInt(nAt(t));
export const fmt = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const LY = 9460730472580800n;   // metres per light-year (IAU)
function dec(num, den, digits) { const s = 10n ** BigInt(digits); const v = (num * s * 10n / den + 5n) / 10n; const ip = v / s, fp = (v % s).toString().padStart(digits, '0'); return fmt(ip) + (digits ? '.' + fp : ''); }
// {value, unit}: m < 10 km, km < 1 million km, million/billion/trillion km, then light-years (BRIEF §3)
export function shownBig(h) {
  const km = h / 1000n;
  if (h < 10000n) return { value: fmt(h), unit: 'M' };
  if (h < 1000000n) return { value: dec(h, 1000n, 1), unit: 'KM' };
  if (km < 1000000n) return { value: fmt((h + 500n) / 1000n), unit: 'KM' };
  if (h >= LY) { const ly = h * 1000n / LY; return { value: dec(h, LY, ly >= 1000000n ? 0 : ly >= 100000n ? 1 : ly >= 10000n ? 1 : 2).replace(/\.0$/, ''), unit: 'LIGHT-YEARS' }; }
  if (km < 1000000000n) return { value: dec(h, 1000000000n, km < 10000000n ? 2 : km < 100000000n ? 2 : 1), unit: 'MILLION KM' };
  if (km < 1000000000000n) return { value: dec(h, 1000000000000n, km < 100000000000n ? 2 : 0), unit: 'BILLION KM' };
  return { value: dec(h, 1000000000000000n, 2), unit: 'TRILLION KM' };
}
// the brief's exact display strings (checked against shownBig in tools/check_timeline.mjs)
export const SHOWN = ['1 M', '5 M', '25 M', '125 M', '625 M', '3,125 M', '15.6 KM', '78.1 KM', '390.6 KM', '1,953 KM', '9,766 KM', '48,828 KM', '244,141 KM', '1.22 MILLION KM', '6.10 MILLION KM', '30.52 MILLION KM',
  '152.6 MILLION KM', '762.9 MILLION KM', '3.81 BILLION KM', '19.07 BILLION KM', '95.37 BILLION KM', '477 BILLION KM', '2.38 TRILLION KM', '1.26 LIGHT-YEARS', '6.30 LIGHT-YEARS', '31.5 LIGHT-YEARS',
  '157.5 LIGHT-YEARS', '787.5 LIGHT-YEARS', '3,938 LIGHT-YEARS', '19,688 LIGHT-YEARS', '98,441 LIGHT-YEARS'];
export function shown(t) {
  if (t >= NOTFOUND) return { value: 'NOT FOUND', unit: 'HEIGHT', broken: 2 };
  if (t >= BREAK) return { value: 'ERROR', unit: 'HEIGHT', broken: 1 };
  const s = SHOWN[nAt(t)], i = s.lastIndexOf(' ') > 0 && /[A-Z]$/.test(s) ? s.search(/ [A-Z]/) : -1;
  return { value: s.slice(0, i), unit: s.slice(i + 1), broken: 0 };
}
export const lastTick = (t) => Math.floor(Math.max(0, t) / 2 + 1e-9) * 2;
export const tickAge = (t) => t - lastTick(t);
export const TIERS = { 12: 1, 16: 2, 26: 1, 32: 1, 40: 2, 46: 3, 56: 1, 60: 2 };   // ticks that cross a unit or a landmark get bigger hits
export const TAGS = ['A HOP', 'THROUGH THE CEILING', 'THROUGH THE ROOF', 'ABOVE THE TREES', 'ALMOST THE BURJ KHALIFA', '3.8× THE BURJ KHALIFA', 'ABOVE MOUNT EVEREST', 'ALMOST SPACE', 'IN SPACE', 'PAST THE ISS',
  '¾ OF EARTH’S WIDTH', 'PAST THE SATELLITES', 'ALMOST THE MOON', 'PAST THE MOON', '16× EARTH TO MOON', '20% OF THE WAY TO THE SUN', '1 AU = EARTH TO SUN', 'ALMOST JUPITER', 'PAST SATURN AND URANUS',
  'PAST NEPTUNE AND PLUTO', 'PAST VOYAGER 1', 'IN THE OORT CLOUD', '0.25 LIGHT-YEARS', '30% OF THE WAY TO PROXIMA', 'PAST PROXIMA CENTAURI', '31.5 LIGHT-YEARS', '157.5 LIGHT-YEARS', '787.5 LIGHT-YEARS',
  'PAST THE ORION NEBULA', 'THE MILKY WAY BELOW', 'ACROSS THE MILKY WAY'];
// deviation: n=23 tag was "OUT OF THE SOLAR SYSTEM"; 1.26 ly is still inside the outer Oort cloud (to ~1.6-3 ly), so it now reads "30% OF THE WAY TO PROXIMA" (4.24 ly)
export const tagAt = (t) => (t >= NOTFOUND ? '' : t >= BREAK ? 'THE NUMBER BROKE' : TAGS[nAt(t)]);
// the x5 badge at 62.0 -> x∞ (62.4) -> ERROR (62.8)
export const badgeAt = (t) => (t >= 62.0 && t < 62.4 ? '×5' : t >= 62.4 && t < 62.8 ? '×∞' : t >= 62.8 && t < 64.0 ? 'ERROR' : null);

// ---- narration (Piper ryan) + Gerald roasts. key: words shown yellow
export const NARRATION = [
  { id: 'n1', t: 0.1, text: 'What if every two seconds, you jumped five times higher?', key: ['FIVE TIMES HIGHER'] },
  { id: 'n2', t: 15.6, text: 'At this point, he was technically in space.', key: ['TECHNICALLY', 'SPACE'] },
  { id: 'n3', t: 41.6, text: 'Voyager 1 took almost fifty years to get here. He took forty seconds.', key: ['FIFTY YEARS', 'FORTY SECONDS'] },
  { id: 'n4', t: 53.2, text: 'Nobody had told physics about this.', key: ['PHYSICS'] },
  { id: 'n5', t: 60.4, text: 'Then, he stopped following the rules.', key: ['RULES'] },
  { id: 'outro', t: 91.6, text: 'Share this with someone who always aims too high.', key: ['ALWAYS', 'AIMS', 'TOO', 'HIGH'] },
];
export const ROASTS = [
  { id: 'r1', t: 4.4, text: 'Gerald was already on the roof.', key: ['ALREADY'] },
  { id: 'r2', t: 11.6, text: 'Gerald was higher.', key: ['HIGHER'] },
  { id: 'r3', t: 19.6, text: 'Gerald stowed away.', key: ['STOWED'] },
  { id: 'r4', t: 27.6, text: 'Gerald stayed on the Moon.', key: ['STAYED'] },
  { id: 'r5', t: 36.8, text: 'Gerald had been to Saturn.', key: ['SATURN'] },
  { id: 'r6', t: 58.4, text: 'Gerald had dressed for the occasion.', key: ['DRESSED'] },
  // r7 (Gerald pushes the universe off the table) removed: user note #18, 2026-11-20
];
// ---- the 14 "la peace" lines
export const VOICES = [
  { id: 'dad', t: 3.2, who: 'dad', cap: 'LA PEACE' }, { id: 'kid', t: 7.6, who: 'kid', cap: 'LA PEACE!' }, { id: 'tourist', t: 10.4, who: 'tourist', cap: 'LA PEACE!' },
  { id: 'pilot', t: 13.6, who: 'pilot', cap: 'LA PEACE.' }, { id: 'astro', t: 18.4, who: 'astronaut', cap: 'LA PEACE' }, { id: 'tech', t: 22.4, who: 'technician', cap: 'LA PEACE' },
  { id: 'moon', t: 26.4, who: 'moon astronaut', cap: 'LA… PEACE…' }, { id: 'voyager', t: 40.4, who: 'Voyager 1', cap: 'LA PEACE' }, { id: 'alien', t: 48.4, who: 'alien', cap: 'LA PEACE?' },
  { id: 'picnic', t: 56.8, who: 'alien family', cap: 'LA PEACE!' }, { id: 'hero_deep', t: 72.0, who: 'hero', cap: 'LA PEACE' }, { id: 'mum', t: 83.6, who: 'mum', cap: 'LA PEACE!!' },
  { id: 'family', t: 84.4, who: 'family', cap: 'LA PEACE!' }, { id: 'hero_final', t: 88.0, who: 'hero', cap: 'la peace.' },
];
export const BEATS = { musicCut: 62.0, launch: 62.8, silenceStart: 77.6, slam: 80.0, travelling: 78.0, roomSilence: 87.6, freeze: 91.6, title: 91.6, crossfade0: 60.4 };
// music edit (story time). Tiki Tiki phonk (168 BPM -> 150 BPM, tempo 0.892857) replaces Charlie's Inferno from the 60.4 cut (user request).
export const MUSIC = { charlieOut: [60.4, 62.0], tikiIn: [60.4, 62.0], cut: [62.0, 62.8], dropA: 62.8, silence: [77.6, 80.0], dropB: 80.0, room: [87.6, 88.8] };
