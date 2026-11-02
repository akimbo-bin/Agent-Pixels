import type {OfficeState} from '../engine/officeState.js';
import {CharacterState} from '../types.js';
import {LOUNGE_POINTS,ROLE_SEATS} from '../layout/nebulaLayouts.js';

/** Visual trips only. Home seats stay assigned and every move uses engine paths. */
export class LoungeWalks {
  travelers=new Map<number,{returning:boolean}>();
  update(office:OfficeState,eligible:Map<number,string>){
    for(const [id,role] of eligible){
      const ch=office.characters.get(id);if(!ch||this.travelers.has(id))continue;
      // Finish the current segment/trip before rerouting: no mid-tile snap.
      if(ch.path.length)continue;
      const point=LOUNGE_POINTS[ROLE_SEATS.findIndex(s=>s.role===role)];if(!point)continue;
      ch.isActive=false;
      if(office.walkToTile(id,point.col,point.row))this.travelers.set(id,{returning:false});
    }
    for(const [id,trip] of this.travelers){
      const ch=office.characters.get(id);if(!ch){this.travelers.delete(id);continue;}
      ch.isActive=false;ch.wanderTimer=999;ch.seatTimer=999;
      if(!eligible.has(id)&&!trip.returning&&!ch.path.length){office.sendToSeat(id);trip.returning=true;}
      if(trip.returning&&!ch.path.length){ch.currentTool=null;this.travelers.delete(id);}
      else if(!trip.returning&&!ch.path.length){
        ch.state=CharacterState.TYPE;ch.currentTool='Read';ch.dir=0;
      }
    }
  }
}
