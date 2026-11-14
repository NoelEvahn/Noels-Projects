// Envelopes on AudioParams (Annex E 3). Times in seconds; decays are T60 (time to -60 dB). All changes are ramps (no clicks).
const T60 = 6.9;
/** percussive: 0 -> peak over `a`, exponential decay with T60 `d`. Returns the end time. */
export function perc(param, t, peak, a, d) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + a);
  param.setTargetAtTime(0, t + a, Math.max(0.001, d / T60));
  return t + a + d;
}
/** ADSR held for `hold` seconds after attack+decay, then release (T60 r). Returns the end time. */
export function adsr(param, t, { a = 0.01, d = 0.1, s = 0.7, r = 0.2, hold = 0, peak = 1 }) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + a);
  param.setTargetAtTime(peak * s, t + a, Math.max(0.001, d / 4));
  const rel = t + a + d + hold;
  param.setTargetAtTime(0, rel, Math.max(0.001, r / T60));
  return rel + r;
}
/** linear segments: [[dt, value], ...] starting from `v0` at t. Returns the end time. */
export function segs(param, t, v0, pts) {
  param.setValueAtTime(v0, t);
  let tt = t;
  for (const [dt, v] of pts) { tt += dt; param.linearRampToValueAtTime(v, tt); }
  return tt;
}
/** exponential frequency glide f0 -> f1 over dur */
export function glide(param, t, f0, f1, dur) {
  param.setValueAtTime(f0, t);
  param.exponentialRampToValueAtTime(Math.max(1, f1), t + Math.max(0.001, dur));
}
export const dbToGain = (db) => Math.pow(10, db / 20);
