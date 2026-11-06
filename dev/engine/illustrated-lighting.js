// Authored light sources use bright violet pixels from the existing machine art.
const RoomLighting=(()=>{
 const rooms={
  data:{name:'Data',state:'idle',power:0,phase:.7,sources:[[566,551,49,40],[565,588,51,16]],spills:[[590,607,38,8]]},
  training:{name:'Training',state:'idle',power:0,phase:3.1,sources:[[735,494,58,110],[911,493,54,111],[812,565,76,49]],spills:[[761,618,34,8],[850,628,64,13],[938,619,31,8]]}
 };
 let time=0,prepared=false;
 try{const saved=JSON.parse(localStorage.getItem('nebula-room-lighting')||'{}');for(const[id,r]of Object.entries(rooms))if(['idle','working'].includes(saved[id]))r.state=saved[id];}catch{}
 for(const r of Object.values(rooms))r.power=r.state==='working'?1:0;
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
 function setRoomState(id,state){if(!rooms[id]||!['idle','working'].includes(state))return false;rooms[id].state=state;const field=$('#power-'+id);if(field)field.value=state;try{localStorage.setItem('nebula-room-lighting',JSON.stringify(Object.fromEntries(Object.entries(rooms).map(([id,r])=>[id,r.state]))));}catch{}return true;}
 function tick(dt){const moving=Portal.info().enabled&&mode==='walk'&&!document.hidden;if(!moving)return;time+=dt;for(const r of Object.values(rooms)){const target=r.state==='working'?1:0;r.power+=(target-r.power)*Math.min(1,dt*2.5);}}
 function level(r){const t=time+r.phase,p=r.power;
  const breathe=.5+.5*Math.sin(t*(.85+p*1.2));
  // Independent channels, softened dips and brief bright surges; never a
  // full-room strobe or a blackout of the authored lighting.
  const shimmer=(Math.sin(t*8.1)*Math.sin(t*5.3)+1)/2;
  const surge=Math.pow(Math.max(0,Math.sin(t*1.6)),16);
  return .06+.055*breathe+p*(.23+.1*breathe+.075*shimmer+.17*surge);
 }
 function draw(){if(mode!=='walk')return;if(!prepared)prepare();ctx.save();ctx.globalCompositeOperation='screen';
  for(const r of Object.values(rooms)){
   // With motion off, preserve the selected room state as a steady light.
   const enabled=Portal.info().enabled;
   const power=enabled?r.power:r.state==='working'?1:0;
   const gain=enabled?level(r):.085+power*.33;
   for(const [index,source] of r.sources.entries()){const[x,y,w,h]=source;const channel=enabled?1-power*.16*(.5+.5*Math.sin(time*(7.3+index*.67)+r.phase+index*2.1)):1;ctx.globalAlpha=gain*channel*.64;ctx.drawImage(source.halo,x-8,y-8,w+16,h+16);ctx.globalAlpha=gain*channel;ctx.drawImage(source.texture,x,y,w,h);}
   for(const[x,y,rx,ry]of r.spills){ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(162,62,255,${gain*(.13+.15*power)})`);g.addColorStop(1,'rgba(162,62,255,0)');ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();}
  }ctx.restore();
 }
 function init(){for(const[id,r]of Object.entries(rooms)){$('#power-'+id).value=r.state;$('#power-'+id).onchange=e=>setRoomState(id,e.target.value);}$('#lighting-toggle').onclick=()=>{const panel=$('#lighting-panel');panel.hidden=!panel.hidden;$('#lighting-toggle').setAttribute('aria-expanded',String(!panel.hidden));};$('#lighting-close').onclick=()=>{$('#lighting-panel').hidden=true;$('#lighting-toggle').setAttribute('aria-expanded','false');canvas.focus();};document.querySelectorAll('[data-light-view]').forEach(b=>b.onclick=()=>{if(Lift.hasPassenger()){message('Finish the elevator ride first.');return;}setMode('walk');spawn(b.dataset.lightView);setZoom(3);});}
 return{init,tick,draw,setRoomState,info:()=>({time,paused:mode!=='walk'||!Portal.info().enabled,rooms:Object.fromEntries(Object.entries(rooms).map(([id,r])=>[id,{state:r.state,power:r.power,brightness:level(r)}]))})};
})();
