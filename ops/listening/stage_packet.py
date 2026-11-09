"""Stage a blinded listening packet for the illustrated office (Nebula-owned; see ops/CLAUDE_LISTENING_COORDINATION.md).

    python -I ops/listening/stage_packet.py --id neb618-oracle-045 --issue NEB-618 --title "..." \
        --source "\\\\192.168.8.106\\Files\\...\\neb618_listening\\listen" --prompt "..." [--trial-note t04="..."] \
        [--reviewed 2026-11-09] [--spool C:\\NebulaResearch\\telemetry]

- **Trials:** found from blinded file names anywhere under ``--source``: ``<g|t><NN>_<A..Z|reference>.wav``. A
  ``reference`` file is the reference; the letters are the blind clips in letter order.
- **Audio:** each WAV is rewritten with only its ``fmt``, ``fact`` and ``data`` chunks (anything else, such as
  PEAK or LIST/INFO text, is dropped), then hashed. The served name is ``<sha256>.wav`` in the publication store
  ``\\\\192.168.8.106\\Files\\Projects\\Nebula\\listening-published\\audio``. An existing file must already hash the same.
- **Outputs:** ``ops/listening/publications/<id>.json``, a catalog entry plus the store reference, which the office
  build reads (scripts/build-listening-catalog.py). With ``--spool``, also the v1 ``listening-packet`` record
  (schema nebula.telemetry/1) under ``<spool>\\v1\\listening\\``, so the collector reports it.

Nothing identifying is written: no source paths, original file names, model identities or answer keys. Never point
``--source`` at a folder that holds an answer key in the same tree as the clips.
"""
import argparse
import datetime as dt
import hashlib
import json
import re
import struct
from pathlib import Path

STORE = Path(r"\\192.168.8.106\Files\Projects\Nebula\listening-published\audio")
HERE = Path(__file__).resolve().parent
NAME = re.compile(r"^(?P<trial>[gt])(?P<n>\d{1,3})_(?P<clip>[A-Za-z]|reference)\.wav$", re.I)
KEEP = (b"fmt ", b"fact", b"data")
HARMLESS = KEEP + (b"PEAK",)            # peak levels only: such a file is served byte for byte
COMPANY = "7b3de9f6-dc63-4fa6-8cb5-65d1693aec3f"


def clean_wav(raw: bytes) -> bytes:
    """The file itself when it holds only fmt/fact/data/PEAK chunks (so its hash stays the one the packet's v1
    record names); otherwise the same audio rewritten with only fmt/fact/data."""
    riff, _, wave = struct.unpack("<4sI4s", raw[:12])
    if riff != b"RIFF" or wave != b"WAVE":
        raise ValueError("not a RIFF/WAVE file")
    pos, keep, extra = 12, [], False
    while pos + 8 <= len(raw):
        cid, size = struct.unpack("<4sI", raw[pos:pos + 8])
        body = raw[pos + 8:pos + 8 + size]
        if len(body) != size:
            raise ValueError(f"truncated {cid!r} chunk")
        extra |= cid not in HARMLESS
        if cid in KEEP:
            keep.append(cid + struct.pack("<I", size) + body + (b"\0" if size % 2 else b""))
        pos += 8 + size + (size % 2)
    if not any(c.startswith(b"fmt ") for c in keep) or not any(c.startswith(b"data") for c in keep):
        raise ValueError("missing fmt or data chunk")
    if not extra:
        return raw
    body = b"WAVE" + b"".join(keep)
    return b"RIFF" + struct.pack("<I", len(body)) + body


def store(audio: bytes) -> str:
    sha = hashlib.sha256(audio).hexdigest()
    target = STORE / f"{sha}.wav"
    if target.exists():
        if hashlib.sha256(target.read_bytes()).hexdigest() != sha:
            raise SystemExit(f"store file {target.name} does not match its name")
    else:
        STORE.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(".tmp")
        tmp.write_bytes(audio)
        tmp.replace(target)
    return sha


def adopt(trials: list, v1: dict) -> list:
    """Use the packet's v1 record (Training, NEB-722) for trial ids, and check every served clip's sha256 against it:
    the office must serve exactly the bytes the record names."""
    by_n = {int(re.sub(r"\D", "", t["trialId"])): t for t in v1["trials"]}
    if sorted(by_n) != [int(t["id"][1:]) for t in trials]:
        raise SystemExit("trials differ from the v1 record")
    for t in trials:
        rec = by_n[int(t["id"][1:])]
        want = {c["label"].lower(): c["sha256"] for c in rec["clips"]}
        got = {c["id"]: c["audio"][:-4] for c in t["clips"]}
        if want != got:
            raise SystemExit(f"{t['id']}: served audio differs from the v1 record; a changed packet needs a new id")
        t["id"] = rec["trialId"]
    return trials


