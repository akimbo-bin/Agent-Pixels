# Official illustrated world on CT125

**Open:** https://rehoboam-proxmox.sphinx-scylla.ts.net:8444/

The actual map and Node host run on Paperclip CT125, independent of the
workstation. Proxmox's existing Tailscale client forwards private HTTPS 8444
through a loopback-only socket proxy to CT125. Existing HTTPS 8443 is unchanged.
No new Tailscale login, TUN device, or public Funnel is needed.

## Updates and rollback

From this worktree on AKIMB0-PC:

- `npm run world:deploy` builds, uploads and atomically promotes a release on
  CT125. It also installs/updates the workstation telemetry publisher. It uses
  existing administrative SSH to root@192.168.8.105 and Proxmox pct for CT125.
- `npm run world:rollback` restores the previous CT125 release.
- `world:deploy-local` and `world:rollback-local` retain the original PC preview.

Releases are stored in /srv/nebula-world/releases. current.json selects the active
release and records its predecessor. UI-only updates need no restart. Host/live
code changes restart only nebula-world.service. Failed builds/uploads leave the
active release alone. No full Paperclip restart or Git push is needed.

Map defaults are dev/engine/approved-map.json. Deploying does not overwrite browser
saves. Browser storage belongs to each address/device: export newer edits from the
old page and Edit → Load map at the official URL. Shared server-side editing and
synchronization are not implemented.

## Services and live data

CT125: nebula-world.service runs at boot as unprivileged nebula-world, with
read-only application files. It binds the private 192.168.8.113:8791 address.
Only GET/HEAD release files and /live are exposed. Private config, dev write APIs
and generation tools are excluded. HTML uses gzip/ETag. /health and /release.json
report the active release.

Proxmox: nebula-world-proxy.socket listens only on 127.0.0.1:13126 and
nebula-world-proxy.service forwards to CT125. Tailscale Serve HTTPS 8444 targets
this socket. ops/install-world-tailnet-proxy.sh installs these dedicated services.

Paperclip organization and job data come directly from the existing read-only
/var/lib/agentpixels/status.json exporter on CT125. No agent credentials or
workstation SSH private key are copied onto the web server.

The Nebula World Workstation Telemetry scheduled task publishes only normalized
Training and GPU observations once a minute to /var/lib/nebula-world/workstation.json
through the existing SSH/PCT transport. It does not depend on the PC web server.
scripts/install-world-telemetry.ps1 installs it in C:/NebulaWorld. If the PC is off,
those readings become unknown within three minutes; the map and roster stay up.

## Phone controls

Hold/drag the direction pad to walk diagonally or straight. A / USE handles chairs
and elevators. ME follows your character. Drag to pan, pinch to zoom, or use ± and
Fit. Controls release on cancellation/focus loss. Portrait/landscape handle safe
areas. Editors use a bottom sheet: Move camera enables navigation gestures and
Done editing returns to walking.

## Verification

Set WORLD_URL=https://rehoboam-proxmox.sphinx-scylla.ts.net:8444 and run
`node scripts/check-world-server.cjs`. Add a trailing slash to WORLD_URL for
`node scripts/check-mobile-world.cjs`, which uses emulated touch input for movement,
release, pinch, pan, follow/Fit, elevator calls and editing.

The standalone host remains portable: world:release builds a directory for another
host, whose local live data configuration must be set before moving it.
