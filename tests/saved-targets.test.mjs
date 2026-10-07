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
 for(const raw of ['null','{}','bad',JSON.stringify(['Vega',3]),JSON.stringify(['constructor']),JSON.stringify(Array.from({length:43},(_,i)=>`Target ${i}`))])assert.throws(()=>readSavedTargets({getItem:()=>raw}));
 assert.throws(()=>readSavedTargets({getItem:()=>{throw Error('Blocked')}}),/Blocked/);assert.deepEqual(readSavedTargets({getItem:()=>null}),[]);
});
