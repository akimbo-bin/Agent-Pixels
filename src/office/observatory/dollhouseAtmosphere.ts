import {ROOM_SLOTS,SHAFT,floorY} from './dollhouseProjection.js';
import type {HQFloor} from './elevator.js';

/**
 * Decorative 2.5D architectural skin over real Agent Pixels room IDs.
 * Geometry describes VISUAL connections to each floor's shared balcony.
 * Simulation pathfinding remains owned by the original OfficeState.
 */
export type Passage={id:string;floor:HQFloor;kind:'room'|'lift';x:number;y:number};
export const PASSAGES:readonly Passage[]=(['upper','middle','lower'] as const).flatMap(floor=>{
 const level=ROOM_SLOTS.filter(r=>r.floor===floor).sort((a,b)=>a.x-b.x);
 const west=level.filter(r=>r.x+r.w<=SHAFT.x);
 const east=level.filter(r=>r.x>=SHAFT.x+SHAFT.w);
 if(west.length!==2||east.length!==2)throw Error('Cutaway passage topology changed for '+floor);
 const y=floorY(floor)+190;
 return [
  {id:floor+'-west-bay',floor,kind:'room',x:(west[0].x+west[0].w+west[1].x)/2,y},
  {id:floor+'-west-lift',floor,kind:'lift',x:SHAFT.x,y},
  {id:floor+'-east-lift',floor,kind:'lift',x:SHAFT.x+SHAFT.w,y},
  {id:floor+'-east-bay',floor,kind:'room',x:(east[0].x+east[0].w+east[1].x)/2,y},
 ] satisfies Passage[];
});
export type Planter={x:number;y:number;scale:number;seed:number};
export const EXTERIOR_PLANTERS:readonly Planter[]=[
 {x:39,y:355,scale:1.15,seed:11},
 {x:477,y:355,scale:.87,seed:31},
 {x:760,y:355,scale:.96,seed:23},
 {x:864,y:355,scale:1,seed:27},
 {x:1371,y:355,scale:1,seed:19},
 {x:1560,y:355,scale:1.12,seed:16},
 {x:39,y:589,scale:1.05,seed:39},
 {x:260,y:589,scale:.82,seed:52},
 {x:761,y:589,scale:.87,seed:43},
 {x:859,y:589,scale:.87,seed:45},
 {x:1236,y:589,scale:1.02,seed:56},
 {x:1560,y:589,scale:1.15,seed:49},
];

