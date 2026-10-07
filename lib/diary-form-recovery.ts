import {normalizeDiaryDrafts,type DiaryDraftState} from './diary-drafts';
import type {Observation} from './observing-diary';
export const diaryFormRecoveryMaxBytes=2*1024*1024;
export function makeDiaryFormRecovery(state:DiaryDraftState,created=new Date()){
 if(!Number.isFinite(+created))throw Error('A valid recovery-copy time is required.');
 const data=normalizeDiaryDrafts({version:1,...state}),exportedAt=created.toISOString();
 const country=(entry:Observation,source:Observation)=>source.place.country===undefined?entry:{...entry,place:{...entry.place,country:source.place.country}};
 data.drafts=data.drafts.map((entry,index)=>country(entry,state.drafts[index]));
 if(data.edit&&state.edit)data.edit={original:country(data.edit.original,state.edit.original),draft:country(data.edit.draft,state.edit.draft)};
 const copy={format:'nightjar-form-recovery',version:1,exportedAt,notice:'Manual recovery copy of unfinished forms held in this view. It contains active forms and any original observation attached to an edit, not the full saved diary. It may omit newer changes from other tabs, and cannot be imported as a Nightjar plan backup.',data};
 const text=JSON.stringify(copy,null,2);
 if(new TextEncoder().encode(text).length>diaryFormRecoveryMaxBytes)throw Error('This form recovery copy is too large to prepare. Your text is still in this view.');
 return {text,exportedAt,forms:data.drafts.length+(data.edit?1:0)};
}
