import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {upsertSavedPlace,upsertEquipmentProfile,readSavedPlaces,removeSavedPlace,restoreSavedPlace,readEquipmentProfiles,removeEquipmentProfile,restoreEquipmentProfile}=await vite.ssrLoadModule('/lib/saved-collections.ts');
const {makePlannerBackup}=await vite.ssrLoadModule('/lib/planner-backup.ts');
const places=Array.from({length:100},(_,i)=>({name:`Site ${i}`,latitude:0,longitude:i,bortle:4}));
const equipment=Array.from({length:100},(_,i)=>({name:`Setup ${i}`,width:36,height:24,focal:400,pixel:3.76}));
test('saving or undoing at the date line does not add the opposite longitude representation as another site',()=>{
 const east={name:'East representation',latitude:-17.75,longitude:180,bortle:3},west={...east,name:'West representation',longitude:-180},before=structuredClone(east);
 const saved=upsertSavedPlace([east],west);assert.equal(saved.length,1);assert.equal(saved[0].name,west.name);assert.equal(saved[0].longitude,-180);
 assert.deepEqual(restoreSavedPlace([west],east,0),[west]);assert.deepEqual(east,before);
});
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

test('equipment removal preserves unrelated additions and refuses changed dimensions',()=>{
 const expected=equipment[0],newer={...expected,focal:800},current=[newer,equipment[1]],before=structuredClone(current);
 assert.throws(()=>removeEquipmentProfile(current,expected),/changed elsewhere/);assert.deepEqual(current,before);
 assert.deepEqual(removeEquipmentProfile(current,newer),[equipment[1]]);assert.deepEqual(current,before);
 assert.throws(()=>removeEquipmentProfile([equipment[1]],expected),/already removed/);
});
test('equipment Undo preserves a re-saved name and respects current capacity',()=>{
 const newer={...equipment[0],pixel:2.4},current=[newer,equipment[1]];
 assert.deepEqual(restoreEquipmentProfile(current,equipment[0],0),current);
 assert.deepEqual(restoreEquipmentProfile([equipment[1]],equipment[0],0),[equipment[0],equipment[1]]);
 assert.throws(()=>restoreEquipmentProfile(equipment,{...equipment[0],name:'Extra'},0),/full/);
 assert.equal(restoreEquipmentProfile(equipment,equipment[0],0).length,100);
 assert.equal(current[0].pixel,2.4);
});
test('equipment reads retain valid legacy collections and reject corrupt or blocked storage',()=>{
 const legacy=[...equipment,{...equipment[0],name:'Legacy extra'}];
 assert.deepEqual(readEquipmentProfiles({getItem:()=>JSON.stringify(legacy)}),legacy);
 for(const value of ['{}','bad',JSON.stringify([{...equipment[0],pixel:0}]),'x'.repeat(5*1024*1024+1)])assert.throws(()=>readEquipmentProfiles({getItem:()=>value}));
 assert.throws(()=>readEquipmentProfiles({getItem:()=>{throw Error('Storage blocked')}}),/Storage blocked/);
 assert.deepEqual(readEquipmentProfiles({getItem:()=>null}),[]);
});


test('legacy coordinate aliases remove the requested metadata match without removing a sibling',()=>{
 const first={name:'First alias',latitude:51.5,longitude:0,bortle:2,extra:'first'},second={...first,name:'Second alias',bortle:4,extra:'second'},other={name:'Elsewhere',latitude:48,longitude:2},current=[first,second,other],before=structuredClone(current);
 assert.deepEqual(removeSavedPlace(current,second),[first,other]);assert.deepEqual(removeSavedPlace(current,first),[second,other]);assert.deepEqual(current,before);
 assert.throws(()=>removeSavedPlace([first,other],second),/changed elsewhere/);
 assert.equal(removeSavedPlace([first,{...first}],first).length,1);
 assert.deepEqual(restoreSavedPlace([first,other],second,1),[first,other]);
});
test('legacy same-name equipment removes the requested dimensions and retains sibling settings',()=>{
 const first={name:'Shared setup',width:36,height:24,focal:400,pixel:3.76,extra:'first'},second={...first,focal:800,extra:'second'},other={...first,name:'Other'},current=[first,second,other],before=structuredClone(current);
 assert.deepEqual(removeEquipmentProfile(current,second),[first,other]);assert.deepEqual(removeEquipmentProfile(current,first),[second,other]);assert.deepEqual(current,before);
 assert.throws(()=>removeEquipmentProfile([first,other],second),/changed elsewhere/);assert.equal(removeEquipmentProfile([first,{...first}],first).length,1);
 assert.deepEqual(restoreEquipmentProfile([first,other],second,1),[first,other]);
});


