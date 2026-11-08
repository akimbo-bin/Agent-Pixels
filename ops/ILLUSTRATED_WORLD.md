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


Agent routines favor local posts and staggered breaks, with at most two autonomous errands and one agent approaching/waiting at the shared lift. Failed visitor routes time out; actors step aside around temporary traffic. Coffee breaks use a cached pixel animation: hold, raise, sip, lower, with subtle steam; social breaks use standing poses. The coffee action samples each sprite’s skin/clothing palette and respects foreground masks. Real agent presence and job state are unchanged by cosmetic breaks.

Seats now store `access` (`room` / `shared`) and `room`; Music and Observatory fits default to shared. Seats reserve one NPC occupant; the player cannot take an occupied NPC seat or use a restricted chair while controlling another room’s agent. Observatory starter fits and chair/desk layers migrate once (`sharedWorkspacesVersion: 1`), preserving custom Observatory fits and explicit deletions. Run `check-agent-routines.cjs`, `check-seat-access.cjs`, and `check-agent-elevator.cjs`. Built-in sprite columns: 0–2 walking/standing, 3–4 typing, 5–6 reading/holding; up/down/side rows with mirrored left. Sitting uses fitted poses and foreground layers.


Coffee can be previewed under Agents → Preview pose → Drinking coffee. Its eight-second sequence pauses with ambient motion, and individual agents are staggered. The action composes cached neutral-frame/arm/mug poses without rewriting the original sprite sheets. `check-coffee-animation.cjs` verifies phases, directional frames, break integration, pause behavior and mobile preview.


Paper deliveries, first pass: fresh, complete Nebula workboard snapshots are observed read-only by `scripts/handoff-journal.mjs`. The first snapshot establishes a baseline; only subsequently observed recent task completions assigned to a non-LEAD agent produce a completion report to LEAD. Stale/incomplete snapshots do not advance the baseline. The bounded, deduplicated journal lives at `/var/lib/nebula-world/handoff-state/journal.json`, survives releases and restarts, and is exposed through GET `/api/handoffs`. No Paperclip status, assignment, dependency or task is modified. Delivery never gates real work.

Editor > Paper deliveries selects a sender and fits its paper/outbox position and walkable approach, plus LEAD's shared inbox/approach. Pick sets a point on the selected level; View centers the camera. These points use the additive `handoffPoints` map field and support Save map, export/import, undo/redo and old maps. Preview report to LEAD creates a clearly labeled local simulation, never a task. Clear preview removes simulations; clicking a real desk report opens its original Paperclip task. Source and inbox points are starter fits for visual adjustment.

The local courier walks to an outbox, picks up a cached pixel paper stack, uses existing navigation/elevator, drops at the inbox, waits for a short acknowledgement when LEAD is nearby, and returns to its post. One report is animated at a time, within the existing two-errand/one-lift-agent traffic limits. Blocked approaches wait; interrupted trips retry. Ambient pause/editor mode freezes the sequence. Arrival receipts are browser-local visual history; actor positions and simulated reports are not saved into the map. Multiple browsers can animate their own representation of the same server event. Dependency handoffs, general routing and physical stack-count aggregation are future passes.

Checks: `node scripts/check-handoff-journal.cjs` (baseline, freshness, deduplication, restart/reopen), `node scripts/check-paperwork.cjs` (same-floor/cross-floor delivery, carry/drop, elevator bounds, collision, map preservation, editor undo/redo and mobile focus), `node scripts/check-paperwork-guards.cjs` (blocked points, ambient pause, preview cancellation, report details and read-only/demo isolation), plus existing coffee and mobile editor regression checks.


Paper deliveries, second pass: each newly observed completion routes to its real `reportsTo` manager (LEAD fallback when missing) and, when assigned to a different agent, its parent task's owner. The two routes merge when they name the same recipient. Parent ownership is explicitly labeled and is never treated as a dependency or review assignment. Existing journal baselines survive this upgrade, so changing routes does not replay completed tasks. Unknown owners, self-deliveries, stale snapshots and historical completions are excluded.

Up to four waiting reports from one sender to the same recipient share one courier trip. Every bundled report gets its own local receipt; retries return the entire bundle to the queue. Desk organizers have outgoing and incoming pockets, layered paper stacks, a pending-arrival indicator and clickable report lists with original task links and routing reasons. Identical desk positions share one tray. Cached tray surfaces are reused during foreground masking. Their starter fits were recalibrated on the illustrated desks; existing authored tray points remain untouched.

Paper deliveries now offers any sender/recipient pair and completion/parent-update previews. Sender and recipient fitting fields refer to the selected agents' shared desk tray centers; their positions remain in the existing `handoffPoints` save format. Pickup and placement use longer, quantized reach/bend frames, pocket-aligned landing positions and bundle stacks. Run `check-handoff-routing.cjs` and `check-paperwork-batches.cjs` alongside first-pass checks for recipient routing, duplicate suppression, batch receipts/reload, tray details and mobile fitting.


