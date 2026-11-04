import {
  type AgentDef,
  type DecorDef,
  type DoorDef,
  type ElevatorDef,
  type FloorDef,
  type FurnitureDef,
  type OfficeWorld,
  type RoomDef,
  WORLD_SCHEMA_VERSION,
  lobbyId,
} from './schema.js';

/**
 * Sample buildings. These are DATA, not engine configuration: the compiler,
 * renderer and navigation never import a template by name. Add organizations
 * by writing JSON in this shape (or generating it), not by editing core code.
 */

const door = (id: string, a: string, b: string, z = 0, width = 3, open = true): DoorDef =>
  ({ kind: 'door', id, between: [a, b], z, width, open });
const room = (id: string, floorId: string, name: string, kind: string, x: number, width: number, depth?: number,
  wall?: string, floor?: string, subtitle?: string): RoomDef =>
  ({ id, floorId, name, kind, x, width, ...(depth ? { depth } : {}), ...(subtitle ? { subtitle } : {}),
    surfaces: { backWall: { material: wall ?? 'plaster' }, floor: { material: floor ?? 'wood' } } });

/** Desk facing the viewer with a chair behind it: the agent sits facing out. */
/**
 * A side-on workstation: chair, the desk directly in front of the sitter, and
 * the monitor at the desk's right end turned toward them (not in front of their face).
 */
function workstation(out: FurnitureDef[], roomId: string, id: string, col: number, row = 0): string {
  out.push({ id: `${id}-chair`, roomId, assetId: 'office-chair', col: col + 1, row });
  out.push({ id: `${id}-desk`, roomId, assetId: 'office-desk', col, row: row + 1 });
  out.push({ id: `${id}-pc`, roomId, assetId: 'desk-monitor', col: col + 2, row: row + 1 });
  return `${id}-chair`;
}
const item = (id: string, roomId: string, assetId: string, col: number, row: number): FurnitureDef => ({ id, roomId, assetId, col, row });
const wallArt = (id: string, roomId: string, assetId: string, col: number, y = 1.4): DecorDef =>
  ({ id, roomId, assetId, attachment: 'back-wall', col, y });
const agent = (id: string, name: string, role: string, skin: number, seatId?: string, roomId?: string): AgentDef =>
  ({ id, name, role, skin, ...(seatId ? { seatId } : {}), ...(roomId ? { roomId } : {}) });

function shell(id: string, name: string, floors: FloorDef[], background: OfficeWorld['background']['preset'] = 'night'): OfficeWorld {
  return {
    schemaVersion: WORLD_SCHEMA_VERSION, id, name, stylePackId: 'procedural-fallback-v1', seed: 1,
    floors, rooms: [], connectors: [], furniture: [], decor: [], agents: [], background: { preset: background },
  };
}

/** One storey, no elevator: a small coworking studio. */
export function smallStudio(): OfficeWorld {
  const w = shell('small-studio', 'Small Studio', [{ id: 'f0', level: 0, depth: 5, wallHeight: 5 }], 'dusk');
  w.rooms.push(
    room('studio', 'f0', 'Studio', 'workspace', 1, 13, 5, 'wood-panel', 'wood'),
    room('lounge', 'f0', 'Lounge', 'lounge', 15, 9, 5, 'plaster', 'carpet'),
    room('kitchen', 'f0', 'Kitchen', 'kitchen', 25, 6, 4, 'tile', 'tile'),
  );
  w.connectors.push(door('d-studio-lounge', 'studio', 'lounge', 0, 3), door('d-lounge-kitchen', 'lounge', 'kitchen', 1, 2));
  const s1 = workstation(w.furniture, 'studio', 'ws1', 1);
  const s2 = workstation(w.furniture, 'studio', 'ws2', 6);
  w.furniture.push(
    item('studio-shelf', 'studio', 'DOUBLE_BOOKSHELF', 10, 0),
    item('studio-plant', 'studio', 'PLANT', 0, 3),
    item('lounge-sofa', 'lounge', 'SOFA_FRONT', 3, 1),
    item('lounge-table', 'lounge', 'low-table', 3, 2),
    item('lounge-plant', 'lounge', 'LARGE_PLANT', 7, 0),
    item('kitchen-coffee', 'kitchen', 'low-table', 3, 1),
    item('kitchen-bin', 'kitchen', 'BIN', 0, 0),
  );
  w.decor.push(wallArt('studio-board', 'studio', 'WHITEBOARD', 4, 1.6), wallArt('lounge-art', 'lounge', 'LARGE_PAINTING', 1, 1.5),
    wallArt('kitchen-clock', 'kitchen', 'CLOCK', 1, 1.8));
  w.agents.push(agent('a1', 'Avery', 'Lead', 1, s1), agent('a2', 'Blake', 'Designer', 4, s2), agent('a3', 'Casey', 'Engineer', 7, undefined, 'lounge'));
  return w;
}

