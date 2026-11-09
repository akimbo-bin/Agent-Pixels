// Small environmental details, kept separate from saved map geometry.
const AmbientDetails=(()=>{
 let time=0,steamTime=0;
 const events=[{at:4.5,a:[140,25],b:[300,90]},{at:25.5,a:[520,22],b:[710,95]},{at:49,a:[1130,10],b:[1310,85]},{at:76,a:[890,10],b:[760,78]},{at:103,a:[1330,36],b:[1410,104]}];
 const puff=document.createElement('canvas');puff.width=24;puff.height=16;
 const pg=puff.getContext('2d');for(const[x,y,r]of [[8,9,7],[15,7,6],[18,10,5]]){const glow=pg.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,'rgba(226,232,250,.65)');glow.addColorStop(.5,'rgba(190,205,231,.36)');glow.addColorStop(1,'rgba(184,201,230,0)');pg.fillStyle=glow;pg.fillRect(x-r,y-r,r*2,r*2);}
 const rocketWorking=()=>HardwareActivity.roomState('engine')==='working';
 function tick(dt){if(!Portal.info().enabled||mode!=='walk'||document.hidden)return;time+=dt;steamTime+=dt;}
 function meteor(){const local=time%128;const event=events.find(e=>local>=e.at&&local<e.at+1.1);return event?{...event,age:local-event.at}:null;}
 function drawSky(){if(mode!=='walk'||!Portal.info().enabled)return;const m=meteor();if(!m)return;const u=m.age/1.1,tail=Math.max(0,u-.32),x=m.a[0]+(m.b[0]-m.a[0])*u,y=m.a[1]+(m.b[1]-m.a[1])*u,tx=m.a[0]+(m.b[0]-m.a[0])*tail,ty=m.a[1]+(m.b[1]-m.a[1])*tail,fade=Math.sin(Math.PI*u);
  ctx.save();StarTwinkle.clipSky();ctx.globalCompositeOperation='screen';const line=ctx.createLinearGradient(tx,ty,x,y);line.addColorStop(0,'rgba(111,113,255,0)');line.addColorStop(.5,'rgba(159,173,255,.35)');line.addColorStop(1,'rgba(239,249,255,1)');ctx.strokeStyle=line;ctx.globalAlpha=fade*.22;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(x,y);ctx.stroke();ctx.globalAlpha=fade;ctx.lineWidth=.85;ctx.stroke();ctx.fillStyle='#f0fbff';ctx.fillRect(x-.6,y-.6,1.2,1.2);ctx.restore();
 }
 function lampGain(){return .93+.035*Math.sin(time*1.9)+.012*Math.sin(time*8.3)+.008*Math.sin(time*15.7)-.035*Math.pow(Math.max(0,Math.sin(time*.73)),18);}
 function drawLamp(){const gain=Portal.info().enabled?lampGain():.94;ctx.save();path(ctx,[[1185,696],[1193,695],[1207,706],[1204,710],[1190,703]]);ctx.clip();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=1-gain;ctx.fillStyle='#694621';ctx.fillRect(1183,693,27,19);ctx.restore();ctx.save();ctx.translate(1199,704);ctx.scale(15,12);ctx.globalCompositeOperation='screen';const glow=ctx.createRadialGradient(0,0,0,0,0,1);glow.addColorStop(0,`rgba(255,198,103,${.045+(gain-.85)*.45})`);glow.addColorStop(1,'rgba(255,176,65,0)');ctx.fillStyle=glow;ctx.fillRect(-1,-1,2,2);ctx.restore();}
 // Idle keeps the former Working vent output; powered-up exhaust is denser and rises farther.
 function puffs(){if(!Portal.info().enabled)return[];const working=rocketWorking(),count=working?14:7,result=[];for(let side=0;side<2;side++)for(let i=0;i<count;i++){const life=2.5+side*.2,age=(steamTime*(working?1.85:1.35)+i*life/count+side*.31)%life,u=age/life;result.push({x:(side?258:221)+(side?1:-1)*(4+u*(working?23:15))+Math.sin(age*2+i)*1.4,y:594-u*(working?43:24),w:(working?10:7)+u*(working?20:13),h:(working?7:5)+u*(working?15:9),alpha:Math.sin(Math.PI*u)*(working?.9:.65)});}return result;}
 function drawSteam(){const particles=puffs();if(!particles.length)return;ctx.save();ctx.beginPath();ctx.rect(180,535,128,73);ctx.moveTo(225,535);ctx.lineTo(250,535);ctx.lineTo(250,589);ctx.lineTo(225,589);ctx.closePath();ctx.clip('evenodd');ctx.imageSmoothingEnabled=false;for(const p of particles){ctx.globalAlpha=p.alpha;ctx.drawImage(puff,p.x-p.w/2,p.y-p.h/2,p.w,p.h);}ctx.globalAlpha=1;for(let side=0;side<2;side++){const dir=side?1:-1,x=(side?258:221)+dir*3,sway=Math.sin(steamTime*1.8+side*2)*1.7,gradient=ctx.createLinearGradient(x,595,x+dir*12,572);gradient.addColorStop(0,'rgba(232,242,255,0)');gradient.addColorStop(.2,'rgba(232,242,255,.35)');gradient.addColorStop(.65,'rgba(222,236,255,.42)');gradient.addColorStop(1,'rgba(222,236,255,0)');ctx.strokeStyle=gradient;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,595);ctx.bezierCurveTo(x+dir*3+sway,590,x+dir*6-sway,578,x+dir*12+sway,572);ctx.stroke();}ctx.restore();}
 const beacons=[[157,490],[402,493]];
 function sirens(){return rocketWorking()?beacons.map(([x,y],i)=>({x,y,angle:time*2.6+i*Math.PI})):[];}
 function drawSirens(){for(const b of sirens()){
  ctx.save();ctx.translate(b.x,b.y);ctx.globalCompositeOperation='screen';
  // A rotating pair of soft beams stays inside the machinery bay.
  ctx.beginPath();ctx.rect(103-b.x,482-b.y,358,157);ctx.clip();ctx.scale(1,.42);ctx.rotate(b.angle);
  for(const sign of [-1,1]){ctx.save();ctx.scale(sign,1);const beam=ctx.createLinearGradient(0,0,52,0);beam.addColorStop(0,'rgba(255,132,57,.52)');beam.addColorStop(1,'rgba(255,75,47,0)');ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(52,-17);ctx.lineTo(52,17);ctx.closePath();ctx.fill();ctx.restore();}ctx.restore();
  ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle='#342539';ctx.fillRect(-3,1,6,2);ctx.fillStyle='#ba6849';ctx.fillRect(-2,-3,4,4);ctx.fillStyle='#ffba68';ctx.fillRect(-1,-3,2,1);ctx.globalCompositeOperation='screen';const bright=.65+.35*Math.pow(Math.cos(b.angle),4),glow=ctx.createRadialGradient(0,-1,0,0,-1,14);glow.addColorStop(0,`rgba(255,101,48,${bright})`);glow.addColorStop(1,'rgba(255,81,35,0)');ctx.fillStyle=glow;ctx.fillRect(-14,-15,28,28);ctx.fillStyle='#ffead0';ctx.globalAlpha=bright;ctx.fillRect(Math.round(Math.sin(b.angle)), -2,1,2);ctx.restore();
 }}
 function drawWorld(){if(mode!=='walk')return;drawLamp();drawSteam();drawSirens();}
 return{tick,drawSky,drawWorld,info:()=>({time,steamTime,rocketWorking:rocketWorking(),puffs:puffs(),sirens:sirens(),lampGain:lampGain(),meteor:meteor(),paused:!Portal.info().enabled||mode!=='walk'})};
})();
