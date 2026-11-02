import type {NebulaTelemetry} from './nebulaOverlay.js';
const supported=new Set(['idle','queued','running','stalled','failed','done','waiting','cooldown']);
/** Pure observational projection. Every variant is validated to retain its footprint. */
export function furnitureProjection(data:NebulaTelemetry|undefined,frame:number):Map<string,string>{
 const types=new Map<string,string>();
 const machine=(base:string,key:'training'|'renderVM'|'renderPC'|'ci'|'evaluation')=>{
  let state=data?.sources.jobs?data.jobs[key]?.state??'unknown':'unknown';
  if(data?.hqMode==='cooldown'&&['idle','done'].includes(state))state='cooldown';
  return supported.has(state)?`${base}_${state}_${state==='running'?frame:0}`:base;
 };
 types.set('rocket-gantry',machine('N_ROCKET','ci'));
 types.set('render-rack',machine('N_RENDER','renderVM'));
 types.set('render-local',machine('N_RENDER','renderPC'));
 types.set('render-wall',machine('N_SIGNAL','renderVM'));
 types.set('workshop-turbine',machine('N_TURBINE','ci'));
 types.set('workshop-signal',machine('N_SIGNAL','ci'));
 types.set('training-board',machine('N_SIGNAL','training'));
 types.set('audio-judge',machine('N_JUDGE','evaluation'));
 for(let i=0;i<4;i++)types.set(`gpu-${i}`,machine('N_RACK','training'));
 types.set('telescope-foundation',`N_TELESCOPE_${Math.max(0,Math.min(6,Math.floor(data?.stage??0)))}`);
 for(let i=0;i<8;i++){
  const pod=data?.modelPods?.[i];let type='N_POD_EMPTY';
  if(pod){
   const special:Record<string,string>={rejected:'REJECTED',failed:'REJECTED',training:'TRAINING',evaluated:'EVALUATED',exported:'EXPORTED',plugin_loaded:'LOADED'};
   let hash=0;for(const c of pod.id)hash=(hash*31+c.charCodeAt(0))>>>0;
   if(special[pod.state])type=`N_POD_${special[pod.state]}`;
   else if(['trained','checkpointed'].includes(pod.state))type=`N_POD_${hash%8}`;
  }
  types.set(`pod-${i}`,type);
 }
 for(const key of ['upcoming','in_progress','review','blocked'] as const){
  const count=data?.sources.paperclip?data.queue[key]??0:0;
  types.set(`queue-${key}`,`N_PAPERS_${Math.min(8,Math.max(0,Math.floor(count)))}`);
 }
 return types;
}
