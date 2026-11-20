#!/usr/bin/env python3
# QA: container facts, loudness + true peak after AAC, the 77.6-80.0 silence window, slam alignment at film 81.6 (story frame 2400 = film 2448), voice onsets.
import subprocess, json, sys, numpy as np
mp4 = sys.argv[1]
p = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-show_entries', 'stream=codec_name,profile,width,height,r_frame_rate,nb_read_frames,duration,sample_rate,channels,pix_fmt', '-show_entries', 'format=size,duration', '-of', 'json', mp4]))
print(json.dumps(p, indent=1))
r = subprocess.run(['ffmpeg', '-nostats', '-i', mp4, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('\n'.join(l.strip() for l in r.splitlines()[-14:] if 'I:' in l or 'Peak' in l or 'LRA:' in l))
raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', mp4, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'])
y = np.frombuffer(raw, np.float32); SR = 48000
db = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
a, b = int((77.6 + 1.6) * SR), int((80.0 + 1.6) * SR)
print('silence window story 77.6-80.0 RMS dB', round(db(y[a:b]), 1), ' peak dB', round(20 * np.log10(np.abs(y[a:b]).max() + 1e-12), 1))
e = np.abs(y[int(81.4 * SR):int(81.9 * SR)]); on = np.argmax(e > 0.3 * e.max()) / SR + 81.4
print('slam onset (film s)', round(on, 4), 'expected 81.600 -> error ms', round((on - 81.6) * 1000, 1))
e = np.abs(y[:int(0.6 * SR)]); print('hook slam onset (film s)', round(np.argmax(e > 0.3 * e.max()) / SR, 4), 'expected ~0.200')
print('first second RMS dB', round(db(y[:SR]), 1), ' film 2-90 s RMS dB', round(db(y[2 * SR:90 * SR]), 1))
