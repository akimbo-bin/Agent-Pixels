"""CPU-only Real-ESRGAN comparison; no ComfyUI server or Nebula pause."""
import os
os.environ['CUDA_VISIBLE_DEVICES']=''
os.environ['OMP_NUM_THREADS']='2'
os.environ['MKL_NUM_THREADS']='2'
import ctypes,hashlib,json,time
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import torch
import spandrel

if os.name=='nt':
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(),0x4000)
torch.set_num_threads(2)
torch.set_num_interop_threads(1)
source=Path('C:/Users/abmar/Downloads/8a8c2bde-8bc6-4103-91c2-5f257de3e645.png')
weights=Path('F:/AgentPixelsModels/upscale_models/RealESRGAN_x2plus.pth')
out=Path('artifacts/illustrated-map/ai-trial-v1');out.mkdir(parents=True,exist_ok=True)
if (out/'comparison.png').exists():raise RuntimeError('Trial already exists; choose a new version')
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
provenance={'model':'RealESRGAN_x2plus','url':'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth','license':'BSD-3-Clause','licenseFile':'Real-ESRGAN-LICENSE.txt','sha256':digest(weights),'bytes':weights.stat().st_size}
weights.with_suffix('.provenance.json').write_text(json.dumps(provenance,indent=2),encoding='utf-8')
state=torch.load(weights,map_location='cpu',weights_only=True)
model=spandrel.ModelLoader(device='cpu').load_from_state_dict(state)
model.model.eval();model.model.to('cpu')
assert model.scale==2
assert next(model.model.parameters()).device.type=='cpu'
image=Image.open(source).convert('RGB')
regions=[('Lead office',(240,292,496,452)),('Observatory',(907,264,1163,424))]
sheet=Image.new('RGB',(1560,782),'#191426');draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',20)
for col,label in enumerate(['Original pixels · 2×','Gentle AI · 50% blend','AI super-resolution · 100%']):draw.text((col*520+12,10),label,font=font,fill='#eee5f5')
records=[]
for row,(name,bounds) in enumerate(regions):
    crop=image.crop(bounds);crop.save(out/f'crop-{row}.png')
    x=torch.from_numpy(np.asarray(crop).copy()).permute(2,0,1).unsqueeze(0).float().div_(255)
    started=time.monotonic()
    with torch.inference_mode():y=model(x).clamp_(0,1)
    result=Image.fromarray(y.squeeze(0).permute(1,2,0).mul(255).round().byte().numpy())
    assert result.size==(crop.width*2,crop.height*2)
    nearest=crop.resize(result.size,Image.Resampling.NEAREST)
    gentle=Image.blend(nearest,result,.5)
    for suffix,im in [('original-2x',nearest),('ai-50',gentle),('ai-100',result)]:im.save(out/f'crop-{row}-{suffix}.png')
    y0=48+row*365;draw.text((12,y0),name,font=font,fill='#bfb0d2')
    for col,im in enumerate([nearest,gentle,result]):sheet.paste(im,(col*520+4,y0+30))
    records.append({'name':name,'bounds':bounds,'seconds':round(time.monotonic()-started,2),'aiSha256':digest(out/f'crop-{row}-ai-100.png')})
    print(name+' CPU upscale complete',flush=True)
sheet.save(out/'comparison.png')
receipt={'source':str(source),'sourceSha256':digest(source),'sourceSize':image.size,'model':provenance,'device':'cpu','threads':2,'priority':'below-normal','comfyUsed':False,'nebulaPaused':False,'crops':records,'blend':'50% nearest-neighbor enlarged source + 50% Real-ESRGAN output','fullImageProcessed':False,'comparison':str((out/'comparison.png').resolve())}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
print('Saved comparison: '+str((out/'comparison.png').resolve()),flush=True)