test('a unique whitespace legacy setup is replaced canonically at full capacity without dropping metadata',()=>{
 const current=[{...equipment[0],name:'  Setup 0  ',extra:'Keep legacy metadata'},...equipment.slice(1)],before=structuredClone(current),next=upsertEquipmentProfile(current,{...equipment[0],focal:850});
 assert.equal(next.length,100);assert.equal(next.at(-1).name,'Setup 0');assert.equal(next.at(-1).focal,850);assert.equal(next.at(-1).extra,'Keep legacy metadata');assert.equal(next.filter(p=>p.name.trim()==='Setup 0').length,1);assert.deepEqual(current,before);assert.deepEqual(next.slice(0,-1),current.slice(1));
});
test('ambiguous exact or trimmed equipment names refuse saving rather than collapsing versions',()=>{
 for(const names of [['Shared','Shared'],[' Shared ','Shared'],[' Shared','Shared ']]){
  const current=names.map((name,i)=>({...equipment[0],name,focal:400+i*400,extra:'Version '+i})),before=structuredClone(current);
  assert.throws(()=>upsertEquipmentProfile(current,{...equipment[0],name:'Shared',focal:1200}),/different setup name/);assert.deepEqual(current,before);
  const distinct=upsertEquipmentProfile(current,{...equipment[0],name:'New version',focal:1200});assert.equal(distinct.length,3);assert.deepEqual(distinct.slice(0,2),current);
 }
});
test('valid oversized legacy collections allow existing replacements but retain capacity protection for additions',()=>{
 const sites=[...places,{name:'Extra legacy',latitude:1,longitude:0}],profiles=[...equipment,{...equipment[0],name:'Extra legacy',extra:'Keep extra'}];
 const nextSites=upsertSavedPlace(sites,{...sites[0],name:'Updated legacy'}),nextProfiles=upsertEquipmentProfile(profiles,{...profiles[0],focal:800});
 assert.equal(nextSites.length,101);assert.equal(nextSites[0].name,'Updated legacy');assert.deepEqual(nextSites.slice(1),sites.slice(1));
 assert.equal(nextProfiles.length,101);assert.equal(nextProfiles.at(-1).focal,800);assert.equal(nextProfiles.find(p=>p.name==='Extra legacy').extra,'Keep extra');
 assert.throws(()=>upsertSavedPlace(sites,{name:'New',latitude:2,longitude:0}),/100 places/);assert.throws(()=>upsertEquipmentProfile(profiles,{...equipment[0],name:'New'}),/100 equipment/);
});

test('saving a named coordinate alias updates that version without overwriting sibling names or ratings',()=>{
 const first={name:'Garden',latitude:51.5,longitude:0,bortle:2,extra:'garden'},second={...first,name:'Roof',bortle:4,extra:'roof'},current=[first,second],before=structuredClone(current);
 const result=upsertSavedPlace(current,{...first,bortle:3});
 assert.deepEqual(result,[{...first,bortle:3},second]);assert.deepEqual(current,before);
 assert.throws(()=>upsertSavedPlace(current,{...first,name:'New alias'}),/More than one saved place/);
 assert.throws(()=>upsertSavedPlace([first,{...first,bortle:4}],first),/More than one saved place/);assert.deepEqual(current,before);
});

