import { TILE_SIZE } from "../types.js";
import type { NebulaCameraBounds, NebulaRoom } from "../layout/nebulaLayouts.js";

export type ReadOnlyJob = {
  state: string; ticket?: string; progress?: number | null; machine?: string;
};
export type NebulaTelemetry = {
  mode: "demo" | "live" | "unconfigured";
  jobs: Partial<Record<"training" | "render" | "ci" | "evaluation", ReadOnlyJob>>;
  queue: { upcoming: number | null; in_progress: number | null; review: number | null };
  sources: { paperclip: boolean; jobs: boolean };
};
type Point = { x: number; y: number };
const TEXT="#e5f7ef";
const PALETTE:Record<string,string>={
  running:"#79e4ab",done:"#8adbea",queued:"#f4c277",
  review:"#f4c277",stalled:"#ff7c7f",failed:"#ff7c7f",
  unreachable:"#ff7c7f",unknown:"#95a9b8",
};
function color(state:string):string {return PALETTE[state]||PALETTE.unknown;}
function tinyText(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,size:number,shade=TEXT) {
  ctx.font="800 "+Math.round(size)+"px monospace";
  ctx.textBaseline="top";ctx.textAlign="left";
  ctx.lineWidth=Math.max(2,size/5);
  ctx.strokeStyle="#07111ae8";ctx.strokeText(text,x,y);
  ctx.fillStyle=shade;ctx.fillText(text,x,y);
}
function plate(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,stroke:string) {
  ctx.fillStyle="#0d1729ee";ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  ctx.strokeStyle=stroke;ctx.lineWidth=2;
  ctx.strokeRect(Math.round(x)+1,Math.round(y)+1,Math.round(w)-2,Math.round(h)-2);
}
function roomPoint(bounds:NebulaCameraBounds,room:NebulaRoom,col:number,row:number,zoom:number,ox:number,oy:number):Point {
  return {x:ox+(bounds[room].col+col)*TILE_SIZE*zoom,y:oy+(bounds[room].row+row)*TILE_SIZE*zoom};
}
function machinePanel(ctx:CanvasRenderingContext2D,anchor:Point,zoom:number,job:ReadOnlyJob|undefined,title:string,now:number) {
  const s=zoom*16;
  const state=job?.state??"unknown",shade=color(state),w=Math.round(6.8*s),h=Math.round(1.7*s);
  const x=Math.round(anchor.x),y=Math.round(anchor.y);
  plate(ctx,x,y,w,h,shade);
  const on=state==="running",lit=on?(Math.floor(now/430)%2===0):false;
  ctx.fillStyle=on?(lit?shade:"#385c58"):state==="stalled"||state==="failed"?shade:"#5e788a";
  ctx.fillRect(x+Math.round(s*.18),y+Math.round(s*.29),Math.round(s*.34),Math.round(s*.34));
  tinyText(ctx,title,x+s*.69,y+s*.18,Math.max(10,s*.24));
  tinyText(ctx,state.toUpperCase(),x+s*.69,y+s*.64,Math.max(10,s*.23),shade);
  const ticket=(job?.ticket||job?.machine||"NO VERIFIED RUN").slice(0,28);
  tinyText(ctx,ticket,x+s*.18,y+s*1.06,Math.max(9,s*.20),"#bad1da");
  const progress=job?.progress;
  if(typeof progress==="number" && Number.isFinite(progress)){
    const p=Math.max(0,Math.min(1,progress));
    ctx.fillStyle="#354956";ctx.fillRect(x+s*.18,y+s*1.47,w-s*.38,Math.max(3,s*.08));
    ctx.fillStyle=shade;ctx.fillRect(x+s*.18,y+s*1.47,(w-s*.38)*p,Math.max(3,s*.08));
  }
}
function pixelPaper(ctx:CanvasRenderingContext2D,anchor:Point,zoom:number,count:number|null,name:string,shade:string) {
  const s=zoom*16,x=anchor.x,y=anchor.y;
  const layers=count===null?1:Math.min(9,Math.max(1,count));
  const w=s*1.9,h=s*.35;
  for(let i=0;i<layers;i++){
    const yy=y-i*h*.26,xx=x+(i%2)*s*.05;
    ctx.fillStyle="#b59e75";ctx.fillRect(xx+s*.1,yy+s*.10,w,h);
    ctx.fillStyle="#e6d7b5";ctx.fillRect(xx,yy,w,h*.72);
    ctx.fillStyle="#637c84";ctx.fillRect(xx+s*.25,yy+h*.22,w*.44,Math.max(2,s*.035));
  }
  tinyText(ctx,count===null?"?":String(count),x+s*.7,y+s*.50,Math.max(14,s*.39),shade);
  tinyText(ctx,name,x-s*.13,y+s*1.10,Math.max(10,s*.23),shade);
}
function roomSign(ctx:CanvasRenderingContext2D,anchor:Point,zoom:number,name:string,id:string) {
  const s=zoom*16,x=anchor.x,y=anchor.y;
  ctx.fillStyle="#0b1723db";ctx.fillRect(x,y,s*10,s*.78);
  ctx.fillStyle="#7ce8ca";ctx.fillRect(x,y,Math.max(3,s*.12),s*.78);
  tinyText(ctx,id+" / "+name,x+s*.27,y+s*.13,Math.max(12,s*.3));
}

