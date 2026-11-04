import type { RoomLabel } from './worldRenderer.js';
import type { StylePack } from './stylePack.js';

/**
 * Screen camera over the native render buffer: zoom/pan, fit, and the inverse
 * mapping used for hit testing. Pixel art is scaled nearest-neighbour.
 */
export class Viewport {
  zoom = 1;
  /** Device-pixel position of buffer origin. */
  panX = 0;
  panY = 0;

  fit(bufW: number, bufH: number, cw: number, ch: number) {
    let z = Math.min(cw / bufW, ch / bufH) * 0.98;
    // Portrait phones: favour readable storeys over showing the full width (drag to pan).
    if (cw / ch < 0.8) z = Math.max(z, Math.min((ch / bufH) * 0.95, (cw / bufW) * 2.4));
    // Integer zoom keeps pixels square when there is room for it.
    this.zoom = z >= 2 ? Math.floor(z) : z;
    this.panX = Math.round((cw - bufW * this.zoom) / 2);
    this.panY = Math.round((ch - bufH * this.zoom) / 2);
  }

  focus(bx: number, by: number, bw: number, bh: number, cw: number, ch: number) {
    this.zoom = Math.max(1, Math.min(cw / bw, ch / bh) * 0.9);
    this.panX = Math.round(cw / 2 - (bx + bw / 2) * this.zoom);
    this.panY = Math.round(ch / 2 - (by + bh / 2) * this.zoom);
  }

  zoomAt(factor: number, sx: number, sy: number) {
    const next = Math.max(0.25, Math.min(12, this.zoom * factor));
    const bx = (sx - this.panX) / this.zoom, by = (sy - this.panY) / this.zoom;
    this.zoom = next;
    this.panX = sx - bx * next;
    this.panY = sy - by * next;
  }

  toBuffer(sx: number, sy: number) {
    return { x: (sx - this.panX) / this.zoom, y: (sy - this.panY) / this.zoom };
  }
  toScreen(bx: number, by: number) {
    return { x: bx * this.zoom + this.panX, y: by * this.zoom + this.panY };
  }

  draw(ctx: CanvasRenderingContext2D, buffer: HTMLCanvasElement, labels: RoomLabel[], pack: StylePack, dpr: number) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#05040b';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(buffer, Math.round(this.panX), Math.round(this.panY), Math.round(buffer.width * this.zoom), Math.round(buffer.height * this.zoom));
    const size = Math.round(Math.max(9, Math.min(13, this.zoom * 4.5)) * dpr);
    if (this.zoom * 16 < 9 * dpr) return; // too small to read; keep the building clean
    ctx.font = `600 ${size}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const l of labels) {
      const p = this.toScreen(l.x, l.y);
      const text = l.text.toUpperCase();
      const w = ctx.measureText(text).width + size;
      const h = size * 1.6;
      ctx.fillStyle = pack.label.plate;
      ctx.fillRect(Math.round(p.x - w / 2), Math.round(p.y), Math.round(w), Math.round(h));
      ctx.strokeStyle = pack.label.border;
      ctx.lineWidth = Math.max(1, dpr);
      ctx.strokeRect(Math.round(p.x - w / 2) + 0.5, Math.round(p.y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
      ctx.fillStyle = pack.label.text;
      ctx.fillText(text, Math.round(p.x), Math.round(p.y + h / 2));
    }
  }
}
