import type { SpriteData } from '../types.js';

const zoomCaches = new Map<number, WeakMap<SpriteData, HTMLCanvasElement>>();
const nativeCache = new WeakMap<SpriteData, HTMLCanvasElement>();
const MAX_ZOOM_CACHES = 8;

// ── Outline sprite generation ─────────────────────────────────

const outlineCache = new WeakMap<SpriteData, SpriteData>();

/** Generate a 1px white outline SpriteData (2px larger in each dimension) */
export function getOutlineSprite(sprite: SpriteData): SpriteData {
  const cached = outlineCache.get(sprite);
  if (cached) return cached;

  const rows = sprite.length;
  const cols = sprite[0].length;
  // Expanded grid: +2 in each dimension for 1px border
  const outline: string[][] = [];
  for (let r = 0; r < rows + 2; r++) {
    outline.push(new Array<string>(cols + 2).fill(''));
  }

  // For each opaque pixel, mark its 4 cardinal neighbors as white
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (sprite[r][c] === '') continue;
      const er = r + 1;
      const ec = c + 1;
      if (outline[er - 1][ec] === '') outline[er - 1][ec] = '#FFFFFF';
      if (outline[er + 1][ec] === '') outline[er + 1][ec] = '#FFFFFF';
      if (outline[er][ec - 1] === '') outline[er][ec - 1] = '#FFFFFF';
      if (outline[er][ec + 1] === '') outline[er][ec + 1] = '#FFFFFF';
    }
  }

  // Clear pixels that overlap with original opaque pixels
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (sprite[r][c] !== '') {
        outline[r + 1][c + 1] = '';
      }
    }
  }

  outlineCache.set(sprite, outline);
  return outline;
}

export function getCachedSprite(sprite: SpriteData, zoom: number): HTMLCanvasElement {
  let cache=zoomCaches.get(zoom);
  if(!cache){cache=new WeakMap();zoomCaches.set(zoom,cache);}
  else {zoomCaches.delete(zoom);zoomCaches.set(zoom,cache);}
  if(zoomCaches.size>MAX_ZOOM_CACHES)zoomCaches.delete(zoomCaches.keys().next().value!);
  const cached=cache.get(sprite);if(cached)return cached;
  const rows=sprite.length,cols=sprite[0].length;
  let native=nativeCache.get(sprite);
  if(!native){
    native=document.createElement('canvas');native.width=cols;native.height=rows;
    const ctx=native.getContext('2d')!;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      if(!sprite[r][c])continue;ctx.fillStyle=sprite[r][c];ctx.fillRect(c,r,1,1);
    }
    nativeCache.set(sprite,native);
  }
  if(zoom===1){cache.set(sprite,native);return native;}
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(cols*zoom));canvas.height=Math.max(1,Math.round(rows*zoom));
  const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
  // Rasterize once at native pixels. Fractional fillRect per source pixel creates
  // antialiased gaps and compounds alpha, even with imageSmoothingEnabled=false.
  ctx.drawImage(native,0,0,canvas.width,canvas.height);cache.set(sprite,canvas);return canvas;
}
