# The 14 "la peace" performances from assets/la_peace.mp3 (1.15 s, first phrase). Pitch measured with pyin against the sample (calibrated to +-3%).
# Writes build/audio/voices/<id>.wav, build/audio/voice_env.json (mouth curves, 30 fps) and build/audio/voice_report.json.
import json, os, sys
import numpy as np, soundfile as sf, librosa
sys.path.insert(0, os.path.dirname(__file__))
from common import *
y0 = mono(read(os.path.join(ASSETS, 'la_peace.mp3')))
nz = np.where(np.abs(y0) > 0.02 * np.abs(y0).max())[0]; y0 = fade(y0[max(0, nz[0] - 240): nz[-1] + 1200], 0.004, 0.03)
def f0(y):
    f = librosa.pyin(y.astype(np.float32), fmin=60, fmax=700, sr=SR, frame_length=2048, hop_length=256)[0]; f = f[~np.isnan(f)]
    return float(np.median(f)) if len(f) else float('nan')
F_SRC = f0(y0); print('sample', round(len(y0) / SR, 3), 's, median f0', round(F_SRC, 1), 'Hz')
def shift(y, pitch, tempo):
    return rubberband(y, SR, tempo=tempo, pitch=pitch)
def calib(y, pitch, tempo):
    k = 1.0
    for _ in range(4):
        z = shift(y, pitch * k, tempo); m = f0(z) / F_SRC
        if abs(m / pitch - 1) < 0.015: break
        k *= pitch / m
    return z, m
def contour(y, p0, p1, tempo):   # rising/falling pitch in 6 overlapping pieces
    n = 6; L = len(y); out = []
    for i in range(n):
        a, b = i * L // n, (i + 1) * L // n; p = p0 + (p1 - p0) * (i + 0.5) / n; out.append(shift(y[a:b], p, tempo))
    z = np.concatenate([fade(o, 0.003, 0.003) for o in out]); return z, f0(z) / F_SRC
def squelch(n, g=0.25, seed=1): r = np.random.default_rng(seed); return highpass(r.standard_normal(n), 2000) * g * np.exp(-np.arange(n) / (0.03 * SR))
def echo(y, d, k, taps=3):
    out = np.pad(y, (0, int(d * SR * taps) + 10))
    for i in range(1, taps + 1): out[int(d * SR * i):int(d * SR * i) + len(y)] += y * k ** i
    return out
rep, V = {}, {}
def put(name, y, target=-20.0, meas=None, pitch=None, tempo=None, note=''):
    y = fade(y, 0.002, 0.03); V[name] = norm_lufs(y, target); rep[name] = dict(dur=round(len(y) / SR, 2), f0_ratio=None if meas is None else round(meas, 3), target=pitch, tempo=tempo, lufs=target, note=note)
