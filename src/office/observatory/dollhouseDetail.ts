import type {RoomSlot} from './dollhouseProjection.js';

// All shapes are hand-authored Canvas primitives, drawn over the existing
// Agent Pixels simulation. No generated images, CSS actors, or mock entities.
type C=CanvasRenderingContext2D;
const rgba=(hex:string,a:number)=>hex+Math.round(Math.max(0,Math.min(1,a))*255).toString(16).padStart(2,'0');
function box(c:C,x:number,y:number,w:number,h:number,color:string){
  c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function path(c:C,points:number[],color:string){
  c.beginPath();c.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);
  c.closePath();c.fillStyle=color;c.fill();
}
function seg(c:C,x:number,y:number,x2:number,y2:number,color:string,width=1){
  c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function oval(c:C,x:number,y:number,rx:number,ry:number,color:string,stroke=false,width=2){
  c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  if(stroke){c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  else{c.fillStyle=color;c.fill();}
}
function light(c:C,x:number,y:number,radius:number,color:string,power=.42){
  const g=c.createRadialGradient(x,y,0,x,y,radius);
  g.addColorStop(0,rgba(color,power));g.addColorStop(.36,rgba(color,power*.36));
  g.addColorStop(1,rgba(color,0));
  c.fillStyle=g;c.fillRect(x-radius,y-radius,2*radius,2*radius);
}
function label(c:C,txt:string,x:number,y:number,size=10,color='#c6d7e6'){
  c.textBaseline='top';c.textAlign='left';c.font='bold '+size+'px ui-monospace, Consolas, monospace';c.fillStyle=color;c.fillText(txt,x,y);
}
function star(c:C,x:number,y:number,color:string,r=2){
  box(c,x-r/2,y-r/2,r,r,color);
  seg(c,x-r*2,y,x+r*2,y,rgba(color,.35));
  seg(c,x,y-r*2,x,y+r*2,rgba(color,.35));
}
function railing(c:C,x:number,y:number,w:number){
  // Disconnected from navigation tiles: purely the foreground visual balustrade.
  for(let pos=x+8;pos<x+w-5;pos+=26){
    box(c,pos,y-18,3,19,'#8d86ab');
    box(c,pos-2,y-21,7,4,'#dcb38b');
    light(c,pos+1,y-22,12,'#ffbe8b',.14);
  }
  seg(c,x+4,y-17,x+w-4,y-17,'#bfa1af',3);
  seg(c,x+4,y-11,x+w-4,y-11,'#3a3856',2);
}
function archedLamp(c:C,x:number,y:number){
  box(c,x-1,y-22,3,23,'#87647b');
  path(c,[x-9,y,x+9,y,x+6,y-10,x-6,y-10],'#d9af79');
  box(c,x-5,y-7,10,7,'#f3d8a7');
  light(c,x,y,38,'#ffdc9a',.42);
}
function rivet(c:C,x:number,y:number){box(c,x,y,3,3,'#e0b88a');box(c,x+1,y+1,1,1,'#675573');}
function drawArchitecture(c:C,r:RoomSlot){
  const x=r.x,y=r.y,w=r.w;
  // Real cross-section sidewalls: two visible depth-return facets, not an
  // overhead grid. The narrow returns leave the original room assets readable.
  const d=Math.min(26,Math.max(15,w*.065));
  path(c,[x+8,y+20,x+d+6,y+34,x+d+6,y+137,x+8,y+148],'#14152390');
  path(c,[x+w-8,y+20,x+w-d-6,y+34,x+w-d-6,y+137,x+w-8,y+148],'#14132096');
  seg(c,x+d+6,y+34,x+d+6,y+137,rgba(r.accent,.35),2);
  seg(c,x+w-d-6,y+34,x+w-d-6,y+137,rgba(r.accent,.28),2);
  seg(c,x+10,y+146,x+d+6,y+139,'#d2b08a',2);
  seg(c,x+w-10,y+146,x+w-d-6,y+139,'#bd9b94',2);
  // Projected flooring: shallow oblique parallelogram with a restrained rug.
  const x0=x+Math.max(27,w*.13),x1=x+w-Math.max(27,w*.13);
  const rear=y+153,front=y+203;
  path(c,[x0+11,rear,x1-11,rear,x1,front,x0,front],rgba(r.accent,.08));
  path(c,[x0+12,rear+5,x1-12,rear+5,x1-9,front-5,x0+9,front-5], '#1c1b39a8');
  seg(c,x0+11,rear+5,x1-11,rear+5,rgba(r.accent,.42),2);
  seg(c,x0+9,front-5,x1-9,front-5,rgba(r.accent,.46),2);
  seg(c,x0+13,rear+5,x0+9,front-5,rgba(r.accent,.23));
  seg(c,x1-13,rear+5,x1-9,front-5,rgba(r.accent,.23));
  // Parallax-looking warm/cool wall sconces between the columns.
  const offsets=w>380?[.21,.79]:[.5];
  for(const fraction of offsets){
    const sx=x+w*fraction,sy=y+56;
    light(c,sx,sy,39,r.accent,.23);
    box(c,sx-3,sy-10,6,18,'#4e405d');
    box(c,sx-7,sy-11,14,5,'#ceaa83');
    box(c,sx-5,sy-7,10,9,'#ffdfb0');
  }
  const n=Math.floor(w/58);
  for(let i=0;i<n;i++){
    const xx=x+25+(i+.5)*(w-45)/n;
    rivet(c,xx,y+17);rivet(c,xx,y+207);
  }
}
function observatory(c:C,r:RoomSlot,time:number){
  const x=r.x,y=r.y,w=r.w;
  // Deep celestial observatory glazing: starfield and a structural arch.
  // The large "telescope-foundation" sprite remains excluded by the renderer.
  const gx=x+w*.78,gy=y+82,phase=time*.0007;
  const swirl=c.createRadialGradient(gx-11,gy-8,5,gx,gy,51);
  swirl.addColorStop(0,'#e4ddff');swirl.addColorStop(.10,'#9ee9f8');
  swirl.addColorStop(.24,'#6259cb');swirl.addColorStop(.55,'#b46be4');
  swirl.addColorStop(.85,'#4c347a');swirl.addColorStop(1,'#20235300');
  c.fillStyle=swirl;oval(c,gx,gy,57,43,swirl as unknown as string);
  for(let j=0;j<5;j++){
    c.beginPath();
    c.ellipse(gx,gy,12+j*9,6+j*6,(-.28+j*.14)+Math.sin(phase)*.04,0,Math.PI*2);
    c.lineWidth=j===2?4:2;
    c.strokeStyle=j%2===0?'#ddc0ffb5':'#71c5f3bd';c.stroke();
  }
  light(c,gx,gy,83,'#b982ff',.28);
  star(c,gx+13,gy-24,'#ffffff',3);
  // Dome ribs bend around the room instead of simply repeating vertical bars.
  for(let i=0;i<=8;i++){
    const xx=x+24+(w-48)*i/8;
    const depth=Math.abs(i-4)/4;
    seg(c,xx,y+126,xx+((i-4)*2),y+35+depth*14,'#9e9ac78a',i%4===0?4:2);
    rivet(c,xx-1,y+125);
  }
  // Tiny lit circuitry framing five model-development stations.
  for(let j=0;j<5;j++){
    const sx=x+43+j*(w-83)/5;
    box(c,sx,y+165,6,12,'#485a8d');
    box(c,sx+4,y+174,19,4,'#8a7aa8');
    star(c,sx+19,y+164,['#8ccdf3','#e2aaff','#88e5da','#bcc4ff','#e6b5e9'][j],2);
  }
}
function rocketWorkshop(c:C,r:RoomSlot){
  const x=r.x,y=r.y,w=r.w;
  // Gantry bridge and crane cable, scaled as architecture rather than an overlay.
  box(c,x+36,y+47,w*.45,7,'#88623e');
  box(c,x+39,y+54,w*.41,3,'#e0ab69');
  for(let i=0;i<9;i++){
    const xx=x+47+i*w*.4/8;
    seg(c,xx,y+56,xx+11,y+91,'#bd8558',2);
    rivet(c,xx,y+56);
  }
  const bx=x+w*.39;
  box(c,bx,y+55,7,11,'#e2a870');
  seg(c,bx+3,y+66,bx+3,y+126,'#c2a5a0',2);
  path(c,[bx-5,y+130,bx+9,y+130,bx+4,y+139,bx-1,y+139],'#bd945f');
  light(c,bx,y+140,47,'#f9aa68',.25);
  // Warm machinery and illuminated measuring rulers.
  box(c,x+w*.65,y+48,w*.21,74,'#203750');
  box(c,x+w*.66,y+49,w*.19,2,'#8fe2ed');
  for(let i=0;i<7;i++){
    box(c,x+w*.68+i*12,y+59+(i%3)*9,7,2,'#b4d7e5');
  }
  for(let i=0;i<5;i++){
    const xx=x+48+i*w*.15;
    box(c,xx,y+192,16,4,'#ac815b');
    box(c,xx+3,y+197,3,8,'#61516a');
  }
}
function dataCenter(c:C,r:RoomSlot){
  const x=r.x,y=r.y,w=r.w;
  const cx=x+w*.77,cy=y+88;
  // Isometric signal crystal over the desk, no fake data or metric values.
  path(c,[cx,cy-28,cx+25,cy-9,cx+21,cy+17,cx,cy+29,cx-24,cy+12,cx-18,cy-16],'#324576');
  for(const a of [[0,-28,0,29],[-24,12,25,-9],[-18,-16,21,17]]){
    seg(c,cx+a[0],cy+a[1],cx+a[2],cy+a[3],'#a5e7f1',2);
  }
  light(c,cx,cy,54,'#74d6eb',.32);
  // LED workbench backdrop.
  for(let i=0;i<5;i++){
    box(c,x+28+i*29,y+126,19,4,i%2?'#67b6cd':'#b9addf');
  }
}
function compute(c:C,r:RoomSlot){
  const x=r.x,y=r.y,w=r.w;
  const cx=x+w*.55,cy=y+110;
  oval(c,cx,cy,36,14,'#8e5bc9',true,4);
  oval(c,cx,cy,22,9,'#a5d9ff',true,2);
  star(c,cx,cy-8,'#e2e2ff',3);
  light(c,cx,cy,69,'#9e76fc',.3);
  for(let i=0;i<4;i++){
    box(c,x+27+i*(w-45)/4,y+152,11,7,'#26386b');
    box(c,x+29+i*(w-45)/4,y+155,6,2,'#5acfe2');
  }
}
function modelGallery(c:C,r:RoomSlot){
  const x=r.x,y=r.y;
  for(let i=0;i<3;i++){
    const xx=x+25+i*52;
    oval(c,xx+12,y+110,17,5,'#47335d');
    oval(c,xx+12,y+68,17,30,'#ad9bcb',true,2);
    light(c,xx+12,y+75,25,'#be8afd',.25);
    box(c,xx+2,y+107,22,5,'#a18fc7');
  }
}
function operations(c:C,r:RoomSlot){
  const x=r.x,y=r.y,w=r.w;
  const colors=['#73d8ef','#a49cf5','#f4bc88','#86e9cb'];
  const tags=['RENDER','TRAIN','REVIEW','EXPERIMENT'];
  for(let i=0;i<4;i++){
    const px=x+23+i*(w-43)/4,cy=y+84;
    box(c,px,cy,Math.floor((w-55)/4),32,'#122148');
    seg(c,px+4,cy+4,px+Math.floor((w-67)/4),cy+4,colors[i],2);
    label(c,tags[i],px+3,cy+16,7,'#dceafc');
    box(c,px+3,cy+27,8,2,colors[i]);
  }
}
function clerical(c:C,r:RoomSlot){
  const x=r.x,y=r.y,w=r.w;
  for(let i=0;i<4;i++){
    box(c,x+w*.25+i*18,y+130,13,20,'#927285');
    box(c,x+w*.25+i*18,y+127,13,3,i%2===0?'#dfc6b9':'#b1bbda');
  }
  box(c,x+w*.18,y+154,w*.58,6,'#d2ab83');
}
function medical(c:C,r:RoomSlot){
  const x=r.x,y=r.y;
  box(c,x+33,y+55,57,46,'#1e405c');
  seg(c,x+38,y+77,x+44,y+77,'#84eadd',2);
  for(let i=0;i<4;i++)seg(c,x+44+i*9,y+76+(i%2?7:-9),x+52+i*9,y+76,'#8ce7e4',2);
  light(c,x+62,y+76,39,'#83d5cf',.2);
}
function quality(c:C,r:RoomSlot){
  const x=r.x,y=r.y;
  for(let i=0;i<5;i++){
    const xx=x+35+i*66;
    box(c,xx,y+125,43,25,'#1b3148');
    box(c,xx+3,y+129,37,15,'#425b79');
    seg(c,xx+8,y+138,xx+16,y+142,'#a0e2d9',2);
    seg(c,xx+16,y+142,xx+30,y+133,'#a0e2d9',2);
  }
}
function ticketing(c:C,r:RoomSlot){
  const x=r.x,y=r.y,w=r.w;
  for(let i=0;i<3;i++){
    const px=x+28+i*(w-59)/3;
    box(c,px,y+144,Math.floor((w-72)/3),44,'#3d2d51');
    box(c,px+4,y+148,Math.floor((w-90)/3),35,['#996a82','#6c82b7','#a77fae'][i]);
    label(c,['QUEUE','REVIEW','READY'][i],px+7,y+154,9,'#f1ddde');
    for(let j=0;j<3;j++)box(c,px+8+j*11,y+170,8,2,'#e0cde5');
  }
}
function office(c:C,r:RoomSlot){
  const x=r.x,y=r.y,w=r.w;
  // Antique desk lamps and warm ambient bric-a-brac echo existing sprite art.
  archedLamp(c,x+w*.49,y+151);
  if(r.key==='lead'){
    const cx=x+w*.85,cy=y+119;
    oval(c,cx,cy,22,22,'#dfb871',true,3);
    oval(c,cx,cy,18,8,'#b4a1ee',true,2);
    seg(c,cx,cy-22,cx,cy+22,'#d6a678',2);
    seg(c,cx,cy+23,cx,cy+35,'#c99e78',3);
    glowSmall(c,cx,cy);
  }
}
function glowSmall(c:C,x:number,y:number){light(c,x,y,34,'#c795f7',.2);}
export function drawObservatoryCanopy(c:C,r:RoomSlot):void{
  // A raised skylight above the top storey, like an architectural section.
  // It has no physics or hit-testing footprint and cannot block any agent.
  const left=r.x+9,right=r.x+r.w-9,width=right-left;
  const top=r.y+8,control=r.y-158,base=r.y+17;
  const roof=(t:number)=>Math.pow(1-t,2)*top+2*(1-t)*t*control+t*t*top;
  c.save();
  c.beginPath();c.moveTo(left,base);c.lineTo(left,top);
  c.quadraticCurveTo(left+width/2,control,right,top);
  c.lineTo(right,base);c.closePath();c.clip();
  const sky=c.createLinearGradient(left,r.y-76,left,r.y+30);
  sky.addColorStop(0,'#0f1b55');sky.addColorStop(.42,'#322480');sky.addColorStop(.76,'#563ba3');sky.addColorStop(1,'#192d68');
  c.fillStyle=sky;c.fillRect(left,r.y-90,width,120);
  light(c,r.x+r.w*.65,r.y-2,95,'#bf91fc',.28);
  for(let i=0;i<67;i++){
    const sx=left+((i*127+37)%Math.floor(width-8))+4;
    const sy=r.y-89+((i*73+17)%110);
    const rr=i%11===0?3:2;
    star(c,sx,sy,i%3===0?'#c5b3ff':'#ebefff',rr);
  }
  // Steel and gold framing gives the glass an unmistakable curved silhouette.
  for(let i=0;i<=12;i++){
    const t=i/12,x=left+width*t,y=roof(t);
    seg(c,x,y+4,x,r.y+30,'#a9a2dc96',i%3===0?4:2);
  }
  c.restore();
  // Perimeter bevel and masonry cornice.
  c.beginPath();c.moveTo(left,base);c.lineTo(left,top);
  c.quadraticCurveTo(left+width/2,control,right,top);c.lineTo(right,base);
  c.strokeStyle='#a99cc6';c.lineWidth=7;c.stroke();
  c.beginPath();c.moveTo(left,top);
  c.quadraticCurveTo(left+width/2,control,right,top);
  c.strokeStyle='#e9c8a3';c.lineWidth=2;c.stroke();
  seg(c,left-2,base,right+2,base,'#e3b889',5);
  light(c,left+width*.45,r.y-45,60,'#af8dee',.14);
}
export function drawRoomArchitecture(c:C,r:RoomSlot):void{drawArchitecture(c,r);}
export function drawRoomDepth(c:C,r:RoomSlot,time:number):void{
  drawRoomArchitecture(c,r);
  switch(r.key){
    case 'observatory':observatory(c,r,time);break;
    case 'engineering':rocketWorkshop(c,r);break;
    case 'data':dataCenter(c,r);break;
    case 'training':compute(c,r);break;
    case 'gallery':modelGallery(c,r);break;
    case 'rendering':operations(c,r);break;
    case 'reception':clerical(c,r);break;
    case 'clinic':medical(c,r);break;
    case 'review':quality(c,r);break;
    case 'experiments':ticketing(c,r);break;
    case 'lead':case 'leadSol':office(c,r);break;
  }
}
export function drawRoomForeground(c:C,r:RoomSlot):void{
  if(r.key==='observatory'||r.key==='engineering'){
    railing(c,r.x+20,r.y+216,r.w-40);
  }
  // Solid front floor edge covers nothing above the character ankles.
  box(c,r.x+8,r.y+211,r.w-16,4,'#493a58');
  seg(c,r.x+8,r.y+211,r.x+r.w-8,r.y+211,rgba(r.accent,.53),2);
}
