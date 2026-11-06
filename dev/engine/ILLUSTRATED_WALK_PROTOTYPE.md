# Illustrated world walking prototype

## Approved owner map and working elevator

Elevator indicators were restyled as narrower beveled brass-and-violet plaques,
centered on each door aperture. Call buttons use matching recessed brass plates
with faceted glass, smaller muted glows and jamb-aligned placement. Functional
state colors and hit regions remain coupled to the same fixture coordinates.
Browser inspection verified clicking the new plate registers a call, the cabin
arrives and a subsequent ride completes with no page errors.

The latest Downloads export, nebula-expanded-grid-and-masks (1).json, is preserved
byte-for-byte as dev/engine/approved-map.json. It contains 599 painted cells and
18 masks. SHA-256: 1966f3ed390921477871a55a3b5887e018dc293f969fe8744abb94b07448f259.
The build embeds it as the default. A newer browser save/draft still takes
precedence; older browser saves cannot replace the approved export by accident.

The single cabin starts at the middle floor, matching the open-door artwork.
The middle open interior supplies the cabin texture on all floors. Upper and
ground closed doors use their own source pixels; each is split into left/right
leaves that slide behind the stationary golden frame. Middle closed leaves use
the matching upper pair fitted to that opening. Rectangles are documented in
elevator-slices.json; extract-elevator-slices.py saves the actual pixel crops.

illustrated-elevator.js owns calls, boarding, closing, travel, opening and exit.
Press E or click the local wall button to call; choose 1 Upper, 2 Middle or
3 Ground when ready. The character walks into the cabin, rides with doors shut,
then walks out. Empty calls also move the cabin. The camera follows a passenger
smoothly during travel. Only the landing containing the cabin may open.

Runtime collision gates the opening regardless of painted cells. Doors stay
open while the character occupies the cabin/threshold and reverse if the
threshold is occupied during an empty close. Lights above each landing show
amber calls, violet directional travel and green cabin presence. The idle doors
close after the landing clears. Editing, Reset and start jumps cannot interrupt
an occupied trip. Elevator state is runtime-only; map geometry is unchanged.

Browser checks exercised all six directed floor pairs, intermediate door states,
closed-door blocking, manual cabin entry, threshold hold, automatic clear close,
reopening and riding, and no page errors. Moving-state samples always had all
landing doors closed, and never more than one landing was open. The approved
599-cell/18-mask data compared identical after six trips. Reports/screenshots
are in review/illustrated-walk in the running engine. No image generation ran.

## Current version: expanded AI-upscaled map and furniture masks

The current prototype uses the expanded owner master
8a8c2bde-8bc6-4103-91c2-5f257de3e645.png (1448 × 1086), with a 2896 × 2172
RealESRGAN_x2plus display texture. Upscaling ran on CPU, two threads,
below-normal priority, tiled with 32px context. ComfyUI stayed disabled.
Logical geometry uses native coordinates; canvas backing and cropped cutout
textures use 2× resolution. Walking areas were recalibrated for the expanded art.

Use Furniture masks for Brush, Polygon, Erase, brush-size control and Undo/Redo.
Click polygon corners, then Finish, Enter or double-click. Pick line sets the
furniture's floor baseline; Try behind and Try in front preview actual walkable
positions. Masks cover agents on the same floor only when their feet are behind
the baseline. Masks sample exact image pixels; Walking grid handles collision
separately. This is a first geometry/mask pass for owner refinement.

Save & lock persists BOTH walking cells and foreground layers in this browser.
Export/Load map use version-2 JSON with mask operations and base lines. Draft
recovery remains available. This is not an automatic server/project write.

The old map and its browser storage remain available at previous.html, backed by
artifacts/illustrated-map/map-editor-backup/previous-map.html and commit 7708d8f.
Old-map coordinates are not silently applied to the changed composition.

The readable source is illustrated-editor.template.html. Rebuild the embedded
standalone HTML with scripts/build-illustrated-editor.py --serve-copy using the
portable Python. AI output and receipt are in artifacts/illustrated-map.

Browser checks passed for brush/polygon/eraser alpha, Undo/Redo, base-line setting,
mask-plus-grid save/reload and export/import, valid character preview, every
named starting location, sampled same-floor connectivity and all elevator floors.
No page errors occurred. Nebula remained unpaused; ComfyUI remained disabled.

The notes below describe the previous map and earlier prototype iterations.

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
- Reset: return the character to the entrance; grid changes are retained.
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


## Doctor desk correction

Traced the desk's angled left corner, cabinet front, right side and monitor from
the original scene to replace the old rectangular cutout. Its collision polygon
now includes the marked left/front edge and actual base. The feet marker is
redrawn before foreground layers so it cannot show through a desk. Verified the
marked corner is blocked, the back/left/front approaches remain walkable, and
walking forward from behind stops at the desk. Direct view: ?start=clinic&grid=1&zoom=3.


