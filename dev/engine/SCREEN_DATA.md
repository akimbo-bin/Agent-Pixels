# Illustrated screen data

## Room programs and connected readings

All 42 owner-authored screen outlines are included in the approved map. Their
geometry, masks, 599 walking overrides, seats and character settings are kept
exactly as exported. Existing browser saves take precedence over these defaults.

Screen program defaults to Automatic. Small screens resolve to corporate
charts (Lead/Second), correspondence/workbooks (Clerk), celestial/quantum plots
(Observatory), blueprints (Engine), code/DSP (Data), matrix/neural graphs
(Training), and explicitly illustrative medical diagnostics (Doctor). Large
screens resolve to Engine mission control, a green math chalkboard, AKIMB0
training, or the Music render station. Profiles can be changed individually;
Generic retains the previous channel/indicator behavior. Explicit custom URLs
or channel names use Generic unless another program is selected.

Room programs have their own palettes. Existing color and indicator animation
fields apply to Generic. Idle programs alternate slowly; Working programs run
busier traces, scans and activity rails. Animation is decorative and does not
advance a numerical progress reading. Motion/editor pause is respected.

Characters passes its existing five-second read-only /live response to
ScreenPrograms. No extra roster connection, credentials, job changes or
Paperclip writes are introduced. The program module consumes:

- nebula.training: actual queue jobs done/total and stage, plus host.gpu readings.
  Percentage is queue completion, explicitly not epoch/training-step progress.
- Engine agent: actual assigned issue and running/paused state, plus reported jobs.
- paperclip.renders.vm116: actual render state/progress/samples when reported.
  Missing samples are shown as unreported. Without measured audio telemetry,
  the moving scope is explicitly labeled as an illustrative visualization.
- paperclip.machine.*: dated service-health checks; stale checks are attention
  items, not proof of online or offline status.

Live job/machine readings expire at 180 seconds; roster/board age limits are
90/180 seconds, with a 30-second receipt limit. Missing or stale values show
Unavailable or an em dash. Actual training/render activity also enters the
shared room state so a running external job can activate a room even while
its supervising agent is paused. Preview overrides remain cosmetic.

### Operations and Queue

The four Operations surfaces show Active Work, Machine Health, Needs Attention
and Review Readiness. The three Queue surfaces show Ready (todo), In Progress
and Needs Review, using NEB ticket IDs. Ready means the todo board column,
not a claim that all dependencies or scheduling gates have passed.

The existing Nebula snapshot only exports current assigned in-progress issues,
jobs and machine checks. It does not export full backlog/review/blocker totals.
Those totals remain unconnected rather than being inferred from agent counts.
The installed Paperclip connector is currently authorized for Chibi, so it was
not used to substitute another company's board. The existing read-only Nebula
snapshot remains the runtime source.

An authorized Nebula board exporter can populate these displays without new
renderer code by adding this allow-listed summary under org.paperclip:

```json
{
  "workboard": {
    "complete": true,
    "updatedAt": "2026-11-07T00:00:00Z",
    "counts": { "todo": 0, "in_progress": 0, "in_review": 0, "blocked": 0 },
    "issues": [{ "key": "NEB-123", "title": "Example", "status": "in_review" }]
  }
}
```

Counts must represent the full scoped board, with a bounded list of recent or
highest-priority tickets for display. Only complete, fresh board readings are
used for totals. A full /live-shaped payload can also be pushed through
window.__worldEffects.setScreenTelemetry(payload).

Measured Music audio can be pushed separately. The adapter rejects invalid
states, progress, sample counts and non-finite/out-of-range arrays. Waveforms
use normalized -1..1 amplitudes; spectrum bins use normalized 0..1 levels.
Readings expire after 15 seconds and should be refreshed while active:

A Music screen's optional JSON feed can use the same payload with its channel
set to music or music.telemetry and its program explicitly set to Music render
station. Screens.setData on either of those channels accepts the payload too.

```js
window.__worldEffects.setAudioTelemetry({
  state: 'running', detail: 'NEB render batch', samples: 1200,
  progress: { done: 20, total: 100 },
  waveform: [0, 0.4, -0.2, 0], spectrum: [0.1, 0.7, 0.4]
});
```

These example values are API examples, not bundled production metrics. The
render runner still needs to publish measured audio/sample telemetry; no real
audio spectrum is inferred from render status. Script check-screen-programs.cjs
checks all 42 exact outlines, Idle/Working animation, fresh/stale sources,
optional board/audio readings and preserved map data in an isolated browser.

Open the Screens tab, choose a room, and draw a rectangle or click four corners
in clockwise order (top left first). Drag corners to fit the display surface;
drag inside the selected screen to move it. Duplicate copies the display setup.

Small Working indicators follow their room state and offer chase, symmetric
sweep or pulse animations. They share live room state with power effects,
hardware and HUD labels: any Working agent makes the room Working. The room
preview selector overrides all these surfaces together until Follow live.
Large data displays use named channels. The existing Nebula roster is connected;
independent job metrics still require a configured feed. See ROOM_STATES.md.

## Live payload

A channel accepts a JSON object like:

```json
{
  "title": "Training · nebula-xl",
  "value": 72.4,
  "unit": "%",
  "status": "Working",
  "series": [12, 19, 30, 28, 51, 72.4],
  "lines": ["Model: nebula-xl"]
}
```

The display shows title, value/unit, status, a line chart and the first footer
line. Values are not interpreted as HTML. The editor's Preview data accepts
this same payload. Several screens can subscribe to the same channel.

For a live feed, enter its JSON address, enable automatic reads and choose a
2–300 second interval. Requests omit credentials, time out after four seconds
and preserve the last received values on failure. Remote services must permit
browser access (CORS). Errors appear in the editor. Only configured, enabled
feeds are read; polling pauses outside Walk/Screens or while the page is hidden.

For an application integration, push updates directly:

```js
window.__worldEffects.setScreenData('training', payload);
window.__worldEffects.setRoomState('training', 'working'); // or 'idle'
```

The room signal expires after 30 seconds unless refreshed, and Idle cannot
cancel an independently Working agent. For cosmetic testing use
setRoomPreview('training', 'working'), then 'live' to return to live aggregation.

Or dispatch a same-page event:

```js
window.dispatchEvent(new CustomEvent('nebula:screen-data', {
  detail: { channel: 'training', data: payload }
}));
```

Without received values, data displays show a clearly labeled preview and an
em dash rather than a fabricated live metric. Feed values and preview payloads
are runtime data; exported map files store geometry and connection settings.

## Persistence and drawing

Save & lock and Export map include screens in version 4 together with grid,
furniture masks and seats. Undo/redo includes screen creation, editing,
duplication and deletion. Older v2/v3 maps remain loadable and retain current
screens when no screen section exists; an explicit empty screens array clears
them. Local storage uses the existing image-scoped save/draft keys.

Perspective uses a projective inverse pixel sampler so skewed displays have
no triangle seams. Screen content draws behind actors, then is composited
through existing foreground masks where furniture should cover those actors.
World animations pause in editing; the Screens preview remains animated when
Motion and Preview screen animations are enabled. Static data surfaces cache
until their content/configuration/state changes.