# dad: deep, short (the register exception the brief asks for: below the sample)
z, m = calib(y0, 0.86, 1.15); put('dad', reverb(drive(z, 1.4), SR, 0.5, 0.15, 1), -20, m, 0.86, 1.15, 'deep, short')
z, m = contour(y0, 1.15, 1.24, 1.4); put('kid', reverb(z, SR, 0.3, 0.1, 2), -20, m, '1.15->1.24', 1.4, 'high, quick, garden')
z, m = calib(y0, 1.15, 1.22); put('tourist', reverb(drive(z, 1.6), SR, 0.6, 0.12, 3), -20, m, 1.15, 1.22, 'excited, wind')
z, m = calib(y0, 1.10, 1.12); put('pilot', bandpass(z, 180, 6000), -20.5, m, 1.10, 1.12, 'flat, professional, cockpit')
z, m = calib(y0, 1.10, 1.18); r = bandpass(drive(z, 2.2), 350, 3200); q = squelch(int(0.09 * SR), 0.3, 4)
r = np.concatenate([q * 0.6, r, q[::-1] * 0.4]); put('astro', r, -20.5, m, 1.10, 1.18, 'radio band-pass + squelch')
z, m = calib(y0, 1.10, 1.15); h = lowpass(z, 1700); h = h + 0.35 * np.roll(np.pad(h, (0, 900)), 700)[:len(h)]; put('tech', h, -20.5, m, 1.10, 1.15, 'muffled helmet')
z, m = calib(y0, 1.10, 0.78); put('moon', reverb(echo(z, 0.32, 0.45, 3), SR, 1.2, 0.25, 5), -20.5, m, 1.10, 0.78, 'slow, low-gravity echo')
z, m = calib(y0, 1.10, 1.05); v = bandpass(drive(z, 3.0), 900, 2600); v = np.round(v * 24) / 24; v = v * (1 + 0.3 * np.sin(2 * np.pi * 37 * np.arange(len(v)) / SR))
v = np.concatenate([squelch(int(0.12 * SR), 0.2, 6), v, squelch(int(0.15 * SR), 0.15, 7)]); put('voyager', v, -21.5, m, 1.10, 1.05, 'tinny deep-space radio')
z, m = contour(y0, 1.10, 1.32, 1.12); put('alien', reverb(z, SR, 0.4, 0.12, 8), -20, m, '1.10->1.32', 1.12, 'rising, curious')
L = []
for i, (p, tp, d) in enumerate([(1.05, 1.18, 0.0), (1.15, 1.22, 0.025), (1.24, 1.2, 0.012)]):
    z, _ = calib(y0, p, tp); L.append(np.pad(z, (int(d * SR), 3000))[: int(1.3 * SR)])
n = max(len(x) for x in L); u = sum(np.pad(x, (0, n - len(x))) for x in L) / np.sqrt(3); put('picnic', reverb(u, SR, 0.5, 0.15, 9), -20, f0(u) / F_SRC, '1.05/1.15/1.24', 1.2, 'unison of three')
z, m = calib(y0, 0.72, 0.62); put('hero_deep', reverb(np.pad(z, (0, int(2.6 * SR))), SR, 3.2, 0.42, 10), -19.5, m, 0.72, 0.62, 'very deep, slow, long reverb tail')
z, m = calib(y0, 1.15, 1.28); put('mum', reverb(drive(z, 2.0), SR, 0.4, 0.12, 11), -19.5, m, 1.15, 1.28, 'angry')
L = []
for i, (p, tp, d) in enumerate([(1.10, 1.2, 0.0), (1.15, 1.24, 0.02), (1.22, 1.18, 0.035), (1.05, 1.2, 0.01), (1.18, 1.26, 0.03)]):
    z, _ = calib(y0, p, tp); pan = [-0.6, 0.6, -0.2, 0.3, 0.0][i]; st_ = np.stack([z * np.sqrt((1 - pan) / 2), z * np.sqrt((1 + pan) / 2)], 1)
    L.append(np.pad(st_, ((int(d * SR), 4000), (0, 0)))[: int(1.4 * SR)])
n = max(len(x) for x in L); u = sum(np.pad(x, ((0, n - len(x)), (0, 0))) for x in L) / np.sqrt(5); put('family', reverb(u, SR, 0.6, 0.18, 12), -17.0, f0(mono(u)) / F_SRC, '1.05-1.22 x5', 1.2, 'big unison, loudest line')
z, m = calib(y0, 1.10, 1.1); put('hero_final', z, -20, m, 1.10, 1.1, 'dry, close, deadpan')
os.makedirs(f'{AUD}/voices', exist_ok=True); envs = {}
for k, y in V.items():
    sf.write(f'{AUD}/voices/{k}.wav', stereo(y) if y.ndim == 1 else y, SR)
    e = envelope(y, SR, 30); envs[k] = [round(float(x), 3) for x in np.clip(e / (e.max() + 1e-9) * 1.25, 0, 1)]
    nzs = np.where(np.abs(mono(y)) > 0.05 * np.abs(y).max())[0]; rep[k]['onset_ms'] = round(nzs[0] / SR * 1000, 1); rep[k]['peak_db'] = round(peak_db(y), 1)
json.dump(envs, open(f'{AUD}/voice_env.json', 'w')); json.dump(rep, open(f'{AUD}/voice_report.json', 'w'), indent=1)
for k, v in rep.items(): print(f'{k:<11}', v)
