// Quantized hand/mug poses layered onto each sprite's neutral frame, cached per image.
const CoffeeAnimation=(()=>{
 const cache=new WeakMap();
 function phase(seconds){const t=((seconds%8)+8)%8;return t<2.5?0:t<2.8?1:t<3.1?2:t<4.1?3:t<4.4?2:t<4.7?1:0;}
 function line(g,a,b,color,size=2){let[x,y]=a;const dx=Math.abs(b[0]-x),dy=-Math.abs(b[1]-y),sx=x<b[0]?1:-1,sy=y<b[1]?1:-1;let e=dx+dy;g.fillStyle=color;while(true){g.fillRect(x,y,size,size);if(x===b[0]&&y===b[1])break;const e2=2*e;if(e2>=dy){e+=dy;x+=sx;}if(e2<=dx){e+=dx;y+=sy;}}}
 function frame(image,fw,fh,row,stage){let frames=cache.get(image);if(!frames){frames=new Map();cache.set(image,frames);}const key=[fw,fh,row,stage].join(':');if(frames.has(key))return frames.get(key);
 const c=document.createElement('canvas');c.width=24;c.height=36;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.translate(4,2);g.drawImage(image,fw,row*fh,fw,fh,0,0,16,32);
 const palette=document.createElement('canvas');palette.width=16;palette.height=32;const pg=palette.getContext('2d',{willReadFrequently:true});pg.drawImage(image,fw,0,fw,fh,0,0,16,32);const color=(x,y,fallback)=>{const p=pg.getImageData(x,y,1,1).data;return p[3]>128?'rgb('+p[0]+','+p[1]+','+p[2]+')':fallback;};const cloth=g.getImageData(4+(row===2?8:10),22,1,1).data,skin=color(12,22,'#f2b17b'),coat=cloth[3]>128?'rgb('+cloth[0]+','+cloth[1]+','+cloth[2]+')':'#44475d',outline='#172133',cupY=[21,19,18,16][stage],cupX=row===2?12:row===1?12:9;
 // Standard sheets have a known arm footprint. Other layouts keep their original silhouette.
 if(fw===16&&fh===32){if(row===0){g.clearRect(12,21,3,4);}else if(row===2){g.fillStyle=coat;g.fillRect(6,21,4,4);}else{g.clearRect(12,21,3,4);}}
 const shoulder=row===2?[7,20]:[12,20],elbow=row===2?[9,stage>1?19:22]:[13,stage>1?19:22],hand=[cupX+2,cupY+1];line(g,shoulder,elbow,outline,3);line(g,shoulder,elbow,coat,2);line(g,elbow,hand,outline,3);line(g,elbow,hand,'#d4dce7',2);g.fillStyle=skin;g.fillRect(hand[0],hand[1],2,2);
 // A small cream mug, gold band, dark coffee and an outlined handle.
 g.fillStyle=outline;g.fillRect(cupX-1,cupY-1,5,5);g.fillRect(cupX+4,cupY,1,3);g.fillStyle='#e5c78d';g.fillRect(cupX,cupY,3,3);g.fillStyle='#fff1d1';g.fillRect(cupX,cupY,2,2);g.fillStyle='#684032';g.fillRect(cupX,cupY-1,3,1);g.fillStyle='#ddc398';g.fillRect(cupX+3,cupY,1,2);g.fillStyle=outline;g.fillRect(cupX+3,cupY+1,1,1);
 const result={c,cupX,cupY};frames.set(key,result);return result;}
 function draw(g,image,fw,fh,x,y,h,w,dir,seconds){if(!image.complete||image.naturalWidth<fw*7||image.naturalHeight<fh*3)return;const row=dir==='up'?1:dir==='down'?0:2,stage=phase(seconds),pose=frame(image,fw,fh,row,stage);g.save();g.translate(x,y);if(dir==='left')g.scale(-1,1);g.imageSmoothingEnabled=false;g.drawImage(pose.c,-w*.75,-h*34/32,w*1.5,h*36/32);
 // Steam advances in three pixel steps, independently from the slower hand movement.
 const steam=Math.floor(seconds*2)%3;g.globalAlpha=.35;g.fillStyle='#e2d8f1';const px=w/16,py=h/32,sx=(pose.cupX-8)*px,sy=(pose.cupY-32)*py;g.fillRect(sx+px,sy-(2+steam)*py,px,py);g.globalAlpha=.2;g.fillRect(sx+(steam%2?2:1)*px,sy-(4+steam)*py,px,py);g.restore();}
 return{draw,phase};
})();
