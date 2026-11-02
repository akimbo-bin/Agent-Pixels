# 01. Reconciled Astra state: what is real, what is not

**Checkpoint:** 2026-11-02, approximately 14:36 Edmonton. Confirmed by reading the actual authorized AKIMB0-PC worktrees and GitHub PRs and rerunning non-mutating tests. Recheck before writing; this is a checkpoint, not a lock.

## Exact source-of-truth locations

| Purpose | Repository + feature branch | Worktree | Verified HEAD |
| --- | --- | --- | --- |
| Read-only Nebula dashboard/runtime, normalized snapshots, tests, image bundler | `akimbo-bin/nebula-observatory`, `feat/connected-hq-20261102-astra` | `Z:\Projects\Nebula\nebula-observatory-astra` | `7b2f99197d9a7a4abc10b4d3fd08740810606af6` |
| Actual Agent Pixels world simulation, art, assets and renderer | `akimbo-bin/Agent-Pixels`, `feat/connected-hq-20261102-astra` | `Z:\Projects\Nebula\AgentPixelsFork` | `f170a75d402cb91dde4d9b99029c76f698160d41` |
| Original Nebula observation prototype | viewer `feat/pixel-office-v1` / fork `feat/nebula-observatory` | `C:\Users\abmar\AppData\Local\...` | older; DO NOT base V2 on these |

Viewer draft PR: https://github.com/akimbo-bin/nebula-observatory/pull/3

Agent Pixels draft PR: https://github.com/akimbo-bin/Agent-Pixels/pull/1

Both latest worktrees displayed `git status --short` empty (clean) and both heads matched the corresponding GitHub PRs. They are **drafts, unmerged**. The earlier viewer drafts #1 and #2 are distinct historical checkpoints, not latest Astra progress. Read current source before cherry-picking or merging anything.

## Verified finished behavior and functionality

| Domain | Current implemented state | Acceptance limits |
| --- | --- | --- |
| Current world | One 64x48 continuous 2D top-down tile map with 12 themed room zones and role seats | One floor only; aesthetic target is cutaway multi-level, not yet present |
| Walkability | 16 two-wide doors; all 1,902 walkable cells reachable under decoded furniture collision, confirmed by recorded browser/scene evidence | Elevator, stairs, floor-to-floor routing absent |
| Agent behavior | 12 role seats, continuously traversing ambient/demo agents; cooldown lounge walks and return trips | Real Paperclip roster/usage authorization remains blocked |
| Machine states | Separate VM116 render, AKIMB0-PC render, AKIMB0-PC train, CI and audio evaluation states; waiting/running/stalled/idle; background jobs survive usage cooldown | Verified against synthetic source-grounded fixtures; no accepted real protected watcher readback |
| Telescope | 7 evidence-gated sprite stages, same collision footprint, retractions handled | Current telescope still stylistically sparse/top-down; not a multi-level dome or dramatic hero scene |
| Asset production | 145 original PNG sprites in NEBULA_CAMPUS; sprite atlas and procedural Python generator | Source header explicitly says **"Procedural drawing source; no generated-image service"**; no interactive asset generation or editor |
| Rendering | Existing Agent Pixels raster/tile and furniture catalog, added bounded zoom pixel cache | No dedicated 2.5D cutaway layers, lighting renderer, 3D depth sort, or multilevel world graph |
| HUD | Full-window canvas, source badge, movable camera, compact ledger/menus, model archive paging | Aesthetic still subdued; no drag/drop scene editing, room/texture authoring or visual asset library |
| Renders | Metadata-only incremental indexer with verified count semantics, source recovery and partial coverage | Real TrueNAS approved manifest readback not connected |
| Trained models | Normalized model/run/checkpoint and status lineage; demo gallery of up to 250 fixture records | Complete real model registry not established; counts in DEMO are examples |
| Security | Read-only viewer GET/HEAD; per-source freshness, source sanitization, company scoping, demo/live isolation | Tailnet owner-only ACL/persistence, source credentials, live protected acceptance and independent final review pending |

### Re-run test evidence (this checkpoint)

- `npm test` on viewer HEAD **26 tests passed, 0 failed**.
- `python -m unittest discover -s tests -p test_*.py` **27 discovered, 26 passed, 1 skipped** (POSIX-specific on Windows).
- `npm run check:scene` **passed**; this checks the standalone UI and transitive Agent Pixels scene, **not** the full plugin SDK entrypoints.
- Astra's captured evidence: desktop 1920x1080 and 1366x768, mobile 390x844, full canvas, 280 asset URLs, no browser console errors; 1,902 walk tiles all reachable, and 12 lounge trips. Browser screenshots and scenario reports are committed to the viewer PR's evidence folder. Evidence reported p95 ~22.8ms **without video recording** and ~30.5ms **while recording** (the latter exceeds old 25ms target). Physical phone GPU acceptance is not established.

