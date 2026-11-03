# Agent Pixels V2: Dollhouse Renderer, World Editor, Prompt-to-Asset Studio

**CURRENT OWNER PRIORITY OVERRIDE (2026-11-02):** Read [ACTIVE_SHALLOW_25D_PILOT.md](ACTIVE_SHALLOW_25D_PILOT.md) FIRST. It supersedes this document's three-floor/elevator first deliverable. Build restrained shallow 2.5D perspective in the EXISTING connected HQ, then a local ComfyUI batch asset factory and visual editor. Sol 6.1 Medium leads; Luna workers assist; no Astra. All Paperclip agents remain paused until explicit eligible dispatch.
## Implementation-ready product specification and Astra reconciliation

Prepared 2026-11-02, America/Edmonton. Based on direct GitHub and AKIMB0-PC readback, owner-supplied current screenshot, and owner-approved generated visual target. This is a NEW product direction, not a claim that V2 has been built or that any new task has been dispatched.

## The mission

Evolve Agent Pixels from a top-down 16px office observer into a reusable **2.5D multi-floor dollhouse headquarters builder** with a visual scene editor and in-editor image-generated props, textures, room kits and stateful art. The target is to look **much closer to** `references/TARGET_generated_Nebula_dollhouse.png` than the current screenshot `references/CURRENT_Astra_topdown_2026-11-02.png`, while remaining a real, editable, connected, animated program rather than a static generated backdrop.

The Nebula headquarters is the first reference implementation; the editor and renderer must be reusable for other projects. Preserve Astra's read-only telemetry, proven state handling, models, renders, source freshness and agent behaviors. Do not restart from scratch.

**Product-critical insight:** This cannot be solved by adding more 16x16 procedural PNGs to the current overhead camera. The visual reference depends on side-on cutaway composition, multi-level architecture, large illustrative hero objects, ambient light and layered depth. Solve **rendering, art pipeline and authoring together**.

## Start with verified state, not old handoffs

Astra last finished at these **clean, pushed, UNMERGED draft PR heads** (checked live from GitHub and worktrees on 2026-11-02):

| Codebase | Local worktree | Current branch/HEAD | PR |
| --- | --- | --- | --- |
| Private Nebula Observatory | `Z:\Projects\Nebula\nebula-observatory-astra` | `feat/connected-hq-20261102-astra` / `7b2f99197d9a7a4abc10b4d3fd08740810606af6` | https://github.com/akimbo-bin/nebula-observatory/pull/3 |
| Agent Pixels fork | `Z:\Projects\Nebula\AgentPixelsFork` | `feat/connected-hq-20261102-astra` / `f170a75d402cb91dde4d9b99029c76f698160d41` | https://github.com/akimbo-bin/Agent-Pixels/pull/1 |

Both worktrees were clean at last inspection. **Refresh HEAD/dirty/process state before mutation**; the owner may have continued work. Do not change or merge Astra's drafts as a side effect of planning V2. The legacy Nebula observer on port 18769 remains a separate earlier deployment; don't confuse it with the latest draft preview on 18771.

Verified test re-run on these worktrees: **26/26 Node tests PASS**, **26 Python tests PASS with one Windows-only skip**, standalone/transitive Agent Pixels scene typecheck PASS. Astra's evidence report states actual Chrome browser QA, 12 rooms, 12 seats, 16 doors, 1,902 connected walkable cells, seven telescope stages, 145 code-generated original sprites, and named-machine/cooldown scenarios. The full plugin SDK typecheck, final independent review, owner visual approval, and real protected-source acceptance remain outstanding.

Astra shipped genuine value. **It did not ship the V2 perspective, an interactive level/prop editor, an image-generation API, or a multi-floor elevator.** These are the new scope.

## Read the full specification, in order

1. [01_RECONCILED_ASTRA_STATE.md](docs/01_RECONCILED_ASTRA_STATE.md) - exact accomplished vs pending, source files, tests, deployment and pitfalls.
2. [02_PRODUCT_REQUIREMENTS.md](docs/02_PRODUCT_REQUIREMENTS.md) - product behavior, user stories, creative direction, reusable editor/runtime split.
3. [03_DOLLHOUSE_RENDERER_AND_ELEVATOR.md](docs/03_DOLLHOUSE_RENDERER_AND_ELEVATOR.md) - 2.5D scene, layered camera, multilevel routing, elevator simulation.
4. [04_PROMPT_ASSET_STUDIO.md](docs/04_PROMPT_ASSET_STUDIO.md) - image generation workflow, asset preparation, textures, sprite registration, versioning, security.
5. [05_EDITOR_ARCHITECTURE_AND_MIGRATION.md](docs/05_EDITOR_ARCHITECTURE_AND_MIGRATION.md) - editable scene schema, runtime projections, contracts, migration and project reuse.
6. [06_EXECUTION_PLAN_AND_ACCEPTANCE.md](docs/06_EXECUTION_PLAN_AND_ACCEPTANCE.md) - red/green vertical slices, dependency tickets, acceptance matrix and release gates.
7. [07_DECISIONS_AND_RISKS.md](docs/07_DECISIONS_AND_RISKS.md) - decided/default/open items, limits, costs, legal and security boundaries.
8. [Visual references](references/) - original generated target and actual current screenshot, both preserved without further image generation.

