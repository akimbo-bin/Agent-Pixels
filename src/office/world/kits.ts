import type { DecorDef, FurnitureDef, OfficeWorld } from './schema.js';

/**
 * A room kit dressing: which pack textures skin one room, and which pack
 * furniture/decor it places. Applying it never touches floors, rooms, doors or
 * elevators; the result is validated like any other edit.
 */
export interface RoomKitDressing {
  packId: string;
  wallTextureId?: string;
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

/** Nebula-night executive office for the campus sample's Lead (Main) room. */
export const NEBULA_EXEC_DRESSING: RoomKitDressing = {
  packId: 'nebula-exec-kit-v1',
  wallTextureId: 'exec-wall-wood',
  floorTextureId: 'exec-floor-parquet',
  replaceFurniture: ['lead-desk', 'lead-library', 'lead-plant'],
  replaceDecor: ['lead-art'],
  furniture: [
    { id: 'exec-desk', assetId: 'exec-desk', col: 4, row: 2 },
    // Beside the Lead's seat (col 5) so the monitor doesn't hide their face.
    { id: 'exec-pc', assetId: 'PC_BACK', col: 6, row: 2 },
    { id: 'exec-shelf-1', assetId: 'exec-bookshelf', col: 0, row: 0 },
    { id: 'exec-shelf-2', assetId: 'exec-bookshelf', col: 2, row: 0 },
    // The last column sits behind the right partition's front face; keep tall pieces clear of it.
    { id: 'exec-lamp', assetId: 'exec-lamp', col: 8, row: 0 },
    { id: 'exec-plant', assetId: 'LARGE_PLANT', col: 9, row: 0 },
  ],
  decor: [
    { id: 'exec-window', assetId: 'exec-window', attachment: 'back-wall', col: 5, y: 1.7 },
    { id: 'exec-banner-l', assetId: 'exec-banner', attachment: 'back-wall', col: 4, y: 2.6 },
    { id: 'exec-banner-r', assetId: 'exec-banner', attachment: 'back-wall', col: 8, y: 2.6 },
    // Two rows deep: y 3 spans z 1..3, under the desk front and clear of the balcony edge.
    { id: 'exec-rug', assetId: 'exec-rug', attachment: 'floor', col: 4, y: 3 },
  ],
};

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
