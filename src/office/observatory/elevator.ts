import type {OfficeState} from '../engine/officeState.js';
import {CharacterState, TILE_SIZE} from '../types.js';
import {ROOMS,type NebulaRoom,type Point,type NebulaBounds} from '../layout/nebulaLayouts.js';

/**
 * This is the connected 64x48 Agent Pixels world, NOT a CSS reconstruction.
 * The floor bands refer to physical tile positions and keep the original layout,
 * seats, collisions, sprite sheets and A* intact.
 */
export type HQFloor='upper'|'middle'|'lower';
export const HQ_FLOORS:readonly {id:HQFloor;number:number;label:string;bounds:NebulaBounds;landing:Point;art:Point}[]=[
  {id:'upper', number:3,label:'OBSERVATORY',bounds:{col:0,row:0,cols:64,rows:17},landing:{col:31,row:8},art:{col:30,row:6}},
  {id:'middle',number:2,label:'LABS',bounds:{col:0,row:17,cols:64,rows:17},landing:{col:31,row:24},art:{col:30,row:22}},
  {id:'lower', number:1,label:'OPERATIONS',bounds:{col:0,row:34,cols:64,rows:14},landing:{col:31,row:41},art:{col:30,row:39}},
] as const;

export const floorForRow=(row:number):HQFloor=>row<17?'upper':row<34?'middle':'lower';
export const floorForRoom=(room:NebulaRoom):HQFloor=>{
  const r=ROOMS.find(r=>r.key===room);
  if(!r)throw Error('Unknown campus room '+room);
  return floorForRow(r.bounds.row);
};
export const floorStop=(floor:HQFloor)=>HQ_FLOORS.find(f=>f.id===floor)!;

/** A genuine walkable tile inside the doorway, rather than center-of-sprite art. */
export function roomDestination(room:NebulaRoom):Point {
  const r=ROOMS.find(r=>r.key===room);
  if(!r)throw Error('Unknown campus room '+room);
  const doorway=r.doors[0][0];
  const northEdge=doorway.row===r.bounds.row;
  return {col:doorway.col,row:doorway.row+(northEdge?1:-1)};
}

type Phase='approach'|'ride'|'walk';
export type LiftTrip={
  id:number;
  from:HQFloor;to:HQFloor;
  target:Point;
  phase:Phase;
  rideSeconds:number;
};
const RIDE_SECONDS=1.2;
const at=(ch:{tileCol:number;tileRow:number},p:Point)=>ch.tileCol===p.col&&ch.tileRow===p.row;

/**
 * The only non-walking movement is a timed transfer between the two real lift
 * landings. All approach and exit segments use OfficeState.walkToTile, preserving
 * character sprite animation, collision rules and assigned home seats.
 */
export class ElevatorTransit {
  private trips=new Map<number,LiftTrip>();
  getTrips():LiftTrip[]{return [...this.trips.values()].map(t=>({...t,target:{...t.target}}));}
  has(id:number){return this.trips.has(id);}
  isRiding(id:number){return this.trips.get(id)?.phase==='ride';}
  reset(){this.trips.clear();}

  goToRoom(office:OfficeState,id:number,room:NebulaRoom):boolean{
    return this.goToPoint(office,id,roomDestination(room));
  }

  goToFloor(office:OfficeState,id:number,floor:HQFloor):boolean{
    return this.goToPoint(office,id,floorStop(floor).landing);
  }

  private goToPoint(office:OfficeState,id:number,target:Point):boolean{
    const ch=office.characters.get(id);
    if(!ch||ch.isSubagent)return false;
    const from=floorForRow(ch.tileRow),to=floorForRow(target.row);
    this.trips.delete(id);
    if(at(ch,target))return true;
    // For a same-floor trip the ordinary Agent Pixels pathfinding is enough.
    if(from===to){
      if(!office.walkToTile(id,target.col,target.row))return false;
      this.trips.set(id,{id,from,to,target,phase:'walk',rideSeconds:0});
      return true;
    }
    const start=floorStop(from).landing;
    if(!at(ch,start)&&!office.walkToTile(id,start.col,start.row))return false;
    this.trips.set(id,{id,from,to,target,phase:at(ch,start)?'ride':'approach',rideSeconds:0});
    ch.wanderTimer=999;ch.seatTimer=999;
    if(at(ch,start)){ch.path=[];ch.state=CharacterState.IDLE;}
    return true;
  }

  update(office:OfficeState,dt:number):void{
    if(!Number.isFinite(dt)||dt<=0)return;
    for(const [id,t]of this.trips){
      const ch=office.characters.get(id);
      if(!ch){this.trips.delete(id);continue;}
      ch.wanderTimer=999;ch.seatTimer=999;
      if(t.phase==='approach'){
        const source=floorStop(t.from).landing;
        if(!ch.path.length&&at(ch,source)){
          t.phase='ride';t.rideSeconds=0;ch.state=CharacterState.IDLE;
        }else if(!ch.path.length){
          // A separate controller interrupted our walk: fail closed.
          this.trips.delete(id);
        }
      }else if(t.phase==='ride'){
        ch.state=CharacterState.IDLE;
        ch.path=[];ch.moveProgress=0;
        t.rideSeconds+=dt;
        if(t.rideSeconds<RIDE_SECONDS)continue;
        const destination=floorStop(t.to).landing;
        ch.tileCol=destination.col;ch.tileRow=destination.row;
        ch.x=destination.col*TILE_SIZE+TILE_SIZE/2;
        ch.y=destination.row*TILE_SIZE+TILE_SIZE/2;
        ch.frame=0;ch.frameTimer=0;
        if(at(ch,t.target)){this.trips.delete(id);continue;}
        if(!office.walkToTile(id,t.target.col,t.target.row)){
          this.trips.delete(id);
          continue;
        }
        t.phase='walk';
      }else if(t.phase==='walk'){
        if(!ch.path.length)this.trips.delete(id);
      }
    }
  }

  /** Stable footprint swaps: no new blocked tiles, only elevator lighting. */
  getVisuals():Map<string,string>{
    const active=new Set<HQFloor>();
    for(const t of this.trips.values()){
      if(t.from!==t.to){active.add(t.from);active.add(t.to);}
    }
    return new Map(HQ_FLOORS.map(f=>[
      'elevator-'+f.id,
      'N_ELEVATOR_'+f.number+(active.has(f.id)?'_ACTIVE':''),
    ]));
  }
}
