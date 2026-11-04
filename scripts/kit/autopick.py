"""Pick the best candidate per piece for a mass render, and flag weak ones.

Shell (room) candidates: structure = correlation of low-resolution luminance
with the engine guide (walls vs floor, where the windows are); glass = share of
the window-glass mask that is still dark sky in the painting. A painting that
invented side walls or dropped a window scores low on both.

Furniture candidates: coverage of the engine silhouette by non-magenta paint,
minus spill outside it (the painting must not grow the piece).

usage: python -I autopick.py <work_dir> <jobs.json>   -> picks.json, pick-report.json
"""
import colorsys
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SHELL_FLOOR = {'structure': 0.35, 'glass': 0.5}
PIECE_FLOOR = {'coverage': 0.85, 'spill': 0.08}


def lum(img):
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def keyed(img):
    a = np.asarray(img.convert('RGB')).reshape(-1, 3) / 255.0
    h = np.array([colorsys.rgb_to_hsv(*p) for p in a[:: 1]])
    hue, sat, val = h[:, 0] * 360, h[:, 1], h[:, 2]
    return ((hue > 280) & (hue < 335) & (sat > 0.35) & (val > 0.35)).reshape(img.size[1], img.size[0])


def shell_score(work, guide_name, render):
    g = Image.open(work / f'{guide_name}.png')
    r = Image.open(work / render).resize(g.size, Image.LANCZOS)
    small = (48, max(8, round(48 * g.size[1] / g.size[0])))
    a, b = lum(g.resize(small, Image.BOX)).ravel(), lum(r.resize(small, Image.BOX)).ravel()
    structure = float(np.corrcoef(a, b)[0, 1]) if a.std() > 1 and b.std() > 1 else 0.0
    gp = work / f'{guide_name}.glass.png'
    glass = 1.0
    if gp.exists():
        m = np.asarray(Image.open(gp).convert('L').resize(g.size, Image.NEAREST)) > 127
        if m.any():
            glass = float((lum(r)[m] < 95).mean())
    ok = structure >= SHELL_FLOOR['structure'] and glass >= SHELL_FLOOR['glass']
    return {'structure': round(structure, 3), 'glass': round(glass, 3), 'score': round(0.6 * structure + 0.4 * glass, 3), 'ok': ok}


def piece_score(work, guide_name, render):
    mask = np.asarray(Image.open(work / f"{guide_name.replace('.guide', '.mask')}.png").convert('L')) > 127
    r = Image.open(work / render).convert('RGB').resize((mask.shape[1], mask.shape[0]), Image.LANCZOS)
    small = (256, 256)
    m = np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).resize(small, Image.NEAREST)) > 127
    paint = ~keyed(r.resize(small, Image.NEAREST))
    coverage = float((paint & m).sum() / max(1, m.sum()))
    spill = float((paint & ~m).sum() / max(1, m.sum()))
    ok = coverage >= PIECE_FLOOR['coverage'] and spill <= PIECE_FLOOR['spill']
    return {'coverage': round(coverage, 3), 'spill': round(spill, 3), 'score': round(coverage - 2 * spill, 3), 'ok': ok}


def main():
    work = Path(sys.argv[1])
    jobs = json.loads(Path(sys.argv[2]).read_text())['jobs']
    groups = {}
    for j in jobs:
        piece = re.sub(r'\.c\d+$', '', j['id'])
        if not (work / f"{j['id']}.png").exists():
            continue
        guide = j['guide'][:-4]  # strip .png
        s = shell_score(work, guide, f"{j['id']}.png") if j.get('shell') else piece_score(work, guide, f"{j['id']}.png")
        groups.setdefault(piece, []).append({'candidate': int(j['id'].rsplit('.c', 1)[1]), **s})
    picks, report = {}, {}
    for piece, rows in groups.items():
        best = max(rows, key=lambda r: (r['ok'], r['score']))
        picks[piece] = best['candidate']
        report[piece] = {'pick': best['candidate'], 'ok': best['ok'], 'candidates': rows}
        print(f"{piece}: c{best['candidate']} {'ok' if best['ok'] else 'BELOW FLOOR'} {best}")
    (work / 'picks.json').write_text(json.dumps(picks, indent=2))
    (work / 'pick-report.json').write_text(json.dumps(report, indent=2))
    weak = [p for p, r in report.items() if not r['ok']]
    print(f'{len(picks)} pieces picked; {len(weak)} below the floor: {weak}')


if __name__ == '__main__':
    main()
