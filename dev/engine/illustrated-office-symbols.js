// Small plaque emblems drawn as paths, following the reference's brass/ivory linework.
const OfficeSymbols=(()=>{
 const names={lead:'Executive star',second:'Director bishop',clerk:'Reception spark',observatory:'Astronomical reticle',engine:'Engineering wrench',data:'Mathematical sigma',training:'Neural processor',music:'Music notes',doctor:'Medical cross',review:'Review layers',operations:'Operations pipeline',queue:'Queue tickets'};
 function draw(g,id,x,y,size=16){if(!names[id])return false;g.save();g.translate(x,y);g.scale(size/16,size/16);const ivory=['observatory','engine','data','training'].includes(id),color=ivory?'#eee9d8':'#edc276';g.strokeStyle=color;g.fillStyle=color;g.lineWidth=1.35;g.lineJoin='round';g.lineCap='round';
  const line=(points,closed=false,fill=false)=>{g.beginPath();points.forEach(([a,b],i)=>i?g.lineTo(a,b):g.moveTo(a,b));if(closed)g.closePath();if(fill)g.fill();else g.stroke();};
  const circle=(x,y,r,fill=false)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2);fill?g.fill():g.stroke();};
  if(id==='lead'){const p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?3:7;p.push([8+Math.cos(a)*r,8+Math.sin(a)*r]);}line(p,true,true);}
  else if(id==='second'){g.beginPath();g.moveTo(8,1);g.bezierCurveTo(4,4,4,7,8,9);g.bezierCurveTo(12,7,12,4,8,1);g.stroke();line([[9.5,3],[7.5,5.5]]);line([[7,9],[5,12],[11,12],[9,9]]);line([[4,14],[12,14]]);circle(8,.8,.6,true);}
  else if(id==='clerk'){line([[8,1],[10,5.7],[15,8],[10,10.2],[8,15],[5.8,10],[1,8],[5.8,5.8]],true,true);}
  else if(id==='observatory'){circle(8,8,4.5);circle(8,8,1.3,true);for(const [a,b,c,d]of [[8,0,8,4],[8,12,8,16],[0,8,4,8],[12,8,16,8]])line([[a,b],[c,d]]);line([[2,4],[2,2],[4,2]]);line([[12,2],[14,2],[14,4]]);line([[14,12],[14,14],[12,14]]);line([[4,14],[2,14],[2,12]]);}
  else if(id==='engine'){line([[13,1],[10,4],[12,6],[15,3],[15,7],[12,9],[9,8],[4,14],[2,14],[1,12],[7,6],[6,3],[9,1]],true);circle(3,12,.65);}
  else if(id==='data'){g.lineWidth=1.9;line([[13,2],[3,2],[8,8],[3,14],[13,14]]);}
  else if(id==='training'){g.strokeRect(4,4,8,8);g.strokeRect(6.5,6.5,3,3);for(let n=5;n<=11;n+=3){line([[n,1],[n,3]]);line([[n,13],[n,15]]);line([[1,n],[3,n]]);line([[13,n],[15,n]]);}}
  else if(id==='music'){line([[6,12],[6,4],[13,2],[13,10]]);line([[6,6],[13,4]]);g.beginPath();g.ellipse(3.9,12.5,2.4,1.6,-.3,0,7);g.fill();g.beginPath();g.ellipse(10.9,10.5,2.4,1.6,-.3,0,7);g.fill();}
  else if(id==='doctor'){g.fillRect(6,1,4,14);g.fillRect(1,6,14,4);}
  else if(id==='review'){line([[8,1.5],[14.5,5],[8,8.5],[1.5,5]],true);line([[1.5,8.5],[8,12],[14.5,8.5]]);line([[1.5,12],[8,15.5],[14.5,12]]);}
  else if(id==='operations'){g.strokeRect(1,1,5,4);g.strokeRect(10,6,5,4);g.strokeRect(1,11,5,4);line([[6,3],[8,3],[8,8],[10,8]]);line([[8,8],[8,13],[6,13]]);}
  else if(id==='queue'){line([[1,6],[1,14],[12,14]]);g.beginPath();g.moveTo(3,2);g.lineTo(15,2);g.lineTo(15,5);g.quadraticCurveTo(12.5,6.5,15,8);g.lineTo(15,11);g.lineTo(3,11);g.lineTo(3,8);g.quadraticCurveTo(5.5,6.5,3,5);g.closePath();g.stroke();g.setLineDash([1,1.5]);line([[11,4],[11,9]]);g.setLineDash([]);line([[6,5],[8,5]]);line([[6,8],[8,8]]);}
  g.restore();return true;
 }
 return{draw,names};
})();
