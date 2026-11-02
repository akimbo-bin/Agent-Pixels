# Original Nebula campus art

Authored for this headquarters in November 2026. These PNGs are drawn by the checked-in `scripts/draw-nebula-art.py` and `scripts/nebula_art_details.py` sources, using a restricted pixel palette and the Agent Pixels 16px grid. They do not contain an image-generation result or sampled film/game artwork.

Run `python scripts/draw-nebula-art.py` with Pillow to reproduce all PNGs, the contact sheet, nine floor patterns and the manifest. Runtime builds use PNG/JSON only. The atlas is a contact sheet of these actual files. Inspect native pixels or scale with nearest-neighbor.

Catalog metadata records footprint, background rows, anchor, layer, approach direction, state and frame. Machines have unknown, idle, queued, running (four frames), waiting, cooldown, stalled, failed and done variants. The telescope has seven equal-footprint stages. Eight collectible pod variants have an explicit empty variant. Paper stacks use nine equal-footprint variants. Room layouts supply exact approaches and collision tests.

Existing upstream characters, walls and engine remain attributed to Agent Pixels. This original art does not change or claim broader rights to upstream assets.

The expanded pack contains 145 original PNG sprites. Ground rugs/light pools use explicit ground z-order; architecture and furniture keep the existing engine depth sorting. The 256×144 telescope has seven equal collision footprints. Named bays are VM116 render, AKIMB0-PC render and AKIMB0-PC training. Status projections never infer work from decorative screens.
