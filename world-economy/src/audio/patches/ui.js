// UI, money, job and build cues (Annex E 6.1). Non-spatial, bus ui.
import { burst, tone, chime, marimba, knock, sweep, fm, rnd, R } from './kit.js';

const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const UI = {
  'sfx.ui.click': (c, o, t) => Math.max(burst(c, o, t, { type: 'white', f: 4000, q: 0.7, d: 0.004, g: 0.5 }), tone(c, o, t, { f: 2400, a: 0.001, d: 0.04, g: 0.4 })),
  'sfx.ui.hover': (c, o, t) => tone(c, o, t, { f: 1800, a: 0.003, d: 0.05, g: 0.3 }),
  'sfx.ui.back': (c, o, t) => Math.max(fm(c, o, t, { f: 900, ratio: 1, index: 1.2, decay: 0.18, gain: 0.45 }), tone(c, o, t, { f: 900, f1: 600, a: 0.003, d: 0.2, g: 0.3 })),
  'sfx.ui.open': (c, o, t) => Math.max(tone(c, o, t, { f: 600, f1: 1100, a: 0.004, d: 0.2, g: 0.4, type: 'triangle' }), fm(c, o, t + 0.02, { f: 1100, ratio: 2, index: 0.8, decay: 0.15, gain: 0.2 })),
  'sfx.ui.close': (c, o, t) => Math.max(tone(c, o, t, { f: 1000, f1: 560, a: 0.004, d: 0.2, g: 0.4, type: 'triangle' }), fm(c, o, t, { f: 1000, ratio: 2, index: 0.8, decay: 0.12, gain: 0.2 })),
  'sfx.ui.toggle_on': (c, o, t) => Math.max(tone(c, o, t, { f: 880, d: 0.1, g: 0.35 }), tone(c, o, t + 0.07, { f: 1320, d: 0.14, g: 0.35 })),
  'sfx.ui.toggle_off': (c, o, t) => Math.max(tone(c, o, t, { f: 1320, d: 0.1, g: 0.35 }), tone(c, o, t + 0.07, { f: 880, d: 0.14, g: 0.35 })),
  'sfx.ui.error': (c, o, t) => Math.max(tone(c, o, t, { type: 'square', f: 150, lp: 1200, a: 0.004, hold: 0.09, d: 0.05, g: 0.3 }), tone(c, o, t, { type: 'square', f: 156, lp: 1200, a: 0.004, hold: 0.09, d: 0.05, g: 0.2 }),
    tone(c, o, t + 0.18, { type: 'square', f: 150, lp: 1200, a: 0.004, hold: 0.09, d: 0.05, g: 0.3 }), tone(c, o, t + 0.18, { type: 'square', f: 156, lp: 1200, a: 0.004, hold: 0.09, d: 0.05, g: 0.2 })),
  'sfx.ui.confirm': (c, o, t) => chime(c, o, t, [N(81), N(85)], { ratio: 2, index: 1.5, decay: 0.6, g: 0.35, step: 0.08 }),
  'sfx.ui.notify': (c, o, t) => Math.max(marimba(c, o, t, N(84), 0.45, 0.4), marimba(c, o, t + 0.13, N(88), 0.45, 0.5)),
  'sfx.ui.phone_open': (c, o, t, x) => Math.max(sweep(c, o, t, { pts: [[0, 500], [1, 3500]], dur: 0.25, g: 1.0, peakAt: 0.7, rng: rnd(x) }), burst(c, o, t + 0.24, { f: 3500, d: 0.01, g: 0.4 })),
  'sfx.ui.phone_close': (c, o, t, x) => Math.max(sweep(c, o, t, { pts: [[0, 3500], [1, 500]], dur: 0.25, g: 1.0, peakAt: 0.3, rng: rnd(x) }), burst(c, o, t + 0.24, { f: 2500, d: 0.01, g: 0.4 })),
  'sfx.ui.type': (c, o, t, x) => burst(c, o, t, { f: R(rnd(x), 2200, 3500), q: 2, d: 0.015, g: 1.9 }),
  'sfx.ui.map_ping': (c, o, t) => Math.max(tone(c, o, t, { f: 1500, d: 0.3, g: 0.35 }), tone(c, o, t + 0.18, { f: 1500, d: 0.3, g: 0.15 }), tone(c, o, t + 0.36, { f: 1500, d: 0.3, g: 0.06 })),
  'sfx.money.cash_register': (c, o, t, x) => Math.max(
    knock(c, o, t, [[150, 0.15, 0.4], [310, 0.12, 0.3], [520, 0.08, 0.2]], 0.6, 0.4, 1500),
    fm(c, o, t + 0.12, { f: 2600, ratio: 2.76, index: 0.7, decay: 0.9, gain: 0.25 }),
    sweep(c, o, t + 0.25, { type: 'white', pts: [[0, 1200], [1, 2500]], q: 2, dur: 0.35, g: 0.15, peakAt: 0.5, rng: rnd(x) })),
  'sfx.money.coins': (c, o, t, x) => { const r = rnd(x); let end = t; const n = 4 + Math.floor(r() * 5); for (let i = 0; i < n; i++) { const f = R(r, 2600, 5200); end = Math.max(end, knock(c, o, t + i * R(r, 0.04, 0.09), [[f, 0.25, 0.3], [f * 1.53, 0.18, 0.2], [f * 2.4, 0.1, 0.12]], 0.6, 0.2, 6000)); } return end; },
  'sfx.money.pay': (c, o, t) => Math.max(tone(c, o, t, { f: 1000, a: 0.005, hold: 0.08, d: 0.04, g: 0.35 }), tone(c, o, t + 0.13, { f: 1500, a: 0.005, hold: 0.1, d: 0.05, g: 0.35 })),
  'sfx.money.income_tick': (c, o, t) => chime(c, o, t, [N(91)], { ratio: 3, index: 0.8, decay: 0.35, g: 0.4 }),
  'sfx.money.big_purchase': (c, o, t) => Math.max(chime(c, o, t, [N(72), N(76), N(79), N(84)], { ratio: 3.5, index: 1, decay: 1.2, g: 0.18, step: 0.02 }), tone(c, o, t, { f: 90, f1: 50, a: 0.004, d: 0.4, g: 0.6 })),
  'sfx.level_up': (c, o, t) => chime(c, o, t, [N(72), N(76), N(79), N(84)], { ratio: 3.5, index: 1.4, decay: 0.8, g: 0.3, step: 0.11 }),
  'sfx.job.task_ok': (c, o, t) => chime(c, o, t, [N(79), N(84)], { ratio: 2, index: 1, decay: 0.5, g: 0.35, step: 0.09 }),
  'sfx.job.task_perfect': (c, o, t, x) => Math.max(chime(c, o, t, [N(79), N(84), N(88)], { ratio: 2, index: 1, decay: 0.6, g: 0.3, step: 0.08 }),
    burst(c, o, t + 0.25, { type: 'white', ftype: 'highpass', f: 6000, q: 0.7, d: 0.5, a: 0.05, g: 0.08, rng: rnd(x) })),
  'sfx.job.task_fail': (c, o, t) => Math.max(tone(c, o, t, { type: 'sawtooth', f: 180, f1: 120, lp: 900, a: 0.01, hold: 0.25, d: 0.15, g: 0.45 }), tone(c, o, t, { type: 'sawtooth', f: 186, f1: 124, lp: 900, a: 0.01, hold: 0.25, d: 0.15, g: 0.3 })),
  'sfx.job.shift_start': (c, o, t) => tone(c, o, t, { f: 1600, f1: 2100, a: 0.05, hold: 0.35, d: 0.3, g: 0.3 }),
  'sfx.job.shift_end': (c, o, t) => Math.max(knock(c, o, t, [[600, 0.1, 0.4], [1450, 0.07, 0.3], [2900, 0.05, 0.2]], 0.6, 0.5, 3000), knock(c, o, t + 0.12, [[300, 0.12, 0.4], [700, 0.08, 0.2]], 0.6, 0.2, 1500)),
  'sfx.build.place': (c, o, t) => knock(c, o, t, [[300, 0.12, 0.4], [700, 0.08, 0.3], [1500, 0.05, 0.15]], 0.7, 0.35, 2000),
  'sfx.build.remove': (c, o, t) => Math.max(knock(c, o, t, [[700, 0.05, 0.3]], 0.6, 0.2, 2000), knock(c, o, t + 0.08, [[300, 0.12, 0.4], [600, 0.08, 0.3]], 0.6, 0.3, 1500)),
  'sfx.build.invalid': (c, o, t) => knock(c, o, t, [[90, 0.2, 0.6], [140, 0.12, 0.3]], 0.8, 0.1, 400),
};
