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
export function readDiaryDrafts(storage?:Pick<Storage,'getItem'>):{state:DiaryDraftState;status:string}{
 try{const raw=(storage??localStorage).getItem(diaryDraftKey);if(raw===null)return {state:emptyDiaryDrafts(),status:''};if(raw.length>1024*1024)throw Error();return {state:normalizeDiaryDrafts(JSON.parse(raw)),status:'Unfinished diary forms restored from this browser.'}}
 catch{return {state:emptyDiaryDrafts(),status:'Unfinished forms could not be restored. Existing stored drafts stay untouched until you edit a form.'}}
}
export function saveDiaryDrafts(state:DiaryDraftState,storage?:Pick<Storage,'setItem'>){try{(storage??localStorage).setItem(diaryDraftKey,JSON.stringify({version:1,...normalizeDiaryDrafts({version:1,...state})}));return true}catch{return false}}

export function discardCompletedDrafts(state:DiaryDraftState,saved:Observation[]):DiaryDraftState{return {...state,drafts:state.drafts.filter(draft=>!saved.some(entry=>entry.id===draft.id&&sameObservation(entry,draft)))}}
