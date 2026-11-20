# Narration + Gerald roasts: Piper en_US-ryan-high (episodes 1-2 voice), natural speed (--length-scale only if a line overruns its slot), de-essed.
# Word timings by ASR (faster-whisper tiny.en) -> build/audio/words.json (absolute story times). n5 is shifted so the word "rules" starts on 62.0.
# PIPER_VOICE = path to en_US-ryan-high.onnx (download: huggingface.co/rhasspy/piper-voices, en/en_US/ryan/high/).
import json, os, re, subprocess, sys, tempfile
import numpy as np, soundfile as sf, librosa
sys.path.insert(0, os.path.dirname(__file__))
from common import *
PIPER_MODEL = os.environ['PIPER_VOICE']
def speak(text, ls):
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'l.wav')
        subprocess.run([sys.executable, '-m', 'piper', '-m', PIPER_MODEL, '-f', wav, '--length-scale', f'{ls:.3f}'], input=text.encode(), check=True, capture_output=True)
        return sf.read(wav)
def deess(y):
    y = highpass(y, 80); hf = highpass(y, 4500); env = np.sqrt(np.maximum(lowpass(hf ** 2, 30), 0) + 1e-10); thr = np.percentile(env, 70)
    return y - hf + hf * np.minimum(1.0, (thr / env) ** 0.8)
src = open(os.path.join(os.path.dirname(__file__), '../src/timeline.js')).read()
def grab(name):
    blk = re.search(r'export const %s = \[(.*?)\n\];' % name, src, re.S).group(1)
    return [dict(id=m.group(1), t=float(m.group(2)), text=m.group(3)) for m in re.finditer(r"id: '(\w+)', t: ([\d.]+), text: '([^']*)'", blk)]
LINES = grab('NARRATION') + grab('ROASTS')
# latest allowed end (story s): the next spoken event on the timeline minus 0.1 s
LIMITS = {'n1': 3.1, 'n2': 18.3, 'n3': 47.6, 'n4': 56.6, 'n5': 63.6, 'outro': 95.0, 'r1': 7.4, 'r2': 13.5, 'r3': 22.3, 'r4': 30.6, 'r5': 39.1, 'r6': 60.3, 'r7': 91.5}
from faster_whisper import WhisperModel
asr = WhisperModel('tiny.en', device='cpu', compute_type='int8')
os.makedirs(f'{AUD}/narr', exist_ok=True); WORDS, TIMES, report = {}, {}, []
def norm(w): return re.sub(r"[^a-z0-9']", '', w.lower())
for L in LINES:
    ls = 1.0
    for _ in range(6):
        y, sr = speak(L['text'], ls)
        y = librosa.resample(y.astype(np.float64), orig_sr=sr, target_sr=SR); nz = np.where(np.abs(y) > 0.01)[0]
        y = y[max(0, nz[0] - int(0.02 * SR)): min(len(y), nz[-1] + int(0.08 * SR))]
        dur = len(y) / SR
        if L['id'] == 'n5' or L['t'] + dur <= LIMITS[L['id']] or ls <= 0.8: break
        ls = max(0.8, ls * (LIMITS[L['id']] - L['t']) / dur * 0.98)
    z = fade(deess(y), 0.005, 0.03); dur = len(z) / SR
    z16 = librosa.resample(z, orig_sr=SR, target_sr=16000).astype('float32')
    segs, _ = asr.transcribe(z16, word_timestamps=True, language='en'); ws = [w for s in segs for w in s.words]
    toks = L['text'].split()
    if len(ws) == len(toks): rel = [(float(w.start), float(w.end)) for w in ws]
    else:   # proportional by letters
        tot = sum(len(t) for t in toks); a = 0; rel = []
        for tk in toks: b = a + len(tk) / tot * dur; rel.append((a, b)); a = b
    t0 = L['t']
    if L['id'] == 'n5':   # "rules" on the counter break
        i = [norm(x) for x in toks].index('rules'); t0 = round(62.0 - rel[i][0], 3)
    WORDS[L['id']] = [dict(w=tk, t0=round(t0 + a, 3), t1=round(t0 + b, 3)) for tk, (a, b) in zip(toks, rel)]
    TIMES[L['id']] = t0
    sf.write(f"{AUD}/narr/{L['id']}.wav", stereo(z), SR)
    heard = ' '.join(w.word.strip() for w in ws)
    report.append(dict(id=L['id'], t=t0, dur=round(dur, 2), end=round(t0 + dur, 2), limit=LIMITS[L['id']], length_scale=round(ls, 3), asr_words=len(ws), text_words=len(toks), heard=heard))
json.dump(WORDS, open(f'{AUD}/words.json', 'w')); json.dump(TIMES, open(f'{AUD}/narr_times.json', 'w')); json.dump(report, open(f'{AUD}/narr_report.json', 'w'), indent=1)
for r in report: print(r)
