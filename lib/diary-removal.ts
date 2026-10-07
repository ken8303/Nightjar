import {normalizeDiary,diaryLimit,type Observation} from './observing-diary';
import {sameObservation} from './diary-drafts';
export function removeDiaryEntry(entries:Observation[],expected:Observation){
 const latest=normalizeDiary(entries),current=latest.find(entry=>entry.id===expected.id);
 if(!current)throw Error('This observation is no longer saved. Refresh the diary before removing another entry.');
 if(!sameObservation(current,expected))throw Error('This observation changed elsewhere. Review its latest version before removing it.');
 return {entries:latest.filter(entry=>entry.id!==current.id),removed:current};
}
export function restoreDiaryEntry(entries:Observation[],removed:Observation){
 const latest=normalizeDiary(entries),entry=normalizeDiary([removed])[0];
 if(latest.some(current=>current.id===entry.id))return {entries:latest,restored:false};
 if(latest.length>=diaryLimit)throw Error('The diary is full. Free space before restoring this observation.');
 return {entries:[...latest,entry],restored:true};
}
