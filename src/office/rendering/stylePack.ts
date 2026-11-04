/**
 * Procedural FALLBACK style pack. These are placeholder surface treatments so
 * an empty building is legible before generated pixel-art kits exist. A real
 * style pack swaps these for texture images without touching geometry.
 */
export type WallPattern = 'plaster' | 'planks' | 'brick' | 'tiles' | 'panels' | 'acoustic' | 'glass' | 'blocks';
export type FloorPattern = 'planks' | 'grid' | 'plain' | 'speckle';

export interface MaterialStyle {
  base: string;
  shade: string;
  line: string;
  pattern: WallPattern | FloorPattern;
}

export interface StylePack {
  id: string;
  /** Sky gradient stops (top, horizon) and star density per preset. */
  sky: Record<'night' | 'dusk' | 'day', { top: string; horizon: string; stars: number; skyline: string; skylineLit: string }>;
  structure: { facade: string; facadeLine: string; slab: string; slabTop: string; slabShadow: string; cut: string; cutLight: string; roof: string; ground: string };
  walls: Record<string, MaterialStyle & { pattern: WallPattern }>;
  floors: Record<string, MaterialStyle & { pattern: FloorPattern }>;
  lamp: string;
  shaft: { well: string; rail: string; cabin: string; cabinLight: string; door: string; doorLine: string };
  label: { plate: string; text: string; border: string };
}

export const FALLBACK_STYLE: StylePack = {
  id: 'procedural-fallback-v1',
  sky: {
    night: { top: '#070a1c', horizon: '#26204a', stars: 140, skyline: '#151633', skylineLit: '#f3c46b' },
    dusk: { top: '#1e1b3e', horizon: '#a8576b', stars: 40, skyline: '#2b1f3a', skylineLit: '#ffd38a' },
    day: { top: '#6fa7d6', horizon: '#cfe6f2', stars: 0, skyline: '#8aa1b8', skylineLit: '#dbe7f0' },
  },
  structure: {
    facade: '#2a2740', facadeLine: '#363251', slab: '#3b3550', slabTop: '#6b6185', slabShadow: '#1d1a2c',
    cut: '#4a4262', cutLight: '#6a5f88', roof: '#332e4a', ground: '#1f2a26',
  },
  walls: {
    plaster: { base: '#6d6478', shade: '#5a5266', line: '#7c7388', pattern: 'plaster' },
    'wood-panel': { base: '#6b4a3a', shade: '#563b2f', line: '#7d5745', pattern: 'planks' },
    brick: { base: '#6e4a44', shade: '#5b3d38', line: '#4a302d', pattern: 'brick' },
    tile: { base: '#6f8a8a', shade: '#5d7676', line: '#87a1a0', pattern: 'tiles' },
    'lab-tile': { base: '#4f7577', shade: '#416163', line: '#679092', pattern: 'tiles' },
    panel: { base: '#3f4a6e', shade: '#343e5d', line: '#56628c', pattern: 'panels' },
    acoustic: { base: '#3b4b5e', shade: '#2f3d4d', line: '#4d6178', pattern: 'acoustic' },
    glass: { base: '#14204a', shade: '#0e1736', line: '#5d6ea8', pattern: 'glass' },
    stone: { base: '#706a64', shade: '#5f5953', line: '#857e77', pattern: 'blocks' },
  },
  floors: {
    wood: { base: '#7a5236', shade: '#6a4630', line: '#5a3b28', pattern: 'planks' },
    carpet: { base: '#5b3f55', shade: '#4f3649', line: '#664860', pattern: 'plain' },
    tile: { base: '#8b8f96', shade: '#7b7f86', line: '#6b6f76', pattern: 'grid' },
    stone: { base: '#7d766d', shade: '#6e675f', line: '#625b54', pattern: 'grid' },
    concrete: { base: '#6a6a6e', shade: '#5f5f63', line: '#56565a', pattern: 'speckle' },
    technical: { base: '#3b4256', shade: '#333a4c', line: '#4b5470', pattern: 'grid' },
  },
  lamp: '#ffd994',
  shaft: { well: '#151322', rail: '#3a3552', cabin: '#8a7f6a', cabinLight: '#ffe2a8', door: '#8d93a6', doorLine: '#5d6273' },
  label: { plate: 'rgba(20,16,36,0.82)', text: '#f4e6c8', border: '#b8945a' },
};

export function wallStyle(pack: StylePack, material?: string) {
  return pack.walls[material ?? ''] ?? pack.walls.plaster;
}
export function floorStyle(pack: StylePack, material?: string) {
  return pack.floors[material ?? ''] ?? pack.floors.wood;
}
