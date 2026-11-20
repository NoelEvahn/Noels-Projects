import numpy as np, soundfile as sf, subprocess, os, json, tempfile
import scipy.signal as ss
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); ASSETS = os.path.join(HERE, '../../assets')
BUILD = os.environ.get('EP_BUILD', os.path.join(HERE, '../build')); AUD = os.path.join(BUILD, 'audio'); os.makedirs(AUD, exist_ok=True)
def read(path, sr=SR):
    y, s = sf.read(path, always_2d=True)
    if s != sr:
        import librosa
        y = np.stack([librosa.resample(y[:, c], orig_sr=s, target_sr=sr) for c in range(y.shape[1])], 1)
    return y
def mono(y): return y.mean(axis=1) if y.ndim > 1 else y
def stereo(y): return np.stack([y, y], 1) if y.ndim == 1 else y
def rubberband(y, sr, tempo=1.0, pitch=1.0):
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, 'a.wav'), os.path.join(d, 'b.wav'); sf.write(a, y, sr)
        flt = f'rubberband=tempo={tempo:.5f}:pitch={pitch:.5f}:pitchq=quality:transients=smooth'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', a, '-af', flt, b], check=True)
        out, _ = sf.read(b); return out
def fade(y, a=0.012, b=0.02, sr=SR):
    y = y.copy(); n = len(y); na, nb = int(a * sr), int(b * sr)
    if na: y[:na] *= np.linspace(0, 1, na).reshape(-1, *([1] * (y.ndim - 1)))
    if nb: y[-nb:] *= np.linspace(1, 0, nb).reshape(-1, *([1] * (y.ndim - 1)))
    return y
def bandpass(y, lo, hi, sr=SR, order=4):
    sos = ss.butter(order, [lo / (sr / 2), hi / (sr / 2)], 'band', output='sos'); return ss.sosfiltfilt(sos, y, axis=0)
def lowpass(y, f, sr=SR, order=4): return ss.sosfiltfilt(ss.butter(order, f / (sr / 2), 'low', output='sos'), y, axis=0)
def highpass(y, f, sr=SR, order=4): return ss.sosfiltfilt(ss.butter(order, f / (sr / 2), 'high', output='sos'), y, axis=0)
def reverb(y, sr=SR, rt=0.6, wet=0.25, seed=0, predelay=0.012):
    rng = np.random.default_rng(seed); n = int(rt * sr); t = np.arange(n) / sr
    ir = rng.standard_normal(n) * np.exp(-6.9 * t / rt); ir = lowpass(ir, 7000, sr); ir[: int(predelay * sr)] = 0; ir /= np.sqrt((ir ** 2).sum()) + 1e-9
    if y.ndim == 1: w = ss.fftconvolve(y, ir)[: len(y) + n]; return np.pad(y, (0, n))[: len(w)] * (1 - wet) + w * wet
    w = np.stack([ss.fftconvolve(y[:, c], ir if c == 0 else np.roll(ir, 37)) for c in range(y.shape[1])], 1)
    return np.pad(y, ((0, len(w) - len(y)), (0, 0))) * (1 - wet) + w * wet
def drive(y, k=2.0): return np.tanh(y * k) / np.tanh(k)
def lufs(y, sr=SR):
    import pyloudnorm as pn
    m = pn.Meter(sr); return m.integrated_loudness(y if y.ndim > 1 else np.stack([y, y], 1))
def norm_lufs(y, target, sr=SR):
    l = lufs(y, sr); return y * 10 ** ((target - l) / 20)
def peak_db(y): return 20 * np.log10(np.abs(y).max() + 1e-12)
def envelope(y, sr=SR, fps=30, win=0.02):
    m = np.abs(mono(y)); n = int(sr / fps); e = np.array([np.sqrt(np.mean(m[i * n:(i + 1) * n] ** 2)) for i in range(len(m) // n)]); return e
def place(buf, y, t, sr=SR, gain=1.0):
    i = int(round(t * sr)); y = stereo(y) * gain; n = min(len(y), len(buf) - i)
    if n > 0 and i >= 0: buf[i:i + n] += y[:n]
    return buf
