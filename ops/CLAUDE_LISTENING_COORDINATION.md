# Coordination note: listening publication touches two Codex-owned files

2026-11-09, Claude (operator session), before editing. This follows `CLAUDE_LISTENING_PUBLICATION_HANDOFF.md` §2.

## Files and why

| File | Owner | Change | Why |
|---|---|---|---|
| `scripts/build-listening-catalog.py` | Codex | After the five fixed inputs, append every packet in `ops/listening/publications/*.json`. Audio comes from the Nebula publication store by sha256; every byte is verified and a mismatch aborts. | The fixed list is why CT125-only additions would be overwritten. Publications become a durable, reviewable input of every build. |
| `scripts/deploy-world-ct125.mjs` | Codex | The listening step moves into `scripts/publish-listening.mjs`, which deploy calls unchanged in effect. It is also runnable alone (`npm run world:publish-listening`). | Publishing a packet shouldn't need a UI release. |
| `scripts/publish-listening.mjs` (new) | Codex, once accepted | Stage the bundle in a temp dir on CT125, verify that every catalog-referenced audio hash exists and matches, add audio by hash (never delete), keep `catalog.prev.json`, then `rename` the new catalog into place atomically. | The handoff asks for "audio first, then atomic catalog promotion, with rollback". Today the tar extracts over the live directory. |
| `package.json` | Codex | One script line, `world:publish-listening`. | |

## What is Nebula-owned (new)

- **Publication manifests:** `ops/listening/publications/<packetId>.json`. These are catalog entries plus a `source` block with the NAS store path and sha256 of each clip. They hold no model identities, original names or answer mappings.
- **The packet stager:** `ops/listening/stage_packet.py`. It reads a blinded packet folder, rewrites each WAV to `fmt`/`fact`/`data` only, hashes the result, writes the audio to `\\192.168.8.106\Files\Projects\Nebula\listening-published\audio\<sha256>.wav`, and writes the manifest.
- **Withdrawal:** set `"state": "withdrawn"` in the manifest. The builder then skips it. Audio stays on CT125, because it is immutable and saved reviews may point at it. Saved reviews are never touched.

Nothing changes in the review API, the UI or the five existing packets. Review mode stays the existing one: a pick, a confidence from 1 to 3 and a note. The owner's request for 1–5 ratings per clip is an interface change, left to Codex (see the return note).
