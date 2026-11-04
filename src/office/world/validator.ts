import {
  type DoorDef,
  type ElevatorDef,
  type OfficeWorld,
  WORLD_SCHEMA_VERSION,
  isDoor,
  isElevator,
  lobbyId,
} from './schema.js';

export interface WorldIssue {
  code: string;
  message: string;
  /** Entity the owner should look at to fix the problem. */
  entityId?: string;
}

/** Physical facts the validator needs about a catalog asset. */
export interface FootprintInfo {
  w: number;
  h: number;
  /** Top rows that are visual overhang only (walkable). */
  backgroundRows: number;
  isDesk: boolean;
  isChair: boolean;
  canPlaceOnSurfaces: boolean;
}
export type FootprintSource = (assetId: string) => FootprintInfo | undefined;

/** A horizontal span of a floor occupied by a room, lobby or pass-through shaft. */
export interface FloorSpan {
  id: string;
  kind: 'room' | 'lobby' | 'shaft';
  floorId: string;
  x: number;
  width: number;
  depth: number;
  /** Depth (rows from the front) agents can walk in, for door placement. */
  walkDepth: number;
}

export const LIMITS = {
  floorDepth: [2, 12],
  wallHeight: [3, 8],
  roomWidth: [2, 200],
  doorHeight: 2.6,
} as const;

/** Every span on each floor, including elevator lobbies and pass-through shafts. */
export function floorSpans(world: OfficeWorld): Map<string, FloorSpan[]> {
  const out = new Map<string, FloorSpan[]>(world.floors.map(f => [f.id, []]));
  const floorById = new Map(world.floors.map(f => [f.id, f]));
  for (const room of world.rooms) {
    const floor = floorById.get(room.floorId);
    if (!floor) continue;
    const depth = room.depth ?? floor.depth;
    out.get(floor.id)!.push({ id: room.id, kind: 'room', floorId: floor.id, x: room.x, width: room.width, depth, walkDepth: depth });
  }
  for (const elevator of world.connectors.filter(isElevator)) {
    const stopIds = new Set(elevator.stops.map(s => s.floorId));
    const levels = elevator.stops.map(s => floorById.get(s.floorId)?.level).filter((l): l is number => l !== undefined);
    if (!levels.length) continue;
    const lo = Math.min(...levels), hi = Math.max(...levels);
    for (const floor of world.floors) {
      if (floor.level < lo || floor.level > hi) continue;
      const stop = stopIds.has(floor.id);
      out.get(floor.id)!.push({
        id: stop ? lobbyId(elevator.id, floor.id) : `${elevator.id}#${floor.id}`,
        kind: stop ? 'lobby' : 'shaft', floorId: floor.id, x: elevator.x, width: elevator.width,
        depth: floor.depth, walkDepth: stop ? elevator.lobbyDepth : 0,
      });
    }
  }
  for (const spans of out.values()) spans.sort((a, b) => a.x - b.x);
  return out;
}

/**
 * Structural validation that needs no compiled grid. Returns human-readable,
 * actionable issues; an empty list means the world can be compiled.
 */
