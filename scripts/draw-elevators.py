"""Author six original 48x64 elevator pixel sprites for the Agent Pixels tile engine.
No diffusion models, image-generation APIs, external assets, or mock UI imagery.
Re-run to reproduce exactly the same PNGs and manifest entries.
"""
from __future__ import annotations
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "furniture" / "NEBULA_CAMPUS"
FONT = ImageFont.load_default()

def sprite(level:int, active:bool)->Image.Image:
    im=Image.new("RGBA",(48,64),(0,0,0,0))
    d=ImageDraw.Draw(im)
    dark="#0c122a"; outline="#1e1d35"; steel="#58436e"; light="#bd92a3"
    gold="#eec586"; golddeep="#896348"; cyan="#69e9ed"
    # Elevator bay: dark background flush with the floor, consistent 16px tiles.
    d.rectangle((0,2,47,62),fill=outline)
    d.rectangle((2,3,45,61),fill=steel)
    d.rectangle((5,6,42,57),fill=dark)
    # Lit inlaid corners, architectural side rails and overhead lintel.
    d.rectangle((2,4,5,57),fill=golddeep)
    d.rectangle((42,4,45,57),fill=golddeep)
    d.line((4,7,4,55),fill=gold,width=1)
    d.line((43,7,43,55),fill=gold,width=1)
    d.rectangle((5,7,42,15),fill="#171c47")
    d.line((5,15,42,15),fill=golddeep)
    label=f"L{level}"
    d.text((11,6),label,font=FONT,fill=gold)
    # Ascending/descending indicator is always built into the sprite.
    d.polygon([(34,8),(38,12),(30,12)],fill=cyan if active else "#92a3c0")
    # Dark shaft chamber behind panels, with strong fluorescent interior glow.
    d.rectangle((8,17,39,50),fill="#111a3b")
    for y in range(17,51,6):
        d.line((9,y,38,y),fill="#262959")
    if active:
        # Open: unoccluded central corridor, two door leaves pocketed at edges.
        d.rectangle((8,18,39,50),fill="#15254f")
        d.rectangle((16,19,31,49),fill="#073d54")
        d.line((18,20,18,49),fill="#59c0db",width=1)
        d.line((30,20,30,49),fill="#59c0db",width=1)
        d.rectangle((9,18,15,49),fill="#66759f")
        d.rectangle((32,18,38,49),fill="#66759f")
        d.line((12,18,12,49),fill="#d2b59b")
        d.line((35,18,35,49),fill="#d2b59b")
        d.line((16,50,31,50),fill="#97fff0")
    else:
        d.rectangle((8,18,23,49),fill="#3e537d")
        d.rectangle((24,18,39,49),fill="#3e537d")
        d.rectangle((10,20,21,46),fill="#506892")
        d.rectangle((26,20,37,46),fill="#506892")
        d.line((23,18,23,49),fill="#e7c49d")
        d.line((24,18,24,49),fill="#172044")
        # Brushed vertical metal highlights.
        d.line((12,22,12,44),fill="#8090ac")
        d.line((35,22,35,44),fill="#8090ac")
        d.rectangle((17,31,21,33),fill="#7bdfdf")
        d.rectangle((27,31,31,33),fill="#7bdfdf")
    # Sprite bottom is a transparent, navigable landing, not a collision mask.
    d.rectangle((6,52,41,57),fill="#242d50")
    d.line((6,52,41,52),fill=cyan if active else "#8e78aa")
    d.line((7,57,40,57),fill=golddeep)
    d.rectangle((10,59,37,61),fill="#463750")
    for x in (14,23,32):
        d.rectangle((x,60,x+2,61),fill=cyan if active else "#bba478")
    return im

def append_manifest(entries:list[dict]):
    manifest=OUT/"manifest.json"
    raw=manifest.read_bytes()
    newline="\r\n" if b"\r\n" in raw else "\n"
    data=json.loads(raw)
    existing={m.get("id") for m in data["members"]}
    adding=[v for v in entries if v["id"] not in existing]
    if not adding:
        print("MANIFEST_EXISTS",len(entries))
        return
    data["members"].extend(adding)
    # Preserve the manifest's original line ending to keep diffs reviewable.
    formatted=json.dumps(data,indent=2,ensure_ascii=False)+"\n"
    manifest.write_bytes(formatted.replace("\n",newline).encode("utf-8"))
    print("MANIFEST_ADDED",len(adding))

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    entries=[]
    for level in (1,2,3):
        for active in (False,True):
            id=f"N_ELEVATOR_{level}"+("_ACTIVE" if active else "")
            filename=id+".png"
            sprite(level,active).save(OUT/filename,optimize=True)
            entries.append(dict(
                type="asset",id=id,name=f"Elevator L{level}"+(" active" if active else ""),
                file=filename,width=48,height=64,footprintW=3,footprintH=4,
                category="decor",backgroundTiles=4,orientation=None,
                renderLayer="ground",nebula=dict(kind="elevator",
                    state="active" if active else "idle",
                    frame=0,anchor=[0,64],layer="ground",
                    approach="south",ambient=False),
            ))
    append_manifest(entries)
    print("CREATED",[(x["id"],x["width"],x["height"]) for x in entries])

if __name__=="__main__":main()
