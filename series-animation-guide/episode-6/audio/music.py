# Music stem for episode 6 (film time 0-70 s, 48 kHz stereo) -> build/audio/music.wav + music_report.json
# 1) Charlie's Inferno 146 -> 150 BPM (x1.02743, pitch kept), from the kick beat at 3.228 s of the stretched track (as ep5), at full level from frame 0
#    (hook rule: music loud on frame 1). Crossfades out 38.0 -> 45.2 (MUSIC.charlieOut).
# 2) X-COOL phonk (slowed), main section (assets/x_cool_phonk_slowed.mp3, intro removed per the user). Not stretched.
#    Enters at film 28.4 from asset 2.78 s = 20 s before the drop; the drop (asset 22.78 s, measured) lands on film 48.4 = Mom holding the foot.
#    Gain rises slowly from silence (ease-in, most of the rise in the last 8 s). Runs to the end, dips under the title card, fades out at 70.0.
import json, os, re, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(__file__))
from common import *
src = open(os.path.join(os.path.dirname(__file__), '../src/timeline.js')).read()
num = lambda k: float(re.search(k + r': ([\d.]+)', src).group(1))
DUR = float(re.search(r'DUR = ([\d.]+)', src).group(1)); N = int(round(DUR * SR))
P_IN, P_A0, P_DROP, DROP = num('phonkIn'), num('phonkAsset0'), num('phonkDropAsset'), num('drop')
CO = [float(x) for x in re.search(r'charlieOut: \[([\d.]+), ([\d.]+)\]', src).groups()]
rep = {}
ch = read(os.path.join(ASSETS, 'charlies_inferno.mp3')); chs = norm_lufs(rubberband(ch, SR, tempo=1.02743), -16.5)
C0 = 3.228
x = chs[int(C0 * SR): int(C0 * SR) + N]; x = np.pad(x, ((0, N - len(x)), (0, 0)))
g = np.ones(N); a, b = int(CO[0] * SR), int(CO[1] * SR); g[a:b] = np.cos(np.linspace(0, np.pi / 2, b - a)) ** 2; g[b:] = 0
x[:int(0.03 * SR)] *= np.linspace(0, 1, int(0.03 * SR))[:, None]
mus = x * g[:, None]
ph = norm_lufs(read(os.path.join(ASSETS, 'x_cool_phonk_slowed.mp3')), -16.0)
# measure the drop in this file (largest 10 ms RMS jump near the expected time) to keep the sync exact
m = mono(ph); w = int(0.01 * SR); e = np.array([np.sqrt(np.mean(m[i:i + w] ** 2)) for i in range(0, len(m) - w, w)])
lo, hi = int((P_DROP - 1.0) / 0.01), int((P_DROP + 1.0) / 0.01); d = 20 * np.log10(e + 1e-9)
jump = np.array([d[i:i + 5].mean() - d[i - 25:i].mean() for i in range(lo, hi)]); dm = (lo + int(np.argmax(jump))) * 0.01
rep['phonk_drop_measured'] = round(dm, 3); rep['phonk_drop_timeline'] = P_DROP
a0 = P_A0 + (dm - P_DROP)                         # keep exactly 20 s before the measured drop
i0 = int(a0 * SR); n = N - int(P_IN * SR); y = ph[i0:i0 + n]; y = np.pad(y, ((0, n - len(y)), (0, 0)))
u = np.clip(np.arange(n) / SR / (DROP - P_IN), 0, 1); gain = u ** 2.4          # ease-in: -inf -> 0 dB at the drop
gain = np.where(np.arange(n) / SR >= DROP - P_IN, 1.0, gain)
tt = P_IN + np.arange(n) / SR
gain *= np.where(tt >= 67.0, np.interp(tt, [67.0, 67.6, 69.2, 70.0], [1.0, 0.6, 0.6, 0.0]), 1.0)   # under the title card + outro, out at the loop
mus[int(P_IN * SR):] += y * gain[:, None]
sf.write(os.path.join(AUD, 'music.wav'), mus, SR, subtype='FLOAT')
rep.update(charlie=dict(from_stretched=C0, out=CO), phonk=dict(film_in=P_IN, asset_in=round(a0, 3), drop_film=round(P_IN + (dm - a0), 3)), dur=DUR)
json.dump(rep, open(os.path.join(AUD, 'music_report.json'), 'w'), indent=1); print(json.dumps(rep, indent=1))
