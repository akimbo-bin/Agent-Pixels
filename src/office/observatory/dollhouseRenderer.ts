import type {OfficeState} from '../engine/officeState.js';
import type {Character} from '../types.js';
import {CharacterState, TILE_SIZE} from '../types.js';
import {getCachedSprite} from '../sprites/spriteCache.js';
import {getCharacterSprites} from '../sprites/spriteData.js';
import {getCharacterSprite} from '../engine/characters.js';
import {HOUSE_H,HOUSE_W,SHAFT,ROOM_SLOTS,projectActor,type FocusCamera,type RoomSlot} from './dollhouseProjection.js';
import {drawRoomDepth,drawRoomForeground,drawObservatoryCanopy} from './dollhouseDetail.js';
import {drawExteriorBack,drawExteriorFront,drawPassageBackdrops} from './dollhouseAtmosphere.js';
import type {ElevatorTransit} from './elevator.js';

type Box={x:number;y:number;w:number;h:number};
type DrawItem={y:number;draw:()=>void};
const hexAlpha=(hex:string,alpha:number)=>hex.slice(0,7)+Math.max(0,Math.min(255,Math.round(alpha*255))).toString(16).padStart(2,'0');
function rect(c:CanvasRenderingContext2D,b:Box,color:string){c.fillStyle=color;c.fillRect(Math.round(b.x),Math.round(b.y),Math.ceil(b.w),Math.ceil(b.h));}
function line(c:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,color:string,w=1){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function text(c:CanvasRenderingContext2D,label:string,x:number,y:number,color='#ffefd8',size=12,bold=true){
 c.textAlign='left';c.textBaseline='top';c.fillStyle=color;c.font=(bold?'bold ':'')+size+'px "Segoe UI", Arial, sans-serif';c.fillText(label,x,y);
}
function glow(c:CanvasRenderingContext2D,x:number,y:number,r:number,color:string){
 const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,hexAlpha(color,.42));g.addColorStop(1,hexAlpha(color,0));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
}
function litWindow(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,accent:string){
 rect(c,{x:x-5,y:y-7,w:w+10,h:h+12},'#422e51');
 rect(c,{x:x-2,y:y-4,w:w+4,h:h+5},'#bb8e6d');
 const win=c.createLinearGradient(x,y,x+w,y+h);win.addColorStop(0,'#0d1747');win.addColorStop(.5,'#332966');win.addColorStop(1,'#0a1a39');
 rect(c,{x,y,w,h},win as unknown as string);
 glow(c,x+w*.56,y+h*.4,w*.65,accent);
 line(c,x+w*.5,y,x+w*.5,y+h,'#c8a57f',3);
 line(c,x,y+h*.53,x+w,y+h*.53,'#8b79ad',2);
 for(let j=0;j<8;j++){
  const sx=x+((j*73+13)%Math.max(12,w-6))+3;
  const sy=y+((j*37+12)%Math.max(14,h-7))+2;
  rect(c,{x:sx,y:sy,w:j%3===0?3:2,h:2},j%2===0?'#c7dfff':'#d4a6ff');
 }
}
function drawOuter(c:CanvasRenderingContext2D){
 rect(c,{x:0,y:0,w:HOUSE_W,h:HOUSE_H},'#070d29');
 const nebula=c.createRadialGradient(1180,162,50,1160,200,850);
 nebula.addColorStop(0,'#7044ac');nebula.addColorStop(.33,'#2f276b');nebula.addColorStop(.75,'#14213d');nebula.addColorStop(1,'#080d26');
 c.fillStyle=nebula;c.fillRect(0,0,HOUSE_W,945);
 for(let n=0;n<140;n++){
  const x=(n*743+173)%HOUSE_W,y=(n*367+17)%935;
  const a=.3+.55*((n*37%17)/17);
  rect(c,{x,y,w:n%11===0?3:2,h:n%7===0?3:2},hexAlpha(n%3===0?'#efdbff':'#b6dfff',a));
 }
 glow(c,1250,135,310,'#9b72f0');
 rect(c,{x:16,y:105,w:1567,h:775},'#161a3a');
 rect(c,{x:20,y:111,w:1559,h:8},'#c69a6b');
 rect(c,{x:20,y:119,w:1559,h:12},'#3c2e57');
 for(let i=0;i<3;i++){
  const y=145+i*234;
  rect(c,{x:24,y:y-11,w:1548,h:5},'#d1a574');
  rect(c,{x:24,y:y+222,w:1548,h:16},'#574162');
  rect(c,{x:24,y:y+223,w:1548,h:3},'#edbf82');
  rect(c,{x:24,y:y+234,w:1548,h:6},'#2b233b');
  for(let k=0;k<23;k++)rect(c,{x:35+k*68,y:y+228,w:18,h:3},'#987460');
 }
 // Rooftop turrets, warm light fixtures, floor cornices.
 for(const x of [41,410,840,1245,1532]){
  rect(c,{x,y:100,w:24,h:16},'#322b53');
  rect(c,{x:x+4,y:91,w:16,h:12},'#be976a');
  glow(c,x+12,121,24,'#ffd09b');
 }
 rect(c,{x:24,y:865,w:1552,h:9},'#d9b084');
 rect(c,{x:24,y:874,w:1552,h:16},'#403256');
 // Foreground walkway and rail, not a 2D top-down room grid.
 rect(c,{x:0,y:891,w:HOUSE_W,h:53},'#25324e');
 for(let x=12;x<HOUSE_W;x+=45)rect(c,{x,y:896,w:35,h:2},'#495479');
 rect(c,{x:0,y:937,w:HOUSE_W,h:63},'#0d1734');
 line(c,0,943,HOUSE_W,943,'#9b70ab',3);
 text(c,'NEBULA RESEARCH DIVISION',38,959,'#d5b8ed',12);
 text(c,'CONNECTED AGENT PIXELS SIMULATION  /  CUTAWAY VIEW',314,959,'#95b4cc',11,false);
 text(c,'ENGINE: ORIGINAL AGENT PIXELS',1220,959,'#b6edd7',11);
}
function drawWall(c:CanvasRenderingContext2D,r:RoomSlot){
 rect(c,{x:r.x,y:r.y,w:r.w,h:r.h},'#1d182e');
 const wall=c.createLinearGradient(r.x,r.y,r.x+r.w*.5,r.y+r.h*.65);
 wall.addColorStop(0,r.palette[0]);wall.addColorStop(.52,r.palette[1]);wall.addColorStop(1,r.palette[2]);
 rect(c,{x:r.x+4,y:r.y+5,w:r.w-8,h:r.h-18},wall as unknown as string);
 // Wall paneling reads as an upright surface; the room does not use a top-down tile grid.
 for(let k=0;k<Math.ceil(r.w/54);k++){
  const x=r.x+8+k*54;
  line(c,x,r.y+18,x,r.y+131,hexAlpha(r.accent,.1),2);
 }
 const spec=c.createLinearGradient(r.x,r.y+30,r.x,r.y+143);
 spec.addColorStop(0,'#fff1b209');spec.addColorStop(1,'#05091b57');
 rect(c,{x:r.x+5,y:r.y+21,w:r.w-10,h:115},spec as unknown as string);
 // Deep skirting board separates true back wall from foreshortened floor.
 rect(c,{x:r.x+6,y:r.y+137,w:r.w-12,h:7},'#3b2b45');
 rect(c,{x:r.x+6,y:r.y+138,w:r.w-12,h:2},'#c5a17a');
 const floor=c.createLinearGradient(r.x,r.y+142,r.x,r.y+216);
 floor.addColorStop(0,hexAlpha(r.accent,.26));floor.addColorStop(.2,'#38334e');floor.addColorStop(1,'#272333');
 c.beginPath();c.moveTo(r.x+11,r.y+144);c.lineTo(r.x+r.w-11,r.y+144);
 c.lineTo(r.x+r.w-4,r.y+214);c.lineTo(r.x+4,r.y+214);c.closePath();c.fillStyle=floor;c.fill();
 // Foreshortened boards: no warped checkerboard.
 for(let j=1;j<5;j++){
  const y=r.y+145+j*14;
  line(c,r.x+8-j,r.y+145+j*14,r.x+r.w-8+j,y,'#c9b59622',1);
 }
 for(let j=1;j<9;j++){
  const x=r.x+r.w*j/9;
  line(c,x,r.y+147,x+(x-r.x-r.w/2)*.11,r.y+211,'#dcc4a211',1);
 }
 // The cross-section is architectural: thick exterior columns and warm lit cornices.
 rect(c,{x:r.x,y:r.y,w:8,h:r.h},'#8d6170');
 rect(c,{x:r.x+r.w-8,y:r.y,w:8,h:r.h},'#8d6170');
 rect(c,{x:r.x+2,y:r.y,w:3,h:r.h},'#d2ab83');
 rect(c,{x:r.x+r.w-5,y:r.y,w:3,h:r.h},'#32233f');
 rect(c,{x:r.x,y:r.y,w:r.w,h:8},'#c7a077');
 rect(c,{x:r.x,y:r.y+8,w:r.w,h:6},'#4d395d');
 rect(c,{x:r.x+5,y:r.y+206,w:r.w-10,h:10},'#644a63');
 rect(c,{x:r.x+5,y:r.y+206,w:r.w-10,h:2},'#f2c58c');
}
function drawRoomBackdrops(c:CanvasRenderingContext2D,r:RoomSlot){
 const left=r.x+22,wallTop=r.y+41;
 if(['lead','leadSol','reception','review','clinic'].includes(r.key)){
  litWindow(c,r.x+r.w*.72,r.y+42,Math.min(96,r.w*.22),78,r.accent);
 }
 if(r.key==='observatory'){
  // Domed cosmic glass and iron ribs; substantial backdrop behind native sprites.
  const x=r.x+19,y=r.y+31,w=r.w-40,h=110;
  c.fillStyle='#10174d';c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+33);
  c.quadraticCurveTo(x+w*.5,y-62,x+w,y+33);c.lineTo(x+w,y+h);c.closePath();c.fill();
  const sky=c.createRadialGradient(x+w*.66,y+36,12,x+w*.55,y+53,w*.65);
  sky.addColorStop(0,'#c182e5');sky.addColorStop(.3,'#5636a2');sky.addColorStop(1,'#0b1748');
  c.fillStyle=sky;c.fill();
  for(let i=0;i<9;i++){
   const col=x+15+i*(w-30)/8;
   line(c,col,y+18+Math.abs(i-4)*5,col,y+h,'#9797cf',i%4===0?4:2);
  }
  for(let k=0;k<43;k++){
   const sx=x+((k*89+37)%(w-10))+5,sy=y+((k*31+12)%104);
   rect(c,{x:sx,y:sy,w:k%5===0?3:2,h:k%7===0?3:2},'#d2bafc');
  }
  glow(c,x+w*.68,y+53,84,'#d08ef8');
  line(c,x,y+110,x+w,y+110,'#e1c0a7',4);
  // Architectural prototypes, not claimed operational stage progression.
  const modules=['PROTOTYPE','CORE','MULTI-NODE','SUITE','NEBULA'];
  for(let i=0;i<modules.length;i++){
   const sx=r.x+36+i*((r.w-72)/5),sy=r.y+136;
   rect(c,{x:sx,y:sy,w:(r.w-88)/5,h:36},'#13244e');
   rect(c,{x:sx+3,y:sy+3,w:(r.w-94)/5,h:26},'#25376c');
   line(c,sx+5,sy+4,sx+(r.w-88)/5-5,sy+4,'#b49bd2',2);
   glow(c,sx+(r.w-88)/10,sy+10,22,['#9de2ff','#e0a6ff','#88ffeb','#b4a8ff','#f7c6e1'][i]);
   text(c,'0'+(i+1),sx+6,sy+7,'#e5d9ff',11);
   text(c,modules[i],sx+5,sy+24,'#c3d6fa',8,false);
   rect(c,{x:sx+6,y:sy+32,w:(r.w-108)/5,h:3},'#c7a083');
  }
  // Module core: an original small holo-display, deliberately not the rejected
  // giant telescope art from the flat tile scene.
  rect(c,{x:r.x+r.w*.47,y:r.y+91,w:33,h:27},'#24385e');
  rect(c,{x:r.x+r.w*.48,y:r.y+92,w:27,h:23},'#5964a0');
  text(c,'✧',r.x+r.w*.485,r.y+92,'#bdfaff',21);
 }
 if(r.key==='lead'||r.key==='leadSol'){
  rect(c,{x:left,y:wallTop,w:r.w*.23,h:105},'#5b362c');
  for(let k=0;k<4;k++){
   rect(c,{x:left+5,y:wallTop+7+k*23,w:r.w*.21-9,h:4},'#ba8052');
   for(let j=0;j<8;j++)rect(c,{x:left+8+j*9,y:wallTop+k*23+10,w:6,h:14},['#d1a365','#7d9bc6','#9d698b'][j%3]);
  }
 }
 if(r.key==='engineering'){
  for(let k=0;k<5;k++){
   const x=left+k*75;
   rect(c,{x,y:r.y+46,w:5,h:83},'#ca9149');
   rect(c,{x:x-3,y:r.y+39,w:11,h:6},'#453445');
  }
  rect(c,{x:r.x+r.w*.55,y:r.y+46,w:r.w*.31,h:85},'#162b4b');
  line(c,r.x+r.w*.55,r.y+46,r.x+r.w*.86,r.y+46,'#9bd3e7',3);
  text(c,'ENGINEERING / BAY 04',r.x+r.w*.58,r.y+54,'#b7dbfc',13);
  text(c,'PROPULSION   -   SYSTEMS',r.x+r.w*.58,r.y+77,'#8ca9db',10);
 }
 if(r.key==='data'){
  rect(c,{x:left,y:r.y+45,w:r.w-42,h:95},'#0c303a');
  line(c,left,r.y+45,left+r.w-42,r.y+45,'#91c6b1',4);
  text(c,'L(θ) = E[(y - ŷ)²]',left+14,r.y+59,'#dbecdc',16,false);
  text(c,'∑  ∇  ∂  ⟂  [ 0  1  0 ]',left+17,r.y+85,'#a1d7d0',13,false);
 }
 if(r.key==='training'||r.key==='rendering'){
  const n=r.key==='training'?5:4;
  for(let k=0;k<n;k++){
   const x=r.x+23+k*(r.w-60)/n;
   rect(c,{x,y:r.y+41,w:(r.w-62)/n-8,h:96},'#1b1d4b');
   rect(c,{x:x+3,y:r.y+44,w:(r.w-62)/n-14,h:87},'#343373');
   for(let j=0;j<4;j++)rect(c,{x:x+9,y:r.y+53+j*18,w:(r.w-62)/n-25,h:4},j%2===0?'#bb83ee':'#62d4df');
  }
  glow(c,r.x+r.w*.58,r.y+86,76,'#976cf3');
 }
 if(r.key==='gallery'){
  for(let i=0;i<3;i++){
   const x=r.x+13+i*56;
   rect(c,{x,y:r.y+51,w:46,h:88},'#282354');
   rect(c,{x:x+4,y:r.y+55,w:38,h:79},'#4d3986');
   text(c,['◈','✧','◇'][i],x+13,r.y+72,'#a5fcff',21);
  }
 }
 if(r.key==='clinic'){
  rect(c,{x:r.x+23,y:r.y+56,w:64,h:70},'#b9c9c2');
  text(c,'+',r.x+45,r.y+65,'#577b77',29);
  line(c,r.x+27,r.y+104,r.x+83,r.y+104,'#6c918e',3);
 }
 if(r.key==='review'){
  rect(c,{x:r.x+24,y:r.y+44,w:r.w*.51,h:88},'#d4d8d3');
  text(c,'QUALITY / ALIGNMENT',r.x+38,r.y+57,'#34526e',14);
  text(c,'✓   ✓   ◇   ✓',r.x+38,r.y+89,'#4b8c85',23);
 }
 if(r.key==='experiments'){
  rect(c,{x:r.x+23,y:r.y+41,w:r.w-46,h:91},'#896f66');
  text(c,'REQUESTS & QUEUE',r.x+38,r.y+56,'#ffe7c9',15);
  for(let i=0;i<6;i++)rect(c,{x:r.x+41+i*33,y:r.y+82,w:20,h:34},['#d6b8ae','#8caee2','#ba88da'][i%3]);
 }
}
function drawLabels(c:CanvasRenderingContext2D,r:RoomSlot){
 const w=Math.min(r.w-24,Math.max(135,r.short.length*8.3+42));
 const x=r.x+13,y=r.y+11;
 rect(c,{x:x-2,y:y-2,w:w+4,h:42},'#b39274');
 rect(c,{x,y,w,h:38},'#0d1836');
 rect(c,{x:x+3,y:y+3,w:3,h:31},r.accent);
 text(c,r.short,x+16,y+6,'#ffe1ab',Math.min(15,r.w<210?11:14));
 text(c,r.category,x+16,y+24,'#b4bbd7',r.w<210?8:10,false);
}
function drawForeshortenedRugs(c:CanvasRenderingContext2D,r:RoomSlot,office:OfficeState){
 // Reuse real Agent Pixels rug pixels as perspective-compressed floor textiles.
 // Their original 128x64 top-down frames cannot be drawn upright as wall art.
 if(!['lead','leadSol','reception','clinic','review'].includes(r.key))return;
 const index=office.getLayout().furniture;
 const physical=office.furniture;
 const rug=index.findIndex(f=>{
   if(!f.type.startsWith('N_RUG'))return false;
   const bounds=r.bounds;
   return f.col>=bounds.col&&f.col<bounds.col+bounds.cols&&
     f.row>=bounds.row&&f.row<bounds.row+bounds.rows;
 });
 if(rug<0||!physical[rug]?.sprite)return;
 const sprite=getCachedSprite(physical[rug].sprite,1);
 const width=Math.min(r.w*.34,140),height=Math.min(15,r.h*.075);
 const x=r.x+(r.w-width)/2,y=r.y+187;
 c.save();c.globalAlpha=.88;
 c.fillStyle='#070b1d6b';c.fillRect(x+5,y+6,width-10,height);
 c.imageSmoothingEnabled=false;
 c.drawImage(sprite,Math.round(x),Math.round(y),Math.round(width),Math.round(height));
 c.restore();
}
function drawNativeFurniture(c:CanvasRenderingContext2D,r:RoomSlot,office:OfficeState){
 const layout=office.getLayout(),drawables:DrawItem[]=[];
 const furniture=office.furniture;
 for(let i=0;i<furniture.length;i++){
  const source=layout.furniture[i],f=furniture[i];if(!source)continue;
  // Omit the earlier giant observatory sprite from cutaway only; preserve in original map.
  if(source.uid==='telescope-foundation')continue;
  // Top-down floor decals are not furniture in a wall-section view: never let
  // a room-sized rug cover the back wall or hide the actual animated actors.
  if(/^N_(RUG|GLOW|DOOR|ARCH|WINDOW)/.test(source.type))continue;
  const centerCol=source.col+(f.sprite?.[0]?.length??16)/(2*TILE_SIZE);
  const centerRow=source.row+Math.min(2,Math.max(1,(f.sprite?.length??16)/TILE_SIZE));
  if(centerCol<r.bounds.col||centerCol>=r.bounds.col+r.bounds.cols||
     centerRow<r.bounds.row||centerRow>=r.bounds.row+r.bounds.rows)continue;
  const srcW=f.sprite?.[0]?.length??16,srcH=f.sprite?.length??16;
  const srcX=(centerCol-r.bounds.col)/r.bounds.cols,srcY=(centerRow-r.bounds.row)/r.bounds.rows;
  const screenX=r.x+22+srcX*(r.w-44);
  const screenY=r.y+139+srcY*61;
  const scale=Math.min(1.45,(r.w*.56)/srcW,(r.h*.51)/srcH) * (.85+.15*srcY);
  if(scale<=0)continue;
  const cached=getCachedSprite(f.sprite,scale);
  const x=Math.round(screenX-cached.width/2),y=Math.round(screenY-cached.height);
  drawables.push({y:screenY,draw:()=>{
   c.save();
   if(f.mirrored){c.translate(x+cached.width,y);c.scale(-1,1);c.drawImage(cached,0,0);}
   else c.drawImage(cached,x,y);
   c.restore();
  }});
 }
 // Keep vintage Agent Pixels furniture as native pixels; depth-sort within a room.
 drawables.sort((a,b)=>a.y-b.y);
 for(const item of drawables)item.draw();
}
function drawCharacters(c:CanvasRenderingContext2D,room:RoomSlot,characters:Character[],ids:Map<number,string>,elevator:ElevatorTransit){
 const drawables:DrawItem[]=[];
 for(const ch of characters){
  if(elevator.isRiding(ch.id))continue;
  const position=projectActor((ch.x-8)/16,(ch.y-8)/16);
  if(position.room!==room.key)continue;
  const cached=getCachedSprite(getCharacterSprite(ch,getCharacterSprites(ch.palette,ch.hueShift)),Math.min(1.6,position.scale*1.2));
  const x=Math.round(position.x-cached.width/2);
  const y=Math.round(position.y-cached.height+(ch.state===CharacterState.TYPE?3:0));
  drawables.push({y:position.y,draw:()=>{
   rect(c,{x:position.x-10,y:position.y-3,w:20,h:4},'#00000064');
   c.drawImage(cached,x,y);
   const label=ids.get(ch.id);
   if(label&&room.w>220){c.font='11px "Segoe UI",sans-serif';c.textAlign='center';
    const tw=c.measureText(label).width;rect(c,{x:position.x-tw/2-5,y:position.y+2,w:tw+10,h:16},'#0a1638dd');
    c.fillStyle='#ffebd5';c.fillText(label,position.x,position.y+5);
   }
  }});
 }
 drawables.sort((a,b)=>a.y-b.y);for(const d of drawables)d.draw();
}
function drawCorridorActors(c:CanvasRenderingContext2D,actors:Character[],ids:Map<number,string>,elevator:ElevatorTransit){
 for(const ch of actors){
  if(elevator.isRiding(ch.id))continue;
  const pos=projectActor((ch.x-8)/16,(ch.y-8)/16);
  if(pos.room)continue;
  const cached=getCachedSprite(getCharacterSprite(ch,getCharacterSprites(ch.palette,ch.hueShift)),1.1);
  c.drawImage(cached,Math.round(pos.x-cached.width/2),Math.round(pos.y-cached.height));
  const name=ids.get(ch.id);if(name&&name.length<17){c.textAlign='center';c.font='10px "Segoe UI",sans-serif';c.fillStyle='#f1e6db';c.fillText(name,pos.x,pos.y+10);}
 }
}
function drawShaft(c:CanvasRenderingContext2D,elevator:ElevatorTransit){
 rect(c,SHAFT,'#080d26');rect(c,{x:SHAFT.x+6,y:SHAFT.y,w:SHAFT.w-12,h:SHAFT.h},'#232748');
 for(const x of [SHAFT.x+9,SHAFT.x+SHAFT.w-13]){
  rect(c,{x,y:SHAFT.y,w:4,h:SHAFT.h},'#a78a9c');line(c,x+1,SHAFT.y,x+1,SHAFT.y+SHAFT.h,'#f0cb9d',1);
 }
 for(let k=0;k<3;k++){
  const y=145+k*234;
  rect(c,{x:SHAFT.x+2,y:y+45,w:SHAFT.w-4,h:122},'#1c274f');
  rect(c,{x:SHAFT.x+11,y:y+57,w:SHAFT.w-22,h:94},'#242b59');
  line(c,SHAFT.x+SHAFT.w/2,y+59,SHAFT.x+SHAFT.w/2,y+151,'#9983aa',3);
  text(c,'L'+(3-k),SHAFT.x+24,y+19,'#ffe2a1',14);
  rect(c,{x:SHAFT.x+8,y:y+156,w:SHAFT.w-16,h:5},'#f7d6a3');
 }
 const active=elevator.getTrips().filter(t=>t.phase==='ride');
 let y=145+156;
 if(active.length){
  const trip=active[0],from=trip.from==='upper'?0:trip.from==='middle'?1:2;
  const to=trip.to==='upper'?0:trip.to==='middle'?1:2;
  const fraction=Math.min(1,trip.rideSeconds/1.2);
  y=145+(from+(to-from)*fraction)*234+149;
 }
 rect(c,{x:SHAFT.x+12,y:y-26,w:SHAFT.w-24,h:35},'#799ec0');
 rect(c,{x:SHAFT.x+16,y:y-23,w:SHAFT.w-32,h:28},'#1a3665');
 rect(c,{x:SHAFT.x+19,y:y-20,w:SHAFT.w-38,h:3},'#8eeff6');
 glow(c,SHAFT.x+SHAFT.w/2,y-9,37,'#9dfaff');
}
const backgroundCache=new WeakMap<OfficeState,HTMLCanvasElement>();
function staticCutawayBackground(office:OfficeState):HTMLCanvasElement{
 const previous=backgroundCache.get(office);
 if(previous)return previous;
 const canvas=document.createElement('canvas');
 canvas.width=HOUSE_W;canvas.height=HOUSE_H;
 const c=canvas.getContext('2d');
 if(!c)throw Error('Cutaway background canvas could not initialize');
 c.imageSmoothingEnabled=false;
 drawOuter(c);
 drawExteriorBack(c);
 const dome=ROOM_SLOTS.find(r=>r.key==='observatory');
 if(dome)drawObservatoryCanopy(c,dome);
 for(const room of ROOM_SLOTS){
  c.save();
  c.beginPath();c.rect(room.x,room.y,room.w,room.h);c.clip();
  drawWall(c,room);
  drawRoomBackdrops(c,room);
  drawRoomDepth(c,room,0);
  drawForeshortenedRugs(c,room,office);
  c.restore();
 }
 drawPassageBackdrops(c);
 backgroundCache.set(office,canvas);
 return canvas;
}
let exteriorForegroundCache:HTMLCanvasElement|null=null;
function staticExteriorForeground():HTMLCanvasElement{
 if(exteriorForegroundCache)return exteriorForegroundCache;
 const canvas=document.createElement('canvas');canvas.width=HOUSE_W;canvas.height=HOUSE_H;
 const c=canvas.getContext('2d');if(!c)throw Error('Exterior foreground context unavailable');
 drawExteriorFront(c);exteriorForegroundCache=canvas;return canvas;
}
type FurnitureLayerCache={canvas:HTMLCanvasElement;sprites:unknown[];poses:number[]};
const furnitureLayerCache=new WeakMap<OfficeState,FurnitureLayerCache>();
function compositedFurniture(office:OfficeState):HTMLCanvasElement{
 const items=office.furniture;
 const old=furnitureLayerCache.get(office);
 if(old&&old.sprites.length===items.length){
  let same=true;
  for(let i=0;i<items.length;i++){
   const f=items[i];
   if(old.sprites[i]!==f.sprite||old.poses[i*3]!==f.x||
      old.poses[i*3+1]!==f.y||old.poses[i*3+2]!==Number(Boolean(f.mirrored))){
     same=false;break;
   }
  }
  if(same)return old.canvas;
 }
 const canvas=old?.canvas??document.createElement('canvas');
 canvas.width=HOUSE_W;canvas.height=HOUSE_H;
 const c=canvas.getContext('2d');
 if(!c)throw Error('Cutaway furniture canvas could not initialize');
 c.clearRect(0,0,HOUSE_W,HOUSE_H);c.imageSmoothingEnabled=false;
 for(const room of ROOM_SLOTS){
  c.save();c.beginPath();c.rect(room.x,room.y,room.w,room.h);c.clip();
  drawNativeFurniture(c,room,office);
  c.restore();
 }
 const sprites=items.map(f=>f.sprite);
 const poses:number[]=[];
 for(const f of items)poses.push(f.x,f.y,Number(Boolean(f.mirrored)));
 furnitureLayerCache.set(office,{canvas,sprites,poses});
 return canvas;
}
export function drawDollhouse(
 c:CanvasRenderingContext2D,canvasW:number,canvasH:number,
 office:OfficeState,characters:Character[],camera:FocusCamera,dpr:number,
 elevator:ElevatorTransit,agentNames:Map<number,string>,
):void{
 c.save();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvasW,canvasH);
 c.setTransform(camera.zoom*dpr,0,0,camera.zoom*dpr,
  canvasW*.5-camera.x*camera.zoom*dpr,canvasH*.5-camera.y*camera.zoom*dpr);
 c.imageSmoothingEnabled=false;
 // Architecture is composed once per world; furniture only recomposes when
 // original sprite identities or poses change. Actors and the cabin stay live.
 c.drawImage(staticCutawayBackground(office),0,0);
 c.drawImage(compositedFurniture(office),0,0);
 for(const room of ROOM_SLOTS){
  c.save();c.beginPath();c.rect(room.x,room.y,room.w,room.h);c.clip();
  drawCharacters(c,room,characters,agentNames,elevator);
  drawRoomForeground(c,room);
  c.restore();
  drawLabels(c,room);
 }
 drawShaft(c,elevator);
 drawCorridorActors(c,characters,agentNames,elevator);
 c.drawImage(staticExteriorForeground(),0,0);
 c.restore();
}
