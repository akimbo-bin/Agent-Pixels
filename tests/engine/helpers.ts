import path from 'node:path';
import { buildDynamicCatalog } from '../../src/office/layout/furnitureCatalog.js';
// @ts-expect-error plain ESM helper shared with the dev build
import { buildAssetIndex } from '../../scripts/asset-index.mjs';
import { OfficeState } from '../../src/office/engine/officeState.js';
import type { CompiledWorld } from '../../src/office/world/compiler.js';
import { CharacterState } from '../../src/office/types.js';

let loaded = false;
/** Populate the real furniture catalog (footprints/categories) without decoding PNGs. */
export async function loadCatalog(): Promise<void> {
  if (loaded) return;
  const index = await buildAssetIndex(path.resolve(process.env.ENGINE_ROOT ?? '.', 'public', 'assets'));
  const sprites: Record<string, string[][]> = {};
  for (const f of index.furniture) sprites[f.id] = [['']];
  buildDynamicCatalog({ catalog: index.furniture, sprites });
  loaded = true;
}

/** OfficeState for a compiled world with agents placed on their seats (or room fronts). */
export function officeFor(compiled: CompiledWorld): OfficeState {
  const office = new OfficeState(compiled.layout);
  compiled.world.agents.forEach((a, i) => {
    const id = i + 1;
    office.addAgent(id, a.skin, 0, a.seatId, true);
    const ch = office.characters.get(id)!;
    if (!a.seatId && ch.seatId) { office.seats.get(ch.seatId)!.assigned = false; ch.seatId = null; }
    const seat = ch.seatId ? office.seats.get(ch.seatId) : undefined;
    const spot = seat ? { col: seat.seatCol, row: seat.seatRow } : firstFree(compiled, office, a.roomId!);
    place(office, id, spot);
    ch.isActive = false; ch.wanderTimer = 999; ch.state = CharacterState.IDLE;
  });
  return office;
}

export function place(office: OfficeState, id: number, p: { col: number; row: number }) {
  const ch = office.characters.get(id)!;
  ch.tileCol = p.col; ch.tileRow = p.row; ch.x = p.col * 16 + 8; ch.y = p.row * 16 + 8; ch.path = []; ch.moveProgress = 0;
}

export function firstFree(compiled: CompiledWorld, office: OfficeState, roomId: string) {
  const cell = compiled.cells.find(c => c.id === roomId)!;
  for (let r = cell.rowStart + cell.depth - 1; r >= cell.rowStart; r--) {
    for (let c = cell.x; c < cell.x + cell.width; c++) {
      if (office.walkableTiles.some(t => t.col === c && t.row === r)) return { col: c, row: r };
    }
  }
  throw Error(`no free tile in ${roomId}`);
}

/** Run the simulation with a fixed step, sampling a callback every step. */
export function simulate(seconds: number, step: (dt: number) => void, dt = 1 / 60) {
  for (let t = 0; t < seconds; t += dt) step(dt);
}
