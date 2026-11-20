# Music stem for episode 5 (film time, 96.8 s, 48 kHz stereo) -> build/audio/music.wav + build/audio/music_report.json
#
# 1) Charlie's Inferno 145.995 BPM -> 150 BPM (x1.02743, pitch kept). Story 0 (film 1.6) = the first kick beat 3.228 s of the stretched track (re-verified below; ep3 used 3.030, the off-beat 8th).
# 2) Tiki Tiki phonk (user, 2026-11-20): measured 168.00 BPM, beat 0 at 0.336 s, drops (kick back on the downbeat) at 11.765 / 26.050 / 60.336 s.
#    Stretched 168 -> 150 BPM (tempo 0.892857, pitch kept) so its beats sit on the same 0.4 s grid as every cut.
#    - crossfade: Charlie fades out, Tiki fades in across story 60.4 -> 62.0 (the shot-26 cut)
#    - story 62.0-62.8: the break, music at digital zero (Tiki's own 2-beat bass gap before drop A is exactly here)
#    - story 62.8: Tiki drop A (orig 11.765) on the launch; Tiki runs on, its own wind-down (orig ~24.6-25.7) lands in the 76.0-77.6 low-pass
#    - story 77.6-80.0: true silence; 80.0: Tiki drop B (orig 60.336, the biggest) on the slam, runs to the end, fades under the title card
#    - hook (film 0-1.2 = story 79.8-81.0): the same drop B, preceded by 0.2 s of Tiki's pre-drop bar so frame 0 is not silent
import json, os, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import librosa

FILM, HOOK = 96.8, 1.6
N = int(round(FILM * SR))
st = lambda s: s + HOOK                     # story -> film
TT = 150 / 168.0                            # Tiki tempo factor
TB, TB0 = 60 / 168.0, 0.336                 # Tiki beat (orig) and beat 0
def tiki_orig_to_str(t): return t / TT      # orig seconds -> stretched seconds

def beat_fit(y, sr, bpm0, a, b):
    """comb search of the low-band onset envelope: best (score, bpm, first beat) on [a, b]."""
    hop = 128; fr = sr / hop
    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, fmax=200, n_mels=32)
    best = (0, 0, 0)
    for bpm in np.arange(bpm0 - 0.3, bpm0 + 0.3, 0.01):
        P = 60 / bpm
        for ph in np.arange(0, P, 0.004):
            ts = np.arange(a + ph, b, P); s = env[(ts * fr).astype(int)].mean()
            if s > best[0]: best = (float(s), float(bpm), float(a + ph))
    # residuals: nearest onset peak to each grid beat
    pk = librosa.util.peak_pick(env, pre_max=3, post_max=3, pre_avg=3, post_avg=5, delta=0.3, wait=10) / fr
    grid = np.arange(best[2], b, 60 / best[1]); res = [float(np.min(np.abs(pk - g))) for g in grid if len(pk)]
    return best, float(np.percentile(res, 50)), float(np.percentile(res, 95))

rep = {}
# ---------------- Charlie's Inferno
ch = read(os.path.join(ASSETS, 'charlies_inferno.mp3'))
chs = rubberband(ch, SR, tempo=1.02743)
m22 = librosa.resample(mono(chs).astype(np.float32), orig_sr=SR, target_sr=22050)
fitc, r50, r95 = beat_fit(m22, 22050, 150, 3.0, 60.0)
# downbeat: which of the 4 phases carries the most low-band accent
P = 60 / fitc[1]; lo = librosa.onset.onset_strength(y=m22, sr=22050, hop_length=128, fmax=150, n_mels=24); fr = 22050 / 128
acc = [float(np.mean([lo[int((fitc[2] + (k * 4 + ph) * P) * fr)] for k in range(30)])) for ph in range(4)]
rep['charlie'] = dict(bpm_after=round(fitc[1], 3), first_beat=round(fitc[2], 3), resid_p50_ms=round(r50 * 1000, 1), resid_p95_ms=round(r95 * 1000, 1), phase_accent=[round(a, 3) for a in acc], chosen_t0=3.228)
C0 = 3.228   # re-verified: kick (low band) accent 3.12 at 3.228 vs 1.12 at 3.030 (3.030 is the snare/hat 8th); ep3 used 3.030
# ---------------- Tiki Tiki phonk
tk = read(os.path.join(ASSETS, 'tiki_tiki_phonk.mp3'))
tks = rubberband(tk, SR, tempo=TT)
t22 = librosa.resample(mono(tks).astype(np.float32), orig_sr=SR, target_sr=22050)
fitt, tr50, tr95 = beat_fit(t22, 22050, 150, tiki_orig_to_str(10.0), tiki_orig_to_str(84.0))
DA, DB = tiki_orig_to_str(11.765), tiki_orig_to_str(60.336)       # drop A / drop B in the stretched track
rep['tiki'] = dict(bpm_orig=168.0, tempo=round(TT, 6), bpm_after=round(fitt[1], 3), grid_first_beat=round(fitt[2], 3), resid_p50_ms=round(tr50 * 1000, 1), resid_p95_ms=round(tr95 * 1000, 1),
                   dropA_str=round(DA, 3), dropB_str=round(DB, 3), dropA_on_grid_ms=round(((DA - fitt[2]) / 0.4 - round((DA - fitt[2]) / 0.4)) * 400, 1), dropB_on_grid_ms=round(((DB - fitt[2]) / 0.4 - round((DB - fitt[2]) / 0.4)) * 400, 1))

