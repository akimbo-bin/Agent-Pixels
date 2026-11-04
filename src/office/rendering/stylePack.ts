/**
 * Style packs (themes) keep any office cohesive: one palette, one lighting
 * mood, one architecture vocabulary and default surfaces per room KIND. A new
 * office only declares room kinds; the style pack decides how they look.
 * Texture ids point into asset packs; procedural materials are the fallback.
 * Nothing here changes geometry or collision.
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
  label: { plate: string; text: string; border: string; subtitle?: string; style?: 'plate' | 'banner' };
  /** Default look per room kind (rooms may still override surfaces). */
  roomKinds?: Record<string, RoomKindStyle>;
  /** Architecture and lighting vocabulary. */
  features?: StyleFeatures;
  /** Asset packs this style draws textures/sprites from. */
  assetPacks?: string[];
}

export interface RoomKindStyle {
  wall?: string;
  floor?: string;
  wallTextureId?: string;
  floorTextureId?: string;
  subtitle?: string;
}

export interface StyleFeatures {
  /** Warm wall sconces on back walls. */
  sconces?: boolean;
  /** Balcony railing along every cut floor edge, with lamp posts at wall columns. */
  railings?: boolean;
  /** Pennant banners on the exterior wall faces. */
  banners?: { cloth: string; trim: string; emblem: string };
  /** Silhouettes along the ground line in the backdrop. */
  groundDecor?: 'forest' | 'none';
  /** Gold trim line on slab lips and the roof. */
  trim?: string;
  /** Strength of warm light pools (0..1). */
  warmth?: number;
}

export const FALLBACK_STYLE: StylePack = {
  id: 'procedural-fallback-v1',  // neutral office
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

/**
 * "Nebula night": violet night, warm amber lamps, rich wood and gold trim,
 * balconies with lamp posts and pennants, pines along the ground. Aimed at the
 * owner's reference image; usable by any organization.
 */
export const NEBULA_STYLE: StylePack = {
  ...FALLBACK_STYLE,
  id: 'nebula-night',
  sky: {
    ...FALLBACK_STYLE.sky,
    night: { top: '#0a0820', horizon: '#3a2266', stars: 220, skyline: '#140f2c', skylineLit: '#ffcf7a' },
  },
  structure: {
    facade: '#241d3c', facadeLine: '#3a2f5a', slab: '#2f2650', slabTop: '#8a72b8', slabShadow: '#140f26',
    cut: '#3b3060', cutLight: '#7d68ad', roof: '#2a2148', ground: '#0e1a1c',
  },
  walls: {
    ...FALLBACK_STYLE.walls,
    'wood-panel': { base: '#5a3424', shade: '#45261a', line: '#74452e', pattern: 'planks' },
    plaster: { base: '#4a3e62', shade: '#3c3252', line: '#5a4c74', pattern: 'plaster' },
    brick: { base: '#5b3a40', shade: '#4a2f34', line: '#3a2328', pattern: 'brick' },
    'lab-tile': { base: '#1f4a58', shade: '#183c48', line: '#2d6476', pattern: 'tiles' },
    panel: { base: '#2a2f62', shade: '#222652', line: '#3c4384', pattern: 'panels' },
    glass: { base: '#0e1640', shade: '#0a1030', line: '#6d7cc0', pattern: 'glass' },
    stone: { base: '#4e4860', shade: '#403a52', line: '#625a78', pattern: 'blocks' },
  },
  floors: {
    ...FALLBACK_STYLE.floors,
    wood: { base: '#6e4026', shade: '#5c3420', line: '#4a2818', pattern: 'planks' },
    carpet: { base: '#3e2a5a', shade: '#33224c', line: '#4c3470', pattern: 'plain' },
    stone: { base: '#5a5470', shade: '#4c4662', line: '#403a54', pattern: 'grid' },
    technical: { base: '#22264a', shade: '#1c2040', line: '#34406e', pattern: 'grid' },
    tile: { base: '#6a6f86', shade: '#5c6078', line: '#4e5268', pattern: 'grid' },
    concrete: { base: '#4e4c5c', shade: '#444252', line: '#3c3a48', pattern: 'speckle' },
  },
  lamp: '#ffc46b',
  label: { plate: 'rgba(16,12,36,0.92)', text: '#fff3dc', border: '#d9a95b', subtitle: '#c9b6ec', style: 'banner' },
  roomKinds: {
    office: { wall: 'wood-panel', floor: 'wood', subtitle: 'Office' },
    reception: { wall: 'plaster', floor: 'stone', subtitle: 'Reception & Operations' },
    workshop: { wall: 'brick', floor: 'concrete', subtitle: 'Prototypes · Systems' },
    workspace: { wall: 'wood-panel', floor: 'wood', subtitle: 'Workspace' },
    lab: { wall: 'lab-tile', floor: 'technical', subtitle: 'Laboratory' },
    observatory: { wall: 'glass', floor: 'technical', subtitle: 'Observation Deck' },
    studio: { wall: 'acoustic', floor: 'wood', subtitle: 'Studio' },
    meeting: { wall: 'plaster', floor: 'carpet', subtitle: 'Meetings' },
    corridor: { wall: 'stone', floor: 'stone', subtitle: 'Hall' },
    clinic: { wall: 'plaster', floor: 'tile', subtitle: 'Health · Wellness' },
    review: { wall: 'plaster', floor: 'carpet', subtitle: 'Quality · Review' },
    operations: { wall: 'panel', floor: 'technical', subtitle: 'Live Pipeline' },
    kitchen: { wall: 'stone', floor: 'tile', subtitle: 'Kitchen' },
    lounge: { wall: 'wood-panel', floor: 'carpet', subtitle: 'Lounge' },
  },
  features: {
    sconces: true, railings: true, groundDecor: 'forest', trim: '#d9a95b', warmth: 0.85,
    banners: { cloth: '#4a2a86', trim: '#d9a95b', emblem: '#b9a4ff' },
  },
};

export const STYLE_PACKS: Record<string, StylePack> = {
  [FALLBACK_STYLE.id]: FALLBACK_STYLE,
  [NEBULA_STYLE.id]: NEBULA_STYLE,
};

export function stylePackFor(id: string | undefined): StylePack {
  return (id && STYLE_PACKS[id]) || FALLBACK_STYLE;
}
