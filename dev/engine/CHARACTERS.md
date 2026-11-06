# Live Nebula characters

The illustrated world polls the existing same-origin GET /live feed every five
seconds and accepts the Nebula organization from org.paperclip. All members,
including paused members, are rendered. No agent, task, run or organization is
changed by this feature. Membership and status are runtime data, not map edits.

The current feed has 14 members. Stable agent IDs key local character overrides.
New members receive a stable built-in sprite and a mapped room; unrecognized
members appear in Admin / Clerk. Removed members disappear from the world,
while their appearance settings remain available if the ID returns. The Engine
agent keeps its existing Observatory assignment; Builder agents use Engine room.

## Characters editor

Open Edit > Characters, choose an agent or click their sprite in this editor.
The agent list includes live presence and the current assigned issue.

- Choose from 82 built-in sprites, with a visual gallery.
- Set room, feet position, facing, height, width, visual offset and visibility.
- Optionally bind a seat from the Seats editor. Actual running work uses the
  seat's calibrated pose and linked chair masks; other states use standing feet.
- Preview idle, walking, typing and reading in all four directions.
- Upload a PNG sprite sheet or edit individual frame pixels with Pen, Erase and
  Pick color. Editing makes an agent-specific PNG copy and does not change the
  shared source or another agent. Undo/redo includes strokes and assignments.
- Export the entire sprite PNG. Reset pixels returns to its chosen built-in.
- Control this agent uses that sprite with WASD, elevators and seat tests; it
  temporarily hides the parked duplicate. Release character returns to the test
  avatar. Walking tests do not rewrite the agent's saved standing position.

Custom sheets support 7+ columns and 3+ rows using configurable frame dimensions
(up to 256 px per frame). The rows are front/back/side; left mirrors side. Walk
uses columns 0–2, typing 3–4 and reading 5–6. Uploads must be PNG under 2 MB, no
more than 2048 px on either axis. Set the frame dimensions before uploading.

The renderer sorts agents and the player by depth and reapplies appropriate
foreground furniture/screen masks per actor. Names are visible on hover, for
the selected agent, or through World > Agent names.

## Presence and freshness

Presence follows the earlier engine's semantics: actual issue.running is Working;
an assigned issue without an active run is Waiting; paused/terminated stays
Paused; error/failed stays Failed. An idle or active agent without work is Idle.
Assignment alone does not imply running work. Assigned room indicators follow
this actual running-work state. Room preview overrides may be replaced by the
next live poll.

A failed request, a reading older than 30 seconds or an org export older than
90 seconds is stale. The last roster stays visible, but agent presence becomes
Unknown. Feed failures clear agent-driven busy indicators and mark their data
channels stale. The HUD connection dot turns amber.

The roster also publishes data-screen channels:

- nebula.agents: organization headcount, Working and Paused counts.
- nebula.room.<roomId>: room agent-work count and names/presence.

Room IDs: lead, second, clerk, observatory, engine, data, training, music, doctor,
review, operations, queue. Select these channel names in Screens > Data channel.
These are agent-activity readings, not GPU/job-pipeline metrics.

## Saving

Version 5 Save & lock and Export map include per-agent appearance, embedded
custom PNG, room/placement and seat binding alongside grid, masks, seats and
screens. Runtime roster, task text, work status and control state are not saved.
Older map files remain loadable and retain current character overrides when
the characters field is absent. Existing image-scoped save/draft keys remain.
