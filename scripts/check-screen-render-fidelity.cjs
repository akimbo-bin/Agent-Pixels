const path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const{chromium}=require(require.resolve('playwright',{paths:[process.cwd(),path.resolve('../AgentPixelsEngine')]}));
const base=process.env.DASHBOARD_URL||'http://127.0.0.1:8792';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:1920,height:1080}});
 await p.goto(base+'/');await p.waitForFunction(()=>__walk.ready&&__walk.screenPrograms.received>0,null,{polling:100});await p.evaluate(()=>document.fonts.ready);
 const reference=cp.execFileSync('git',['show','f6d4933:dev/engine/illustrated-screens.js'],{encoding:'utf8'}).replace('let screens=[];','');
 const result=await p.evaluate(reference=>{
 const original=new Function(reference+';return Screens;')();original.tick(Screens.info().time);for(const r of WorldHUD.rooms())RoomStates.setPreview(r.id,'working');
 const capture=mod=>{const images=[],draw=ctx.drawImage;ctx.drawImage=function(c,...args){images.push({w:c.width,h:c.height,data:c.getContext('2d').getImageData(0,0,c.width,c.height).data});};try{mod.draw();for(const m of masks){const l=layer(m);if(l)mod.drawMasked(m,l);}}finally{ctx.drawImage=draw;}return images;};
 let bytes=0,error=0,maximum=0,comparisons=0;
 for(const zoom of [1,3]){view.follow=false;Camera.move(750,575);setZoom(zoom);Camera.settle();for(const dt of [0,.5,1]){original.tick(dt);Screens.tick(dt);const a=capture(original),b=capture(Screens);if(a.length!==b.length)throw Error('Visible screen count changed');for(let j=0;j<a.length;j++){if(a[j].w!==b[j].w||a[j].h!==b[j].h)throw Error('Screen resolution changed');for(let k=0;k<a[j].data.length;k++){const d=Math.abs(a[j].data[k]-b[j].data[k]);error+=d;maximum=Math.max(maximum,d);bytes++;}comparisons++;}}}
 let canvases=0;const create=document.createElement;document.createElement=function(tag,...args){if(tag==='canvas')canvases++;return create.call(this,tag,...args);};try{for(let i=0;i<90;i++){Screens.tick(1/60);Screens.draw();for(const m of masks){const l=layer(m);if(l)Screens.drawMasked(m,l);}}}finally{document.createElement=create;}return{comparisons,meanChannelError:error/bytes,maximum,canvases};},reference);
 console.log('Screen and foreground-mask fidelity',result);assert.ok(result.comparisons>100);assert.ok(result.canvases<40,'Animated screen and mask buffers must be reused');assert.ok(result.meanChannelError<1,'Screen artwork must retain appearance within canvas backend antialiasing differences');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
