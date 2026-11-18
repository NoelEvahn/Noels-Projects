# Builds every catchphrase variant from the user's sample. Registers: 1.10x and 1.15x of the sample f0 (measured with pyin and printed).
import numpy as np, soundfile as sf, librosa, json, os, sys
from common import *
SRC = '/home/user/Noels-Projects/series-animation-guide/assets/bomboclat.mp3'
y0 = mono(read(SRC)); print('source', len(y0) / SR, 's')
# voice window + syllable boundaries from the envelope
e = envelope(y0, SR, 200); t_e = np.arange(len(e)) / 200
on = np.argmax(e > 0.1 * e.max()) / 200; off = len(e) / 200 - np.argmax(e[::-1] > 0.1 * e.max()) / 200
print('voice window', round(on, 3), round(off, 3))
V0, V1 = 1.62, 2.95
word = y0[int(V0 * SR):int(V1 * SR)]
# 'Bombo' = cut at the dip before 'cl' (episode-1 analysis: ~2.224 s absolute) -> relative
CUT = 2.224 - V0; bombo = fade(word[:int(CUT * SR)], 0.005, 0.02)
word = fade(word, 0.005, 0.03)
f0 = lambda y: float(np.nanmedian(librosa.pyin(y.astype(np.float32), fmin=250, fmax=900, sr=SR, frame_length=4096, hop_length=512)[0]))
F_SRC = f0(word); print('source median f0', round(F_SRC, 1), 'Hz')
def contour(y, r0, r1, pts=None):
    """time-varying resample: playback rate (= pitch ratio) goes r0->r1 (or via pts [(u,ratio)...]); output is n/mean(rate) long."""
    n = len(y); mean = (r0 + r1) / 2 if not pts else float(np.mean([p[1] for p in pts]))
    m = int(n / mean); u = np.linspace(0, 1, m)
    rate = np.interp(u, [p[0] for p in pts], [p[1] for p in pts]) if pts else np.linspace(r0, r1, m)
    src = np.clip(np.cumsum(rate) - rate[0], 0, n - 1); return np.interp(src, np.arange(n), y)
def voice(base, p0, p1=None, tempo=1.0, vib=0, gap=None, comp=None, pts=None):
    """p0/p1: pitch ratio vs the sample (measured result is trimmed by `comp` to land on target)."""
    p1 = p1 if p1 is not None else p0; comp = comp if comp else 1.0
    y = base.copy()
    if gap is not None:  # insert a gap (seconds) before 'clat'
        k = int((1.255 - V0) * SR); y = np.concatenate([y[:k], np.zeros(int(gap * SR)), y[k:]])
    if vib: y = y * (1 + 0.12 * np.sin(2 * np.pi * 5.5 * np.arange(len(y)) / SR))
    c = contour(y, p0 * comp, p1 * comp, pts)
    mean_r = (p0 + p1) / 2 * comp
    c = rubberband(c, SR, tempo=tempo / mean_r)      # the contour resample shortened the clip by mean_r: restore it, then apply the delivery tempo
    return c
def measure(y): return f0(y) / F_SRC
VARS = {}
def add(name, y, target_lufs=-20, **meta): VARS[name] = (norm_lufs(mono(y) if y.ndim == 1 else y, target_lufs), meta)
def calibrate(base, p0, p1, **kw):
    """adjust so the measured mean ratio lands within +-3% of the target (episode-1 note: 'bombo' reads ~4% high)."""
    tgt = (p0 + p1) / 2; comp = 1.0
    for _ in range(2):
        y = voice(base, p0, p1, comp=comp, **kw); m = measure(y)
        if abs(m / tgt - 1) < 0.02: break
        comp *= tgt / m
    return y, measure(y)
rep = {}
def mk(name, base, p0, p1=None, tempo=1.0, fx=None, lufs_t=-20, **kw):
    y, m = calibrate(base, p0, p1 if p1 else p0, tempo=tempo, **kw)
    if fx: y = fx(y)
    add(name, y, lufs_t); rep[name] = (round(len(y) / SR, 2), round(m, 3), p0, p1 or p0, tempo)
