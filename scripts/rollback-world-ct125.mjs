import {spawnSync} from 'node:child_process';
const command='pct exec 125 -- /usr/local/bin/node /srv/nebula-world/rollback.mjs --root /srv/nebula-world';
const r=spawnSync('ssh',['-o','BatchMode=yes','root@192.168.8.105',command],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
