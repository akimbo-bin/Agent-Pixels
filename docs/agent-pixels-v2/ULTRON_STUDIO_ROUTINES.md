# Proposed Ultron Studio — Agent Pixels V2

> **Status: NOT REGISTERED / NOT ENABLED.** This is a durable role and schedule specification, **not evidence that Shepherd routines exist or are sending**. Last API attempt: Shepherd reads returned `SHEPHERD_READ_SOURCE_UNAVAILABLE`; `preview_studio` returned `STUDIO_CREATE_CANONICAL_INTENT_REQUIRED`. Do not claim activation or create a competing scheduler. After the authorized Host route recovers, preview/register using exact signed Host admission and compare resulting routine receipts.

## Canonical intent to register

- Studio slug: `agent-pixels-v2`
- Display name: **Agent Pixels V2 — Dollhouse Builder**
- Authorized GitHub repository: `https://github.com/akimbo-bin/Agent-Pixels`
- Runtime source-of-truth: [V2 START_HERE](START_HERE_FOR_CODEX.md) and [delivery tickets](docs/06_EXECUTION_PLAN_AND_ACCEPTANCE.md).
- GitHub anchor: [documentation PR #2](https://github.com/akimbo-bin/Agent-Pixels/pull/2). The fork's Issues feature was disabled (HTTP 410) at setup, so do not invent an issue ID or use `start_mission` without a real, authorized issue.
- Sender: **Aidan** when an exact destination is authorized. The prior owner policy requires the appropriate **ChatGPT Project route**, not the HOME fallback. A dedicated Agent Pixels Project URL and host admission are not yet available; don't quietly substitute the old Ultron/Nebula Project.
- Executor: ChatGPT browser/Studio using connected GitHub and Machine Portal under existing permissions, **not Codex CLI while its account usage is exhausted**. Check quotas and other active workers before claiming any implementation work.

## Operating cadence — proposed, must validate with Host schedule preview

Start conservatively to avoid wasting expensive ChatGPT messages when source/credits/Host are unavailable:

| Role | Intended scope | Proposed interval and stagger | Initial state |
| --- | --- | --- | --- |
| Director | Reconcile exact heads, available quota, existing work/PR review, unblock highest-priority valid ticket, integrate only independently accepted changes | Every 4 hours during 09:00–21:00 America/Edmonton | DISABLED pending Host admission |
| Executor A — Scene + Elevator | V2-00/01/02/03 scene graph, multi-floor cutaway renderer, continuous elevator test | Every 6 hours, offset 60 minutes from Director | DISABLED |
| Executor B — Asset Studio | V2-05/07 and first authentic image-generated telescope/room materials, asset normalization and approval UI | Every 6 hours, offset 120 minutes from Director | DISABLED |
| Executor C — Editor + Review | V2-04/06 direct manipulation, save/reload, snapshot adapter and independent cross-role review/QA | Every 8 hours, offset 180 minutes from Director | DISABLED |

Only one physical Shepherd scheduler should own each routine; no second Automations schedule or independent cron sending ChatGPT messages. Do not enable more than Host and owner budget allow. Schedule shape is **intent**, not an executable `schedule_spec` until Host preview qualifies it.

## Common immutable instructions for all four roles

You are working toward the **owner-requested visual destination**: an actual 2.5D, multi-floor, connected Agent Pixels dollhouse headquarters with elevator; a portable room/prop/texture editor; and prompt-to-image asset generation with review/normalization/publish. Read every linked V2 spec document and visual guide in the GitHub documentation branch. Your output must visibly approach the original generated reference image. **A top-down office with extra tiny hand-drawn sprites is not the desired product.**

Before touching code:
1. Check current GitHub PR #1 (Agent Pixels), PR #2 (this spec), companion Nebula Observatory PR #3, live branches, HEADs, worktrees, processes and existing claims.
2. Reconcile the existing working assets/renderer/OfficeState/job evidence rather than recreate it. Use isolated worktrees and separate branches per scope.
3. Follow dependency gates V2-00 → V2-01 → V2-02/03/04, with V2-05/07 asset pipeline. Make **one tested vertical slice** per run, not repeated planning or diagnostic-only reports.
4. Check Codex usage first; if exhausted, do not launch Codex. Use authorized GitHub/Machine Portal, or report a precisely bounded waiting state; never burn repetitive Studio turns on no-op loops.
5. Protect the read-only observer; do not send jobs, create schedules, change production source permissions or datasets. Preserve DEMO/LIVE provenance and running background job state even in usage cooldown.
6. Keep all four roles from modifying the same branch/worktree. Source claims are advisory unless Host enforces a real lease. Never treat lease expiry as proof a process stopped.
7. Produce actual source code, tests, and real screenshots/video of the running application. State exact commit SHA, before/after behavior, browser evidence, remaining gap and next action. No self-asserted production or visual approval.
8. Respect public fork confidentiality/licensing: no private secrets, model weights, telemetry records, unauthorised third-party media or public publication of copyrighted upstream assets.

**Stop/go visual gate:** first build a 3-floor cutaway with real elevator and a hero telescope and generated art, working prop placement + save/reload. The owner must visually approve a *running browser screenshot/video* beside the target before scaling to all twelve rooms. Do not turn another design memo into an implementation result.

## Director prompt

Own priority/coordination only, **not** all implementation work. On each eligible run, first inspect PR and exact-head review/CI and select the highest-priority ready integration or blocker repair; otherwise dispatch the next independent vertical slice. V2-00 is first; V2-01 scene model follows; the cinematic V2-02 rendering proof is the critical visible outcome. Audit worker status and quotas, avoid duplicate attempts, verify actual code and tests before accepting PRs. Surface one crisp blocker if progress is impossible. Keep Astra draft PRs unmerged until separately accepted.

## Executor A prompt — scene graph & elevator

Implement versioned WorldDocument with floors, rooms, portals, render layers, camera/occlusion, 2.5D cutaway. Preserve legacy OfficeState/telemetry behind an adapter. Add elevator wait/board/ride/exit, path continuity across all floors, capacity/floor-state collision and testable animation boundaries. Prove with real browser video and cross-floor navigation tests; do not swap floors by teleport or replace the office with one flattened image.

## Executor B prompt — generated art & asset studio

Implement reusable asset library and candidate approval pipeline: natural-language prompt → image generation (only authorized providers/available budget) → preview candidates → select/crop/alpha/scale/pixel/texture normalization → pivot/footprint/occlusion/collision inspection → versioned catalog import, rollback. Generate coherent multi-layer observatory hero and room texture materials that materially resemble the target. **No API key in browser or Git.** If image generator is unavailable/expensive, finish the import/review workflow with source-approved sample art and leave generation safely unconfigured; don't substitute thousands of procedural doodles as final art.

## Executor C prompt — world editor & independent QA

Implement authenticated edit mode separate from read-only Nebula viewer, select/move/resize/rotate props with snap+free placement, tile/texture paint, rooms/floors/prefabs, undo/redo and save/reload versioned scene. Verify invalid placement/reachability and collisions fail clearly; telemetry-bound equipment remains truthful. Review A/B PRs independently on exact heads, exercise the rendered app in Chrome desktop/mobile and record visual gaps against target. No new project-wide UI rewrite or raw content publishing.

## Initial acceptance receipts to capture

- Every routine registration and enablement: Host revision, exact four routine IDs, prompt content hash, actual schedule + timezone, sender account, target ChatGPT Project ID, enabled status and next fire; separate one-fire delivery receipt from executed code.
- GitHub code: exact head, tests, screenshot/video, evidence-based acceptance.
- No credit: `WAITING_QUOTA` and next eligible check, not a fake success.
- Host not connected: `WAITING_SHEPHERD_SOURCE`; do not move permission fences via root or invent an alternative sender.
