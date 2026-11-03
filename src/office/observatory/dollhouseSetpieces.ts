import type {NebulaRoom} from '../layout/nebulaLayouts.js';
import type {RoomSlot} from './dollhouseProjection.js';
import {materialForRoom} from './dollhouseMaterials.js';

export type SetpieceKind=
 'panel'|'racks'|'relic'|'globe'|'paper'|'clock'|'sconce'|'frame'|'circuit'|'tools';
export type WallSetpiece={id:string;kind:SetpieceKind;x:number;y:number;w:number;h:number};
type Placement={id:string;kind:SetpieceKind;rx:number;rw:number;ry:number;h:number};
type C=CanvasRenderingContext2D;
const g=(id:string,kind:SetpieceKind,rx:number,rw:number,ry:number,h:number):Placement=>({id,kind,rx,rw,ry,h});
/**
 * Pixel-drawn architectural set dressing only. Every instance is confined to
 * a back wall, behind the upstream Agent Pixels character and furniture
 * layers, so it cannot create invisible collision or fake live telemetry.
 */
export const ROOM_SETPIECES:Record<NebulaRoom,readonly Placement[]>={
 lead:       [g('lead-portrait','frame',.43,.21,64,61),g('lead-sconce','sconce',.13,.10,79,33)],
 leadSol:    [g('director-map','panel',.46,.32,65,52),g('director-sconce','sconce',.13,.11,82,30)],
 reception:  [g('mail-sorter','paper',.10,.34,78,46),g('concierge-clock','clock',.60,.20,61,39)],
 observatory:[g('constellation-core','globe',.10,.14,63,52),g('spectral-analyzer','panel',.27,.20,70,51),
              g('nebula-circuit','circuit',.51,.13,75,43),g('orbit-array','globe',.73,.15,64,53)],
 gallery:    [g('relic-left','relic',.11,.25,73,59),g('relic-right','relic',.58,.25,73,59)],
 engineering:[g('pressure-array','racks',.08,.16,69,64),g('tool-magazine','tools',.28,.18,72,59),
              g('engine-schematic','panel',.53,.20,59,71),g('warning-grid','circuit',.79,.13,74,50)],
 data:       [g('math-instruments','panel',.12,.25,66,62),g('theorem-circuit','circuit',.65,.21,79,46)],
 rendering:  [g('render-displays','panel',.11,.26,74,56),g('render-controller','racks',.56,.29,71,60)],
 clinic:     [g('medical-lab','panel',.12,.27,69,60),g('care-poster','frame',.66,.19,74,49)],
 review:     [g('case-queue','paper',.13,.34,73,58),g('review-archive','racks',.67,.22,69,62)],
 training:   [g('neural-rack','racks',.11,.23,69,63),g('training-crystal','globe',.53,.24,62,67)],
 experiments:[g('ticket-wall','paper',.12,.31,66,65),g('experiment-relic','relic',.58,.27,70,61)],
};
export function roomSetpieces(r:RoomSlot):WallSetpiece[]{
 return ROOM_SETPIECES[r.key].map(p=>({
  id:p.id,kind:p.kind,x:Math.round(r.x+r.w*p.rx),y:r.y+p.ry,
  w:Math.round(r.w*p.rw),h:p.h,
 }));
}
const rect=(c:C,x:number,y:number,w:number,h:number,color:string)=>{
 if(w<=0||h<=0)return;c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));
};
function line(c:C,x:number,y:number,x2:number,y2:number,color:string,width=1){
 c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function ellipse(c:C,x:number,y:number,rx:number,ry:number,color:string,stroke=false,width=1){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);
 if(stroke){c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 else{c.fillStyle=color;c.fill();}
}
function lamp(c:C,x:number,y:number,r:number,color:string,alpha=.34){
 const g=c.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,color+Math.round(alpha*255).toString(16).padStart(2,'0'));
 g.addColorStop(.5,color+Math.round(alpha*.22*255).toString(16).padStart(2,'0'));
 g.addColorStop(1,color+'00');
 c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);
}
function framed(c:C,p:WallSetpiece,accent:string){
 const {x,y,w,h}=p;
 rect(c,x-2,y-2,w+4,h+4,'#0a0e20');
 rect(c,x,y,w,h,'#bc956f');
 rect(c,x+3,y+3,w-6,h-6,'#20294b');
 rect(c,x+5,y+5,w-10,h-10,'#34335c');
 // Miniature concept art: angular mountain/celestial landscape, not text.
 c.fillStyle='#b895b7';c.beginPath();c.moveTo(x+8,y+h-11);
 c.lineTo(x+w*.39,y+h*.36);c.lineTo(x+w*.64,y+h*.71);
 c.lineTo(x+w*.83,y+h*.24);c.lineTo(x+w-8,y+h-11);c.closePath();c.fill();
 rect(c,x+7,y+h-13,w-14,3,'#9b817f');
 ellipse(c,x+w*.70,y+h*.30,Math.max(3,w*.085),Math.max(3,w*.085),accent);
 for(let j=0;j<6;j++)rect(c,x+8+(j*19)%Math.max(9,w-15),y+8+(j*13)%Math.max(9,h-18),2,2,'#e9daff');
}
function panel(c:C,p:WallSetpiece,accent:string){
 const {x,y,w,h}=p;
 rect(c,x-2,y-2,w+4,h+4,'#0a1022');
 rect(c,x,y,w,h,'#7b7896');
 rect(c,x+4,y+4,w-8,h-8,'#081e36');
 rect(c,x+7,y+8,w-14,h-15,'#173755');
 // Blueprint hatch and a credible small schematic.
 for(let j=1;j<5;j++)line(c,x+6,y+j*h/5,x+w-6,y+j*h/5,'#4f79973d');
 for(let j=1;j<5;j++)line(c,x+j*w/5,y+6,x+j*w/5,y+h-8,'#79a1b42a');
 const coordinates=[[.12,.68],[.24,.50],[.39,.60],[.52,.29],[.68,.44],[.85,.20]];
 for(let i=1;i<coordinates.length;i++){
  const a=coordinates[i-1],b=coordinates[i];
  line(c,x+w*a[0],y+h*a[1],x+w*b[0],y+h*b[1],accent,1.5);
 }
 for(const [dx,dy]of coordinates)rect(c,x+w*dx-2,y+h*dy-2,4,4,'#bff3e8');
 for(let j=0;j<4;j++)rect(c,x+6+j*8,y+h-9,5,3,j%2===0?'#f1c48a':'#7cd3f5');
}
function rack(c:C,p:WallSetpiece,accent:string){
 const {x,y,w,h}=p;
 rect(c,x-2,y-2,w+4,h+4,'#121526');
 rect(c,x,y,w,h,'#716275');
 rect(c,x+3,y+3,w-6,h-6,'#212c49');
 for(let row=0;row<3;row++){
  const yy=y+6+row*(h-12)/3;
  rect(c,x+5,yy,w-10,2,'#dfb080');
  for(let j=0;j<Math.max(2,Math.floor(w/20));j++){
   const xx=x+8+j*(w-18)/Math.max(2,Math.floor(w/20));
   rect(c,xx,yy+3,Math.min(12,w/5),10,j%2===0?'#586c82':'#536077');
   rect(c,xx+2,yy+5,3,2,accent);
   rect(c,xx+2,yy+11,5,1,'#060e1d');
  }
 }
 rect(c,x+4,y+h-5,w-8,2,'#bba088');
}
function relic(c:C,p:WallSetpiece,accent:string){
 const {x,y,w,h}=p;
 rect(c,x,y,w,h,'#201d42');
 rect(c,x+3,y+3,w-6,h-6,'#4b4372');
 rect(c,x+7,y+5,w-14,h-10,'#0b1845');
 for(let i=0;i<4;i++){
  rect(c,x+11+i*(w-25)/4,y+7,2,h-15,'#aab8ef62');
 }
 const cx=x+w*.5,cy=y+h*.43;
 lamp(c,cx,cy,Math.min(35,w*.56),accent,.3);
 c.beginPath();c.moveTo(cx,cy-17);c.lineTo(cx+13,cy-3);
 c.lineTo(cx+6,cy+16);c.lineTo(cx-11,cy+12);c.lineTo(cx-15,cy-3);
 c.closePath();c.fillStyle=accent+'75';c.fill();c.strokeStyle='#d5e8ff';c.lineWidth=1.5;c.stroke();
 rect(c,cx-15,y+h-12,30,4,'#bd9b81');
}
function globe(c:C,p:WallSetpiece,accent:string){
 const {x,y,w,h}=p,cx=x+w/2,cy=y+h*.46;
 lamp(c,cx,cy,Math.min(w,h)*.64,accent,.30);
 ellipse(c,cx,cy,Math.min(w*.35,22),Math.min(h*.36,22),'#1b2f56');
 ellipse(c,cx,cy,Math.min(w*.31,19),Math.min(h*.32,18),accent+'6b',true,2);
 ellipse(c,cx,cy,Math.min(w*.4,27),Math.min(h*.19,11),'#ade5ffb8',true,2);
 ellipse(c,cx,cy,Math.min(w*.19,12),Math.min(h*.19,12),'#d7ebff');
 ellipse(c,cx-4,cy-4,3,3,'#ffffff');
 rect(c,cx-2,cy+17,4,6,'#ad94ba');
 rect(c,cx-12,cy+23,24,3,'#e1b887');
}
function paper(c:C,p:WallSetpiece,accent:string){
 const {x,y,w,h}=p;
 rect(c,x-2,y-2,w+4,h+4,'#44344a');
 rect(c,x,y,w,h,'#92757d');
 rect(c,x+3,y+3,w-6,h-6,'#3d3551');
 const n=Math.max(2,Math.floor(w/23));
 for(let j=0;j<n;j++){
  const sx=x+7+j*(w-14)/n,sy=y+7+(j%2)*5;
  const cw=Math.min(17,(w-18)/n-3);
  rect(c,sx+2,sy+3,cw,h*.62,'#141729');
  rect(c,sx,sy,cw,h*.62,['#e2c6a7','#b8c9df','#d6b0ca'][j%3]);
  rect(c,sx+3,sy+4,cw-6,2,accent+'88');
  for(let k=0;k<3;k++)rect(c,sx+3,sy+10+k*5,cw-5,1,'#5e6c847a');
 }
 rect(c,x+5,y+h-7,w-10,3,'#cda67f');
}
function clock(c:C,p:WallSetpiece,accent:string){
 const {x,y,w,h}=p,cx=x+w/2,cy=y+h/2,r=Math.min(w,h)/2-3;
 ellipse(c,cx,cy,r,r,'#d1af88');
 ellipse(c,cx,cy,r-4,r-4,'#232a4f');
 for(let i=0;i<12;i++){
  const theta=i*Math.PI/6;
  rect(c,cx+Math.sin(theta)*(r-7)-1,cy-Math.cos(theta)*(r-7)-1,2,2,'#ecdaae');
 }
 line(c,cx,cy,cx+3,cy-r*.49,accent,2);
 line(c,cx,cy,cx+r*.32,cy+r*.15,'#ffffff',2);
}
function sconce(c:C,p:WallSetpiece,accent:string){
 const {x,y,w,h}=p,cx=x+w/2;
 rect(c,cx-3,y+10,6,h-15,'#8e6c80');
 rect(c,cx-7,y+7,14,5,'#cda17b');
 rect(c,cx-6,y+11,12,10,'#fce3aa');
 lamp(c,cx,y+17,Math.min(35,w*.55),accent,.28);
 rect(c,cx-2,y+h-6,4,5,'#997b92');
}
function circuit(c:C,p:WallSetpiece,accent:string){
 const {x,y,w,h}=p;
 rect(c,x,y,w,h,'#1b2f47');
 rect(c,x+3,y+3,w-6,h-6,'#254d62');
 for(let i=0;i<6;i++){
  const yy=y+6+i*(h-12)/6;
  const start=x+5+(i%2)*w*.22;
  line(c,start,yy,start+w*.46,yy,accent+'a4');
  rect(c,start+w*.46-1,yy-3,3,6,'#d9dfed');
  if(i%2===0)line(c,start+w*.2,yy,start+w*.2,yy+6,'#89edf2');
 }
 rect(c,x+7,y+h-8,w-14,3,'#0e1730');
}
function tools(c:C,p:WallSetpiece,accent:string){
 const {x,y,w,h}=p;
 rect(c,x,y,w,h,'#3a2c3c');
 rect(c,x+3,y+3,w-6,h-6,'#73544b');
 for(let i=0;i<6;i++){
  const xx=x+8+i*(w-16)/6;
  rect(c,xx,y+9,3,h*.56,i%2?'#a5b7c3':'#d3a681');
  rect(c,xx-2,y+9,7,4,'#e4c19f');
  if(i%2===0)rect(c,xx-4,y+h*.62,10,4,'#b9acb0');
 }
 rect(c,x+6,y+h-10,w-12,4,'#efb776');
}
export function drawRoomSetpieces(c:C,r:RoomSlot):void{
 const light=materialForRoom(r).light;
 for(const p of roomSetpieces(r)){
  c.save();
  switch(p.kind){
   case 'frame':framed(c,p,light);break;
   case 'panel':panel(c,p,light);break;
   case 'racks':rack(c,p,light);break;
   case 'relic':relic(c,p,light);break;
   case 'globe':globe(c,p,light);break;
   case 'paper':paper(c,p,light);break;
   case 'clock':clock(c,p,light);break;
   case 'sconce':sconce(c,p,light);break;
   case 'circuit':circuit(c,p,light);break;
   case 'tools':tools(c,p,light);break;
  }
  c.restore();
 }
}
