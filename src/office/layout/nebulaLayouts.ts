import type { OfficeLayout, PlacedFurniture, TileType } from "../types.js";

/**
 * Four genuine Agent Pixels floorplans, reusing the upstream tile, furniture,
 * character, seat, pathfinding and render engine. This is not an HTML mock-up.
 *
 * Each room is built from the upstream layouts and decorated with existing
 * sprite-catalog IDs, then stitched into one walkable observatory floor.
 */
export type NebulaRoom = "training" | "rendering" | "engineering" | "experiments";
export type NebulaCamera = NebulaRoom | "overview";
export type NebulaBounds = { col: number; row: number; cols: number; rows: number };
export type NebulaCameraBounds = Record<NebulaCamera, NebulaBounds>;

type Color = NonNullable<OfficeLayout["tileColors"]>[number];
type Theme = { floor: Color; wall: Color };
const THEMES: Record<NebulaRoom, Theme> = {
  training:    { floor: {h:153,s:22,b:-8,c:-15}, wall: {h:153,s:11,b:-36,c:-20} },
  rendering:   { floor: {h:203,s:18,b:-8,c:-15}, wall: {h:213,s:20,b:-39,c:-24} },
  engineering: { floor: {h:32,s:12,b:-8,c:-8}, wall: {h:210,s:14,b:-33,c:-21} },
  experiments: { floor: {h:274,s:19,b:-10,c:-19}, wall: {h:278,s:17,b:-43,c:-24} },
};

function prop(uid: string, type: string, col: number, row: number): PlacedFurniture {
  return {uid, type, col, row};
}

function themedRoom(original: OfficeLayout, room: NebulaRoom): OfficeLayout {
  const theme = THEMES[room];
  const furniture = original.furniture.filter(item => {
    // Preserve the original room design and walls, replacing the right-side
    // lounge/kitchen with real furniture sprites for the designated team.
    if (room === "engineering") return true;
    if (room === "experiments") return !["POOL_TABLE","ARCADE_MACHINE","SMALL_TABLE_FRONT","COFFEE"].includes(item.type);
    return item.col < 11 || item.row <= 0;
  }).map(item => ({...item, uid: room + "-src-" + item.uid}));

  if (room === "training") {
    furniture.push(
      prop("neb-train-rack-1","ARCADE_MACHINE",13,2),
      prop("neb-train-rack-2","ARCADE_MACHINE",16,2),
      prop("neb-train-rack-3","ARCADE_MACHINE",18,2),
      prop("neb-train-desk-1","DESK_FRONT",13,5),
      prop("neb-train-pc-1","PC_FRONT_OFF",14,5),
      prop("neb-train-desk-2","DESK_FRONT",17,5),
      prop("neb-train-pc-2","PC_FRONT_OFF",18,5),
      prop("neb-train-seat-1","CUSHIONED_BENCH",14,7),
      prop("neb-train-seat-2","CUSHIONED_BENCH",18,7),
      prop("neb-train-plant","PLANT",18,9)
    );
  } else if (room === "rendering") {
    furniture.push(
      prop("neb-render-rack-1","ARCADE_MACHINE",13,2),
      prop("neb-render-rack-2","ARCADE_MACHINE",17,2),
      prop("neb-render-desk-1","DESK_FRONT",13,5),
      prop("neb-render-pc-1","PC_FRONT_OFF",14,5),
      prop("neb-render-desk-2","DESK_FRONT",17,5),
      prop("neb-render-pc-2","PC_FRONT_OFF",18,5),
      prop("neb-render-seat-1","CUSHIONED_BENCH",14,7),
      prop("neb-render-seat-2","CUSHIONED_BENCH",18,7),
      prop("neb-render-table","SMALL_TABLE_FRONT",16,9)
    );
  } else if (room === "experiments") {
    furniture.push(
      prop("neb-exp-judge","ARCADE_MACHINE",14,2),
      prop("neb-exp-desk-1","DESK_FRONT",13,5),
      prop("neb-exp-pc-1","PC_FRONT_OFF",14,5),
      prop("neb-exp-desk-2","DESK_FRONT",17,5),
      prop("neb-exp-pc-2","PC_FRONT_OFF",18,5),
      prop("neb-exp-seat-1","CUSHIONED_BENCH",14,7),
      prop("neb-exp-seat-2","CUSHIONED_BENCH",18,7),
      prop("neb-exp-plant","PLANT",19,10)
    );
  } else if (room === "engineering") {
    // Original desks and meeting lounge deliberately remain recognizable.
    furniture.push(
      prop("neb-eng-desk-1","DESK_FRONT",13,3),
      prop("neb-eng-pc-1","PC_FRONT_OFF",14,3),
      prop("neb-eng-seat-1","CUSHIONED_BENCH",14,5)
    );
  }

  return {
    ...original, furniture,
    tileColors: original.tiles.map(tile =>
      tile === 255 ? null : tile === 0 ? theme.wall : theme.floor
    ),
  };
}

