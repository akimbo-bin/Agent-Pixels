import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { compileWorld, tryCompileWorld, catalogFootprints } from '../../src/office/world/compiler.js';
import { checkConnectivity } from '../../src/office/world/connectivity.js';
import { TEMPLATES, twoFloorOffice, smallStudio } from '../../src/office/world/templates.js';
import { generateBuilding } from '../../src/office/world/generator.js';
import { cloneWorld, isDoor, lobbyId, type OfficeWorld } from '../../src/office/world/schema.js';
import { validateWorld } from '../../src/office/world/validator.js';
import { findPath } from '../../src/office/layout/tileMap.js';
import { TileType } from '../../src/office/types.js';
import { loadCatalog } from './helpers.js';

before(loadCatalog);

const codes = (w: OfficeWorld) => validateWorld(w, catalogFootprints).map(i => i.code);

describe('templates compile into valid, connected buildings', () => {
  for (const [name, make] of Object.entries(TEMPLATES)) {
    test(name, () => {
      const compiled = compileWorld(make());
      assert.deepEqual(checkConnectivity(compiled), [], 'no orphan rooms, pockets or unreachable seats');
      // Deterministic: JSON round trip compiles to identical collision grid.
      const again = compileWorld(JSON.parse(JSON.stringify(make())));
      assert.deepEqual(again.layout, compiled.layout);
    });
  }
  test('floor counts are data, not code', () => {
    const counts = Object.values(TEMPLATES).map(t => t().floors.length).sort();
    assert.deepEqual(counts, [1, 2, 3, 5]);
  });
});

describe('validator rejects broken topology with actionable messages', () => {
  test('overlapping rooms', () => {
    const w = smallStudio();
    w.rooms[1].x = 10;
    assert.ok(codes(w).includes('overlap'));
  });
  test('door between rooms that share no wall', () => {
    const w = smallStudio();
    w.connectors.push({ kind: 'door', id: 'bad', between: ['studio', 'kitchen'], z: 0, width: 2, open: true });
    assert.ok(codes(w).includes('door-adjacency'));
  });
  test('door across floors', () => {
    const w = twoFloorOffice();
    w.connectors.push({ kind: 'door', id: 'bad', between: ['reception', 'lead'], z: 0, width: 2, open: true });
    assert.ok(codes(w).includes('door-floor'));
  });
  test('elevator stop without a lobby door', () => {
    const w = twoFloorOffice();
    w.connectors = w.connectors.filter(c => !(isDoor(c) && c.between.includes(lobbyId('lift', 'upper'))));
    assert.ok(codes(w).includes('elevator-unreachable'));
  });
  test('furniture outside its room and overlapping solids', () => {
    const w = smallStudio();
    w.furniture.push({ id: 'oob', roomId: 'kitchen', assetId: 'DESK_FRONT', col: 5, row: 0 });
    w.furniture.push({ id: 'dup', roomId: 'studio', assetId: 'DOUBLE_BOOKSHELF', col: 10, row: 0 });
    const c = codes(w);
    assert.ok(c.includes('furniture-bounds'));
    assert.ok(c.includes('furniture-overlap'));
  });
  test('room without doors is reported as an orphan', () => {
    const w = smallStudio();
    w.connectors = w.connectors.filter(c => c.id !== 'd-lounge-kitchen');
    const issues = checkConnectivity(compileWorld(w));
    assert.ok(issues.some(i => i.code === 'orphan' && i.entityId === 'kitchen'));
  });
  test('furniture sealing a doorway is reported', () => {
    const w = smallStudio();
    // Kitchen door spans depth 1-2 at the kitchen's left wall; fill that edge.
    w.furniture.push({ id: 'blocker', roomId: 'kitchen', assetId: 'DOUBLE_BOOKSHELF', col: 0, row: 1 });
    w.furniture = w.furniture.filter(f => f.id !== 'kitchen-bin');
    const issues = checkConnectivity(compileWorld(w));
    assert.ok(issues.length > 0, 'blocked doorway must surface an issue');
  });
});

describe('doors are physical openings in the shared wall only', () => {
  test('door tiles sit in the wall column and touch exactly the two cells', () => {
    const compiled = compileWorld(twoFloorOffice());
    for (const d of compiled.doors) {
      for (const row of d.rows) {
        assert.equal(compiled.layout.tiles[row * compiled.cols + d.col], TileType.FLOOR_1);
        assert.equal(compiled.cellAt(d.col, row), undefined, 'door tile belongs to no room');
        assert.equal(compiled.cellAt(d.col - 1, row)?.id, d.left);
        assert.equal(compiled.cellAt(d.col + 1, row)?.id, d.right);
      }
    }
  });
  test('closing the only door makes the route fail instead of teleporting', () => {
    const w = smallStudio();
    const open = compileWorld(w);
    const a = open.roomTile('studio', 12, 4), b = open.roomTile('lounge', 1, 4);
    const tileMap = rows(open);
    assert.ok(findPath(a.col, a.row, b.col, b.row, tileMap, new Set()).length > 0);
    (w.connectors.find(c => c.id === 'd-studio-lounge') as { open: boolean }).open = false;
    const closed = compileWorld(w);
    assert.deepEqual(findPath(a.col, a.row, b.col, b.row, rows(closed), new Set()), []);
  });
  test('no walk-only path between storeys', () => {
    const compiled = compileWorld(twoFloorOffice());
    const a = compiled.roomTile('reception', 0, 5), b = compiled.roomTile('lead', 0, 5);
    assert.deepEqual(findPath(a.col, a.row, b.col, b.row, rows(compiled), new Set()), []);
  });
});

describe('generated buildings (seeded regression)', () => {
  for (let seed = 1; seed <= 25; seed++) {
    test(`seed ${seed}`, () => {
      const floors = 1 + (seed % 5);
      const w = generateBuilding({ seed, floors, width: 36 + (seed % 3) * 8 });
      assert.deepEqual(generateBuilding({ seed, floors, width: 36 + (seed % 3) * 8 }), w, 'deterministic');
      const r = tryCompileWorld(w);
      assert.ok(r.ok, r.ok ? '' : r.issues.map(i => i.message).join('\n'));
      if (r.ok) assert.deepEqual(checkConnectivity(r.compiled), []);
    });
  }
});

test('moving furniture changes the compiled collider atomically', () => {
  const w = smallStudio();
  const before = compileWorld(w);
  const desk = w.furniture.find(f => f.id === 'ws2-desk')!;
  const moved = cloneWorld(w);
  moved.furniture.find(f => f.id === 'ws2-desk')!.col = desk.col + 1;
  moved.furniture.find(f => f.id === 'ws2-pc')!.col += 1;
  const after = compileWorld(moved);
  const b = before.layout.furniture.find(f => f.uid === 'ws2-desk')!, a = after.layout.furniture.find(f => f.uid === 'ws2-desk')!;
  assert.equal(a.col, b.col + 1);
  assert.equal(a.row, b.row);
});

function rows(c: ReturnType<typeof compileWorld>) {
  const out: TileType[][] = [];
  for (let r = 0; r < c.rows; r++) out.push(c.layout.tiles.slice(r * c.cols, (r + 1) * c.cols));
  return out;
}