room = lambda rt, w, s=1: (lambda y: reverb(fade(y, 0.002, 0.01), SR, rt, w, s))
# ---- the 14 moments ----
mk('dad_shout', word, 1.10, tempo=1.05, fx=lambda y: reverb(bandpass(drive(y, 1.6), 140, 8000) * 1.0 + 0.0, SR, 0.9, 0.22, 1))
mk('kid_high', bombo, 1.15, 1.19, tempo=1.45, fx=room(0.4, 0.15, 2))
mk('grandma_confused', bombo, 1.10, 1.16, tempo=1.0, vib=1, lufs_t=-23, fx=room(0.5, 0.18, 3))
mk('hero_excited', bombo, 1.15, 1.19, tempo=1.5, fx=lambda y: reverb(drive(y, 1.5), SR, 0.35, 0.15, 4))
mk('judge_disbelief', word, 1.10, 1.10, tempo=1.0, gap=0.15, pts=[(0, 1.10), (0.62, 1.10), (0.78, 1.17), (1, 1.17)], fx=room(0.7, 0.2, 5))
mk('labassistant', word, 1.15, tempo=1.26, fx=lambda y: reverb(drive(y, 1.4), SR, 0.45, 0.18, 6))
mk('chief_mono', bombo, 1.10, 1.10, tempo=1.0, fx=lambda y: y)
mk('balloonist_flat', bombo, 1.10, 1.06, tempo=1.0, lufs_t=-21, fx=lambda y: reverb(lowpass(y, 5500), SR, 0.5, 0.08, 7))
mk('washer_shout', word, 1.10, tempo=1.14, fx=lambda y: reverb(np.pad(y, (0, 12000)) + 0.5 * np.roll(np.pad(y, (0, 12000)), int(0.28 * SR)) + 0.28 * np.roll(np.pad(y, (0, 12000)), int(0.56 * SR)), SR, 0.8, 0.14, 8))
mk('ghost_echo', bombo, 1.10, tempo=1.0, lufs_t=-22, fx=lambda y: reverb(bandpass(np.pad(y, (0, 30000)), 250, 5500) + 0.6 * np.roll(np.pad(y, (0, 30000)), int(0.34 * SR)) + 0.4 * np.roll(np.pad(y, (0, 30000)), int(0.68 * SR)), SR, 1.6, 0.35, 9))
mk('hero_casual', bombo, 1.10, 1.06, tempo=1.08, lufs_t=-20, fx=lambda y: y)
# ---- crowds: many layered voices, jitter, stereo spread ----
def crowd(n, p_lo, p_hi, t_lo, t_hi, jit, seed, base=word, verb=(1.6, 0.35)):
    r = np.random.default_rng(seed); L = int((1.6 + jit * 2) * SR); out = np.zeros((L, 2)); 
    for i in range(n):
        p = r.uniform(p_lo, p_hi); tp = r.uniform(t_lo, t_hi); y = rubberband(contour(base, p * 0.96, p * 0.96), SR, tempo=tp / (p * 0.96))
        pan = r.uniform(-1, 1); g = np.array([np.sqrt((1 - pan) / 2 + 0.01), np.sqrt((1 + pan) / 2 + 0.01)]); d = int(abs(r.normal(0, jit / 2)) * SR); m = min(len(y), L - d); out[d:d + m] += y[:m, None] * g
    out /= np.sqrt(n); return reverb(out, SR, *verb, seed=seed)
add('crowd_audience', crowd(34, 1.04, 1.20, 1.08, 1.38, 0.09, 11), -20); rep['crowd_audience'] = ('34 layers', '1.04-1.20', '', '', '1.08-1.38')
add('plazas_unison', crowd(8, 1.08, 1.18, 1.26, 1.44, 0.04, 12, base=bombo, verb=(0.9, 0.25)), -20); rep['plazas_unison'] = ('8 layers', '1.08-1.18', '', '', '1.26-1.44')
add('crowd_world', crowd(56, 1.04, 1.20, 1.02, 1.38, 0.10, 13, verb=(2.2, 0.4)), -17); rep['crowd_world'] = ('56 layers', '1.04-1.20', '', '', '1.02-1.38')
sl = rubberband(contour(word, 1.15 * 0.96, 0.85 * 0.96), SR, tempo=0.6 / 1.0); sl = reverb(np.pad(sl, (0, SR)), SR, 2.6, 0.45, 14); add('slowmo_scream', sl, -21); rep['slowmo_scream'] = (round(len(sl) / SR, 2), 'glide 1.15->0.85', '', '', 0.6)
os.makedirs(f'{AUD}/voices', exist_ok=True); env = {}
for k, (y, meta) in VARS.items():
    y = stereo(y) if y.ndim == 1 else y; sf.write(f'{AUD}/voices/{k}.wav', y, SR); env[k] = [float(x) for x in np.clip(envelope(y, SR, 30) / (envelope(y, SR, 30).max() + 1e-9) * 1.25, 0, 1)]
json.dump(env, open(f'{AUD}/voice_env.json', 'w'))
print(f'{"id":<18}{"dur s":>7}{"f0/src":>9}  target        tempo')
for k, v in rep.items(): print(f'{k:<18}{str(v[0]):>7}{str(v[1]):>9}  {v[2]}->{v[3]}   {v[4]}')
json.dump({k: list(map(str, v)) for k, v in rep.items()}, open(f'{AUD}/voice_report.json', 'w'))
