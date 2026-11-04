"""Deterministic pixel-art post-process for a generated room kit.

raw img2img output -> seamless wrap (textures) -> box downscale to the target
texel grid -> ONE shared palette for the whole kit (coherence) -> sprite
cut-out from the guide mask AND a magenta key -> 1px selective outline.
Writes the asset pack (PNG + pack.json with full provenance receipts).

usage: python -I post.py <kit.json> <work_dir> <pack_dir>
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SPRITES = {'decor-sprite', 'furniture-sprite'}


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
        w = t.reshape(shape)
        out = out * (1 - w) + rolled * w
    return out


def main():
    kit = json.loads(Path(sys.argv[1]).read_text())
    work, pack_dir = Path(sys.argv[2]), Path(sys.argv[3])
    pack_dir.mkdir(parents=True, exist_ok=True)
    small = {}
    for a in kit['assets']:
        raw = np.asarray(Image.open(work / f"{a['assetId']}.raw.png").convert('RGB'))
        tw, th = a['texels']
        if a['class'] in SPRITES:
            mask = np.asarray(Image.open(work / f"{a['assetId']}.mask.png").convert('L')) > 127
            mag = np.linalg.norm(raw.astype(np.int16) - np.array([255, 0, 255]), axis=2) > 110
            alpha = (mask & mag).astype(np.float32)
            # Average colour only over opaque source pixels (no magenta fringe).
            rgb = raw.astype(np.float32) * alpha[..., None]
            rgb_s = np.asarray(Image.fromarray(rgb.astype(np.uint8)).resize((tw, th), Image.BOX)).astype(np.float32)
            a_s = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).resize((tw, th), Image.BOX)).astype(np.float32) / 255
            rgb_s = rgb_s / np.maximum(a_s[..., None], 1e-3)
            small[a['assetId']] = (np.clip(rgb_s, 0, 255).astype(np.uint8), a_s >= 0.5)
        else:
            axes = (1,) if a['class'] == 'sky-layer' else (0, 1)
            arr = seamless(raw, axes) if a.get('tileable') else raw.astype(np.float32)
            img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).resize((tw, th), Image.BOX)
            small[a['assetId']] = (np.asarray(img), np.ones((th, tw), bool))

    # One palette for the whole kit. Every asset contributes the SAME number of
    # samples, so a large sky cannot crowd out a small sprite's colours.
    rs = np.random.default_rng(7)
    pool = np.concatenate([rgb[m][rs.integers(0, int(m.sum()), 4096)] for rgb, m in small.values()])
    # Style-pack anchor colours are always in the palette, so kits share one look.
    anchors = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in kit.get('paletteAnchors', [])]
    if anchors:
        pool = np.concatenate([pool, np.repeat(np.array(anchors, np.uint8), 2048, axis=0)])
    side = int(np.ceil(np.sqrt(len(pool))))
    sheet = np.zeros((side * side, 3), np.uint8)
    sheet[: len(pool)] = pool
    sheet[len(pool):] = pool[0]
    pal_img = Image.fromarray(sheet.reshape(side, side, 3)).quantize(colors=kit['paletteColors'], method=Image.Quantize.MEDIANCUT)
    palette = np.array(pal_img.getpalette()[: kit['paletteColors'] * 3]).reshape(-1, 3)

    records = []
    for a in kit['assets']:
        rgb, opaque = small[a['assetId']]
        q = np.asarray(Image.fromarray(rgb).quantize(palette=pal_img, dither=Image.Dither.NONE).convert('RGB'))
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
                        c = np.mean([q[p] for p in nbrs], axis=0) * 0.32
                        rgba[y, x] = [*c.astype(np.uint8), 255]
        out = pack_dir / f"{a['assetId']}.png"
        Image.fromarray(rgba, 'RGBA').save(out)
        data = out.read_bytes()
        receipt = json.loads((work / f"{a['assetId']}.receipt.json").read_text())
        rec = {
            'assetId': a['assetId'], 'class': a['class'], 'file': out.name,
            'width': int(rgba.shape[1]), 'height': int(rgba.shape[0]), 'pixelScale': 1,
            'stylePackId': kit['stylePackId'], 'projection': 'side-on-shallow-2.5d',
            'alphaMode': 'cutout' if a['class'] in SPRITES else 'opaque',
            'tileable': bool(a.get('tileable', False)),
            'collision': 'solid' if a['class'] == 'furniture-sprite' else 'none',
            'source': 'local-comfyui', 'licenseStatus': 'review-required', 'reviewStatus': 'candidate',
            'sha256': hashlib.sha256(data).hexdigest(),
            'provenance': {**receipt, 'postProcess': {'script': 'scripts/kit/post.py', 'paletteColors': kit['paletteColors'],
                           'seamless': bool(a.get('tileable')), 'cutout': 'guide-mask AND magenta-key' if a['class'] in SPRITES else None}},
        }
        if a.get('attachment') == 'floor':
            rec['projection'] = 'floor-plane-foreshortened'
        if 'attachment' in a:
            rec['attachment'] = a['attachment']
        if a['class'] == 'furniture-sprite':
            rec['footprint'] = {'w': a['footprint'][0], 'h': a['footprint'][1], 'backgroundRows': a['backgroundRows']}
            rec['category'] = a['category']
            rec['isDesk'] = bool(a.get('isDesk'))
            # Feet sit on the sprite's bottom edge; the collider is the footprint, not the art.
            rec['anchor'] = {'x': 0, 'y': int(rgba.shape[0])}
        records.append(rec)
        print('packed', a['assetId'], rgba.shape[1], 'x', rgba.shape[0])

    pack = {'schemaVersion': 1, 'id': kit['packId'], 'name': kit['name'], 'stylePackId': kit['stylePackId'],
            'palette': ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in palette], 'assets': records}
    (pack_dir / 'pack.json').write_text(json.dumps(pack, indent=2))
    # 4x review sheet (not part of the pack).
    tiles = [Image.open(pack_dir / f"{a['assetId']}.png").convert('RGBA') for a in kit['assets']]
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
