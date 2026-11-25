// Single source of truth for episode 6 ("What if you got 2x taller every 2 seconds?", V4 Mom twist). Film clock = story clock (no EDL).
// Pure data + pure functions: used by the page AND the audio build (audio/*.py parse this file).
export const FPS = 30, DUR = 70.0, FRAMES = 2100;
export const TITLE = 'WHAT IF YOU GOT 2× TALLER EVERY 2 SECONDS?';

// ---- parts (one scene module each)
export const PARTS = [
  { id: 'hook', name: 'Hook: Mom is already angry', t0: 0, t1: 3.0 },
  { id: 'build', name: 'Build: the world gets smaller', t0: 3.0, t1: 26.0 },
  { id: 'space', name: 'Chaos: he breaks the rules', t0: 26.0, t1: 45.6 },
  { id: 'twist', name: 'Twist: the real final boss', t0: 45.6, t1: 62.6 },
  { id: 'home', name: 'Landing and exit', t0: 62.6, t1: 70.0 },
];
export const partAt = (t) => PARTS.find((p) => t < p.t1) ?? PARTS[PARTS.length - 1];

// ---- shots (film s). Build shots straddle a counter tick: the growth pop + pull-back happens mid-shot.
export const SHOTS = [
  { id: 'bedroom', t0: 0.0, t1: 3.0 },
  { id: 'lady', t0: 3.0, t1: 7.1 }, { id: 'liberty', t0: 7.1, t1: 8.4 }, { id: 'eiffel', t0: 8.4, t1: 10.0 }, { id: 'bigben', t0: 10.0, t1: 11.8 },
  { id: 'empire', t0: 11.8, t1: 13.6 }, { id: 'burj', t0: 13.6, t1: 16.4 }, { id: 'mountains', t0: 16.4, t1: 18.4 }, { id: 'clouds', t0: 18.4, t1: 20.8 },
  { id: 'gerald1', t0: 20.8, t1: 22.4 }, { id: 'everest', t0: 22.4, t1: 24.2 }, { id: 'atmos', t0: 24.2, t1: 26.0 },
  { id: 'nasa', t0: 26.0, t1: 28.0 }, { id: 'global', t0: 28.0, t1: 30.4 }, { id: 'seeall', t0: 30.4, t1: 32.4 }, { id: 'moon', t0: 32.4, t1: 35.4 },
  { id: 'marble', t0: 35.4, t1: 38.2 }, { id: 'toss', t0: 38.2, t1: 40.6 }, { id: 'ow', t0: 40.6, t1: 42.4 }, { id: 'walk', t0: 42.4, t1: 45.6 },
  { id: 'momlook', t0: 45.6, t1: 47.8 }, { id: 'impact', t0: 47.8, t1: 48.4 }, { id: 'reveal', t0: 48.4, t1: 52.0 }, { id: 'gerald2', t0: 52.0, t1: 53.0 },
  { id: 'push', t0: 53.0, t1: 55.0 }, { id: 'fly', t0: 55.0, t1: 57.8 }, { id: 'jump', t0: 57.8, t1: 59.4 }, { id: 'cats', t0: 59.4, t1: 60.2 },
  { id: 'hammer', t0: 60.2, t1: 62.6 }, { id: 'landing', t0: 62.6, t1: 65.0 }, { id: 'peace', t0: 65.0, t1: 67.0 }, { id: 'title', t0: 67.0, t1: 70.0 },
];
export const shotAt = (t) => { let s = SHOTS[0]; for (const x of SHOTS) if (t >= x.t0 - 1e-6) s = x; return s; };
export const shotById = (id) => SHOTS.find((s) => s.id === id);

// ---- counter: HEIGHT = 14.4 m x 2^floor(t/2) (user: every 2 seconds). Glitch styling from 26.0 (NASA), ERROR from 35.6 ("rules"), hidden from 42.4.
export const H0 = 14.4, GLITCH = 26.0, BREAK = 35.6, HUD_OFF = 42.4;
export const nAt = (t) => Math.floor(Math.max(0, t) / 2 + 1e-9);
export const heightM = (t) => H0 * Math.pow(2, nAt(t));
export function fmtHeight(m) {
  if (m < 1000) return { value: (Math.round(m * 10) / 10).toFixed(1), unit: 'M' };
  const km = m / 1000;
  if (km < 100) return { value: (Math.round(km * 10) / 10).toFixed(1), unit: 'KM' };
  return { value: Math.round(km).toLocaleString('en-US'), unit: 'KM' };
}
export function shown(t) {
  if (t >= BREAK) return { value: 'ERROR', unit: '', broken: 2 };
  return { ...fmtHeight(heightM(t)), broken: t >= GLITCH ? 1 : 0 };
}
export const lastTick = (t) => nAt(t) * 2;
export const tickAge = (t) => t - lastTick(t);
// the visual size of the hero follows the counter, with a 0.3 s eased pop on each tick
export const growK = (t) => { const a = tickAge(t), n = nAt(t); const pop = a < 0.3 ? 1 - Math.pow(1 - a / 0.3, 3) : 1; return Math.pow(2, n - 1 + pop); };

