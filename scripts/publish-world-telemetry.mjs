// Only normalized training and GPU observations leave the workstation. No agent credentials/configs.
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),{liveTasks}=await import(pathToFileURL(path.join(root,'live/registry.mjs')).href),live=await liveTasks(path.join(root,'live.config.json'));
const tasks=Object.fromEntries(['nebula.training','host.gpu'].filter(id=>live.tasks[id]).map(id=>[id,live.tasks[id]]));
const snapshot=JSON.stringify({publishedAt:Date.now(),tasks});
const command="pct exec 125 -- /bin/sh -c 'umask 022; cat > /var/lib/nebula-world/workstation.next.json && mv /var/lib/nebula-world/workstation.next.json /var/lib/nebula-world/workstation.json'";
const r=spawnSync('ssh',['-o','BatchMode=yes','-o','ConnectTimeout=10','root@192.168.8.105',command],{input:snapshot,encoding:'utf8',timeout:25000});
if(r.status!==0)throw Error('Workstation telemetry publish failed: '+(r.stderr||r.error||'SSH failure'));console.log('Published Training/GPU telemetry to CT125');
