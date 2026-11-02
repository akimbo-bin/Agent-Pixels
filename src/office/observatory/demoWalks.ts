import type { OfficeState } from '../engine/officeState.js';
export const DEMO_JOURNEYS = [
  {role:'Clerk',start:3,to:{col:9,row:8}},
  {role:'Engine',start:7,to:{col:36,row:24}},
  {role:'Reviewer',start:11,to:{col:10,row:26}},
  {role:'Training',start:15,to:{col:42,row:11}},
  {role:'Doctor',start:19,to:{col:23,row:8}},
];
/** Demo-only journeys use upstream walkToTile/sendToSeat and ordinary updates. */
export class DemoWalks {
  time=0; private launched=new Map<number,number>();
  travelers=new Map<number,{returnAt:number;returning:boolean}>();
  update(office:OfficeState,dt:number,roles:Map<string,number>){
    this.time+=dt;const cycle=Math.floor(this.time/90),phase=this.time%90;
    for(const j of DEMO_JOURNEYS){
      const id=roles.get(j.role);if(id===undefined||phase<j.start||this.launched.get(id)===cycle)continue;
      const ch=office.characters.get(id);if(!ch)continue;
      ch.isActive=false;
      if(office.walkToTile(id,j.to.col,j.to.row)){this.travelers.set(id,{returnAt:this.time+38,returning:false});this.launched.set(id,cycle);}
    }
    for(const [id,trip] of this.travelers){
      const ch=office.characters.get(id);if(!ch){this.travelers.delete(id);continue;}
      ch.isActive=false;ch.wanderTimer=999;ch.seatTimer=999;
      if(this.time>=trip.returnAt&&!trip.returning){office.sendToSeat(id);trip.returning=true;}
      if(trip.returning&&!ch.path.length)this.travelers.delete(id);
    }
  }
}
