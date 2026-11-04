// Real-Chrome checks for the furniture editor: hover highlight, pixel-accurate
// picking, a desk drag that carries its monitor, a free (sub-tile) nudge of a
// desk item, and delete. Screenshots go to dev/engine/review/editor/.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dev', 'engine', 'review', 'editor');
await mkdir(out, { recursive: true });
const base = process.env.ENGINE_URL || 'http://127.0.0.1:8790';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
const checks = [];
const check = (name, ok, detail) => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + JSON.stringify(detail) : ''}`); };

await page.goto(`${base}/?building=two-floor-office&ambient=0&kit=0`);
await page.waitForFunction(() => window.__engine?.ready === true);
await page.click('#edit');
await page.evaluate(() => { window.__engine.focus('workshop'); const v = window.__engine.scene().view; const c = document.getElementById('view'); v.zoomAt(1.6, c.width / 2, c.height * 0.55); });
await page.waitForTimeout(300);

const hitCenter = id => page.evaluate(i => {
  const s = window.__engine.scene(), h = s.renderer.hits.find(x => x.id === i);
  if (!h) return null;
  const sc = s.view.toScreen(h.x + h.w / 2, h.y + h.h * 0.3), dpr = window.devicePixelRatio || 1, r = document.getElementById('view').getBoundingClientRect();
  return { x: sc.x / dpr + r.left, y: sc.y / dpr + r.top };
}, id);
const state = () => page.evaluate(() => { const s = window.__engine.scene(); return { hover: s.hoverHit, sel: s.selection, f: Object.fromEntries(s.editor.world.furniture.map(f => [f.id, [f.col, f.row, f.offset ?? null]])) }; });

// Hover highlights the desk.
const desk = await hitCenter('wsa-desk');
await page.mouse.move(desk.x, desk.y);
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(out, 'hover-desk.png') });
check('hovering a desk highlights it', (await state()).hover?.id === 'wsa-desk', (await state()).hover);

// Empty space next to a thin object picks nothing (pixel-accurate picking).
const before = await state();
const tileBox = await page.evaluate(() => { const r = window.__engine.roomTile('workshop', 0, 4); return window.__engine.screenOf(r.col, r.row); });
await page.mouse.move(tileBox.x - 6, tileBox.y, { steps: 3 });
await page.mouse.move(tileBox.x, tileBox.y, { steps: 3 });
await page.waitForTimeout(150);
check('empty floor highlights nothing', (await state()).hover === null, (await state()).hover);

// Drag the desk two rows forward: valid ghost, monitor carried.
await page.mouse.move(desk.x, desk.y);
await page.mouse.down();
const deskT = await page.evaluate(() => { const s = window.__engine.scene(); const f = s.compiled.layout.furniture.find(x => x.uid === 'wsa-desk'); return window.__engine.screenOf(f.col + 1, f.row + 2); });
await page.mouse.move(deskT.x, deskT.y, { steps: 8 });
await page.waitForTimeout(150);
const ghost = await page.evaluate(() => window.__engine.scene().drag?.ghost);
await page.screenshot({ path: path.join(out, 'drag-desk.png') });
check('dragging a desk shows a valid ghost (its own monitor does not clash)', ghost?.valid === true, ghost && { valid: ghost.valid, row: ghost.row });
await page.mouse.up();
await page.waitForTimeout(200);
const after = await state();
const moved = after.f['wsa-desk'][1] - before.f['wsa-desk'][1];
check('desk moved and its monitor came with it (same rows)',
  moved > 0 && after.f['wsa-pc'][1] - before.f['wsa-pc'][1] === moved && after.f['wsa-pc'][0] === before.f['wsa-pc'][0],
  { desk: [before.f['wsa-desk'], after.f['wsa-desk']], pc: [before.f['wsa-pc'], after.f['wsa-pc']] });

// Nudge the monitor a fraction of a tile: free placement.
const pc = await hitCenter('wsa-pc');
await page.mouse.move(pc.x, pc.y);
await page.mouse.down();
await page.mouse.move(pc.x + 9, pc.y + 1, { steps: 6 });
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(out, 'nudge-monitor.png') });
console.log('nudge ghost', JSON.stringify(await page.evaluate(() => { const d = window.__engine.scene().drag; return d && { free: d.free, cand: d.candidate, valid: d.valid }; })));
await page.mouse.up();
await page.waitForTimeout(200);
const nudged = (await state()).f['wsa-pc'];
check('a desk item moves in sub-tile steps', nudged[2] !== null && (nudged[2].x % 1 !== 0 || nudged[2].y % 1 !== 0), nudged);

// Select and delete the monitor.
const pc2 = await hitCenter('wsa-pc');
await page.mouse.click(pc2.x, pc2.y);
await page.waitForTimeout(100);
check('clicking selects', (await state()).sel?.id === 'wsa-pc', (await state()).sel);
await page.screenshot({ path: path.join(out, 'selected.png') });
await page.keyboard.press('Delete');
await page.waitForTimeout(200);
check('Delete removes the selection', !('wsa-pc' in (await state()).f));
check('no page errors', errors.length === 0, errors.slice(0, 2));
await browser.close();
console.log(checks.every(Boolean) ? 'EDITOR CHECKS PASSED' : 'EDITOR CHECKS FAILED');
process.exitCode = checks.every(Boolean) ? 0 : 1;
