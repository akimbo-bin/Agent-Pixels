import {ROOMS,type NebulaRoom,type NebulaBounds} from '../layout/nebulaLayouts.js';
import {floorForRow,ELEVATOR_RIDE_SECONDS,type HQFloor,type LiftCabin} from './elevator.js';

/** 3-storey building cross-section. Units are authored scene pixels, not CSS. */
export const HOUSE_W=1600;
export const HOUSE_H=1000;
export const SHAFT={x:778,y:137,w:72,h:710};
export type RoomSlot={key:NebulaRoom;floor:HQFloor;x:number;y:number;w:number;h:number;bounds:NebulaBounds;
  name:string;short:string;category:string;palette:[string,string,string];accent:string;};
type Cell=Omit<RoomSlot,'bounds'|'name'>;
const yUpper=145,yMiddle=379,yLower=613;
const CELLS:Cell[]=[
 {key:'lead',floor:'upper',x:32,y:yUpper,w:353,h:222,short:'LEAD (MAIN)',category:'EXECUTIVE OFFICE',palette:['#3e2b38','#634036','#36253b'],accent:'#f5c77c'},
 {key:'leadSol',floor:'upper',x:394,y:yUpper,w:202,h:222,short:'LEAD (SECOND)',category:'DIRECTOR OFFICE',palette:['#382735','#52405c','#30263d'],accent:'#e1b87e'},
 {key:'reception',floor:'upper',x:605,y:yUpper,w:165,h:222,short:'ADMIN / CLERK',category:'RECEPTION',palette:['#415152','#72634a','#344451'],accent:'#f0cc97'},
 {key:'observatory',floor:'upper',x:850,y:yUpper,w:472,h:222,short:'NEBULA OBSERVATORY',category:'PLUGIN DEVELOPMENT & EXPANSION',palette:['#091943','#203d73','#1c2455'],accent:'#b9b3ff'},
 {key:'gallery',floor:'upper',x:1331,y:yUpper,w:236,h:222,short:'MODELS GALLERY',category:'TRAINED MODELS',palette:['#3b295c','#512e63','#28294e'],accent:'#dcaaf5'},
 {key:'engineering',floor:'middle',x:32,y:yMiddle,w:738,h:222,short:'ENGINEERS',category:'ROCKET WORKSHOP · SYSTEMS',palette:['#493b40','#704a35','#3b384b'],accent:'#ffcc82'},
 {key:'data',floor:'middle',x:850,y:yMiddle,w:380,h:222,short:'DATA TEAM',category:'MATHEMATICS LAB',palette:['#24484d','#255a5a','#233441'],accent:'#a8e7e9'},
 {key:'rendering',floor:'middle',x:1239,y:yMiddle,w:328,h:222,short:'OPERATIONS',category:'LIVE PIPELINE',palette:['#202d5d','#39336e','#1e2c4e'],accent:'#a7afff'},
 {key:'clinic',floor:'lower',x:32,y:yLower,w:325,h:222,short:'DOCTOR',category:'WELLNESS OFFICE',palette:['#3c5867','#4b777b','#2f5569'],accent:'#a9e7df'},
 {key:'review',floor:'lower',x:366,y:yLower,w:404,h:222,short:'REVIEWERS',category:'QUALITY · SAFETY · ALIGNMENT',palette:['#4c5464','#656475','#363f55'],accent:'#e4d6f1'},
 {key:'training',floor:'lower',x:850,y:yLower,w:387,h:222,short:'TRAINERS',category:'MODEL TRAINING',palette:['#272750','#372c71','#1c204a'],accent:'#c0afff'},
 {key:'experiments',floor:'lower',x:1246,y:yLower,w:321,h:222,short:'TICKET QUEUE',category:'REQUESTS · TASKS · EXPERIMENTS',palette:['#574452','#6e5053','#453b4a'],accent:'#ffda9d'},
];
export const ROOM_SLOTS:readonly RoomSlot[]=CELLS.map(cell=>{
 const r=ROOMS.find(r=>r.key===cell.key);
 if(!r)throw Error('Missing original Agent Pixels source room '+cell.key);
 return {...cell,bounds:r.bounds,name:r.name};
});
export function roomSlot(key:NebulaRoom):RoomSlot{
 const r=ROOM_SLOTS.find(r=>r.key===key);
 if(!r)throw Error('Unknown dollhouse room '+key);
 return r;
}
export function roomAt(x:number,y:number):RoomSlot|null{
 return ROOM_SLOTS.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)??null;
}
export function slotForTile(col:number,row:number):RoomSlot|null {
 const source=ROOMS.find(r=>col>=r.bounds.col&&col<r.bounds.col+r.bounds.cols&&row>=r.bounds.row&&row<r.bounds.row+r.bounds.rows);
 return source?roomSlot(source.key):null;
}
export function floorY(floor:HQFloor):number{
 return floor==='upper'?yUpper:floor==='middle'?yMiddle:yLower;
}
export function floorAtY(y:number):HQFloor|null{
 if(y>=yUpper&&y<=yUpper+222)return 'upper';
 if(y>=yMiddle&&y<=yMiddle+222)return 'middle';
 if(y>=yLower&&y<=yLower+222)return 'lower';
 return null;
}
/** Actual moving elevator position, shared by renderer and follow camera. */
export function elevatorCabinPose(trip:LiftCabin):{x:number;y:number;fraction:number}{
 const p=Math.max(0,Math.min(1,trip.rideSeconds/ELEVATOR_RIDE_SECONDS));
 const ease=p*p*(3-2*p);
 return {x:SHAFT.x+SHAFT.w/2,
  y:floorY(trip.from)+149+(floorY(trip.to)-floorY(trip.from))*ease,
  fraction:ease};
}
/** Source tile X maps to one continuous visual aisle on every storey. */
export function projectCorridorX(floor:HQFloor,col:number):number {
 // These intervals are continuous at the shaft and match physical tile cols.
 if(col<=30)return 32+(Math.max(1,col)-1)*738/29;
 if(col<33)return SHAFT.x+(col-30)*(SHAFT.w/3);
 return SHAFT.x+SHAFT.w+(Math.min(63,col)-33)*717/30;
}
export function projectAgentToRoom(key:NebulaRoom,col:number,row:number):{x:number;y:number;scale:number}{
 const r=roomSlot(key);
 const ny=Math.max(0,Math.min(1,(row-r.bounds.row+.5)/r.bounds.rows));
 // The entire physical room is a very shallow stage: a 21px visual Z plane.
 // The last row meets the balcony at y+204 without a visible floor jump.
 // Wall height and collidable furniture silhouettes do not change with depth.
 const x=Math.max(r.x+19,Math.min(r.x+r.w-19,projectCorridorX(r.floor,col)));
 return {x,y:r.y+182+ny*21,scale:.985+ny*.035};
}
export function projectActor(col:number,row:number):{x:number;y:number;scale:number;room:NebulaRoom|null;floor:HQFloor}{
 const slot=slotForTile(col,row);
 if(slot){
   const p=projectAgentToRoom(slot.key,col,row);
   return {...p,room:slot.key,floor:slot.floor};
 }
 const floor=floorForRow(row);
 // Balcony/corridor is a continuous foreground walkway, distinct from rooms.
 return {x:projectCorridorX(floor,col),y:floorY(floor)+204,scale:1.04,room:null,floor};
}
export type FocusCamera={x:number;y:number;zoom:number};
export const fitCamera=(width:number,height:number):FocusCamera=>({
 x:HOUSE_W/2,y:HOUSE_H/2,zoom:Math.min(width/HOUSE_W,height/HOUSE_H)*.97,
});
export function roomCameraTarget(key:NebulaRoom,width:number,height:number):FocusCamera {
 const r=roomSlot(key);
 return {x:r.x+r.w/2,y:r.y+r.h/2,zoom:Math.min(3.1,width/(r.w+170),height/(r.h+210))};
}
export function floorCameraTarget(floor:HQFloor,width:number,height:number):FocusCamera {
 const y=floorY(floor);
 if(width<680) return {x:SHAFT.x+SHAFT.w/2,y:y+111,zoom:Math.min(1,width/780,height/415)};
 return {x:HOUSE_W/2,y:y+113,zoom:Math.min(1.6,width/1320,height/350)};
}
