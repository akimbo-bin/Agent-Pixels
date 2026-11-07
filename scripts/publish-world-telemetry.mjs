import {readFileSync,statSync} from 'node:fs';
// Only normalized training and GPU observations leave the workstation. No agent credentials/configs.
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),{liveTasks}=await import(pathToFileURL(path.join(root,'live/registry.mjs')).href),live=await liveTasks(path.join(root,'live.config.json'));
const tasks=Object.fromEntries(['nebula.training','host.gpu'].filter(id=>live.tasks[id]).map(id=>[id,live.tasks[id]]));
const cacheFile=path.join(root,'render-counts-cache.json'),count=spawnSync(process.execPath,[path.join(root,'live/render-counts-cli.mjs'),cacheFile],{encoding:'utf8',timeout:10000,maxBuffer:1<<20,windowsHide:true});
try{if(count.status!==0)throw Error('counter timeout');tasks['nebula.renders']=JSON.parse(count.stdout);}catch{let cohorts=[];try{cohorts=JSON.parse(readFileSync(cacheFile,'utf8')).map(({id,...c})=>c);}catch{}tasks['nebula.renders']={state:'unknown',why:'Render sources unavailable; retaining known counts',metrics:cohorts.length?[{label:'Tracked renders',value:cohorts.reduce((n,c)=>n+c.count,0)}]:[],coverage:{complete:false,cohorts,errors:['Render source read timed out or failed']},updatedAt:cohorts.length?statSync(cacheFile).mtimeMs:null};}

const snapshot=JSON.stringify({publishedAt:Date.now(),tasks});
const command="pct exec 125 -- /bin/sh -c 'umask 022; cat > /var/lib/nebula-world/workstation.next.json && mv /var/lib/nebula-world/workstation.next.json /var/lib/nebula-world/workstation.json'";
const r=spawnSync('ssh',['-o','BatchMode=yes','-o','ConnectTimeout=10','root@192.168.8.105',command],{input:snapshot,encoding:'utf8',timeout:25000});
if(r.status!==0)throw Error('Workstation telemetry publish failed: '+(r.stderr||r.error||'SSH failure'));console.log('Published Training/GPU telemetry to CT125');
