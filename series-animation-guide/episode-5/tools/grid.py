#!/usr/bin/env python3
# grid.py <out.jpg> <tile_w> <cols> <frame.jpg>...   labelled contact grid of specific frames
import sys, os
from PIL import Image, ImageDraw
out, tw, cols = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); fs = sys.argv[4:]
ims = []
for f in fs:
    im = Image.open(f).convert('RGB'); th = int(im.height * tw / im.width); im = im.resize((tw, th)); i = int(os.path.basename(f)[1:6]); ImageDraw.Draw(im).text((4, 4), f'f{i} s{i/30-1.6:.2f}', fill=(255, 255, 0)); ims.append(im)
rows = (len(ims) + cols - 1) // cols; th = ims[0].height
sh = Image.new('RGB', (cols * (tw + 4), rows * (th + 4)), (40, 40, 40))
for k, im in enumerate(ims): sh.paste(im, ((k % cols) * (tw + 4), (k // cols) * (th + 4)))
sh.save(out, quality=88); print(out)
