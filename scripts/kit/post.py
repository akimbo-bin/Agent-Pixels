"""Deterministic pixel-art post-process for a generated room kit.

raw img2img output -> seamless wrap (textures) -> ONE shared palette for the
whole kit (coherence) -> dominant-colour downscale to the texel grid (crisp
edges; a box average turns 1-texel detail to mud) -> stray-pixel cleanup ->
sprite cut-out from the guide mask AND a magenta key -> 1px selective outline.

Quality floor: an asset with N candidates (<id>.c<k>.raw.png) is scored on
guide fidelity, detail density, stray-pixel noise and (sprites) silhouette
coverage. Candidates under any minimum are rejected; the best survivor ships.
If none survives, the asset is left out of the pack and reported, never
shipped below the floor. Scores go to <work>/quality.json.

usage: python -I post.py <kit.json> <work_dir> <pack_dir>
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SPRITES = {'decor-sprite', 'furniture-sprite'}
ROOM_ART = {'room-backdrop', 'room-floor'}
MAGENTA = np.array([255, 0, 255])

# Minimums every shipped asset must meet (see score()).
FLOOR = {'fidelity': 0.35, 'detail_min': 0.18, 'detail_max': 0.85, 'noise_max': 0.16, 'coverage': 0.9}


def seamless(arr, axes, band=0.18):
    """Cross-fade only a band at each edge with a half-rolled copy, so the
    texture wraps cleanly without ghosting the whole image."""
    out = arr.astype(np.float32)
    for axis in axes:
        n = out.shape[axis]
        rolled = np.roll(out, n // 2, axis=axis)
        x = np.arange(n)
        edge = np.minimum(x, n - 1 - x) / (band * n)
        t = np.clip(1 - edge, 0, 1) ** 1.5  # 1 at edges, 0 beyond the band
        shape = [1, 1, 1]
        shape[axis] = n
        out = out * (1 - t.reshape(shape)) + rolled * t.reshape(shape)
    return out


def lum(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def nearest(rgb, palette):
    """Palette index of every pixel (no dithering)."""
    flat = rgb.reshape(-1, 3).astype(np.int32)
    best = np.zeros(len(flat), np.int32)
    bestd = np.full(len(flat), 1 << 30)
    for k, c in enumerate(palette.astype(np.int32)):
        d = ((flat - c) ** 2).sum(1)
        m = d < bestd
        best[m], bestd[m] = k, d[m]
    return best.reshape(rgb.shape[:2])


def dominant_downscale(idx, opaque, tw, th, k):
    """Each texel takes the most frequent palette colour of its source block
    (transparent pixels don't vote); keeps hard pixel edges intact."""
    h, w = idx.shape
    fy, fx = h // th, w // tw
    idx = idx[: th * fy, : tw * fx].reshape(th, fy, tw, fx)
    op = opaque[: th * fy, : tw * fx].reshape(th, fy, tw, fx)
    counts = np.stack([((idx == c) & op).sum(axis=(1, 3)) for c in range(k)])
    small_opaque = op.mean(axis=(1, 3)) >= 0.5
    return counts.argmax(0), small_opaque


def stray_mask(idx, opaque):
    """Texels unlike all four neighbours (isolated specks)."""
    p = np.pad(idx, 1, mode='edge')
    c = p[1:-1, 1:-1]
    alone = (c != p[:-2, 1:-1]) & (c != p[2:, 1:-1]) & (c != p[1:-1, :-2]) & (c != p[1:-1, 2:])
    return alone & opaque


def clean(idx, opaque):
    """Replace isolated specks with their most common neighbour colour."""
    out = idx.copy()
    ys, xs = np.nonzero(stray_mask(idx, opaque))
    h, w = idx.shape
    for y, x in zip(ys, xs):
        nb = [idx[yy, xx] for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)) if 0 <= yy < h and 0 <= xx < w and opaque[yy, xx]]
        if nb:
            vals, cnt = np.unique(nb, return_counts=True)
            out[y, x] = vals[cnt.argmax()]
    return out


def score(idx, opaque, palette, guide_small, coverage):
    """Quality of one candidate at final resolution, before cleanup."""
    q = palette[idx].astype(np.float32)
    a, b = lum(q)[opaque], lum(guide_small.astype(np.float32))[opaque]
    fidelity = float(np.corrcoef(a, b)[0, 1]) if a.std() > 1e-3 and b.std() > 1e-3 else 0.0
    dx = (idx[:, 1:] != idx[:, :-1]) & opaque[:, 1:] & opaque[:, :-1]
    dy = (idx[1:, :] != idx[:-1, :]) & opaque[1:, :] & opaque[:-1, :]
    pairs = max(1, int((opaque[:, 1:] & opaque[:, :-1]).sum() + (opaque[1:, :] & opaque[:-1, :]).sum()))
    detail = float((dx.sum() + dy.sum()) / pairs)
    noise = float(stray_mask(idx, opaque).sum() / max(1, opaque.sum()))
    passed = (fidelity >= FLOOR['fidelity'] and FLOOR['detail_min'] <= detail <= FLOOR['detail_max']
              and noise <= FLOOR['noise_max'] and coverage >= FLOOR['coverage'])
    total = 0.45 * fidelity + 0.25 * min(detail / 0.5, 1) + 0.2 * (1 - noise / FLOOR['noise_max']) + 0.1 * coverage
    return {'fidelity': round(fidelity, 3), 'detail': round(detail, 3), 'noise': round(noise, 3),
            'coverage': round(coverage, 3), 'score': round(total, 3), 'passed': passed}


