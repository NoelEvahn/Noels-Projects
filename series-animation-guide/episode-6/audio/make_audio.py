# Final mix for episode 6 (film 0-70 s) -> build/audio/final_mix.wav + audio/mix.wav + build/audio/mix_report.json
# Inputs: build/audio/music.wav (music.py), build/audio/lines/*.wav (make_voices.py). SFX: ONLY files from assets/sfx/ (user rule), on a bus ~8 dB under.
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(__file__))
from common import *
src = open(os.path.join(os.path.dirname(__file__), '../src/timeline.js')).read()
DUR = float(re.search(r'DUR = ([\d.]+)', src).group(1)); N = int(round(DUR * SR))
LINES = [(m.group(1), float(m.group(2)), m.group(3)) for m in re.finditer(r"\{ id: '(\w+)', t: ([\d.]+), kind: '(\w+)'", src)]
SFXD = os.path.join(ASSETS, 'sfx'); _c = {}
def S(name):
    if name not in _c: _c[name] = mono(read(os.path.join(SFXD, name + '.mp3')))
    return _c[name]
sfx = np.zeros((N, 2)); big = np.zeros((N, 2))
def put(y, t, g=1.0, buf=None): place(sfx if buf is None else buf, y, t, SR, g)
# ---- counter ticks: a bass hit + a small pop on every doubling (2 .. 34), glitchier from 26
bass = lowpass(S('reveal/reveal_vine_boom'), 160)
for k, tk in enumerate(range(2, 36, 2)):
    put(bass, tk, 0.55 if tk < 26 else 0.4); put(S('popup/pop_deeper'), tk, 0.35)
for i in range(10): put(S('popup/click'), 26.0 + i * 0.19 + (i % 3) * 0.03, 0.35)             # NASA screen glitch
for i in range(8): put(S('popup/click'), 35.55 + i * 0.07, 0.4)                                 # ERROR
# ---- hook + build gags
put(S('popup/pop'), 2.25, 0.7)                     # the tile bonks Mom
put(S('zoom/whoosh_2'), 6.55, 0.4)                 # curtains snap shut
put(S('popup/pop'), 7.45, 0.45)                    # poke the crown
put(S('transition/camera_shutter'), 9.0, 0.6)      # selfie
put(S('popup/click'), 9.2, 0.8); put(S('popup/click'), 9.24, 0.6)   # phone screen cracks
put(S('zoom/whoosh'), 11.85, 0.45); put(S('zoom/whoosh_2'), 13.05, 0.45)   # helicopter passes / flees
put(S('zoom/whoosh_deep'), 15.0, 0.25)             # the cloud moves with his hand
put(S('zoom/whoosh'), 24.2, 0.35)                  # out of the atmosphere
# ---- chaos
put(S('zoom/whoosh_2'), 32.5, 0.4)                 # grabs the Moon
put(S('zoom/whoosh_2'), 34.2, 0.35)                # spins it
for i in range(3): put(S('zoom/whoosh_2'), 38.2 + 0.9 * i + 0.45, 0.25)     # Earth tossed hand to hand
put(S('zoom/whoosh'), 40.6, 0.4); put(S('popup/pop_deeper'), 41.1, 0.8)     # satellite -> nose
# ---- the twist (the phonk carries the build; the payoff is layered on the drop)
put(S('zoom/whoosh_deep'), 47.45, 0.6)                                          # the foot comes down
put(S('reveal/reveal_vine_boom'), 47.8, 0.55)                                    # impact (under the drop)
put(S('reveal/magic_reveal'), 48.4, 0.7, big); put(S('reveal/reveal'), 48.4, 0.55, big)   # superhero power-up on the drop
put(S('zoom/whoosh_cinematic'), 53.85, 0.6)                                     # she launches the foot
put(S('zoom/whoosh_deep'), 55.0, 0.45)                                          # he flies backwards
put(S('zoom/whoosh_2'), 57.8, 0.5)                                              # she jumps into space
put(S('reveal/reveal_vine_boom'), 58.8, 0.85, big); put(S('popup/pop_deeper'), 58.8, 0.7)  # PUNCH
put(S('zoom/whoosh'), 60.25, 0.4); put(S('zoom/whoosh'), 60.5, 0.45); put(S('zoom/whoosh_deep'), 60.75, 0.6)   # hammer spin + release
# ---- landing + exit
put(S('zoom/whoosh_deep'), 62.6, 0.5); put(S('reveal/reveal_vine_boom'), 62.85, 0.85, big); put(S('popup/pop'), 62.9, 0.5)
put(S('popup/pop_deeper'), 63.55, 0.6)                                          # Mom lands on his chest
put(S('reveal/reveal_2'), 67.0, 0.6)                                            # title card
sfx *= 10 ** (-8 / 20)
# ---- music + voices
mus = read(f'{AUD}/music.wav')[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
voice = np.zeros((N, 2)); dv = np.zeros(N); rep = {}
for lid, t, kind in LINES:
    y = read(f'{AUD}/lines/{lid}.wav'); place(voice, y, t); a = int(t * SR); dv[a:a + len(y)] = 1; rep[lid] = round(len(y) / SR, 2)
def smooth_env(x, atk=0.03, rel=0.25):
    import scipy.signal as ss
    k = np.exp(-1 / (rel * SR)); y = ss.lfilter([1 - k], [1, -k], x); k2 = np.exp(-1 / (atk * SR)); return np.maximum(y, ss.lfilter([1 - k2], [1, -k2], x))
duck = 10 ** (-6 * np.clip(smooth_env(dv), 0, 1) / 20)
duck[int(48.3 * SR):int(49.6 * SR)] = np.maximum(duck[int(48.3 * SR):int(49.6 * SR)], 1.0)   # never duck the drop
dip = np.ones(N); a0, a1 = int(48.05 * SR), int(48.395 * SR); dip[a0:a1] = np.linspace(1.0, 10 ** (-12 / 20), a1 - a0)   # suck the air out right before the drop
sfx[a0:a1] *= dip[a0:a1, None]; voice[a0:a1] *= dip[a0:a1, None]
mix = mus * (duck * dip)[:, None] * 10 ** (-2 / 20) + voice + sfx + big * 10 ** (-5 / 20)
g0 = 10 ** ((-14 - lufs(mix)) / 20)
for extra in (0.0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.5):
    sf.write(f'{AUD}/premaster.wav', mix * g0 * 10 ** (extra / 20), SR, subtype='FLOAT')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{AUD}/premaster.wav', '-af', 'alimiter=limit=0.69:attack=3:release=60:level=disabled', '-ar', '48000', '-c:a', 'pcm_s24le', f'{AUD}/final_mix.wav'], check=True)
    fm, _ = sf.read(f'{AUD}/final_mix.wav'); L = lufs(fm)
    if L >= -14.15: break
fm = fm[:N]
def win(t, d=0.4): i = int(t * SR); return round(20 * np.log10(np.sqrt(np.mean(fm[i:i + int(d * SR)] ** 2)) + 1e-9), 1)
out = dict(lufs=round(L, 2), sample_peak_db=round(peak_db(fm), 2), dur=len(fm) / SR, extra_gain=extra, first_second_db=win(0, 1.0), rms_drop=win(48.4), rms_pre_drop=win(47.9, 0.4), rms_punch=win(58.8), line_durations=rep)
json.dump(out, open(f'{AUD}/mix_report.json', 'w'), indent=1); print(json.dumps({k: v for k, v in out.items() if k != 'line_durations'}, indent=1))
subprocess.run(['cp', f'{AUD}/final_mix.wav', os.path.join(os.path.dirname(__file__), 'mix.wav')], check=True)