def seg(src, s0, film0, film1):
    """copy src[s0 ...] into film time [film0, film1)."""
    a, b = int(round(film0 * SR)), int(round(film1 * SR)); i = int(round(s0 * SR)); n = b - a
    out = np.zeros((n, 2)); piece = src[i:i + n]; out[:len(piece)] = piece; return a, b, out
C = norm_lufs(chs, -17.0); T = norm_lufs(tks, -17.0)
mus = np.zeros((N, 2))
# Charlie: story 0 -> 62.0 (film 1.6 -> 63.6), fading out over 60.4 -> 62.0
a, b, x = seg(C, C0, st(0), st(62.0));
fo0, fo1 = int((st(60.4) - st(0)) * SR), int((st(62.0) - st(0)) * SR); g = np.ones(len(x)); g[fo0:fo1] = np.cos(np.linspace(0, np.pi / 2, fo1 - fo0)) ** 2; g[fo1:] = 0
mus[a:b] += x * g[:, None]
# Tiki A: aligned so drop A sits at story 62.8; fades in over 60.4 -> 62.0; 62.0-62.8 zero; runs to 77.6 with a low-pass sweep 76.0 -> 77.6
offA = DA - st(62.8)                                    # stretched-track time at film 0
a, b, x = seg(T, offA + st(60.4), st(60.4), st(77.6))
n = len(x); fi = int(1.6 * SR); g = np.ones(n); g[:fi] = np.sin(np.linspace(0, np.pi / 2, fi)) ** 2
g[int(1.6 * SR):int(2.4 * SR)] = 0.0                     # the break: digital zero 62.0-62.8
x *= g[:, None]
s0, s1 = int((76.0 - 60.4) * SR), n
for i in range(8):
    p0, p1 = s0 + i * (s1 - s0) // 8, s0 + (i + 1) * (s1 - s0) // 8; fc = 16000 * (300 / 16000) ** ((i + 1) / 8)
    x[p0:p1] = lowpass(x[s0:s1], fc)[p0 - s0:p1 - s0]
x[s0:s1] *= np.linspace(1, 0.3, s1 - s0)[:, None]
x[int(2.4 * SR):int(2.4 * SR) + int(0.006 * SR)] *= np.linspace(0, 1, int(0.006 * SR))[:, None]   # de-click on the slam back
mus[a:b] += x
# Tiki B: drop B at story 80.0, to the end; room silence 87.6-88.8 (the beat before the final la peace); fade under the title card
offB = DB - st(80.0)
a, b, x = seg(T, offB + st(80.0), st(80.0), FILM)
x[:int(0.006 * SR)] *= np.linspace(0, 1, int(0.006 * SR))[:, None]
r0, r1 = int((87.6 - 80.0) * SR), int((88.8 - 80.0) * SR); x[r0 - int(0.03 * SR):r0] *= np.linspace(1, 0, int(0.03 * SR))[:, None]; x[r0:r1] = 0; x[r1:r1 + int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
f0 = int((91.6 - 80.0) * SR); x[f0:] *= (np.linspace(1, 0, len(x) - f0) ** 1.4)[:, None] * 0.85 + 0.0
mus[a:b] += x
# hook: film 0 -> 1.2 = story 79.8 -> 81.0: the 0.2 s pre-drop bar then drop B at film 0.2; rewind 1.2 -> 1.6: reversed hook, low-passed, fading
a, b, x = seg(T, DB - 0.2, 0.0, 1.2); mus[a:b] = x
x[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]; mus[a:b] = x
rw = lowpass(x[::-1][:int(0.4 * SR)], 2500) * np.linspace(0.8, 0.0, int(0.4 * SR))[:, None]; mus[int(1.2 * SR):int(1.2 * SR) + len(rw)] = rw
# true silence guard
mus[int(st(77.6) * SR):int(st(80.0) * SR)] = 0.0
mus[int(st(62.0) * SR):int(st(62.8) * SR)] = 0.0
sf.write(os.path.join(AUD, 'music.wav'), mus, SR, subtype='FLOAT')
rep['segments_film'] = dict(charlie=[st(0), st(62.0), 'from stretched 3.228 s'], tikiA=[st(60.4), st(77.6), f'drop A orig 11.765 s at film {st(62.8):.1f}'], tikiB=[st(80.0), FILM, f'drop B orig 60.336 s at film {st(80.0):.1f}'], hook=[0, 1.2, 'drop B at film 0.2'])
json.dump(rep, open(os.path.join(AUD, 'music_report.json'), 'w'), indent=1)
print(json.dumps(rep, indent=1))
