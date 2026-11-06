"""Extract the exact native AI-master pixels used for elevator animation."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent
source=root/'artifacts/illustrated-map/nebula-full-building-ai-2x.png'
spec=json.loads((root/'dev/engine/elevator-slices.json').read_text(encoding='utf-8'))
out=root/'artifacts/illustrated-map/elevator';out.mkdir(parents=True,exist_ok=True)
image=Image.open(source)
receipt={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'nativeCoordinates':spec,'scale':2,'files':[]}
for floor in ['upper','ground']:
    x,y,w,h=spec[floor]['closedSource'];closed=image.crop((x*2,y*2,(x+w)*2,(y+h)*2));closed.save(out/(floor+'-closed.png'))
    half=closed.width//2
    for name,box in [('left',(0,0,half,closed.height)),('right',(half,0,closed.width,closed.height))]:
        file=floor+'-door-'+name+'.png';closed.crop(box).save(out/file);receipt['files'].append(file)
x,y,w,h=spec['cabinSource'];image.crop((x*2,y*2,(x+w)*2,(y+h)*2)).save(out/'middle-open-cabin.png');receipt['files'].append('middle-open-cabin.png')
(out/'receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
print(out)
