import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {upsertSavedPlace,upsertEquipmentProfile,readSavedPlaces,removeSavedPlace,restoreSavedPlace}=await vite.ssrLoadModule('/lib/saved-collections.ts');
const {makePlannerBackup}=await vite.ssrLoadModule('/lib/planner-backup.ts');
const places=Array.from({length:100},(_,i)=>({name:`Site ${i}`,latitude:0,longitude:i,bortle:4}));
const equipment=Array.from({length:100},(_,i)=>({name:`Setup ${i}`,width:36,height:24,focal:400,pixel:3.76}));
test('full collections permit replacement but reject additions without mutating saved records',()=>{
 const placeSnapshot=structuredClone(places),equipmentSnapshot=structuredClone(equipment);
 const renamed=upsertSavedPlace(places,{name:'Renamed zero',latitude:0,longitude:.00001});assert.equal(renamed.length,100);assert.equal(renamed[0].name,'Renamed zero');assert.equal(renamed[0].bortle,4);
 const changed=upsertEquipmentProfile(equipment,{...equipment[0],name:'  Setup 0  ',focal:800});assert.equal(changed.length,100);assert.equal(changed.at(-1).focal,800);assert.equal(changed.at(-1).name,'Setup 0');
 assert.throws(()=>upsertSavedPlace(places,{name:'New site',latitude:1,longitude:0}),/100 places/);assert.throws(()=>upsertEquipmentProfile(equipment,{...equipment[0],name:'New setup'}),/100 equipment/);
 assert.deepEqual(places,placeSnapshot);assert.deepEqual(equipment,equipmentSnapshot);
});
test('largest UI-created collections remain exportable and invalid new records cannot enter them',()=>{
 const savedPlaces=upsertSavedPlace(places.slice(0,99),places[99]),profiles=upsertEquipmentProfile(equipment.slice(0,99),equipment[99]);
 const values=new Map([['nightjar-places',JSON.stringify(savedPlaces)],['nightjar-equipment',JSON.stringify(profiles)]]);
 const backup=makePlannerBackup({getItem:key=>values.get(key)??null});assert.equal(backup.data.places.length,100);assert.equal(backup.data.equipment.length,100);
 assert.throws(()=>upsertSavedPlace([],{...places[0],latitude:91}),/valid observing place/);assert.throws(()=>upsertEquipmentProfile([],{...equipment[0],name:'   '}),/valid imaging setup/);
});

test('place removal refuses stale metadata and keeps unrelated newer sites intact',()=>{
 const old={name:'Old site',latitude:51.5,longitude:0,timezone:'Europe/London',bortle:4},other={name:'New elsewhere',latitude:48.85,longitude:2.35};
 const current=[{...old,name:'Renamed elsewhere',bortle:2},other],before=structuredClone(current);
 assert.throws(()=>removeSavedPlace(current,old),/changed elsewhere/);assert.deepEqual(current,before);
 const removed=removeSavedPlace(current,current[0]);assert.deepEqual(removed,[other]);assert.deepEqual(current,before);
 assert.throws(()=>removeSavedPlace(removed,old),/already removed/);
});
test('place Undo reads latest identities, preserves newer settings and refuses a full list',()=>{
 const removed={...places[0],timezone:'Europe/London'},newer={...removed,name:'New settings',bortle:2};
 const current=[newer,places[1]],before=structuredClone(current);
 assert.deepEqual(restoreSavedPlace(current,removed,0),current);assert.deepEqual(current,before);
 assert.deepEqual(restoreSavedPlace([places[1]],removed,0),[removed,places[1]]);
 assert.throws(()=>restoreSavedPlace(places,{name:'Extra',latitude:2,longitude:0},0),/full/);
 assert.equal(restoreSavedPlace(places,places[0],0).length,100);
});
test('saved-place reads preserve valid oversized legacy data and reject unreadable data before mutation',()=>{
 const legacy=[...places,{name:'Legacy extra',latitude:2,longitude:0}],raw=JSON.stringify(legacy);
 assert.deepEqual(readSavedPlaces({getItem:()=>raw}),legacy);
 for(const value of ['{}','bad',JSON.stringify([{...places[0],latitude:91}]),'x'.repeat(5*1024*1024+1)])assert.throws(()=>readSavedPlaces({getItem:()=>value}));
 assert.throws(()=>readSavedPlaces({getItem:()=>{throw Error('Storage blocked')}}),/Storage blocked/);
 assert.deepEqual(readSavedPlaces({getItem:()=>null}),[]);
});
