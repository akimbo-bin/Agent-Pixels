import type { NebulaBounds } from '../layout/nebulaLayouts.js';
/** CSS-pixel camera; DPR affects only backing-store rendering. */
export class WorldCamera {
  x=512; y=384; zoom=1; width=1; height=1; fitted=true;
  fit(bounds:NebulaBounds={col:0,row:0,cols:64,rows:48}) {
    this.x=(bounds.col+bounds.cols/2)*16;this.y=(bounds.row+bounds.rows/2)*16;
    this.zoom=Math.min(this.width/(bounds.cols*16),this.height/(bounds.rows*16))*.91;
    this.fitted=bounds.cols===64&&bounds.rows===48;
  }
  point(x:number,y:number){return {x:this.x+(x-this.width/2)/this.zoom,y:this.y+(y-this.height/2)/this.zoom};}
  zoomAt(x:number,y:number,factor:number){
    const before=this.point(x,y);this.zoom=Math.min(8,Math.max(.12,this.zoom*factor));
    const after=this.point(x,y);this.x+=before.x-after.x;this.y+=before.y-after.y;this.fitted=false;
  }
  pan(dx:number,dy:number){this.x-=dx/this.zoom;this.y-=dy/this.zoom;this.fitted=false;}
}
