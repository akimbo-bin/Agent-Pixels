const path=require('node:path');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),path.resolve(__dirname,'../../AgentPixelsEngine')]}));
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true});
 const p=await b.newPage({viewport:{width:997,height:985}});
 const base='http://127.0.0.1:8790/review/illustrated-walk/index.html';
 await p.goto(base);
 await p.waitForFunction(()=>window.__walk?.ready);
 await p.click('#hud-world');
 await p.uncheck('#motion');
 await p.goto(base+'?start=training&zoom=3&hardware=working&rev=effects-check');
 await p.waitForFunction(()=>window.__walk?.ready);
 const state=await p.evaluate(()=>({motion:__walk.portal.enabled,preview:__walk.hardware.previews,paused:__walk.hardware.paused,steam:__walk.ambient.puffs.length}));
 console.log(state);
 assert.equal(state.paused,false,'Working preview must start motion after a paused preference');
 assert.ok(state.steam>0,'Working Engine preview must emit steam');
 const activity=await p.evaluate(()=>{
  const result={};for(const room of ['training','observatory','operations']){let lit=0,total=0,changes=0,last=[];
   for(let n=0;n<30;n++){HardwareActivity.tick(.1);const lamps=HardwareActivity.info().devices.filter(d=>d.room===room).flatMap(d=>d.levels);lit+=lamps.filter(v=>v>=.5).length;total+=lamps.length;changes+=lamps.filter((v,i)=>last[i]!==undefined&&Math.abs(v-last[i])>=1/6).length;last=lamps;}
   result[room]={litFraction:lit/total,changes};}return result;
 });
 console.log('Working lamp activity',activity);
 for(const [room,a]of Object.entries(activity)){assert.ok(a.litFraction>.4,room+' needs overlapping active lamps');assert.ok(a.changes>50,room+' needs lively cycling');}
 await p.click('#lighting-toggle');
 await p.selectOption('#room-preview-room','training');await p.selectOption('#room-preview-state','idle');
 assert.equal(await p.evaluate(()=>__walk.hardware.devices.find(d=>d.room==='training').state),'idle');
 assert.equal(await p.evaluate(()=>__walk.lighting.rooms.training.effectState),'idle');
 await p.selectOption('#room-preview-state','working');
 await p.waitForTimeout(5500);
 assert.equal(await p.locator('#room-preview-state').inputValue(),'working','Live polling must not overwrite an explicit preview');
 assert.equal(await p.evaluate(()=>__walk.hardware.devices.find(d=>d.room==='training').state),'working');
 assert.equal(await p.evaluate(()=>__walk.lighting.rooms.training.effectState),'working');
 await p.click('#lighting-close');
 const pixels=await p.evaluate(()=>{
  view.zoom=1;view.x=W/2;view.y=H/2;view.follow=false;
  const out=document.createElement('canvas');out.width=997;out.height=Math.round(997*H/W);const g=out.getContext('2d');
  function shot(){render();g.drawImage(canvas,0,0,out.width,out.height);return g.getImageData(0,0,out.width,out.height).data;}
  HardwareActivity.setPreview('engine','idle',false);const a=shot();
  HardwareActivity.setPreview('engine','working',false);HardwareActivity.tick(1.2);AmbientDetails.tick(1.2);const b=shot();
  return [['steam',[198,565,288,608],60],['training',[734,504,973,608],45],['observatory',[824,350,1134,412],12],['operations',[622,758,938,777],25]].map(([id,r,min])=>{
   let changed=0;for(let y=Math.ceil(r[1]/H*out.height);y<r[3]/H*out.height;y++)for(let x=Math.ceil(r[0]/W*out.width);x<r[2]/W*out.width;x++){const i=(y*out.width+x)*4;if(Math.max(...[0,1,2].map(k=>Math.abs(a[i+k]-b[i+k])))>12)changed++;}
   return{id,changed,min};
  });
 });
 console.log('Normal-view rendered changes',pixels);
 assert.ok(pixels.every(r=>r.changed>=r.min),'Working effects must visibly change rendered pixels');
 await p.click('#hud-rooms');await p.click('[data-hud-room=engine]');
 await p.waitForTimeout(100);
 const blocked=await p.evaluate(()=>{const r=canvas.getBoundingClientRect(),k=r.width/W*view.zoom,left=r.left+(198-view.x+W/2/view.zoom)*k,top=r.top+(565-view.y+H/2/view.zoom)*k;return [...document.querySelectorAll('.agent-tag:not([hidden])')].filter(e=>{const a=e.getBoundingClientRect();return a.left<left+90*k&&a.right>left&&a.top<top+43*k&&a.bottom>top;}).length;});
 assert.equal(blocked,0,'Agent labels must not cover rocket vents');
 await p.click('#hud-world');await p.uncheck('#motion');await p.click('#hud-world');
 await p.click('#lighting-toggle');
 assert.equal(await p.locator('#effects-resume').isVisible(),true);
 await p.click('#effects-resume');
 assert.equal(await p.evaluate(()=>__walk.hardware.paused),false,'Resume must restart a paused preview');
 await p.click('#lighting-close');
 assert.equal(await p.evaluate(()=>__walk.dirty),false);
 assert.equal(await p.evaluate(()=>Object.keys(__walk.edits).length),599);
 await p.screenshot({path:path.resolve(__dirname,'../artifacts/illustrated-map/effects-preview-rocket-fixed.png')});
 await b.close();
 console.log('PASS unified Working/Idle previews, motion activation, polling stability, visible machine animation and steam, clear vents, saved grid retained');
})().catch(e=>{console.error(e.message);process.exit(1)});
