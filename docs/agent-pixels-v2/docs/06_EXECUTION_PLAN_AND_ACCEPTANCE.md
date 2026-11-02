# 06. Delivery tickets and measurable acceptance for Codex

These are PROPOSED implementation tickets, **not created GitHub issues, assigned jobs or deployed code**. Each ticket has a dependency, concrete end-to-end behavior and required test evidence. Use one coherent V2 integration line and preserve Astra's existing draft PRs. Report exact changed heads and test results; do not substitute activity for user-visible results.

## Dependency map

```text
V2-00 Reconcile/freeze existing baseline
  |
  +--> V2-01 Scene model & legacy adapter
  |      |
  |      +--> V2-02 3-floor cutaway compositor
  |      |       |
  |      |       +--> V2-03 Real elevator/world routing
  |      |       +--> V2-04 Scene editor direct manipulation
  |      |                 |
  |      |                 +--> V2-07 Prompt art generation
  |      |                          |
  |      |                          +--> V2-08 Hero room & room kits
  |      |
  |      +--> V2-05 Asset registry/import/validation
  |               |
  |               +--> V2-07 Prompt art generation
  |
  +--> V2-06 Snapshot-to-visual adapter reuse & state fixtures
  |
  +--> V2-09 Scene publish & rollback security
  |
  +--> V2-10 Cross-project template / reusable SDK proof
  |
  +--> V2-11 Complete Nebula 3-level migration (after V2-02/03/04/08)
  |
  +--> V2-12 Full QA, owner visual verdict, final independent review
  |
  +--> V2-13 Approved release and deployment (separate production gate)
```

## Prototype gate: V2-00 through V2-05, then first generated hero art

This is the stop/go milestone. **Do not spend effort generating thousands of art files or migrating all twelve rooms until this looks genuinely closer to the reference.**

### V2-00: Preserve and inspect Astra's accepted implementation boundary

Dependencies: none.

- Verify two feature branch heads and PR status; run current Node/Python/typechecks and read current source contract.
- Create isolated worktrees/branches, pin exact SHAs and select an unoccupied loopback port for V2 prototype only.
- Preserve source DTO, existing 2D scene and demo fixtures; no live source or tailnet proxy changes.

**Acceptance**: existing 26 Node and 26 passing Python tests remain green; old scene can still be built and viewed; rollback build manifest recorded.

### V2-01: Versioned scene document and classic adapter

Dependencies: V2-00.

- Introduce multi-floor `WorldDocument` schema and validation with floors, rooms, sprites, materials, elevators, layers, bindings and visual style.
- Read a legacy 2D `OfficeLayout` as a one-floor scene without changing its actor seats, names or machine bindings.
- Ensure save/load and content hash are deterministic; reject malformed and cross-project scene refs.

**Acceptance**: round-trip classic scene has same room/seat/entity counts and unchanged geometry/telemetry; invalid floors/negative sizes/cyclic IDs rejected.

### V2-02: 2.5D renderer vertical prototype

Dependencies: V2-01.

- Show **three visually stacked floors** with actual architectural plates and foreground/backroom layers; first composition includes executive/Clerk, telescope hero space, rocket machines and lounge.
- Provide one shared camera with Fit Building / Floor / Room, parallax sky, shadows/glow, visibility/occlusion and selectable objects.
- Reference image target: make telescope a layered spectacle, not the old simple sprite; use source-approved art and measured actor scale.
- Preserve current classic renderer behind explicit mode flag.

**Acceptance**: screenshot of actual program clearly reads as a dollhouse in default full-screen view; layers and selection work; zero use of a static full-scene image as fake office.

### V2-03: Elevator and cross-floor agent routing

Dependencies: V2-01, V2-02.

- Connect all three floor nav meshes through a visible elevator. Implement entering/waiting/riding/exiting/continuing states.
- Queue many simultaneous passengers; demonstrate cooldown trip without teleport.
- Keep independent watcher-running jobs active during cooldown; unknown source never triggers fictional lounge.

**Acceptance**: recorded actor route from one floor through elevator to another and back, with source-independent visual movement; 12-agent cooldown congestion test and path-block negatives pass.

### V2-04: Minimal editor with place/move/paint/save

Dependencies: V2-01, V2-02.

