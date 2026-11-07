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


## Reference-inspired command HUD (2026-11-06)

Replaced the editor-first header with a navy command bar, orbital brand mark,
gold selection trim, line icons, campus directory and UTC clock. Primary
actions are Rooms, Data (existing power previews), Displays (Screens editor),
World settings and Edit. Edit reveals the full tool strip and existing editor
sidebar; Save & lock returns to the uncluttered world view. Camera controls
remain in a floating dock. World settings expose ambient motion, nameplates,
grid, foreground, entrance reset and the previous-map link.

Twelve optional world-space navy/brass room nameplates mirror the reference
while preserving the source image. Working rooms have a small green marker.
Footer counters use actual local room states, seats and visible displays; no
render/model/queue totals are invented. Nameplate preference has its own key.
Grid, masks, seats, screens, saved image identity and save/draft keys remain
unchanged. The directory focuses each room and positions the character on
its floor so movement stays in the chosen area.

Browser QA: room navigation and subsequent WASD movement, independent power
controls, Motion/nameplate toggles, all four editors, screen drawing, save and
reload, original 599 cells/18 masks/4 seats retained. No horizontal overflow
at 1600, 997, 620 or 390px widths. No page errors. Wide, owner-size, directory
and editing screenshots visually inspected.

Preview: /review/illustrated-walk/index.html?rev=command-hud


## Live Nebula roster and Characters editor (2026-11-06)

Restored all 14 real organization members via the existing read-only /live
feed, including paused members, with live presence, issue context and room
activity. The Characters editor supports 82 embedded built-ins, per-agent
assignment/placement/scale/facing, PNG upload, individual-frame pixel editing,
animation previews, sprite export, seat binding and control/walk tests.
Version 5 saves character overrides with the existing owner map data.
See CHARACTERS.md for layout, feed semantics, channels and persistence.

The actor renderer sorts NPCs/player and reapplies foreground/screen masks,
while preserving the working elevator clipping and calibrated sitting poses.
The status strip now reports live organization agent count; stale feed state
is explicit. No writes to Paperclip/Nebula, no agent execution, no GPU art work.

Browser QA used the real 14-member roster and browser-local response fixtures
for status/failure/membership changes. Verified swap, PNG upload, pixel paint,
undo/redo, save/reload, custom-sprite walking and sitting, room state updates,
new/removed/paused agents, stale retention, screen channels and legacy imports.
An elevator trip passed with the multi-agent renderer. Owner 599 grid cells,
18 masks and four initial seat configurations remained intact. No page errors;
1500px and 997px previews inspected. Fixtures never changed the actual org.

Preview: /review/illustrated-walk/index.html?mode=characters&zoom=3&rev=live-agents


## Twinkle visibility correction (2026-11-06)

The first twinkle was present and its clock advanced, but was too subtle at
normal owner-size fit view. A renderer-level pixel comparison reproduced this:
in a two-second sample at 997px viewport width, only 6 observatory and 3 Lead
window pixels changed by at least 28 intensity levels. The earlier timer-only
check did not catch the perceptual shortfall.

Probes isolated halo footprint as the main cause: increasing brightness alone
still failed the visibility thresholds, while widening the halo passed. Widened
the shimmer from 3.3 to 6.5 logical pixels per size unit, raised window gain,
and added 10 prominent existing sky stars with larger staggered glints. There
are now 55 sky, 25 observatory and 12 Lead-window stars. Original architecture,
frames, nebula emblem, phase staggering and Motion/editor pauses are retained.

Regression: node scripts/check-star-visibility.cjs. It exercises the actual
renderer, downsamples to the canvas's CSS size and compares star-only changes
over two seconds across all three regions. Corrected readings: 193 sky, 38
observatory and 14 Lead-window pixels meet the visibility threshold. Screenshot
pairs at window zoom were inspected; the World > Ambient motion toggle still
pauses the effect. No map/save changes.

Preview: /review/illustrated-walk/index.html?rev=visible-star-twinkle


