# Seat fit persistence and sharing

2026-11-09 — Codex

Update: full editor map sync now supersedes the seat-only scope below. See CODEX_FULL_MAP_SYNC.md.

Reproduced two independent failures: isolated device A saved Review x=377 while device B loaded x=371; Data editor pose was (559,602,34) while the occupied agent drew at (566,597,46) with character overrides.

Seat fitting now has one authoritative transform for editor/player/NPC, including perspective scaling. Standing character size/offset settings no longer override an authored seated fit. Older local maps on the same image are restored rather than silently ignored based on the approved-map timestamp.

The dashboard owns `/api/seat-layout`: versioned, image-bound seat fits and their linked chair cutouts. Saves use optimistic revisions, same-origin marked requests, bounded validation, atomic replacement and a preceding-version backup. Storage is `/var/lib/nebula-world/seat-state`, preserved across deployment. Paperclip and producer telemetry are unchanged.

The browser saves its whole local map first, then syncs seats. Fresh devices adopt the shared seats; differing local fits and unsaved drafts are preserved for an explicit Use shared seats / Publish these seats choice. Offline saves remain local. Before adopting shared seats, the browser retains the previous full map under the image-specific `:before-seat-sync` key. Unlinked masks, grid, screens and agent customization remain device-local.

Existing fits saved on another browser/origin cannot be recovered by a fresh device until the original device saves once with the new version, or imports its exported map and saves. No default layout is published automatically.

Validation: check-shared-seat-layout (cross-device desktop/mobile save, full-fit reload, different character overrides, stale revision conflicts, explicit resolution, idempotence, wrong-image rejection, unmarked write rejection, previous backup, offline save and older local fits); check-seat-access; check-seat-map-selection; check-page-zoom-seat-mask; check-office-connection. No production test seat writes or fake reviews.
