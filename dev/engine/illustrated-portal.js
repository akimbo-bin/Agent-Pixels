// Animate only the illustrated aperture, in its own elliptical perspective.
const Portal=(()=>{
 const cx=1193.5,cy=350.5,rx=23.5,ry=34.5,tilt=.22,size=128;
 const source=document.createElement('canvas'),frame=document.createElement('canvas');
 source.width=source.height=frame.width=frame.height=size;
 const sc=source.getContext('2d'),fc=frame.getContext('2d');
 let prepared=false,time=0,lastFrame=-1,enabled=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 try{const pref=localStorage.getItem('nebula-world-motion');if(pref!==null)enabled=pref==='1';}catch{}
 function prepare(){
  // Inverse of the world ellipse transform: source circle rotates without
  // rotating the housing, changing the ellipse or sampling adjacent machinery.
  sc.setTransform(size/(2*rx),0,0,size/(2*ry),size/2,size/2);
  sc.rotate(-tilt);sc.translate(-cx,-cy);sc.drawImage(art,0,0,W,H);
  sc.setTransform(1,0,0,1,0,0);prepared=true;
 }
 function tick(dt){if(enabled&&mode==='walk'&&!document.hidden)time+=dt;}
 function draw(){
  if(!prepared)prepare();
  // Native artwork is unchanged at time zero / with motion disabled.
  if(!enabled||mode!=='walk')return;
  const step=Math.floor(time*12);
  if(step!==lastFrame){lastFrame=step;const t=step/12;
   fc.setTransform(1,0,0,1,0,0);fc.clearRect(0,0,size,size);fc.save();
   fc.translate(size/2,size/2);fc.rotate(t*.24);fc.imageSmoothingEnabled=false;
   fc.drawImage(source,-size/2,-size/2);fc.restore();
   // A few tiny sparks travel with the vortex, rather than covering it
   // with a second procedural spiral.
   fc.globalCompositeOperation='screen';
   for(let i=0;i<9;i++){const a=i*2.399-t*.32,r=25+(i*13%30),pulse=.12+.18*(.5+.5*Math.sin(t*2+i));fc.fillStyle=`rgba(230,186,255,${pulse})`;fc.fillRect(Math.round(64+Math.cos(a)*r),Math.round(64+Math.sin(a)*r),i%3===0?2:1,2);}
   // Feather the aperture into the original pixels; retain the real bezel.
   fc.globalCompositeOperation='destination-in';const mask=fc.createRadialGradient(64,64,51,64,64,64);mask.addColorStop(0,'white');mask.addColorStop(1,'transparent');fc.fillStyle=mask;fc.fillRect(0,0,size,size);fc.globalCompositeOperation='source-over';
  }
  ctx.save();ctx.translate(cx,cy);ctx.rotate(tilt);ctx.scale(rx,ry);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,-1,-1,2,2);
  ctx.globalCompositeOperation='screen';const pulse=.035+.025*Math.sin(time*1.7);
  const glow=ctx.createRadialGradient(0,0,0,0,0,1.06);glow.addColorStop(0,`rgba(239,175,255,${pulse})`);glow.addColorStop(.7,`rgba(155,55,255,${pulse})`);glow.addColorStop(1,'rgba(155,55,255,0)');ctx.fillStyle=glow;ctx.fillRect(-1.06,-1.06,2.12,2.12);ctx.restore();
  // The little foreground brace crosses the aperture. Repaint its actual
  // pixels above the moving light, so the vortex stays behind the machinery.
  ctx.save();ctx.beginPath();[[1184,369],[1189,372],[1190,384],[1184,386],[1181,382]].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(art,0,0,W,H);ctx.restore();
 }
 function init(){const toggle=$('#motion');toggle.checked=enabled;toggle.onchange=()=>{enabled=toggle.checked;try{localStorage.setItem('nebula-world-motion',enabled?'1':'0');}catch{}canvas.focus();};}
 return{init,tick,draw,info:()=>({enabled,paused:mode!=='walk',time,center:[cx,cy],radii:[rx,ry]})};
})();
