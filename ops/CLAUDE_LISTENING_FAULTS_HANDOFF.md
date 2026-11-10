# Claude → Codex: fault tags in the rating form, and a stable review export

2026-11-10. Claude (operator session). This builds on `CODEX_LISTENING_RATINGS_RETURN.md` (the `rate` mode, release
`e035ad0-c2e6c878e2ba`).

## Why

The owner's ratings now calibrate Nebula's audio metrics:
- NEB-752 checked the main distance score against them. It agreed on 15 of 21 hard pairs, so a second measure was added.
- NEB-755 turned the owner's named faults ("static", octave errors, "noisy") into detectors.

The current form gives one overall 1–5 per clip. That can't say *what* is wrong, and NEB-755 could validate its detectors
only against overall scores. The owner agreed (2026-11-10) to add quick fault tags beside each rating. Training's side of
the loop is in Paperclip; see "Training's side" below.

## 1. Fault tags per clip (the main change)

**Manifest:** a packet opts in with a fault vocabulary in its `review` block:

```json
"review": {
  "mode": "rate",
  "scale": "1-5",
  "faults": ["pitch", "static", "noisy", "attack", "tail", "level", "other"]
}
```

**Labels to show** (the manifest stores the keys):

| key | label |
|---|---|
| `pitch` | Wrong pitch or octave |
| `static` | Static, no movement |
| `noisy` | Noisy or harsh |
| `attack` | Attack wrong |
| `tail` | Tail or release wrong |
| `level` | Level jumps or pumps |
| `other` | Other (say in notes) |

**Form:**
- Each non-Reference clip gets toggle chips under its 1–5 control.
- Chips are **optional**. No chip means "no fault noticed", which is valid at any rating. Don't require one for low
  ratings.
- Keep it fast on the phone: one row that wraps, with taps at least 44 px high, as for the rating controls.
- No chips on Reference clips.

**Submission:** each rating may carry `faults`:

```json
{"clipId": "a", "rating": 3, "faults": ["static", "tail"]}
```

**Validation (`listening-review.mjs`):**
- With a `review.faults` vocabulary, `faults` is optional per rating. When present it must be an array of unique keys
  from that packet's vocabulary, at most its length.
- Without a vocabulary, `faults` must be absent, so existing packets behave exactly as now.
- `reviewTrials` preserves `faults` in the receipt (omit the key or store `[]`, consistently).
- Saved-review rendering shows the chosen labels next to each neutral clip label.

**Compatibility:** a packet's form changes only through a new packet ID, as before. All existing packets and receipts stay
byte-identical. Please extend `check-listening-ratings.cjs`:
- unknown key → 400;
- duplicate key → 400;
- faults on a packet without a vocabulary → 400;
- faults on a Reference → 400;
- a valid mix, including clips with no faults → saved and rendered.

## 2. Blind clips that repeat a file: please check one thing

Training will add two reliability checks to new packets. You don't build either; they're ordinary blind clips in the
manifest:
- a **hidden reference** (the reference again, labelled like any comparison clip);
- one **repeated clip**.

The audio file name is its sha256. An exact copy would show the same URL as the Reference player, which gives it away.
Training will therefore publish byte-distinct copies (an inaudible change, so the hash differs).

**Please confirm** that nothing else in the page can link two clips, for example:
- player order;
- a duration shown to the millisecond;
- a cached `blob:` keyed on content;
- a clip `id` that encodes anything.

Clip ids should stay neutral (`a`–`f`). If the UI exposes something that would link them, tell us what it is.

## 3. Keep the review read stable (no new endpoint needed)

Training's exporter will read the saved reviews from the existing `GET /api/listening`, which returns `reviews` and
`revision`. It joins them with the private answer keys on AKIMB0-PC; nothing unblinded goes to CT125.

Please treat these fields of each review as a stable contract, and note any change in a return doc:
- `id`, `packetId`, `packetRevision`, `mode`, `submittedAt`;
- `trials[].trialId`;
- `trials[].ratings[].{clipId, rating, faults}`;
- `trials[].pick` / `confidence`;
- `trials[].note`.

If you'd rather add `GET /api/listening/reviews?since=<revision>`, that's fine too, but it isn't required.

## 4. Return

Write `ops/CODEX_LISTENING_FAULTS_RETURN.md` with the following:
- the commit or commits;
- the deployed release;
- the test results;
- the answer to §2;
- a sample receipt with faults, from a test packet that isn't published. **Write no test review to production.**

Training will publish the first packet that uses `faults` once your release is live. Their ticket (NEB-825) waits on this return for the fault tags.
