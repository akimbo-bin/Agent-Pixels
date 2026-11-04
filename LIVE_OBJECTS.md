# Live objects: connecting background work to Agent Pixels

Agent Pixels can show any background work as an animated object in the building: a training run, a render farm, a CI queue, a crawler. A **live task** is the bridge. Your project reports a task in one normalized shape, and any piece of furniture with a screen can be bound to it.

Live data is **real or nothing**. A source that can't be read shows `NO SOURCE` with its reason. A reading older than 30 s shows `STALE`. Values are never guessed.

## 1. Report a task

Add an entry to `dev/engine/live.config.json`. There are three kinds; most projects need no code.

**A JSON status file your job already writes** (`json-file`). Map fields by dotted path, and translate your own state words:

```json
{ "id": "crawler.main", "title": "Web crawler", "kind": "json-file", "path": "C:/jobs/crawler/status.json",
  "map": { "state": "run.phase", "detail": "run.current_url", "done": "run.pages_done", "total": "run.pages_total",
           "metrics": [{ "label": "RAM", "path": "host.ram_pct", "max": 100, "unit": "%" }] },
  "states": { "crawling": "running", "sleeping": "idle", "crashed": "failed" } }
```

**A status endpoint on your machine or LAN** (`http-json`). It takes the same `map` and `states`. Internet hosts are refused.

**Anything else** (`module`). This is a script exporting `async read(options)` that returns the task fields. See `scripts/live/adapters/nebula-training.mjs` and `host-gpu.mjs`.

**Not wired yet** (`unconfigured`). Reserve the id with a `why`, and objects bound to it say so honestly.

The normalized task (`scripts/live/registry.mjs`):

| field | meaning |
|---|---|
| `state` | `running`, `paused`, `waiting`, `done`, `failed`, `idle` or `unknown`; any other value becomes `unknown` |
| `detail` | short text: current job, step, file |
| `progress` | `{ done, total }`, or null |
| `metrics` | `[{ label, value, max, unit }]`, drawn as bars |
| `updatedAt` / `why` | freshness, and the reason when unknown |

The dev server serves every task at `GET /live` (loopback, cached 5 s). The engine polls it every 5 s.

## 2. Show it in the building

Bind a piece of furniture to the task id. The furniture's definition needs a `screen` region (see `training-rig` and `render-rack` in `src/office/assets/definitions.ts`).

- **Per building**: add it to the building kit's `live` list (`src/office/world/kits.ts`). It is placed automatically in a valid spot:
  ```ts
  { id: 'live-crawler', roomId: 'data', assetId: 'render-rack', source: 'crawler.main', metricsFrom: 'host.gpu' }
  ```
- **Per world**: set `world.bindings['<furnitureId>'] = { live: 'crawler.main' }`.

What the object does by state:
- an LED that blinks while running, slowly while waiting or paused, and stays solid when done or failed
- a scan line sweeping the screen while running
- the status word and detail, plus a progress bar with `done/total`
- the first metric as a bar (or one borrowed from another task with `metricsFrom`)
- a status badge on the room's name plate

The engine API exposes `__engine.live()` (all tasks) and `__engine.live('<id>')` (one task's display status) for tests.
