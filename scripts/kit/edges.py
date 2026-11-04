"""Edge map for edge-locked painting, derived from the engine's own pixels.

Canny works on brightness, so low-contrast boundaries vanish (a dark-brown
desk front against a violet rug has almost the same luminance) and the model
is free to repaint them. Here a boundary is drawn wherever two neighbouring
ENGINE pixels differ in colour, as a clean line at painting scale.

usage: python -I edges.py <guide.png> <out.png> <grid> [threshold=26]
"""
import sys

import numpy as np
from PIL import Image

src, out, g = sys.argv[1], sys.argv[2], int(sys.argv[3])
thr = float(sys.argv[4]) if len(sys.argv) > 4 else 26.0
big = Image.open(src).convert('RGB')
native = np.asarray(big.resize((big.width // g, big.height // g), Image.NEAREST)).astype(np.float32)
h, w, _ = native.shape
dx = np.linalg.norm(native[:, 1:] - native[:, :-1], axis=2) > thr   # boundary right of x
dy = np.linalg.norm(native[1:, :] - native[:-1, :], axis=2) > thr   # boundary below y
edges = np.zeros((h * g, w * g), np.uint8)
half = 1  # 2 px wide lines centred on the cell boundary
for y, x in zip(*np.nonzero(dx)):
    bx = (x + 1) * g
    edges[y * g:(y + 1) * g, bx - half:bx + half] = 255
for y, x in zip(*np.nonzero(dy)):
    by = (y + 1) * g
    edges[by - half:by + half, x * g:(x + 1) * g] = 255
Image.fromarray(edges, 'L').convert('RGB').save(out)
print('edges', out, f'{w * g}x{h * g}', f'{(edges > 0).mean():.1%} lit')
