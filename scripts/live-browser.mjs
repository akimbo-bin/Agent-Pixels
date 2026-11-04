// End-to-end live check: the dev server's /live (real sources) and what the
// engine shows must agree — every org member is a character in their kit room,
// and every bound object shows its task's state.
//   node scripts/engine-dev.mjs &   then   node scripts/live-browser.mjs [--url http://127.0.0.1:8790]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const base = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://127.0.0.1:8790';
const browser = await chromium.launch({ headless: true, ...(process.env.OBS_BROWSER_PATH ? { executablePath: process.env.OBS_BROWSER_PATH } : { channel: 'chrome' }) });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
let failed = 0;
const check = (name, ok, info) => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info === undefined ? '' : ' — ' + JSON.stringify(info)}`); };

await page.goto(`${base}/?building=nebula-campus&kit=1`);
await page.waitForFunction(() => !!window.__engine, null, { timeout: 60000 });
const r = await page.evaluate(async () => {
  await __engine.pollLive();
  const live = await fetch('/live').then(x => x.json());
  const s = __engine.scene();
  const chars = __engine.agents().map(a => ({ ...a, member: s.members.get(a.id) ?? null }));
  return { live, chars, bindings: s.compiled.world.bindings ?? {}, shown: Object.fromEntries(Object.entries(s.compiled.world.bindings ?? {}).map(([id, b]) => [id, __engine.live(b.live)])) };
});

const org = r.live.org?.paperclip?.agents ?? [];
check('org source is live (14+ members, fresh snapshot)', org.length > 0 && r.live.tasks.paperclip?.state === 'running', { members: org.length, state: r.live.tasks.paperclip?.state, why: r.live.tasks.paperclip?.why });
check('every member is exactly one character', org.length === r.chars.length && org.every(m => r.chars.filter(c => c.member?.id === m.id).length === 1),
  { members: org.length, characters: r.chars.length });
const misplaced = r.chars.filter(c => c.member && !c.trip && c.room == null);
check('every member stands in a room', misplaced.length === 0, misplaced.map(c => c.name));
const activeWrong = await page.evaluate(() => { const s = __engine.scene(); return [...s.members].filter(([id, m]) => s.office.characters.get(id).isActive !== !!(m.issue?.running && m.status !== 'paused')).map(([, m]) => m.name); });
check('only members with a running ticket are at work', activeWrong.length === 0, activeWrong);
for (const [id, b] of Object.entries(r.bindings)) {
  const task = r.live.tasks[b.live], shown = r.shown[id];
  check(`bound object ${id} shows ${b.live}`, !!task && shown.state === task.state, { source: task?.state, shown: shown.state, detail: shown.detail });
}
check('no page errors', errors.length === 0, errors);

await mkdir(path.join(root, 'artifacts'), { recursive: true });
await page.evaluate(() => { const t = __engine.agents().find(a => a.name.startsWith('Training')); if (t) __engine.select(t.id); __engine.focus('training'); });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(root, 'artifacts', 'live-training.png') });
await page.evaluate(() => __engine.fit());
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(root, 'artifacts', 'live-campus.png') });
await browser.close();
console.log(failed ? `${failed} LIVE CHECK(S) FAILED` : 'LIVE CHECKS PASSED');
process.exit(failed ? 1 : 0);
