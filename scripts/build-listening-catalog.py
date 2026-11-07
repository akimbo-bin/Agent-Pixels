"""Import only audio and blinded trial metadata; never copy guide HTML, answer keys or receipts."""
from pathlib import Path
from html.parser import HTMLParser
import json,hashlib,shutil,sys
root=Path(__file__).resolve().parents[1];out=root/'artifacts/listening-bundle';out.mkdir(parents=True,exist_ok=True);(out/'audio').mkdir(exist_ok=True)
class Guide(HTMLParser):
 def __init__(self):super().__init__();self.groups=[];self.current=[]
 def handle_starttag(self,tag,attrs):
  if tag in ('h2','h3') and self.current:self.groups.append(self.current);self.current=[]
  if tag=='audio':
   src=dict(attrs).get('src')
   if src:self.current.append(src)
 def finish(self):
  if self.current:self.groups.append(self.current)
packets=[]
inputs=[('neb318-knob','Brightness sweep listening','NEB318-Knob-Listening','2026-11-03'),('neb140-bakeoff0','Bakeoff 0 blind comparisons','NEB140-Bakeoff0-Listening','2026-11-01'),('foundation','Foundation listening','FOUNDATION-20261024-Listening',None),('pro','Pro listening','PRO-20261024-Listening',None),('audio-judge','Audio judge comparisons','AUDIO-JUDGE-20261025-Listening',None)]
for pid,title,folder,reviewed in inputs:
 base=Path('C:/Users/abmar/NebulaPrivateResearch')/folder;guide=base/'LISTENING_GUIDE.html'
 if not guide.exists():continue
 parser=Guide();parser.feed(guide.read_text(encoding='utf-8'));parser.finish();trials=[]
 for index,group in enumerate(parser.groups):
  clips=[]
  for i,src in enumerate(group):
   source=(base/src).resolve()
   if not source.is_relative_to(base.resolve()) or source.suffix.lower()!='.wav' or not source.is_file():continue
   digest=hashlib.sha256(source.read_bytes()).hexdigest();name=digest+'.wav';dest=out/'audio'/name
   if not dest.exists():shutil.copyfile(source,dest)
   stem=source.stem.lower();label='Reference' if 'reference' in stem or stem.endswith('_ref') else 'A' if stem.endswith('_a') else 'B' if stem.endswith('_b') else 'Clip '+str(i+1)
   clips.append({'id':'clip-'+str(i+1),'label':label,'audio':name})
  if clips:trials.append({'id':'t'+str(index+1).zfill(2),'prompt':'Compare the clips at a comfortable volume. Which sounds better or closer to the reference?','clips':clips})
 revision=hashlib.sha256(json.dumps(trials,sort_keys=True).encode()).hexdigest()
 packets.append({'id':pid,'title':title,'revision':revision,'historicalReview':{'status':'completed' if reviewed else 'unknown','date':reviewed},'trials':trials})
(out/'catalog.json').write_text(json.dumps({'packets':packets},indent=2),encoding='utf-8');print('Blinded listening catalog:',[(p['id'],len(p['trials'])) for p in packets])