test('equipment Undo recognises trimmed legacy names and preserves a newer peer save',()=>{
 const removed={...equipment[0],name:'  Portable scope  ',focal:400},newer={...removed,name:'Portable scope',focal:800,pixel:2.4,extra:'New peer metadata'};
 for(const current of [[newer],[{...newer,name:'\u00a0Portable scope\u00a0'}],[newer,...equipment.slice(1)]]){
  const before=structuredClone(current),restored=restoreEquipmentProfile(current,removed,0);
  assert.deepEqual(restored,before);assert.deepEqual(current,before);
  assert.equal(restored[0].focal,800);assert.equal(restored[0].pixel,2.4);assert.equal(restored[0].extra,'New peer metadata');
  assert.notEqual(restored,current,'the returned list is a new snapshot');
 }
 assert.deepEqual(restoreEquipmentProfile([equipment[1]],removed,0),[removed,equipment[1]],'an absent identity still restores its exact legacy name');
});


test('equipment row identities follow unchanged records through removal and reordering',async()=>{
 const {equipmentProfileRowKeys:keys}=await vite.ssrLoadModule('/lib/saved-collections.ts');
 const items=equipment.slice(0,3),before=structuredClone(items),original=keys(items);
 assert.deepEqual(keys(items.slice(1)),original.slice(1));
 assert.deepEqual(keys([items[2],items[0],items[1]]),[original[2],original[0],original[1]]);
 const changed={...items[1],focal:1200};assert.notEqual(keys([changed])[0],original[1]);
 assert.deepEqual(items,before);
});
test('legacy same-name and exact-duplicate equipment rows have distinct keys without delimiter collisions',async()=>{
 const {equipmentProfileRowKeys:keys}=await vite.ssrLoadModule('/lib/saved-collections.ts');
 const original={...equipment[0],name:'Legacy: \"scope\"'},changed={...original,focal:800};
 const identities=keys([original,changed,{...original}]);
 assert.equal(new Set(identities).size,3);
 assert.equal(keys([changed])[0],identities[1]);
 for(const field of ['name','width','height','focal','pixel']){const value={...original,[field]:field==='name'?'Another scope':original[field]+1};assert.notEqual(keys([value])[0],identities[0])}
 assert.deepEqual(keys([]),[]);
});


test('saved-place row identities follow unchanged named aliases through peer removal and reorder',async()=>{
 const {savedPlaceRowKeys:keys}=await vite.ssrLoadModule('/lib/saved-collections.ts');
 const garden={name:'Garden',latitude:51.5,longitude:0,bortle:2},roof={...garden,name:'Roof',bortle:4},hill={name:'Hill',latitude:50,longitude:1};
 const places=[garden,roof,hill],before=structuredClone(places),original=keys(places);
 assert.equal(new Set(original).size,3);
 assert.deepEqual(keys([roof,hill]),original.slice(1));
 assert.deepEqual(keys([hill,garden,roof]),[original[2],original[0],original[1]]);
 assert.deepEqual(places,before);
});
test('saved-place aliases, metadata and exact duplicates never share a rendered row key',async()=>{
 const {savedPlaceRowKeys:keys}=await vite.ssrLoadModule('/lib/saved-collections.ts');
 const place={name:'Legacy: "site"',latitude:51.5,longitude:0,country:'GB',timezone:'Europe/London',bortle:2};
 const variants=[place,{...place},{...place,name:'Roof'},{...place,country:'Other'},{...place,timezone:'UTC'},{...place,bortle:3},{...place,latitude:51.500000001},{...place,longitude:.000000001}];
 const identities=keys(variants);assert.equal(new Set(identities).size,variants.length);
 assert.equal(keys([variants[2]])[0],identities[2]);
 assert.deepEqual(keys([]),[]);
 assert.equal(keys([{name:'Site',latitude:0,longitude:0}])[0],keys([{name:'Site',latitude:0,longitude:0,country:undefined,timezone:undefined,bortle:undefined}])[0]);
});
