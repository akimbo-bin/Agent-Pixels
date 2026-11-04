// Model bake-off: renders the same engine guides through several image models
// (each wired as its maker's ComfyUI template does) and writes one PNG plus a
// provenance receipt per job. Loopback ComfyUI only.
//
// usage: node scripts/kit/bakeoff.mjs <bakeoff.json> <work_dir> [jobId ...]
//
// Job kinds:
//   klein-edit     FLUX.2-klein: empty latent, references [guide, style...] (layout and style from images)
//   klein-img2img  FLUX.2-klein: paint over the guide (denoise), style references
//   zimage-cn      Z-Image Turbo: paint over the guide, locked to an edge map with the Fun ControlNet Union
//   schnell        FLUX.1-schnell: paint over the guide, style from the prompt only
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.COMFY_URL || 'http://127.0.0.1:8188';
assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin), 'ComfyUI must be addressed on loopback only');
const [cfgPath, work, ...only] = process.argv.slice(2);
const cfg = JSON.parse(await readFile(cfgPath, 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
const get = async p => { const r = await fetch(origin + p); if (!r.ok) throw Error(`GET ${p} -> ${r.status}`); return r.json(); };

async function upload(file) {
  const bytes = await readFile(path.join(work, file));
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: 'image/png' }), `ap-bake-${file}`);
  form.append('overwrite', 'true');
  const r = await fetch(origin + '/upload/image', { method: 'POST', body: form });
  assert.ok(r.ok, `upload ${file} failed`);
  return { name: (await r.json()).name, sha256: sha(bytes) };
}

const r16 = v => Math.max(16, Math.floor(v / 16) * 16);

function workflow(job, img) {
  const W = r16(job.width), H = r16(job.height), seed = job.seed;
  const wf = {};
  const add = (id, class_type, inputs) => { wf[id] = { class_type, inputs }; return [id, 0]; };
  const save = dec => add('save', 'SaveImage', { images: dec, filename_prefix: `AgentPixelsBake_${job.id}` });

  if (job.kind === 'klein-edit' || job.kind === 'klein-img2img') {
    const unet = add('unet', 'UNETLoader', { unet_name: cfg.models.klein, weight_dtype: 'default' });
    const clip = add('clip', 'CLIPLoader', { clip_name: cfg.models.qwen, type: 'flux2', device: 'default' });
    const vae = add('vae', 'VAELoader', { vae_name: cfg.models.flux2vae });
    let pos = add('pos', 'CLIPTextEncode', { text: job.prompt, clip });
    let neg = add('neg', 'ConditioningZeroOut', { conditioning: pos });
    const refs = job.kind === 'klein-edit' ? [img.guide, ...img.refs] : img.refs;
    refs.forEach((r, i) => {
      const load = add(`rl${i}`, 'LoadImage', { image: r.name });
      const sc = add(`rs${i}`, 'ImageScaleToTotalPixels', { image: load, upscale_method: 'nearest-exact', megapixels: job.refMegapixels ?? 1, resolution_steps: 1 });
      const lat = add(`re${i}`, 'VAEEncode', { pixels: sc, vae });
      pos = add(`rp${i}`, 'ReferenceLatent', { conditioning: pos, latent: lat });
      neg = add(`rn${i}`, 'ReferenceLatent', { conditioning: neg, latent: lat });
    });
    let latent, sigmas = add('sched', 'Flux2Scheduler', { steps: job.steps ?? 4, width: W, height: H });
    if (job.kind === 'klein-img2img') {
      const g = add('gl', 'LoadImage', { image: img.guide.name });
      const gs = add('gs', 'ImageScale', { image: g, upscale_method: 'nearest-exact', width: W, height: H, crop: 'disabled' });
      latent = add('genc', 'VAEEncode', { pixels: gs, vae });
      add('split', 'SplitSigmasDenoise', { sigmas, denoise: job.denoise });
      sigmas = ['split', 1];
    } else latent = add('empty', 'EmptyFlux2LatentImage', { width: W, height: H, batch_size: 1 });
    const guider = add('guider', 'CFGGuider', { model: unet, positive: pos, negative: neg, cfg: 1 });
    const sampler = add('sampler', 'KSamplerSelect', { sampler_name: 'euler' });
    const noise = add('noise', 'RandomNoise', { noise_seed: seed });
    const out = add('sca', 'SamplerCustomAdvanced', { noise, guider, sampler, sigmas, latent_image: latent });
    save(add('dec', 'VAEDecode', { samples: out, vae }));
    return wf;
  }

  if (job.kind === 'zimage-cn') {
    let model = add('unet', 'UNETLoader', { unet_name: cfg.models.zimage, weight_dtype: 'default' });
    const clip = add('clip', 'CLIPLoader', { clip_name: cfg.models.qwen, type: 'lumina2', device: 'default' });
    const vae = add('vae', 'VAELoader', { vae_name: cfg.models.ae });
    model = add('shift', 'ModelSamplingAuraFlow', { model, shift: 3 });
    const patch = add('patch', 'ModelPatchLoader', { name: cfg.models.zimageControl });
    const edge = add('edge', 'LoadImage', { image: img.edges.name });
    const edgeS = add('edges', 'ImageScale', { image: edge, upscale_method: 'nearest-exact', width: W, height: H, crop: 'disabled' });
    model = add('cn', 'QwenImageDiffsynthControlnet', { model, model_patch: patch, vae, image: edgeS, strength: job.control ?? 0.8 });
    const pos = add('pos', 'CLIPTextEncode', { text: job.prompt, clip });
    const neg = add('neg', 'ConditioningZeroOut', { conditioning: pos });
    const g = add('gl', 'LoadImage', { image: img.guide.name });
    const gs = add('gs', 'ImageScale', { image: g, upscale_method: 'nearest-exact', width: W, height: H, crop: 'disabled' });
    const latent = add('genc', 'VAEEncode', { pixels: gs, vae });
    const out = add('ks', 'KSampler', { model, positive: pos, negative: neg, latent_image: latent, seed, steps: job.steps ?? 8, cfg: 1, sampler_name: 'res_multistep', scheduler: 'simple', denoise: job.denoise });
    save(add('dec', 'VAEDecode', { samples: out, vae }));
    return wf;
  }

  if (job.kind === 'schnell') {
    add('ckpt', 'CheckpointLoaderSimple', { ckpt_name: cfg.models.schnell });
    const pos = add('pos', 'CLIPTextEncode', { text: job.prompt, clip: ['ckpt', 1] });
    const neg = add('neg', 'ConditioningZeroOut', { conditioning: pos });
    const g = add('gl', 'LoadImage', { image: img.guide.name });
    const gs = add('gs', 'ImageScale', { image: g, upscale_method: 'nearest-exact', width: W, height: H, crop: 'disabled' });
    const latent = add('genc', 'VAEEncode', { pixels: gs, vae: ['ckpt', 2] });
    const out = add('ks', 'KSampler', { model: ['ckpt', 0], positive: pos, negative: neg, latent_image: latent, seed, steps: job.steps ?? 4, cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise: job.denoise });
    save(add('dec', 'VAEDecode', { samples: out, vae: ['ckpt', 2] }));
    return wf;
  }
  throw Error(`unknown kind ${job.kind}`);
}