## Working hardware LEDs (2026-11-06)

Added exact-pixel lamp animation to the owner's marked Observatory towers,
Training server banks/core and all four Operations control panels. Sixteen
devices contain 305 sampled lamp clusters. Working cycles individual lamps
through actual dim/off and lit states, with independent bank scanning, activity
bursts and Operations chases. Idle is steady at half lamp intensity, retaining
the room's existing purple shimmer. Monitor faces remain unchanged.

HardwareActivity reads the existing room state from Screens; live agent work
therefore drives assigned rooms, and integrations can use the existing
setRoomState API. Data > Hardware indicators exposes Follow room / Idle preview /
Working preview for all three areas. Overrides are session-only and explicitly
labeled by a stage badge. ?hardware=working previews all groups without
changing live room status or saved map data. Motion off makes lamps steady;
editors show the original art. Cached frames update at 12 fps while Working;
Idle caches a static frame. Foreground masks reapply animated hardware pixels
per actor, alongside screen content. A direct room-state accessor avoids
rebuilding room-light preview arrays for each lamp-bank read.

Browser QA: all 16 devices and all four Operations units change independently;
Idle stays steady; Follow room responds to state; Motion/editing pause; 997px
fit renderer shows changes in all three groups (33 Observatory, 228+ Training,
145 Operations pixels over 28 intensity levels in a sample). Separate checks
confirmed zero changes inside monitor faces when only the hardware clock
advanced. Original 599 cells and 18 masks remained intact, no dirty edits or
page errors. Observatory/Training previews visually inspected.

Preview: /review/illustrated-walk/index.html?start=training&zoom=3&hardware=working&rev=hardware-activity


## Rocket vent, desk lamp and shooting stars (2026-11-06)

Implemented the three owner annotations as AmbientDetails:
- Two small pale vent-steam streams at the rocket's lower flanks while Engine
  room is Working. Eight low-opacity drifting/fading puffs are clipped away
  from the rocket body; this is vent steam, not a launch/flame effect.
- A gentle independent warm flicker on the Ticket Queue desk-lamp aperture
  and a little nearby light spill. It has no room/work binding.
- Five short shooting-star trajectories per 128-second cycle, with 20–30
  second gaps (first at 4.5 seconds). Thin blue-white fading tails use the
  existing open-sky clip, excluding the building, trees and window interiors.

The existing effects previews now include Engine rocket steam under Data >
Hardware & room effects. Follow room uses the live room-state integration;
Working preview is explicitly labeled and does not change live state or map
data. ?hardware=working previews the Engine effect alongside hardware lights.
Motion/editor/hidden-page pauses remain consistent. Motion off removes steam
and meteors and leaves the lamp steady. No source image or save-key changes.

Browser QA: no steam while Idle, eight puffs while Working, lamp varies
independently, meteor appears in its brief interval and is absent between
intervals. Actual 997px fit renderer checks found visible changes in all
three areas (21 steam, 30 lamp, 63 shooting-star pixels above an 8-level
intensity threshold in a sample). Screenshots inspected. Editor/Motion pause,
599 retained owner grid overrides, clean dirty flag and no page errors.

Preview: /review/illustrated-walk/index.html?hardware=working&rev=ambient-details


## Hardware lamp polish (2026-11-06)

Owner feedback supersedes the hard cutout/off implementation above. Removed
the near-black threshold-pixel replacement and six-Hz pseudo-random noise.
Fragments of one lamp are merged and tiny fragments discarded. Each lamp now
uses a fitted footprint snapped to the logical pixel grid, with four stepped
soft-mask weights blended into the original housing pixels. Overlapping masks
use strongest coverage rather than cutting seams through adjacent lights.

Standby is dim blue/violet or a device-appropriate warm tint. Working uses
slower, softly transitioning row activity, six quantized intensity levels and
16-step RGB palette channels. Colors drift between compatible cool tones
(or amber tones on the amber Operations unit); no black off state. Only one
third of lamps participate in the wave and only a small subset changes in
each interval. Phase offsets keep devices from pulsing together. Preview,
room-state binding, Motion/editor pause and foreground-mask support remain.

