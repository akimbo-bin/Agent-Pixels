// Canvas-native screen artwork. Diagrams are illustrative; live values are supplied by the model.
const ScreenArtwork=(()=>{
 function paint({profile,variant,room,theme,model:m},g,w,h,time,active){
  if(profile==='generic')return false;
  if(h<136){const c=document.createElement('canvas');c.width=w;c.height=136;const painted=paint({profile,variant,room,theme,model:m},c.getContext('2d'),w,136,time,active);if(painted)g.drawImage(c,0,0,w,h);return painted;}
  let [bg,ink]=theme,accent={lead:'#f3d18d',second:'#e0c29a',clerk:'#ffd997',observatory:'#83edff',engine:'#ffbd73',data:'#f1dc96',training:'#82f3df',music:'#83e8ff',doctor:'#96cfff',operations:'#e0b9ff',queue:'#ecb5dc'}[room]||'#a8e7ff';
  if(['work','health','blockers','reviews','ready','progress','review'].includes(profile)){ink={work:'#ff9eac',health:'#75e2f6',blockers:'#ffc27d',reviews:'#cda0ff',ready:'#ffd69b',progress:'#acb7ff',review:'#f1a1da'}[profile];bg='#101525';}
  const t=time*(active?1:.17)+variant*.91,cx=w/2,body=h-41;
  g.save();g.fillStyle=bg;g.fillRect(0,0,w,h);
  const wash=g.createLinearGradient(0,0,w,h);wash.addColorStop(0,ink+'24');wash.addColorStop(.5,bg);wash.addColorStop(1,accent+'16');g.fillStyle=wash;g.fillRect(0,0,w,h);
  const rect=(x,y,W,H,c=ink,a=1)=>{g.globalAlpha=a;g.fillStyle=c;g.fillRect(x,y,W,H);g.globalAlpha=1;};
  const line=(x,y,X,Y,c=ink,a=1,width=1)=>{g.strokeStyle=c;g.lineWidth=width;g.globalAlpha=a;g.beginPath();g.moveTo(x,y);g.lineTo(X,Y);g.stroke();g.globalAlpha=1;};
  const text=(value,x,y,size=13,c=ink,max=w-x-10)=>{g.fillStyle=c;g.font=`${size>=22?'bold ':''}${size}px monospace`;let s=String(value??'').replace(/[\r\n\t]/g,' ');while(s.length&&g.measureText(s).width>max)s=s.slice(0,-1);g.fillText(s,x,y);};
  const circle=(x,y,r,c=ink,a=1,width=1)=>{g.globalAlpha=a;g.strokeStyle=c;g.lineWidth=width;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke();g.globalAlpha=1;};
  const dot=(x,y,r=2,c=accent,a=1)=>{g.globalAlpha=a;g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.globalAlpha=1;};
  const grid=(x=10,y=30,W=w-20,H=h-43,pitch=20)=>{for(let i=0;i<=W;i+=pitch)line(x+i,y,x+i,y+H,ink,.13);for(let i=0;i<=H;i+=pitch)line(x,y+i,x+W,y+i,ink,.13);};
  const panel=(x,y,W,H,c=ink)=>{rect(x,y,W,H,c,.055);g.strokeStyle=c;g.lineWidth=1;g.globalAlpha=.28;g.strokeRect(x+.5,y+.5,W-1,H-1);g.globalAlpha=1;};
  const trace=(x,y,W,H,phase=0,c=ink)=>{g.strokeStyle=c;g.lineWidth=2;g.beginPath();for(let i=0;i<=W;i+=2){const u=i/W,v=Math.sin(u*15+t+phase)*.26+Math.sin(u*39-t*.7+phase)*.1;const Y=y+H*(.5+v);i?g.lineTo(x+i,Y):g.moveTo(x+i,Y);}g.stroke();};
  const rail=(y=h-8)=>{for(let i=0;i<36;i++){const n=(i-Math.floor(t*7)+36000)%36;rect(10+i*(w-20)/36,y,(w-20)/36-2,2,ink,active?n<10?1-n/12:.12:n<3?.45:.09);}};
  const frame=title=>{rect(0,0,w,24,ink,.11);text(title,10,17,14);dot(w-12,12,3,active?accent:ink,.65+.3*Math.sin(t*2)**2);line(10,25,w-10,25,ink,.38);};
  const finish=()=>{g.globalAlpha=.12;g.strokeStyle=ink;g.lineWidth=1;g.strokeRect(.5,.5,w-1,h-1);g.globalAlpha=1;for(const[x,y,dx,dy]of [[3,3,1,1],[w-3,3,-1,1],[3,h-3,1,-1],[w-3,h-3,-1,-1]]){line(x,y,x+dx*8,y,ink,.6);line(x,y,x,y+dy*5,ink,.6);}g.restore();return true;};
  const ring=(x,y,r,f,label)=>{circle(x,y,r,ink,.15,8);if(f!==null&&f!==undefined){g.strokeStyle=ink;g.lineWidth=7;g.beginPath();g.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.max(.001,f)*Math.PI*2);g.stroke();}for(let i=0;i<24;i++){const a=i/24*Math.PI*2;line(x+Math.cos(a)*(r+8),y+Math.sin(a)*(r+8),x+Math.cos(a)*(r+11),y+Math.sin(a)*(r+11),accent,i%3===0?.7:.2);}g.font='bold 26px monospace';text(label,x-g.measureText(label).width/2,y+8,26,'#e5f5ff',r*2+24);};
  const network=(x,y,W,H)=>{const nodes=[];for(let l=0;l<4;l++)for(let n=0;n<(l===0||l===3?3:4);n++)nodes.push({l,n,x:x+l*W/3,y:y+(n+.5)*H/(l===0||l===3?3:4)});for(const a of nodes)for(const b of nodes)if(b.l===a.l+1){const k=(t*.8+a.n*.3+b.n*.19)%1;line(a.x,a.y,b.x,b.y,ink,.14);if(active||a.n===0&&b.n===1)dot(a.x+(b.x-a.x)*k,a.y+(b.y-a.y)*k,1.8,accent,.8);}for(const a of nodes){circle(a.x,a.y,4,ink,.8,1.5);dot(a.x,a.y,1.5,accent,.5+.4*Math.sin(t+a.n+a.l)**2);}};
  const rocket=(x,y,W,H)=>{g.save();g.translate(x,y);g.scale(W/80,H/120);g.strokeStyle=ink;g.lineWidth=1.7;g.beginPath();g.moveTo(40,3);g.bezierCurveTo(18,23,25,62,25,92);g.lineTo(55,92);g.bezierCurveTo(55,62,62,23,40,3);g.moveTo(25,62);g.lineTo(10,99);g.lineTo(25,90);g.moveTo(55,62);g.lineTo(70,99);g.lineTo(55,90);g.moveTo(31,93);g.lineTo(27,106);g.lineTo(53,106);g.lineTo(49,93);g.stroke();circle(40,36,8,accent,.9,1.7);for(let i=0;i<4;i++)line(28,54+i*9,52,54+i*9,ink,.6);line(40,0,40,118,ink,.35);line(5,111,75,111,ink,.5);g.restore();};
  if(m){
   frame(m.title);
   const compact=h<165;
   if(profile==='training'){
    const r=Math.min(43,(h-72)/2),y=34+r;ring(58,y,r,m.fraction,m.value);
    text(m.fresh?m.status.toUpperCase():'NO SIGNAL',115,49,14,!m.fresh?'#e0b7a1':/waiting|paused/i.test(m.status)?'#ffd292':/failed|error/i.test(m.status)?'#ff9fae':accent);
    network(126,58,170,Math.max(25,h-122));
    text(m.lines[0],115,h-43,12,'#dae7ff',w-125);text(m.lines[1],115,h-28,10,ink,w-125);
    text('QUEUE JOBS',18,h-24,10,ink,90);rail(h-14);text('Queue completion · not epochs',10,h-3,8,'#a9aac5');
   }else if(profile==='engineering'){
    grid();panel(w-106,33,96,h-61);rocket(w-99,38,82,h-78);
    text(m.value,12,59,25,'#e7f6ff',w-124);text(m.status.toUpperCase(),12,79,13,accent,w-124);
    text(m.lines[0],12,105,11,ink,w-126);if(h>164)text(m.lines[1],12,121,10,ink,w-126);
    for(let i=0;i<4;i++){line(14,135+i*9,w-126,135+i*9,ink,.12);dot(18+(Math.sin(t*.5+i)*.5+.5)*(w-149),135+i*9,1.5,accent,.5);}
    rail(h-18);text('ENGINE AGENT / LIVE ASSIGNMENT',12,h-5,9,'#9db9cd');
   }else if(profile==='audio'){
    text(m.value,12,compact?49:56,compact?23:29,'#f7e8ff',w-110);text(m.status.toUpperCase(),w-96,47,11,accent,86);
    const Y=compact?57:69,H=Math.max(30,h-Y-51);panel(10,Y,w-20,H);grid(10,Y,w-20,H,24);
    if(m.waveform?.length>1){g.strokeStyle=accent;g.lineWidth=2;g.beginPath();m.waveform.forEach((v,i)=>{const X=14+i/(m.waveform.length-1)*(w-28),yy=Y+H/2+v*(H/2-4);i?g.lineTo(X,yy):g.moveTo(X,yy);});g.stroke();}
    else{const bins=m.spectrum?.length?m.spectrum:Array.from({length:28},(_,i)=>(.25+.6*Math.sin(i*.37+t*.6)**2)*Math.exp(-i/48));for(let i=0;i<bins.length;i++){const W=(w-28)/bins.length,b=Math.max(0,bins[i])*(H-10);rect(14+i*W,Y+H-b-4,W-2,b,i%5===0?accent:ink,.75);rect(14+i*W,Y+H-b-7,W-2,1,'#fff0ff',.65);}}
    text(m.waveform?.length||m.spectrum?.length?'MEASURED AUDIO':'ILLUSTRATIVE SIGNAL',15,Y+12,9,'#e9d2f9');text(m.lines[1],12,h-30,12,ink);text(m.lines[0],12,h-15,10,'#b7a9c5');rail(h-6);
   }else{
    const tall=h>185,countY=tall?72:56;
    text(m.value,14,countY,tall?40:30,'#edf1ff',w-83);
    const ix=w-48,iy=tall?58:47;
    if(profile==='health'){for(let i=0;i<3;i++){panel(ix-19,iy-19+i*13,37,10);dot(ix+10,iy-14+i*13,2,accent,.4+.4*Math.sin(t+i)**2);}}
    else if(profile==='blockers'){line(ix,iy-19,ix-19,iy+15,accent,.9,2);line(ix-19,iy+15,ix+19,iy+15,accent,.9,2);line(ix+19,iy+15,ix,iy-19,accent,.9,2);line(ix,iy-8,ix,iy+2,accent,1,3);dot(ix,iy+9,2,accent);}
    else{for(let i=2;i>=0;i--){panel(ix-17+i*3,iy-17-i*4,29,28);line(ix-12+i*3,iy-7-i*4,ix+5+i*3,iy-7-i*4,ink,.55);}}
    text(m.fresh?m.status:'AWAITING LIVE FEED',14,countY+21,11,m.fresh?accent:'#d5ac96');
    let y=countY+35;const max=Math.max(1,Math.floor((h-y-43)/23)+1),offset=m.lines.length>max?Math.floor(t/9)*max%m.lines.length:0;for(const row of m.lines.slice(offset,offset+max)){panel(12,y,w-24,20);dot(20,y+10,1.5,accent,.5+.4*Math.sin(t+y)**2);text(row,28,y+13,10,ink,w-43);y+=23;}
    rail(h-21);text(m.note,12,h-7,8,'#a6a8c0');
   }
   return finish();
  }
  if(profile==='admin'){
   frame(variant%2?'STRATEGY / OVERVIEW':'EXECUTIVE / PLANNING');
   panel(10,34,105,h-48);ring(62,34+(h-48)/2,Math.min(31,(h-66)/2),.67+.05*Math.sin(t), '');
   text('OVERVIEW',26,h-20,10,accent,85);panel(123,34,w-133,(h-50)*.5);trace(131,40,w-149,(h-65)*.4,variant,accent);
   const top=40+(h-50)*.5,H=h-top-15;for(let i=0;i<9;i++){const v=.24+.59*Math.sin(i*.7+t*.18)**2;rect(131+i*(w-149)/9,top+H*(1-v),(w-149)/9-4,H*v,i%3?ink:accent,.8);}rail();return finish();
  }
  if(profile==='inbox'){
   const page=(Math.floor(t/7)+variant)%3;frame(['INBOX / CORRESPONDENCE','SCHEDULE / CALENDAR','WORKBOOK / TRACKING'][page]);
   panel(10,34,47,h-47);for(let i=0;i<5;i++){rect(18,44+i*21,7,7,i===page?accent:ink,i===page?1:.3);rect(30,46+i*21,18,3,ink,.4);}
   if(page===0){for(let i=0;i<5;i++){const y=34+i*(h-47)/5;panel(66,y,w-76,(h-47)/5-3);const selected=i===Math.floor(t)%5;rect(66,y,3,(h-47)/5-3,accent,selected?1:.15);line(78,y+8,w-32,y+8,ink,.7);line(78,y+15,w-70,y+15,ink,.28);}}
   else{const X=65,Y=35,W=w-76,H=h-49;grid(X,Y,W,H,page===1?34:25);for(let i=0;i<15;i++){const xx=X+3+(i%6)*(W/6),yy=Y+4+Math.floor(i/6)*(H/3);rect(xx,yy,W/6-5,H/3-9,i%3?ink:accent,.16+.23*Math.sin(t+i)**2);}}
   rail();return finish();
  }
  if(profile==='stars'){
   frame(['CELESTIAL / ATLAS','QUANTUM / ORBITALS','EPHEMERIS / TRACKING','SPECTRAL / ANALYSIS'][variant%4]);
   grid();const x=w*.43,y=30+body/2,r=Math.min(w*.3,body*.43);
   for(let i=0;i<34;i++){const X=12+(i*71+variant*17)%(w-24),Y=33+(i*47)%(h-47);dot(X,Y,i%7===0?1.9:.8,i%7===0?accent:ink,.35+.55*Math.sin(t+i)**2);}
   for(let i=1;i<=3;i++)circle(x,y,r*i/3,ink,.3);line(x-r,y,x+r,y,ink,.3);line(x,y-r,x,y+r,ink,.3);
   if(variant%4===1){for(let i=0;i<3;i++){g.save();g.translate(x,y);g.rotate(i*Math.PI/3+t*.12);g.scale(1,.35);circle(0,0,r*.86,accent,.8,1.5);dot(Math.cos(t+i)*r*.86,Math.sin(t+i)*r*.86,3,ink);g.restore();}dot(x,y,6,accent);}
   else{const angle=t*.35;g.fillStyle=ink+'18';g.beginPath();g.moveTo(x,y);g.arc(x,y,r,angle-.5,angle);g.closePath();g.fill();line(x,y,x+Math.cos(angle)*r,y+Math.sin(angle)*r,accent,.8,2);for(let i=0;i<6;i++){const a=i*.93+.4,X=x+Math.cos(a)*r*(.4+i*.08),Y=y+Math.sin(a)*r*(.4+i*.08);dot(X,Y,2.5,accent);if(i)line(X,Y,x+Math.cos(a-.93)*r*(.32+i*.08),y+Math.sin(a-.93)*r*(.32+i*.08),ink,.5);}}
   panel(w-71,36,60,h-51);for(let i=0;i<6;i++)rect(w-64,45+i*(h-67)/6,12+Math.sin(i+t*.3)**2*34,3,i%2?ink:accent,.7);rail();return finish();
  }
  if(profile==='blueprint'){
   frame(['PROPULSION / DESIGN','FLIGHT / DYNAMICS','VECTOR / CONTROL','ENGINE / ASSEMBLY'][variant%4]);grid();rocket(35,32,100,h-48);
   for(const y of [h*.35,h*.6,h*.8]){line(91,y,170,y,ink,.6);line(170,y,181,y-7,ink,.6);line(181,y-7,211,y-7,accent,.7);dot(91,y,2,accent);}
   panel(221,35,87,h-50);trace(229,43,71,(h-64)*.42,1,accent);for(let i=0;i<4;i++){line(230,h*.58+i*11,296,h*.58+i*11,ink,.25);rect(230,h*.58+i*11,20+Math.sin(t+i)**2*38,2,ink,.8);}rail();return finish();
  }
  if(profile==='code'){
   frame(['SOURCE / DSP KERNEL','FOURIER / SIGNAL LAB','COMPUTE / NUMERICS'][variant%3]);
   if(variant%3===1){grid();panel(11,34,w-22,(h-51)*.56);trace(17,40,w-34,(h-62)*.48,0,accent);for(let i=0;i<32;i++){const v=.15+.7*Math.sin(i*.29+t*.5)**2,H=(h-52)*.35;rect(14+i*(w-28)/32,h-16-H*v,(w-28)/32-3,H*v,ink,.65);}}
   else{line(35,33,35,h-15,ink,.3);for(let i=0;i<10;i++){const y=41+i*15;if(y>h-14)break;text(String(i+1).padStart(2,'0'),10,y,9,ink,20);const a=.3+((i+Math.floor(t*1.7))%6)/10;rect(45+(i%3)*10,y-6,27+(i*29)%73,4,i%3?ink:accent,a);rect(136+(i%3)*10,y-6,24+(i*37)%110,4,i%2?accent:ink,a*.7);}rect(44+Math.floor(t*12)%220,h-18,5,7,accent,.8);}
   rail();return finish();
  }
  if(profile==='matrix'){
   frame(variant%2?'TENSOR / NEURAL GRAPH':'MATRIX / LATENT SPACE');
   if(variant%2){grid();network(24,34,w-48,h-52);}
   else{for(let col=0;col<23;col++){const head=((t*21+col*37)%Math.max(1,h-36))+30;for(let row=0;row<11;row++){const y=head-row*10;if(y<30||y>h-12)continue;const value=(col*7+row*3+Math.floor(t))%16;text(value.toString(16).toUpperCase(),12+col*13,y,11,row===0?'#e8fff3':row<3?accent:ink,12);if(row>3)rect(12+col*13,y-8,7,8,bg,Math.min(.8,row*.07));}}}
   rail();return finish();
  }
  if(profile==='math'){
   g.fillStyle='#102f29';g.fillRect(0,0,w,h);frame('DATA / FOURIER & OPTIMIZATION');
   const formulas=['F(ω) = ∫ f(t)e⁻ⁱωᵗ dt','∇L(θ) = E[∂L / ∂θ]','y[n] = Σ h[k]x[n-k]','X[k] = Σ x[n]e⁻ⁱ²πkn/N'];
   for(let i=0;i<3;i++)text(formulas[(i+Math.floor(t/12))%4],13,48+i*22,15,i===1?accent:ink,w*.75);
   const top=Math.max(112,h*.57),H=h-top-20;grid(12,top,w-24,H,24);trace(13,top+4,w*.52,H-8,0,ink);
   for(let i=0;i<19;i++){const H1=(.15+.75*Math.sin(i*.3+t*.3)**2)*(H-4);rect(w*.62+i*(w*.33)/19,h-20-H1,w*.33/19-2,H1,accent,.7);}line(w*.59,top,w*.59,h-20,ink,.4);text('SIGNAL → TRANSFORM',13,h-6,9,accent);return finish();
  }
  if(profile==='medical'){
   frame(['RADIOGRAPH / DEMO','CARDIAC / DEMO','BIO SIGNALS / DEMO'][variant%3]);grid();
   if(variant%3===0){const x=w*.42,y=32,H=h-49;panel(53,y,158,H);line(x,y+6,x,h-18,accent,.7,2);for(let i=0;i<8;i++){g.strokeStyle=ink;g.lineWidth=2;g.beginPath();g.ellipse(x,y+20+i*(H-30)/8,32+Math.sin(i/8*Math.PI)*21,10,0,0,Math.PI);g.stroke();}for(const side of [-1,1]){g.fillStyle=ink+'22';g.beginPath();g.ellipse(x+side*26,y+H*.45,23,H*.32,side*.12,0,7);g.fill();}line(57,y+(t*12)%H,205,y+(t*12)%H,accent,.7,2);for(let i=0;i<5;i++)rect(230,43+i*21,25+i*4,4,ink,.5);}
   else{const Y=37,H=h-64;g.strokeStyle=ink;g.lineWidth=2.5;g.beginPath();for(let i=0;i<w-24;i++){const u=((i/(w-24)*3-t*.5)%1+1)%1,v=u>.43&&u<.48?-(u-.43)*12:u>=.48&&u<.52?-.6+(u-.48)*28:u>=.52&&u<.59?.52-(u-.52)*7.4:Math.sin(u*17)*.035;const y=Y+H*.5+v*H*.7;i?g.lineTo(12+i,y):g.moveTo(12+i,y);}g.stroke();trace(14,h-37,w-28,17,2,accent);}
   text('ILLUSTRATIVE DIAGNOSTIC',12,h-7,9,accent);return finish();
  }
  g.restore();return false;
 }
 return{paint};
})();
