// One shared cabin; landing doors remain shut whenever the cabin is elsewhere.
const Lift=(()=>{
 const ids=['ground','middle','upper'],doors={ground:0,middle:1,upper:0},pending=new Set();
 let car='middle',phase='idle',timer=0,hold=0,from=null,target=null,passenger=false,boardStart=null,exitStart=null,position=1,elapsed=0,closeStart=1,openStart=0;
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
 function call(f){if(passenger)return;pending.add(f);liftOpen=true;$('#lift').hidden=false;keys.clear();if(phase==='closing'&&car===f&&(!target||target===f)){pending.delete(f);setPhase('opening');return;}if(phase==='idle'){if(car===f){pending.delete(f);if(doors[car]<1)setPhase('opening');else hold=0;}else{target=f;from=car;setPhase('closing');}}}
 function choose(f){if(!near()||car!==player.floor||doors[car]<.999||phase!=='idle'){message('Call the elevator and wait for its doors to open.');return;}liftOpen=false;$('#lift').hidden=true;keys.clear();if(f===car)return;passenger=true;target=f;from=car;boardStart={x:player.x,y:player.y};player.dir='up';view.follow=true;setPhase('boarding');}
 function ready(){return phase==='idle'&&doors[car]>.999&&car===player.floor&&near();}
 function pointOverride(f,x,y){const a=ap(f);if(x<a[0]+1||x>a[0]+a[2]-1||y<a[1]+12||y>bottom(f)+9)return undefined;return car===f&&doors[f]>.98&&phase!=='moving'&&y>=bottom(f)-19;}
 function tick(dt){elapsed+=dt;timer+=dt;
  if(phase==='boarding'){const t=ease(timer/duration.boarding),p=seated(car);player.x=boardStart.x+(p[0]-boardStart.x)*t;player.y=boardStart.y+(p[1]-boardStart.y)*t;player.step+=dt;if(timer>=duration.boarding)setPhase('closing');}
  else if(phase==='closing'){
   if(atThreshold()&&!passenger){setPhase('opening');}
   else{doors[car]=Math.max(0,closeStart*(1-ease(timer/duration.doors)));if(timer>=duration.doors){doors[car]=0;if(target&&target!==car){from=car;setPhase('moving');}else{target=null;setPhase('idle');}}}
  }
  else if(phase==='moving'){const length=1.15+Math.abs(ids.indexOf(target)-ids.indexOf(from))*1.35,t=ease(timer/length);position=ids.indexOf(from)+(ids.indexOf(target)-ids.indexOf(from))*t;travel={from,to:target,t:timer,duration:length};if(timer>=length){car=target;position=ids.indexOf(car);pending.delete(car);travel=null;if(passenger){player.floor=car;[player.x,player.y]=seated(car);$('#floor').value=car;player.dir='down';}setPhase('opening');}}
  else if(phase==='opening'){doors[car]=openStart+(1-openStart)*ease(timer/duration.doors);if(timer>=duration.doors){doors[car]=1;pending.delete(car);hold=0;if(passenger){exitStart={x:player.x,y:player.y};setPhase('exiting');}else{target=null;setPhase('idle');}}}
  else if(phase==='exiting'){const t=ease(timer/duration.exiting),p=floors[car].lift;player.x=exitStart.x+(p[0]-exitStart.x)*t;player.y=exitStart.y+(p[1]-exitStart.y)*t;player.step+=dt;if(timer>=duration.exiting){passenger=false;target=null;hold=0;setPhase('idle');}}
  else if(phase==='idle'){position=ids.indexOf(car);hold+=dt;const next=[...pending].find(f=>f!==car);if(next&&hold>.35&&!(liftOpen&&near())&&!inCabin()){target=next;from=car;setPhase('closing');}else if(doors[car]>.99&&hold>5&&!inCabin()&&!atThreshold()&&!(liftOpen&&near())){target=null;setPhase('closing');}}
  for(const f of ids)if(f!==car)doors[f]=0;
  const travelling=phase==='moving',direction=target?Math.sign(ids.indexOf(target)-ids.indexOf(car)):0;
  $('#lift-status').textContent=passenger?'Travelling to '+floors[target||car].name:ready()?'Doors open · choose a floor or walk into the cabin':pending.has(player.floor)?'Elevator called · please wait':travelling?'Elevator travelling to '+floors[target].name:'Cabin at '+floors[car].name;
  for(const b of document.querySelectorAll('[data-floor]'))b.disabled=!ready()||b.dataset.floor===car;
  $('#start').disabled=passenger;$('#reset').disabled=passenger;
 }
 function drawCabins(){const s=ELEVATOR_SLICES.cabinSource;for(const f of ids){const a=ap(f);ctx.save();ctx.beginPath();ctx.rect(...a);ctx.clip();ctx.drawImage(art,s[0]*P,s[1]*P,s[2]*P,s[3]*P,...a);ctx.restore();}}
 function drawDoors(stage='back'){for(const f of ids){if(stage==='front'&&(f!==player.floor||player.y>bottom(f)+1))continue;const a=ap(f),s=ELEVATOR_SLICES[f].closedSource,o=doors[f],half=a[2]/2,shift=(half+1)*o;ctx.save();ctx.beginPath();ctx.rect(...a);ctx.clip();ctx.drawImage(art,s[0]*P,s[1]*P,s[2]*P/2,s[3]*P,a[0]-shift,a[1],half+.12,a[3]);ctx.drawImage(art,(s[0]+s[2]/2)*P,s[1]*P,s[2]*P/2,s[3]*P,a[0]+half+shift,a[1],half+.12,a[3]);ctx.restore();drawLights(f);}}
 function drawLights(f){const spec=ELEVATOR_SLICES[f],r=spec.light,b=spec.button,called=pending.has(f),moving=phase==='moving',present=car===f&&!moving,pulse=.5+.5*Math.sin(elapsed*7),color=called?'#ffc15e':present?'#7dffc0':moving?'#bd8cff':'#534861';ctx.fillStyle='#171329';ctx.fillRect(...r);ctx.strokeStyle='#ad8255';ctx.lineWidth=.6;ctx.strokeRect(...r);ctx.save();ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=(called||moving)?3+3*pulse:present?4:0;ctx.fillRect(r[0]+16,r[1]+3,7,3);ctx.restore();
  const up=moving&&ids.indexOf(target)>ids.indexOf(from),down=moving&&!up;for(const[x,on,sign]of[[r[0]+7,up,-1],[r[0]+30,down,1]]){ctx.strokeStyle=on?'#e4c2ff':'#51425d';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(x-2,r[1]+4-sign);ctx.lineTo(x,r[1]+4+sign);ctx.lineTo(x+2,r[1]+4-sign);ctx.stroke();}
  ctx.fillStyle='#20172d';ctx.fillRect(...b);ctx.strokeStyle='#a88450';ctx.strokeRect(...b);ctx.fillStyle=called?'#ffc15e':present?'#80f6c8':'#79628f';ctx.fillRect(b[0]+1,b[1]+2,b[2]-2,3);
 }
 function drawCharacter(){if(passenger&&phase==='moving')return;if(inCabin()){const a=ap(player.floor);ctx.save();ctx.beginPath();ctx.rect(...a);ctx.clip();actor();ctx.restore();}else actor();}
 function hitButton(x,y){const r=ELEVATOR_SLICES[player.floor].button;return x>=r[0]-5&&x<=r[0]+r[2]+5&&y>=r[1]-5&&y<=r[1]+r[3]+5;}
 function cameraPoint(){if(!passenger||phase!=='moving')return null;const length=1.15+Math.abs(ids.indexOf(target)-ids.indexOf(from))*1.35,t=ease(timer/length),a=floors[from].lift,b=floors[target].lift;return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
 function info(){return{carFloor:car,phase,doors:{...doors},calls:[...pending],target,from,passenger,position};}
 function hint(){return passenger?phase==='boarding'?'Entering elevator':phase==='exiting'?'Leaving elevator':'Elevator → '+floors[target||car].name:near()?ready()?'E · Choose destination · W enters cabin':'E · Call elevator':null;}
 return{tick,call,choose,ready,near,pointOverride,drawCabins,drawDoors,drawCharacter,hitButton,cameraPoint,info,hint,hasPassenger:()=>passenger,controlsLocked:()=>passenger};
})();
