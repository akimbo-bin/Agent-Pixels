// The saved editor document is shared; unfinished drafts remain local.
const MapSync=(()=>{
 const key=saveKey+':map-sharing',backup=saveKey+':before-map-sync';let remote=null,meta=null,busy=false;
 const pack=()=>{const value=snapshot();delete value.savedAt;return value;};
 const signature=v=>{const sort=x=>Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;const text=JSON.stringify(sort(v));let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}return (a>>>0).toString(16)+':'+(b>>>0).toString(16)+':'+text.length;};
 const notice=document.createElement('div');notice.className='map-sync seat-sync';notice.style.cssText='padding:9px;border:1px solid #77618e;border-radius:6px;margin-bottom:10px;font-size:12px';
 const label=document.createElement('div'),use=document.createElement('button'),publish=document.createElement('button');use.textContent='Use shared map';publish.textContent='Publish this map';notice.append(label,use,publish);
 function status(text,conflict=false){label.textContent=text;use.hidden=publish.hidden=!conflict;}
 function record(value){meta={revision:value.revision,signature:signature(value.layout)};localStorage.setItem(key,JSON.stringify(meta));}
 function apply(value){
  if(dirty||gesture||mode!=='walk'||Seating.controlsLocked()||Lift.hasPassenger())return false;
  const valid=checked(value.layout);
  localStorage.setItem(backup,JSON.stringify(snapshot()));
  applyState(valid);AgentMotion.reset();dirty=false;locked=true;
  localStorage.setItem(saveKey,JSON.stringify(snapshot()));localStorage.removeItem(draftKey);record({...value,layout:pack()});status('Map synced · revision '+value.revision);$('#status').textContent='Saved · map synced';return true;
 }
 async function check(){if(busy||document.hidden)return;busy=true;try{const response=await fetch('/api/map-layout',{cache:'no-store'});if(!response.ok)throw Error();remote=await response.json();if(remote.imageSha!==imageInfo.sha256)throw Error();if(!remote.layout){
    // Carry forward an existing shared chair layout before the first full-map save.
    if(!localStorage.getItem(saveKey)&&!localStorage.getItem(draftKey)&&!dirty&&mode==='walk'){
     const r=await fetch('/api/seat-layout',{cache:'no-store'});if(r.ok){const legacy=await r.json();if(legacy.imageSha===imageInfo.sha256&&legacy.layout){const map=pack(),linked=new Set(map.seats.flatMap(s=>s.maskIds)),incoming=new Set(legacy.layout.masks.map(m=>m.id));map.seats=legacy.layout.seats;map.masks=map.masks.filter(m=>!linked.has(m.id)&&!incoming.has(m.id)).concat(legacy.layout.masks);apply({...remote,layout:map});}}
    }
    status('Saved maps sync across devices. Press Save map to publish this device’s edits.');return;
   }
   const local=signature(pack());if(local===signature(remote.layout)){record(remote);status('Map synced · revision '+remote.revision);return;}
   const localSave=localStorage.getItem(saveKey)||localStorage.getItem(draftKey);
   if((!localSave||meta&&local===meta.signature)&&apply(remote))return;
   status('A different saved map is available. Your local edits are preserved.',true);
  }catch{status('Map sync offline · local saves still work.');}finally{busy=false;}}
 async function save(force=false){if(busy){message('Map connection is busy. Your edits are saved locally; try Save again shortly.');return;}busy=true;try{
   const response=await fetch('/api/map-layout',{method:'POST',headers:{'Content-Type':'application/json','X-Nebula-Layout':'1'},body:JSON.stringify({imageSha:imageInfo.sha256,baseRevision:force?remote?.revision??0:meta?.revision??0,...pack()})});const value=await response.json();
   if(response.status===409){remote=value;status('Another device saved a different map. Choose which version to keep.',true);message('Saved on this device. Newer shared edits were preserved; open the editor to choose a map.');return;}
   if(!response.ok)throw Error(value.error);remote=value;record(value);status('Map synced · revision '+value.revision);if(!dirty)$('#status').textContent='Saved · map synced';message('Map saved and synced across devices.');
  }catch{status('Saved locally · map sync unavailable.');message('Map saved on this device. Map sync is unavailable; your local copy is safe.');}finally{busy=false;}}
 function init(){try{meta=JSON.parse(localStorage.getItem(key)||'null');}catch{}$('#editor-panel-content').prepend(notice);$('#save').title='Save and sync all editor changes across your devices';status('Checking shared map…');use.onclick=()=>{if(!remote?.layout)return;if(dirty){message('Save your local changes first, then choose Use shared map.');return;}if(mode!=='walk')setMode('walk');try{if(apply(remote))message('Shared map loaded. Your previous local map is backed up.');else message('Finish the current interaction before loading the shared map.');}catch{message('Shared layout could not be loaded. Your local edits were kept.');}};publish.onclick=()=>{if(dirty){message('Save your local changes before publishing.');return;}save(true);};check();setInterval(check,20000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});}
 return{init,save,check};
})();
