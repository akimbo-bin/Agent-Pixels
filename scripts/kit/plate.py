"""Turn a painted whole-room plate into engine pixel art and add it to a pack.

The pixel-art LoRA paints on a fixed grid (kit "grid", 8 px). The guide was
the engine's own render upscaled by exactly that factor, so one grid cell is
one engine pixel. Steps: find the grid offset -> one flat colour per cell
(median, so sub-cell smear can't leak in) -> kit palette (no dithering) ->
stray-pixel cleanup -> guide-fidelity check -> PNG + pack.json record.

usage: python -I plate.py <kit.json> <work_dir> <pack_dir>
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from post import FLOOR, clean, nearest, stray_mask  # noqa: E402


def plate_palette(kit, native):
    """Palette from EVERY cell of the plate, plus the style anchors at a light
    weight (each anchor counts like ~0.2% of the image): anchors nudge the room
    toward the shared style without eating the colour budget it needs."""
    pool = native.reshape(-1, 3)
    anchors = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in kit.get('paletteAnchors', [])]
    if anchors:
        pool = np.concatenate([pool, np.repeat(np.array(anchors, np.uint8), max(1, len(pool) // 500), axis=0)])
    side = int(np.ceil(np.sqrt(len(pool))))
    sheet = np.zeros((side * side, 3), np.uint8)
    sheet[: len(pool)] = pool
    sheet[len(pool):] = pool[0]
    n = kit['paletteColors']
    img = Image.fromarray(sheet.reshape(side, side, 3)).quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    return np.array(img.getpalette()[: n * 3]).reshape(-1, 3)


def cells(img, g, ox, oy, tw, th, reduce):
    pad = np.pad(img, ((0, g), (0, g), (0, 0)), mode='edge')[oy: oy + th * g, ox: ox + tw * g]
    blocks = pad.reshape(th, g, tw, g, 3)
    return reduce(blocks, axis=(1, 3)), blocks


def main():
    kit = json.loads(Path(sys.argv[1]).read_text())
    work, pack_dir = Path(sys.argv[2]), Path(sys.argv[3])
    g = kit['grid']
    pack_path = pack_dir / 'pack.json'
    pack = json.loads(pack_path.read_text()) if pack_path.exists() else {
        'schemaVersion': 1, 'id': kit['packId'], 'name': kit['name'], 'stylePackId': kit['stylePackId'], 'assets': []}
    for a in kit['assets']:
        raw = np.asarray(Image.open(work / f"{a['assetId']}.raw.png").convert('RGB')).astype(np.float32)
        guide_meta = json.loads((work / f"{a['assetId']}.guide.json").read_text())
        tw, th = guide_meta['rect']['w'], guide_meta['rect']['h']
        # Grid offset: the one whose flat cells best reproduce the painting.
        best = None
        for oy in range(g):
            for ox in range(g):
                mean, blocks = cells(raw, g, ox, oy, tw, th, np.mean)
                err = float(np.abs(blocks - mean[:, None, :, None, :]).mean())
                if best is None or err < best[0]:
                    best = (err, ox, oy)
        err, ox, oy = best
        native, _ = cells(raw, g, ox, oy, tw, th, np.median)
        native = np.clip(native, 0, 255).astype(np.uint8)

        opaque = np.ones((th, tw), bool)
        palette = plate_palette(kit, native)
        idx = nearest(native, palette)
        noise = float(stray_mask(idx, opaque).mean())
        idx = clean(idx, opaque)
        out_rgb = palette[idx].astype(np.uint8)

        guide = np.asarray(Image.open(work / f"{a['assetId']}.guide.png").convert('RGB').resize((tw, th), Image.NEAREST)).astype(np.float32)
        lum = lambda x: x[..., 0] * 0.299 + x[..., 1] * 0.587 + x[..., 2] * 0.114  # noqa: E731
        fidelity = float(np.corrcoef(lum(out_rgb.astype(np.float32)).ravel(), lum(guide).ravel())[0, 1])
        quality = {'gridPx': g, 'gridOffset': [ox, oy], 'cellError': round(err, 2), 'fidelity': round(fidelity, 3),
                   'noise': round(noise, 3), 'passed': fidelity >= FLOOR['fidelity'] and noise <= FLOOR['noise_max']}
        print(a['assetId'], quality)
        if not quality['passed']:
            print('NOT SHIPPED (below quality floor):', a['assetId'])
            continue

        out = pack_dir / f"{a['assetId']}.png"
        Image.fromarray(out_rgb, 'RGB').convert('RGBA').save(out)
        Image.fromarray(out_rgb, 'RGB').resize((tw * 4, th * 4), Image.NEAREST).save(work / f"{a['assetId']}.preview-4x.png")
        receipt = json.loads((work / f"{a['assetId']}.receipt.json").read_text())
        r = a['room']
        rec = {
            'assetId': a['assetId'], 'class': 'room-plate', 'file': out.name, 'width': tw, 'height': th, 'pixelScale': 1,
            'stylePackId': kit['stylePackId'], 'projection': 'dollhouse-cutaway', 'alphaMode': 'opaque', 'tileable': False,
            'collision': 'none', 'source': 'local-comfyui', 'licenseStatus': 'review-required', 'reviewStatus': 'candidate',
            'sha256': hashlib.sha256(out.read_bytes()).hexdigest(),
            'room': {'width': r[0], 'wallHeight': r[1], 'depth': r[2], 'rise': a['rise']},
            'provenance': {**receipt, 'guide': guide_meta, 'quality': quality,
                           'postProcess': {'script': 'scripts/kit/plate.py', 'grid': g, 'paletteColors': kit['paletteColors'], 'cells': 'median'}},
        }
        pack['assets'] = [x for x in pack['assets'] if x['assetId'] != a['assetId']] + [rec]
        print('packed', a['assetId'], tw, 'x', th)
    pack_path.write_text(json.dumps(pack, indent=2))


if __name__ == '__main__':
    main()
