// One shared cabin; landing doors remain shut whenever the cabin is elsewhere.
const Lift=(()=>{
 const ids=['ground','middle','upper'],doors={ground:0,middle:1,upper:0},pending=new Set();
 let car='middle',phase='idle',timer=0,hold=0,from=null,target=null,passenger=false,boardStart=null,exitStart=null,position=1,elapsed=0,closeStart=1,openStart=0;
 const npcRequests=new Map();let npc=null;
 const duration={doors:.75,boarding:.85,exiting:.75};
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const ap=f=>ELEVATOR_SLICES[f].aperture;
 const bottom=f=>ap(f)[1]+ap(f)[3];
 const center=f=>ap(f)[0]+ap(f)[2]/2;
 const seated=f=>[center(f),bottom(f)-8];
 function atThreshold(){const a=ap(car);return player.floor===car&&Math.abs(player.x-center(car))<a[2]/2+3&&player.y>=bottom(car)-3&&player.y<=bottom(car)+8;}
 function inCabin(){const a=ap(player.floor);return Math.abs(player.x-center(player.floor))<a[2]/2+2&&player.y<bottom(player.floor)+1&&player.y>=bottom(player.floor)-22;}
 function near(f=player.floor){const a=floors[f].lift;return player.floor===f&&Math.hypot(player.x-a[0],player.y-a[1])<43;}
 function setPhase(value){if(value==='closing')closeStart=doors[car];if(value==='opening')openStart=doors[car];phase=value;timer=0;}
 function call(f){if(passenger)return;pending.add(f);liftOpen=true;$('#lift').hidden=false;keys.clear();if(npc)return;if(phase==='closing'&&car===f&&(!target||target===f)){pending.delete(f);setPhase('opening');return;}if(phase==='idle'){if(car===f){pending.delete(f);if(doors[car]<1)setPhase('opening');else hold=0;}else{target=f;from=car;setPhase('closing');}}}
 function choose(f){if(npc||!near()||car!==player.floor||doors[car]<.999||phase!=='idle'){message('Call the elevator and wait for its doors to open.');return;}liftOpen=false;$('#lift').hidden=true;keys.clear();if(f===car)return;passenger=true;target=f;from=car;boardStart={x:player.x,y:player.y};player.dir='up';view.follow=true;setPhase('boarding');}
 // NPC trips use the same car/doors as the player, without opening the player's controls.
 function requestNpc(id,f,to){if(!ids.includes(f)||!ids.includes(to)||f===to)return false;if(npcRequests.has(id))return true;npcRequests.set(id,{id,f,to,state:'waiting',floor:f,x:floors[f].lift[0],y:floors[f].lift[1]});pending.add(f);return true;}
 function npcPose(id){const r=npcRequests.get(id);return r?{...r,hidden:r.state==='moving'}:null;}
 function cancelNpc(id){if(npc?.id===id){npc.cancelled=true;return false;}return npcRequests.delete(id);}
 function serviceNpcs(){if(npc||passenger||phase!=='idle'||mode!=='walk'||!Portal.info().enabled)return;if(inCabin()||atThreshold()||liftOpen&&near())return;const r=[...npcRequests.values()].find(r=>r.state==='waiting'&&r.f===car);if(r){if(doors[car]<.999){setPhase('opening');return;}npc=r;npc.state='boarding';target=r.to;from=car;boardStart={x:r.x,y:r.y};setPhase('boarding');return;}for(const r of npcRequests.values())if(r.state==='waiting')pending.add(r.f);}
 function ready(){return !npc&&phase==='idle'&&doors[car]>.999&&car===player.floor&&near();}
 function pointOverride(f,x,y){const a=ap(f);if(x<a[0]+1||x>a[0]+a[2]-1||y<a[1]+12||y>bottom(f)+9)return undefined;return !npc&&car===f&&doors[f]>.98&&phase!=='moving'&&y>=bottom(f)-19;}
 function tick(dt){serviceNpcs();elapsed+=dt;timer+=dt;
  if(phase==='boarding'){const t=ease(timer/duration.boarding),p=seated(car);const rider=npc||player;rider.x=boardStart.x+(p[0]-boardStart.x)*t;rider.y=boardStart.y+(p[1]-boardStart.y)*t;if(!npc)player.step+=dt;if(timer>=duration.boarding)setPhase('closing');}
  else if(phase==='closing'){
   if(atThreshold()&&!passenger&&!npc){setPhase('opening');}
   else{doors[car]=Math.max(0,closeStart*(1-ease(timer/duration.doors)));if(timer>=duration.doors){doors[car]=0;if(target&&target!==car){from=car;setPhase('moving');}else{target=null;setPhase('idle');}}}
  }
  else if(phase==='moving'){const length=1.15+Math.abs(ids.indexOf(target)-ids.indexOf(from))*1.35,t=ease(timer/length);position=ids.indexOf(from)+(ids.indexOf(target)-ids.indexOf(from))*t;if(npc)npc.state='moving';travel={from,to:target,t:timer,duration:length};if(timer>=length){car=target;position=ids.indexOf(car);pending.delete(car);travel=null;if(npc){npc.floor=car;[npc.x,npc.y]=seated(car);npc.state='opening';}if(passenger){player.floor=car;[player.x,player.y]=seated(car);$('#floor').value=car;player.dir='down';}setPhase('opening');}}
  else if(phase==='opening'){doors[car]=openStart+(1-openStart)*ease(timer/duration.doors);if(timer>=duration.doors){doors[car]=1;pending.delete(car);hold=0;if(passenger||npc){const rider=npc||player;exitStart={x:rider.x,y:rider.y};if(npc)npc.state='exiting';setPhase('exiting');}else{target=null;setPhase('idle');}}}
  else if(phase==='exiting'){const t=ease(timer/duration.exiting),p=floors[car].lift;const rider=npc||player;rider.x=exitStart.x+(p[0]-exitStart.x)*t;rider.y=exitStart.y+(p[1]-exitStart.y)*t;if(!npc)player.step+=dt;if(timer>=duration.exiting){if(npc){npc.state='arrived';if(npc.cancelled)npcRequests.delete(npc.id);npc=null;}passenger=false;target=null;hold=0;setPhase('idle');}}
  else if(phase==='idle'){position=ids.indexOf(car);hold+=dt;const next=[...pending].find(f=>f!==car);if(next&&hold>.35&&!(liftOpen&&near())&&!inCabin()){target=next;from=car;setPhase('closing');}else if(doors[car]>.99&&hold>5&&!inCabin()&&!atThreshold()&&!(liftOpen&&near())){target=null;setPhase('closing');}}
  for(const f of ids)if(f!==car)doors[f]=0;
  const travelling=phase==='moving',direction=target?Math.sign(ids.indexOf(target)-ids.indexOf(car)):0;
  $('#lift-status').textContent=passenger?'Travelling to '+floors[target||car].name:ready()?'Doors open · choose a floor or walk into the cabin':pending.has(player.floor)?'Elevator called · please wait':travelling?'Elevator travelling to '+floors[target].name:'Cabin at '+floors[car].name;
  for(const b of document.querySelectorAll('[data-floor]'))b.disabled=!ready()||b.dataset.floor===car;
  $('#start').disabled=passenger;$('#reset').disabled=passenger;
 }
 function drawCabins(){const s=ELEVATOR_SLICES.cabinSource;for(const f of ids){const a=ap(f);ctx.save();ctx.beginPath();ctx.rect(...a);ctx.clip();ctx.drawImage(art,s[0]*P,s[1]*P,s[2]*P,s[3]*P,...a);ctx.restore();}}
 function drawDoors(stage='back'){for(const f of ids){if(stage==='front'&&!((f===player.floor&&player.y<=bottom(f)+1)||(npc&&npc.floor===f&&npc.y<=bottom(f)+1&&npc.state!=='moving')))continue;const a=ap(f),s=ELEVATOR_SLICES[f].closedSource,o=doors[f],half=a[2]/2,shift=(half+1)*o;ctx.save();ctx.beginPath();ctx.rect(...a);ctx.clip();ctx.drawImage(art,s[0]*P,s[1]*P,s[2]*P/2,s[3]*P,a[0]-shift,a[1],half+.12,a[3]);ctx.drawImage(art,(s[0]+s[2]/2)*P,s[1]*P,s[2]*P/2,s[3]*P,a[0]+half+shift,a[1],half+.12,a[3]);ctx.restore();drawLights(f);}}
 function drawLights(f){
  const spec=ELEVATOR_SLICES[f],r=spec.light,b=spec.button,called=pending.has(f),moving=phase==='moving',present=car===f&&!moving,pulse=.5+.5*Math.sin(elapsed*5.5);
  const glow=called?'#ffd18a':present?'#b7e7ca':moving?'#c9a1f5':'#6a4f80';
  // A small beveled brass cartouche, centered on the actual door aperture.
  // All details use restrained native-pixel steps rather than a flat HUD box.
  const [x,y,w,h]=r,cx=x+w/2,cy=y+h/2;
  const plate=(px,py,pw,ph)=>{ctx.beginPath();ctx.moveTo(px+3,py);ctx.lineTo(px+pw-3,py);ctx.lineTo(px+pw,py+3);ctx.lineTo(px+pw,py+ph-3);ctx.lineTo(px+pw-3,py+ph);ctx.lineTo(px+3,py+ph);ctx.lineTo(px,py+ph-3);ctx.lineTo(px,py+3);ctx.closePath();};
  ctx.save();plate(x+.7,y+1,w,h);ctx.fillStyle='#25172bc0';ctx.fill();plate(x,y,w,h);ctx.fillStyle='#98623e';ctx.fill();
  plate(x+.8,y+.8,w-1.6,h-1.6);ctx.fillStyle='#e3b775';ctx.fill();plate(x+1.6,y+1.6,w-3.2,h-3.2);ctx.fillStyle='#30213f';ctx.fill();
  ctx.strokeStyle='#ffdfa2';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(x+3,y+.6);ctx.lineTo(x+w-3,y+.6);ctx.stroke();
  ctx.strokeStyle='#79503e';ctx.beginPath();ctx.moveTo(x+3,y+h-.5);ctx.lineTo(x+w-3,y+h-.5);ctx.stroke();
  const up=moving&&ids.indexOf(target)>ids.indexOf(from),down=moving&&!up;
  for(const[ax,on,sign]of[[cx-8,up,-1],[cx+8,down,1]]){
   ctx.strokeStyle=on?'#e6c9ff':'#86708f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(ax-1.8,cy-sign);ctx.lineTo(ax,cy+sign);ctx.lineTo(ax+1.8,cy-sign);ctx.stroke();
  }
  // Faceted indicator glass, with a small warm reflected highlight.
  ctx.shadowColor=glow;ctx.shadowBlur=(called||moving)?2+2*pulse:present?2:0;
  ctx.beginPath();ctx.moveTo(cx-2.8,cy);ctx.lineTo(cx-1.8,cy-1.8);ctx.lineTo(cx+1.8,cy-1.8);ctx.lineTo(cx+2.8,cy);ctx.lineTo(cx+1.8,cy+1.8);ctx.lineTo(cx-1.8,cy+1.8);ctx.closePath();ctx.fillStyle=glow;ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle=present||called?'#fff1d2':'#dbc4f4';ctx.fillRect(cx-1.5,cy-1.2,2,.65);
  // Matching recessed call plate, aligned to the right jamb under its lantern.
  const [bx,by,bw,bh]=b,bcx=bx+bw/2,bcy=by+bh/2;
  ctx.fillStyle='#25182bb0';ctx.fillRect(bx+.8,by+1,bw,bh);
  ctx.beginPath();ctx.moveTo(bx,by+2);ctx.lineTo(bx+2,by);ctx.lineTo(bx+bw-2,by);ctx.lineTo(bx+bw,by+2);ctx.lineTo(bx+bw,by+bh-1);ctx.lineTo(bx+bw-1,by+bh);ctx.lineTo(bx+1,by+bh);ctx.lineTo(bx,by+bh-1);ctx.closePath();ctx.fillStyle='#b1804f';ctx.fill();
  ctx.fillStyle='#f0cc8b';ctx.fillRect(bx+1,by+2,1,bh-3);ctx.fillRect(bx+2,by+1,bw-4,.75);ctx.fillStyle='#644132';ctx.fillRect(bx+bw-1,by+2,.8,bh-2);
  ctx.fillStyle='#34233e';ctx.fillRect(bx+2,by+3,bw-4,bh-6);
  const buttonGlow=called?'#ffd18a':present?'#b7e7ca':'#a17cc3';ctx.fillStyle=buttonGlow;ctx.shadowColor=buttonGlow;ctx.shadowBlur=called?3+2*pulse:1;
  ctx.beginPath();ctx.moveTo(bcx,bcy-2.1);ctx.lineTo(bcx+1.7,bcy);ctx.lineTo(bcx,bcy+2.1);ctx.lineTo(bcx-1.7,bcy);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#f7d79b';ctx.fillRect(bcx-.5,by+1.7,1,.7);ctx.fillRect(bcx-.5,by+bh-2.3,1,.7);ctx.restore();
 }
 function drawCharacter(){if(passenger&&phase==='moving')return;if(inCabin()){const a=ap(player.floor);ctx.save();ctx.beginPath();ctx.rect(...a);ctx.clip();actor();ctx.restore();}else actor();}
 function drawNpc(id,draw){const r=npcPose(id);if(r?.hidden)return;if(r&&r.state!=='waiting'&&r.state!=='arrived'&&r.y<=bottom(r.floor)+1){ctx.save();ctx.beginPath();ctx.rect(...ap(r.floor));ctx.clip();draw();ctx.restore();}else draw();}
 function hitButton(x,y){const r=ELEVATOR_SLICES[player.floor].button;return x>=r[0]-5&&x<=r[0]+r[2]+5&&y>=r[1]-5&&y<=r[1]+r[3]+5;}
 function cameraPoint(){if(!passenger||phase!=='moving')return null;const length=1.15+Math.abs(ids.indexOf(target)-ids.indexOf(from))*1.35,t=ease(timer/length),a=floors[from].lift,b=floors[target].lift;return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
 function info(){return{npcPassenger:npc?.id||null,npcTrips:[...npcRequests.values()].map(r=>({...r})),carFloor:car,phase,doors:{...doors},calls:[...pending],target,from,passenger,position};}
 function hint(){return passenger?phase==='boarding'?'Entering elevator':phase==='exiting'?'Leaving elevator':'Elevator → '+floors[target||car].name:near()?ready()?'E · Choose destination · W enters cabin':'E · Call elevator':null;}
 return{drawNpc,requestNpc,npcPose,cancelNpc,tick,call,choose,ready,near,pointOverride,drawCabins,drawDoors,drawCharacter,hitButton,cameraPoint,info,hint,hasPassenger:()=>passenger,controlsLocked:()=>passenger};
})();
