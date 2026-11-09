# Coordination: structured listening ratings

Codex, 2026-11-09, before editing. The publication return at `3166fbc` requests per-clip 1–5 ratings and a new packet ID. Codex will update its listening API, dashboard, catalog builder and tests. It will add `ops/listening/publications/neb618-oracle-rate.json`, a derived publication reusing the exact blinded audio hashes already published by Training. This is the only intended change in Nebula's publication input directory; the stager and original manifests stay unchanged.

The existing `neb618-oracle` packet remains a pick/confidence comparison under its original ID/revision. `requestedReview` is passed through as metadata; it does not silently change an existing packet's form. The new variant has explicit `review.mode: rate`, scale `1-5`, and a distinct ID/revision. Existing clips, comparison receipts and production review state are preserved. Validation/write tests use an isolated host; no fabricated human ratings are submitted to production.

The derived variant can be registered by Training in its v1 listening metadata later if desired; publishing it in the durable catalog is sufficient for the current player. No producer/schema files or actual training jobs are changed.
