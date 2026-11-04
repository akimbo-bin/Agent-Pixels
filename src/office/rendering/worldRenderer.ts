import { getCharacterSprite } from '../engine/characters.js';
import type { OfficeState } from '../engine/officeState.js';
import { getCatalogEntry } from '../layout/furnitureCatalog.js';
import { getCachedSprite, getOutlineSprite } from '../sprites/spriteCache.js';
import { getCharacterSprites } from '../sprites/spriteData.js';
import { CharacterState, type Character } from '../types.js';
import type { CompiledCell, CompiledElevator, CompiledWorld, GridPoint } from '../world/compiler.js';
import { blockedFurnitureTiles, seatTiles } from '../world/connectivity.js';
import { LIMITS } from '../world/validator.js';
import { characterWorld, type ProjectedPoint, type Projection } from '../geometry/projection.js';
import type { TravelSystem } from '../navigation/elevator.js';
import { FALLBACK_STYLE, type StylePack, floorStyle, wallStyle } from './stylePack.js';
import type { AssetRecord } from '../assets/manifest.js';

/** Decoded asset-pack images the renderer may use for surfaces (visual only). */
export interface RenderAssets { images: Map<string, HTMLCanvasElement>; records: Map<string, AssetRecord> }

export interface RenderOptions {
  debug: boolean;
  selectedId: number | null;
  hoverTile: GridPoint | null;
  time: number;
}

/** Screen-filling sky/ground description (drawn by the viewport, buffer pixel scale). */
export interface Backdrop {
  /** Horizontally tileable sky strip whose bottom sits on the ground line. */
  tile: HTMLCanvasElement;
  /** Repeating star field for sky above the strip. */
  stars: HTMLCanvasElement;
  top: string;
  /** Ground line in buffer pixels. */
  groundY: number;
  ground: string;
  groundLine: string;
}

export interface RoomLabel { text: string; subtitle?: string; x: number; y: number; cellId: string }
/** Screen-space bounds of drawn entities from the last frame (for hit testing). */
export interface Hit { kind: 'agent' | 'furniture'; id: string; x: number; y: number; w: number; h: number }

/** One depth-sorted drawable in the physical layer (layer 5). */
interface Item { floor: number; key: number; order: number; draw: () => void }

type Ctx = CanvasRenderingContext2D;
const SIT_PX = 4;

/**
 * Layered dollhouse renderer. Draws into a native-resolution buffer (1 tile =
 * 16 px) that the viewport scales with nearest-neighbour sampling.
 *
 *   0-4  cached background: sky, shell, back walls, floors, wall decor
 *   5    per-frame physical layer: furniture, agents, partition walls, sorted
 *        by physical foot depth; elevator cabins clipped to their wells
 *   6    cached foreground: cut slab lips, roof, ground edge
 *   7+   debug overlay (optional); labels/UI are drawn by the viewport
 */
export class WorldRenderer {
  readonly canvas: HTMLCanvasElement;
  private bg: HTMLCanvasElement | null = null;
  private fg: HTMLCanvasElement | null = null;
  /** Entities in draw order from the last frame; later entries are on top. */
  hits: Hit[] = [];
  private walls: Array<Omit<Item, 'draw'> & { draw: (ctx: Ctx) => void }> = [];
  private assets: RenderAssets | null = null;
  private sky: Backdrop | null = null;

  constructor(public compiled: CompiledWorld, public proj: Projection, public pack: StylePack = FALLBACK_STYLE) {
    this.canvas = document.createElement('canvas');
    this.setWorld(compiled, proj);
  }

  setWorld(compiled: CompiledWorld, proj: Projection) {
    this.compiled = compiled;
    this.proj = proj;
    this.canvas.width = proj.width;
    this.canvas.height = proj.height;
    this.bg = this.fg = null;
    this.sky = null;
    this.walls = this.buildWallSegments();
  }

  /** Swap the style pack (theme); geometry untouched, cached layers rebuilt. */
  setStyle(pack: StylePack) {
    if (pack === this.pack) return;
    this.pack = pack;
    this.bg = this.fg = this.sky = null;
    this.walls = this.buildWallSegments();
  }

  /** Swap surface art without touching geometry; cached layers are rebuilt. */
  setAssets(assets: RenderAssets | null) {
    this.assets = assets;
    this.bg = this.fg = this.sky = null;
  }

  private texture(id: string | undefined, cls: AssetRecord['class']): HTMLCanvasElement | null {
    if (!id || !this.assets) return null;
    const rec = this.assets.records.get(id);
    return rec && rec.class === cls ? this.assets.images.get(id) ?? null : null;
  }

  labels(): RoomLabel[] {
    return this.compiled.cells.filter(c => c.kind === 'room').map(c => {
      const f = this.floor(c.floorId);
      const p = this.proj.project(c.floorId, c.x + c.width / 2, c.depth, f.def.wallHeight - 0.15);
      const subtitle = c.room!.subtitle ?? this.pack.roomKinds?.[c.room!.kind]?.subtitle;
      return { text: c.room!.name, subtitle, x: p.x, y: p.y, cellId: c.id };
    });
  }

  render(office: OfficeState, travel: TravelSystem, opts: RenderOptions) {
    const ctx = this.canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    // The buffer is transparent outside the building (the backdrop shows through).
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.bg ??= this.layer(c => this.drawBackground(c));
    this.fg ??= this.layer(c => this.drawForeground(c));
    ctx.drawImage(this.bg, 0, 0);
    for (const e of this.compiled.elevators) this.drawCabin(ctx, e, office, travel, opts);

    this.hits = [];
    const items: Item[] = [];
    const floorIndex = new Map(this.compiled.floors.map((f, i) => [f.def.id, i]));
    for (const w of this.walls) items.push({ ...w, draw: () => w.draw(ctx) });
    for (const f of this.compiled.layout.furniture) {
      const it = this.furnitureItem(ctx, f.uid, f.type, f.col, f.row, floorIndex);
      if (it) items.push(it);
    }
    for (const ch of office.characters.values()) {
      const slot = travel.riderSlot(ch.id);
      if (slot && slot.boarding >= 1) continue; // drawn inside the cabin
      const it = this.agentItem(ctx, ch, opts, floorIndex, slot ? this.boardingPose(ch, slot) : null);
      if (it) items.push(it);
    }
    items.sort((a, b) => a.floor - b.floor || b.key - a.key || a.order - b.order);
    for (const it of items) it.draw();
    ctx.drawImage(this.fg, 0, 0);
    if (opts.debug) this.drawDebug(ctx, office, opts);
  }

