# Keeping Nebula's illustrated office live and accurate

Audit: 2026-11-09, approximately 08:24–08:30 UTC. This is an implementation proposal, not a deployed integration upgrade. Runtime, Paperclip, job processes and scheduled tasks were not changed. The official release audited was `9956ed1-4bb1fdc8e824`.

## Recommendation

Keep the illustrated office and its existing read-only Paperclip bridge. Introduce one versioned telemetry contract, one organization/room registry and one shared interpretation of live state. Jobs should report facts to this bridge; they should never need to know screen coordinates, control animations or edit the illustrated application.

Paperclip remains authoritative for agents, assignments, runs, issues and approvals. Workload runners remain authoritative for actual execution and measured progress. The world owns presentation, cosmetic movement and its visual delivery history. A person sitting, drinking coffee or delivering a report is not evidence of real work, acknowledgment or a dependency becoming satisfied.

## Current chain and verified condition

```text
Paperclip GET API -> CT125 exporter -> status.json ---------+
                                                          |
AKIMB0 queue files / GPU -> minute publisher -> workstation.json
                                                          |
                          live adapters -> GET /live -----+
                                              |
                       browser poll -> dashboard / agents / rooms / screens
                                              |
                                 local cosmetic animation
```

The organization exporter runs about once per minute; visible browsers poll every five seconds, behind four/five-second server/registry caches. Faster browser polling does not make the source fresher. Workstation publication also runs once per minute. See [deployment](ILLUSTRATED_WORLD.md), [exporter audit](LIVE_PAPERCLIP_AUDIT.md), [registry](../scripts/live/registry.mjs), [server](../scripts/nebula-world-server.mjs), [publisher](../scripts/publish-world-telemetry.mjs) and [task installer](../scripts/install-world-telemetry.ps1).

Point-in-time production observations from read-only GETs:

| Area | Observed | Implication |
| --- | --- | --- |
| Host | `/health` and `/release.json` served the expected release | Application is available; this does not prove data health |
| Organization | 14 agents; one live run; complete board; snapshot about 35 seconds old | Main Paperclip connection works |
| Board | 2 in progress, 10 blocked, 3 in review, 3 backlog; no todo count | Queue panels need to distinguish candidate backlog from ready-to-start work |
| Training | Direct feed said waiting, 93/95 queue jobs done, about 16 minutes old; job registration still said running with a roughly 2-minute-old check | Conflicting observations, not proof of execution; Training room animated from its running agent while its progress screen said unavailable |
| Music | Music room Working; audio model showed `NEB-657 Data` on VM116 | Machine-based alias incorrectly classifies a Data workload as audio rendering |
| Handoffs/listening | 13 visual handoff events; five listening packets | Existing endpoints work, but their ingestion is not a complete durable organization event pipeline |

The configured local queue was still `neb318`. Its status file said `done`, with no saved child, modified at `08:10:58 UTC`; its adapter interprets configured unfinished work as waiting. This audit did not inspect every process or other queue, so it does not establish whether some different training workload was executing. Do not restart training or rewrite job state as part of a visualization fix.

## Gaps to fix first

1. **Workload identity and classification.** `paperclip.renders.vm116` is the first VM116 job, irrespective of kind. It drives Music activity and the audio display. Add explicit `kind`, owning agent, issue, room and attempt identities; never infer rendering from machine location. Existing deduplication can count the job once while retaining its incorrect render label. [Adapter](../scripts/live/adapters/paperclip-org.mjs), [screen consumers](../dev/engine/illustrated-screen-programs.js).
2. **State reconciliation.** Current Training progress reads a fixed queue, while a separate job registration can remain Running. Separate agent execution, external workload execution and queue state. Expose their evidence and conflicts instead of choosing whichever source happens to look freshest. [Training adapter](../scripts/live/adapters/nebula-training.mjs), [state store](../dev/engine/illustrated-room-states.js).
3. **Freshness and partial failure.** Different consumers use 30/90/180/600-second windows. A fresh error snapshot can still become a Running Paperclip source. The dashboard board helper checks completeness without its own age gate, unlike screen programs. Introduce shared section health, age and completeness semantics; preserve last-known data visibly as stale. Never substitute zero or an empty roster for failed collection. [Exporter audit](LIVE_PAPERCLIP_AUDIT.md), [dashboard](../dev/engine/illustrated-dashboard.js), [normalizer](../scripts/live/registry.mjs).
4. **Bindings are scattered.** Company checks, issue prefixes, links, task IDs, name-to-room defaults and screen ordering are hardcoded. `Engine` lives in Observatory while the Engineering room houses builders; Engineering's main screen looks up the agent named Engine. New names fall back to Clerk. Bind by stable IDs and explicit roles, with an unassigned section for new members. [Characters](../dev/engine/illustrated-characters.js), [program resolution](../dev/engine/illustrated-screen-programs.js).
5. **Many displays remain illustrative.** Themed small monitors, chalkboard mathematics, star charts and medical visuals are artwork with activity intensity, not live scientific measurements. Audio supports an in-browser telemetry setter but has no dedicated configured audio producer. All 41 production screen definitions had no custom polling URL during inspection. Keep the art; label measured values and connect dedicated producers where needed. [Screens](../dev/engine/illustrated-screens.js), [programs](../dev/engine/illustrated-screen-programs.js).
6. **Future work will not register itself.** Listening imports five named local packets during deployment. Render counting covers known cohorts and explicitly has partial historical coverage. Handoffs advance when a browser requests live data and omit old/baseline transitions. Newly created jobs, packets and artifacts need a standard publication path. [Catalog builder](../scripts/build-listening-catalog.py), [publisher](../scripts/publish-world-telemetry.mjs), [journal](../scripts/handoff-journal.mjs).
7. **Published world configuration is not shared editing.** Device-local map saves can differ in seats, screens and agent rooms. Existing deployments preserve those saves. Keep private drafts, but add an explicit canonical-map publish/revision workflow before expecting all devices to see new bindings identically. [Current deployment behavior](ILLUSTRATED_WORLD.md).
8. **Integration instructions target the older engine.** [LIVE_OBJECTS.md](../LIVE_OBJECTS.md) describes furniture bindings, `__engine` and old roaming rules, rather than today's illustrated office. Replace its entry point with an illustrated-world guide and mark older engine instructions as legacy.

