// Persist read cursors and stable event IDs in our own state directory; producer files are read-only.
import {readFile,writeFile,mkdir,rename,stat} from 'node:fs/promises';
import path from 'node:path';
import validate from './telemetry-validator.cjs';
import {OfficeTelemetry as T} from './telemetry-model.mjs';
const stores=new Map(),types={events:['event'],activity:['activity','activity-gap']};
const pick=(r,keys)=>Object.fromEntries(keys.filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));
function safe(r){return pick(r,['schemaVersion','companyId','recordType','eventId','seq','type','occurredAt','collectedAt','sourceCreatedAt','action','actorType','actorId','agentId','runId','entityType','entityId','workloadId','attemptId','issueId','issueKey','machineId','state','reason','artifactId','from','to','details']);}
export function telemetryHistory(options={}){
 const directory=options.stateDirectory||'/var/lib/nebula-world/telemetry-state',id=JSON.stringify([directory,options.eventsFile,options.activityFile]);if(stores.has(id))return stores.get(id);
 const fileCache=new Map();
 let state=null,serial=Promise.resolve(),last=0,result=null;
 async function load(){if(state)return;try{state=JSON.parse(await readFile(path.join(directory,'history.json'),'utf8'));if(state.version!==1||!state.channels)throw Error('Bad state');}catch(e){state={version:1,channels:{},recovery:e.code==='ENOENT'?null:'Reader state unavailable; rebuilding from retained producer history'};}}
 async function collect(){await load();let changed=false;const channels={};for(const name of Object.keys(types)){
   const file=options[name==='events'?'eventsFile':'activityFile']||('/var/lib/nebula-telemetry/v1/'+(name==='events'?'events.jsonl':'activity/activity.jsonl'));
   const saved=state.channels[name]||{lastSeq:0,seen:[],entries:[]},seen=new Set(saved.seen),entries=new Map(saved.entries.map(e=>[e.eventId,e]));let available=false,invalid=0,error=null,min=Infinity,max=0;
   for(const f of [file.replace(/\.jsonl$/,'.1.jsonl'),file]){try{const meta=await stat(f),size=meta.size,fingerprint=size+':'+meta.mtimeMs,hit=fileCache.get(f);if(hit?.fingerprint===fingerprint){invalid+=hit.invalid;min=Math.min(min,hit.min);max=Math.max(max,hit.max);if(f===file)available=true;continue;}let fileMin=Infinity,fileMax=0;const beforeInvalid=invalid;if(size>25*1024*1024)throw Error('History file exceeds reader limit');const text=await readFile(f,'utf8'),lines=text.split('\n');if(!text.endsWith('\n'))lines.pop();for(const line of lines){if(!line.trim())continue;let r;try{if(Buffer.byteLength(line)>65536)throw Error('Oversized line');r=JSON.parse(line);if(!validate(r)||!types[name].includes(r.recordType)||!Number.isSafeInteger(r.seq)||r.seq<1||typeof r.eventId!=='string'||!r.eventId||r.eventId.length>250||r.companyId!==T.companyId)throw Error('Invalid record');if(r.recordType==='activity'&&/^(cost|secret)\./.test(r.action))continue;}catch{invalid++;continue;}min=Math.min(min,r.seq);max=Math.max(max,r.seq);fileMin=Math.min(fileMin,r.seq);fileMax=Math.max(fileMax,r.seq);if(!seen.has(r.eventId)){seen.add(r.eventId);entries.set(r.eventId,safe(r));changed=true;}}
     fileCache.set(f,{fingerprint,min:fileMin,max:fileMax,invalid:invalid-beforeInvalid});if(f===file)available=true;
    }catch(e){if(f===file)error=e.code==='ENOENT'?'History source not available':e.message;}
   }
   const retained=[...entries.values()].sort((a,b)=>a.seq-b.seq).slice(-5000),lastSeq=Math.max(saved.lastSeq,max);if(lastSeq!==saved.lastSeq)changed=true;
   state.channels[name]={lastSeq,seen:[...seen].slice(-50000),entries:retained};
   const missed=Number.isFinite(min)&&saved.lastSeq>0&&min>saved.lastSeq+1;
   channels[name]={available,error,lastSeq,invalid,readGap:missed?{fromSeq:saved.lastSeq+1,toSeq:min-1}:null,total:retained.length,retainedFromSeq:retained[0]?.seq??null,entries:retained.slice(-80)};
   // Keep detected holes visible across subsequent successful reads.
   if(missed){state.channels[name].readGaps=[...(saved.readGaps||[]),channels[name].readGap].slice(-20);changed=true;}else state.channels[name].readGaps=saved.readGaps||[];
   channels[name].readGaps=state.channels[name].readGaps;
  }
  if(changed){await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'history.next.json'),JSON.stringify(state));await rename(path.join(directory,'history.next.json'),path.join(directory,'history.json'));}
  result={...channels,recovery:state.recovery||null};last=Date.now();return result;
 }
 async function read(){if(result&&Date.now()-last<15000)return result;const pending=serial.then(collect);serial=pending.catch(()=>{});return pending;}
 async function page(name,{afterSeq=0,beforeSeq=Infinity,limit=100}={}){await read();if(!types[name])throw Error('Unknown history');const all=state.channels[name].entries,filtered=all.filter(e=>e.seq>afterSeq&&e.seq<beforeSeq),entries=Number.isFinite(beforeSeq)?filtered.slice(-limit):afterSeq?filtered.slice(0,limit):filtered.slice(-limit);return{...result[name],entries,nextSeq:entries.at(-1)?.seq??afterSeq,hasOlder:!!entries.length&&all.some(e=>e.seq<entries[0].seq)};}
 const store={read,page};stores.set(id,store);return store;
}
