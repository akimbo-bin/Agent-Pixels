// Mass render: a whole building's art with FLUX.2-klein (reference edit).
//
//   node scripts/kit/klein-building.mjs <spec.json> inventory | guides | render | pick | pack | all
//
// inventory  the dressed building from the running engine: rooms + every furniture/decor type
// guides     per room: furniture-free shell (+ window glass mask); per type: its sprite alone on magenta
// render     every shell and type x candidates, in one GPU session (pauses Nebula, starts ComfyUI on
//            loopback, always stops it and resumes Nebula afterwards)
// pick       automatic best candidate per piece (scripts/kit/autopick.py), weak ones flagged
// pack       one pack: <roomId>-shell per room + every type, one shared palette
//
// Types already provided by the spec's "reusePacks" (hand-picked room kits) are not re-rendered.
import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [specPath, stage] = process.argv.slice(2);
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const work = path.join(root, 'dev/engine/packs-work', spec.packId);
mkdirSync(work, { recursive: true });
const PY = process.env.KIT_PYTHON || 'C:/AI/AgentPixelsComfy/ComfyUI_windows_portable/python_embeded/python.exe';
const COMFY_ROOT = 'C:/AI/AgentPixelsComfy/ComfyUI_windows_portable';
const NEBULA_PAUSE = 'C:/NebulaResearch/train/PAUSE';
const ENGINE = process.env.ENGINE_URL || 'http://127.0.0.1:8790';
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
const cand = spec.candidates ?? 3;
const ref = 'style-reference.png';
const invPath = path.join(work, 'inventory.json');
const inventory = () => JSON.parse(readFileSync(invPath, 'utf8'));

async function stageInventory() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  await page.goto(`${ENGINE}/?building=${spec.building}&kit=1&ambient=0`);
  await page.waitForFunction(() => window.__engine?.ready === true, null, { timeout: 60000 });
  const inv = await page.evaluate(skip => {
    const s = window.__engine.scene(), w = s.compiled.world;
    const rooms = w.rooms.filter(r => !skip.includes(r.id)).map(r => ({ id: r.id, kind: r.kind, name: r.name, subtitle: r.subtitle ?? '',
      size: window.__engine.roomArtSize(r.id).room }));
    const types = new Map();
    for (const f of w.furniture) if (!skip.includes(f.roomId)) types.set(f.assetId, { kind: 'furniture' });
    for (const d of w.decor) if (!skip.includes(d.roomId) && !window.__engine.isBakedFixture(d.assetId)) types.set(d.assetId, { kind: 'decor', attachment: d.attachment });
    return { rooms, types: [...types].map(([id, t]) => ({ id, ...t, ...window.__engine.footprintOf(id) })) };
  }, spec.skipRooms ?? []);
  await browser.close();
  const reused = new Set((spec.reusePacks ?? []).flatMap(p => {
    const pj = path.join(root, 'dev/engine/packs', p, 'pack.json');
    return existsSync(pj) ? JSON.parse(readFileSync(pj, 'utf8')).assets.filter(a => a.class !== 'room-plate').map(a => a.assetId) : [];
  }));
  inv.types = inv.types.filter(t => !reused.has(t.id));
  writeFileSync(invPath, JSON.stringify(inv, null, 2));
  console.log(`inventory: ${inv.rooms.length} rooms, ${inv.types.length} types to render (${reused.size} reused)`);
}

function stageGuides() {
  const inv = inventory();
  copyFileSync(path.resolve(root, spec.reference), path.join(work, ref));
  // Wide rooms get a smaller render scale so a shell stays within ~1.9k px (8 GB of VRAM).
  const scaleFor = r => (r.size.width * (spec.tilePx ?? 16) * (spec.shellScale ?? 3) > 1900 ? Math.max(1, (spec.shellScale ?? 3) - 1) : (spec.shellScale ?? 3));
  for (const r of inv.rooms) run('node', ['scripts/kit/room-guide.mjs', spec.building, r.id, path.join(work, `${r.id}.guide.png`), String(scaleFor(r)), 'shell']);
  run('node', ['scripts/kit/sprite-guides.mjs', spec.building, work, String(spec.spriteScale ?? 12), '1024x1024', ...inv.types.map(t => t.id)]);
}

function shellPrompt(r) {
  const wall = spec.kindWalls[r.kind] ?? spec.kindWalls.default;
  return `Repaint image 1 as a richly detailed pixel art game room in exactly the art style, colour palette and lighting of image 2. `
    + `Keep the room's structure exactly as in image 1: the back wall, side walls, floor, ceiling line and the arched windows stay where they are. `
    + `This is the ${r.name} (${r.subtitle}). Decorate the back wall with ${wall}. Leave the floor empty: no furniture, no people. ${spec.stylePrompt ?? ''}`.trim();
}
const piecePrompt = t => `Repaint the ${spec.describe?.[t.id] ?? t.label ?? t.id} in image 1 as a richly detailed pixel art game asset in exactly the art style, `
  + `colour palette and lighting of image 2. Keep its exact shape, size and viewing angle. Plain flat magenta background, no shadow, no other objects. ${spec.stylePrompt ?? ''}`.trim();