- Editor switch (auth-gated), one visible asset palette, object picker, drag/drop, move/flip/rotate or scale where allowed, snap, layer, pivot, delete, Undo/Redo, texture painting and room resize.
- Elevator tool edits floor stops/portal positions; collision connectivity shows immediate error.
- Save scene draft and reload it to exact same positions in viewer without changing job system.

**Acceptance**: owner can move telescope and sofa, replace wallpaper and floor texture, save/reload, undo placement and view without coding. Invalid prop blocking elevator landing cannot publish.

### V2-05: Asset library, manual import and QA

Dependencies: V2-01.

- Asset definitions with immutable revision/hash, pivot, alpha, collision, layers, state variants, metadata and license.
- Manual PNG/WebP import, trim, preview against scene, texture seam check, original-scale/LOD preview and simple catalog search.
- Asset pack manifest build pipeline and isolated runtime bundle; no asset auto-published from draft.

**Acceptance**: an imported transparent telescope prop and wall/floor material can be placed from library, scene saves, runtime references exact revision. Missing sprites/oversize/corrupt images fail validation.

## Art and functionality expansion

### V2-06: Preserve source-truth and machine semantics

Dependencies: V2-00, V2-01.

- Reuse v2 normalized read-only snapshot, source TTL, job ownership, named machine bindings and model/render/milestone data.
- Add generic semantic bindings for machine status, queue, model pod, stage and cooldown; no Nebula hardcoding in renderer.
- Ensure VM116 render vs AKIMB0-PC render vs AKIMB0-PC training each update an independent prop in demo; real mode data source unknown stays unknown.

**Acceptance**: time-sequenced fixture proves waiting/queued/running/stalled/done, expired source, cooldown with independent training and no merged machine identity; inspect provenance maintained.

### V2-07: Authenticated prompt-to-asset generator

Dependencies: V2-04, V2-05.

- Add provider adapter, server-only keys, job progress/cancel, per-user quotas, prompt+style reference capture, transparent/opaque choice.
- Accept multiple candidate generations; repair/crop/mask/edit, validate, approve and register into library with immutable version.
- Add image-gen error handling, upload/rights audit, provider off/manual mode. No arbitrary script execution.

**Acceptance**: actual API creates a telescope candidate and texture candidate; manual approval produces usable props with correct pivot; no secret goes into browser; the editor works with provider disabled.

### V2-08: Art-led hero environment and theme kits

Dependencies: V2-02, V2-05, V2-07.

- Complete multi-layer **observatory** as first hero room, executive room second, rocket lab third. Use generated room plates + transparent interactive props, layered lighting, wall trims and background stars. Add material/style templates.
- Retain stage 0..6 telescope visual states only when actual accepted milestone evidence exists; in demo show clear synthetic progression.
- Populate other room themes after screenshot comparison with target. Avoid code drawing ten more schematic teleseopes.

**Acceptance**: three reference crops from actual browser are visually much closer to target in depth and detail, not just higher sprite count. User approves hero slice before mass asset generation.

### V2-09: Draft/publish/rollback and access model

Dependencies: V2-01, V2-04, V2-05.

- Separate editor authoring service from read-only viewer, with project editor/approver permissions, revision checks, immutable bundles and audit log.
- Preview vs Published states; one-click rollback to approved version; cross-project namespace verification.
- No new Paperclip write endpoint or access to raw research artifacts.

**Acceptance**: unauthenticated write fails; viewer stays GET-only; safe publish changes only world skin/version; rollback restores prior scene exactly.

### V2-10: Prove Agent Pixels generality

Dependencies: V2-01, V2-05, V2-09.

- Create a second clean example world unrelated to Nebula (synthetic project) with a different number of floors, roles, machines and distinct art kit.
- No private Nebula source names or files required to create/open/edit/render it.

**Acceptance**: user creates/publishes second project from template with independent scene, asset and data scopes; source contracts tested.

### V2-11: Migrate full Nebula HQ

Dependencies: V2-03, V2-04, V2-06, V2-08, V2-09.

- Map all 12 known agents to correct offices/workstations across 3 floors, with Clerk outside both head offices.
- Build 12+ themed room spaces and elevator routing, including bigger review office and lounge.
- Install model archive with long-list paging, evidence-driven observable telescope, physically stacked real queue, named render/capture and training stations.
- Maintain 2D classic scene as fallback; no forced upgrade of other projects.

