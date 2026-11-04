"""Draw geometry-first conditioning guides for a room kit.

The guide fixes orientation (flat, front-on), silhouette and layout; img2img
only adds material detail. Sprite masks are derived from the SAME shapes, so
cut-outs and foot anchors never depend on segmenting model output.

usage: python -I guides.py <kit.json> <out_dir>
"""
import json
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw

MAGENTA = (255, 0, 255)


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c)


def acoustic(w, h, rnd):
    img = Image.new('RGB', (w, h), (40, 34, 30))
    d = ImageDraw.Draw(img)
    cell = w // 4
    batten = max(4, cell // 16)
    for gy in range(h // cell):
        for gx in range(w // cell):
            x0, y0 = gx * cell + batten, gy * cell + batten
            x1, y1 = x0 + cell - 2 * batten, y0 + cell - 2 * batten
            base = (30, 92, 104) if (gx + gy) % 2 == 0 else (38, 52, 92)
            d.rectangle([x0, y0, x1, y1], fill=base)
            # Foam wedges: alternating horizontal / vertical ridges per panel.
            ridges = 6
            for i in range(ridges):
                t = i / ridges
                if (gx + gy) % 2 == 0:
                    yy = y0 + int(t * (y1 - y0))
                    d.rectangle([x0, yy, x1, yy + (y1 - y0) // (ridges * 2)], fill=shade(base, 1.35))
                else:
                    xx = x0 + int(t * (x1 - x0))
                    d.rectangle([xx, y0, xx + (x1 - x0) // (ridges * 2), y1], fill=shade(base, 1.35))
            d.rectangle([x0, y0, x1, y0 + 2], fill=shade(base, 0.6))
    return img, None


def planks(w, h, rnd):
    img = Image.new('RGB', (w, h), (120, 78, 48))
    d = ImageDraw.Draw(img)
    ph = h // 4
    for row in range(4):
        y0 = row * ph
        offset = (row * 3 % 4) * (w // 4)
        x = -offset
        while x < w:
            length = w // 2
            tone = rnd.uniform(0.85, 1.12)
            col = shade((136, 88, 52), tone)
            d.rectangle([x, y0, x + length, y0 + ph - 1], fill=col)
            for g in range(5):
                gy = y0 + rnd.randint(4, ph - 4)
                d.line([x + 4, gy, x + length - 4, gy + rnd.randint(-2, 2)], fill=shade(col, 0.88), width=2)
            # Seams must survive an 8x box downscale: draw them a full texel wide.
            d.rectangle([x, y0, x + 9, y0 + ph], fill=(62, 38, 24))
            x += length
        d.rectangle([0, y0, w, y0 + 9], fill=(58, 36, 22))
    return img, None


def beam(w, h, rnd):
    img = Image.new('RGB', (w, h), (64, 58, 82))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, h // 8], fill=(118, 106, 140))
    d.rectangle([0, h - h // 6, w, h], fill=(34, 30, 46))
    for x in range(0, w, w // 4):
        d.line([x, h // 8, x, h - h // 6], fill=(44, 40, 60), width=6)
        for yy in (h // 3, 2 * h // 3):
            d.ellipse([x + 16, yy - 6, x + 28, yy + 6], fill=(150, 140, 170))
    return img, None


def skyline(w, h, rnd):
    img = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        d.line([0, y, w, y], fill=(int(12 + 40 * t), int(12 + 20 * t), int(40 + 50 * t)))
    for _ in range(18):
        cx, cy = rnd.randint(0, w), rnd.randint(0, h // 2)
        r = rnd.randint(30, 80)
        d.ellipse([cx - r * 2, cy - r // 2, cx + r * 2, cy + r // 2], fill=(70, 44, 110))
    for _ in range(160):
        x, y = rnd.randint(0, w - 1), rnd.randint(0, int(h * 0.6))
        d.rectangle([x, y, x + 2, y + 2], fill=(230, 230, 255))
    x = 0
    while x < w:
        bw, bh = rnd.randint(24, 70), rnd.randint(40, 140)
        d.rectangle([x, h - bh, x + bw, h], fill=(22, 20, 44))
        for wy in range(h - bh + 8, h - 6, 14):
            for wx in range(x + 6, x + bw - 6, 12):
                if rnd.random() < 0.18:
                    d.rectangle([wx, wy, wx + 4, wy + 5], fill=(240, 196, 110))
        x += bw + rnd.randint(0, 16)
    return img, None


def sprite_canvas(w, h):
    img = Image.new('RGB', (w, h), MAGENTA)
    mask = Image.new('L', (w, h), 0)
    return img, mask, ImageDraw.Draw(img), ImageDraw.Draw(mask)


def diffuser(w, h, rnd):
    img, mask, d, m = sprite_canvas(w, h)
    pad = w // 16
    box = [pad, pad, w - pad, h - pad]
    d.rectangle(box, fill=(92, 58, 36))
    m.rectangle(box, fill=255)
    n = 7
    cw = (w - 4 * pad) / n
    for i in range(n):
        for j in range(n):
            depth = rnd.choice([0.7, 0.85, 1.0, 1.15, 1.3])
            x0, y0 = 2 * pad + i * cw, 2 * pad + j * cw
            d.rectangle([x0 + 2, y0 + 2, x0 + cw - 2, y0 + cw - 2], fill=shade((176, 120, 74), depth))
    return img, mask


def poster(w, h, rnd):
    img, mask, d, m = sprite_canvas(w, h)
    pad = w // 10
    box = [pad, pad, w - pad, h - pad]
    d.rectangle(box, fill=(30, 26, 40))
    m.rectangle(box, fill=255)
    d.rectangle([pad * 2, pad * 2, w - pad * 2, h - pad * 2], fill=(52, 30, 84))
    cx, cy, r = w // 2, h // 3, w // 4
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(16, 14, 22))
    d.ellipse([cx - r // 4, cy - r // 4, cx + r // 4, cy + r // 4], fill=(230, 160, 80))
    y = h * 2 // 3
    for x in range(pad * 2, w - pad * 2, 6):
        a = rnd.randint(4, h // 10)
        d.line([x, y - a, x, y + a], fill=(110, 230, 220), width=3)
    return img, mask


def speaker(w, h, rnd):
    img, mask, d, m = sprite_canvas(w, h)
    x0, x1 = w // 8, w - w // 8
    y0, y1 = h // 16, h - h // 16
    d.rectangle([x0, y0, x1, y1], fill=(28, 26, 32))
    m.rectangle([x0, y0, x1, y1], fill=255)
    d.rectangle([x0, y0, x0 + w // 16, y1], fill=(110, 70, 44))
    d.rectangle([x1 - w // 16, y0, x1, y1], fill=(110, 70, 44))
    cx = w // 2
    for cy, r in ((h // 4, w // 6), (h // 2 + h // 10, w // 3)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(70, 70, 80))
        d.ellipse([cx - r * 2 // 3, cy - r * 2 // 3, cx + r * 2 // 3, cy + r * 2 // 3], fill=(20, 20, 24))
        d.ellipse([cx - r // 4, cy - r // 4, cx + r // 4, cy + r // 4], fill=(90, 90, 100))
    return img, mask


def console(w, h, rnd):
    img, mask, d, m = sprite_canvas(w, h)
    top = h // 6
    desk_y = h // 2
    # Sloped control surface (trapezoid) over a wooden desk body and legs.
    surface = [(w // 12, desk_y), (w - w // 12, desk_y), (w - w // 6, top), (w // 6, top)]
    d.polygon(surface, fill=(44, 46, 60))
    m.polygon(surface, fill=255)
    body = [w // 14, desk_y, w - w // 14, desk_y + h // 6]
    d.rectangle(body, fill=(112, 72, 44))
    m.rectangle(body, fill=255)
    for lx in (w // 10, w - w // 10 - w // 24):
        leg = [lx, desk_y + h // 6, lx + w // 24, h - h // 16]
        d.rectangle(leg, fill=(70, 46, 30))
        m.rectangle(leg, fill=255)
    cols = 14
    for i in range(cols):
        x = w // 6 + 10 + i * (w * 2 // 3 - 20) / cols
        for k in range(3):
            yy = top + 14 + k * 18
            colour = rnd.choice([(230, 90, 80), (240, 200, 90), (110, 220, 210), (200, 200, 210)])
            d.ellipse([x, yy, x + 8, yy + 8], fill=colour)
        d.rectangle([x + 2, desk_y - 46, x + 6, desk_y - 10], fill=(18, 18, 24))
        fy = desk_y - 30 + rnd.randint(-10, 10)
        d.rectangle([x, fy, x + 8, fy + 6], fill=(220, 220, 230))
    return img, mask


GUIDES = {f.__name__: f for f in (acoustic, planks, beam, skyline, diffuser, poster, speaker, console)}


def main():
    kit = json.loads(Path(sys.argv[1]).read_text())
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for a in kit['assets']:
        w, h = a['guideSize']
        img, mask = GUIDES[a['guide']](w, h, random.Random(a['seed']))
        img.save(out / f"{a['assetId']}.guide.png")
        if mask is not None:
            mask.save(out / f"{a['assetId']}.mask.png")
        print('guide', a['assetId'], w, h, 'mask' if mask is not None else '')


if __name__ == '__main__':
    main()
