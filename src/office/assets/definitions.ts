import { registerPackEntries, type CatalogEntryWithCategory, type FurnitureCategory } from '../layout/furnitureCatalog.js';
import type { SpriteData } from '../types.js';

/**
 * Furniture DEFINITIONS: the physical truth of a furniture type (footprint,
 * walkable overhang rows, desk/chair role) authored for the side-on 2.5D view.
 * Art is separate: an asset pack may supply a sprite for a definition id, but
 * only if its footprint matches. Without art, a clean procedural side-on
 * fallback is drawn, so worlds never depend on generated images to compile.
 */
export interface FurnitureDefinition {
  id: string;
  label: string;
  category: FurnitureCategory;
  footprint: { w: number; h: number; backgroundRows: number };
  isDesk?: boolean;
  /**
   * Desks only: pixel row (from the sprite top) of the work surface. Items
   * placed on the desk's tiles rest their base on this line instead of on the
   * floor, so a monitor sits ON the desk rather than sinking into its front.
   */
  surfaceY?: number;
  /** Light emitted by the piece (lamps): drawn as an additive pool each frame. */
  light?: { color: string; radius: number; y: number };
  /** Sprite size in pixels (16 px per tile). */
  size: { w: number; h: number };
  fallback: (w: number, h: number) => SpriteData;
}

type Painter = (set: (x: number, y: number, c: string) => void, rect: (x: number, y: number, w: number, h: number, c: string) => void, w: number, h: number) => void;

function paint(p: Painter): (w: number, h: number) => SpriteData {
  return (w, h) => {
    const px: string[][] = Array.from({ length: h }, () => new Array<string>(w).fill(''));
    const set = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < w && y < h) px[y][x] = c; };
    const rect = (x: number, y: number, rw: number, rh: number, c: string) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) set(x + i, y + j, c); };
    p(set, rect, w, h);
    return px;
  };
}

/** Side-on table: visible top surface strip, front apron, four legs. */
const table = (top: string, edge: string, apron: string, leg: string) => paint((set, rect, w, h) => {
  const topY = h - 22;
  rect(1, topY, w - 2, 6, top);
  rect(1, topY, w - 2, 1, edge);
  rect(0, topY + 6, w, 4, apron);
  rect(0, topY + 9, w, 1, '#3a2418');
  for (const lx of [2, w - 5]) rect(lx, topY + 10, 3, h - topY - 10, leg);
  for (const lx of [6, w - 9]) rect(lx, topY + 6, 2, h - topY - 8, '#4a2e1e');
});

export const FURNITURE_DEFINITIONS: FurnitureDefinition[] = [
  {
    id: 'meeting-table', label: 'Meeting table (side-on)', category: 'desks', isDesk: true,
    footprint: { w: 4, h: 2, backgroundRows: 0 }, size: { w: 64, h: 32 }, surfaceY: 12,
    fallback: table('#a87648', '#d0a06a', '#7a4e2e', '#5a3820'),
  },
  {
    id: 'low-table', label: 'Low table (side-on)', category: 'desks', isDesk: true,
    footprint: { w: 2, h: 1, backgroundRows: 0 }, size: { w: 32, h: 24 }, surfaceY: 4,
    fallback: table('#8a6a50', '#b8936e', '#6a4a32', '#4a3020'),
  },
  {
    id: 'studio-console', label: 'Mixing console', category: 'desks', isDesk: true,
    footprint: { w: 3, h: 2, backgroundRows: 1 }, size: { w: 48, h: 32 }, surfaceY: 15,
    fallback: paint((set, rect, w, h) => {
      rect(6, 4, w - 12, 12, '#2c2e3c');
      for (let x = 9; x < w - 9; x += 3) { set(x, 7, '#e0a050'); rect(x, 10, 1, 4, '#c8c8d0'); }
      rect(2, 16, w - 4, 6, '#70482c');
      for (const lx of [4, w - 7]) rect(lx, 22, 3, h - 22, '#46301e');
    }),
  },
  {
    id: 'exec-bookshelf', label: 'Tall bookshelf', category: 'storage',
    footprint: { w: 2, h: 1, backgroundRows: 0 }, size: { w: 32, h: 48 },
    fallback: paint((set, rect, w, h) => {
      rect(0, 0, w, h, '#4a2a1a'); rect(0, 0, w, 3, '#7a4a2a');
      const books = ['#a8323a', '#2e5aa0', '#d9a95b', '#3a8a5a', '#6a3a8a'];
      for (let shelf = 0; shelf < 4; shelf++) for (let x = 3; x < w - 3; x += 3) rect(x, 5 + shelf * 10, 2, 7, books[(x + shelf) % books.length]);
    }),
  },
  {
    id: 'exec-lamp', label: 'Floor lamp', category: 'misc',
    footprint: { w: 1, h: 1, backgroundRows: 0 }, size: { w: 16, h: 40 },
    light: { color: '#ffc46b', radius: 40, y: 6 },
    fallback: paint((set, rect, w, h) => {
      rect(3, 2, 10, 8, '#ffc46b'); rect(7, 10, 2, h - 13, '#8a6a3a'); rect(4, h - 3, 8, 3, '#5a4022');
    }),
  },
  {
    id: 'studio-speaker', label: 'Floor speaker', category: 'misc',
    footprint: { w: 1, h: 1, backgroundRows: 0 }, size: { w: 16, h: 32 },
    fallback: paint((set, rect, w, h) => {
      rect(2, 2, w - 4, h - 3, '#1c1b22');
      rect(5, 6, 6, 6, '#4a4a56'); rect(4, 16, 8, 8, '#4a4a56');
      rect(7, 8, 2, 2, '#15151a'); rect(7, 19, 2, 2, '#15151a');
    }),
  },
];

