# Shared room activity

## Statistical offices

Operations and Ticket Queue default to Statistical. Any office can be changed
under Rooms > Edit office settings > Statistical office, then Save office.
The optional roomTypes map is included in saves, export/import and undo/redo.
Older saves retain the Operations/Queue defaults. Explicit activity settings
allow either default room to return to normal live Working/Idle behavior.

A statistical room's displayed state is statistical, while animationState is
always working. RoomStates.state/states return the display state; animation
consumers use RoomStates.animationState. Statistical rooms are excluded from
the HUD Working count and are not labeled Working, Idle, Preview or Stale.
Actual agent counts, pipeline liveState and source availability remain real;
no workers or metrics are fabricated. Data-screen freshness remains separate.
Idle preview is disabled for Statistical offices; changing the room type clears
its previous cosmetic preview. Global Motion/editor pauses still apply.

RoomStates is the single source for room Working/Idle status. Room power,
overhead bars, hardware lamps, rocket steam, small screen indicators, room
plaques, directory labels and HUD counts read the same effective state.

The existing read-only /live roster supplies actual agent activity through
Characters. If any assigned agent is Working, the room is Working. It returns
to Idle when its last Working agent stops or moves to another room. Waiting,
Paused, Failed and Unknown do not count as Working. Local room assignments
are applied immediately; previews do not change agent presence or tasks.

## Preview controls

Open Data and choose a room, then choose Follow live, Idle preview or Working
preview. This is one shared state control for all room effects and HUD labels.
Working preview enables Ambient motion. Follow live restores that room's live
state; Follow live for all rooms clears every override. The Screens editor's
room preview uses the same override. Previews survive polling, are visibly
labeled, and are never saved as map geometry or backend activity.

## Live integration

The roster adapter already calls the shared store. Future adapters can use:

```js
// Full replacement roster; stable IDs, configured room IDs, actual presence.
window.__worldEffects.setAgentStates([
  { id: 'agent-a', name: 'Researcher', room: 'training', state: 'working' },
  { id: 'agent-b', name: 'Reviewer', room: 'training', state: 'idle' }
], { updatedAt: Date.now(), available: true });

// Optional independent room job/pipeline signal, renewed while running.
window.__worldEffects.setRoomState('training', 'working', {
  updatedAt: Date.now(), ttl: 30000
});
window.__worldEffects.setRoomState('training', 'idle');

window.__worldEffects.setRoomPreview('training', 'working');
window.__worldEffects.setRoomPreview('training', 'live');
window.__worldEffects.clearRoomPreviews();
const rooms = window.__worldEffects.roomStates();
```

An independent Working signal OR a Working agent activates a room. An Idle
pipeline signal cannot cancel a Working agent. Agent readings expire after
30 seconds; optional room signals default to a 30-second lifetime. Stale
sources cannot keep Working latched. Availability is reported separately;
HUD labels show Stale when neither source is fresh. Invalid input is rejected.

Snapshots expose effective state, liveState, preview mode, availability,
assigned count and Working agent IDs/count. The nebula.room.<roomId> screen
channels publish this shared state while keeping counts based on real agents.
Previewing Working never fabricates workers or job metrics. The existing
Characters adapter remains the roster owner; an external full-roster adapter
should replace it rather than compete with its five-second polling.

Room IDs: lead, second, clerk, observatory, engine, data, training, music,
doctor, review, operations, queue.

## Verification

- node scripts/check-room-states.cjs: aggregation, last worker, reassignment,
  preview isolation, expiry, independent job signals and input validation.
- node scripts/check-room-states-browser.cjs: mocked read-only live feed in an
  isolated browser, shared renderer/HUD states, preview controls and saved grid.
- node scripts/check-effects-preview.cjs: actual animated pixels, Working
  activation after Motion was disabled, steam and retained map edits.
