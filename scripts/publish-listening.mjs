// Publish the blinded listening catalog and its audio to CT125 (ops/CLAUDE_LISTENING_COORDINATION.md).
// Builds the catalog (fixed packets + ops/listening/publications), then on CT125: unpack into a temp dir, verify every
// referenced audio hash, add audio by hash (never deleting any: saved reviews may point at it), keep catalog.prev.json
// for rollback, and atomically rename the new catalog into place. Called by deploy-world-ct125.mjs; also runs alone:
// npm run world:publish-listening. Rollback: cp /srv/nebula-world/listening/catalog.prev.json over catalog.json.
import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),host='root@192.168.8.105';
function run(exe,argv,options={}){const r=spawnSync(exe,argv,{cwd:repo,stdio:'inherit',...options});if(r.status!==0)throw Error(exe+' failed');return r;}
run(process.env.NEBULA_PYTHON||'python',['scripts/build-listening-catalog.py']);
const media=path.join(repo,'artifacts/listening-bundle'),mediaHash=createHash('sha256').update(await readFile(path.join(media,'catalog.json'))).digest('hex');
await writeFile(path.join(media,'catalog.sha256'),mediaHash);
const check=spawnSync('ssh',['-o','BatchMode=yes',host,'pct exec 125 -- cat /srv/nebula-world/listening/catalog.sha256'],{encoding:'utf8'});
if(check.stdout?.trim()===mediaHash){console.log('Listening catalog unchanged:',mediaHash.slice(0,12));process.exit(0);}
// Reject publication of a form the deployed API cannot validate.
const catalog=JSON.parse(await readFile(path.join(media,'catalog.json'),'utf8')),modes=new Set(catalog.packets.map(p=>p.review?.mode||'pick'));
if([...modes].some(m=>m!=='pick')){const r=await fetch('https://rehoboam-proxmox.sphinx-scylla.ts.net:8444/api/listening',{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Cannot verify listening review capabilities');const live=await r.json();if([...modes].some(m=>!(live.reviewModes||['pick']).includes(m)))throw Error('Deploy the compatible listening review API before publishing this catalog');}
const remote=`set -eu
B=/tmp/nebula-listening.tar.gz; L=/srv/nebula-world/listening; S=$(mktemp -d /tmp/nebula-listening-stage.XXXXXX)
trap 'rm -rf "$S"' EXIT
tar -xzf "$B" -C "$S"
python3 - "$S" "$L" <<'PY'
import hashlib, json, os, shutil, sys
s, l = sys.argv[1:]
h = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
cat = json.load(open(os.path.join(s, 'catalog.json')))
names = {c['audio'] for p in cat['packets'] for t in p['trials'] for c in t['clips']}
os.makedirs(os.path.join(l, 'audio'), exist_ok=True)
for n in sorted(names):
    src, dst = os.path.join(s, 'audio', n), os.path.join(l, 'audio', n)
    if os.path.exists(dst):
        if h(dst) != n[:-4]:
            sys.exit('live audio ' + n + ' does not match its name')
        continue
    if not os.path.exists(src) or h(src) != n[:-4]:
        sys.exit('bundle audio ' + n + ' is missing or does not match its name')
    shutil.copyfile(src, dst + '.tmp'); os.chmod(dst + '.tmp', 0o644); os.replace(dst + '.tmp', dst)
cur = os.path.join(l, 'catalog.json')
if os.path.exists(cur):
    shutil.copyfile(cur, os.path.join(l, 'catalog.prev.json'))
for name in ('catalog.json', 'catalog.sha256'):
    shutil.copyfile(os.path.join(s, name), os.path.join(l, name + '.next')); os.chmod(os.path.join(l, name + '.next'), 0o644)
    os.replace(os.path.join(l, name + '.next'), os.path.join(l, name))
print('published', len(cat['packets']), 'packets,', len(names), 'audio files')
PY
`;
await writeFile(path.join(media,'..','publish-listening.sh'),remote);
const audioBundle=path.join(repo,'artifacts','nebula-listening-'+mediaHash.slice(0,12)+'.tar.gz');run('tar',['-czf',audioBundle,'-C',media,'audio','catalog.json','catalog.sha256']);
run('scp',['-o','BatchMode=yes',audioBundle,host+':/var/tmp/nebula-listening.tar.gz']);
run('scp',['-o','BatchMode=yes',path.join(media,'..','publish-listening.sh'),host+':/var/tmp/publish-listening.sh']);
run('ssh',['-o','BatchMode=yes',host,'pct push 125 /var/tmp/nebula-listening.tar.gz /tmp/nebula-listening.tar.gz && pct push 125 /var/tmp/publish-listening.sh /tmp/publish-listening.sh && pct exec 125 -- sh /tmp/publish-listening.sh']);
console.log('Listening catalog published:',mediaHash.slice(0,12));
