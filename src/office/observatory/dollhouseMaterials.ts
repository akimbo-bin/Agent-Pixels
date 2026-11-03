import type {NebulaRoom} from '../layout/nebulaLayouts.js';
import type {RoomSlot} from './dollhouseProjection.js';

type Wall='wood'|'plaster'|'industrial'|'glass'|'laboratory'|'marble';
type Floor='parquet'|'stone'|'technical'|'tile';
export type MaterialSpec={wall:Wall;floor:Floor;light:string;dark:string;highlight:string;seed:number};
export type MaterialPixel={x:number;y:number;shade:number};
type C=CanvasRenderingContext2D;

/**
 * Material directions are authored for the actual twelve Agent Pixels rooms.
 * The pixels are deterministic and cached with the rest of the architectural
 * backdrop; no image generator, external texture or new entity is involved.
 */
export const ROOM_MATERIALS:Record<NebulaRoom,MaterialSpec>={
 lead:        {wall:'wood',floor:'parquet',light:'#ffc57f',dark:'#392333',highlight:'#bc8867',seed:281},
 leadSol:     {wall:'wood',floor:'parquet',light:'#d9b0ff',dark:'#242b45',highlight:'#947eac',seed:887},
 reception:   {wall:'plaster',floor:'stone',light:'#ffda9c',dark:'#34404a',highlight:'#a1ae9c',seed:370},
 observatory: {wall:'glass',floor:'technical',light:'#ad8eff',dark:'#111e52',highlight:'#748bc1',seed:994},
 gallery:     {wall:'marble',floor:'tile',light:'#f0b6ff',dark:'#29254b',highlight:'#a886bf',seed:718},
 engineering: {wall:'industrial',floor:'technical',light:'#ffbe73',dark:'#312936',highlight:'#b18366',seed:138},
 data:        {wall:'laboratory',floor:'tile',light:'#89e7de',dark:'#153c42',highlight:'#74aea9',seed:441},
 rendering:   {wall:'industrial',floor:'technical',light:'#b4acff',dark:'#1a2551',highlight:'#7776b2',seed:169},
 clinic:      {wall:'plaster',floor:'tile',light:'#9be6dd',dark:'#284a55',highlight:'#89a9a0',seed:513},
 review:      {wall:'marble',floor:'parquet',light:'#f5d2ee',dark:'#343c50',highlight:'#8e95a5',seed:963},
 training:    {wall:'industrial',floor:'technical',light:'#b99aff',dark:'#1d204c',highlight:'#7672ad',seed:605},
 experiments: {wall:'plaster',floor:'stone',light:'#ffc28b',dark:'#4f3948',highlight:'#b29483',seed:820},
};
export function materialForRoom(r:RoomSlot):MaterialSpec{return ROOM_MATERIALS[r.key];}
function rng(seed:number):()=>number{
 let n=seed|0;
 return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};
}
export function materialTexturePoints(r:RoomSlot,count=128):MaterialPixel[]{
 const next=rng(ROOM_MATERIALS[r.key].seed);
 const left=r.x+14,wide=r.w-28,top=r.y+25;
 return Array.from({length:count},()=>({
  x:Math.floor(left+next()*wide),
  y:Math.floor(top+next()*110),
  shade:Math.floor(next()*4),
 }));
}
const rect=(c:C,x:number,y:number,w:number,h:number,fill:string)=>{
 if(w<=0||h<=0)return;
 c.fillStyle=fill;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));
};
function line(c:C,x:number,y:number,x2:number,y2:number,color:string,thick=1){
 c.beginPath();c.moveTo(Math.round(x),Math.round(y));c.lineTo(Math.round(x2),Math.round(y2));
 c.strokeStyle=color;c.lineWidth=thick;c.stroke();
}
function glaze(c:C,x:number,y:number,r:number,color:string,alpha=.18){
 const g=c.createRadialGradient(x,y,1,x,y,r);
 g.addColorStop(0,color+Math.round(alpha*255).toString(16).padStart(2,'0'));
 g.addColorStop(.35,color+Math.round(alpha*.41*255).toString(16).padStart(2,'0'));
 g.addColorStop(1,color+'00');
 c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
}
function wall(c:C,r:RoomSlot,m:MaterialSpec){
 const x=r.x+11,y=r.y+16,w=r.w-22,h=125;
 c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
 const rand=rng(m.seed);
 if(m.wall==='wood'){
  for(let xx=x+3;xx<x+w;xx+=26){
   rect(c,xx,y+2,20,h-5,rand()>.5?'#150e1c22':'#c9905520');
   rect(c,xx+1,y+4,2,h-9,'#e9b77c21');
   rect(c,xx+17,y+4,2,h-9,'#130d1b5a');
   for(let j=0;j<6;j++){
    const yy=y+11+j*18+Math.round(rand()*5);
    line(c,xx+4,yy,xx+15,yy,rand()>.5?'#ecc19024':'#0f111d42');
   }
  }
 }else if(m.wall==='industrial'){
  for(let yy=y+8;yy<y+h;yy+=36){
   for(let xx=x+4;xx<x+w;xx+=48){
    rect(c,xx,yy,44,31,((Math.floor(xx/48)+Math.floor(yy/36))%2)?'#12132021':'#a5b2cd0d');
    line(c,xx,yy,xx+44,yy,'#d6baae28');
    line(c,xx+44,yy,xx+44,yy+31,'#070e2378');
    rect(c,xx+3,yy+3,3,3,m.highlight+'6a');
    rect(c,xx+39,yy+27,3,3,m.highlight+'55');
   }
  }
  // The supply conduit belongs to the wall rather than a live actor path.
  rect(c,x+8,y+89,w-16,4,'#090f24a8');
  rect(c,x+8,y+89,w-16,1,m.highlight+'8c');
  for(let xx=x+30;xx<x+w;xx+=82)rect(c,xx,y+86,7,11,m.highlight+'75');
 }else if(m.wall==='laboratory'){
  for(let xx=x;xx<x+w;xx+=36){
   rect(c,xx,y+4,33,113,'#92cbb109');
   line(c,xx,y+8,xx,y+118,'#020f202a');
   for(let yy=y+22;yy<y+110;yy+=24){
    rect(c,xx+7,yy,14,2,m.light+'28');
    rect(c,xx+22,yy+7,5,3,'#84ecde3b');
   }
  }
 }else if(m.wall==='marble'||m.wall==='plaster'){
  for(let xx=x;xx<x+w;xx+=53){
   const xx2=Math.min(x+w,xx+50);
   const tint=m.wall==='marble'?'#b1a4d214':'#e8d3bc0c';
   rect(c,xx+1,y+1,xx2-xx-3,103,tint);
   line(c,xx+4,y+18,xx+10,y+65,m.wall==='marble'?'#d5c1df22':'#b8ae9516');
   if(m.wall==='marble'){
    line(c,xx+11,y+66,xx+25,y+72,'#d6c4eb2a');
    line(c,xx+25,y+72,xx+31,y+96,'#b7aed12a');
   }else{
    rect(c,xx+4,y+13,7,3,'#ffd3a91b');
   }
  }
 }else if(m.wall==='glass'){
  for(let xx=x+14;xx<x+w;xx+=58){
   rect(c,xx-3,y+4,5,h-7,'#101d438a');
   rect(c,xx-1,y+7,2,h-10,'#b0bdf25e');
   rect(c,xx+10,y+12,20,h-18,'#b0b0ff0e');
   line(c,xx+6,y+64,xx+43,y+64,'#99bbff38');
  }
 }
 // Small hand-stamped pixels break up otherwise flat vector wall panels.
 for(const p of materialTexturePoints(r,Math.min(360,Math.floor(r.w*.7)))){
  rect(c,p.x,p.y,1+(p.shade===3?2:0),1,
   p.shade===0?'#0c0d2670':p.shade===1?m.light+'49':p.shade===2?m.highlight+'52':'#d9cfca33');
 }
 // Dark back-wall skirting, relief moulding, soft ceiling return.
 const crown=c.createLinearGradient(0,y,0,y+25);
 crown.addColorStop(0,'#080c24a9');crown.addColorStop(1,'#080c2400');
 rect(c,x,y,w,25,crown as unknown as string);
 rect(c,x+3,y+111,w-6,6,'#10122399');
 rect(c,x+3,y+113,w-6,1,m.highlight+'80');
 for(let xx=x+8;xx<x+w;xx+=44)rect(c,xx,y+113,3,3,m.light+'72');
 c.restore();
}
function floor(c:C,r:RoomSlot,m:MaterialSpec){
 const x=r.x+10,y=r.y+145,w=r.w-20,h=65;
 c.save();c.beginPath();
 c.moveTo(x+4,y);c.lineTo(x+w-4,y);c.lineTo(x+w+3,y+h);c.lineTo(x-3,y+h);c.closePath();c.clip();
 const topLight=c.createLinearGradient(0,y,0,y+h);
 topLight.addColorStop(0,m.light+'31');topLight.addColorStop(.15,'#0e182100');
 topLight.addColorStop(1,'#080b2275');
 rect(c,x-4,y,w+8,h,topLight as unknown as string);
 const rnd=rng(m.seed^0x9e3779b9);
 if(m.floor==='parquet'){
  // Alternating staggered oak strips, all in the plane under the actors.
  for(let yy=y+2,row=0;yy<y+h;yy+=11,row++){
   line(c,x-5,yy,x+w+5,yy,'#090c235c');
   const offset=(row%2)*23;
   for(let xx=x-60+offset;xx<x+w+15;xx+=46){
    rect(c,xx+2,yy+2,39,6,row%2?'#d1a06f16':'#ffdd9d0b');
    line(c,xx,yy,xx+3,yy+10,'#130b1f5e');
    const grain=xx+5+Math.floor(rnd()*23);
    line(c,grain,yy+4,grain+12,yy+4,'#e5c1942f');
   }
  }
 }else if(m.floor==='stone'||m.floor==='tile'){
  const step=m.floor==='stone'?23:16;
  for(let yy=y;yy<y+h;yy+=12){
   line(c,x-5,yy,x+w+5,yy,'#0a15204c');
   for(let xx=x-40+(Math.floor((yy-y)/12)%2)*(step/2);xx<x+w+20;xx+=step){
    line(c,xx,yy,xx+5,yy+12,'#e2d4cc20');
    if(rnd()>.78)rect(c,xx+5,yy+4,3,1,m.light+'42');
   }
  }
 }else{
  // Metallic/gridded technical floor: subdued perspective seams, not a
  // warped high-contrast checkerboard.
  for(let yy=y+3;yy<y+h;yy+=13){
   line(c,x,yy,x+w,yy,m.highlight+'45');
   for(let xx=x+8;xx<x+w;xx+=46){
    rect(c,xx,yy+2,13,2,'#080e1e75');
    rect(c,xx+4,yy+4,4,1,m.light+'7a');
   }
  }
  line(c,x+10,y+9,x+w-10,y+9,m.light+'55',2);
 }
 for(let i=0;i<Math.floor(w/10);i++){
  if(rnd()>.27)continue;
  const px=x+rnd()*w,py=y+5+rnd()*(h-9);
  rect(c,px,py,2,1,rnd()>.5?'#fff2d32d':'#00091245');
 }
 // Feet stay entirely on this floor. The front edge is deliberately darker.
 const falloff=c.createLinearGradient(0,y+31,0,y+h);
 falloff.addColorStop(0,'#12122700');falloff.addColorStop(1,'#060c1f56');
 rect(c,x-4,y+31,w+8,h-31,falloff as unknown as string);
 c.restore();
}
/** Underlying wall/floor material work never draws into agent hitboxes. */
export function drawRoomMaterials(c:C,r:RoomSlot):void{
 const mat=materialForRoom(r);
 wall(c,r,mat);
 floor(c,r,mat);
}
/**
 * Light reflected from native windows, desk lamps and machinery. Draw once
 * after room backdrops, before live furniture and actors.
 */
