import type { OfficeState } from '../engine/officeState.js';
import { findPath, isWalkable } from '../layout/tileMap.js';
import { CharacterState, TILE_SIZE } from '../types.js';
import type { CompiledElevator, CompiledWorld, GridPoint } from '../world/compiler.js';

export type TripPhase = 'walk' | 'approach' | 'waiting' | 'boarding' | 'riding' | 'exiting';

export interface Trip {
  agentId: number;
  target: GridPoint;
  phase: TripPhase;
  fromFloor: string;
  toFloor: string;
  elevatorId?: string;
  /** Lobby tile the agent waits on. */
  landing?: GridPoint;
  /** Order of arrival at the lobby (FIFO boarding). */
  queuedAt: number;
}

export interface CabinState {
  elevatorId: string;
  /** Floor the cabin is at, or departed from while moving. */
  floorId: string;
  /** Destination floor while moving; equal to floorId when stopped. */
  toFloorId: string;
  phase: 'idle' | 'boarding' | 'moving' | 'exiting';
  /** Seconds spent in the current phase. */
  t: number;
  duration: number;
  passengers: number[];
}

export const DOOR_SECONDS = 0.6;

export type TravelResult = { ok: true } | { ok: false; reason: string };

const same = (a: GridPoint, b: GridPoint) => a.col === b.col && a.row === b.row;
const tileOf = (ch: { tileCol: number; tileRow: number }): GridPoint => ({ col: ch.tileCol, row: ch.tileRow });

/**
 * Physical travel across a compiled building. Same-floor trips are ordinary
 * OfficeState walks. A storey change is ONLY possible as: walk to a lobby,
 * wait, board a cabin with free capacity, ride (cabin visibly moves through
 * the shaft), exit onto the destination lobby, then walk on.
 */
export class TravelSystem {
  private trips = new Map<number, Trip>();
  private cabins = new Map<string, CabinState>();
  private seq = 0;

  constructor(private compiled: CompiledWorld) {
    for (const e of compiled.elevators) {
      const ground = [...e.stops].sort((a, b) => this.level(a.floorId) - this.level(b.floorId))[0].floorId;
      this.cabins.set(e.def.id, { elevatorId: e.def.id, floorId: ground, toFloorId: ground, phase: 'idle', t: 0, duration: 0, passengers: [] });
    }
  }

  getTrip(id: number): Trip | undefined { const t = this.trips.get(id); return t && { ...t }; }
  getTrips(): Trip[] { return [...this.trips.values()].map(t => ({ ...t })); }
  getCabins(): CabinState[] { return [...this.cabins.values()].map(c => ({ ...c, passengers: [...c.passengers] })); }
  isTravelling(id: number) { return this.trips.has(id); }
  cancel(id: number) {
    const t = this.trips.get(id);
    if (t && (t.phase === 'boarding' || t.phase === 'riding' || t.phase === 'exiting')) return false;
    this.trips.delete(id);
    return true;
  }

  /** Where an agent inside a cabin should be drawn: cabin id and slot index. */
  riderSlot(id: number): { elevatorId: string; slot: number; boarding: number } | null {
    const t = this.trips.get(id);
    if (!t?.elevatorId || (t.phase !== 'boarding' && t.phase !== 'riding' && t.phase !== 'exiting')) return null;
    const cabin = this.cabins.get(t.elevatorId)!;
    const slot = Math.max(0, cabin.passengers.indexOf(id));
    const k = Math.min(1, cabin.t / DOOR_SECONDS);
    const boarding = t.phase === 'boarding' ? k : t.phase === 'exiting' ? 1 - k : 1;
    return { elevatorId: t.elevatorId, slot, boarding };
  }

  /** Cabin vertical position: from/to floors and eased progress 0..1. */
  cabinPose(elevatorId: string): { from: string; to: string; t: number; doorsOpen: number } {
    const c = this.cabins.get(elevatorId)!;
    if (c.phase !== 'moving') {
      const k = Math.min(1, c.t / DOOR_SECONDS);
      const open = c.phase === 'idle' ? 0 : c.phase === 'boarding' ? Math.min(1, k * 2) * (k < 0.85 ? 1 : (1 - k) / 0.15) : Math.min(1, k * 2);
      return { from: c.floorId, to: c.floorId, t: 0, doorsOpen: open };
    }
    const k = Math.min(1, c.t / c.duration);
    return { from: c.floorId, to: c.toFloorId, t: k * k * (3 - 2 * k), doorsOpen: 0 };
  }

