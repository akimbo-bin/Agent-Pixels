# 05. World Editor architecture, scene contracts and safe migration

## Ownership boundaries

**Shared Agent Pixels V2 runtime**: scene document parser/validator; floor graph; actor/navigation integration; 2.5D renderer and camera; collision/occlusion; prop atlas and animation; editor's pure operations. No Nebula-specific credentials, jobs, company or model IDs.

**Editor/Asset Studio (separate authenticated service)**: scene editing, media uploads and prompts, versioned drafts, generation jobs, validation, approvals and publish/rollback to the read-only scene CDN/bundle. Writes only **scene and asset metadata**, never jobs or user research data.

**Nebula project package / private viewer**: world template, 12 role placements and office culture, Machine/Model/Render/Usage adapters, truthful states and source evidence. Existing `GET /api/snapshot` continues to work and supply normalized v2 model; no write endpoints added there.

**Project adapter interface**: translate source-backed sanitized telemetry IDs into generic bindings. Other projects can supply different workers, issue states and activity keys. General renderer receives no source URLs or credentials by default.

## New scene document (conceptual contract)

A versioned, portable, code-free JSON-like model. Suggested high-level shape:

~~~json
{
  "schema": "agent-pixels.world.v2",
  "id": "nebula-hq",
  "revision": 17,
  "renderMode": "dollhouse-2_5d",
  "projectNamespace": "nebula",
  "styleId": "nebula-night-observatory-v1",
  "floors": [
    {"id":"L1", "order":1, "walkMapRef":"walkmap-l1", "rooms":["review","clinic","lounge"], "elevation":0},
    {"id":"L2", "order":2, "walkMapRef":"walkmap-l2", "rooms":["rocket","data","training"], "elevation":1},
    {"id":"L3", "order":3, "walkMapRef":"walkmap-l3", "rooms":["lead","lead-sol","clerk","observatory"], "elevation":2}
  ],
  "connectors": [
    {"id":"elevator-a", "type":"elevator", "stops":["L1","L2","L3"], "capacity":3}
  ],
  "entities": [
    {"id":"telescope-main", "asset":"telescope.hero@rev4", "floorId":"L3", "roomId":"observatory", "tile":{"x":8,"y":4}, "depth":2, "binding":null},
    {"id":"gpu-bank", "asset":"trainer.rack@rev2", "floorId":"L2", "roomId":"training", "tile":{"x":12,"y":6}, "binding":"machine.akimb0.training"}
  ],
  "templateVersion": 1
}
~~~

Values above are **illustrative schema examples**, not current Nebula data or approved geometry. Define formal schema and migrations before production data.

Each floor has bounded logical 2D tiles (existing pathfinder can run per-floor); room boundaries/door portals; cutaway visual plate references; lighting/foreground layers; seat/workstation approach points; local-to-scene projection. Connectors own elevator/stair stop nodes. Entities reference immutable asset IDs, have deterministic stable UUIDs, transform/pivot/scale, layer, collision, access and optional whitelisted telemetry binding. **Do not serialize active agent/chat/machine secrets or raw job data into a scene.** Runtime receives state from existing source DTO separately.

## Editor operations and undo/redo

Commands are authored against a scene revision, not arbitrary mutable runtime objects:

- `AddRoom`, `ResizeRoom`, `DeleteRoom`, `SetFloorOrder`, `PaintMaterial`, `SetRoomPlate`, `PlaceProp`, `MoveProp`, `RotateProp`, `ResizeProp`, `ReorderLayer`, `SetLighting`, `AssignRoleSeat`, `BindProp`, `PlaceElevator`, `UpdateConnector`, `DeleteEntity`.
- Every edit has a before/after document patch and a validity result. Undo/Redo replays document changes and re-runs scene validation.
- Deleting/moving a room checks agent seats, relevant binding anchors, elevator portals and open editor references; present a conflict/repair UI rather than silently losing them.
- Moving a prop across floors is explicit; source-neutral asset may move, but a machine binding must be reviewed in new location.
- Prop placement supports snap-to-grid, fine offsets for scenery, arrow-key nudge, layer moves, scaling within asset-defined allowed limits, and copy/paste. Some large background plates are resized via nine-slice/room crop, not arbitrary stretching.
- Surface painting applies named materials, tiling/masks, trim and border rules. Avoid directly overwriting the texture source bytes for every brush stroke.
- Floor cutaway visibility and editor gizmos must not accidentally become published runtime art.
- Maintain an audit log of author, timestamp, scene revision, changed IDs and publish action.

### Validation as first-class UX

Show green/yellow/red authoring overlay for collision and reachability. Before any scene publish:

