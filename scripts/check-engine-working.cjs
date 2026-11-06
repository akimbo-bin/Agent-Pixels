const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),path.resolve(__dirname,'../../AgentPixelsEngine')]}));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:997,height:985}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8790/review/illustrated-walk/index.html?start=engine&zoom=3&hardware=working&rev=engine-power');
 await page.waitForFunction(()=>window.__walk?.ready);
 const result=await page.evaluate(()=>{
  HardwareActivity.setPreview('engine','idle',false);
  Turbines.tick(5);
  const idle=Turbines.info(),quiet=AmbientDetails.info();
  HardwareActivity.setPreview('engine','working',false);
  Turbines.tick(3);AmbientDetails.tick(.4);
  const working=Turbines.info(),busy=AmbientDetails.info();
  function pixels(){const c=document.createElement('canvas');c.width=W*P;c.height=H*P;const g=c.getContext('2d');ctx.save();ctx.setTransform(P,0,0,P,0,0);ctx.clearRect(0,0,W,H);AmbientDetails.drawWorld();g.drawImage(canvas,0,0);ctx.restore();return g.getImageData(0,0,c.width,c.height).data;}
  const a=pixels();AmbientDetails.tick(.5);const b=pixels();let changed=0;
  for(const[x,y]of [[157,490],[402,493]])for(let yy=(y-6)*P;yy<(y+12)*P;yy++)for(let xx=(x-34)*P;xx<(x+34)*P;xx++){const i=(yy*W*P+xx)*4;if(Math.max(...[0,1,2,3].map(k=>Math.abs(a[i+k]-b[i+k])))>12)changed++;}
  HardwareActivity.setPreview('engine','idle',false);Turbines.tick(5);
  const back={fans:Turbines.info(),ambient:AmbientDetails.info()};
  HardwareActivity.setPreview('engine','working',false);
  return{idle,quiet,working,busy,changed,back,dirty:__walk.dirty,grid:Object.keys(__walk.edits).length};
 });
 assert.equal(result.quiet.puffs.length,0);assert.equal(result.quiet.sirens.length,0);
 assert.ok(result.idle.speedScale<1.01);assert.ok(result.working.speedScale>3.9);
 assert.equal(result.busy.puffs.length,14);assert.equal(result.busy.sirens.length,2);
 assert.ok(result.changed>100,'Rotating beacon pixels must visibly change');
 assert.ok(result.back.fans.speedScale<1.01);assert.equal(result.back.ambient.sirens.length,0);
 assert.equal(result.back.ambient.puffs.length,0);assert.equal(result.dirty,false);assert.equal(result.grid,599);
 await page.waitForTimeout(1200);
 await page.screenshot({path:path.resolve(__dirname,'../artifacts/illustrated-map/engine-working-beacons.png')});
 assert.deepEqual(errors,[]);
 console.log('PASS 4x Working turbine ramp, 14 steam puffs, rotating beacons, Idle recovery, preserved map. Beacon pixels changed:',result.changed);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
