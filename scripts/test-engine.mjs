// Bundles tests/engine/*.test.ts with esbuild and runs them with node:test.
import { build } from 'esbuild';
import { readdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'tests', 'engine');
const only = process.argv.slice(2);
const files = (await readdir(dir)).filter(f => f.endsWith('.test.ts') && (!only.length || only.some(o => f.includes(o))));
const out = await mkdtemp(path.join(os.tmpdir(), 'ap-engine-tests-'));
try {
  await build({
    entryPoints: files.map(f => path.join(dir, f)), outdir: out, bundle: true, platform: 'node', format: 'esm',
    target: 'node20', outExtension: { '.js': '.mjs' }, logLevel: 'warning', sourcemap: 'inline',
  });
  const res = spawnSync(process.execPath, ['--enable-source-maps', '--test', ...files.map(f => path.join(out, f.replace(/\.ts$/, '.mjs')))],
    { stdio: 'inherit', env: { ...process.env, ENGINE_ROOT: root } });
  process.exitCode = res.status ?? 1;
} finally {
  await rm(out, { recursive: true, force: true });
}
