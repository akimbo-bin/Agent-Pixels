// Office Builder dev harness: consumes the generic engine's public pieces
// (world templates, compiler, editor, travel, renderer) with no Paperclip or
// Nebula connection. Everything shown is driven by the compiled world.
import { OfficeState } from '../../src/office/engine/officeState.js';
import { loadPixelAssets } from '../../src/ui/pixelAssets.js';
import { WorldEditor } from '../../src/office/editor/editorState.js';
import { TravelSystem } from '../../src/office/navigation/elevator.js';
import { createProjection, characterWorld, DEFAULT_VIEW, type Projection } from '../../src/office/geometry/projection.js';
import { WorldRenderer } from '../../src/office/rendering/worldRenderer.js';
import { Viewport } from '../../src/office/rendering/viewport.js';
import { STYLE_PACKS, stylePackFor } from '../../src/office/rendering/stylePack.js';
import { TEMPLATES } from '../../src/office/world/templates.js';
import { generateBuilding, rng } from '../../src/office/world/generator.js';
import { isDoor, type OfficeWorld } from '../../src/office/world/schema.js';
import type { CompiledWorld, GridPoint } from '../../src/office/world/compiler.js';
import type { WorldIssue } from '../../src/office/world/validator.js';
import { getCatalogEntry } from '../../src/office/layout/furnitureCatalog.js';
import { getCachedSprite } from '../../src/office/sprites/spriteCache.js';
import { CharacterState } from '../../src/office/types.js';
import { loadAssetPack, type LoadedAssetPack } from '../../src/office/assets/loader.js';
import { registerFurnitureDefinitions } from '../../src/office/assets/definitions.js';
import { applyRoomKit, ROOM_KITS } from '../../src/office/world/kits.js';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('view');
const ctx = canvas.getContext('2d')!;
const ui = {
  template: $<HTMLSelectElement>('template'), fit: $<HTMLButtonElement>('fit'), tour: $<HTMLButtonElement>('tour'),
  ambient: $<HTMLInputElement>('ambient'), kit: $<HTMLInputElement>('kit'), style: $<HTMLSelectElement>('style'), edit: $<HTMLInputElement>('edit'), debug: $<HTMLInputElement>('debug'),
  undo: $<HTMLButtonElement>('undo'), redo: $<HTMLButtonElement>('redo'), exportBtn: $<HTMLButtonElement>('export'),
  importBtn: $<HTMLButtonElement>('import'), status: $('status'), issues: $('issues'), json: $<HTMLTextAreaElement>('json'), hint: $('hint'),
};

interface Leg { target: GridPoint; pause: number; sit?: boolean }
class Scene {
  editor: WorldEditor;
  office!: OfficeState;
  travel!: TravelSystem;
  proj!: Projection;
  renderer!: WorldRenderer;
  view = new Viewport();
  /** world agent id -> numeric OfficeState id */
  ids = new Map<string, number>();
  names = new Map<number, string>();
  selected: number | null = null;
  hover: GridPoint | null = null;
  tours = new Map<number, { legs: Leg[]; wait: number }>();
  ambientRand = rng(42);
  ambientTimer = 3;
  frameTimes: number[] = [];
  log: string[] = [];
  drag: { id: string; grab: GridPoint; candidate: { roomId: string; col: number; row: number } | null; valid: boolean } | null = null;

  constructor(world: OfficeWorld) {
    this.editor = new WorldEditor(world);
    this.build(true);
  }

  get compiled(): CompiledWorld { return this.editor.compiled; }

