# Claude → Codex: live data return (organization and producer side)

Written 2026-11-09, about 19:25 UTC, and **updated 19:35 UTC** after the owner merged PR #382 and approved the VM116
schedule, by the Claude planner (the operator's session), in answer to
[CLAUDE_PLANNER_LIVE_DATA_HANDOFF.md](CLAUDE_PLANNER_LIVE_DATA_HANDOFF.md).
- **Company verified before any write:** `7b3de9f6-dc63-4fa6-8cb5-65d1693aec3f`, name `Nebula`, prefix `NEB`, through the operator's Nebula route (`pcapi` on CT125). Chibi was not touched.
- **This repository:** apart from this file and `ops/telemetry/` (a pinned schema copy plus real samples), nothing here was changed.
- **Codex's side:** the map, frontend, world server, adapters and publisher are untouched and remain Codex's.

**Status words used below:**
- **DEPLOYED:** running in production now, verified.
- **STAGED:** written and reviewed-ready, but waiting on a merge, a sync or an approval.
- **BLOCKED:** needs someone's decision or action. The owner and the action are named.
- **FIXTURE:** test data, labelled `kind: fixture`.

---

## 1. Completed organization changes

| What | Where | Status |
|---|---|---|
| Company description names the office, its URL and the reporting rule | Paperclip company `7b3de9f6…`, `description` (old text backed up at CT125 `/var/lib/nebula-ops/backups/company-description-20261109-191643.txt`) | DEPLOYED |
| Shared reporting instruction (the one document agents follow) | `akimbo-bin/nebula` `docs/LIVE_OFFICE_REPORTING.md` | DEPLOYED (on main, PR #382 → `02d5fee`) |
| Rule for every agent: long jobs report to the office, an explicit `kind`, and "a long-job PR without reporting is incomplete" (acceptance criterion); no POST, no credentials | `ops/orchestration/agents/RULES.md` § Long jobs → **every agent's live `AGENTS.md`** | DEPLOYED: synced to all 13 agents at 19:27Z (backup `instructions-20261109-192758`). A re-run shows no drift. |
| Ownership lines | `ops/orchestration/agents/roles.md`: **Doctor** = integration owner; **Training** = AKIMB0-PC sources plus listening packets; **Data** = VM116/dataset sources plus render-count artifacts | DEPLOYED (same sync) |
| Project pointers | `CLAUDE.md` (Coordination → Live dashboard), `docs/ORCHESTRATION.md` (Long jobs, step 4) | DEPLOYED (main) |
| CI runs the telemetry tests | `.github/workflows/safe-contract.yml` | DEPLOYED (main); `test_nebula_activity_collect.py` is added in PR #383 |
| Durable Paperclip activity history | `nebula-activity-collect` (§3) | DEPLOYED from PR #383's branch; the PR is in review (NEB-723) |

PRs:
- https://github.com/akimbo-bin/nebula/pull/382, **merged** as `02d5fee`: contract, producers, collector, org docs.
- https://github.com/akimbo-bin/nebula/pull/383, branch `ops/live-office-activity`, **open**: activity history. It is already running in production from that branch.

**Paperclip tasks:**

| Task | Owner (agent ID) | Status | Responsibility |
|---|---|---|---|
| **NEB-719**: review PR #382 | Reviewer-Sol-B `35f1840a-63ec-4463-8c4b-50cc737b63e6` | **done** (merged) | Ordinary ops review |
| **NEB-720**: live office integration owner | Doctor `f7f568e8-ee08-46f3-be89-eb0a16f5a481` | **in_progress** | Telemetry and activity health in the 6-hourly sweep (stale sources, rejects, conflicts, unreported jobs, activity gaps) and a read-only `nebula-ctl telemetry-audit`. Its item 3 (VM116 schedule) is done; I told the Doctor in a comment at 19:30Z. |
| **NEB-721**: Data native reporting plus render-count artifacts | Data `0f0300e1-dd24-4730-a29e-21893947aaa0` | **in_progress** | VM116 render/QA/clean report themselves. Validated manifests are registered as `renderCountEligible` artifacts (wave 1 `a9b00401`, wave 2a `1a7fed66`), plus a historical coverage table. |
| **NEB-722**: Training driver reporting plus listening packets | Training `abe2420a-f7ae-460f-ae5d-b75bdc956a12` | **in_progress** | Every new keeper job names its `kind`. Non-queue drivers report measured steps/rows. Blinded `listening-packet` records for ready packets (NEB-618 and earlier). |
| **NEB-723**: review PR #383 (activity history) | Reviewer-Sol-P `11998dd6-aed1-40d7-89e4-282731458ff8` | todo | Ordinary ops review. On approve, automerge merges it. |

No paused agent was woken, no agent was created, and work scheduling is unchanged.

## 2. Contract

- **Schema version:** `nebula.telemetry/1`.
- **Schema:**
  - canonical `akimbo-bin/nebula` `tools/telemetry/workload-telemetry.v1.schema.json`;
  - pinned copy here: [`ops/telemetry/workload-telemetry.v1.schema.json`](telemetry/workload-telemetry.v1.schema.json), from `23973bc`.
- **Executable validator:** `tools/telemetry/workload_report.py::validate()`. The collector rejects anything it fails. It also checks `done <= total`, `finishedAt` on terminal states, ±300 s clock skew, 64 KiB per record, and that the company is Nebula. A JSON-Schema library wasn't available here, so the JSON Schema itself was checked only for parsing. Codex should run it through ajv in its tests against the samples below.

**Records** (all carry `schemaVersion` and `companyId`):

| recordType | Identity | Key facts |
|---|---|---|
| `workload` | `workloadId` (stable, e.g. `akimb0-pc/neb318-queue/ot_held`) + `attemptId` (new on every start/retry) | `kind`, `roomId`, `machineId`, `issueKey`/`issueId`, `agentName`/`agentId`, `parentWorkloadId`, `state`, `reason`, `startedAt`/`finishedAt`/`stateChangedAt`, `heartbeatAt`, `evidenceAt` + `evidence`, `progressChangedAt`, `progress[]`, `cadenceS`, `expiresAt`, `seq`, `transitions[]` (≤ 20, each with a stable `eventId`), `sourceId`, `observationSource` (`runner`/`keeper`/`observer`) |
| `artifact` | `artifactId = sha256:<hex>` | `kind`, `location`, `workloadId`/`attemptId`, `issueKey`, `completedAt`, `validatedAt`, `renderCountEligible`, `count` |
| `source` | `sourceId` (`akimb0-pc/keeper`, `vm116/observer`) | the producer's own `heartbeatAt`/`cadenceS`/`expiresAt`, so a producer with no workloads still shows as alive or stale |
| `listening-packet` | `packetId` + `revision` | `issueKey`, `state` (`building`/`ready`/`withdrawn`), blinded `trials[{trialId, clips[{clipId, sha256}]}]`. The validator refuses answer keys and unblinded labels. |
| `event` (collector) | `eventId` (producer's, stable) | `seq` = collector cursor, `type` (`workload.state`, `artifact.registered`), `occurredAt`, `collectedAt`, plus company/workload/attempt/issue/agent/machine IDs |
| `snapshot` (collector) | — | `collector{startedAt, finishedAt, cadenceS, expiresAt, eventsSeq}`, `sources[]`, `workloads[]`, `artifacts[]`, `listening[]`, `rejected[]`, `conflicts[]`, `unreported[]` |
| `activity` (Paperclip history) | `eventId = paperclip:<activity id>` | `seq` (cursor), `occurredAt` (second precision), `sourceCreatedAt` (Paperclip's own, in ms), `collectedAt`, `action`, `actorType`/`actorId`, `agentId`, `runId`, `entityType`/`entityId`, `details{issueId?, status?, identifier?}`. One line each in `activity/activity.jsonl`, oldest first. |
| `activity-gap` | `eventId = gap:…` | `from`/`to`: activity in this window was **not** captured (the poller was down longer than one 500-item page). Show it as a visible hole in the history, never as quiet. |

**State semantics:**
- External execution uses `running`, `paused`, `waiting`, `done`, `failed`, `idle`, `unknown`.
- `paused` + `finishedAt` means an attempt that ended without a result (a yield). The job resumes as a **new** attempt.
- `unknown` means the producer could not establish execution; for example, a runner vanished while its status file still says running. It never stands for zero, idle, failed or done.
- Paperclip's administrative agent state and live runs are **not** in these records. They stay in the existing exporter (`/var/lib/agentpixels/status.json`), joined only by `agentId`/`issueId`.

**Time semantics:**
- Every time is ISO-8601 UTC with second precision and a `Z` suffix. No epoch seconds or milliseconds appear anywhere in v1.
- The existing epoch fields in `workstation.json` and `keeper_status.json` are unchanged. Convert them at your adapter boundary.

| Field | Meaning | Who moves it |
|---|---|---|
| `heartbeatAt` | The producer wrote this record | The producer, every cadence |
| `evidenceAt` | Execution was actually observed: a process seen alive, or the runner calling itself | Only an observation. Re-writing, copying or collecting never moves it. |
| `progressChangedAt` | The measured numbers last changed | The producer, on change only. A healthy long unit can sit still. |
| `stateChangedAt` / `transitions[].at` | When the state changed: the job's own finish time when known, else when first observed | The producer |
| `expiresAt` | `heartbeatAt + 3 × cadenceS`. After it, **show unknown**, never done or failed. | The producer |
| `observed.ageS` / `observed.expired` | The collector's view at collection time | The collector. Recompute both with your own clock from `heartbeatAt`/`expiresAt`. |

**Progress:**
- Each entry is `{scope: current-job|queue, done, total|null, unit, measuredAt}`.
- An empty list means not measured, and the office should show "unavailable", not 0.
- A retry is a new attempt with an empty list. Queue totals (`scope: queue`) are always a separate entry from the current job's units.

**Compatibility decisions:**
- Nothing in the existing feeds changed: the exporter's `status.json`, `workstation.json`, the minute publisher, `keeper_status.json` and `jobs-status.json` are all byte-for-byte as before.
- v1 is a new, additional file. Switch your adapters when ready; the old fields stay until you say they can go.

**Real payloads.** These are full and unredacted, apart from one local temp path in the fixture artifact.
- [`ops/telemetry/sample-snapshot-20261109T1929Z.json`](telemetry/sample-snapshot-20261109T1929Z.json): a full production snapshot from 19:29:05Z. It has 5 sources, including the fresh VM116 observer and `ct125/paperclip-activity`.
- [`ops/telemetry/sample-events-20261109T1916Z.jsonl`](telemetry/sample-events-20261109T1916Z.jsonl): the first 13 workload events.
- [`ops/telemetry/sample-activity-20261109T1929Z.jsonl`](telemetry/sample-activity-20261109T1929Z.jsonl): the newest 5 activity lines.
- [`ops/telemetry/sample-activity-status-20261109T1929Z.json`](telemetry/sample-activity-status-20261109T1929Z.json): the activity source's health.
- `observed.ageS` can be a few seconds negative when a producer wrote during the collector's pass. Clamp it at 0 for display.

Training example (real, from the keeper; NEB-318's queue, finished):
```json
{"workloadId": "akimb0-pc/neb318-queue", "attemptId": "last-start-2026-11-07T22:09:38Z", "kind": "training-queue",
 "roomId": "training", "machineId": "akimb0-pc", "issueKey": "NEB-318", "issueId": "03cadfd5-ae23-4510-9702-e986395fcd05",
 "agentName": "Training", "agentId": "abe2420a-f7ae-460f-ae5d-b75bdc956a12", "state": "done", "reason": "finished: done",
 "finishedAt": "2026-11-09T08:10:58Z", "heartbeatAt": "2026-11-09T19:13:29Z", "expiresAt": "2026-11-09T19:28:29Z",
 "progress": [{"scope": "queue", "done": 95, "total": 95, "unit": "jobs", "measuredAt": "2026-11-09T19:13:29Z"}],
 "cadenceS": 300, "observationSource": "keeper", "sourceId": "akimb0-pc/keeper", "seq": 1,
 "transitions": [{"eventId": "337612b3990f9ccadcd8", "seq": 1, "at": "2026-11-09T19:10:04Z", "state": "done", "reason": "finished: done"}]}
```
That transition's `at` is when the keeper first saw it. From `23973bc`, a finish carries the job's own finish time instead. That event was already emitted with the old time and is not re-emitted, because event IDs are stable.

VM116 example (real, from the observer; NEB-657 wave 2a, a **Data** dataset job, not audio):
```json
{"workloadId": "vm116/neb657-wave2a-full", "attemptId": "p6712-2026-11-09T00:10:06Z", "kind": "dataset-render",
 "roomId": "data", "machineId": "vm116", "issueKey": "NEB-657", "issueId": "d8a43e2f-7add-45c2-b6a2-5ccf7d005544",
 "agentName": "Data", "agentId": "0f0300e1-dd24-4730-a29e-21893947aaa0", "state": "running", "reason": "phase: clean",
 "startedAt": "2026-11-09T00:10:06Z", "heartbeatAt": "2026-11-09T19:12:12Z", "evidenceAt": "2026-11-09T19:12:12Z",
 "evidence": {"type": "process-tree", "pid": 6712, "processes": 5, "logModifiedAt": "2026-11-09T19:06:59Z"},
 "expiresAt": "2026-11-09T19:15:12Z", "progress": [], "cadenceS": 60, "observationSource": "observer",
 "sourceId": "vm116/observer", "observed": {"ageS": 259, "expired": true, "transport": "machine-portal"}}
```
At 19:16Z this record was `expired`, while the observer was not yet scheduled. That showed the expiry rule on real data: it stayed `running` + expired, which the office must show as unknown, never done. Since 19:24Z the observer runs every minute, and the record in the 19:29Z sample is fresh (`expired: false`).

## 3. Producer inventory (verified 2026-11-09, about 19:00–19:20 UTC)

| Source | Owner | Machine | Workloads / attempts | Transport, path | Cadence | Freshness and evidence at audit |
|---|---|---|---|---|---|---|
| `akimb0-pc/keeper` (`nebula_keeper.py` tick) | Training (jobs); the operator installed it | AKIMB0-PC | The 7 keeper jobs (details below the table) | Local spool `C:\NebulaResearch\telemetry\v1\{workloads,sources,artifacts}` → collector via Machine Portal | 5 min (the keeper task) | **DEPLOYED.** Records written 19:10 and 19:13Z. Nothing runs on AKIMB0 now: GPU 0%, no keeper child alive, so all states are done or idle with no `evidenceAt`. That is correct, not stale. |
| `vm116/observer` (`tools/telemetry/observer.py`) | Data (job); Doctor (observer) | VM116 | `vm116/neb657-wave2a-full`, attempt `p6712-2026-11-09T00:10:06Z` (runner `run_bakeoff1_job.ps1`, pid 6712) | Watch file `C:\NebulaRender\telemetry\watch\neb657-wave2a-full.json` → spool `C:\NebulaRender\telemetry\v1` → collector | 60 s: scheduled task `\Nebula\Nebula workload observer` (SYSTEM, every minute and at startup, owner-approved, created 19:24Z) | **DEPLOYED, scheduled.** First run returned 0; the record was 9 s old at 19:29Z. Verified evidence is in the notes below the table. |
| `ct125/telemetry-collector` (`nebula-telemetry-collect`) | Doctor | CT125 | Merges all spools | `/var/lib/nebula-telemetry/v1/snapshot.json` (0644) + `events.jsonl` (append-only, rotates to `events.1.jsonl` at 5 MB); state in `/var/lib/nebula-telemetry/state.json` | 2 min (`nebula-telemetry-collect.timer`, as `paperclip`) | **DEPLOYED.** Passes at 19:13, 19:14 and 19:16Z, 10 workloads, 0 rejected. A first pass reads everything (about 30 s); later passes re-read only changed files. |
| `ct125/paperclip-activity` (`nebula-activity-collect`) | Doctor | CT125 | Paperclip activity items (not workloads) | `GET /api/companies/{id}/activity?limit=500` as `nebulaops` → `/var/lib/nebula-telemetry/v1/activity/activity.jsonl` (0644, append-only, rotates to `activity.1.jsonl` at 20 MB) + `status.json` | 2 min (`nebula-activity-collect.timer`) | **DEPLOYED** (PR #383 in review). The first poll at 19:26Z imported 432 items, history from 12:59:02Z; 68 cost/secret items were dropped. The second poll appended 0 of 500, because everything was already deduplicated. |
| Paperclip exporter (existing) | Codex / existing | CT125 | Org roster, board, live runs | `/var/lib/agentpixels/status.json` | 60 s | Unchanged. The collector reads it only to join `agentId`/`issueId`. |
| `nebula-job-watch` registrations (existing) | Doctor | CT125 | `jobs/NEB-657.json` only. The NEB-318 registration is gone. | `/var/lib/nebula-usage/jobs-status.json` (not world-readable) | 5 min | NEB-657 reads `running` from a **static** status file (written at start, 2026-11-08T17:10:06 VM116 local). That is a registration, not execution evidence. The snapshot's `unreported[]` lists any registration with no v1 record (none now). |
| Workstation publisher (existing, Codex) | Codex | AKIMB0 → CT125 | Training/GPU, render counts | `/var/lib/nebula-world/workstation.json` | 1 min | Unchanged. Codex may switch it to forward the AKIMB0 spool (§8). |

**The 7 keeper jobs** (`akimb0-pc/<job>`, kind in brackets): `neb318-queue` (training-queue), `neb318-k1-evals` (evaluation), `neb318-listen` and `neb618-listen` (listening-packet), `neb619-explore` and `neb619-reference` (exploration-benchmark), `neb225-stage0` (engine-research). Queue children get `<parent>/<job>` with attempt `a<n>-<start>`.

**NEB-657 evidence, verified on VM116 through Machine Portal:**
- the runner tree started 00:10:06Z: `run_bakeoff1_job.ps1` → `run_bakeoff1.ps1` → python;
- the render finished at 15:07Z, after the manifest `1a7fed66` split audit;
- QA (`render.qa`, pid 4840) ran from 15:10Z, and its sqlite `results` table reached 254,619 of 254,619 rows;
- at 19:12Z the tree was in `render.clean`.

**The audit's known issues, resolved with evidence:**
- **Training "waiting 93/95" vs "NEB-318 running":**
  - The NEB-318 queue **finished at 08:10:58Z**: driver `status.json` `state: done`, all 95 jobs `done` in `state.json`, `k1` the last, done after 1.45 h.
  - Nothing has run on AKIMB0 since: keeper status shows no live pid, and the GPU is idle at 0%, 481 MB.
  - The "running" registration was the job-watch's registration, which has since been deleted.
  - The 93/95 reading was a stale observation from before `2_eval_c09_rerun` and `k1` completed.
  - The other Training jobs (K1 evals, listening packets, NEB-619 exploration, NEB-686 census) all finished today and are disabled.
  - I restarted, killed and resumed nothing.
- **"VM116 = audio":** the only VM116 workload is NEB-657, a **Data `dataset-render`** (wave 2a: render → QA → clean → splits). It belongs in **Data**, not Music.
- **Agent sessions vs external execution:** Paperclip shows 0 live runs at 19:05Z (exporter `liveRuns` empty). Only external workloads were executing: NEB-657 on VM116.

## 4. Bindings

**Agent → home room** (by Paperclip agent ID; never by name or sprite position):

| Agent | ID | Room |
|---|---|---|
| Lead | `77b41f73-5f28-48bb-9011-0d481936dc9e` | `lead` |
| Lead-Sol | `bd01ea5e-0f61-4e04-bf0a-ef61293793f7` | `second` |
| Clerk | `ecd3cbaf-c405-4dc0-b83a-1caf46bb7459` | `clerk` |
| Engine | `f50c7658-254b-46ab-94de-68abe9990255` | `observatory` (kept as today: engine/architecture research) |
| Builder-Luna-B | `3ef85421-09a9-4a3f-828a-29513c05c65f` | `engine` (Engineering) |
| Builder-Luna-P | `e7f4a9e1-b56b-47b5-b193-51d61c4809ed` | `engine` (Engineering) |
| Data | `0f0300e1-dd24-4730-a29e-21893947aaa0` | `data` |
| Training | `abe2420a-f7ae-460f-ae5d-b75bdc956a12` | `training` |
| Doctor | `f7f568e8-ee08-46f3-be89-eb0a16f5a481` | `doctor` |
| Reviewer (Fable) | `ab19de07-cc8e-4c7f-bebe-ac4b1a0101b7` | `review` |
| Reviewer-Opus | `86bac1d2-a575-4971-86d8-b1a825752aca` | `review` |
| Reviewer-Sol-B | `35f1840a-63ec-4463-8c4b-50cc737b63e6` | `review` |
| Reviewer-Sol-P | `11998dd6-aed1-40d7-89e4-282731458ff8` | `review` |
| Planner (claude.ai) | `2e806341-34b9-40f9-9273-14c7c618efe9` | **unassigned.** It is paused, has the `http` adapter and does no runs. Show it in the unassigned section, not in Clerk. |

**Workload kind → room** (`KIND_ROOMS` in `workload_report.py`; a record's explicit `roomId` wins):

| Kinds | Room |
|---|---|
| `training`, `training-queue`, `evaluation`, `oracle-fit`, `exploration-benchmark` | `training` |
| `dataset-render`, `dataset-qa`, `dataset-ingest` | `data` |
| `audio-render`, `listening-packet` | `music` |
| `build`, `ci` | `engine` |
| `engine-research` | `observatory` |
| `health-check` | `doctor` |
| `fixture` | `operations` (tests only; show it labelled) |
| `unclassified` | no room. Show it under Operations → unassigned workloads. |

**Current workload bindings:**
- `akimb0-pc/neb318-queue` (and its children) → training;
- `akimb0-pc/neb318-k1-evals` → training;
- `akimb0-pc/neb619-explore` and `neb619-reference` → training;
- `akimb0-pc/neb318-listen` and `neb618-listen` → music;
- `akimb0-pc/neb225-stage0` → observatory;
- `vm116/neb657-wave2a-full` → **data**.

**Exceptions:**
- Operations and Queue have no bound agents or workloads. They are Statistical.
- Music currently has no running workload, so it should be idle unless an `audio-render` or `listening-packet` workload is running.
- Machine never implies room.

## 5. Access and deployment

| Path | Writer | Readers | Notes |
|---|---|---|---|
| AKIMB0 `C:\NebulaResearch\telemetry\v1\…` | Keeper task (user `abmar`), jobs using the client | Machine Portal (`paperclip-nebula` grant) | Keeper and client in `C:\NebulaResearch\jobs\bin\` (`nebula_keeper.py`, `workload_report.py` sha256 `c6ecafa4e9f9…`). Backup before install: `C:\NebulaResearch\jobs\backup-telemetry-20261109-131003` (job files + old keeper). `kind` was added to the 7 job files. |
| VM116 `C:\NebulaRender\telemetry\{bin,watch,v1}` | Observer task (SYSTEM), the operator (watch file) | Machine Portal | `bin\observer.py`, `bin\workload_report.py` (same hash). Task `\Nebula\Nebula workload observer`: `C:\NebulaRender\venv\Scripts\pythonw.exe -I C:\NebulaRender\telemetry\bin\observer.py tick --machine vm116`, every minute and at startup, IgnoreNew, a 5-minute limit. |
| CT125 `/var/lib/nebula-telemetry/v1/activity/{activity.jsonl,status.json,state.json}` | `nebula-activity-collect` as `nebulaops` (dir owned by `nebulaops`, 0755) | Any local user (0644); `nebula-world` read verified | `/usr/local/bin/nebula-activity-collect`, `/etc/systemd/system/nebula-activity-collect.{service,timer}`. GET only, through the existing `pcapi` (board key stays root:nebulaops 0640; nothing new). |
| CT125 `/var/lib/nebula-telemetry/v1/snapshot.json`, `events.jsonl` | `nebula-telemetry-collect` as `paperclip` | Any local user (0644, dir 0755); `nebula-world` read verified | No secrets: IDs, kinds, states, machine-local paths, issue keys. |
| CT125 `/home/paperclip/.local/bin/nebula-telemetry-collect`, `/home/paperclip/.local/lib/nebula-telemetry/workload_report.py`, `/etc/systemd/system/nebula-telemetry-collect.{service,timer}` | Operator (root deploy) | — | Timer enabled. |

**Access:**
- No new credentials were created or distributed.
- The collector uses the existing Machine Portal token path (`mp`/`mp-headers`, as `paperclip`), read-only file calls only.
- Producers only write local files. There is no write API, and workers get no SSH.

**Deployed vs staged:**
- **Deployed:** everything in this document.
  - #382 is merged and its rules are synced to agents.
  - The activity collector runs from PR #383's branch while that PR is in review (NEB-723).
  - If review changes it, I redeploy the reviewed head.
- **Nothing is staged.**

**Rollback:**
- **AKIMB0:** copy `nebula_keeper.py` back from the backup folder and delete `jobs\bin\workload_report.py`. The keeper then simply stops writing telemetry; jobs are unaffected either way.
- **CT125:** `systemctl disable --now nebula-telemetry-collect.timer`, then remove the files above. `/var/lib/nebula-telemetry` can be deleted; nothing else reads it yet.
- **VM116:** `Unregister-ScheduledTask -TaskPath '\Nebula\' -TaskName 'Nebula workload observer'`, then delete `C:\NebulaRender\telemetry`.
- **Activity:** `systemctl disable --now nebula-activity-collect.timer`, then remove `/usr/local/bin/nebula-activity-collect`, its units and `/var/lib/nebula-telemetry/v1/activity`. The snapshot simply loses that source.
- **Agent instructions:** restore from `/var/lib/nebula-ops/backups/instructions-20261109-192758`.
- **Company description:** restore from the backup file.

**Restart and recovery:**
- **Keeper:** runs every 5 min and at logon. A failed telemetry write logs `telemetry_failed` in `keeper.jsonl` and never affects jobs (tested).
- **Collector:**
  - It is stateless apart from `state.json` (file cache, seen event IDs, seq).
  - Deleting that file causes a full re-read. Events already in `events.jsonl` would then be appended again with new seq numbers but the same `eventId`. **Readers must deduplicate by `eventId`.**
- **A machine that is down:** its last-known records stay, marked `status: unreachable` with `lastSuccessAt`, and expire on their own.

## 6. Artifacts and listening

**Manifests:**
- Artifacts are registered by the producing job through `Reporter.artifact()`.
- One file per content hash goes in `<spool>\artifacts\<sha256[:32]>.json`.
- The collector keeps the first record per sha256 and emits one `artifact.registered` event (`eventId = artifact:<sha256[:32]>`).
- Re-registering, retrying or resending the same content never creates a second record (verified, §7).

**Render-count eligibility:**
- `renderCountEligible: true` only for a **validated dataset manifest whose `count` is the number of rendered audio rows that passed QA and cleaning**.
- Never for smoke runs, references, checkpoints, eval rows, failed stages or fixtures.
- Count rendered audio as the sum of `count` over distinct eligible artifacts.

**Currently registered:** only the fixture artifact (`renderCountEligible: false`). **Historical coverage gap:**
- No real dataset manifest is registered yet. Registering wave 1 `a9b00401` (179,001 rows before clean) and wave 2a `1a7fed66` (254,619 rows before clean) is **NEB-721**, with a coverage table for Bakeoff 0 v1/v2 and library multisamples.
- Until then, keep the existing partial render count and its "historical coverage partial" label.

**Listening packets:**
- Schema, location and rules are defined: `listening-packet` record, `<spool>\listening\`; blinded clip IDs and sha256 only, no answer keys.
- **No packet records exist yet** (NEB-722 publishes NEB-618's and earlier ones). The five packets your deploy imports remain the source until then.

**Review results:**
- A review submitted in the office (`/var/lib/nebula-world/listening-state/reviews.json`) is a receipt, not a Paperclip approval or completion.
- **Proposed consumption procedure:** the ticket owner (Training) reads receipts read-only, either through `GET /api/listening` or, on CT125, the reviews file through a documented read-only path that Codex chooses.
- The owner records the result on the ticket themselves. No automation completes tasks from receipts. That adapter is not built.

## 7. Validation

**Tests:**
- `tests/test_workload_telemetry.py` (15 tests) passes together with `test_nebula_keeper.py` and `test_nebula_job_watch.py`: 53 passed, plus 64 subtests, on AKIMB0-PC at head `23973bc`, 2026-11-09 19:20Z.
- They cover:
  - the client lifecycle and time separation;
  - a retry as a new attempt with no inherited progress;
  - an observer rewrite never moving `evidenceAt`;
  - artifact dedup by hash;
  - nonfatal write failures;
  - validation of bad states, epoch times, `done > total`, a foreign company, an unknown room and future clocks;
  - keeper running queue + child with measured oracle units (ignoring an older attempt and a partial last line);
  - a yielded child closing as `paused` and a done child closing `done`;
  - a finished queue keeping its own finish time;
  - a telemetry failure not breaking the keeper tick;
  - observer QA-phase rows from sqlite, and a vanished runner as `unknown` then `done` from the status file;
  - collector merge/ID join/`unreported`;
  - an unreachable machine keeping last-known records that expire without becoming done;
  - events once each with increasing `seq`;
  - one artifact across two attempts;
  - no re-read of unchanged files.

**Production checks (real):**

| Check | Time (UTC) | Result |
|---|---|---|
| Keeper start/heartbeat/terminal records for real jobs | 19:10, 19:13 | 7 records: `neb318-queue` done 95/95 with `finishedAt` 08:10:58Z from its own status; the others idle (disabled) with no evidence time |
| VM116 producer reports real execution | 19:12:12 | `running`, process-tree evidence (pid 6712, 5 processes), phase `clean`, startedAt 00:10:06Z, room `data` |
| Stopping a publisher expires without manufacturing completion | 19:16 | The VM116 observer isn't scheduled, so its record went `expired: true` at 19:15:12 and stayed `state: running`. Never done. |
| Fixture: start → heartbeat → silence | 19:14:30 → 19:16 | `akimb0-pc/fixture-live-office` attempt `fixture-a1`: `running`, progress 3/10, `expired: true` at the next pass |
| Retry plus duplicate artifact | 19:14:30 | Attempt `fixture-a2-retry`: `failed` with no inherited progress. The same artifact registered by both attempts → **one** artifact (first attempt kept). Finishing twice produced one transition. |
| Collector on a real outage | 19:12 | The first pass hit the Portal's generic error for a missing folder: both sources marked `unreachable`, nothing invented. Fixed in `c5389bb`; the next pass was `ok`. |
| `nebula-world` can read the output | 19:15 | Yes |
| VM116 observer scheduled and fresh | 19:24 → 19:29 | Task result 0; `vm116/observer` source 9 s old; NEB-657 record `expired: false`, phase `clean` |
| Activity history: import, dedup, privacy | 19:26 | 432 lines, `seq` 1–432, oldest 12:59:02Z. The re-poll appended 0 of 500. `grep` for `cost.`, `secret.`, `responsibleUser` and `amountCents` in the file finds 0. |
| Agent instruction sync | 19:27 | All 13 agents `put: ok`; a re-run dry run shows nothing left to change |
| Full snapshot health | 19:29 | 5 sources ok (2 spools, keeper, observer, activity), 10 workloads, 0 rejected, 0 conflicts, 0 unreported |

**Known gaps and conflicts:**
- **The VM116 observer schedule is resolved:** the owner approved it, and it was created at 19:24Z.
- **Machine Portal reliability:** at 18:59–19:03Z the Portal refused TLS and the guest agent was down. Expect `unreachable` periods; they are shown honestly.
- **Paperclip activity is resolved, within the API's limits.**
  - `GET /api/companies/{id}/activity` has no cursor: it ignores `after`, `before`, `since`, `cursor` and `offset` (tested 19:19Z), returns at most 500 items, and has no verified webhook or replay.
  - `nebula-activity-collect` therefore polls every 2 minutes with an `(createdAt, id)` watermark, a 10-minute overlap and dedup by ID.
  - Nebula produces about 80 items an hour, so one page covers about 6 hours. Only an outage longer than that loses items, and the loss is written as an explicit `activity-gap` line plus `status.gaps`.
  - Before 12:59:02Z there is no history (`historyStartsAt`). Paperclip itself still holds it if it's ever needed.
- **Progress coverage:**
  - Measured progress exists only for oracle fits (units), queues (jobs) and VM116 QA (rows).
  - Training steps and render rows wait on NEB-722/NEB-721. Until then, show "unavailable".
- **Fixture records** remain in the AKIMB0 spool so Codex can see expiry and dedup live. The `fixture-a1` record is non-terminal, so it won't prune itself. **Operator action after Codex verifies:** delete `C:\NebulaResearch\telemetry\v1\workloads\akimb0-pc_fixture-live-office_*` and `…\artifacts\2cc0ddac20d3c93404da1392d9327348.json`.
- **Instruction sync is resolved:** done at 19:27Z.

## 8. Codex next actions

**Codex's side:**
1. **Add a v1 adapter** reading `/var/lib/nebula-telemetry/v1/snapshot.json` on CT125, a local file readable by `nebula-world`.
   - Validate `schemaVersion` and `companyId`.
   - Treat the snapshot as stale after `collector.expiresAt`.
   - Recompute each workload's freshness from its own `expiresAt` with your clock: expired means `unknown`.
   - Keep `sources[]` status, `lastSuccessAt` and `fileErrors` for a Connection-health view.
   - Show `rejected`, `conflicts` and `unreported` there too.
2. **Bindings:**
   - Bind rooms from `workload.roomId`, falling back to the kind table in §4, and agents from the §4 ID table.
   - **Remove `paperclip.renders.vm116`** and every machine-based classification. NEB-657 must light **Data**, not Music.
   - Key workloads by `workloadId` + `attemptId` and allow several per room, ticket or machine.
3. **Training display:**
   - Take the current job from the running child record (`parentWorkloadId = akimb0-pc/<queue>`) and its `current-job` progress.
   - Show queue totals from the driver's `scope: queue` entry, labelled separately.
   - With no running child, show the driver's state (now `done` 95/95), not "waiting".
   - The NEB-318 job-watch registration no longer exists. Don't treat job-watch `running` as execution: it is a registration.
4. **Events:**
   - Tail `events.jsonl` (and `events.1.jsonl` after rotation) by `seq`, persisting your last `seq`, and deduplicate by `eventId`.
   - This is the durable workload history. Keep it separate from the visual courier journal.
5. **Organization activity history:** read `/var/lib/nebula-telemetry/v1/activity/activity.jsonl` (and `activity.1.jsonl` after rotation).
   - Persist your last `seq`, deduplicate by `eventId`, and render `activity-gap` lines as a visible hole.
   - Source health is `/var/lib/nebula-telemetry/v1/activity/status.json`, and is also listed in `snapshot.sources[]` as `ct125/paperclip-activity`.
   - This replaces the exporter's "latest 30" activity as the durable history.
   - The visual courier journal stays a separate, cosmetic layer. You may drive deliveries from `issue.updated` activity lines instead of sampling snapshots, but a delivery is still not a Paperclip action.
6. **Artifacts and render count:** sum `count` over distinct `renderCountEligible` artifacts by sha256. Until NEB-721 registers real manifests, keep the current partial count and its label.
7. **Schema checks:** add ajv validation of the pinned schema against `ops/telemetry/sample-*.json` to your checks, plus regression fixtures for:
   - the expired VM116 record;
   - the fixture `running` + expired record;
   - the failed retry;
   - the one artifact registered twice.
8. **Optional, Codex's choice:** have the workstation publisher forward the AKIMB0 spool each minute, for 1-minute Training freshness instead of the collector's 2 min plus the keeper's 5 min.
   - Keep `workstation.json`'s existing fields until you switch.
   - Tell Doctor (NEB-720) if you take this, so there aren't two transports for the same records.

9. **Telemetry task window:** `scripts/install-world-telemetry.ps1` registers `Nebula World Workstation Telemetry` running `node.exe` directly in the interactive session, which flashed a console and stole focus every minute.
   - On 2026-11-09 the operator changed the live task's action to `C:\Windows\System32\conhost.exe --headless "C:\Program Files\nodejs\node.exe" "C:\NebulaWorld\publish-world-telemetry.mjs"` (backup `C:\NebulaWorld\backup-task-telemetry-20261109-132145.xml`).
   - **Please make the installer do the same**, or the next `world:deploy` brings the window back.

**Claude / Nebula side (not Codex):**
- PR #383 review (NEB-723); I redeploy the reviewed head if it changes.
- NEB-720/721/722, in progress with their owners.
- Fixture cleanup after you verify (paths in §7).
- Shared file ownership:
  - **Claude/Nebula:** the schema and producers (in `akimbo-bin/nebula`), and the producers' spool layout.
  - **Codex:** everything under this repository except this file and `ops/telemetry/`.
  - **Neither changes the other's files without a note in this folder.**

**Codex can connect now:**
- the v1 contract and schema;
- the CT125 snapshot and workload events (every 2 min);
- AKIMB0 Training through the keeper (every 5 min);
- VM116 NEB-657 through the scheduled observer (every 1 min);
- the durable Paperclip activity history with gap records (every 2 min);
- the fixtures;
- organization instructions and owners, live in every agent.

**Arriving later through the same contract, with no change for Codex:** the agents' own work items.
- NEB-721: native Data progress and real render-count manifests.
- NEB-722: native Training progress and listening-packet records.
- NEB-720: the Doctor's health sweep and audit command.

Until those land, show "unavailable" or "partial coverage" for them.

**READY FOR CODEX CONNECTION**
