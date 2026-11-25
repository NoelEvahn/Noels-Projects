# Key a meme clip whose background is green but shifts (light green, white flashes).
# Usage: ffmpeg -i in.mp4 -vf "fps=30,scale=480:-1:flags=lanczos" in/f%03d.png
#        python -I tools/key_clip.py in out     (needs numpy, scipy, pillow)
#        ffmpeg -framerate 30 -i out/f%03d.png -i in.mp4 -map 0:v -map 1:a -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 1.2M -auto-alt-ref 0 -c:a libopus -shortest clips/<name>.webm
# Background = green-dominant or near-white regions touching the frame edge; keeps only the largest blob (the subject).
import sys, glob, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, dst = sys.argv[1], sys.argv[2]
for p in sorted(glob.glob(os.path.join(src, '*.png'))):
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = g - np.maximum(r, b)
    mn, mx = a.min(-1), a.max(-1)
    cand = (green > 22) | ((mn > 190) & (mx - mn < 40))
    lab, n = nd.label(cand)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0]) | (green > 30)
    fg = nd.binary_opening(~bg, iterations=1)
    lab2, n2 = nd.label(fg)
    if n2:
        sizes = nd.sum(fg, lab2, range(1, n2 + 1)); keep = [int(np.argmax(sizes)) + 1]
        fg = np.isin(lab2, keep)
    fg = nd.binary_fill_holes(fg)
    alpha = nd.gaussian_filter(nd.binary_erosion(fg, iterations=1).astype(np.float32), 1.0)
    out = a.copy(); out[..., 1] = np.minimum(g, np.maximum(r, b) + 6)
    Image.fromarray(np.dstack([out, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA').save(os.path.join(dst, os.path.basename(p)))
print('done')