  /** (Re)derive every runtime structure from the compiled world. */
  build(fresh: boolean) {
    const c = this.compiled;
    // ?rise= overrides the camera tilt (floor rows per tile of depth); default 0.5.
    // Camera tilt: ?rise= override, else the world's own view, else the default.
    const rise = Number(new URLSearchParams(location.search).get('rise') ?? c.world.view?.rise ?? DEFAULT_VIEW.rise);
    registerFurnitureDefinitions(rise);
    this.proj = createProjection(c, { ...DEFAULT_VIEW, rise });
    if (this.renderer) this.renderer.setWorld(c, this.proj);
    else this.renderer = new WorldRenderer(c, this.proj, stylePackFor(c.world.stylePackId));
    this.renderer.setStyle(stylePackFor(c.world.stylePackId));
    this.renderer.setAssets(ui.kit.checked && kitAssets.images.size ? kitAssets : null);
    this.travel = new TravelSystem(c);
    this.tours.clear();
    if (fresh || !this.office) {
      this.office = new OfficeState(c.layout);
      this.ids.clear(); this.names.clear();
      c.world.agents.forEach((a, i) => {
        const id = i + 1;
        this.ids.set(a.id, id); this.names.set(id, `${a.name} (${a.role})`);
        this.office.addAgent(id, a.skin, 0, a.seatId, true);
        const ch = this.office.characters.get(id)!;
        unseatUnlessAssigned(this.office, ch, a.seatId);
        const seat = ch.seatId ? this.office.seats.get(ch.seatId) : undefined;
        const spot = seat ? { col: seat.seatCol, row: seat.seatRow } : roomSpot(c, this.office, a.roomId ?? c.cells.find(x => x.kind === 'room')!.id);
        place(ch, spot);
        ch.isActive = !!seat; ch.state = seat ? CharacterState.TYPE : CharacterState.IDLE;
        if (seat) ch.dir = seat.facingDir;
        ch.wanderTimer = 999;
      });
    } else {
      this.office.rebuildFromLayout(c.layout);
      for (const ch of this.office.characters.values()) {
        ch.wanderTimer = 999;
        if (!this.office.walkableTiles.some(t => t.col === ch.tileCol && t.row === ch.tileRow) && !(ch.seatId && this.office.seats.get(ch.seatId)?.seatCol === ch.tileCol)) {
          place(ch, roomSpot(c, this.office, c.cells.find(x => x.kind === 'room')!.id));
        }
      }
    }
  }

  fit() {
    this.view.fit(this.proj.width, this.proj.height, canvas.width, canvas.height);
  }

  say(msg: string) { this.log.unshift(msg); this.log.length = Math.min(this.log.length, 6); }

  travelTo(id: number, target: GridPoint): boolean {
    const r = this.travel.travelTo(this.office, id, target);
    if (!r.ok) { this.say(`✗ ${this.names.get(id)}: ${r.reason}`); return false; }
    return true;
  }

  /** Generic sightseeing route: two rooms on the home floor, one on another floor, then home. */
  startTour(id: number) {
    const c = this.compiled, ch = this.office.characters.get(id)!;
    const home = c.floorOfRow(ch.tileRow)!.def.id;
    const here = c.cellAt(ch.tileCol, ch.tileRow)?.id;
    const rooms = c.cells.filter(x => x.kind === 'room');
    const sameFloor = rooms.filter(r => r.floorId === home && r.id !== here)
      .sort((a, b) => Math.abs(a.x - ch.tileCol) - Math.abs(b.x - ch.tileCol));
    const other = rooms.filter(r => r.floorId !== home);
    const legs: Leg[] = [];
    for (const r of sameFloor.slice(0, 2)) legs.push({ target: roomSpot(c, this.office, r.id), pause: 1.2 });
    if (other.length && c.elevators.length) legs.push({ target: roomSpot(c, this.office, other[Math.floor(other.length / 2)].id), pause: 1.5 });
    const seat = ch.seatId ? this.office.seats.get(ch.seatId) : undefined;
    legs.push(seat ? { target: { col: seat.seatCol, row: seat.seatRow }, pause: 0, sit: true } : { target: { col: ch.tileCol, row: ch.tileRow }, pause: 0 });
    this.tours.set(id, { legs, wait: 0 });
    this.selected = id;
    this.say(`Tour: ${this.names.get(id)} → ${legs.length} legs`);
  }

  /** Simulated seconds (what movement speed is measured against). */
  simTime = 0;

