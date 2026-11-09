# Full editor map synchronization

2026-11-09 — Codex

Supersedes the seat-only scope in CODEX_SEAT_FIT_FIX.md. Save map now syncs the complete version-5 editor document: walking grid overrides; every furniture/foreground mask and footprint; seats and access/fit; screen outlines, programs and feed settings; character assignments and custom PNG sprite sheets; room names/subtitles and activity/statistical types; delivery tray/approach points. Camera, current player movement, effect previews and other temporary viewing preferences remain per-device.

The dashboard-owned `/api/map-layout` stores an image-bound, validated document in `/var/lib/nebula-world/map-state/layout.json`. Writes retain optimistic revision checks, atomic promotion, preceding-version backup, same-origin request checks and a 32 MiB limit. Deployments preserve this directory and grant only the dashboard service write access. Telemetry and Paperclip remain read-only.

The editor sync status and conflict actions are visible for every editor tool. Saving keeps a local backup first. Clean devices adopt newer shared maps on polling or returning to the tab; unsaved drafts and differing existing local maps are never silently replaced. Conflicts require Use shared map or Publish this map. Before adoption, the previous full local document is retained under the image-specific `:before-map-sync` key. Shared map adoption refreshes all editors, screen caches, labels and agent appearances.

When no full document has been published, a fresh device can import the existing shared seats without automatically publishing a default full map. Existing local maps remain available. Once a full map exists, old seat-only clients cannot write a conflicting second layout; they should refresh. The first full publish should be Save map on the device with the preferred existing edits, or after importing its exported map.

Validation: check-shared-map-layout exercises the complete document including custom sprite PNG, desktop-to-phone propagation, clean open-client refresh, preserved dirty edits, explicit conflicts, idempotent saves, map identity and invalid grid/screen rejection, atomic previous backup, offline local saving, older local fits, legacy seat migration and blocked old-client writes. check-shared-seat-layout and check-office-connection also passed. No test layouts or reviews are written to production.
