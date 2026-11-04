import type { Backdrop, RoomLabel } from './worldRenderer.js';
import type { StylePack } from './stylePack.js';

/** Name tag above an agent, in buffer pixels (head top-centre). */
/** color: a status dot (live presence); sub: a second line shown when selected (e.g. the current ticket). */
export interface AgentTag { text: string; x: number; y: number; selected: boolean; color?: string; sub?: string }

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

  draw(ctx: CanvasRenderingContext2D, buffer: HTMLCanvasElement, labels: RoomLabel[], pack: StylePack, dpr: number,
    backdrop?: Backdrop, tags: AgentTag[] = []) {
    ctx.imageSmoothingEnabled = false;
    const W = ctx.canvas.width, H = ctx.canvas.height, z = this.zoom;
    if (backdrop) this.drawBackdrop(ctx, backdrop, W, H);
    else { ctx.fillStyle = '#05040b'; ctx.fillRect(0, 0, W, H); }
    ctx.drawImage(buffer, Math.round(this.panX), Math.round(this.panY), Math.round(buffer.width * z), Math.round(buffer.height * z));
    if (z * 16 >= 9 * dpr) this.drawLabels(ctx, labels, pack, dpr);
    this.drawTags(ctx, tags, dpr);
  }

  /** Sky strip tiled across the full width with parallax, stars above, ground below. */
  private drawBackdrop(ctx: CanvasRenderingContext2D, b: Backdrop, W: number, H: number) {
    const z = this.zoom;
    const gy = Math.round(this.panY + b.groundY * z);
    const th = Math.round(b.tile.height * z), tw = Math.max(1, Math.round(b.tile.width * z));
    ctx.fillStyle = b.top; ctx.fillRect(0, 0, W, H);
    const parallax = this.panX * 0.55;
    const skyTop = gy - th;
    if (skyTop > 0) {
      const pat = ctx.createPattern(b.stars, 'repeat')!;
      pat.setTransform(new DOMMatrix([z, 0, 0, z, Math.round(parallax), 0]));
      ctx.fillStyle = pat; ctx.fillRect(0, 0, W, skyTop);
    }
    for (let x = (((Math.round(parallax) % tw) + tw) % tw) - tw; x < W; x += tw) ctx.drawImage(b.tile, x, skyTop, tw, th);
    ctx.fillStyle = b.ground; ctx.fillRect(0, gy, W, Math.max(0, H - gy));
    ctx.fillStyle = b.groundLine; ctx.fillRect(0, gy, W, Math.max(1, Math.round(z)));
  }

  private drawTags(ctx: CanvasRenderingContext2D, tags: AgentTag[], dpr: number) {
    const showAll = this.zoom * 16 >= 14 * dpr;
    const size = Math.round(10 * dpr);
    ctx.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of tags) {
      if (!showAll && !t.selected) continue;
      const p = this.toScreen(t.x, t.y);
      const dot = t.color ? Math.round(size * 0.9) : 0;
      const sub = t.selected && t.sub ? t.sub : '';
      const w = Math.round(Math.max(ctx.measureText(t.text).width + dot, sub ? ctx.measureText(sub).width : 0) + size * 0.9);
      const h = Math.round(size * (sub ? 2.7 : 1.5));
      const x = Math.round(p.x - w / 2), y = Math.round(p.y - h - 2 * dpr);
      ctx.fillStyle = t.selected ? 'rgba(48,32,10,0.92)' : 'rgba(12,10,24,0.78)';
      ctx.fillRect(x, y, w, h);
      if (t.selected) { ctx.strokeStyle = '#e3b46a'; ctx.lineWidth = dpr; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
      ctx.fillStyle = t.selected ? '#ffe3a8' : '#eae4f7';
      const ty = y + Math.round(size * 0.75) + dpr * 0.5;
      ctx.fillText(t.text, Math.round(p.x + dot / 2), ty);
      if (t.color) {
        const tw = ctx.measureText(t.text).width, r = Math.max(2, Math.round(size * 0.3));
        ctx.fillStyle = t.color; ctx.fillRect(Math.round(p.x + dot / 2 - tw / 2 - dot + (dot - 2 * r) / 2), Math.round(ty - r), 2 * r, 2 * r);
      }
      if (sub) { ctx.fillStyle = '#b9c4ff'; ctx.fillText(sub, Math.round(p.x), ty + Math.round(size * 1.2)); }
    }
  }

  /** Two-line name plates (title + subtitle) with a gold frame and emblem. */
  private drawBannerLabels(ctx: CanvasRenderingContext2D, labels: RoomLabel[], pack: StylePack, dpr: number, size: number) {
    const sub = Math.round(size * 0.72);
    for (const l of labels) {
      const p = this.toScreen(l.x, l.y);
      const title = l.text.toUpperCase();
      ctx.font = `700 ${size}px ui-sans-serif, system-ui, sans-serif`;
      const tw = ctx.measureText(title).width;
      ctx.font = `500 ${sub}px ui-sans-serif, system-ui, sans-serif`;
      const sw = l.subtitle ? ctx.measureText(l.subtitle).width : 0;
      const icon = size * 1.2;
      const w = Math.round(Math.max(tw, sw) + icon + size * 1.4);
      const h = Math.round(l.subtitle ? size * 2.5 : size * 1.7);
      const x = Math.round(p.x - w / 2), y = Math.round(p.y);
      ctx.fillStyle = pack.label.plate; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = pack.label.border; ctx.lineWidth = Math.max(1, Math.round(dpr * 1.5));
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.globalAlpha = 0.45; ctx.strokeRect(x + 3 * dpr + 0.5, y + 3 * dpr + 0.5, w - 6 * dpr - 1, h - 6 * dpr - 1); ctx.globalAlpha = 1;
      // Diamond emblem.
      const cx = x + size * 0.6 + icon / 2, cy = y + h / 2, r = icon * 0.38;
      ctx.fillStyle = pack.label.border;
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.7, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.7, cy); ctx.closePath(); ctx.fill();
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      const tx = Math.round(x + size * 0.8 + icon);
      ctx.fillStyle = pack.label.text; ctx.font = `700 ${size}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(title, tx, Math.round(y + (l.subtitle ? size * 1.25 : size * 1.25)));
      if (l.subtitle) {
        ctx.fillStyle = pack.label.subtitle ?? pack.label.text; ctx.font = `500 ${sub}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillText(l.subtitle, tx, Math.round(y + size * 2.15));
      }
    }
  }

  private drawLabels(ctx: CanvasRenderingContext2D, labels: RoomLabel[], pack: StylePack, dpr: number) {
    const size = Math.round(Math.max(9, Math.min(13, this.zoom * 4.5)) * dpr);
    ctx.font = `600 ${size}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (pack.label.style === 'banner') { this.drawBannerLabels(ctx, labels, pack, dpr, size); return; }
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
