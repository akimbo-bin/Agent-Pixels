import {useEffect,useRef,useState} from 'react';
import {CharacterState,TILE_SIZE} from '../office/types.js';
import {OfficeState} from '../office/engine/officeState.js';
import {startGameLoop} from '../office/engine/gameLoop.js';
import {renderFrame} from '../office/engine/renderer.js';
import {loadPixelAssets} from './pixelAssets.js';
import {renderNebulaTelemetry,type NebulaTelemetry} from '../office/observatory/nebulaOverlay.js';
import {ROOMS,ROLE_SEATS,type NebulaRoom,type NebulaCamera,type NebulaBounds} from '../office/layout/nebulaLayouts.js';
import {WorldCamera} from '../office/observatory/camera.js';
import {furnitureProjection} from '../office/observatory/sceneProjection.js';
import {DemoWalks} from '../office/observatory/demoWalks.js';
import {getCatalogEntry} from '../office/layout/furnitureCatalog.js';
export {ROOMS,ROLE_SEATS};
export type {NebulaRoom,NebulaCamera};
export type CameraAgent={id:string;name:string;role?:string;seatId?:string;status?:string|null;activityKind?:'coding'|'research'|'writing'|'meeting'|'idle';characterIndex?:number;room?:NebulaRoom};
export type WorldSelection={kind:'room'|'agent'|'furniture'|'model';id:string;name:string;room?:NebulaRoom};
export type SceneHandle={fit:()=>void;focus:(room:NebulaRoom)=>void;follow:(id:string|null)=>void;inspect:()=>unknown};
export type PixelOfficeCanvasProps={agents:CameraAgent[];camera:'office'|'boardroomKitchen'|'overflowOffice'|NebulaCamera;seedSeated?:boolean;telemetry?:NebulaTelemetry;onSelect?:(selection:WorldSelection)=>void;onReady?:(handle:SceneHandle)=>void;reducedMotion?:boolean};
export function stableNumericId(id:string){let hash=0;for(let i=0;i<id.length;i++)hash=(hash*31+id.charCodeAt(i))|0;return Math.abs(hash)||1;}
export function PixelOfficeCanvas(props:PixelOfficeCanvasProps){
  const canvasRef=useRef<HTMLCanvasElement>(null),wrapRef=useRef<HTMLDivElement>(null);
  const officeRef=useRef<OfficeState|null>(null),latest=useRef(props),view=useRef(new WorldCamera());
  const handleRef=useRef<SceneHandle|null>(null),walksRef=useRef(new DemoWalks()),followRef=useRef<string|null>(null);
  const modeRef=useRef<string|undefined>(undefined);
  const boundsRef=useRef<Record<string,NebulaBounds>>({});
  const [ready,setReady]=useState(false),[error,setError]=useState<string|null>(null);
  latest.current=props;
  const nebulaMode=!['office','boardroomKitchen','overflowOffice'].includes(props.camera);
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
      office.characters.clear();walksRef.current=new DemoWalks();followRef.current=null;
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
        ch.isActive=agent.activityKind!=='idle'&&!!agent.activityKind&&!walksRef.current.travelers.has(id);
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
    view.current.fit(boundsRef.current[props.camera]);followRef.current=null;
  },[props.camera,ready]);
  useEffect(()=>{
    const canvas=canvasRef.current,wrap=wrapRef.current,office=officeRef.current;
    if(!ready||!canvas||!wrap||!office)return;
    const camera=view.current,instanceId=crypto.randomUUID(),frames:number[]=[];
    let lastFrame=performance.now(),artClock=0,artFrame=-1;
    const handle:SceneHandle={fit:()=>{camera.fit();followRef.current=null;},focus:room=>{const r=ROOMS.find(r=>r.key===room);if(r)camera.fit(r.bounds);followRef.current=null;},follow:id=>{followRef.current=id;},inspect:()=>({instanceId,camera:{x:camera.x,y:camera.y,zoom:camera.zoom,width:camera.width,height:camera.height},
      actors:[...office.characters.values()].map(ch=>({id:ch.id,seat:ch.seatId,col:ch.tileCol,row:ch.tileRow,x:ch.x,y:ch.y,path:ch.path.length,state:ch.state})),frameMs:frames.slice(-600),demoTime:walksRef.current.time})};
    handleRef.current=handle;latest.current.onReady?.(handle);
    let firstSize=true;
    const resize=()=>{const r=wrap.getBoundingClientRect(),dpr=devicePixelRatio||1;camera.width=r.width;camera.height=r.height;
      canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);if(firstSize||camera.fitted)camera.fit(boundsRef.current[latest.current.camera]);firstSize=false;};
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
      const actor=[...office.characters.values()].find(ch=>Math.hypot(ch.x-w.x,ch.y-w.y)<13);
      const meta=actor?latest.current.agents.find(a=>stableNumericId(a.id)===actor.id):undefined;
      if(meta){latest.current.onSelect?.({kind:'agent',id:meta.id,name:meta.name,room:meta.room});return;}
      const f=[...office.getLayout().furniture].reverse().find(f=>{const e=getCatalogEntry(f.type);return e&&col>=f.col&&col<f.col+e.footprintW&&row>=f.row&&row<f.row+e.footprintH;});
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
      if(p.telemetry?.mode==='demo'&&!p.reducedMotion)walksRef.current.update(office,dt,new Map(p.agents.map(a=>[a.role??'',stableNumericId(a.id)])));
      for(const ch of office.characters.values()){ch.wanderTimer=999;ch.seatTimer=999;}
      office.update(dt);
      artClock+=dt;
      if(Math.floor(artClock*4)!==artFrame){
        artFrame=Math.floor(artClock*4);
        if(nebulaMode)office.setFurnitureVisuals(furnitureProjection(p.telemetry,p.reducedMotion?0:artFrame%2));
      }
    },render:ctx=>{
      const now=performance.now();frames.push(now-lastFrame);lastFrame=now;if(frames.length>600)frames.shift();
      const p=latest.current,dpr=devicePixelRatio||1,layout=office.getLayout();
      if(followRef.current){const ch=office.characters.get(stableNumericId(followRef.current));if(ch){camera.x=ch.x;camera.y=ch.y;camera.fitted=false;}}
      const zoom=camera.zoom*dpr;
      const {offsetX,offsetY}=renderFrame(ctx,canvas.width,canvas.height,office.tileMap,office.furniture,[...office.characters.values()],zoom,
        (layout.cols*8-camera.x)*zoom,(layout.rows*8-camera.y)*zoom,{selectedAgentId:null,hoveredAgentId:null,hoveredTile:null,seats:office.seats,characters:office.characters},undefined,layout.tileColors,layout.cols,layout.rows);
      if(nebulaMode){
        const bounds=Object.fromEntries(ROOMS.map(r=>[r.key,r.bounds]));
        renderNebulaTelemetry(ctx,bounds as any,p.telemetry,offsetX,offsetY,zoom,p.reducedMotion?0:Date.now());
      }
      ctx.save();ctx.textAlign='center';ctx.font=`${Math.max(9*dpr,5*zoom)}px monospace`;ctx.lineWidth=3*dpr;ctx.strokeStyle='#101827';ctx.fillStyle='#f0e5c8';
      if(camera.zoom>.7)for(const ch of office.characters.values()){
        const a=p.agents.find(a=>stableNumericId(a.id)===ch.id);if(!a)continue;const x=offsetX+ch.x*zoom,y=offsetY+(ch.y+14)*zoom;
        ctx.strokeText(a.name,x,y);ctx.fillText(a.name,x,y);
      }ctx.restore();
    }});
    return()=>{observer.disconnect();stop();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',key);};
  },[ready,nebulaMode]);
  return <div ref={wrapRef} style={{position:'relative',width:'100%',height:nebulaMode?'100%':'min(725px, calc(100vh - 185px))',minHeight:nebulaMode?200:520}}>
    {!ready&&<div role='status'>{error?`Camera failed: ${error}`:'Loading camera...'}</div>}
    <canvas ref={canvasRef} tabIndex={0} aria-label='Connected research headquarters. Drag to pan, wheel to zoom, F to fit, arrows to move.' style={{display:'block',width:'100%',height:'100%',imageRendering:'pixelated',touchAction:'none'}}/>
  </div>;
}
