// Live adapter: the Nebula training queue on this PC (read-only files).
// options: { base: "C:/NebulaResearch/train", queue: "neb318" }
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const lines = (p, n) => readFileSync(p, 'utf8').trim().split('\n').slice(-n).map(l => JSON.parse(l));

export async function read({ base = 'C:/NebulaResearch/train', queue = 'neb318' }) {
  const q = path.join(base, queue), statusPath = path.join(q, 'status.json');
  if (!existsSync(statusPath)) return { state: 'unknown', why: `${statusPath} missing` };
  const status = JSON.parse(readFileSync(statusPath, 'utf8'));
  const jobs = JSON.parse(readFileSync(path.join(q, 'queue.json'), 'utf8'));
  const total = (Array.isArray(jobs) ? jobs : jobs.jobs ?? []).length;
  const done = new Set(lines(path.join(q, 'gpu_ledger.jsonl'), 5000).filter(r => r.outcome === 'done').map(r => r.job)).size;
  const last = existsSync(path.join(q, 'smoke.jsonl')) ? lines(path.join(q, 'smoke.jsonl'), 1)[0] : null;
  const paused = existsSync(path.join(base, 'PAUSE'));
  let state = status.state === 'done' ? 'done' : status.state === 'failed' ? 'failed' : status.state === 'running' ? 'running' : 'unknown';
  let detail = status.step ?? '';
  if (state === 'running' && paused) state = 'paused';
  else if (state === 'running' && last?.event === 'blocked') { state = 'waiting'; detail = `${detail} (${(last.held ?? []).map(h => h.reason).join(', ')})`; }
  return { state, detail, progress: total ? { done, total } : null, updatedAt: statSync(statusPath).mtimeMs };
}