/** Two storeys joined by a two-passenger elevator. Includes an aesthetic Music Studio. */
export function twoFloorOffice(): OfficeWorld {
  const w = shell('two-floor-office', 'Two-Floor Office', [
    { id: 'ground', level: 0, name: 'Ground', depth: 6, wallHeight: 5 },
    { id: 'upper', level: 1, name: 'Upper', depth: 6, wallHeight: 5 },
  ]);
  w.rooms.push(
    room('reception', 'ground', 'Reception', 'reception', 1, 8, 6, 'plaster', 'stone'),
    room('hall', 'ground', 'Hall', 'corridor', 10, 10, 4, 'plaster', 'stone'),
    room('workshop', 'ground', 'Workshop', 'workspace', 25, 13, 6, 'brick', 'concrete'),
    room('lead', 'upper', 'Lead Office', 'office', 1, 8, 6, 'wood-panel', 'wood'),
    room('meeting', 'upper', 'Meeting Room', 'meeting', 10, 10, 6, 'plaster', 'carpet'),
    room('music', 'upper', 'Music Studio', 'studio', 25, 13, 6, 'acoustic', 'wood'),
  );
  const lift: ElevatorDef = { kind: 'elevator', id: 'lift', x: 21, width: 3, lobbyDepth: 2, capacity: 2, secondsPerFloor: 2.4,
    stops: [{ floorId: 'ground' }, { floorId: 'upper' }] };
  w.connectors.push(lift,
    door('d-rec-hall', 'reception', 'hall', 0, 3),
    door('d-hall-lift', 'hall', lobbyId('lift', 'ground'), 0, 2),
    door('d-lift-workshop', lobbyId('lift', 'ground'), 'workshop', 0, 2),
    door('d-lead-meeting', 'lead', 'meeting', 1, 3),
    door('d-meeting-lift', 'meeting', lobbyId('lift', 'upper'), 0, 2),
    door('d-lift-music', lobbyId('lift', 'upper'), 'music', 0, 2),
  );
  const rec = workstation(w.furniture, 'reception', 'rec', 2);
  const ws1 = workstation(w.furniture, 'workshop', 'wsa', 2);
  const ws2 = workstation(w.furniture, 'workshop', 'wsb', 9);
  const lead = workstation(w.furniture, 'lead', 'lead', 2);
  w.furniture.push(
    item('rec-plant', 'reception', 'PLANT_2', 0, 4),
    item('hall-bench', 'hall', 'WOODEN_BENCH', 4, 0),
    item('hall-plant', 'hall', 'PLANT', 8, 0),
    item('workshop-shelf', 'workshop', 'DOUBLE_BOOKSHELF', 6, 0),
    item('lead-shelf', 'lead', 'DOUBLE_BOOKSHELF', 6, 0),
    item('meeting-table', 'meeting', 'meeting-table', 3, 2),
    item('meeting-chair-l', 'meeting', 'WOODEN_CHAIR_SIDE', 2, 2),
    item('meeting-chair-r', 'meeting', 'WOODEN_CHAIR_SIDE:left', 7, 2),
    item('music-sofa', 'music', 'SOFA_FRONT', 2, 2),
    item('music-arcade', 'music', 'ARCADE_MACHINE', 9, 0),
    item('music-plant', 'music', 'LARGE_PLANT', 6, 0),
  );
  w.decor.push(
    wallArt('rec-clock', 'reception', 'CLOCK', 6, 1.8), wallArt('hall-art', 'hall', 'LARGE_PAINTING', 2, 1.5),
    wallArt('workshop-board', 'workshop', 'WHITEBOARD', 11, 1.4), wallArt('lead-art', 'lead', 'SMALL_PAINTING', 1, 1.7),
    wallArt('meeting-board', 'meeting', 'WHITEBOARD', 1, 1.4), wallArt('music-art-1', 'music', 'SMALL_PAINTING_2', 5, 1.8),
    wallArt('music-art-2', 'music', 'SMALL_PAINTING', 11, 1.8),
  );
  w.agents.push(
    agent('a-clerk', 'Robin', 'Admin', 2, rec), agent('a-eng1', 'Sam', 'Engineer', 5, ws1),
    agent('a-eng2', 'Jules', 'Engineer', 9, ws2), agent('a-lead', 'Morgan', 'Lead', 0, lead),
    agent('a-guest', 'Quinn', 'Reviewer', 12, undefined, 'meeting'),
  );
  return w;
}

