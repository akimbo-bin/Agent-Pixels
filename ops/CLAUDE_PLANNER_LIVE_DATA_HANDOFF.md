# Claude planner handoff: connect Nebula's organization to its illustrated office

We want the illustrated office to become the practical live dashboard for the actual Nebula organization. Make the organization recognize this interface and make reporting part of how jobs are built and maintained. Coordinate the organization-side changes, then return a concrete integration report to Codex so it can finish the host, adapters and UI.

This is a request to plan and carry out the organization-side work within existing Paperclip execution/approval controls, not just write another proposal. Audit the current organization before changing it. Reuse existing owners, projects, instructions and jobs where appropriate. Do not create duplicate agents or wake paused agents merely to make the office look active.

## Read these first

Repository/worktree: `Z:/Projects/Nebula/AgentPixelsIllustrated` on AKIMB0-PC. If working on another machine, locate the same repository and verify its checkout; a Windows drive letter is not a portable server path.

- `ops/LIVE_OFFICE_PLAN.md`: overall audit and desired connection model.
- `ops/LIVE_PAPERCLIP_AUDIT.md`: exporter findings and source references.
- `ops/ILLUSTRATED_WORLD.md`: current deployment and operating notes.
- Audit commit: `8a46792`; smoke/lighting release audited: `9956ed1-4bb1fdc8e824`. Changes may have occurred since; verify the current release and feeds.

Actual Nebula company ID: `7b3de9f6-dc63-4fa6-8cb5-65d1693aec3f`, issue prefix `NEB`. Verify this identity before any organization writes. Codex's currently connected Paperclip app is scoped to **Chibi**, not Nebula; do not use that connection or create this work in Chibi. Use your existing authorized Nebula route.

Official office: `https://rehoboam-proxmox.sphinx-scylla.ts.net:8444/`.
Paperclip: `https://rehoboam-proxmox.sphinx-scylla.ts.net:8443/`.

## Keep the division of responsibility clear

**Your side:** organization ownership and instructions, real task/agent/run relationships, workload registration, producer instrumentation and publishing procedures, artifact/listening manifests, verified source locations and permissions. Delegate implementation through the existing organization as appropriate and report actual task IDs and outcomes.

**Codex's side after your reply:** accept and validate the agreed records, configure server adapters and the room registry, reconcile states, replace incorrect aliases, connect screens/lights/HUD, add connection-health UI and verify desktop/mobile behavior. Do not independently rewrite the map, frontend, world server or its deployed adapters while Codex is responsible for that half. If a producer change touches a shared file such as the workstation publisher, identify the exact owner before changing it.

There is no general telemetry POST endpoint or reporting SDK ready to use yet. Existing `/live` is GET/read-only. Browser `Screens.setData` is not durable organization ingestion. Do not tell agents to POST to a fictional route. Prefer atomic local JSON reporting plus an approved publisher initially; agree the record/path contract in your reply so Codex can complete the receiving side. Do not distribute administrative SSH credentials to workers.

## Organization-side work

1. Give the existing organization a durable description of the office, its URL, purpose and live-data responsibilities. Put the instructions in the organization-supported project/skill/instruction location and report where you put them. Use a shared reporting instruction rather than copying a large prompt into every agent. Make new workload implementation include reporting in its acceptance criteria.
2. Assign an existing integration owner and source owners for Training, VM116/Data/audio jobs, render artifacts, listening packets and source health. Record their agent IDs, task IDs and maintenance responsibilities. Keep actual work scheduling independent of cosmetic animations.
3. Inventory active producers and queues now. Distinguish Paperclip agent sessions from external job execution. Verify actual workload/attempt IDs, owning agents/issues, machine, kind, state evidence and progress source. Do not assume that an in-progress issue or a checked registration proves a process is running.
4. Instrument Training and one current VM116 workload as the first examples. Extend to other long-running jobs through the same reporting procedure. Producers should emit start, periodic heartbeat, state/reason changes, measured progress when available, and terminal outcome. Reporting failure must not stop real work. Preserve source timestamps during retries and publication.
5. Register completed artifacts and blinded listening packets through stable manifests. Give render-count eligibility a concrete definition and deduplicate outputs by artifact identity/hash. Report historical coverage gaps. Keep answer keys/unblinded analysis out of publicly served listening metadata; the dashboard's review receipt is not automatically a Paperclip task approval or completion.
6. Establish collection that continues when no browser is open. Verify what the deployed Paperclip API supports; do not assume webhooks/replay exist. If polling is necessary, preserve a watermark, recover with overlap and deduplicate. Keep actual activity history separate from the office's visual courier journal.
7. Validate records and report failures honestly. Document producer deployment/restart/recovery and how future job authors connect without editing UI code. Keep existing export fields backward compatible until Codex switches the receiving side.