// ---- speech. kind: kokoro (character dialogue), lapeace (assets/la_peace.mp3 performance), narr (Piper narrator)
// who: mom | boy | reporter | lady | pilot | nasa | moon. cap = caption (yellow, one at a time). Each line is on screen with its speaker.
export const LINES = [
  { id: 'mom1', t: 0.05, kind: 'kokoro', who: 'mom', text: 'Get down here right now!', cap: 'GET DOWN HERE RIGHT NOW!', max: 1.35 },
  { id: 'what', t: 1.45, kind: 'kokoro', who: 'boy', text: 'What?', cap: 'WHAT?', max: 0.5 },
  { id: 'n1', t: 1.95, kind: 'narr', text: 'He gets twice as tall every two seconds. His mom is not having it.', key: ['TWICE', 'TALL', 'NOT', 'HAVING'], max: 3.75 },
  { id: 'lady', t: 5.95, kind: 'lapeace', who: 'lady', cap: 'LA PEACE!' },
  { id: 'oops', t: 7.6, kind: 'kokoro', who: 'boy', text: 'Oops.', cap: 'OOPS.', max: 0.6 },
  { id: 'ah', t: 10.6, kind: 'kokoro', who: 'boy', text: '/ˈɑː!', cap: 'AH!', max: 0.5 },
  { id: 'pilot', t: 12.3, kind: 'lapeace', who: 'pilot', cap: 'LA PEACE!' },
  { id: 'reporter', t: 13.8, kind: 'kokoro', who: 'reporter', text: 'We can confirm that this man is still growing.', cap: null, max: 2.4 },
  { id: 'yougood', t: 17.0, kind: 'kokoro', who: 'boy', text: 'You good?', cap: 'YOU GOOD?', max: 0.8 },
  { id: 'n2', t: 18.6, kind: 'narr', text: 'At this point, he was becoming a serious problem.', key: ['SERIOUS', 'PROBLEM'], max: 2.6 },
  { id: 'nasa', t: 26.6, kind: 'lapeace', who: 'nasa', cap: 'LA PEACE!' },
  { id: 'n3', t: 28.1, kind: 'narr', text: 'He had officially become a global problem.', key: ['GLOBAL', 'PROBLEM'], max: 2.2 },
  { id: 'seeall', t: 30.6, kind: 'kokoro', who: 'boy', text: 'I can see everything!', cap: 'I CAN SEE EVERYTHING!', max: 1.4 },
  { id: 'moon', t: 33.3, kind: 'moon', who: 'moon', text: 'please stop.', cap: 'LA PEACE… PLEASE STOP.', max: 2.1 },
  { id: 'n4', t: 35.45, kind: 'narr', text: 'Then he stopped following the rules.', key: ['RULES'], max: 2.4 },
  { id: 'cool', t: 38.6, kind: 'kokoro', who: 'boy', text: 'This is actually pretty cool.', cap: 'THIS IS ACTUALLY PRETTY COOL.', max: 1.6 },
  { id: 'ow', t: 41.3, kind: 'kokoro', who: 'boy', text: '/ˈaʊ!', cap: 'OW.', max: 0.5 },
  { id: 'mom2', t: 45.75, kind: 'kokoro', who: 'mom', text: 'You are not breaking another thing in this house.', cap: 'YOU ARE NOT BREAKING ANOTHER THING IN THIS HOUSE.', max: 1.95 },
  { id: 'whatt', t: 55.2, kind: 'kokoro', who: 'boy', text: 'What?!', cap: 'WHAT?!', max: 0.6 },
  { id: 'dinner', t: 56.15, kind: 'kokoro', who: 'mom', text: "I said dinner's ready!", cap: "I SAID DINNER'S READY!", max: 1.5, echo: true },
  { id: 'veg', t: 60.9, kind: 'kokoro', who: 'mom', text: "And don't forget your vegetables!", cap: "AND DON'T FORGET YOUR VEGETABLES!", max: 1.6 },
  { id: 'peace', t: 65.2, kind: 'lapeace', who: 'boy', cap: 'LA PEACE…', soft: true },
  { id: 'eat', t: 66.25, kind: 'kokoro', who: 'mom', text: 'Eat your dinner.', cap: 'EAT YOUR DINNER.', max: 0.75 },
  { id: 'outro', t: 67.25, kind: 'narr', text: 'Share this with someone whose mom always wins.', key: ['MOM', 'ALWAYS', 'WINS'], max: 2.6 },
];
export const NARRATION = LINES.filter((l) => l.kind === 'narr');
export const VOICES = LINES.filter((l) => l.kind !== 'narr');

// ---- key beats
export const BEATS = {
  tile: 2.2,            // ceiling tile hits Mom
  waitFor: [42.8, 45.4], // WAIT FOR IT
  land: 47.8,           // the foot lands (dust, shake)
  drop: 48.4,           // the phonk beat drop = Mom holding the foot (THE payoff)
  launch: 53.9,         // Mom pushes: the foot launches
  punch: 58.8, throw: 61.0, crash: 62.85, eyeOpen: 64.6, freeze: 67.0, title: 67.0,
};
// ---- music (film s): Charlie's Inferno from frame 0; X-COOL phonk (assets/x_cool_phonk_slowed.mp3) enters 20 s before the drop at asset 2.78 s
// so its drop (asset 22.78 s) lands on BEATS.drop; slow fade-in 28.4 -> 48.4, Charlie crossfades out 38.0 -> 45.2.
export const MUSIC = { phonkIn: 28.4, phonkAsset0: 2.78, phonkDropAsset: 22.78, charlieOut: [38.0, 45.2], drop: 48.4, titleFade: 67.0 };