def load_candidate(work, a, raw_path):
    raw = np.asarray(Image.open(raw_path).convert('RGB'))
    tw, th = a['texels']
    guide = Image.open(work / f"{a['assetId']}.guide.png").convert('RGB')
    if guide.size != (raw.shape[1], raw.shape[0]):
        guide = guide.resize((raw.shape[1], raw.shape[0]), Image.NEAREST)
    if a['class'] in SPRITES:
        mask = np.asarray(Image.open(work / f"{a['assetId']}.mask.png").convert('L').resize((raw.shape[1], raw.shape[0]), Image.NEAREST)) > 127
        keyed = np.linalg.norm(raw.astype(np.int16) - MAGENTA, axis=2) > 110
        opaque = mask & keyed
        coverage = float(opaque.sum() / max(1, mask.sum()))
        arr = raw.astype(np.float32)
    else:
        opaque = np.ones(raw.shape[:2], bool)
        coverage = 1.0
        axes = (1,) if a['class'] == 'sky-layer' else (0, 1)
        arr = seamless(raw, axes) if a.get('tileable') else raw.astype(np.float32)
    rgb = np.clip(arr, 0, 255).astype(np.uint8)
    # Palette sampling image: box average over opaque pixels only.
    w_ = opaque.astype(np.float32)
    box = np.asarray(Image.fromarray((rgb * w_[..., None]).astype(np.uint8)).resize((tw, th), Image.BOX)).astype(np.float32)
    box_a = np.asarray(Image.fromarray((w_ * 255).astype(np.uint8)).resize((tw, th), Image.BOX)).astype(np.float32) / 255
    box = np.clip(box / np.maximum(box_a[..., None], 1e-3), 0, 255).astype(np.uint8)
    guide_small = np.asarray(guide.resize((tw, th), Image.BOX))
    return {'rgb': rgb, 'opaque': opaque, 'box': box, 'box_opaque': box_a >= 0.5, 'guide': guide_small, 'coverage': coverage}


def build_palette(kit, smalls):
    """One palette for the whole kit. Every asset contributes the SAME number
    of samples, so a large backdrop cannot crowd out a small sprite."""
    rs = np.random.default_rng(7)
    pool = np.concatenate([rgb[m][rs.integers(0, int(m.sum()), 4096)] for rgb, m in smalls])
    anchors = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in kit.get('paletteAnchors', [])]
    if anchors:
        pool = np.concatenate([pool, np.repeat(np.array(anchors, np.uint8), 2048, axis=0)])
    side = int(np.ceil(np.sqrt(len(pool))))
    sheet = np.zeros((side * side, 3), np.uint8)
    sheet[: len(pool)] = pool
    sheet[len(pool):] = pool[0]
    n = kit['paletteColors']
    pal_img = Image.fromarray(sheet.reshape(side, side, 3)).quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    return np.array(pal_img.getpalette()[: n * 3]).reshape(-1, 3)


def finish(c, a, palette):
    tw, th = a['texels']
    idx_hi = nearest(c['rgb'], palette)
    idx, opaque = dominant_downscale(idx_hi, c['opaque'], tw, th, len(palette))
    return idx, opaque


