// Captures the room kit INSIDE the running scene (not an image grid) for
// owner review: before/after at three viewport sizes plus a close-up, and
// checks that the kit loaded, changed no topology, and that collision uses
// the record footprints.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const review = path.join(root, 'dev', 'engine', 'review', 'kit');
const base = process.env.ENGINE_URL || 'http://127.0.0.1:8790';
await mkdir(review, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + JSON.stringify(detail) : ''}`); };

async function open(page, kit) {
  await page.goto(`${base}/?building=two-floor-office&ambient=0&kit=${kit ? 1 : 0}`);
  await page.waitForFunction(() => window.__engine?.ready === true, null, { timeout: 30000 });
  await page.waitForTimeout(500);
}

const errors = [];
for (const [w, h, tag] of [[1920, 1080, 'desktop'], [1366, 768, 'laptop'], [390, 844, 'mobile']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', e => errors.push(String(e)));
  for (const kit of [false, true]) {
    await open(page, kit);
    await page.screenshot({ path: path.join(review, `${kit ? 'after' : 'before'}-${tag}.png`) });
    await page.evaluate(() => window.__engine.focus('music'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(review, `${kit ? 'after' : 'before'}-closeup-${tag}.png`) });
  }
  await page.close();
}
check('no page errors', errors.length === 0, errors.slice(0, 3));

const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await open(page, false);
const plain = await page.evaluate(() => { const c = window.__engine.scene().compiled; return { tiles: c.layout.tiles.join(''), doors: c.doors.map(d => d.def.id + d.rows.join()) }; });
await open(page, true);
const kitted = await page.evaluate(() => {
  const s = window.__engine.scene(), c = s.compiled;
  const consoleF = c.layout.furniture.find(f => f.uid === 'kit-console');
  return {
    kit: window.__engine.kit(), tiles: c.layout.tiles.join(''), doors: c.doors.map(d => d.def.id + d.rows.join()),
    consoleBlocked: [0, 1, 2].map(dc => s.office.blockedTiles.has(`${consoleF.col + dc},${consoleF.row + 1}`)),
    consoleBackRowFree: [0, 1, 2].map(dc => !s.office.blockedTiles.has(`${consoleF.col + dc},${consoleF.row}`)),
    seated: window.__engine.agents().find(a => a.name.startsWith('Quinn')),
  };
});
check('all 8 kit assets loaded without problems', kitted.kit?.loaded.length === 8 && kitted.kit.problems.length === 0, kitted.kit);
check('kit changes no walls, floors or doors', plain.tiles === kitted.tiles && JSON.stringify(plain.doors) === JSON.stringify(kitted.doors), null);
check('generated console collides by its record footprint (front row solid, back row walkable)', kitted.consoleBlocked.every(Boolean) && kitted.consoleBackRowFree.every(Boolean), { solid: kitted.consoleBlocked, back: kitted.consoleBackRowFree });
// The guest walks to the console chair (own seat) and sits.
const quinn = kitted.seated.id;
await page.evaluate(i => { const s = window.__engine.scene(); const ch = s.office.characters.get(i); const seat = s.office.seats.get(ch.seatId); window.__engine.travelToTile(i, seat.seatCol, seat.seatRow); }, quinn);
await page.waitForFunction(i => { const s = window.__engine.scene(); return !s.travel.isTravelling(i); }, quinn, { timeout: 60000 });
await page.evaluate(i => { window.__engine.scene().office.characters.get(i).isActive = true; }, quinn);
await page.waitForTimeout(600);
await page.evaluate(() => window.__engine.focus('music'));
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(review, 'after-seated-at-console.png') });
const final = await page.evaluate(i => window.__engine.agents().find(a => a.id === i), quinn);
check('agent reaches the generated console seat and works', final.state === 'type' && final.room === 'music', final);
await browser.close();
const passed = checks.every(c => c.ok);
await writeFile(path.join(review, 'kit-report.json'), JSON.stringify({ at: new Date().toISOString(), passed, checks }, null, 2));
console.log(passed ? 'KIT CHECKS PASSED' : 'KIT CHECKS FAILED');
process.exitCode = passed ? 0 : 1;
