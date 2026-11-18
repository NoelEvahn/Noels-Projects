# Narration + Gerald roasts. Default: Piper en_US-ryan-high, the voice of episodes 1-2 (user: "perfect"); NARRATOR=kokoro for Kokoro. word timings by ASR alignment (faster-whisper) for the captions.
# Model files: KOKORO_DIR (default ../../../../series-deps/models) with kokoro-v1.0.onnx + voices-v1.0.bin. Voice: KOKORO_VOICE (default bm_george, dry British narrator).
import numpy as np, soundfile as sf, subprocess, json, os, re, tempfile
import librosa
from common import *
KDIR = os.environ.get('KOKORO_DIR', os.path.join(HERE, '../../../../series-deps/models'))
ENGINE = os.environ.get('NARRATOR', 'piper')
PIPER_MODEL = os.environ.get('PIPER_VOICE', os.path.join(KDIR, 'en_US-ryan-high.onnx'))
if ENGINE == 'kokoro':
    from kokoro_onnx import Kokoro
    tts = Kokoro(os.path.join(KDIR, 'kokoro-v1.0.onnx'), os.path.join(KDIR, 'voices-v1.0.bin'))
def speak(text, speed):
    if ENGINE == 'kokoro': return tts.create(text, voice=KVOICE, speed=speed, lang=KLANG)
    import sys
    with tempfile.TemporaryDirectory() as d:   # Piper CLI as in episodes 1-2; --length-scale < 1 reads faster (clean, no time-stretch)
        wav = os.path.join(d, 'l.wav')
        subprocess.run([sys.executable, '-m', 'piper', '-m', PIPER_MODEL, '-f', wav, '--length-scale', f'{1 / speed:.3f}'], input=text.encode(), check=True, capture_output=True)
        return sf.read(wav)
KVOICE = os.environ.get('KOKORO_VOICE', 'bm_george'); KLANG = 'en-gb' if KVOICE.startswith('b') else 'en-us'
def polish(y):
    # voice clean-up: rumble cut, de-ess (tame 'sss' hiss, the loud 'shh' the user heard), gentle warmth, soft top, tiny room
    y = highpass(y, 80)
    hf = highpass(y, 4500); env = np.sqrt(np.maximum(lowpass(hf ** 2, 30), 0) + 1e-10); thr = np.percentile(env, 70)
    g = np.minimum(1.0, (thr / env) ** 0.8); y = y - hf + hf * g
    if ENGINE == 'piper': return y          # keep the episode 1-2 sound: de-ess only
    y = y + 0.18 * lowpass(y, 250)          # a little body in the low-mids
    y = lowpass(y, 10500)
    return reverb(y, SR, 0.35, 0.06, 3)[: len(y) + int(0.15 * SR)]
src = open(os.path.join(os.path.dirname(__file__), '../src/timeline.js')).read()
def grab(name):
    blk = re.search(r'export const %s = \[(.*?)\n\];' % name, src, re.S).group(1)
    return [dict(id=m.group(1), t=float(m.group(2)), text=m.group(3)) for m in re.finditer(r"id: '(\w+)', t: ([\d.]+), text: '([^']*)'", blk)]
LINES = grab('NARRATION') + grab('ROASTS')
LIMITS = {'n1': 4.2, 'n2': 19.1, 'n3': 44.2, 'n4': 56.2, 'n5': 74.3}     # latest allowed end (s)
from faster_whisper import WhisperModel
asr = WhisperModel('tiny.en', device='cpu', compute_type='int8')
os.makedirs(f'{AUD}/narr', exist_ok=True); WORDS = {}; report = []
for L in LINES:
    # natural speed; if a line would overrun its slot, ask Kokoro to read faster (clean) instead of time-stretching (robotic)
    lim = LIMITS.get(L['id']); speed = 1.0
    for _ in range(5):
        y, sr = speak(L['text'], speed)
        y = librosa.resample(y, orig_sr=sr, target_sr=SR); nz = np.where(np.abs(y) > 0.01)[0]; y = y[max(0, nz[0] - int(0.02 * SR)): min(len(y), nz[-1] + int(0.08 * SR))]
        if lim is None or L['t'] + len(y) / SR <= lim: break
        speed = min(1.3, speed * (len(y) / SR) / max(0.5, lim - L['t']) * 1.02)
    tempo = speed; z = polish(y); dur = len(z) / SR
    z = fade(z, 0.005, 0.03)
    z16 = librosa.resample(z, orig_sr=SR, target_sr=16000).astype('float32')
    segs, _ = asr.transcribe(z16, word_timestamps=True, language='en'); ws = [w for s in segs for w in s.words]
    toks = L['text'].split(); words = []
    if len(ws) == len(toks):
        words = [dict(w=tk, t0=L['t'] + float(w.start), t1=L['t'] + float(w.end)) for tk, w in zip(toks, ws)]
    else:  # fall back to proportional timing by letters
        tot = sum(len(t) for t in toks); a = 0
        for tk in toks: b = a + len(tk) / tot * dur; words.append(dict(w=tk, t0=L['t'] + a, t1=L['t'] + b)); a = b
    heard = ' '.join(w.word.strip() for w in ws)
    WORDS[L['id']] = words; sf.write(f"{AUD}/narr/{L['id']}.wav", stereo(z), SR)
    report.append((L['id'], L['t'], round(dur, 2), round(L['t'] + dur, 2), round(tempo, 2), heard))
json.dump(WORDS, open(f'{AUD}/words.json', 'w'))
for r in report: print(r)
