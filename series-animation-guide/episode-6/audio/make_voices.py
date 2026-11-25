# Every spoken line of episode 6, read from src/timeline.js LINES:
#   kokoro  : character dialogue, Kokoro TTS (user, 2026-11-25), one distinct voice per character, never the narrator's voice
#   lapeace : "la peace" performances from assets/la_peace.mp3 (rubberband pitch/tempo, measured with pyin)
#   moon    : la peace (slow, echo) + Kokoro "please stop."
#   narr    : Piper en_US-ryan-high narrator (episodes 1-2 voice), natural speed, --length-scale only if a line overruns, de-essed
# Writes build/audio/lines/<id>.wav, words.json (absolute word times for captions, ASR), voice_env.json (mouth curves, 30 fps), voice_report.json.
# Env: KOKORO_DIR (kokoro-v1.0.onnx + voices-v1.0.bin), PIPER_VOICE (en_US-ryan-high.onnx).
import json, os, re, subprocess, sys, tempfile
import numpy as np, soundfile as sf, librosa
sys.path.insert(0, os.path.dirname(__file__))
from common import *

src = open(os.path.join(os.path.dirname(__file__), '../src/timeline.js')).read()
blk = re.search(r'export const LINES = \[(.*?)\n\];', src, re.S).group(1)
LINES = []
for m in re.finditer(r"\{ id: '(\w+)', t: ([\d.]+), kind: '(\w+)'(.*?)\},?\n", blk):
    d = dict(id=m.group(1), t=float(m.group(2)), kind=m.group(3)); rest = m.group(4)
    for k in ('who', 'text', 'cap'):
        mm = re.search(k + r""": (['"])(.*?)\1""", rest)
        if mm: d[k] = mm.group(2)
    mm = re.search(r'max: ([\d.]+)', rest); d['max'] = float(mm.group(1)) if mm else None
    d['echo'] = 'echo: true' in rest; d['soft'] = 'soft: true' in rest
    LINES.append(d)
print(len(LINES), 'lines')

# ---------------- engines
from kokoro_onnx import Kokoro
KD = os.environ['KOKORO_DIR']; KOK = Kokoro(os.path.join(KD, 'kokoro-v1.0.onnx'), os.path.join(KD, 'voices-v1.0.bin'))
# character -> (Kokoro voice, base speed, pitch shift after TTS, drive, level LUFS)
CAST = {'mom': ('af_sarah', 1.08, 1.00, 1.8, -18.5), 'boy': ('am_puck', 1.05, 1.12, 1.2, -19.0), 'reporter': ('am_michael', 1.05, 1.0, 1.0, -20.0), 'moon': ('bm_lewis', 0.82, 0.92, 1.0, -20.0)}
def kokoro(text, who, speed):
    v, s0, p, dr, lv = CAST[who]
    ph = text.startswith('/')   # '/...' = IPA phonemes (interjections the text front-end mangles)
    y, sr = KOK.create(text[1:] if ph else text, voice=v, speed=s0 * speed, lang='en-us', is_phonemes=ph)
    y = librosa.resample(np.asarray(y, np.float64), orig_sr=sr, target_sr=SR)
    if p != 1.0: y = rubberband(y, SR, tempo=1.0, pitch=p)
    return trim(y)
def trim(y, thr=0.012, pre=0.015, post=0.06):
    nz = np.where(np.abs(y) > thr * max(1e-6, np.abs(y).max()) )[0]
    if not len(nz): return y
    return y[max(0, nz[0] - int(pre * SR)): min(len(y), nz[-1] + int(post * SR))]
PIPER = os.environ['PIPER_VOICE']
def piper(text, ls):
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'l.wav')
        subprocess.run([sys.executable, '-m', 'piper', '-m', PIPER, '-f', wav, '--length-scale', f'{ls:.3f}'], input=text.encode(), check=True, capture_output=True)
        y, sr = sf.read(wav)
    return trim(librosa.resample(y.astype(np.float64), orig_sr=sr, target_sr=SR), 0.01, 0.02, 0.08)
def deess(y):
    y = highpass(y, 80); hf = highpass(y, 4500); env = np.sqrt(np.maximum(lowpass(hf ** 2, 30), 0) + 1e-10); thr = np.percentile(env, 70)
    return y - hf + hf * np.minimum(1.0, (thr / env) ** 0.8)
# la peace sample
y0 = mono(read(os.path.join(ASSETS, 'la_peace.mp3')))
nz = np.where(np.abs(y0) > 0.02 * np.abs(y0).max())[0]; y0 = fade(y0[max(0, nz[0] - 240): nz[-1] + 1200], 0.004, 0.03)
def f0(y):
    f = librosa.pyin(np.asarray(y, np.float32), fmin=60, fmax=700, sr=SR, frame_length=2048, hop_length=256)[0]; f = f[~np.isnan(f)]
    return float(np.median(f)) if len(f) else float('nan')
F_SRC = f0(y0)
def calib(y, pitch, tempo):
    k = 1.0
    for _ in range(4):
        z = rubberband(y, SR, tempo=tempo, pitch=pitch * k); m = f0(z) / F_SRC
        if abs(m / pitch - 1) < 0.015: break
        k *= pitch / m
    return z, m
def echo(y, d, k, taps=3):
    out = np.pad(y, (0, int(d * SR * taps) + 10))
    for i in range(1, taps + 1): out[int(d * SR * i):int(d * SR * i) + len(y)] += y * k ** i
    return out
