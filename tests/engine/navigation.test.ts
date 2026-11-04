import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { compileWorld } from '../../src/office/world/compiler.js';
import { TEMPLATES, twoFloorOffice, fiveStoreyTower } from '../../src/office/world/templates.js';
import { generateBuilding, rng } from '../../src/office/world/generator.js';
import { createProjection, characterWorld } from '../../src/office/geometry/projection.js';
import { TravelSystem, type TripPhase } from '../../src/office/navigation/elevator.js';
import { WALK_SPEED_PX_PER_SEC } from '../../src/constants.js';
import { loadCatalog, officeFor, place, simulate } from './helpers.js';

before(loadCatalog);

describe('projection is pure, invertible and continuous', () => {
  for (const [name, make] of Object.entries(TEMPLATES)) {
    test(`${name}: screenToFloor(project(p)) == p`, () => {
      const compiled = compileWorld(make());
      const proj = createProjection(compiled);
      const rand = rng(3);
      for (let i = 0; i < 500; i++) {
        const f = compiled.floors[Math.floor(rand() * compiled.floors.length)];
        const x = rand() * compiled.cols, z = rand() * f.depth;
        const p = proj.project(f.def.id, x, z);
        const back = proj.screenToFloor(p.x, p.y);
        assert.ok(back, 'point maps back onto a floor');
        assert.equal(back.floorId, f.def.id);
        assert.ok(Math.abs(back.x - x) < 1e-6 && Math.abs(back.z - z) < 1e-6);
      }
    });
  }
  test('door column is the same width as room tiles and shares their edges', () => {
    const compiled = compileWorld(twoFloorOffice());
    const proj = createProjection(compiled);
    for (const d of compiled.doors) {
      const z = 0.5;
      const leftEdge = proj.project(d.floorId, d.col, z).x, rightEdge = proj.project(d.floorId, d.col + 1, z).x;
      const roomTile = proj.project(d.floorId, d.col - 1, z).x;
      assert.ok(Math.abs((rightEdge - leftEdge) - (leftEdge - roomTile)) < 1e-9);
    }
  });
  test('front-to-back scale change stays subtle (< 10%)', () => {
    const compiled = compileWorld(TEMPLATES['nebula-campus']());
    const proj = createProjection(compiled);
    for (const f of compiled.floors) assert.ok(proj.project(f.def.id, 0, f.depth).s > 0.9);
  });
});

/** Drive the whole simulation; record per-step facts about one agent. */
function run(office: ReturnType<typeof officeFor>, travel: TravelSystem, seconds: number, watch: number[],
  onStep?: (t: number) => void) {
  const compiled = (travel as unknown as { compiled: ReturnType<typeof compileWorld> }).compiled;
  const log = new Map<number, Array<{ x: number; y: number; floor?: string; phase?: TripPhase; riders: number }>>();
  let t = 0;
  simulate(seconds, dt => {
    office.update(dt);
    travel.update(office, dt);
    t += dt;
    onStep?.(t);
    for (const id of watch) {
      const ch = office.characters.get(id)!;
      const arr = log.get(id) ?? [];
      arr.push({ x: ch.x, y: ch.y, floor: compiled.floorOfRow(ch.tileRow)?.def.id, phase: travel.getTrip(id)?.phase,
        riders: Math.max(0, ...travel.getCabins().map(c => c.passengers.length)) });
      log.set(id, arr);
    }
  });
  return log;
}

