// Room-specific visual languages. Numerical telemetry is supplied by ScreenPrograms.
const RoomDisplays=(()=>{
 const textures=new Map(),boards=new Map();
 function boardPhase(time){const hold=20,erase=2,write=4,cycle=hold+erase+write,page=Math.floor(time/cycle),local=time%cycle;return{page,phase:local<hold?'hold':local<hold+erase?'erase':'write',progress:local<hold?0:local<hold+erase?(local-hold)/erase:(local-hold-erase)/write};}
 function boardTime(id,time,active){if(!id)return time;let b=boards.get(id);if(!b||time<b.last){b={last:time,elapsed:0,active};boards.set(id,b);}b.elapsed+=Math.max(0,Math.min(2,time-b.last))*(b.active?2:1);b.last=time;b.active=active;return b.elapsed;}
 function material(type,w,h){const key=type+':'+w+':'+h;if(textures.has(key))return textures.get(key);const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=type==='chalk'?'#173c30':'#234d78';g.fillRect(0,0,w,h);let seed=17;for(let i=0;i<1800;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%w;seed=(seed*1664525+1013904223)>>>0;const y=seed%h;g.globalAlpha=.015+(i%4)*.008;g.fillStyle=i%3?'#f2ecd5':'#041a21';g.fillRect(x,y,1+(i%3),1);}g.globalAlpha=1;textures.set(key,c);return c;}
 function paint(o,g,w,h,time,active){const {profile,room,variant=0,model:m,kind='indicator'}=o,small=kind==='indicator';
  const supported=['engineering','blueprint','math','audio','work','health','blockers','reviews','admin','inbox','stars','code','matrix'];if(!supported.includes(profile))return false;
  if(h<150){const d=Math.max(1,g.getTransform().a),c=document.createElement('canvas');c.width=Math.ceil(w*d);c.height=Math.ceil(150*d);const cg=c.getContext('2d');cg.scale(d,d);paint(o,cg,w,150,time,active);g.drawImage(c,0,0,w,h);return true;}
  const t=time*(active?1:.18)+variant*.7;
  g.save();g.fillStyle='#121825';g.fillRect(0,0,w,h);
  const fill=(x,y,W,H,c,a=1)=>{g.globalAlpha=a;g.fillStyle=c;g.fillRect(x,y,W,H);g.globalAlpha=1;};
  const line=(x,y,X,Y,c='#e6ebf0',width=1,a=1)=>{g.strokeStyle=c;g.lineWidth=width;g.globalAlpha=a;g.beginPath();g.moveTo(x,y);g.lineTo(X,Y);g.stroke();g.globalAlpha=1;};
  const text=(str,x,y,size=14,c='#e6ebf0',max=w-x-8,font='monospace')=>{g.fillStyle=c;g.font=`${size>=24?'600 ':''}${size}px ${font}`;let v=String(str??'');while(v.length&&g.measureText(v).width>max)v=v.slice(0,-1);g.fillText(v,x,y);};
  const circle=(x,y,r,c,width=1,a=1)=>{g.globalAlpha=a;g.lineWidth=width;g.strokeStyle=c;g.beginPath();g.arc(x,y,Math.max(1,r),0,7);g.stroke();g.globalAlpha=1;};
  const dot=(x,y,r,c,a=1)=>{g.globalAlpha=a;g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.globalAlpha=1;};
  const wave=(x,y,W,H,c,phase=t)=>{g.strokeStyle=c;g.lineWidth=small?3:1.5;g.beginPath();for(let i=0;i<=W;i+=2){const u=i/W,Y=y+H/2+(Math.sin(u*24+phase)*.27+Math.sin(u*61-phase)*.1)*H;i?g.lineTo(x+i,Y):g.moveTo(x+i,Y);}g.stroke();};
  const done=()=>{if(small){const gloss=g.createLinearGradient(0,0,w,h);gloss.addColorStop(0,'#ffffff10');gloss.addColorStop(.42,'#ffffff00');gloss.addColorStop(.52,'#ffffff0b');gloss.addColorStop(.72,'#ffffff00');g.fillStyle=gloss;g.fillRect(0,0,w,h);dot(w-8,h-8,2,'#b8ccc2',.65+.25*Math.sin(t*1.7));}g.restore();return true;};
  const teeth=(x,y,r,c)=>{circle(x,y,r,c,2);circle(x,y,r*.76,c,1);circle(x,y,r*.25,c,2);for(let i=0;i<16;i++){const a=i*Math.PI/8;line(x+Math.cos(a)*r*.3,y+Math.sin(a)*r*.3,x+Math.cos(a+.22)*r*.7,y+Math.sin(a+.22)*r*.7,c,1.5);}};
  const rocket=(x,y,W,H,c)=>{g.save();g.translate(x,y);g.scale(W/80,H/120);g.strokeStyle=c;g.lineWidth=1.6;g.beginPath();g.moveTo(40,3);g.bezierCurveTo(19,25,25,64,25,92);g.lineTo(55,92);g.bezierCurveTo(55,64,61,25,40,3);g.moveTo(25,63);g.lineTo(10,99);g.lineTo(25,89);g.moveTo(55,63);g.lineTo(70,99);g.lineTo(55,89);g.moveTo(31,93);g.lineTo(27,107);g.lineTo(53,107);g.lineTo(49,93);g.stroke();for(let i=0;i<5;i++)line(28,49+i*9,52,49+i*9,c,1);circle(40,31,7,c,1.5);line(40,-2,40,116,c,.7,.55);g.restore();};
  if(profile==='engineering'||profile==='blueprint'){
   const paper='#e5eadb';g.drawImage(material('blueprint',w,h),0,0,w,h);g.strokeStyle=paper;g.lineWidth=1.2;g.strokeRect(7,7,w-14,h-14);g.strokeRect(12,12,w-24,h-24);
   // Cyanotype drafting sheet: dimension lines, orthographic views and ruled title block.
   const mode=small?variant%4:1,titleH=small?35:46,base=h-titleH-14;
   for(let x=22;x<w-20;x+=24)line(x,17,x,base,paper,.4,.12);for(let y=22;y<base;y+=24)line(17,y,w-17,y,paper,.4,.12);
   if(mode===0){teeth(w*.38,base*.52+6,Math.min(51,base*.38),paper);g.strokeStyle=paper;g.strokeRect(w*.69,30,w*.21,base-47);for(let i=0;i<7;i++)line(w*.72,37+i*11,w*.86,37+i*11,paper,.8);line(24,base-8,w*.61,base-8,paper);line(24,base-13,24,base-3,paper);line(w*.61,base-13,w*.61,base-3,paper);}
   else if(mode===1){rocket(24,20,94,base-28,paper);rocket(155,28,51,base-38,paper);teeth(w-50,base*.5,Math.min(26,base*.22),paper);line(22,18,22,base-4,paper,.7);for(let i=0;i<5;i++){const Y=26+i*(base-38)/4;line(18,Y,25,Y,paper);line(102,Y,133,Y,paper,.6,.6);}}
   else if(mode===2){g.strokeStyle=paper;g.lineWidth=1.7;g.beginPath();g.moveTo(29,base*.3);g.lineTo(w*.52,base*.3);g.lineTo(w*.76,base*.12);g.lineTo(w*.86,base*.12);g.lineTo(w*.86,base*.85);g.lineTo(w*.76,base*.85);g.lineTo(w*.52,base*.68);g.lineTo(29,base*.68);g.closePath();g.stroke();for(let x=43;x<w*.5;x+=13)line(x,base*.33,x-9,base*.65,paper,.8);line(18,base*.49,w-18,base*.49,paper,.7,.6);}
   else{for(let i=0;i<3;i++){const X=28+i*99;g.strokeStyle=paper;g.strokeRect(X,30,63,39);g.strokeRect(X,88,63,31);line(X+31,69,X+31,88,paper,2);if(i<2)line(X+63,49,X+99,49,paper,2);circle(X+31,49,10,paper);}}
   line(12,base+2,w-12,base+2,paper,1.5);line(w*.61,base+2,w*.61,h-12,paper);line(w*.61,base+titleH*.48,w-12,base+titleH*.48,paper);
   text(['TURBINE SECTION','VEHICLE / THREE VIEW','NOZZLE SECTION','CONTROL SCHEMATIC'][mode],18,base+17,small?14:16,paper,w*.57);
   text(m?(m.value+' / '+m.status.toUpperCase()):'NEBULA / ENGINEERING',18,h-18,small?10:12,paper,w*.57);
   text('DWG '+String(mode+1).padStart(2,'0'),w*.64,base+16,11,paper);text('REV A / '+(active?'IN WORK':'REFERENCE'),w*.64,h-17,9,paper);
   // Working changes annotation stamps, never spins the printed drawing itself.
   return done();
  }
  if(profile==='math'){
   const state=boardPhase(boardTime(o.id,time,active)),ivory='#e4e5cd',yellow='#dbd19b',page=state.page+(state.phase==='write'?1:0),H=h-28;
   g.drawImage(material('chalk',w,h),0,0,w,h);
   const chalk=(str,x,y,size=17,c=ivory)=>{g.fillStyle=c;g.font=`${size}px "Segoe Print", "Comic Sans MS", cursive`;g.globalAlpha=.9;g.fillText(str,x,y);g.globalAlpha=1;};
   const content=()=>{chalk(['Fourier & convolution','Gradient descent','Discrete signals'][page%3],16,26,21);line(16,34,w-24,33,ivory,1,.6);const equations=[['F(ω) = ∫ f(t)e⁻ⁱωᵗ dt','y[n] = Σ h[k] x[n−k]'],['θ ← θ − η∇L(θ)','∇L = E[∂L / ∂θ]'],['X[k] = Σ x[n]e⁻ⁱ²πkn/N','S(ω) = |F(ω)|²']][page%3];chalk(equations[0],17,61,17);chalk(equations[1],23,88,17,yellow);
    const Y=112,hh=Math.max(18,h-144),X=20,W=w*.48;line(X,Y+hh/2,X+W,Y+hh/2,ivory,1,.65);line(X,Y-2,X,Y+hh,ivory,1,.65);wave(X+2,Y,W-5,hh,ivory,page*.8);const xx=w*.65;line(xx,Y+hh, w-20,Y+hh,ivory,1,.65);for(let i=0;i<10;i++){const bar=(.15+.7*Math.sin(i*.42+page)**2)*hh;line(xx+i*8,Y+hh,xx+i*8,Y+hh-bar,yellow,3,.8);}chalk('signal',X,Y+hh+16,11);chalk('transform',xx,Y+hh+16,11);};
   // Erase in three physical passes, then write each strip from left to right.
   if(state.phase==='hold')content();else{g.save();g.beginPath();const strips=4,step=state.progress*strips;for(let i=0;i<strips;i++){const fraction=Math.max(0,Math.min(1,step-i)),y=i*H/strips,W=state.phase==='erase'?w*(1-fraction):w*fraction;g.rect(state.phase==='erase'?w-W:0,y,W,H/strips);}g.clip();content();g.restore();const row=Math.min(3,Math.floor(step)),x=(step-row)*w,y=row*H/4+H/8;if(state.phase==='erase'){fill(x-15,y-8,30,16,'#b69e76');fill(x-13,y+4,26,5,'#536450');for(let i=0;i<13;i++)dot(x-18-i*2,y+9+(i*7%11),.8,ivory,.08);}else dot(x,y+3,2,ivory,.9);}
   fill(4,h-7,w-8,5,'#31483a');fill(w-54,h-10,22,3,ivory,.8);fill(w-27,h-10,13,3,yellow,.75);return done();
  }
  if(profile==='audio'){
   const lanes=4,top=27,tracksH=Math.max(47,h*.43),left=39,anY=top+tracksH+5,bottom=h-anY-18;
   fill(0,0,w,h,'#24252c');fill(0,0,w,22,'#373942');fill(8,6,10,10,active?'#87dcb7':'#a7aab0');text(m?.status?.toUpperCase()||'AUDIO',24,16,11,'#e8e8eb',90);text(m?.fraction!=null?m.value:m?.value==='STANDBY'?'STOP':m?.fresh?'IDLE':'NO FEED',w-95,17,15,'#e5e1ea',86);
   fill(0,top,left,tracksH,'#30323a');const colors=['#b789d5','#6cbdc5','#d5a977','#8ba4d5'];
   for(let row=0;row<lanes;row++){const y=top+row*tracksH/lanes,H=tracksH/lanes;fill(left,y,w-left,H-1,row%2?'#22252b':'#292c34');text(['KEYS','BASS','PAD','DRUM'][row],4,y+H*.65,8,'#c7c9d0',34);for(let beat=0;beat<7;beat++){const X=left+beat*(w-left)/7;line(X,y,X,y+H,'#4d505b',.7);if((beat+row)%4===3)continue;fill(X+2,y+2,(w-left)/7-5,H-5,colors[row],.72);for(let k=0;k<7;k++){const a=Math.sin(k*2+row+beat)*.3;line(X+5+k*3,y+H/2-a*H,X+5+k*3,y+H/2+a*H,'#edf0ed',.7,.55);}}}
   if(m?.waveform?.length>1){g.strokeStyle='#eff0eb';g.lineWidth=1;g.beginPath();m.waveform.forEach((v,i)=>{const X=left+i/(m.waveform.length-1)*(w-left),Y=top+tracksH/lanes/2+v*(tracksH/lanes/2-2);i?g.lineTo(X,Y):g.moveTo(X,Y);});g.stroke();}const play=left+((active?time*.13:variant*.17)%1)*(w-left);line(play,top,play,top+tracksH,'#f1f1e6',1.2,.9);
   // Piano roll and mixer strips make the display read as a DAW, not a generic graph.
   fill(4,anY,w*.43,bottom,'#171b22');for(let i=0;i<8;i++){const Y=anY+i*bottom/8;fill(5,Y,12,bottom/8-1,i%3===1?'#6a6d74':'#c6c9c8');line(19,Y,w*.43,Y,'#424852',.6);fill(25+(i*31)%80,Y+1,14+(i*7)%29,Math.max(2,bottom/8-2),colors[i%4],.85);}
   const x=w*.46,W=w*.4;fill(x,anY,W,bottom,'#111820');for(let i=0;i<4;i++)line(x,anY+i*bottom/4,x+W,anY+i*bottom/4,'#45515b',.6,.6);
   const bins=m?.spectrum?.length?m.spectrum:Array.from({length:48},(_,i)=>(.08+.45*Math.abs(Math.sin(i*1.7+t*.6))+.4*Math.exp(-Math.pow((i-13)/6,2)))*Math.exp(-i/55));g.strokeStyle='#80c5bb';g.lineWidth=1.7;g.beginPath();bins.forEach((v,i)=>{const X=x+(bins.length<2?.5:i/(bins.length-1))*W,Y=anY+bottom-3-Math.max(0,v)*(bottom-7);i?g.lineTo(X,Y):g.moveTo(X,Y);});g.stroke();g.lineTo(x+W,anY+bottom-2);g.lineTo(x,anY+bottom-2);g.closePath();g.fillStyle='#80c5bb20';g.fill();for(let i=1;i<5;i++)line(x+W*Math.log10(1+i*2)/Math.log10(11),anY,x+W*Math.log10(1+i*2)/Math.log10(11),anY+bottom,'#45515b',.5,.5);
   for(let i=0;i<3;i++){const X=w*.9+i*9;fill(X,anY,5,bottom,'#151a20');const v=(active?.55:.12)+(active?.25:.1)*Math.sin(t+i)**2;fill(X,anY+bottom*(1-v),5,bottom*v,'#8bc995');fill(X,anY+bottom*(1-v),5,2,'#efc780');}
   text(m?.spectrum?.length?'DEMO SESSION / LIVE SPECTRUM':m?.waveform?.length?'DEMO SESSION / LIVE WAVEFORM':'DEMO SESSION / VISUALIZER',5,h-5,8,'#b9b9c6',w*.6);text(m?.lines?.[1]||'Samples —',w*.61,h-5,8,'#b9b9c6');return done();
  }
  if(['work','health','blockers','reviews'].includes(profile)){
   const c={work:'#ed9baf',health:'#8bd8e2',blockers:'#ebc18b',reviews:'#c6aaeb'}[profile],compact=h<190;
   fill(0,0,w,h,'#121722');fill(0,0,6,h,c);text(m.title,17,compact?28:33,compact?23:25,c);line(17,compact?38:46,w-16,compact?38:46,c,1,.35);
   text(m.value,16,compact?88:119,compact?52:74,'#f2f3f3',w-24);text(m.fresh?m.status.toUpperCase():'NO LIVE FEED',18,compact?108:145,compact?12:14,c,w-33);
   const top=compact?128:168,pitch=compact?18:24,rows=Math.max(0,Math.floor((h-25-top)/pitch)+1),offset=m.lines.length>rows&&rows>0?Math.floor(t/8)*rows%m.lines.length:0;
   for(let i=0;i<rows&&m.lines[offset+i];i++){const y=top+i*pitch;fill(17,y-12,4,12,c);text(m.lines[offset+i],29,y,compact?12:14,'#d3d9e2',w-45);}
   text(m.note,17,h-5,8,'#98a4b5',w-30);for(let i=0;i<3;i++)dot(w-18-i*12,compact?34:40,2,c,.25+.6*Math.sin(t*(active?3:1)+i)**2);return done();
  }
  // Small screens: strong silhouettes, with different layouts within a room.
  if(profile==='admin'){
   const v=(variant+(room==='second'?2:0))%4;fill(0,0,w,h,v<2?'#e0dac6':'#142831');const ink=v<2?'#28423f':'#cfc6a1';fill(0,0,w,23,v<2?'#304b48':'#c0aa75');
   if(v===0){for(let i=0;i<6;i++){const H=(.2+.6*Math.sin(i+t*.15)**2)*(h-53);fill(20+i*48,h-15-H,28,H,i%2?'#617e71':'#b09768');}line(15,h-13,w-12,h-13,ink,2);}
   else if(v===1){circle(89,h*.53,Math.min(49,h*.3),ink,13);g.strokeStyle='#b28d57';g.lineWidth=13;g.beginPath();g.arc(89,h*.53,Math.min(49,h*.3),-1.5,2+Math.sin(t*.2)*.1);g.stroke();for(let i=0;i<4;i++)fill(177,42+i*28,110-i*15,8,ink,.7);}
   else if(v===2){for(let i=0;i<3;i++){fill(14+i*102,38,90,h-52,'#a8bda7',.13);for(let j=0;j<4;j++)fill(23+i*102,51+j*26,55+(j%2)*14,6,ink,.7);} }
   else{wave(19,37,w-38,h*.48,'#c4b685',t*.3);for(let i=0;i<5;i++)fill(20+i*58,h-42,40,23,'#708f86',.65);}return done();
  }
  if(profile==='inbox'){
   fill(0,0,w,h,'#e4e1d6');fill(0,0,53,h,'#485c70');fill(55,0,w-55,24,'#b6c4cd');for(let i=0;i<5;i++)fill(12,25+i*28,29,9,'#d6dce0',i===Math.floor(t/3)%5?1:.35);
   if(variant%2===0){for(let i=0;i<5;i++){const y=32+i*(h-40)/5;fill(62,y,w-71,(h-40)/5-3,i===Math.floor(t)%5?'#bfcfd8':'#f0ede4');g.strokeStyle='#647b89';g.lineWidth=2;g.strokeRect(70,y+5,20,13);line(70,y+5,80,y+12,'#647b89');line(80,y+12,90,y+5,'#647b89');fill(100,y+6,150-i*13,4,'#6c7981');}}
   else{for(let x=62;x<w;x+=47)line(x,31,x,h-9,'#a8b0b4');for(let y=31;y<h;y+=30)line(62,y,w-9,y,'#a8b0b4');for(let i=0;i<12;i++)fill(65+i%5*47,36+Math.floor(i/5)*30,37,18,['#9cbaa7','#a6b7cf','#c5b494'][i%3],.85);}return done();
  }
  if(profile==='stars'){
   fill(0,0,w,h,'#111b30');const v=variant%4;
   if(v===0){for(let i=0;i<34;i++){const x=14+(i*71)%(w-28),y=14+(i*43)%(h-28);dot(x,y,i%5===0?2.9:1.2,'#e8dfc9',.5+.4*Math.sin(t+i)**2);if(i<9)line(x,y,14+((i+1)*71)%(w-28),14+((i+1)*43)%(h-28),'#b4bfd0',1,.7);}circle(w/2,h/2,Math.min(67,h*.42),'#a6b6c4',1,.45);}
   else if(v===1){for(let i=0;i<3;i++){g.save();g.translate(w/2,h/2);g.rotate(i*Math.PI/3+t*.1);g.scale(1,.35);circle(0,0,Math.min(80,h*.4),'#be9cdb',3);dot(Math.cos(t+i)*65,Math.sin(t+i)*65,6,'#e9d8b4');g.restore();}dot(w/2,h/2,9,'#d4c5f0');}
   else if(v===2){const r=Math.min(58,h*.33);circle(w/2,h/2,r,'#b3d0d3',2);circle(w/2,h/2,r*.55,'#6f909d',1);line(20,h/2,w-20,h/2,'#b3d0d3',1);line(w/2,12,w/2,h-12,'#b3d0d3',1);dot(w/2+Math.cos(t*.4)*r*.7,h/2+Math.sin(t*.4)*r*.6,5,'#dbd3b1');}
   else{for(let i=0;i<28;i++){const X=16+i*10,c=['#897ab3','#7399ce','#76b8b1','#c9b771','#c28c82'][Math.floor(i/6)%5];line(X,20+(i*13)%35,X,h-20-(i*7)%28,c,2+i%3,.8);}wave(17,25,w-34,h-50,'#e7e1d0',t*.25);}return done();
  }
  if(profile==='code'){
   const v=variant%8;
   if(v===0){fill(0,0,w,h,'#111e1b');for(let i=0;i<8;i++){const y=18+i*21;fill(12+(i%3)*12,y,42+(i*29)%105,5,i%3?'#83b69a':'#d3c395',.5+((i+Math.floor(t))%4)*.12);fill(165,y,35+(i*19)%90,5,'#83b69a',.5);}}
   else if(v===1){fill(0,0,w,h,'#142b28');for(let x=12;x<w;x+=24)line(x,8,x,h-9,'#547567',.8,.3);for(let y=12;y<h;y+=24)line(8,y,w-9,y,'#547567',.8,.3);wave(10,20,w-20,h-40,'#b7d1a7',t*.8);}
   else if(v===2){fill(0,0,w,h,'#ddd8c6');text('Σ h[k] x[n-k]',18,40,25,'#3c5948');for(let i=0;i<5;i++){fill(20,66+i*22,26+(i*41)%145,5,'#6d7a64');circle(w-56,92,32,'#956e4b',2);line(w-83,92,w-29,92,'#956e4b');}}
   else if(v===3){fill(0,0,w,h,'#171e25');for(let x=0;x<10;x++)for(let y=0;y<6;y++)fill(15+x*29,12+y*(h-25)/6,24,(h-25)/6-4,['#294447','#47766e','#8aab8a','#d6c88e'][(x+y+Math.floor(t*.35))%4]);}
   else if(v===4){fill(0,0,w,h,'#241d16');for(let i=0;i<7;i++){fill(15,18+i*23,25+(i*37)%141,5,'#d2b581',.5+.3*Math.sin(t+i)**2);}line(211,10,211,h-10,'#887559');wave(221,18,86,h-36,'#d2b581',t*.5);}
   else if(v===5){fill(0,0,w,h,'#162725');line(15,h/2,w-15,h/2,'#688b78');line(w/2,12,w/2,h-12,'#688b78');g.strokeStyle='#b9c7a3';g.lineWidth=3;g.beginPath();for(let i=0;i<=160;i++){const a=i/160*Math.PI*2,X=w/2+Math.sin(a*3+t*.2)*w*.4,Y=h/2+Math.sin(a*2)*h*.38;i?g.lineTo(X,Y):g.moveTo(X,Y);}g.stroke();}
   else if(v===6){fill(0,0,w,h,'#dcd9ca');text('A x = b',18,39,27,'#405b4a');for(let x=0;x<3;x++)for(let y=0;y<3;y++)text(String((x*3+y+1)%7),25+x*31,75+y*28,20,'#405b4a');line(17,51,17,h-15,'#947e62',2);line(117,51,117,h-15,'#947e62',2);circle(w-72,h*.57,40,'#947e62',2);line(w-112,h*.57,w-32,h*.57,'#947e62');}
   else{fill(0,0,w,h,'#182225');for(let i=0;i<26;i++){const H=(.15+Math.exp(-Math.pow((i-10)/6,2))*.7)*(h-31);fill(14+i*11,h-15-H,7,H,'#93b69c',.75);}line(12,13,12,h-13,'#b7c6af');line(12,h-13,w-12,h-13,'#b7c6af');}return done();
  }
  if(profile==='matrix'){
   // Preserve the approved rain/network styles, add tensors, embeddings and matrices.
   const v=variant%6;if(v<2){g.restore();return false;}fill(0,0,w,h,'#1a142c');
   if(v===2){for(let z=2;z>=0;z--)for(let x=0;x<4;x++)for(let y=0;y<3;y++){const X=52+x*45+z*14,Y=31+y*39-z*8;fill(X,Y,34,29,['#63518a','#9d80bf','#81b6bc'][(x+y+z)%3],.55+z*.15);line(X,Y,X+34,Y,'#dbb9e8',1.5);}}
   else if(v===3){for(let i=0;i<45;i++){const a=i*2.4,r=12+i%12*3,X=w*.5+Math.cos(a)*r+(i%3-1)*62,Y=h*.5+Math.sin(a)*r;dot(X,Y,2.5,['#bda0e1','#79c8c6','#cfb2bd'][i%3],.55+.35*Math.sin(t+i)**2);}}
   else if(v===4){for(let x=0;x<9;x++)for(let y=0;y<6;y++)fill(18+x*32,10+y*(h-20)/6,27,(h-20)/6-4,['#332845','#67558b','#a086b6','#99c2c0'][(x*3+y+Math.floor(t*.4))%4]);}
   else{for(let i=0;i<4;i++)wave(15,12+i*(h-24)/4,w-30,(h-24)/4,['#b9a0db','#83bcbf','#d4b3d7','#8575a6'][i],t*.6+i);}return done();
  }
  g.restore();return false;
 }
 return{paint,boardPhase};
})();
