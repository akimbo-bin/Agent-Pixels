# Claude follow-up: connection complete, fixture cleanup and blinded audio publication

The Codex side of the live-office connection is finished and deployed. Please clean up the verified producer fixtures, then get the blinded listening audio published through a durable workflow so it is playable in the office.

## Connection status

Repository: `Z:/Projects/Nebula/AgentPixelsIllustrated`, branch `prototype/illustrated-walkmap-20261105`.

- Implementation commit: `a5d3ecc`.
- Production verification/return note: `bb32213`, `ops/CODEX_LIVE_DATA_CONNECTION.md`.
- Verified release: `a5d3ecc-33962b730d31`. Verify the current release rather than assuming it has not changed.
- Official office: `https://rehoboam-proxmox.sphinx-scylla.ts.net:8444/`.
- Nebula company: `7b3de9f6-dc63-4fa6-8cb5-65d1693aec3f`, prefix `NEB`. Do not use the Chibi connection.

The v1 snapshot, workload events, durable organization activity and source health are connected. Per-record expiry, retry isolation, artifact deduplication, history rotation/gaps and desktop/mobile views passed tests. Production verified Training Done at 95/95, removal of VM116/audio inference, the unassigned Planner and the headless scheduled-task action. Render counting now consumes eligible validated manifests, retaining the partial-history label.

The optional minute-publisher spool forwarding was not added. Doctor should keep the current collector transport; do not create a second one. The installer now preserves `conhost.exe --headless` on subsequent deployments.

Read `ops/CODEX_LIVE_DATA_CONNECTION.md` before making changes. The original schema, producers and Claude return report were not modified by Codex.

## 1. Clean up only the verified fixture records

Codex verified the expired running attempt, the failed retry with no inherited progress, and the single fixture artifact against production records and regression tests. The operator authorizes their cleanup now.

On AKIMB0-PC, inspect and remove only records for workload `akimb0-pc/fixture-live-office`, including attempts `fixture-a1` and `fixture-a2-retry`:

- The matching files under `C:\NebulaResearch\telemetry\v1\workloads\`, named `akimb0-pc_fixture-live-office_*`.
- The fixture artifact record `C:\NebulaResearch\telemetry\v1\artifacts\2cc0ddac20d3c93404da1392d9327348.json`.
- Full artifact identity: `sha256:2cc0ddac20d3c93404da1392d93273485552c68c9df2707abfb71b521217c284`.

Verify the resolved paths and record identities before deleting. Do not delete directories, real manifests, job files, historical event journals or collector state. Run or wait for the collector, then verify the fixture workload/artifact disappear from a fresh snapshot. If the collector retains deleted-file cache entries, use a targeted producer-owned cleanup rather than wiping its state. Historical fixture events may remain in durable history; that is expected.

Record the cleanup and verification on Doctor's NEB-720 work item through the authorized Nebula route.

## 2. Publish the actual blinded listening media

Training owns NEB-722. Coordinate with Training and the existing owners to inventory NEB-618 and other ready packets. Use existing packets/tasks rather than duplicating them.

The interface currently recognizes v1 listening-packet metadata, but those records do not transfer WAV bytes or automatically add playable entries to the listening catalog. The five existing packets still work. Do not mark this complete just because a packet record says ready.

Current serving contract on CT125:

- Media: `/srv/nebula-world/listening/audio/<sha256>.wav`.
- Catalog: `/srv/nebula-world/listening/catalog.json`.
- `GET /api/listening` exposes catalog packets and saved review receipts.
- `GET /api/listening/audio/<sha256>.wav` serves only catalog-allowlisted audio and supports byte ranges.
- Reviews live separately at `/var/lib/nebula-world/listening-state/reviews.json`; preserve them.

A catalog packet has `id`, `title`, `revision`, and `trials[]`. Each trial has `id`, `prompt`, and `clips[]`; each clip has `id`, a neutral `label` such as A/B/Reference, and `audio: "<sha256>.wav"`. Keep packet IDs/revisions consistent with the v1 records. Label Reference only when it genuinely is the reference; never infer it from model identity. Do not reuse trial/clip IDs with different meanings under the same published packet revision. Existing UI history is not fully revision-aware, so use a new packet ID for materially changed comparisons unless that behavior is explicitly fixed and tested.

Copy only approved blinded WAVs and neutral trial metadata. Hash the final served bytes and verify them against the manifest. Remove identifying embedded metadata where necessary before final hashing/versioning; keep original names, answer mappings, model identities and unblinded analysis private. Do not expose a private Windows directory or put credentials into a packet or catalog.

Publication must survive the next world deployment. `scripts/build-listening-catalog.py` currently builds a fixed five-packet catalog, and `scripts/deploy-world-ct125.mjs` uploads it. Simply merging new entries on CT125 will be overwritten later. Establish an explicit persistent publication input/merge workflow, with ownership and an update/withdrawal procedure. Upload and verify all immutable audio files first; only then atomically promote the catalog that references them. Preserve existing packets and review receipts, and retain the previous catalog for rollback.

Ownership still applies: Nebula owns the schema/producers; Codex owns interface/catalog/deployment code. Before touching Codex-owned files, leave an `ops/` coordination note naming the files, reason and publication approach. Keep any cross-boundary changes narrow, commit them and report them. If an interface-side decision is genuinely required, return a verified staged bundle, manifest, exact location and required patch; do not invent an ingestion endpoint or claim the audio is already playable.

## 3. Verify and return

Verify through the official site that new packet/revision IDs appear, every audio hash matches the published bytes, range requests work, and clips play on desktop and phone. Confirm existing packets and saved reviews remain available, no unblinded metadata is served, and a normal future deployment will preserve the new packets. Use a clearly labelled test/isolated review for write testing; do not fabricate a human listening judgment or mark a Paperclip task approved/completed from a dashboard receipt.

Write `ops/CLAUDE_LISTENING_PUBLICATION_RETURN.md` and summarize it in your final reply for the operator to bring back to Codex. Include:

1. Fixture files/IDs removed and fresh-snapshot verification time.
2. Nebula task IDs, owners, changed files, commits and deployment state.
3. New playable packet IDs/revisions, trial counts, audio hashes/locations and v1 metadata references.
4. Durable publication/merge/withdrawal workflow and why the next world deploy preserves it.
5. Read-only playback/range/hash checks, desktop/mobile results, review preservation and rollback.
6. Anything still staged or blocked, plus exact remaining Codex work.

Finish with **FIXTURES CLEANED — BLINDED AUDIO PUBLISHED** only after cleanup and official playback are verified. Otherwise state precisely which part is complete and return the staged artifacts or remaining blocker.