  update(dt: number) {
    if (!this.drag) {
      this.simTime += dt;
      this.office.update(dt);
      this.travel.update(this.office, dt);
    }
    for (const [id, tour] of this.tours) {
      const ch = this.office.characters.get(id);
      if (!ch) { this.tours.delete(id); continue; }
      if (this.travel.isTravelling(id) || ch.state === CharacterState.WALK) continue;
      if (tour.wait > 0) { tour.wait -= dt; continue; }
      const leg = tour.legs.shift();
      if (!leg) {
        const seat = ch.seatId ? this.office.seats.get(ch.seatId) : undefined;
        if (seat && seat.seatCol === ch.tileCol && seat.seatRow === ch.tileRow) { ch.isActive = true; ch.dir = seat.facingDir; }
        this.tours.delete(id);
        continue;
      }
      if (!this.travelTo(id, leg.target)) { this.tours.delete(id); continue; }
      tour.wait = leg.pause;
    }
    if (ui.ambient.checked && !ui.edit.checked) this.ambient(dt);
  }

  /** Occasional errands so the scene is alive without debug clutter. */
  ambient(dt: number) {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 4 + this.ambientRand() * 5;
    const idle = [...this.office.characters.values()].filter(ch => !this.tours.has(ch.id) && !this.travel.isTravelling(ch.id) && ch.id !== this.selected);
    if (!idle.length) return;
    const ch = idle[Math.floor(this.ambientRand() * idle.length)];
    const rooms = this.compiled.cells.filter(x => x.kind === 'room');
    const sameFloor = this.ambientRand() < 0.65;
    const pool = rooms.filter(r => (r.floorId === this.compiled.floorOfRow(ch.tileRow)?.def.id) === sameFloor);
    const room = (pool.length ? pool : rooms)[Math.floor(this.ambientRand() * (pool.length || rooms.length))];
    const seat = ch.seatId ? this.office.seats.get(ch.seatId) : undefined;
    const legs: Leg[] = [{ target: roomSpot(this.compiled, this.office, room.id, this.ambientRand), pause: 2 + this.ambientRand() * 3 }];
    if (seat) legs.push({ target: { col: seat.seatCol, row: seat.seatRow }, pause: 0, sit: true });
    this.tours.set(ch.id, { legs, wait: 0 });
  }

  render() {
    const t0 = performance.now();
    this.renderer.render(this.office, this.travel, { debug: ui.debug.checked || ui.edit.checked, selectedId: this.selected, hoverTile: this.hover, time: t0 / 1000 });
    if (this.drag?.candidate) this.drawGhost();
    const dpr = window.devicePixelRatio || 1;
    const tags = this.renderer.hits.filter(h => h.kind === 'agent').map(h => {
      const id = Number(h.id), full = this.names.get(id) ?? '';
      const selected = id === this.selected;
      return { text: selected ? full : full.replace(/ (.*)$/, ''), x: h.x + h.w / 2, y: h.y + 4, selected };
    });
    this.view.draw(ctx, this.renderer.canvas, this.renderer.labels(), this.renderer.pack, dpr, this.renderer.backdrop(), tags);
    this.frameTimes.push(performance.now() - t0);
    if (this.frameTimes.length > 600) this.frameTimes.shift();
  }

  drawGhost() {
    const d = this.drag!, c = this.compiled, cand = d.candidate!;
    const f = c.world.furniture.find(x => x.id === d.id)!;
    const entry = getCatalogEntry(f.assetId);
    if (!entry) return;
    const t = c.roomTile(cand.roomId, cand.col, cand.row);
    const floor = c.floorOfRow(t.row)!.def.id;
    const bctx = this.renderer.canvas.getContext('2d')!;
    const zf = c.zOfRow(t.row + entry.footprintH), zb = c.zOfRow(t.row);
    const q = this.proj.projectFootprint(floor, t.col, t.col + entry.footprintW, zf, zb);
    bctx.beginPath(); q.forEach((p, i) => (i ? bctx.lineTo(p.x, p.y) : bctx.moveTo(p.x, p.y))); bctx.closePath();
    bctx.fillStyle = d.valid ? 'rgba(80,255,140,0.35)' : 'rgba(255,80,80,0.45)'; bctx.fill();
    const p = this.proj.project(floor, t.col, zf);
    const sprite = getCachedSprite(entry.sprite, 1);
    bctx.globalAlpha = 0.6; bctx.drawImage(sprite, Math.round(p.x), Math.round(p.y - sprite.height)); bctx.globalAlpha = 1;
  }

