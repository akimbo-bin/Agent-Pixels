# 02. Product specification: Agent Pixels V2 Headquarters Builder

## Problem statement

The current headquarters uses real agents, live/demo telemetry contracts and an accessible connected tilemap, but its top-down layout looks like a low-resolution floor plan. The user's visual target is a much more detailed, animated, architectural science headquarters: layered rooms, depth, dramatic equipment, balconies, material richness, ambient light and a memorable telescope. Each visual upgrade currently requires a programmer to draw or place sprites manually. The product is neither easy to customize nor reusable across projects.

## Solution from the user's perspective

Agent Pixels V2 has two connected but independently useful experiences:

1. **World Viewer / Runtime** - a full-screen, visually rich, multi-storey cutaway dollhouse office in which real agents occupy roles, move through elevators, and operate recognizable stateful machines. The user can inspect work and evidence without changing any job.
2. **Headquarters Editor / Asset Studio** - an authenticated, visual, direct-manipulation editor for rooms, floor stacking, stairs/elevators, wallpapers/floors, lighting, props, machine bindings and HUD theme. The user can type image-generation prompts to propose hero assets, prop packs and room skins, approve results, and place them immediately.

Nebula HQ is the first world/template. Other projects can create worlds without importing Nebula-only agents, research data, names or credentials.

## Product design target

See the **real reference files** bundled with this handoff:

- `references/TARGET_generated_Nebula_dollhouse.png` - primary visual north star.
- `references/CURRENT_Astra_topdown_2026-11-02.png` - verified current appearance.

The reference is an *aspirational composition* with imaginative, nonphysical room geometry and invented numbers. **Do not copy the reference as a backdrop or infer telemetry values from it.** Recreate its visual qualities: connected cutaway room hierarchy, rich textured walls, layered furniture, glow and shadow, varied material palettes, large telescope/dome/sky, busy but organized occupancy, miniature character behaviors, polished integrated HUD. The runtime must still be a manipulable, walkable and data-driven scene.

### Non-negotiable visual principles

- **Dollhouse first**, not a collection of 2D top-down squares. The entire 3-level structure is visible at a glance, with walls cut away, room backdrops and vertical elevator/stair connections.
- **Hero objects have hero budgets.** The telescope is a multi-layer focal scene, not a 96px diagram on a square floor. Rocket lab and GPU lab each have a major centerpiece.
- **Dense but readable.** Books, instruments, paper, catwalks, pipes, window frames, consoles, rugs and plants give every room a visual story. Critical machines remain unmistakable in both overview and focused views.
- **Layered environment.** Back wall, floor, furniture, actor, foreground rail, emissive effects, light/shadow and UI are separate logical layers.
- **Runtime state is obvious.** VM116 rendering, AKIMB0-PC rendering, AKIMB0-PC training, waiting-on-run and cooldown must each be clear and visually distinct without opening an inspector.
- **Full screen is the office.** Compact game navigation overlays; menus retract; can zoom/pan/focus without hiding the world behind large cards.
- **Original/approved art and no fixed external layout.** Real image-generated assets are cut into reusable packs; editor controls their placement.

## Required Nebula spaces in the new multi-floor template

### Level 3 - Executive / Astronomy
- Main Lead executive office with the principal oversized desk and visible seated Lead.
- Second Lead's own smaller director office (distinct desk and room).
- Clerk/secretary reception **directly outside the executive suite**. In the old single-floor plan Clerk was in a separate row; correct that adjacency during migration.
- Large observatory with multi-part telescope, galaxy window, staged installation, spectral consoles, balcony rail and sky/rotating stars.

### Level 2 - Discovery / Production
- Engineers' mechanical rocket lab with actual gantry, tool sets and moving machinery.
- Data mathematics laboratory with densely written original equations/diagrams, data cubes, plots and archive.
- Training laboratory with GPU rigs, large screens, checkpoint pods, activity lighting.
- Render bay with **separate identifiable VM116 and AKIMB0-PC stations**, visible outputs and verified render count.
- Audio Judge/experiment testing annex if space allows; can span adjacent scene bays.

### Level 1 - Operations / Wellness
- Reviewers' orderly pale retro-corporate office: distinctly sterile and repetitive, but original art (not a copied television set).
- Doctor's consulting room with diagnostics and soft lighting; Doctor refers to research/project health, not human medical records.
- Model archive/gallery: pods for **registered** real model/run identities; checkpoint states and evaluation status; paging for large history.
- Ticket/archive operations: real paper stacks, colored but source-accurate review queues, file drawers and dispatch board.
- Lounge / break room with books, coffee, arcade/games, sofas and idling characters; reachable by elevator from every level.

This is a suggested **template-level room distribution**, not a constraint that all future projects follow the Nebula plan. Editor must permit different floor counts and room placements. Ensure Clerk physically outside both Lead doors in the new version.

## User stories (behavior, not implementation)

