import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
// @ts-expect-error plain ESM module without types
import { liveTasks, normalize } from '../../scripts/live/registry.mjs';

describe('live tasks', () => {
  test('normalize never invents: bad state becomes unknown with a reason; bad fields are dropped', () => {
    const t = normalize('x', 'X', { state: 'exploding', progress: { done: 'a', total: 3 }, metrics: [{ label: 'GPU', value: 'hot' }] });
    assert.equal(t.state, 'unknown');
    assert.ok(t.why);
    assert.equal(t.progress, null);
    assert.deepEqual(t.metrics, []);
  });

  test('json-file sources map fields by path; http sources must be local network', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ap-live-'));
    writeFileSync(path.join(dir, 'job.json'), JSON.stringify({ run: { phase: 'train', step: 'epoch 3', n: 30, of: 100 } }));
    writeFileSync(path.join(dir, 'live.config.json'), JSON.stringify({ sources: [
      { id: 'job', kind: 'json-file', path: 'job.json', map: { state: 'run.phase', detail: 'run.step', done: 'run.n', total: 'run.of' }, states: { train: 'running' } },
      { id: 'remote', kind: 'http-json', url: 'http://example.com/status', map: {} },
      { id: 'later', kind: 'unconfigured', why: 'not wired' },
    ] }));
    const { tasks } = await liveTasks(path.join(dir, 'live.config.json'));
    assert.equal(tasks.job.state, 'running');
    assert.equal(tasks.job.detail, 'epoch 3');
    assert.deepEqual(tasks.job.progress, { done: 30, total: 100 });
    assert.equal(tasks.remote.state, 'unknown');
    assert.match(tasks.remote.why, /local network/);
    assert.equal(tasks.later.why, 'not wired');
  });
});
