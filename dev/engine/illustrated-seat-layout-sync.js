// Seats are shared across devices; the rest of the map remains a local draft.
const SeatLayouts=(()=>{
 const key=saveKey+':seat-sharing',backup=saveKey+':before-seat-sync';let remote=null,meta=null,busy=false;
 const pack=()=>({seats:structuredClone(seats),masks:structuredClone(masks.filter(m=>seats.some(s=>s.maskIds.includes(m.id))))});
 const signature=v=>JSON.stringify(v);
 const notice=document.createElement('div');notice.className='seat-sync';notice.style.cssText='padding:9px;border:1px solid #77618e;border-radius:6px;margin-bottom:10px;font-size:12px';
 const label=document.createElement('div'),use=document.createElement('button'),publish=document.createElement('button');use.textContent='Use shared seats';publish.textContent='Publish these seats';notice.append(label,use,publish);
 function status(text,conflict=false){label.textContent=text;use.hidden=publish.hidden=!conflict;}
 function record(value){meta={revision:value.revision,signature:signature(value.layout)};localStorage.setItem(key,JSON.stringify(meta));}
 function apply(value){
  if(dirty||gesture||mode!=='walk'||Seating.controlsLocked())return false;
  const valid=Seating.validate(value.layout.seats),incoming=value.layout.masks.map(m=>structuredClone(m));
  localStorage.setItem(backup,JSON.stringify(snapshot()));
  const previousLinked=new Set(seats.flatMap(s=>s.maskIds)),nextIds=new Set(incoming.map(m=>m.id));
  seats=valid;masks=masks.filter(m=>!previousLinked.has(m.id)&&!nextIds.has(m.id)).concat(incoming);
  cache.clear();AgentMotion.reset();refreshMasks();Seating.refresh();
  localStorage.setItem(saveKey,JSON.stringify(snapshot()));record(value);status('Seats shared · revision '+value.revision);return true;
 }
 async function check(){if(busy||document.hidden)return;busy=true;try{const response=await fetch('/api/seat-layout',{cache:'no-store'});if(!response.ok)throw Error();remote=await response.json();if(remote.imageSha!==imageInfo.sha256)throw Error();if(!remote.layout){status('Seats saved on this device until you save to share.');return;}
   const local=signature(pack());if(local===signature(remote.layout)){record(remote);status('Seats shared · revision '+remote.revision);return;}
   const localSave=localStorage.getItem(saveKey)||localStorage.getItem(draftKey);
   if((!localSave||meta&&local===meta.signature)&&apply(remote))return;
   status('A different seat layout is available. Your local seats are preserved.',true);
  }catch{status('Shared seats offline · local saves still work.');}finally{busy=false;}}
 async function save(force=false){if(busy){message('Seat connection is busy. Your map is saved locally; try Save again shortly.');return;}busy=true;try{
   const response=await fetch('/api/seat-layout',{method:'POST',headers:{'Content-Type':'application/json','X-Nebula-Layout':'1'},body:JSON.stringify({imageSha:imageInfo.sha256,baseRevision:force?remote?.revision??0:meta?.revision??0,...pack()})});const value=await response.json();
   if(response.status===409){remote=value;status('Another device saved different seats. Choose which layout to keep.',true);message('Saved on this device. Newer shared seats were preserved; open Seats to choose a layout.');return;}
   if(!response.ok)throw Error(value.error);remote=value;record(value);status('Seats shared · revision '+value.revision);if(!dirty)$('#status').textContent='Saved · seats synced';message('Map saved here. Seats and chair cutouts synced across devices.');
  }catch{status('Saved locally · seat sync unavailable.');message('Map saved on this device. Seat sync is unavailable; your local copy is safe.');}finally{busy=false;}}
 function init(){try{meta=JSON.parse(localStorage.getItem(key)||'null');}catch{}$('#seat-panel').prepend(notice);$('#save').title='Save map here and sync seats with your other devices';status('Checking shared seats…');use.onclick=()=>{if(!remote?.layout)return;if(dirty){message('Save your local changes first, then choose Use shared seats.');return;}if(mode!=='walk')setMode('walk');try{if(apply(remote))message('Shared seats loaded. Your previous local map is backed up.');else message('Finish the current interaction before loading shared seats.');}catch{message('Shared layout could not be loaded. Your seats were kept.');}};publish.onclick=()=>{if(dirty){message('Save your local changes before publishing.');return;}save(true);};check();setInterval(check,20000);}
 return{init,save,check};
})();
