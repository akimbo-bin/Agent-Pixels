// Flattens public/assets furniture manifests into the runtime asset index used
// by loadPixelAssets(). Shared by the engine dev build and the node test suite.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

function flatten(manifest, folder, inherited = {}) {
  const common = {
    category: manifest.category ?? inherited.category ?? 'misc',
    groupId: manifest.type === 'group' ? manifest.id : inherited.groupId,
    orientation: manifest.orientation ?? inherited.orientation,
    state: manifest.state ?? inherited.state,
    rotationScheme: manifest.rotationScheme ?? inherited.rotationScheme,
    animationGroup: manifest.groupType === 'animation' ? manifest.id : inherited.animationGroup,
    canPlaceOnSurfaces: manifest.canPlaceOnSurfaces ?? inherited.canPlaceOnSurfaces,
    backgroundTiles: manifest.backgroundTiles ?? inherited.backgroundTiles,
    canPlaceOnWalls: manifest.canPlaceOnWalls ?? inherited.canPlaceOnWalls,
    mirrorSide: manifest.mirrorSide ?? inherited.mirrorSide,
  };
  if (manifest.type === 'asset') return [{
    id: manifest.id, label: manifest.name ?? inherited.name ?? manifest.id,
    category: common.category, width: manifest.width, height: manifest.height,
    footprintW: manifest.footprintW, footprintH: manifest.footprintH,
    isDesk: common.category === 'desks', groupId: common.groupId,
    orientation: common.orientation, state: common.state,
    rotationScheme: common.rotationScheme, animationGroup: common.animationGroup,
    frame: manifest.frame, canPlaceOnSurfaces: !!common.canPlaceOnSurfaces,
    backgroundTiles: common.backgroundTiles, canPlaceOnWalls: !!common.canPlaceOnWalls,
    mirrorSide: !!common.mirrorSide, renderLayer: manifest.renderLayer,
    furniturePath: 'furniture/' + folder + '/' + (manifest.file ?? manifest.id + '.png'),
  }];
  return (manifest.members ?? []).flatMap(member => flatten(member, folder, { ...common, name: manifest.name ?? inherited.name }));
}

export async function buildAssetIndex(assetsDir) {
  const furniture = [];
  for (const folder of await readdir(path.join(assetsDir, 'furniture'), { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const manifest = JSON.parse(await readFile(path.join(assetsDir, 'furniture', folder.name, 'manifest.json'), 'utf8'));
    furniture.push(...flatten(manifest, folder.name));
  }
  const ids = new Set();
  for (const item of furniture) {
    if (ids.has(item.id)) throw Error(`Duplicate asset ID ${item.id}`);
    ids.add(item.id);
    if (item.furniturePath.includes('..') || item.furniturePath.includes('\\')) throw Error(`Unsafe asset path ${item.id}`);
  }
  const characters = (await readdir(path.join(assetsDir, 'characters')))
    .filter(s => /^char_\d+\.png$/i.test(s))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .map(name => 'characters/' + name);
  return {
    characters,
    floors: Array.from({ length: 9 }, (_, i) => 'nebula-floors/floor_' + i + '.png'),
    walls: ['walls/wall_0.png'],
    furniture,
    layouts: { office: 'default-layout-1.json', boardroomKitchen: 'agent-pixels-layout-boardroom-kitchen.json' },
    defaultLayout: 'default-layout-1.json',
  };
}
