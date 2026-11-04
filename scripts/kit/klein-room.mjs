// The default room-art pipeline (FLUX.2-klein reference edit). One spec per room:
//
//   node scripts/kit/klein-room.mjs <spec.json> guides   export shell + furniture guides from the running engine
//   node scripts/kit/klein-room.mjs <spec.json> render   render candidates on the GPU ComfyUI (loopback; pause Nebula first)
//   node scripts/kit/klein-room.mjs <spec.json> sheet    contact sheet per piece, to pick from
//   node scripts/kit/klein-room.mjs <spec.json> pack     build the asset pack from spec "pick" (default: candidate 0)
//
// The shell is rendered from the engine's furniture-free room; each furniture piece
// from its engine sprite alone on magenta. Both carry the building's style reference.
// Work files go to dev/engine/packs-work/<packId>/, the pack to dev/engine/packs/<packId>/.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [specPath, stage] = process.argv.slice(2);
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const work = path.join(root, 'dev/engine/packs-work', spec.packId);
mkdirSync(work, { recursive: true });
const PY = process.env.KIT_PYTHON || 'C:/AI/AgentPixelsComfy/ComfyUI_windows_portable/python_embeded/python.exe';
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
const k = spec.render ?? {};
const candidates = k.candidates ?? 3;
const shellScale = k.shellScale ?? 3;     // engine px -> render px for the shell (at the world's own density)
const spriteScale = k.spriteScale ?? 12;  // definition px -> render px for furniture
const style = k.stylePrompt ?? '';
const ref = 'style-reference.png';

const shellPrompt = `Repaint image 1 as a richly detailed pixel art game room in exactly the art style, colour palette and lighting of image 2. Keep the composition of image 1 exactly: ${spec.shell.keep}. Empty floor with no furniture and no people. ${style}`.trim();
const piecePrompt = f => `Repaint the ${f.describe} in image 1 as a richly detailed pixel art game asset in exactly the art style, colour palette and lighting of image 2. Keep its exact shape, size and viewing angle. Plain flat magenta background, no shadow, no other objects. ${style}`.trim();
const pieceType = f => f.type ?? f.assetId;

if (stage === 'guides') {
  copyFileSync(path.resolve(root, spec.reference), path.join(work, ref));
  run('node', ['scripts/kit/room-guide.mjs', spec.building, spec.roomId, path.join(work, 'shell.guide.png'), String(shellScale), 'shell']);
  run('node', ['scripts/kit/sprite-guides.mjs', spec.building, work, String(spriteScale), '1024x1024', ...spec.furniture.map(pieceType)]);
} else if (stage === 'render') {
  const jobs = [];
  const guide = JSON.parse(readFileSync(path.join(work, 'shell.guide.json'), 'utf8'));
  for (let c = 0; c < candidates; c++) {
    jobs.push({ id: `shell.c${c}`, kind: 'klein-edit', guide: 'shell.guide.png', refs: [ref], prompt: shellPrompt,
      seed: (spec.seed ?? 1000) + c, width: guide.size[0], height: guide.size[1] });
    for (const f of spec.furniture) {
      jobs.push({ id: `${f.assetId}.c${c}`, kind: 'klein-edit', guide: `sprite-${pieceType(f)}.guide.png`, refs: [ref], prompt: piecePrompt(f),
        seed: (spec.seed ?? 1000) + 100 + c, width: 1024, height: 1024 });
    }
  }
  const cfg = { models: { klein: 'flux-2-klein-4b-fp8.safetensors', qwen: 'qwen_3_4b_fp8_mixed.safetensors', flux2vae: 'flux2-vae.safetensors' }, jobs };
  writeFileSync(path.join(work, 'jobs.json'), JSON.stringify(cfg, null, 2));
  run('node', ['scripts/kit/bakeoff.mjs', path.join(work, 'jobs.json'), work]);
} else if (stage === 'sheet') {
  const names = ['shell', ...spec.furniture.map(f => f.assetId)];
  run(PY, ['-I', '-c', `
import sys
from PIL import Image, ImageDraw
work, names, n = sys.argv[1], sys.argv[2].split(','), int(sys.argv[3])
S = 300
sheet = Image.new('RGB', (n * (S + 8) + 160, len(names) * (S + 8)), (20, 18, 30))
d = ImageDraw.Draw(sheet)
for r, name in enumerate(names):
    d.text((6, r * (S + 8) + 6), name, fill=(255, 230, 160))
    for c in range(n):
        try:
            im = Image.open(f'{work}/{name}.c{c}.png').convert('RGB')
        except FileNotFoundError:
            continue
        im.thumbnail((S, S))
        sheet.paste(im, (160 + c * (S + 8), r * (S + 8)))
        d.text((164 + c * (S + 8), r * (S + 8) + 4), f'c{c}', fill=(255, 255, 255))
sheet.save(f'{work}/candidates.png')
print('sheet', f'{work}/candidates.png')
`, work, names.join(','), String(candidates)]);
} else if (stage === 'pick' || stage === 'pack') {
  const pick = spec.pick ?? {};
  const packSpec = {
    packId: spec.packId, name: spec.name, stylePackId: spec.stylePackId, tilePx: spec.tilePx ?? 16,
    paletteColors: spec.paletteColors ?? 128, paletteAnchors: spec.paletteAnchors ?? [],
    shell: { ...spec.shell, render: `shell.c${pick.shell ?? 0}.png`, guide: 'shell.guide' },
    furniture: spec.furniture.map(f => ({ ...f, render: `${f.assetId}.c${pick[f.assetId] ?? 0}.png`, guide: `sprite-${pieceType(f)}.guide` })),
  };
  // The furniture guide carries the definition id; its mask/json are named by type.
  writeFileSync(path.join(work, 'pack-spec.json'), JSON.stringify(packSpec, null, 2));
  if (!existsSync(path.join(work, packSpec.shell.render))) throw Error(`missing ${packSpec.shell.render}; run render first`);
  run(PY, ['-I', 'scripts/kit/klein-pack.py', path.join(work, 'pack-spec.json'), work, path.join(root, 'dev/engine/packs', spec.packId)]);
} else {
  console.error('stage must be guides | render | sheet | pack');
  process.exitCode = 2;
}
