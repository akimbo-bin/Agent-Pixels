// Reserve authored choices before automatic allocation, including absent owners.
function allocateAgentSeats({agents,configs,seats,roomFor,allows,usable}){
 const assignments={},owners={},status={},byId=new Map(seats.map(s=>[s.id,s]));
 const manual=c=>c?.seatMode==='manual'||!!c?.seatId&&c.seatMode!=='auto';
 for(const[id,c]of Object.entries(configs).sort(([a],[b])=>a.localeCompare(b))){
  if(!manual(c)||!c.seatId)continue;
  if(!owners[c.seatId])owners[c.seatId]=id;
  else status[id]='Seat is also assigned to another agent';
 }
 const ordered=agents.filter(a=>configs[a.id]?.visible&&configs[a.id].room!=='unassigned').sort((a,b)=>a.id.localeCompare(b.id));
 for(const a of ordered){const c=configs[a.id];if(c.seatMode==='none'){status[a.id]='Standing post';continue;}if(!manual(c))continue;const s=byId.get(c.seatId);if(owners[c.seatId]!==a.id)continue;if(s&&allows(s,c.room)&&usable(s,c)){assignments[a.id]=s.id;status[a.id]='Assigned seat';}else status[a.id]='Assigned seat is unavailable';}
 const automatic=ordered.filter(a=>!manual(configs[a.id])&&configs[a.id].seatMode!=='none');
 const valid=(s,c)=>s&&roomFor(s)===c.room&&allows(s,c.room)&&usable(s,c);
 // Keep previously selected automatic seats before considering new arrivals.
 for(const a of automatic){const c=configs[a.id],s=byId.get(c.autoSeatId);if(valid(s,c)&&!owners[s.id]){owners[s.id]=a.id;assignments[a.id]=s.id;}}
 for(const a of automatic){const c=configs[a.id];if(!assignments[a.id]){const s=[...seats].sort((a,b)=>a.id.localeCompare(b.id)).find(s=>!owners[s.id]&&valid(s,c));if(s){owners[s.id]=a.id;assignments[a.id]=s.id;}}status[a.id]=assignments[a.id]?'Automatic seat':'No free seat in this room · staying at post';}
 return{assignments,owners,status};
}
