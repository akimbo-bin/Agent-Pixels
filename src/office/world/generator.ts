import { type FurnitureDef, type OfficeWorld, type RoomDef, WORLD_SCHEMA_VERSION, lobbyId } from './schema.js';

export interface GeneratorOptions {
  floors: number;
  /** Interior width of the building in tiles. */
  width: number;
  minRoomWidth: number;
  seed: number;
}

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic building generator: same options => identical JSON. It
 * produces explicit topology (rooms, doors, one elevator) that the compiler
 * validates like any hand-authored world. It never paints or infers paths.
 */
export function generateBuilding(opts: Partial<GeneratorOptions> = {}): OfficeWorld {
  const o: GeneratorOptions = { floors: 3, width: 44, minRoomWidth: 5, seed: 7, ...opts };
  const rand = rng(o.seed);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const world: OfficeWorld = {
    schemaVersion: WORLD_SCHEMA_VERSION, id: `generated-${o.seed}`, name: `Generated #${o.seed}`,
    stylePackId: 'procedural-fallback-v1', seed: o.seed,
    floors: [], rooms: [], connectors: [], furniture: [], decor: [], agents: [], background: { preset: 'night', seed: o.seed },
  };
  const liftW = 3;
  const liftX = int(o.minRoomWidth + 2, o.width - o.minRoomWidth - liftW - 2);
  const multi = o.floors > 1;
  const walls = ['plaster', 'wood-panel', 'brick', 'lab-tile', 'panel', 'acoustic'];
  const floorsM = ['wood', 'carpet', 'tile', 'stone', 'concrete', 'technical'];
  let agentN = 0;

  for (let level = 0; level < o.floors; level++) {
    const floorId = `g${level}`;
    const depth = int(4, 7);
    world.floors.push({ id: floorId, level, depth, wallHeight: int(4, 6) });
    // Split [1, liftX-2] and [liftX+liftW+1, width] into rooms.
    const segments = multi ? [[1, liftX - 2], [liftX + liftW + 1, o.width]] : [[1, o.width]];
    const cells: Array<{ id: string; depth: number }> = [];
    let leftNeighbour: string | null = null;
    segments.forEach(([from, to], si) => {
      let x = from;
      const segRooms: RoomDef[] = [];
      while (to - x + 1 >= o.minRoomWidth) {
        const remaining = to - x + 1;
        let w = remaining < o.minRoomWidth * 2 + 1 ? remaining : int(o.minRoomWidth, Math.min(14, remaining - o.minRoomWidth - 1));
        if (remaining - w - 1 < o.minRoomWidth) w = remaining;
        const roomDepth = int(Math.min(3, depth), depth);
        const r: RoomDef = { id: `${floorId}-r${segRooms.length + si * 10}`, floorId, name: `Room ${level}.${segRooms.length + si * 10}`,
          kind: 'workspace', x, width: w, depth: roomDepth,
          surfaces: { backWall: { material: walls[int(0, walls.length - 1)] }, floor: { material: floorsM[int(0, floorsM.length - 1)] } } };
        segRooms.push(r);
        x += w + 1;
      }
      world.rooms.push(...segRooms);
      segRooms.forEach((r, i) => {
        if (i > 0) {
          const prev = segRooms[i - 1];
          const maxD = Math.min(prev.depth!, r.depth!);
          const width = Math.min(maxD, int(1, 3));
          world.connectors.push({ kind: 'door', id: `${r.id}-door`, between: [prev.id, r.id], z: int(0, maxD - width), width, open: true });
        }
        cells.push({ id: r.id, depth: r.depth! });
        furnish(world.furniture, r, () => rand());
      });
      if (multi && si === 0 && segRooms.length) leftNeighbour = segRooms[segRooms.length - 1].id;
      if (multi && si === 1 && segRooms.length) {
        const lobby = lobbyId('lift', floorId);
        if (leftNeighbour) world.connectors.push({ kind: 'door', id: `${floorId}-lift-l`, between: [leftNeighbour, lobby], z: 0, width: 2, open: true });
        world.connectors.push({ kind: 'door', id: `${floorId}-lift-r`, between: [lobby, segRooms[0].id], z: 0, width: 2, open: true });
      }
    });
  }
  if (multi) {
    world.connectors.push({ kind: 'elevator', id: 'lift', x: liftX, width: liftW, lobbyDepth: 2, capacity: int(1, 3), secondsPerFloor: 2,
      stops: world.floors.map(f => ({ floorId: f.id })) });
  }
  for (const f of world.furniture) if (f.assetId === 'WOODEN_CHAIR_FRONT') {
    world.agents.push({ id: `ga${agentN}`, name: `Agent ${agentN + 1}`, role: 'Member', skin: (agentN * 7) % 20, seatId: f.id });
    agentN++;
  }
  return world;
}

function furnish(out: FurnitureDef[], r: RoomDef, rand: () => number) {
  if (r.width >= 6 && (r.depth ?? 0) >= 5) {
    const col = 1 + Math.floor(rand() * (r.width - 4));
    out.push({ id: `${r.id}-chair`, roomId: r.id, assetId: 'WOODEN_CHAIR_FRONT', col: col + 1, row: 0 });
    out.push({ id: `${r.id}-desk`, roomId: r.id, assetId: 'DESK_FRONT', col, row: 2 });
  } else if (r.width >= 4 && (r.depth ?? 0) >= 4) {
    out.push({ id: `${r.id}-plant`, roomId: r.id, assetId: 'PLANT', col: r.width - 2, row: 0 });
  }
}
