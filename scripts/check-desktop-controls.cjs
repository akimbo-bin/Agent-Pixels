const path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require(require.resolve('playwright',{paths:[process.cwd(),path.resolve('../AgentPixelsEngine')]}));const base=process.env.DASHBOARD_URL||'http://127.0.0.1:8792';
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/?start=middle&zoom=1');await p.waitForFunction(()=>__walk.ready);
 const position=()=>p.evaluate(()=>({...player}));
 await p.evaluate(()=>{view.follow=false;Camera.move(600,550);Camera.settle();canvas.focus();});let before=await position();await p.keyboard.down('d');await p.waitForTimeout(600);await p.keyboard.up('d');let after=await position();assert.ok(after.x>before.x+5,'D moves the character');assert.equal(await p.evaluate(()=>view.follow),true,'Movement follows at minimum zoom');assert.deepEqual(await p.evaluate(()=>[...keys]),[]);
 await p.click('#hud-rooms');await p.evaluate(()=>Dashboard.close());assert.equal(await p.evaluate(()=>document.activeElement===canvas),true,'Closing menu restores walking focus');
 await p.evaluate(()=>Dashboard.chooseSource('demo'));assert.equal(await p.evaluate(()=>document.activeElement===canvas),true,'Changing Live/Demo restores walking focus');
 await p.click('#hud-queue');await p.locator('#dash-search').focus();before=await position();await p.keyboard.type('wasd');await p.waitForTimeout(100);after=await position();assert.equal(after.x,before.x);assert.equal(after.y,before.y);assert.equal(await p.locator('#dash-search').inputValue(),'wasd','Typing in fields stays intact');
 await p.evaluate(()=>Dashboard.close());before=await position();await p.keyboard.down('ArrowLeft');await p.waitForTimeout(400);await p.keyboard.up('ArrowLeft');after=await position();assert.ok(after.x<before.x,'Arrow keys still walk');assert.deepEqual(errors,[]);console.log('PASS desktop WASD, minimum-zoom follow, menu focus, text fields and arrow keys');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