  /** Floor tile under a canvas point, via the shared inverse projection. */
  tileAt(sx: number, sy: number): GridPoint | null {
    const b = this.view.toBuffer(sx, sy);
    const w = this.proj.screenToFloor(b.x, b.y);
    if (!w) return null;
    const row = Math.floor(this.compiled.rowOfZ(w.floorId, w.z));
    const col = Math.floor(w.x);
    if (col < 0 || col >= this.compiled.cols) return null;
    return { col, row };
  }

  stats() {
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const q = (p: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0;
    return { frames: sorted.length, p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2) };
  }
}

/** The legacy addAgent grabs any free chair; the world document decides seating instead. */
function unseatUnlessAssigned(office: OfficeState, ch: { seatId: string | null }, seatId?: string) {
  if (seatId || !ch.seatId) return;
  const seat = office.seats.get(ch.seatId);
  if (seat) seat.assigned = false;
  ch.seatId = null;
}

function place(ch: { tileCol: number; tileRow: number; x: number; y: number; path: GridPoint[]; moveProgress: number }, p: GridPoint) {
  ch.tileCol = p.col; ch.tileRow = p.row; ch.x = p.col * 16 + 8; ch.y = p.row * 16 + 8; ch.path = []; ch.moveProgress = 0;
}

/** A free walkable tile near the front-centre of a room. */
function roomSpot(c: CompiledWorld, office: OfficeState, roomId: string, rand?: () => number): GridPoint {
  const cell = c.cells.find(x => x.id === roomId)!;
  const walk = new Set(office.walkableTiles.map(t => `${t.col},${t.row}`));
  const cx = cell.x + (rand ? rand() * cell.width : cell.width / 2), cz = rand ? rand() * cell.depth : 1;
  let best: GridPoint | null = null, bestD = Infinity;
  for (let r = cell.rowStart; r < cell.rowStart + cell.depth; r++) for (let col = cell.x; col < cell.x + cell.width; col++) {
    if (!walk.has(`${col},${r}`)) continue;
    const d = Math.abs(col + 0.5 - cx) + Math.abs(c.zOfRow(r + 0.5) - cz) * 1.5;
    if (d < bestD) { bestD = d; best = { col, row: r }; }
  }
  if (!best) throw Error(`Room ${roomId} has no free floor`);
  return best;
}

// ── boot ─────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);
let scene: Scene;
const templateNames = [...Object.keys(TEMPLATES), 'generated'];

/** All loaded room-kit packs merged into one asset view for the renderer. */
const kitPacks = new Map<string, LoadedAssetPack>();
const kitAssets = { images: new Map<string, HTMLCanvasElement>(), records: new Map<string, import('../../src/office/assets/manifest.js').AssetRecord>() };

async function loadKitPacks() {
  const problems: string[] = [];
  for (const id of new Set(ROOM_KITS.map(k => k.dressing.packId))) {
    if (kitPacks.has(id)) continue;
    try {
      const p = await loadAssetPack(`/packs/${id}/`);
      kitPacks.set(id, p);
      for (const [k, v] of p.images) kitAssets.images.set(k, v);
      for (const [k, v] of p.records) kitAssets.records.set(k, v);
      problems.push(...p.problems);
    } catch (err) { problems.push(`${id}: not available (${String(err).slice(0, 80)})`); }
  }
  return problems;
}