Source reports:
- https://github.com/akimbo-bin/nebula-observatory/blob/feat/connected-hq-20261102-astra/docs/handoff/11_ASTRA_IMPLEMENTATION_REPORT.md
- https://github.com/akimbo-bin/nebula-observatory/blob/feat/connected-hq-20261102-astra/docs/evidence/visual-overhaul-20261102/README.md
- https://github.com/akimbo-bin/Agent-Pixels/pull/1

## Critical implementation seams (existing code, not new requirements)

**Agent Pixels feature branch**
- `src/office/layout/nebulaLayouts.ts`: current 64x48 flat declarative campus, ROOMS and ROLE_SEATS.
- `src/office/layout/nebulaConnectivity.ts`: current collision/reachability oracle.
- `src/office/engine/officeState.ts`: current character, seat, pathfinding and sprite state management; preserve as much as possible.
- `src/ui/PixelOfficeCanvas.tsx`: current React canvas wrapper with persistent OfficeState, selection, dynamic scenery and cooldown paths.
- `src/office/observatory/camera.ts`: current single-world 2D pan/zoom/fit.
- `src/office/observatory/loungeWalks.ts`, `demoWalks.ts`: autonomous visual movement that is not a machine job.
- `src/office/observatory/sceneProjection.ts`: pure telemetry-to-sprite machine projection, no control actions.
- `src/office/layout/furnitureCatalog.ts`, `layoutSerializer.ts`, `src/office/sprites/spriteCache.ts`: art, footprints, depth and image data.
- `scripts/draw-nebula-art.py`, `scripts/nebula_art_details.py`: **procedural** art; reusable as fallback/QA, not the V2 image service.
- `public/assets/furniture/NEBULA_CAMPUS/`: latest sprite assets, manifests, atlas. `public/assets/nebula-floors/` has nine floor tile sprites.

**Private viewer feature branch**
- `standalone/app.tsx`, `standalone/style.css`, `standalone/state/snapshot.ts`: HUD, view, live/demo and normalized source state.
- `standalone/build.mjs`: esbuild alias to actual Agent Pixels `PixelOfficeCanvas`, asset copying/validation.
- `lib/snapshot-v2.mjs`, `collector/*`: truthful company-scoped read-only source projections, model/render/milestone schema and usage observations.
- `scripts/browser-baseline.mjs`, `scripts/visual-acceptance.mjs`, `scripts/performance-check.mjs`: current browser acceptance and performance suites.
- `config/implementation-refs.json`: recorded renderer and viewer evidence refs (may intentionally predate final documentation commits).

## Preview/deployment distinctions

- Latest Astra visual test demo was on localhost port **18771** on AKIMB0-PC, **temporary, not production**. Check current listeners and process ownership before visiting/restarting.
- Previous private Tailscale Serve viewer at `https://akimb0-pc-1.sphinx-scylla.ts.net/` and localhost port 18769 uses the older production-like prototype; it was intentionally left untouched by Astra.
- A prior recovery demo used port 18770; do not assume either preview is currently active. A port responding is not proof of correct branch/deployed SHA.
- The Paperclip instance on CT125, Nebula research datasets/weights, original watcher schedules, and Shepherd were not modified by this work.

## Exact remaining blockers (do not "solve" by bypassing auth)

1. Protected Paperclip Board API: current observer identity lacks a Nebula-scoped read grant (403 previously observed).
2. Protected CT125 job-watcher and separately verified usage-window state: need approved sanitized read feed; never reuse instance-admin session or alter file ACLs without authorization.
3. Real dataset render index, model registry and accepted plugin-stage registry: need authorized read-only metadata sources, not guesses from filenames or demo fixture values.
4. Full SDK typecheck/review: separate Paperclip SDK paths unavailable to current standalone CI; final independent reviewers lacked credits. Do not mark source PRs accepted.
5. Owner visual acceptance, tailnet ACL, durable restart/rollback and second-tailnet-device live source checks pending.

## Why a new architecture, rather than more tweaks, is justified

The current real screenshot (bundled here) shows a visually uniform bird's-eye grid of rooms, low-depth furniture and a simplified telescope. The generated target has a cutaway dollhouse composition, layered multi-storey architecture, hero scale telescope, rich backdrops, varied lighting, busy set dressing and integrated visual hierarchy. Even adding hundreds of tiny props to the old grid will not produce that perspective or spatial character. The new effort must build a different **view and editing system** while retaining the already tested underlying entities and data semantics.

## Preserve state before doing V2 work

- Fetch/reconcile both current feature heads; inspect worktrees and active processes again (they can change).
- Create new isolated V2 worktrees or branches; do **not** check out over Astra's finished branch.
- Record which PR head and assets the V2 prototype pins; keep 2D renderer fallback available.
- Avoid modifying shared original asset IDs in place; generate namespaced versioned V2 assets so existing Nebula scene remains reproducible.
- Never infer that unmerged or visually approved implies production published.