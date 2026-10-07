import {normalizeDiary,type Observation} from './observing-diary';
export const diaryDraftKey='nightjar-diary-drafts-v1';
export type DiaryDraftState={drafts:Observation[];edit:{original:Observation;draft:Observation}|null};
export function emptyDiaryDrafts():DiaryDraftState{return {drafts:[],edit:null}}
export function sameObservation(first:Observation,second:Observation){return JSON.stringify(normalizeDiary([first])[0])===JSON.stringify(normalizeDiary([second])[0])}
export function normalizeDiaryDrafts(value:unknown):DiaryDraftState{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid diary draft.');
 const raw=value as Record<string,unknown>;
 if(raw.version!==1||!Array.isArray(raw.drafts)||raw.drafts.length>109)throw Error('Invalid diary draft.');
 const drafts=normalizeDiary(raw.drafts);
 if(new Set(drafts.map(entry=>entry.target)).size!==drafts.length)throw Error('Duplicate diary drafts.');
 let edit:DiaryDraftState['edit']=null;
 if(raw.edit!==null){
  if(!raw.edit||typeof raw.edit!=='object')throw Error('Invalid diary edit draft.');
  const candidate=raw.edit as Record<string,unknown>,original=normalizeDiary([candidate.original])[0],draft=normalizeDiary([candidate.draft])[0];
  if(!sameObservation(original,{...draft,outcome:original.outcome,equipment:original.equipment,notes:original.notes}))throw Error('An edit draft changed observation metadata.');
  edit={original,draft};
 }
 return {drafts,edit};
}
export function readStoredDiaryDrafts(storage:Pick<Storage,'getItem'>):DiaryDraftState{
 const raw=storage.getItem(diaryDraftKey);
 if(raw===null)return emptyDiaryDrafts();
 if(raw.length>1024*1024)throw Error('The unfinished diary forms are too large.');
 return normalizeDiaryDrafts(JSON.parse(raw));
}
export function readDiaryDrafts(storage?:Pick<Storage,'getItem'>):{state:DiaryDraftState;status:string}{
 try{const state=readStoredDiaryDrafts(storage??localStorage);return {state,status:state.drafts.length||state.edit?'Unfinished diary forms restored from this browser.':''}}
 catch{return {state:emptyDiaryDrafts(),status:'Unfinished forms could not be restored. Existing stored drafts are preserved; saving forms is unavailable until storage can be read.'}}
}
// Apply only changes made against the last successfully read/saved snapshot.
// Unrelated forms keep their latest values; conflicting text is never overwritten.
export function mergeDiaryDraftChanges(base:DiaryDraftState,desired:DiaryDraftState,latest:DiaryDraftState):DiaryDraftState{
 const normalize=(state:DiaryDraftState)=>normalizeDiaryDrafts({version:1,...state});
 const previous=normalize(base),next=normalize(desired),current=normalize(latest);
 const equal=(a:Observation|undefined,b:Observation|undefined)=>a===undefined||b===undefined?a===b:sameObservation(a,b);
 const targets=new Set([...previous.drafts,...next.drafts].map(entry=>entry.target));
 let drafts=[...current.drafts];
 for(const target of targets){
  const before=previous.drafts.find(entry=>entry.target===target),after=next.drafts.find(entry=>entry.target===target);
  if(equal(before,after))continue;
  const stored=current.drafts.find(entry=>entry.target===target);
  if(!equal(stored,before)&&!equal(stored,after))throw Error(`The unfinished ${target} form changed in another tab. Your text is retained here; review the latest form before replacing it.`);
  drafts=drafts.filter(entry=>entry.target!==target);if(after)drafts.push(after);
 }
 const equalEdit=(a:DiaryDraftState['edit'],b:DiaryDraftState['edit'])=>a===null||b===null?a===b:sameObservation(a.original,b.original)&&sameObservation(a.draft,b.draft);
 let edit=current.edit;
 if(!equalEdit(previous.edit,next.edit)){
  if(!equalEdit(current.edit,previous.edit)&&!equalEdit(current.edit,next.edit))throw Error('The diary edit form changed in another tab. Your text is retained here; review the latest edit before replacing it.');
  edit=next.edit;
 }
 return normalize({drafts,edit});
}
export function saveDiaryDrafts(state:DiaryDraftState,storage?:Pick<Storage,'setItem'>){try{(storage??localStorage).setItem(diaryDraftKey,JSON.stringify({version:1,...normalizeDiaryDrafts({version:1,...state})}));return true}catch{return false}}

export function discardCompletedDrafts(state:DiaryDraftState,saved:Observation[]):DiaryDraftState{return {...state,drafts:state.drafts.filter(draft=>!saved.some(entry=>entry.id===draft.id&&sameObservation(entry,draft)))}}