  // ── geometry helpers ─────────────────────────────────────────

  private floor(id: string) { return this.compiled.floors.find(f => f.def.id === id)!; }
  private layer(paint: (c: Ctx) => void) {
    const c = document.createElement('canvas');
    c.width = this.proj.width; c.height = this.proj.height;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    paint(ctx);
    return c;
  }

  // ── layer 0-4: background ────────────────────────────────────

  /**
   * Sky and ground live OUTSIDE the building buffer: the viewport tiles this
   * backdrop across the whole screen (with parallax), so no zoom level or
   * aspect ratio ever reveals an empty edge.
   */
  backdrop(): Backdrop {
    if (this.sky) return this.sky;
    const { world } = this.compiled;
    const sky = this.pack.sky[world.background.preset] ?? this.pack.sky.night;
    const groundY = this.groundY();
    const skyTex = this.texture(world.background.skyLayerId, 'sky-layer');
    const tile = document.createElement('canvas');
    tile.width = skyTex ? skyTex.width : 512;
    tile.height = Math.max(1, groundY);
    const ctx = tile.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    let top = sky.top;
    if (skyTex) {
      const t = skyTex.getContext('2d')!.getImageData(0, 0, 1, 1).data;
      top = `rgb(${t[0]},${t[1]},${t[2]})`;
      ctx.fillStyle = top; ctx.fillRect(0, 0, tile.width, tile.height);
      ctx.drawImage(skyTex, 0, tile.height - skyTex.height);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, tile.height);
      g.addColorStop(0, sky.top); g.addColorStop(1, sky.horizon);
      ctx.fillStyle = g; ctx.fillRect(0, 0, tile.width, tile.height);
      // Wrap-safe procedural skyline (buildings never straddle the tile edge).
      const rand = seeded((world.background.seed ?? world.seed) + 3);
      for (let x = 0; x < tile.width - 12;) {
        const w = Math.min(12 + Math.floor(rand() * 40), tile.width - x), h = 20 + Math.floor(rand() * 90);
        ctx.fillStyle = sky.skyline; ctx.fillRect(x, tile.height - h, w, h);
        ctx.fillStyle = sky.skylineLit;
        for (let wy = tile.height - h + 4; wy < tile.height - 4; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5) {
          if (rand() < 0.12) { ctx.globalAlpha = 0.5; ctx.fillRect(wx, wy, 2, 2); ctx.globalAlpha = 1; }
        }
        x += w + Math.floor(rand() * 10);
      }
    }
    if (this.pack.features?.groundDecor === 'forest') {
      // Pine silhouettes along the ground line, in front of the skyline (wraps at the tile edge).
      const r3 = seeded((world.background.seed ?? world.seed) + 9);
      const tw = tile.width;
      for (let x = 0; x < tw; x += 5 + Math.floor(r3() * 9)) {
        const h = 14 + Math.floor(r3() * 26), w = Math.max(5, Math.floor(h * 0.45));
        for (let j = 0; j < h; j++) {
          const half = Math.floor(((j / h) * w) / 2 + ((j % 6) < 2 ? 1 : 0));
          ctx.fillStyle = j > h - 3 ? '#0b1418' : '#0f1d24';
          for (const ox of [0, -tw, tw]) ctx.fillRect(x - half + ox, tile.height - h + j, half * 2 + 1, 1);
        }
      }
    }
    const stars = document.createElement('canvas');
    stars.width = stars.height = 128;
    const sc = stars.getContext('2d')!;
    sc.fillStyle = top; sc.fillRect(0, 0, 128, 128);
    const r2 = seeded((world.background.seed ?? world.seed) + 1);
    const n = Math.round(sky.stars / 6) + (skyTex ? 18 : 0);
    for (let i = 0; i < n; i++) {
      sc.fillStyle = r2() < 0.2 ? '#fff4d6' : '#c9b8ff'; sc.globalAlpha = 0.3 + r2() * 0.6;
      sc.fillRect(Math.floor(r2() * 128), Math.floor(r2() * 128), 1, 1);
    }
    // Stars over the upper part of the sky tile too (stop above the skyline).
    const starBand = Math.max(0, tile.height - (skyTex ? skyTex.height : 120));
    for (let i = 0; i < tile.width * starBand / 700; i++) {
      ctx.fillStyle = r2() < 0.2 ? '#fff4d6' : '#c9b8ff'; ctx.globalAlpha = 0.3 + r2() * 0.6;
      ctx.fillRect(Math.floor(r2() * tile.width), Math.floor(r2() * starBand), 1, 1);
    }
    ctx.globalAlpha = 1;
    this.sky = { tile, stars, top, groundY, ground: this.pack.structure.ground, groundLine: this.pack.structure.slabShadow };
    return this.sky;
  }

  private groundY() {
    return Math.round(this.proj.project(this.lowest().def.id, 0, 0).y + this.proj.params.slab * 16);
  }

  private drawBackground(ctx: Ctx) {
    const W = this.proj.width;
    const groundY = this.groundY();
    // Ground band under the building (the viewport extends it across the screen).
    ctx.fillStyle = this.pack.structure.ground; ctx.fillRect(0, groundY, W, this.proj.height - groundY);

    const st = this.pack.structure;
    for (const f of this.compiled.floors) {
      const [x0, x1] = this.extent(f.def.id);
      const a = this.proj.project(f.def.id, x0, 0), b = this.proj.project(f.def.id, x1, 0);
      const top = this.proj.storeyTop.get(f.def.id)!, base = this.proj.base.get(f.def.id)!;
      const yTop = Math.round(a.y - (top - base) * 16);
      ctx.fillStyle = st.facade; ctx.fillRect(Math.round(a.x), yTop, Math.round(b.x - a.x), Math.round(a.y - yTop));
    }
    // Roof cap over the top storey.
    const topFloor = [...this.compiled.floors].sort((a, b) => b.def.level - a.def.level)[0];
    const [rx0, rx1] = this.extent(topFloor.def.id);
    const ra = this.proj.project(topFloor.def.id, rx0 - 0.5, 0), rb = this.proj.project(topFloor.def.id, rx1 + 0.5, 0);
    const roofY = Math.round(ra.y - (this.proj.storeyTop.get(topFloor.def.id)! - this.proj.base.get(topFloor.def.id)!) * 16);
    ctx.fillStyle = st.roof; ctx.fillRect(Math.round(ra.x), roofY - 16, Math.round(rb.x - ra.x), 16);
    ctx.fillStyle = st.slabTop; ctx.fillRect(Math.round(ra.x), roofY - 16, Math.round(rb.x - ra.x), 2);

    for (const cell of this.compiled.cells) {
      if (cell.kind === 'room') this.drawRoomShell(ctx, cell);
    }
    // Door thresholds: the walk plane continues through the wall opening.
    for (const d of this.compiled.doors) {
      const z0 = d.def.z, z1 = d.def.z + d.def.width;
      fillQuad(ctx, this.proj.projectFootprint(d.floorId, d.col, d.col + 1, z0, z1), '#5b4a3c');
      line(ctx, this.proj.project(d.floorId, d.col, z0), this.proj.project(d.floorId, d.col, z1), '#3a2f27');
      line(ctx, this.proj.project(d.floorId, d.col + 1, z0), this.proj.project(d.floorId, d.col + 1, z1), '#3a2f27');
    }
    for (const e of this.compiled.elevators) this.drawShaft(ctx, e);
    for (const d of this.compiled.world.decor) this.drawDecor(ctx, d.roomId, d.assetId, d.attachment, d.col, d.y);
  }

  private lowest() { return [...this.compiled.floors].sort((a, b) => a.def.level - b.def.level)[0]; }

  /** Horizontal extent [x0, x1) including exterior wall columns. */
  private extent(floorId: string): [number, number] {
    const cells = this.compiled.cells.filter(c => c.floorId === floorId);
    return [Math.min(...cells.map(c => c.x)) - 1, Math.max(...cells.map(c => c.x + c.width)) + 1];
  }

  private drawRoomShell(ctx: Ctx, cell: CompiledCell) {
    const f = this.floor(cell.floorId);
    const H = f.def.wallHeight, D = cell.depth, x0 = cell.x, x1 = cell.x + cell.width, id = cell.floorId;
    // Explicit room surfaces win; otherwise the style pack's default for this room kind.
    const kind = this.pack.roomKinds?.[cell.room?.kind ?? ''];
    const ws = wallStyle(this.pack, cell.room?.surfaces?.backWall?.material ?? kind?.wall);
    const fs = floorStyle(this.pack, cell.room?.surfaces?.floor?.material ?? kind?.floor);
    // Back wall (vertical plane at the room's depth).
    fillQuad(ctx, this.proj.projectFacade(id, x0, x1, D, 0, H), ws.base);
    const wallTex = this.texture(cell.room?.surfaces?.backWall?.textureId ?? kind?.wallTextureId, 'wall-texture');
    const floorTex = this.texture(cell.room?.surfaces?.floor?.textureId ?? kind?.floorTextureId, 'floor-texture');
    const wallPt = (x: number, h: number) => this.proj.project(id, x, D, h);
    ctx.fillStyle = ws.line;
    const hline = (h: number, color = ws.line) => { const a = wallPt(x0, h), b = wallPt(x1, h); ctx.fillStyle = color; ctx.fillRect(Math.round(a.x), Math.round(a.y), Math.round(b.x - a.x), 1); };
    const vline = (x: number, h0: number, h1: number, color = ws.line) => { const a = wallPt(x, h1), b = wallPt(x, h0); ctx.fillStyle = color; ctx.fillRect(Math.round(a.x), Math.round(a.y), 1, Math.round(b.y - a.y)); };
    if (wallTex) {
      // Texture at native scale, anchored to the wall's top-left so it never swims.
      const q = this.proj.projectFacade(id, x0, x1, D, 0, H);
      const pat = ctx.createPattern(wallTex, 'repeat')!;
      pat.setTransform(new DOMMatrix([1, 0, 0, 1, Math.round(q[3].x), Math.round(q[3].y)]));
      fillQuad(ctx, q, pat);
    } else switch (ws.pattern) {
      case 'planks': for (let x = x0 + 1; x < x1; x++) vline(x, 0, H * 0.55); hline(H * 0.55); break;
      case 'brick': for (let h = 0.25, i = 0; h < H; h += 0.25, i++) { hline(h); for (let x = x0 + (i % 2) * 0.5; x < x1; x += 1) vline(x, h - 0.25, h); } break;
      case 'tiles': for (let h = 0.5; h < H; h += 0.5) hline(h); for (let x = x0 + 0.5; x < x1; x += 0.5) vline(x, 0, H); break;
      case 'panels': for (let x = x0 + 2; x < x1; x += 2) vline(x, 0, H); hline(1); hline(H - 0.6); break;
      case 'acoustic': for (let h = 0.5; h < H - 0.5; h += 1) for (let x = x0 + 0.5; x < x1 - 0.5; x += 1) {
        const q = this.proj.projectFacade(id, x + 0.08, x + 0.92, D, h + 0.08, h + 0.92); fillQuad(ctx, q, ws.shade);
      } break;
      case 'glass': {
        const rand = seeded(cell.x * 31 + f.def.level);
        const day = this.compiled.world.background.preset === 'day';
        if (day) fillQuad(ctx, this.proj.projectFacade(id, x0, x1, D, 0, H), '#5f8fc0');
        for (let i = 0; i < (day ? 0 : cell.width * H * 1.5); i++) {
          const p = wallPt(x0 + rand() * cell.width, rand() * H);
          ctx.fillStyle = rand() < 0.2 ? '#fff1c9' : '#9fb0ff'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        }
        for (let x = x0; x <= x1; x += 2) vline(x, 0, H, ws.line);
        hline(H * 0.5, ws.line);
        break;
      }
      case 'blocks': for (let h = 0.5, i = 0; h < H; h += 0.5, i++) { hline(h); for (let x = x0 + (i % 2); x < x1; x += 2) vline(x, h - 0.5, h); } break;
      default: hline(1.1); hline(1.2, ws.shade);
    }
    fillQuad(ctx, this.proj.projectFacade(id, x0, x1, D, 0, 0.22), ws.shade);
    fillQuad(ctx, this.proj.projectFacade(id, x0, x1, D, H - 0.18, H), ws.shade);
    // Soft ceiling-lamp pool on the back wall.
    const lamp = this.proj.project(id, (x0 + x1) / 2, D, H - 0.3);
    const rad = Math.min(cell.width, H * 1.6) * 8;
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 1, lamp.x, lamp.y + rad * 0.3, rad);
    glow.addColorStop(0, hexA(this.pack.lamp, 0.22)); glow.addColorStop(1, hexA(this.pack.lamp, 0));
    ctx.save(); clipQuad(ctx, this.proj.projectFacade(id, x0, x1, D, 0, H)); ctx.fillStyle = glow;
    ctx.fillRect(lamp.x - rad, lamp.y - 4, rad * 2, rad * 2); ctx.restore();
    ctx.fillStyle = '#2b2433'; ctx.fillRect(Math.round(lamp.x) - 5, Math.round(lamp.y) - 2, 10, 3);
    ctx.fillStyle = this.pack.lamp; ctx.fillRect(Math.round(lamp.x) - 4, Math.round(lamp.y) + 1, 8, 1);
    if (this.pack.features?.sconces && cell.width >= 6) this.drawSconces(ctx, cell, H, D);

    // Floor plane (z 0..D): the only visible walk plane.
    fillQuad(ctx, this.proj.projectFootprint(id, x0, x1, 0, D), fs.base);
    if (floorTex) this.drawFloorTexture(ctx, floorTex, id, x0, x1, D);
    const zl = (z: number, color: string) => { const a = this.proj.project(id, x0, z), b = this.proj.project(id, x1, z); ctx.fillStyle = color; ctx.fillRect(Math.round(a.x), Math.round(a.y), Math.round(b.x - a.x), 1); };
    const xl = (x: number, z0: number, z1: number, color: string) => line(ctx, this.proj.project(id, x, z0), this.proj.project(id, x, z1), color);
    if (!floorTex) switch (fs.pattern) {
      case 'planks': for (let z = 0.5, i = 0; z < D; z += 0.5, i++) { zl(z, fs.line); for (let x = x0 + (i % 3) + 1; x < x1; x += 3) xl(x, z - 0.5, z, fs.line); } break;
      case 'grid': for (let z = 1; z < D; z++) zl(z, fs.line); for (let x = x0 + 1; x < x1; x++) xl(x, 0, D, fs.line); break;
      case 'speckle': { const r = seeded(cell.x + 7); for (let i = 0; i < cell.width * D * 3; i++) { const p = this.proj.project(id, x0 + r() * cell.width, r() * D); ctx.fillStyle = fs.line; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); } break; }
      default: { const inset = this.proj.projectFootprint(id, x0 + 0.4, x1 - 0.4, 0.35, D - 0.35); strokeQuad(ctx, inset, fs.shade); }
    }
    // Contact shadow where the floor meets the back wall.
    fillQuad(ctx, this.proj.projectFootprint(id, x0, x1, D - 0.18, D), hexA('#000000', 0.18));
  }

  /** Warm brass wall sconces with light pools on the wall and on the floor below. */
  private drawSconces(ctx: Ctx, cell: CompiledCell, H: number, D: number) {
    const id = cell.floorId, warm = this.pack.features?.warmth ?? 0.6;
    const xs = [0.2, 0.8];
    const at = (t: number) => this.proj.project(id, cell.x + cell.width * t, D, Math.min(H * 0.55, 2.6));
    ctx.save();
    clipQuad(ctx, this.proj.projectFacade(id, cell.x, cell.x + cell.width, D, 0, H));
    ctx.globalCompositeOperation = 'lighter';
    for (const t of xs) {
      const p = at(t);
      const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 26);
      g.addColorStop(0, hexA(this.pack.lamp, 0.34 * warm)); g.addColorStop(1, hexA(this.pack.lamp, 0));
      ctx.fillStyle = g; ctx.fillRect(p.x - 26, p.y - 26, 52, 52);
    }
    ctx.restore();
    for (const t of xs) {
      const p = at(t);
      const x = Math.round(p.x), y = Math.round(p.y);
      ctx.fillStyle = '#6a4a22'; ctx.fillRect(x - 1, y + 1, 3, 3);
      ctx.fillStyle = '#d9a95b'; ctx.fillRect(x - 2, y - 3, 5, 4);
      ctx.fillStyle = '#fff1c4'; ctx.fillRect(x - 1, y - 2, 3, 2);
      const f = this.proj.project(id, cell.x + cell.width * t, D - 0.8);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, 22);
      g.addColorStop(0, hexA(this.pack.lamp, 0.16 * warm)); g.addColorStop(1, hexA(this.pack.lamp, 0));
      ctx.fillStyle = g; ctx.fillRect(f.x - 22, f.y - 10, 44, 20); ctx.restore();
    }
  }

  /**
   * Map a tileable floor texture onto the shallow floor band one screen row at
   * a time: each screen row takes the next texel row and spans exactly the
   * projected width at that depth, so seams follow the room's perspective.
   */
  private drawFloorTexture(ctx: Ctx, tex: HTMLCanvasElement, id: string, x0: number, x1: number, D: number) {
    const front = this.proj.project(id, x0, 0).y, back = this.proj.project(id, x0, D).y;
    for (let y = Math.round(back); y < Math.round(front); y++) {
      const z = ((front - (y + 0.5)) / (front - back)) * D;
      // Texel rows map 1:1 to screen rows (the floor is already foreshortened by
      // the projection), so 1-texel seams stay continuous instead of aliasing.
      const v = (y - Math.round(back)) % tex.height;
      const a = this.proj.project(id, x0, z), b = this.proj.project(id, x1, z);
      const left = Math.round(a.x), right = Math.round(b.x);
      for (let x = left; x < right; x += tex.width) {
        const w = Math.min(tex.width, right - x);
        ctx.drawImage(tex, 0, v, w, 1, x, y, w, 1);
      }
    }
  }

  private drawShaft(ctx: Ctx, e: CompiledElevator) {
    const sh = this.pack.shaft;
    const x0 = e.def.x, x1 = e.def.x + e.def.width;
    for (const cell of this.compiled.cells.filter(c => (c.kind === 'lobby' || c.kind === 'shaft') && c.x === x0)) {
      const f = this.floor(cell.floorId), H = f.def.wallHeight, id = cell.floorId;
      fillQuad(ctx, this.proj.projectFacade(id, x0, x1, f.depth, 0, H), sh.well);
      for (const rx of [x0 + 0.35, x1 - 0.35]) line(ctx, this.proj.project(id, rx, f.depth, 0), this.proj.project(id, rx, f.depth, H), sh.rail);
      if (cell.kind === 'lobby') {
        fillQuad(ctx, this.proj.projectFootprint(id, x0, x1, 0, e.def.lobbyDepth), '#4b4f62');
        for (let z = 0.5; z < e.def.lobbyDepth; z += 0.5) line(ctx, this.proj.project(id, x0, z), this.proj.project(id, x1, z), '#3d4152');
        // Call-light above the landing.
        const p = this.proj.project(id, (x0 + x1) / 2, e.def.lobbyDepth, LIMITS.doorHeight + 0.5);
        ctx.fillStyle = '#20202c'; ctx.fillRect(Math.round(p.x) - 6, Math.round(p.y) - 3, 12, 5);
      }
      // Lintel band where the cabin opening meets the slab above.
      fillQuad(ctx, this.proj.projectFacade(id, x0, x1, f.depth, H - 0.3, H), '#221f31');
    }
  }

  private drawDecor(ctx: Ctx, roomId: string, assetId: string, attachment: 'back-wall' | 'floor', col: number, y: number) {
    const cell = this.compiled.cells.find(c => c.id === roomId);
    const entry = getCatalogEntry(assetId);
    if (!cell || !entry) return;
    const sprite = getCachedSprite(entry.sprite, 1);
    if (attachment === 'back-wall') {
      const p = this.proj.project(cell.floorId, cell.x + col, cell.depth, y);
      ctx.drawImage(sprite, Math.round(p.x), Math.round(p.y - sprite.height));
    } else {
      // Floor decor is authored foreshortened: 16 px wide per tile, 16*rise px per row of depth.
      const rows = sprite.height / (16 * this.proj.params.rise);
      const z = cell.depth - y - rows;
      const p = this.proj.project(cell.floorId, cell.x + col, z);
      ctx.drawImage(sprite, Math.round(p.x), Math.round(p.y - sprite.height));
    }
  }

  // ── layer 5: physical, depth-sorted ──────────────────────────

  /**
   * Partition and exterior wall columns as solid boxes split by doorways.
   * Each segment sorts by its FRONT depth, so an agent inside a doorway is
   * drawn after the wall behind it and before the wall in front of it.
   */
  private buildWallSegments() {
    const out: Array<Omit<Item, 'draw'> & { draw: (ctx: Ctx) => void }> = [];
    const st = this.pack.structure;
    const doorH = LIMITS.doorHeight;
    this.compiled.floors.forEach((f, fi) => {
      const H = f.def.wallHeight, id = f.def.id;
      for (const [col, depth] of this.compiled.walls.get(id)!) {
        const doors = this.compiled.doors.filter(d => d.floorId === id && d.col === col);
        const cuts = doors.map(d => ({ z0: d.def.z, z1: d.def.z + d.def.width, open: d.def.open }));
        cuts.sort((a, b) => a.z0 - b.z0);
        const segs: Array<{ z0: number; z1: number; h0: number; h1: number; kind: 'wall' | 'lintel' | 'closed' }> = [];
        let z = 0;
        for (const c of cuts) {
          if (c.z0 > z) segs.push({ z0: z, z1: c.z0, h0: 0, h1: H, kind: 'wall' });
          segs.push(c.open ? { z0: c.z0, z1: c.z1, h0: doorH, h1: H, kind: 'lintel' } : { z0: c.z0, z1: c.z1, h0: 0, h1: H, kind: 'closed' });
          z = c.z1;
        }
        if (z < depth) segs.push({ z0: z, z1: depth, h0: 0, h1: H, kind: 'wall' });
        // The visible side face looks into the neighbouring cell; never draw past its back wall.
        const rightSide = col + 1 <= this.proj.cx;
        const faceX = rightSide ? col + 1 : col;
        const neighbour = this.compiled.cells.find(c => c.floorId === id && (rightSide ? c.x === col + 1 : c.x + c.width === col));
        const visibleDepth = neighbour ? neighbour.depth : 0;
        for (const s of segs) {
          // Side face in one-tile depth slices so each slice sorts at its own depth.
          for (let z0 = s.z0; z0 < Math.min(s.z1, visibleDepth); z0++) {
            const z1 = Math.min(z0 + 1, s.z1, visibleDepth);
            out.push({
              floor: fi, key: z0, order: 0,
              draw: ctx => fillQuad(ctx, this.proj.projectSide(id, faceX, z0, z1, s.h0, s.h1), s.kind === 'closed' ? '#5d4634' : st.facadeLine),
            });
          }
          out.push({
            floor: fi, key: s.z0, order: 0,
            draw: ctx => {
              // Lit cap on the cut wall top, so partitions read as solid thick walls.
              const cap = [this.proj.project(id, col, s.z0, s.h1), this.proj.project(id, col + 1, s.z0, s.h1),
                this.proj.project(id, col + 1, s.z1, s.h1), this.proj.project(id, col, s.z1, s.h1)];
              fillQuad(ctx, cap, s.kind === 'closed' ? '#8a6a48' : st.cut);
              line(ctx, cap[0], cap[1], st.cutLight);
              const front = this.proj.projectFacade(id, col, col + 1, s.z0, s.h0, s.h1);
              fillQuad(ctx, front, s.kind === 'closed' ? '#7a5a3e' : st.cut);
              const a = front[3], b = front[1];
              ctx.fillStyle = s.kind === 'closed' ? '#a07a52' : st.cutLight;
              ctx.fillRect(Math.round(a.x), Math.round(a.y), 1, Math.round(b.y - a.y));
              if (s.kind === 'lintel') ctx.fillRect(Math.round(a.x), Math.round(b.y) - 1, Math.round(b.x - a.x), 1);
              if (s.kind === 'closed') { const k = this.proj.project(id, col + 0.7, s.z0, 1.2); ctx.fillStyle = '#e8c27a'; ctx.fillRect(Math.round(k.x), Math.round(k.y), 1, 2); }
            },
          });
        }
      }
    });
    return out;
  }

  private furnitureItem(ctx: Ctx, uid: string, type: string, col: number, row: number, floorIndex: Map<string, number>): Item | null {
    const entry = getCatalogEntry(type);
    const floor = this.compiled.floorOfRow(row);
    if (!entry || !floor) return null;
    const zFront = this.compiled.zOfRow(row + entry.footprintH);
    const zBack = this.compiled.zOfRow(row);
    // Seated agents sit IN chairs: front/side chairs sort behind their sitter,
    // back-facing chairs (backrest toward the viewer) sort in front of them.
    let key = zFront;
    if (entry.category === 'chairs' && entry.orientation !== 'back') key = zBack - 0.01;
    const sprite = getCachedSprite(entry.sprite, 1);
    const mirrored = !!entry.mirrorSide && entry.orientation === 'left';
    return {
      floor: floorIndex.get(floor.def.id)!, key, order: 1,
      draw: () => {
        const p = this.proj.project(floor.def.id, col, zFront);
        const x = Math.round(p.x), y = Math.round(p.y - sprite.height);
        if (mirrored) { ctx.save(); ctx.translate(x + sprite.width, y); ctx.scale(-1, 1); ctx.drawImage(sprite, 0, 0); ctx.restore(); }
        else ctx.drawImage(sprite, x, y);
        this.hits.push({ kind: 'furniture', id: uid, x, y, w: sprite.width, h: sprite.height });
      },
    };
  }

  private boardingPose(ch: Character, slot: { elevatorId: string; slot: number; boarding: number }) {
    const e = this.compiled.elevators.find(x => x.def.id === slot.elevatorId)!;
    const w = characterWorld(this.compiled, ch.x, ch.y)!;
    const f = this.floor(w.floorId);
    const cabinZ = e.def.lobbyDepth + (f.depth - e.def.lobbyDepth) / 2;
    const k = slot.boarding;
    const sx = this.slotX(e, slot.slot);
    return { floorId: w.floorId, x: w.x + (sx - w.x) * k, z: w.z + (cabinZ - w.z) * k };
  }

  private slotX(e: CompiledElevator, slot: number) {
    const n = e.def.capacity, cx = e.def.x + e.def.width / 2;
    const spread = Math.min(0.9, (e.def.width - 0.6) / Math.max(1, n));
    return cx + (slot - (n - 1) / 2) * spread;
  }

  private agentItem(ctx: Ctx, ch: Character, opts: RenderOptions, floorIndex: Map<string, number>,
    pose: { floorId: string; x: number; z: number } | null): Item | null {
    const w = pose ?? characterWorld(this.compiled, ch.x, ch.y);
    if (!w) return null;
    return {
      floor: floorIndex.get(w.floorId)!, key: w.z, order: 2,
      draw: () => this.drawAgent(ctx, ch, this.proj.project(w.floorId, w.x, w.z), opts.selectedId === ch.id),
    };
  }

  private drawAgent(ctx: Ctx, ch: Character, feet: ProjectedPoint, selected: boolean) {
    const data = getCharacterSprite(ch, getCharacterSprites(ch.palette, ch.hueShift));
    const sprite = getCachedSprite(data, 1);
    const sit = ch.state === CharacterState.TYPE ? SIT_PX : 0;
    const x = Math.round(feet.x - sprite.width / 2), y = Math.round(feet.y + sit - sprite.height);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(Math.round(feet.x) - 5, Math.round(feet.y) - 1, 10, 2);
    if (selected) {
      const outline = getCachedSprite(getOutlineSprite(data), 1);
      ctx.globalAlpha = 0.9; ctx.drawImage(outline, x - 1, y - 1); ctx.globalAlpha = 1;
    }
    ctx.drawImage(sprite, x, y);
    this.hits.push({ kind: 'agent', id: String(ch.id), x, y, w: sprite.width, h: sprite.height });
  }

  pick(px: number, py: number, kind?: Hit['kind']): Hit | null {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if ((!kind || h.kind === kind) && px >= h.x && px < h.x + h.w && py >= h.y && py < h.y + h.h) return h;
    }
    return null;
  }

  /** Cabin box riding in its well, clipped so slabs and lobby floors occlude it. */
  private drawCabin(ctx: Ctx, e: CompiledElevator, office: OfficeState, travel: TravelSystem, opts: RenderOptions) {
    const pose = travel.cabinPose(e.def.id);
    const b0 = this.proj.base.get(pose.from)!, b1 = this.proj.base.get(pose.to)!;
    const base = b0 + (b1 - b0) * pose.t;
    const minDepth = Math.min(...e.stops.map(s => this.floor(s.floorId).depth));
    const z0 = e.def.lobbyDepth + 0.25, z1 = minDepth - 0.15, zc = (z0 + z1) / 2;
    const x0 = e.def.x + 0.12, x1 = e.def.x + e.def.width - 0.12, hTop = LIMITS.doorHeight + 0.2;
    const P = (x: number, z: number, h: number) => this.proj.projectAt(base, x, z, h);
    const sh = this.pack.shaft;
    ctx.save();
    ctx.beginPath();
    for (const cell of this.compiled.cells.filter(c => (c.kind === 'lobby' || c.kind === 'shaft') && c.x === e.def.x)) {
      const f = this.floor(cell.floorId);
      const zFrom = cell.kind === 'lobby' ? e.def.lobbyDepth : 0;
      const lo = this.proj.project(cell.floorId, e.def.x - 0.2, zFrom), hi = this.proj.project(cell.floorId, e.def.x + e.def.width + 0.2, f.depth, f.def.wallHeight);
      ctx.rect(Math.floor(lo.x), Math.floor(hi.y), Math.ceil(hi.x - lo.x), Math.ceil(lo.y - hi.y));
    }
    ctx.clip();
    fillQuad(ctx, [P(x0, z1, 0), P(x1, z1, 0), P(x1, z1, hTop), P(x0, z1, hTop)], sh.cabin);
    fillQuad(ctx, [P(x0, z0, 0), P(x1, z0, 0), P(x1, z1, 0), P(x0, z1, 0)], '#5a5246');
    fillQuad(ctx, [P(x0, z1, hTop - 0.25), P(x1, z1, hTop - 0.25), P(x1, z1, hTop), P(x0, z1, hTop)], sh.cabinLight);
    for (const id of travel.getCabins().find(c => c.elevatorId === e.def.id)!.passengers) {
      const ch = office.characters.get(id), slot = travel.riderSlot(id);
      if (!ch || !slot || slot.boarding < 1) continue;
      this.drawAgent(ctx, ch, P(this.slotX(e, slot.slot), zc, 0), opts.selectedId === id);
    }
    // Frame posts and roof of the open-front cabin.
    fillQuad(ctx, [P(x0, z0, 0), P(x0 + 0.12, z0, 0), P(x0 + 0.12, z0, hTop), P(x0, z0, hTop)], '#3b352c');
    fillQuad(ctx, [P(x1 - 0.12, z0, 0), P(x1, z0, 0), P(x1, z0, hTop), P(x1 - 0.12, z0, hTop)], '#3b352c');
    fillQuad(ctx, [P(x0, z0, hTop - 0.12), P(x1, z0, hTop - 0.12), P(x1, z0, hTop + 0.1), P(x0, z0, hTop + 0.1)], '#3b352c');
    ctx.restore();
    // Landing doors: glass panels that slide open while the cabin loads.
    for (const stop of e.stops) {
      const here = pose.from === stop.floorId && pose.to === stop.floorId ? pose.doorsOpen : 0;
      const id = stop.floorId, zD = e.def.lobbyDepth, half = e.def.width / 2;
      const gap = half * here;
      for (const [a, b] of [[e.def.x, e.def.x + half - gap], [e.def.x + half + gap, e.def.x + e.def.width]] as const) {
        if (b - a < 0.02) continue;
        fillQuad(ctx, this.proj.projectFacade(id, a, b, zD, 0, LIMITS.doorHeight), hexA(sh.door, 0.28));
        strokeQuad(ctx, this.proj.projectFacade(id, a, b, zD, 0, LIMITS.doorHeight), sh.doorLine);
      }
      const lamp = this.proj.project(id, e.def.x + half, zD, LIMITS.doorHeight + 0.5);
      const waiting = travel.getTrips().some(t => t.elevatorId === e.def.id && t.fromFloor === id && t.phase === 'waiting');
      ctx.fillStyle = here > 0 ? '#7dffa8' : waiting ? '#ffcc66' : '#4a4658';
      ctx.fillRect(Math.round(lamp.x) - 4, Math.round(lamp.y) - 1, 8, 2);
    }
  }

  // ── layer 6: foreground cut ──────────────────────────────────

  private drawForeground(ctx: Ctx) {
    const st = this.pack.structure;
    for (const f of this.compiled.floors) {
      const [x0, x1] = this.extent(f.def.id);
      const a = this.proj.project(f.def.id, x0, 0), b = this.proj.project(f.def.id, x1, 0);
      const slabPx = this.proj.params.slab * 16;
      const y = Math.round(a.y);
      const slabTex = this.texture(this.compiled.world.structure?.slabTextureId, 'trim-texture');
      if (slabTex) {
        const pat = ctx.createPattern(slabTex, 'repeat')!;
        pat.setTransform(new DOMMatrix([1, 0, 0, 1, Math.round(a.x), y]));
        ctx.fillStyle = pat;
      } else ctx.fillStyle = st.slab;
      ctx.fillRect(Math.round(a.x), y, Math.round(b.x - a.x), slabPx);
      const trim = this.pack.features?.trim;
      ctx.fillStyle = trim ?? st.slabTop; ctx.fillRect(Math.round(a.x), y, Math.round(b.x - a.x), 1);
      if (trim) { ctx.fillStyle = trim; ctx.globalAlpha = 0.55; ctx.fillRect(Math.round(a.x), y + slabPx - 3, Math.round(b.x - a.x), 1); ctx.globalAlpha = 1; }
      ctx.fillStyle = st.slabShadow; ctx.fillRect(Math.round(a.x), y + slabPx - 2, Math.round(b.x - a.x), 2);
      for (let x = x0 + 2; x < x1; x += 4) {
        const p = this.proj.project(f.def.id, x, 0);
        ctx.fillStyle = st.slabShadow; ctx.fillRect(Math.round(p.x), y + 5, 1, slabPx - 9);
      }
      if (this.pack.features?.railings) this.drawRailing(ctx, f.def.id, x0, x1);
      if (this.pack.features?.banners) this.drawBanners(ctx, f.def.id, f.def.wallHeight, x0, x1);
    }
  }

  /** Low balcony railing along the cut floor edge, lamp posts at wall columns. */
  private drawRailing(ctx: Ctx, floorId: string, x0: number, x1: number) {
    const st = this.pack.structure, trim = this.pack.features?.trim ?? st.cutLight;
    const left = this.proj.project(floorId, x0, 0, 0.55), right = this.proj.project(floorId, x1, 0, 0.55);
    const base = this.proj.project(floorId, x0, 0, 0);
    const yTop = Math.round(left.y), yBase = Math.round(base.y);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = st.cut;
    for (let x = Math.round(left.x) + 2; x < right.x; x += 4) ctx.fillRect(x, yTop + 1, 1, yBase - yTop - 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = trim; ctx.fillRect(Math.round(left.x), yTop, Math.round(right.x - left.x), 1);
    ctx.fillStyle = st.slabShadow; ctx.fillRect(Math.round(left.x), yTop + 1, Math.round(right.x - left.x), 1);
    for (const col of this.compiled.walls.get(floorId)?.keys() ?? []) {
      const p = this.proj.project(floorId, col + 0.5, 0, 0), top = this.proj.project(floorId, col + 0.5, 0, 1.25);
      const x = Math.round(p.x);
      ctx.fillStyle = '#1c1630'; ctx.fillRect(x - 1, Math.round(top.y), 2, Math.round(p.y - top.y));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, top.y - 2, 1, x, top.y - 2, 16);
      g.addColorStop(0, hexA(this.pack.lamp, 0.45)); g.addColorStop(1, hexA(this.pack.lamp, 0));
      ctx.fillStyle = g; ctx.fillRect(x - 16, top.y - 18, 32, 32); ctx.restore();
      ctx.fillStyle = trim; ctx.fillRect(x - 2, Math.round(top.y) - 5, 4, 1);
      ctx.fillStyle = this.pack.lamp; ctx.fillRect(x - 1, Math.round(top.y) - 4, 3, 3);
      ctx.fillStyle = '#fff6dc'; ctx.fillRect(x, Math.round(top.y) - 3, 1, 1);
    }
  }

  /** Pennants hanging on the outer wall faces of each storey. */
  private drawBanners(ctx: Ctx, floorId: string, H: number, x0: number, x1: number) {
    const b = this.pack.features!.banners!;
    for (const col of [x0, x1 - 1]) {
      const top = this.proj.project(floorId, col + 0.5, 0, H - 0.4);
      const x = Math.round(top.x) - 5, y = Math.round(top.y);
      ctx.fillStyle = b.trim; ctx.fillRect(x - 1, y - 1, 12, 2);
      ctx.fillStyle = b.cloth; ctx.fillRect(x, y + 1, 10, 22);
      for (let i = 0; i < 5; i++) { ctx.fillRect(x + i, y + 23 + Math.floor(i / 2), 1, 1); ctx.fillRect(x + 9 - i, y + 23 + Math.floor(i / 2), 1, 1); }
      ctx.fillStyle = b.trim; ctx.fillRect(x, y + 1, 1, 22); ctx.fillRect(x + 9, y + 1, 1, 22);
      ctx.fillStyle = b.emblem;
      for (const [dx, dy] of [[4, 8], [5, 8], [6, 9], [6, 10], [5, 11], [4, 11], [3, 10], [3, 9], [2, 8], [3, 7], [5, 6], [7, 7], [8, 9]]) ctx.fillRect(x + dx, y + dy + 2, 1, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4, y + 11, 2, 1);
    }
  }

  // ── debug: walk mesh, colliders, portals ─────────────────────

  private drawDebug(ctx: Ctx, office: OfficeState, opts: RenderOptions) {
    const c = this.compiled;
    const tileQuad = (col: number, row: number) => {
      const f = c.floorOfRow(row)!;
      const zf = c.zOfRow(row + 1), zb = c.zOfRow(row);
      return this.proj.projectFootprint(f.def.id, col + 0.08, col + 0.92, zf + 0.06, zb - 0.06);
    };
    const blocked = blockedFurnitureTiles(c);
    for (const t of office.walkableTiles) strokeQuad(ctx, tileQuad(t.col, t.row), 'rgba(90,255,140,0.55)');
    for (const k of blocked) { const [col, row] = k.split(',').map(Number); fillQuad(ctx, tileQuad(col, row), 'rgba(255,70,70,0.45)'); }
    for (const d of c.doors) for (const row of d.rows) fillQuad(ctx, tileQuad(d.col, row), d.def.open ? 'rgba(255,220,60,0.6)' : 'rgba(255,120,0,0.75)');
    for (const s of seatTiles(c)) strokeQuad(ctx, tileQuad(s.col, s.row), 'rgba(90,170,255,0.95)');
    for (const e of c.elevators) for (const s of e.stops) for (const p of s.landing) strokeQuad(ctx, tileQuad(p.col, p.row), 'rgba(80,240,255,0.9)');
    if (opts.hoverTile && c.floorOfRow(opts.hoverTile.row)) strokeQuad(ctx, tileQuad(opts.hoverTile.col, opts.hoverTile.row), '#ffffff');
    for (const ch of office.characters.values()) {
      if (ch.path.length < 1) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (const p of ch.path) {
        const f = c.floorOfRow(p.row);
        if (!f) continue;
        const q = this.proj.project(f.def.id, p.col + 0.5, c.zOfRow(p.row + 0.5));
        ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, 2, 2);
      }
    }
  }
}

