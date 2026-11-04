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


def exec_wall(w, h, rnd):
    img = Image.new('RGB', (w, h), (70, 38, 26))
    d = ImageDraw.Draw(img)
    pw = w // 4
    rail = int(h * 0.62)
    for i in range(4):
        x0 = i * pw
        d.rectangle([x0, 0, x0 + pw - 1, h], fill=(84, 46, 30))
        d.rectangle([x0, 0, x0 + 6, h], fill=(52, 28, 18))  # stile shadow
        for (y0, y1) in ((24, rail - 24), (rail + 28, h - 20)):
            d.rectangle([x0 + 22, y0, x0 + pw - 22, y1], fill=(100, 56, 36))
            d.rectangle([x0 + 22, y0, x0 + pw - 22, y0 + 5], fill=(130, 78, 48))
            d.rectangle([x0 + 22, y1 - 5, x0 + pw - 22, y1], fill=(56, 30, 20))
    d.rectangle([0, rail - 6, w, rail + 6], fill=(217, 169, 91))
    d.rectangle([0, rail + 6, w, rail + 10], fill=(110, 76, 34))
    return img, None


def parquet(w, h, rnd):
    img = Image.new('RGB', (w, h), (90, 52, 30))
    d = ImageDraw.Draw(img)
    s = 64
    for gy in range(h // s):
        for gx in range(w // s):
            x0, y0 = gx * s, gy * s
            horiz = (gx + gy) % 2 == 0
            for k in range(4):
                tone = rnd.uniform(0.85, 1.15)
                col = shade((112, 66, 38), tone)
                if horiz:
                    d.rectangle([x0, y0 + k * 16, x0 + s - 1, y0 + k * 16 + 15], fill=col)
                    d.rectangle([x0, y0 + k * 16 + 14, x0 + s - 1, y0 + k * 16 + 15], fill=(58, 32, 20))
                else:
                    d.rectangle([x0 + k * 16, y0, x0 + k * 16 + 15, y0 + s - 1], fill=col)
                    d.rectangle([x0 + k * 16 + 14, y0, x0 + k * 16 + 15, y0 + s - 1], fill=(58, 32, 20))
    return img, None


def arch_window(w, h, rnd):
    img, mask, d, m = sprite_canvas(w, h)
    pad = w // 10
    arch_r = (w - 2 * pad) // 2
    body = [pad, pad + arch_r, w - pad, h - pad]
    for dr, m_ in ((d, False), (m, True)):
        fill = 255 if m_ else (110, 70, 40)
        dr.rectangle(body, fill=fill)
        dr.pieslice([pad, pad, w - pad, pad + 2 * arch_r], 180, 360, fill=fill)
    inner = pad + 12
    ir = arch_r - 12
    d.rectangle([inner, pad + arch_r, w - inner, h - inner], fill=(16, 18, 60))
    d.pieslice([inner, pad + 12, w - inner, pad + 12 + 2 * ir], 180, 360, fill=(16, 18, 60))
    cx, cy = w // 2, h // 2
    for r in range(70, 6, -8):
        d.ellipse([cx - r, cy - r // 2, cx + r, cy + r // 2], outline=(120 + r // 2, 80, 200), width=4)
    for _ in range(40):
        x, y = rnd.randint(inner, w - inner), rnd.randint(pad + 20, h - inner)
        d.rectangle([x, y, x + 3, y + 3], fill=(240, 236, 255))
    d.rectangle([w // 2 - 4, pad + 20, w // 2 + 4, h - inner], fill=(217, 169, 91))
    d.rectangle([inner, h // 2 + 30, w - inner, h // 2 + 38], fill=(217, 169, 91))
    d.rectangle([pad - 8, h - pad - 4, w - pad + 8, h - pad + 10], fill=(217, 169, 91))
    m.rectangle([pad - 8, h - pad - 4, w - pad + 8, h - pad + 10], fill=255)
    return img, mask


def banner(w, h, rnd):
    img, mask, d, m = sprite_canvas(w, h)
    poly = [(w // 8, h // 12), (w - w // 8, h // 12), (w - w // 8, h - h // 6), (w // 2, h - h // 16), (w // 8, h - h // 6)]
    d.polygon(poly, fill=(74, 42, 134))
    m.polygon(poly, fill=255)
    d.line(poly + [poly[0]], fill=(217, 169, 91), width=8)
    d.rectangle([0, h // 12 - 8, w, h // 12 + 4], fill=(217, 169, 91))
    m.rectangle([0, h // 12 - 8, w, h // 12 + 4], fill=255)
    cx, cy = w // 2, h // 2
    for r in range(34, 4, -6):
        d.arc([cx - r, cy - r, cx + r, cy + r], 0 + r * 7, 230 + r * 7, fill=(185, 164, 255), width=5)
    d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(255, 255, 255))
    return img, mask


def rug(w, h, rnd):
    img, mask, d, m = sprite_canvas(w, h)
    box = [w // 16, h // 8, w - w // 16, h - h // 8]
    d.rectangle(box, fill=(70, 40, 120))
    m.rectangle(box, fill=255)
    d.rectangle([box[0] + 16, box[1] + 16, box[2] - 16, box[3] - 16], outline=(217, 169, 91), width=10)
    cx, cy = w // 2, h // 2
    d.ellipse([cx - 70, cy - 50, cx + 70, cy + 50], fill=(96, 60, 160))
    for r in range(48, 6, -10):
        d.arc([cx - r * 1.4, cy - r, cx + r * 1.4, cy + r], r * 9, 220 + r * 9, fill=(217, 169, 91), width=6)
    for x in range(box[0], box[2], 16):
        d.rectangle([x, box[1] - 10, x + 6, box[1]], fill=(217, 169, 91))
        d.rectangle([x, box[3], x + 6, box[3] + 10], fill=(217, 169, 91))
        m.rectangle([x, box[1] - 10, x + 6, box[3] + 10], fill=255)
    return img, mask


def bookshelf(w, h, rnd):
    img, mask, d, m = sprite_canvas(w, h)
    box = [w // 16, h // 24, w - w // 16, h - 2]
    d.rectangle(box, fill=(74, 40, 24))
    m.rectangle(box, fill=255)
    d.rectangle([box[0] - 6, box[1], box[2] + 6, box[1] + 24], fill=(120, 72, 42))
    m.rectangle([box[0] - 6, box[1], box[2] + 6, box[1] + 24], fill=255)
    shelves = 4
    top, bottom = box[1] + 34, box[3] - 24
    sh = (bottom - top) // shelves
    colours = [(168, 50, 58), (46, 90, 160), (217, 169, 91), (58, 138, 90), (106, 58, 138), (200, 120, 60)]
    for s_ in range(shelves):
        y1 = top + (s_ + 1) * sh
        d.rectangle([box[0] + 12, top + s_ * sh, box[2] - 12, y1 - 8], fill=(36, 20, 14))
        x = box[0] + 14
        while x < box[2] - 22:
            bw = rnd.randint(10, 18)
            bh = rnd.randint(int(sh * 0.55), sh - 12)
            d.rectangle([x, y1 - 8 - bh, x + bw, y1 - 9], fill=rnd.choice(colours))
            d.rectangle([x + 2, y1 - 8 - bh + 6, x + bw - 2, y1 - 8 - bh + 9], fill=(230, 200, 120))
            x += bw + 2
        d.rectangle([box[0], y1 - 8, box[2], y1], fill=(110, 66, 38))
    return img, mask


def exec_desk(w, h, rnd):
    img, mask, d, m = sprite_canvas(w, h)
    top = h // 4
    d.rectangle([0, top, w, top + h // 8], fill=(140, 84, 50))
    d.rectangle([0, top, w, top + 6], fill=(200, 140, 90))
    body = [8, top + h // 8, w - 8, h - 4]
    d.rectangle(body, fill=(86, 46, 28))
    m.rectangle([0, top, w, h - 4], fill=255)
    d.rectangle([24, top + h // 8 + 14, w - 24, top + h // 8 + 20], fill=(217, 169, 91))
    for x0 in (30, w - 150):
        d.rectangle([x0, top + h // 8 + 34, x0 + 120, h - 22], fill=(104, 58, 34))
        for k in range(3):
            yy = top + h // 8 + 44 + k * 26
            d.rectangle([x0 + 50, yy, x0 + 70, yy + 6], fill=(217, 169, 91))
    d.rectangle([w // 2 - 70, top + h // 8 + 40, w // 2 + 70, h - 30], fill=(70, 38, 22))
    return img, mask


def floor_lamp(w, h, rnd):
    img, mask, d, m = sprite_canvas(w, h)
    shade_box = [w // 8, h // 20, w - w // 8, h // 4]
    d.polygon([(w // 4, shade_box[1]), (w - w // 4, shade_box[1]), (shade_box[2], shade_box[3]), (shade_box[0], shade_box[3])], fill=(255, 196, 107))
    m.polygon([(w // 4, shade_box[1]), (w - w // 4, shade_box[1]), (shade_box[2], shade_box[3]), (shade_box[0], shade_box[3])], fill=255)
    d.rectangle([w // 2 - 5, shade_box[3], w // 2 + 5, h - 24], fill=(170, 130, 70))
    m.rectangle([w // 2 - 5, shade_box[3], w // 2 + 5, h - 24], fill=255)
    d.ellipse([w // 6, h - 30, w - w // 6, h - 4], fill=(110, 80, 40))
    m.ellipse([w // 6, h - 30, w - w // 6, h - 4], fill=255)
    return img, mask


def meeting_table(w, h, rnd):
    img, mask, d, m = sprite_canvas(w, h)
    top = int(h * 0.3)
    d.rectangle([4, top, w - 4, top + 26], fill=(168, 112, 70))
    d.rectangle([4, top, w - 4, top + 6], fill=(214, 160, 106))
    d.rectangle([0, top + 26, w, top + 44], fill=(110, 66, 40))
    m.rectangle([0, top, w, top + 44], fill=255)
    for lx in (14, 70, w - 90, w - 34):
        d.rectangle([lx, top + 44, lx + 20, h - 4], fill=(84, 50, 30))
        m.rectangle([lx, top + 44, lx + 20, h - 4], fill=255)
    return img, mask


# ── whole-room art (guides drawn in TEXEL units, scaled to the guide size) ──

class Tex:
    """Draw in texel coordinates on a canvas `scale` times larger."""

    def __init__(self, img, scale, mask=None):
        self.d, self.s = ImageDraw.Draw(img), scale
        self.m = ImageDraw.Draw(mask) if mask is not None else None

    def box(self, x0, y0, x1, y1):
        s = self.s
        return [round(x0 * s), round(y0 * s), round(x1 * s) - 1, round(y1 * s) - 1]

    def pt(self, x, y):
        return (round(x * self.s), round(y * self.s))

    def rect(self, x0, y0, x1, y1, c, solid=True):
        if x1 <= x0 or y1 <= y0:
            return
        self.d.rectangle(self.box(x0, y0, x1, y1), fill=c)
        if self.m is not None and solid:
            self.m.rectangle(self.box(x0, y0, x1, y1), fill=255)

    def ellipse(self, x0, y0, x1, y1, c):
        self.d.ellipse(self.box(x0, y0, x1, y1), fill=c)
        if self.m is not None:
            self.m.ellipse(self.box(x0, y0, x1, y1), fill=255)

    def pie(self, x0, y0, x1, y1, a0, a1, c):
        self.d.pieslice(self.box(x0, y0, x1, y1), a0, a1, fill=c)
        if self.m is not None:
            self.m.pieslice(self.box(x0, y0, x1, y1), a0, a1, fill=255)

    def poly(self, pts, c):
        self.d.polygon([self.pt(x, y) for x, y in pts], fill=c)
        if self.m is not None:
            self.m.polygon([self.pt(x, y) for x, y in pts], fill=255)


WOOD = (70, 38, 26)
WOOD_D = (46, 24, 16)
WOOD_L = (112, 64, 38)
GOLD = (217, 169, 91)
GOLD_D = (140, 96, 44)
NIGHT = (14, 14, 52)
VIOLET = (74, 42, 134)
BOOKS = [(168, 50, 58), (46, 90, 160), (217, 169, 91), (58, 138, 90), (106, 58, 138), (200, 120, 60), (120, 30, 40), (30, 60, 110)]


def bookcase(t, rnd, x0, y0, x1, y1, shelves):
    t.rect(x0, y0, x1, y1, WOOD_D)
    t.rect(x0, y0, x1, y0 + 3, WOOD_L)
    t.rect(x0, y0 + 3, x1, y0 + 4, GOLD)
    sh = (y1 - y0 - 6) / shelves
    for s_ in range(shelves):
        top = y0 + 5 + s_ * sh
        bottom = top + sh - 1.5
        t.rect(x0 + 1.5, top, x1 - 1.5, bottom, (28, 16, 12))
        x = x0 + 2
        while x < x1 - 3:
            if rnd.random() < 0.12:  # an object instead of books: globe, vase, box
                w = rnd.choice([4, 5])
                c = rnd.choice([(80, 150, 200), GOLD, (150, 70, 160), (200, 200, 220)])
                t.ellipse(x, bottom - w, x + w, bottom, c)
                x += w + 1
                continue
            bw = rnd.choice([1, 1.5, 2, 2])
            bh = rnd.uniform(sh * 0.55, sh - 2.5)
            col = rnd.choice(BOOKS)
            t.rect(x, bottom - bh, x + bw, bottom, col)
            t.rect(x, bottom - bh + 1.5, x + bw, bottom - bh + 2, GOLD)
            x += bw + 0.25
        t.rect(x0 + 1, bottom, x1 - 1, bottom + 1.5, WOOD_L)
    t.rect(x0, y0, x0 + 1.5, y1, WOOD_L)
    t.rect(x1 - 1.5, y0, x1, y1, WOOD_L)


def sconce(t, x, y):
    t.ellipse(x - 5, y - 5, x + 5, y + 5, (120, 82, 40))
    t.rect(x - 1.5, y - 2, x + 1.5, y + 3, GOLD)
    t.ellipse(x - 2, y - 5, x + 2, y - 1, (255, 241, 196))


def room_backdrop_exec(w, h, rnd):
    """Lead (Main) back wall, 184 x 92 texels: built-in bookcases, arched night
    window with curtains, star chart, clock, lit display cabinet, moulding."""
    W, H = 184, 92
    img = Image.new('RGB', (w, h), WOOD)
    t = Tex(img, w / W)
    for x in range(0, W, 12):
        t.rect(x, 8, x + 1, 68, WOOD_D)
    # Crown moulding + dentils
    t.rect(0, 0, W, 4, WOOD_D)
    t.rect(0, 4, W, 5.5, GOLD)
    for x in range(0, W, 3):
        t.rect(x, 5.5, x + 1.5, 7.5, WOOD_L)
    # Wainscot + chair rail
    t.rect(0, 68, W, 70, GOLD)
    t.rect(0, 70, W, H, (58, 30, 20))
    for x in range(2, W, 14):
        t.rect(x, 73, x + 11, 88, (78, 42, 28))
        t.rect(x, 73, x + 11, 74, WOOD_L)
    t.rect(0, 89, W, H, WOOD_D)
    # Left: floor-to-ceiling built-in bookcases
    bookcase(t, rnd, 2, 8, 29, 90, 5)
    bookcase(t, rnd, 30, 8, 57, 90, 5)
    # Pilasters with sconces
    for px in (58, 120):
        t.rect(px, 8, px + 6, 90, WOOD_L)
        t.rect(px + 1, 8, px + 5, 90, (96, 54, 32))
        sconce(t, px + 3, 40)
    # Centre: arched window with violet curtains
    cx = 92
    t.rect(cx - 23, 22, cx + 23, 66, GOLD_D)
    t.pie(cx - 23, 6, cx + 23, 40, 180, 360, GOLD_D)
    t.rect(cx - 21, 23, cx + 21, 64, NIGHT)
    t.pie(cx - 21, 8, cx + 21, 38, 180, 360, NIGHT)
    for r in range(16, 2, -2):
        t.d.arc(t.box(cx - r * 1.3, 36 - r * 0.7, cx + r * 1.3, 36 + r * 0.7), r * 25, r * 25 + 240,
                fill=(130 + r * 6, 90, 210), width=max(1, round(t.s * 1.2)))
    t.ellipse(cx - 2, 34, cx + 2, 38, (255, 240, 255))
    for _ in range(46):
        x, y = rnd.uniform(cx - 19, cx + 19), rnd.uniform(14, 63)
        t.rect(x, y, x + 0.6, y + 0.6, (240, 236, 255))
    t.rect(cx - 0.75, 8, cx + 0.75, 64, GOLD)
    t.rect(cx - 21, 44, cx + 21, 45.5, GOLD)
    t.rect(cx - 25, 64, cx + 25, 67, GOLD)
    for side in (-1, 1):
        x0 = cx + side * 21
        for k in range(4):
            xx = x0 + side * k * 1.6
            t.rect(min(xx, xx + side * 4), 9, max(xx, xx + side * 4), 66 - k, shade(VIOLET, 0.8 + 0.12 * (k % 2)))
        t.rect(min(x0, x0 + side * 8), 46, max(x0, x0 + side * 8), 48, GOLD)
    t.rect(cx - 30, 7.5, cx + 30, 9, GOLD)
    # Right: star chart, clock, display cabinet
    t.rect(128, 12, 160, 38, GOLD)
    t.rect(130, 14, 158, 36, (24, 22, 60))
    for _ in range(14):
        x, y = rnd.uniform(131, 157), rnd.uniform(15, 35)
        t.rect(x, y, x + 0.8, y + 0.8, (220, 210, 255))
    t.d.line([t.pt(133, 20), t.pt(141, 27), t.pt(150, 18), t.pt(155, 31)], fill=(185, 164, 255), width=max(1, round(t.s * 0.6)))
    t.ellipse(165, 14, 181, 30, GOLD)
    t.ellipse(167, 16, 179, 28, (236, 222, 190))
    t.rect(172.5, 18, 173.5, 22.5, (40, 30, 20))
    t.rect(173, 21.5, 176.5, 22.5, (40, 30, 20))
    t.rect(127, 42, 182, 70, WOOD_D)
    t.rect(127, 42, 182, 44, GOLD)
    for k, x in enumerate(range(129, 180, 13)):
        t.rect(x, 45, x + 11, 68, (40, 34, 70))
        t.rect(x, 56, x + 11, 57, WOOD_L)
        t.ellipse(x + 3, 47, x + 8, 52, [(185, 164, 255), (255, 196, 107), (90, 200, 220), GOLD][k % 4])
        t.rect(x + 2, 60, x + 9, 63, GOLD)
        t.rect(x + 4, 58, x + 7, 60, GOLD)
    return img, None


def room_floor_exec(w, h, rnd):
    """Lead (Main) floor, 192 x 48 texels, foreshortened (8 texel rows per tile
    of depth): parquet, gold border inlay, violet galaxy rug under the desk."""
    W, H = 192, 48
    img = Image.new('RGB', (w, h), (90, 52, 30))
    t = Tex(img, w / W)
    for gy in range(0, H, 4):
        for gx in range(-8, W, 8):
            off = 4 if (gy // 4) % 2 else 0
            tone = rnd.uniform(0.85, 1.15)
            t.rect(max(0, gx + off), gy, gx + off + 8, gy + 4, shade((112, 66, 38), tone))
            t.rect(gx + off + 7.5, gy, gx + off + 8, gy + 4, (58, 32, 20))
        t.rect(0, gy + 3.5, W, gy + 4, (58, 32, 20))
    t.rect(3, 2, W - 3, 2.6, GOLD)
    t.rect(3, H - 3, W - 3, H - 2.4, GOLD)
    t.rect(3, 2, 4.2, H - 2.4, GOLD)
    t.rect(W - 4.2, 2, W - 3, H - 2.4, GOLD)
    # Rug: ~6 x 3 tiles centred under the desk front.
    t.rect(50, 18, 142, 44, (58, 30, 100))
    t.rect(52, 19.5, 140, 42.5, GOLD)
    t.rect(53.5, 20.5, 138.5, 41.5, VIOLET)
    t.ellipse(78, 23, 114, 39, (96, 60, 160))
    for r in range(8, 1, -2):
        t.d.arc(t.box(96 - r * 2.2, 31 - r, 96 + r * 2.2, 31 + r), r * 40, r * 40 + 230, fill=GOLD, width=max(1, round(t.s * 0.7)))
    for x in range(50, 142, 3):
        t.rect(x, 44, x + 1, 45.5, GOLD)
    return img, None


def box_furniture(t, x0, x1, base, front_h, top_rows, top_c, front_c, edge_c):
    """A box in the engine's projection: front face `front_h` texels tall and a
    top face `top_rows` tiles deep = top_rows * 8 texels (rise 0.5), exactly as
    deep per row as the floor it stands on."""
    top_px = top_rows * 8
    t.rect(x0, base - front_h - top_px, x1, base - front_h, top_c)
    t.rect(x0, base - front_h - top_px, x1, base - front_h - top_px + 1, shade(top_c, 1.25))
    t.rect(x0, base - front_h - 1, x1, base - front_h, edge_c)
    t.rect(x0, base - front_h, x1, base, front_c)


def exec_desk_box(w, h, rnd):
    """64 x 32 texel executive desk, 4 x 2 tiles: 16-texel top face (2 rows of
    depth at rise 0.5) above a 16-texel carved front."""
    img, mask, _, _ = sprite_canvas(w, h)
    t = Tex(img, w / 64, mask)
    box_furniture(t, 0, 64, 32, 16, 2, (128, 74, 44), (86, 46, 28), GOLD)
    for x0 in (3, 43):
        t.rect(x0, 19, x0 + 18, 31, (104, 58, 34))
        for k in range(3):
            t.rect(x0 + 7, 21 + k * 3.6, x0 + 11, 22 + k * 3.6, GOLD)
    t.rect(23, 19, 41, 31, (62, 34, 20))
    t.rect(4, 17.5, 60, 18.2, GOLD_D)
    # Desk-top clutter painted into the surface: blotter, papers, inkwell.
    t.rect(18, 5, 34, 12, (60, 90, 70))
    t.rect(38, 6, 44, 10, (236, 226, 200))
    t.rect(8, 7, 11, 10, (30, 30, 40))
    return img, mask


def floor_lamp_box(w, h, rnd):
    """16 x 40 texel brass floor lamp with a pleated shade."""
    img, mask, _, _ = sprite_canvas(w, h)
    t = Tex(img, w / 16, mask)
    t.poly([(4, 2), (12, 2), (14, 11), (2, 11)], (255, 196, 107))
    for x in (5, 8, 11):
        t.rect(x, 3, x + 0.6, 10.5, (230, 160, 80), solid=False)
    t.rect(7.25, 11, 8.75, 35, GOLD)
    t.rect(6.5, 22, 9.5, 23, GOLD_D)
    t.ellipse(3, 34, 13, 39, GOLD_D)
    return img, mask


GUIDES = {f.__name__: f for f in (acoustic, planks, beam, skyline, diffuser, poster, speaker, console,
                                  exec_wall, parquet, arch_window, banner, rug, bookshelf, exec_desk, floor_lamp, meeting_table,
                                  room_backdrop_exec, room_floor_exec, exec_desk_box, floor_lamp_box)}


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
