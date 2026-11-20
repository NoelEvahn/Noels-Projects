# v3 sound layer (user feedback 2026-11-20: wind on the ears in the POV, the fireball, planets breaking, drone swooshes).
# add_v3(buf, st): adds the layer to a stereo SFX buffer (story time -> film time via st). make_audio.py calls it.
# Run alone (python audio/v3_sfx.py) to lay the layer over an existing audio/mix.wav for a quick review without rebuilding voices/music.
import os, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(__file__))
from common import SR, bandpass, lowpass, highpass, place

rng = np.random.default_rng(55)
def noise(d): return rng.standard_normal(int(d * SR))
def shape(n, a, r): e = np.ones(n); ia, ir = int(a * SR), int(r * SR); e[:ia] = np.linspace(0, 1, ia) if ia else 1; e[n - ir:] *= np.linspace(1, 0, ir) if ir else 1; return e
def norm(y): return y / (np.abs(y).max() + 1e-9)

def wind(d, gust=3.0, lo=250, hi=2600):
    """wind past the ears: band noise, gusting, a bit different left/right"""
    n = int(d * SR); t = np.arange(n) / SR; out = np.zeros((n, 2))
    for ch, ph in ((0, 0.0), (1, 1.7)):
        y = bandpass(noise(d), lo, hi); g = 0.55 + 0.45 * np.sin(2 * np.pi * gust * t + ph) * np.sin(2 * np.pi * 0.7 * t + ph * 2)
        out[:, ch] = norm(y) * g
    return out * shape(n, 0.25, 0.35)[:, None]
def roar(d):
    """fire: low rumble + crackle"""
    n = int(d * SR); y = norm(lowpass(noise(d), 380)) * 0.8
    crack = np.zeros(n); idx = rng.integers(0, n - 400, int(d * 60))
    for i in idx: crack[i:i + 300] += rng.standard_normal(300) * np.exp(-np.arange(300) / 60)
    y = y + norm(highpass(crack, 1500)) * 0.35
    return y * shape(n, 0.4, 0.5)
def boom(d=2.4):
    n = int(d * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * (42 + 70 * np.exp(-t * 5)) * t) * np.exp(-t * 1.8) + norm(lowpass(noise(d), 1800)) * np.exp(-t * 2.5) * 0.7
    return norm(y)
def rubble(d=1.6):
    n = int(d * SR); y = np.zeros(n)
    for i in rng.integers(0, int(n * 0.7), 40): L = int(rng.uniform(0.02, 0.08) * SR); y[i:i + L] += bandpass(rng.standard_normal(L), 150, 3000) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(0.3, 1)
    return norm(y) * np.exp(-np.arange(n) / SR * 1.5)
def whoosh(d=0.6, pan=0.0):
    n = int(d * SR); y = noise(d); out = np.zeros(n); k = 16
    for i in range(k):
        a, b = i * n // k, (i + 1) * n // k; fc = 300 * (14 ** ((i + 0.5) / k) if i < k / 2 else 14 ** (1 - (i + 0.5) / k)) + 200; out[a:b] = bandpass(y, fc * 0.6, min(fc * 1.6, 20000))[a:b]
    out = norm(out) * np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return np.stack([out * (1 - max(0, pan)), out * (1 + min(0, pan))], 1)
def fwoosh(d=0.35):
    """small fire whoosh for the burning ball"""
    n = int(d * SR); y = norm(bandpass(noise(d), 200, 1800)) * np.sin(np.linspace(0, np.pi, n)) ** 2
    return y

def add_v3(buf, st):
    p = lambda y, t, g: place(buf, y, st(t), SR, g)
    # round 2 (notes #9, #10, #13)
    p(boom(1.4), 4.15, 0.5); p(rubble(1.4), 4.2, 0.45)          # harder roof burst
    p(wind(1.4, gust=4, lo=300, hi=3200), 5.6, 0.75); p(whoosh(0.6, 0.4), 5.9, 0.45)   # light wind on the top-down face shot
    for i, t in enumerate([10.35, 10.79, 11.2, 11.66, 12.1, 12.52]):   # phone camera clicks on the Burj deck
        n = int(0.05 * SR); y = norm(highpass(noise(0.05), 2500)) * np.exp(-np.arange(n) / SR * 90); p(y, t, 0.18)
    p(boom(2.0), 16.4, 0.8); p(whoosh(0.9, 0.0), 16.3, 0.5)     # tearing out of the atmosphere
    p(roar(4.8), 13.4, 0.45)                         # he heats into a fireball (13.4-18.2)
    p(wind(1.7), 14.8, 0.85)                         # POV: wind on the ears
    p(whoosh(0.7, -0.5), 16.25, 0.55)                # cut to the drone orbit
    p(norm(highpass(noise(0.6), 3000)) * shape(int(0.6 * SR), 0.05, 0.5), 17.6, 0.2)   # the flames fizzle out in vacuum
    p(whoosh(0.8, 0.6), 29.9, 0.5); p(whoosh(0.8, -0.6), 30.9, 0.5)   # fast orbit passes
    p(roar(0.7), 34.4, 0.35); p(boom(2.6), 35.0, 1.0); p(rubble(1.8), 35.05, 0.55)   # Jupiter
    p(whoosh(0.9, -0.3), 41.5, 0.5)                  # drone fly-under
    p(whoosh(0.7, 0.3), 45.6, 0.35)                  # pull-back reveal
    p(wind(1.0, gust=6, lo=600, hi=5000), 50.4, 0.8)  # POV warp
    p(roar(2.0), 50.8, 0.35)
    for i, th in enumerate([50.86, 51.29, 51.62, 51.95, 52.29]): p(boom(1.6), th, 0.7 + 0.06 * i); p(rubble(1.2), th + 0.03, 0.4)   # v4: the chain of planets
    p(whoosh(1.0, 0.4), 53.3, 0.45)                  # nebula swoop
    p(fwoosh(0.5), 76.3, 0.4)                        # the ball catches fire
    for t in (76.6, 77.4, 78.2, 78.95): p(fwoosh(0.35), t, 0.3)   # trail whooshes between bounces (the music is silent from 77.6)
    p(whoosh(0.6, -0.4), 76.9, 0.3); p(whoosh(0.7, 0.4), 77.75, 0.3)   # the camera dives under him, then rises to the top view

if __name__ == '__main__':
    path = os.path.join(os.path.dirname(__file__), 'mix.wav')
    y, sr = sf.read(path); assert sr == SR, sr
    buf = np.zeros_like(y); add_v3(buf, lambda s: s + 1.6)
    out = y + buf * 10 ** (-8 / 20) * 1.6   # SFX bus level of make_audio.py (-8 dB) + make-up for the already limited bed
    pk = np.abs(out).max()
    if pk > 0.89: out *= 0.89 / pk
    sf.write(path, out, SR, subtype='PCM_24'); print('v3 layer added, peak', round(20 * np.log10(np.abs(out).max()), 2), 'dBFS')