Browser QA verified per-device changed lamps never exceed the eligible third,
six-step Working intensities, steady Idle, Motion pause, clean dirty flag and
599 unchanged grid overrides. No page errors. Training and Operations close-up
screenshots visually inspected for removal of punched-out dark holes and
consistent lamp geometry.

Preview: /review/illustrated-walk/index.html?start=training&zoom=3&hardware=working&rev=smooth-indicators


## Agent life, nametags and state badges (2026-11-06)

Added bounded, grid-safe idle errands with walking sprites, occasional reading
poses, staggered pauses and actual-work return-to-desk behavior. Waiting agents
have longer pauses; Paused/Error/Unknown agents remain still. NPC motion uses
separate runtime positions, physical grid checks, room bounds and avoidance
of agents/player. It never changes saved character anchors or organization
state. Existing seat calibration and foreground masks remain in use.

Names/state now use readable screen-space DOM badges rather than tiny world
text. All 14 are enabled by default; label packing, leader lines, actual live
state colors and optional local activity keep identity clear at normal zoom.
Click a label to select the agent in Characters. World exposes Agent names
and Agent idle activity; Characters adds per-agent idle movement control.

Browser QA sampled nine moving agents, valid walking feet at every sampled
position, zero Paused displacement and no overlap among all 14 visible tags
at 997px fit view. Verified global/per-agent toggles, click-to-edit, editor
pause, save/reload, unchanged runtime placement JSON while roaming, a Working
interrupt returning a roaming agent home, stationary Working pose, and stale
feed stopping wandering/marking all labels Unknown. Owner 599 grid cells and
18 masks remained intact. No page errors; fit screenshot visually inspected.

Preview: /review/illustrated-walk/index.html?rev=agent-life


## Vivid dense starfield (2026-11-06)

The owner still could not see the earlier effect and explicitly requested many
more, much stronger twinkles. Supersedes the earlier subtle settings: 487
existing-star anchors (337 sky, 120 observatory, 30 Lead), over five times
the previous 92. Spatial separation is lower, periods are 1.5–3.8 seconds,
glows/glints are larger, and the underlying baked star cores now dim as well
as brighten. This creates visible brightness contrast instead of just adding
light to pixels already near white. All phases remain staggered.

Shade and light passes are batched per region to avoid hundreds of blend-mode
switches. Existing architecture/exclusion masks and Motion/editor pause remain.
The ?twinkle=preview link explicitly enables Ambient motion and resets to full
fit view, with a toast, so a paused preference or off-sky camera cannot hide
the effect during this preview. It does not alter map geometry or saved edits.

Strengthened scripts/check-star-visibility.cjs thresholds before the change:
old output failed (207 sky / 48 observatory / 12 Lead pixels above 28 levels).
New actual CSS-size renderer output passes at about 3944 / 1169 / 271 changed
pixels. Inspected the fit screenshot and captured a 24-frame lossless animated
WebP crop. Headless star-draw mean was about 4 ms in a targeted sample; verified
Motion/editor pause, preview setup, 599 unchanged overrides and no page errors.

Preview: /review/illustrated-walk/index.html?rev=vivid-starfield&twinkle=preview


## Unified effects preview and visible vent steam (2026-11-06)

Owner reported Working preview had no blinking machines and no visible rocket
steam. Reproduced the actual UI failure: after disabling Ambient motion,
opening ?hardware=working set every preview to Working but left the hardware
clock paused and puff count at zero. A second architectural issue was the
separate room-power and hardware controls; live polling could overwrite the
visible power control while a different hardware override remained active.

Data now has one authoritative effects control per room: Follow live / Idle
preview / Working preview. It drives room rails, machine lamps and rocket
steam together. Preview state is separate from live agent state and polling
cannot overwrite it. Selecting Working or opening the Working preview starts
Ambient motion and exits editing when no shape is pending. A visible paused
status and Resume effects button support deliberate pauses. View buttons focus
the matching room. API/live actual states and saved map data are unchanged.

