import type { CompiledWorld } from '../world/compiler.js';

/**
 * Shallow 2.5D dollhouse projection. Pure functions only.
 *
 * World point (floor, x, z, h): x across the building, z depth from the room
 * front (0) toward its back wall, h height above the floor. All in tiles.
 *
 *   s(z)    = 1 - perspective * z           (subtle one-point convergence)
 *   px      = (margin + cx + (x - cx) * s) * T
 *   Yup     = base(floor) + z * rise + h * s
 *   py      = (top - Yup) * T
 *
 * Depth only ever raises a point by `rise` per tile, so the floor plane is a
 * shallow band and characters never "climb" the back wall. One horizontal tile
 * projects to the same width for rooms, doorways and corridors on that depth.
 */
export interface ViewParams {
  /** Native pixels per world tile (source art scale). */
  tilePx: number;
  /** Screen-up tiles per tile of depth. */
  rise: number;
  /** Horizontal convergence per tile of depth (0 = pure oblique). */
  perspective: number;
  /** Floor slab thickness in tiles (the cut front lip). */
  slab: number;
  /** Space above the top storey for the roof. */
  roof: number;
  /** Ground band below the lowest storey. */
  ground: number;
  /** Horizontal margin (tiles) left and right of the building. */
  margin: number;
}

export const DEFAULT_VIEW: ViewParams = {
  tilePx: 16, rise: 0.5, perspective: 0.007, slab: 1, roof: 2, ground: 2, margin: 3,
};

export interface ProjectedPoint { x: number; y: number; s: number }
export type Quad = [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];

export interface Projection {
  params: ViewParams;
  /** Native render-buffer size in pixels. */
  width: number;
  height: number;
  /** Vanishing column (world x). */
  cx: number;
  /** Screen-up Y (tiles) of each floor's front floor edge. */
  base: Map<string, number>;
  /** Screen-up Y of the top of each storey (just under the slab above). */
  storeyTop: Map<string, number>;
  project(floorId: string, x: number, z: number, h?: number): ProjectedPoint;
  /** Same transform with an explicit floor base (for moving elevator cabins). */
  projectAt(base: number, x: number, z: number, h?: number): ProjectedPoint;
  /** Inverse for points ON a floor plane (h = 0). */
  screenToFloor(px: number, py: number): { floorId: string; x: number; z: number } | null;
  /** Footprint rectangle on the floor plane: x in [x0,x1], z in [z0,z1]. */
  projectFootprint(floorId: string, x0: number, x1: number, z0: number, z1: number): Quad;
  /** Vertical rectangle at depth z spanning x and height. */
  projectFacade(floorId: string, x0: number, x1: number, z: number, h0: number, h1: number): Quad;
  /** Vertical rectangle at column x spanning depth and height (side wall). */
  projectSide(floorId: string, x: number, z0: number, z1: number, h0: number, h1: number): Quad;
}

export function storeyHeight(depth: number, wallHeight: number, p: ViewParams = DEFAULT_VIEW): number {
  return depth * p.rise + wallHeight;
}

export function createProjection(compiled: CompiledWorld, params: ViewParams = DEFAULT_VIEW): Projection {
  const p = params;
  const base = new Map<string, number>();
  const storeyTop = new Map<string, number>();
  const ascending = [...compiled.floors].sort((a, b) => a.def.level - b.def.level);
  let y = p.ground + p.slab;
  for (const f of ascending) {
    base.set(f.def.id, y);
    const top = y + storeyHeight(f.depth, f.def.wallHeight, p);
    storeyTop.set(f.def.id, top);
    y = top + p.slab;
  }
  const topY = y - p.slab + p.roof;
  const cx = compiled.cols / 2;
  const T = p.tilePx;
  const width = Math.ceil((compiled.cols + 2 * p.margin) * T);
  const height = Math.ceil(topY * T);

  const projectAt = (b: number, x: number, z: number, h = 0): ProjectedPoint => {
    const s = 1 - p.perspective * z;
    return { x: (p.margin + cx + (x - cx) * s) * T, y: (topY - (b + z * p.rise + h * s)) * T, s };
  };
  const project = (floorId: string, x: number, z: number, h = 0): ProjectedPoint => {
    const b = base.get(floorId);
    if (b === undefined) throw Error(`Unknown floor ${floorId}`);
    return projectAt(b, x, z, h);
  };

  return {
    params: p, width, height, cx, base, storeyTop, project, projectAt,
    screenToFloor(px, py) {
      const up = topY - py / T;
      for (const f of compiled.floors) {
        const z = (up - base.get(f.def.id)!) / p.rise;
        if (z < 0 || z > f.depth) continue;
        const s = 1 - p.perspective * z;
        return { floorId: f.def.id, x: cx + (px / T - p.margin - cx) / s, z };
      }
      return null;
    },
    projectFootprint(floorId, x0, x1, z0, z1) {
      return [project(floorId, x0, z0), project(floorId, x1, z0), project(floorId, x1, z1), project(floorId, x0, z1)];
    },
    projectFacade(floorId, x0, x1, z, h0, h1) {
      return [project(floorId, x0, z, h0), project(floorId, x1, z, h0), project(floorId, x1, z, h1), project(floorId, x0, z, h1)];
    },
    projectSide(floorId, x, z0, z1, h0, h1) {
      return [project(floorId, x, z0, h0), project(floorId, x, z1, h0), project(floorId, x, z1, h1), project(floorId, x, z0, h1)];
    },
  };
}

/** World position of a character from its OfficeState pixel coordinates. */
export function characterWorld(compiled: CompiledWorld, px: number, py: number, tilePx = 16) {
  const row = py / tilePx;
  const floor = compiled.floorOfRow(Math.floor(row));
  if (!floor) return null;
  return { floorId: floor.def.id, x: px / tilePx, z: compiled.zOfRow(row) };
}