function jobs() {
  const inv = inventory(), out = [];
  for (let c = 0; c < cand; c++) {
    for (const r of inv.rooms) {
      const g = JSON.parse(readFileSync(path.join(work, `${r.id}.guide.json`), 'utf8'));
      out.push({ id: `${r.id}.c${c}`, shell: true, kind: 'klein-edit', guide: `${r.id}.guide.png`, refs: [ref], prompt: shellPrompt(r),
        seed: (spec.seed ?? 5000) + c, width: g.size[0], height: g.size[1] });
    }
    for (const t of inv.types) out.push({ id: `${t.id}.c${c}`, kind: 'klein-edit', guide: `sprite-${t.id}.guide.png`, refs: [ref],
      prompt: piecePrompt(t), seed: (spec.seed ?? 5000) + 100 + c, width: 1024, height: 1024 });
  }
  return out;
}

const nebulaBusy = () => execFileSync('powershell', ['-NoProfile', '-Command',
  "(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'nebula_train\\.(eval|train|oracle)' } | Measure-Object).Count"]).toString().trim() !== '0';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function gpuSession(fn) {
  writeFileSync(NEBULA_PAUSE, `Agent Pixels mass render (owner approved pausing Nebula). Created ${new Date().toISOString()} by Claude. Delete to resume.\n`);
  let comfy;
  try {
    for (let i = 0; i < 60 && nebulaBusy(); i++) await sleep(5000);
    if (nebulaBusy()) throw Error('Nebula did not yield within 5 minutes');
    comfy = spawn(`${COMFY_ROOT}/python_embeded/python.exe`, ['-s', 'ComfyUI/main.py', '--listen', '127.0.0.1', '--port', '8188', '--disable-auto-launch', '--preview-method', 'none'],
      { cwd: COMFY_ROOT, stdio: 'ignore', windowsHide: true });
    for (let i = 0; i < 90; i++) { try { if ((await fetch('http://127.0.0.1:8188/system_stats')).ok) break; } catch {} await sleep(2000); }
    await fn();
  } finally {
    if (comfy) comfy.kill();
    if (existsSync(NEBULA_PAUSE)) unlinkSync(NEBULA_PAUSE);
    console.log('GPU session closed: ComfyUI stopped, Nebula pause removed');
  }
}

async function stageRender() {
  const cfg = { models: { klein: 'flux-2-klein-4b-fp8.safetensors', qwen: 'qwen_3_4b_fp8_mixed.safetensors', flux2vae: 'flux2-vae.safetensors' }, jobs: jobs() };
  writeFileSync(path.join(work, 'jobs.json'), JSON.stringify(cfg, null, 2));
  const todo = cfg.jobs.filter(j => !existsSync(path.join(work, `${j.id}.png`))).map(j => j.id);
  console.log(`${cfg.jobs.length} jobs, ${todo.length} to render`);
  if (!todo.length) return;
  await gpuSession(async () => {
    for (let i = 0; i < todo.length; i += 40) run('node', ['scripts/kit/bakeoff.mjs', path.join(work, 'jobs.json'), work, ...todo.slice(i, i + 40)]);
  });
}

function stagePack() {
  const inv = inventory(), picks = JSON.parse(readFileSync(path.join(work, 'picks.json'), 'utf8'));
  const packSpec = {
    packId: spec.packId, name: spec.name, stylePackId: spec.stylePackId, tilePx: spec.tilePx, paletteColors: spec.paletteColors ?? 128,
    paletteAnchors: spec.paletteAnchors ?? [], shellColors: spec.shellColors, spriteColors: spec.spriteColors,
    shells: inv.rooms.map(r => ({ assetId: `${r.id}-shell`, render: `${r.id}.c${picks[r.id] ?? 0}.png`, guide: `${r.id}.guide`,
      room: [r.size.width, r.size.wallHeight, r.size.depth], rise: spec.rise ?? 1 })),
    furniture: inv.types.map(t => ({ assetId: t.id, render: `${t.id}.c${picks[t.id] ?? 0}.png`, guide: `sprite-${t.id}.guide`,
      footprint: [t.w, t.h], backgroundRows: t.backgroundRows ?? 0, category: t.category ?? 'misc', isDesk: !!t.isDesk,
      ...(t.kind === 'decor' ? { decor: true, attachment: t.attachment } : {}) })),
  };
  writeFileSync(path.join(work, 'pack-spec.json'), JSON.stringify(packSpec, null, 2));
  run(PY, ['-I', 'scripts/kit/klein-pack.py', path.join(work, 'pack-spec.json'), work, path.join(root, 'dev/engine/packs', spec.packId)]);
}

const stages = { inventory: stageInventory, guides: stageGuides, render: stageRender,
  pick: () => run(PY, ['-I', 'scripts/kit/autopick.py', work, path.join(work, 'jobs.json')]), pack: stagePack };
if (stage === 'all') { for (const s of ['inventory', 'guides', 'render', 'pick', 'pack']) await stages[s](); }
else if (stages[stage]) await stages[stage]();
else { console.error('stage: inventory | guides | render | pick | pack | all'); process.exitCode = 2; }