## One critical vertical slice BEFORE all rooms

Implement a **three-level cutaway prototype** using the real Agent Pixels agent and state models:

- Three visible floor bands, with a true elevator shaft and path graph between them.
- Top: Lead office + Clerk reception + a **large, image-generated telescope/observatory hero room**.
- Middle: a small rocket workshop + at least one live-state machine slot.
- Bottom: review office + small lounge.
- Place/move/resize one generated telescope, edit one floor texture, save/reload the scene.
- Make one agent walk from the middle floor to the observatory via the elevator with entry, wait, ride, exit and continuation visibly animated.
- Show VM116 rendering and AKIMB0-PC training independently from existing synthetic acceptance fixtures. Do not introduce fake real activity.
- Reproduce the visual target's architectural depth, lighting and dense illustrated detailing in this slice.

This slice is a **go/no-go for the rendering direction**. Owner approves actual screenshots/video from the implemented program, not prompts, before scaling to the full twelve-room HQ. If the 2.5D rendering style remains far from the reference, revise the approach before mass-generating assets.

## Non-negotiables

- **Do not replace functioning telemetry**, weaken source provenance, collapse model lineage, or conflate VM116/AKIMB0-PC jobs.
- **Do not conflate ambient animations with real work.** On cooldown, idle eligible agents can visit lounge; active training/rendering must keep running if watcher verifies it. No authenticated watcher/usage source = unknown, not a fabricated cooldown.
- **Do not use the generated image as a flat scene screenshot.** Use it as visual art direction and produce modular layered room kits plus interactive entities.
- **Do not make the editor a write endpoint on the read-only Nebula viewer.** Editor is a separately authenticated authoring capability and edits scene documents/assets only. Telemetry adapters remain GET/HEAD-only.
- **Do not force the existing 64x48 top-down engine to pretend it has floors.** Keep it intact as a fallback renderer. Build an additive multi-floor scene graph and 2.5D renderer behind a feature flag.
- **Do not publish/copy private source data or credentials into the public Agent Pixels fork.** Reusable rendering/editor code and approved art belong in shared packages; Nebula-specific adapters/config stay private.
- **Do not assume rights to redistribute upstream Agent Pixels art/source.** The upstream project had no explicit LICENSE at last check. Clarify permission before external product distribution.
- **Do not auto-merge Astra drafts**, deploy publicly or alter Paperclip agents, scheduling, job execution, research data or machine permissions.

## Exact first actions for Codex

1. Inspect both worktrees, remote heads, active processes and in-flight changes. Record SHAs, clean state and current tests.
2. Create isolated V2 branches/worktrees from the relevant current heads; don't switch a busy working tree or alter drafts.
3. Read existing Agent Pixels `OfficeState`, tile collision/pathfinding, `PixelOfficeCanvas`, camera, furniture catalog and sprite-loading contracts; preserve them.
4. Complete prototype tickets V2-00 through V2-04 (in the execution plan), including generated art and editor save/reload.
5. Present **actual compiled program screenshots at comparable framing** beside the target image; include visual gaps, performance and working elevator evidence.
6. Only after aesthetic/technical go decision, implement the complete reusable editor and Nebula migration; keep release gated by source truth and independent review.

## What success looks like

A person opens an animated, beautifully layered Nebula HQ and immediately sees a **living multi-storey dollhouse** with distinct themed rooms, a dramatic observatory telescope, light and shadow, dense props, agents crossing floors by elevator, clear real job states and a refined game HUD. They can enter authenticated **Edit World** mode, drag furniture, place rooms/textures, type a prompt for a new prop or floor/wall treatment, review generated candidates, accept one into a reusable asset library, bind a machine prop to an approved telemetry source, save/reopen a revision and safely publish the scene **without touching live jobs**.

**Production-readiness is separate from design quality.** A visually accepted multi-floor demo does not establish that protected Paperclip/TrueNAS/job-watcher readers, privacy ACLs, boot persistence and plugin SDK acceptance are solved.