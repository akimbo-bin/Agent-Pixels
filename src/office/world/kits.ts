import type { DecorDef, FurnitureDef, OfficeWorld } from './schema.js';

/**
 * A room kit dressing: which pack textures skin one room, and which pack
 * furniture/decor it places. Applying it never touches floors, rooms, doors or
 * elevators; the result is validated like any other edit.
 */
export interface RoomKitDressing {
  packId: string;
  wallTextureId?: string;
  /** Whole-room painted plate (wins over wall/floor art when it is loaded). */
  plateId?: string;
  floorTextureId?: string;
  skyLayerId?: string;
  slabTextureId?: string;
  /** Furniture ids in the room to remove before placing the kit's pieces. */
  replaceFurniture?: string[];
  replaceDecor?: string[];
  furniture: Array<Omit<FurnitureDef, 'roomId'>>;
  decor: Array<Omit<DecorDef, 'roomId'>>;
  /** Optional agent to seat at one of the kit's chairs. */
  seat?: { agentId: string; chairId: string };
}

export function applyRoomKit(world: OfficeWorld, roomId: string, kit: RoomKitDressing): OfficeWorld {
  const w = JSON.parse(JSON.stringify(world)) as OfficeWorld;
  const room = w.rooms.find(r => r.id === roomId);
  if (!room) throw new Error(`No room ${roomId}`);
  room.surfaces = {
    ...room.surfaces,
    backWall: { ...(room.surfaces?.backWall ?? { material: 'plaster' }), ...(kit.wallTextureId ? { textureId: kit.wallTextureId } : {}) },
    floor: { ...(room.surfaces?.floor ?? { material: 'wood' }), ...(kit.floorTextureId ? { textureId: kit.floorTextureId } : {}) },
  };
  if (kit.plateId) room.surfaces.plate = { material: 'plate', textureId: kit.plateId };
  const dropF = new Set(kit.replaceFurniture ?? []), dropD = new Set(kit.replaceDecor ?? []);
  w.furniture = w.furniture.filter(f => !(f.roomId === roomId && dropF.has(f.id)));
  w.decor = w.decor.filter(d => !(d.roomId === roomId && dropD.has(d.id)));
  w.furniture.push(...kit.furniture.map(f => ({ ...f, roomId })));
  w.decor.push(...kit.decor.map(d => ({ ...d, roomId })));
  if (kit.skyLayerId) w.background = { ...w.background, skyLayerId: kit.skyLayerId };
  if (kit.slabTextureId) w.structure = { ...w.structure, slabTextureId: kit.slabTextureId };
  w.assetPacks = [...new Set([...(w.assetPacks ?? []), kit.packId])];
  if (kit.seat) {
    const agent = w.agents.find(a => a.id === kit.seat!.agentId);
    if (agent) { agent.seatId = kit.seat.chairId; delete agent.roomId; }
  }
  return w;
}

/**
 * Nebula-night executive office for the campus sample's Lead (Main) room.
 * Room-first: the furniture below is placed for real (collision, seats), the
 * back wall is a painted backdrop, and the whole room is then painted as ONE
 * plate over the engine's own render of exactly this layout.
 */
