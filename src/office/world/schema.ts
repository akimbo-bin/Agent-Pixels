/**
 * Agent Pixels V3 world schema: the ONE authoritative description of a
 * Paperclip office building. Rendering, collision, navigation, hit testing,
 * editing and persistence all derive from this document via `compileWorld`.
 *
 * Coordinate conventions (all in world tiles; 1 tile = 16 source pixels):
 *  - `x`      horizontal position across the whole building (left -> right).
 *  - `depth`  shallow front-to-back walking depth of a floor/room, in tiles.
 *             A room occupies the FRONT `depth` rows of its floor.
 *  - Room-local grid cells use `col` (0 = room's left interior column) and
 *    `row` (0 = room's BACK row, increasing toward the viewer). This matches
 *    the source Agent Pixels footprint convention: the top footprint row is
 *    the one furthest from the viewer.
 *  - Floors stack by `level` (0 = ground). Level numbers need not be contiguous
 *    in order of declaration, but must be unique.
 *
 * Nothing here knows about any particular organization. Room `kind` is a free
 * string used only to choose a style preset.
 */

export const WORLD_SCHEMA_VERSION = 2 as const;

export interface MaterialRef {
  /** Style-pack material id, e.g. 'plaster', 'wood-panel', 'lab-tile'. */
  material: string;
  /** Optional tint (#rrggbb) applied by procedural fallbacks. */
  tint?: string;
}

export interface FloorDef {
  id: string;
  level: number;
  name?: string;
  /** Walkable depth (rows) available to rooms on this floor. 2..12. */
  depth: number;
  /** Interior wall height in tiles (characters are 2 tiles tall). */
  wallHeight: number;
}

export interface RoomDef {
  id: string;
  floorId: string;
  name: string;
  /** Freeform preset/category ('office', 'corridor', 'studio', ...). */
  kind: string;
  /** Left interior column in building coordinates. */
  x: number;
  /** Interior width in tiles (wall columns are outside this span). */
  width: number;
  /** Interior depth in rows; defaults to the floor depth. */
  depth?: number;
  surfaces?: { backWall?: MaterialRef; floor?: MaterialRef };
}

/**
 * A doorway through the single wall column shared by two side-by-side cells
 * on the same floor. `z` is the depth (rows from the front) where the opening
 * starts; the opening spans `width` rows toward the back.
 */
export interface DoorDef {
  kind: 'door';
  id: string;
  /** Two room ids, or `elevatorId@floorId` for an elevator lobby. */
  between: [string, string];
  z: number;
  width: number;
  open: boolean;
}

export interface ElevatorStopDef {
  floorId: string;
}

/**
 * A vertical shaft occupying columns [x, x+width) on every floor between its
 * lowest and highest stop. On stop floors the front `lobbyDepth` rows form a
 * walkable lobby (connected to rooms by ordinary doors); the cabin travels in
 * the well behind it. Floors are ONLY changed by riding a cabin.
 */
export interface ElevatorDef {
  kind: 'elevator';
  id: string;
  x: number;
  width: number;
  lobbyDepth: number;
  stops: ElevatorStopDef[];
  capacity: number;
  secondsPerFloor: number;
}

export type ConnectorDef = DoorDef | ElevatorDef;

export interface FurnitureDef {
  id: string;
  roomId: string;
  /** Catalog asset id (collision footprint comes from the catalog entry). */
  assetId: string;
  col: number;
  row: number;
}

export type DecorAttachment = 'back-wall' | 'floor';

/** Non-blocking set dressing. Never affects navigation. */
export interface DecorDef {
  id: string;
  roomId: string;
  assetId: string;
  attachment: DecorAttachment;
  /** Room-local column of the left edge. */
  col: number;
  /** back-wall: tiles above the floor; floor: room-local row. */
  y: number;
}

export interface AgentDef {
  id: string;
  name: string;
  /** Arbitrary role label supplied by the organization. */
  role: string;
  /** Character sprite index (skin). */
  skin: number;
  /** Chair furniture id to sit at, if any. */
  seatId?: string;
  /** Room to start in when no seat is given. */
  roomId?: string;
}

export interface BackgroundDef {
  preset: 'night' | 'dusk' | 'day';
  seed?: number;
}

export interface OfficeWorld {
  schemaVersion: typeof WORLD_SCHEMA_VERSION;
  id: string;
  name: string;
  stylePackId: string;
  seed: number;
  floors: FloorDef[];
  rooms: RoomDef[];
  connectors: ConnectorDef[];
  furniture: FurnitureDef[];
  decor: DecorDef[];
  agents: AgentDef[];
  background: BackgroundDef;
  /** Optional external metadata keyed by entity id. Never read by the compiler. */
  bindings?: Record<string, unknown>;
}

export const isDoor = (c: ConnectorDef): c is DoorDef => c.kind === 'door';
export const isElevator = (c: ConnectorDef): c is ElevatorDef => c.kind === 'elevator';

/** Id of the lobby cell an elevator exposes on one of its stop floors. */
export const lobbyId = (elevatorId: string, floorId: string) => `${elevatorId}@${floorId}`;

export function cloneWorld(world: OfficeWorld): OfficeWorld {
  return JSON.parse(JSON.stringify(world)) as OfficeWorld;
}