// ── canvas utilities ─────────────────────────────────────────

function fillQuad(ctx: Ctx, q: ProjectedPoint[], color: string | CanvasPattern) {
  ctx.beginPath();
  ctx.moveTo(Math.round(q[0].x), Math.round(q[0].y));
  for (let i = 1; i < q.length; i++) ctx.lineTo(Math.round(q[i].x), Math.round(q[i].y));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
function strokeQuad(ctx: Ctx, q: ProjectedPoint[], color: string) {
  ctx.beginPath();
  ctx.moveTo(Math.round(q[0].x) + 0.5, Math.round(q[0].y) + 0.5);
  for (let i = 1; i < q.length; i++) ctx.lineTo(Math.round(q[i].x) + 0.5, Math.round(q[i].y) + 0.5);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
}
function clipQuad(ctx: Ctx, q: ProjectedPoint[]) {
  ctx.beginPath();
  ctx.moveTo(q[0].x, q[0].y);
  for (let i = 1; i < q.length; i++) ctx.lineTo(q[i].x, q[i].y);
  ctx.closePath();
  ctx.clip();
}
function line(ctx: Ctx, a: ProjectedPoint, b: ProjectedPoint, color: string) {
  ctx.beginPath();
  ctx.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5);
  ctx.lineTo(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
}
function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function seeded(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