function makeWorld(name: string): OfficeWorld {
  const base = makeBaseWorld(name);
  if (!ui.kit.checked) return base;
  let w = base;
  for (const { roomId, dressing } of ROOM_KITS) {
    if (kitPacks.has(dressing.packId) && w.rooms.some(r => r.id === roomId)) w = applyRoomKit(w, roomId, dressing);
  }
  return w;
}

function makeBaseWorld(name: string): OfficeWorld {
  if (name === 'generated') return generateBuilding({ seed: Number(params.get('seed') ?? 7), floors: Number(params.get('floors') ?? 3) });
  return (TEMPLATES[name] ?? TEMPLATES['two-floor-office'])();
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  scene?.fit();
}

function showIssues(issues: WorldIssue[]) {
  ui.issues.innerHTML = '';
  for (const i of issues) { const li = document.createElement('li'); li.textContent = i.message; ui.issues.appendChild(li); }
}

function load(name: string) {
  const world = makeWorld(name);
  const forced = params.get('style');
  if (forced && STYLE_PACKS[forced]) world.stylePackId = forced;
  scene = new Scene(world);
  ui.style.value = stylePackFor(scene.compiled.world.stylePackId).id;
  ui.template.value = name;
  showIssues([]);
  resize();
  refreshButtons();
}

function refreshButtons() {
  ui.undo.disabled = !scene.editor.canUndo;
  ui.redo.disabled = false;
  ui.hint.textContent = ui.edit.checked
    ? 'Edit: drag furniture to move it (green = valid). Click a doorway to open/close it. Invalid edits are refused with a reason.'
    : 'Click an agent to select, then click any floor to send them there (other storeys use the elevator). Scroll to zoom, drag to pan.';
}

function applyEdit(result: ReturnType<WorldEditor['apply']>, what: string) {
  if (result.ok) { scene.build(false); showIssues([]); scene.say(`✓ ${what}`); }
  else { showIssues(result.issues); scene.say(`✗ ${what} refused`); }
  refreshButtons();
  return result.ok;
}

let pointer: { x: number; y: number; panX: number; panY: number; moved: boolean } | null = null;
const toCanvas = (e: PointerEvent | WheelEvent) => {
  const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
};

canvas.addEventListener('pointerdown', e => {
  const p = toCanvas(e);
  canvas.setPointerCapture(e.pointerId);
  pointer = { ...p, panX: scene.view.panX, panY: scene.view.panY, moved: false };
  if (ui.edit.checked) {
    const b = scene.view.toBuffer(p.x, p.y);
    const hit = scene.renderer.pick(b.x, b.y, 'furniture');
    const tile = scene.tileAt(p.x, p.y);
    if (hit && tile) {
      const f = scene.compiled.layout.furniture.find(x => x.uid === hit.id)!;
      scene.drag = { id: hit.id, grab: { col: tile.col - f.col, row: tile.row - f.row }, candidate: null, valid: false };
    }
  }
});

canvas.addEventListener('pointermove', e => {
  const p = toCanvas(e);
  scene.hover = scene.tileAt(p.x, p.y);
  if (!pointer) return;
  if (Math.hypot(p.x - pointer.x, p.y - pointer.y) > 4) pointer.moved = true;
  if (scene.drag) {
    const t = scene.hover;
    if (!t) return;
    const col = t.col - scene.drag.grab.col, row = t.row - scene.drag.grab.row;
    const cell = scene.compiled.cellAt(col, row);
    if (!cell || cell.kind !== 'room') { scene.drag.candidate = null; return; }
    const cand = { roomId: cell.id, col: col - cell.x, row: row - cell.rowStart };
    const prev = scene.drag.candidate;
    if (prev && prev.roomId === cand.roomId && prev.col === cand.col && prev.row === cand.row) return;
    scene.drag.candidate = cand;
    const world = JSON.parse(JSON.stringify(scene.editor.world)) as OfficeWorld;
    const f = world.furniture.find(x => x.id === scene.drag!.id)!;
    f.roomId = cand.roomId; f.col = cand.col; f.row = cand.row;
    scene.drag.valid = scene.editor.check(world).ok;
  } else if (pointer.moved) {
    scene.view.panX = pointer.panX + (p.x - pointer.x);
    scene.view.panY = pointer.panY + (p.y - pointer.y);
  }
});

