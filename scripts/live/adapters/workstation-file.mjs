// Read a workstation-published task without turning old observations into fresh data.
import {readFile} from 'node:fs/promises';
export async function read({file='/var/lib/nebula-world/workstation.json',id}){
 const snapshot=JSON.parse(await readFile(file,'utf8')),task=snapshot.tasks?.[id];
 if(!task||!Number.isFinite(snapshot.publishedAt)||Date.now()-snapshot.publishedAt>180000)return{state:'unknown',why:'Workstation telemetry unavailable or stale',updatedAt:task?.updatedAt};
 return task;
}
