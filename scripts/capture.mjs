// One-off visual capture of the running Office Builder.
// usage: node scripts/capture.mjs <out.png> "<query>" [width] [height] [focusRoom|-] [zoomFactor]
import { chromium } from 'playwright';

const [out, query = '', w = '1600', h = '900', focus = '-', zoom = '1'] = process.argv.slice(2);
const base = process.env.ENGINE_URL || 'http://127.0.0.1:8790';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`${base}/?${query}`);
await page.waitForFunction(() => window.__engine?.ready === true, null, { timeout: 30000 });
await page.waitForTimeout(400);
if (focus !== '-') await page.evaluate(r => window.__engine.focus(r), focus);
if (zoom !== '1') await page.evaluate(f => { const v = window.__engine.scene().view; const c = document.getElementById('view'); v.zoomAt(Number(f), c.width / 2, c.height / 2); }, zoom);
await page.waitForTimeout(500);
await page.screenshot({ path: out });
await browser.close();
if (errors.length) { console.error(errors); process.exitCode = 1; } else console.log('captured', out);
