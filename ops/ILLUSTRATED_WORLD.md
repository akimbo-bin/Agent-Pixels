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
Release files and /live are read-only. The only write API is a validated same-origin
listening-review submission; it cannot change Paperclip. Private config, dev write
APIs and generation tools are excluded. HTML uses gzip/ETag. /health and /release.json
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


## Dashboard data and listening reviews

The status exporter on CT125 now reads a paginated, allowlisted Nebula issue board,
actual live runs, attention items, inbox badges, daily run summaries and recent
activity. Financial fields, runtime credentials and comment/tool snippets are
excluded. Attention totals are not unread-notification counts. The source exporter
remains read-only against Paperclip.

Training completion uses the current queue's authoritative per-job state, excluding
smoke-only ledger entries. The active workload and whole-queue progress are separate;
no per-evaluation percentage is invented. Waiting/cooldown/window holds and a stopped
driver with unfinished work are not labeled Running. Display Running maps to Working
room animations while assigned-agent presence remains independent.

The workstation publisher also collects verified dataset QA cohorts and audio from
completed NEB-318 evaluation folders. Stable cohort/run IDs avoid duplicate counting;
reference copies and unsuccessful jobs are excluded. A local cache retains known
counts through NAS outages/cleanup. The UI explicitly labels historical coverage
partial instead of presenting this as a fully reconciled lifetime total.

`scripts/build-listening-catalog.py` imports only blinded audio and curated trial
metadata from the five existing private listening packets. It never packages guide
HTML, answer keys, original filenames, or unblinded archival receipts. Media is
content-addressed and sent separately on deploy only when the catalog changes.
Historical completed reviews are flagged without exposing their answer mappings.

CT125 serves GET /api/listening and byte-range audio requests. POST
/api/listening/reviews validates the origin, custom header, packet revision, all
trial IDs, picks, confidence and note limits. Conflicting receipt revisions return
409 without dropping the client's choices. Reviews append atomically in
/var/lib/nebula-world/listening-state/reviews.json, owned by the unprivileged app
user; the systemd sandbox permits writes only there. Releases/rollbacks preserve
that state. Demo reviews only use localStorage and never call this write API.

Dashboard checks: `world:check-data`, `world:check-dashboard`, and
`world:check-dashboard-mobile`. The browser dashboard tests default to an isolated
QA host on 127.0.0.1:8792. Set DASHBOARD_URL to the official URL for production
read-only checks; automated real review writes are enabled only on that local QA
host. Existing map geometry, masks, seats, screens and character customization
remain browser-save/export data and are not overwritten by deployment.

Deployment preflight requires at least 512 MiB free on CT125 before writing a release. On 7 November the container root disk was expanded online from 100 GiB to 110 GiB using available local-lvm capacity after only 11 MiB free remained. Existing data and services were preserved.


Furniture masks now include **Auto object**: drag a tight rectangle with background margins, adjust background removal, review the pink preview, then Apply. This local color-based selector makes no uploads and may need Brush/Erase cleanup. Click an existing silhouette to select its mask. Optional base footprints block movement independently from visual silhouettes; Pick line moves the footprint with its depth. Preview selections must be applied or cancelled before saving/exporting.

The ground terrace includes twelve additive prop layers and narrow lamp/planter footprints. Older saves import these once (`terracePropsVersion: 1`) without replacing existing grid cells, sprites, seats or mask shapes. Deletions and refinements persist on subsequent saves.


The editor inspector uses the same control IDs and save format within a grouped shell (`illustrated-editor-ui.js` / `.css`). Mobile tools live in the tool picker; Room labels & states and Effects preview are included in that picker. Save map, Undo/Redo and Map files & backups stay in the inspector footer. Viewport resizing updates camera bounds without focusing the canvas; iPhone visualViewport changes resize the keyboard-open inspector. Queue search retains its input node while updating results. Run `node scripts/check-editor-polish.cjs` for focus, keyboard-size resize, tool access, search-node identity, elevator cards and portrait/landscape checks.


Agent routines favor local posts and staggered breaks, with at most two autonomous errands and one agent approaching/waiting at the shared lift. Failed visitor routes time out; actors step aside around temporary traffic. Coffee/social breaks use existing standing and holding/reading sprite poses; no dedicated cup-to-mouth sprite animation is authored. Real agent presence and job state are unchanged by cosmetic breaks.

Seats now store `access` (`room` / `shared`) and `room`; Music and Observatory fits default to shared. Seats reserve one NPC occupant; the player cannot take an occupied NPC seat or use a restricted chair while controlling another room’s agent. Observatory starter fits and chair/desk layers migrate once (`sharedWorkspacesVersion: 1`), preserving custom Observatory fits and explicit deletions. Run `check-agent-routines.cjs`, `check-seat-access.cjs`, and `check-agent-elevator.cjs`. Built-in sprite columns: 0–2 walking/standing, 3–4 typing, 5–6 reading/holding; up/down/side rows with mirrored left. Sitting uses fitted poses and foreground layers.
