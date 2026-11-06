// Small environmental details, kept separate from saved map geometry.
const AmbientDetails=(()=>{
 let time=0,steamTime=0;
 const events=[{at:4.5,a:[140,25],b:[300,90]},{at:25.5,a:[520,22],b:[710,95]},{at:49,a:[1130,10],b:[1310,85]},{at:76,a:[890,10],b:[760,78]},{at:103,a:[1330,36],b:[1410,104]}];
 const puff=document.createElement('canvas');puff.width=24;puff.height=16;
 const pg=puff.getContext('2d');for(const[x,y,r]of [[8,9,7],[15,7,6],[18,10,5]]){const glow=pg.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,'rgba(226,232,250,.65)');glow.addColorStop(.5,'rgba(190,205,231,.36)');glow.addColorStop(1,'rgba(184,201,230,0)');pg.fillStyle=glow;pg.fillRect(x-r,y-r,r*2,r*2);}
 const rocketWorking=()=>HardwareActivity.roomState('engine')==='working';
 function tick(dt){if(!Portal.info().enabled||mode!=='walk'||document.hidden)return;time+=dt;if(rocketWorking())steamTime+=dt;else steamTime=0;}
 function meteor(){const local=time%128;const event=events.find(e=>local>=e.at&&local<e.at+1.1);return event?{...event,age:local-event.at}:null;}
 function drawSky(){if(mode!=='walk'||!Portal.info().enabled)return;const m=meteor();if(!m)return;const u=m.age/1.1,tail=Math.max(0,u-.32),x=m.a[0]+(m.b[0]-m.a[0])*u,y=m.a[1]+(m.b[1]-m.a[1])*u,tx=m.a[0]+(m.b[0]-m.a[0])*tail,ty=m.a[1]+(m.b[1]-m.a[1])*tail,fade=Math.sin(Math.PI*u);
  ctx.save();StarTwinkle.clipSky();ctx.globalCompositeOperation='screen';const line=ctx.createLinearGradient(tx,ty,x,y);line.addColorStop(0,'rgba(111,113,255,0)');line.addColorStop(.5,'rgba(159,173,255,.35)');line.addColorStop(1,'rgba(239,249,255,1)');ctx.strokeStyle=line;ctx.globalAlpha=fade*.22;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(x,y);ctx.stroke();ctx.globalAlpha=fade;ctx.lineWidth=.85;ctx.stroke();ctx.fillStyle='#f0fbff';ctx.fillRect(x-.6,y-.6,1.2,1.2);ctx.restore();
 }
 function lampGain(){return .93+.035*Math.sin(time*1.9)+.012*Math.sin(time*8.3)+.008*Math.sin(time*15.7)-.035*Math.pow(Math.max(0,Math.sin(time*.73)),18);}
 function drawLamp(){const gain=Portal.info().enabled?lampGain():.94;ctx.save();path(ctx,[[1185,696],[1193,695],[1207,706],[1204,710],[1190,703]]);ctx.clip();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=1-gain;ctx.fillStyle='#694621';ctx.fillRect(1183,693,27,19);ctx.restore();ctx.save();ctx.translate(1199,704);ctx.scale(15,12);ctx.globalCompositeOperation='screen';const glow=ctx.createRadialGradient(0,0,0,0,0,1);glow.addColorStop(0,`rgba(255,198,103,${.045+(gain-.85)*.45})`);glow.addColorStop(1,'rgba(255,176,65,0)');ctx.fillStyle=glow;ctx.fillRect(-1,-1,2,2);ctx.restore();}
 function puffs(){if(!rocketWorking()||!Portal.info().enabled)return[];const result=[];for(let side=0;side<2;side++)for(let i=0;i<4;i++){const life=2.7+side*.2,age=(steamTime+i*.67+side*.31)%life,u=age/life;result.push({x:(side?252:224)+(side?1:-1)*(u*6)+Math.sin(age*2+i)*1.2,y:586-u*14,w:4+u*6,h:3+u*5,alpha:Math.sin(Math.PI*u)*.38});}return result;}
 function drawSteam(){const particles=puffs();if(!particles.length)return;ctx.save();ctx.beginPath();ctx.rect(210,566,60,36);ctx.moveTo(225,570);ctx.lineTo(250,570);ctx.lineTo(250,589);ctx.lineTo(225,589);ctx.closePath();ctx.clip('evenodd');ctx.imageSmoothingEnabled=false;for(const p of particles){ctx.globalAlpha=p.alpha;ctx.drawImage(puff,p.x-p.w/2,p.y-p.h/2,p.w,p.h);}ctx.restore();}
 function drawWorld(){if(mode!=='walk')return;drawLamp();drawSteam();}
 return{tick,drawSky,drawWorld,info:()=>({time,steamTime,rocketWorking:rocketWorking(),puffs:puffs(),lampGain:lampGain(),meteor:meteor(),paused:!Portal.info().enabled||mode!=='walk'})};
})();