canvas.addEventListener('pointerup', e => {
  const p = toCanvas(e);
  const was = pointer;
  pointer = null;
  if (scene.drag) {
    const d = scene.drag;
    scene.drag = null;
    if (d.candidate && was?.moved) applyEdit(scene.editor.moveFurniture(d.id, d.candidate.roomId, d.candidate.col, d.candidate.row), `move ${d.id}`);
    return;
  }
  if (was?.moved) return;
  const b = scene.view.toBuffer(p.x, p.y);
  const tile = scene.tileAt(p.x, p.y);
  if (ui.edit.checked) {
    const door = tile && scene.compiled.doors.find(d => d.col === tile.col && d.rows.includes(tile.row));
    const near = door ?? (tile && scene.compiled.doors.find(d => Math.abs(d.col - tile.col) <= 1 && d.rows.includes(tile.row)));
    if (near) applyEdit(scene.editor.setDoorOpen(near.def.id, !near.def.open), `${near.def.open ? 'close' : 'open'} door ${near.def.id}`);
    return;
  }
  const agent = scene.renderer.pick(b.x, b.y, 'agent');
  if (agent) { scene.selected = Number(agent.id); return; }
  if (scene.selected != null && tile) {
    scene.tours.delete(scene.selected);
    if (scene.travelTo(scene.selected, tile)) scene.say(`→ ${scene.names.get(scene.selected)} to ${tile.col},${tile.row}`);
  }
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const p = toCanvas(e);
  scene.view.zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
}, { passive: false });

ui.template.addEventListener('change', () => { const u = new URL(location.href); u.searchParams.set('building', ui.template.value); history.replaceState(null, '', u); load(ui.template.value); });
ui.fit.addEventListener('click', () => scene.fit());
ui.tour.addEventListener('click', () => {
  const id = scene.selected ?? [...scene.office.characters.keys()][0];
  if (id != null) scene.startTour(id);
});
ui.edit.addEventListener('change', refreshButtons);
ui.kit.addEventListener('change', async () => {
  if (ui.kit.checked) {
    const problems = await loadKitPacks();
    if (problems.length) showIssues(problems.map(m => ({ code: 'pack', message: m })));
  }
  const u = new URL(location.href); u.searchParams.set('kit', ui.kit.checked ? '1' : '0'); history.replaceState(null, '', u);
  load(ui.template.value);
});
ui.undo.addEventListener('click', () => { if (scene.editor.undo()) { scene.build(false); scene.say('↶ undo'); } refreshButtons(); });
ui.redo.addEventListener('click', () => { if (scene.editor.redo()) { scene.build(false); scene.say('↷ redo'); } refreshButtons(); });
ui.exportBtn.addEventListener('click', () => { ui.json.hidden = false; ui.json.value = scene.editor.serialize(); ui.json.select(); });
ui.importBtn.addEventListener('click', () => {
  ui.json.hidden = false;
  if (!ui.json.value.trim()) { ui.json.placeholder = 'Paste world JSON here, then press Import JSON again.'; return; }
  try {
    const world = JSON.parse(ui.json.value) as OfficeWorld;
    const r = scene.editor.load(world);
    if (applyEdit(r, 'import')) scene.build(true);
  } catch (err) { showIssues([{ code: 'json', message: `Not valid JSON: ${String(err)}` }]); }
});

for (const id of Object.keys(STYLE_PACKS)) { const o = document.createElement('option'); o.value = id; o.textContent = id; ui.style.appendChild(o); }
ui.style.addEventListener('change', () => {
  // A style pack is a property of the building: switching it is a validated, undoable edit.
  applyEdit(scene.editor.apply(w => { w.stylePackId = ui.style.value; }), `style ${ui.style.value}`);
  const u = new URL(location.href); u.searchParams.set('style', ui.style.value); history.replaceState(null, '', u);
});
for (const n of templateNames) { const o = document.createElement('option'); o.value = n; o.textContent = n; ui.template.appendChild(o); }
window.addEventListener('resize', resize);

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  scene.update(dt);
  scene.render();
  if (Math.floor(now / 250) !== Math.floor((now - dt * 1000) / 250)) writeStatus();
  requestAnimationFrame(frame);
}

