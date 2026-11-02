import type { OfficeLayout } from '../types.js';
import { OfficeState } from '../engine/officeState.js';
import { findPath, isWalkable } from './tileMap.js';
import { getCatalogEntry } from './furnitureCatalog.js';
import { ROOMS, ROLE_SEATS, ACCESS_POINTS, PUBLIC_ROUTES } from './nebulaLayouts.js';

/** Validate the decoded production catalog, never an approximation of collisions. */
export function validateCampus(layout: OfficeLayout) {
  const office = new OfficeState(layout), failures:string[]=[];
  const spawn=layout.spawnTile!;
  const key=(c:number,r:number)=>`${c},${r}`;
  const reachable=new Set<string>();
  const queue=spawn?[spawn]:[];
  if(spawn&&isWalkable(spawn.col,spawn.row,office.tileMap,office.blockedTiles))reachable.add(key(spawn.col,spawn.row));
  for(let i=0;i<queue.length&&reachable.size;i++)for(const [dc,dr] of [[0,1],[0,-1],[1,0],[-1,0]]){
    const p={col:queue[i].col+dc,row:queue[i].row+dr},k=key(p.col,p.row);
    if(!reachable.has(k)&&isWalkable(p.col,p.row,office.tileMap,office.blockedTiles)){reachable.add(k);queue.push(p);}
  }
  const check=(id:string,col:number,row:number)=>{
    const path=spawn?findPath(spawn.col,spawn.row,col,row,office.tileMap,office.blockedTiles):[];
    if(!reachable.has(key(col,row))||(!path.length&&(col!==spawn?.col||row!==spawn?.row)))failures.push(`Unreachable ${id} at ${col},${row}`);
    return path.length;
  };
  if(layout.cols!==64||layout.rows!==48||layout.tiles.length!==3072)failures.push('Expected 64x48 campus');
  if(layout.tileColors?.length!==layout.tiles.length)failures.push('Invalid tile colors');
  if(new Set(layout.furniture.map(f=>f.uid)).size!==layout.furniture.length)failures.push('Duplicate furniture UID');
  for(const f of layout.furniture){
    const e=getCatalogEntry(f.type);
    if(!e)failures.push(`Unknown furniture ${f.type}`);
    else if(f.col<0||f.row<0||f.col+e.footprintW>layout.cols||f.row+e.footprintH>layout.rows)failures.push(`Furniture out of bounds: ${f.uid}`);
  }
  const doors=ROOMS.flatMap(r=>r.doors.map((door,i)=>{
    if(door.length<2||Math.abs(door[0].col-door[1].col)+Math.abs(door[0].row-door[1].row)!==1)failures.push(`Narrow door ${r.id}`);
    for(const p of door){
      check(`${r.id} door ${i}`,p.col,p.row);
      // Both sides of the threshold must connect, with two-wide clearance.
      check(`${r.id} door ${i} north`,p.col,p.row-1);
      check(`${r.id} door ${i} south`,p.col,p.row+1);
    }
    return {room:r.id,door:i,cells:door};
  }));
  for(const b of PUBLIC_ROUTES)for(let row=b.row;row<b.row+b.rows;row++)for(let col=b.col;col<b.col+b.cols;col++){
    if(!reachable.has(key(col,row)))failures.push(`Blocked public route ${col},${row}`);
  }
  const seats=[...office.seats.values()].map(s=>{
    const approach=[[0,1],[0,-1],[1,0],[-1,0]].some(([dc,dr])=>reachable.has(key(s.seatCol+dc,s.seatRow+dr)));
    if(!approach)failures.push(`Unreachable seat approach: ${s.uid}`);
    return {id:s.uid,reachableApproach:approach};
  });
  const roles=ROLE_SEATS.map(s=>{
    const seat=office.seats.get(s.seatId);
    if(!seat||seat.seatCol!==s.col||seat.seatRow!==s.row)failures.push(`Missing/moved role seat ${s.role}`);
    return {role:s.role,seat:s.seatId,pathLength:check(`${s.role} approach`,s.approach.col,s.approach.row)};
  });
  const machines=ACCESS_POINTS.map(p=>({id:p.id,pathLength:check(p.id,p.col,p.row)}));
  if(reachable.size!==office.walkableTiles.length)failures.push(`${office.walkableTiles.length-reachable.size} disconnected walk tiles`);
  return {failures,doors,roles,machines,seats,walkableCount:office.walkableTiles.length,reachableWalkableCount:reachable.size};
}
