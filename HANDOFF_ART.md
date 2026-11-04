# Handoff: Agent Pixels art pipeline and aesthetics

For the next agent (Codex). Read all of this before changing anything. The owner makes every taste decision. You build the tools, run the renders and fix the engine. You do not judge which art is good.

## Where things stand

- Worktree: `Z:\Projects\Nebula\AgentPixelsEngine`, branch `feat/engine-v3-world-20261103`. Everything is committed locally. Never push or merge without the owner's say-so.
- **Engine:** a 2.5D pixel "dollhouse" for Paperclip organisations.
  - Dev harness: `dev/engine/main.ts`, served by `node scripts/engine-dev.mjs` at http://127.0.0.1:8790/.
  - The campus with art: `/?building=nebula-campus&kit=1`.
- **Live data works; don't break it.** Real agents, jobs and machines come in through `/live`. See `LIVE_OBJECTS.md`.
- **The art does not work.** The owner says it is artifact-ridden, inconsistent and "looks terrible". The whole-building mass render (`nebula-campus-v1`) produced odd results. Windows look especially bad.

## What the owner asked for (their words, condensed)

1. **Wall texture plus separate objects.**
   - A room's art is a wall texture, a floor texture, and separate, cohesive objects.
   - Nothing is baked into the wall. Bookshelves, windows, paintings and curtains are all separate assets.
   - The Lead office shell currently bakes all of these in. That is wrong.
2. **Three asset classes:**
   - **Objects** have a footprint, which matters for where they can go. Examples: desks, chairs, standing shelves, plants, rigs.
   - **Wall decor and floor decor** have no footprint. Examples: paintings, curtains, wall shelves, rugs. Place them freely.
   - **Windows** are a cut-out. Transparent pixels show the background sky behind the building. A window has no painted glass and no painted view.
3. **Lights** stay engine light sources: lamps, sconces, monitors and windows. Art should not bake in big glows.
4. **Re-evaluate every current asset.** Nothing in today's packs is accepted by default.
5. **A browser studio** where the owner can, for every asset:
   - see all candidates
   - pick one
   - regenerate it, with its prompt, seed and settings editable
   - create new assets
6. **Persistent autosave** of world edits to the server. Today there is only Export/Import JSON.
7. **Work one room at a time.** No more whole-building mass renders.
8. **Most important first:** a solid image model and settings. Pick them by showing the owner side-by-side options, not by scoring them yourself.

## Known engine bug to fix first

The Lead office wall extends into the first row of floor tiles, so agents walk "on the wall".
- **Cause:** the room plate (`exec-room-shell`, an AI-painted full room) has its wall base lower than the engine's floor row 0.
- **Where:** `plateRect` and `plate()` in `src/office/rendering/worldRenderer.ts`, and the room guide in `scripts/kit/room-guide.mjs`.
- **Fix:** this goes away once shells become wall and floor textures drawn by the engine's own geometry, which is item 1. Do that rather than patching the plate.

## The pipeline today (reuse it, don't rebuild from zero)

- **ComfyUI** (portable, NVIDIA): `C:\AI\AgentPixelsComfy\ComfyUI_windows_portable`. Bind it to loopback only, on port 8188. Start it only for a GPU session.
- **Models:** in `F:\AgentPixelsModels`, linked through `extra_model_paths.yaml`. Provenance is in `C:\AI\AgentPixelsComfy\models-provenance.json`. Present:
  - FLUX.2-klein 4B fp8, with the `qwen_3_4b_fp8_mixed` text encoder and `flux2-vae`. This is the current default, using reference-edit mode (guide plus style reference), about 20 s per image on the RTX 3070.
  - FLUX.1-schnell fp8
  - Z-Image-Turbo, with a union ControlNet
- **CT106** (Proxmox, 192.168.8.108) runs CPU-only ComfyUI. It holds SDXL plus the pixel-art-xl LoRA and LCM, merged as `sdxl-pixelart075-lcm.safetensors`. Reach it with the SSH tunnel `agentpixels-comfy` on port 8189.
  - **The owner liked this output** as "real pixel art" (bake-off option "A"). It is slow on CPU. It is worth running on the local GPU with the same weights.
