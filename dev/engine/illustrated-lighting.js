// Authored light sources use bright violet pixels from the existing machine art.
const RoomLighting=(()=>{
 const rooms={
  data:{bar:{x:493,y:482.5,count:64,pitch:3,width:2,height:1.5,color:'#69ff9e'},name:'Data',power:0,phase:.7,sources:[[566,551,49,40],[565,588,51,16]],spills:[[590,607,38,8]]},
  training:{bar:{x:741,y:486.5,count:74,pitch:3,width:2,height:1.5,color:'#ff536a'},name:'Training',power:0,phase:3.1,sources:[[735,494,58,110],[911,493,54,111],[812,565,76,49]],spills:[[761,618,34,8],[850,628,64,13],[938,619,31,8]]}
 };
 let time=0,prepared=false;
 function prepare(){
  for(const r of Object.values(rooms))for(const source of r.sources){
   const [x,y,w,h]=source,c=document.createElement('canvas');c.width=w*2;c.height=h*2;
   const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(art,x*2,y*2,w*2,h*2,0,0,w*2,h*2);
   const pixels=g.getImageData(0,0,w*2,h*2);
   for(let i=0;i<pixels.data.length;i+=4){const red=pixels.data[i],green=pixels.data[i+1],blue=pixels.data[i+2];
    // Exclude timber, black panels, cyan screens and warm room fixtures.
    const violet=Math.min(red-green*.95,blue-green*1.08),bright=Math.max(red,blue);
    const strength=Math.max(0,Math.min(1,(violet-12)/70))*Math.max(0,Math.min(1,(bright-85)/130));
    pixels.data[i]=203;pixels.data[i+1]=103;pixels.data[i+2]=255;pixels.data[i+3]=Math.round(strength*255);
   }g.putImageData(pixels,0,0);source.texture=c;
   const halo=document.createElement('canvas');halo.width=c.width+32;halo.height=c.height+32;const hc=halo.getContext('2d');hc.filter='blur(6px)';hc.drawImage(c,16,16);source.halo=halo;
  }prepared=true;
 }
 function setRoomState(id,state){return RoomStates.setRoomState(id,state);}
 function tick(dt){const moving=Portal.info().enabled&&mode==='walk'&&!document.hidden;if(!moving)return;time+=dt;for(const[id,r]of Object.entries(rooms)){const target=RoomStates.animationState(id)==='working'?1:0;r.power+=(target-r.power)*Math.min(1,dt*2.5);}}
 function level(r){const t=time+r.phase,p=1;
  const breathe=.5+.5*Math.sin(t*(.85+p*1.2));
  // Independent channels, softened dips and brief bright surges; never a
  // full-room strobe or a blackout of the authored lighting.
  const shimmer=(Math.sin(t*8.1)*Math.sin(t*5.3)+1)/2;
  const surge=Math.pow(Math.max(0,Math.sin(t*1.6)),16);
  return .06+.055*breathe+p*(.23+.1*breathe+.075*shimmer+.17*surge);
 }
 function draw(){if(mode!=='walk')return;if(!prepared)prepare();ctx.save();ctx.globalCompositeOperation='screen';
  for(const r of Object.values(rooms)){
   // Both states retain the former Working shimmer; ceiling rails signal work.
   const enabled=Portal.info().enabled;
   const power=1;
   const gain=enabled?level(r):.415;
   for(const [index,source] of r.sources.entries()){const[x,y,w,h]=source;const channel=enabled?1-power*.16*(.5+.5*Math.sin(time*(7.3+index*.67)+r.phase+index*2.1)):1;ctx.globalAlpha=gain*channel*.64;ctx.drawImage(source.halo,x-8,y-8,w+16,h+16);ctx.globalAlpha=gain*channel;ctx.drawImage(source.texture,x,y,w,h);}
   for(const[x,y,rx,ry]of r.spills){ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(162,62,255,${gain*(.13+.15*power)})`);g.addColorStop(1,'rgba(162,62,255,0)');ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();}
  }ctx.restore();drawBars();
 }
 function segments(id,r){const n=r.bar.count;if(!Portal.info().enabled)return Array(n).fill(RoomStates.animationState(id)==='working'?.65:0);if(r.power<.005)return Array(n).fill(0);
  const step=Math.floor(time*10);
  if(id==='data'){const head=step%n;return Array.from({length:n},(_,i)=>{const behind=(head-i+n)%n;return behind<9?(1-behind/9)*r.power:0;});}
  const half=(n-1)/2,cycle=(time/3.4)%2,position=(cycle<1?cycle:2-cycle)*half;
  return Array.from({length:n},(_,i)=>Math.max(0,1-Math.abs(Math.abs(i-half)-position)/4.5)*r.power);
 }
 function drawBars(){ctx.save();ctx.globalCompositeOperation='source-over';
  for(const[id,r]of Object.entries(rooms)){const b=r.bar,values=segments(id,r);
   for(let i=0;i<b.count;i++){const x=b.x+i*b.pitch;
    // Tiny dark sockets leave the original metal rail exposed between LEDs.
    ctx.globalAlpha=.8;ctx.fillStyle=id==='data'?'#12382c':'#391b34';ctx.fillRect(x,b.y,b.width,b.height);
    if(values[i]>.01){ctx.globalAlpha=values[i]*.95;ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=2;ctx.fillRect(x,b.y,b.width,b.height);ctx.shadowBlur=0;ctx.globalAlpha=values[i]*.65;ctx.fillStyle=id==='data'?'#d3ffe1':'#ffd5dc';ctx.fillRect(x,b.y,b.width,.5);}
   }
  }ctx.restore();
 }
 function init(){$('#lighting-toggle').onclick=()=>{const panel=$('#lighting-panel');panel.hidden=!panel.hidden;$('#lighting-toggle').setAttribute('aria-expanded',String(!panel.hidden));};$('#lighting-close').onclick=()=>{$('#lighting-panel').hidden=true;$('#lighting-toggle').setAttribute('aria-expanded','false');canvas.focus();};document.querySelectorAll('[data-light-view]').forEach(b=>b.onclick=()=>{if(Lift.hasPassenger()){message('Finish the elevator ride first.');return;}setMode('walk');spawn(b.dataset.lightView);setZoom(3);});}
 return{init,tick,draw,setRoomState,stateOf:RoomStates.state,info:()=>({time,paused:mode!=='walk'||!Portal.info().enabled,rooms:Object.fromEntries(Object.entries(rooms).map(([id,r])=>[id,{state:RoomStates.state(id),liveState:RoomStates.get(id).liveState,power:r.power,effectState:RoomStates.animationState(id),brightness:level(r),bar:segments(id,r)}]))})};
})();
