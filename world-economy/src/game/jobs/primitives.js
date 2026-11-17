// Shared mechanic primitives (Annex C 1.3). Pure state machines driven by Input (down/pressed/axis); no DOM, no three.
// update(dt, inp, env) -> 'active' | 'done' | 'fail'. `score` 0..1. `hud()` is the widget descriptor, `hint()` is read by bots and the tutorial.
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const base = (type, extra) => Object.assign({ type, res: 'active', score: 0, t: 0, label: '' }, extra);

/** Timing bar: marker sweeps; press jump (Space) inside the green zone. */
export function timingBar({ rng, speed = 0.9, width = 0.26, timeout = 9 } = {}) {
  let m = rng.float(), dir = 1; const c = rng.range(0.3, 0.7);
  const s = base('timingBar', {
    update(dt, inp) {
      if (s.res !== 'active') return s.res;
      s.t += dt; m += dir * speed * dt; if (m > 1) { m = 1; dir = -1; } else if (m < 0) { m = 0; dir = 1; }
      if (inp.pressed('jump')) { const d = Math.abs(m - c); if (d <= width / 2) { s.score = 1 - 0.4 * d / (width / 2); s.res = 'done'; } else { s.score = 0; s.res = 'fail'; } }
      else if (s.t > timeout) s.res = 'fail';
      return s.res;
    },
    hud: () => ({ type: 'timingBar', pos: m, zone: [c - width / 2, c + width / 2] }),
    hint: () => ({ press: 'jump', when: Math.abs(m - c) < width * 0.22 }),
  });
  return s;
}
/** Hold ring: hold interact for `duration`; releasing early fails. */
export function holdRing({ duration = 1, timeout = 8 } = {}) {
  let p = 0, started = false;
  const s = base('holdRing', {
    update(dt, inp) {
      if (s.res !== 'active') return s.res;
      s.t += dt;
      if (inp.down('interact')) { started = true; p += dt / duration; if (p >= 1) { s.score = 1; s.res = 'done'; } }
      else if (started) { s.score = 0; s.res = 'fail'; }
      else if (s.t > timeout) s.res = 'fail';
      return s.res;
    },
    hud: () => ({ type: 'holdRing', progress: clamp(p, 0, 1) }),
    hint: () => ({ hold: 'interact' }),
  });
  return s;
}
/** Tension bar: keep a value inside a moving zone by holding/releasing jump while the opposing force varies. */
export function tensionBar({ rng, need = 3, timeout = 30, force = 1 } = {}) {
  let v = 0.5, inZone = 0, total = 0, high = 0, low = 0, ph = rng.range(0, 6.28), burst = 0, bt = 0;
  let zc = 0.5; const zw = 0.3;
  const s = base('tensionBar', {
    update(dt, inp) {
      if (s.res !== 'active') return s.res;
      s.t += dt; total += dt; ph += dt * 0.9; zc = 0.5 + 0.12 * Math.sin(ph);
      bt -= dt; if (bt <= 0) { burst = rng.range(-0.4, 0.6) * force; bt = rng.range(0.6, 1.6); }
      v += ((inp.down('jump') ? 0.9 : -0.8) + burst) * dt;
      v = clamp(v, 0, 1);
      if (Math.abs(v - zc) <= zw / 2) inZone += dt;
      high = v > 0.95 ? high + dt : 0; low = v < 0.05 ? low + dt : 0;
      if (high > 1.5 || low > 3) { s.score = 0; s.res = 'fail'; }
      else if (inZone >= need) { s.score = clamp(inZone / total, 0.3, 1); s.res = 'done'; }
      else if (s.t > timeout) s.res = 'fail';
      return s.res;
    },
    hud: () => ({ type: 'tensionBar', value: v, zone: [zc - zw / 2, zc + zw / 2], progress: clamp(inZone / need, 0, 1) }),
    hint: () => ({ hold: 'jump', when: v < zc }),
  });
  return s;
}
/** Sequence / sort lanes: press the shown actions in order. Wrong presses cost score. */
export function sequence({ rng, keys, n = 4, pool = ['forward', 'back', 'left', 'right'], timeout = 20, type = 'sequence' } = {}) {
  const seq = keys || Array.from({ length: n }, () => rng.pick(pool)); let i = 0, wrong = 0;
  const s = base(type, {
    update(dt, inp) {
      if (s.res !== 'active') return s.res;
      s.t += dt;
      for (const a of pool.concat(['interact'])) if (inp.pressed(a) && a !== 'jump') { if (a === seq[i]) i++; else wrong++; if (i >= seq.length) break; }
      if (i >= seq.length) { s.score = clamp(1 - 0.15 * wrong, 0.2, 1); s.res = 'done'; }
      else if (wrong >= 4 || s.t > timeout) { s.score = 0; s.res = 'fail'; }
      return s.res;
    },
    hud: () => ({ type, keys: seq.slice(), index: i }),
    hint: () => ({ press: seq[i] }),
  });
  return s;
}
/** Balance: keep the cursor centred with left/right (moveX) against drift. */
export function balance({ rng, duration = 4, drift = 0.5, timeout = 20 } = {}) {
  let c = 0, d = rng.range(-1, 1) * drift, good = 0, total = 0, dt0 = 0;
  const s = base('balance', {
    update(dt, inp) {
      if (s.res !== 'active') return s.res;
      s.t += dt; total += dt; dt0 -= dt; if (dt0 <= 0) { d = rng.range(-1, 1) * drift; dt0 = rng.range(0.5, 1.2); }
      c += (d - 1.6 * inp.axis('moveX')) * dt; c = clamp(c, -1.2, 1.2);
      if (Math.abs(c) < 0.5) good += dt;
      if (Math.abs(c) >= 1) { s.score = 0; s.res = 'fail'; }
      else if (total >= duration) { s.score = clamp(good / total, 0.3, 1); s.res = 'done'; }
      else if (s.t > timeout) s.res = 'fail';
      return s.res;
    },
    hud: () => ({ type: 'balance', cursor: c }),
    hint: () => ({ axis: { moveX: clamp(c * 3 + d / 1.6, -1, 1) } }),
  });
  return s;
}
/** Reach / carry / route: be at a target position (optionally in a vehicle) and optionally press interact. */
export function reach({ target, radius = 3, interact = true, mode = null, timeout = 120, label = '' } = {}) {
  const s = base('reach', {
    label,
    update(dt, inp, env) {
      if (s.res !== 'active') return s.res;
      s.t += dt;
      const p = env.pos(), tg = typeof target === 'function' ? target() : target;
      const near = tg && Math.hypot(p[0] - tg[0], p[2] - tg[2]) <= radius && (!mode || env.mode() === mode);
      if (near && (!interact || inp.pressed('interact'))) { s.score = clamp(1 - (s.t > timeout * 0.6 ? 0.3 : 0), 0.4, 1); s.res = 'done'; }
      else if (s.t > timeout) s.res = 'fail';
      return s.res;
    },
    hud: () => ({ type: 'route', target: typeof target === 'function' ? target() : target, radius, mode }),
    hint: () => ({ goto: typeof target === 'function' ? target() : target, radius, mode, press: interact ? 'interact' : null }),
  });
  return s;
}
/** Choice: cycle a cursor (turnLeft/turnRight) and confirm with interact. Used for diagnosis, document checks, orders. */
export function choice({ rng, options = 4, correct, timeout = 25, type = 'inspect' } = {}) {
  const ok = correct === undefined ? rng.int(0, options - 1) : correct; let cur = 0;
  const s = base(type, {
    update(dt, inp) {
      if (s.res !== 'active') return s.res;
      s.t += dt;
      if (inp.pressed('turnRight')) cur = (cur + 1) % options; if (inp.pressed('turnLeft')) cur = (cur + options - 1) % options;
      if (inp.pressed('interact')) { if (cur === ok) { s.score = 1; s.res = 'done'; } else { s.score = 0; s.res = 'fail'; } }
      else if (s.t > timeout) s.res = 'fail';
      return s.res;
    },
    hud: () => ({ type, options, cursor: cur }),
    hint: () => ({ cursor: cur, correct: ok, options }),
  });
  return s;
}
/** Gauge: match a value to a target band with the throttle axis and hold it. */
export function gauge({ rng, band = 0.1, hold = 1.5, timeout = 20 } = {}) {
  let v = rng.range(0.1, 0.9); const target = rng.range(0.25, 0.75); let inBand = 0, err = 0, n = 0;
  const s = base('gauge', {
    update(dt, inp) {
      if (s.res !== 'active') return s.res;
      s.t += dt; v = clamp(v + (inp.axis('throttle') * 0.9) * dt, 0, 1);
      if (Math.abs(v - target) <= band) inBand += dt; else inBand = 0;
      err += Math.abs(v - target); n++;
      if (inBand >= hold) { s.score = clamp(1 - err / n, 0.3, 1); s.res = 'done'; }
      else if (s.t > timeout) s.res = 'fail';
      return s.res;
    },
    hud: () => ({ type: 'gauge', value: v, target, band }),
    hint: () => ({ axis: { throttle: clamp((target - v) * 4, -1, 1) } }),
  });
  return s;
}
/** Wait: passive delay (bite wait, trawl run); the player may do nothing. */
export function wait({ seconds = 2, label = '' } = {}) {
  const s = base('wait', { label, update(dt) { if (s.res !== 'active') return s.res; s.t += dt; if (s.t >= seconds) { s.score = 1; s.res = 'done'; } return s.res; }, hud: () => ({ type: 'wait', progress: clamp(s.t / seconds, 0, 1) }), hint: () => ({}) });
  return s;
}
export const PRIMITIVES = { timingBar, holdRing, tensionBar, sequence, balance, reach, choice, gauge, wait };
