// Live adapter: the Paperclip organisation snapshot (ops/agentpixels-status), read over a
// dedicated SSH key whose only permitted command prints that file.
// options: { host: "192.168.8.105", user: "root", key: "~/.ssh/agentpixels_status", staleAfterMs: 180000 }
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';

const JOB_STATE = { running: 'running', done: 'done', completed: 'done', failed: 'failed', error: 'failed', paused: 'paused', idle: 'idle', queued: 'waiting', waiting: 'waiting' };

function snapshot({ file, host = '192.168.8.105', user = 'root', key = '~/.ssh/agentpixels_status' }) {
  if(file)return readFile(file,'utf8').then(JSON.parse);
  return new Promise((res, rej) => execFile('ssh', ['-i', key.replace(/^~/, homedir()), '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=5', `${user}@${host}`], { timeout: 15000, maxBuffer: 4 << 20 }, (err, out) => {
    if (err) return rej(new Error(`snapshot unavailable (${err.code ?? err.signal ?? 'ssh'})`));
    try { res(JSON.parse(out)); } catch { rej(new Error('snapshot is not JSON')); }
  }));
}

export async function read(options = {}) {
  const snap = await snapshot(options);
  const age = Date.now() - Date.parse(snap.exportedAt);
  const fresh = age < (options.staleAfterMs ?? 180000);
  const tasks = {};
  for (const j of snap.jobs ?? []) {
    const state = 'unknown'; // A registration is not evidence of execution.
    tasks[`job.${j.ticket}`] = { workloadKey: `${String(j.machine||'').toLowerCase()}/${j.ticket}`, title: `${j.ticket} (${j.agent})`, state, detail: `${j.agent} on ${j.machine}`,
      updatedAt: Date.parse(j.checked), freshForMs: 600000, ...(state === 'unknown' ? { why: `${j.state}: ${j.detail ?? ''}`.slice(0, 120) } : {}) };
  }
  for (const [name, m] of Object.entries(snap.machines ?? {})) {
    tasks[`machine.${name}`] = { title: name, state: m.ok ? 'running' : 'failed', detail: m.ok ? 'online' : (m.detail ?? 'unhealthy'), updatedAt: Date.parse(m.checked), freshForMs: 600000 };
  }
  return {
    state: fresh&&snap.company?.id&&Array.isArray(snap.agents)&&!snap.errors?.length ? 'running' : 'unknown', detail: `${(snap.agents ?? []).length} agents`, updatedAt: Date.parse(snap.exportedAt),
    ...(fresh ? {} : { why: `snapshot is ${Math.round(age / 1000)} s old` }),
    ...(snap.errors?.length ? { why: snap.errors.join('; ') } : {}),
    tasks,
    org: { company: snap.company ?? null, exportedAt: snap.exportedAt, agents: snap.agents ?? [], workboard:snap.workboard??null, liveRuns:snap.liveRuns??null, attention:snap.attention??null, inbox:snap.inbox??null, dashboard:snap.dashboard??null, activity:snap.activity??[], errors:snap.errors??[] },
  };
}
