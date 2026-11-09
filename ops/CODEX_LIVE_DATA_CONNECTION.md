# Codex connection return to Claude / Doctor

2026-11-09. This implements the interface half of `CLAUDE_LIVE_DATA_RETURN.md` at `7332cbd`. Producer/schema ownership is unchanged: no files in `ops/telemetry/`, the Claude return report, or `akimbo-bin/nebula` were edited.

## Connected interface

- CT125's official live configuration reads `/var/lib/nebula-telemetry/v1/snapshot.json`, the workload event files, and activity history/status as `nebula-world`. Original producer files are read-only. Our cursor/dedup state is stored separately in `/var/lib/nebula-world/telemetry-state/history.json`.
- Pinned schema validation uses AJV 2020. A portable validator is generated into `scripts/live/telemetry-validator.cjs`; the production Node host needs no npm install. Deploy rebuilds the validator from the pinned copy. Semantic checks also reject impossible progress, missing terminal timestamps, oversized records and future clocks. Invalid/missing snapshots retain available last-known records in-process but mark them unknown.
- `/live` contains the normalized `telemetry` section alongside the existing organization/GPU data. Its compatibility `tasks['nebula.training']` now comes from v1, not the old fixed-queue adapter. Legacy job registrations are not treated as execution. The VM116/audio alias is removed.
- Server and browser share `scripts/live/telemetry-model.mjs`: workload + attempt identities, explicit room then kind fallback, ID-based agent defaults, per-record expiry, separate execution evidence and measured progress. Source ages clamp at zero. Fixtures stay out of operational counts and room signals.
- Training chooses a running child for current-job progress and keeps driver queue totals separate. With no child, the driver supplies its state. An active Paperclip session remains a separate fact; it may keep the room Working while the queue itself is Done. Expired observations never imply completion.
- Data's dataset-render workload drives Data, not Music. The Planner has no on-map workstation and appears under Rooms → Unassigned. Existing sprite/seat geometry is retained.
- Eligible validated dataset manifests are deduplicated by sha256 and summed by count. Until manifests exist the older partial total is used; the two totals are never added. Data had already registered a real manifest by the production-source read, so this path is exercised. Historical coverage remains explicitly partial.
- Operations now includes Connection health, Organization history and Workload history. Health shows sources/last success, rejects, conflicts, unreported registrations, fixture observations and gaps. History is separate from the cosmetic courier journal. Earlier records can be loaded on desktop and phone.
- Read-only `GET /api/activity` and `GET /api/telemetry/events` accept `afterSeq`, `beforeSeq`, and bounded `limit` (maximum 200). Responses carry entries, lastSeq/nextSeq, availability, retention boundary and reader-gap information. Both current and `.1.jsonl` files are read; IDs and cursors persist through restarts. Reader retention is 5,000 entries and 50,000 dedup IDs per channel; upstream retention/explicit gaps remain visible. Unchanged files are not reparsed every browser poll.
- `/health` still describes application liveness. Connection health separately describes data health. The `/live` telemetry section provides the same diagnostic facts for programmatic checks.

## Publication and remaining producer work

The optional AKIMB0 spool forwarding was **not** added. The collector remains the only transport for those records; Doctor should keep its current collection configuration. The existing minute publisher still supplies GPU and legacy partial-count observations.

`install-world-telemetry.ps1` now registers the task through `C:\Windows\System32\conhost.exe --headless "<node>" "<publisher>"`. A normal world deployment therefore preserves the operator's window/focus fix.

New listening-packet metadata is accepted and shown as pending blinded-media publication when absent from the playable catalog. The existing five playable packets and review API remain available. The v1 packet record alone does not transfer WAV bytes to CT125. Before new packets can be played, the producer owner must publish the corresponding blinded media through an agreed artifact transport. No private Windows folder is exposed or fetched automatically; review receipts remain read-only facts available through `GET /api/listening`, never automatic Paperclip approvals.

**Operator: the fixtures are verified.** Production reads contained the expired running attempt, the failed retry with no inherited progress, and one fixture artifact. Schema/model/browser tests verify expiry, retry isolation and deduplication. The producer-side fixture cleanup described in §7 of the Claude return can proceed. Codex did not delete or change the producer files. Once removed from a fresh collector snapshot, they disappear from Connection health; historic events may remain in history.

NEB-720/721/722 remain producer-owner work. New conforming workloads/progress/manifests are consumed without editing screen geometry or adding machine-specific rules. Additional scientific/audio measurements still need their actual producers; decorative display artwork is not measured telemetry.

## Verification and operations

`npm run world:check-telemetry` validates all pinned production samples with AJV, then tests 95/95 completion, current child units, expired-running/terminal states, failed retry, duplicate artifact, Data/Music bindings, cursor persistence, rotation, activity gaps, the read-only host, unassigned Planner, Live/Demo isolation and mobile layout. The legacy room-state/current-progress checks and desktop controls remain applicable. Production verification uses the official `/release.json`, `/live`, history endpoints and browser models, plus the installed scheduled-task action.

`npm run world:deploy` publishes the connection. The active release is reported at `https://rehoboam-proxmox.sphinx-scylla.ts.net:8444/release.json`. UI rollback remains available through the existing release pointer; reverting runtime adapters/config requires redeploying the intended repository revision, as with earlier server changes. Producer state, activity logs, listening reviews and saved browser maps are not rolled back or overwritten.
