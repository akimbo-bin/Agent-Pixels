# 03. Multi-floor 2.5D cutaway renderer and elevator specification

## Decision: additive 2.5D, not replace the simulation

Keep the existing Agent Pixels OfficeState and 2D walk/path semantics as a **compatibility runtime**. Introduce a **WorldDocument** with multiple per-floor navigable planes, a **WorldGraph** that links them through explicit transport edges, and a **CutawaySceneRenderer** with perspective projection. The existing legacy `PixelOfficeCanvas` can continue rendering old floorplans, so Astra's top-down Nebula HQ remains usable and testable. New worlds opt into `dollhouse-v2` render mode.

The design goal is the *side-on miniature cutaway* in the supplied reference: backs of rooms visible, depth in floors/props, floors vertically stacked, dark architectural frame, shafts/stairs and elevators physically linking them, a cinematic galaxy/observatory top, not orthogonal graph-paper rooms.

### Avoid a premature 3D-engine rewrite

This is a 2.5D presentation, not a real-time fully orbitable 3D building. Author room backdrops and prop layers as images; use deterministic projection and height/depth sorting. If a selected slice cannot reach reference-level fidelity with Canvas2D + compositing, test a narrow WebGL/Pixi renderer backend, but keep the **same scene document / world graph / state contracts**. Do not build parallel gameplay and telemetry paths for different drawing backends.

## Scene and navigation model

Separate three coordinates:
- **Logical**: `FloorId`, tile/local `(x, y)` for walkability, seats and interactions. Each floor is a walkable 2D layer or room-and-corridor graph; retain current Agent Pixels pathfinder per floor.
- **Presentation**: `FloorZ`, architectural cutaway position, per-room projection/foreground depth. Logical coordinates map into a room's cutaway plane, not directly into one global top-down grid.
- **Viewport**: zoom, pan, focus, layer and optional-follow camera. Render transforms never modify logical actor position.

Each floor has a unique ID, elevation order, walkable room/corridor geometry, local background/foreground layers, access nodes, and links to elevator/stair portals. Each room has an anchor, visible bounds, parallax/scenic layers, lighting and nav footprint. One runtime WorldController owns all floors and agents; there is no animation reset when changing focus.

### Multi-floor path graph

A route from A on floor 1 to B on floor 3 must traverse a real connector, not teleport:

- A's local 2D pathfinder walks to a reachable elevator call/door tile.
- A waits at the call point if elevator unavailable or occupied.
- On door-open, A crosses threshold into the platform, becoming an elevator passenger.
- Elevator car moves across visible shaft (no scene loading or instant disappearance).
- At target stop, doors open; A exits onto a reachable landing tile and continues through normal floor pathfinding.
- If connector disabled/blocked, route is rejected or visibly queued; no fallback teleports.

Recommended behavior state machine:
`WALKING_TO_CALL -> WAITING_FOR_ELEVATOR -> ENTERING -> RIDING -> EXITING -> WALKING_TO_DESTINATION -> IDLE`
with `CANCELLED`, `BLOCKED`, `WAITING_FOR_SPACE` and timeout/recovery states. The elevator controller owns floor stop order, per-stop portals and car occupancy. Prototype capacity 2-4, tunable; cooldown traffic of 12 agents must be queued instead of collapsing into one instant jump. Alternative stairs support can be added through the same connector graph.

**Data truth separation**: This walk is a visual simulation, not a Paperclip command. Cooldown agents are sent to lounge only when an authorized fresh usage observation proves cooldown and current job ownership allows it. Active independent training/rendering stays active even when other agents travel to break room. Unknown data never triggers lounge routing.

## Rendering stack

**Suggested order, back to front:**
1. sky/galaxy and distant skyline parallax;
2. structural exterior silhouette, roofs and level supports;
3. each floor's rear wall/background plate, wallpaper, windows and lamps;
4. per-room floor plane and contact shadows;
5. back props (bookshelves, pipes, screens), rear railing;
6. actors and interactive machines sorted by logical depth/occlusion anchor;
7. foreground furnishings, columns, stairs, balcony railing, front-wall cutaway;
8. local emissive overlays, dust/sparks, telescope optics, machine FX, status signage;
9. hover/selection/interaction affordances;
10. game-style HUD, accessible HTML inspector/menu.

Do not flatten all of the above into one PNG. A hero telescope can be **several layered assets** (dome, glass sky, telescope mount, barrel, rotating optics, rail, consoles, emissive lens). Each machine animation should be layered over a stable image, with deterministic status flags.

