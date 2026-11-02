"""Original Nebula pixel sprites. Procedural drawing source; no generated-image service.
Rebuild with Python + Pillow. Runtime needs only checked-in PNG and manifest JSON.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json, math
ROOT=Path(__file__).resolve().parents[1]/'public/assets/furniture/NEBULA_CAMPUS'
ROOT.mkdir(parents=True,exist_ok=True)
INK='#101c2d';EDGE='#304759';METAL='#557583';LIGHT='#b9d1ca';GOLD='#e6b56a';WOOD='#866047';PAPER='#eee0bc';TEAL='#79d6b1';PURPLE='#b88bee'
assets=[];atlas=[]
def rect(d,box,fill,outline=None):d.rectangle(tuple(map(int,box)),fill=fill,outline=outline)
def sprite(kind,w,h,variant=0,state='unknown',frame=0):
 im=Image.new('RGBA',(w,h));d=ImageDraw.Draw(im)
 led={'unknown':'#7b8997','idle':'#8daeb3','queued':GOLD,'running':TEAL,'stalled':'#f07b77','failed':'#e66c72','done':'#82c6ed'}[state]
 if kind.startswith('desk') or kind in ('bench','review','clerk'):
  hue=WOOD if kind.startswith('desk') or kind=='clerk' else LIGHT if kind=='review' else METAL
  rect(d,(2,9,w-3,h-6),INK);rect(d,(3,7,w-4,h-10),hue,EDGE);rect(d,(4,8,w-5,10),GOLD if kind=='desk-main' else LIGHT)
  for x in (5,w-9):rect(d,(x,h-10,x+3,h-1),EDGE);rect(d,(x,h-10,x+1,h-3),hue)
  rect(d,(w//2-8,1,w//2+8,13),INK,EDGE);rect(d,(w//2-6,3,w//2+6,10),'#295a6f');d.line((w//2-4,7,w//2+3,7),fill=TEAL)
  rect(d,(w//2-7,16,w//2+8,19),INK);d.line((w//2-5,17,w//2+5,17),fill=METAL)
  rect(d,(7,13,15,19),PAPER);d.line((8,15,13,15),fill=WOOD)
  if w>=64:
   d.ellipse((w-21,3,w-10,9),fill=GOLD,outline=INK);d.line((w-15,9,w-15,17),fill=GOLD,width=2)
   rect(d,(w-20,18,w-11,19),GOLD)
 elif kind=='chair':
  rect(d,(3,3,12,12),INK);rect(d,(4,4,11,10),WOOD);rect(d,(3,10,12,13),GOLD);d.line((5,13,4,15),fill=METAL);d.line((10,13,11,15),fill=METAL)
 elif kind=='rocket':
  # Copper gantry surrounds a cream rocket; no other prop has this silhouette.
  for x in (3,w-7):
   rect(d,(x,3,x+4,h-6),EDGE);rect(d,(x+1,3,x+2,h-8),GOLD)
   for y in range(8,h-8,12):d.line((x,y,x+4,y+7),fill=WOOD)
  for y in (9,h-22):rect(d,(2,y,w-3,y+3),WOOD);d.line((3,y,w-4,y),fill=GOLD)
  cx=w//2;d.polygon([(cx,4),(cx-10,25),(cx-10,h-22),(cx+10,h-22),(cx+10,25)],fill=PAPER,outline=INK)
  d.polygon([(cx,4),(cx+10,25),(cx,25)],fill='#a9bab6');rect(d,(cx-10,27,cx+10,32),'#c78047')
  d.ellipse((cx-6,37,cx+6,49),fill=INK,outline=GOLD);d.ellipse((cx-3,40,cx+3,46),fill='#6bafe8')
  d.polygon([(cx-10,h-34),(cx-20,h-14),(cx-8,h-18)],fill=WOOD,outline=INK);d.polygon([(cx+10,h-34),(cx+20,h-14),(cx+8,h-18)],fill=WOOD,outline=INK)
  rect(d,(cx-7,h-22,cx+7,h-14),EDGE);rect(d,(4,h-10,w-5,h-3),METAL,INK)
  # Articulation and tiny sparks are separate from the truthful status beacon.
  d.line((w-7,h-24,w-16,h-34+frame*2,w-23,h-28),fill=GOLD,width=3)
  if state=='running':d.line((w-26,h-28,w-30-frame*2,h-31),fill=PAPER)
 elif kind=='telescope':
  cx=w//2;d.ellipse((4,4,w-5,h-13),fill='#172b45',outline='#41607a');d.arc((7,7,w-8,h-16),180,345,fill=GOLD,width=2)
  for x,y in ((13,20),(67,16),(76,36),(24,43),(50,11)):d.point((x,y),fill=PAPER)
  rect(d,(cx-22,h-20,cx+23,h-10),INK);d.ellipse((cx-23,h-27,cx+23,h-13),fill=METAL,outline=LIGHT)
  rect(d,(cx-5,h-44,cx+5,h-23),WOOD);d.ellipse((cx-10,h-47,cx+10,h-29),fill=GOLD,outline=INK)
  if variant==0:
   rect(d,(cx-22,31,cx+19,45),WOOD,INK);d.ellipse((cx-8,26,cx+8,41),fill='#7eafc4',outline=GOLD)
   d.line((cx-19,35,cx+14,35),fill=PAPER)
  else:
   d.polygon([(cx-20,38),(cx+19,13),(cx+32,31),(cx-7,55)],fill=LIGHT,outline=INK)
   d.polygon([(cx-16,41),(cx+22,17),(cx+28,25),(cx-10,49)],fill='#6e99ab')
   d.line((cx-17,39,cx+19,16),fill=GOLD,width=3);d.ellipse((cx+16,13,cx+33,31),fill=INK,outline=GOLD);d.ellipse((cx+20,17,cx+28,26),fill='#87dce4')
   for i in range(variant-1):
    x=8+i*13;rect(d,(x,h-10,x+8,h-5),PURPLE if i%2 else TEAL)
 elif kind=='rack':
  rect(d,(2,2,w-3,h-2),INK,EDGE);rect(d,(4,4,w-5,h-5),'#233c4c')
  for y in range(6,h-8,12):
   rect(d,(5,y,w-6,y+9),INK,METAL);d.ellipse((8,y+2,14,y+8),outline=METAL)
   d.line((11,y+3,11+(frame%2)*2,y+7),fill=LIGHT);rect(d,(w-12,y+3,w-9,y+5),led)
  rect(d,(2,h-3,w-3,h-1),METAL)
 elif kind=='math':
  rect(d,(1,2,w-2,h-2),WOOD,INK);rect(d,(4,5,w-5,h-6),'#163b43');
  d.text((8,8),'y = Wx + b',fill=PAPER);d.text((8,20),'E[x] = sum p*x',fill=LIGHT)
  d.line((8,h-12,w-11,h-12),fill=METAL);d.line((10,h-10,10,h-27),fill=METAL)
  for x in range(11,w-12):d.point((x,int(h-18-5*math.sin(x/6))),fill=TEAL)
  rect(d,(w-20,h-5,w-12,h-3),PAPER)
 elif kind in ('render','judge'):
  rect(d,(2,5,w-3,h-4),EDGE,INK);rect(d,(5,7,w-6,h-13),INK,METAL)
  for x in range(8,w-8):
   y=18+int(math.sin((x+frame*2)/3)*(5 if kind=='render' else 8));d.point((x,y),fill=led)
  for x in range(7,w-7,8):d.ellipse((x,h-11,x+4,h-7),fill=GOLD,outline=INK)
  if kind=='render':
   for x in range(6,w-6,5):rect(d,(x,h-4,x+3,h-1),PAPER);rect(d,(x+2,h-4,x+3,h-2),INK)
  else:
   d.arc((w-20,0,w-4,16),180,360,fill=LIGHT,width=3);rect(d,(w-21,7,w-17,16),WOOD);rect(d,(w-6,7,w-2,16),WOOD)
 elif kind=='bed':
  rect(d,(4,8,w-4,h-7),METAL,INK);rect(d,(6,6,w-6,h-11),LIGHT,INK);rect(d,(8,8,w-8,18),PAPER)
  rect(d,(7,21,w-7,h-12),'#5c9b92');d.line((10,24,w-11,24),fill=TEAL)
  for x in (6,w-9):rect(d,(x,h-8,x+3,h-2),EDGE)
 elif kind in ('cabinet','library'):
  rect(d,(1,2,w-2,h-1),WOOD if kind=='library' else EDGE,INK)
  for y in range(5,h-5,11):
   rect(d,(4,y,w-5,y+8),INK)
   if kind=='library':
    for x in range(5,w-5,4):rect(d,(x,y+1,x+2,y+7),[PAPER,TEAL,WOOD,PURPLE][(x+y)%4])
   else:rect(d,(5,y+1,w-6,y+7),METAL);rect(d,(w//2-3,y+3,w//2+3,y+4),GOLD)
 elif kind=='pod':
  d.ellipse((0,h-9,w-1,h-2),fill=EDGE,outline=GOLD);rect(d,(1,3,w-2,h-9),'#152a44',METAL)
  d.line((3,5,3,h-13),fill='#8ac7df');d.line((w-4,6,w-4,h-12),fill=PURPLE)
  if variant < 0: pass
  elif variant%3==0:d.polygon([(w//2,8),(w-5,16),(w//2,h-12),(4,16)],fill=[TEAL,PURPLE,GOLD][variant//3%3],outline=LIGHT)
  elif variant%3==1:
   for y in range(9,h-12,4):d.line((4,y,w-5,y+2),fill=PURPLE if variant%2 else GOLD)
  else:d.ellipse((4,9,w-5,h-13),fill=TEAL,outline=LIGHT)
  rect(d,(5,h-6,w-6,h-4),PAPER)
 elif kind=='lamp':
  d.line((w//2,7,w//2,h-5),fill=GOLD,width=2);d.ellipse((2,3,w-3,11),fill=PAPER,outline=GOLD);rect(d,(3,h-4,w-4,h-2),WOOD)
 elif kind=='optics':
  d.ellipse((2,16,w-3,h-3),fill=EDGE,outline=GOLD);d.line((w//2,14,w//2,h-7),fill=METAL,width=4);d.ellipse((5,2,w-6,19),fill=PURPLE,outline=LIGHT)
 elif kind=='plant':
  rect(d,(5,h-10,w-6,h-3),WOOD,INK)
  for x,y in ((2,8),(7,3),(10,11),(4,16)):d.ellipse((x,y,x+5,y+10),fill='#418878',outline='#244e49')
 elif kind=='paper':
  rect(d,(1,h-6,w-2,h-2),WOOD,INK)
  for i in range(variant):
   y=h-7-i;rect(d,(3+i%2,y,w-4+i%2,y),PAPER if i%2 else '#b3a68a')
  if variant:d.line((7,h-7-variant,w-10,h-7-variant),fill=METAL)
 elif kind=='door':
  for x in (0,w-3):rect(d,(x,0,x+2,h-1),GOLD,WOOD)
  rect(d,(0,0,w-1,2),LIGHT);rect(d,(3,h-2,w-4,h-1),GOLD)
 elif kind=='star':
  rect(d,(1,1,w-2,h-2),WOOD,INK);rect(d,(3,3,w-4,h-4),'#172d4c');
  for x,y in ((8,8),(18,14),(31,7),(44,18),(21,26)):d.line((x-2,y,x+2,y),fill=GOLD);d.line((x,y-2,x,y+2),fill=GOLD)
  d.line((8,8,18,14,31,7,44,18,21,26,8,8),fill=METAL)
 # Status beacon is a tiny distinct layer on machines, never a decorative fan.
 if kind in ('rocket','rack','render','judge'):
  rect(d,(w-7,h-7,w-4,h-4),led);d.point((w-6,h-6),fill=PAPER if state=='running' and frame%2 else led)
 return im

def add(id,kind,w,h,category='decor',bg=0,variant=0,states=False):
 records=[]
 for state in (['unknown','idle','queued','running','stalled','failed','done'] if states else ['unknown']):
  for frame in range(2 if state=='running' else 1):
   aid=id if state=='unknown' else f'{id}_{state}_{frame}'
   im=sprite(kind,w,h,variant,state,frame);im.save(ROOT/(aid+'.png'));atlas.append((aid,im))
   rec=dict(type='asset',id=aid,name=id.removeprefix('N_').replace('_',' ').title(),file=aid+'.png',width=w,height=h,footprintW=w//16,footprintH=h//16,category=category,backgroundTiles=bg,orientation='back' if category=='chairs' else None,
    nebula=dict(kind=kind,state=state,frame=frame,anchor=[0,h],layer='furniture',approach='south',ambient=False))
   records.append(rec)
 assets.extend(records)
add('N_EXECUTIVE','desk-main',80,32,'desks',1)
add('N_SECONDARY','desk-secondary',48,32,'desks',1)
add('N_CLERK','clerk',64,32,'desks',1)
add('N_BENCH','bench',48,32,'desks',1)
add('N_REVIEW','review',48,32,'desks',1)
add('N_CHAIR','chair',16,16,'chairs')
add('N_ROCKET','rocket',64,96,states=True)
add('N_RACK','rack',32,48,states=True)
add('N_MATH','math',64,48,'wall',2)
add('N_RENDER','render',64,48,states=True)
add('N_JUDGE','judge',48,48,states=True)
add('N_BED','bed',48,48)
add('N_CABINET','cabinet',32,32)
add('N_LIBRARY','library',48,32)
add('N_STAR_MAP','star',48,32,'wall',2)
add('N_LAMP','lamp',16,32,'decor',2)
add('N_PLANT','plant',16,32,'decor',1)
add('N_DOOR','door',32,16,'decor',1)
add('N_OPTICS','optics',32,32)
add('N_POD_EMPTY','pod',16,32,variant=-1)
for i in range(9):add(f'N_PAPERS_{i}','paper',32,16,variant=i)
for i in range(8):add(f'N_POD_{i}','pod',16,32,variant=i)
for i in range(7):add(f'N_TELESCOPE_{i}','telescope',96,80,variant=i)
(ROOT/'manifest.json').write_text(json.dumps(dict(id='NEBULA_CAMPUS',name='Original Nebula campus',type='group',category='decor',members=assets),indent=2)+'\n')
# Contact sheet is an actual export of the registered PNGs, not a mock-up.
cols=8;cw=128;ch=128;sheet=Image.new('RGB',(cols*cw,math.ceil(len(atlas)/cols)*ch),'#152233');d=ImageDraw.Draw(sheet)
for i,(name,im) in enumerate(atlas):
 x=(i%cols)*cw;y=(i//cols)*ch;sheet.paste(im,(x+(cw-im.width)//2,y+8),im);d.text((x+4,y+108),name,fill=PAPER)
sheet.save(ROOT/'atlas.png')
# Subtle original grayscale floor patterns use the upstream colorization pipeline.
floors=ROOT.parent.parent/'nebula-floors';floors.mkdir(exist_ok=True)
for i in range(9):
 im=Image.new('RGBA',(16,16),(98+i*3,98+i*3,98+i*3,255));d=ImageDraw.Draw(im)
 if i in (1,3):
  for y in (0,8):d.line((0,y,15,y),fill='#555555');d.line((7 if y==0 else 3,y,7 if y==0 else 3,y+7),fill='#666666')
 elif i in (6,7):d.line((0,15,15,15),fill='#505050');d.line((15,0,15,15),fill='#505050');d.point((2,2),fill='#888888')
 else:d.line((0,15,15,15),fill='#696969');d.line((15,0,15,15),fill='#696969')
 im.save(floors/f'floor_{i}.png')
print(f'Authored {len(assets)} original catalog sprites, atlas and nine floors')