export function drawRoomLight(c:C,r:RoomSlot):void{
 const m=materialForRoom(r);
 const windowed=['lead','leadSol','reception','clinic','review'].includes(r.key);
 c.save();c.beginPath();c.rect(r.x+9,r.y+16,r.w-18,r.h-25);c.clip();
 if(windowed){
  const sourceX=r.x+r.w*.75,sy=r.y+76;
  // 3 progressively translucent shafts, falling onto a bounded floor plane.
  for(let i=0;i<3;i++){
   const edge=(i-1)*21;
   const g=c.createLinearGradient(sourceX,sy,sourceX+edge,r.y+211);
   g.addColorStop(0,m.light+'29');g.addColorStop(1,m.light+'00');
   c.fillStyle=g;c.beginPath();c.moveTo(sourceX-9,sy);
   c.lineTo(sourceX+12,sy);c.lineTo(sourceX+edge+54,r.y+208);
   c.lineTo(sourceX+edge-52,r.y+208);c.closePath();c.fill();
  }
  glaze(c,sourceX,r.y+140,Math.min(94,r.w*.25),m.light,.15);
 }
 for(const k of [0.2,0.8]){
  const sx=r.x+r.w*k,sy=r.y+55;
  glaze(c,sx,sy,45,m.light,.12);
 }
 const rnd=rng(m.seed+0x349e);
 for(let i=0;i<21;i++){
  const x=r.x+22+rnd()*(r.w-44);
  const y=r.y+45+rnd()*131;
  rect(c,x,y,rnd()>.81?2:1,1,m.light+(rnd()>.48?'47':'22'));
 }
 c.restore();
}
