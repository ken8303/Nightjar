import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {readDiaryDrafts,saveDiaryDrafts,normalizeDiaryDrafts,sameObservation,discardCompletedDrafts}=await vite.ssrLoadModule('/lib/diary-drafts.ts');
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
