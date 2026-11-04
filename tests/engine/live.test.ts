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

describe('live roster', async () => {
  const { presenceOf, rosterAgents, rosterKey } = await import('../../src/office/world/roster.js');
  const { nebulaCampusSample } = await import('../../src/office/world/templates.js');
  const { BUILDING_KITS } = await import('../../src/office/world/kits.js');
  const { compileWorld } = await import('../../src/office/world/compiler.js');
  await (await import('./helpers.js')).loadCatalog();
  (await import('../../src/office/assets/definitions.js')).registerFurnitureDefinitions(1);
  const roster = BUILDING_KITS.find(b => b.building === 'nebula-campus')!.roster!;
  const org = [
    { id: 'a1', name: 'Reviewer', status: 'paused' }, { id: 'a2', name: 'Reviewer-Sol-P', status: 'idle' },
    { id: 'a3', name: 'Reviewer-Sol-B', status: 'idle', issue: { key: 'NEB-1', title: 't', status: 'in_progress', running: true } },
    { id: 'a4', name: 'Reviewer-Opus', status: 'idle' }, { id: 'a5', name: 'Someone New', status: 'idle' },
  ];

  test('presence comes from status and the current ticket, never guessed', () => {
    assert.equal(presenceOf(org[0]), 'paused');
    assert.equal(presenceOf(org[1]), 'idle');
    assert.equal(presenceOf(org[2]), 'running');
    assert.equal(presenceOf({ id: 'x', name: 'x', status: 'idle', issue: { key: 'K', title: null, status: 'in_progress', running: false } }), 'waiting');
    assert.equal(presenceOf({ id: 'x', name: 'x', status: 'weird' }), 'unknown');
  });

  test('members get their kit room, distinct free chairs, and unnamed members land in the default room', () => {
    const w = nebulaCampusSample();
    const agents = rosterAgents(w, org, roster);
    assert.equal(agents.length, 5);
    const seats = agents.map(a => a.seatId).filter(Boolean);
    assert.equal(new Set(seats).size, seats.length);
    assert.equal(agents.filter(a => a.roomId === 'review').length, 4);
    assert.equal(agents.find(a => a.name === 'Someone New')!.roomId, roster.defaultRoom);
    w.agents = agents;
    assert.doesNotThrow(() => compileWorld(w));
    assert.equal(rosterKey(org), rosterKey([...org].reverse()));
  });
});