## Minimum reporting contract to agree

Supply a versioned JSON schema and real redacted sample records, or a precise equivalent contract that Codex can implement. Include:

- Source: `schemaVersion`, `sourceId`, company ID, collection/observation time, last successful collection, health/error, completeness and expected cadence/expiry.
- Workload: stable `workloadId`, unique `attemptId`/run ID, agent ID, issue ID/key, machine ID, explicit `kind`, intended room ID, execution `state`, reason, started/finished timestamps and observation source.
- Separate heartbeat time, last execution evidence time and last progress-change time. A healthy long unit may show no progress. Copying a stale status file must not refresh its evidence.
- Progress: scope (`current-job` / `queue`), measured done/total/unit/time, or null when unsupported. No invented percentages; retries cannot reuse the previous attempt's progress.
- Artifacts: ID/hash, workload/attempt, type/location, completion/validation time and render-count eligibility.
- Events: stable event ID, occurred time, related company/agent/issue/workload IDs and sequence/cursor if supported.
- Listening: packet ID/revision, producing workload/issue, explicit ready state and blinded trials/clips manifest.

Use states `running`, `paused`, `waiting`, `done`, `failed`, `idle`, `unknown` for external execution. Keep the raw Paperclip administrative state and active runs separately. Multiple jobs on the same ticket or machine must not overwrite one another. Terminal events and artifacts must be safe to resend. Unknown is different from zero, idle, failed and done.

Agree paths and timestamps explicitly. Favor ISO-8601 UTC in new producer contracts and document any conversion at the existing adapter boundary. Do not silently mix seconds and milliseconds. Keep payloads bounded and schema-validated.

## Known issues to investigate, not blindly repeat

At the November 9 audit, direct `neb318` telemetry was stale and interpreted as waiting at 93/95, while a separate NEB-318 registration still said running. The configured local queue status said done with no saved child; this was not a full process inventory and does not prove that no different workload is running. Identify the real current workload and evidence. Do not restart/kill/resume training, alter budgets or remove holds just to reconcile the display.

The interface aliases the first VM116 job as audio rendering, so a Data job activated Music Studio. Report the actual kind of each VM116 workload; Codex will remove machine-based classification.

Room IDs are `lead`, `second`, `clerk`, `observatory`, `engine`, `data`, `training`, `music`, `doctor`, `review`, `operations`, `queue`. Existing defaults put Engine in Observatory and builders in Engineering. Return an explicit ID-based mapping; do not infer rooms from names or where a sprite is standing. Operations and Queue are Statistical rooms.

## Acceptance and return to Codex

Prove that an actual producer reports start/heartbeat/current state and terminal or waiting state; that stopping its publisher expires the observation without manufacturing completion; and that retries/duplicate records do not duplicate artifacts. Use safe fixtures where exercising a failure would disrupt real work. Report which observations are real, fixtures, proposed or still blocked. Do not claim the UI is connected until Codex verifies the receiving side.

Write `ops/CLAUDE_LIVE_DATA_RETURN.md` in this shared repository if accessible. Otherwise return the same content in your final reply for the user to paste into Codex. Do not assume this chat can receive an automatic Claude reply; identify any actual supported delivery route instead of inventing one.

Use this return structure:

1. **Completed organization changes:** project/instruction/skill locations, exact Nebula task IDs/links, assigned owners and statuses.
2. **Contract:** schema version, schema location, state and time semantics, compatibility decisions and redacted real payloads for Training and VM116.
3. **Producer inventory:** owner, machine, workload/attempt, source/transport/path, cadence, freshness and evidence for each source.
4. **Bindings:** agent IDs and workload kinds/IDs to room IDs; exceptions and unassigned items.
5. **Access/deployment:** which service reads/writes each path, required approved access, deployed versus staged changes, commit IDs and rollback. No credentials in the reply.
6. **Artifacts/listening:** manifests, eligibility/dedup rules, available packets and review-result consumption procedure.
7. **Validation:** checks performed, timestamps, actual findings, known gaps/conflicts and blocked work with owner/action.
8. **Codex next actions:** exact adapter/config changes required; files/endpoints to read; which side is responsible for each remaining item.

Finish your reply with **READY FOR CODEX CONNECTION** only when the producer contract and at least the first examples are available for integration. Otherwise finish with **PARTIAL — CODEX CAN CONNECT THESE SOURCES** and list the available versus blocked pieces. Do not wait for every possible room to be instrumented before returning useful completed work.
