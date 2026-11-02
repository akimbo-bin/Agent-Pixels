import type { OfficeLayout, PlacedFurniture, TileType } from '../types.js';
export type NebulaRoom = 'lead' | 'leadSol' | 'observatory' | 'gallery' | 'reception' | 'engineering' | 'data' | 'rendering' | 'clinic' | 'review' | 'training' | 'experiments';
export type NebulaCamera = NebulaRoom | 'overview';
export type NebulaBounds = { col: number; row: number; cols: number; rows: number };
export type NebulaCameraBounds = Record<NebulaCamera, NebulaBounds>;
export type Point = { col: number; row: number };
export type RoomPlan = { id: string; key: NebulaRoom; name: string; bounds: NebulaBounds; doors: Point[][]; hue: number; floor: TileType };
const room = (id: string, key: NebulaRoom, name: string, x: number, y: number, w: number, h: number, dx: number, hue: number, floor: TileType, both = false): RoomPlan => ({
  id, key, name, bounds: { col: x, row: y, cols: w, rows: h }, hue, floor,
  doors: (both ? [y, y + h - 1] : [y === 1 ? y + h - 1 : y]).map(row => [{ col: dx, row }, { col: dx + 1, row }]),
});
// Architecture is independent of decoration, using inclusive handoff bounds.
export const ROOMS: readonly RoomPlan[] = [
  room('R01','lead','Principal office',1,1,17,13,9,37,2),
  room('R02','leadSol','Secondary office',18,1,12,13,23,40,2),
  room('R03','observatory','Nebula Observatory',33,1,20,13,42,252,9),
  room('R04','gallery','Model archive',53,1,10,13,57,280,8),
  room('R05','reception','Clerk reception',1,17,13,14,7,35,2,true),
  room('R06','engineering','Rocket workshop',14,17,16,14,21,25,7,true),
  room('R07','data','Mathematics lab',33,17,16,14,40,191,3,true),
  room('R08','rendering','DawDreamer bay',49,17,14,14,55,273,7,true),
  room('R09','clinic','Research clinic',1,34,13,13,7,160,5),
  room('R10','review','Review bureau',14,34,16,13,21,205,5),
  room('R11','training','Neural computing',33,34,16,13,40,163,7),
  room('R12','experiments','Audio Judge',49,34,14,13,55,178,3),
];
export const ROLE_SEATS = [
  { role:'Lead', room:'lead', col:9, row:7 }, { role:'Lead-Sol', room:'leadSol', col:23, row:7 },
  { role:'Clerk', room:'reception', col:7, row:21 },
  { role:'Engine', room:'engineering', col:17, row:22 },
  { role:'Builder-Luna-P', room:'engineering', col:25, row:22 },
  { role:'Builder-Luna-B', room:'engineering', col:25, row:27 },
  { role:'Data', room:'data', col:36, row:23 }, { role:'Training', room:'training', col:36, row:41 },
  { role:'Reviewer', room:'review', col:17, row:40 },
  { role:'Reviewer-Sol-P', room:'review', col:22, row:40 },
  { role:'Reviewer-Sol-B', room:'review', col:27, row:40 },
  { role:'Doctor', room:'clinic', col:4, row:40 },
].map(s => ({ ...s, room:s.room as NebulaRoom, seatId:`seat-${s.role}`, approach:{col:s.col,row:s.row+1} }));
export const ACCESS_POINTS = [
  {id:'telescope',room:'observatory',col:42,row:11}, {id:'gallery-aisle',room:'gallery',col:57,row:8},
  {id:'filing-counter',room:'reception',col:10,row:26}, {id:'rocket',room:'engineering',col:21,row:26},
  {id:'math-board',room:'data',col:43,row:21}, {id:'render-console',room:'rendering',col:54,row:24}, {id:'render-local-console',room:'rendering',col:58,row:29},
  {id:'clinic-diagnostics',room:'clinic',col:10,row:41}, {id:'review-filing',room:'review',col:22,row:44},
  {id:'gpu-racks',room:'training',col:43,row:39}, {id:'audio-judge',room:'experiments',col:56,row:41},
] as const;
export const LOUNGE_POINTS=[...Array.from({length:9},(_,i)=>({col:50+i,row:43})),{col:52,row:41},{col:53,row:41},{col:57,row:41}];
export const PUBLIC_ROUTES: NebulaBounds[] = [
  {col:1,row:14,cols:62,rows:3}, {col:1,row:31,cols:62,rows:3}, {col:30,row:1,cols:3,rows:47},
];
export function buildNebulaWorld(stage = 0): {layout:OfficeLayout;cameraBounds:NebulaCameraBounds} {
  const cols=64, rows=48;
  const tiles=Array<TileType>(cols*rows).fill(255);
  const tileColors:NonNullable<OfficeLayout['tileColors']>=Array(cols*rows).fill(null);
  const paint=(col:number,row:number,tile:TileType,hue=210,sat=20,brightness=-8)=>{
    tiles[row*cols+col]=tile; tileColors[row*cols+col]={h:hue,s:sat,b:brightness,c:-12};
  };
  const cameraBounds={overview:{col:0,row:0,cols,rows}} as NebulaCameraBounds;
  for(const r of ROOMS){
    const b=r.bounds; cameraBounds[r.key]={...b};
    for(let y=b.row;y<b.row+b.rows;y++)for(let x=b.col;x<b.col+b.cols;x++){
      const wall=x===b.col||x===b.col+b.cols-1||y===b.row||y===b.row+b.rows-1;
      paint(x,y,wall?0:r.floor,r.hue,r.key==='review'?6:23,wall?-58:r.key==='review'?2:-18);
    }
  }
  for(let y=0;y<48;y++)for(const x of [0,63])paint(x,y,0);
  for(let x=0;x<64;x++){paint(x,0,0);paint(x,47,0);}
  for(const b of PUBLIC_ROUTES)for(let y=b.row;y<b.row+b.rows;y++)for(let x=b.col;x<b.col+b.cols;x++)paint(x,y,7,205,16,-18);
  for(const r of ROOMS)for(const door of r.doors)for(const p of door)paint(p.col,p.row,7,38,32,-4);
  const furniture:PlacedFurniture[]=[];
  const prop=(uid:string,type:string,col:number,row:number)=>furniture.push({uid,type,col,row});
  for(const s of ROLE_SEATS){
    const type=s.role==='Lead'?'N_EXECUTIVE':s.role==='Lead-Sol'?'N_SECONDARY':s.role==='Clerk'?'N_CLERK':s.room==='review'?'N_REVIEW':'N_BENCH';
    prop(`desk-${s.role}`,type,s.col-(s.role==='Lead'?3:1),s.row-(s.role==='Lead'?3:2));
    prop(s.seatId,'N_CHAIR',s.col,s.row);
  }
  prop('telescope-foundation',`N_TELESCOPE_${Math.max(0,Math.min(6,Math.floor(stage)))}`,35,2);
  prop('rocket-gantry','N_ROCKET',20,19);
  prop('data-board','N_MATH',43,18);
  prop('render-rack','N_RENDER',51,21);
  prop('render-local','N_RENDER',57,26);
  prop('clinic-cabinet','N_CABINET',9,36);
  prop('clinic-bed','N_BED',8,38);
  prop('filing-cabinet','N_CABINET',10,23);
  prop('audio-judge','N_JUDGE',54,37);
  for(let i=0;i<4;i++)prop(`gpu-${i}`,'N_RACK',39+i*2,36);
  for(let i=0;i<8;i++)prop(`pod-${i}`,'N_POD_EMPTY',i<4?54:60,3+(i%4)*2);
  prop('principal-library','N_LIBRARY',3,3);prop('principal-map','N_STAR_MAP',12,2);
  prop('secondary-library','N_LIBRARY',19,3);prop('secondary-map','N_STAR_MAP',25,2);
  prop('workshop-tools','N_CABINET',16,18);prop('workshop-plans','N_STAR_MAP',25,18);
  prop('data-records','N_CABINET',34,18);prop('data-library','N_LIBRARY',44,26);
  prop('render-spools','N_CABINET',59,19);prop('render-spools-2','N_CABINET',59,23);
  prop('review-files','N_CABINET',16,43);prop('review-files-2','N_CABINET',26,43);
  prop('clinic-chart','N_STAR_MAP',3,35);prop('lab-checkpoints','N_CABINET',43,43);
  prop('experiment-records','N_LIBRARY',58,35);
  ['upcoming','in_progress','review','blocked'].forEach((stage,i)=>prop(`queue-${stage}`,'N_PAPERS_0',2+i*3,27));
  for(const r of ROOMS){
    prop(`${r.id}-plant`,'N_PLANT',r.bounds.col+1,r.bounds.row+r.bounds.rows-3);
    prop(`${r.id}-light`,'N_LAMP',r.bounds.col+r.bounds.cols-2,r.bounds.row+1);
    r.doors.forEach((door,i)=>prop(`${r.id}-door-${i}`,'N_DOOR',door[0].col,door[0].row));
  }
  // Rich wall, ground and light layers never occlude the reserved public routes.
  for(const r of ROOMS){
    const b=r.bounds;
    prop(`${r.id}-rug`,`N_RUG_${r.key==='review'?3:r.key==='lead'||r.key==='reception'?0:r.key==='observatory'?1:2}`,b.col+2,b.row+5);
    prop(`${r.id}-window`,'N_WINDOW',b.col+Math.max(1,b.cols-5),b.row);
    prop(`${r.id}-warm-pool`,`N_GLOW_${['observatory','gallery'].includes(r.key)?2:r.key==='review'?1:0}`,b.col+1,b.row+3);
    prop(`${r.id}-cool-pool`,'N_GLOW_1',b.col+b.cols-7,b.row+6);
    r.doors.forEach((door,i)=>prop(`${r.id}-arch-${i}`,'N_ARCH',door[0].col-1,door[0].row-1));
  }
  prop('lead-wall-library','N_BOOKWALL',2,1);prop('lead-mission','N_MISSION',10,1);
  prop('lead-sofa','N_SOFA',2,9);prop('lead-reading-table','N_TABLE',6,10);prop('lead-armillary','N_GLOBE',14,8);
  prop('lead-sideboard','N_CONSOLE',12,4);prop('lead-planter','N_PLANTER',14,10);
  prop('secondary-mission','N_MISSION',19,1);prop('secondary-sideboard','N_CONSOLE',25,9);prop('secondary-globe','N_GLOBE',19,9);
  prop('clerk-board','N_MISSION',2,17);prop('clerk-record-wall','N_BOOKWALL',2,23);prop('clerk-coffee','N_COFFEE',9,19);
  prop('workshop-toolwall','N_TOOLS',15,17);prop('workshop-crane','N_CRANE',19,18);prop('workshop-turbine','N_TURBINE',16,26);prop('workshop-signal','N_SIGNAL',24,24);prop('workshop-pipe','N_PIPE',18,17);
  prop('data-mission','N_MISSION',34,17);prop('data-core','N_CORE',44,22);prop('data-console','N_CONSOLE',35,26);prop('data-planter','N_PLANTER',46,27);
  prop('render-wall','N_SIGNAL',50,18);prop('render-pipe','N_PIPE',50,17);prop('render-core','N_CORE',58,18);
  prop('clinic-poster','N_POSTER',2,34);prop('clinic-curtain','N_CURTAIN',9,35);prop('clinic-cart','N_MEDCART',6,42);prop('clinic-files','N_BOOKWALL',2,42);
  prop('review-board','N_MISSION',17,34);prop('review-light-1','N_FLUORESCENT',16,36);prop('review-light-2','N_FLUORESCENT',23,36);prop('review-divider','N_DIVIDER',19,43);
  prop('training-core','N_CORE',43,40);prop('training-board','N_SIGNAL',34,34);prop('training-pipe','N_PIPE',39,34);prop('training-console','N_CONSOLE',35,44);
  prop('gallery-cap','N_PIPE',54,1);prop('gallery-cabinet','N_CABINET',54,10);
  // The lower Audio Judge annex is a shared lounge, reached by ordinary walking.
  prop('lounge-sofa-left','N_SOFA',50,44);prop('lounge-sofa-right','N_SOFA',57,44);prop('lounge-coffee','N_COFFEE',59,41);prop('lounge-games','N_GAMES',50,38);
  prop('lounge-rug','N_RUG_0',50,41);prop('lounge-light','N_GLOW_0',54,40);
  return {layout:{version:1,layoutRevision:2,cols,rows,tiles,tileColors,furniture,spawnTile:{col:31,row:46}},cameraBounds};
}
// Legacy plugin import retained; original plugin layouts are never mutated.
export function combineNebulaRooms(_office:OfficeLayout,_boardroom:OfficeLayout){return buildNebulaWorld();}
