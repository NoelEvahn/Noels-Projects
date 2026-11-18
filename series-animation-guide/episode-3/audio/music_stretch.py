# Charlie's Inferno 145.995 BPM -> 150 BPM (x1.02743, pitch kept) so every doubling (2 s = 5 beats) lands on a beat.
# Writes build/audio/music_stretched.wav and build/music_stretch.json {t0}: the excerpt starts at the first downbeat (3.030 s, chosen by low-band accent).
import json, os
from common import *
y = read(os.path.join(ASSETS, 'charlies_inferno.mp3'))
z = rubberband(y, SR, tempo=1.02743)
sf.write(os.path.join(AUD, 'music_stretched.wav'), z, SR)
json.dump({'t0': 3.030, 'tempo': 1.02743}, open(os.path.join(BUILD, 'music_stretch.json'), 'w'))
print('music', len(z) / SR, 's')
