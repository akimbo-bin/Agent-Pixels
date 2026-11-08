const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),path.resolve(__dirname,'../../AgentPixelsEngine')]}));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 async function load(){await p.goto('http://127.0.0.1:8790/review/illustrated-walk/index.html?rev=agent-elevator');await p.waitForFunction(()=>window.__walk?.ready&&__walk.characters.count>0);}
 await load();
 const roaming=await p.evaluate(()=>{
  const conf={room:'training',x:850,y:640,facing:'down',seatId:'',visible:true,wander:true},m={id:'qa-paused'},rooms={training:['Training','middle',[850,640]],clerk:['Clerk','upper',[740,460]],queue:['Queue','ground',[1105,800]]};
  AgentMotion.setEnabled(true);const actor=AgentMotion.get(m,conf),origin=[actor.x,actor.y],stages=new Set(),changedFloors=[],invalid=[],phases=new Set();let state='paused',visited=false,returned=false;
  for(let i=0;i<16000;i++){
   const oldFloor=actor.floor;Lift.tick(.05);AgentMotion.tick(.05,[m],()=>conf,()=>state,rooms,null);phases.add(Lift.info().phase);if(actor.visit)stages.add(actor.visit.phase);
   if(actor.floor!==oldFloor)changedFloors.push({from:oldFloor,to:actor.floor,phase:Lift.info().phase});
   if(actor.floor!=='middle'){visited=true;state='running';}
   if(visited&&actor.floor==='middle'&&actor.docked){returned=true;break;}
   if(!Lift.npcPose(m.id)&&!stand(actor.floor,actor.x,actor.y))invalid.push([actor.floor,actor.x,actor.y]);
  }
  const final={...actor};AgentMotion.reset();const c2={...conf,wander:false},m2={id:'qa-no-wander'},still=AgentMotion.get(m2,c2);for(let i=0;i<1000;i++)AgentMotion.tick(.05,[m2],()=>c2,()=> 'paused',rooms,null);
  return{origin,final,visited,returned,stages:[...stages],phases:[...phases],changedFloors,invalid,still:[still.x,still.y],dirty:__walk.dirty};
 });
 assert.ok(roaming.visited&&roaming.returned,'Paused agent should visit another floor and return home when work starts');assert.equal(roaming.final.state,'running');assert.ok(roaming.final.workSeatId==='training-front'&&Math.hypot(roaming.final.x-785,roaming.final.y-641)<3||Math.hypot(roaming.final.x-850,roaming.final.y-640)<3);assert.deepEqual(roaming.invalid,[],'All walking remains on authored walkable areas');assert.deepEqual(roaming.still,[850,640]);assert.equal(roaming.dirty,false);assert.ok(roaming.changedFloors.every(c=>c.phase==='opening'),'Floor changes happen on elevator arrival');for(const phase of ['boarding','closing','moving','opening','exiting'])assert.ok(roaming.phases.includes(phase),phase);
 await load();
 const rides=await p.evaluate(()=>{
  player={...starts.entry,dir:'down',step:0};Lift.requestNpc('up','ground','upper');Lift.requestNpc('down','upper','middle');const states={},arrivals=[],bad=[];
  for(let i=0;i<2000;i++){Lift.tick(.05);for(const id of ['up','down']){const r=Lift.npcPose(id);if(r){(states[id]??=new Set()).add(r.state);if(r.state==='arrived'&&!arrivals.includes(id))arrivals.push(id);}}
   const info=Lift.info();if(info.phase==='moving'&&Object.values(info.doors).some(n=>n!==0))bad.push(info.phase);if(arrivals.length===2)break;
  }
  const poses=['up','down'].map(id=>Lift.npcPose(id));return{states:Object.fromEntries(Object.entries(states).map(([id,s])=>[id,[...s]])),arrivals,poses,bad,player:{...player}};
 });
 assert.deepEqual(rides.arrivals,['up','down']);assert.deepEqual(rides.poses.map(r=>r.floor),['upper','middle']);assert.deepEqual(rides.bad,[]);for(const id of ['up','down'])for(const s of ['waiting','boarding','moving','opening','exiting','arrived'])assert.ok(rides.states[id].includes(s),id+' '+s);assert.equal(rides.player.floor,'ground');assert.equal(rides.player.y,997);
 await load();
 const priority=await p.evaluate(()=>{
  player={floor:'ground',x:1300,y:799,dir:'up',step:0};Lift.call('ground');Lift.requestNpc('queued','middle','upper');for(let i=0;i<400&&!Lift.ready();i++)Lift.tick(.05);const ready=Lift.ready();Lift.choose('upper');const boarded=Lift.hasPassenger();let shared=false;for(let i=0;i<1200;i++){Lift.tick(.05);if(Lift.hasPassenger()&&Lift.info().npcPassenger)shared=true;if(!Lift.hasPassenger()&&Lift.npcPose('queued')?.state==='arrived')break;}return{ready,boarded,shared,floor:player.floor,npc:Lift.npcPose('queued'),info:Lift.info()};
 });
 assert.ok(priority.ready&&priority.boarded);assert.equal(priority.shared,false);assert.equal(priority.floor,'upper');assert.equal(priority.npc.state,'arrived');
 // Real rendered roster keeps Paused status while displaying walking frames and labels.
 const live=await(await p.request.get('http://127.0.0.1:8790/live')).json();for(const a of live.org.paperclip.agents){a.status='paused';a.issue=null;}live.org.paperclip.exportedAt=new Date().toISOString();await p.route('**/live',r=>r.fulfill({json:live}));await load();
 const tags=await p.evaluate(()=>{WorldHUD.focus('training');Camera.settle();let walking;for(let i=0;i<240;i++){Characters.tick(.1);walking=Characters.info().agents.find(a=>a.pose.activity==='Walking'&&a.pose.col!==3);if(walking)break;}if(walking){view.follow=false;Camera.move(walking.pose.x,walking.pose.y);Camera.settle();}render();return{agents:Characters.info().agents,dirty:__walk.dirty,counts:[Object.keys(edits).length,masks.length,seats.length,screens.length],labels:[...document.querySelectorAll('.agent-tag-state')].filter(e=>!e.hidden).map(e=>e.textContent)};});
 assert.ok(tags.agents.every(a=>a.presence==='paused'),'Walking must preserve Paused live status');assert.ok(tags.agents.some(a=>a.pose.activity==='Walking'&&a.pose.col!==3),'Paused agents should use walk frames');assert.ok(tags.labels.some(s=>s==='Walking'),'Name tags should describe walking');assert.equal(tags.dirty,false);assert.deepEqual(tags.counts,[599,32,6,42]);await p.screenshot({path:path.resolve('artifacts/illustrated-map/paused-agents-roaming.png')});
 assert.deepEqual(errors,[]);console.log('PASS Paused roaming, collision-safe cross-floor visit and Working return, shared queued elevator rides on all floors, doors closed in transit, player priority, no saved map changes');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
