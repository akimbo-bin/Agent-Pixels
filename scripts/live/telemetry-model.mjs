// Shared server/browser interpretation of the producer-owned nebula.telemetry/1 contract.
const OfficeTelemetry=(()=>{
 const companyId='7b3de9f6-dc63-4fa6-8cb5-65d1693aec3f',version='nebula.telemetry/1';
 const agents={'77b41f73-5f28-48bb-9011-0d481936dc9e':'lead','bd01ea5e-0f61-4e04-bf0a-ef61293793f7':'second','ecd3cbaf-c405-4dc0-b83a-1caf46bb7459':'clerk','f50c7658-254b-46ab-94de-68abe9990255':'observatory','3ef85421-09a9-4a3f-828a-29513c05c65f':'engine','e7f4a9e1-b56b-47b5-b193-51d61c4809ed':'engine','0f0300e1-dd24-4730-a29e-21893947aaa0':'data','abe2420a-f7ae-460f-ae5d-b75bdc956a12':'training','f7f568e8-ee08-46f3-be89-eb0a16f5a481':'doctor','ab19de07-cc8e-4c7f-bebe-ac4b1a0101b7':'review','86bac1d2-a575-4971-86d8-b1a825752aca':'review','35f1840a-63ec-4463-8c4b-50cc737b63e6':'review','11998dd6-aed1-40d7-89e4-282731458ff8':'review','2e806341-34b9-40f9-9273-14c7c618efe9':null};
 const kindRooms={training:'training','training-queue':'training',evaluation:'training','oracle-fit':'training','exploration-benchmark':'training','dataset-render':'data','dataset-qa':'data','dataset-ingest':'data','audio-render':'music','listening-packet':'music',build:'engine',ci:'engine','engine-research':'observatory','health-check':'doctor',fixture:'operations'};
 const rooms=new Set(['lead','second','clerk','observatory','engine','data','training','music','doctor','review','operations','queue']);
 const stamp=value=>typeof value==='string'?Date.parse(value):NaN;
 const age=(value,now=Date.now())=>Number.isFinite(stamp(value))?Math.max(0,(now-stamp(value))/1000):null;
 const fresh=(expiresAt,now=Date.now())=>Number.isFinite(stamp(expiresAt))&&now<stamp(expiresAt);
 const key=w=>w.workloadId+'\u0000'+w.attemptId;
 const roomFor=w=>rooms.has(w.roomId)?w.roomId:kindRooms[w.kind]||null;
 function workload(w,collector,now=Date.now()){
  const reportedState=w.reportedState||w.state,validClock=stamp(w.heartbeatAt)<=now+300000,available=collector&&fresh(w.expiresAt,now)&&validClock;
  // A repeated heartbeat alone cannot keep old process evidence Running.
  const evidenceFresh=reportedState!=='running'||Number.isFinite(stamp(w.evidenceAt))&&stamp(w.evidenceAt)<=now+300000&&now-stamp(w.evidenceAt)<=Math.max(30,3*w.cadenceS)*1000;
  const state=available&&evidenceFresh?reportedState:'unknown';
  return{...w,key:key(w),roomId:roomFor(w),reportedState,state,available:!!available,executionFresh:!!(available&&evidenceFresh),ageS:age(w.heartbeatAt,now),expired:!fresh(w.expiresAt,now),fixture:w.kind==='fixture',reason:!collector?'Collector unavailable or expired':!available?'Workload observation expired or invalid clock':!evidenceFresh?'Execution evidence expired':w.reason||''};
 }
 function view(data,now=Date.now()){
  if(!data)return null;const available=data.schemaVersion===version&&data.companyId===companyId&&!data.error&&Number.isFinite(stamp(data.collector?.finishedAt))&&stamp(data.collector?.finishedAt)<=now+300000&&fresh(data.collector?.expiresAt,now);
  const all=(data.workloads||[]).map(w=>workload(w,available,now)),latest=new Map();
  for(const w of all){const old=latest.get(w.workloadId);const rank=x=>stamp(x.startedAt)||stamp(x.attemptId?.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/)?.[0])||stamp(x.stateChangedAt)||stamp(x.heartbeatAt)||0;if(!old||rank(w)>rank(old)||rank(w)===rank(old)&&(stamp(w.stateChangedAt)>stamp(old.stateChangedAt)||stamp(w.stateChangedAt)===stamp(old.stateChangedAt)&&w.attemptId.localeCompare(old.attemptId)>0))latest.set(w.workloadId,w);}
  const artifacts=new Map();for(const a of data.artifacts||[])if(a.renderCountEligible===true&&a.kind==='dataset-manifest'&&a.validatedAt&&Number.isInteger(a.count)&&a.count>=0&&a.artifactId==='sha256:'+a.sha256&&!artifacts.has(a.sha256))artifacts.set(a.sha256,a);
  return{...data,available,ageS:age(data.collector?.finishedAt,now),workloads:all,current:[...latest.values()],eligibleArtifacts:[...artifacts.values()],renderCount:[...artifacts.values()].reduce((n,a)=>n+a.count,0),sources:(data.sources||[]).map(s=>({...s,ageS:age(s.heartbeatAt||s.lastSuccessAt,now),expired:!available||!fresh(s.expiresAt||data.collector?.expiresAt,now),effectiveStatus:!available||!fresh(s.expiresAt||data.collector?.expiresAt,now)?'unknown':s.status||'ok'}))};
 }
 function progress(w,scope){const p=w?.progress?.find(p=>p.scope===scope);return w?.executionFresh&&p&&Number.isFinite(p.done)&&p.done>=0&&(p.total===null||Number.isFinite(p.total)&&p.total>0&&p.done<=p.total)?p:null;}
 function task(w){const p=progress(w,'current-job'),q=progress(w,'queue');return{id:'telemetry.'+encodeURIComponent(w.workloadId)+'/'+encodeURIComponent(w.attemptId),title:w.issueKey?w.issueKey+' · '+w.kind:w.kind,workloadKey:w.key,workloadId:w.workloadId,attemptId:w.attemptId,roomId:w.roomId,kind:w.kind,state:w.state,reportedState:w.reportedState,detail:w.reason||w.workloadId,fresh:w.executionFresh,updatedAt:stamp(w.heartbeatAt),expiresAt:stamp(w.expiresAt),progress:p||q,queueProgress:q,currentProgress:p,activity:{job:w.workloadId,label:w.kind,kind:w.kind,progress:p?{...p,updatedAt:stamp(p.measuredAt),source:w.sourceId}:null,attempt:w.attemptId},fixture:w.fixture,agentId:w.agentId,issueKey:w.issueKey,sourceId:w.sourceId};}
 function training(data,now=Date.now()){
  const v=view(data,now);if(!v)return null;const drivers=v.current.filter(w=>w.roomId==='training'&&w.kind==='training-queue').sort((a,b)=>(b.state==='running')-(a.state==='running')||stamp(b.heartbeatAt)-stamp(a.heartbeatAt)),driver=drivers[0],children=v.current.filter(w=>w.roomId==='training'&&w.state==='running'&&(!driver||w.parentWorkloadId===driver.workloadId)),other=v.current.filter(w=>w.roomId==='training'&&w.state==='running'&&!w.parentWorkloadId&&w.kind!=='training-queue'),active=children[0]||other[0],selected=active||driver;
  if(!selected)return{state:'unknown',fresh:false,detail:'No Training workload reported',progress:null,activity:null,concurrent:[]};
  const t=task(selected),q=progress(driver,'queue');return{...t,title:'AKIMB0 · '+(active?active.kind:'TRAINING QUEUE'),progress:q,queueProgress:q,currentProgress:progress(active,'current-job'),queue:q?{counts:{done:q.done,total:q.total}}:null,activity:{...t.activity,progress:progress(active,'current-job')?{...progress(active,'current-job'),updatedAt:stamp(progress(active,'current-job').measuredAt),source:active.sourceId}:null},concurrent:[...children,...other].filter((w,i,a)=>a.findIndex(x=>x.key===w.key)===i).map(task),driverState:driver?.state||null};
 }
 function roomStates(data,now=Date.now()){
  const v=view(data,now);return Object.fromEntries([...rooms].map(room=>{const all=v?.current.filter(w=>w.roomId===room&&!w.fixture)||[],priority=['running','failed','waiting','paused','unknown','done','idle'],known=all.filter(w=>w.executionFresh),w=[...(known.length?known:all)].sort((a,b)=>priority.indexOf(a.state)-priority.indexOf(b.state))[0];return[room,{state:w?.state||(v?.available?'idle':'unknown'),available:!!v?.available,expiresAt:Math.min(stamp(data?.collector?.expiresAt)||now,...all.filter(w=>w.executionFresh).map(w=>stamp(w.expiresAt)||now)),workloads:all.map(task)}];}));
 }
 return{companyId,version,agents,kindRooms,rooms,stamp,age,fresh,key,roomFor,view,progress,task,training,roomStates,agentRoom:id=>agents[id]??null};
})();
export{OfficeTelemetry};
