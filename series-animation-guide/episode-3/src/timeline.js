// Single source of truth for episode 3: scene bounds, counter maths, tags, narration, roasts, voiced moments, (sfx cues are added by scenes).
// Times in seconds on the 0.4 s beat grid (150 BPM). Pure data + pure functions: used by the page AND by the audio build.
export const FPS = 30, DUR = 90, FRAMES = 2700;
export const TITLE = 'WHAT IF EVERY 2 SECONDS, TWICE AS MANY PEOPLE LOVED YOU?';
export const SCENES = [
  { id: 's1', name: 'Garden BBQ', t0: 0, t1: 9.6 }, { id: 's2', name: 'The street', t0: 9.6, t1: 20.8 }, { id: 's3', name: 'Talent show', t0: 20.8, t1: 32.0 },
  { id: 's4', name: 'State + lab', t0: 32.0, t1: 44.8 }, { id: 's5', name: 'Cloud Nine', t0: 44.8, t1: 57.6 }, { id: 's6', name: 'Around the world', t0: 57.6, t1: 75.2 },
  { id: 's7', name: 'Final hug', t0: 75.2, t1: 90.0 },
];
export const sceneAt = (t) => SCENES.find((s) => t < s.t1) ?? SCENES[SCENES.length - 1];

// ---- counter: value(t) = 1 * 2^floor(t/2), exact (BigInt) ----
export const exp2 = (t) => Math.floor(Math.max(0, t) / 2 + 1e-9);
export const counterBig = (t) => 1n << BigInt(exp2(t));
export const fmt = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const counterText = (t) => fmt(counterBig(t));
export const unitText = (t) => (exp2(t) === 0 ? 'PERSON LOVES YOU' : 'PEOPLE LOVE YOU');
export const lastTick = (t) => Math.floor(Math.max(0, t) / 2 + 1e-9) * 2;             // time of the latest doubling
export const tickAge = (t) => t - lastTick(t);
export const TIERS = { 10: 1, 20: 1, 32: 1, 40: 2, 60: 3, 66: 4, 74: 3, 80: 4 };      // doubling times that get bigger hits (value = strength)
export const TAGS = [
  [0, 'JUST GRANDMA'], [4, 'A FAMILY'], [8, 'A BBQ PARTY'], [10, '≈ A BLOCK PARTY'], [14, '≈ A STREET'], [20, '≈ A VILLAGE'], [24, '≈ A THEATRE'], [28, '≈ AN ARENA'], [32, '≈ A STADIUM'],
  [34, '≈ A SMALL CITY'], [38, '≈ A BIG CITY'], [40, 'ONE MILLION'], [44, '≈ A STATE'], [48, '≈ A COUNTRY'], [52, '≈ A BIG COUNTRY'], [54, 'CLOUD NINE'], [60, 'ONE BILLION'],
  [64, '≈ HALF THE WORLD'], [66, 'EVERYONE ON EARTH'], [68, '≈ 2 EARTHS'], [70, '≈ 4 EARTHS'], [72, '≈ 8 EARTHS'], [74, 'MORE THAN EVERYONE WHO EVER LIVED'], [76, '≈ ALL STARS IN THE MILKY WAY'],
  [80, 'ONE TRILLION'], [84, 'MORE THAN ALL THE TREES ON EARTH'], [88, '≈ 2,100 EARTHS'],
];
export const tagAt = (t) => { let r = ''; for (const [s, x] of TAGS) if (t >= s) r = x; return r; };

// ---- narration (Piper ryan) and Gerald roasts. key: words shown yellow ----
export const NARRATION = [
  { id: 'n1', t: 0.1, text: 'What if every two seconds, twice as many people loved you?', key: ['TWICE AS MANY PEOPLE', 'LOVED YOU'] },
  { id: 'n2', t: 15.6, text: 'Unfortunately, the neighbours were now emotionally invested.', key: ['EMOTIONALLY INVESTED'] },
  { id: 'n3', t: 41.2, text: 'At this point, the scientists were starting to have questions.', key: ['SCIENTISTS', 'QUESTIONS'] },
  { id: 'n4', t: 53.2, text: 'Personal space was apparently no longer available.', key: ['NO LONGER AVAILABLE'] },
  { id: 'n5', t: 71.6, text: 'He had officially run out of living people.', key: ['LIVING PEOPLE'] },
];
export const ROASTS = [
  { id: 'r1', t: 4.4, text: 'Gerald remained unconvinced.', key: ['UNCONVINCED'] },
  { id: 'r2', t: 10.4, text: 'Gerald had seen better.', key: ['BETTER'] },
  { id: 'r3', t: 24.4, text: 'Gerald gave it a four.', key: ['FOUR'] },
  { id: 'r4', t: 35.2, text: 'Gerald did not register.', key: ['REGISTER'] },
  { id: 'r5', t: 46.0, text: 'Gerald was not up for it.', key: ['NOT UP'] },
  { id: 'r6', t: 62.4, text: 'Gerald had no comment.', key: ['NO COMMENT'] },
  { id: 'r7', t: 86.6, text: 'Still no.', key: ['NO'] },
];
// ---- the 14 voiced catchphrase moments (+ slow-mo scream layer at 84.4) ----
export const VOICES = [
  { id: 'dad_shout', t: 7.6, who: 'dad', cap: 'BOMBOCLAT!' }, { id: 'kid_high', t: 8.8, who: 'kid', cap: 'BOMBO!' }, { id: 'grandma_confused', t: 13.6, who: 'grandma', cap: 'BOMBO?' },
  { id: 'hero_excited', t: 19.2, who: 'hero', cap: 'BOMBO!' }, { id: 'judge_disbelief', t: 29.2, who: 'judge', cap: 'BOMBOCLAT?!' }, { id: 'crowd_audience', t: 30.8, who: 'audience', cap: 'BOMBOCLAT!' },
  { id: 'labassistant', t: 40.0, who: 'assistant', cap: 'BOMBOCLAT!' }, { id: 'chief_mono', t: 44.4, who: 'chief', cap: 'Bombo.' }, { id: 'balloonist_flat', t: 51.2, who: 'balloonist', cap: 'Bombo.' },
  { id: 'washer_shout', t: 59.6, who: 'washer', cap: 'BOMBOCLAT!' }, { id: 'plazas_unison', t: 70.0, who: 'plazas', cap: 'BOMBO!!' }, { id: 'ghost_echo', t: 74.4, who: 'ghost', cap: 'bombo…' },
  { id: 'crowd_world', t: 84.4, who: 'cast', cap: 'BOMBOCLAT!' }, { id: 'hero_casual', t: 88.0, who: 'hero', cap: 'Bombo.' },
];
export const SLOWMO_SCREAM = { id: 'slowmo_scream', t: 84.4 };
// special beats (seconds)
export const BEATS = { silenceStart: 77.6, slam: 80.0, roomSilence: 87.6, freeze: 88.8, title: 88.8 };
