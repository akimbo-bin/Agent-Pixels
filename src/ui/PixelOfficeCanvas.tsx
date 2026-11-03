import {useEffect,useRef,useState} from 'react';
import {CharacterState,TILE_SIZE} from '../office/types.js';
import {OfficeState} from '../office/engine/officeState.js';
import {startGameLoop} from '../office/engine/gameLoop.js';
import {renderFrame} from '../office/engine/renderer.js';
import {drawDollhouse} from '../office/observatory/dollhouseRenderer.js';
import {fitCamera,roomCameraTarget,floorCameraTarget,roomAt,projectActor,elevatorCabinPose,ROOM_SLOTS,SHAFT,floorAtY} from '../office/observatory/dollhouseProjection.js';
import {loadPixelAssets} from './pixelAssets.js';
import {renderNebulaTelemetry,type NebulaTelemetry} from '../office/observatory/nebulaOverlay.js';
import {ROOMS,ROLE_SEATS,type NebulaRoom,type NebulaCamera,type NebulaBounds} from '../office/layout/nebulaLayouts.js';
import {WorldCamera} from '../office/observatory/camera.js';
import {furnitureProjection} from '../office/observatory/sceneProjection.js';
import {LoungeWalks} from '../office/observatory/loungeWalks.js';
import {DemoWalks} from '../office/observatory/demoWalks.js';
import {ElevatorTransit,HQ_FLOORS,floorForRow,type HQFloor} from '../office/observatory/elevator.js';
import {getCatalogEntry} from '../office/layout/furnitureCatalog.js';
export {ROOMS,ROLE_SEATS,HQ_FLOORS};
export type {HQFloor};
export type {NebulaRoom,NebulaCamera};
export type CameraAgent={id:string;name:string;role?:string;seatId?:string;status?:string|null;activityKind?:'coding'|'research'|'writing'|'meeting'|'idle';characterIndex?:number;room?:NebulaRoom};
export type WorldSelection={kind:'room'|'agent'|'furniture'|'model';id:string;name:string;room?:NebulaRoom};
export type SceneHandle={fit:()=>void;focus:(room:NebulaRoom)=>void;focusFloor:(floor:HQFloor)=>void;travel:(id:string,room:NebulaRoom)=>boolean;ride:(id:string,floor:HQFloor)=>boolean;follow:(id:string|null)=>void;inspect:()=>unknown};
export type PixelOfficeCanvasProps={agents:CameraAgent[];camera:'office'|'boardroomKitchen'|'overflowOffice'|NebulaCamera;seedSeated?:boolean;telemetry?:NebulaTelemetry;onSelect?:(selection:WorldSelection)=>void;onReady?:(handle:SceneHandle)=>void;reducedMotion?:boolean;presentation?:'campus'|'cutaway'};
export function stableNumericId(id:string){let hash=0;for(let i=0;i<id.length;i++)hash=(hash*31+id.charCodeAt(i))|0;return Math.abs(hash)||1;}
export function PixelOfficeCanvas(props:PixelOfficeCanvasProps){
  const canvasRef=useRef<HTMLCanvasElement>(null),wrapRef=useRef<HTMLDivElement>(null);
  const officeRef=useRef<OfficeState|null>(null),latest=useRef(props),view=useRef(new WorldCamera());
  const handleRef=useRef<SceneHandle|null>(null),walksRef=useRef(new DemoWalks()),followRef=useRef<string|null>(null);
  const modeRef=useRef<string|undefined>(undefined),loungeRef=useRef(new LoungeWalks()),elevatorRef=useRef(new ElevatorTransit());
  const boundsRef=useRef<Record<string,NebulaBounds>>({});
  const [ready,setReady]=useState(false),[error,setError]=useState<string|null>(null);
  latest.current=props;
  const nebulaMode=!['office','boardroomKitchen','overflowOffice'].includes(props.camera);
  const cutaway=nebulaMode&&props.presentation==='cutaway';
  useEffect(()=>{
    let cancelled=false;
    void loadPixelAssets().then(({layouts,cameraBounds,nebulaCameraBounds})=>{
      if(cancelled)return;
      boundsRef.current={...cameraBounds,...nebulaCameraBounds};
      officeRef.current=new OfficeState(nebulaMode?layouts.nebula:layouts.combined);setReady(true);
    }).catch(e=>setError(String(e)));
    return()=>{cancelled=true;};
  },[nebulaMode]);
  useEffect(()=>{
    const office=officeRef.current;if(!office||!ready)return;
    const mode=props.telemetry?.mode;
    if(modeRef.current!==undefined&&modeRef.current!==mode){
      // Clear synthetic occupancy immediately at the source boundary.
      for(const ch of office.characters.values())if(ch.seatId){const s=office.seats.get(ch.seatId);if(s)s.assigned=false;}
      office.characters.clear();walksRef.current=new DemoWalks();loungeRef.current=new LoungeWalks();elevatorRef.current.reset();followRef.current=null;
    }
    modeRef.current=mode;
    const incoming=new Set<number>();
    for(const agent of props.agents){
      const mapping=ROLE_SEATS.find(s=>s.role===agent.role);
      if(nebulaMode&&!mapping)continue;
      const id=stableNumericId(agent.id);if(incoming.has(id))continue;incoming.add(id);
      let ch=office.characters.get(id);
      if(!ch){
        const seatId=agent.seatId??mapping?.seatId;
        if(seatId&&office.seats.get(seatId)?.assigned)continue;
        office.addAgent(id,agent.characterIndex,0,seatId,true);ch=office.characters.get(id);
        if(ch&&props.seedSeated&&ch.seatId){const s=office.seats.get(ch.seatId)!;
          ch.tileCol=s.seatCol;ch.tileRow=s.seatRow;ch.x=s.seatCol*16+8;ch.y=s.seatRow*16+8;
          ch.path=[];ch.moveProgress=0;ch.state=CharacterState.IDLE;ch.dir=s.facingDir;ch.matrixEffect=null;
        }
      }
      if(ch){
        // Do not use setAgentActive(false): upstream clears in-progress paths.
        ch.isActive=agent.activityKind!=='idle'&&!!agent.activityKind&&!walksRef.current.travelers.has(id)&&!loungeRef.current.travelers.has(id)&&!elevatorRef.current.has(id);
        ch.currentTool=ch.isActive?(agent.activityKind==='research'?'Read':'Edit'):null;
        if(!ch.isActive&&ch.state===CharacterState.TYPE)ch.state=CharacterState.IDLE;
        ch.wanderTimer=999;ch.seatTimer=999;
      }
    }
    for(const [id,ch] of office.characters)if(!incoming.has(id)){
      if(ch.seatId){const s=office.seats.get(ch.seatId);if(s)s.assigned=false;}office.characters.delete(id);
    }
  },[props.agents,props.telemetry?.mode,props.seedSeated,ready,nebulaMode]);
  useEffect(()=>{
    if(!ready)return;
    if(!cutaway)view.current.fit(boundsRef.current[props.camera]);followRef.current=null;
  },[props.camera,ready,cutaway]);
  useEffect(()=>{
    const canvas=canvasRef.current,wrap=wrapRef.current,office=officeRef.current;
    if(!ready||!canvas||!wrap||!office)return;
    const camera=view.current,instanceId=crypto.randomUUID(),frames:number[]=[];
    let lastFrame=performance.now(),artClock=0,artFrame=-1;
    const beginJourney=(id:string,room?:NebulaRoom,floor?:HQFloor):boolean=>{
      if(!nebulaMode||latest.current.telemetry?.mode!=='demo'||latest.current.reducedMotion)return false;
      const num=stableNumericId(id),ch=office.characters.get(num);
      if(!ch)return false;
      walksRef.current.travelers.delete(num);loungeRef.current.travelers.delete(num);
      ch.isActive=false;ch.wanderTimer=999;ch.seatTimer=999;
      const accepted=room?elevatorRef.current.goToRoom(office,num,room):floor?elevatorRef.current.goToFloor(office,num,floor):false;
      if(accepted)followRef.current=id;
      return accepted;
    };
    const handle:SceneHandle={fit:()=>{if(cutaway){Object.assign(camera,fitCamera(camera.width,camera.height));camera.fitted=true;}else camera.fit();followRef.current=null;},focus:room=>{if(cutaway){Object.assign(camera,roomCameraTarget(room,camera.width,camera.height));camera.fitted=false;}else{const r=ROOMS.find(r=>r.key===room);if(r)camera.fit(r.bounds);}followRef.current=null;},focusFloor:floor=>{if(cutaway){Object.assign(camera,floorCameraTarget(floor,camera.width,camera.height));camera.fitted=false;}else{const f=HQ_FLOORS.find(f=>f.id===floor);if(f)camera.fit(camera.width<680?{col:26,row:f.bounds.row,cols:12,rows:f.bounds.rows}:f.bounds);}followRef.current=null;},travel:(id,room)=>beginJourney(id,room),ride:(id,floor)=>beginJourney(id,undefined,floor),follow:id=>{followRef.current=id;},inspect:()=>({instanceId,presentation:cutaway?'cutaway':'campus',rooms:cutaway?ROOM_SLOTS.map(r=>({key:r.key,x:r.x,y:r.y,w:r.w,h:r.h})):undefined,camera:{x:camera.x,y:camera.y,zoom:camera.zoom,width:camera.width,height:camera.height},
      actors:[...office.characters.values()].map(ch=>({id:ch.id,seat:ch.seatId,col:ch.tileCol,row:ch.tileRow,x:ch.x,y:ch.y,projected:cutaway?projectActor((ch.x-8)/16,(ch.y-8)/16):null,floor:floorForRow(ch.tileRow),riding:elevatorRef.current.isRiding(ch.id),path:ch.path.length,state:ch.state})),elevator:elevatorRef.current.getTrips(),lounge:[...loungeRef.current.travelers.entries()].map(([id,t])=>({id,...t})),visuals:Object.fromEntries([...furnitureProjection(latest.current.telemetry,latest.current.reducedMotion?0:artFrame%4),...elevatorRef.current.getVisuals()]),frameMs:frames.slice(-600),demoTime:walksRef.current.time})};
    handleRef.current=handle;latest.current.onReady?.(handle);
    let firstSize=true;
    const resize=()=>{const r=wrap.getBoundingClientRect(),dpr=devicePixelRatio||1;camera.width=r.width;camera.height=r.height;
      canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);if(firstSize||camera.fitted){if(cutaway){Object.assign(camera,fitCamera(camera.width,camera.height));camera.fitted=true;if(camera.width<650&&firstSize){Object.assign(camera,roomCameraTarget('lead',camera.width,camera.height));camera.y+=140;camera.fitted=false;}}else camera.fit(boundsRef.current[latest.current.camera]);}firstSize=false;};
    resize();const observer=new ResizeObserver(resize);observer.observe(wrap);
    const pointers=new Map<number,{x:number;y:number}>();let moved=0;
    const local=(e:PointerEvent)=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
    const down=(e:PointerEvent)=>{canvas.focus();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,local(e));moved=0;};
    const move=(e:PointerEvent)=>{
      const prev=pointers.get(e.pointerId);if(!prev)return;const p=local(e);followRef.current=null;
      if(pointers.size===2){const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)![1];
        const before=Math.hypot(prev.x-other.x,prev.y-other.y),after=Math.hypot(p.x-other.x,p.y-other.y);
        if(before>0)camera.zoomAt((p.x+other.x)/2,(p.y+other.y)/2,after/before);
      }else camera.pan(p.x-prev.x,p.y-prev.y);
      moved+=Math.abs(p.x-prev.x)+Math.abs(p.y-prev.y);pointers.set(e.pointerId,p);
    };
    const up=(e:PointerEvent)=>{
      const single=pointers.size===1;pointers.delete(e.pointerId);
      if(moved>5||!single||e.type==='pointercancel')return;
      const p=local(e),w=camera.point(p.x,p.y),col=Math.floor(w.x/16),row=Math.floor(w.y/16);
      if(cutaway){
        const actor=[...office.characters.values()].find(ch=>{const pos=projectActor((ch.x-8)/16,(ch.y-8)/16);return Math.hypot(pos.x-w.x,pos.y-19-w.y)<24;});
        const meta=actor?latest.current.agents.find(a=>stableNumericId(a.id)===actor.id):undefined;
        if(meta){latest.current.onSelect?.({kind:'agent',id:meta.id,name:meta.name,room:meta.room});return;}
        if(w.x>=SHAFT.x&&w.x<=SHAFT.x+SHAFT.w){const floor=floorAtY(w.y);if(floor)handle.focusFloor(floor);return;}
        const bay=roomAt(w.x,w.y);if(bay){handle.focus(bay.key);latest.current.onSelect?.({kind:'room',id:ROOMS.find(r=>r.key===bay.key)?.id??bay.key,name:bay.name,room:bay.key});}return;
      }
      const actor=[...office.characters.values()].find(ch=>Math.hypot(ch.x-w.x,ch.y-w.y)<13);
      const meta=actor?latest.current.agents.find(a=>stableNumericId(a.id)===actor.id):undefined;
      if(meta){latest.current.onSelect?.({kind:'agent',id:meta.id,name:meta.name,room:meta.room});return;}
      const f=[...office.getLayout().furniture].reverse().find(f=>{const e=getCatalogEntry(f.type);return e&&e.renderLayer!=='ground'&&e.category!=='wall'&&col>=f.col&&col<f.col+e.footprintW&&row>=f.row&&row<f.row+e.footprintH;});
      const r=ROOMS.find(r=>col>=r.bounds.col&&col<r.bounds.col+r.bounds.cols&&row>=r.bounds.row&&row<r.bounds.row+r.bounds.rows);
      if(f){latest.current.onSelect?.({kind:'furniture',id:f.uid,name:f.uid.replaceAll('-',' '),room:r?.key});return;}
      if(r){handle.focus(r.key);latest.current.onSelect?.({kind:'room',id:r.id,name:r.name,room:r.key});}
    };
    const wheel=(e:WheelEvent)=>{e.preventDefault();const r=canvas.getBoundingClientRect();camera.zoomAt(e.clientX-r.left,e.clientY-r.top,Math.exp(-e.deltaY*.0015));followRef.current=null;};
    const key=(e:KeyboardEvent)=>{let used=true;switch(e.key.toLowerCase()){
      case 'f':handle.fit();break;case '+':case '=':camera.zoomAt(camera.width/2,camera.height/2,1.2);break;case '-':camera.zoomAt(camera.width/2,camera.height/2,1/1.2);break;
      case 'arrowleft':case 'a':camera.pan(45,0);break;case 'arrowright':case 'd':camera.pan(-45,0);break;
      case 'arrowup':case 'w':camera.pan(0,45);break;case 'arrowdown':case 's':camera.pan(0,-45);break;default:used=false;
    }if(used){e.preventDefault();followRef.current=null;}};
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',key);
    const stop=startGameLoop(canvas,{update:dt=>{
      const p=latest.current;
      if(p.telemetry?.mode==='demo'&&p.telemetry?.hqMode!=='cooldown'&&!loungeRef.current.travelers.size&&!p.reducedMotion)walksRef.current.update(office,dt,new Map(p.agents.filter(a=>!elevatorRef.current.has(stableNumericId(a.id))).map(a=>[a.role??'',stableNumericId(a.id)])),elevatorRef.current);
      if(!p.reducedMotion){
        const eligible=new Set(p.telemetry?.loungeIds??[]);
        loungeRef.current.update(office,new Map(p.agents.filter(a=>eligible.has(a.id)&&!elevatorRef.current.has(stableNumericId(a.id))).map(a=>[stableNumericId(a.id),a.role??''])),elevatorRef.current);
      }
      for(const ch of office.characters.values()){ch.wanderTimer=999;ch.seatTimer=999;}
      if(!p.reducedMotion){office.update(dt);elevatorRef.current.update(office,dt);}
      artClock+=dt;
      if(Math.floor(artClock*4)!==artFrame){
        artFrame=Math.floor(artClock*4);
        if(nebulaMode)office.setFurnitureVisuals(new Map([...furnitureProjection(p.telemetry,p.reducedMotion?0:artFrame%4),...elevatorRef.current.getVisuals()]));
      }
    },render:ctx=>{
      const now=performance.now();frames.push(now-lastFrame);lastFrame=now;if(frames.length>600)frames.shift();
      const p=latest.current,dpr=devicePixelRatio||1,layout=office.getLayout();
      if(followRef.current){const ch=office.characters.get(stableNumericId(followRef.current));if(ch){if(cutaway){const cabin=elevatorRef.current.getCabin();const target=cabin.phase==='ride'&&cabin.passengerId===ch.id?elevatorCabinPose(cabin):projectActor((ch.x-8)/16,(ch.y-8)/16);camera.x=target.x;camera.y=target.y;}else{camera.x=ch.x;camera.y=ch.y;}camera.fitted=false;}}
      if(cutaway){drawDollhouse(ctx,canvas.width,canvas.height,office,[...office.characters.values()],{x:camera.x,y:camera.y,zoom:camera.zoom},dpr,elevatorRef.current,new Map(p.agents.map(a=>[stableNumericId(a.id),a.name])));return;}
      const zoom=camera.zoom*dpr;
      const {offsetX,offsetY}=renderFrame(ctx,canvas.width,canvas.height,office.tileMap,office.furniture,[...office.characters.values()].filter(ch=>!elevatorRef.current.isRiding(ch.id)),zoom,
        (layout.cols*8-camera.x)*zoom,(layout.rows*8-camera.y)*zoom,{selectedAgentId:null,hoveredAgentId:null,hoveredTile:null,seats:office.seats,characters:office.characters},undefined,layout.tileColors,layout.cols,layout.rows);
      if(nebulaMode){
        const bounds=Object.fromEntries(ROOMS.map(r=>[r.key,r.bounds]));
        renderNebulaTelemetry(ctx,bounds as any,p.telemetry,offsetX,offsetY,zoom,p.reducedMotion?0:Date.now());
      }
      ctx.save();ctx.textAlign='center';ctx.font=`${Math.max(9*dpr,5*zoom)}px monospace`;ctx.lineWidth=3*dpr;ctx.strokeStyle='#101827';ctx.fillStyle='#f0e5c8';
      if(camera.zoom>.7)for(const ch of office.characters.values()){
        if(elevatorRef.current.isRiding(ch.id)||camera.zoom<2&&loungeRef.current.travelers.has(ch.id)&&!ch.path.length)continue;
        const a=p.agents.find(a=>stableNumericId(a.id)===ch.id);if(!a)continue;const x=offsetX+ch.x*zoom,y=offsetY+(ch.y+14)*zoom;
        ctx.strokeText(a.name,x,y);ctx.fillText(a.name,x,y);
      }ctx.restore();
    }});
    return()=>{observer.disconnect();stop();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',key);};
  },[ready,nebulaMode,cutaway]);
  return <div ref={wrapRef} style={{position:'relative',width:'100%',height:nebulaMode?'100%':'min(725px, calc(100vh - 185px))',minHeight:nebulaMode?200:520}}>
    {!ready&&<div role='status'>{error?`Camera failed: ${error}`:'Loading camera...'}</div>}
    <canvas ref={canvasRef} tabIndex={0} aria-label='Connected research headquarters. Drag to pan, wheel to zoom, F to fit, arrows to move.' style={{display:'block',width:'100%',height:'100%',imageRendering:'pixelated',touchAction:'none'}}/>
  </div>;
}