def main():
    kit = json.loads(Path(sys.argv[1]).read_text())
    work, pack_dir = Path(sys.argv[2]), Path(sys.argv[3])
    pack_dir.mkdir(parents=True, exist_ok=True)

    cands = {}
    for a in kit['assets']:
        n = a.get('candidates', 1)
        paths = [work / f"{a['assetId']}.c{k}.raw.png" for k in range(n)] if n > 1 else [work / f"{a['assetId']}.raw.png"]
        cands[a['assetId']] = [(p, load_candidate(work, a, p)) for p in paths if p.exists()]

    # Score every candidate against a palette drawn from all of them...
    rough = build_palette(kit, [(c['box'], c['box_opaque']) for v in cands.values() for _, c in v])
    report, chosen = {}, {}
    for a in kit['assets']:
        rows = []
        for p, c in cands[a['assetId']]:
            idx, op = finish(c, a, rough)
            rows.append({'file': p.name, **score(idx, op, rough, c['guide'], c['coverage'])})
        report[a['assetId']] = rows
        ok = [(r['score'], i) for i, r in enumerate(rows) if r['passed']]
        if ok:
            chosen[a['assetId']] = cands[a['assetId']][max(ok)[1]]
        print(a['assetId'], ' '.join(f"{r['file']}:{r['score']}{'' if r['passed'] else '(rejected)'}" for r in rows))
    (work / 'quality.json').write_text(json.dumps({'floor': FLOOR, 'assets': report}, indent=2))

    # ...then build the final palette from the winners only.
    palette = build_palette(kit, [(c['box'], c['box_opaque']) for _, c in chosen.values()])
    records = []
    for a in kit['assets']:
        if a['assetId'] not in chosen:
            print('NOT SHIPPED (below quality floor):', a['assetId'])
            continue
        raw_path, c = chosen[a['assetId']]
        idx, opaque = finish(c, a, palette)
        idx = clean(idx, opaque)
        q = palette[idx].astype(np.uint8)
        rgba = np.zeros((*q.shape[:2], 4), np.uint8)
        rgba[..., :3] = q
        rgba[..., 3] = np.where(opaque, 255, 0)
        if a['class'] in SPRITES:
            h, w = opaque.shape
            for y in range(h):
                for x in range(w):
                    if opaque[y, x]:
                        continue
                    nbrs = [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < h and 0 <= x + dx < w and opaque[y + dy, x + dx]]
                    if nbrs:
                        col = np.mean([q[p] for p in nbrs], axis=0) * 0.32
                        rgba[y, x] = [*col.astype(np.uint8), 255]
        out = pack_dir / f"{a['assetId']}.png"
        Image.fromarray(rgba, 'RGBA').save(out)
        data = out.read_bytes()
        receipt = json.loads(raw_path.with_name(raw_path.name.replace('.raw.png', '.receipt.json')).read_text())
        quality = next(r for r in report[a['assetId']] if r['file'] == raw_path.name)
        rec = {
            'assetId': a['assetId'], 'class': a['class'], 'file': out.name,
            'width': int(rgba.shape[1]), 'height': int(rgba.shape[0]), 'pixelScale': 1,
            'stylePackId': kit['stylePackId'], 'projection': 'side-on-shallow-2.5d',
            'alphaMode': 'cutout' if a['class'] in SPRITES else 'opaque',
            'tileable': bool(a.get('tileable', False)),
            'collision': 'solid' if a['class'] == 'furniture-sprite' else 'none',
            'source': 'local-comfyui', 'licenseStatus': 'review-required', 'reviewStatus': 'candidate',
            'sha256': hashlib.sha256(data).hexdigest(),
            'provenance': {**receipt, 'quality': quality,
                           'postProcess': {'script': 'scripts/kit/post.py', 'paletteColors': kit['paletteColors'], 'downscale': 'dominant-colour',
                                           'seamless': bool(a.get('tileable')), 'cutout': 'guide-mask AND magenta-key' if a['class'] in SPRITES else None}},
        }
        if a.get('attachment') == 'floor' or a['class'] == 'room-floor':
            rec['projection'] = 'floor-plane-foreshortened'
        if a['class'] == 'room-backdrop':
            rec['projection'] = 'back-wall-front-elevation'
        if a['class'] in ROOM_ART:
            r = a['room']
            rec['room'] = {'width': r[0], 'wallHeight': r[1], 'depth': r[2]}
        if 'attachment' in a:
            rec['attachment'] = a['attachment']
        if a['class'] == 'furniture-sprite':
            rec['footprint'] = {'w': a['footprint'][0], 'h': a['footprint'][1], 'backgroundRows': a['backgroundRows']}
            rec['category'] = a['category']
            rec['isDesk'] = bool(a.get('isDesk'))
            # Feet sit on the sprite's bottom edge; the collider is the footprint, not the art.
            rec['anchor'] = {'x': 0, 'y': int(rgba.shape[0])}
        records.append(rec)
        print('packed', a['assetId'], rgba.shape[1], 'x', rgba.shape[0], 'from', raw_path.name)

    pack = {'schemaVersion': 1, 'id': kit['packId'], 'name': kit['name'], 'stylePackId': kit['stylePackId'],
            'palette': ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in palette], 'assets': records}
    (pack_dir / 'pack.json').write_text(json.dumps(pack, indent=2))
    tiles = [Image.open(pack_dir / r['file']).convert('RGBA') for r in records]
    if tiles:
        W = sum(t.width * 4 + 8 for t in tiles)
        H = max(t.height * 4 for t in tiles)
        sheet = Image.new('RGBA', (W, H), (40, 40, 48, 255))
        x = 0
        for t in tiles:
            sheet.alpha_composite(t.resize((t.width * 4, t.height * 4), Image.NEAREST), (x, 0))
            x += t.width * 4 + 8
        sheet.save(work / 'kit-sheet-4x.png')


if __name__ == '__main__':
    main()
