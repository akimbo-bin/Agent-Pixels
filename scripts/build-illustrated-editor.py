"""Rebuild the self-contained editor from its readable template and local art."""
from pathlib import Path
import base64,sys
root=Path(__file__).resolve().parent.parent
art=root/'artifacts/illustrated-map/nebula-full-building-ai-2x.png'
sprite=root/'public/assets/characters/char_0.png'
text=(root/'dev/engine/illustrated-editor.template.html').read_text(encoding='utf-8')
for name,file in [('ART',art),('SPRITE',sprite)]:
    text=text.replace('@@'+name+'@@','data:image/png;base64,'+base64.b64encode(file.read_bytes()).decode())
text=text.replace('@@APPROVED_MAP@@',(root/'dev/engine/approved-map.json').read_text(encoding='utf-8')).replace('@@ELEVATOR_SLICES@@',(root/'dev/engine/elevator-slices.json').read_text(encoding='utf-8')).replace('@@ELEVATOR@@',(root/'dev/engine/illustrated-elevator.js').read_text(encoding='utf-8'))
text=text.replace('@@SEATS@@',(root/'dev/engine/illustrated-seats.js').read_text(encoding='utf-8'))

target=root/'dev/engine/illustrated-walk-prototype.html'
target.write_text(text,encoding='utf-8')
if '--serve-copy' in sys.argv:
    dest=root.parent/'AgentPixelsEngine/dev/engine/review/illustrated-walk'
    dest.mkdir(parents=True,exist_ok=True)
    (dest/'index.html').write_bytes(target.read_bytes())
    (dest/art.name).write_bytes(art.read_bytes())
print(target)
