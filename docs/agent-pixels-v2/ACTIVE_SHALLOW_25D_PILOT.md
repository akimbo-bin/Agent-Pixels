# ACTIVE OWNER DIRECTIVE — Agent Pixels shallow 2.5D pilot

**This supersedes the first deliverable and priority order in START_HERE_FOR_CODEX.md and the older three-floor/elevator-heavy V2 plan.** The former multilevel architecture is deferred exploration. Do not implement elevators, three floors, or a renderer rewrite in this first iteration.

## Objective
Improve the existing *actual Agent Pixels* 12-room connected headquarters with restrained 2.5D depth, preserving OfficeState, all agent paths, telemetry, machine state and HUD. Then prepare local ComfyUI batch generation and a visual prop/texture editor. No Astra and no one-image-per-LLM-call art production. The generated Nebula dollhouse reference is an art-direction target, not a literal floorplan or telemetry source.

## Baseline and coordination
- Existing Agent Pixels source: akimbo-bin/Agent-Pixels, Astra draft PR #1 (feature branch feat/connected-hq-20261102-astra). Existing private viewer: akimbo-bin/nebula-observatory draft PR #3. Reconcile current exact heads and worktree cleanliness before editing; these PRs may have changed.
- The current documentation PR is Agent Pixels #2, branch docs/agent-pixels-v2-dollhouse-20261102. Read this override FIRST, then relevant original docs.
- Paperclip company: Agent Pixels (AGE), separate from Nebula/Chibi. Four agents created, all paused at configuration. Do not wake or schedule work while Codex credits are exhausted.
- One owner-approved implementation task per worker, isolated worktrees, no overlapping writes. Every outcome requires actual code, tests and real browser screenshots.

## P0 — Lead: Sol 6.1 Medium, FIRST
Preserve the existing canvas renderer, 64×48 tile world, continuous room paths, seats, status projection and camera. Build a modest depth effect in one hero observatory room:
1. Project world-floor tile coordinates into a shallow angled floor plane. People and freestanding props shrink subtly as they move away from the camera and grow nearer it. Start with 0.85–1.15 relative scale, tune visually, anchor actors at their feet, and ensure pixel art stays sharp.
2. Keep collision, pathfinding, agent ownership and machine inputs in unchanged logical world coordinates. Rendering-only perspective. No snapping or popping when walking across doors.
3. Implement correct depth sorting, foreground cutaway occlusion, furniture footprints, and slight wall height. Don't render yet another overhead diagram; don't build a brand-new 3D engine.
4. Preserve observatory stage art, the Paperclip queue, machine-specific VM116/AKIMB0-PC state and cooldown behavior. Do not mistake decorative loops for verified running jobs.
5. Record before/after screenshots in browser at 1920×1080, 1366×768, 390×844, plus agent near/back movement recording and connectivity tests. Owner visually approves this actual running prototype before asset mass production.

## P1 — World Editor: Luna
Build a separate authenticated editor, not mutations on the read-only viewer. One complete vertical slice: select, move, grid-snap, change z-layer, undo, redo, save a versioned scene document, reload and validate collision/reachability; then import a replacement room floor/wall texture. Use stable source interfaces; don't replace Sol's renderer.

## P1 — Asset Pipeline: Luna
Build an image-generation factory on AKIMB0-PC with ComfyUI Desktop, which is installed; Windows reports an RTX 3070, but backend execution, free GPU memory and local checkpoint capability are NOT smoke-verified. First run one real GPU model generation and record performance.
Create a versioned JSON manifest for each candidate: prompt, negative prompt, model, license, seed, palette, output format/dimensions, perspective, category, reference style and atlas target. Use the local ComfyUI API queue to generate batches without recurring LLM calls. Start with telescope, three props and a seamless floor/wall texture.
Normalize transparency, resolution, palette, pixel density, crop/pivot, collision footprint, texture seams and repeated frames; review/approve candidate assets before catalog/atlas registration. Add deterministic atlas and error tests. Do not commit unapproved images or model weights.

## P1 — Reviewer: Luna
Independently review exact source heads, pathfinding, browser QA, mobile layout, depth consistency, telemetry honesty, source permissions, artifact acceptance, file licenses and PR scope. Do not review only status messages or generated concept art. Actual app screenshots/video determine visual acceptance.

## Priorities and stop conditions
- No Astra, no unnecessary 15-minute ChatGPT model dispatch. A local queue handles image batches; Sol/Luna only run for real engineering tasks with available usage.
- Preserve read-only viewer data provenance; source outage is UNKNOWN, not 0 or active.
- No multiple floors, elevators, new animation scheduler, or speculative renderer replacement until the shallow-perspective pilot has been evaluated.
- Do not create or merge other companies' PRs; no work on Nebula/Chibi control planes.
- Success for first slice: one convincingly deeper observatory, crisp depth-scaled moving characters, correct occlusion, existing 12-room movement intact, and actual screenshots accepted by owner.
