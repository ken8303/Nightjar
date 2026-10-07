import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {readDiaryDrafts,saveDiaryDrafts,normalizeDiaryDrafts,sameObservation,discardCompletedDrafts,mergeDiaryDraftChanges,readStoredDiaryDrafts,diaryDraftConflicts,resolveDiaryDraftConflicts}=await vite.ssrLoadModule('/lib/diary-drafts.ts');
const entry={id:'draft-M31',target:'M31',observedAt:'2026-10-06T20:00:00.000Z',place:{name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'},outcome:'seen',equipment:'',notes:'Unfinished\n星空'};
test('new and edit drafts retain original metadata and unfinished text without touching saved observations',()=>{
 const values=new Map([['nightjar-observing-diary-v1','existing saved records']]),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 assert.deepEqual(readDiaryDrafts(storage).state,{drafts:[],edit:null});const state={drafts:[entry],edit:{original:{...entry,id:'record-1'},draft:{...entry,id:'record-1',notes:'Pending edit'}}};assert(saveDiaryDrafts(state,storage));assert.deepEqual(readDiaryDrafts(storage).state,state);assert.equal(values.get('nightjar-observing-diary-v1'),'existing saved records');assert(!sameObservation(state.edit.original,state.edit.draft));assert(sameObservation(entry,{...entry,ignored:'extra'}));
 assert(readDiaryDrafts(storage).status.includes('restored'));assert(saveDiaryDrafts({drafts:[],edit:null},storage));assert.equal(readDiaryDrafts(storage).status,'');
});
test('corrupt, future or oversized drafts remain untouched and blocked storage reports failure',()=>{
 for(const raw of ['{',JSON.stringify({version:2,drafts:[],edit:null}),'x'.repeat(1024*1024+1)]){const result=readDiaryDrafts({getItem:()=>raw});assert.equal(result.state.drafts.length,0);assert(result.status.includes('could not'))}
 assert(!saveDiaryDrafts({drafts:[entry],edit:null},{setItem:()=>{throw Error('quota')}}));assert(readDiaryDrafts({getItem:()=>{throw Error('denied')}}).status.includes('could not'));
});
test('draft schema rejects duplicates, changed edit metadata and unbounded text',()=>{
 for(const drafts of [[entry,entry],[{...entry,notes:'x'.repeat(2001)}],Array(110).fill(entry)])assert.throws(()=>normalizeDiaryDrafts({version:1,drafts,edit:null}));
 for(const patch of [{target:'M45'},{observedAt:'2026-10-07T20:00:00.000Z'},{place:{...entry.place,name:'Changed site'}}])assert.throws(()=>normalizeDiaryDrafts({version:1,drafts:[],edit:{original:entry,draft:{...entry,...patch}}}));
});

test('completed drafts cannot become duplicate observations after a failed cleanup write',()=>{const state={drafts:[entry],edit:null};assert.equal(discardCompletedDrafts(state,[entry]).drafts.length,0);assert.equal(discardCompletedDrafts(state,[{...entry,notes:'Changed elsewhere'}]).drafts.length,1);assert.equal(state.drafts.length,1)});


test('draft edits preserve newer unrelated forms and apply explicit deletion without mutating source snapshots',()=>{
 const other={...entry,id:'draft-M45',target:'M45',notes:'Other tab'},base={drafts:[entry],edit:null},desired={drafts:[{...entry,notes:'My new text'}],edit:null},latest={drafts:[entry,other],edit:null};
 const before=structuredClone([base,desired,latest]),merged=mergeDiaryDraftChanges(base,desired,latest);
 assert.deepEqual(merged.drafts,[other,desired.drafts[0]]);assert.deepEqual([base,desired,latest],before);
 assert.deepEqual(mergeDiaryDraftChanges(base,{drafts:[],edit:null},latest).drafts,[other]);
 assert.deepEqual(mergeDiaryDraftChanges(base,desired,merged),merged);
});
test('changed, removed and independently created same-object drafts refuse overwriting newer text',()=>{
 const base={drafts:[entry],edit:null},desired={drafts:[{...entry,notes:'My new text'}],edit:null};
 for(const latest of [{drafts:[{...entry,notes:'Peer text'}],edit:null},{drafts:[],edit:null}])assert.throws(()=>mergeDiaryDraftChanges(base,desired,latest),/changed in another tab/);
 assert.throws(()=>mergeDiaryDraftChanges({drafts:[],edit:null},base,{drafts:[{...entry,id:'peer-draft'}],edit:null}),/changed in another tab/);
 assert.throws(()=>mergeDiaryDraftChanges(base,{drafts:[],edit:null},{drafts:[{...entry,notes:'Peer text'}],edit:null}),/changed in another tab/);
});
test('edit-draft conflicts are refused while unrelated new forms and latest edits are preserved',()=>{
 const original={...entry,id:'saved-record'},edit={original,draft:{...original,notes:'Pending edit'}},other={...entry,id:'draft-M45',target:'M45'};
 const latest={drafts:[other],edit},desired={drafts:[entry],edit:null};
 assert.deepEqual(mergeDiaryDraftChanges({drafts:[],edit:null},desired,latest),{drafts:[other,entry],edit});
 assert.throws(()=>mergeDiaryDraftChanges({drafts:[],edit}, {drafts:[],edit:null},{drafts:[],edit:{...edit,draft:{...original,notes:'Peer edit'}}}),/edit form changed/);
});
test('strict draft reads refuse corruption and storage failures so pending text cannot replace unreadable data',()=>{
 for(const raw of ['{','x'.repeat(1024*1024+1),JSON.stringify({version:2,drafts:[],edit:null})])assert.throws(()=>readStoredDiaryDrafts({getItem:()=>raw}));
 assert.throws(()=>readStoredDiaryDrafts({getItem:()=>{throw Error('Blocked')}}),/Blocked/);
 assert.deepEqual(readStoredDiaryDrafts({getItem:()=>null}),{drafts:[],edit:null});
});


test('reviewed draft resolution replaces only the chosen conflicts while preserving later unrelated forms',()=>{
 const base={drafts:[entry],edit:null},local={drafts:[{...entry,notes:'Local text'}],edit:null},reviewed={drafts:[{...entry,notes:'Peer text'}],edit:null},other={...entry,id:'peer-M45',target:'M45'},current={drafts:[...reviewed.drafts,other],edit:null};
 assert.equal(diaryDraftConflicts(base,local,reviewed).length,1);
 const before=structuredClone([base,local,reviewed,current]);
 for(const choice of ['local','stored']){const resolved=resolveDiaryDraftConflicts(base,local,reviewed,current,choice),saved=mergeDiaryDraftChanges(resolved.base,resolved.desired,current);assert.equal(saved.drafts.find(e=>e.target==='M31').notes,choice==='local'?'Local text':'Peer text');assert.deepEqual(saved.drafts.find(e=>e.target==='M45'),other)}
 assert.deepEqual([base,local,reviewed,current],before);
 assert.throws(()=>resolveDiaryDraftConflicts(base,local,reviewed,{drafts:[{...entry,notes:'Changed again'}],edit:null},'local'),/changed again/);
});
test('review resolution supports a removed form and edit conflict without altering an unrelated pending edit',()=>{
 const original={...entry,id:'record-1'},first={original,draft:{...original,notes:'First'}},local={original,draft:{...original,notes:'Local edit'}},peer={original,draft:{...original,notes:'Peer edit'}};
 const base={drafts:[entry],edit:first},desired={drafts:[],edit:local},reviewed={drafts:[{...entry,notes:'Peer draft'}],edit:peer};
 assert.equal(diaryDraftConflicts(base,desired,reviewed).length,2);
 const mine=resolveDiaryDraftConflicts(base,desired,reviewed,reviewed,'local');assert.deepEqual(mergeDiaryDraftChanges(mine.base,mine.desired,reviewed),desired);
 const theirs=resolveDiaryDraftConflicts(base,desired,reviewed,reviewed,'stored');assert.deepEqual(mergeDiaryDraftChanges(theirs.base,theirs.desired,reviewed),reviewed);
 assert.throws(()=>resolveDiaryDraftConflicts(base,desired,reviewed,{...reviewed,edit:null},'stored'),/edit changed again/);
});
