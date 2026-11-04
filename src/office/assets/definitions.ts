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
    footprint: { w: 4, h: 2, backgroundRows: 0 }, size: { w: 64, h: 32 },
    fallback: table('#a87648', '#d0a06a', '#7a4e2e', '#5a3820'),
  },
  {
    id: 'low-table', label: 'Low table (side-on)', category: 'desks', isDesk: true,
    footprint: { w: 2, h: 1, backgroundRows: 0 }, size: { w: 32, h: 24 },
    fallback: table('#8a6a50', '#b8936e', '#6a4a32', '#4a3020'),
  },
  {
    id: 'studio-console', label: 'Mixing console', category: 'desks', isDesk: true,
    footprint: { w: 3, h: 2, backgroundRows: 1 }, size: { w: 48, h: 32 },
    fallback: paint((set, rect, w, h) => {
      rect(6, 4, w - 12, 12, '#2c2e3c');
      for (let x = 9; x < w - 9; x += 3) { set(x, 7, '#e0a050'); rect(x, 10, 1, 4, '#c8c8d0'); }
      rect(2, 16, w - 4, 6, '#70482c');
      for (const lx of [4, w - 7]) rect(lx, 22, 3, h - 22, '#46301e');
    }),
  },
  {
    id: 'exec-desk', label: 'Executive desk (side-on)', category: 'desks', isDesk: true,
    footprint: { w: 4, h: 2, backgroundRows: 1 }, size: { w: 64, h: 32 },
    fallback: paint((set, rect, w, h) => {
      rect(0, 8, w, 4, '#8a5232'); rect(0, 8, w, 1, '#c88a5a');
      rect(1, 12, w - 2, h - 13, '#5a3220'); rect(4, 15, w - 8, 1, '#d9a95b');
      for (const x of [6, w - 18]) rect(x, 18, 12, 8, '#6a3c26');
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

export function definitionById(id: string) {
  return FURNITURE_DEFINITIONS.find(d => d.id === id);
}

export function definitionEntry(d: FurnitureDefinition, sprite?: SpriteData): CatalogEntryWithCategory {
  return {
    type: d.id, label: d.label, footprintW: d.footprint.w, footprintH: d.footprint.h,
    ...(d.footprint.backgroundRows ? { backgroundTiles: d.footprint.backgroundRows } : {}),
    sprite: sprite ?? d.fallback(d.size.w, d.size.h), isDesk: !!d.isDesk, category: d.category,
  };
}

/** Register every definition with its procedural fallback art. Call after the base catalog is built. */
export function registerFurnitureDefinitions() {
  registerPackEntries(FURNITURE_DEFINITIONS.map(d => definitionEntry(d)));
}
