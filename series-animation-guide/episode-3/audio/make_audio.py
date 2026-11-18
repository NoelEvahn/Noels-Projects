# SFX (procedural) + music edit + ducked mix -> build/audio/final_mix.wav (48 kHz stereo, ~-14 LUFS, true peak <= -1 dBTP before encode)
import numpy as np, soundfile as sf, json, os, re, glob, subprocess
import scipy.signal as ss
from common import *
rng = np.random.default_rng(7)
N = int(90 * SR); T = np.arange(N) / SR
src = open(os.path.join(os.path.dirname(__file__), '../src/timeline.js')).read()
def js_list(name):
    m = re.search(r'export const %s = \[(.*?)\n\];' % name, src, re.S); return m.group(1)
VOICES = [(m.group(1), float(m.group(2))) for m in re.finditer(r"id: '(\w+)', t: ([\d.]+), who", js_list('VOICES'))]
ROASTS = [(m.group(1), float(m.group(2))) for m in re.finditer(r"id: '(r\d)', t: ([\d.]+)", js_list('ROASTS'))]
NARR = [(m.group(1), float(m.group(2))) for m in re.finditer(r"id: '(n\d)', t: ([\d.]+)", js_list('NARRATION'))]
TIERS = {10: 1, 20: 1, 32: 1, 40: 2, 60: 3, 66: 4, 74: 3, 80: 4}
# the edit's real cuts: the regroup() lists in each scene (t0 of each held shot)
CUTS = sorted({float(m) for f in glob.glob(os.path.join(os.path.dirname(__file__), '../src/scenes/s*.js')) for blk in re.findall(r'regroup\(S\.shots, (\[\[.*?\]\])\)', open(f).read()) for m in re.findall(r'\[([\d.]+),', blk)})
SFX_GAIN = 10 ** (-8 / 20)    # user feedback: SFX far too loud -> whole SFX bus 8 dB down
# ------------------------------------------------------------------ SFX
def env(n, a=0.002, d=0.1, curve=4.0): t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-curve * t / d)
def tone(f, dur, a=0.002, d=None, harm=(1, 0.3, 0.1)):
    t = np.arange(int(dur * SR)) / SR; y = sum(h * np.sin(2 * np.pi * f * (i + 1) * t) for i, h in enumerate(harm)); return y * env(len(t), a, d or dur * 0.5, 5)
def noise(dur): return rng.standard_normal(int(dur * SR))
def sweep(dur, f0, f1, q=0.0, kind='band'):
    n = int(dur * SR); y = noise(dur); out = np.zeros(n); k = 24
    for i in range(k):
        a, b = int(i * n / k), int((i + 1) * n / k); fc = f0 * (f1 / f0) ** ((i + 0.5) / k)
        sos = ss.butter(2, [fc * 0.7 / (SR / 2), min(0.99, fc * 1.4 / (SR / 2))], 'band', output='sos'); out[a:b] = ss.sosfilt(sos, y[a:b])
    return out * np.sin(np.linspace(0, np.pi, n)) ** 1.5
def whoosh(dur=0.3, up=True, g=1.0): y = sweep(dur, 400, 5000, 0) if up else sweep(dur, 5000, 400, 0); return y / (np.abs(y).max() + 1e-9) * g
def thump(f=70, dur=0.35, g=1.0): t = np.arange(int(dur * SR)) / SR; return np.sin(2 * np.pi * (f + 60 * np.exp(-t * 25)) * t) * np.exp(-t * 9) * g
def chime(f, dur=0.35, g=1.0):
    a = tone(f, dur, 0.001, dur * 0.4, (1, 0.45, 0.2, 0.1)); b = 0.5 * tone(f * 2.01, dur * 0.7, 0.001, dur * 0.3, (1,)); a[:len(b)] += b[:len(a)]; return a * g