/**
 * Catalog ids from the original Agent Pixels set that were drawn top-down.
 * They still work physically but look wrong side-on (e.g. a table seen from
 * above becomes a tall slab). The editor warns; templates should prefer a
 * side-on definition.
 */
export const TOPDOWN_LEGACY = new Set([
  'TABLE_FRONT', 'BOARDROOM_TABLE', 'COFFEE_TABLE', 'POOL_TABLE', 'SMALL_TABLE_FRONT', 'SMALL_TABLE_SIDE', 'DESK_SIDE',
]);

/**
 * CAMERA-AWARE definitions: the sprite is a front face `frontH` px tall (the
 * piece's physical height) under a top face exactly as deep as the floor it
 * covers: footprint.h rows * 16 px * rise. At rise 0.5 a 2-deep desk shows a
 * 16 px top; at rise 1 it shows 32 px, matching the floor rows around it.
 */
export interface BoxDefinition extends Omit<FurnitureDefinition, 'size' | 'fallback' | 'surfaceY'> {
  frontH: number;
  /** Paint into a w x h sprite whose top `top` px are the top face. */
  paint: (set: (x: number, y: number, c: string) => void, rect: (x: number, y: number, w: number, h: number, c: string) => void, w: number, h: number, top: number) => void;
}

const topPx = (d: { footprint: { h: number } }, rise: number) => Math.round(d.footprint.h * 16 * rise);

/** Upholstered seat (sofa / armchair) seen from the front: backrest band behind the cushions. */
const seat = (cloth: string, dark: string, light: string) => (set: (x: number, y: number, c: string) => void, rect: (x: number, y: number, w: number, h: number, c: string) => void, w: number, h: number, top: number) => {
  const back = Math.round(top * 0.55) + 6;
  rect(0, 0, w, back, dark); rect(1, 1, w - 2, back - 2, cloth);
  rect(0, back, w, h - back, cloth); rect(2, back, w - 4, 2, light);
  rect(0, back - 2, 4, h - back + 2, dark); rect(w - 4, back - 2, 4, h - back + 2, dark);
  rect(0, h - 3, w, 3, '#2a1210');
};

