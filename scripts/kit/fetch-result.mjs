// Recovers a finished kit render from ComfyUI's history after generate-kit
// stopped waiting (e.g. a long CPU job outlived the client timeout). Waits
// for the job if it is still running. Writes <id>.raw.png and a receipt that
// rebuilds provenance from the workflow ComfyUI actually ran.
//
// usage: node scripts/kit/fetch-result.mjs <work_dir> <assetId>
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.COMFY_URL || 'http://127.0.0.1:8189';
assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin), 'ComfyUI must be addressed on loopback only');
const [work, assetId] = process.argv.slice(2);
const get = async p => (await fetch(origin + p)).json();
const sha = b => createHash('sha256').update(b).digest('hex');
const prefix = `AgentPixelsKit_${assetId}`;

let hit;
for (;;) {
  const hist = await get('/history?max_items=50');
  hit = Object.entries(hist).reverse().find(([, h]) => Object.values(h.prompt?.[2] ?? {}).some(n => n.inputs?.filename_prefix === prefix));
  if (hit && hit[1].outputs?.save?.images?.length) break;
  const q = await get('/queue');
  assert.ok(hit || q.queue_running.length + q.queue_pending.length > 0, `no job for ${assetId} in history or queue`);
  await new Promise(r => setTimeout(r, 15000));
}
const [promptId, h] = hit;
const wf = h.prompt[2];
const image = h.outputs.save.images[0];
const view = await fetch(origin + '/view?' + new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || '', type: image.type }));
const bytes = Buffer.from(await view.arrayBuffer());
assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'not a PNG');
await writeFile(path.join(work, `${assetId}.raw.png`), bytes);
const guide = await readFile(path.join(work, `${assetId}.guide.png`));
const loras = Object.values(wf).filter(n => n.class_type === 'LoraLoader').map(n => ({ name: n.inputs.lora_name, model: n.inputs.strength_model, clip: n.inputs.strength_clip }));
const ks = wf.ks.inputs;
const stats = await get('/system_stats');
const receipt = {
  assetId, source: 'local-comfyui', comfyui: stats.system.comfyui_version, device: stats.devices[0].type, promptId,
  checkpoint: wf.ckpt.inputs.ckpt_name, loras, seed: ks.seed, denoise: ks.denoise,
  sampler: { steps: ks.steps, cfg: ks.cfg, sampler_name: ks.sampler_name, scheduler: ks.scheduler },
  prompt: wf.pos.inputs.text, negative: wf.neg.inputs.text,
  conditioning: { kind: 'img2img-guide', guide: `${assetId}.guide.png`, guideSha256: sha(guide) },
  rawSha256: sha(bytes), rawWidth: bytes.readUInt32BE(16), rawHeight: bytes.readUInt32BE(20),
  status: h.status?.status_str, recoveredAt: new Date().toISOString(), recoveredFromHistory: true,
};
await writeFile(path.join(work, `${assetId}.receipt.json`), JSON.stringify(receipt, null, 2));
console.log('recovered', assetId, receipt.rawWidth + 'x' + receipt.rawHeight, 'prompt', promptId);
