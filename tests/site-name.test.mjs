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
 const failed=storage([current]);failed.setItem=()=>{throw Error('Blocked')};assert.throws(()=>renameObservingSite(failed,current,'New'),/original site was kept/);
});


test('failed rename rollback keeps newer site values and reports that review is needed',()=>{
 const store=storage([current]),set=store.setItem,newerPlaces=JSON.stringify([{...current,name:'Peer name',bortle:1}]),newerPlace=JSON.stringify({...current,name:'Peer active site',latitude:48});let calls=0;
 store.setItem=(key,value)=>{if(++calls===2){store.values.set('nightjar-places',newerPlaces);store.values.set('nightjar-place',newerPlace);throw Error('Quota')}set(key,value)};
 assert.throws(()=>renameObservingSite(store,current,'Local name'),/Review your saved sites/);assert.equal(store.getItem('nightjar-places'),newerPlaces);assert.equal(store.getItem('nightjar-place'),newerPlace);assert.equal(calls,2);
});
test('rollback can restore a rename value written before failure but does not touch unchanged failed keys',()=>{
 const store=storage([current]),before=new Map(store.values),set=store.setItem;let calls=0;store.setItem=(key,value)=>{set(key,value);if(++calls===2)throw Error('Failed after write')};
 assert.throws(()=>renameObservingSite(store,current,'Local name'),/original site was kept/);assert.deepEqual(store.values,before);
 const blocked=storage([current]);let reads=0;const get=blocked.getItem;blocked.getItem=key=>{if(++reads>2)throw Error('Read denied');return get(key)};blocked.setItem=()=>{throw Error('Quota')};assert.throws(()=>renameObservingSite(blocked,current,'Local name'),/Review your saved sites/);
});


test('a name-only save retains newer selected-site metadata and unknown fields',()=>{
 const selected={...current,bortle:2,timezone:'UTC',country:'Updated country',extra:'new metadata'},store=storage([selected],selected),before=structuredClone(current);
 const result=renameObservingSite(store,current,'New 星空');assert.equal(result.place.bortle,2);assert.equal(result.place.timezone,'UTC');assert.equal(result.place.country,'Updated country');assert.equal(result.place.extra,'new metadata');assert.equal(result.place.name,'New 星空');assert.deepEqual(current,before);
 assert.deepEqual(JSON.parse(store.getItem('nightjar-place')),result.place);assert.deepEqual(result.places,[result.place]);
 const cleared={name:current.name,latitude:current.latitude,longitude:current.longitude},empty=storage([cleared],cleared),renamed=renameObservingSite(empty,current,'Clear metadata');assert.equal(renamed.place.bortle,undefined);assert.equal(renamed.place.country,undefined);assert.equal(renamed.place.timezone,undefined);
});
test('newer selected-site names or coordinates refuse a stale rename before any writes',()=>{
 for(const selected of [{...current,name:'Peer name'},{...current,latitude:48}]){const store=storage([current],selected),before=new Map(store.values);let writes=0;store.setItem=()=>{writes++};assert.throws(()=>renameObservingSite(store,current,'Local draft'),/changed elsewhere/);assert.equal(writes,0);assert.deepEqual(store.values,before)}
});
test('a selected-site change after the first rename write prevents replacement and rolls back the list',()=>{
 const store=storage([current]),originalList=store.getItem('nightjar-places'),newer=JSON.stringify({...current,name:'Peer during save',bortle:1}),write=store.setItem;
 store.setItem=(key,value)=>{write(key,value);if(key==='nightjar-places')store.values.set('nightjar-place',newer)};
 assert.throws(()=>renameObservingSite(store,current,'Local name'),/changed during saving/);assert.equal(store.getItem('nightjar-place'),newer);assert.equal(store.getItem('nightjar-places'),originalList);
});