const stats = await get('/system_stats');
for (const job of cfg.jobs) {
  if (only.length && !only.includes(job.id)) continue;
  const q = await get('/queue');
  assert.equal(q.queue_running.length + q.queue_pending.length, 0, 'ComfyUI queue is busy; refusing to contend');
  const img = {
    guide: await upload(job.guide),
    refs: await Promise.all((job.refs ?? []).map(upload)),
    edges: job.edges ? await upload(job.edges) : null,
  };
  const wf = workflow(job, img);
  const started = Date.now();
  const res = await fetch(origin + '/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: wf, client_id: 'agentpixels-bakeoff' }) });
  const queued = await res.json();
  if (!res.ok || !queued.prompt_id) { console.log(`REJECTED ${job.id}: ${JSON.stringify(queued).slice(0, 600)}`); continue; }
  let image, status;
  while (Date.now() - started < 30 * 60 * 1000) {
    await new Promise(r => setTimeout(r, 2000));
    const rec = (await get('/history/' + queued.prompt_id))[queued.prompt_id];
    if (!rec) continue;
    status = rec.status?.status_str;
    if (status === 'error') break;
    image = rec.outputs?.save?.images?.[0];
    if (image) break;
  }
  if (!image) { console.log(`FAILED ${job.id}: ${status}`); continue; }
  const view = await fetch(origin + '/view?' + new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || '', type: image.type }));
  const bytes = Buffer.from(await view.arrayBuffer());
  await writeFile(path.join(work, `${job.id}.png`), bytes);
  const receipt = {
    ...job, models: cfg.models, comfyui: stats.system.comfyui_version, device: stats.devices[0].name,
    inputs: { guide: img.guide.sha256, refs: img.refs.map(r => r.sha256), edges: img.edges?.sha256 },
    outputSha256: sha(bytes), elapsedSeconds: Math.round((Date.now() - started) / 1000), generatedAt: new Date().toISOString(),
  };
  await writeFile(path.join(work, `${job.id}.receipt.json`), JSON.stringify(receipt, null, 2));
  console.log(`done ${job.id} in ${receipt.elapsedSeconds}s`);
}