function writeStatus() {
  const c = scene.compiled, s = scene.stats();
  const lines = [
    `${c.world.name}: ${c.floors.length} floor(s), ${c.cells.filter(x => x.kind === 'room').length} rooms, ${c.doors.length} doors, ${c.elevators.length} elevator(s)`,
    `furniture ${c.layout.furniture.length} · walkable ${scene.office.walkableTiles.length} · agents ${scene.office.characters.size}`,
    `frame p50 ${s.p50} ms · p95 ${s.p95} ms (${s.frames})`,
  ];
  for (const cab of scene.travel.getCabins()) lines.push(`${cab.elevatorId}: ${cab.phase} ${cab.floorId}${cab.phase === 'moving' ? '→' + cab.toFloorId : ''} riders ${cab.passengers.length}`);
  if (scene.selected != null) {
    const ch = scene.office.characters.get(scene.selected);
    if (ch) {
      const w = characterWorld(c, ch.x, ch.y);
      const trip = scene.travel.getTrip(ch.id);
      lines.push('', `▶ ${scene.names.get(ch.id)}`, `  room ${c.cellAt(ch.tileCol, ch.tileRow)?.room?.name ?? (c.cellAt(ch.tileCol, ch.tileRow)?.id ?? 'doorway')} · floor ${w?.floorId}`,
        `  ${trip ? 'trip: ' + trip.phase : ch.state}`);
    }
  }
  if (scene.log.length) lines.push('', ...scene.log);
  ui.status.textContent = lines.join('\n');
}

declare global { interface Window { __engine: unknown } }

await loadPixelAssets();
registerFurnitureDefinitions();
if (params.get('kit') === '1') {
  ui.kit.checked = true;
  const problems = await loadKitPacks();
  if (problems.length) console.warn(problems);
}
load(templateNames.includes(params.get('building') ?? '') ? params.get('building')! : 'two-floor-office');
ui.debug.checked = params.get('debug') === '1';
if (params.get('ambient') === '0') ui.ambient.checked = false;
requestAnimationFrame(frame);

