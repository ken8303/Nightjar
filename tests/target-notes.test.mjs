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
