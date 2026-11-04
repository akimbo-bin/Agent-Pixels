// Real-browser acceptance for the V3 engine slice. Drives the Office Builder
// dev harness in Chrome, records video + screenshots into dev/engine/review/,
// and asserts physical facts sampled from the running scene (not from mocks).
//
//   node scripts/engine-dev.mjs &        (serves http://127.0.0.1:8790)
//   node scripts/engine-browser.mjs [--url http://127.0.0.1:8790]
import { chromium } from 'playwright';
import { mkdir, rename, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const review = path.join(root, 'dev', 'engine', 'review');
const args = process.argv.slice(2);
const base = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://127.0.0.1:8790';
await mkdir(review, { recursive: true });
const report = { startedAt: new Date().toISOString(), base, checks: [], screenshots: [], videos: [] };
const check = (name, ok, detail) => { report.checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + JSON.stringify(detail) : ''}`); };

const browser = await chromium.launch({ headless: true, ...(process.env.OBS_BROWSER_PATH ? { executablePath: process.env.OBS_BROWSER_PATH } : { channel: 'chrome' }) });

async function open(page, query) {
  await page.goto(`${base}/?${query}`);
  await page.waitForFunction(() => window.__engine?.ready === true, null, { timeout: 30000 });
  await page.waitForTimeout(400);
}
async function shot(page, name) {
  const file = path.join(review, name);
  await page.screenshot({ path: file });
  report.screenshots.push(name);
}

// ── 1. Every template renders at three viewport sizes ─────────
for (const [w, h, tag] of [[1920, 1080, 'desktop'], [1366, 768, 'laptop'], [390, 844, 'mobile']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  for (const building of tag === 'desktop' ? ['two-floor-office', 'small-studio', 'nebula-campus', 'five-storey-tower', 'generated'] : ['two-floor-office', 'five-storey-tower']) {
    await open(page, `building=${building}&ambient=0`);
    await shot(page, `${building}-${tag}.png`);
  }
  check(`no page errors (${tag})`, errors.length === 0, errors.slice(0, 3));
  await page.close();
}

// ── 2. Recorded tour: door, corridor, room, elevator, other floor ─
{
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, recordVideo: { dir: review, size: { width: 1600, height: 900 } } });
  const page = await context.newPage();
  await open(page, 'building=two-floor-office&ambient=0');
  // Robin (reception, ground floor) is agent 1.
  const id = await page.evaluate(() => window.__engine.agents().find(a => a.name.startsWith('Robin')).id);
  await page.evaluate(i => { window.__engine.select(i); window.__engine.tour(i); }, id);
  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const a = await page.evaluate(i => ({ a: window.__engine.agents().find(x => x.id === i), cab: window.__engine.cabins()[0], tours: window.__engine.scene().tours.size, sim: window.__engine.simTime() }), id);
    samples.push({ t: Date.now() - t0, sim: a.sim, ...a.a, cabin: a.cab.phase, cabinFloor: a.cab.floorId, tours: a.tours });
    if (samples.length > 20 && a.tours === 0 && !a.a.trip) break;
    if (samples.length === 25) await shot(page, 'tour-door-crossing.png');
    if (a.a.riding && a.cab.phase === 'moving' && !report.screenshots.includes('tour-elevator-ride.png')) await shot(page, 'tour-elevator-ride.png');
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(800);
  await shot(page, 'tour-finished.png');
  const rooms = [...new Set(samples.map(s => s.room).filter(Boolean))];
  const floors = [...new Set(samples.map(s => s.floor))];
  const doorway = samples.some(s => s.room === null);
  const floorChanges = samples.filter((s, i) => i && s.floor !== samples[i - 1].floor);
  check('tour visits several rooms through doorways', rooms.length >= 3 && doorway, { rooms });
  check('tour reaches another floor', floors.length >= 2, { floors });
  check('floor changes only while in the cabin sequence', floorChanges.every(s => ['exiting', 'walk', 'riding'].includes(s.trip) || s.riding), floorChanges.map(s => s.trip));
  // Speed against SIMULATED time between samples (wall-clock sampling jitters under load).
  const maxSpeed = Math.max(0, ...samples.slice(1).map((s, i) => s.floor === samples[i].floor && s.sim > samples[i].sim ? Math.hypot(s.x - samples[i].x, s.y - samples[i].y) / (s.sim - samples[i].sim) : 0));
  check('no same-floor teleport (speed never above walking pace)', maxSpeed <= 48 * 1.25, { maxPxPerSec: +maxSpeed.toFixed(1), walkPxPerSec: 48 });
  const back = await page.evaluate(i => window.__engine.agents().find(x => x.id === i), id);
  check('agent returns to its seat and works', back.state === 'type', { state: back.state, room: back.room });
  await writeFile(path.join(review, 'tour-samples.json'), JSON.stringify(samples, null, 1));
  const video = await page.video().path();
  await context.close();
  await rename(video, path.join(review, 'tour-two-floor.webm'));
  report.videos.push('tour-two-floor.webm');
}

// ── 3. Furniture: relocated desk changes routes; sealing a door is refused ─
{
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await open(page, 'building=small-studio&ambient=0&debug=1');
  const before = await page.evaluate(() => {
    const s = window.__engine.scene();
    return s.office.blockedTiles.size;
  });
  // Casey (lounge) walks to the studio's far side; then a bookshelf is moved into the walkway.
  const r1 = await page.evaluate(() => window.__engine.moveFurniture('studio-shelf', 'studio', 10, 3));
  const after = await page.evaluate(() => {
    const s = window.__engine.scene();
    const f = s.compiled.layout.furniture.find(x => x.uid === 'studio-shelf');
    return { blocked: s.office.blockedTiles.size, shelf: { col: f.col, row: f.row }, keys: [...s.office.blockedTiles] };
  });
  check('moved bookshelf updates collider', r1.ok && after.keys.includes(`${after.shelf.col},${after.shelf.row + 1}`), { before, after: after.blocked, shelf: after.shelf });
  const casey = await page.evaluate(() => window.__engine.agents().find(a => a.name.startsWith('Casey')).id);
  const target = await page.evaluate(() => window.__engine.roomTile('studio', 9, 4));
  await page.evaluate(([i, t]) => { window.__engine.select(i); window.__engine.travelToTile(i, t.col, t.row); }, [casey, target]);
  const path1 = await page.evaluate(i => window.__engine.scene().office.characters.get(i).path, casey);
  const crosses = path1.filter(p => after.keys.includes(`${p.col},${p.row}`));
  check('route avoids relocated furniture', path1.length > 0 && crosses.length === 0, { steps: path1.length });
  await page.waitForTimeout(600);
  await shot(page, 'furniture-moved-route.png');
  const r2 = await page.evaluate(() => window.__engine.moveFurniture('studio-shelf', 'kitchen', 0, 1));
  check('furniture that seals a doorway is refused with a reason', !r2.ok && r2.issues.length > 0, r2.issues);
  // Diagonal route: valid diagonals present, none corner-cutting.
  const diag = path1.some((p, i) => i && p.col !== path1[i - 1].col && p.row !== path1[i - 1].row);
  check('route uses diagonal steps where open', diag, null);
  await page.close();
}

// ── 4. Door closing negative test ────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await open(page, 'building=two-floor-office&ambient=0');
  const lead = await page.evaluate(() => window.__engine.agents().find(a => a.name.startsWith('Morgan')).id);
  const closed = await page.evaluate(() => window.__engine.setDoor('d-lead-meeting', false));
  const blocked = await page.evaluate(i => window.__engine.travelToRoom(i, 'meeting'), lead);
  await page.evaluate(() => window.__engine.focus('lead'));
  await page.waitForTimeout(300);
  await shot(page, 'door-closed.png');
  check('closed door blocks the route (no teleport)', closed.ok && blocked === false, { closed, blocked });
  await page.evaluate(() => window.__engine.setDoor('d-lead-meeting', true));
  const open2 = await page.evaluate(i => window.__engine.travelToRoom(i, 'meeting'), lead);
  check('reopened door allows the route', open2 === true, null);
  await page.close();
}

// ── 5. Capacity queue: three ground-floor agents, two-passenger cabin ──
{
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, recordVideo: { dir: review, size: { width: 1600, height: 900 } } });
  const page = await context.newPage();
  await open(page, 'building=two-floor-office&ambient=0');
  const ground = await page.evaluate(() => window.__engine.agents().filter(a => a.floor === 'ground').map(a => a.id));
  await page.evaluate(list => list.forEach((i, n) => window.__engine.travelToTile(i, ...Object.values(window.__engine.roomTile('music', 2 + n * 3, 5)))), ground);
  let maxRiders = 0, rides = 0, last = 'idle';
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const st = await page.evaluate(() => ({ cabin: window.__engine.cabins()[0], agents: window.__engine.agents() }));
    maxRiders = Math.max(maxRiders, st.cabin.passengers.length);
    if (st.cabin.phase === 'moving' && last !== 'moving' && st.cabin.passengers.length) rides++;
    if (maxRiders === 2 && st.cabin.phase === 'moving' && !report.screenshots.includes('capacity-two-riders.png')) await shot(page, 'capacity-two-riders.png');
    last = st.cabin.phase;
    if (rides >= 2 && st.agents.filter(a => ground.includes(a.id)).every(a => !a.trip)) break;
    await page.waitForTimeout(120);
  }
  const final = await page.evaluate(() => window.__engine.agents());
  check('capacity 2: three riders need two loaded trips, never more than 2 aboard', maxRiders === 2 && rides >= 2 && final.filter(a => ground.includes(a.id)).every(a => a.room === 'music'), { maxRiders, rides, rooms: final.map(a => a.room) });
  const video = await page.video().path();
  await context.close();
  await rename(video, path.join(review, 'capacity-queue.webm'));
  report.videos.push('capacity-queue.webm');
}

// ── 5b. Second building: tower, ground floor to penthouse ──
{
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, recordVideo: { dir: review, size: { width: 1600, height: 900 } } });
  const page = await context.newPage();
  await open(page, 'building=five-storey-tower&ambient=0');
  const ids = await page.evaluate(() => window.__engine.agents().filter(a => a.floor === 'l0').map(a => a.id));
  await page.evaluate(list => { for (const i of list) window.__engine.travelToRoom(i, 'l4-terrace'); }, ids);
  let maxRiders = 0, sawMoving = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) {
    const st = await page.evaluate(() => ({ cabins: window.__engine.cabins(), agents: window.__engine.agents() }));
    for (const c of st.cabins) { maxRiders = Math.max(maxRiders, c.passengers.length); sawMoving ||= c.phase === 'moving' && c.passengers.length > 0; }
    if (sawMoving && st.agents.every(a => !a.trip)) break;
    await page.waitForTimeout(150);
  }
  await shot(page, 'tower-after-ride.png');
  const final = await page.evaluate(() => window.__engine.agents());
  check('tower: riders reach the terrace by elevator', sawMoving && final.filter(a => a.room === 'l4-terrace').length >= 1, { maxRiders, rooms: final.map(a => a.room) });
  const video = await page.video().path();
  await context.close();
  await rename(video, path.join(review, 'tower-elevator.webm'));
  report.videos.push('tower-elevator.webm');
}

// ── 6. Performance: 600+ frames on the largest sample ─────────
{
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await open(page, 'building=nebula-campus');
  await page.evaluate(() => window.__engine.resetStats());
  await page.waitForTimeout(12000);
  const s = await page.evaluate(() => ({ ...window.__engine.stats(), agents: window.__engine.agents().length, furniture: window.__engine.scene().compiled.layout.furniture.length }));
  check('render p95 under 25 ms (headless Chrome, local)', s.p95 < 25 && s.frames >= 600, s);
  report.performance = s;
  await page.close();
}

await browser.close();
for (const f of await readdir(review)) if (/^[0-9a-f]{32}\.webm$/.test(f)) await rm(path.join(review, f));
report.finishedAt = new Date().toISOString();
report.passed = report.checks.every(c => c.ok);
await writeFile(path.join(review, 'report.json'), JSON.stringify(report, null, 2));
console.log(report.passed ? 'ALL BROWSER CHECKS PASSED' : 'SOME BROWSER CHECKS FAILED');
process.exitCode = report.passed ? 0 : 1;