// Automation surface for browser acceptance scripts.
window.__engine = {
  ready: true,
  load: (name: string) => load(name),
  scene: () => scene,
  agents: () => [...scene.office.characters.values()].map(ch => {
    const w = characterWorld(scene.compiled, ch.x, ch.y);
    return { id: ch.id, name: scene.names.get(ch.id), col: ch.tileCol, row: ch.tileRow, x: ch.x, y: ch.y, state: ch.state,
      floor: w?.floorId, room: scene.compiled.cellAt(ch.tileCol, ch.tileRow)?.id ?? null, trip: scene.travel.getTrip(ch.id)?.phase ?? null,
      riding: !!scene.travel.riderSlot(ch.id) };
  }),
  cabins: () => scene.travel.getCabins(),
  simTime: () => scene.simTime,
  travelToRoom: (id: number, roomId: string) => scene.travelTo(id, roomSpot(scene.compiled, scene.office, roomId)),
  travelToTile: (id: number, col: number, row: number) => scene.travelTo(id, { col, row }),
  roomTile: (roomId: string, col: number, row: number) => scene.compiled.roomTile(roomId, col, row),
  tour: (id: number) => scene.startTour(id),
  select: (id: number | null) => { scene.selected = id; },
  moveFurniture: (id: string, roomId: string, col: number, row: number) => {
    const r = scene.editor.moveFurniture(id, roomId, col, row);
    applyEdit(r, `move ${id}`);
    return r.ok ? { ok: true } : { ok: false, issues: r.issues.map(i => i.message) };
  },
  setDoor: (id: string, open: boolean) => {
    const r = scene.editor.setDoorOpen(id, open);
    applyEdit(r, `door ${id}`);
    return r.ok ? { ok: true } : { ok: false, issues: r.issues.map(i => i.message) };
  },
  doors: () => scene.compiled.world.connectors.filter(isDoor).map(d => ({ id: d.id, open: d.open, between: d.between })),
  setAmbient: (on: boolean) => { ui.ambient.checked = on; },
  setDebug: (on: boolean) => { ui.debug.checked = on; },
  focus: (roomId: string) => {
    const cell = scene.compiled.cells.find(x => x.id === roomId)!;
    const f = scene.compiled.floors.find(x => x.def.id === cell.floorId)!;
    const a = scene.proj.project(cell.floorId, cell.x - 1.5, 0), b = scene.proj.project(cell.floorId, cell.x + cell.width + 1.5, cell.depth, f.def.wallHeight + 0.5);
    scene.view.focus(a.x, b.y, b.x - a.x, a.y - b.y + 20, canvas.width, canvas.height);
  },
  fit: () => scene.fit(),
  kit: () => kitPacks.size ? { id: [...kitPacks.keys()].join(','), loaded: [...kitAssets.images.keys()], problems: [...kitPacks.values()].flatMap(p => p.problems) } : null,
  stats: () => scene.stats(),
  /** Exact pixel size to paint a room's backdrop and floor art at (kit authoring). */
  roomArtSize: (roomId: string) => scene.renderer.roomArtSize(roomId),
  /** A furniture type's current sprite (camera-aware shapes at this world's rise) as PNG: a sprite guide. */
  spritePng: (type: string) => {
    const entry = getCatalogEntry(type);
    return entry ? getCachedSprite(entry.sprite, 1).toDataURL('image/png') : null;
  },
  /**
   * The room exactly as the engine lays it out, agents hidden, at native
   * resolution: the img2img guide for that room's plate (and the geometry its
   * furniture is later cut back out along).
   */
  roomGuide: (roomId: string) => {
    const cell = scene.compiled.cells.find(x => x.id === roomId)!;
    const r = scene.renderer.plateRect(cell);
    // Never guide from an existing plate: render the layout itself.
    const live = ui.kit.checked && kitAssets.images.size ? kitAssets : null;
    if (live) {
      const keep = [...live.records].filter(([, rec]) => rec.class !== 'room-plate');
      scene.renderer.setAssets({ records: new Map(keep), images: new Map(keep.map(([id]) => [id, live.images.get(id)!])) });
    }
    scene.renderer.render(scene.office, scene.travel, { debug: false, selectedId: null, hoverTile: null, time: 0, hideAgents: true });
    const c = document.createElement('canvas');
    c.width = r.w; c.height = r.h;
    c.getContext('2d')!.drawImage(scene.renderer.canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    if (live) scene.renderer.setAssets(live);
    return { rect: r, rise: scene.proj.params.rise, png: c.toDataURL('image/png') };
  },
  resetStats: () => { scene.frameTimes = []; },
  screenOf: (col: number, row: number) => {
    const f = scene.compiled.floorOfRow(row)!;
    const p = scene.proj.project(f.def.id, col + 0.5, scene.compiled.zOfRow(row + 0.5));
    const s = scene.view.toScreen(p.x, p.y), dpr = window.devicePixelRatio || 1, r = canvas.getBoundingClientRect();
    return { x: s.x / dpr + r.left, y: s.y / dpr + r.top };
  },
  agentScreen: (id: number) => {
    const ch = scene.office.characters.get(id)!;
    const w = characterWorld(scene.compiled, ch.x, ch.y)!;
    const p = scene.proj.project(w.floorId, w.x, w.z);
    const s = scene.view.toScreen(p.x, p.y), dpr = window.devicePixelRatio || 1, r = canvas.getBoundingClientRect();
    return { x: s.x / dpr + r.left, y: s.y / dpr + r.top };
  },
};
