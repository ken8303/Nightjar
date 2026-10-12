import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {createPendingEdits}=await vite.ssrLoadModule('/lib/pending-edits.ts');
const {firstPendingEditReview,pendingEditReviewActions}=await vite.ssrLoadModule('/lib/pending-edit-review.ts');
const {imagingDraftEditLabel,reviewImagingDraftEvent}=await vite.ssrLoadModule('/lib/imaging-draft-actions.ts');
const {diaryFormEditLabel,reviewDiaryFormsEvent}=await vite.ssrLoadModule('/lib/diary-form-actions.ts');
const {observingTimeEditLabel,reviewObservingTimeEvent}=await vite.ssrLoadModule('/lib/observing-time-actions.ts');
test('current-section forms are reviewed before a retained draft that requires leaving them',()=>{
 const store=createPendingEdits(),imaging=Symbol(),diary=Symbol();
 store.change(imaging,{section:'tools',label:imagingDraftEditLabel,retainedAcrossSections:true});
 store.change(diary,{section:'sky',label:diaryFormEditLabel});
 assert.equal(firstPendingEditReview(store.snapshot(),store.snapshot('sky')).event,reviewDiaryFormsEvent);
 store.change(diary,null);assert.equal(firstPendingEditReview(store.snapshot(),store.snapshot('sky')).event,reviewImagingDraftEvent);
});
test('a global time edit is reviewed first without leaving the current section',()=>{
 const store=createPendingEdits();store.change(Symbol(),{section:'sky',label:diaryFormEditLabel});
 store.change(Symbol(),{section:'observing-time',label:observingTimeEditLabel,retainedAcrossSections:true,contextSensitive:true});
 assert.equal(firstPendingEditReview(store.snapshot(),store.snapshot('sky')).event,reviewObservingTimeEvent);
});
test('review matching excludes unknown or partial labels and removes duplicate actions',()=>{
 assert.equal(firstPendingEditReview('',diaryFormEditLabel),undefined);
 assert.equal(firstPendingEditReview('other form, '+imagingDraftEditLabel+' extra',''),undefined);
 const pending=[diaryFormEditLabel,'other form',diaryFormEditLabel].join(', ');
 assert.equal(pendingEditReviewActions(pending).length,1);assert.equal(firstPendingEditReview(pending,'').event,reviewDiaryFormsEvent);
});
