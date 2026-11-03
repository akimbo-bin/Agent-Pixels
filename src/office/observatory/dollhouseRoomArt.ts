import {ROOM_SLOTS,type RoomSlot} from './dollhouseProjection.js';
import type {NebulaRoom} from '../layout/nebulaLayouts.js';

/** A generated backdrop never owns physical furniture, collisions or doors. */
export type RoomWallAsset={file:string;width:number;height:number;approved?:boolean};
export type RoomArtManifest={version:1;walls:Partial<Record<NebulaRoom,RoomWallAsset>>};
const ROOM_KEYS=new Set<string>(ROOM_SLOTS.map(r=>r.key));
const WALLS=new Map<NebulaRoom,HTMLImageElement>();
const PREFIX='/pixels/room-art/';

export function isValidRoomArtManifest(value:unknown):value is RoomArtManifest{
 if(typeof value!=='object'||value===null)return false;
 const root=value as {version?:unknown;walls?:unknown};
 if(root.version!==1||typeof root.walls!=='object'||root.walls===null||Array.isArray(root.walls))return false;
 for(const [room,item]of Object.entries(root.walls)){
  if(!ROOM_KEYS.has(room)||!item||typeof item!=='object')return false;
  const e=item as Partial<RoomWallAsset>;
  // Filename constrained to this exact room: no traversal, remote sources,
  // URI escapes, overwrite of existing native sprites, or invented layers.
  if(e.file!==room+'-wall.png')return false;
  if(!Number.isInteger(e.width)||!Number.isInteger(e.height)||
     (e.width??0)<256||(e.width??0)>2048||(e.height??0)<128||(e.height??0)>1024)return false;
  if(e.approved!==undefined&&typeof e.approved!=='boolean')return false;
 }
 return true;
}
export function activeRoomArtCount():number{return WALLS.size;}
/**
 * Optional local generated image pipeline. An empty manifest is a no-op, not a
 * trigger to generate placeholder artwork or contact an external service.
 */
export async function loadRoomWallArt():Promise<number>{
 WALLS.clear();
 try{
  const response=await fetch(PREFIX+'manifest.json',{cache:'no-store'});
  if(!response.ok)return 0;
  const manifest:unknown=await response.json();
  if(!isValidRoomArtManifest(manifest))return 0;
  const loaded=await Promise.all(Object.entries(manifest.walls).map(async([key,entry])=>{
   if(entry.approved===false)return null;
   const img=new Image();
   img.src=PREFIX+entry.file;
   try{
    await img.decode();
    if(img.naturalWidth!==entry.width||img.naturalHeight!==entry.height)return null;
    return [key as NebulaRoom,img] as const;
   }catch{return null;}
  }));
  for(const item of loaded)if(item)WALLS.set(item[0],item[1]);
 }catch{
  // Preserve readable architectural fallback on malformed/unavailable assets.
 }
 return WALLS.size;
}
/**
 * The generated image covers the UPRIGHT REAR WALL only. Stage floors,
 * original characters, blocking furniture, source doorways, collision and
 * elevator remain entirely separate dynamic/source-owned layers.
 */
export function drawGeneratedRoomWall(c:CanvasRenderingContext2D,r:RoomSlot):boolean{
 const img=WALLS.get(r.key);
 if(!img)return false;
 const x=r.x+9,y=r.y+14,w=r.w-18,h=126;
 const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
 const sw=w/scale,sh=h/scale,sx=(img.naturalWidth-sw)/2,sy=(img.naturalHeight-sh)/2;
 c.save();c.imageSmoothingEnabled=false;
 c.drawImage(img,sx,sy,sw,sh,x,y,w,h);c.restore();
 return true;
}
