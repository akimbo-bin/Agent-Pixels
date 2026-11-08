const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),path.resolve('../AgentPixelsEngine')]}));
const base=process.env.DASHBOARD_URL||'http://127.0.0.1:8792';
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const live=await(await p.request.get(base+'/live')).json();for(const a of live.org.paperclip.agents){a.status='paused';a.issue=null;}live.org.paperclip.exportedAt=new Date().toISOString();
 await p.route('**/live',r=>r.fulfill({json:live}));await p.route('**/api/handoffs',r=>r.fulfill({json:{visualOnly:true,events:[]}}));
 async function load(){await p.goto(base+'/');await p.waitForFunction(()=>__walk.ready&&__walk.characters.count===14);}
 await load();
 for(const sender of ['Lead-Sol','Builder-Luna-P']){
  await load();
  const result=await p.evaluate(sender=>{
   const m=Characters.info().agents.find(a=>a.name===sender);if(!m)throw Error('Missing sender '+sender);
   const stable=()=>{const s=snapshot();delete s.savedAt;return JSON.stringify(s);},initial=stable(),stages=new Set(),rides=new Set(),bad=[];let done=false,peak=0,frames={};
   // Keep unrelated actors local while exercising the real courier and lift controllers.
   for(const a of Characters.info().agents){const r=AgentMotion.get(a,characterOverrides[a.id]);r.visitAt=1e8;r.next=1e8;r.path=[];}
   setMode('handoffs');const select=document.querySelector('#handoff-agent');select.value=m.id;select.dispatchEvent(new Event('change'));Paperwork.preview();
   for(let i=0;i<9000;i++){
    Lift.tick(.05);Characters.tick(.05);Paperwork.tick();
    const info=Paperwork.info(),item=info.items.find(e=>e.preview),r=AgentMotion.get(m,characterOverrides[m.id]);
    if(item){stages.add(item.stage);if(!frames[item.stage]&&['pickup','carrying','drop','delivered'].includes(item.stage)){if(item.stage==='carrying'){Camera.move(r.x,r.y);setZoom(5);view.follow=false;Camera.settle();render();window.paperShot=canvas.toDataURL();}frames[item.stage]=Characters.info().agents.find(a=>a.id===m.id).pose.action;}}
    const ride=Lift.npcPose(m.id);if(ride)rides.add(ride.state);
    peak=Math.max(peak,Lift.info().npcTrips.filter(t=>t.state!=='arrived').length);
    if(!ride&&!stand(r.floor,r.x,r.y))bad.push([r.floor,r.x,r.y]);
    if(item?.stage==='delivered'&&!info.active&&!r.visit?.deliveryId){done=true;break;}
   }
   render();return{done,stages:[...stages],rides:[...rides],bad,peak,frames,items:Paperwork.info().items,actor:AgentMotion.info().actors.find(a=>a.id===m.id),unchanged:initial===stable()};
  },sender);
  if(sender==='Lead-Sol'){const shot=await p.evaluate(()=>window.paperShot);require('node:fs').writeFileSync('artifacts/illustrated-map/paperwork-carry.png',Buffer.from(shot.split(',')[1],'base64'));}console.log(sender,JSON.stringify({done:result.done,stages:result.stages,rides:result.rides,unchanged:result.unchanged}));assert.ok(result.done,'Delivery completes');for(const s of ['collecting','pickup','waiting-route','carrying','drop','delivered'])assert.ok(result.stages.includes(s),s);assert.deepEqual(result.bad,[]);assert.ok(result.peak<=1);assert.equal(result.frames.carrying,'papers');assert.equal(result.actor.visit?.home,true);assert.equal(result.items.length,1);assert.equal(result.unchanged,true,'Delivery never edits map data');
  if(sender==='Builder-Luna-P')for(const s of ['boarding','moving','opening','exiting'])assert.ok(result.rides.includes(s),s);
 }
 await load();
 const saved=await p.evaluate(()=>{setMode('handoffs');const id=Paperwork.info().selectedSource,before=snapshot(),a=Paperwork.anchor(id);document.querySelector('#handoff-source-x').value=a.drop[0]+2;document.querySelector('#handoff-source-x').dispatchEvent(new Event('change'));const after=checked(snapshot());document.querySelector('#undo').click();const undone=!handoffPoints[id];document.querySelector('#redo').click();return{before:[Object.keys(before.overrides).length,before.masks.length,before.seats.length,before.screens.length],after:[Object.keys(after.overrides).length,after.masks.length,after.seats.length,after.screens.length],point:after.handoffPoints[id],undone,redo:handoffPoints[id]};});
 assert.deepEqual(saved.before,saved.after);assert.ok(saved.undone);assert.deepEqual(saved.point,saved.redo);
 await p.setViewportSize({width:390,height:844});await p.locator('#handoff-source-x').focus();await p.setViewportSize({width:390,height:500});await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>document.activeElement.id),'handoff-source-x');
 assert.deepEqual(errors,[]);console.log('PASS same-floor and elevator report delivery, pickup/carry/drop poses, bounded lift traffic, authored collision map, editor undo/redo and mobile focus');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
