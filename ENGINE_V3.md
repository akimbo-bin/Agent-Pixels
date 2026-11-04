# Agent Pixels V3 engine — decision record (2026-11-03)

**Status:** first vertical slice, unmerged, branch `feat/engine-v3-world-20261103`.

## Superseding direction (owner)

- Agent Pixels is a **generic 2.5D office builder for any Paperclip organization**, not a Nebula dashboard.
- **Music Studio is aesthetic only.** Nebula listening-test wiring is deferred and is *not* on any engine path
  (preserved on `nebula-observatory` branch `wip/listening-catalog-deferred-20261103`).
- The pre-V3 Music Studio rename of `R04/gallery` is preserved on `wip/music-studio-preset-20261103`; the V3
  sample campus re-expresses it as the room id `gallery` named "Music Studio".
- No ChatGPT ImageGen / Astra. Local ComfyUI only, one room kit at a time, owner approval before batches.

## Decision: one authoritative world document

`OfficeWorld` (`src/office/world/schema.ts`) — floors, rooms, doors, elevators, furniture, decor, agents,
background — is the single source of truth. `compileWorld()` derives everything else:

| Derived artefact | Consumer |
| --- | --- |
| `OfficeLayout` tile grid (one band per storey, VOID row between storeys) | unchanged `OfficeState`, `findPath` (8-way, no corner cuts), seats, sprites, animation |
| cells, wall columns, door spans, elevator lobbies | `WorldRenderer`, `TravelSystem`, editor hit tests |
| `createProjection()` (pure, invertible) | every draw call and every click |

Rooms are rectangles on a storey with a shallow depth; neighbours share exactly one wall column, and a door is
a span of rows cut through that column (collision and rendering both read the same span). Storeys change only by
riding an elevator cabin (`TravelSystem`: approach → wait → board → ride → exit → walk, FIFO, capacity-limited).

## Why compile to the old tile grid

It keeps the battle-tested Agent Pixels walking, seating and sprite code untouched while removing every competing
hand-placed coordinate table (`ROOM_SLOTS`, `ACCESS_POINTS`, `HQ_FLOORS`, fixed 64×48) from the new path. No
legacy file was modified; `PixelOfficeCanvas` still bundles. (The full plugin `build.mjs` needs the Paperclip SDK,
which is not installed on AKIMB0-PC — same at the baseline commit.) The V3 path is opt-in.

## Layers

0–4 cached: sky/skyline, shell, back walls, floors, wall decor · 5 per frame, sorted by physical foot depth:
furniture, agents, partition-wall slices (doorway lintels), cabins clipped to wells · 6 cached: cut slab lips ·
7 debug walk mesh · 8 labels (viewport).

Current surfaces are the **procedural fallback style pack** (`rendering/stylePack.ts`), not generated art.

## Run it

```bash
node scripts/test-engine.mjs          # topology, projection, door, elevator, generator tests
node scripts/engine-dev.mjs           # Office Builder on http://127.0.0.1:8790/
node scripts/engine-browser.mjs       # real-Chrome acceptance; evidence in dev/engine/review/
```

## Not done yet (next slices)

- Typed asset registry + style-pack images; first ComfyUI room kit (P5) — requires owner visual approval.
- Editor: add/resize rooms and doors in the UI (today: move furniture, open/close doors, undo/redo, JSON import/export).
- Stairs connector, multi-leg elevator routing (today a trip needing two elevators must be issued as two legs).
- Paperclip adapter (org agents → `AgentDef`), role skins.
