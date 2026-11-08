const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),path.resolve(__dirname,'../../AgentPixelsEngine')]}));
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:1050}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8790/review/illustrated-walk/index.html?start=training&zoom=3');await p.waitForFunction(()=>window.__walk?.ready);
 const r=await p.evaluate(()=>{
  view.follow=false;Camera.move(850,600);Camera.settle();const initial={...view};Camera.move(550,600);setZoom(4);const immediate={...view};Camera.tick(1/60);const first={...view};for(let i=0;i<180;i++)Camera.tick(1/60);const final={...view};
  function atRate(n){view.follow=false;Camera.move(600,600);setZoom(3);Camera.settle();Camera.move(850,650);setZoom(4);for(let i=0;i<n;i++)Camera.tick(1/n);return{...view};}const hz30=atRate(30),hz120=atRate(120);
  Camera.move(750,600);setZoom(3);Camera.settle();const rect=canvas.getBoundingClientRect(),e={clientX:rect.left+rect.width*.57,clientY:rect.top+rect.height*.53},before=worldPoint(e);setZoom(4,e);const anchors=[];for(let i=0;i<40;i++){Camera.tick(1/60);anchors.push(worldPoint(e));}
  const preFocus={...view};WorldHUD.focus('engine');const focusImmediate={...view};for(let i=0;i<180;i++)Camera.tick(1/60);const focusFinal={...view};view.follow=false;Camera.move(W/2,H/2);setZoom(Camera.fitZoom());const fitImmediate={...view};for(let i=0;i<180;i++)Camera.tick(1/60);const fitFinal={...view};
  return{initial,immediate,first,final,hz30,hz120,before,anchors,preFocus,focusImmediate,focusFinal,fitImmediate,fitFinal,dirty:__walk.dirty,counts:[Object.keys(edits).length,masks.length,seats.length,screens.length]};
 });
 assert.equal(r.immediate.x,r.initial.x);assert.equal(r.immediate.zoom,3);assert.ok(r.first.x<r.initial.x&&r.first.x>550);assert.ok(r.first.zoom>3&&r.first.zoom<4);assert.ok(Math.abs(r.final.x-550)<.01);assert.equal(r.final.zoom,4);
 for(const k of ['x','y','zoom'])assert.ok(Math.abs(r.hz30[k]-r.hz120[k])<.001,'Frame rate independent '+k);
 assert.ok(r.anchors.every(a=>Math.hypot(a[0]-r.before[0],a[1]-r.before[1])<.001),'Zoom remains anchored under pointer');
 assert.equal(r.focusImmediate.x,r.preFocus.x);assert.ok(Math.abs(r.focusFinal.x-r.preFocus.x)>100);assert.ok(r.fitImmediate.zoom>1);assert.equal(r.fitFinal.zoom,1);assert.ok(Math.abs(r.fitFinal.x-724)<.01);assert.ok(Math.abs(r.fitFinal.y-543)<.01);
 assert.equal(r.dirty,false);assert.deepEqual(r.counts,[599,32,6,42]);assert.deepEqual(errors,[]);
 // Exercise actual drag input, including its easing after pointer release.
 await p.evaluate(()=>{view.follow=false;Camera.move(750,600);setZoom(3);Camera.settle();});const box=await p.locator('#canvas').boundingBox();
 await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down({button:'right'});await p.mouse.move(box.x+box.width/2+100,box.y+box.height/2);await p.mouse.up({button:'right'});await p.waitForFunction(()=>Math.abs(view.x-Camera.target.x)<1,{},{timeout:5000});const drag=await p.evaluate(()=>({view:{...view},target:Camera.target}));assert.ok(drag.view.x<750);assert.ok(Math.abs(drag.view.x-drag.target.x)<1);
 console.log('PASS eased zoom/pan/focus/Fit, pointer anchoring, 30/120 Hz equivalence, unchanged saved map');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
