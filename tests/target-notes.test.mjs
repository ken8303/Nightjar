import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {targetNotesKey,readTargetNotes,overlayTargetNoteEdits,applyTargetNoteEdits,saveTargetNotes}=await vite.ssrLoadModule('/lib/target-notes.ts');
const full=()=>Object.fromEntries(Array.from({length:100},(_,index)=>[`Archived note ${index}`,`Original ${index}\n星空`]));
test('a pending note at capacity stays visible but cannot produce an unexportable saved collection',()=>{
 const saved=full(),before=structuredClone(saved),view=overlayTargetNoteEdits(saved,{Vega:'New note'});
 assert.equal(Object.keys(view).length,101);assert.equal(view.Vega,'New note');assert.throws(()=>applyTargetNoteEdits(saved,{Vega:'New note'}),/100 target notes/);
 let writes=0;assert.throws(()=>saveTargetNotes(view,{setItem(){writes++}}));assert.equal(writes,0);assert.deepEqual(saved,before);
 const next=applyTargetNoteEdits(saved,{'Archived note 0':'',Vega:'New note'});assert.equal(Object.keys(next).length,100);assert.equal(next.Vega,'New note');assert.equal(next['Archived note 0'],undefined);
});
test('latest stored notes merge with retained edits without losing unrelated cross-tab changes',()=>{
 const latest={Vega:'A newer saved version',Polaris:'Updated elsewhere'},edits={Vega:'My unsaved draft',Sirius:'Another draft'};
 const combined=applyTargetNoteEdits(latest,edits);assert.equal(combined.Vega,edits.Vega);assert.equal(combined.Polaris,latest.Polaris);assert.equal(combined.Sirius,edits.Sirius);assert.equal(latest.Vega,'A newer saved version');
});
test('oversized legacy notes remain readable until explicitly reduced to the shared saved limit',()=>{
 const legacy={...full(),Vega:'Old extra note'},storage={getItem:()=>JSON.stringify(legacy)};
 assert.deepEqual(readTargetNotes(storage),legacy);assert.throws(()=>saveTargetNotes(legacy,{setItem(){assert.fail('must not write')}}));
 const recovered=applyTargetNoteEdits(readTargetNotes(storage),{'Archived note 0':''});assert.equal(Object.keys(recovered).length,100);assert.equal(recovered.Vega,'Old extra note');
});
test('note persistence retains full Unicode/multiline text and refuses malformed data or blocked storage',()=>{
 const notes={Vega:'星空\n'+ 'x'.repeat(1997)};let stored;
 saveTargetNotes(notes,{setItem(key,value){assert.equal(key,targetNotesKey);stored=value}});assert.deepEqual(readTargetNotes({getItem:()=>stored}),notes);
 for(const value of [[],null,{Vega:23},{Vega:'x'.repeat(2001)},JSON.parse('{"__proto__":"bad"}')])assert.throws(()=>readTargetNotes({getItem:()=>JSON.stringify(value)}));
 assert.throws(()=>saveTargetNotes(notes,{setItem(){throw Error('quota')}}),/quota/);
});

test('retry merge refuses conflicting replacement, deletion and creation while retaining exact pending text',async()=>{
 const {mergeTargetNoteChanges,targetNoteConflicts}=await vite.ssrLoadModule('/lib/target-notes.ts');
 for(const [base,edits,latest] of [[{Vega:'Original'},{Vega:'Local 星空'},{Vega:'Peer'}],[{Vega:'Original'},{Vega:''},{Vega:'Peer'}],[{Vega:null},{Vega:'Local'},{Vega:'Peer'}],[{Vega:'Original'},{Vega:'Local'},{}]]){const before=structuredClone([base,edits,latest]);assert.deepEqual(targetNoteConflicts(base,edits,latest),['Vega']);assert.throws(()=>mergeTargetNoteChanges(base,edits,latest),/changed elsewhere/);assert.deepEqual([base,edits,latest],before)}
 assert.deepEqual(mergeTargetNoteChanges({Vega:'Original'},{Vega:'Local'},{Vega:'Local',Polaris:'Peer unrelated'}),{Vega:'Local',Polaris:'Peer unrelated'});assert.deepEqual(mergeTargetNoteChanges({Vega:''},{Vega:''},{}),{});assert.throws(()=>mergeTargetNoteChanges({},{Vega:'Local'},{}),/original note version/);
});
test('review choices affect only reviewed conflicts and preserve unrelated pending and newer saved notes',async()=>{
 const {resolveTargetNoteConflicts,mergeTargetNoteChanges}=await vite.ssrLoadModule('/lib/target-notes.ts');const base={Vega:'Original',Sirius:null},edits={Vega:'Local 星空',Sirius:'Pending unrelated'},reviewed={Vega:'Peer'},current={...reviewed,Polaris:'Later unrelated'},before=structuredClone([base,edits,reviewed,current]);
 for(const choice of ['local','stored']){const next=resolveTargetNoteConflicts(base,edits,reviewed,current,choice);assert.deepEqual(mergeTargetNoteChanges(next.base,next.edits,current),{Vega:choice==='local'?'Local 星空':'Peer',Sirius:'Pending unrelated',Polaris:'Later unrelated'})}assert.deepEqual([base,edits,reviewed,current],before);
 assert.throws(()=>resolveTargetNoteConflicts(base,edits,reviewed,{Vega:'Changed again'},'local'),/changed again/);assert.throws(()=>resolveTargetNoteConflicts(base,edits,reviewed,{Vega:'Changed again'},'stored'),/changed again/);
});
test('reviewing removal conflicts preserves explicit choices and respects saved capacity',async()=>{
 const {resolveTargetNoteConflicts,mergeTargetNoteChanges}=await vite.ssrLoadModule('/lib/target-notes.ts');const base={Vega:'Old'},edits={Vega:''},current={Vega:'Peer',Polaris:'Unrelated'};
 const mine=resolveTargetNoteConflicts(base,edits,current,current,'local');assert.deepEqual(mergeTargetNoteChanges(mine.base,mine.edits,current),{Polaris:'Unrelated'});const peer=resolveTargetNoteConflicts(base,edits,current,current,'stored');assert.deepEqual(mergeTargetNoteChanges(peer.base,peer.edits,current),current);
 assert.throws(()=>mergeTargetNoteChanges({Vega:null},{Vega:'New'},full()),/100 target notes/);
});
