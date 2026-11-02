"""Original pixel-crafted architectural and set-dressing pack for Nebula HQ."""
from PIL import Image,ImageDraw
import math,random
KINDS={'rug','window','bookwall','mission','sofa','table','globe','toolwall','turbine','crane','console','core','fluorescent','curtain','medcart','poster','planter','pipe','arch','glow','floortrim','telescope-rich','divider','coffee','games','signal'}
P={'ink':'#101523','edge':'#334257','metal':'#667b90','light':'#c6d1cf','gold':'#d9ad61','wood':'#73503d','paper':'#ecddba','teal':'#6fdcb9','violet':'#a285e8'}
def draw_detail(kind,w,h,variant=0,state='unknown',frame=0):
 im=Image.new('RGBA',(w,h));d=ImageDraw.Draw(im);rng=random.Random(kind+str(variant));ink=P['ink'];gold=P['gold'];metal=P['metal'];light=P['light'];wood=P['wood'];teal=P['teal'];violet=P['violet'];paper=P['paper']
 def box(x,y,x2,y2,fill,outline=None):d.rectangle((int(x),int(y),int(x2),int(y2)),fill=fill,outline=outline)
 def star(x,y,c=paper):d.line((x-1,y,x+1,y),fill=c);d.line((x,y-1,x,y+1),fill=c)
 if kind=='rug':
  base=['#383049','#3d2942','#244344','#29384d'][variant%4];box(0,0,w-1,h-1,ink);box(2,2,w-3,h-3,gold);box(4,4,w-5,h-5,base);box(8,8,w-9,h-9,None,gold)
  for x in range(12,w-10,12):d.polygon([(x,4),(x+3,6),(x,8),(x-3,6)],fill=paper)
  for y in range(12,h-10,12):d.polygon([(4,y),(6,y+3),(8,y),(6,y-3)],fill=paper)
  cx=w//2;cy=h//2
  d.ellipse((cx-25,cy-15,cx+25,cy+15),outline=gold,width=2);d.ellipse((cx-17,cy-9,cx+17,cy+9),outline='#9c7a6b');star(cx,cy,gold)
  for x,y in [(18,18),(w-19,18),(18,h-19),(w-19,h-19)]:star(x,y,gold)
 elif kind=='window':
  box(0,0,w-1,h-1,ink);d.rounded_rectangle((2,1,w-3,h-3),radius=min(20,w//2),fill='#253650',outline=gold,width=2)
  d.rounded_rectangle((6,5,w-7,h-8),radius=min(18,w//2),fill='#171c3e',outline='#4c5983')
  for i in range(30):x=rng.randrange(8,w-8);y=rng.randrange(10,h-11);d.point((x,y),fill=rng.choice([paper,violet,'#526dab']))
  for x in [w//3,2*w//3]:d.line((x,8,x,h-8),fill=metal,width=2)
  d.line((6,h//2,w-7,h//2),fill=gold);box(0,h-7,w-1,h-1,wood,ink);d.line((2,h-7,w-3,h-7),fill=gold)
 elif kind=='bookwall':
  box(0,0,w-1,h-1,wood,ink);box(2,2,w-3,5,gold)
  for y in range(9,h-8,15):
   box(5,y,w-6,y+11,'#211f2c')
   for x in range(7,w-8,5):
    height=rng.randrange(6,11);col=rng.choice(['#8d5167','#637d80','#c2aa78','#53628d','#8b8557']);box(x,y+11-height,x+3,y+10,col);d.line((x+1,y+12-height,x+1,y+9),fill='#bca482')
   box(3,y+12,w-4,y+14,wood);d.line((3,y+12,w-4,y+12),fill=gold)
  for x in (1,w-5):box(x,6,x+3,h-3,'#49352c');box(x,6,x+1,h-3,gold)
 elif kind=='mission':
  box(0,0,w-1,h-1,wood,ink);box(3,3,w-4,h-4,'#1c3142',gold)
  for x in range(8,w-20,22):
   for y in range(9,h-12,16):box(x,y,x+14,y+10,paper);box(x+2,y+2,x+9,y+3,'#5f7281');d.line((x+14,y+5,min(w-6,x+22),y+5),fill=teal)
  box(5,h-6,w-6,h-4,gold)
 elif kind=='sofa':
  box(3,h-12,w-4,h-3,ink);box(5,5,w-6,h-12,'#563245',ink);box(7,7,w-8,17,'#8d5260');box(5,18,w-6,h-8,'#63384c',ink)
  for x in range(9,w-9,18):box(x,19,x+15,h-11,'#a86a72',gold)
  for x in (1,w-9):box(x,13,x+7,h-7,'#8d5260',ink);box(x+1,14,x+6,17,'#bb827c')
  for x in (5,w-8):box(x,h-6,x+3,h-1,gold)
 elif kind=='table':
  d.ellipse((1,2,w-2,h-9),fill=gold,outline=ink);d.ellipse((4,4,w-5,h-11),fill=wood);box(w//2-3,h-10,w//2+3,h-3,metal)
  box(8,9,19,17,paper);d.line((10,11,17,11),fill=wood);d.ellipse((w-15,8,w-8,15),fill=paper,outline=gold)
 elif kind=='globe':
  cx=w//2;d.ellipse((cx-14,3,cx+14,31),fill='#234856',outline=gold,width=2);d.arc((cx-8,3,cx+8,31),0,360,fill=metal);d.line((cx-12,17,cx+12,17),fill=gold);d.line((cx,1,cx,35),fill=gold);box(cx-3,31,cx+3,h-7,wood);d.ellipse((cx-12,h-9,cx+12,h-3),fill=wood,outline=gold)
 elif kind=='toolwall':
  box(0,0,w-1,h-1,'#39434e',ink)
  for y in range(4,h-3,6):
   for x in range(4,w-3,6):d.point((x,y),fill='#728390')
  for x in range(8,w-5,12):
   d.line((x,8,x,27),fill=gold,width=3);d.arc((x-4,4,x+4,12),0,290,fill=light,width=2)
  box(5,h-10,w-6,h-3,wood,gold)
 elif kind=='turbine':
  d.ellipse((0,5,w-4,h-4),fill=metal,outline=gold,width=2);d.ellipse((4,9,w-8,h-8),fill=ink,outline=light)
  cx=(w-4)//2;cy=(h+1)//2
  for i in range(10):a=(i*math.pi/5)+(frame*.2 if state=='running' else 0);d.line((cx,cy,cx+math.cos(a)*(w//2-8),cy+math.sin(a)*(h//2-8)),fill=metal,width=2)
  d.ellipse((cx-5,cy-5,cx+5,cy+5),fill=gold,outline=light);box(5,h-5,w-8,h-1,wood)
 elif kind=='crane':
  for x in (2,w-8):box(x,0,x+5,h-2,wood,ink);box(x+1,1,x+2,h-4,gold)
  box(1,0,w-2,7,wood,ink);box(2,1,w-3,3,gold)
  for x in range(8,w-8,8):d.line((x,4,x+4,7),fill=ink)
  cx=w//2+frame;d.line((cx,7,cx,h-14),fill=metal,width=2);d.arc((cx-5,h-17,cx+5,h-7),0,250,fill=gold,width=3)
 elif kind=='console':
  box(1,6,w-2,h-4,ink,metal);box(4,8,w-5,h-13,'#172c40',gold)
  for i in range(3):
   x=8+i*(w-16)//3;box(x,11,x+(w-22)//3,28,'#213e54',metal)
   for k in range(4):d.line((x+2,14+k*3,x+4+(k+frame)%4*3,14+k*3),fill=teal)
  for x in range(7,w-6,6):box(x,h-9,x+2,h-7,gold if x%2 else light)
  for x in (6,w-10):box(x,h-4,x+3,h-1,metal)
 elif kind=='core':
  cx=w//2;d.ellipse((3,h-18,w-4,h-3),fill='#26364f',outline=gold,width=2)
  d.ellipse((7,h-24,w-8,h-13),fill='#34566a',outline=teal);d.line((cx,10,cx,h-22),fill=violet,width=2)
  d.polygon([(cx,4),(w-8,17),(cx,h-23),(7,17)],fill='#443a6b',outline=violet);d.line((cx,4,cx,h-23),fill=paper);d.line((7,17,w-8,17),fill=teal)
 elif kind=='fluorescent':
  box(0,0,w-1,h-1,ink);box(2,2,w-3,h-4,'#7f949d');box(4,3,w-5,h-6,'#ecf0d5');d.line((4,h-5,w-5,h-5),fill='#a9cac6')
 elif kind=='curtain':
  d.line((1,2,w-2,2),fill=gold,width=2)
  for x in range(3,w-2,5):box(x,5,x+4,h-3,'#83aaa2' if x%2 else '#4a6d74');d.line((x,6,x,h-6),fill=light)
 elif kind=='medcart':
  box(3,6,w-4,h-9,metal,ink);box(4,7,w-5,10,light);box(5,18,w-6,25,'#36505b');box(5,31,w-6,h-10,light)
  for x in (6,w-10):d.ellipse((x,h-8,x+5,h-3),fill=ink,outline=metal)
  box(6,2,12,7,paper);box(8,0,10,4,'#c87078');box(18,3,25,7,teal)
 elif kind=='poster':
  box(1,1,w-2,h-2,wood,ink);box(3,3,w-4,h-4,paper)
  d.line((w//2,8,w//2,h-10),fill=metal,width=2);d.ellipse((w//2-5,5,w//2+5,15),outline=metal)
  d.line((7,20,w//2,16,w-8,20),fill=metal);d.line((w//2,h-15,8,h-7),fill=metal);d.line((w//2,h-15,w-9,h-7),fill=metal)
 elif kind=='planter':
  box(4,h-15,w-5,h-3,wood,ink);box(3,h-16,w-4,h-12,gold)
  for i in range(24):
   x=rng.randrange(3,w-5);y=rng.randrange(2,h-15);d.ellipse((x,y,x+5,y+7),fill=rng.choice(['#285850','#3f7860','#6b9b6b']),outline='#22453d')
 elif kind=='pipe':
  for y in (4,10):d.line((0,y,w-1,y),fill=ink,width=4);d.line((0,y-1,w-1,y-1),fill=gold,width=2)
  for x in range(3,w,16):box(x,1,x+2,13,metal)
 elif kind=='arch':
  for x in (0,w-8):box(x,0,x+7,h-1,'#343e58',ink);box(x+1,1,x+2,h-2,gold)
  box(0,0,w-1,5,'#343e58',gold);d.line((8,7,w-9,7),fill=metal)
 elif kind=='glow':
  color=[(232,172,78),(100,157,238),(152,98,224)][variant%3]
  for y in range(h):
   for x in range(w):
    distance=math.hypot((x-w/2)/(w/2),(y-h/2)/(h/2));alpha=int(max(0,1-distance)*48)//6*6
    if alpha:im.putpixel((x,y),(*color,alpha))
 elif kind=='floortrim':
  box(0,0,w-1,h-1,None,ink);box(1,1,w-2,h-2,None,gold);box(4,4,w-5,h-5,None,'#4c5667')
  for x in range(8,w-8,16):box(x,1,x+3,2,paper)
 elif kind=='divider':
  box(0,h-10,w-1,h-3,wood,ink);box(0,h-12,w-1,h-10,gold)
  for x in range(4,w-4,8):d.line((x,h-12,x,h-3),fill=metal)
 elif kind=='coffee':
  box(0,10,w-1,h-5,wood,ink);box(2,11,w-3,13,gold);box(8,0,23,13,metal,ink);box(10,3,21,9,ink);box(13,8,18,12,paper);box(w-15,7,w-8,12,paper)
 elif kind=='games':
  box(5,2,w-6,h-4,wood,ink);box(3,9,w-4,h-11,'#4a456b',gold);box(7,13,w-8,h-21,ink,teal)
  for i in range(9):box(9+i%3*5,15+i//3*5,12+i%3*5,18+i//3*5,[teal,gold,violet][i%3])
  box(4,h-15,w-5,h-8,metal,ink);d.ellipse((10,h-14,15,h-9),fill=gold);box(w-14,h-13,w-11,h-10,'#bc647a')
 elif kind=='signal':
  box(0,0,w-1,h-1,ink,gold);box(3,3,w-4,h-4,'#182f47')
  for x in range(5,w-5):d.point((x,h//2+int(math.sin((x+frame*4)/5)*h/4)),fill=teal if state=='running' else metal)
 elif kind=='telescope-rich':
  cx=w//2
  # Star-glass dome, ribs, raised circular brass platform and stage modules.
  d.pieslice((4,-h//2,w-5,h-20),0,180,fill='#101b37',outline='#526992',width=3)
  for i in range(180):
   x=rng.randrange(8,w-8);y=rng.randrange(3,h-35)
   if ((x-cx)/(w//2))**2+((y+4)/(h-15))**2<1:d.point((x,y),fill=rng.choice(['#395b94','#6b72b0','#adb3e1','#9a72b6']))
  for x in range(24,w-20,40):d.line((cx,-30,x,h-36),fill='#364866',width=3);d.line((cx,-30,x+2,h-36),fill='#597897')
  d.arc((7,-h//2+12,w-8,h-28),0,180,fill=gold,width=2)
  d.ellipse((8,h-56,w-9,h-5),fill='#24314b',outline=gold,width=3);d.ellipse((16,h-50,w-17,h-13),outline='#516584',width=2)
  for x in range(20,w-16,23):box(x,h-27,x+3,h-13,wood);box(x-1,h-29,x+4,h-27,gold)
  d.ellipse((cx-30,h-65,cx+30,h-37),fill=metal,outline=gold,width=2);box(cx-6,h-90,cx+7,h-53,wood);d.ellipse((cx-13,h-94,cx+13,h-68),fill=gold,outline=light)
  if variant==0:
   box(cx-40,h-101,cx+36,h-88,wood,gold);d.ellipse((cx-15,h-116,cx+12,h-89),fill='#628b9f',outline=gold)
  else:
   length=52+variant*5;right=cx+length//2;left=cx-length//2-12
   d.polygon([(left,h-98),(right,h-138),(right+18,h-112),(left+18,h-72)],fill=light,outline=ink)
   d.polygon([(left+5,h-95),(right+5,h-132),(right+13,h-120),(left+13,h-83)],fill='#829aa6')
   for t in (.2,.65):
    x=int(left+(right-left)*t);y=int(h-98-40*t);d.line((x,y,x+18,y+26),fill=gold,width=4)
   d.ellipse((right-3,h-140,right+22,h-110),fill=ink,outline=gold,width=3);d.ellipse((right+2,h-134,right+15,h-118),fill='#628bb6',outline=teal)
  for i in range(variant):
   x=22+i*33;y=h-59;box(x,y,x+22,y+23,'#19283d',gold);box(x+3,y+4,x+19,y+13,'#314669',teal)
   d.ellipse((x+7,y-10,x+17,y+2),fill=violet,outline=paper)
  if variant>=4:d.arc((cx-45,4,cx+45,80),180,360,fill=violet,width=3)
  if variant>=6:
   d.ellipse((w-57,9,w-9,66),outline=gold,width=3);d.ellipse((w-52,14,w-14,61),outline=violet,width=3)
   for i in range(24):a=i*.7;r=i*.6;d.point((w-33+math.cos(a)*r,38+math.sin(a)*r),fill=teal)
 if kind=='signal':
  color={'running':teal,'waiting':gold,'queued':gold,'failed':'#e16a78','stalled':'#e16a78','cooldown':'#928db9','done':'#7ebfea'}.get(state,metal)
  box(1,1,w-2,h-2,None,color);box(4,h-6,w-5,h-4,color if state=='running' and frame%2 else ink)
  if state=='waiting':d.line((w//2-3,6,w//2-3,h-8),fill=gold,width=2);d.line((w//2+3,6,w//2+3,h-8),fill=gold,width=2)
 return im
