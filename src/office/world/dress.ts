import { catalogFootprints, tryCompileWorld } from './compiler.js';
import { checkConnectivity } from './connectivity.js';
import type { OfficeWorld } from './schema.js';
import type { FootprintSource } from './validator.js';

/**
 * Floor furniture each room kind gets on top of its workstations, most
 * important first. Pieces that can't be placed without breaking the building
 * (blocking a door, walling in a seat) are skipped, never forced.
 */
export const KIND_FURNITURE: Record<string, string[]> = {
  office: ['DOUBLE_BOOKSHELF', 'potted-fig', 'velvet-armchair', 'exec-lamp'],
  reception: ['velvet-sofa', 'coffee-table', 'potted-fig', 'exec-lamp'],
  observatory: ['brass-globe', 'potted-fig', 'exec-lamp', 'velvet-armchair'],
  studio: ['velvet-sofa', 'coffee-table', 'exec-lamp', 'potted-fig'],
  workshop: ['DOUBLE_BOOKSHELF', 'meeting-table', 'potted-fig', 'DOUBLE_BOOKSHELF', 'exec-lamp'],
  lab: ['DOUBLE_BOOKSHELF', 'brass-globe', 'potted-fig', 'exec-lamp'],
  operations: ['velvet-armchair', 'coffee-table', 'potted-fig', 'exec-lamp'],
  clinic: ['velvet-sofa', 'potted-fig', 'exec-lamp', 'coffee-table'],
  review: ['meeting-table', 'potted-fig', 'DOUBLE_BOOKSHELF', 'exec-lamp'],
};

const valid = (w: OfficeWorld, fp: FootprintSource) => {
  const r = tryCompileWorld(w, fp);
  return r.ok && checkConnectivity(r.compiled, fp).length === 0;
};

/** Place one piece at the first valid spot in a room (back wall first, ends inward); false if none. */
export function placeFurniture(w: OfficeWorld, roomId: string, assetId: string, id: string, fp: FootprintSource = catalogFootprints): boolean {
  const room = w.rooms.find(r => r.id === roomId), f = fp(assetId);
  if (!room || !f) return false;
  const depth = room.depth ?? w.floors.find(x => x.id === room.floorId)!.depth;
  const cols: number[] = [];
  for (let a = 0, b = room.width - f.w; a <= b; a++, b--) { cols.push(a); if (b !== a) cols.push(b); }
  for (let row = 0; row + f.h <= depth - 1; row++) for (const col of cols) {
    w.furniture.push({ id, roomId, assetId, col, row });
    if (valid(w, fp)) return true;
    w.furniture.pop();
  }
  return false;
}

/**
 * Dress every room (except \`skip\`) for its kind: arched windows along the back
 * wall (one per ~7 tiles, centred) and the kind's floor furniture, each placed
 * at the first valid spot scanning from the back wall forward and from the
 * room's ends inward. Pure: returns a new world; topology never changes.
 */
export function dressBuilding(world: OfficeWorld, skip: string[] = [], fp: FootprintSource = catalogFootprints): OfficeWorld {
  const w = JSON.parse(JSON.stringify(world)) as OfficeWorld;
  for (const room of w.rooms) {
    if (skip.includes(room.id)) continue;
    const depth = room.depth ?? w.floors.find(f => f.id === room.floorId)!.depth;
    // Windows: evenly spaced on the back wall, clear of existing wall decor.
    const n = Math.max(1, Math.floor(room.width / 7));
    for (let i = 0; i < n; i++) {
      const col = Math.round(((i + 0.5) * room.width) / n - 1.5);
      const clash = w.decor.some(d => d.roomId === room.id && d.attachment === 'back-wall' && d.col < col + 3 && d.col + 2 > col);
      if (!clash) w.decor.push({ id: `${room.id}-window-${i}`, roomId: room.id, assetId: 'arched-window', attachment: 'back-wall', col, y: 1.1 });
    }
    // Floor furniture by kind.
    const wants = KIND_FURNITURE[room.kind] ?? [];
    wants.forEach((assetId, k) => {
      const f = fp(assetId);
      if (!f) return;
      const cols: number[] = [];
      for (let a = 0, b = room.width - f.w; a <= b; a++, b--) { cols.push(a); if (b !== a) cols.push(b); }
      for (let row = 0; row + f.h <= depth - 1; row++) {
        for (const col of cols) {
          const item = { id: `${room.id}-dress-${k}`, roomId: room.id, assetId, col, row };
          w.furniture.push(item);
          if (valid(w, fp)) return;
          w.furniture.pop();
        }
      }
    });
  }
  return w;
}
