import { getCatalogEntry, registerPackEntries, type CatalogEntryWithCategory, type FurnitureCategory } from '../layout/furnitureCatalog.js';
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
  /** May stand on a desk's tiles (a monitor, a lamp on the desk). */
  onSurfaces?: boolean;
  /** Light emitted by the piece (lamps): drawn as an additive pool each frame. */
  light?: { color: string; radius: number; y: number };
  /** Sprite size in pixels (16 px per tile). */
  size: { w: number; h: number };
  fallback: (w: number, h: number) => SpriteData;
}

type Painter = (set: (x: number, y: number, c: string) => void, rect: (x: number, y: number, w: number, h: number, c: string) => void, w: number, h: number) => void;

/** Paint a sprite; with `outline`, every opaque pixel touching transparency takes that colour. */
function paint(p: Painter, outline?: string): (w: number, h: number) => SpriteData {
  return (w, h) => {
    const px: string[][] = Array.from({ length: h }, () => new Array<string>(w).fill(''));
    const set = (x: number, y: number, c: string) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) px[y][x] = c; };
    const rect = (x: number, y: number, rw: number, rh: number, c: string) => { for (let j = 0; j < Math.round(rh); j++) for (let i = 0; i < Math.round(rw); i++) set(x + i, y + j, c); };
    p(set, rect, w, h);
    if (outline) {
      const edge = (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || !px[y][x];
      const border = px.map((row, y) => row.map((c, x) => !!c && (edge(x - 1, y) || edge(x + 1, y) || edge(x, y - 1) || edge(x, y + 1))));
      border.forEach((row, y) => row.forEach((b, x) => { if (b) px[y][x] = outline; }));
    }
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
    id: 'desk-monitor', label: 'Desk monitor', category: 'electronics', onSurfaces: true,
    footprint: { w: 1, h: 1, backgroundRows: 0 }, size: { w: 16, h: 16 },
    fallback: paint((set, rect) => {
      rect(1, 1, 14, 10, '#2a2a36'); rect(2, 2, 12, 8, '#5a7ad0'); rect(3, 3, 6, 1, '#b9d0ff'); rect(3, 5, 9, 1, '#8aa8f0');
      rect(7, 11, 2, 3, '#3a3a46'); rect(4, 14, 8, 2, '#2a2a36');
    }, '#14141c'),
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

type Pen = (x: number, y: number, c: string) => void;
type Box = (x: number, y: number, w: number, h: number, c: string) => void;

/**
 * Upholstered seat seen from the front (sofa / armchair): tufted backrest with
 * rounded shoulders, rolled arms, separate seat cushions with seams, short legs
 * with floor showing between them. Real silhouettes matter: a whole-room
 * painting is edge-locked to these shapes, so a box here paints as a box.
 */
const seat = (cloth: string, dark: string, light: string) => (set: Pen, rect: Box, w: number, h: number, top: number) => {
  const arm = Math.max(3, Math.round(w / 10)), base = h - 2, backH = Math.round(top * 0.65) + 5;
  // Backrest with rounded shoulders and button tufting.
  rect(arm - 1, 1, w - 2 * arm + 2, backH, cloth); rect(arm, 0, w - 2 * arm, 1, cloth);
  for (let y = 3; y < backH - 1; y += 4) for (let x = arm + 2 + ((y / 4) % 2) * 2; x < w - arm - 2; x += 5) { set(x, y, dark); set(x, y - 1, light); }
  // Seat cushions with seams and a lit front edge.
  const seatTop = backH, seatFront = Math.round(seatTop + (base - seatTop) * 0.45), n = Math.max(1, Math.round((w - 2 * arm) / 15));
  rect(arm, seatTop, w - 2 * arm, seatFront - seatTop, light);
  rect(arm, seatFront, w - 2 * arm, base - seatFront, cloth);
  for (let i = 1; i < n; i++) { const x = Math.round(arm + ((w - 2 * arm) * i) / n); rect(x, seatTop, 1, base - seatTop, dark); }
  rect(arm, seatFront, w - 2 * arm, 1, dark);
  // Rolled arms (round tops, darker inner face).
  for (const x0 of [0, w - arm]) {
    rect(x0, backH - 4, arm, base - backH + 4, cloth);
    rect(x0 + 1, backH - 5, arm - 2, 1, cloth);
    rect(x0 + (x0 ? 0 : arm - 1), backH - 3, 1, base - backH + 3, dark);
    rect(x0 + 1, backH - 4, arm - 2, 1, light);
  }
  // Skirt and legs; the floor shows between the legs.
  rect(1, base - 1, w - 2, 1, dark);
  for (const x of [1, w - 3, ...(w >= 40 ? [Math.round(w / 2) - 1] : [])]) rect(x, base, 2, 2, '#2a1210');
};

export const BOX_DEFINITIONS: BoxDefinition[] = [
  {
    id: 'exec-desk', label: 'Executive desk', category: 'desks', isDesk: true, frontH: 16,
    footprint: { w: 4, h: 2, backgroundRows: 1 },
    paint: (set, rect, w, h, top) => {
      // Top: bevelled edge, leather blotter, papers, a stack of books, inkwell.
      rect(0, 0, w, top, '#7a4428'); rect(1, 0, w - 2, 1, '#a8643c'); rect(0, top - 2, w, 1, '#d9a95b'); rect(0, top - 1, w, 1, '#5a3220');
      for (let y = 2; y < top - 3; y += 3) rect(2, y, w - 4, 1, '#724026');
      const by = Math.round(top * 0.3), bh = Math.max(3, Math.round(top * 0.4));
      rect(16, by, 24, bh, '#4a7a5e'); rect(17, by + 1, 22, bh - 2, '#2f5a46');
      rect(43, by + 1, 8, Math.max(2, bh - 2), '#ece2c8');
      for (let y = by + 2; y < by + bh - 2; y += 2) rect(44, y, 6, 1, '#b8ad90');
      const books: Array<[string, number]> = [['#a8323a', 0], ['#2e5aa0', 2], ['#d9a95b', 4]];
      for (const [c, dy] of books) rect(4, Math.round(top * 0.2) + dy, 8, 2, c);
      set(55, by + 1, '#14141c'); set(56, by + 1, '#14141c'); set(55, by, '#d9a95b');
      // Front: carved trim, two drawer pedestals with brass pulls, open kneehole, feet.
      const ped = 18, foot = h - 3;
      rect(0, top, w, 3, '#56301c'); rect(2, top + 1, w - 4, 1, '#8c602c');
      for (const x of [1, w - 1 - ped]) {
        rect(x, top + 3, ped, foot - top - 3, '#683a22');
        for (let k = 0; k < 3; k++) {
          const y = top + 4 + Math.round(((foot - top - 5) * k) / 3);
          rect(x + 1, y, ped - 2, 1, '#3e2214'); rect(x + ped / 2 - 2, y + 2, 4, 1, '#d9a95b');
        }
        rect(x, foot, 3, 3, '#3e2214'); rect(x + ped - 3, foot, 3, 3, '#3e2214');
      }
      rect(ped + 1, top + 3, w - 2 * ped - 2, Math.round((foot - top - 3) * 0.55), '#3e2214');
    },
  },
  {
    id: 'velvet-sofa', label: 'Velvet sofa', category: 'misc', frontH: 14,
    footprint: { w: 3, h: 1, backgroundRows: 0 }, paint: seat('#9a2c38', '#5a1420', '#c44a54'),
  },
  {
    id: 'velvet-armchair', label: 'Velvet armchair', category: 'misc', frontH: 14,
    footprint: { w: 1, h: 1, backgroundRows: 0 }, paint: seat('#9a2c38', '#5a1420', '#c44a54'),
  },
  {
    id: 'coffee-table', label: 'Coffee table', category: 'desks', isDesk: true, frontH: 7,
    footprint: { w: 2, h: 1, backgroundRows: 0 },
    paint: (set, rect, w, h, top) => {
      rect(0, 0, w, top, '#7a4428'); rect(1, 0, w - 2, 1, '#a8643c'); rect(0, top - 2, w, 1, '#d9a95b'); rect(0, top - 1, w, 1, '#5a3220');
      // A book and a teacup on the top.
      rect(5, Math.round(top * 0.35), 9, Math.max(2, Math.round(top * 0.3)), '#2e5aa0'); rect(6, Math.round(top * 0.35), 7, 1, '#ece2c8');
      rect(w - 10, Math.round(top * 0.4), 4, 3, '#ece2c8'); set(w - 6, Math.round(top * 0.4) + 1, '#ece2c8');
      // Apron and turned legs; floor shows between them.
      rect(1, top, w - 2, 3, '#56301c'); rect(2, top + 1, w - 4, 1, '#8c602c');
      for (const x of [2, w - 4]) { rect(x, top + 3, 2, h - top - 3, '#46261a'); rect(x - 1, top + 5, 4, 1, '#46261a'); }
    },
  },
  {
    id: 'potted-fig', label: 'Potted fiddle-leaf fig', category: 'decor', frontH: 40,
    footprint: { w: 2, h: 1, backgroundRows: 0 },
    paint: (set, rect, w, h) => {
      const potTop = h - 13;
      rect(8, potTop, w - 16, 11, '#8a4a2a'); rect(7, potTop, w - 14, 2, '#d9a95b'); rect(9, potTop + 6, w - 18, 1, '#d9a95b');
      rect(10, h - 2, w - 20, 2, '#5a3020');
      rect(w / 2 - 1, potTop - 14, 2, 14, '#5a3a20');
      const leaves: Array<[number, number, number]> = [[w / 2, potTop - 16, 9], [w / 2 - 8, potTop - 22, 7], [w / 2 + 8, potTop - 24, 7], [w / 2 - 4, potTop - 32, 7], [w / 2 + 5, potTop - 36, 6], [w / 2, h - 52, 6]];
      for (const [cx, cy, r] of leaves) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        if ((x * x) / (r * r) + (y * y) / (r * r * 0.6) <= 1) set(cx + x, cy + y, (x + y) % 5 === 0 ? '#5aa04a' : y < 0 ? '#3f8a3c' : '#2e6a30');
      }
    },
  },
  {
    id: 'brass-globe', label: 'Globe on a stand', category: 'misc', frontH: 26,
    footprint: { w: 1, h: 1, backgroundRows: 0 },
    paint: (set, rect, w, h) => {
      const cy = 9;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 7.5, y - cy);
        if (d < 6.5) set(x, y, d < 5.5 ? ((x * 3 + y * 2) % 7 < 3 ? '#3a8a5a' : (x - y > 3 ? '#2e5aa0' : '#4682b4')) : '#d9a95b');
      }
      set(5, cy - 3, '#a8d8f0'); set(6, cy - 4, '#a8d8f0');
      rect(7, cy + 7, 2, h - cy - 10, '#d9a95b'); rect(6, cy + 7, 4, 1, '#d9a95b');
      rect(3, h - 3, 10, 2, '#8c602c'); rect(2, h - 1, 2, 1, '#8c602c'); rect(12, h - 1, 2, 1, '#8c602c');
    },
  },
];

