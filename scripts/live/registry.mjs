// Live tasks: background work (training runs, render farms, queues, CI...) made
// observable in Agent Pixels. Every source reports the SAME normalized shape,
// so any bound object in any building can show it. Real sources only: a source
// that can't be read reports state "unknown" with a reason, never a guess.
//
// A LiveTask:
//   { id, title, state: 'running'|'paused'|'waiting'|'done'|'failed'|'idle'|'unknown',
//     detail?: string, progress?: { done, total } | null,
//     metrics?: [{ label, value, max, unit? }], updatedAt?: ms, why?: string }
//
// Sources come from live.config.json (see LIVE_OBJECTS.md):
//   { "id": "...", "title": "...", "kind": "json-file", "path": "...", "map": { "state": "a.b", ... }, "states": { "raw": "running" } }
//   { "id": "...", "kind": "http-json", "url": "http://127.0.0.1:9000/status", "map": { ... } }
//   { "id": "...", "kind": "module", "module": "./adapters/x.mjs", "options": { ... } }   // exports async read(options) -> LiveTask fields
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const STATES = ['running', 'paused', 'waiting', 'done', 'failed', 'idle', 'unknown'];
const CACHE_MS = 5000;

const get = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/** Coerce whatever an adapter returned into a valid LiveTask (bad fields dropped, never invented). */
export function normalize(id, title, raw) {
  const state = STATES.includes(raw?.state) ? raw.state : 'unknown';
  const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const p = raw?.progress;
  const validProgress=p=>p&&num(p.done)!=null&&num(p.total)!=null&&p.done>=0&&p.total>0&&p.done<=p.total;
  const progress=validProgress(p)?{done:p.done,total:p.total}:null;
  const current=raw?.activity?.progress;
  const activityProgress=validProgress(current)?{done:current.done,total:current.total,unit:String(current.unit||'units').slice(0,40),updatedAt:num(current.updatedAt),source:String(current.source||'').slice(0,80)}:null;
  const metrics = Array.isArray(raw?.metrics) ? raw.metrics.filter(m => m && typeof m.label === 'string' && num(m.value) != null)
    .map(m => ({ label: m.label, value: num(m.value), max: num(m.max) ?? 100, ...(m.unit ? { unit: String(m.unit) } : {}) })) : [];
  return {
    id, title: raw?.title ?? title ?? id, state,
    detail: typeof raw?.detail === 'string' ? raw.detail : '',
    progress, metrics,
    ...(typeof raw?.workloadKey==='string'&&raw.workloadKey?{workloadKey:raw.workloadKey.slice(0,160)}:{}),
    ...(num(raw?.freshForMs)>=5000&&num(raw?.freshForMs)<=900000?{freshForMs:raw.freshForMs}:{}),
    ...(raw?.coverage?{coverage:raw.coverage}:{}),
    ...(raw?.activity?{activity:{job:raw.activity.job,kind:raw.activity.kind,label:raw.activity.label,progress:activityProgress,reason:raw.activity.reason,attempt:raw.activity.attempt}}:{}),
    ...(raw?.queue?{queue:{counts:raw.queue.counts,admissionHours:raw.queue.admissionHours,hardStopHours:raw.queue.hardStopHours,recordedHours:raw.queue.recordedHours}}:{}),
    updatedAt: num(raw?.updatedAt),
    ...(state === 'unknown' ? { why: typeof raw?.why === 'string' ? raw.why : 'source reported no state' } : {}),
  };
}

/** Field-path mapping shared by json-file and http-json sources. */
function fromMapped(doc, src) {
  const m = src.map ?? {};
  const rawState = m.state ? get(doc, m.state) : undefined;
  const state = src.states?.[rawState] ?? rawState;
  const done = m.done ? get(doc, m.done) : undefined, total = m.total ? get(doc, m.total) : undefined;
  return {
    state, detail: m.detail ? String(get(doc, m.detail) ?? '') : '',
    progress: done != null && total != null ? { done: Number(done), total: Number(total) } : null,
    metrics: (m.metrics ?? []).map(x => ({ label: x.label, value: Number(get(doc, x.path)), max: x.max ?? 100, unit: x.unit })),
    updatedAt: m.updatedAt ? Number(get(doc, m.updatedAt)) : undefined,
  };
}

async function readSource(src, baseDir) {
  try {
    if (src.kind === 'json-file') {
      const p = path.resolve(baseDir, src.path);
      const doc = JSON.parse(readFileSync(p, 'utf8'));
      return { updatedAt: statSync(p).mtimeMs, ...fromMapped(doc, src) };
    }
    if (src.kind === 'http-json') {
      const u = new URL(src.url);
      // Local network only: Agent Pixels never reaches out to the internet for status.
      if (!/^(127\.|10\.|192\.168\.|localhost$)/.test(u.hostname)) return { state: 'unknown', why: 'http-json sources must be local network' };
      const r = await fetch(u, { signal: AbortSignal.timeout(4000) });
      if (!r.ok) return { state: 'unknown', why: `HTTP ${r.status}` };
      return fromMapped(await r.json(), src);
    }
    if (src.kind === 'module') {
      const mod = await import(pathToFileURL(path.resolve(baseDir, src.module)).href);
      return await mod.read(src.options ?? {});
    }
    if (src.kind === 'unconfigured') return { state: 'unknown', why: src.why ?? 'no live source configured yet' };
    return { state: 'unknown', why: `unknown source kind ${src.kind}` };
  } catch (e) {
    return { state: 'unknown', why: String(e.message ?? e).slice(0, 120) };
  }
}

const cache = new Map();
/** All configured tasks, normalized; cached for 5 s. */
export async function liveTasks(configPath) {
  const hit = cache.get(configPath);
  if (hit && Date.now() - hit.observedAt < CACHE_MS) return hit;
  let cfg;
  try { cfg = JSON.parse(readFileSync(configPath, 'utf8')); } catch (e) { return { observedAt: Date.now(), tasks: {}, why: `no live config: ${e.message}` }; }
  const baseDir = path.dirname(configPath);
  // A source may also report sub-tasks (`tasks`, published as "<sourceId>.<key>") and organisation data (`org`).
  const tasks = {}, org = {};
  await Promise.all((cfg.sources ?? []).map(async s => {
    const raw = await readSource(s, baseDir);
    tasks[s.id] = normalize(s.id, s.title, raw);
    for (const [k, t] of Object.entries(raw?.tasks ?? {})) tasks[`${s.id}.${k}`] = normalize(`${s.id}.${k}`, t?.title, t);
    if (raw?.org) org[s.id] = raw.org;
  }));
  const result = { observedAt: Date.now(), tasks, org };
  cache.set(configPath, result);
  return result;
}