describe('agents travel physically through doors and elevators', () => {
  test('same-floor door crossing is continuous and diagonal-safe', () => {
    const compiled = compileWorld(twoFloorOffice());
    const office = officeFor(compiled);
    const travel = new TravelSystem(compiled);
    const id = 1;
    place(office, id, compiled.roomTile('reception', 1, 5));
    const target = compiled.roomTile('hall', 8, 3);
    assert.ok(travel.travelTo(office, id, target).ok);
    const path = office.characters.get(id)!.path.map(p => ({ ...p }));
    const door = compiled.doors.find(d => d.def.id === 'd-rec-hall')!;
    assert.ok(path.some(p => p.col === door.col && door.rows.includes(p.row)), 'route passes through the door opening');
    let prev = { col: office.characters.get(id)!.tileCol, row: office.characters.get(id)!.tileRow };
    for (const p of path) {
      if (p.col !== prev.col && p.row !== prev.row) {
        assert.ok(office.walkableTiles.some(t => t.col === p.col && t.row === prev.row), 'no diagonal corner cut');
        assert.ok(office.walkableTiles.some(t => t.col === prev.col && t.row === p.row), 'no diagonal corner cut');
      }
      prev = p;
    }
    const log = run(office, travel, 12, [id]).get(id)!;
    const maxStep = (WALK_SPEED_PX_PER_SEC / 60) * 1.05;
    for (let i = 1; i < log.length; i++) {
      assert.ok(Math.hypot(log[i].x - log[i - 1].x, log[i].y - log[i - 1].y) <= maxStep, `continuous at step ${i}`);
    }
    const ch = office.characters.get(id)!;
    assert.deepEqual({ col: ch.tileCol, row: ch.tileRow }, target);
    // Projection continuity across the doorway (screen x never jumps).
    const proj = createProjection(compiled);
    const xs = log.map(s => { const w = characterWorld(compiled, s.x, s.y)!; return proj.project(w.floorId, w.x, w.z).x; });
    for (let i = 1; i < xs.length; i++) assert.ok(Math.abs(xs[i] - xs[i - 1]) < 2, 'screen x continuous');
  });

  test('cross-floor trip: approach, wait, board, ride, exit, walk; floor only changes at exit', () => {
    const compiled = compileWorld(twoFloorOffice());
    const office = officeFor(compiled);
    const travel = new TravelSystem(compiled);
    const id = 1;
    place(office, id, compiled.roomTile('reception', 1, 5));
    const target = compiled.roomTile('music', 6, 5);
    assert.ok(travel.travelTo(office, id, target).ok);
    const log = run(office, travel, 40, [id]).get(id)!;
    // The cabin already waits on this floor, so 'waiting' may last zero frames.
    const phases = log.map(s => s.phase).filter((p, i, a) => p !== a[i - 1] && p !== 'waiting');
    assert.deepEqual(phases, ['approach', 'boarding', 'riding', 'exiting', 'walk', undefined]);
    for (let i = 1; i < log.length; i++) {
      if (log[i].floor !== log[i - 1].floor) assert.equal(log[i].phase, 'exiting', 'storey changes only when leaving a cabin');
    }
    const ch = office.characters.get(id)!;
    assert.deepEqual({ col: ch.tileCol, row: ch.tileRow }, target);
  });

  test('agent can ride back to its own (blocked-for-others) seat on another floor', () => {
    const compiled = compileWorld(twoFloorOffice());
    const office = officeFor(compiled);
    const travel = new TravelSystem(compiled);
    const id = 1; // Robin, seated in reception (ground)
    const seat = office.seats.get(office.characters.get(id)!.seatId!)!;
    assert.ok(travel.travelTo(office, id, compiled.roomTile('meeting', 2, 5)).ok);
    run(office, travel, 40, [id]);
    const r = travel.travelTo(office, id, { col: seat.seatCol, row: seat.seatRow });
    assert.ok(r.ok, r.ok ? '' : r.reason);
    run(office, travel, 40, [id]);
    const ch = office.characters.get(id)!;
    assert.deepEqual({ col: ch.tileCol, row: ch.tileRow }, { col: seat.seatCol, row: seat.seatRow });
  });

  test('cabin respects capacity and serves a queue', () => {
    const compiled = compileWorld(twoFloorOffice()); // capacity 2
    const office = officeFor(compiled);
    const travel = new TravelSystem(compiled);
    const ids = [1, 2, 3];
    ids.forEach((id, i) => place(office, id, compiled.roomTile('hall', 2 + i * 2, 3)));
    const targets = ids.map((_, i) => compiled.roomTile('meeting', 1 + i * 2, 5));
    ids.forEach((id, i) => assert.ok(travel.travelTo(office, id, targets[i]).ok));
    let maxRiders = 0;
    run(office, travel, 60, ids, () => { maxRiders = Math.max(maxRiders, ...travel.getCabins().map(c => c.passengers.length)); });
    assert.ok(maxRiders <= 2 && maxRiders >= 1);
    ids.forEach((id, i) => {
      const ch = office.characters.get(id)!;
      assert.deepEqual({ col: ch.tileCol, row: ch.tileRow }, targets[i], `agent ${id} arrived`);
    });
  });

  test('tower: route that needs the second elevator (lift A skips level 3)', () => {
    const compiled = compileWorld(fiveStoreyTower());
    const office = officeFor(compiled);
    const travel = new TravelSystem(compiled);
    const id = 4; // Sage, in the cafe on level 0
    const target = compiled.roomTile('l3-archive', 1, 5);
    // Plan two legs: lift A to level 4 (or 2), then lift B to level 3.
    assert.equal(travel.travelTo(office, id, target).ok, false, 'no single elevator serves l0 -> l3');
    const hop = compiled.roomTile('l2-bridge', 3, 2);
    assert.ok(travel.travelTo(office, id, hop).ok);
    run(office, travel, 60, [id]);
    assert.ok(travel.travelTo(office, id, target).ok);
    run(office, travel, 60, [id]);
    const ch = office.characters.get(id)!;
    assert.deepEqual({ col: ch.tileCol, row: ch.tileRow }, target);
  });

  test('random seat-to-seat trips across generated buildings complete', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const compiled = compileWorld(generateBuilding({ seed, floors: 2 + (seed % 3) }));
      const office = officeFor(compiled);
      const travel = new TravelSystem(compiled);
      const rand = rng(seed * 11);
      const ids = [...office.characters.keys()];
      if (ids.length < 2) continue;
      const id = ids[0];
      const ch = office.characters.get(id)!;
      ch.seatId = null; // free agent: walk to someone else's seat approach
      const other = office.seats.get(office.characters.get(ids[1 + Math.floor(rand() * (ids.length - 1))])!.seatId!)!;
      const goal = office.walkableTiles.find(t => Math.abs(t.col - other.seatCol) + Math.abs(t.row - other.seatRow) === 1)!;
      const r = travel.travelTo(office, id, goal);
      assert.ok(r.ok, `seed ${seed}: ${r.ok ? '' : r.reason}`);
      run(office, travel, 120, [id]);
      assert.deepEqual({ col: ch.tileCol, row: ch.tileRow }, goal, `seed ${seed} arrived`);
    }
  });
});
