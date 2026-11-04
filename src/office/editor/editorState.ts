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

  /** Validate a mutation without committing it (drag previews use exactly what a commit would). */
  preview(mutate: (w: OfficeWorld) => void): EditResult {
    const next = cloneWorld(this.world);
    mutate(next);
    return this.check(next);
  }

  /**
   * Move a furniture item. A desk carries whatever sits on its tiles. Items
   * that don't block (things on desks) may carry a sub-tile visual offset.
   */
  moveFurnitureTo(w: OfficeWorld, id: string, roomId: string, col: number, row: number, offset?: { x: number; y: number }) {
    const f = w.furniture.find(x => x.id === id);
    if (!f) throw Error(`No furniture ${id}`);
    const fp = this.footprint(f.assetId);
    const dc = col - f.col, dr = row - f.row;
    if (fp?.isDesk) for (const other of w.furniture) {
      if (other === f || other.roomId !== f.roomId || !this.footprint(other.assetId)?.canPlaceOnSurfaces) continue;
      if (other.col >= f.col && other.col < f.col + fp.w && other.row >= f.row && other.row < f.row + fp.h) {
        other.roomId = roomId; other.col += dc; other.row += dr;
      }
    }
    f.roomId = roomId; f.col = col; f.row = row;
    if (offset && (offset.x || offset.y)) f.offset = offset; else delete f.offset;
  }

  moveFurniture(id: string, roomId: string, col: number, row: number, offset?: { x: number; y: number }): EditResult {
    return this.apply(w => this.moveFurnitureTo(w, id, roomId, col, row, offset));
  }

  moveDecorTo(w: OfficeWorld, id: string, col: number, y: number) {
    const d = w.decor.find(x => x.id === id);
    if (!d) throw Error(`No decor ${id}`);
    d.col = col; d.y = y;
  }

  moveDecor(id: string, col: number, y: number): EditResult {
    return this.apply(w => this.moveDecorTo(w, id, col, y));
  }

  /** Remove a furniture item (and what sits on it) or a decor item. */
  remove(kind: 'furniture' | 'decor', id: string): EditResult {
    return this.apply(w => {
      if (kind === 'decor') { w.decor = w.decor.filter(d => d.id !== id); return; }
      const f = w.furniture.find(x => x.id === id);
      if (!f) throw Error(`No furniture ${id}`);
      const fp = this.footprint(f.assetId);
      const riding = (o: typeof f) => !!fp?.isDesk && o !== f && o.roomId === f.roomId && !!this.footprint(o.assetId)?.canPlaceOnSurfaces
        && o.col >= f.col && o.col < f.col + fp.w && o.row >= f.row && o.row < f.row + fp.h;
      w.furniture = w.furniture.filter(o => o !== f && !riding(o));
      // An agent whose chair is removed stays in that room, unseated.
      for (const a of w.agents) if (a.seatId === id) { delete a.seatId; a.roomId = f.roomId; }
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
