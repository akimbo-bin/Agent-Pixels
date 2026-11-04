// Exports furniture sprite guides straight from the engine: each type's
// camera-aware sprite at the world's camera, upscaled by the pixel-art grid
// and centred on magenta. Writes <id>.guide.png, <id>.mask.png (the exact
// engine silhouette) and <id>.guide.json (native size + canvas offset).
//
// usage: node scripts/kit/sprite-guides.mjs <building> <work_dir> <grid> <canvasW>x<canvasH> <type> [type...]
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const [building, work, grid, canvas, ...types] = process.argv.slice(2);
const [cw, ch] = canvas.split('x').map(Number);
const g = Number(grid);
const base = process.env.ENGINE_URL || 'http://127.0.0.1:8790';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage();
await page.goto(`${base}/?building=${building}&kit=0&ambient=0`);
await page.waitForFunction(() => window.__engine?.ready === true, null, { timeout: 30000 });
for (const type of types) {
  const out = await page.evaluate(([t, k, W, H]) => new Promise(res => {
    const src = window.__engine.spritePng(t);
    if (!src) return res(null);
    const img = new Image();
    img.onload = () => {
      const w = img.width * k, h = img.height * k, ox = Math.round((W - w) / 2), oy = Math.round((H - h) / 2);
      const mk = (fill, silhouette) => {
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
        x.fillStyle = fill; x.fillRect(0, 0, W, H);
        if (silhouette) {
          const m = document.createElement('canvas'); m.width = w; m.height = h;
          const mx = m.getContext('2d'); mx.imageSmoothingEnabled = false;
          mx.drawImage(img, 0, 0, w, h); mx.globalCompositeOperation = 'source-in'; mx.fillStyle = '#fff'; mx.fillRect(0, 0, w, h);
          x.drawImage(m, ox, oy);
        } else x.drawImage(img, ox, oy, w, h);
        return c.toDataURL('image/png');
      };
      res({ guide: mk('#ff00ff', false), mask: mk('#000', true), native: [img.width, img.height], offset: [ox, oy] });
    };
    img.src = src;
  }), [type, g, cw, ch]);
  if (!out) { console.log('no sprite for', type); continue; }
  const id = `sprite-${type}`;
  await writeFile(path.join(work, `${id}.guide.png`), Buffer.from(out.guide.split(',')[1], 'base64'));
  await writeFile(path.join(work, `${id}.mask.png`), Buffer.from(out.mask.split(',')[1], 'base64'));
  await writeFile(path.join(work, `${id}.guide.json`), JSON.stringify({ building, type, grid: g, native: out.native, offset: out.offset, canvas: [cw, ch] }, null, 2));
  console.log('sprite guide', id, `native ${out.native.join('x')}`);
}
await browser.close();
