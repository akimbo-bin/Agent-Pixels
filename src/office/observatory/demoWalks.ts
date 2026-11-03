import type {OfficeState} from '../engine/officeState.js';
import type {ElevatorTransit} from './elevator.js';

export const DEMO_JOURNEYS=[
 {role:'Clerk',start:3,to:{col:9,row:8}},       // Upstairs reception -> executive
 {role:'Engine',start:7,to:{col:36,row:24}},     // Rocket workshop -> mathematics lab
 {role:'Reviewer',start:11,to:{col:26,row:8}},   // Review bureau -> upstairs reception
 {role:'Training',start:15,to:{col:42,row:9}},   // Neural computing -> upper observatory
 {role:'Doctor',start:19,to:{col:19,row:8}},     // Clinic -> second executive
];
/**
 * All ambient demo journeys use the same ElevatorTransit as manual commands.
 * Trips launch only from their own floor, never call direct cross-floor A*,
 * and return home after the visible trip is complete.
 */
export class DemoWalks{
 time=0;
 private launched=new Map<number,number>();
 travelers=new Map<number,{returnAt:number;returning:boolean}>();
 update(office:OfficeState,dt:number,roles:Map<string,number>,elevator:ElevatorTransit){
  this.time+=dt;
  const cycle=Math.floor(this.time/90),phase=this.time%90;
  for(const j of DEMO_JOURNEYS){
   const id=roles.get(j.role);
   if(id===undefined||phase<j.start||this.launched.get(id)===cycle||elevator.has(id))continue;
   const ch=office.characters.get(id);
   if(!ch||ch.path.length||this.travelers.has(id))continue;
   ch.isActive=false;
   if(elevator.goToPoint(office,id,j.to)){
    this.travelers.set(id,{returnAt:this.time+38,returning:false});
    this.launched.set(id,cycle);
   }
  }
  for(const [id,trip]of this.travelers){
   const ch=office.characters.get(id);
   if(!ch){this.travelers.delete(id);continue;}
   ch.isActive=false;ch.wanderTimer=999;ch.seatTimer=999;
   if(this.time>=trip.returnAt&&!trip.returning&&!elevator.has(id)&&!ch.path.length){
    if(elevator.goToSeat(office,id))trip.returning=true;
   }
   if(trip.returning&&!elevator.has(id)&&!ch.path.length)this.travelers.delete(id);
  }
 }
}
