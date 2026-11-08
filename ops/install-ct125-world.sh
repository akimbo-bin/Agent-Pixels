#!/bin/sh
set -eu
bundle=$1
root=/srv/nebula-world
id nebula-world >/dev/null 2>&1 || useradd --system --home-dir /var/lib/nebula-world --shell /usr/sbin/nologin nebula-world
install -d -m 0755 "$root" /var/lib/nebula-world
runtime_hash(){ (find "$root/live" -type f 2>/dev/null; printf '%s\n' "$root/server.mjs" "$root/listening-api.mjs" "$root/handoff-journal.mjs" "$root/live.config.json") | sort | xargs -r sha256sum 2>/dev/null | sha256sum | cut -d' ' -f1; }
old_server=$(runtime_hash)
# The active pointer is promoted separately after all referenced files exist.
tar -xzf "$bundle" -C "$root" --exclude=current.json
new_server=$(runtime_hash)
python3 - "$bundle" "$root" <<'PY'
import tarfile,json,sys,os
from pathlib import Path
bundle,root=sys.argv[1],Path(sys.argv[2])
with tarfile.open(bundle) as t: new=json.load(t.extractfile('current.json'))
old=json.loads((root/'current.json').read_text()) if (root/'current.json').exists() else {}
new['previous']=old.get('release') if old.get('release')!=new['release'] else old.get('previous')
(root/'current.next.json').write_text(json.dumps(new));os.replace(root/'current.next.json',root/'current.json')
PY
chown -R root:root "$root"
chmod -R go-w "$root"
install -d -m 0750 -o nebula-world -g nebula-world /var/lib/nebula-world/listening-state
if [ ! -e "$root/listening-state" ]; then ln -s /var/lib/nebula-world/listening-state "$root/listening-state"; fi
install -d -m 0750 -o nebula-world -g nebula-world /var/lib/nebula-world/handoff-state
if [ ! -e "$root/handoff-state" ]; then ln -s /var/lib/nebula-world/handoff-state "$root/handoff-state"; fi
cat >/etc/systemd/system/nebula-world.service <<'UNIT'
[Unit]
Description=Nebula illustrated campus (official)
After=network.target
[Service]
User=nebula-world
Group=nebula-world
WorkingDirectory=/srv/nebula-world
ExecStart=/usr/local/bin/node /srv/nebula-world/server.mjs --root /srv/nebula-world --host 192.168.8.113 --port 8791
Restart=on-failure
RestartSec=3
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/nebula-world/listening-state /var/lib/nebula-world/handoff-state
PrivateTmp=yes
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable nebula-world.service
if systemctl is-active --quiet nebula-world.service && [ "$old_server" = "$new_server" ]; then :; else systemctl restart nebula-world.service; fi