- **Scripts** in `scripts/kit/`:
  - `klein-room.mjs`: one room (`guides | render | sheet | pack`)
  - `klein-building.mjs`: whole building; do not use it for the next pass
  - `bakeoff.mjs`: compare models and modes on the same guide
  - `klein-pack.py`: pixel snap, palette budget, smoothing, magenta cut-out, shared palette
  - `autopick.py`: scores candidates. **Its picks overrode the owner.** Use it only to sort the gallery, never to choose.
  - `sprite-guides.mjs`, `room-guide.mjs`: guide images taken from the engine's own geometry
- **Candidates are never deleted.** They live in `dev/engine/packs-work/<pack>/` as `<asset>.c0..cN.png`, each with a `.receipt.json` holding prompt, seed and settings. That folder is git-ignored.
  - The owner saw good objects that autopick rejected; they are still there.
  - The studio should show these first.
- **Packs** the engine loads: `dev/engine/packs/<id>/pack.json` plus PNGs, git-ignored. The format and validation are in `src/office/assets/manifest.ts`.

## Hard rules

- **GPU:** only with Nebula paused.
  - Pause: create `C:\NebulaResearch\train\PAUSE`.
  - Wait until no other process holds more than 1 GB of GPU memory.
  - Always delete the PAUSE file afterwards, in a `finally`. `klein-building.mjs` has a working GPU-session wrapper; reuse it.
  - Never touch Nebula's Python or CUDA environment.
- **C: free space** must stay at or above 150 GB, Nebula's launch threshold. Models and big outputs go on F:.
- **No ChatGPT ImageGen, no Astra.** No fake or invented data in the live layer.
- **Licences and provenance:**
  - Record a licence and provenance entry for every model and asset.
  - Gated models (FLUX.1-dev, for example) need the owner to accept the licence themselves. Don't route around the gate.
  - Anything that costs money (paid APIs such as PixelLab or Retro Diffusion) is the owner's call. Ask before using it.
- **Ask before** any bulk job of more than about 30 renders, or anything that writes outside this repo, F:, or `C:\AI\AgentPixelsComfy`.
- **Don't idle-poll renders.** Use a background job and check once at the end.

## Suggested order

1. **Asset taxonomy in the engine.**
   - Shells become tileable wall and floor textures per room style, drawn by the engine. The plates go away, which also fixes the wall-into-floor bug.
   - Window: an alpha cut-out wall fixture with the sky showing through.
   - Wall decor and floor decor: no collision, free placement. Most of the support exists: `FurnitureDef.offset`, decor dragging in `editorState.ts`.
   - Objects keep footprints.
2. **Studio page.**
   - A new page on the dev server, for example `/studio`. Add loopback-only write endpoints in `scripts/engine-dev.mjs`.
   - It lists every asset of the selected room with all its candidates, and lets the owner pick one, which writes it into the pack.
   - It can queue a regenerate (prompt, seed, steps, denoise, model, palette size) or a new asset (class, footprint, prompt).
   - It shows queue status. Renders go through ComfyUI's HTTP API, with the GPU-session rules above.
3. **Autosave.** `PUT /world/<building>` stores the edited world JSON under `dev/engine/worlds/`. Load it on start and offer a "reset to template" button.
4. **Model and settings bake-off, judged by the owner.**
   - Use one room (the Lead office), with one wall texture, one window, one bookshelf and one desk.
   - Run 3–4 setups, for example:
     - SDXL + pixel-art-xl + LCM on GPU
     - klein 4B reference-edit
     - klein with stronger pixel post-processing
     - optionally a paid pixel-art tool, if the owner approves
   - Show them side by side in the studio. The owner picks the setup.
5. **Then go room by room** with the chosen setup, the owner picking in the studio.

## Verify after every change

- **Unit tests:** `node scripts/test-engine.mjs` (75 tests).
- **Browser suites**, with the dev server running: `node scripts/engine-browser.mjs` (17 checks), `node scripts/editor-browser.mjs` (8) and `node scripts/live-browser.mjs` (7, needs SSH to the Proxmox host; skip it if your sandbox can't reach it).
- **Typecheck:** `npx tsc --noEmit -p .`. Errors from `src/manifest.ts`, `src/ui/index.tsx` and `src/worker.ts` (a missing plugin SDK) are pre-existing.
- **Show the owner** screenshots, not your own verdicts.