Paper deliveries, receiving pass: a free recipient near their own desk reserves the existing walkable approach, notices incoming work, collects up to four papers, reads with quantized page changes, and files the stack. Busy Running workers, away/visiting agents, manually controlled agents, hidden characters and disabled roaming defer collection. No return elevator trip is created for reading. The receiver uses the same bounded errand reservations as couriers, and a courier waits before entering an occupied receiving approach. Room/job states are never changed.

Receipt `stage` stays `delivered`; the separate cosmetic `handling` phase tracks waiting/approaching/notice/collecting/reading/filing/filed. Handled papers leave the physical stack while their task links remain in recent tray history. Browser-local filed IDs (`nebula-paperwork-filed-v1`) survive refresh without repeating the animation. Interrupted or reset receivers release their reservation and leave papers waiting; ambient pause/editor modes freeze the sequence. Availability checks are throttled between gestures to keep mobile cost low. The map save schema and original sprites are unchanged. Agents > Preview pose includes Reading report and Filing papers.

Run `node scripts/check-paperwork-receiving.cjs` for collection/read/file, ambient pause, filed receipts and history after reload, busy-worker deferral, interruption recovery, mobile previews, map preservation and absence of remote writes. Existing batch/courier and coffee checks cover shared actor rendering and reservations.


Mobile editor camera fix: seat/object selection now frames the selection within the canvas area left exposed by the inspector, instead of centering it behind the panel. Seats fit the pose and walking markers; screens, masks, characters and paper trays use the same framing helper. Editor framing offsets selections around the inspector; the shared camera clamp keeps visible world bounds inside the map. Focus runs synchronously after layout updates, and uses camera targets without focusing the canvas or stealing input focus. The recenter button is always reachable next to zoom in editor mode.

The phone inspector can Hide/Show controls, keeps Save/Undo accessible when open, and places position nudges at the top of seat fitting. Pose fitting, walking points, access and occlusion are separate groups. Landscape help stays within the map area. Empty space pans in Seats, Screens, Agents and Paper deliveries; direct handles/pickers retain edit behavior with larger touch hit targets. Paint/grid tools use one finger to edit and two to move/zoom; Pan only remains available for one-finger navigation. Pinches roll back their provisional first touch, including map data, undo/redo, saved draft and unfinished polygon/screen/auto-selection state. No persisted save schema changed.

`node scripts/check-mobile-editor-camera.cjs` reproduces the original hidden-seat failure, and checks framing, empty-space drag, actual seat-handle editing, undo, paint-free pinches, pending shapes, collapse/recenter, keyboard focus and landscape. Keep existing `check-editor-polish.cjs`, `check-mobile-world.cjs` and `check-seat-access.cjs` green. Mobile seat-access checks now explicitly open their collapsible access group.

Editor buttons activate short touch taps directly and suppress only the corresponding compatibility click. This prevents the first Undo/Save tap after a canvas gesture being swallowed, while avoiding duplicate actions; mouse and keyboard activation remain native. The mobile camera regression asserts a single Undo action from that first tap.


The map canvas now covers the entire stage on desktop and phone, rather than fitting a fixed 4:3 frame inside a wider browser window. `Camera.layout()` uses a uniform cover scale from both stage dimensions and updates via ResizeObserver. The artwork retains its aspect ratio; only the visible crop follows the browser's shape. Minimum zoom protects both dimensions, and both walking/editor camera bounds clamp to the image rectangle with no off-map margin. Existing map coordinates, overlay projections, pointer anchoring and saved data remain unchanged. Run `check-camera-viewport.cjs` across wide desktop, phone portrait/landscape, all zoom levels and editor mode; keep `check-smooth-camera.cjs`, `check-mobile-world.cjs` and `check-mobile-editor-camera.cjs` green.


Desktop rendering and walking: minimum zoom can crop the map after viewport-cover sizing, so WASD now enables camera follow at every zoom. Closing a dashboard panel or choosing Live/Demo returns focus to the map; editable fields continue to consume typing. `check-desktop-controls.cjs` covers actual keyboard movement, release, follow, menu/source focus and typing without movement.

Screen animation now reuses painter canvases, readback-friendly 2D contexts and foreground-mask buffers. Reset painter state before each pass; overwrite mask buffers before applying their alpha mask. Projection density, art programs, nearest-pixel sampling and Working/Idle refresh frequencies are preserved. Stable per-screen phases spread refresh work across frames rather than repainting every monitor simultaneously.