Kept the clean, softly blended quantized lamp footprints and colored standby
palette, but restored a distinct brighter ordered row chase instead of the
overly sparse activity pattern. Only one lamp group cycles at a time; no
random busy flicker or black cutouts. Steam now vents farther outside the
bright rocket fins, with larger pale wisps and narrow curling vapor trails.
Agent tag placement reserves the vent area so names cannot hide the effect.

Regression: node scripts/check-effects-preview.cjs. It failed before the fix
(paused true, steam 0) and now verifies Working activation after a paused
preference, unified Idle/Working controls, persistence across a live poll,
Resume, visible renderer pixel changes (114 steam / 415 Training / 149
Observatory / 153 Operations in a sample), no tags over vents, no dirty edits
and 599 preserved grid overrides. Rocket screenshot inspected.

Preview: /review/illustrated-walk/index.html?start=engine&zoom=3&hardware=working&rev=effects-preview-fixed

## Single room activity model (2026-11-06)

Added RoomStates as the shared authority for all 12 rooms. Any assigned
Working agent activates its room; it returns to Idle only after the final
worker stops or moves. Characters publishes the read-only roster and applies
local assignment changes immediately. Fresh independent pipeline signals can
also activate a room; stale inputs expire instead of leaving Working latched.

Power, overhead rails, hardware, steam, small screens, room plaques, directory
labels and HUD Working counts now read the same effective state. Plaques show
explicit Working/Idle and mark previews or stale sources. Replaced duplicate
controls with a room selector and one Follow live / Idle / Working selector.
Screen editor previews share that override; polling cannot overwrite it.
Runtime APIs and integration details are documented in ROOM_STATES.md.

Validated model tests, browser live-feed fixtures with two workers in one room,
last-worker transitions, reassignment, preview/live isolation and actual
renderer pixel changes. Training Working HUD screenshot inspected. No browser
errors or dirty map changes; all 599 saved grid overrides retained.

Preview: /review/illustrated-walk/index.html?start=training&zoom=3&rev=unified-room-state

## Engine Working power-up (2026-11-06)

Engine room now reads the shared room state for a smooth fourfold turbine
speed ramp while Working, preserving rotation phase through state changes.
Working steam increases from eight to fourteen larger, denser puffs with
faster flow. Two amber-red gantry beacons rotate paired soft light sweeps
within the engine bay. Idle returns fans to their gentle speed and removes
the beacons and steam. Ambient motion and editor pauses remain respected.

Verified node scripts/check-engine-working.cjs: speed ramp and recovery,
fourteen steam particles, two rotating sirens, actual beacon pixel changes,
no browser errors, no dirty edits and 599 preserved grid overrides. Engine
Working screenshot visually inspected.

## Busier Working hardware (2026-11-07)

Training, Observatory and Operations hardware now runs overlapping row chases,
fading trails and staggered data bursts instead of a single sparse active row.
Training/Observatory advance at 3.2 steps per second and Operations at 2.8,
up from 1.15. Color cycling is faster, retaining soft transitions, six-level
brightness quantization, existing lamp footprints and colored Idle standby.

Extended check-effects-preview.cjs to measure simultaneous active lights and
cycling for all three rooms. Samples exceed 40% active lamps and verify
visible rendered animation, state controls, motion resume, steam and map edits.

## Music Studio Eurorack activity (2026-11-07)

Added four authored hardware light panels over both vertical Eurorack module
banks and their angled controls. Teal/pink sequencer LEDs share room Working
state, smooth quantized row chases and staggered bursts. Idle removes the
additional overlays exactly. Music panels participate in middle-floor
foreground masks; room preview and direct Music start URL are supported.

check-music-lights.cjs verifies four panels, visible animated pixels, exact
Idle restoration, no page errors and unchanged 599 grid overrides. Working
screenshot inspected for module placement.
