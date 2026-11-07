import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,rename,stat} from 'node:fs/promises';import {createReadStream} from 'node:fs';import path from 'node:path';
export function listeningApi(root){const assets=path.join(root,'listening'),state=path.join(root,'listening-state');let writes=Promise.resolve();
 const json=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 async function receipts(){try{return JSON.parse(await readFile(path.join(state,'reviews.json'),'utf8'));}catch{return{revision:0,reviews:[]};}}
 return async(req,res,url)=>{if(!url.pathname.startsWith('/api/listening'))return false;
  let catalog;try{catalog=JSON.parse(await readFile(path.join(assets,'catalog.json'),'utf8'));}catch{json(res,503,{error:'Listening catalog unavailable'});return true;}
  if(url.pathname==='/api/listening'&&req.method==='GET'){const saved=await receipts();json(res,200,{...catalog,revision:saved.revision,reviews:saved.reviews});return true;}
  if(url.pathname.startsWith('/api/listening/audio/')&&['GET','HEAD'].includes(req.method)){
   const name=url.pathname.split('/').at(-1),allowed=new Set(catalog.packets.flatMap(p=>p.trials.flatMap(t=>t.clips.map(c=>c.audio))));if(!allowed.has(name)){json(res,404,{error:'Not found'});return true;}
   const file=path.join(assets,'audio',name),size=(await stat(file)).size;let start=0,end=size-1,status=200;const range=req.headers.range;
   if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return true;}if(!m[1])start=Math.max(0,size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(size-1,Number(m[2]));}if(start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return true;}status=206;}
   res.writeHead(status,{'Content-Type':'audio/wav','Accept-Ranges':'bytes','Content-Length':end-start+1,'Cache-Control':'private, max-age=86400',...(status===206?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});if(req.method==='HEAD')res.end();else{const stream=createReadStream(file,{start,end});res.on('close',()=>stream.destroy());stream.pipe(res);}return true;
  }
  if(url.pathname==='/api/listening/reviews'&&req.method==='POST'){
   const allowed=new Set(['https://rehoboam-proxmox.sphinx-scylla.ts.net:8444','http://127.0.0.1:8791','http://127.0.0.1:8792']);if(!allowed.has(req.headers.origin)||req.headers['x-nebula-review']!=='1'||!String(req.headers['content-type']).startsWith('application/json')){json(res,403,{error:'Use the same-origin listening reviewer'});return true;}
   let bytes=0,body='';for await(const chunk of req){bytes+=chunk.length;if(bytes>32768){json(res,413,{error:'Review too large'});return true;}body+=chunk;}
   let data;try{data=JSON.parse(body);}catch{json(res,400,{error:'Invalid review'});return true;}const packet=catalog.packets.find(p=>p.id===data.packetId&&p.revision===data.packetRevision);
   if(!packet||!Array.isArray(data.trials)||data.trials.length!==packet.trials.length||new Set(data.trials.map(t=>t.trialId)).size!==packet.trials.length||data.trials.some(t=>{const target=packet.trials.find(x=>x.id===t.trialId);return!target||!['none',...target.clips.filter(c=>c.label!=='Reference').map(c=>c.id)].includes(t.pick)||!Number.isInteger(t.confidence)||t.confidence<1||t.confidence>3||typeof t.note!=='string'||t.note.length>2000;})){json(res,400,{error:'Complete every trial, choose a valid clip and confidence, and keep notes under 2000 characters'});return true;}
   const result=writes.then(async()=>{const current=await receipts();if(data.baseRevision!==current.revision)return{code:409,body:{error:'Another review was saved first. Your choices are preserved; press Save again to add your review.',currentRevision:current.revision}};const review={id:randomUUID(),packetId:packet.id,packetRevision:packet.revision,submittedAt:new Date().toISOString(),trials:data.trials.map(t=>({trialId:t.trialId,pick:t.pick,confidence:t.confidence,note:t.note}))};current.reviews.push(review);current.revision++;await mkdir(state,{recursive:true});await writeFile(path.join(state,'reviews.next.json'),JSON.stringify(current));await rename(path.join(state,'reviews.next.json'),path.join(state,'reviews.json'));return{code:201,body:{revision:current.revision,review}};});writes=result.catch(()=>{});const done=await result;json(res,done.code,done.body);return true;
  }
  json(res,405,{error:'Method not allowed'});return true;
 };
}
