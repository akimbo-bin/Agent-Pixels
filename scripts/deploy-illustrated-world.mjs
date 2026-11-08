// Build a versioned portable release and atomically promote it. Server reads the pointer per request.
import {readFile,writeFile,mkdir,copyFile,rename,cp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2),i=args.indexOf('--root'),root=path.resolve(i<0?path.join(repo,'release/world'):args[i+1]);
const build=spawnSync(process.env.NEBULA_PYTHON||'python',['scripts/build-illustrated-editor.py','--serve-copy'],{cwd:repo,stdio:'inherit'});if(build.status!==0)throw Error('World build failed');
const html=await readFile(path.join(repo,'dev/engine/illustrated-walk-prototype.html')),sha=createHash('sha256').update(html).digest('hex'),git=spawnSync('git',['rev-parse','--short','HEAD'],{cwd:repo,encoding:'utf8'}).stdout.trim(),id=`${git}-${sha.slice(0,12)}`,dir=path.join(root,'releases',id);
await mkdir(dir,{recursive:true});await cp(path.join(repo,'public/assets/nebula-app'),dir,{recursive:true});await writeFile(path.join(dir,'index.html'),html);await writeFile(path.join(dir,'index.html.gz'),gzipSync(html,{level:6}));
try{const old=await readFile(path.join(repo,'../AgentPixelsEngine/dev/engine/review/illustrated-walk/previous.html'));await writeFile(path.join(dir,'previous.html'),old);await writeFile(path.join(dir,'previous.html.gz'),gzipSync(old));}catch{}
const manifest={application:'nebula-illustrated-world',release:id,commit:git,sha256:sha,builtAt:new Date().toISOString(),entry:'/',telemetry:'/live'};await writeFile(path.join(dir,'release.json'),JSON.stringify(manifest,null,2));
await mkdir(root,{recursive:true});await cp(path.join(repo,'scripts/live'),path.join(root,'live'),{recursive:true});try{await statConfig();}catch{await copyFile(path.join(repo,'ops/world-live.config.json'),path.join(root,'live.config.json'));}
async function statConfig(){await readFile(path.join(root,'live.config.json'));}await copyFile(path.join(repo,'scripts/nebula-world-server.mjs'),path.join(root,'server.mjs'));await copyFile(path.join(repo,'scripts/listening-api.mjs'),path.join(root,'listening-api.mjs'));
let previous=null;try{const old=JSON.parse(await readFile(path.join(root,'current.json'),'utf8'));previous=old.release===id?old.previous:old.release;}catch{}
await writeFile(path.join(root,'current.next.json'),JSON.stringify({release:id,previous}));await rename(path.join(root,'current.next.json'),path.join(root,'current.json'));
console.log(`Official release ${id}\nHost: node "${path.join(root,'server.mjs')}" --root "${root}"\nNo server restart needed for future artwork/UI updates.`);
