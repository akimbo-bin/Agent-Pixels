// Exports a room's img2img guide straight from the running Office Builder:
// the room exactly as the engine lays it out (agents hidden), upscaled by an
// integer factor with nearest-neighbour so each engine pixel becomes one
// pixel-art cell of the painting. Also writes <out>.json with the plate rect
// and camera so the painted plate can be checked against the same geometry.
//
// usage: node scripts/kit/room-guide.mjs <building> <roomId> <out.png> [scale=8]
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const [building, roomId, out, scale = '8'] = process.argv.slice(2);
const base = process.env.ENGINE_URL || 'http://127.0.0.1:8790';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage();
await page.goto(`${base}/?building=${building}&kit=1&ambient=0`);
await page.waitForFunction(() => window.__engine?.ready === true, null, { timeout: 30000 });
const g = await page.evaluate(([room, k]) => new Promise(res => {
  const info = window.__engine.roomGuide(room);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width * k; c.height = img.height * k;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    res({ ...info, png: c.toDataURL('image/png'), scale: k, size: [c.width, c.height] });
  };
  img.src = info.png;
}), [roomId, Number(scale)]);
await browser.close();
await writeFile(out, Buffer.from(g.png.split(',')[1], 'base64'));
await writeFile(out.replace(/\.png$/, '.json'), JSON.stringify({ building, roomId, rect: g.rect, rise: g.rise, scale: g.scale, size: g.size }, null, 2));
console.log('guide', out, g.size.join('x'), 'native', `${g.rect.w}x${g.rect.h}`, 'rise', g.rise);