/**
 * The historical Nebula Research campus re-expressed as a sample template.
 * Room ids keep the persisted keys (lead, leadSol, ..., gallery) so saved
 * scenes can be migrated; `gallery` is presented as an aesthetic Music Studio.
 */
export function nebulaCampusSample(): OfficeWorld {
  const w = shell('nebula-campus', 'Research Campus (sample)', [
    { id: 'upper', level: 2, name: 'Observatory', depth: 6, wallHeight: 6 },
    { id: 'middle', level: 1, name: 'Labs', depth: 6, wallHeight: 6 },
    { id: 'lower', level: 0, name: 'Operations', depth: 6, wallHeight: 6 },
  ]);
  w.stylePackId = 'nebula-night';
  // Deep dollhouse floor like the Nebula reference art.
  // ...at double pixel density, so painted rooms keep their detail.
  w.view = { rise: 1, tilePx: 32 };
  w.rooms.push(
    room('lead', 'upper', 'Lead (Main)', 'office', 1, 12, 6, 'wood-panel', 'wood', 'Executive Office'),
    room('leadSol', 'upper', 'Lead (Second)', 'office', 14, 8, 6, 'wood-panel', 'wood', 'Director Office'),
    room('reception', 'upper', 'Admin / Clerk', 'reception', 23, 7, 6, 'plaster', 'stone', 'Reception & Operations'),
    room('observatory', 'upper', 'Nebula Observatory', 'observatory', 35, 16, 6, 'glass', 'technical', 'Plugin Development & Expansion'),
    room('gallery', 'upper', 'Music Studio', 'studio', 52, 10, 6, 'acoustic', 'wood', 'Listening Lounge'),
    room('engineering', 'middle', 'Engineers', 'workshop', 1, 29, 6, 'brick', 'concrete', 'Rocket Lab · Systems'),
    room('data', 'middle', 'Data Team', 'lab', 35, 14, 6, 'lab-tile', 'tile', 'Math Lab'),
    room('rendering', 'middle', 'Operations', 'operations', 50, 12, 6, 'panel', 'technical', 'Live Pipeline'),
    room('clinic', 'lower', 'Doctor', 'clinic', 1, 12, 6, 'plaster', 'tile', 'Wellness Office'),
    room('review', 'lower', 'Reviewers', 'review', 14, 16, 6, 'plaster', 'carpet', 'Review Office'),
    room('training', 'lower', 'Trainers', 'lab', 35, 14, 6, 'panel', 'technical', 'Training Lab'),
    room('experiments', 'lower', 'Experiments', 'lab', 50, 12, 6, 'lab-tile', 'technical', 'Research Bench'),
  );
  w.connectors.push({ kind: 'elevator', id: 'core-lift', x: 31, width: 3, lobbyDepth: 2, capacity: 1, secondsPerFloor: 2.4,
    stops: [{ floorId: 'upper' }, { floorId: 'middle' }, { floorId: 'lower' }] });
  const L = (f: string) => lobbyId('core-lift', f);
  w.connectors.push(
    door('d-lead-sol', 'lead', 'leadSol', 0, 3), door('d-sol-rec', 'leadSol', 'reception', 0, 3),
    door('d-rec-lift', 'reception', L('upper'), 0, 2), door('d-lift-obs', L('upper'), 'observatory', 0, 2),
    door('d-obs-gal', 'observatory', 'gallery', 0, 3),
    door('d-eng-lift', 'engineering', L('middle'), 0, 2), door('d-lift-data', L('middle'), 'data', 0, 2),
    door('d-data-ren', 'data', 'rendering', 1, 3),
    door('d-cli-rev', 'clinic', 'review', 0, 3), door('d-rev-lift', 'review', L('lower'), 0, 2),
    door('d-lift-train', L('lower'), 'training', 0, 2), door('d-train-exp', 'training', 'experiments', 0, 3),
  );
  const seats: Record<string, string> = {
    lead: workstation(w.furniture, 'lead', 'lead', 4), leadSol: workstation(w.furniture, 'leadSol', 'sol', 2),
    reception: workstation(w.furniture, 'reception', 'clerk', 2), observatory: workstation(w.furniture, 'observatory', 'obs', 3),
    engineering: workstation(w.furniture, 'engineering', 'eng', 6), eng2: workstation(w.furniture, 'engineering', 'eng2', 10),
    rev2: workstation(w.furniture, 'review', 'rev2', 2), rev3: workstation(w.furniture, 'review', 'rev3', 10), data: workstation(w.furniture, 'data', 'data', 5),
    rendering: workstation(w.furniture, 'rendering', 'ops', 4), clinic: workstation(w.furniture, 'clinic', 'doc', 3),
    review: workstation(w.furniture, 'review', 'rev', 6), training: workstation(w.furniture, 'training', 'train', 5),
  };
  w.furniture.push(
    item('lead-library', 'lead', 'DOUBLE_BOOKSHELF', 0, 0), item('lead-plant', 'lead', 'LARGE_PLANT', 10, 0),
    item('gallery-sofa', 'gallery', 'SOFA_FRONT', 3, 2), item('gallery-arcade', 'gallery', 'ARCADE_MACHINE', 7, 0),
    item('eng-shelf-1', 'engineering', 'DOUBLE_BOOKSHELF', 14, 0), item('eng-shelf-2', 'engineering', 'DOUBLE_BOOKSHELF', 17, 0),
    item('eng-plant', 'engineering', 'PLANT', 27, 4), item('exp-table', 'experiments', 'meeting-table', 4, 2),
    item('review-plant', 'review', 'PLANT_2', 14, 0), item('clinic-plant', 'clinic', 'PLANT', 10, 0),
  );
  w.decor.push(
    wallArt('lead-art', 'lead', 'LARGE_PAINTING', 7, 1.6), wallArt('obs-art', 'observatory', 'LARGE_PAINTING', 10, 2.0),
    wallArt('eng-board', 'engineering', 'WHITEBOARD', 22, 1.6), wallArt('data-board', 'data', 'WHITEBOARD', 10, 1.6),
    wallArt('rec-clock', 'reception', 'CLOCK', 5, 2.2), wallArt('gal-art', 'gallery', 'SMALL_PAINTING_2', 1, 2),
  );
  const roles: Array<[string, string, number]> = [
    ['lead', 'Lead', 0], ['leadSol', 'Lead (second)', 3], ['reception', 'Admin', 2], ['observatory', 'Engineer', 6],
    ['engineering', 'Engineer', 8], ['data', 'Data', 10], ['rendering', 'Operations', 14], ['clinic', 'Doctor', 16],
    ['review', 'Reviewer', 18], ['training', 'Trainer', 20],
  ];
  // Sample people; a live roster (kits.ts BUILDING_KITS.roster) replaces them with the real organisation.
  roles.forEach(([r, role, skin], i) => w.agents.push(agent(`agent-${r}`, `${role} ${i + 1}`, role, skin, seats[r])));
  return w;
}

