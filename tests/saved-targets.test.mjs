import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {readSavedTargets,setTargetSaved,validSavedTargetName}=await vite.ssrLoadModule('/lib/saved-targets.ts');
const {validMessierId}=await vite.ssrLoadModule('/lib/deep-sky-list.ts');
test('a stale Save or Remove preserves the requested action rather than toggling a newer state',()=>{
 const current=['Vega','Neptune'],before=[...current];
 assert.deepEqual(setTargetSaved(current,'Vega',true,42,validSavedTargetName),current);
 assert.deepEqual(setTargetSaved(['Neptune'],'Vega',false,42,validSavedTargetName),['Neptune']);
 assert.deepEqual(setTargetSaved(current,'Vega',false,42,validSavedTargetName),['Neptune']);
 assert.deepEqual(setTargetSaved(current,'Uranus',true,42,validSavedTargetName),['Vega','Neptune','Uranus']);assert.deepEqual(current,before);
});
test('latest target restoration retains unrelated additions, handles already-restored identity and refuses capacity',()=>{
 const current=Array.from({length:42},(_,i)=>`Legacy ${i}`),before=[...current];
 assert.throws(()=>setTargetSaved(current,'Vega',true,42,validSavedTargetName),/full/);assert.deepEqual(current,before);
 assert.deepEqual(setTargetSaved(current,'Legacy 0',true,42,validSavedTargetName),current);
 const freed=setTargetSaved(current,'Legacy 1',false,42,validSavedTargetName);assert.equal(setTargetSaved(freed,'Vega',true,42,validSavedTargetName).length,42);
});
test('deep-sky actions preserve fresh list contents and never accept a missing-source identity',()=>{
 const current=['M31','M45','M13'],before=[...current];
 assert.deepEqual(setTargetSaved(current,'M31',false,109,validMessierId),['M45','M13']);
 assert.deepEqual(setTargetSaved(['M45','M13'],'M31',true,109,validMessierId),['M45','M13','M31']);
 assert.throws(()=>setTargetSaved(current,'M102',true,109,validMessierId));assert.deepEqual(current,before);
});
test('strict saved-target reads keep valid imported names but refuse corrupted storage without dropping records',()=>{
 assert.deepEqual(readSavedTargets({getItem:()=>JSON.stringify(['Archived name','Vega','Vega'])}),['Archived name','Vega']);
 for(const raw of ['null','{}','bad',JSON.stringify(['Vega',3]),JSON.stringify(['constructor'])])assert.throws(()=>readSavedTargets({getItem:()=>raw}));
 assert.throws(()=>readSavedTargets({getItem:()=>{throw Error('Blocked')}}),/Blocked/);assert.deepEqual(readSavedTargets({getItem:()=>null}),[]);
});


test('valid oversized legacy target lists remain readable without truncation or writes',()=>{
 const values=['Vega',...Array.from({length:44},(_,i)=>'Legacy '+i)],raw=JSON.stringify(values);assert.deepEqual(readSavedTargets({getItem:()=>raw}),values);assert.equal(raw,JSON.stringify(values));
});
test('legacy removals can free capacity while additions and Undo still respect the limit',()=>{
 const values=Array.from({length:45},(_,i)=>'Legacy '+i),before=[...values],removed=setTargetSaved(values,'Legacy 0',false,42,validSavedTargetName);assert.equal(removed.length,44);assert.deepEqual(values,before);assert.throws(()=>setTargetSaved(removed,'Legacy 0',true,42,validSavedTargetName),/full/);assert.deepEqual(setTargetSaved(removed,'Legacy 1',true,42,validSavedTargetName),removed);
 let freed=removed;for(const name of ['Legacy 1','Legacy 2','Legacy 3'])freed=setTargetSaved(freed,name,false,42,validSavedTargetName);assert.equal(freed.length,41);assert.equal(setTargetSaved(freed,'Vega',true,42,validSavedTargetName).length,42);
});
test('legacy repeated deep-sky identities are read as a set without rewriting the source',async()=>{
 const {readDeepSkyList}=await vite.ssrLoadModule('/lib/deep-sky-list.ts'),raw=JSON.stringify(Array(200).fill('M31'));assert.deepEqual(readDeepSkyList({getItem:()=>raw}),['M31']);assert.equal(JSON.parse(raw).length,200);assert.throws(()=>readDeepSkyList({getItem:()=>JSON.stringify(['M31','M102'])}));
});
test('an oversized legacy target list requires raw recovery rather than a shortened normal backup',async()=>{
 const {makePlannerBackup}=await vite.ssrLoadModule('/lib/planner-backup.ts'),{makePlannerRecovery}=await vite.ssrLoadModule('/lib/planner-recovery.ts'),raw=JSON.stringify(Array.from({length:45},(_,i)=>'Legacy '+i)),source={getItem:key=>key==='nightjar-targets-v1'?raw:null};assert.throws(()=>makePlannerBackup(source),/could not be read/);assert.equal(JSON.parse(makePlannerRecovery(source,{getItem:()=>null}).text).stores.local['nightjar-targets-v1'],raw);
});
