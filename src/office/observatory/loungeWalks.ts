import type {OfficeState} from '../engine/officeState.js';
import {CharacterState} from '../types.js';
import {LOUNGE_POINTS,ROLE_SEATS} from '../layout/nebulaLayouts.js';
import type {ElevatorTransit} from './elevator.js';

/** Demo lounge trips are physically routed through the same real elevator. */
export class LoungeWalks{
 travelers=new Map<number,{returning:boolean}>();
 update(office:OfficeState,eligible:Map<number,string>,elevator:ElevatorTransit){
  for(const [id,role]of eligible){
   const ch=office.characters.get(id);
   if(!ch||this.travelers.has(id)||elevator.has(id)||ch.path.length)continue;
   const point=LOUNGE_POINTS[ROLE_SEATS.findIndex(s=>s.role===role)];
   if(!point)continue;
   ch.isActive=false;
   if(elevator.goToPoint(office,id,point))this.travelers.set(id,{returning:false});
  }
  for(const [id,trip]of this.travelers){
   const ch=office.characters.get(id);
   if(!ch){this.travelers.delete(id);continue;}
   ch.isActive=false;ch.wanderTimer=999;ch.seatTimer=999;
   if(!eligible.has(id)&&!trip.returning&&!elevator.has(id)&&!ch.path.length){
    if(elevator.goToSeat(office,id))trip.returning=true;
   }
   if(trip.returning&&!elevator.has(id)&&!ch.path.length){
    ch.currentTool=null;this.travelers.delete(id);
   }else if(!trip.returning&&!elevator.has(id)&&!ch.path.length){
    ch.state=CharacterState.TYPE;ch.currentTool='Read';ch.dir=0;
   }
  }
 }
}