export const BOX_DEFINITIONS: BoxDefinition[] = [
  {
    id: 'exec-desk', label: 'Executive desk', category: 'desks', isDesk: true, frontH: 16,
    footprint: { w: 4, h: 2, backgroundRows: 1 },
    paint: (set, rect, w, h, top) => {
      rect(0, 0, w, top, '#80492c'); rect(0, 0, w, 1, '#a8643c'); rect(0, top - 1, w, 1, '#d9a95b');
      rect(0, top, w, h - top, '#56301c'); rect(4, top + 1, w - 8, 1, '#8c602c');
      for (const x of [3, w - 21]) { rect(x, top + 3, 18, h - top - 5, '#683a22'); rect(x + 7, top + 6, 4, 1, '#d9a95b'); rect(x + 7, top + 10, 4, 1, '#d9a95b'); }
      rect(Math.round(top * 0.4), Math.round(top * 0.3), 16, Math.max(3, Math.round(top * 0.35)), '#3c5a46');
    },
  },
  {
    id: 'velvet-sofa', label: 'Velvet sofa', category: 'misc', frontH: 14,
    footprint: { w: 3, h: 1, backgroundRows: 0 }, paint: seat('#9a2c38', '#6a1a24', '#c44a54'),
  },
  {
    id: 'velvet-armchair', label: 'Velvet armchair', category: 'misc', frontH: 14,
    footprint: { w: 1, h: 1, backgroundRows: 0 }, paint: seat('#9a2c38', '#6a1a24', '#c44a54'),
  },
  {
    id: 'coffee-table', label: 'Coffee table', category: 'desks', isDesk: true, frontH: 7,
    footprint: { w: 2, h: 1, backgroundRows: 0 },
    paint: (set, rect, w, h, top) => {
      rect(0, 0, w, top, '#7a4428'); rect(0, top - 1, w, 1, '#d9a95b');
      rect(1, top, w - 2, 3, '#56301c'); for (const x of [1, w - 4]) rect(x, top + 3, 3, h - top - 3, '#46261a');
      rect(6, Math.round(top * 0.3), 7, Math.max(2, Math.round(top * 0.3)), '#ece2c8');
    },
  },
  {
    id: 'brass-globe', label: 'Globe on a stand', category: 'misc', frontH: 26,
    footprint: { w: 1, h: 1, backgroundRows: 0 },
    paint: (set, rect, w, h) => {
      const cy = 9;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 7.5, y - cy); if (d < 6.5) set(x, y, d < 5.5 ? ((x + y) % 5 < 2 ? '#3a8a5a' : '#4682b4') : '#d9a95b');
      }
      rect(7, cy + 7, 2, h - cy - 10, '#d9a95b'); rect(3, h - 3, 10, 3, '#8c602c');
    },
  },
];

let currentRise = 0.5;

function boxToDefinition(b: BoxDefinition, rise: number): FurnitureDefinition {
  const top = topPx(b, rise);
  const size = { w: b.footprint.w * 16, h: b.frontH + top };
  return {
    ...b, size, surfaceY: b.isDesk ? Math.round(top / 2) : undefined,
    fallback: paint((set, rect, w, h) => b.paint(set, rect, w, h, top)),
  };
}

/** Camera-aware decor (floor rugs): w x (rows * 16 * rise) px. */
export const RUG_DEFINITIONS = [
  { id: 'galaxy-rug', label: 'Galaxy rug', w: 6, rows: 3 },
];

function rugSprite(w: number, h: number): SpriteData {
  return paint((set, rect) => {
    rect(0, 0, w, h, '#3a1e66'); rect(2, 2, w - 4, h - 4, '#d9a95b'); rect(3, 3, w - 6, h - 6, '#4a2a86');
    const cx = w / 2, cy = h / 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - cx) / (w * 0.22), dy = (y - cy) / (h * 0.3), r = Math.hypot(dx, dy);
      if (r < 1) set(x, y, Math.sin(r * 9 + Math.atan2(dy, dx) * 2) > 0.6 ? '#d9a95b' : '#6a46b0');
    }
  })(w, h);
}

export function definitionById(id: string) {
  const box = BOX_DEFINITIONS.find(d => d.id === id);
  return box ? boxToDefinition(box, currentRise) : FURNITURE_DEFINITIONS.find(d => d.id === id);
}

export function definitionEntry(d: FurnitureDefinition, sprite?: SpriteData): CatalogEntryWithCategory {
  return {
    type: d.id, label: d.label, footprintW: d.footprint.w, footprintH: d.footprint.h,
    ...(d.footprint.backgroundRows ? { backgroundTiles: d.footprint.backgroundRows } : {}),
    sprite: sprite ?? d.fallback(d.size.w, d.size.h), isDesk: !!d.isDesk, category: d.category,
  };
}

/**
 * Register every definition with its procedural fallback art for a camera
 * tilt. Call after the base catalog is built, and again when the world's
 * camera changes (camera-aware shapes are re-cut for the new rise).
 */
let fixedRegistered = false;
export function registerFurnitureDefinitions(rise = 0.5) {
  if (fixedRegistered && rise === currentRise) return;
  currentRise = rise;
  registerPackEntries([
    // Fixed-size definitions once only: later calls must not clobber pack art loaded over them.
    ...(fixedRegistered ? [] : FURNITURE_DEFINITIONS.map(d => definitionEntry(d))),
    ...BOX_DEFINITIONS.map(b => definitionEntry(boxToDefinition(b, rise))),
    ...RUG_DEFINITIONS.map(r => ({
      type: r.id, label: r.label, footprintW: r.w, footprintH: r.rows, isDesk: false, category: 'decor' as const,
      sprite: rugSprite(r.w * 16, Math.round(r.rows * 16 * rise)),
    })),
  ]);
  fixedRegistered = true;
}