/** Five storeys, varied room sizes and depths, two elevators (one skips a floor). */
export function fiveStoreyTower(): OfficeWorld {
  const floors: FloorDef[] = [
    { id: 'l0', level: 0, name: 'Lobby', depth: 5, wallHeight: 5 },
    { id: 'l1', level: 1, name: 'Studios', depth: 6, wallHeight: 5 },
    { id: 'l2', level: 2, name: 'Labs', depth: 4, wallHeight: 4 },
    { id: 'l3', level: 3, name: 'Archive', depth: 6, wallHeight: 6 },
    { id: 'l4', level: 4, name: 'Penthouse', depth: 5, wallHeight: 5 },
  ];
  const w = shell('five-storey-tower', 'Five-Storey Tower', floors, 'day');
  w.rooms.push(
    room('l0-entry', 'l0', 'Entry', 'reception', 1, 9, 5, 'stone', 'stone'),
    room('l0-cafe', 'l0', 'Cafe', 'kitchen', 15, 8, 5, 'tile', 'tile'),
    room('l1-a', 'l1', 'Studio A', 'workspace', 1, 9, 6, 'wood-panel', 'wood'),
    room('l1-b', 'l1', 'Studio B', 'workspace', 15, 6, 4, 'plaster', 'carpet'),
    room('l1-c', 'l1', 'Studio C', 'workspace', 22, 7, 6, 'plaster', 'wood'),
    room('l2-lab', 'l2', 'Lab', 'lab', 1, 9, 4, 'lab-tile', 'tile'),
    room('l2-hall', 'l2', 'Hall', 'corridor', 15, 6, 3, 'plaster', 'stone'),
    room('l3-archive', 'l3', 'Archive', 'archive', 15, 14, 6, 'wood-panel', 'wood'),
    room('l4-suite', 'l4', 'Suite', 'office', 1, 9, 5, 'wood-panel', 'carpet'),
    room('l4-terrace', 'l4', 'Terrace', 'lounge', 15, 8, 5, 'glass', 'stone'),
  );
  w.connectors.push(
    { kind: 'elevator', id: 'lift-a', x: 11, width: 3, lobbyDepth: 2, capacity: 3, secondsPerFloor: 1.8,
      stops: [{ floorId: 'l0' }, { floorId: 'l1' }, { floorId: 'l2' }, { floorId: 'l4' }] },
    { kind: 'elevator', id: 'lift-b', x: 30, width: 2, lobbyDepth: 2, capacity: 1, secondsPerFloor: 2,
      stops: [{ floorId: 'l2' }, { floorId: 'l3' }, { floorId: 'l4' }] },
    door('t0a', 'l0-entry', lobbyId('lift-a', 'l0'), 0, 2), door('t0b', lobbyId('lift-a', 'l0'), 'l0-cafe', 0, 2),
    door('t1a', 'l1-a', lobbyId('lift-a', 'l1'), 0, 2), door('t1b', lobbyId('lift-a', 'l1'), 'l1-b', 0, 2),
    door('t1c', 'l1-b', 'l1-c', 1, 2),
    door('t2a', 'l2-lab', lobbyId('lift-a', 'l2'), 0, 2), door('t2b', lobbyId('lift-a', 'l2'), 'l2-hall', 0, 2),
    // Level 2 hall ends at x=20; lift B lobby at x=30 needs a neighbour: a corridor stub.
    door('t3a', lobbyId('lift-b', 'l3'), 'l3-archive', 0, 2),
    door('t4a', 'l4-suite', lobbyId('lift-a', 'l4'), 0, 2), door('t4b', lobbyId('lift-a', 'l4'), 'l4-terrace', 0, 2),
  );
  w.rooms.push(room('l2-bridge', 'l2', 'Bridge', 'corridor', 22, 7, 3, 'plaster', 'stone'));
  w.rooms.push(room('l4-gallery', 'l4', 'Gallery', 'gallery', 24, 5, 5, 'plaster', 'wood'));
  w.connectors.push(door('t2c', 'l2-hall', 'l2-bridge', 0, 2), door('t2d', 'l2-bridge', lobbyId('lift-b', 'l2'), 0, 2),
    door('t4c', 'l4-terrace', 'l4-gallery', 0, 3), door('t4d', 'l4-gallery', lobbyId('lift-b', 'l4'), 0, 2));
  const s1 = workstation(w.furniture, 'l1-a', 't1', 2);
  const s2 = workstation(w.furniture, 'l3-archive', 't3', 4);
  const s3 = workstation(w.furniture, 'l4-suite', 't4', 3);
  w.furniture.push(
    item('cafe-table', 'l0-cafe', 'low-table', 3, 2), item('entry-plant', 'l0-entry', 'LARGE_PLANT', 0, 0),
    item('arch-shelf-1', 'l3-archive', 'DOUBLE_BOOKSHELF', 9, 0), item('arch-shelf-2', 'l3-archive', 'DOUBLE_BOOKSHELF', 11, 0),
    item('terrace-plant', 'l4-terrace', 'PLANT_2', 6, 0), item('c-sofa', 'l1-c', 'SOFA_FRONT', 2, 2),
  );
  w.decor.push(wallArt('lab-board', 'l2-lab', 'WHITEBOARD', 3, 1.0), wallArt('gal-art', 'l4-gallery', 'LARGE_PAINTING', 1, 1.5));
  w.agents.push(agent('t-a1', 'Rowan', 'Designer', 3, s1), agent('t-a2', 'Ellis', 'Archivist', 11, s2),
    agent('t-a3', 'Harper', 'Lead', 1, s3), agent('t-a4', 'Sage', 'Engineer', 15, undefined, 'l0-cafe'));
  return w;
}

export const TEMPLATES: Record<string, () => OfficeWorld> = {
  'two-floor-office': twoFloorOffice,
  'small-studio': smallStudio,
  'nebula-campus': nebulaCampusSample,
  'five-storey-tower': fiveStoreyTower,
};
