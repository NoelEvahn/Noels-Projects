#!/usr/bin/env python3
# Contact sheet of frames: sheet.py <framesdir> <out.jpg> <from_s> <to_s> <step_s> [cols] [tile_w]
import sys, os
from PIL import Image, ImageDraw
d, out, a, b, st = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
cols = int(sys.argv[6]) if len(sys.argv) > 6 else 10; tw = int(sys.argv[7]) if len(sys.argv) > 7 else 200
ts = []; t = a
while t < b - 1e-6: ts.append(t); t += st
ims = []
for t in ts:
    i = round(t * 30); p = os.path.join(d, f'f{i:05d}.jpg')
    if not os.path.exists(p): continue
    im = Image.open(p).convert('RGB'); th = int(im.height * tw / im.width); im = im.resize((tw, th)); ImageDraw.Draw(im).text((4, th - 14), f'{t:.1f}', fill=(255, 255, 255)); ims.append(im)
if not ims: sys.exit('no frames')
rows = (len(ims) + cols - 1) // cols; th = ims[0].height
sheet = Image.new('RGB', (cols * (tw + 3), rows * (th + 3)), (30, 30, 30))
for k, im in enumerate(ims): sheet.paste(im, ((k % cols) * (tw + 3), (k // cols) * (th + 3)))
sheet.save(out, quality=88); print(out, len(ims), 'frames')