type C=CanvasRenderingContext2D;
const box=(c:C,x:number,y:number,w:number,h:number,fill:string)=>{
 c.fillStyle=fill;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));
};
function line(c:C,x:number,y:number,x2:number,y2:number,stroke:string,w=1){
 c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=stroke;c.lineWidth=w;c.stroke();
}
function glow(c:C,x:number,y:number,r:number,color:string,alpha=.36){
 const g=c.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,color+Math.round(alpha*255).toString(16).padStart(2,'0'));
 g.addColorStop(1,color+'00');
 c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);
}
function rand(seed:number):()=>number{
 let s=seed|0;
 return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};
}
function foliage(c:C,x:number,y:number,size:number,seed:number,tonality='warm'){
 const next=rand(seed);
 const dark=tonality==='cold'?'#172f52':'#173c44';
 const mid=tonality==='cold'?'#274978':'#286e5c';
 const bright=tonality==='cold'?'#537dba':'#5aa37c';
 const border=tonality==='cold'?'#213252':'#274839';
 // Segmented branches rather than a decorative glowing circle.
 for(let j=0;j<5;j++){
  const tilt=(j-2)*size*.25;
  line(c,x,y,x+tilt,y-size*(.71+(j%2)*.17),'#534d54',Math.max(1,size*.075));
 }
 for(let j=0;j<39;j++){
  const theta=next()*Math.PI*2;
  const dx=Math.cos(theta)*(next()*.62+.21)*size;
  const dy=-size*.63+Math.sin(theta)*(next()*.48+.28)*size;
  const leafSize=Math.max(2,Math.floor(size*(.15+next()*.085)));
  box(c,x+dx-leafSize/2,y+dy-leafSize/2,leafSize,leafSize,border);
  box(c,x+dx-leafSize/2+2,y+dy-leafSize/2,leafSize-2,leafSize-3,[dark,mid,bright][Math.floor(next()*3)]);
  if(j%7===0)box(c,x+dx,y+dy,Math.max(2,leafSize*.25),3,tonality==='cold'?'#b5d3f0':'#dfb798');
 }
}
function balconyPlanter(c:C,p:Planter){
 const {x,y,scale,seed}=p,s=scale;
 box(c,x-14*s,y-8*s,28*s,10*s,'#352d45');
 box(c,x-16*s,y-10*s,32*s,5*s,'#b38971');
 box(c,x-12*s,y-5*s,24*s,7*s,'#725065');
 box(c,x-9*s,y+2*s,18*s,3*s,'#241e34');
 foliage(c,x,y-7*s,25*s,seed);
}
function roofGarden(c:C){
 const clusters=[
  [38,111,41,14],[99,117,32,7],[240,110,28,57],[447,113,34,29],
  [620,112,26,44],[1480,110,45,22],[1542,122,37,13],
 ] as const;
 for(const [x,y,scale,seed] of clusters){
  box(c,x-22,y-7,44,7,'#4b354e');
  box(c,x-20,y-9,40,4,'#a58475');
  foliage(c,x,y-10,scale,seed);
 }
 // Steel pergola, not an invented extra floor.
 for(let x=75;x<710;x+=109){
  box(c,x,95,6,20,'#796174');
  box(c,x-2,95,10,3,'#cca77c');
 }
 line(c,79,96,678,96,'#937b9d',3);
}
function arch(c:C,p:Passage){
 const {x,y}=p,wide=p.kind==='lift'?30:24;
 // Narrow black space between neighboring room bays feels like an actual
 // connecting doorway, not a solid 8px wall.
 const top=y-38,foot=y+18;
 c.beginPath();c.moveTo(x-wide/2,foot);c.lineTo(x-wide/2,top+9);
 c.quadraticCurveTo(x,top-13,x+wide/2,top+9);
 c.lineTo(x+wide/2,foot);c.closePath();c.fillStyle='#0b142d';c.fill();
 line(c,x-wide/2-3,foot,x-wide/2-3,top+9,'#bd9884',3);
 line(c,x+wide/2+3,foot,x+wide/2+3,top+9,'#bd9884',3);
 c.beginPath();c.moveTo(x-wide/2-3,top+9);
 c.quadraticCurveTo(x,top-19,x+wide/2+3,top+9);
 c.strokeStyle=p.kind==='lift'?'#9dcfdd':'#d6a875';c.lineWidth=3;c.stroke();
 box(c,x-wide/2+2,foot-2,wide-4,4,'#9f8f9b');
 box(c,x-2,top+16,4,4,p.kind==='lift'?'#74d3e7':'#f0c98e');
 glow(c,x,top+12,21,p.kind==='lift'?'#6fd1f4':'#ffba77',.23);
 // Floor threshold: two receding diagonals imply traffic towards the balcony.
 line(c,x-wide/2,foot,x-wide,foot+6,'#a98284',2);
 line(c,x+wide/2,foot,x+wide,foot+6,'#a98284',2);
}
export function drawPassageBackdrops(c:C){
 for(const p of PASSAGES)arch(c,p);
}
function balustrade(c:C,y:number){
 // Thick 2.5D bevel with engraved alternating tiles and open pickets.
 const x=20,w=1558;
 box(c,x,y+1,w,6,'#29233e');
 box(c,x,y+6,w,11,'#594056');
 box(c,x,y+8,w,3,'#997a81');
 box(c,x,y+16,w,7,'#372b48');
 line(c,x,y+1,x+w,y+1,'#f2cc9b',2);
 for(let i=0;i<52;i++){
  const xx=x+16+i*30;
  box(c,xx,y-7,3,11,'#a9878b');
  box(c,xx-2,y-10,7,4,'#f0d3a2');
  box(c,xx-1,y+12,6,2,'#ab8b91');
 }
 for(let i=0;i<7;i++){
  const xx=x+78+i*206;
  box(c,xx-5,y-15,10,6,'#8a697a');
  box(c,xx-2,y-23,4,11,'#d2a479');
  box(c,xx-4,y-24,8,7,'#ffe2ae');
  glow(c,xx,y-20,23,'#ffca86',.37);
 }
}
function roofGables(c:C){
 for(const x of [32,466,729,1384,1553]){
  box(c,x-5,118,17,8,'#332b4a');
  box(c,x,114,7,9,'#bc967e');
  box(c,x+1,104,5,10,'#715970');
  box(c,x-1,105,9,3,'#e4bd8a');
 }
}
function foundation(c:C){
 // Forest canopy is BEHIND the building's HUD, not a new character layer.
 const seeds=[11,44,32,18,70,21,83,57,23];
 for(let i=0;i<seeds.length;i++){
  const x=35+i*192,y=912+(i%3)*5;
  foliage(c,x,y,36+(i%2)*12,seeds[i],'cold');
 }
 for(let x=12;x<1580;x+=41){
  box(c,x,928+(x%5),17+(x%3)*3,3,'#354a68');
  box(c,x+4,943,3,2,'#6686ab');
 }
 for(const x of [100,307,588,789,1021,1302,1509]){
  box(c,x-2,910,4,28,'#857b8d');
  box(c,x-5,907,10,7,'#e7bd8c');
  box(c,x-3,909,6,4,'#f7dfae');
  glow(c,x,907,29,'#ffd19b',.38);
 }
}
export function drawExteriorBack(c:C){
 roofGarden(c);roofGables(c);
}
export function drawExteriorFront(c:C){
 for(const y of [354,588,822])balustrade(c,y);
 for(const p of EXTERIOR_PLANTERS)balconyPlanter(c,p);
 foundation(c);
}