  travelTo(office: OfficeState, id: number, target: GridPoint): TravelResult {
    const ch = office.characters.get(id);
    if (!ch) return { ok: false, reason: 'unknown agent' };
    const existing = this.trips.get(id);
    if (existing && (existing.phase === 'boarding' || existing.phase === 'riding' || existing.phase === 'exiting')) {
      return { ok: false, reason: 'agent is inside an elevator cabin' };
    }
    const from = this.compiled.floorOfRow(ch.tileRow), to = this.compiled.floorOfRow(target.row);
    if (!from || !to) return { ok: false, reason: 'target is not on a floor' };
    if (!isWalkable(target.col, target.row, office.tileMap, office.blockedTiles) && !this.isOwnSeat(office, id, target)) {
      return { ok: false, reason: 'target tile is blocked' };
    }
    const prepare = () => { ch.isActive = false; ch.wanderTimer = 999; ch.seatTimer = 0; };
    if (from.def.id === to.def.id) {
      if (same(tileOf(ch), target)) { this.trips.delete(id); return { ok: true }; }
      prepare();
      if (!office.walkToTile(id, target.col, target.row)) return { ok: false, reason: 'no walkable route on this floor' };
      this.trips.set(id, { agentId: id, target, phase: 'walk', fromFloor: from.def.id, toFloor: to.def.id, queuedAt: 0 });
      return { ok: true };
    }
    // Choose the elevator that serves both floors with the shortest total walk.
    // An agent's own chair is enterable by that agent (same rule as OfficeState.walkToTile).
    const tailBlocked = this.isOwnSeat(office, id, target)
      ? new Set([...office.blockedTiles].filter(k => k !== `${target.col},${target.row}`)) : office.blockedTiles;
    let best: { e: CompiledElevator; landing: GridPoint; cost: number } | null = null;
    for (const e of this.compiled.elevators) {
      const src = e.stops.find(s => s.floorId === from.def.id), dst = e.stops.find(s => s.floorId === to.def.id);
      if (!src || !dst) continue;
      const exit = dst.landing[0];
      const tail = same(exit, target) ? 0 : findPath(exit.col, exit.row, target.col, target.row, office.tileMap, tailBlocked).length;
      if (!same(exit, target) && tail === 0) continue;
      const taken = new Set([...this.trips.values()].filter(t => t.landing && t.agentId !== id).map(t => `${t.landing!.col},${t.landing!.row}`));
      for (const landing of src.landing) {
        if (taken.has(`${landing.col},${landing.row}`)) continue;
        const head = same(tileOf(ch), landing) ? 0 : findPath(ch.tileCol, ch.tileRow, landing.col, landing.row, office.tileMap, office.blockedTiles).length;
        if (!same(tileOf(ch), landing) && head === 0) continue;
        if (!best || head + tail < best.cost) best = { e, landing, cost: head + tail };
        break;
      }
    }
    if (!best) return { ok: false, reason: `no elevator route from ${from.def.id} to ${to.def.id}` };
    prepare();
    const at = same(tileOf(ch), best.landing);
    if (!at && !office.walkToTile(id, best.landing.col, best.landing.row)) return { ok: false, reason: 'lobby unreachable' };
    if (at) { ch.path = []; ch.state = CharacterState.IDLE; }
    this.trips.set(id, {
      agentId: id, target, phase: at ? 'waiting' : 'approach', fromFloor: from.def.id, toFloor: to.def.id,
      elevatorId: best.e.def.id, landing: best.landing, queuedAt: at ? ++this.seq : 0,
    });
    return { ok: true };
  }

  update(office: OfficeState, dt: number): void {
    if (!(dt > 0)) return;
    for (const [id, t] of this.trips) {
      const ch = office.characters.get(id);
      if (!ch) { this.trips.delete(id); continue; }
      ch.wanderTimer = 999;
      if (t.phase === 'walk' && !ch.path.length && ch.state !== CharacterState.WALK) {
        this.trips.delete(id);
      } else if (t.phase === 'approach' && !ch.path.length) {
        if (same(tileOf(ch), t.landing!)) { t.phase = 'waiting'; t.queuedAt = ++this.seq; ch.state = CharacterState.IDLE; ch.dir = 3; }
        else this.trips.delete(id);
      } else if (t.phase === 'waiting' && !same(tileOf(ch), t.landing!)) {
        this.trips.delete(id);
      }
    }
    for (const cabin of this.cabins.values()) this.updateCabin(office, cabin, dt);
  }

