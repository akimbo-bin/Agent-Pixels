"""Tiled, CPU-only upscale of the owner's approved expanded master."""
import os
os.environ.update(CUDA_VISIBLE_DEVICES='',OMP_NUM_THREADS='2',MKL_NUM_THREADS='2')
import ctypes,json,hashlib,time
from pathlib import Path
import numpy as np
from PIL import Image
import torch,spandrel
if os.name=='nt':ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(),0x4000)
torch.set_num_threads(2);torch.set_num_interop_threads(1)
source=Path('C:/Users/abmar/Downloads/8a8c2bde-8bc6-4103-91c2-5f257de3e645.png');weights=Path('F:/AgentPixelsModels/upscale_models/RealESRGAN_x2plus.pth');out=Path('artifacts/illustrated-map');target=out/'nebula-full-building-ai-2x.png';out.mkdir(parents=True,exist_ok=True)
if target.exists():raise RuntimeError('Output already exists; preserve it')
model=spandrel.ModelLoader(device='cpu').load_from_state_dict(torch.load(weights,map_location='cpu',weights_only=True));model.model.eval().to('cpu');assert model.scale==2
image=Image.open(source).convert('RGB');W,H=image.size;result=Image.new('RGB',(W*2,H*2));tile=192;halo=32;started=time.monotonic();count=0
for top in range(0,H,tile):
 for left in range(0,W,tile):
  right=min(W,left+tile);bottom=min(H,top+tile);x0=max(0,left-halo);y0=max(0,top-halo);x1=min(W,right+halo);y1=min(H,bottom+halo)
  crop=image.crop((x0,y0,x1,y1));x=torch.from_numpy(np.asarray(crop).copy()).permute(2,0,1).unsqueeze(0).float().div_(255)
  with torch.inference_mode():y=model(x).clamp_(0,1)
  im=Image.fromarray(y.squeeze().permute(1,2,0).mul(255).round().byte().numpy());im=im.crop(((left-x0)*2,(top-y0)*2,(right-x0)*2,(bottom-y0)*2));result.paste(im,(left*2,top*2));count+=1
 print(f'Completed row {top//tile+1}; {count} tiles',flush=True)
result.save(target);receipt={'source':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceSize':[W,H],'outputSize':list(result.size),'model':'RealESRGAN_x2plus','modelSha256':hashlib.sha256(weights.read_bytes()).hexdigest(),'license':'BSD-3-Clause','device':'cpu','threads':2,'tile':tile,'halo':halo,'tiles':count,'seconds':round(time.monotonic()-started,1),'comfyUsed':False,'nebulaPaused':False,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()};target.with_suffix('.receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(str(target.resolve()),flush=True)
