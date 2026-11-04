import { type CompiledWorld, catalogFootprints, tryCompileWorld } from '../world/compiler.js';
import { checkConnectivity } from '../world/connectivity.js';
import { type OfficeWorld, cloneWorld, isDoor } from '../world/schema.js';
import type { FootprintSource, WorldIssue } from '../world/validator.js';

export type EditResult = { ok: true; compiled: CompiledWorld } | { ok: false; issues: WorldIssue[] };

/**
 * Reversible editing over the authoritative world document. Every edit is
 * validated (structure + connectivity) BEFORE it is committed, so the running
 * scene never holds a building that disagrees with its own collision.
 */
export class WorldEditor {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  world: OfficeWorld;
  compiled: CompiledWorld;

  constructor(world: OfficeWorld, private footprint: FootprintSource = catalogFootprints) {
    const r = this.check(world);
    if (!r.ok) throw Error(r.issues.map(i => i.message).join('\n'));
    this.world = cloneWorld(world);
    this.compiled = r.compiled;
  }

  check(world: OfficeWorld): EditResult {
    const r = tryCompileWorld(world, this.footprint);
    if (!r.ok) return r;
    const issues = checkConnectivity(r.compiled, this.footprint);
    return issues.length ? { ok: false, issues } : r;
  }

  /** Apply a mutation to a copy; commit only if the result is valid. */
  apply(mutate: (w: OfficeWorld) => void): EditResult {
    const next = cloneWorld(this.world);
    mutate(next);
    const r = this.check(next);
    if (!r.ok) return r;
    this.undoStack.push(JSON.stringify(this.world));
    this.redoStack = [];
    this.world = next;
    this.compiled = r.compiled;
    return r;
  }

  moveFurniture(id: string, roomId: string, col: number, row: number): EditResult {
    return this.apply(w => {
      const f = w.furniture.find(x => x.id === id);
      if (!f) throw Error(`No furniture ${id}`);
      // Items sitting on a desk move with it.
      const dc = col - f.col, dr = row - f.row, sameRoom = roomId === f.roomId;
      if (sameRoom) for (const other of w.furniture) {
        if (other !== f && other.roomId === f.roomId && other.col >= f.col && other.col < f.col + (this.footprint(f.assetId)?.w ?? 0) && other.row === f.row
          && this.footprint(other.assetId)?.canPlaceOnSurfaces && this.footprint(f.assetId)?.isDesk) { other.col += dc; other.row += dr; }
      }
      f.roomId = roomId; f.col = col; f.row = row;
    });
  }

  setDoorOpen(id: string, open: boolean): EditResult {
    return this.apply(w => {
      const d = w.connectors.find(c => c.id === id);
      if (!d || !isDoor(d)) throw Error(`No door ${id}`);
      d.open = open;
    });
  }

  load(world: OfficeWorld): EditResult {
    const r = this.check(world);
    if (!r.ok) return r;
    this.undoStack.push(JSON.stringify(this.world));
    this.redoStack = [];
    this.world = cloneWorld(world);
    this.compiled = r.compiled;
    return r;
  }

  undo(): boolean { return this.swap(this.undoStack, this.redoStack); }
  redo(): boolean { return this.swap(this.redoStack, this.undoStack); }
  get canUndo() { return this.undoStack.length > 0; }

  private swap(from: string[], to: string[]) {
    const prev = from.pop();
    if (!prev) return false;
    const world = JSON.parse(prev) as OfficeWorld;
    const r = tryCompileWorld(world, this.footprint);
    if (!r.ok) return false;
    to.push(JSON.stringify(this.world));
    this.world = world;
    this.compiled = r.compiled;
    return true;
  }

  serialize(): string { return JSON.stringify(this.world, null, 2); }
}
