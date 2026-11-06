// One authority for live room activity and cosmetic preview overrides.
function createRoomStateStore(now=()=>Date.now()){
 const names={lead:'Lead Main',second:'Lead Second',clerk:'Admin / Clerk',observatory:'Observatory',engine:'Engine',data:'Data',training:'Training',music:'Music Studio',doctor:'Doctor',review:'Review',operations:'Operations',queue:'Ticket Queue'};
 let agents=new Map(),agentUpdated=0,agentAvailable=false,revision=0,lastPublish='';const signals=new Map(),previews=new Map();
 const validState=state=>['idle','working'].includes(state);
 const agentStates=new Set(['working','running','idle','waiting','paused','failed','error','unknown']);
 function updateAgents(readings,meta={}){if(!Array.isArray(readings)||readings.length>500)return false;const next=new Map();for(const a of readings){if(!a||typeof a.id!=='string'||!Object.hasOwn(names,a.room)||!agentStates.has(a.state)||next.has(a.id))return false;next.set(a.id,{id:a.id,room:a.room,state:a.state,name:String(a.name||a.id)});}const stamp=meta.updatedAt??now();if(!Number.isFinite(stamp))return false;agents=next;agentUpdated=stamp;agentAvailable=meta.available!==false;revision++;return true;}
 function markAgentsStale(){agentAvailable=false;revision++;}
 function setRoomState(room,state,meta={}){const updatedAt=meta.updatedAt??now(),ttl=meta.ttl??30000;if(!Object.hasOwn(names,room)||!validState(state)||!Number.isFinite(updatedAt)||!Number.isFinite(ttl)||ttl<1000||ttl>300000)return false;signals.set(room,{state,updatedAt,ttl,available:meta.available!==false});revision++;return true;}
 function setPreview(room,mode){if(!Object.hasOwn(names,room)||!['live','idle','working'].includes(mode))return false;if(mode==='live')previews.delete(room);else previews.set(room,mode);revision++;return true;}
 function clearPreviews(){previews.clear();revision++;}
 function get(room){if(!Object.hasOwn(names,room))return null;const stamp=now(),rosterFresh=agentAvailable&&stamp-agentUpdated<=30000,assigned=[...agents.values()].filter(a=>a.room===room),working=rosterFresh?assigned.filter(a=>['working','running'].includes(a.state)):[],signal=signals.get(room),signalFresh=!!signal&&signal.available&&stamp-signal.updatedAt<=signal.ttl,liveState=working.length||signalFresh&&signal.state==='working'?'working':'idle',mode=previews.get(room)||'live';return{id:room,name:names[room],state:mode==='live'?liveState:mode,liveState,mode,preview:mode!=='live',available:rosterFresh||signalFresh,agentCount:assigned.length,workingAgents:working.length,agentIds:assigned.map(a=>a.id),workingAgentIds:working.map(a=>a.id),agents:assigned.map(a=>({...a})),source:mode!=='live'?'preview':working.length?'agents':signalFresh?'room-feed':rosterFresh?'agents':'unavailable'};}
 function snapshot(){return Object.fromEntries(Object.keys(names).map(id=>[id,get(id)]));}
 function states(){return Object.fromEntries(Object.keys(names).map(id=>[id,get(id).state]));}
 function previewStates(){return Object.fromEntries(Object.keys(names).map(id=>[id,previews.get(id)||'live']));}
 function tick(){if(typeof Screens==='undefined')return;const all=snapshot(),key=JSON.stringify(all);if(key===lastPublish)return;lastPublish=key;for(const[id,r]of Object.entries(all))Screens.setData('nebula.room.'+id,{title:r.name,value:r.available?r.workingAgents:'—',unit:r.available?'working agents':'',status:(r.state==='working'?'Working':'Idle')+(r.preview?' · Preview':r.available?'':' · Stale'),lines:[r.agents.map(a=>a.name+' · '+(r.available?a.state:'unknown')).join(' | ')]});}
 return{updateAgents,markAgentsStale,setRoomState,setPreview,clearPreviews,get,state:id=>get(id)?.state||'idle',snapshot,states,previewStates,tick,revision:()=>revision,roomEntries:()=>Object.entries(names)};
}
const RoomStates=createRoomStateStore();
if(typeof module!=='undefined'&&module.exports)module.exports={createRoomStateStore};
