"""Turn bake-off renders (room shell + isolated furniture) into one asset pack.

Shell: resized back to the guide size, then one flat colour per guide cell
(median), giving the engine's native room pixels. It is a room-plate WITHOUT
furniture: the engine draws every piece on top as its own sprite, so
occlusion is exact and furniture can be moved or deleted without a repaint.

Furniture: the guide put the engine sprite at a known offset and integer
scale on magenta. The painted background is keyed out by hue (models drift
the magenta toward mauve, and sometimes add a soft shadow), the result is
limited to the engine silhouette grown by a couple of pixels (the painting may
round a corner but never moves), and every cell is snapped to one colour.

One palette for the shell and all furniture keeps the room coherent.

usage: python -I klein-pack.py <spec.json> <work_dir> <pack_dir>
spec: {"packId", "name", "stylePackId", "paletteColors", "paletteAnchors",
       "shell": {"assetId", "render", "guide": "shell.guide", "room": [w, wallHeight, depth], "rise"},
       "furniture": [{"assetId", "render", "guide": "sprite-<type>.guide", "footprint": [w, h], "backgroundRows", "category", "isDesk"}]}
"""
import colorsys
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from post import clean, nearest  # noqa: E402


def cell_median(rgb, k, w, h):
    blocks = rgb[: h * k, : w * k].reshape(h, k, w, k, 3)
    return np.median(blocks, axis=(1, 3))


def magenta_key(rgb):
    """True where a pixel is the keyed background: magenta-ish hue with real saturation."""
    flat = rgb.reshape(-1, 3) / 255.0
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in flat]).reshape(rgb.shape)
    hue, sat, val = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
    return (hue > 280) & (hue < 335) & (sat > 0.35) & (val > 0.35)


def grow(mask, n):
    out = mask.copy()
    for _ in range(n):
        p = np.pad(out, 1)
        out = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return out


def pixelize(native, opaque, palette, max_colors, passes=2):
    """Painted cells -> pixel art: each asset keeps only its `max_colors` most-used
    colours of the shared palette (clean clusters instead of speckle, still one
    palette for the room), then majority smoothing: a pixel unlike 3+ agreeing
    neighbours takes their colour (kills jaggies, keeps 1 px lines)."""
    idx = nearest(native.astype(np.uint8), palette)
    used, counts = np.unique(idx[opaque], return_counts=True)
    keep = used[np.argsort(-counts)[:max_colors]]
    if len(keep) < len(used):
        sub = palette[keep].astype(np.int32)
        flat = palette[idx].reshape(-1, 3).astype(np.int32)
        d = ((flat[:, None, :] - sub[None, :, :]) ** 2).sum(-1)
        idx = keep[d.argmin(1)].reshape(idx.shape)
    h, w = idx.shape
    for _ in range(passes):
        p = np.pad(idx, 1, mode='edge')
        nb = np.stack([p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]])
        out = idx.copy()
        for k in range(4):
            agree = (nb == nb[k]).sum(0)
            flip = (agree >= 3) & (nb[k] != idx) & opaque
            out[flip] = nb[k][flip]
        idx = out
    return clean(idx, opaque)


