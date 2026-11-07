#!/bin/sh
set -eu
# Loopback proxy keeps Tailscale on the existing Proxmox host, without a new tailnet login in CT125.
cat >/etc/systemd/system/nebula-world-proxy.socket <<'UNIT'
[Unit]
Description=Nebula campus loopback proxy
[Socket]
ListenStream=127.0.0.1:13126
[Install]
WantedBy=sockets.target
UNIT
cat >/etc/systemd/system/nebula-world-proxy.service <<'UNIT'
[Unit]
Description=Forward Nebula campus to CT125
[Service]
ExecStart=/lib/systemd/systemd-socket-proxyd 192.168.8.113:8791
DynamicUser=yes
NoNewPrivileges=yes
PrivateTmp=yes
UNIT
systemctl daemon-reload
systemctl enable --now nebula-world-proxy.socket
tailscale serve --bg --https=8444 --yes http://127.0.0.1:13126
