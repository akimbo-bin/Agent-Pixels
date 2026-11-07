// Cosmetic errands and shared-elevator visits; never writes agent status or saved placements.
const AgentMotion=(()=>{
 const limits={lead:[142,338,501,452],second:[539,327,722,367],clerk:[541,406,750,471],observatory:[785,380,1252,466],engine:[137,572,457,650],data:[490,572,711,650],training:[741,586,977,650],music:[999,584,1244,649],doctor:[136,742,328,800],review:[349,735,594,804],operations:[608,783,946,808],queue:[976,779,1242,808]};
 const homeFloor=c=>['lead','second','clerk','observatory'].includes(c.room)?'upper':['engine','data','training','music'].includes(c.room)?'middle':'ground';
 const actors=new Map();let clock=0,enabled=true;
 try{enabled=localStorage.getItem('nebula-agent-roaming')!=='0';}catch{}
 const hash=s=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,17);
 function get(m,c){const signature=[c.room,c.x,c.y,c.seatId].join(':');let r=actors.get(m.id);if(!r||r.signature!==signature){r={id:m.id,signature,x:c.x,y:c.y,floor:homeFloor(c),visit:null,visitAt:clock+20+hash(m.id)%80,dir:c.facing,seed:hash(m.id),path:[],step:0,next:clock+.7+(hash(m.id)%37)/10,state:null,docked:false,returning:false,blocked:0,trip:0};const ride=Lift.npcPose(m.id);if(ride){r.floor=ride.floor;r.x=ride.x;r.y=ride.y;r.visit={floor:homeFloor(c),x:c.x,y:c.y,room:c.room,home:true,phase:'waiting'};}actors.set(m.id,r);}return r;}
 function inRoom(c,p){const b=limits[c.room];return p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3];}
 function segment(f,a,b){const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])));for(let i=0;i<=n;i++)if(!stand(f,a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n))return false;return true;}
 function route(r,c,f,target,local=true){if(!stand(f,r.x,r.y)||!stand(f,...target)||local&&!inRoom(c,target))return null;if(segment(f,[r.x,r.y],target))return[target];const p=Seating.findPath(f,[r.x,r.y],target);if(!p||local&&!p.every(q=>inRoom(c,q)))return null;let previous=[r.x,r.y];for(const q of p){if(!segment(f,previous,q))return null;previous=q;}return p;}
 function wander(r,c,f){let fallback=null;r.trip++;for(let i=0;i<10;i++){const angle=((r.seed%628)/100+r.trip*1.71+i*2.399),distance=16+(r.seed+i*7+r.trip*11)%27,p=[c.x+Math.cos(angle)*distance,c.y+Math.sin(angle)*distance*.65];if(!inRoom(c,p)||!stand(f,...p)||Math.hypot(p[0]-r.x,p[1]-r.y)<10)continue;if(segment(f,[r.x,r.y],p))return[p];fallback||=p;}return fallback?route(r,c,f,fallback):null;}
 function go(r,c,goal){const p=goal.floor===r.floor?[goal.x,goal.y]:floors[r.floor].lift,path=route(r,c,r.floor,p,false);if(!path)return false;r.visit={...goal,phase:goal.floor===r.floor?'walking':'to-lift'};r.path=path;r.docked=false;return true;}
 function visit(r,c,rooms){const candidates=Object.entries(rooms).filter(([id,v])=>id!==c.room&&v[1]!==r.floor);for(let i=0;i<candidates.length;i++){const [room,v]=candidates[(r.seed+r.trip+i)%candidates.length];const points=[v[2],floors[v[1]].spawn];for(const [x,y]of points)if(stand(v[1],x,y)&&route({...r,x:floors[v[1]].lift[0],y:floors[v[1]].lift[1]},c,v[1],[x,y],false)&&go(r,c,{floor:v[1],x,y,room,home:false}))return true;}return false;}
 function home(r,c){return go(r,c,{floor:homeFloor(c),x:c.x,y:c.y,room:c.room,home:true});}
 function tripTick(r,c,state,dt){const trip=r.visit;if(!trip)return false;
  const ride=Lift.npcPose(r.id);if(ride){r.x=ride.x;r.y=ride.y;r.floor=ride.floor;r.path=[];r.dir=ride.state==='boarding'?'up':'down';r.step+=dt;if(ride.state==='arrived'){Lift.cancelNpc(r.id);const goal=state==='running'?{floor:homeFloor(c),x:c.x,y:c.y,room:c.room,home:true}:trip;r.visit=null;if(!go(r,c,goal)){r.next=clock+3;r.visit={...goal,phase:'retry'};}}return true;}
  if(trip.phase==='waiting'){Lift.requestNpc(r.id,r.floor,trip.floor);return true;}
  if(trip.phase==='retry'){if(clock>=r.next){r.next=clock+5;go(r,c,trip);}return true;}
  if(state==='running'&&!trip.home){r.path=[];r.visit=null;if(!home(r,c)){r.visit={floor:homeFloor(c),x:c.x,y:c.y,room:c.room,home:true,phase:'retry'};r.next=clock+3;}return true;}
  if(trip.phase==='resting'){if(clock>=r.next&&enabled&&c.wander!==false||state==='running'){r.visit=null;if(!home(r,c)){r.visit={floor:homeFloor(c),x:c.x,y:c.y,room:c.room,home:true,phase:'retry'};r.next=clock+3;}}return true;}
  if(!r.path.length){if(trip.phase==='to-lift'){trip.phase='waiting';Lift.requestNpc(r.id,r.floor,trip.floor);}else{if(trip.home){r.visit=null;r.docked=state==='running';r.visitAt=clock+80+r.seed%60;}else{trip.phase='resting';r.next=clock+10+r.seed%12;}}return true;}
  return false;
 }
 function tick(dt,members,config,presence,rooms,controlled){if(!Portal.info().enabled||mode!=='walk'||document.hidden)return;clock+=dt;const ids=new Set(members.map(m=>m.id));for(const id of actors.keys())if(!ids.has(id)){Lift.cancelNpc(id);actors.delete(id);}
  for(const m of members){const c=config(m.id);if(!c||!c.visible||m.id===controlled)continue;const r=get(m,c),state=presence(m);let f=r.floor;if(state!==r.state){if(!r.visit)r.path=[];r.returning=false;r.docked=false;r.blocked=0;r.state=state;if(state==='running')r.next=clock;else r.next=Math.min(r.next,clock+1+(r.seed%20)/10);}
   if(r.visit&&state!=='running'&&(!enabled||c.wander===false)){const ride=Lift.npcPose(r.id);if(!ride||ride.state==='waiting'||ride.state==='arrived'){Lift.cancelNpc(r.id);r.path=[];r.visit.phase='retry';r.next=clock;continue;}}
   if(r.visit&&Lift.npcPose(r.id)&&tripTick(r,c,state,dt))continue;
   if(!['idle','waiting','paused','running'].includes(state)){r.path=[];continue;}
   if(r.visit&&tripTick(r,c,state,dt))continue;f=r.floor;
   if(!r.visit&&state==='running'&&f!==homeFloor(c)){home(r,c);continue;}
   if(!r.visit&&state!=='running'&&enabled&&c.wander!==false&&clock>=r.visitAt){r.visitAt=clock+80+r.seed%60;r.trip++;visit(r,c,rooms);}
   if(!r.visit&&state==='running'&&!r.path.length&&!r.docked&&clock>=r.next){const seat=seats.find(s=>s.id===c.seatId&&s.floor===f),target=seat?seat.approach:[c.x,c.y];if(Math.hypot(r.x-target[0],r.y-target[1])<2)r.docked=true;else{r.path=route(r,c,f,target)||[];r.returning=!!r.path.length;r.next=clock+3;}}
   if(!r.visit&&state!=='running'&&(!enabled||c.wander===false)){r.path=[];continue;}
   if(!r.visit&&state!=='running'&&!r.path.length&&clock>=r.next){r.path=wander(r,c,f)||[];r.returning=false;r.next=clock+(state==='waiting'?9:4)+(r.seed+r.trip*7)%6;}
   if(!r.path.length)continue;while(r.path.length&&Math.hypot(r.path[0][0]-r.x,r.path[0][1]-r.y)<.6)r.path.shift();if(!r.path.length){r.docked=state==='running'&&!r.visit;r.returning=false;r.dir=c.facing;continue;}
   const target=r.path[0],dx=target[0]-r.x,dy=target[1]-r.y,d=Math.hypot(dx,dy),speed=(state==='waiting'?22:31)*scale(f,r.x,r.y),step=Math.min(d,speed*dt),n=Math.max(1,Math.ceil(step));let advanced=0;
   for(let i=0;i<n;i++){const x=r.x+dx/d*step/n,y=r.y+dy/d*step/n;const occupied=members.some(other=>{if(other.id===m.id||other.id===controlled)return false;const oc=config(other.id),o=actors.get(other.id);return oc?.visible&&(o?.floor||rooms[oc.room][1])===f&&Math.hypot(x-(o?.x??oc.x),y-(o?.y??oc.y))<5;})||(player.floor===f&&Math.hypot(x-player.x,y-player.y)<6);if(!stand(f,x,y)||occupied)break;r.x=x;r.y=y;advanced++;}
   if(advanced){r.step+=dt;r.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';r.blocked=0;}else{r.blocked+=dt;if(r.blocked>1.2){const goal=r.path.at(-1);r.path=goal?route(r,c,f,goal,!r.visit)||[]:[];if(!r.path.length&&r.visit){r.visit.phase='retry';r.next=clock+3;}else r.next=clock+1.3;r.returning=false;r.blocked=0;}}
  }
 }
 function setEnabled(value){enabled=value;try{localStorage.setItem('nebula-agent-roaming',value?'1':'0');}catch{}if(!value)for(const r of actors.values())if(!r.returning&&!r.visit)r.path=[];}
 return{get,tick,reset:()=>{for(const id of actors.keys()){const ride=Lift.npcPose(id);if(ride&&['waiting','arrived'].includes(ride.state))Lift.cancelNpc(id);}actors.clear();},setEnabled,enabled:()=>enabled,info:()=>({enabled,clock,actors:[...actors.values()].map(r=>({id:r.id,x:r.x,y:r.y,floor:r.floor,visit:r.visit?{...r.visit}:null,walking:!!r.path.length,returning:r.returning,docked:r.docked,state:r.state}))})};
})();
