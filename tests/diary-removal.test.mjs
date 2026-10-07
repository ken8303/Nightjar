import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {removeDiaryEntry,restoreDiaryEntry}=await vite.ssrLoadModule('/lib/diary-removal.ts');
const entry={id:'qa-removal',target:'M31',observedAt:'2026-10-25T00:30:00.000Z',place:{name:'London',latitude:51.5,longitude:0,timezone:'Europe/London',bortle:4},outcome:'imaged',equipment:'400 mm',notes:'Original notes\n星空'};
test('remove and restore round-trip original notes, equipment, site and exact clock-change instant',()=>{
 const other={...entry,id:'other',target:'M45'},source=[entry,other],before=structuredClone(source);
 const removed=removeDiaryEntry(source,entry);assert.deepEqual(removed.entries,[other]);assert.deepEqual(removed.removed,entry);
 const restored=restoreDiaryEntry(removed.entries,removed.removed);assert(restored.restored);assert.deepEqual(restored.entries,[other,entry]);assert.deepEqual(source,before);
});
test('removal refuses a newer version or missing entry instead of discarding concurrent changes',()=>{
 for(const current of [{...entry,notes:'New notes'}, {...entry,place:{...entry.place,name:'New field'}}, {...entry,outcome:'seen'}])assert.throws(()=>removeDiaryEntry([current],entry),/changed elsewhere/);
 assert.throws(()=>removeDiaryEntry([],entry),/no longer saved/);
});
test('Undo keeps an already-resaved newer record and does not create duplicates',()=>{
 const newer={...entry,notes:'A newer observation version'};
 const restored=restoreDiaryEntry([newer],entry);assert.equal(restored.restored,false);assert.deepEqual(restored.entries,[newer]);
});
test('Undo observes the shared diary capacity and leaves the source intact when full',()=>{
 const full=Array.from({length:200},(_,index)=>({...entry,id:`record-${index}`}));
 assert.throws(()=>restoreDiaryEntry(full,entry),/diary is full/);assert.equal(full.length,200);
 const removed=removeDiaryEntry(full,full[0]);assert.equal(removed.entries.length,199);assert.equal(restoreDiaryEntry(removed.entries,removed.removed).entries.length,200);
});
test('malformed records cannot be removed or restored through the recovery helpers',()=>{
 assert.throws(()=>removeDiaryEntry([{...entry,notes:'x'.repeat(2001)}],entry));assert.throws(()=>restoreDiaryEntry([],{...entry,target:'M102'}));
});
