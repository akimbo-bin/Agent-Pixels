// Runs img2img on each kit guide through the LOCAL ComfyUI (loopback only),
// strictly one job at a time, and writes raw outputs plus provenance receipts.
//
// usage: node scripts/kit/generate-kit.mjs <kit.json> <work_dir> [assetId ...]
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.COMFY_URL || 'http://127.0.0.1:8188';
assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin), 'ComfyUI must be addressed on loopback only');
const [kitPath, work, ...only] = process.argv.slice(2);
const kit = JSON.parse(await readFile(kitPath, 'utf8'));
const MIN_FREE_VRAM = 3.2e9;
// COMFY_CPU=1 targets a CPU-only ComfyUI (started with --cpu): no VRAM check,
// and a longer per-job timeout since a CPU step takes seconds, not milliseconds.
const cpu = process.env.COMFY_CPU === '1';
const JOB_TIMEOUT_MS = (cpu ? 20 : 5) * 60 * 1000;

const get = async p => {
  const r = await fetch(origin + p, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw Error(`GET ${p} -> ${r.status}`);
  return r.json();
};
const sha = b => createHash('sha256').update(b).digest('hex');

const info = await get('/object_info/CheckpointLoaderSimple');
assert.ok(info.CheckpointLoaderSimple.input.required.ckpt_name[0].includes(kit.checkpoint), 'checkpoint missing');

for (const a of kit.assets) {
  if (only.length && !only.includes(a.assetId)) continue;
  const stats = await get('/system_stats');
  const queue = await get('/queue');
  assert.equal(queue.queue_running.length + queue.queue_pending.length, 0, 'ComfyUI queue is busy; refusing to contend');
  const device = stats.devices[0];
  const free = device.vram_free;
  if (cpu) assert.equal(device.type, 'cpu', 'COMFY_CPU=1 but this ComfyUI is not running with --cpu');
  else assert.ok(free > MIN_FREE_VRAM, `only ${(free / 1e9).toFixed(1)} GB VRAM free; refusing to start`);

  const guide = await readFile(path.join(work, `${a.assetId}.guide.png`));
  const form = new FormData();
  form.append('image', new Blob([guide], { type: 'image/png' }), `ap-kit-${a.assetId}.png`);
  form.append('overwrite', 'true');
  const up = await fetch(origin + '/upload/image', { method: 'POST', body: form });
  assert.ok(up.ok, 'guide upload failed');
  const { name } = await up.json();

  const [ls, lc] = kit.loraStrength;
  // One shared style suffix keeps every asset in a kit in the same visual language.
  const prompt = kit.stylePrompt ? `${a.prompt}, ${kit.stylePrompt}` : a.prompt;
  const wf = {
    ckpt: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: kit.checkpoint } },
    lora: { class_type: 'LoraLoader', inputs: { lora_name: kit.lora, strength_model: ls, strength_clip: lc, model: ['ckpt', 0], clip: ['ckpt', 1] } },
    pos: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['lora', 1] } },
    neg: { class_type: 'CLIPTextEncode', inputs: { text: kit.negative, clip: ['lora', 1] } },
    load: { class_type: 'LoadImage', inputs: { image: name } },
    enc: { class_type: 'VAEEncode', inputs: { pixels: ['load', 0], vae: ['ckpt', 2] } },
    ks: { class_type: 'KSampler', inputs: { ...kit.sampler, seed: a.seed, denoise: a.denoise, model: ['lora', 0], positive: ['pos', 0], negative: ['neg', 0], latent_image: ['enc', 0] } },
    dec: { class_type: 'VAEDecode', inputs: { samples: ['ks', 0], vae: ['ckpt', 2] } },
    save: { class_type: 'SaveImage', inputs: { images: ['dec', 0], filename_prefix: `AgentPixelsKit_${a.assetId}` } },
  };
  const started = Date.now();
  const res = await fetch(origin + '/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: wf, client_id: 'agentpixels-kit' }) });
  const queued = await res.json();
  if (!res.ok || !queued.prompt_id) throw Error('rejected: ' + JSON.stringify(queued).slice(0, 800));
  let image;
  while (Date.now() - started < JOB_TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, 1500));
    const rec = (await get('/history/' + queued.prompt_id))[queued.prompt_id];
    if (!rec) continue;
    if (rec.status?.status_str === 'error') throw Error('execution failed: ' + JSON.stringify(rec.status).slice(0, 800));
    image = rec.outputs?.save?.images?.[0];
    if (image) break;
  }
  assert.ok(image, `no output for ${a.assetId}`);
  const view = await fetch(origin + '/view?' + new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || '', type: image.type }));
  const bytes = Buffer.from(await view.arrayBuffer());
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'not a PNG');
  await writeFile(path.join(work, `${a.assetId}.raw.png`), bytes);
  const receipt = {
    assetId: a.assetId, class: a.class, source: 'local-comfyui', comfyui: stats.system.comfyui_version,
    checkpoint: kit.checkpoint, lora: kit.lora, loraStrength: kit.loraStrength, seed: a.seed, denoise: a.denoise,
    sampler: kit.sampler, promptVersion: kit.promptVersion, prompt, negative: kit.negative,
    conditioning: { kind: 'img2img-guide', guide: `${a.assetId}.guide.png`, guideSha256: sha(guide) },
    rawSha256: sha(bytes), rawWidth: bytes.readUInt32BE(16), rawHeight: bytes.readUInt32BE(20),
    generatedAt: new Date().toISOString(), elapsedSeconds: Math.round((Date.now() - started) / 1000),
    device: device.type, vramFreeAtStartGB: cpu ? null : +(free / 1e9).toFixed(2),
  };
  await writeFile(path.join(work, `${a.assetId}.receipt.json`), JSON.stringify(receipt, null, 2));
  console.log(`generated ${a.assetId} in ${receipt.elapsedSeconds}s`);
}
