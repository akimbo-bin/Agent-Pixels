import { registerPackEntries, type CatalogEntryWithCategory, type FurnitureCategory } from '../layout/furnitureCatalog.js';
import type { SpriteData } from '../types.js';
import { type AssetPack, type AssetRecord, usable, validateAssetPack } from './manifest.js';

export interface LoadedAssetPack {
  pack: AssetPack;
  /** Decoded images by asset id (only usable, verified assets). */
  images: Map<string, HTMLCanvasElement>;
  records: Map<string, AssetRecord>;
  /** Problems found while loading; failing assets are skipped, never guessed. */
  problems: string[];
}

/**
 * Load a pack from a same-origin directory URL. Every file must match its
 * record (dimensions); rejected assets are not loaded. Sprites are registered
 * in the furniture catalog so collision/seat logic uses the record footprint.
 */
export async function loadAssetPack(baseUrl: string): Promise<LoadedAssetPack> {
  const base = new URL(baseUrl, location.href);
  if (base.origin !== location.origin) throw new Error('Asset packs must be same-origin');
  const pack = (await fetch(new URL('pack.json', base)).then(r => r.json())) as AssetPack;
  const problems = validateAssetPack(pack);
  if (problems.length) throw new Error(`Invalid asset pack: ${problems.join('; ')}`);
  const images = new Map<string, HTMLCanvasElement>();
  const records = new Map<string, AssetRecord>();
  const entries: CatalogEntryWithCategory[] = [];
  await Promise.all(pack.assets.filter(usable).map(async a => {
    try {
      const img = new Image();
      img.src = new URL(a.file, base).href;
      await img.decode();
      if (img.naturalWidth !== a.width || img.naturalHeight !== a.height) {
        problems.push(`${a.assetId}: image is ${img.naturalWidth}x${img.naturalHeight}, record says ${a.width}x${a.height}`);
        return;
      }
      const c = document.createElement('canvas');
      c.width = a.width; c.height = a.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      images.set(a.assetId, c);
      records.set(a.assetId, a);
      if (a.class === 'furniture-sprite' || a.class === 'decor-sprite') entries.push(toCatalogEntry(a, toSprite(ctx, a.width, a.height)));
    } catch (e) {
      problems.push(`${a.assetId}: ${String(e)}`);
    }
  }));
  registerPackEntries(entries);
  return { pack, images, records, problems };
}

function toSprite(ctx: CanvasRenderingContext2D, w: number, h: number): SpriteData {
  const d = ctx.getImageData(0, 0, w, h).data;
  const rows: string[][] = [];
  for (let y = 0; y < h; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      row.push(d[i + 3] < 128 ? '' : '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''));
    }
    rows.push(row);
  }
  return rows;
}

export function toCatalogEntry(a: AssetRecord, sprite: SpriteData): CatalogEntryWithCategory {
  const furniture = a.class === 'furniture-sprite';
  return {
    type: a.assetId,
    label: a.assetId,
    // Decor gets a nominal footprint for sprite lookup only; it is never placed as furniture.
    footprintW: furniture ? a.footprint!.w : Math.max(1, Math.round(a.width / 16)),
    footprintH: furniture ? a.footprint!.h : Math.max(1, Math.round(a.height / 16)),
    ...(furniture && a.footprint!.backgroundRows ? { backgroundTiles: a.footprint!.backgroundRows } : {}),
    sprite,
    isDesk: !!a.isDesk,
    category: (furniture ? (a.category ?? 'misc') : 'wall') as FurnitureCategory,
    ...(furniture ? {} : { canPlaceOnWalls: true }),
  };
}
