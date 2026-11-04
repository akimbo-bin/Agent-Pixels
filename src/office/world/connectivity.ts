import { TileType } from '../types.js';
import type { CompiledWorld, GridPoint } from './compiler.js';
import { catalogFootprints } from './compiler.js';
import type { FootprintSource, WorldIssue } from './validator.js';

/** Solid furniture tiles, using the same rule as the source getBlockedTiles. */
export function blockedFurnitureTiles(compiled: CompiledWorld, footprint: FootprintSource = catalogFootprints): Set<string> {
  const blocked = new Set<string>();
  for (const f of compiled.layout.furniture) {
    const fp = footprint(f.type);
    if (!fp) continue;
    for (let dr = fp.backgroundRows; dr < fp.h; dr++) {
      for (let dc = 0; dc < fp.w; dc++) blocked.add(`${f.col + dc},${f.row + dr}`);
    }
  }
  return blocked;
}

export function seatTiles(compiled: CompiledWorld, footprint: FootprintSource = catalogFootprints): Array<GridPoint & { id: string }> {
  const out: Array<GridPoint & { id: string }> = [];
  for (const f of compiled.layout.furniture) {
    const fp = footprint(f.type);
    if (!fp?.isChair) continue;
    let n = 0;
    for (let dr = fp.backgroundRows; dr < fp.h; dr++) {
      for (let dc = 0; dc < fp.w; dc++) out.push({ id: n++ ? `${f.uid}:${n - 1}` : f.uid, col: f.col + dc, row: f.row + dr });
    }
  }
  return out;
}

/**
 * Whole-building reachability: walk regions joined by open doors, and storeys
 * joined ONLY through elevator lobbies. Reports orphan rooms, furniture pockets
 * and unreachable seats as actionable issues.
 */
export function checkConnectivity(compiled: CompiledWorld, footprint: FootprintSource = catalogFootprints): WorldIssue[] {
  const { cols, rows, layout } = compiled;
  const blocked = blockedFurnitureTiles(compiled, footprint);
  // Structural reachability: a CLOSED door is still a doorway (it can be opened),
  // so closing one never makes the building invalid; it only blocks routes at runtime.
  const doorTiles = new Set(compiled.doors.flatMap(d => d.rows.map(r => `${d.col},${r}`)));
  const walk = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && !blocked.has(`${c},${r}`) &&
    (doorTiles.has(`${c},${r}`) || (layout.tiles[r * cols + c] !== TileType.WALL && layout.tiles[r * cols + c] !== TileType.VOID));

  // Label 4-connected components (diagonals never add connectivity under strict corner clearance).
  const label = new Int32Array(cols * rows).fill(-1);
  let n = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!walk(c, r) || label[r * cols + c] >= 0) continue;
    const stack = [[c, r]];
    label[r * cols + c] = n;
    while (stack.length) {
      const [x, y] = stack.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (walk(nx, ny) && label[ny * cols + nx] < 0) { label[ny * cols + nx] = n; stack.push([nx, ny]); }
      }
    }
    n++;
  }
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };
  for (const e of compiled.elevators) {
    const comps = e.stops.map(s => s.landing.map(p => label[p.row * cols + p.col]).find(l => l >= 0)).filter((l): l is number => l !== undefined);
    for (let i = 1; i < comps.length; i++) union(comps[0], comps[i]);
  }

  // The main region is the one holding the most room tiles.
  const weight = new Map<number, number>();
  for (let i = 0; i < label.length; i++) if (label[i] >= 0) weight.set(find(label[i]), (weight.get(find(label[i])) ?? 0) + 1);
  let main = -1, best = -1;
  for (const [k, w] of weight) if (w > best) { best = w; main = k; }

  const issues: WorldIssue[] = [];
  for (const cell of compiled.cells) {
    if (cell.kind === 'shaft') continue;
    let total = 0, stranded = 0;
    for (let r = cell.rowStart; r < cell.rowStart + cell.depth; r++) for (let c = cell.x; c < cell.x + cell.width; c++) {
      const l = label[r * cols + c];
      if (l < 0) continue;
      total++;
      if (find(l) !== main) stranded++;
    }
    const name = cell.room?.name ?? cell.id;
    if (total && stranded === total) issues.push({ code: 'orphan', message: `"${name}" cannot be reached from the rest of the building. Add or open a door.`, entityId: cell.id });
    else if (stranded) issues.push({ code: 'pocket', message: `${stranded} floor tile(s) in "${name}" are walled in by furniture.`, entityId: cell.id });
  }
  for (const seat of seatTiles(compiled, footprint)) {
    const ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const l = label[(seat.row + dy) * cols + seat.col + dx];
      return walk(seat.col + dx, seat.row + dy) && l >= 0 && find(l) === main;
    });
    if (!ok) issues.push({ code: 'seat', message: `Seat "${seat.id}" has no reachable approach tile.`, entityId: seat.id });
  }
  return issues;
}
