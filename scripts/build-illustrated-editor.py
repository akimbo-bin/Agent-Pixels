"""Rebuild the self-contained editor from its readable template and local art."""
from pathlib import Path
import base64,sys,json
root=Path(__file__).resolve().parent.parent
art=root/'artifacts/illustrated-map/nebula-full-building-ai-2x.png'
sprite=root/'public/assets/characters/char_0.png'
text=(root/'dev/engine/illustrated-editor.template.html').read_text(encoding='utf-8')
for name,file in [('ART',art),('SPRITE',sprite)]:
    text=text.replace('@@'+name+'@@','data:image/png;base64,'+base64.b64encode(file.read_bytes()).decode())
text=text.replace('@@APPROVED_MAP@@',(root/'dev/engine/approved-map.json').read_text(encoding='utf-8')).replace('@@ELEVATOR_SLICES@@',(root/'dev/engine/elevator-slices.json').read_text(encoding='utf-8')).replace('@@ELEVATOR@@',(root/'dev/engine/illustrated-elevator.js').read_text(encoding='utf-8'))
text=text.replace('@@SHARED_WORKSPACES@@',(root/'dev/engine/shared-workspaces.json').read_text(encoding='utf-8'))
text=text.replace('@@TERRACE_PROPS@@',(root/'dev/engine/terrace-props.json').read_text(encoding='utf-8'))
text=text.replace('@@SMART_MASKS@@',(root/'dev/engine/illustrated-smart-masks.js').read_text(encoding='utf-8'))
text=text.replace('@@SEATS@@',(root/'dev/engine/illustrated-seats.js').read_text(encoding='utf-8'))

text=text.replace('@@PORTAL@@',(root/'dev/engine/illustrated-portal.js').read_text(encoding='utf-8'))

text=text.replace('@@LIGHTING@@',(root/'dev/engine/illustrated-lighting.js').read_text(encoding='utf-8'))

text=text.replace('@@TURBINES@@',(root/'dev/engine/illustrated-turbines.js').read_text(encoding='utf-8'))

text=text.replace('@@SCREENS@@',(root/'dev/engine/illustrated-screens.js').read_text(encoding='utf-8'))
text=text.replace('@@ROOM_DISPLAYS@@',(root/'dev/engine/illustrated-room-displays.js').read_text(encoding='utf-8'))
text=text.replace('@@SCREEN_ART@@',(root/'dev/engine/illustrated-screen-art.js').read_text(encoding='utf-8'))
text=text.replace('@@SCREEN_PROGRAMS@@',(root/'dev/engine/illustrated-screen-programs.js').read_text(encoding='utf-8'))

text=text.replace('@@STARS@@',(root/'dev/engine/illustrated-stars.js').read_text(encoding='utf-8'))

text=text.replace('@@OFFICE_SYMBOLS@@',(root/'dev/engine/illustrated-office-symbols.js').read_text(encoding='utf-8'))
text=text.replace('@@HUD@@',(root/'dev/engine/illustrated-hud.js').read_text(encoding='utf-8')).replace('@@HUD_CSS@@',(root/'dev/engine/illustrated-hud.css').read_text(encoding='utf-8'))

sprites=[{'src':'data:image/png;base64,'+base64.b64encode(file.read_bytes()).decode()} for file in sorted((root/'public/assets/characters').glob('char_*.png'),key=lambda p:int(p.stem.split('_')[-1]))]
text=text.replace('@@COFFEE@@',(root/'dev/engine/illustrated-coffee.js').read_text(encoding='utf-8'))
text=text.replace('@@CHARACTERS@@',(root/'dev/engine/illustrated-characters.js').read_text(encoding='utf-8')).replace('@@CHARACTER_SPRITES@@',json.dumps(sprites))

text=text.replace('@@HARDWARE@@',(root/'dev/engine/illustrated-hardware.js').read_text(encoding='utf-8'))

text=text.replace('@@AMBIENT@@',(root/'dev/engine/illustrated-ambient.js').read_text(encoding='utf-8'))

text=text.replace('@@AGENT_MOTION@@',(root/'dev/engine/illustrated-agent-motion.js').read_text(encoding='utf-8'))

text=text.replace('@@ROOM_STATES@@',(root/'dev/engine/illustrated-room-states.js').read_text(encoding='utf-8'))

text=text.replace('@@PIXEL_FONT@@','data:font/ttf;base64,'+base64.b64encode((root/'public/assets/fonts/silkscreen/Silkscreen-Regular.ttf').read_bytes()).decode())
font_license=(root/'public/assets/fonts/silkscreen/OFL.txt').read_text(encoding='utf-8')
text=text.replace('</head>','<script type="text/plain" id="pixel-font-license">'+font_license+'</script>\n</head>')

text=text.replace('@@DASHBOARD@@',(root/'dev/engine/illustrated-dashboard.js').read_text(encoding='utf-8'))
text=text.replace('@@EDITOR_UI@@',(root/'dev/engine/illustrated-editor-ui.js').read_text(encoding='utf-8'))
text=text.replace('@@MOBILE@@',(root/'dev/engine/illustrated-touch.js').read_text(encoding='utf-8'))
text=text.replace('</style>',(root/'dev/engine/illustrated-mobile.css').read_text(encoding='utf-8')+'\n</style>',1)

text=text.replace('</style>',(root/'dev/engine/illustrated-dashboard.css').read_text(encoding='utf-8')+'\n</style>',1)

text=text.replace('</style>',(root/'dev/engine/illustrated-editor-ui.css').read_text(encoding='utf-8')+'\n</style>',1)

target=root/'dev/engine/illustrated-walk-prototype.html'
target.write_text(text,encoding='utf-8')
if '--serve-copy' in sys.argv:
    dest=root.parent/'AgentPixelsEngine/dev/engine/review/illustrated-walk'
    dest.mkdir(parents=True,exist_ok=True)
    (dest/'index.html').write_bytes(target.read_bytes())
    (dest/art.name).write_bytes(art.read_bytes())
print(target)