## Lead lounge correction

Replaced four rough rectangular collision regions with traced polygons for the
sofa, coffee table and both armchairs. Foreground silhouettes now include the
missing sofa corner, sloping tabletop and wider armchair sides. Their depth
thresholds match their actual bases. Verified that the marked corners/tabletop
are blocked while the front walkway, center rug, table-side approach and Lead
desk approach remain open. Direct view: ?start=lounge&grid=1&zoom=3.


## Raised-office stairs and doorway

Replaced the narrow straight stair quadrilateral with the curved/widening path
traced from the owner's annotation. Added exact-image foreground masks for the
entrance pillar and three sections of the right parapet. The pillar base and the
actual planter footprint remain blocked. Browser WASD traversal reaches the top
landing continuously; a character at (600,226) is correctly hidden by the pillar.
The owner intends to relocate the baked plant/adjacent ornament to clear desk
access; that background edit has not been performed. Keep the same canvas and
unchanged surrounding architecture when updating the image.

Direct view: ?start=stairs&grid=1&zoom=3; mask check: ?start=doorway&grid=1&zoom=3.


## Saving and locking owner-painted cells

The owner requested persistent grid saves. Adjust grid now includes Save & lock,
Load map and Export map. Save & lock stores image-scoped overrides in browser
localStorage, closes painting mode and changes the edit button to Unlock grid.
Saved overrides reload automatically. In-progress strokes also have local draft
recovery; unsaved changes trigger a leave-page warning. Reset moves only the
character. Loading checks image SHA-256, grid dimensions and boolean cell keys,
and imports overrides without replacing the newer authored floor geometry.

This is a same-browser save, not a server/project write. Export JSON is the
portable backup and the handoff artifact for adopting painted cells as the
project default. Existing open tabs must export before refreshing into this
version, then Load map and Save & lock.

Browser QA verified paint -> save -> reload -> locked identical cells; Reset
retains edits; importing a prior-format export and saving survives reload.
No page errors were observed. No existing office/world/live data was written.


## Seat calibration editor (2026-11-06)

The Seats tab adds reusable typing, reading and still poses using the existing
character sheet. Four starter chairs cover Review, Data, Training and Music;
these are calibration starting points for the owner, not approved final fits.
Each seat has floor, facing, pose anchor, size, offset, optional perspective
scale, walking approach, exit, chair depth and linked foreground masks.

Select a chair, enable live preview, drag the colored markers or use Pick,
and adjust the pose. Draw a chair-back mask opens the existing brush/polygon
editor and links the new layer to that seat. Return to Seats to preview it.
Duplicate copies the pose fit but requires its own absolute-position mask.
Walk up & sit tests a collision-checked route followed by a short docking
transition; E or movement stands up at the configured walkable exit. E near
a chair approach sits during normal walking. Chair docking does not change
the public walking grid.

Version 3 saves/export JSON include seats alongside grid and masks. Old version
2 files still load; existing seat configurations are retained when that file
has no seats. Save & lock uses the same browser-local storage and returns to
Walk. Entering an editor unlocks editing; Export map remains the portable backup.
The approved 599 overrides and 18 owner masks are unchanged. No ComfyUI used.

Browser QA: all four default chairs sit/stand; walking from 41 pixels away
reaches the Data approach; duplicate/undo/redo work; a new linked polygon mask
and seats survive save/reload; ordinary Walk reload remains locked; export
contains version 3 seat data; no browser page errors.

Direct editor: /review/illustrated-walk/index.html?mode=seats&seat=review-front&zoom=3


## Observatory portal motion (2026-11-06)

The existing vortex artwork rotates inside a perspective-matched elliptical
aperture; the bezel, housing and foreground brace remain original static
pixels. A feathered edge, subtle purple light pulse and nine tiny drifting
sparks keep the animation inside the illustrated style. The 128px offscreen
frame updates at 12 fps and composites before characters and furniture masks.
No generation services, GPU inference or image/map replacement are involved.

Motion has its own browser preference, respects reduced-motion on first use,
and pauses during grid, mask and seat editing. It does not enter exported map
data or mark owner edits dirty. Seat save/draft keys remain unchanged.

Browser QA verified animation time advances, freezes in Seats, pauses via
Motion and retains that preference after reload; approved 599 cells remain
intact and no page errors occurred. Screenshots were inspected for aperture
alignment and retaining the fixed ring/foreground brace.

Direct preview: /review/illustrated-walk/index.html?start=portal&zoom=4&rev=portal-motion


## Data and Training power lighting (2026-11-06)

