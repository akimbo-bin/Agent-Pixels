// Authoritative queue state, with current workload separated from whole-queue completion.
import {existsSync,readFileSync,statSync} from 'node:fs';import path from 'node:path';
// Read only small event logs. A missing, old-attempt or partial record is not progress.
function oracleProgress(q,job,child){
 if(job?.kind!=='oracle'||!child||!Number.isFinite(child.start)||!/^[a-zA-Z0-9_-]+$/.test(job.name))return null;
 try{
  const file=path.join(q,'oracle',job.name,'events.jsonl');if(statSync(file).size>2*1024*1024)return null;
  let start=null,units=new Set(),updatedAt=null;
  for(const line of readFileSync(file,'utf8').split('\n')){let e;try{e=JSON.parse(line);}catch{continue;}
   if(!Number.isFinite(e.t)||e.t<child.start-1)continue;
   if(e.event==='start'){start=e;units=new Set();updatedAt=e.t*1000;}
   else if(start&&e.event==='unit'&&typeof e.unit==='string'){units.add(e.unit);updatedAt=e.t*1000;}
  }
  if(!start||!Number.isInteger(start.units)||start.units<=0||!Number.isInteger(start.units_done)||start.units_done<0)return null;
  const done=start.units_done+units.size;if(done>start.units)return null;
  return{done,total:start.units,unit:'fit units',updatedAt,source:'oracle events'};
 }catch{return null;}
}
export async function read({base='C:/NebulaResearch/train',queue='neb318'}){
 const q=path.join(base,queue),file=path.join(q,'status.json');if(!existsSync(file))return{state:'unknown',why:'Queue status unavailable'};
 const status=JSON.parse(readFileSync(file,'utf8')),config=JSON.parse(readFileSync(path.join(q,'queue.json'),'utf8')),jobs=Array.isArray(config)?config:config.jobs??[];
 const saved=JSON.parse(readFileSync(path.join(q,'state.json'),'utf8')),counts={};for(const j of jobs){const s=saved[j.name]?.status??'pending';counts[s]=(counts[s]||0)+1;}
 const children=Array.isArray(saved._child)?saved._child:saved._child?[saved._child]:[],child=children[0],activeJobs=children.map(c=>jobs.find(j=>j.name===c.job)).filter(Boolean),job=jobs.find(j=>j.name===(child?.job||status.waiting?.step||status.step)),paused=existsSync(path.join(base,'PAUSE'))||existsSync(path.join(base,'../HOLD'));
 let state=['done','failed'].includes(status.state)?status.state:paused?'paused':status.waiting||status.step==='waiting_for_window'||status.step==='yield_wait'?'waiting':status.state==='running'&&children.length?'running':'unknown';
 if(state==='done'&&(counts.done||0)<jobs.length)state='waiting';
 const reason=status.state==='done'&&(counts.done||0)<jobs.length?'Queue driver stopped with unfinished jobs':status.waiting?.held?.map(h=>h.reason+': '+h.detail).join('; ')||(status.waiting?'Resource cooldown · '+Math.max(0,600-(status.waiting.quiet_for_s||0))+'s clear time remaining':status.step==='waiting_for_window'?'Waiting for allowed window':'');
 const kind=activeJobs.length&&activeJobs.every(j=>j.kind===activeJobs[0].kind)?activeJobs[0].kind:job?.kind||'queue',label={eval:'Evaluating',train:'Training',oracle:'Fitting',baselines:'Evaluating baselines'}[kind]||'Queue';
 let used=0;try{for(const line of readFileSync(path.join(q,'gpu_ledger.jsonl'),'utf8').trim().split('\n')){try{used+=JSON.parse(line).s||0;}catch{}}}catch{}
 return{workloadKey:'akimb0-pc/'+queue.replace(/^neb(?=\d)/i,'NEB-'),state,detail:(state==='running'?label+' · ':'')+(activeJobs.length>1?activeJobs.map(j=>j.name).join(', '):job?.name||status.step||'Queue complete')+(reason?' · '+reason:''),progress:{done:counts.done||0,total:jobs.length},updatedAt:statSync(file).mtimeMs,
 activity:{job:activeJobs.length>1?activeJobs.map(j=>j.name).join(', '):job?.name||null,kind,label,progress:state==='running'&&activeJobs.length===1?oracleProgress(q,job,child):null,reason,attempt:child?.attempt||null},queue:{counts,admissionHours:config.admission_gpu_h??50,hardStopHours:config.ceiling_gpu_h??52,recordedHours:Math.round(used/360)/10}};
}
