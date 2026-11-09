// Dashboard-owned seat fits and chair cutouts. No organization or workload writes.
import {readFile,writeFile,mkdir,rename,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function seatLayoutApi(root,{imageSha}={}){
 const file=path.join(root,'seat-state/layout.json');let serial=Promise.resolve();
 const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 async function expected(){if(imageSha)return imageSha;const pointer=JSON.parse(await readFile(path.join(root,'current.json'),'utf8'));if(!/^[\w.-]+$/.test(pointer.release))throw Error('Invalid release');return JSON.parse(await readFile(path.join(root,'releases',pointer.release,'release.json'),'utf8')).mapImageSha256;}
 async function load(image){try{const saved=JSON.parse(await readFile(file,'utf8'));if(saved.imageSha!==image)return{revision:0,imageSha:image,layout:null};return saved;}catch(e){if(e.code!=='ENOENT')throw e;return{revision:0,imageSha:image,layout:null};}}
 function validate(body){
  const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max,point=p=>Array.isArray(p)&&p.length===2&&finite(p[0],0,1448)&&finite(p[1],0,1086),id=x=>typeof x==='string'&&/^[\w.-]{1,100}$/.test(x),text=x=>typeof x==='string'&&x.length<=160;
  if(!Array.isArray(body.seats)||body.seats.length>500||!Array.isArray(body.masks)||body.masks.length>500)throw Error('Invalid seat layout');
  const seen=new Set();for(const s of body.seats){if(!id(s.id)||seen.has(s.id)||!text(s.name)||!['upper','middle','ground'].includes(s.floor)||!point([s.x,s.y])||!finite(s.depth,0,1086)||!point(s.approach)||!point(s.exit)||!finite(s.height,8,100)||!finite(s.width,30,200)||!finite(s.offsetX,-150,150)||!finite(s.offsetY,-150,150)||typeof s.autoScale!=='boolean'||!['up','down','left','right'].includes(s.facing)||!['typing','reading','idle'].includes(s.animation)||!Array.isArray(s.maskIds)||s.maskIds.some(x=>!id(x))||s.room!==undefined&&!id(s.room)||s.access!==undefined&&!['room','shared'].includes(s.access))throw Error('Invalid seat');seen.add(s.id);}
  const linked=new Set(body.seats.flatMap(s=>s.maskIds)),maskIds=new Set();for(const m of body.masks){if(!id(m.id)||maskIds.has(m.id)||!linked.has(m.id)||!text(m.name)||!['upper','middle','ground'].includes(m.floor)||!finite(m.depth,0,1086)||!Array.isArray(m.ops)||m.ops.length>10000)throw Error('Invalid chair cutout');maskIds.add(m.id);if(m.footprint&&(!Array.isArray(m.footprint)||!m.footprint.every(point)))throw Error('Invalid footprint');for(const op of m.ops){if(!['polygon','brush'].includes(op.type)||!Array.isArray(op.points)||op.points.length>20000||!op.points.every(point)||op.type==='brush'&&!finite(op.width,.1,500))throw Error('Invalid cutout outline');}}
  return{seats:body.seats,masks:body.masks};
 }
 return async(req,res,url)=>{
  if(url.pathname!=='/api/seat-layout')return false;
  const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try{const image=await expected();if(!image)throw Error('Map identity unavailable');
   if(req.method==='GET'){await serial;send(200,await load(image));return true;}
   if(req.method!=='POST'){send(405,{error:'Use GET or POST'});return true;}
   let origin;try{origin=new URL(req.headers.origin);}catch{}
   if(req.headers['x-nebula-layout']!=='1'||!origin||(origin.host!==req.headers.host&&origin.origin!=='https://rehoboam-proxmox.sphinx-scylla.ts.net:8444')||!String(req.headers['content-type']).startsWith('application/json')){send(403,{error:'Save from the office page'});return true;}
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8*1024*1024){send(413,{error:'Seat layout too large'});return true;}}
   let body,layout;try{body=JSON.parse(raw);layout=validate(body);if(body.imageSha!==image||!Number.isSafeInteger(body.baseRevision)||body.baseRevision<0)throw Error('Map changed');}catch{send(400,{error:'Invalid layout or different map image'});return true;}
   const operation=serial.catch(()=>{}).then(async()=>{const current=await load(image),digest=hash(layout);if(current.layout&&hash(current.layout)===digest){send(200,current);return;}if(current.revision!==body.baseRevision){send(409,{error:'Another device saved newer seats',...current});return;}const next={revision:current.revision+1,imageSha:image,savedAt:new Date().toISOString(),layout};await mkdir(path.dirname(file),{recursive:true});await writeFile(file+'.next',JSON.stringify(next));try{await copyFile(file,file+'.prev');}catch(e){if(e.code!=='ENOENT')throw e;}await rename(file+'.next',file);send(200,next);});serial=operation.catch(()=>{});await operation;
  }catch{send(503,{error:'Shared seats unavailable; your local save is safe'});}return true;
 };
}
