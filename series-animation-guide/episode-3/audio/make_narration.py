# Piper (en_US-ryan-high) narration + Gerald roasts; word timings by ASR alignment (faster-whisper) for the captions.
import numpy as np, soundfile as sf, subprocess, json, os, re, tempfile
import librosa
from common import *
VOICE = os.environ.get('PIPER_VOICE', '/tmp/claude-0/-home-user-Noels-Projects/2970dd30-890b-5809-9aba-4641d8c5757b/scratchpad/ep3/voices/en_US-ryan-high.onnx')
PY = os.environ.get('PIPER_PY', '/tmp/claude-0/-home-user-Noels-Projects/2970dd30-890b-5809-9aba-4641d8c5757b/scratchpad/ep3/venv/bin/python')
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
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'l.wav')
        subprocess.run([PY, '-m', 'piper', '-m', VOICE, '-f', wav], input=L['text'].encode(), check=True, capture_output=True)
        y, sr = sf.read(wav)
    y = librosa.resample(y, orig_sr=sr, target_sr=SR)
    nz = np.where(np.abs(y) > 0.01)[0]; y = y[max(0, nz[0] - int(0.02 * SR)): min(len(y), nz[-1] + int(0.08 * SR))]
    tempo = 1.12 if L['id'].startswith('n') else 1.08
    lim = LIMITS.get(L['id'])
    for _ in range(4):
        z = rubberband(y, SR, tempo=tempo); dur = len(z) / SR
        if lim is None or L['t'] + dur <= lim: break
        tempo *= 1.06
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
