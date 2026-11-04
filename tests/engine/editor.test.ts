import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { WorldEditor } from '../../src/office/editor/editorState.js';
import { twoFloorOffice } from '../../src/office/world/templates.js';
import { loadCatalog } from './helpers.js';

before(loadCatalog);

const at = (e: WorldEditor, id: string) => e.world.furniture.find(f => f.id === id)!;

describe('furniture editing', () => {
  test('moving a desk carries its monitor, and the preview agrees with the commit', () => {
    const e = new WorldEditor(twoFloorOffice());
    const desk = at(e, 'wsa-desk'), pc = at(e, 'wsa-pc');
    const to = { col: desk.col, row: desk.row + 2 };
    const preview = e.preview(w => e.moveFurnitureTo(w, 'wsa-desk', desk.roomId, to.col, to.row));
    const commit = e.moveFurniture('wsa-desk', desk.roomId, to.col, to.row);
    assert.equal(preview.ok, commit.ok);
    assert.ok(commit.ok, 'a desk with a monitor on it can move without clashing with its own monitor');
    assert.deepEqual([at(e, 'wsa-pc').col, at(e, 'wsa-pc').row], [pc.col, pc.row + 2]);
  });

  test('a monitor can be nudged freely on its desk', () => {
    const e = new WorldEditor(twoFloorOffice());
    const pc = at(e, 'wsa-pc');
    const r = e.moveFurniture('wsa-pc', pc.roomId, pc.col - 1, pc.row, { x: 0.375, y: 0.25 });
    assert.ok(r.ok);
    assert.deepEqual(at(e, 'wsa-pc').offset, { x: 0.375, y: 0.25 });
    // Snapping back to a whole tile clears the offset.
    assert.ok(e.moveFurniture('wsa-pc', pc.roomId, pc.col, pc.row, { x: 0, y: 0 }).ok);
    assert.equal(at(e, 'wsa-pc').offset, undefined);
  });

  test('deleting a desk removes what sits on it; deleting a chair unseats its agent in place', () => {
    const e = new WorldEditor(twoFloorOffice());
    const room = at(e, 'wsa-chair').roomId;
    assert.ok(e.remove('furniture', 'wsa-desk').ok);
    assert.ok(!e.world.furniture.some(f => f.id === 'wsa-desk' || f.id === 'wsa-pc'));
    const seated = e.world.agents.find(a => a.seatId === 'wsa-chair');
    assert.ok(e.remove('furniture', 'wsa-chair').ok);
    if (seated) {
      const a = e.world.agents.find(x => x.id === seated.id)!;
      assert.equal(a.seatId, undefined);
      assert.equal(a.roomId, room);
    }
  });

  test('wall decor moves freely in sub-tile steps', () => {
    const e = new WorldEditor(twoFloorOffice());
    const d = e.world.decor[0];
    assert.ok(e.moveDecor(d.id, d.col + 0.5, d.y + 0.25).ok);
    const moved = e.world.decor.find(x => x.id === d.id)!;
    assert.deepEqual([moved.col, moved.y], [d.col + 0.5, d.y + 0.25]);
  });
});
