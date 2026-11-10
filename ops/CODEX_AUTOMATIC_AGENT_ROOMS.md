# Automatic Paperclip agent room assignment

2026-11-10 — Codex

The live roster has 24 agents. New IDs no longer need a code change for standard departments. OfficeTelemetry.agentRoom accepts an agent and roster: established IDs retain their defaults; recognizable team names take precedence over specialist titles and distinct roles; otherwise a departmental manager can supply the room. Reporting to Lead/Second does not assign everybody to leadership. Generic engineer/researcher/PM roles are not sufficient to guess a department. Cycles and ambiguous identities resolve to Unassigned, still listed in Characters.

The same resolver supplies character defaults, dashboard room membership and engineering display agent lists. Roster polling retains reporting relationships. Engine deputies join Engine in Observatory, while Builder/Engineering agents use the engineering room. New default positions use compact multi-row slots instead of spilling horizontally into adjacent rooms.

New configurations carry roomMode=auto. A room choice or explicit feet-position edit pins roomMode=manual. The Characters editor's Use automatic room button opts back in without replacing customSheet, skin, frame dimensions, height, width or pixel offsets. Automatic department changes adjust room/default standing location and clear an incompatible seat binding; manual configurations are untouched. Existing authored assignments without a mode are grandfathered. The sole legacy upgrade is the recognizable invisible Unassigned placeholder geometry produced before assignment was known; its sprite edits are retained. Manual Unassigned choices made in the new editor are pinned too.

The full-map save validator accepts and retains assignment mode, so manual choices and sprite edits keep syncing. Deployment does not write any shared layouts, local browser saves, Paperclip agents or telemetry producers.

Validated: check-auto-agent-rooms covers fresh IDs, names/titles/roles, manager fallback, ambiguous roles, reporting cycles and established identities. check-agent-roster runs desktop/mobile against the current live roster in isolated browser sessions, then adds a synthetic agent to its isolated feed while the page remains open. It checks immediate roster discovery, manual room and custom-sprite retention after rename, opt-in automatic reassignment, and visible Unassigned listing. Full-map sync, live connection and pinned telemetry regression checks passed. Production verification remains read-only.
