import type {OfficeState} from '../engine/officeState.js';
import {CharacterState,TILE_SIZE} from '../types.js';
import {ROOMS,type NebulaRoom,type Point,type NebulaBounds} from '../layout/nebulaLayouts.js';

/** Source-backed 64x48 tile world, split into three real walkable floors. */
export type HQFloor='upper'|'middle'|'lower';
export const HQ_FLOORS:readonly {id:HQFloor;number:number;label:string;bounds:NebulaBounds;landing:Point;art:Point}[]=[
 {id:'upper',number:3,label:'OBSERVATORY',bounds:{col:0,row:0,cols:64,rows:17},landing:{col:31,row:8},art:{col:30,row:6}},
 {id:'middle',number:2,label:'LABS',bounds:{col:0,row:17,cols:64,rows:17},landing:{col:31,row:24},art:{col:30,row:22}},
 {id:'lower',number:1,label:'OPERATIONS',bounds:{col:0,row:34,cols:64,rows:14},landing:{col:31,row:41},art:{col:30,row:39}},
] as const;
export const floorForRow=(row:number):HQFloor=>row<17?'upper':row<34?'middle':'lower';
export const floorForRoom=(room:NebulaRoom):HQFloor=>{
 const r=ROOMS.find(r=>r.key===room);
 if(!r)throw Error('Unknown campus room '+room);
 return floorForRow(r.bounds.row);
};
export const floorStop=(floor:HQFloor)=>HQ_FLOORS.find(f=>f.id===floor)!;

/** One tile inward from the open doorway of the real source layout. */
export function roomDestination(room:NebulaRoom):Point{
 const r=ROOMS.find(r=>r.key===room);
 if(!r)throw Error('Unknown campus room '+room);
 const doorway=r.doors[0][0];
 const northEdge=doorway.row===r.bounds.row;
 return {col:doorway.col,row:doorway.row+(northEdge?1:-1)};
}

type Phase='approach'|'waiting'|'ride'|'walk';
export type LiftTrip={
 id:number;from:HQFloor;to:HQFloor;target:Point;phase:Phase;rideSeconds:number;
};
export type LiftCabin={
 from:HQFloor;to:HQFloor;phase:'idle'|'reposition'|'ride';
 rideSeconds:number;passengerId:number|null;
};
export const ELEVATOR_RIDE_SECONDS=2.4;
const at=(ch:{tileCol:number;tileRow:number},p:Point)=>ch.tileCol===p.col&&ch.tileRow===p.row;

/**
 * Single-cabin controller. All agents walk on their own floor using upstream
 * OfficeState paths. The ONLY floor transfer is a timed, occupied cabin ride.
 *
 * Multiple arrivals queue at a landing. The cabin physically travels empty
 * to the next waiting floor before allowing a passenger to board. No other
 * character is invisible or silently teleported while the cabin is busy.
 */
