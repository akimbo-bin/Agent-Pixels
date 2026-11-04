import { getCatalogEntry } from '../layout/furnitureCatalog.js';
import { TileType, type OfficeLayout, type PlacedFurniture } from '../types.js';
import {
  type DoorDef,
  type ElevatorDef,
  type FloorDef,
  type OfficeWorld,
  type RoomDef,
  isDoor,
  isElevator,
  lobbyId,
} from './schema.js';
import {
  type FloorSpan,
  type FootprintInfo,
  type FootprintSource,
  type WorldIssue,
  floorSpans,
  validateWorld,
} from './validator.js';

/** Tile in the compiled grid (the OfficeState/pathfinding coordinate space). */
export interface GridPoint { col: number; row: number }

export interface CompiledFloor {
  def: FloorDef;
  /** First grid row of this floor's band (its back row). */
  rowStart: number;
  depth: number;
}

export interface CompiledCell extends FloorSpan {
  room?: RoomDef;
  /** Grid row of the cell's back-most interior row. */
  rowStart: number;
}

export interface CompiledDoor {
  def: DoorDef;
  floorId: string;
  /** Wall column the opening is cut through. */
  col: number;
  /** Grid rows of the opening, front-most last. */
  rows: number[];
  /** Cell ids on the left and right of the wall. */
  left: string;
  right: string;
}

export interface CompiledStop {
  floorId: string;
  lobbyId: string;
  /** Walkable lobby tiles, front row first. Riders wait and exit here. */
  landing: GridPoint[];
}

export interface CompiledElevator {
  def: ElevatorDef;
  stops: CompiledStop[];
}

/**
 * The single compiled form of an OfficeWorld. `layout` is consumed unchanged
 * by the existing OfficeState / findPath / seat machinery, so the source Agent
 * Pixels walking, sitting and animation code keeps working. All geometry the
 * renderer draws is derived from the same cells, doors and floors.
 */
export interface CompiledWorld {
  world: OfficeWorld;
  layout: OfficeLayout;
  cols: number;
  rows: number;
  floors: CompiledFloor[];
  cells: CompiledCell[];
  doors: CompiledDoor[];
  elevators: CompiledElevator[];
  /** Wall columns per floor: col -> depth (rows) of solid wall from the front. */
  walls: Map<string, Map<number, number>>;
  floorOfRow(row: number): CompiledFloor | undefined;
  cellAt(col: number, row: number): CompiledCell | undefined;
  /** Depth from the front edge (tile centre of row => z + 0.5). */
  zOfRow(row: number): number;
  rowOfZ(floorId: string, z: number): number;
  roomTile(roomId: string, col: number, row: number): GridPoint;
}

export class WorldValidationError extends Error {
  constructor(readonly issues: WorldIssue[]) {
    super(`World is invalid:\n- ${issues.map(i => i.message).join('\n- ')}`);
  }
}

/** Reads physical facts from the loaded Agent Pixels catalog. */
export const catalogFootprints: FootprintSource = (assetId) => {
  const e = getCatalogEntry(assetId);
  if (!e) return undefined;
  return footprintOfEntry(e);
};
export function footprintOfEntry(e: {
  footprintW: number; footprintH: number; backgroundTiles?: number; isDesk: boolean;
  category?: string; canPlaceOnSurfaces?: boolean;
}): FootprintInfo {
  return {
    w: e.footprintW, h: e.footprintH, backgroundRows: e.backgroundTiles ?? 0,
    isDesk: e.isDesk, isChair: e.category === 'chairs', canPlaceOnSurfaces: !!e.canPlaceOnSurfaces,
  };
}

