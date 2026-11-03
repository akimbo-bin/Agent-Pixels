import { TileType } from '../types.js';

/** Check if a tile is walkable (floor, carpet, or doorway, and not blocked by furniture) */
export function isWalkable(
  col: number,
  row: number,
  tileMap: TileType[][],
  blockedTiles: Set<string>,
): boolean {
  const rows = tileMap.length;
  const cols = rows > 0 ? tileMap[0].length : 0;
  if (row < 0 || row >= rows || col < 0 || col >= cols) return false;
  const t = tileMap[row][col];
  if (t === TileType.WALL || t === TileType.VOID) return false;
  if (blockedTiles.has(`${col},${row}`)) return false;
  return true;
}

/** Get walkable tile positions (grid coords) for wandering */
export function getWalkableTiles(
  tileMap: TileType[][],
  blockedTiles: Set<string>,
): Array<{ col: number; row: number }> {
  const rows = tileMap.length;
  const cols = rows > 0 ? tileMap[0].length : 0;
  const tiles: Array<{ col: number; row: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isWalkable(c, r, tileMap, blockedTiles)) {
        tiles.push({ col: c, row: r });
      }
    }
  }
  return tiles;
}

/**
 * Eight-connected shortest-path A* with octile distance and strict corner
 * clearance. Physical diagonals are possible only when BOTH adjacent side
 * tiles are walkable, so characters cannot cut across furniture or walls.
 *
 * Source interface and return contract remain unchanged: the path excludes
 * the starting tile and contains the destination tile.
 */
export function findPath(
 startCol:number,startRow:number,endCol:number,endRow:number,
 tileMap:TileType[][],blockedTiles:Set<string>,
):Array<{col:number;row:number}>{
 if(startCol===endCol&&startRow===endRow)return [];
 const rows=tileMap.length,cols=rows?tileMap[0].length:0;
 if(!cols||startCol<0||startCol>=cols||startRow<0||startRow>=rows||
    !isWalkable(endCol,endRow,tileMap,blockedTiles))return [];
 const toId=(c:number,r:number)=>r*cols+c;
 const fromId=(id:number)=>({col:id%cols,row:Math.floor(id/cols)});
 const start=toId(startCol,startRow),end=toId(endCol,endRow);
 const size=rows*cols;
 const best=new Float64Array(size);best.fill(Infinity);best[start]=0;
 const parent=new Int32Array(size);parent.fill(-1);
 const closed=new Uint8Array(size);
 type Node={id:number;f:number;g:number};
 const heap:Node[]=[];
 const push=(n:Node)=>{
  let i=heap.length;heap.push(n);
  while(i>0){
   const parentIndex=(i-1)>>1;
   if(heap[parentIndex].f<=n.f)break;
   heap[i]=heap[parentIndex];i=parentIndex;
  }
  heap[i]=n;
 };
 const pop=():Node=>{
  const first=heap[0],tail=heap.pop()!;
  if(heap.length){
   let i=0;
   while(true){
    const left=i*2+1;
    if(left>=heap.length)break;
    const right=left+1;
    const child=right<heap.length&&heap[right].f<heap[left].f?right:left;
    if(tail.f<=heap[child].f)break;
    heap[i]=heap[child];i=child;
   }
   heap[i]=tail;
  }
  return first;
 };
 const heuristic=(col:number,row:number)=>{
  const dx=Math.abs(endCol-col),dy=Math.abs(endRow-row);
  return Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy);
 };
 const neighbors=[
  [0,-1],[0,1],[-1,0],[1,0],
  [-1,-1],[1,-1],[-1,1],[1,1],
 ] as const;
 push({id:start,f:heuristic(startCol,startRow),g:0});
 while(heap.length){
  const current=pop(),id=current.id;
  if(closed[id]||current.g>best[id]+1e-8)continue;
  if(id===end){
   const path:Array<{col:number;row:number}>=[];
   let cursor=end;
   while(cursor!==start&&cursor>=0){
    path.push(fromId(cursor));cursor=parent[cursor];
   }
   return cursor===start?path.reverse():[];
  }
  closed[id]=1;
  const col=id%cols,row=Math.floor(id/cols);
  for(const [dc,dr]of neighbors){
   const nc=col+dc,nr=row+dr;
   if(!isWalkable(nc,nr,tileMap,blockedTiles))continue;
   // No slipping through the inaccessible diagonal corner between two desks.
   if(dc&&dr&&(!isWalkable(col+dc,row,tileMap,blockedTiles)||
              !isWalkable(col,row+dr,tileMap,blockedTiles)))continue;
   const next=toId(nc,nr);
   if(closed[next])continue;
   const ng=best[id]+(dc&&dr?Math.SQRT2:1);
   if(ng+1e-8>=best[next])continue;
   best[next]=ng;parent[next]=id;
   push({id:next,g:ng,f:ng+heuristic(nc,nr)});
  }
 }
 return [];
}
