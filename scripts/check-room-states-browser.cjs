const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),path.resolve(__dirname,'../../AgentPixelsEngine')]}));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const p=await browser.newPage({viewport:{width:997,height:985}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:8790/review/illustrated-walk/index.html';
 const live=await(await p.request.get('http://127.0.0.1:8790/live')).json();
 // Isolate agent aggregation from independent real training/render jobs.
 for(const id of ['nebula.training','paperclip.renders.vm116'])if(live.tasks[id])live.tasks[id]={...live.tasks[id],state:'idle',updatedAt:Date.now()};
 const roster=live.org.paperclip.agents;
 for(const a of roster){a.status='idle';a.issue=null;}
 const data=roster.find(a=>a.name==='Data'),training=roster.find(a=>a.name==='Training');
 const work=a=>a.issue={key:'QA',title:'Browser-only room aggregation fixture',running:true};
 work(data);live.org.paperclip.exportedAt=new Date().toISOString();
 await p.route('**/live',r=>r.fulfill({json:live}));
 await p.goto(base+'?mode=characters&rev=unified-room-state');
 await p.waitForFunction(()=>window.__walk?.ready&&__walk.characters.count>0);
 await p.selectOption('#character-list',data.id);
 await p.selectOption('#character-room','training');
 await p.click('#save');
 async function assertRoom(state,count){
  await p.waitForFunction(({state,count})=>__walk.rooms.training.state===state&&__walk.rooms.training.workingAgents===count,{state,count});
  assert.equal(await p.evaluate(()=>__walk.lighting.rooms.training.state),state);
  assert.equal(await p.evaluate(()=>__walk.lighting.rooms.training.effectState),state);
  assert.ok((await p.evaluate(()=>__walk.hardware.devices.filter(d=>d.room==='training'))).every(d=>d.state===state));
  assert.equal(await p.evaluate(()=>Screens.roomStates().training),state);
  await p.waitForFunction(state=>document.querySelector('[data-room-state="training"]').textContent.toLowerCase().startsWith(state),state);
 }
 async function refresh(){await p.evaluate(()=>document.querySelector('#character-refresh').click());}
 await assertRoom('working',1);
 assert.equal(await p.evaluate(()=>__walk.rooms.training.agentCount),2);
 work(training);await refresh();await assertRoom('working',2);
 data.issue=null;await refresh();await assertRoom('working',1);
 training.issue=null;await refresh();await assertRoom('idle',0);
 // A running heartbeat need not have a linked Paperclip issue.
 training.status='running';await refresh();await assertRoom('working',1);
 training.status='idle';await refresh();await assertRoom('idle',0);
 // Independent compute jobs energize the room even when the agent is idle.
 live.tasks['nebula.training']={id:'nebula.training',state:'running',updatedAt:Date.now()};
 await refresh();await assertRoom('working',0);
 live.tasks['nebula.training'].state='idle';await refresh();await assertRoom('idle',0);
 await p.click('#lighting-toggle');
 assert.equal(await p.locator('#lighting-panel select').count(),2,'One room selector and one shared state selector only');
 await p.selectOption('#room-preview-room','training');
 await p.selectOption('#room-preview-state','working');
 await assertRoom('working',0);
 assert.equal(await p.evaluate(()=>__walk.rooms.training.liveState),'idle');
 assert.equal(await p.evaluate(()=>__walk.rooms.training.preview),true);
 assert.ok((await p.locator('[data-room-state="training"]').textContent()).includes('Preview'));
 await p.waitForFunction(()=>document.querySelector('#hud-working-caption').textContent.includes('preview'));
 work(data);await refresh();await assertRoom('working',1);
 await p.selectOption('#room-preview-state','idle');await assertRoom('idle',1);
 assert.equal(await p.evaluate(()=>__walk.rooms.training.liveState),'working');
 await p.selectOption('#room-preview-state','live');await assertRoom('working',1);
 await p.click('#lighting-close');
 await p.click('#hud-rooms');await p.click('[data-hud-room="training"]');
 await p.waitForTimeout(350);
 await p.screenshot({path:path.resolve(__dirname,'../artifacts/illustrated-map/unified-training-working.png')});
 assert.equal(await p.evaluate(()=>__walk.dirty),false,'Live updates and previews must not dirty saved map data');
 assert.equal(await p.evaluate(()=>Object.keys(__walk.edits).length),599);
 assert.deepEqual(errors,[]);
 await browser.close();
 console.log('PASS real bridge with browser-only fixtures: two-agent aggregation, last-worker stop, lighting/hardware/screen/HUD agreement, one preview control, preview/live separation, saved grid unchanged');
})().catch(e=>{console.error(e);process.exit(1)});