export function validateWorld(world: OfficeWorld, footprint: FootprintSource): WorldIssue[] {
  const issues: WorldIssue[] = [];
  const err = (code: string, message: string, entityId?: string) => issues.push({ code, message, entityId });

  if (world.schemaVersion !== WORLD_SCHEMA_VERSION) err('schema', `Unsupported schemaVersion ${String(world.schemaVersion)}; expected ${WORLD_SCHEMA_VERSION}.`);
  if (!world.floors.length) err('floors', 'A building needs at least one floor.');

  const ids = new Set<string>();
  const claim = (id: string, what: string) => {
    if (!id || typeof id !== 'string') err('id', `${what} has an empty id.`);
    else if (ids.has(id)) err('duplicate-id', `Id "${id}" is used more than once (${what}). Ids must be unique.`, id);
    else ids.add(id);
  };

  const floorById = new Map(world.floors.map(f => [f.id, f]));
  const levels = new Set<number>();
  for (const f of world.floors) {
    claim(f.id, 'floor');
    if (!Number.isInteger(f.level)) err('floor-level', `Floor "${f.id}" level must be an integer.`, f.id);
    if (levels.has(f.level)) err('floor-level', `Two floors share level ${f.level}.`, f.id);
    levels.add(f.level);
    if (!inRange(f.depth, LIMITS.floorDepth)) err('floor-depth', `Floor "${f.id}" depth ${f.depth} must be an integer ${LIMITS.floorDepth[0]}-${LIMITS.floorDepth[1]}.`, f.id);
    if (!inRange(f.wallHeight, LIMITS.wallHeight)) err('floor-height', `Floor "${f.id}" wallHeight ${f.wallHeight} must be ${LIMITS.wallHeight[0]}-${LIMITS.wallHeight[1]}.`, f.id);
  }

  const roomById = new Map(world.rooms.map(r => [r.id, r]));
  for (const r of world.rooms) {
    claim(r.id, 'room');
    const floor = floorById.get(r.floorId);
    if (!floor) { err('room-floor', `Room "${r.name}" is on unknown floor "${r.floorId}".`, r.id); continue; }
    if (!Number.isInteger(r.x) || r.x < 1) err('room-x', `Room "${r.name}" x must be an integer >= 1 (column 0 is the exterior wall).`, r.id);
    if (!inRange(r.width, LIMITS.roomWidth)) err('room-width', `Room "${r.name}" width must be an integer >= ${LIMITS.roomWidth[0]}.`, r.id);
    const depth = r.depth ?? floor.depth;
    if (!Number.isInteger(depth) || depth < 2 || depth > floor.depth) err('room-depth', `Room "${r.name}" depth ${depth} must be 2-${floor.depth} (its floor's depth).`, r.id);
  }

  const elevators = world.connectors.filter(isElevator);
  for (const e of elevators) {
    claim(e.id, 'elevator');
    if (!Number.isInteger(e.x) || e.x < 1 || !Number.isInteger(e.width) || e.width < 1) err('elevator-shape', `Elevator "${e.id}" needs integer x >= 1 and width >= 1.`, e.id);
    if (!Number.isInteger(e.capacity) || e.capacity < 1) err('elevator-capacity', `Elevator "${e.id}" capacity must be at least 1.`, e.id);
    if (!(e.secondsPerFloor > 0)) err('elevator-speed', `Elevator "${e.id}" secondsPerFloor must be positive.`, e.id);
    if (e.stops.length < 2) err('elevator-stops', `Elevator "${e.id}" needs at least two stops.`, e.id);
    const seen = new Set<string>();
    for (const s of e.stops) {
      const floor = floorById.get(s.floorId);
      if (!floor) err('elevator-stop-floor', `Elevator "${e.id}" stops at unknown floor "${s.floorId}".`, e.id);
      else if (!Number.isInteger(e.lobbyDepth) || e.lobbyDepth < 1 || e.lobbyDepth >= floor.depth) err('elevator-lobby', `Elevator "${e.id}" lobbyDepth must be 1-${floor.depth - 1} on floor "${floor.id}" so the cabin well fits behind it.`, e.id);
      if (seen.has(s.floorId)) err('elevator-stop-duplicate', `Elevator "${e.id}" lists floor "${s.floorId}" twice.`, e.id);
      seen.add(s.floorId);
    }
  }

  // Horizontal packing per floor: spans may not overlap, and need one wall column between them.
  const spans = floorSpans(world);
  for (const [floorId, list] of spans) {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      if (b.x < a.x + a.width + 1) {
        err('overlap', `On floor "${floorId}", "${a.id}" (x ${a.x}-${a.x + a.width - 1}) and "${b.id}" (x ${b.x}) overlap or share no wall column. Leave at least one column between them.`, b.id);
      }
    }
  }
  const spanById = new Map<string, FloorSpan>();
  for (const list of spans.values()) for (const s of list) spanById.set(s.id, s);

  const doorRows = new Map<string, Array<[number, number, string]>>();
  for (const d of world.connectors.filter(isDoor)) {
    claim(d.id, 'door');
    checkDoor(d, spanById, doorRows, err);
  }
  for (const e of elevators) {
    for (const s of e.stops) {
      const lobby = lobbyId(e.id, s.floorId);
      if (!world.connectors.some(c => isDoor(c) && c.between.includes(lobby))) {
        err('elevator-unreachable', `Elevator "${e.id}" stop on floor "${s.floorId}" has no door into its lobby. Add a door between "${lobby}" and a neighbouring room.`, e.id);
      }
    }
  }

  // Furniture: inside room interiors, no overlapping solids (surface items may sit on desks).
  const occupied = new Map<string, { id: string; desk: boolean; surface: boolean }>();
  for (const f of world.furniture) {
    claim(f.id, 'furniture');
    const room = roomById.get(f.roomId);
    const fp = footprint(f.assetId);
    if (!room) { err('furniture-room', `Furniture "${f.id}" is in unknown room "${f.roomId}".`, f.id); continue; }
    if (!fp) { err('furniture-asset', `Furniture "${f.id}" uses unknown asset "${f.assetId}".`, f.id); continue; }
    const depth = room.depth ?? floorById.get(room.floorId)?.depth ?? 0;
    if (!Number.isInteger(f.col) || !Number.isInteger(f.row) || f.col < 0 || f.row < 0 || f.col + fp.w > room.width || f.row + fp.h > depth) {
      err('furniture-bounds', `Furniture "${f.id}" (${fp.w}x${fp.h}) at ${f.col},${f.row} does not fit inside room "${room.name}" (${room.width}x${depth}).`, f.id);
      continue;
    }
    for (let dr = 0; dr < fp.h; dr++) for (let dc = 0; dc < fp.w; dc++) {
      const key = `${room.x + f.col + dc},${room.floorId},${f.row + dr + (floorById.get(room.floorId)!.depth - depth)}`;
      const other = occupied.get(key);
      if (other && !((other.desk && fp.canPlaceOnSurfaces) || (other.surface && fp.isDesk))) {
        err('furniture-overlap', `Furniture "${f.id}" overlaps "${other.id}".`, f.id);
        dr = fp.h; break;
      }
      if (!other) occupied.set(key, { id: f.id, desk: fp.isDesk, surface: fp.canPlaceOnSurfaces });
    }
  }

  const seatsTaken = new Set<string>();
  for (const a of world.agents) {
    claim(a.id, 'agent');
    if (a.seatId) {
      const chair = world.furniture.find(f => f.id === a.seatId);
      if (!chair || !footprint(chair.assetId)?.isChair) err('agent-seat', `Agent "${a.name}" seat "${a.seatId}" is not a chair.`, a.id);
      if (seatsTaken.has(a.seatId)) err('agent-seat', `Seat "${a.seatId}" is assigned to two agents.`, a.id);
      seatsTaken.add(a.seatId);
    } else if (a.roomId && !roomById.has(a.roomId)) err('agent-room', `Agent "${a.name}" starts in unknown room "${a.roomId}".`, a.id);
  }

  for (const d of world.decor) {
    claim(d.id, 'decor');
    const room = roomById.get(d.roomId);
    if (!room) err('decor-room', `Decor "${d.id}" is in unknown room "${d.roomId}".`, d.id);
    else if (d.col < 0 || d.col >= room.width) err('decor-bounds', `Decor "${d.id}" column ${d.col} is outside room "${room.name}".`, d.id);
  }
  return issues;
}