let currentRise = 0.5;

function boxToDefinition(b: BoxDefinition, rise: number): FurnitureDefinition {
  const top = topPx(b, rise);
  const size = { w: b.footprint.w * 16, h: b.frontH + top };
  return {
    ...b, size, surfaceY: b.isDesk ? Math.round(top / 2) : undefined,
    fallback: paint((set, rect, w, h) => b.paint(set, rect, w, h, top), '#1c0e0a'),
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
    ...(d.onSurfaces ? { canPlaceOnSurfaces: true } : {}),
  };
}

/**
 * Register every definition with its procedural fallback art for a camera
 * tilt. Call after the base catalog is built, and again when the world's
 * camera changes (camera-aware shapes are re-cut for the new rise).
 */
let fixedRegistered = false;
/** Sprites this module generated; any other sprite under a definition id came from an asset pack. */
const fallbackSprites = new WeakSet<object>();
const ours = (id: string) => { const e = getCatalogEntry(id); return !e || fallbackSprites.has(e.sprite); };
export function registerFurnitureDefinitions(rise = 0.5) {
  if (fixedRegistered && rise === currentRise) return;
  currentRise = rise;
  registerPackEntries([
    // Fixed-size definitions once only: later calls must not clobber pack art loaded over them.
    ...(fixedRegistered ? [] : FURNITURE_DEFINITIONS.map(d => definitionEntry(d))),
    // Re-cut camera-aware shapes for the new rise, but never over art an asset pack supplied.
    ...BOX_DEFINITIONS.filter(b => ours(b.id)).map(b => { const e = definitionEntry(boxToDefinition(b, rise)); fallbackSprites.add(e.sprite); return e; }),
    ...RUG_DEFINITIONS.map(r => ({
      type: r.id, label: r.label, footprintW: r.w, footprintH: r.rows, isDesk: false, category: 'decor' as const,
      sprite: rugSprite(r.w * 16, Math.round(r.rows * 16 * rise)),
    })),
  ]);
  fixedRegistered = true;
}
