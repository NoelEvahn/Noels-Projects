# Final mix for episode 5 (film time 0-96.8 s) -> build/audio/final_mix.wav + audio/mix.wav (VideoHub) + build/audio/mix_report.json
# Inputs: build/audio/music.wav (music.py), voices/ (make_voices.py), narr/ + narr_times.json (make_narration.py). SFX are procedural here.
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(__file__))
from common import *
HOOK, FILM = 1.6, 96.8
N = int(round(FILM * SR)); st = lambda s: s + HOOK
rng = np.random.default_rng(5)
src = open(os.path.join(os.path.dirname(__file__), '../src/timeline.js')).read()
VOICES = [(m.group(1), float(m.group(2))) for m in re.finditer(r"\{ id: '(\w+)', t: ([\d.]+), who:", src)]
NT = json.load(open(f'{AUD}/narr_times.json'))
def env(n, a=0.002, d=0.1, c=4.0): t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-c * t / d)
def noise(d): return rng.standard_normal(int(d * SR))
def thump(f=70, d=0.35, g=1.0): t = np.arange(int(d * SR)) / SR; return np.sin(2 * np.pi * (f + 60 * np.exp(-t * 25)) * t) * np.exp(-t * 9) * g
def chime(f, d=0.35, g=1.0): t = np.arange(int(d * SR)) / SR; return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 7 / d) * np.minimum(1, t / 0.002) * g
def whoosh(d=0.4, up=True, g=1.0):
    n = int(d * SR); y = noise(d); out = np.zeros(n); k = 20
    for i in range(k):
        a, b = i * n // k, (i + 1) * n // k; u = (i + 0.5) / k; fc = 400 * (12 ** (u if up else 1 - u)); out[a:b] = bandpass(y, fc * 0.7, min(fc * 1.4, 20000))[a:b]
    return out * np.sin(np.linspace(0, np.pi, n)) ** 1.5 / (np.abs(out).max() + 1e-9) * g
def crash(d=0.9, g=1.0): y = bandpass(noise(d), 300, 6000) * env(int(d * SR), 0.001, 0.25, 5); return y / np.abs(y).max() * g
def glass(d=1.4, g=1.0):
    out = np.zeros(int(d * SR))
    for i in range(40): f = rng.uniform(2500, 9000); s = int(rng.uniform(0, 0.5) * SR); c = chime(f, rng.uniform(0.08, 0.4), rng.uniform(0.2, 0.6)); out[s:s + len(c)] += c[:len(out) - s]
    out += highpass(noise(d), 3000) * env(len(out), 0.001, 0.3, 5) * 0.5; return out / np.abs(out).max() * g
def boom(d=2.2, g=1.0): n = int(d * SR); t = np.arange(n) / SR; y = np.sin(2 * np.pi * (50 + 80 * np.exp(-t * 6)) * t) * np.exp(-t * 2.0) + lowpass(noise(d), 2000) * np.exp(-t * 3) * 0.6; return y / np.abs(y).max() * g
def slam():
    n = int(2.4 * SR); t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * 45 * t) * np.exp(-t / 0.55) * np.minimum(1, t / 0.004)
    crack = highpass(noise(0.12), 1500) * env(int(0.12 * SR), 0.0005, 0.03, 5)
    y = sub * 1.0; y[:len(crack)] += crack * 0.9
    gl = glass(1.4, 0.45); y[int(0.03 * SR):int(0.03 * SR) + len(gl)] += gl
    tail = reverb(lowpass(noise(0.3), 3000) * env(int(0.3 * SR), 0.001, 0.1), SR, 2.0, 0.8, 21); y[:min(n, len(tail))] += tail[:n] * 0.5
    return y / np.abs(y).max()
