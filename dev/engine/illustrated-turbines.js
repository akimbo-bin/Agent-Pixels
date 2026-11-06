// Spin only the two fan interiors; retain the painted casing and lit hubs.
const Turbines=(()=>{
 const size=96,fans=[
  {id:'left',x:183.7,y:598.1,rx:12.7,ry:15.7,tilt:.1,speed:.67,hub:[3.8,4.7]},
  {id:'right',x:405,y:573.4,rx:13.2,ry:16.9,tilt:.07,speed:-.59,hub:[4.0,4.6]}
 ];
 let time=0,rotation=0,speedScale=1,prepared=false;
 function prepare(){for(const fan of fans){
  const source=document.createElement('canvas'),frame=document.createElement('canvas');source.width=source.height=frame.width=frame.height=size;
  const sc=source.getContext('2d');sc.setTransform(size/(2*fan.rx),0,0,size/(2*fan.ry),size/2,size/2);sc.rotate(-fan.tilt);sc.translate(-fan.x,-fan.y);sc.drawImage(art,0,0,W,H);
  fan.source=source;fan.frame=frame;fan.frameTime=-1;
 }prepared=true;}
 function tick(dt){if(Portal.info().enabled&&mode==='walk'&&!document.hidden){time+=dt;const target=RoomStates.state('engine')==='working'?4:1;speedScale+=(target-speedScale)*(1-Math.exp(-dt*2));rotation+=dt*speedScale;}}
 function draw(){if(mode!=='walk'||!Portal.info().enabled)return;if(!prepared)prepare();const step=Math.floor(rotation*24);
  for(const fan of fans){if(fan.frameTime!==step){fan.frameTime=step;const c=fan.frame.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,size,size);c.save();c.translate(size/2,size/2);c.rotate(step/24*fan.speed);c.imageSmoothingEnabled=false;c.drawImage(fan.source,-size/2,-size/2);c.restore();
   c.globalCompositeOperation='destination-in';const edge=c.createRadialGradient(size/2,size/2,size*.47,size/2,size/2,size/2);edge.addColorStop(0,'white');edge.addColorStop(1,'transparent');c.fillStyle=edge;c.fillRect(0,0,size,size);c.globalCompositeOperation='source-over';
  }
  ctx.save();ctx.translate(fan.x,fan.y);ctx.rotate(fan.tilt);ctx.scale(fan.rx,fan.ry);ctx.imageSmoothingEnabled=false;ctx.drawImage(fan.frame,-1,-1,2,2);ctx.restore();
  // Stationary spindle keeps its original warm light and joins the housing.
  ctx.save();ctx.beginPath();ctx.ellipse(fan.x,fan.y,...fan.hub,fan.tilt,0,Math.PI*2);ctx.clip();ctx.drawImage(art,0,0,W,H);ctx.restore();
 }
 }
 return{tick,draw,info:()=>({state:RoomStates.state('engine'),time,speedScale,paused:!Portal.info().enabled||mode!=='walk',fans:fans.map(f=>({id:f.id,angle:rotation*f.speed,center:[f.x,f.y]}))})};
})();
