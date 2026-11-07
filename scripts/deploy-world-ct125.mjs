import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),stage=path.join(repo,'artifacts/ct125-world'),host='root@192.168.8.105';
function run(exe,argv,options={}){const r=spawnSync(exe,argv,{cwd:repo,stdio:'inherit',...options});if(r.status!==0)throw Error(exe+' failed');return r;}
run('node',['scripts/deploy-illustrated-world.mjs','--root',stage]);
await copyFile(path.join(repo,'scripts/rollback-illustrated-world.mjs'),path.join(stage,'rollback.mjs'));
await copyFile(path.join(repo,'ops/ct125-world-live.config.json'),path.join(stage,'live.config.json'));
for(const name of ['install-ct125-world.sh','install-world-tailnet-proxy.sh'])await writeFile(path.join(stage,name),(await readFile(path.join(repo,'ops',name),'utf8')).replace(/^\uFEFF/,'').replace(/\r\n/g,'\n'));
const selected=JSON.parse(await readFile(path.join(stage,'current.json'),'utf8'));if(!/^[a-zA-Z0-9._-]+$/.test(selected.release))throw Error('Invalid release ID');
const bundle=path.join(repo,'artifacts','nebula-world-'+selected.release+'.tar.gz'),remote='/var/tmp/nebula-world-'+selected.release+'.tar.gz';
run('tar',['-czf',bundle,'-C',stage,'current.json','server.mjs','rollback.mjs','live','live.config.json','releases/'+selected.release]);
run('scp',['-o','BatchMode=yes',bundle,host+':'+remote]);
run('scp',['-o','BatchMode=yes',path.join(stage,'install-ct125-world.sh'),host+':/var/tmp/install-ct125-world.sh']);
run('scp',['-o','BatchMode=yes',path.join(stage,'install-world-tailnet-proxy.sh'),host+':/var/tmp/install-world-tailnet-proxy.sh']);
run('ssh',['-o','BatchMode=yes',host,`pct push 125 ${remote} /tmp/nebula-world-release.tar.gz && pct push 125 /var/tmp/install-ct125-world.sh /tmp/install-ct125-world.sh && pct exec 125 -- /bin/sh /tmp/install-ct125-world.sh /tmp/nebula-world-release.tar.gz && /bin/sh /var/tmp/install-world-tailnet-proxy.sh`]);
if(process.platform==='win32')run('powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/install-world-telemetry.ps1']);
console.log('Official CT125 campus: https://rehoboam-proxmox.sphinx-scylla.ts.net:8444/');
