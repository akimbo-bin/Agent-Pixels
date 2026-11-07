const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),path.resolve(__dirname,'../../AgentPixelsEngine')]}));
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:997,height:985}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8790/review/illustrated-walk/index.html?hardware=working&rev=music-racks');await p.waitForFunction(()=>window.__walk?.ready);
 const result=await p.evaluate(()=>{
  WorldHUD.focus('music');for(const[id]of RoomStates.roomEntries())HardwareActivity.setPreview(id,'idle',false);
  function shot(){ctx.save();ctx.setTransform(P,0,0,P,0,0);ctx.clearRect(0,0,W,H);HardwareActivity.draw();const data=ctx.getImageData(0,0,canvas.width,canvas.height);ctx.restore();return data;}
  HardwareActivity.setPreview('music','idle',false);const idle=shot();
  HardwareActivity.setPreview('music','working',false);const a=shot();HardwareActivity.tick(.7);const c=shot();
  let lit=0,moving=0;for(let i=0;i<a.data.length;i+=4){if(a.data[i+3]&&!idle.data[i+3])lit++;if(Math.max(...[0,1,2].map(k=>Math.abs(a.data[i+k]-c.data[i+k])))>15)moving++;}
  HardwareActivity.setPreview('music','idle',false);const off=shot();let residual=0;for(let i=0;i<idle.data.length;i++)if(idle.data[i]!==off.data[i])residual++;
  HardwareActivity.setPreview('music','working',false);
  return{lit,moving,residual,devices:__walk.hardware.devices.filter(d=>d.room==='music'),grid:Object.keys(__walk.edits).length,dirty:__walk.dirty};
 });
 assert.equal(result.devices.length,4);assert.ok(result.devices.every(d=>d.state==='working'));assert.ok(result.lit>300);assert.ok(result.moving>100);assert.equal(result.residual,0);assert.equal(result.grid,599);assert.equal(result.dirty,false);
 await p.waitForTimeout(3500);await p.screenshot({path:path.resolve(__dirname,'../artifacts/illustrated-map/music-working-racks.png')});assert.deepEqual(errors,[]);
 console.log('PASS four Music rack panels, Working LED animation, exact Idle restoration, saved map unchanged',JSON.stringify({lit:result.lit,moving:result.moving}));
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
