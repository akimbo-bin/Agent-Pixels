# Automatic seat reservations

2026-11-10 — Codex

New/unbound agents now receive exclusive available seats in their own room. The allocator runs before movement and reserves every authored seatId first, including owners temporarily away, hidden or absent from the current roster. Duplicate manual assignments are retained with a conflict status; at most one owner can use the chair. Unusable/deleted manual choices are retained, not replaced silently.

Automatic choices are stored separately as autoSeatId; authored seatId is never filled or rewritten by allocation. Existing automatic choices are retained before new arrivals are allocated in stable ID order. Free seats in other rooms, even shared ones, are not taken as automatic home desks. A room with no spare usable seat leaves additional agents at their standing posts. Existing breaks and shared-seat visits honor the same reservations, as does player seat entry.

Characters now offers Automatic (available seat in this room), a named manual chair, or Standing post (no seat). The current seat/status is displayed below the chooser. Legacy nonempty seatId remains manual; legacy empty seatId retains its prior automatic behavior. Explicit choices use seatMode; automatic choices use autoSeatId. Both survive full-map sync, while custom sprite and room settings remain intact. Allocation changes are cached until relevant roster/config/seat/walkability inputs change.

Validated pure allocation cases: manual/absent reservations, stable new-agent arrivals, overflow, standing choices, blocked/deleted/new chairs, conflicting manual choices and unchanged authored configs. Desktop/phone motion tests verify separate docked chairs, a manual owner on break, overflow staying at post and automatic relocation when a user changes a manual reservation. Current roster and full-map save/sync tests passed. Deployment does not write shared map data or Paperclip state.