export function compileWorld(world: OfficeWorld, footprint: FootprintSource = catalogFootprints): CompiledWorld {
  const issues = validateWorld(world, footprint);
  if (issues.length) throw new WorldValidationError(issues);

  // Highest storey first in the grid; one VOID separator row between floors
  // guarantees no walk-only path can ever cross storeys.
  const ordered = [...world.floors].sort((a, b) => b.level - a.level);
  const floors: CompiledFloor[] = [];
  let row = 0;
  for (const def of ordered) {
    floors.push({ def, rowStart: row, depth: def.depth });
    row += def.depth + 1;
  }
  const rows = row - 1;
  const floorById = new Map(floors.map(f => [f.def.id, f]));
  const spans = floorSpans(world);
  let cols = 0;
  for (const list of spans.values()) for (const s of list) cols = Math.max(cols, s.x + s.width + 1);

  const tiles = new Array<TileType>(cols * rows).fill(TileType.VOID);
  const set = (c: number, r: number, t: TileType) => { tiles[r * cols + c] = t; };
  const get = (c: number, r: number) => tiles[r * cols + c];

  const cells: CompiledCell[] = [];
  const walls = new Map<string, Map<number, number>>();
  for (const floor of floors) {
    const wallDepth = new Map<number, number>();
    walls.set(floor.def.id, wallDepth);
    for (const span of spans.get(floor.def.id) ?? []) {
      const room = span.kind === 'room' ? world.rooms.find(r => r.id === span.id) : undefined;
      const cellRowStart = floor.rowStart + floor.depth - span.depth;
      cells.push({ ...span, room, rowStart: cellRowStart });
      for (let z = 0; z < floor.depth; z++) {
        const r = floor.rowStart + floor.depth - 1 - z;
        for (let c = span.x; c < span.x + span.width; c++) {
          const walk = span.kind === 'room' ? z < span.depth : z < span.walkDepth;
          set(c, r, walk ? TileType.FLOOR_1 : TileType.WALL);
        }
      }
      // Side walls run the full floor depth so nothing walks around a shallow room.
      for (const c of [span.x - 1, span.x + span.width]) {
        wallDepth.set(c, Math.max(wallDepth.get(c) ?? 0, floor.depth));
        for (let z = 0; z < floor.depth; z++) {
          const r = floor.rowStart + floor.depth - 1 - z;
          if (get(c, r) === TileType.VOID) set(c, r, TileType.WALL);
        }
      }
    }
  }

  const cellById = new Map(cells.map(c => [c.id, c]));
  const doors: CompiledDoor[] = [];
  for (const def of world.connectors.filter(isDoor)) {
    const a = cellById.get(def.between[0])!, b = cellById.get(def.between[1])!;
    const [left, right] = a.x < b.x ? [a, b] : [b, a];
    const floor = floorById.get(a.floorId)!;
    const col = left.x + left.width;
    const doorRows: number[] = [];
    for (let z = def.z + def.width - 1; z >= def.z; z--) {
      const r = floor.rowStart + floor.depth - 1 - z;
      doorRows.push(r);
      set(col, r, def.open ? TileType.FLOOR_1 : TileType.WALL);
    }
    doors.push({ def, floorId: a.floorId, col, rows: doorRows, left: left.id, right: right.id });
  }

  const elevators: CompiledElevator[] = world.connectors.filter(isElevator).map(def => ({
    def,
    stops: def.stops.map(s => {
      const floor = floorById.get(s.floorId)!;
      const landing: GridPoint[] = [];
      for (let z = 0; z < def.lobbyDepth; z++) {
        for (let c = def.x; c < def.x + def.width; c++) landing.push({ col: c, row: floor.rowStart + floor.depth - 1 - z });
      }
      return { floorId: s.floorId, lobbyId: lobbyId(def.id, s.floorId), landing };
    }),
  }));

  const roomTile = (roomId: string, col: number, r: number): GridPoint => {
    const cell = cellById.get(roomId);
    if (!cell) throw Error(`Unknown room ${roomId}`);
    return { col: cell.x + col, row: cell.rowStart + r };
  };

  const furniture: PlacedFurniture[] = world.furniture.map(f => {
    const t = roomTile(f.roomId, f.col, f.row);
    return { uid: f.id, type: f.assetId, col: t.col, row: t.row };
  });

  const spawnCell = cells.find(c => c.kind === 'lobby') ?? cells.find(c => c.kind === 'room')!;
  const spawnFloor = floorById.get(spawnCell.floorId)!;
  const layout: OfficeLayout = {
    version: 1, cols, rows, tiles, furniture,
    spawnTile: { col: spawnCell.x, row: spawnFloor.rowStart + spawnFloor.depth - 1 },
  };

  const floorOfRow = (r: number) => floors.find(f => r >= f.rowStart && r < f.rowStart + f.depth);
  return {
    world, layout, cols, rows, floors, cells, doors, elevators, walls,
    floorOfRow,
    cellAt(c, r) {
      const f = floorOfRow(r);
      if (!f) return undefined;
      return cells.find(cell => cell.floorId === f.def.id && c >= cell.x && c < cell.x + cell.width && r >= cell.rowStart);
    },
    zOfRow(r) {
      const f = floorOfRow(Math.floor(r)) ?? floorOfRow(Math.round(r));
      if (!f) return 0;
      return f.rowStart + f.depth - r;
    },
    rowOfZ(floorId, z) {
      const f = floorById.get(floorId)!;
      return f.rowStart + f.depth - z;
    },
    roomTile,
  };
}

/** Compile and return issues instead of throwing (for editor feedback). */
export function tryCompileWorld(world: OfficeWorld, footprint: FootprintSource = catalogFootprints):
  { ok: true; compiled: CompiledWorld } | { ok: false; issues: WorldIssue[] } {
  try {
    return { ok: true, compiled: compileWorld(world, footprint) };
  } catch (e) {
    if (e instanceof WorldValidationError) return { ok: false, issues: e.issues };
    return { ok: false, issues: [{ code: 'compile', message: String(e) }] };
  }
}
