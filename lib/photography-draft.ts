export type PhotographyDraft={width:string;height:string;focal:string;pixel:string;name:string;ra:string;dec:string;cols:string;rows:string;overlap:string;rotation:string;rms:string;catalogueId:string};
const key='nightjar-imaging-draft-v1';
const defaults:PhotographyDraft={width:'36',height:'24',focal:'400',pixel:'3.76',name:'My imaging setup',ra:'0.7123194444444444',dec:'41.26905555555555',cols:'2',rows:'2',overlap:'20',rotation:'0',rms:'0.8',catalogueId:'M31'};
export function defaultPhotographyDraft():PhotographyDraft{return {...defaults}}
export function parsePhotographyDraft(value:unknown):PhotographyDraft|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const raw=value as Record<string,unknown>;
 if(raw.version!==1||!raw.draft||typeof raw.draft!=='object'||Array.isArray(raw.draft))return null;
 const draft=raw.draft as Record<string,unknown>;
 for(const field of Object.keys(defaults) as (keyof PhotographyDraft)[]){
  const text=draft[field];if(typeof text!=='string')return null;
  if(field==='name'){if(text.length>80)return null}
  else if(field==='catalogueId'){if(text!==''&&!/^M(?:[1-9]|[1-9]\d|10[013-9]|110)$/.test(text))return null}
  // Drafts retain bounded raw text, including invalid/incomplete input.
  // Calculation and saved-equipment validation are separate.
  else if(text.length>40)return null;
 }
 return Object.fromEntries(Object.keys(defaults).map(field=>[field,draft[field]])) as PhotographyDraft;
}
export function readPhotographyDraft(storage?:Pick<Storage,'getItem'>):{draft:PhotographyDraft;status:'new'|'restored'|'invalid'|'visit'}{
 try{
  const raw=(storage??localStorage).getItem(key);
  if(raw===null)return {draft:defaultPhotographyDraft(),status:'new'};
  let value:unknown;try{value=raw.length<=4096?JSON.parse(raw):null}catch{return {draft:defaultPhotographyDraft(),status:'invalid'}}
  const draft=parsePhotographyDraft(value);
  return {draft:draft??defaultPhotographyDraft(),status:draft?'restored':'invalid'};
 }catch{return {draft:defaultPhotographyDraft(),status:'visit'}}
}
export function savePhotographyDraft(draft:PhotographyDraft,storage?:Pick<Storage,'setItem'>){
 const parsed=parsePhotographyDraft({version:1,draft});if(!parsed)return false;
 try{(storage??localStorage).setItem(key,JSON.stringify({version:1,draft:parsed}));return true}catch{return false}
}
export function makePhotographyDraftRecovery(draft:PhotographyDraft,created=new Date()){
 const parsed=parsePhotographyDraft({version:1,draft});
 if(!parsed)throw Error('The imaging draft could not be prepared. Keep this view open and copy its fields.');
 if(!Number.isFinite(+created))throw Error('A valid recovery-copy time is required.');
 const exportedAt=created.toISOString();
 return {exportedAt,text:JSON.stringify({format:'nightjar-imaging-recovery',version:1,exportedAt,notice:'Manual recovery copy of the imaging draft held in this visit. It excludes saved equipment profiles and cannot be imported as a Nightjar plan backup.',draft:parsed},null,2)};
}