function checkDoor(
  d: DoorDef,
  spanById: Map<string, FloorSpan>,
  doorRows: Map<string, Array<[number, number, string]>>,
  err: (code: string, message: string, entityId?: string) => void,
) {
  const [a, b] = d.between.map(id => spanById.get(id));
  if (!a || !b) { err('door-target', `Door "${d.id}" connects unknown cell "${!a ? d.between[0] : d.between[1]}".`, d.id); return; }
  if (a.floorId !== b.floorId) { err('door-floor', `Door "${d.id}" joins cells on different floors; floors connect only by elevator.`, d.id); return; }
  const [left, right] = a.x < b.x ? [a, b] : [b, a];
  if (right.x !== left.x + left.width + 1) {
    err('door-adjacency', `Door "${d.id}": "${left.id}" and "${right.id}" are not separated by exactly one wall column, so there is no shared wall to open.`, d.id);
    return;
  }
  if (!Number.isInteger(d.z) || !Number.isInteger(d.width) || d.z < 0 || d.width < 1) { err('door-span', `Door "${d.id}" needs integer z >= 0 and width >= 1.`, d.id); return; }
  const maxZ = Math.min(left.walkDepth, right.walkDepth);
  if (d.z + d.width > maxZ) err('door-span', `Door "${d.id}" spans depth ${d.z}-${d.z + d.width - 1}, but both sides are only walkable to depth ${maxZ - 1}.`, d.id);
  const wallKey = `${a.floorId}:${left.x + left.width}`;
  const list = doorRows.get(wallKey) ?? [];
  for (const [z0, z1, other] of list) if (d.z < z1 && z0 < d.z + d.width) err('door-overlap', `Door "${d.id}" overlaps door "${other}" in the same wall.`, d.id);
  list.push([d.z, d.z + d.width, d.id]);
  doorRows.set(wallKey, list);
}

function inRange(n: number, [lo, hi]: readonly [number, number]) {
  return Number.isInteger(n) && n >= lo && n <= hi;
}

export function elevatorById(world: OfficeWorld, id: string): ElevatorDef | undefined {
  return world.connectors.find((c): c is ElevatorDef => isElevator(c) && c.id === id);
}