def glitch(d=0.6): n = int(d * SR); y = np.sign(np.sin(2 * np.pi * np.cumsum(np.repeat(rng.uniform(200, 3000, int(d * 40)), n // int(d * 40) + 1)[:n]) / SR)) * 0.3 + noise(d) * 0.2; return bandpass(y, 300, 7000) * (np.arange(n) % int(0.05 * SR) < int(0.035 * SR)) * env(n, 0.001, d, 2)
sfx = np.zeros((N, 2)); big = np.zeros((N, 2))
def put(y, t, g=1.0, buf=None): place(sfx if buf is None else buf, y, t, SR, g)
# ---- counter ticks (story 2..60): soft chime + hit, rising scale; tier ticks bigger
penta = [0, 2, 4, 7, 9]; TIERS = {12: 1, 16: 2, 26: 1, 32: 1, 40: 2, 46: 3, 56: 1, 60: 2}
for k, tk in enumerate(range(2, 61, 2)):
    tier = TIERS.get(tk, 0); f = 523.25 * 2 ** ((penta[k % 5] + 12 * ((k // 5) % 2)) / 12)
    put(chime(f, 0.3 + 0.15 * tier, 0.45 + 0.15 * tier), st(tk)); put(thump(80, 0.2, 0.4 + 0.15 * tier), st(tk))
# ---- home
put(thump(60, 0.3, 0.5), st(1.15))                                       # hop landing
put(crash(0.8, 0.7), st(2.25)); put(thump(55, 0.4, 0.7), st(2.25))         # head through the ceiling
put(crash(1.0, 0.8), st(4.15)); put(thump(50, 0.4, 0.6), st(4.15))         # through the roof, tiles
for i in range(6): put(thump(220 + i * 40, 0.08, 0.15), st(4.6 + i * 0.13))
put(whoosh(0.5, True, 0.3), st(12.0)); put(whoosh(0.8, True, 0.25), st(13.6))
put(thump(70, 0.25, 0.35), st(26.2)); put(chime(1568, 0.6, 0.35), st(33.0))       # moon clip, sun's shades
for i in range(5): put(thump(140 + i * 20, 0.12, 0.3), st(43.9 + i * 0.32))        # Oort rocks bounce off him
# ---- the break
put(glitch(0.8) * 0.5, st(62.0)); put(boom(2.2, 0.5), st(62.8)); put(whoosh(1.2, True, 0.5), st(62.8))
for i, t in enumerate([65.2, 66.0, 66.8, 67.6]): put(whoosh(0.5, True, 0.25 + 0.05 * i), st(t) - 0.1)
# ---- outside the universe: footsteps in, ball spin, dribble thumps + steps (heard in the silence), the slam
for t in (68.8, 69.3, 69.8): put(thump(110, 0.1, 0.18), st(t))
put(chime(880, 1.2, 0.2) + chime(1320, 1.2, 0.15), st(71.0))
for t in (76.4, 77.2, 78.0, 78.8): put(thump(95, 0.3, 0.55 if t < 78.8 else 0.7), st(t))
for t in (76.8, 77.6, 78.4, 79.2): put(thump(160, 0.08, 0.2) + 0.0, st(t))
put(thump(70, 0.25, 0.4), st(79.2))
SL = slam(); put(SL, st(80.0), 1.0, big); put(SL, 0.2, 1.0, big)           # the slam (story 80.0) and the hook slam (film 0.2)
put(thump(55, 0.5, 0.6), st(80.95)); put(thump(95, 0.25, 0.4), st(81.6)); put(whoosh(0.8, False, 0.4), st(82.0))
# ---- home again
put(crash(0.6, 0.5), st(82.9)); put(thump(55, 0.5, 0.7), st(83.3)); put(thump(100, 0.25, 0.35), st(83.7)); put(thump(110, 0.2, 0.25), st(84.0)); put(thump(130, 0.15, 0.2), st(84.6))
put(thump(90, 0.25, 0.35), st(90.95)); put(chime(392, 1.6, 0.4) + chime(587, 1.6, 0.35) + chime(784, 1.6, 0.3), st(91.6))
# ---- rewind: reversed whoosh
put(whoosh(0.4, True, 0.5)[::-1], 1.2)
sfx *= 10 ** (-8 / 20)   # SFX bus well under speech and music
# ---- music
mus = read(f'{AUD}/music.wav')[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
# ---- voices + narration
voice = np.zeros((N, 2)); narr = np.zeros((N, 2)); dn = np.zeros(N); dv = np.zeros(N)
for vid, t in VOICES:
    y = read(f'{AUD}/voices/{vid}.wav')
    if vid == 'hero_deep': y = y[: int((77.4 - 72.0) * SR)]; y[-int(0.8 * SR):] *= np.linspace(1, 0, int(0.8 * SR))[:, None]   # tail gone before the silence
    place(voice, y, st(t)); a = int(st(t) * SR); dv[a:a + int(min(len(y) / SR, 1.3) * SR)] = 1
for nid, t in NT.items():
    y = norm_lufs(read(f'{AUD}/narr/{nid}.wav'), -16.5 if not nid.startswith('r') else -18.0); place(narr, y, st(t)); a = int(st(t) * SR); dn[a:a + len(y)] = 1
def smooth_env(x, atk=0.03, rel=0.3):
    import scipy.signal as ss
    k = np.exp(-1 / (rel * SR)); y = ss.lfilter([1 - k], [1, -k], x); k2 = np.exp(-1 / (atk * SR)); return np.maximum(y, ss.lfilter([1 - k2], [1, -k2], x))
gd = 10 ** (-5 * np.clip(smooth_env(dn), 0, 1) / 20) * 10 ** (-2.5 * np.clip(smooth_env(dv), 0, 1) / 20)
mus *= 10 ** (-3 / 20)   # music bed 3 dB lower so the slam stands out
mix = mus * gd[:, None] + voice + narr + sfx + big * 1.6
# true silence window (story 77.6-80.0): only the thumps and steps
a, b = int(st(77.6) * SR), int(st(80.0) * SR); mix[a:b] = sfx[a:b] + voice[a:b] * 0
# ---- master: -14 LUFS, limiter ceiling ~ -3.2 dB
g0 = 10 ** ((-14 - lufs(mix)) / 20)
for extra in (0.0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0):
    sf.write(f'{AUD}/premaster.wav', mix * g0 * 10 ** (extra / 20), SR, subtype='FLOAT')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{AUD}/premaster.wav', '-af', 'alimiter=limit=0.69:attack=3:release=60:level=disabled', '-ar', '48000', '-c:a', 'pcm_s24le', f'{AUD}/final_mix.wav'], check=True)
    fm, _ = sf.read(f'{AUD}/final_mix.wav'); L = lufs(fm)
    if L >= -14.15: break
fm = fm[:N]
rep = dict(lufs=round(L, 2), sample_peak_db=round(peak_db(fm), 2), dur=len(fm) / SR, extra_gain=extra,
           silence_music_max=float(np.abs(mus[a:b]).max()), silence_mix_max_db=round(peak_db(fm[a:b]), 1))
# loudness of events (short-term peak, dB) to check the slam is the biggest
def win(t, d=0.4): i = int(t * SR); return round(20 * np.log10(np.sqrt(np.mean(fm[i:i + int(d * SR)] ** 2)) + 1e-9), 1)
rep['rms_slam'] = win(st(80.0)); rep['rms_hook_slam'] = win(0.2); rep['rms_launch'] = win(st(62.8)); rep['rms_family'] = win(st(84.4)); rep['rms_loudest_other_0.4s'] = max(win(x) for x in np.arange(2, 96, 0.2) if not (st(79.9) <= x <= st(80.6)) and not (0.1 <= x <= 0.8))
json.dump(rep, open(f'{AUD}/mix_report.json', 'w'), indent=1); print(json.dumps(rep, indent=1))
os.makedirs(os.path.join(os.path.dirname(__file__)), exist_ok=True)
subprocess.run(['cp', f'{AUD}/final_mix.wav', os.path.join(os.path.dirname(__file__), 'mix.wav')], check=True)