export class ElevatorTransit{
 private trips=new Map<number,LiftTrip>();
 private cabin:LiftCabin={from:'upper',to:'upper',phase:'idle',rideSeconds:0,passengerId:null};
 getTrips():LiftTrip[]{return [...this.trips.values()].map(t=>({...t,target:{...t.target}}));}
 getCabin():LiftCabin{return {...this.cabin};}
 has(id:number){return this.trips.has(id);}
 isRiding(id:number){return this.cabin.phase==='ride'&&this.cabin.passengerId===id;}
 reset(){
  this.trips.clear();
  this.cabin={from:'upper',to:'upper',phase:'idle',rideSeconds:0,passengerId:null};
 }
 goToRoom(office:OfficeState,id:number,room:NebulaRoom):boolean{
  return this.goToPoint(office,id,roomDestination(room));
 }
 goToFloor(office:OfficeState,id:number,floor:HQFloor):boolean{
  return this.goToPoint(office,id,floorStop(floor).landing);
 }
 goToSeat(office:OfficeState,id:number):boolean{
  const ch=office.characters.get(id),seat=ch?.seatId?office.seats.get(ch.seatId):null;
  return seat?this.goToPoint(office,id,{col:seat.seatCol,row:seat.seatRow}):false;
 }
 goToPoint(office:OfficeState,id:number,target:Point):boolean{
  const ch=office.characters.get(id);
  if(!ch||ch.isSubagent||this.isRiding(id))return false;
  const from=floorForRow(ch.tileRow),to=floorForRow(target.row);
  if(at(ch,target))return true;
  // Do not cancel an in-progress trip unless replacement navigation succeeds.
  if(from===to){
   if(!office.walkToTile(id,target.col,target.row))return false;
   this.trips.set(id,{id,from,to,target,phase:'walk',rideSeconds:0});
   return true;
  }
  const start=floorStop(from).landing;
  if(!at(ch,start)&&!office.walkToTile(id,start.col,start.row))return false;
  this.trips.set(id,{id,from,to,target,phase:at(ch,start)?'waiting':'approach',rideSeconds:0});
  ch.wanderTimer=999;ch.seatTimer=999;
  if(at(ch,start)){ch.path=[];ch.state=CharacterState.IDLE;}
  return true;
 }
 update(office:OfficeState,dt:number):void{
  if(!Number.isFinite(dt)||dt<=0)return;
  // Queue state is independent of actor walking; positions remain real tiles.
  for(const [id,t]of this.trips){
   const ch=office.characters.get(id);
   if(!ch){this.trips.delete(id);continue;}
   ch.wanderTimer=999;ch.seatTimer=999;
   if(t.phase==='approach'){
    const source=floorStop(t.from).landing;
    if(!ch.path.length&&at(ch,source)){
     t.phase='waiting';t.rideSeconds=0;ch.state=CharacterState.IDLE;
    }else if(!ch.path.length)this.trips.delete(id); // interrupted route
   }else if(t.phase==='waiting'){
    if(!at(ch,floorStop(t.from).landing))this.trips.delete(id);
   }else if(t.phase==='walk'&&!ch.path.length){
    this.trips.delete(id);
   }
  }
  if(this.cabin.phase==='reposition'){
   this.cabin.rideSeconds+=dt;
   if(this.cabin.rideSeconds>=ELEVATOR_RIDE_SECONDS){
    this.cabin={from:this.cabin.to,to:this.cabin.to,phase:'idle',rideSeconds:0,passengerId:null};
   }
  }else if(this.cabin.phase==='ride'){
   const id=this.cabin.passengerId!;
   const t=this.trips.get(id),ch=office.characters.get(id);
   if(!t||!ch){
    this.cabin={from:this.cabin.to,to:this.cabin.to,phase:'idle',rideSeconds:0,passengerId:null};
   }else{
    ch.state=CharacterState.IDLE;ch.path=[];ch.moveProgress=0;
    this.cabin.rideSeconds+=dt;t.rideSeconds=this.cabin.rideSeconds;
    if(this.cabin.rideSeconds>=ELEVATOR_RIDE_SECONDS){
     const dest=floorStop(t.to).landing;
     ch.tileCol=dest.col;ch.tileRow=dest.row;
     ch.x=dest.col*TILE_SIZE+TILE_SIZE/2;
     ch.y=dest.row*TILE_SIZE+TILE_SIZE/2;
     ch.frame=0;ch.frameTimer=0;
     this.cabin={from:t.to,to:t.to,phase:'idle',rideSeconds:0,passengerId:null};
     if(at(ch,t.target)){
      this.trips.delete(id);
     }else if(office.walkToTile(id,t.target.col,t.target.row)){
      t.phase='walk';
     }else{
      this.trips.delete(id); // stays physically at valid destination landing
     }
    }
   }
  }
  if(this.cabin.phase!=='idle')return;
  const next=[...this.trips.values()].find(t=>t.phase==='waiting');
  if(!next)return;
  const location=this.cabin.to;
  if(location!==next.from){
   this.cabin={from:location,to:next.from,phase:'reposition',rideSeconds:0,passengerId:null};
   return;
  }
  const ch=office.characters.get(next.id);
  if(!ch||!at(ch,floorStop(next.from).landing)){this.trips.delete(next.id);return;}
  next.phase='ride';next.rideSeconds=0;ch.state=CharacterState.IDLE;ch.path=[];
  this.cabin={from:next.from,to:next.to,phase:'ride',rideSeconds:0,passengerId:next.id};
 }
 /** Renderer-only lighting swaps; no collision geometry changes. */
 getVisuals():Map<string,string>{
  const active=new Set<HQFloor>();
  if(this.cabin.phase!=='idle'){active.add(this.cabin.from);active.add(this.cabin.to);}
  for(const t of this.trips.values())if(t.from!==t.to){active.add(t.from);active.add(t.to);}
  return new Map(HQ_FLOORS.map(f=>['elevator-'+f.id,
   'N_ELEVATOR_'+f.number+(active.has(f.id)?'_ACTIVE':'')]));
 }
}
