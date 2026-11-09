# Paperclip roster expansion

2026-11-09 — Codex

The live Nebula export contains 19 agents, including five new deputies. Added stable ID bindings: Data-Sol → Data; Training-Sol → Training; Engine-Sol → Observatory, alongside Engine; Doctor-Sol → Doctor; Clerk-Sol → Admin / Clerk. Builder and Reviewer names continue to come from the live roster by ID. The paused Planner stays unassigned.

The existing Characters editor already consumes the complete roster. Previously unrecognized IDs received invisible unassigned defaults. Both roster polling and shared-map loading now upgrade those generated placeholders once a stable room binding exists, preserving sprite selection/custom art and fit. Explicit custom office or position edits are retained. Shared map contents and Paperclip records are not rewritten by deployment.

Validated the current 19-agent production roster in isolated desktop and phone sessions: all five are visible in the expected rooms, included in room agent states and listed in the editor. Reload tests cover placeholder upgrade with sprite-fit retention and deliberate custom-room preservation. Telemetry contract regression and full-map synchronization regression also passed. Production verification is read-only.