## Proposed contract: publish once, display everywhere

Add a schema and small reporting client to this repository. The following names describe proposed APIs; no new ingestion route or CLI exists yet.

| Record | Required identity and facts |
| --- | --- |
| Source health | source ID, schema version, collection start/end, observed time, last successful collection, freshness limit, health/error, completeness/limits per section |
| Agent | Paperclip company/agent IDs, raw administrative status; active run IDs and issue IDs from actual run relationships |
| Workload | stable workload ID, attempt/run ID, owner agent ID, issue ID, machine ID, kind, room ID, execution state, reason, lifecycle timestamps, observation source |
| Progress | scope (`current-job` or `queue`), done, total, unit, measured timestamp; absent when not reported; zero only when measured |
| Artifact | stable ID/content hash, producing workload/attempt, kind, location, completion/validation time; explicit render-count eligibility |
| Event | stable ID, company/workload/issue/agent references, event type, occurred time, sequence/cursor; never a command to move a sprite |
| Listening packet | packet/revision IDs, producing issue/workload, blinded clips/trials manifest, readiness; review receipts remain separate from Paperclip approval |

Use separate timestamps for producer heartbeat, last execution evidence and last progress change. A long unit can be healthy without progressing; a recently copied file can contain an old observation. Publishing or polling must never restamp old evidence. Validate finite units, valid states, bounded payloads, company membership, clock skew and duplicate/out-of-order records. Scope identity to workload + attempt so retries do not revive old progress or recount outputs.

For the first implementation, retain the current local-file transport: runners atomically write validated records to an approved telemetry directory, and a publisher forwards normalized observations to CT125. The organization can use one packaged client rather than reimplementing SSH or editing adapters. Move transport/host configuration into the publisher; jobs receive no server administrative credentials. Keep the current independent service accounts/read-only Paperclip access. If push HTTP becomes necessary later, give producers scoped telemetry-write access, payload limits and idempotency; do not expose an unauthenticated general write API or Paperclip credentials to browsers.

A proposed job reporting lifecycle is: `start(workload, attempt, owner, issue, kind)`; `heartbeat(state, evidence)`; `progress(scope, done, total, unit)`; `artifact(id, hash, kind)`; `finish(state, reason)`. The client should make telemetry failure nonfatal to actual work, retry with bounds and support safe local spooling. A collector marks disconnected/stale execution unknown; it does not automatically claim failure or completion.

## One room model for all consumers

- Administrative agent status, current agent-run activity, external execution, data health and cosmetic action remain separate fields. An in-progress ticket or assignment alone is not execution evidence.
- Any fresh running agent run assigned to a room, or any fresh authoritative running workload explicitly bound to it, enables Working animations. A paused agent does not hide its independently running workload.
- Running on the nameplate means an external workload has fresh execution evidence. Agent sessions alone may show Working. Mixed rooms can show both. Workload failure/waiting remains visible in details even if another worker keeps the room active.
- An old Running registration is historical evidence after expiry. Conflicts show source ages and a reconciliation warning; a live agent session does not supply an invented training percentage.
- Operations and Queue stay Statistical and animate continuously, while stale numbers show unavailable/last-known age. Statistical animation never implies the feeds are healthy.
- Preview and Demo override presentation only and are visibly marked. A stale live source never silently turns into demo numbers. Cosmetic seated/coffee/delivery actions never update Paperclip.

Put this resolution on the server or in a shared pure module used by both server and browser. Return resolved state plus `basis`/source IDs so the HUD, screens, lights, nameplates and mobile panels cannot independently reinterpret evidence. Reconcile and deduplicate execution observations by workload + attempt, not ticket title or machine.

## Registry and building coverage

