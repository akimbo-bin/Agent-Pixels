import {listeningApi} from './listening-api.mjs';
// Portable, dependency-free official world host. Exposes only the release and read-only telemetry.
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const root=path.resolve(arg('--root',path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../release/world'))),host=arg('--host','127.0.0.1'),port=Number(arg('--port','8791')),upstream=new URL(arg('--live-upstream','http://127.0.0.1:8790/live'));
if(!['http:','https:'].includes(upstream.protocol))throw Error('Live upstream must use HTTP(S)');
const localLive=args.includes('--live-upstream')?null:await import(pathToFileURL(path.join(root,'live/registry.mjs')).href);
const handleListening=listeningApi(root);
let cached=null,inflight=null;
async function live(){if(cached&&Date.now()-cached.at<4000)return cached.body;if(!inflight)inflight=(async()=>{if(localLive){const body=await localLive.liveTasks(path.join(root,'live.config.json'));cached={at:Date.now(),body:JSON.stringify(body)};return cached.body;}const r=await fetch(upstream,{signal:AbortSignal.timeout(8000),headers:{accept:'application/json'}});if(!r.ok)throw Error('Telemetry upstream unavailable');const body=await r.json();if(!body.tasks||typeof body.tasks!=='object')throw Error('Invalid telemetry');cached={at:Date.now(),body:JSON.stringify(body)};return cached.body;})().finally(()=>inflight=null);return inflight;}
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Cache-Control','no-cache');
 if(await handleListening(req,res,url))return;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
 if(url.pathname==='/live'){try{const body=await live();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?'':body);}catch{res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Live source unavailable',tasks:{}}));}return;}
 const selected=JSON.parse(await readFile(path.join(root,'current.json'),'utf8'));
 if(!/^[a-zA-Z0-9._-]+$/.test(selected.release))throw Error('Invalid release pointer');
 const dir=path.join(root,'releases',selected.release);
 if(url.pathname==='/health'){await stat(path.join(dir,'index.html'));res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({status:'ok',application:'nebula-illustrated-world',release:selected.release}));return;}
 if(['/review/illustrated-walk/index.html','/index.html','/world','/world/'].includes(url.pathname)){res.writeHead(307,{Location:'/'+url.search});res.end();return;}
 const files={'/':'index.html','/release.json':'release.json','/previous.html':'previous.html','/apple-touch-icon.png':'apple-touch-icon.png','/icon-192.png':'icon-192.png','/icon-512.png':'icon-512.png','/manifest.webmanifest':'manifest.webmanifest'};const file=files[url.pathname];if(!file){res.writeHead(404);res.end('Not found');return;}
 const etag='\"'+selected.release+'-'+file+'\"';res.setHeader('ETag',etag);if(req.headers['if-none-match']===etag){res.writeHead(304);res.end();return;}
 const gz=file.endsWith('.html')&&/\bgzip\b/.test(req.headers['accept-encoding']||'');let body;try{body=await readFile(path.join(dir,file+(gz?'.gz':'')));}catch{if(file==='previous.html'){res.writeHead(404);res.end('The previous map is available in the desktop editor.');return;}throw Error('Release file missing');}
 res.writeHead(200,{'Content-Type':file.endsWith('.png')?'image/png':file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.json')?'application/json':'text/html; charset=utf-8',...(gz?{'Content-Encoding':'gzip'}:{}),Vary:'Accept-Encoding','Content-Length':body.length});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(503,{'Content-Type':'text/plain'});res.end('Nebula is updating. Please retry shortly.');}
}).listen(port,host,()=>console.log(`Nebula official world: http://${host}:${port}`));
