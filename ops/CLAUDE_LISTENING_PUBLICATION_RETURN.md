# Claude → Codex: fixture cleanup and blinded listening publication

2026-11-09, about 20:45 UTC. Claude (operator session), answering `CLAUDE_LISTENING_PUBLICATION_HANDOFF.md` (644613f).
Company `7b3de9f6-dc63-4fa6-8cb5-65d1693aec3f` (NEB). The Chibi connection was not used.

## 1. Fixture cleanup

**Removed on AKIMB0-PC.** Each record's `recordType`, `workloadId`, `attemptId` and `artifactId` were checked before deletion, and no other spool file referenced the fixture.
- **Workloads** under `C:\NebulaResearch\telemetry\v1\workloads\`:
  - `akimb0-pc_fixture-live-office_fixture-a1~e68b513613.json`: workload `akimb0-pc/fixture-live-office`, attempt `fixture-a1`;
  - `akimb0-pc_fixture-live-office_fixture-a2-retry~692b1ad4a8.json`: attempt `fixture-a2-retry`.
- **Artifact:** `C:\NebulaResearch\telemetry\v1\artifacts\2cc0ddac20d3c93404da1392d9327348.json`, with identity `sha256:2cc0ddac20d3c93404da1392d93273485552c68c9df2707abfb71b521217c284`.
- **Also removed:** my local temp copy of the fixture artifact (`%TEMP%\nebula-fixture-artifact.txt`).
- **Not touched:** directories, job files, real manifests, collector state and event journals.

**Fresh-snapshot verification:** collector pass finished at **2026-11-09T20:27:07Z**.
- Fixture workloads: `[]`. Fixture artifacts: `[]`.
- 11 real workloads remain, as does Data's real `dataset-manifest` artifact (count 176,345). 0 rejected.
- The collector needed no state edit: its listing drops deleted files.
- **History:** 5 fixture lines remain in `/var/lib/nebula-telemetry/v1/events.jsonl`, as expected.
- **Recorded on NEB-720** (Doctor).

## 2. Tasks, owners, changes, commits

| Item | Where | State |
|---|---|---|
| Coordination note, before touching Codex files | `ops/CLAUDE_LISTENING_COORDINATION.md` | commit `9b8336e` |
| Publication workflow (details below) | 5 changes | commit `89d674b` |
| Stager (Nebula-owned) | `ops/listening/stage_packet.py` | in `89d674b` |
| Publication manifests (Nebula-owned) | `ops/listening/publications/neb618-oracle.json`, `neb318-results.json` | in `89d674b` |
| Catalog builder: appends ready publications and verifies every audio byte | `scripts/build-listening-catalog.py` (Codex-owned, +18 lines) | in `89d674b` |
| Publish step: staged, verified, additive audio, `catalog.prev.json`, atomic rename | `scripts/publish-listening.mjs` (new) | in `89d674b` |
| Deploy calls the publish step instead of its inline tar-over-live | `scripts/deploy-world-ct125.mjs` (Codex-owned, −10/+2) | in `89d674b` |
| npm script `world:publish-listening` | `package.json` | in `89d674b` |
| Deployed | `node scripts/publish-listening.mjs` at about 20:31Z | catalog `12b02f0a3232…`, 7 packets, 218 audio files |
| NEB-722 (Training) | publication workflow and v1-record hygiene requests posted | in_review |
| NEB-720 (Doctor) | cleanup recorded | in_review |

No world release was deployed; the release stays as Codex left it. Only the listening catalog and audio changed on CT125.

## 3. New playable packets

IDs and revisions are **Training's v1 records** (NEB-722). They are not new IDs: the stager adopts them, and it refuses to stage if any served hash differs from the record.

| packetId | revision | trials | clips | v1 record (AKIMB0 spool, collected into the snapshot) |
|---|---|---:|---:|---|
| `neb618-oracle` | `35964547519cc49e4b5eb2554d929c4d5fc5aafd99be2961635864b83e17a62d` | 7 (g01–g07) | 35 (a reference plus A–D per trial) | `listening/neb618-oracle~891b6645e9.json` |
| `neb318-results` | `5d4e5d6b8bb12701…` | 8 (t01–t08) | 24 (a reference plus A–B per trial) | `listening/neb318-results~23b3601e74.json` |

- **Audio is served from** `/srv/nebula-world/listening/audio/<sha256>.wav` and fetched through `GET /api/listening/audio/<sha256>.wav`. The source store is `\\192.168.8.106\Files\Projects\Nebula\listening-published\audio\` (59 files). The manifests list every hash.
- **Bytes are served as they are** when a WAV carries only `fmt`/`fact`/`data`/`PEAK` chunks (both packets did), so the hashes equal the v1 records. Any other chunk (LIST/INFO text and so on) would be stripped, giving a new hash, which needs a new packet ID.
- **Both have `historicalReview: completed 2026-11-09`.** The owner answered both in chat, and Training is writing those answers up (NEB-678, NEB-712). A review in the office is an additional one.
- **Prompts are neutral.** Trials t04 and t07 of `neb318-results` say they stop at note-off on purpose.
- **Clip labels** are `Reference`, `A`, `B` and so on. `Reference` is used only for the actual reference file.
- **No model identities, original paths, answer keys or unblinded analysis are served.** A scan of `/api/listening` finds none. The one exception: the packet ID `neb618-oracle` contains the word "oracle", which comes from Training's existing ID. It doesn't say which clip is which.

## 4. Durable publication workflow

1. **The producer** (Training) publishes its v1 `listening-packet` record.
2. **Stage:** run `python -I ops/listening/stage_packet.py --id <packetId> --issue NEB-n --title … --source <blinded folder> --prompt … --v1 <record> [--trial-note tNN=…] [--reviewed date]`.
   - It writes audio to the NAS store by sha256 (immutable; an existing file must already hash the same).
   - It writes `ops/listening/publications/<id>.json`.
   - The same ID with another revision is refused: a changed comparison needs a new ID.
3. **Commit the manifest,** then run `npm run world:publish-listening`. A normal `npm run world:deploy` runs the same step.
4. **Withdraw:** set `"state": "withdrawn"` in the manifest and publish. The packet leaves the catalog, but its audio and every saved review stay.

**Why the next world deploy preserves the packets:** the catalog is rebuilt from the five fixed folders plus every ready manifest in the repository, deterministically. A rebuild just now produced the live hash `12b02f0a3232…`, so the deploy sees "unchanged" and uploads nothing. When it does upload, CT125:
- unpacks into a temp folder;
- checks every referenced hash;
- **adds** missing audio (never deletes any);
- copies the live catalog to `catalog.prev.json`;
- renames the new catalog into place atomically.

**Rollback:** `cp /srv/nebula-world/listening/catalog.prev.json /srv/nebula-world/listening/catalog.json`. The server re-reads the catalog on each request, so no restart is needed. Note that `catalog.sha256` must be restored too, or the next publish redoes the upload, which is harmless.

## 5. Verification (official site, read-only)

| Check | Result |
|---|---|
| `GET /api/listening` | 7 packets: the 5 originals with **unchanged revisions**, plus `neb318-results` and `neb618-oracle` |
| Hash of every new clip (full GET) | 59 of 59 match their names |
| Byte ranges | `Range: bytes=100-1123` → 206, `Content-Range: bytes 100-1123/701564`, `audio/wav`, 1,024 bytes; suffix `bytes=-512` → 206; `Accept-Ranges` present |
| Allowlist | unlisted `<0…>.wav` → 404 |
| Desktop playback (built-in browser, official URL, Listening → packet) | `neb318-results`: 24 players; Reference, A and B played 1.46 s in 1.5 s, `readyState` 4, no errors. `neb618-oracle`: 35 players, all with duration, 0 errors, playback advanced |
| Phone playback (375×812 mobile emulation, touch UA) | `neb618-oracle`: 35 of 35 load, 0 errors, playback advanced 1.15 s, players 313 px wide, no horizontal scroll. This is emulation, not a physical phone. |
| Review form | Each trial shows Preferred clip (non-Reference clips plus "No preference / neither"), Confidence 1–3 and Notes, plus the historical-review banner |
| Saved reviews | `/var/lib/nebula-world/listening-state/` untouched. No review has been saved yet, so there was nothing to lose. **No test review was written to production.** |
| CT125 state | `catalog.prev.json` present (the previous five-packet catalog), 218 audio files, no staging leftovers |

## 6. Remaining, and Codex's part

- **The owner's request: rate clips 1–5 per clip in the office.** The owner asked for "a neatly formatted template so I can rate them directly in there". Today's form records one pick, a confidence of 1–3 and a note, so `neb618-oracle`'s prompt asks for the 1–5 ratings in the note for now.
  - Its manifest carries `"requestedReview": {"mode": "rate", "scale": "1-5"}`. The builder doesn't pass that field into the catalog yet.
  - **Codex:** add a per-clip rating mode (for example a 1–5 control per non-Reference clip, optionally with a rank order). Validate it in `listening-api.mjs`, render it in the UI, and pass `review`/`requestedReview` through `build-listening-catalog.py`.
  - Changing a packet's review form is a material change, so publish the rating version under a **new packet ID** (for example `neb618-oracle-rate`), unless review history becomes revision-aware first.
- **Physical-phone check:** done by emulation only. One tap on an actual iPhone would confirm Safari's audio session behaviour.
- **Training (NEB-722):** drop the private `location` paths and the path-like `clipId`s from future v1 records (requested on the ticket). It will use the stager for new packets.
- **Not done, by design:** no automated review write on production, and no Paperclip approval or completion drawn from office receipts.

**FIXTURES CLEANED — BLINDED AUDIO PUBLISHED**
