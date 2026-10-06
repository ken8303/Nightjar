import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {upsertSavedPlace,upsertEquipmentProfile}=await vite.ssrLoadModule('/lib/saved-collections.ts');
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
