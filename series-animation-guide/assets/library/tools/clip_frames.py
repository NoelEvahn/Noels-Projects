# Library clip -> 30 fps PNG frames (with alpha) + count.json + its sound, for clipCard() in fx/clip.js.
# Usage: python tools/clip_frames.py clips/clap_cat.webm <episode>/build/clip [<episode>/build/audio/clip.wav]
# New green-screen clips: key them first, e.g.
#   ffmpeg -i in.mov -vf "fps=30,chromakey=0x00f100:0.2:0.06,despill=type=green,scale=480:-1,format=rgba" f%03d.png
#   ffmpeg -framerate 30 -i f%03d.png -i in.mov -map 0:v -map 1:a -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 1.2M -auto-alt-ref 0 -c:a libopus -shortest clips/<name>.webm
import sys, os, glob, subprocess
src, out = sys.argv[1], sys.argv[2]; wav = sys.argv[3] if len(sys.argv) > 3 else None
os.makedirs(out, exist_ok=True)
for f in glob.glob(os.path.join(out, 'f*.png')): os.remove(f)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-c:v', 'libvpx-vp9', '-i', src, '-vf', 'fps=30,format=rgba', '-start_number', '0', os.path.join(out, 'f%03d.png')], check=True)   # libvpx decoder keeps the alpha
if wav: os.makedirs(os.path.dirname(wav), exist_ok=True); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn', '-ac', '2', '-ar', '48000', wav], check=True)
n = len(glob.glob(os.path.join(out, 'f*.png'))); open(os.path.join(out, 'count.json'), 'w').write('{"n": %d}' % n); print('frames', n)
