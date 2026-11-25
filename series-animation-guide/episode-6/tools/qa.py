#!/usr/bin/env python3
# QA for episode 6: container facts, loudness + true peak after AAC, the phonk drop vs the reveal frame (48.4 s), first-second level, line onsets.
import subprocess, json, sys, re, os, numpy as np
mp4 = sys.argv[1]
p = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-show_entries', 'stream=codec_name,profile,width,height,r_frame_rate,nb_read_frames,duration,sample_rate,channels,pix_fmt', '-show_entries', 'format=size,duration', '-of', 'json', mp4]))
print(json.dumps(p, indent=1))
r = subprocess.run(['ffmpeg', '-nostats', '-i', mp4, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('\n'.join(l.strip() for l in r.splitlines()[-14:] if 'I:' in l or 'Peak' in l or 'LRA:' in l))
raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', mp4, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'])
y = np.frombuffer(raw, np.float32); SR = 48000
db = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
w = int(0.005 * SR); a = int(48.1 * SR); env = np.array([db(y[i:i + w]) for i in range(a, a + int(0.6 * SR), w)])
jump = [env[i:i + 4].mean() - env[max(0, i - 20):i].mean() for i in range(20, len(env) - 4)]; k = int(np.argmax(jump)) + 20
print('phonk drop onset (film s)', round(48.1 + k * 0.005, 3), 'expected 48.400 -> error ms', round((48.1 + k * 0.005 - 48.4) * 1000, 1))
print('first second RMS dB', round(db(y[:SR]), 1), '| whole film RMS dB', round(db(y), 1), '| 0.35 s before drop', round(db(y[int(48.05 * SR):int(48.4 * SR)]), 1), '| 0.4 s after drop', round(db(y[int(48.4 * SR):int(48.8 * SR)]), 1))
src = open(os.path.join(os.path.dirname(__file__), '../src/timeline.js')).read()
for m in re.finditer(r"\{ id: '(\w+)', t: ([\d.]+), kind", src):
    t = float(m.group(2)); seg = np.abs(y[int((t - 0.15) * SR):int((t + 0.5) * SR)])
    print(f"{m.group(1):<9} t={t:6.2f}  RMS in first 0.5 s {db(y[int(t * SR):int((t + 0.5) * SR)]):6.1f} dB")
