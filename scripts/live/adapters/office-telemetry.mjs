import {readFile,stat} from 'node:fs/promises';
import validate from '../telemetry-validator.cjs';
import {OfficeTelemetry as T} from '../telemetry-model.mjs';
import {telemetryHistory} from '../telemetry-history.mjs';
const lastGood=new Map();
const fields=['schemaVersion','recordType','companyId','workloadId','attemptId','parentWorkloadId','kind','roomId','machineId','issueKey','issueId','agentName','agentId','state','reason','startedAt','finishedAt','stateChangedAt','heartbeatAt','evidenceAt','progressChangedAt','progress','cadenceS','expiresAt','seq','sourceId','observationSource'];
const pick=(r,keys)=>Object.fromEntries(keys.filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));
function semantic(w,now){return Buffer.byteLength(JSON.stringify(w))<=65536&&T.stamp(w.heartbeatAt)<=now+300000&&T.stamp(w.expiresAt)>T.stamp(w.heartbeatAt)&&(!['done','failed'].includes(w.state)||Number.isFinite(T.stamp(w.finishedAt)))&&w.progress.every(p=>Number.isFinite(p.done)&&(p.total===null||p.done<=p.total)&&T.stamp(p.measuredAt)<=now+300000);}
export function parseSnapshot(raw,{now=Date.now()}={}){
 if(!validate(raw))throw Error('Telemetry schema rejected: '+(validate.errors||[]).slice(0,3).map(e=>e.instancePath+' '+e.message).join('; '));
 if(!Number.isFinite(T.stamp(raw.collector.finishedAt))||T.stamp(raw.collector.finishedAt)>now+300000||!(T.stamp(raw.collector.expiresAt)>T.stamp(raw.collector.finishedAt)))throw Error('Invalid collector timestamps');
 const rejected=(raw.rejected||[]).slice(-100),workloads=new Map();for(const w of raw.workloads){if(!semantic(w,now)){rejected.push({workloadId:w.workloadId,attemptId:w.attemptId,reason:'Invalid progress, terminal state, timestamp or record size'});continue;}const k=T.key(w),old=workloads.get(k);if(!old||(w.seq||0)>=(old.seq||0))workloads.set(k,pick(w,fields));}
 return{schemaVersion:T.version,recordType:'snapshot',companyId:T.companyId,collector:pick(raw.collector,['sourceId','startedAt','finishedAt','cadenceS','expiresAt','eventsSeq']),workloads:[...workloads.values()],sources:raw.sources.slice(0,100).map(s=>pick(s,['sourceId','machineId','producer','heartbeatAt','expiresAt','cadenceS','lastSuccessAt','status','complete','error','fileErrors','historyStartsAt','gaps','seq','checkedAt'])),artifacts:raw.artifacts.slice(-10000).map(a=>pick(a,['artifactId','sha256','kind','workloadId','attemptId','completedAt','validatedAt','renderCountEligible','count','issueKey'])),listening:raw.listening.slice(-100).map(p=>pick(p,['packetId','revision','issueKey','workloadId','state','readyAt'])),rejected:rejected.slice(-100),conflicts:raw.conflicts.slice(-100),unreported:raw.unreported.slice(-100)};
}
export async function read(options={}){
 const now=Date.now(),file=options.file||'/var/lib/nebula-telemetry/v1/snapshot.json';let telemetry;
 try{if((await stat(file)).size>8*1024*1024)throw Error('Telemetry snapshot exceeds reader limit');telemetry=parseSnapshot(JSON.parse(await readFile(file,'utf8')),{now});lastGood.set(file,structuredClone(telemetry));}catch(e){telemetry={schemaVersion:T.version,companyId:T.companyId,error:String(e.message).slice(0,400),collector:null,sources:[],workloads:[],artifacts:[],listening:[],rejected:[],conflicts:[],unreported:[],...(lastGood.has(file)?structuredClone(lastGood.get(file)):{}),error:String(e.message).slice(0,400)};}
 try{telemetry.history=await telemetryHistory(options).read();}catch{telemetry.history={error:'History reader state unavailable'};}
 try{const status=JSON.parse(await readFile(options.activityStatusFile||'/var/lib/nebula-telemetry/v1/activity/status.json','utf8'));if(validate(status)&&status.recordType==='source')telemetry.activityStatus=pick(status,['sourceId','status','heartbeatAt','expiresAt','lastSuccessAt','historyStartsAt','gaps','error','seq','lastPoll','cadenceS']);}catch{telemetry.activityStatus={status:'unknown',error:'Activity status unavailable'};}
 const v=T.view(telemetry,now);return{state:v.available?'idle':'unknown',detail:v.available?'Validated organization telemetry':telemetry.error||'Collector expired',updatedAt:T.stamp(telemetry.collector?.finishedAt),telemetry};
}
