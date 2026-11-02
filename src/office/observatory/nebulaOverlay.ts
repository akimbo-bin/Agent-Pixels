import {TILE_SIZE} from '../types.js';
import {ROOMS,type NebulaCameraBounds} from '../layout/nebulaLayouts.js';
export type ReadOnlyJob={state:string;ticket?:string;progress?:number|null;machine?:string};
export type NebulaTelemetry={mode:'demo'|'live'|'unconfigured';hqMode?:'normal'|'busy'|'cooldown'|'degraded'|'blocked';loungeIds?:string[];jobs:Partial<Record<'training'|'renderVM'|'renderPC'|'ci'|'evaluation',ReadOnlyJob>>;queue:{upcoming:number|null;in_progress:number|null;review:number|null;blocked?:number|null};sources:{paperclip:boolean;jobs:boolean};stage?:number|null;modelCount?:number|null;modelPods?:Array<{id:string;state:string}>;renderCount?:number|null};
const shades:Record<string,string>={running:'#79d6b1',waiting:'#dfb86d',cooldown:'#a8afd9',idle:'#9caeb7',queued:'#e6b56a',done:'#6bafe8',failed:'#f07b77',stalled:'#f07b77',unknown:'#87939f'};
export function renderNebulaTelemetry(ctx:CanvasRenderingContext2D,_bounds:NebulaCameraBounds,data:NebulaTelemetry|undefined,ox:number,oy:number,zoom:number,now:number){
 ctx.save();ctx.textBaseline='middle';ctx.textAlign='left';ctx.font=`${Math.max(8,5*zoom)}px monospace`;
 for(const r of ROOMS){
  const x=ox+(r.bounds.col+1)*16*zoom,y=oy+(r.bounds.row+.65)*16*zoom;
  ctx.fillStyle='#112233';ctx.fillRect(x-2*zoom,y-4*zoom,(r.bounds.cols-2)*16*zoom,8*zoom);
  ctx.fillStyle='#e0d2b0';ctx.fillText(`${r.id} ${r.name.toUpperCase()}`,x,y,(r.bounds.cols-2)*16*zoom);
 }
 const lights=[{key:'training',x:39,y:39,label:'AKIMB0-PC / TRAIN'},{key:'renderVM',x:50,y:24.6,label:'VM116 / RENDER'},{key:'renderPC',x:55,y:29.5,label:'AKIMB0-PC / RENDER'},{key:'ci',x:20,y:25,label:'BUILD'},{key:'evaluation',x:54,y:40.4,label:'EVALUATION'}] as const;
 for(const l of lights){const job=data?.sources.jobs?data.jobs[l.key]:undefined,state=job?.state??'unknown';
  const x=ox+l.x*16*zoom,y=oy+l.y*16*zoom;
  ctx.font=`${Math.max(8,4*zoom)}px monospace`;
  const text=`${l.label} · ${state.toUpperCase()}`,width=ctx.measureText(text).width+8*zoom;
  ctx.fillStyle='#101c2eef';ctx.fillRect(x-2*zoom,y-5*zoom,width,10*zoom);
  ctx.strokeStyle=shades[state]??shades.unknown;ctx.lineWidth=zoom/2;ctx.strokeRect(x-2*zoom,y-5*zoom,width,10*zoom);
  ctx.fillStyle=shades[state]??shades.unknown;ctx.fillText(text,x+2*zoom,y);
 }
 ctx.font=`${Math.max(8,4*zoom)}px monospace`;
 ctx.fillStyle=data?.hqMode==='cooldown'?'#ebc589':'#a1b7bb';
 ctx.fillText(data?.hqMode==='cooldown'?'LOUNGE / USAGE COOLDOWN':'COMMON ROOM / READING & GAMES',ox+50*16*zoom,oy+46.3*16*zoom);
 for(const [i,stage] of ['upcoming','in_progress','review','blocked'].entries()){
  const count=data?.sources.paperclip?data.queue[stage as keyof NebulaTelemetry['queue']]??null:null;
  const x=ox+(2+i*3)*16*zoom,y=oy+28*16*zoom;
  ctx.fillStyle='#e6b56a';ctx.fillText(count===null?'?':String(count),x,y+5*zoom);
 }
 ctx.fillStyle='#e6b56a';ctx.fillText('RENDERS '+(data?.renderCount??'?'),ox+53*16*zoom,oy+26*16*zoom);
 ctx.fillStyle='#cdb3e9';ctx.fillText('STAGE '+(data?.stage??'?'),ox+40*16*zoom,oy+10*16*zoom);
 ctx.restore();
}
