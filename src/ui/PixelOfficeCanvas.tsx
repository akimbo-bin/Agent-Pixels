import { useEffect, useMemo, useRef, useState } from "react";
import { CharacterState, TILE_SIZE } from "../office/types.js";
import { OfficeState } from "../office/engine/officeState.js";
import { startGameLoop } from "../office/engine/gameLoop.js";
import { renderFrame } from "../office/engine/renderer.js";
import { type CameraBounds, loadPixelAssets } from "./pixelAssets.js";
import { renderNebulaTelemetry, type NebulaTelemetry } from "../office/observatory/nebulaOverlay.js";
import type { NebulaRoom, NebulaCamera, NebulaCameraBounds } from "../office/layout/nebulaLayouts.js";

export type CameraAgent = {
  id: string;
  name: string;
  status?: string | null;
  activityKind?: "coding" | "research" | "writing" | "meeting" | "idle";
  characterIndex?: number;
  room?: NebulaRoom;
};

type PixelOfficeCanvasProps = {
  agents: CameraAgent[];
  camera: "office" | "boardroomKitchen" | "overflowOffice" | NebulaCamera;
  seedSeated?: boolean;
  telemetry?: NebulaTelemetry;
};

function stableNumericId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

export function PixelOfficeCanvas({ agents, camera, seedSeated = false, telemetry }: PixelOfficeCanvasProps) {
  const nebulaMode = camera === "training" || camera === "rendering" || camera === "engineering" ||
    camera === "experiments" || camera === "overview";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const officeRef = useRef<OfficeState | null>(null);
  const cameraBoundsRef = useRef<Record<"office" | "boardroomKitchen" | "overflowOffice" | NebulaCamera, CameraBounds> | null>(null);
  const nebulaBoundsRef = useRef<NebulaCameraBounds | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const agentMeta = useMemo(
    () => new Map(agents.map((agent) => [stableNumericId(agent.id), agent] as const)),
    [agents],
  );

  useEffect(() => {
    let cancelled = false;

    void loadPixelAssets()
      .then(({ layouts, cameraBounds, nebulaCameraBounds }) => {
        if (cancelled) return;
        const office = new OfficeState(nebulaMode ? layouts.nebula : layouts.combined);
        cameraBoundsRef.current = {...cameraBounds, ...nebulaCameraBounds};
        nebulaBoundsRef.current = nebulaCameraBounds;
        officeRef.current = office;
        setReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [nebulaMode]);

  useEffect(() => {
    const office = officeRef.current;
    if (!office || !ready) return;

    const incoming = new Set(agents.map((agent) => stableNumericId(agent.id)));
    for (const agent of agents) {
      const id = stableNumericId(agent.id);
      const existed = office.characters.has(id);
      const zone = nebulaMode && agent.room ? nebulaBoundsRef.current?.[agent.room] : null;
      let seatChoice: string | undefined;
      if (zone && !existed) {
        for (const [seatId, seat] of office.seats) {
          if (seat.assigned) continue;
          if (seat.seatCol >= zone.col && seat.seatCol < zone.col + zone.cols &&
              seat.seatRow >= zone.row && seat.seatRow < zone.row + zone.rows) {
            seatChoice = seatId;
            break;
          }
        }
      }
      office.addAgent(id, agent.characterIndex, 0, seatChoice, true);
      const character = office.characters.get(id);
      // Nebula observer mode: place newly observed sprites at actual Agent Pixels seats
      // immediately, rather than piling everybody into the shared entrance corridor.
      // The upstream Paperclip plugin retains its normal walk-in behavior by default.
      if (seedSeated && !existed && character?.seatId) {
        const seat = office.seats.get(character.seatId);
        if (seat) {
          character.tileCol = seat.seatCol;
          character.tileRow = seat.seatRow;
          character.x = seat.seatCol * TILE_SIZE + TILE_SIZE / 2;
          character.y = seat.seatRow * TILE_SIZE + TILE_SIZE / 2;
          character.path = [];
          character.moveProgress = 0;
          character.state = CharacterState.TYPE;
          character.dir = seat.facingDir;
        }
      }
      if (character && agent.characterIndex !== undefined) {
        if (character.palette !== agent.characterIndex) character.palette = agent.characterIndex;
        if (character.hueShift !== 0) character.hueShift = 0;
      }
      const activity = agent.activityKind ?? "idle";
      const isWorking = activity !== "idle";
      if (character && character.isActive !== isWorking) office.setAgentActive(id, isWorking);
      const nextTool = activity === "research" ? "Read" : isWorking ? "Edit" : null;
      if (character && character.currentTool !== nextTool) office.setAgentTool(id, nextTool);
    }
    for (const id of office.characters.keys()) {
      if (!incoming.has(id)) office.removeAgent(id);
    }
  }, [agents, ready, seedSeated, nebulaMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const office = officeRef.current;
    const cameraBounds = cameraBoundsRef.current;
    if (!canvas || !wrap || !office || !cameraBounds || !ready) return;

    const activeCanvas = canvas;
    const activeWrap = wrap;

    function resize() {
      const rect = activeWrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      activeCanvas.width = Math.max(1, Math.round(rect.width * dpr));
      activeCanvas.height = Math.max(1, Math.round(rect.height * dpr));
      activeCanvas.style.width = `${rect.width}px`;
      activeCanvas.style.height = `${rect.height}px`;
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(activeWrap);

    const stop = startGameLoop(canvas, {
      update: (dt) => office.update(dt),
      render: (ctx) => {
        const layout = office.getLayout();
        const focus = cameraBounds[camera];
        const dpr = window.devicePixelRatio || 1;
        const fitZoom = Math.min(
          canvas.width / (focus.cols * TILE_SIZE),
          canvas.height / (focus.rows * TILE_SIZE),
        ) * 0.92;
        const zoom = Math.max(dpr, fitZoom);
        const mapCenterCol = layout.cols / 2;
        const mapCenterRow = layout.rows / 2;
        const focusCenterCol = focus.col + focus.cols / 2;
        const focusCenterRow = focus.row + focus.rows / 2;
        const panX = (mapCenterCol - focusCenterCol) * TILE_SIZE * zoom;
        const panY = (mapCenterRow - focusCenterRow) * TILE_SIZE * zoom;

        const { offsetX, offsetY } = renderFrame(
          ctx,
          canvas.width,
          canvas.height,
          office.tileMap,
          office.furniture,
          Array.from(office.characters.values()),
          zoom,
          panX,
          panY,
          {
            selectedAgentId: null,
            hoveredAgentId: null,
            hoveredTile: null,
            seats: office.seats,
            characters: office.characters,
          },
          undefined,
          layout.tileColors,
          layout.cols,
          layout.rows,
        );

        if (nebulaMode && nebulaBoundsRef.current) {
          renderNebulaTelemetry(ctx, nebulaBoundsRef.current, telemetry, offsetX, offsetY, zoom, Date.now());
        }
        ctx.save();
        ctx.font = `${Math.max(10, Math.floor(5 * zoom))}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#f9fafb";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = Math.max(2, zoom);
        for (const character of office.characters.values()) {
          const name = agentMeta.get(character.id)?.name;
          if (!name) continue;
          const x = offsetX + character.x * zoom;
          const y = offsetY + (character.y + 8) * zoom;
          ctx.strokeText(name, x, y);
          ctx.fillText(name, x, y);
        }
        ctx.restore();

        // A camera shows only its chosen room. On portrait screens the whole
        // four-room office can otherwise leak into the unused top/bottom space.
        // Mask neighbors instead of altering Agent Pixels physics or actors.
        if (nebulaMode && camera !== "overview") {
          const left = offsetX + focus.col * TILE_SIZE * zoom;
          const top = offsetY + focus.row * TILE_SIZE * zoom;
          const right = left + focus.cols * TILE_SIZE * zoom;
          const bottom = top + focus.rows * TILE_SIZE * zoom;
          ctx.save();
          ctx.fillStyle = "#1d2b38";
          ctx.fillRect(0, 0, canvas.width, Math.max(0, top));
          ctx.fillRect(0, bottom, canvas.width, Math.max(0, canvas.height - bottom));
          ctx.fillRect(0, 0, Math.max(0, left), canvas.height);
          ctx.fillRect(right, 0, Math.max(0, canvas.width - right), canvas.height);
          ctx.restore();
        }
      },
    });

    return () => {
      observer.disconnect();
      stop();
    };
  }, [agentMeta, camera, ready, nebulaMode, telemetry]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "min(725px, calc(100vh - 185px))", minHeight: "520px" }}>
      {!ready && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          {loadError ? `Camera failed: ${loadError}` : "Loading camera..."}
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", imageRendering: "pixelated" }} />
    </div>
  );
}
