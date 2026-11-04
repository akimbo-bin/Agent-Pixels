// Builds the Office Builder dev harness and (unless --build-only) serves it on
// loopback only. Usage: node scripts/engine-dev.mjs [--port 8790] [--build-only]
import { build } from 'esbuild';
import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAssetIndex } from './asset-index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const devDir = path.join(root, 'dev', 'engine');
const out = path.join(devDir, 'dist');
const assets = path.join(root, 'public', 'assets');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 8790;

await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'agent-pixels-assets.json'), JSON.stringify(await buildAssetIndex(assets)));
await build({
  entryPoints: [path.join(devDir, 'main.ts')], outfile: path.join(out, 'app.js'), bundle: true, format: 'esm',
  platform: 'browser', target: 'es2022', sourcemap: true, logLevel: 'info',
  define: { 'process.env.NODE_ENV': '"development"' },
});
if (args.includes('--build-only')) process.exit(0);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.map': 'application/json', '.webm': 'video/webm', '.mp4': 'video/mp4' };
/** Resolve a URL path inside one allowed root, refusing traversal. */
function inside(base, rel) {
  const p = path.resolve(base, rel);
  return p === base || p.startsWith(base + path.sep) ? p : null;
}
http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let name = decodeURIComponent(url.pathname);
  let file = null;
  if (name === '/' || name === '/index.html') file = path.join(devDir, 'index.html');
  else if (name === '/style.css') file = path.join(devDir, 'style.css');
  else if (name === '/evidence' || name === '/evidence.html') file = path.join(devDir, 'evidence.html');
  else if (name === '/app.js' || name === '/app.js.map') file = path.join(out, name.slice(1));
  else if (name === '/assets/agent-pixels-assets.json') file = path.join(out, 'agent-pixels-assets.json');
  else if (name.startsWith('/assets/')) file = inside(assets, name.slice('/assets/'.length));
  else if (name.startsWith('/packs/')) file = inside(path.join(devDir, 'packs'), name.slice('/packs/'.length));
  else if (name.startsWith('/review/')) file = inside(path.join(devDir, 'review'), name.slice('/review/'.length));
  try {
    if (!file) throw Error('not found');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Office Builder: http://127.0.0.1:${port}/`));
