import type {OfficeLayout} from '../types.js';
import {OfficeState} from '../engine/officeState.js';
import {findPath,isWalkable} from './tileMap.js';
import {getCatalogEntry} from './furnitureCatalog.js';
import {ROOMS,ROLE_SEATS,ACCESS_POINTS,PUBLIC_ROUTES,LOUNGE_POINTS} from './nebulaLayouts.js';
import {HQ_FLOORS,floorForRow,type HQFloor} from '../observatory/elevator.js';

/**
 * Production collision oracle for three physically isolated storeys.
 * The old single-component oracle was inappropriate: it rewarded bypassing
 * the lift by walking across a non-existent vertical corridor.
 * Every tile must be reachable from exactly one floor landing instead.
 */
export function validateCampus(layout:OfficeLayout){
 const office=new OfficeState(layout),failures:string[]=[];
 const key=(col:number,row:number)=>col+','+row;
 const floors=new Map<HQFloor,Set<string>>();
 for(const floor of HQ_FLOORS){
  const seen=new Set<string>(),queue=[floor.landing];
  if(!isWalkable(floor.landing.col,floor.landing.row,office.tileMap,office.blockedTiles)){
   failures.push('Blocked elevator landing '+floor.id);floors.set(floor.id,seen);continue;
  }
  seen.add(key(floor.landing.col,floor.landing.row));
  for(let i=0;i<queue.length;i++){
   const v=queue[i];
   for(const [dc,dr]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const col=v.col+dc,row=v.row+dr,k=key(col,row);
    if(!seen.has(k)&&isWalkable(col,row,office.tileMap,office.blockedTiles)){
     seen.add(k);queue.push({col,row});
    }
   }
  }
  floors.set(floor.id,seen);
 }
 const all=new Set<string>();
 for(const floor of HQ_FLOORS){
  const component=floors.get(floor.id)!;
  for(const cell of component){
   if(all.has(cell))failures.push('Walking bypasses elevator: '+cell);
   all.add(cell);
   const row=Number(cell.split(',')[1]);
   if(floorForRow(row)!==floor.id)failures.push('Actor could climb to wrong floor via '+cell);
  }
 }
 const walkableCount=office.walkableTiles.length;
 if(all.size!==walkableCount)failures.push((walkableCount-all.size)+' floor-isolated walk tiles unaccounted for');
 const check=(id:string,col:number,row:number)=>{
  const floor=HQ_FLOORS.find(f=>f.id===floorForRow(row))!;
  const component=floors.get(floor.id)!;
  const start=floor.landing;
  const path=findPath(start.col,start.row,col,row,office.tileMap,office.blockedTiles);
  if(!component.has(key(col,row))||(!path.length&&(start.col!==col||start.row!==row)))
   failures.push('Unreachable '+id+' at '+col+','+row);
  return path.length;
 };
 if(layout.cols!==64||layout.rows!==48||layout.tiles.length!==3072)failures.push('Expected 64x48 campus');
 if(layout.tileColors?.length!==layout.tiles.length)failures.push('Invalid tile colors');
 if(new Set(layout.furniture.map(f=>f.uid)).size!==layout.furniture.length)failures.push('Duplicate furniture UID');
 for(const f of layout.furniture){
  const e=getCatalogEntry(f.type);
  if(!e)failures.push('Unknown furniture '+f.type);
  else if(f.col<0||f.row<0||f.col+e.footprintW>layout.cols||f.row+e.footprintH>layout.rows)
   failures.push('Furniture out of bounds: '+f.uid);
 }
 const doors=ROOMS.flatMap(r=>r.doors.map((door,i)=>{
  if(door.length<2||Math.abs(door[0].col-door[1].col)+Math.abs(door[0].row-door[1].row)!==1)
   failures.push('Narrow door '+r.id);
  if(door.some(p=>p.row!==r.bounds.row+r.bounds.rows-1))failures.push('Non-floor-aligned doorway '+r.id);
  for(const p of door){
   check(r.id+' door '+i,p.col,p.row);
   check(r.id+' door '+i+' north',p.col,p.row-1);
   check(r.id+' door '+i+' south',p.col,p.row+1);
  }
  return {room:r.id,door:i,cells:door};
 }));
 for(const b of PUBLIC_ROUTES)
  for(let row=b.row;row<b.row+b.rows;row++)for(let col=b.col;col<b.col+b.cols;col++){
   if(!all.has(key(col,row)))failures.push('Blocked public route '+col+','+row);
  }
 const seats=[...office.seats.values()].map(s=>{
  const floor=floors.get(floorForRow(s.seatRow))!;
  const approach=[[0,1],[0,-1],[1,0],[-1,0]].some(([dc,dr])=>floor.has(key(s.seatCol+dc,s.seatRow+dr)));
  if(!approach)failures.push('Unreachable seat approach: '+s.uid);
  return {id:s.uid,reachableApproach:approach};
 });
 const roles=ROLE_SEATS.map(s=>{
  const seat=office.seats.get(s.seatId);
  if(!seat||seat.seatCol!==s.col||seat.seatRow!==s.row)failures.push('Missing/moved role seat '+s.role);
  return {role:s.role,seat:s.seatId,pathLength:check(s.role+' approach',s.approach.col,s.approach.row)};
 });
 const machines=ACCESS_POINTS.map(p=>({id:p.id,pathLength:check(p.id,p.col,p.row)}));
 const lounge=LOUNGE_POINTS.map((p,i)=>({id:i,pathLength:check('lounge '+i,p.col,p.row)}));
 return {failures,doors,roles,machines,lounge,seats,walkableCount,
  reachableWalkableCount:all.size,
  floorComponents:HQ_FLOORS.map(f=>({floor:f.id,tiles:floors.get(f.id)!.size}))};
}
