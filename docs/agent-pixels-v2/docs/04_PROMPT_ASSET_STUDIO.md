# 04. Prompt-to-Asset Studio: generation, textures, props, room kits and approval

## Problem statement

The current `draw-nebula-art.py` creates repeatable, inexpensive but visually simplified original pixel assets. It cannot readily reproduce the generated reference's detailed telescope optics, architectural atmosphere, elaborate machines, soft lighting, book-filled rooms and ornamental UI. Artists and owners also cannot place or edit assets without source-code work.

## Decision

Add a reusable **Prompt-to-Asset Studio** in authenticated Agent Pixels Editor. It uses an image-generation provider through a server-side adapter to produce **candidate art**, then a structured preparation/review pipeline converts accepted images into valid, versioned world assets. Do not conflate *image was generated* with *a production-ready game sprite was created*.

A generator is **optional** for opening/editing worlds and importing manually created art. A user without API credentials must still be able to import PNGs and use the editor. The old Pillow art pipeline remains a reproducible low-cost fallback and tester.

## Supported asset categories

1. **Hero prop**: telescope, rocket, giant GPU console, model core, observatory portal. Transparent image with anchor, collision, optional separate back/middle/front and emissive layers.
2. **Ordinary prop**: chair, shelf, cabinet, lamp, plant, vending machine, coffee maker, lab tools, paperwork, sofa, bookshelf, medical equipment. Transparency with prop footprint and pivots.
3. **Room kit**: coordinated set of a back wall, side pillars, floor plane, foreground rail/trim, lighting masks and multiple decor props in one consistent theme. Imported as a palette/prefab, not one merged flat image.
4. **Floor tile / material**: seamless texture, surface/trim/border/corner variants and source color palette. Editor must preview tile seams across a 10x10 patch at zoom levels.
5. **Wall texture / architectural panel**: seamless horizontal/vertical wall segments, windows, molding, arches and cutaway profiles. Check alignment at room corners and doors.
6. **Background plate**: galaxy sky, executive book walls, workshop back wall, exterior view, medical room atmosphere. Distinct from interactive props; designed for parallax and occlusion.
7. **Machine state kit**: base prop + separate deterministic FX masks/frames for idle, waiting, queued, running, stalled, failed, done and cooldown. Generate a coherent source/variant family; don't ask a model to draw independent frames with no alignment references.
8. **Animation / decorative FX**: sparks, spinning fan, star glow, papers, screens, elevator doors, shadows, 9-slice HUD frame, icon packs. Appropriate pipelines may mix generated base images with manually controlled frame transforms.
9. **Character outfit / action variation** (later): seated, walking, reading, gaming, coffee, inspecting machine. Preserve stable character identity/size/direction and avoid automatic retraining/face generation for personal people.

## UX: from prompt to real room

1. Select target room and **asset type**. Enter an art prompt (e.g., "grand brass observatory telescope on a raised platform, layered glass nebula dome, dramatic violet/cyan light; 2.5D cutaway view; detailed premium pixel-diorama game art").
2. Optionally attach the approved **world style sheet**, exact target reference image crop and existing room/prop art. Offer a switch for transparent prop vs opaque room plate; this is crucial to composition.
3. Select draft count (typically 2-4) and quality tier; display expected API expense category before submission. Ask for explicit Generate action. A provider may not accept custom resolution/aspect; adapter negotiates capabilities.
4. Editor backend submits a bounded job and stores job ID, provider/model/version, prompt, referenced asset IDs/hashes, generation options, timestamp, scope and estimated/actual cost. Show queue/running/success/failure. Cancellation stops future processing when possible; don't promise provider refunds.
5. Show candidate grid, before/after comparison, source dimensions and alpha preview. Never overwrite a published asset.
6. Provide **Edit / Inpaint / Generate Variation**, plus manual crop/mask, background removal, alignment, controlled downsampling, palette guide and trim canvas.
7. Validate/export: alpha/opaque category, pixel dimensions, file size, frame alignment if stateful, image decode, seams, duplicate detection and asset library restrictions. Present checkerboard transparency, pivot, walk footprint and wall/floor preview.
8. Owner accepts a candidate and gives asset name/tags/license metadata. Only then mark the asset **approved** and allow scene placement. Declined candidates remain in private draft history until retention policy.
9. Drag prop into room. Position/pivot/scale/occlusion/footprint/snap are editable; live collision checks immediately show blocked doors or seats.
10. Save scene draft revision. Publish a new runtime scene only after tests and role approval. Runtime server never calls image providers.

## Technical pipeline

**Generate -> private raw image -> segmentation/layering -> cleanup -> QA -> versioned asset manifest -> scene placement -> publish.**

Each `AssetDefinition` should include:

- stable `assetId` and immutable revision/content SHA;
- type (hero_prop, prop, room_plate, tile_material, wall_material, FX, HUD, animation);
- labels/tags, project scope vs shared library, style-sheet ID;
- author/origin (manual or generated), generation model/provider and prompt/reference provenance, acceptance status, source date;
- blob references to original and normalized PNG/WebP + small preview, controlled maximum dimensions/size;
- content size, trim rect, alpha/opacity, pixel density, palette data, optional seamless flags;
- pivot/anchor, scene base scale, logical footprint and collision polygon or tile mask, approach points;
- render layer/back-to-front classification, lighting mask/emissive refs, occlusion/foreground flags;
- groups of animation states with frame durations and validated dimensions;
- licenses/usage notes, export restrictions, linked scene publications, superseded revision and rollback record.