def palette_from(pixels, anchors, n):
    pool = pixels.reshape(-1, 3).astype(np.uint8)
    if anchors:
        a = np.array([tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in anchors], np.uint8)
        pool = np.concatenate([pool, np.repeat(a, max(1, len(pool) // 500), axis=0)])
    side = int(np.ceil(np.sqrt(len(pool))))
    sheet = np.zeros((side * side, 3), np.uint8)
    sheet[: len(pool)] = pool
    sheet[len(pool):] = pool[0]
    img = Image.fromarray(sheet.reshape(side, side, 3)).quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    return np.array(img.getpalette()[: n * 3]).reshape(-1, 3)


def main():
    spec = json.loads(Path(sys.argv[1]).read_text())
    work, pack_dir = Path(sys.argv[2]), Path(sys.argv[3])
    pack_dir.mkdir(parents=True, exist_ok=True)

    # Art density: 16 = one cell per classic engine pixel; 32 = double density (cells half the size).
    tile = spec.get('tilePx', 16)
    d = tile // 16
    sh = spec['shell']
    g = json.loads((work / f"{sh['guide']}.json").read_text())
    k, (W, H) = g['scale'], (g['rect']['w'], g['rect']['h'])
    shell_rgb = np.asarray(Image.open(work / sh['render']).convert('RGB').resize((W * k, H * k), Image.LANCZOS)).astype(np.float32)
    shell_native = cell_median(shell_rgb, k, W, H)

    pieces = []
    for f in spec['furniture']:
        gj = json.loads((work / f"{f['guide']}.json").read_text())
        fk, (fw, fh), (ox, oy) = gj['grid'], gj['native'], gj['offset']
        assert fk % d == 0, 'sprite guide scale must divide by the density'
        fw16, fh16 = fw, fh
        fk, fw, fh = fk // d, fw * d, fh * d
        rgb = np.asarray(Image.open(work / f['render']).convert('RGB').resize(tuple(gj['canvas']), Image.LANCZOS)).astype(np.float32)
        crop = rgb[oy: oy + fh * fk, ox: ox + fw * fk]
        keyed = magenta_key(crop.astype(np.uint8))
        guide_mask = np.asarray(Image.open(work / f"{f['guide']}.png".replace('.guide.png', '.mask.png')).convert('L'))[oy: oy + fh * fk, ox: ox + fw * fk] > 127
        native = cell_median(crop, fk, fw, fh)
        opaque_frac = (~keyed).reshape(fh, fk, fw, fk).mean(axis=(1, 3))
        silhouette = guide_mask.reshape(fh, fk, fw, fk).mean(axis=(1, 3)) >= 0.5
        opaque = (opaque_frac >= 0.5) & grow(silhouette, 2)
        # Cells inside the silhouette that keyed as background are holes the painting left: keep them opaque only if
        # the engine shape says solid AND the painted cell is mostly not magenta (no magenta can leak into the art).
        pieces.append((f, native, opaque, fw, fh))
        assert (fw, fh) == (fw16 * d, fh16 * d)
        print(f"{f['assetId']}: {fw}x{fh} native, {opaque.mean():.0%} opaque, silhouette match {((opaque == silhouette).mean()):.0%}")

    # Equal say per asset: the shell has ~50x the pixels of a small piece, and a
    # pixel-weighted palette would leave the fig's greens no colours of their own.
    rs = np.random.default_rng(7)
    pool = [p[rs.integers(0, len(p), 12000)] for p in [shell_native.reshape(-1, 3)] + [n[o] for _, n, o, *_ in pieces]]
    palette = palette_from(np.concatenate(pool).astype(np.uint8), spec.get('paletteAnchors', []), spec['paletteColors'])

    records = []

    def write(asset_id, rgba, record, render):
        out = pack_dir / f"{asset_id}.png"
        Image.fromarray(rgba, 'RGBA').save(out)
        Image.fromarray(rgba, 'RGBA').resize((rgba.shape[1] * 4, rgba.shape[0] * 4), Image.NEAREST).save(work / f"{asset_id}.preview-4x.png")
        receipt = json.loads((work / render.replace('.png', '.receipt.json')).read_text())
        records.append({**record, 'tilePx': tile, 'assetId': asset_id, 'file': out.name, 'width': int(rgba.shape[1]), 'height': int(rgba.shape[0]),
                        'pixelScale': 1, 'stylePackId': spec['stylePackId'], 'tileable': False, 'source': 'local-comfyui',
                        'licenseStatus': 'review-required', 'reviewStatus': 'candidate', 'sha256': hashlib.sha256(out.read_bytes()).hexdigest(),
                        'provenance': {**receipt, 'postProcess': {'script': 'scripts/kit/klein-pack.py', 'cells': 'median', 'paletteColors': spec['paletteColors']}}})

    idx = pixelize(shell_native, np.ones((H, W), bool), palette, spec.get('shellColors', 40))
    rgba = np.dstack([palette[idx].astype(np.uint8), np.full((H, W), 255, np.uint8)])
    r = sh['room']
    write(sh['assetId'], rgba, {'class': 'room-plate', 'alphaMode': 'opaque', 'collision': 'none', 'projection': 'dollhouse-cutaway',
                                'room': {'width': r[0], 'wallHeight': r[1], 'depth': r[2], 'rise': sh['rise'], 'withFurniture': False}}, sh['render'])
    for f, native, opaque, fw, fh in pieces:
        idx = pixelize(native, opaque, palette, spec.get('spriteColors', 16))
        rgba = np.dstack([palette[idx].astype(np.uint8), np.where(opaque, 255, 0).astype(np.uint8)])
        write(f['assetId'], rgba, {'class': 'furniture-sprite', 'alphaMode': 'cutout', 'collision': 'solid', 'projection': 'dollhouse-cutaway',
                                   'footprint': {'w': f['footprint'][0], 'h': f['footprint'][1], 'backgroundRows': f['backgroundRows']},
                                   'category': f['category'], 'isDesk': bool(f.get('isDesk')), 'anchor': {'x': 0, 'y': fh}}, f['render'])
    pack = {'schemaVersion': 1, 'id': spec['packId'], 'name': spec['name'], 'stylePackId': spec['stylePackId'],
            'palette': ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in palette], 'assets': records}
    (pack_dir / 'pack.json').write_text(json.dumps(pack, indent=2))
    print('packed', len(records), 'assets into', pack_dir)


if __name__ == '__main__':
    main()