Room lighting opens independent Idle / Working previews for Data and Training.
Idle adds a slow soft violet shimmer; Working ramps up over about a second
with a stronger breathing glow, independent equipment flicker and occasional
short surges. Cached violet-emission masks sample the actual illustrated
hypercube, Training server banks and central machine, excluding dark panels,
cyan monitors and warm fixtures. Soft local bloom and shallow floor light
spills follow the sources. The source artwork, seats, saved grid and masks
are unchanged. Effects composite before characters and foreground masks.

Motion switches temporal animation off while retaining steady state lighting.
Editors show the untouched art and pause the effect clock. Preview states use
a separate browser preference; they do not dirty or modify exported map data.
Future work status can call window.__worldEffects.setRoomState('data' or
 'training', 'idle' or 'working'); this is a prepared hook, not a connection
to live job data. View buttons center the corresponding room.

Browser QA: independent states, Working brightness above Idle, gradual ramp,
editor pause, persisted room preferences, valid/invalid status hook inputs,
no dirty flag changes, all 599 approved grid overrides retained, no page
errors. Idle/Working and Training close-up screenshots were visually checked.

Preview: /review/illustrated-walk/index.html?start=data&zoom=3&rev=room-power


## Engine room idle turbines (2026-11-06)

Both illustrated turbine interiors rotate at slightly different idle speeds
and opposite directions. The circular source artwork rotates in normalized
ellipse space before being projected back into each fan's perspective.
Original housings, rims and stationary lit hubs remain fixed. Small cached
96px frames update at 24 fps before characters and foreground masks.
Motion off and grid/mask/seat editing pause animation and show original art.

Browser QA checked advancing angles for both fans, opposite directions,
editing/Motion pauses, no page errors, clean dirty flag, and preservation of
599 owner grid cells and 18 masks. Preview screenshot inspected for alignment.

Preview: /review/illustrated-walk/index.html?start=engine&zoom=3&rev=turbine-idle


## Revised Idle / Working distinction (2026-11-06)

Owner feedback supersedes the original softer idle behavior above. Both Idle
and Working now retain the former Working purple shimmer, pulse and equipment
flicker. Activity is communicated by LEDs along the existing overhead rails:
Data has a short green chase moving left to right (not completion progress);
Training has symmetric red groups sweeping from center outward and back.
Idle leaves these work LEDs off. State transitions fade the rail activity.
Motion off renders steady work indicators. Editing pauses/hides all effects.
The independent room preview controls and integration hook are unchanged.

Browser QA checked changing green and red LED patterns, bounded green chase,
red symmetry, idle LEDs off with strong purple shimmer retained, independent
room states, editor pause, clean dirty flag and 599 untouched grid overrides.
No browser errors; preview screenshot checked against the existing rails.

Preview: /review/illustrated-walk/index.html?start=data&zoom=2.75&rev=work-indicators


## Screens editor (2026-11-06)

Screens supports room-assigned rectangles and four-corner perspective surfaces,
click selection, corner dragging, moving, redraw, duplicate/delete, color and
brightness, visibility, plus independent preview controls. Small indicators
follow room state; large displays accept preview JSON, named live data channels
and optional polled JSON addresses. See SCREEN_DATA.md for the payload and
integration hook. Existing lighting hooks now accept all mapped room IDs.

Version 4 persists screens with owner grid/masks/seats. Older maps remain
compatible and keep current screens when the screens section is absent.
Screen content respects original foreground masks without covering agents
incorrectly. The renderer uses seam-free inverse perspective sampling.

Browser QA covered rectangle/four-corner creation, corner drag and movement,
duplicate, undo/redo, JSON preview and push, mocked JSON feed success/failure,
save/reload/export, legacy imports, rejection of crossed corners, foreground
mask rendering, all 599 grid cells and 18 masks retained, and four existing
seat defaults retained. No page errors; preview screenshots inspected.

Preview: /review/illustrated-walk/index.html?start=data&zoom=3&mode=screens&rev=screens-editor


## Star twinkle (2026-11-06)

82 selected existing stars now brighten on independent 3.2–8.8 second cycles:
45 across the open sky, 25 in the observatory glazing and 12 in the Lead
windows. Positions were sampled from bright stellar points in the approved
artwork with spatial separation, then visually inspected. Polygon clips keep
glow off the frames, trees/architecture, telescope and central nebula emblem.
Small blue-white pixel sparkles and a cached violet-blue glow composite before
characters and foreground layers. Most stars remain still; phases are seeded
and independent rather than synchronized or randomly changing each frame.

Motion off, editing and hidden-page status pause the twinkle clock. Map
image, geometry, seats, screens and local save/draft keys remain unchanged.
Browser QA verified time-varying brightness and partial activity in all three
regions, Motion/editor pause, 599 overrides and 18 owner masks preserved, clean
dirty flag, and no page errors. Fit and Lead-window screenshots inspected.

Preview: /review/illustrated-walk/index.html?rev=star-twinkle
