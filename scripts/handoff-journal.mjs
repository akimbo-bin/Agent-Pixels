// Observes completed work; writes only this dashboard's visual event journal.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';import{createHash}from'node:crypto';
export function handoffJournal(root,{now=Date.now}={}){
 const dir=path.join(root,'handoff-state'),file=path.join(dir,'journal.json');let state=null,serial=Promise.resolve(),error=null;
 async function load(){if(state)return;try{state=JSON.parse(await readFile(file,'utf8'));if(state.version!==1||!state.tasks||!Array.isArray(state.events))throw Error('Invalid journal');}catch(e){state={version:1,tasks:{},events:[],observedAt:null,sourceAt:null};if(e.code!=='ENOENT')error='Previous visual journal could not be read; a new baseline is required';}}
 async function save(){await mkdir(dir,{recursive:true});await writeFile(file+'.next',JSON.stringify(state));await rename(file+'.next',file);}
 function observe(feed){serial=serial.catch(()=>{}).then(async()=>{await load();const o=feed?.org?.paperclip,b=o?.workboard,time=now(),stamp=Date.parse(o?.exportedAt);if(o?.company?.name?.toLowerCase()!=='nebula'||b?.complete!==true||!Number.isFinite(stamp)||time-stamp>90000||stamp>time+30000)return;
 if(state.sourceAt&&stamp<=state.sourceAt)return;
 const baseline=!state.observedAt,agents=new Map((o.agents||[]).map(a=>[a.id,a])),lead=(o.agents||[]).find(a=>a.name==='Lead')||(o.agents||[]).find(a=>a.role==='ceo'),issues=new Map((b.issues||[]).map(i=>[i.id,i])),seen=new Set(state.events.map(e=>e.id)),tasks={};
 for(const i of b.issues||[]){
  if(typeof i.id!=='string'||!i.id)continue;
  const token=i.completedAt||i.updatedAt||'',previous=state.tasks[i.id];tasks[i.id]={status:i.status,token};
  const completed=Date.parse(token),recent=Number.isFinite(completed)&&completed>=time-30*60*1000&&completed<=time+30000,changed=previous?previous.status!=='done':completed>=state.observedAt-10000;
  if(baseline||i.status!=='done'||!changed||!recent||!agents.has(i.assigneeAgentId))continue;
  const source=agents.get(i.assigneeAgentId),parent=issues.get(i.parentId),recipients=new Map();
  // A parent link is an ownership relationship, never an inferred dependency.
  if(parent&&agents.has(parent.assigneeAgentId)&&parent.assigneeAgentId!==source.id)recipients.set(parent.assigneeAgentId,{kind:'parent-update',relationship:'parent-owner',relatedTaskKey:String(parent.key||parent.identifier||'').slice(0,40)});
  const manager=agents.get(source.reportsTo),recipient=manager?.id!==source.id&&manager?manager:lead?.id!==source.id?lead:null;
  if(recipient&&!recipients.has(recipient.id))recipients.set(recipient.id,{kind:'completion-report',relationship:manager===recipient?'reports-to':'lead-fallback'});
  for(const [recipientId,route]of recipients){
   const target=agents.get(recipientId),id=createHash('sha256').update(i.id+':'+token+':'+recipientId).digest('hex').slice(0,24);
   if(seen.has(id))continue;seen.add(id);
   state.events.push({id,...route,taskId:i.id,key:String(i.key||i.identifier||'').slice(0,40),title:String(i.title||'Completed work').slice(0,180),sourceAgentId:source.id,sourceName:String(source.name).slice(0,80),recipientAgentId:target.id,recipientName:String(target.name).slice(0,80),completedAt:new Date(completed).toISOString(),observedAt:time,visualOnly:true});
  }
 }
 state.tasks=tasks;state.events=state.events.slice(-200);state.observedAt=time;state.sourceAt=stamp;await save();error=null;
 }).catch(e=>{error='Visual handoff journal unavailable';});return serial;}
 async function read(){await serial;await load();return{version:1,visualOnly:true,sourceAt:state.sourceAt,observedAt:state.observedAt,events:state.events,error};}
 return{observe,read};
}
