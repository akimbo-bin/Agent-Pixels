// Authoritative queue state, with current workload separated from whole-queue completion.
import {existsSync,readFileSync,statSync} from 'node:fs';import path from 'node:path';
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
 return{state,detail:(state==='running'?label+' · ':'')+(activeJobs.length>1?activeJobs.map(j=>j.name).join(', '):job?.name||status.step||'Queue complete')+(reason?' · '+reason:''),progress:{done:counts.done||0,total:jobs.length},updatedAt:statSync(file).mtimeMs,
 activity:{job:activeJobs.length>1?activeJobs.map(j=>j.name).join(', '):job?.name||null,kind,label,progress:null,reason,attempt:child?.attempt||null},queue:{counts,admissionHours:config.admission_gpu_h??50,hardStopHours:config.ceiling_gpu_h??52,recordedHours:Math.round(used/360)/10}};
}