**No arbitrary prompt -> executable code**, no image postprocessors loaded as user-supplied scripts. All raster conversion and segmentation operations run in a sandboxed processing worker with CPU/memory/time constraints and an allowlisted file format.

### The key quality problem: consistency

A generative model may produce beautiful examples but not pixel-perfect tile sets. Address that as follows:

- A **style sheet** (palette, line weight, stroke/shadow direction, camera angle, prop scale, materials) is passed into every generation request with 1-3 accepted examples; do not use the entire scene unboundedly in every call.
- Always require **camera/view alignment**: 2.5D cutaway, slightly angled floor plane, side-on readable props, left/right lighting convention. Accept/reject mismatched perspective instead of placing it anyway.
- Generate **hero objects at sufficient source resolution** for detail, then scale in renderer. 16px tile logic should not force art to be microscopic.
- Prefer **one base image + state overlay layers**: produce running LEDs, fan/spool motion, progress screens and highlights as deterministic animation over stable geometry. For image-edited variants, align silhouettes and pivots; allow slight errors to be corrected manually.
- For **room kits**, ask for coordinated layered parts with overlapping margins; if model only outputs one composite, use it as a *backplate* and reconstruct interactive layers manually, not as the entire room.
- For **textures**, detect seam errors from opposing borders, hue discontinuities and repeated obvious features. Provide mirrored/offset seams and manual tile-fix tools; a seamless prompt is not proof of seamless output.
- Always review alpha edges, color palette banding, compression artifacts, mislabeled rendered text, skewed signs, impossible geometry and unexpected background remnants.
- Render a **contact sheet of accepted assets** beside an actual agent at real scale. This catches the common failure mode where pretty isolated props look incoherent next to 16px characters.

### Source-backed API design (vendor-independent)

Create server-side `ImageGenerationProvider` abstraction with `generate`, `edit`, `cancelIfSupported`, `capabilities`, `estimateCost` and `usageReceipt`. The first provider can be OpenAI Images API; a local ComfyUI-type provider can be added later if authorized. Do not make the browser rely on a single model ID.

Official OpenAI Image API documentation checked on 2026-11-02 supports prompt image generation, image editing/masking and transparent output in PNG/WebP on compatible GPT Image models. Currently documented models include `gpt-image-2.5-sunburst` and `gpt-image-2.5-flare`. Masking is **guidance, not pixel-exact geometry**, so source artist/manual QA remains mandatory. See:
- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/reference/go/resources/images/methods/generate

Model availability, pricing and generation output size/quality are provider-specific and may change. Make these configuration/capability reads, not immutable hardcoded beliefs. **ChatGPT subscription access is not a replacement for an API billing/credential arrangement.** The user/admin must explicitly connect an approved image provider before enabling Generate.

## Security, privacy and consent

- The existing runtime viewer remains read-only. The **Editor/Generation Service is a separate authenticated authoring capability** with per-project write grants, upload quotas, rate limits, CSRF/session protection, audit receipts and an optional owner approval step to publish.
- Provider API keys live only in the server's secret store. Never return them in asset URLs, logs, browser bundles, generated filenames or Git commits.
- Do not send proprietary source code, raw model checkpoints, API credentials, research documents, actual telemetry contents or sensitive data to an image provider. Only include explicitly selected visual reference images and public/approved style descriptions.
- Generated images may themselves contain inadvertent misleading labels or random text; remove/edit them and bind real text/numbers as programmatic UI overlays. In particular, never bake a model count or render count into the artwork.
- Use safe image decode: type allowlist, checksum, size and pixel-count caps, no SVG with embedded scripts, no arbitrary URLs or network-fetchable imports.
- Keep raw assets in a private versioned store, published approved assets in a read-only runtime bundle/storage namespace. Do not automatically publish generated art into the public fork.
- Record provenance and license/rights. Upstream Agent Pixels currently has no explicit LICENSE file verified; external/public resale/reuse requires rights review. The target image itself should be treated as **reference**, not a redistributable scene background without confirming usage rights.

## Versioned asset lifecycle

`DRAFT -> GENERATING -> CANDIDATE -> EDITING -> VALIDATED -> APPROVED -> PUBLISHED -> RETIRED`

Failed/rejected variants remain private, do not appear in shared search by default. Published assets are immutable content-addressed revisions. Replacing a telescope in an existing world creates a new scene revision; changing a library asset never silently retroactively changes old published worlds. Support rollback and compatibility with older local scene versions.

## Asset Studio acceptance

1. Prompt generates at least two visual prop candidates through an **actual authorized API**, without exposing any key; a disabled-provider state remains usable for manual asset upload.
2. Transparent hero telescope prop loads with clean alpha, pivot and foreground layers, passes validation and is draggable in preview.
3. Owner can revise masked region and compare old/new candidate, with immutable revision history.
4. Floor texture is previewed tiled 10x10; a deliberate seam defect gets flagged, and a corrected texture passes.
5. A generated room kit results in at least a background plate plus two independently interactive transparent props, not a single screenshot.
6. Idle/running/failed for one machine uses **same stable silhouette/anchor** and deterministically triggered overlays, with no false live work animation.
7. Editor Undo/Redo and save/reload preserve approved asset ID/revision/position/texture and don't corrupt world navigation.
8. Network/billing/provider failures leave draft scene intact, visibly explain error and don't publish incomplete assets.
9. Server rejects cross-project asset reads, forged publish attempts, oversized images and malicious path names.
10. A production runtime can open published scenes without contacting an image provider or possessing generation credentials.