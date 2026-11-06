// Cosmetic in-room errands; never writes agent status or saved placements.
const AgentMotion=(()=>{
 const limits={lead:[142,338,501,452],second:[539,327,722,367],clerk:[541,406,750,471],observatory:[785,380,1252,466],engine:[137,572,457,650],data:[490,572,711,650],training:[741,586,977,650],music:[999,584,1244,649],doctor:[136,742,328,800],review:[349,735,594,804],operations:[608,783,946,808],queue:[976,779,1242,808]};
 const actors=new Map();let clock=0,enabled=true;
 try{enabled=localStorage.getItem('nebula-agent-roaming')!=='0';}catch{}
 const hash=s=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,17);
 function get(m,c){const signature=[c.room,c.x,c.y,c.seatId].join(':');let r=actors.get(m.id);if(!r||r.signature!==signature){r={id:m.id,signature,x:c.x,y:c.y,dir:c.facing,seed:hash(m.id),path:[],step:0,next:clock+.7+(hash(m.id)%37)/10,state:null,docked:false,returning:false,blocked:0,trip:0};actors.set(m.id,r);}return r;}
 function inRoom(c,p){const b=limits[c.room];return p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3];}
 function segment(f,a,b){const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])));for(let i=0;i<=n;i++)if(!stand(f,a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n))return false;return true;}
 function route(r,c,f,target){if(!stand(f,r.x,r.y)||!stand(f,...target)||!inRoom(c,target))return null;if(segment(f,[r.x,r.y],target))return[target];const p=Seating.findPath(f,[r.x,r.y],target);if(!p||!p.every(q=>inRoom(c,q)))return null;let previous=[r.x,r.y];for(const q of p){if(!segment(f,previous,q))return null;previous=q;}return p;}
 function wander(r,c,f){let fallback=null;r.trip++;for(let i=0;i<10;i++){const angle=((r.seed%628)/100+r.trip*1.71+i*2.399),distance=16+(r.seed+i*7+r.trip*11)%27,p=[c.x+Math.cos(angle)*distance,c.y+Math.sin(angle)*distance*.65];if(!inRoom(c,p)||!stand(f,...p)||Math.hypot(p[0]-r.x,p[1]-r.y)<10)continue;if(segment(f,[r.x,r.y],p))return[p];fallback||=p;}return fallback?route(r,c,f,fallback):null;}
 function tick(dt,members,config,presence,rooms,controlled){if(!Portal.info().enabled||mode!=='walk'||document.hidden)return;clock+=dt;const ids=new Set(members.map(m=>m.id));for(const id of actors.keys())if(!ids.has(id))actors.delete(id);
  for(const m of members){const c=config(m.id);if(!c||!c.visible||m.id===controlled)continue;const r=get(m,c),state=presence(m),f=rooms[c.room][1];if(state!==r.state){r.path=[];r.returning=false;r.docked=false;r.blocked=0;r.state=state;if(state==='running')r.next=clock;else r.next=Math.min(r.next,clock+1+(r.seed%20)/10);}
   if(!['idle','waiting','running'].includes(state)){r.path=[];continue;}
   if(state==='running'&&!r.path.length&&!r.docked&&clock>=r.next){const seat=seats.find(s=>s.id===c.seatId&&s.floor===f),target=seat?seat.approach:[c.x,c.y];if(Math.hypot(r.x-target[0],r.y-target[1])<2)r.docked=true;else{r.path=route(r,c,f,target)||[];r.returning=!!r.path.length;r.next=clock+3;}}
   if(state!=='running'&&(!enabled||c.wander===false)){r.path=[];continue;}
   if(state!=='running'&&!r.path.length&&clock>=r.next){r.path=wander(r,c,f)||[];r.returning=false;r.next=clock+(state==='waiting'?9:4)+(r.seed+r.trip*7)%6;}
   if(!r.path.length)continue;while(r.path.length&&Math.hypot(r.path[0][0]-r.x,r.path[0][1]-r.y)<.6)r.path.shift();if(!r.path.length){r.docked=state==='running';r.returning=false;r.dir=c.facing;continue;}
   const target=r.path[0],dx=target[0]-r.x,dy=target[1]-r.y,d=Math.hypot(dx,dy),speed=(state==='waiting'?22:31)*scale(f,r.x,r.y),step=Math.min(d,speed*dt),n=Math.max(1,Math.ceil(step));let advanced=0;
   for(let i=0;i<n;i++){const x=r.x+dx/d*step/n,y=r.y+dy/d*step/n;const occupied=members.some(other=>{if(other.id===m.id||other.id===controlled)return false;const oc=config(other.id),o=actors.get(other.id);return oc?.visible&&rooms[oc.room][1]===f&&Math.hypot(x-(o?.x??oc.x),y-(o?.y??oc.y))<5;})||(player.floor===f&&Math.hypot(x-player.x,y-player.y)<6);if(!stand(f,x,y)||occupied)break;r.x=x;r.y=y;advanced++;}
   if(advanced){r.step+=dt;r.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';r.blocked=0;}else{r.blocked+=dt;if(r.blocked>1.2){r.path=[];r.returning=false;r.next=clock+1.3;r.blocked=0;}}
  }
 }
 function setEnabled(value){enabled=value;try{localStorage.setItem('nebula-agent-roaming',value?'1':'0');}catch{}if(!value)for(const r of actors.values())if(!r.returning)r.path=[];}
 return{get,tick,reset:()=>actors.clear(),setEnabled,enabled:()=>enabled,info:()=>({enabled,clock,actors:[...actors.values()].map(r=>({id:r.id,x:r.x,y:r.y,walking:!!r.path.length,returning:r.returning,docked:r.docked,state:r.state}))})};
})();