**Acceptance**: all 12 agents/role seats and machine ports reachable across floor graph; all source fixtures correct; no source unknown turned into fake activity; saved cutaway world displays after reload.

### V2-12: Real screenshot, animation, performance and security acceptance

Dependencies: V2-08 through V2-11.

- Actual screenshot/video at 1920x1080 and 1366x768, 390x844 mobile; side-by-side comparison with bundled visual target.
- Independent UI acceptance including zoom/focus/drag editor, elevator, portal blocking, sprite/asset transparency, layout editing and generated art.
- Performance under 12+ actors, 250 model records, 140 tickets, several glowing machine bays; record 95th-percentile frame time and memory separately with/without video capture.
- Accessibility audit, reduced-motion, keyboard path, touch interactions, editor auth and asset security. Final independent code/spec review; owner final visual verdict.

**Acceptance**: all gates logged with exact HEAD and artifacts. No unverified acceptance or screenshot-only simulation claims.

### V2-13: Approved release and rollback-tested deployment

Dependencies: V2-12, owner permission decision.

- Deploy read-only published world to approved private tailnet host with scoped access, durable service, health checks, asset hashes and safe fallback.
- Source readers only after their independent authorized read grants; launch editor as a separately authenticated service.
- Verify no Tailscale Funnel, Paperclip/Chibi unaffected, no unintended job execution, and restored viewer after rollback.

**Acceptance**: real cross-node private HTTPS, restart/readback, denied-access test and explicit owner go decision. Both existing Astra draft PRs must receive proper review/merge policy independently of this V2 release.

## Test matrices

### Visual scorecard (actual browser screenshot)

| Axis | Minimum for prototype go | Full release target |
| --- | --- | --- |
| Perspective | unmistakably 3 floors and cutaway depth | entire HQ reads like target's inhabited dollhouse |
| Hero telescope | multi-layer object with dome, optics and at least 2 lighting states | memorable focal environment with staged growth and scenic depth |
| Room identity | executive, rocket, lounge obviously distinct | all specified rooms distinguishable without huge labels |
| Density | 3 authored scenic layers and meaningful clutter per prototype room | varied furnishings/materials/lighting and intentional negative space |
| Agents | walk per-floor and elevator trip with no teleport | all role seats reachable, ambient and cooldown behavior rich |
| Machine states | different named machine statuses visible from overview | at-a-glance render/train/wait/failed, source-verifiable on inspect |
| HUD | compact, retractable, matches game art | refined game UI without taking over screen |
| Interactivity | prop edit/save/reload + inspect | full room/texture/floor/asset authoring, versioned publish |

Owner decides resemblance, not an automated image pixel score. Use the same viewport and camera framing for current/target comparisons, and a cropped close-up on telescope/rocket/reviewer rooms. Explicitly record what's still artistically missing.

### Behavior acceptance (automated)

- **Elevator**: deterministic cross-floor paths and visible travel, occupancy capacity/queue, disabled connector fail-closed, no teleport, seat return and cooldown congestion.
- **Scene editing**: Undo/Redo, reload, revisions, conflict handling, collision rejection, tile seam detection, source assets intact and safe publisher rollback.
- **Generation**: two candidates, edited candidate, approval, alpha transparency, source provenance, stopped/failed provider recovery, no browser-visible credentials.
- **Telemetry**: named machine split, source staleness, usage cooldown evidence required, background training continues, demo/live isolated, model/milestone evidence intact.
- **Performance**: target p95 <=25ms on a representative desktop **without recording**, and >=30fps on tested phone/mobile emulator, with actual measurements. Large decorative FX should pause/reduce with motion preference and offscreen.
- **Security**: no new browser job-control endpoints, no cross-project data leak, no private path/weights/raw audio in image API, no public tunnel.

## Required outcome report from Codex

Provide: two repo exact SHA/revision links, changed file summary, selected ticket scope and observed UX, red/green tests, actual browser screenshots/video, image API receipts without secrets, visual scorecard vs target, original source truth/permission limits, release/deployment state and next unblocked step. **Do not report a plan as completed implementation**.