export function combineNebulaRooms(office: OfficeLayout, boardroom: OfficeLayout): {
  layout: OfficeLayout; cameraBounds: NebulaCameraBounds;
} {
  const rooms: Record<NebulaRoom, OfficeLayout> = {
    training: themedRoom(office, "training"),
    rendering: themedRoom(office, "rendering"),
    engineering: themedRoom(office, "engineering"),
    experiments: themedRoom(boardroom, "experiments"),
  };
  const gap = 4, leftWidth = Math.max(rooms.training.cols, rooms.engineering.cols);
  const upperHeight = Math.max(rooms.training.rows, rooms.rendering.rows);
  const rightX = leftWidth + gap, bottomY = upperHeight + gap;
  const cols = rightX + Math.max(rooms.rendering.cols, rooms.experiments.cols);
  const rows = bottomY + Math.max(rooms.engineering.rows, rooms.experiments.rows);
  const tiles = Array<TileType>(cols*rows).fill(255 as TileType);
  const tileColors: NonNullable<OfficeLayout["tileColors"]> = Array(cols*rows).fill(null);
  const cameraBounds: NebulaCameraBounds = {
    training: {col:0,row:0,cols:rooms.training.cols,rows:rooms.training.rows},
    rendering: {col:rightX,row:0,cols:rooms.rendering.cols,rows:rooms.rendering.rows},
    engineering:{col:0,row:bottomY,cols:rooms.engineering.cols,rows:rooms.engineering.rows},
    experiments:{col:rightX,row:bottomY,cols:rooms.experiments.cols,rows:rooms.experiments.rows},
    overview:{col:0,row:0,cols,rows},
  };

  const furniture: PlacedFurniture[] = [];
  for (const room of ["training","rendering","engineering","experiments"] as NebulaRoom[]) {
    const source = rooms[room], {col:ox,row:oy}=cameraBounds[room];
    for (let r=0;r<source.rows;r++) for(let c=0;c<source.cols;c++) {
      const target = (oy+r)*cols+ox+c, from=r*source.cols+c;
      tiles[target]=source.tiles[from];
      tileColors[target]=source.tileColors?.[from]??null;
    }
    furniture.push(...source.furniture.map(item => ({
      ...item, uid:room+"-"+item.uid, col:item.col+ox,row:item.row+oy,
    })));
  }

  // Four-way walkable central hall with actual pathfinding floor tiles.
  const hallFloor=9 as TileType;
  const hallTint: Color={h:190,s:10,b:-24,c:-18};
  function walkway(x:number,y:number){
    if(x<0||x>=cols||y<0||y>=rows)return;
    const i=y*cols+x;
    tiles[i]=hallFloor;
    tileColors[i]=hallTint;
  }
  for(let y=0;y<rows;y++)for(let x=leftWidth;x<rightX;x++)walkway(x,y);
  for(let y=upperHeight;y<bottomY;y++)for(let x=0;x<cols;x++)walkway(x,y);
  // Entrance doors open through the outer walls; no decorative fake passages.
  for(let row=5;row<=7;row++){
    for(let x=leftWidth-3;x<=rightX+2;x++)walkway(x,row);
    for(let x=leftWidth-3;x<=rightX+2;x++)walkway(x,row+bottomY);
  }
  // North/south passages. The two upper rooms and two lower rooms each get
  // a corridor access point, using the room's reachable interior floor.
  for(const x of [5,rightX+6]){
    for(let y=upperHeight-3;y<=bottomY+2;y++)for(let dx=0;dx<=1;dx++)walkway(x+dx,y);
  }

  return {
    layout:{version:1,cols,rows,layoutRevision:1,tiles,tileColors,furniture,
      spawnTile:{col:leftWidth+1,row:upperHeight+1}},
    cameraBounds,
  };
}
