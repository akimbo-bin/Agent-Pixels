import type {RoomSlot} from './dollhouseProjection.js';
import {projectAgentToRoom,projectCorridorX} from './dollhouseProjection.js';

export type CutawayLayer='background'|'blocking'|'floor'|'portal';
export type CutawayCatalog={
 category?:string;footprintW:number;footprintH:number;backgroundTiles?:number;
 canPlaceOnWalls?:boolean;renderLayer?:string;
};
export type SourcePlacement={col:number;row:number};
export type ScenePoint={x:number;y:number;scale:number};

/**
 * The source catalog, not an illustration filename, decides collision semantics:
 * - wall sprites live permanently in the upright background;
 * - ground tiles are painted under agents;
 * - blocked furniture shares agents' screen-foot Z order;
 * - source door/arch sprites are replaced by a visible foreground portal.
 */
export function classifyCutawayFurniture(type:string,entry:CutawayCatalog):CutawayLayer{
 if(/^N_(DOOR|ARCH)(?:_|$)/.test(type))return 'portal';
 if(/^N_(RUG|GLOW)(?:_|$)/.test(type)||entry.renderLayer==='ground')return 'floor';
 if(entry.category==='wall'||entry.canPlaceOnWalls||
    (entry.backgroundTiles??0)>=entry.footprintH)return 'background';
 return 'blocking';
}
/** Both physical props and agents use the *same* source-foot projection. */
export function projectFurnitureFoot(
 room:RoomSlot,source:SourcePlacement,entry:CutawayCatalog,layer:CutawayLayer,
):ScenePoint{
 const col=source.col+Math.max(1,entry.footprintW)*.5;
 if(layer==='blocking'){
  const footRow=source.row+Math.max(1,entry.footprintH)-.5;
  return projectAgentToRoom(room.key,col,footRow);
 }
 const roomDepth=(source.row-room.bounds.row+.5)/room.bounds.rows;
 return {
  x:Math.max(room.x+10,Math.min(room.x+room.w-10,projectCorridorX(room.floor,col))),
  y:room.y+82+Math.max(0,Math.min(1,roomDepth))*40,
  scale:1,
 };
}
/** Real two-wide source doorway, explicitly on the shared front walkway. */
export function roomScreenDoor(room:RoomSlot,sourceDoor:SourcePlacement):{
 x:number;y:number;col:number;row:number
}{
 const p=projectAgentToRoom(room.key,sourceDoor.col,sourceDoor.row);
 return {x:p.x,y:p.y,col:sourceDoor.col,row:sourceDoor.row};
}
