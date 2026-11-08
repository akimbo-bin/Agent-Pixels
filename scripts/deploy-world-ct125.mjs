import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),stage=path.join(repo,'artifacts/ct125-world'),host='root@192.168.8.105';
function run(exe,argv,options={}){const r=spawnSync(exe,argv,{cwd:repo,stdio:'inherit',...options});if(r.status!==0)throw Error(exe+' failed');return r;}
const disk=spawnSync('ssh',['-o','BatchMode=yes',host,'pct exec 125 -- df -Pk /srv'],{encoding:'utf8'});const freeKb=Number(disk.stdout?.trim().split('\n').at(-1)?.trim().split(/\s+/)[3]);if(disk.status!==0||!Number.isFinite(freeKb)||freeKb<512*1024)throw Error('CT125 needs at least 512 MiB free before a release. Existing deployment was left unchanged.');
run('node',['scripts/deploy-illustrated-world.mjs','--root',stage]);
await copyFile(path.join(repo,'scripts/rollback-illustrated-world.mjs'),path.join(stage,'rollback.mjs'));
await copyFile(path.join(repo,'ops/ct125-world-live.config.json'),path.join(stage,'live.config.json'));
for(const name of ['install-ct125-world.sh','install-world-tailnet-proxy.sh'])await writeFile(path.join(stage,name),(await readFile(path.join(repo,'ops',name),'utf8')).replace(/^\uFEFF/,'').replace(/\r\n/g,'\n'));
const selected=JSON.parse(await readFile(path.join(stage,'current.json'),'utf8'));if(!/^[a-zA-Z0-9._-]+$/.test(selected.release))throw Error('Invalid release ID');
const bundle=path.join(repo,'artifacts','nebula-world-'+selected.release+'.tar.gz'),remote='/var/tmp/nebula-world-'+selected.release+'.tar.gz';
run('tar',['-czf',bundle,'-C',stage,'current.json','server.mjs','listening-api.mjs','handoff-journal.mjs','rollback.mjs','live','live.config.json','releases/'+selected.release]);
run('scp',['-o','BatchMode=yes',bundle,host+':'+remote]);
run('scp',['-o','BatchMode=yes',path.join(stage,'install-ct125-world.sh'),host+':/var/tmp/install-ct125-world.sh']);
run('scp',['-o','BatchMode=yes',path.join(stage,'install-world-tailnet-proxy.sh'),host+':/var/tmp/install-world-tailnet-proxy.sh']);
// Media is a separately hashed package so frequent UI releases do not re-upload audio.
run(process.env.NEBULA_PYTHON||'python',['scripts/build-listening-catalog.py']);
const media=path.join(repo,'artifacts/listening-bundle'),mediaHash=createHash('sha256').update(await readFile(path.join(media,'catalog.json'))).digest('hex');
await writeFile(path.join(media,'catalog.sha256'),mediaHash);
const check=spawnSync('ssh',['-o','BatchMode=yes',host,'pct exec 125 -- cat /srv/nebula-world/listening/catalog.sha256'],{encoding:'utf8'});
if(check.stdout?.trim()!==mediaHash){
 const audioBundle=path.join(repo,'artifacts','nebula-listening-'+mediaHash.slice(0,12)+'.tar.gz');run('tar',['-czf',audioBundle,'-C',media,'audio','catalog.json','catalog.sha256']);
 run('scp',['-o','BatchMode=yes',audioBundle,host+':/var/tmp/nebula-listening.tar.gz']);
 run('ssh',['-o','BatchMode=yes',host,'pct push 125 /var/tmp/nebula-listening.tar.gz /tmp/nebula-listening.tar.gz && pct exec 125 -- mkdir -p /srv/nebula-world/listening && pct exec 125 -- tar -xzf /tmp/nebula-listening.tar.gz -C /srv/nebula-world/listening']);
}
run('scp',['-o','BatchMode=yes',path.join(repo,'ops/agentpixels-status/export.py'),host+':/var/tmp/nebula-dashboard-export.py']);
run('ssh',['-o','BatchMode=yes',host,'pct push 125 /var/tmp/nebula-dashboard-export.py /tmp/nebula-dashboard-export.py && pct exec 125 -- install -m 0755 /tmp/nebula-dashboard-export.py /usr/local/lib/agentpixels/export.py && pct exec 125 -- systemctl start agentpixels-status.service']);
run('ssh',['-o','BatchMode=yes',host,`pct push 125 ${remote} /tmp/nebula-world-release.tar.gz && pct push 125 /var/tmp/install-ct125-world.sh /tmp/install-ct125-world.sh && pct exec 125 -- /bin/sh /tmp/install-ct125-world.sh /tmp/nebula-world-release.tar.gz && /bin/sh /var/tmp/install-world-tailnet-proxy.sh`]);
if(process.platform==='win32')run('powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/install-world-telemetry.ps1']);
console.log('Official CT125 campus: https://rehoboam-proxmox.sphinx-scylla.ts.net:8444/');
