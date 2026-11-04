import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { type AssetPack, type AssetRecord, validateAssetPack } from '../../src/office/assets/manifest.js';
import { toCatalogEntry } from '../../src/office/assets/loader.js';
import { registerPackEntries } from '../../src/office/layout/furnitureCatalog.js';
import { compileWorld } from '../../src/office/world/compiler.js';
import { blockedFurnitureTiles, checkConnectivity } from '../../src/office/world/connectivity.js';
import { applyRoomKit, MUSIC_STUDIO_DRESSING, NEBULA_EXEC_DRESSING } from '../../src/office/world/kits.js';
import { nebulaCampusSample, twoFloorOffice } from '../../src/office/world/templates.js';
import { loadCatalog } from './helpers.js';

const sha = 'a'.repeat(64);
const rec = (over: Partial<AssetRecord>): AssetRecord => ({
  assetId: 'x', class: 'wall-texture', file: 'x.png', width: 64, height: 64, pixelScale: 1, stylePackId: 's',
  alphaMode: 'opaque', tileable: true, collision: 'none', source: 'local-comfyui', licenseStatus: 'review-required',
  reviewStatus: 'candidate', sha256: sha, ...over,
});
const pack = (assets: AssetRecord[]): AssetPack => ({ schemaVersion: 1, id: 'p', name: 'p', stylePackId: 's', assets });

/** Fixture records matching the music studio kit's physical metadata. */
const KIT_RECORDS: AssetRecord[] = [
  rec({ assetId: 'studio-console', class: 'furniture-sprite', file: 'c.png', width: 48, height: 32, alphaMode: 'cutout', tileable: false, collision: 'solid', footprint: { w: 3, h: 2, backgroundRows: 1 }, category: 'desks', isDesk: true }),
  rec({ assetId: 'studio-speaker', class: 'furniture-sprite', file: 's.png', width: 16, height: 32, alphaMode: 'cutout', tileable: false, collision: 'solid', footprint: { w: 1, h: 1, backgroundRows: 0 }, category: 'misc' }),
  rec({ assetId: 'studio-diffuser', class: 'decor-sprite', file: 'd.png', width: 32, height: 32, alphaMode: 'cutout', tileable: false, attachment: 'back-wall' }),
  rec({ assetId: 'studio-poster', class: 'decor-sprite', file: 'p.png', width: 16, height: 32, alphaMode: 'cutout', tileable: false, attachment: 'back-wall' }),
];

before(async () => {
  await loadCatalog();
  registerPackEntries(KIT_RECORDS.map(r => toCatalogEntry(r, [['']])));
});

describe('asset pack validation', () => {
  test('a well-formed pack passes', () => assert.deepEqual(validateAssetPack(pack(KIT_RECORDS)), []));
  test('refuses path traversal, absolute paths and URLs', () => {
    for (const file of ['../x.png', 'C:/x.png', 'https://evil/x.png', 'a/b.png', 'x.svg']) {
      assert.ok(validateAssetPack(pack([rec({ file })])).some(m => m.includes('plain .png')), file);
    }
  });
  test('decor may not collide, furniture must', () => {
    assert.ok(validateAssetPack(pack([rec({ class: 'decor-sprite', alphaMode: 'cutout', tileable: false, collision: 'solid' })])).some(m => m.includes('reclassify')));
    assert.ok(validateAssetPack(pack([rec({ class: 'furniture-sprite', alphaMode: 'cutout', tileable: false, collision: 'solid' })])).some(m => m.includes('footprint')));
  });
  test('room art must name the room size it was painted for, and never collides', () => {
    const room = { width: 12, wallHeight: 6, depth: 6 };
    assert.deepEqual(validateAssetPack(pack([rec({ class: 'room-backdrop', tileable: false, room })])), []);
    assert.ok(validateAssetPack(pack([rec({ class: 'room-floor', tileable: false })])).some(m => m.includes('room size')));
    assert.ok(validateAssetPack(pack([rec({ class: 'room-backdrop', tileable: false, room, collision: 'solid' })])).some(m => m.includes('never collides')));
  });
  test('surface textures must tile', () => {
    assert.ok(validateAssetPack(pack([rec({ tileable: false })])).some(m => m.includes('tileable')));
  });
});

describe('room kit dressing', () => {
  test('changes art and furniture but no topology; stays connected', () => {
    const base = twoFloorOffice();
    const dressed = applyRoomKit(base, 'music', MUSIC_STUDIO_DRESSING);
    const a = compileWorld(base), b = compileWorld(dressed);
    assert.deepEqual(b.layout.tiles, a.layout.tiles, 'walls, floors and doors identical');
    assert.deepEqual(b.doors.map(d => d.rows), a.doors.map(d => d.rows));
    assert.deepEqual(checkConnectivity(b), []);
    assert.equal(dressed.rooms.find(r => r.id === 'music')!.surfaces!.backWall!.textureId, 'studio-wall-acoustic');
    assert.equal(dressed.agents.find(x => x.id === 'a-guest')!.seatId, 'kit-chair');
  });
  test('generated console blocks by its record footprint', () => {
    const c = compileWorld(applyRoomKit(twoFloorOffice(), 'music', MUSIC_STUDIO_DRESSING));
    const f = c.layout.furniture.find(x => x.uid === 'kit-console')!;
    assert.equal(c.cellAt(f.col, f.row)?.id, 'music');
  });
  test('executive kit on the campus sample: side-on definitions collide, building stays connected', () => {
    const base = nebulaCampusSample();
    const dressed = applyRoomKit(base, 'lead', NEBULA_EXEC_DRESSING);
    const c = compileWorld(dressed);
    assert.deepEqual(c.layout.tiles, compileWorld(base).layout.tiles);
    assert.deepEqual(checkConnectivity(c), []);
    const desk = c.layout.furniture.find(f => f.uid === 'exec-desk')!;
    // 4x2 desk with one overhang row: only its front row blocks.
    const blocked = blockedFurnitureTiles(c);
    assert.ok([0, 1, 2, 3].every(dc => blocked.has(`${desk.col + dc},${desk.row + 1}`)));
  });

  test('base template is untouched (dressing works on a copy)', () => {
    const base = twoFloorOffice();
    applyRoomKit(base, 'music', MUSIC_STUDIO_DRESSING);
    assert.ok(base.furniture.some(f => f.id === 'music-sofa'));
  });
});