Create one versioned organization manifest with company ID, Paperclip URL/prefix, agent-ID-to-home-room mapping, workload-kind/owner-to-room mapping, source cadence/expiry, screen-ID-to-program/feed binding and room type. Keep artwork geometry and personal sprite preferences separate. Support multiple concurrent workloads in a room and explicit overrides; do not move job ownership because a sprite visits another room.

| Building area | Useful trustworthy feed |
| --- | --- |
| Lead / Second Lead | Their active runs, assigned decisions, blockers, recent completions and approval attention; charts derived from real aggregates where numerical |
| Clerk | Inbox/approvals, unassigned work and schedules only if a real schedule source is connected; decorative mail/sheets otherwise |
| Observatory | Engine/architecture work and explicitly registered research workloads, with illustrative star art kept distinct |
| Engineering | Builder runs, current build/test/CI outcome and artifacts; blueprint artwork as context, with no Engine-name lookup |
| Data | Data-agent runs, dataset jobs, validated cohort/output counts and QA outcomes; chalkboard artwork stays illustrative |
| Training | Selected active workload/attempt, measured current units, separate queue totals, pause reason and fresh GPU observations |
| Music | Explicit audio-render jobs, sample totals and measured analysis vectors when available; no arbitrary VM116 alias |
| Doctor | Doctor's actual diagnostics/checks, health findings and linked issues; X-rays/heartbeat art is decorative |
| Review | Reviewer assignments, active sessions, waiting review items and listening-review availability where explicitly linked |
| Operations | Separate agent sessions, external workloads, service probes, blocked issues and review backlog; clickable source evidence |
| Queue | Candidate backlog/todo, in progress and in review; only label dependency-ready when source blocker/dependency rules establish readiness |

## Organization workflow and maintenance

The job implementer registers workload identity/type and adds reporting using the shared client. The runner publishes execution/progress/artifacts; the Paperclip exporter independently supplies organization facts. The integration maintainer owns schema, source health and room bindings; the UI consumes the registry. Adding a job should require a record/config change, not edits in character, room, hardware and screen modules.

When a worker completes outputs, it publishes artifact manifests and any blinded listening packet. Increment tracked renders from deduplicated validated artifacts, retaining explicit legacy-coverage gaps. A server-side collector updates the listening catalog independently of UI deployments. Read-only dashboard receipts can be consumed by the organization through a documented approved adapter; they do not automatically complete or approve Paperclip tasks.

Run collection independently of browser traffic. Prefer supported Paperclip events if its deployed API provides a verified cursor/replay contract; otherwise poll with persisted watermarks, overlap, deduplication and bounded recovery. Do not assume webhook support. Keep the visual courier journal separate from durable project activity; reopened/recompleted tasks and retries must not replay entire histories.

Add a Connection health view showing each source's expected cadence, last success, measurement age, completeness, current workload/attempt, owning room and any conflicting observations. `/health` remains application liveness; add a separate data-health endpoint. An audit command should print missing producers, unknown room/agent bindings, stale sources, schema errors and reconciliation conflicts without modifying anything. No alert schedules are created by this proposal.

## Delivery order and acceptance

1. **Correctness first.** Remove VM116/audio inference; reconcile Training evidence; configure stable company/agent/room IDs; centralize age/completeness/unknown behavior; surface source health. Prove the real Training state and Music assignment can be traced to specific evidence. Preserve all map artwork and saved edits.
2. **Make jobs easy to connect.** Ship schema, manifest, reporting client and illustrated-world onboarding guide. Convert Training and one VM116 job as examples. Demonstrate a new workload appearing correctly in its room, HUD, screens and Operations without UI source edits; simulate disconnect, retry and a long unit with heartbeat but no progress.
3. **Keep new work visible automatically.** Add durable background collection, artifact/render registration, blinded listening publication and canonical-map revision publishing. Add source-contract tests to producer changes and read-only deployment smoke checks.

Minimum regression fixtures: one failed source with healthy others; stale/partial/future-dated snapshots; malformed empty API results; company or agent rename; multiple agents/jobs per room; paused agent with running external job; old registration versus fresh runner; multiple attempts/machines for one ticket; no-progress healthy heartbeat; no browsers for an hour; duplicate/replayed events/artifacts; demo isolation; rollback; mobile source-health access. Existing room-state/current-progress tests should remain, but passing them is not evidence a live producer is currently reporting.

## Audit verification

Read-only official `/health`, `/release.json`, `/live`, `/api/handoffs`, `/api/listening`; browser inspection of resolved rooms, display models, 41 screen definitions and 14 agent bindings; local configured queue/status metadata and telemetry task status. No runtime controls were used. Existing checks passed: `check-live-screen-accuracy`, `check-current-training-progress`, `check-room-states`, `check-handoff-journal`, `check-handoff-routing`. These verify bounded behaviors and fixtures, not full production execution truth. Detailed exporter findings and source links are in [LIVE_PAPERCLIP_AUDIT.md](LIVE_PAPERCLIP_AUDIT.md).
