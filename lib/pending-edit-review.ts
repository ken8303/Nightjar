import {observingTimeEditLabel,reviewObservingTimeEvent} from './observing-time-actions';
import {coordinateEntryEditLabel,reviewCoordinateEntryEvent} from './coordinate-entry-actions';
import {imagingDraftEditLabel,reviewImagingDraftEvent} from './imaging-draft-actions';
import {diaryFormEditLabel,reviewDiaryFormsEvent} from './diary-form-actions';
import {targetNoteEditLabel,reviewTargetNotesEvent} from './target-note-actions';
import {siteNameEditLabel,reviewSiteNameEvent} from './site-name-actions';

const actions=[
 {label:observingTimeEditLabel,event:reviewObservingTimeEvent,text:'Review time edit'},
 {label:coordinateEntryEditLabel,event:reviewCoordinateEntryEvent,text:'Review coordinates'},
 {label:imagingDraftEditLabel,event:reviewImagingDraftEvent,text:'Review imaging draft'},
 {label:diaryFormEditLabel,event:reviewDiaryFormsEvent,text:'Review diary forms'},
 {label:targetNoteEditLabel,event:reviewTargetNotesEvent,text:'Review target notes'},
 {label:siteNameEditLabel,event:reviewSiteNameEvent,text:'Review site name'},
];
export function pendingEditReviewActions(pending:string){
 const labels=new Set(pending.split(', '));
 return actions.filter(action=>labels.has(action.label));
}
// Review a globally accessible time edit first, then forms in the current
// section. Switching to another retained draft can itself be blocked by them.
export function firstPendingEditReview(pending:string,sectionPending:string){
 const available=pendingEditReviewActions(pending),current=new Set(sectionPending.split(', '));
 return available.find(action=>action.label===observingTimeEditLabel||current.has(action.label))??available[0];
}
