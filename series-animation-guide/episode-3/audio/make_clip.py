# Gerald's clap clip (user-supplied green-screen video, media/gerald_clap.mov) -> keyed 30 fps PNG frames + its audio.
# Output: build/clip/f000.png ... and build/audio/clip.wav. The page plays the frames on a billboard in the garden (S7).
import os, subprocess, glob
HERE = os.path.dirname(os.path.abspath(__file__)); EP = os.path.join(HERE, '..')
SRC = os.path.join(EP, 'media', 'gerald_clap.mov'); OUT = os.path.join(EP, 'build', 'clip'); os.makedirs(OUT, exist_ok=True)
for f in glob.glob(os.path.join(OUT, 'f*.png')): os.remove(f)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-vf', 'fps=30,chromakey=0x00f100:0.2:0.06,despill=type=green,scale=480:-1,format=rgba', '-start_number', '0', os.path.join(OUT, 'f%03d.png')], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-vn', '-ac', '2', '-ar', '48000', os.path.join(EP, 'build', 'audio', 'clip.wav')], check=True)
n = len(glob.glob(os.path.join(OUT, 'f*.png'))); open(os.path.join(OUT, 'count.json'), 'w').write('{"n": %d}' % n); print('clip frames', n)