### Pixel/detail strategy

The current engine uses 16px grid sprites and nearest-neighbor zoom. The visual reference uses **far higher visual density**. Preserve the 16px logical grid for agent movement, but **decouple art source resolution from tile units**. For example, a hero telescope might be composed from hundreds of visual pixels across multiple room-local layers with a logical footprint of a few navigation cells. Keep character size coherent using a consistent authored scale factor, not by shrinking detailed generated art to a blurry 16px tile.

Create two complementary art classes:
- **Interactive sprite and foreground**: trimmed transparent PNG/WebP, world anchor, pivot, collision/occlusion, status/emissive layers, animation frames. Characters and machines live here.
- **Room plate / scenic backdrop**: high-resolution opaque or layered cutaway illustration, aligned to room dimension and parallax depth. These can express window frames, wall materials, shelves, warm lights and external night sky at a fidelity impossible for tiny procedural sprites.

The editor must expose source-to-world art scale and preserve crispness at close zoom. Nearest-neighbor is appropriate for pixel-mode assets; room plates may use carefully controlled high-quality downsampling/LOD so the target illustration doesn't become jagged. Don't apply one blanket filtering rule to every image.

### Light and visual effects

Add authored local light anchors (warm lamp pools, fluorescent white lab, violet starfield, green machine beacons). Bake broad ambient illumination into room plates; use 2D additive/emissive overlays, contact shadows, restrained particle effects and foreground masking for moving objects. FX must be subtle in idle state and show verified changes for real jobs. An always-on twinkling star is ambient; a pulsing training rack means sourced machine activity. Reduced-motion must disable flashing or shake while preserving status meaning.

## Camera and gameplay affordances

- **Initial view**: frame all visible levels as a coherent dollhouse, with dark framing/sky and small game HUD.
- **Zoom**: focus a room or machine smoothly; pan horizontally/vertically across the building; Fit All, Fit Floor, Focus Agent/Machine.
- **Cutaway controls**: toggle front walls/roof visibility, building shell opacity and floor isolate; room and floor can be inspected without losing rest of building state.
- **Responsive**: desktop remains composition-first; portrait mobile defaults to floor/room-focused legible view plus mini building map, with Fit All available. Don't promise the entire 3-level landscape legible at phone width.
- **Hit testing**: screen pointer -> inverse camera projection -> layer-aware prop/room/agent hit list, explicit selectable interactive nodes; cannot pick invisible props behind opaque front layer.
- **Elevator camera**: while following an agent, smoothly frame elevator ascent and destination room; user can opt out.

## Semantic requirements for other projects

All rooms, floors, materials, objects, elevators, role seats, animations and states come from a **data-driven scene** rather than Nebula-specific IDs. A generic new project can choose a two-floor office, a four-floor lab or a single-floor top-down office and bind to its own adapter. The shared renderer never imports the Nebula viewer's private source IDs or keys.

## Geometry and collision tests

1. Every room, access point and seat is reachable from lobby through either same-floor paths or a declared elevator/stair edge.
2. A cross-floor route records an ordered connector transition, not just a set of teleport endpoints.
3. Blocking an elevator landing or deleting a connector fails reachability and is rejected by the editor before publish.
4. Place/remove/resize a blocking prop and verify path availability immediately; Undo restores last valid scene.
5. Stage 0 through 6 telescope art changes do not unexpectedly change required navigation footprints.
6. Elevator car occupancy, 12-agent simultaneous cooldown, arrival ordering, cancellation, stuck-car/timeout and repeat route all have deterministic tests.
7. Pan/zoom/resize/render-mode changes do not reconstruct simulation actors or drop their inter-floor route state.
8. Front-wall occlusion and hit testing agree: users cannot select what the camera has made invisible.
9. Machine LEDs remain gated by telemetry source freshness even while elevator animations run.
10. The 2D classic view remains visually and semantically identical under regression tests.

## Prototype acceptance (must come before full migration)

- Actual compiled browser shows three vertically stacked levels and at least one obvious elevator shaft with moving car.
- An agent enters the elevator on one level and exits on another; playback video demonstrates whole sequence.
- At least one room plate and three transparent props were created/approved via the proposed asset workflow, with edit and placement.
- The hero observatory is a layered cinematic set-piece recognizable as closer to the generated target.
- Camera zoom/follow and HUD work; status machine remains correct and separate.
- No source write APIs, scheduler actions or modification to existing user production viewer.
- Only after real owner review of screenshots/video does the team scale to 12 rooms and full fidelity.