// Validate against the packet's published form, never a client-selected review mode.
export const reviewMode=packet=>packet.review?.mode||'pick';
export function validateReview(packet,data){
 if(!packet||!['pick','rate'].includes(reviewMode(packet))||!Array.isArray(data.trials)||data.trials.length!==packet.trials.length||new Set(data.trials.map(t=>t?.trialId)).size!==packet.trials.length)return false;
 const mode=reviewMode(packet);if(mode==='rate'&&data.mode!=='rate'||mode==='pick'&&data.mode!==undefined&&data.mode!=='pick')return false;
 return data.trials.every(t=>{const trial=packet.trials.find(x=>x.id===t?.trialId);if(!trial||typeof t.note!=='string'||t.note.length>2000)return false;const clips=trial.clips.filter(c=>c.label!=='Reference');
  if(mode==='pick')return t.ratings===undefined&&['none',...clips.map(c=>c.id)].includes(t.pick)&&Number.isInteger(t.confidence)&&t.confidence>=1&&t.confidence<=3;
  return packet.review.scale==='1-5'&&t.pick===undefined&&t.confidence===undefined&&Array.isArray(t.ratings)&&t.ratings.length===clips.length&&new Set(t.ratings.map(r=>r?.clipId)).size===clips.length&&t.ratings.every(r=>r&&clips.some(c=>c.id===r.clipId)&&Number.isInteger(r.rating)&&r.rating>=1&&r.rating<=5);
 });
}
export function reviewTrials(packet,data){return packet.trials.map(trial=>{const t=data.trials.find(t=>t.trialId===trial.id);return reviewMode(packet)==='rate'?{trialId:trial.id,ratings:trial.clips.filter(c=>c.label!=='Reference').map(c=>({clipId:c.id,rating:t.ratings.find(r=>r.clipId===c.id).rating})),note:t.note}:{trialId:trial.id,pick:t.pick,confidence:t.confidence,note:t.note};});}