  private updateCabin(office: OfficeState, cabin: CabinState, dt: number) {
    const e = this.compiled.elevators.find(x => x.def.id === cabin.elevatorId)!;
    cabin.t += dt;
    for (const id of cabin.passengers) {
      const ch = office.characters.get(id);
      if (ch) { ch.path = []; ch.state = CharacterState.IDLE; ch.moveProgress = 0; }
    }
    if (cabin.phase === 'boarding' && cabin.t >= DOOR_SECONDS) {
      for (const id of cabin.passengers) { const t = this.trips.get(id); if (t) t.phase = 'riding'; }
      this.depart(cabin, e, cabin.toFloorId);
    } else if (cabin.phase === 'moving' && cabin.t >= cabin.duration) {
      cabin.floorId = cabin.toFloorId;
      cabin.t = 0;
      if (cabin.passengers.length) {
        cabin.phase = 'exiting';
        const stop = e.stops.find(s => s.floorId === cabin.floorId)!;
        cabin.passengers.forEach((id, i) => {
          const ch = office.characters.get(id), t = this.trips.get(id);
          if (!ch || !t) return;
          const p = stop.landing[i % stop.landing.length];
          ch.tileCol = p.col; ch.tileRow = p.row;
          ch.x = p.col * TILE_SIZE + TILE_SIZE / 2; ch.y = p.row * TILE_SIZE + TILE_SIZE / 2;
          ch.dir = 0; ch.frame = 0; ch.frameTimer = 0;
          t.phase = 'exiting';
        });
      } else cabin.phase = 'idle';
    } else if (cabin.phase === 'exiting' && cabin.t >= DOOR_SECONDS) {
      for (const id of cabin.passengers) {
        const ch = office.characters.get(id), t = this.trips.get(id);
        if (!ch || !t) continue;
        if (same(tileOf(ch), t.target)) { this.trips.delete(id); continue; }
        t.phase = 'walk';
        t.landing = undefined;
        if (!office.walkToTile(id, t.target.col, t.target.row)) this.trips.delete(id);
      }
      cabin.passengers = [];
      cabin.phase = 'idle';
      cabin.t = 0;
    }
    if (cabin.phase !== 'idle') return;

    const waiting = [...this.trips.values()]
      .filter(t => t.elevatorId === e.def.id && t.phase === 'waiting')
      .sort((a, b) => a.queuedAt - b.queuedAt);
    if (!waiting.length) return;
    const head = waiting[0];
    if (head.fromFloor !== cabin.floorId) { this.depart(cabin, e, head.fromFloor); return; }
    const group = waiting.filter(t => t.fromFloor === cabin.floorId && t.toFloor === head.toFloor).slice(0, e.def.capacity);
    cabin.passengers = group.map(t => t.agentId);
    cabin.toFloorId = head.toFloor;
    cabin.phase = 'boarding';
    cabin.t = 0;
    for (const t of group) t.phase = 'boarding';
  }

  private depart(cabin: CabinState, e: CompiledElevator, to: string) {
    cabin.toFloorId = to;
    cabin.phase = 'moving';
    cabin.t = 0;
    cabin.duration = Math.max(0.5, e.def.secondsPerFloor * this.floorDistance(cabin.floorId, to));
  }

  private level(floorId: string) { return this.compiled.floors.find(f => f.def.id === floorId)!.def.level; }
  /** Storeys passed, counting only floors that exist (levels may skip numbers). */
  private floorDistance(a: string, b: string) {
    const levels = this.compiled.floors.map(f => f.def.level).sort((x, y) => x - y);
    return Math.abs(levels.indexOf(this.level(a)) - levels.indexOf(this.level(b)));
  }
  private isOwnSeat(office: OfficeState, id: number, p: GridPoint) {
    const ch = office.characters.get(id);
    const seat = ch?.seatId ? office.seats.get(ch.seatId) : undefined;
    return !!seat && seat.seatCol === p.col && seat.seatRow === p.row;
  }
}