/** Every pixel is observational: never mutates Agent Pixels or runs jobs. */
export function renderNebulaTelemetry(
  ctx:CanvasRenderingContext2D,bounds:NebulaCameraBounds,
  data:NebulaTelemetry|undefined,offsetX:number,offsetY:number,zoom:number,frameTime:number
):void {
  const obs:NebulaTelemetry=data??{
    mode:"unconfigured",jobs:{},queue:{upcoming:null,in_progress:null,review:null},
    sources:{paperclip:false,jobs:false},
  };
  const names:Record<NebulaRoom,string>={
    training:"TRAINING LAB",rendering:"RENDER STUDIO",
    engineering:"ENGINEERING / REVIEW",experiments:"EXPERIMENT LAB",
  };
  (["training","rendering","engineering","experiments"] as NebulaRoom[]).forEach((name,i)=>{
    roomSign(ctx,roomPoint(bounds,name,1,.7,zoom,offsetX,offsetY),zoom,names[name],"0"+(i+1));
  });
  machinePanel(ctx,roomPoint(bounds,"training",12.3,8.5,zoom,offsetX,offsetY),zoom,
    obs.sources.jobs?obs.jobs.training:undefined,"GPU / TRAINING",frameTime);
  machinePanel(ctx,roomPoint(bounds,"rendering",12.3,8.5,zoom,offsetX,offsetY),zoom,
    obs.sources.jobs?obs.jobs.render:undefined,"REAPER / BATCH",frameTime);
  machinePanel(ctx,roomPoint(bounds,"engineering",12.3,8.5,zoom,offsetX,offsetY),zoom,
    obs.sources.jobs?obs.jobs.ci:undefined,"CI / REVIEWS",frameTime);
  machinePanel(ctx,roomPoint(bounds,"experiments",13,10.5,zoom,offsetX,offsetY),zoom,
    obs.sources.jobs?obs.jobs.evaluation:undefined,"AUDIO JUDGE",frameTime);
  const st=obs.sources.paperclip?obs.queue:{upcoming:null,in_progress:null,review:null};
  pixelPaper(ctx,roomPoint(bounds,"engineering",2.1,10,zoom,offsetX,offsetY),zoom,st.upcoming,"BACKLOG","#f4c277");
  pixelPaper(ctx,roomPoint(bounds,"engineering",5.3,10,zoom,offsetX,offsetY),zoom,st.in_progress,"WORK","#7ce8ca");
  pixelPaper(ctx,roomPoint(bounds,"engineering",8.5,10,zoom,offsetX,offsetY),zoom,st.review,"REVIEW","#c5a4f7");
}