LAP = {   # who -> (pitch, tempo, fx)
    'lady': (1.15, 1.2, lambda z: reverb(z, SR, 0.35, 0.12, 1)),                                        # unbothered, quick, from a window
    'pilot': (1.10, 1.15, lambda z: reverb(drive(bandpass(z, 220, 5000), 1.6), SR, 0.3, 0.1, 2)),     # cockpit
    'nasa': (1.10, 1.12, lambda z: bandpass(drive(z, 2.2), 350, 3400)),                                # mission-control radio
    'moon': (0.9, 0.9, lambda z: reverb(echo(z, 0.25, 0.3, 2), SR, 0.6, 0.2, 3)),                    # slow, big, low
    'boy': (1.10, 0.95, lambda z: z),                                                                   # dry, close, defeated (final line)
}
from faster_whisper import WhisperModel
asr = WhisperModel('tiny.en', device='cpu', compute_type='int8')
def norm(w): return re.sub(r"[^a-z0-9']", '', w.lower())
def word_times(y, text):
    z16 = librosa.resample(np.asarray(mono(y), np.float64), orig_sr=SR, target_sr=16000).astype('float32')
    segs, _ = asr.transcribe(z16, word_timestamps=True, language='en'); ws = [w for s in segs for w in s.words]
    toks = text.split(); dur = len(y) / SR
    if len(ws) == len(toks): rel = [(float(w.start), float(w.end)) for w in ws]
    else:
        tot = sum(len(t) for t in toks); a = 0; rel = []
        for tk in toks: b = a + len(tk) / tot * dur; rel.append((a, b)); a = b
    return toks, rel, ' '.join(w.word.strip() for w in ws)

os.makedirs(f'{AUD}/lines', exist_ok=True)
WORDS, ENV, REP = {}, {}, []
for L in LINES:
    kind, who, note = L['kind'], L.get('who'), ''
    if kind == 'kokoro':
        sp = 1.0
        for _ in range(6):
            y = kokoro(L['text'], who, sp)
            if L['max'] is None or len(y) / SR <= L['max'] or sp >= 1.35: break
            sp = min(1.35, sp * len(y) / SR / L['max'] * 1.02)
        v, s0, p, dr, lv = CAST[who]
        y = drive(highpass(y, 90), dr)
        if L['echo']: y = reverb(echo(y, 0.22, 0.45, 4), SR, 1.6, 0.3, 7); note = 'echo across the universe'
        y = norm_lufs(fade(y, 0.004, 0.03), lv - (1.5 if L['echo'] else 0)); note += f' {v} speed {s0 * sp:.2f} pitch {p}'
    elif kind == 'lapeace':
        p, tp, fx = LAP[who]; z, m = calib(y0, p, tp); y = norm_lufs(fade(fx(z), 0.002, 0.03), -21.0 if L['soft'] else -19.5); note = f'la peace pitch {m:.3f} tempo {tp}'
    elif kind == 'moon':
        p, tp, fx = LAP['moon']; z, m = calib(y0, p, tp); a = fx(z)
        b = kokoro(L['text'], 'moon', 1.0); b = reverb(b, SR, 0.8, 0.2, 4)
        a = trim(a, 0.02, 0.0, 0.05); gap = int(0.08 * SR); y = np.concatenate([norm_lufs(a, -19.5), np.zeros(gap), norm_lufs(b, -20.0)]); y = fade(y[: int(L['max'] * SR)], 0.002, 0.12); note = 'la peace (slow echo) + Kokoro bm_lewis "please stop."'
    else:   # narr
        ls = 1.0
        for _ in range(6):
            y = piper(L['text'], ls)
            if len(y) / SR <= L['max'] or ls <= 0.78: break
            ls = max(0.78, ls * L['max'] / (len(y) / SR) * 0.98)
        y = norm_lufs(fade(deess(y), 0.005, 0.03), -16.5); note = f'piper ryan length-scale {ls:.3f}'
    dur = len(y) / SR
    if kind in ('kokoro', 'narr', 'moon'):
        text = L['text'] if kind != 'moon' else 'la peace please stop.'
        if text.startswith('/'): text = L['cap'].title()
        toks, rel, heard = word_times(y, text)
        if kind == 'moon': toks = ['LA', 'PEACE…', 'PLEASE', 'STOP.']
        WORDS[L['id']] = [dict(w=tk, t0=round(L['t'] + a, 3), t1=round(L['t'] + b, 3)) for tk, (a, b) in zip(toks, rel)]
    else: heard = ''
    e = envelope(y, SR, 30); ENV[L['id']] = [round(float(x), 3) for x in np.clip(e / (e.max() + 1e-9) * 1.3, 0, 1)]
    sf.write(f"{AUD}/lines/{L['id']}.wav", stereo(y), SR)
    REP.append(dict(id=L['id'], kind=kind, who=who, t=L['t'], dur=round(dur, 2), end=round(L['t'] + dur, 2), max=L['max'], heard=heard, note=note.strip(), f0=round(f0(y), 1)))
json.dump(WORDS, open(f'{AUD}/words.json', 'w')); json.dump(ENV, open(f'{AUD}/voice_env.json', 'w')); json.dump(REP, open(f'{AUD}/voice_report.json', 'w'), indent=1)
# overlap check: every line must end before the next starts
srt = sorted(REP, key=lambda r: r['t'])
for a, b in zip(srt, srt[1:]):
    flag = '  <-- OVERLAP' if a['end'] > b['t'] - 0.05 else ''
    print(f"{a['id']:<9} {a['t']:6.2f}-{a['end']:6.2f}  ({a['dur']:.2f}s) next {b['id']} {b['t']:.2f}{flag}   {a['note']} | {a['heard']}")
r = srt[-1]; print(f"{r['id']:<9} {r['t']:6.2f}-{r['end']:6.2f}  ({r['dur']:.2f}s)  {r['note']} | {r['heard']}")