def trials_from(source: Path, prompt: str, notes: dict) -> list:
    found = {}
    for f in source.rglob("*.wav"):
        m = NAME.match(f.name)
        if m:
            found.setdefault(int(m["n"]), {})[m["clip"].lower()] = f
    if not found:
        raise SystemExit(f"no blinded clips under {source}")
    trials = []
    for n in sorted(found):
        files = found[n]
        letters = sorted(k for k in files if k != "reference")
        if "reference" not in files or len(letters) < 2:
            raise SystemExit(f"trial {n}: needs a reference and at least two blind clips")
        tid = f"t{n:02d}"
        clips = [{"id": "reference", "label": "Reference", "audio": store(clean_wav(files["reference"].read_bytes())) + ".wav"}]
        clips += [{"id": k, "label": k.upper(), "audio": store(clean_wav(files[k].read_bytes())) + ".wav"} for k in letters]
        text = prompt + (" " + notes[tid] if tid in notes else "")
        trials.append({"id": tid, "prompt": text, "clips": clips})
    return trials


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", required=True, help="packet id, e.g. neb618-oracle-045 (new id for a changed comparison)")
    ap.add_argument("--issue", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--source", required=True)
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--trial-note", action="append", default=[], help='t04="extra words for that trial"')
    ap.add_argument("--reviewed", help="date the owner already answered it outside the office (YYYY-MM-DD)")
    ap.add_argument("--rating-scale", help='requested per-clip rating the office does not support yet, e.g. "1-5"')
    ap.add_argument("--spool", help="also write the v1 listening-packet record into <spool>\\v1\\listening")
    ap.add_argument("--v1", help="the packet's existing v1 record: its id, revision and trial ids are used, and every "
                                 "served hash must match it (no new v1 record is written)")
    a = ap.parse_args(argv)
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,60}", a.id):
        raise SystemExit("--id: lower-case letters, digits and dashes")
    notes = dict(n.split("=", 1) for n in a.trial_note)
    trials = trials_from(Path(a.source), a.prompt, notes)
    v1 = json.loads(Path(a.v1).read_text(encoding="utf-8")) if a.v1 else None
    if v1:
        if v1.get("packetId") != a.id or v1.get("issueKey") != a.issue:
            raise SystemExit("--id/--issue differ from the v1 record")
        trials = adopt(trials, v1)
    revision = v1["revision"] if v1 else hashlib.sha256(json.dumps(trials, sort_keys=True).encode()).hexdigest()
    now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    pub = {"schemaVersion": "nebula.listening-publication/1", "id": a.id, "title": a.title, "issueKey": a.issue,
           "revision": revision, "state": "ready", "publishedAt": now,
           "historicalReview": {"status": "completed", "date": a.reviewed} if a.reviewed else {"status": "unknown", "date": None},
           "review": {"mode": "pick", "confidence": [1, 3]},
           "requestedReview": {"mode": "rate", "scale": a.rating_scale} if a.rating_scale else None,
           "trials": trials,
           "source": {"store": str(STORE), "files": sorted({c["audio"] for t in trials for c in t["clips"]})}}
    out = HERE / "publications" / f"{a.id}.json"
    out.parent.mkdir(exist_ok=True)
    old = json.loads(out.read_text(encoding="utf-8")) if out.exists() else None
    if old and old["revision"] != revision:
        raise SystemExit(f"{out.name} exists with another revision: a changed comparison needs a new --id")
    if old:
        pub["publishedAt"] = old["publishedAt"]
    out.write_text(json.dumps(pub, indent=1) + "\n", encoding="utf-8")
    print(f"{a.id}: {len(trials)} trials, {len(pub['source']['files'])} audio files, revision {revision[:12]}")
    if a.spool and not v1:
        rec = {"schemaVersion": "nebula.telemetry/1", "recordType": "listening-packet", "companyId": COMPANY,
               "packetId": a.id, "revision": revision, "issueKey": a.issue, "workloadId": None, "state": "ready",
               "readyAt": pub["publishedAt"],
               "trials": [{"trialId": t["id"], "clips": [{"clipId": c["id"], "sha256": c["audio"][:-4]} for c in t["clips"]]}
                          for t in trials]}
        d = Path(a.spool) / "v1" / "listening"
        d.mkdir(parents=True, exist_ok=True)
        tmp = d / f"{a.id}.json.tmp"
        tmp.write_text(json.dumps(rec, indent=1), encoding="utf-8")
        tmp.replace(d / f"{a.id}.json")
        print("v1 record:", d / f"{a.id}.json")


if __name__ == "__main__":
    main()
