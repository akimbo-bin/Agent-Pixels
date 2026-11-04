/**
 * Typed asset packs. An asset is an image PLUS semantic metadata: what it
 * attaches to, whether it collides, how it tiles, and where it came from.
 * Packs never change topology; furniture footprints come from the record, not
 * from the pixels.
 */
export type AssetClass =
  | 'wall-texture' | 'floor-texture' | 'trim-texture' | 'sky-layer'
  | 'decor-sprite' | 'furniture-sprite' | 'outfit-overlay'
  /** A whole painted back wall for ONE room size (dense set dressing, no collision). */
  | 'room-backdrop'
  /** A whole floor for ONE room size, authored foreshortened (front row at the bottom). */
  | 'room-floor'
  /** The WHOLE room (walls, floor, furniture as placed) for one room size and camera. */
  | 'room-plate';

export type ReviewStatus = 'candidate' | 'rejected' | 'approved' | 'deployed';

export interface AssetRecord {
  assetId: string;
  class: AssetClass;
  /** File name relative to the pack directory. */
  file: string;
  width: number;
  height: number;
  pixelScale: number;
  stylePackId: string;
  projection?: string;
  alphaMode: 'opaque' | 'cutout';
  tileable: boolean;
  collision: 'none' | 'solid';
  attachment?: 'back-wall' | 'floor';
  footprint?: { w: number; h: number; backgroundRows: number };
  category?: string;
  isDesk?: boolean;
  /** Foot anchor in sprite pixels (bottom-left of the footprint's front edge). */
  anchor?: { x: number; y: number };
  /** room-backdrop / room-floor: the room size (tiles) the art was painted for. */
  /** withFurniture false: a room SHELL plate; furniture is drawn over it as separate sprites. */
  room?: { width: number; wallHeight: number; depth: number; rise?: number; withFurniture?: boolean };
  source: 'local-comfyui' | 'procedural' | 'agent-pixels-original' | 'hand-drawn';
  licenseStatus: 'review-required' | 'cleared' | 'restricted';
  reviewStatus: ReviewStatus;
  sha256: string;
  provenance?: Record<string, unknown>;
}

export interface AssetPack {
  schemaVersion: 1;
  id: string;
  name: string;
  stylePackId: string;
  palette?: string[];
  assets: AssetRecord[];
}

const CLASSES: AssetClass[] = ['wall-texture', 'floor-texture', 'trim-texture', 'sky-layer', 'decor-sprite', 'furniture-sprite', 'outfit-overlay', 'room-backdrop', 'room-floor', 'room-plate'];
const SAFE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.png$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/** Structural validation of an untrusted pack document. Returns problems (empty = ok). */
export function validateAssetPack(pack: unknown): string[] {
  const out: string[] = [];
  const p = pack as Partial<AssetPack>;
  if (!p || typeof p !== 'object') return ['pack is not an object'];
  if (p.schemaVersion !== 1) out.push(`unsupported pack schemaVersion ${String(p.schemaVersion)}`);
  if (typeof p.id !== 'string' || !SAFE_ID.test(p.id)) out.push('pack id must be a short safe identifier');
  if (!Array.isArray(p.assets)) return [...out, 'pack.assets must be an array'];
  const ids = new Set<string>();
  for (const a of p.assets) {
    const who = `asset ${String(a?.assetId)}`;
    if (!a || typeof a.assetId !== 'string' || !SAFE_ID.test(a.assetId)) { out.push(`${who}: unsafe or missing id`); continue; }
    if (ids.has(a.assetId)) out.push(`${who}: duplicate id`);
    ids.add(a.assetId);
    if (!CLASSES.includes(a.class)) out.push(`${who}: unknown class ${String(a.class)}`);
    // Only plain file names inside the pack: no traversal, no absolute paths, no URLs.
    if (typeof a.file !== 'string' || !SAFE_FILE.test(a.file)) out.push(`${who}: file must be a plain .png name inside the pack`);
    if (!(Number.isInteger(a.width) && a.width > 0 && a.width <= 2048 && Number.isInteger(a.height) && a.height > 0 && a.height <= 2048)) out.push(`${who}: bad dimensions`);
    if (!/^[0-9a-f]{64}$/.test(a.sha256 ?? '')) out.push(`${who}: missing sha256`);
    if (!['candidate', 'rejected', 'approved', 'deployed'].includes(a.reviewStatus)) out.push(`${who}: bad reviewStatus`);
    if (a.class === 'furniture-sprite') {
      const f = a.footprint;
      if (!f || !Number.isInteger(f.w) || !Number.isInteger(f.h) || f.w < 1 || f.h < 1 || f.backgroundRows < 0 || f.backgroundRows >= f.h + 1) out.push(`${who}: furniture needs a footprint`);
      if (a.collision !== 'solid') out.push(`${who}: furniture must be solid (non-blocking art is decor)`);
      if (a.alphaMode !== 'cutout') out.push(`${who}: furniture sprites need a cut-out alpha`);
    }
    if (a.class === 'decor-sprite' && a.collision !== 'none') out.push(`${who}: decor must not collide; reclassify as furniture`);
    if (a.class === 'room-plate' && !(typeof a.room?.rise === 'number' && a.room.rise > 0)) out.push(`${who}: a plate is painted for one camera; give room.rise`);
    if (a.class === 'room-backdrop' || a.class === 'room-floor' || a.class === 'room-plate') {
      const r = a.room;
      if (!r || ![r.width, r.wallHeight, r.depth].every(n => Number.isInteger(n) && n > 0)) out.push(`${who}: room art needs the room size it was painted for`);
      if (a.collision !== 'none') out.push(`${who}: room art never collides; place furniture for that`);
    }
    if ((a.class === 'wall-texture' || a.class === 'floor-texture' || a.class === 'trim-texture') && !a.tileable) out.push(`${who}: surface textures must be tileable`);
  }
  return out;
}

/** Assets the scene may show: rejected art never renders. */
export function usable(a: AssetRecord) {
  return a.reviewStatus !== 'rejected';
}