def pop(g=1.0): t = np.arange(int(0.09 * SR)) / SR; return np.sin(2 * np.pi * (900 + 900 * np.exp(-t * 60)) * t) * np.exp(-t * 45) * g
def boom(dur=2.2, g=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; body = np.sin(2 * np.pi * (55 + 90 * np.exp(-t * 6)) * t) * np.exp(-t * 2.2); nz = lowpass(noise(dur), 2500) * np.exp(-t * 3.0); return (body * 0.9 + nz * 0.7) * g
def scratch(dur=0.55): n = int(dur * SR); t = np.arange(n) / SR; f = 3500 * np.exp(-t * 3.2) + 300; ph = 2 * np.pi * np.cumsum(f) / SR; y = (np.sign(np.sin(ph)) * 0.4 + noise(dur) * 0.25) * np.exp(-t * 5); return highpass(y, 400)
def reverse(y): return y[::-1]
sfx = np.zeros((N, 2))
penta = [0, 2, 4, 7, 9]
# doubling chimes (45) + soft bass hit; tier hits get bigger
for k, tick in enumerate(np.arange(0, 90, 2.0)):
    if 77.6 <= tick < 80.0: continue      # true silence window: the counter changes without a sound
    tier = TIERS.get(int(tick), 0); f = 659.3 * 2 ** ((penta[k % 5] + 12 * (k // 5 % 2)) / 12) * (1 + 0.0 * k)
    g = 0.5 + 0.2 * tier; place(sfx, chime(f, 0.32 + 0.2 * tier, g), tick); place(sfx, thump(85, 0.2, 0.45 + 0.15 * tier), tick)
    if tier >= 2: place(sfx, chime(f * 1.5, 0.8, 0.5), tick + 0.03); place(sfx, whoosh(0.5, False, 0.4), tick - 0.05)
# whoosh at cuts (quieter in the montage where cuts are 0.2 s apart)
for c in CUTS:
    if 76.0 <= c <= 80.0 or c in (0.0,) : continue
    place(sfx, whoosh(0.35, bool(int(c * 10) % 2), 0.05), c - 0.16)   # barely-there air on a cut (the old 0.2 'shh' on every cut was the loudest thing in the mix)
# story beats
for t in (0.2, 2.0, 4.0, 4.0, 6.0, 6.08, 6.16, 6.24, 8.0, 8.04, 8.08, 8.12, 8.16, 8.2, 8.24, 8.28): place(sfx, pop(0.35), t)
place(sfx, whoosh(0.4, True, 0.35), 7.35)                                   # burger flies
for t in np.arange(12, 19, 0.6): place(sfx, pop(0.12), t + rng.uniform(0, 0.1))     # chalk hearts / balloons popping up
place(sfx, noise(0.25) * env(int(0.25 * SR), 0.001, 0.08, 6) * 0.5, 14.0); place(sfx, chime(1318, 0.5, 0.5), 14.0)       # confetti pop
place(sfx, whoosh(0.5, True, 0.4), 19.0)
# crowd murmur beds (noise, band-limited) scaled to the scene
def murmur(t0, t1, g, swell=False):
    n = int((t1 - t0) * SR); y = bandpass(noise(t1 - t0), 300, 2600) * (1 + 0.4 * np.sin(np.linspace(0, 40, n))); a = np.sin(np.linspace(0, np.pi, n)) ** 0.5 if swell else 1; place(sfx, y * a * g, t0)
murmur(12.0, 20.8, 0.03); murmur(23.5, 28.0, 0.035, True); murmur(46.0, 47.6, 0.02)
place(sfx, chime(1046, 0.9, 0.6) + chime(1318, 0.9, 0.5) + chime(1568, 0.9, 0.5), 28.0); place(sfx, noise(0.5) * env(int(0.5 * SR), 0.001, 0.12, 6) * 0.6, 28.0); place(sfx, noise(0.5) * env(int(0.5 * SR), 0.001, 0.12, 6) * 0.6, 28.08)  # golden buzzer + cannons
y = bandpass(noise(1.6), 250, 3200) * np.sin(np.linspace(0, np.pi, int(1.6 * SR))) ** 0.8; place(sfx, y, 30.6, 0.2)           # audience roar under the crowd voice
place(sfx, chime(2093, 0.6, 0.7) + chime(1396, 0.6, 0.5), 40.0); place(sfx, highpass(noise(0.4), 3000) * env(int(0.4 * SR), 0.001, 0.15, 6) * 0.4, 40.0); place(sfx, whoosh(0.8, True, 0.4), 40.3)   # Lovometer snap
place(sfx, whoosh(0.7, True, 0.5), 46.0)                                     # lift-off
place(sfx, whoosh(0.6, True, 0.45), 47.3)                                    # through the clouds
for i, f in enumerate([1046, 1318, 1568, 2093, 2637, 3136]): place(sfx, chime(f, 0.8, 0.45), 53.95 + i * 0.07)   # CLOUD NINE shimmer
place(sfx, boom(1.2, 0.5), 54.0)
place(sfx, whoosh(1.2, True, 0.5), 65.0); place(sfx, boom(2.0, 0.55), 66.0); place(sfx, chime(1046, 1.5, 0.6) + chime(1568, 1.5, 0.5) + chime(2093, 1.5, 0.45), 66.0); place(sfx, whoosh(1.0, False, 0.5), 66.05)   # EVERYONE ON EARTH
place(sfx, bandpass(noise(2.4), 600, 2500) * np.sin(np.linspace(0, np.pi, int(2.4 * SR))) * 0.12, 72.0)      # ghost air
# silence window 77.6-80.0: riser then true silence of SFX except a faint wind bed (-48 dB)
place(sfx, reverse(whoosh(1.5, True, 0.55)), 76.1)
wind = bandpass(noise(2.4), 200, 900) * np.sin(np.linspace(0, np.pi, int(2.4 * SR))) * 0.004; place(sfx, wind, 77.6)
# the hug: boom at exactly 80.0, love-wave whoosh, chord
place(sfx, boom(2.6, 1.0), 80.0); place(sfx, whoosh(1.6, True, 0.7), 80.0); place(sfx, chime(523, 2.0, 0.6) + chime(659, 2.0, 0.5) + chime(784, 2.0, 0.5) + chime(1046, 2.0, 0.4), 80.0)
for i, c in enumerate(np.arange(80.8, 83.6, 0.4)): place(sfx, whoosh(0.35, True, 0.4 + 0.02 * i), c - 0.12); place(sfx, chime(440 * 2 ** (i / 6), 0.3, 0.35), c)
place(sfx, boom(1.2, 0.45), 83.55)
place(sfx, np.zeros(10), 87.6)
place(sfx, scratch(0.55) * 0.9, 88.8); place(sfx, boom(1.8, 0.8), 88.8 + 0.05); place(sfx, chime(392, 1.2, 0.6) + chime(587, 1.2, 0.5), 88.85)
# ------------------------------------------------------------------ music
M = read(os.path.join(AUD, 'music_stretched.wav')); t0 = json.load(open(os.path.join(AUD, '../music_stretch.json')))['t0']
mus = M[int(t0 * SR): int((t0 + 90) * SR)].copy(); mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
mus = norm_lufs(mus, -17)
# low-pass sweep 76.0 -> 77.6, digital silence 77.6 -> 80.0, slam at 80.0; hard cut 87.6 -> 88.8; one bar back at 88.8 with a tail
a, b = int(76.0 * SR), int(77.6 * SR)
for i in range(8):
    s0, s1 = a + i * (b - a) // 8, a + (i + 1) * (b - a) // 8; fc = 16000 * (350 / 16000) ** ((i + 1) / 8); mus[s0:s1] = lowpass(mus[a:b], fc)[s0 - a:s1 - a]
mus[a:b] *= np.linspace(1, 0.35, b - a)[:, None]
mus[b:int(80.0 * SR)] = 0.0
mus[int(87.6 * SR):int(88.8 * SR)] = 0.0
tail = int(1.2 * SR); mus[int(88.8 * SR) + int(1.6 * SR):] = 0.0 if int(88.8 * SR) + int(1.6 * SR) < N else mus[int(88.8 * SR) + int(1.6 * SR):]
mus[int(80.0 * SR):int(80.0 * SR) + int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
mus[int(88.8 * SR):int(88.8 * SR) + int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
# ------------------------------------------------------------------ voices, narration, roasts
voice = np.zeros((N, 2)); narr = np.zeros((N, 2)); duck_n = np.zeros(N); duck_v = np.zeros(N)
def load(p): return read(p)
for vid, t in VOICES:
    y = load(f'{AUD}/voices/{vid}.wav'); place(voice, y, t); m = np.abs(mono(y)) > 0.01 * np.abs(y).max(); idx = np.where(m)[0]; a, b = int(t * SR), min(N, int(t * SR) + (idx[-1] if len(idx) else len(y)))
    duck_v[a:b] = 1
    if vid == 'crowd_world': place(voice, load(f'{AUD}/voices/slowmo_scream.wav'), t)
for nid, t in NARR + ROASTS:
    y = load(f'{AUD}/narr/{nid}.wav'); y = norm_lufs(y, -17.5 if nid.startswith('n') else -19.0); place(narr, y, t); duck_n[int(t * SR):min(N, int(t * SR) + len(y))] = 1
def smooth_env(x, atk=0.02, rel=0.25):
    out = np.zeros_like(x); v = 0.0; ka, kr = np.exp(-1 / (atk * SR)), np.exp(-1 / (rel * SR))
    for i in range(len(x)):
        v = x[i] + ka * (v - x[i]) if x[i] > v else x[i] + kr * (v - x[i]); out[i] = v
    return out
g_duck = 10 ** (-5 * smooth_env(duck_n[::48].repeat(48)[:N] if False else duck_n) / 20) * 10 ** (-2.5 * smooth_env(duck_v) / 20)
sfx *= SFX_GAIN
mix = mus * g_duck[:, None] + voice + narr + sfx
mix[int(77.6 * SR):int(80.0 * SR)] = mus[int(77.6 * SR):int(80.0 * SR)] * 0 + (sfx[int(77.6 * SR):int(80.0 * SR)] + narr[int(77.6 * SR):int(80.0 * SR)])
# ------------------------------------------------------------------ master: -14 LUFS, limiter ceiling ~ -3.2 dB, then verify true peak after AAC elsewhere
g0 = 10 ** ((-14 - lufs(mix)) / 20); best = None
for extra in (1.0,):
    sf.write(os.path.join(AUD, 'premaster.wav'), mix * g0 * 10 ** (extra / 20), SR, subtype='FLOAT')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(AUD, 'premaster.wav'), '-af', 'alimiter=limit=0.69:attack=3:release=60:level=disabled', '-ar', '48000', os.path.join(AUD, 'final_mix.wav')], check=True)
    fm, _ = sf.read(os.path.join(AUD, 'final_mix.wav')); L = lufs(fm); print('extra gain', extra, 'dB -> LUFS', round(L, 2), 'peak', round(peak_db(fm), 2))
    if L >= -14.15: break
print('final: LUFS', round(lufs(fm), 2), 'sample peak dBFS', round(peak_db(fm), 2), 'dur', len(fm) / SR)
print('music digital zero 77.6-80.0:', float(np.abs(mus[int(77.6 * SR):int(80.0 * SR)]).max()))
print('cuts', len(CUTS), 'tick chimes 45')
