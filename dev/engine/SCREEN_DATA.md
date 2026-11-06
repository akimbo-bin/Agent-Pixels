# Illustrated screen data

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
