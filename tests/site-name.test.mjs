import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {renameObservingSite}=await vite.ssrLoadModule('/lib/site-name.ts');
const current={name:'Coordinate site',latitude:51.5,longitude:0,country:'United Kingdom',timezone:'Europe/London',bortle:4};
function storage(places=[],place=current){const values=new Map([['nightjar-places',JSON.stringify(places)],['nightjar-place',JSON.stringify(place)]]);return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}}
test('renaming updates the saved identity while preserving newer metadata, unrelated sites and the source',()=>{
 const latest={...current,bortle:2,timezone:'UTC'},other={...current,name:'Other',latitude:48},store=storage([latest,other]),snapshot=structuredClone(current);
 const result=renameObservingSite(store,current,'  Home 星空  ');
 assert.equal(result.place.name,'Home 星空');assert.equal(result.place.latitude,current.latitude);assert.equal(result.place.bortle,4);
 assert.deepEqual(result.places,[{...latest,name:'Home 星空'},other]);assert.deepEqual(current,snapshot);
 assert.deepEqual(JSON.parse(store.getItem('nightjar-places')),result.places);assert.deepEqual(JSON.parse(store.getItem('nightjar-place')),result.place);
});
test('an unsaved site can be named without silently adding it to a saved collection',()=>{
 const store=storage([{...current,latitude:48}]),raw=store.getItem('nightjar-places');
 const result=renameObservingSite(store,current,'x'.repeat(199));assert.equal(result.place.name.length,199);assert.equal(store.getItem('nightjar-places'),raw);assert.equal(result.places.length,1);
 for(const value of ['   ','x'.repeat(200)])assert.throws(()=>renameObservingSite(store,current,value),/1 to 199/);
});
test('a failed second write rolls back both original values before reporting recoverable failure',()=>{
 const store=storage([current]),before=new Map(store.values),write=store.setItem;let calls=0;
 store.setItem=(key,value)=>{if(++calls===2)throw Error('Quota');write(key,value)};
 assert.throws(()=>renameObservingSite(store,current,'New name'),/original site was kept/);assert.deepEqual(store.values,before);
 const empty=storage([current]);empty.values.delete('nightjar-place');const old=new Map(empty.values),set=empty.setItem;calls=0;
 empty.setItem=(key,value)=>{if(++calls===2)throw Error('Quota');set(key,value)};
 assert.throws(()=>renameObservingSite(empty,current,'New'),/original site was kept/);assert.deepEqual(empty.values,old);
});
test('invalid saved data prevents rename writes and rollback failure is reported honestly',()=>{
 const store=storage([current]);store.values.set('nightjar-places','bad');const before=new Map(store.values);
 assert.throws(()=>renameObservingSite(store,current,'New'));assert.deepEqual(store.values,before);
 const failed=storage([current]);failed.setItem=()=>{throw Error('Blocked')};assert.throws(()=>renameObservingSite(failed,current,'New'),/Review your saved sites/);
});