Measured with `node scripts/profile-desktop.cjs` (headless Edge, 1920x1080, 14 agents, 90 advancing frames per scenario): fully zoomed-out live p95 fell from 53.3 to 18.8 ms; all rooms Working from 103.3 to 23.1 ms. Temporary canvases fell from 321 to 3 and 750 to 15 respectively. These are local rendering measurements, not a universal FPS guarantee; live feed and browser load affect results. `PROFILE_OUT` chooses the JSON artifact path. `check-screen-render-fidelity.cjs` compares the preceding renderer at two zooms with moving display programs and foreground masks; CPU/GPU canvas antialiasing may differ slightly (mean channel error below 1/255). It also checks that animated screen/mask canvases are reused. Keep camera, screen resolution/program and mobile editor checks green.


Live-reading accuracy: Training's main ring shows the current oracle fit's measured completed units when available; the configured queue's done-job count remains a separate line. Read the current attempt's `oracle/<job>/events.jsonl` (`start.units_done` plus distinct subsequent `unit` events), rejecting old attempts, inconsistent totals and logs over 2 MiB. Partial last lines are ignored. No checkpoint is loaded and no training process is queried or changed. Other job types without progress telemetry explicitly say unavailable; never present queue jobs as epochs or elapsed-work completion. `activity.progress` preserves its unit, source and timestamp through workstation publication and server normalization. Invalid percentages, including done > total, are discarded.

Operations' four boards are Active work (running Paperclip sessions plus fresh external jobs, with the direct Training feed deduplicated from NEB-318), Service checks (passing probes, not a claim that failed machines are offline), Blocked tickets and Tickets in review. Agent runs resolve their tickets through liveRuns.issueId; they do not depend on the single legacy agent.issue shortcut. Missing or stale run/board data displays unavailable. The five-minute job-watch probes carry an explicit ten-minute freshness window (`freshForMs`); normalization accepts only bounded windows up to fifteen minutes. Source ages are preserved, and all-stale probes show no reading instead of 0 passing.

Checks: `node scripts/check-live-screen-accuracy.cjs`, `node scripts/check-current-training-progress.cjs`, `node scripts/check-live-screen-browser.cjs` (deterministic browser-only fixture, desktop/phone). For an end-to-end read-only audit of an actual active oracle fit, set `AUDIT_LIVE=1` and `DASHBOARD_URL` to the official site before running the browser check. This verifies the published payload against display models, the room panel and Running/Working animations without writing Paperclip. Keep existing training, room-state and screen-program checks green.


Workload aliases now carry a bounded `workloadKey` (machine/ticket). Operations and the dashboard/HUD share `ScreenPrograms.workloads()` so a registered VM116 render and its render-status channel count once, just like direct Training and NEB-318. Prefer a fresh known-state observation over stale/unknown aliases; preserve the preferred source when both are current. This does not merge an agent session with an external job: those are distinct work and displayed separately.


Desktop key bindings: WASD moves the character; arrow keys pan the camera in Walk and editor modes; hold Z to zoom in or X to zoom out. Camera pan/zoom uses the existing eased targets, normalized diagonal pan speed, zoom-independent pan speed and map bounds. Arrow panning takes priority over automatic character follow while held; WASD resumes follow when walking again. Text fields/contenteditable retain typing and caret controls, and modifier shortcuts do not trigger camera zoom. Phone movement controls remain separate. `check-desktop-controls.cjs` covers walking, four camera directions without character movement, continuous zoom/limits, editor pan, focus, modifier shortcuts and release.


Character-follow framing looks up by 85 world pixels, capped at one third of the visible viewport height at the target zoom. This puts the character lower in the frame and reveals the room above without losing the actor on short landscape screens or at close zooms. The same offset follows seated poses and the interpolated elevator camera point, keeping transitions smooth. Manual pan, directory/editor framing and zoom limits remain independent. Normal 3x framing was checked against the Training room's ceiling and floor on desktop, phone portrait and landscape; very close zooms still show a crop of the room.


Small-screen refresh tuning: `kind: indicator` room programs now repaint at 4 Hz while Working and 1 Hz while Idle (previously 10/2 Hz; custom Working indicators were 12 Hz). Large/data displays retain their 10/2 Hz cadence. Refresh phases remain staggered and incoming telemetry/state/editor changes still invalidate the cache immediately; polling, raster resolution, artwork, large-screen data and other room effects are unchanged. In a pinned 14-agent feed at 1920x1080, fully zoomed-out/all-Working average frame time fell from 15.25 to 9.97 ms; screen drawing from 10.15 to 5.43 ms. These are local measurements rather than a universal FPS guarantee. `profile-desktop.cjs` optionally accepts `PROFILE_FEED_FILE` to replay a read-only captured feed with a fixed observation clock for before/after comparisons. A five-second draw-count check covered all 31 small and 11 large displays in both states; screen/mask pixel-fidelity checks passed.
