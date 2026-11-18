#!/usr/bin/env python3
# QA: container facts, loudness + true peak of the final mp4's audio, counter checkpoints (printed from the shared timeline maths), digital silence in 77.6-80.0.
import subprocess, json, sys, re
mp4 = sys.argv[1]
p = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-show_entries', 'stream=codec_name,profile,width,height,r_frame_rate,nb_read_frames,duration,sample_rate,channels,pix_fmt', '-of', 'json', mp4]))
print(json.dumps(p['streams'], indent=1))
r = subprocess.run(['ffmpeg', '-nostats', '-i', mp4, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('\n'.join(l for l in r.splitlines()[-14:] if 'I:' in l or 'Peak' in l or 'LRA' in l))
sil = subprocess.run(['ffmpeg', '-nostats', '-ss', '77.7', '-t', '2.2', '-i', mp4, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('77.7-79.9 window:', [l.strip() for l in sil.splitlines() if 'max_volume' in l or 'mean_volume' in l])
ck = [0, 2, 4, 8, 14, 20, 28, 30, 34, 40, 44, 48, 54, 60, 66, 74, 80, 88]
print({t: f'{1 << (t // 2):,}' for t in ck})