1. As a project owner, I can view the entire three-storey HQ in one frame so that the system feels like a real inhabited place.
2. As a viewer, I can zoom into a room, pan along floors and reset to the whole building so that I understand activity at both scales.
3. As a viewer, I can watch an agent cross to another floor by entering, riding and exiting an elevator so that all space is actually connected.
4. As an owner, I can instantly see whether VM116 is rendering, AKIMB0-PC is rendering or AKIMB0-PC is training without reading tiny labels.
5. As an owner, I can see pending/queued work as a waiting machine with a reason and timestamp instead of it pretending to render.
6. As an owner, when a verified usage cooldown occurs, eligible workers visibly travel to the lounge and read, play, drink coffee or relax, while running background jobs continue.
7. As an owner, I can inspect every machine, model and milestone for source evidence so that visual flair doesn't replace truth.
8. As a world editor, I can select, drag, rotate or flip, resize where safe, duplicate and remove a prop with immediate collision feedback.
9. As an editor, I can add and resize a room, choose its floor, cut open or close an exterior wall and designate a doorway.
10. As an editor, I can move walls, paint floors, apply a wallpaper or room backdrop, and preview a scene under lighting.
11. As an editor, I can add an elevator and set explicit floor stops and room navigation routes.
12. As an editor, I can use Undo/Redo and save a named draft without altering the published viewer.
13. As an editor, I can open a palette/library of original and generated reusable assets, search by room/use, preview and place one.
14. As an editor, I can type a prompt for a telescope, choose a visual style reference, generate multiple candidate props and compare them.
15. As an editor, I can generate a wall/floor texture or a complete layered room kit and see a tiled seam check before placing it.
16. As an editor, I can erase or inpaint a part of a generated item and approve a new revision while the previous version remains available.
17. As an editor, I can set an item's pivot, walk collision, anchor, size, occlusion and animation states using visual controls rather than source edits.
18. As an editor, I can assign a prop to an approved telemetry key (e.g., `vm116.render`) and preview its waiting/running/failure appearances with synthetic fixtures.
19. As an editor, I can preview the whole scene in DEMO and LIVE modes, where LIVE never includes invented jobs or stages.
20. As a project owner, I can publish an approved scene version and roll back to a prior one without affecting agent schedules or data.
21. As a creator of a different project, I can import a reusable office template and asset pack, rename rooms/roles, and connect my own sanitized data adapter.
22. As an editor, I can compare the actual rendered world with the provided art direction reference at equivalent framing so that improvements are visually measurable.
23. As a viewer on a laptop/phone, I can read statuses, navigate and zoom, without watching the entire HQ become an illegible thumbnail.
24. As a user with reduced motion enabled, I can disable pulsing/flashing while still knowing machine states through icons, text and stable color.
25. As a project owner, I can see exactly where generated images came from and whether I have rights to use/publish them.

## Editor user experience

**Mode switching**: Runtime Viewer (read-only) vs authenticated Editor (can only edit scenes/assets and optionally publish through review). Do not put destructive editing controls in runtime menus.

**Editor layout**: fullscreen scene remains central; small left asset palette, optional right inspector for selected object, top tools for Room / Wall / Floor / Prop / Light / Elevator / Binding / Generate / Preview / Publish. Panels collapse. Select object shows handles, snapping, collision footprint, layer and binding badge. Keyboard nudge, rotate/mirror, duplicate, delete, Undo/Redo; keyboard accessible equivalents to pointer drag.

**Generation interaction**: click Generate > choose Prop, Hero, Room Kit, Floor Tile, Wall Texture, UI Frame or State Variant > prompt > choose reference/style, optional transparent background > submit > show progress/cost/variant results > refine/crop/mask > preview on real wall/room with light and agent scale > accept or reject > place. Never silently publish generated content.

**World editing interaction**: select floor, then room; paint surfaces and move equipment. A floor-stack panel shows level order and elevator route. An optional 'hide front walls' mode aids editing. A one-click 'return to cinematic cutaway' restores viewing composition.

## Definition of visually excellent

The target comparison is judged by the owner using paired real browser screenshots. The evaluated traits are: (1) depth/cutaway, (2) three-storey visual composition, (3) distinctive hero telescope, (4) decorative density and architectural material richness, (5) lighting and highlights, (6) readable characters and machines, (7) coherent premium HUD, (8) animation and environmental life. Each gets a 1-5 score with evidence. Require no category <4 before treating the full art direction as accepted. This is **a proposed acceptance scorecard, not a mathematically exact image similarity**.

## Out of scope for V2

- Editing or launching Paperclip runs, training, DAW rendering, CI, PR approvals or scheduler routines.
- Building a generic game with combat/economy, or avatar conversations as the primary task.
- Rewriting Nebula's scientific model, data generation pipeline or artifact registries.
- Making arbitrary custom scripts generated from prompts run inside the viewer/editor.
- Automatically granting Machine Portal/Tailscale/Board rights or publishing scenes externally.
- Full 3D arbitrary camera orbit / physics / CAD-grade modeling in the initial release.
- Perfectly reproducing the generative reference's invented text/people/metrics. The composition and visual atmosphere matter; source truth remains binding.