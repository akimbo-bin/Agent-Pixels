# Illustrated world walking prototype

Question: can the owner's finished illustration support continuous character movement,
floor connections and depth overlap without regenerating its furnishings separately?

Open `illustrated-walk-prototype.html` directly in a browser. It is self-contained:
the owner-provided scene and the existing project's char_0 sprite are embedded.
No build, server, live sources or model generation is required.

The current local review copy is available at:
http://127.0.0.1:8790/review/illustrated-walk/index.html
That copy is served by the pre-existing Office Builder server; this prototype does
not modify its world, renderer, editing session, live bindings or asset packs.

## Controls

- WASD / arrow keys: walk; G: toggle the active floor's walking grid.
- E at the right-side elevator: choose 1 Upper, 2 Middle, 3 Ground.
- The raised office connects to the upper walkway through its illustrated stairs.
- Mouse wheel or +/-: zoom around the character. Fit map shows the whole building.
- Scenario buttons: start behind the Lead desk, by the stairs, or at the elevator.
- Adjust grid: paint walkable/blocked cells, undo a stroke, export the map JSON.
- Reset: return to the entrance and clear temporary grid changes.
- Shift-click: place the character on a valid point of the current floor.

## Evidence and current answer

Browser inspection verified WASD movement, collision at an Operations terminal,
continuous walking up the raised-office staircase, all three elevator destinations,
foreground desk overlap, grid toggle, painting/undo/export and direct offline loading.
No page errors or server write requests occurred. Sampled walking connectivity
reaches all scenario starts from each floor's walkway.

Technical feasibility is demonstrated; visual calibration remains for owner review.
The geometry is deliberately a first authored pass. Some small plants and furniture
edges still need more exact footprints/cutout silhouettes. Classroom depth changes
character scale, but a complete perspective calibration has not been finalized.
The elevator has a functional timed connection and a travel marker; its doors and
cabin still need final animation layers. No live agent/data integration is claimed.

Static occluders sample exact pixels from the background and redraw above the
character according to their base depth. No independently generated matching art
is used. Future work should refine the map/cutouts before requesting more images.

Scene source: owner attachment `4a5197fd-b8be-4499-9d65-21f9b48a2462.png`, 1670×941.
Its SHA-256 is embedded in map export. Original art/source remains unchanged.
Character source: existing project `public/assets/characters/char_0.png`.

This branch is an isolated throwaway prototype, not the production world renderer.


## Review-room correction

The original mapping wrongly used the ceiling's vanishing point as the floor's
rear boundary and guessed six repeated seat columns. It has been replaced with
the owner's annotated center aisle and front walking strip, plus four traced
front chair bases. No ceiling or rear desk rows are walkable. Character scale
now changes from 45% at the rear aisle to full size at the front, continuously.
Review grid cells are clipped to the actual floor outline. Matching chair masks
preserve depth overlap. Browser walking reaches the rear floor limit at y≈730
and returns to the front corridor; ceiling/seating blocks and all four chair
bases were checked. Other rooms' navigation data was retained.

Direct review link: ?start=review&grid=1&zoom=3
