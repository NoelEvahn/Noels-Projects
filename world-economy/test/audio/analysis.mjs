// Signal analysis for the audio tests (Annex E 8). Pure JS: runs in Node (self-test) and bundled into the headless page.
export function mono(chs) { const n = chs[0].length, out = new Float32Array(n); for (const c of chs) for (let i = 0; i < n; i++) out[i] += c[i] / chs.length; return out; }

/** validity, peak (max over channels), whole RMS, DC, active-part RMS (10 ms frames within 30 dB of the loudest), tail end */
export function basic(chs, sr) {
  let bad = 0, peak = 0;
  for (const c of chs) for (let i = 0; i < c.length; i++) { const v = c[i]; if (!Number.isFinite(v)) bad++; else if (Math.abs(v) > peak) peak = Math.abs(v); }
  const m = mono(chs), n = m.length;
  let s = 0, s2 = 0; for (let i = 0; i < n; i++) { s += m[i]; s2 += m[i] * m[i]; }
  const F = Math.round(sr * 0.01), nf = Math.floor(n / F), fr = new Float32Array(nf);
  let mx = 0; for (let f = 0; f < nf; f++) { let a = 0; for (let i = f * F; i < (f + 1) * F; i++) a += m[i] * m[i]; fr[f] = Math.sqrt(a / F); if (fr[f] > mx) mx = fr[f]; }
  let as = 0, an = 0; for (let f = 0; f < nf; f++) if (fr[f] >= mx * 0.0316) { as += fr[f] * fr[f]; an++; }
  let last = -1; for (const c of chs) for (let i = c.length - 1; i > last; i--) if (Math.abs(c[i]) > 0.001) { last = i; break; }
  let first = n; for (const c of chs) for (let i = 0; i < first; i++) if (Math.abs(c[i]) > 0.001) { first = i; break; }
  return { bad, peak, rms: Math.sqrt(s2 / n), dc: s / n, activeRms: an ? Math.sqrt(as / an) : 0, tailEnd: last < 0 ? 0 : (last + 1) / sr, start: first / sr, allZero: peak === 0, frames: fr };
}

/** in-place radix-2 FFT */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2; const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr; re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
/** magnitude-weighted spectral centroid (Hz), averaged spectrum over Hann frames whose RMS is within 30 dB of the loudest */
export function centroid(m, sr, N = 2048) {
  const hop = N / 2, spec = new Float64Array(N / 2), re = new Float64Array(N), im = new Float64Array(N);
  const frames = []; let mx = 0;
  for (let p = 0; p + N <= m.length; p += hop) { let a = 0; for (let i = 0; i < N; i++) a += m[p + i] * m[p + i]; a = Math.sqrt(a / N); frames.push([p, a]); if (a > mx) mx = a; }
  for (const [p, a] of frames) {
    if (a < mx * 0.0316) continue;
    for (let i = 0; i < N; i++) { re[i] = m[p + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1))); im[i] = 0; }
    fft(re, im);
    for (let k = 1; k < N / 2; k++) spec[k] += Math.hypot(re[k], im[k]);
  }
  let num = 0, den = 0; for (let k = 1; k < N / 2; k++) { num += spec[k] * k * sr / N; den += spec[k]; }
  return den ? num / den : 0;
}
/** live-graph loop seam: RMS of the first and last `win` seconds in dB difference */
export function seamDb(m, sr, win = 1) { const W = Math.round(win * sr); const r = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += m[i] * m[i]; return Math.sqrt(s / (b - a)); }; const a = r(0, W), b = r(m.length - W, m.length); return 20 * Math.log10((b + 1e-9) / (a + 1e-9)); }
/** buffer loop seam: the step across the wrap (last -> first sample) must not exceed the largest step among the 64 samples on
 *  either side of the wrap by more than `excess` (a seam shows as an outlier step; noise has large steps everywhere). */
export function bufferSeam(d) { const n = d.length; const step = Math.abs(d[0] - d[n - 1]); let mx = 0; for (let i = 1; i < 64; i++) mx = Math.max(mx, Math.abs(d[i] - d[i - 1]), Math.abs(d[n - i] - d[n - i - 1])); return { step, maxNeighbourStep: mx, excess: Math.max(0, step - mx) }; }
/** YIN fundamental (Hz) over a window, threshold `thr`; f range [fmin, fmax] */
export function yin(m, sr, { fmin = 8, fmax = 600, thr = 0.2, start = 0.5, len = 0.6 } = {}) {
  const s0 = Math.round(start * sr), W = Math.round(len * sr), tmax = Math.min(Math.floor(sr / fmin), Math.floor((m.length - s0 - W) / 1)), tmin = Math.floor(sr / fmax);
  const d = new Float64Array(tmax + 1);
  for (let tau = 1; tau <= tmax; tau++) { let s = 0; for (let i = 0; i < W; i++) { const x = m[s0 + i] - m[s0 + i + tau]; s += x * x; } d[tau] = s; }
  const cm = new Float64Array(tmax + 1); cm[0] = 1; let run = 0;
  for (let tau = 1; tau <= tmax; tau++) { run += d[tau]; cm[tau] = d[tau] * tau / (run || 1); }
  let best = -1;
  for (let tau = tmin; tau <= tmax; tau++) if (cm[tau] < thr) { while (tau + 1 <= tmax && cm[tau + 1] < cm[tau]) tau++; best = tau; break; }
  if (best < 0) { let mn = Infinity; for (let tau = tmin; tau <= tmax; tau++) if (cm[tau] < mn) { mn = cm[tau]; best = tau; } }
  // parabolic interpolation
  const a = cm[best - 1] || cm[best], b = cm[best], c = cm[best + 1] || cm[best];
  const off = (a - 2 * b + c) ? 0.5 * (a - c) / (a - 2 * b + c) : 0;
  return { f: sr / (best + off), confidence: 1 - b };
}
/** onset count from positive spectral flux with adaptive threshold and 60 ms minimum gap */
export function onsets(m, sr, N = 1024) {
  const hop = N / 2, re = new Float64Array(N), im = new Float64Array(N); let prev = null; const flux = [];
  for (let p = 0; p + N <= m.length; p += hop) {
    for (let i = 0; i < N; i++) { re[i] = m[p + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1))); im[i] = 0; }
    fft(re, im);
    const mag = new Float64Array(N / 2); for (let k = 0; k < N / 2; k++) mag[k] = Math.log1p(1000 * Math.hypot(re[k], im[k]));
    let f = 0; if (prev) for (let k = 0; k < N / 2; k++) { const dd = mag[k] - prev[k]; if (dd > 0) f += dd; }
    flux.push(f); prev = mag;
  }
  let count = 0, lastOn = -1e9; const gap = Math.ceil(0.06 * sr / hop), W = 8;
  for (let i = 1; i < flux.length - 1; i++) {
    let s = 0, c = 0; for (let j = Math.max(0, i - W); j <= Math.min(flux.length - 1, i + W); j++) { s += flux[j]; c++; }
    const thr = (s / c) * 1.5 + 1;
    if (flux[i] > thr && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1] && i - lastOn >= gap) { count++; lastOn = i; }
  }
  return count;
}
