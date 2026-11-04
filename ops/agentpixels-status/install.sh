#!/bin/sh
# Install the Agent Pixels status exporter in the Paperclip container (run as root inside CT125).
# Remove with: systemctl disable --now agentpixels-status.timer; rm -rf /usr/local/lib/agentpixels /var/lib/agentpixels \
#   /etc/systemd/system/agentpixels-status.{service,timer}
set -eu
install -d -m 0755 /usr/local/lib/agentpixels
install -m 0755 /tmp/agentpixels-export.py /usr/local/lib/agentpixels/export.py
install -d -m 0755 -o nebulaops -g nebulaops /var/lib/agentpixels
cat > /etc/systemd/system/agentpixels-status.service <<'EOF'
[Unit]
Description=Agent Pixels status snapshot (read-only)

[Service]
Type=oneshot
User=nebulaops
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/python3 /usr/local/lib/agentpixels/export.py
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=/var/lib/agentpixels
EOF
cat > /etc/systemd/system/agentpixels-status.timer <<'EOF'
[Unit]
Description=Refresh the Agent Pixels status snapshot every minute

[Timer]
OnBootSec=1min
OnUnitActiveSec=60s
AccuracySec=5s

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now agentpixels-status.timer
systemctl start agentpixels-status.service
echo INSTALLED