1. All floor documents and asset manifests validate types/ranges and refer only to approved asset revisions.
2. Every assigned seat and interactive machine has a reachable approach tile from an approved lobby/elevator stop.
3. Every elevator stop connects to its destination room graph; car volume and door thresholds are consistent.
4. All critical passages have adequate clearance; proposed prop collision cannot seal a room, even if visually passable.
5. All published assets decode, have permitted size/color/alpha, stable pivot, occlusion and source provenance.
6. Telemetry bindings are drawn from an allowlisted per-project semantic registry; editor never lets author type arbitrary remote API URLs in a prop.
7. All accessibility labels and reduced-motion fallback states are present for essential machine status.
8. Published world is deterministic across browser reload and serialization round trip, and can roll back to a prior revision.

## Runtime/editor interaction and REST boundaries

**Runtime** (unchanged security): authenticated tailnet GET/HEAD-only scene and telemetry endpoints, asset bundle, viewer. No scene mutation, job control or generation routes.

**Editor** (new secured origin/service): authenticated role-gated endpoints for scene draft create/revisions, asset upload/generation jobs, validation, approval, publish and rollback. Require revision precondition (ETag/If-Match or equivalent optimistic version) to prevent overwrite if two sessions edit same world. Reject bulk arbitrary file paths. No direct filesystem commands from browser; server handles safe asset repository.

**Publication**: a validated scene bundle contains exact `WorldDocument`, referenced immutable asset hashes, compiled texture atlases/LOD, source revision and a scene manifest. It is an immutable artifact that runtime can load in one switch; rollback swaps approved bundle pointer. No runtime API key is needed to render published art. For reusable project templates, validate brand/private data isolation before library export.

## Migration and project-generalization plan

1. **Pin Astra baseline** at verified draft heads and preserve exact existing 2D viewer in its current feature branches; no merges or port changes.
2. **Extract stable interfaces**: current actor, seat, activity, job state, asset catalog and scene drawing contracts. Keep original OfficeState alive in `classic` render mode.
3. **Introduce `WorldDocument` v2 and validation** alongside legacy `OfficeLayout`. Legacy adapter maps old 64x48 flat office to floor `L0` without altering it. Round-trip tests check no loss of actor seats or binding IDs.
4. **Build dollhouse vertical slice** with custom renderer and floor graph; reuse actor/telemetry state projector. Only visual layout/new elevator behavior differ.
5. **Add Editor** with manual import, placement, editing, save/load and no image generation dependency. This proves true editability before provider spend.
6. **Add Asset Studio** as feature-flagged authenticated generation; approve/tile/alpha/metadata QA.
7. **Migrate Nebula HQ** to three floors and add distinct floor connectors. Keep twelve role identities and machine binding semantics. The old rows are not the final new map: Clerk must sit outside executive suites on level 3, and lounge must remain physically reachable during cooldown.
8. **Exercise all telemetry fixtures** for VM116 render, AKIMB0-PC render/train, queued, waiting, stalled, failed and cooldown with active background training. Ensure independent job ownership and no false mutation.
9. **Keep classic and dollhouse previewable** behind explicit versioned scene toggle until owner accepts art and all test gates. Deployment is a separate step with a reversible release switch.
10. **Extract a genuinely reusable project template/adapter** (e.g. synthetic non-Nebula office with different roles/data keys) to prove this isn't a Nebula-specific hardcoding exercise.

## Reuse and upstream rights

The private viewer is project-specific. The public Agent Pixels fork can contain generic renderer/editor/library contracts and entirely approved generic art, but don't copy the private Nebula telemetry company integration or private asset metadata there. Upstream Agent Pixels currently has no explicit LICENSE; before publishing a public/distributable Agent Pixels V2 derived product, obtain the needed permission/license clarification. A private V2 prototype does not require pretending that such rights are already confirmed.

## Testing strategy: highest observable seam

Test the **published world artifact as loaded by the actual viewer** (rather than only isolated camera math): the editor save/reload -> runtime loads exact asset revisions -> routes an actor across elevator -> machine receives known fixture state -> inspector reports source and scene version. Keep geometry and provider normalization unit tests as supporting evidence. The primary acceptance artifact is an actual browser recording and screenshot from the compiled application, at fixed viewports, with image references alongside.

### Explicit negative tests

- Unauthenticated viewer cannot call editor write routes or generate images.
- Editor role cannot call job control / Paperclip issue mutation through any scene binding.
- Stale job watcher doesn't keep an active machine animation green.
- A cross-project scene cannot view another project's asset/telemetry namespace.
- Lost provider key/payment quota doesn't destroy current scene or auto-publish candidate.
- Invalid generated alpha/polygon/tile seam cannot be silently approved as a valid material.
- Concurrent editor saves with outdated revision are rejected with a conflict and retain both drafts.
- Deleted/invalid elevator portal can't be published; edit stays local with visible error.
- A scene revision swap leaves the old verified build intact for rollback.