export const NEBULA_EXEC_DRESSING: RoomKitDressing = {
  packId: 'nebula-lead-room',
  // FLUX.2-klein shell (walls, built-ins, window, floor, rug) painted from the engine's own
  // furniture-free render in the style of the Nebula reference; furniture are separate sprites.
  plateId: 'exec-room-shell',
  replaceFurniture: ['lead-desk', 'lead-pc', 'lead-library', 'lead-plant'],
  replaceDecor: ['lead-art'],
  furniture: [
    // Directly in front of the Lead's chair (col 5, row 0).
    { id: 'exec-desk', assetId: 'exec-desk', col: 4, row: 1 },
    { id: 'exec-pc', assetId: 'desk-monitor', col: 6, row: 1 },
    { id: 'exec-sofa', assetId: 'velvet-sofa', col: 0, row: 2 },
    { id: 'exec-coffee', assetId: 'coffee-table', col: 0, row: 4 },
    { id: 'exec-arm-l', assetId: 'velvet-armchair', col: 3, row: 5 },
    { id: 'exec-arm-r', assetId: 'velvet-armchair', col: 8, row: 5 },
    { id: 'exec-globe', assetId: 'brass-globe', col: 9, row: 2 },
    { id: 'exec-lamp-l', assetId: 'exec-lamp', col: 2, row: 0 },
    { id: 'exec-lamp-r', assetId: 'exec-lamp', col: 9, row: 0 },
    { id: 'exec-plant', assetId: 'potted-fig', col: 10, row: 2 },
  ],
  // The rug is painted into the shell (its guide was rendered with this decor in place).
  decor: [{ id: 'exec-rug', assetId: 'galaxy-rug', attachment: 'floor', col: 3, y: 2 }],
};

/**
 * A whole building's art: every room dressed for its kind (dress.ts), each room
 * (except those with their own room kit) shown as a painted SHELL from `packId`
 * named `<roomId>-shell`, and every furniture type skinned by the same pack.
 */
export interface BuildingKit {
  building: string; packId: string; skipRooms: string[];
  /** Live objects: furniture bound to a real status source (world.bindings[id].live). */
  live?: Array<{ id: string; roomId: string; assetId: string; source: string; metricsFrom?: string }>;
}
export const BUILDING_KITS: BuildingKit[] = [
  {
    building: 'nebula-campus', packId: 'nebula-campus-v1', skipRooms: ['lead'],
    live: [
      { id: 'live-training', roomId: 'training', assetId: 'training-rig', source: 'nebula.training', metricsFrom: 'host.gpu' },
      { id: 'live-render', roomId: 'rendering', assetId: 'render-rack', source: 'nebula.render' },
    ],
  },
];

/** Every dressing we can offer, keyed by the room it was authored for. */
export const ROOM_KITS: Array<{ roomId: string; dressing: RoomKitDressing }> = [];

/** The first generated kit, dressing the two-floor sample's Music Studio. */
export const MUSIC_STUDIO_DRESSING: RoomKitDressing = {
  packId: 'music-studio-kit-v1',
  wallTextureId: 'studio-wall-acoustic',
  floorTextureId: 'studio-floor-oak',
  skyLayerId: 'studio-sky-night',
  slabTextureId: 'studio-trim-slab',
  replaceFurniture: ['music-sofa', 'music-arcade', 'music-plant'],
  replaceDecor: ['music-art-1', 'music-art-2'],
  furniture: [
    { id: 'kit-console', assetId: 'studio-console', col: 5, row: 2 },
    { id: 'kit-chair', assetId: 'WOODEN_CHAIR_FRONT', col: 6, row: 0 },
    { id: 'kit-speaker-l', assetId: 'studio-speaker', col: 3, row: 2 },
    { id: 'kit-speaker-r', assetId: 'studio-speaker', col: 9, row: 2 },
    { id: 'kit-plant', assetId: 'LARGE_PLANT', col: 11, row: 0 },
  ],
  decor: [
    { id: 'kit-diffuser', assetId: 'studio-diffuser', attachment: 'back-wall', col: 1, y: 1.6 },
    { id: 'kit-poster-1', assetId: 'studio-poster', attachment: 'back-wall', col: 9, y: 1.9 },
    { id: 'kit-poster-2', assetId: 'studio-poster', attachment: 'back-wall', col: 4, y: 1.9 },
  ],
  seat: { agentId: 'a-guest', chairId: 'kit-chair' },
};

ROOM_KITS.push({ roomId: 'music', dressing: MUSIC_STUDIO_DRESSING }, { roomId: 'lead', dressing: NEBULA_EXEC_DRESSING });
