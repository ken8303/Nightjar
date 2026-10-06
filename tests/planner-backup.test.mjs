import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
const {parsePlannerBackup,makePlannerBackup,readSavedPlan,mergeSavedPlans,restorePlannerBackup,previewPlannerMerge}=await vite.ssrLoadModule('/lib/planner-backup.ts');
after(()=>vite.close());
const empty=()=>({places:[],targets:[],notes:{},equipment:[],diary:[]});
const site={name:'Dark field',latitude:51,longitude:-1,timezone:'Europe/London',bortle:3};
const camera={name:'Camera',width:36,height:24,focal:400,pixel:3.76};
const file=data=>JSON.stringify({format:'nightjar-backup',version:1,exportedAt:'2026-10-02T00:00:00Z',data});
const keys=['nightjar-places','nightjar-targets-v1','nightjar-target-notes-v1','nightjar-equipment','nightjar-deep-targets-v1','nightjar-observing-diary-v1'];
function storage(data=empty()){
 const values=new Map(keys.map((key,i)=>[key,JSON.stringify([data.places,data.targets,data.notes,data.equipment,data.deepTargets||[],data.diary||[]][i])]));
 return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
}
test('export/import round trip preserves Unicode, multiline notes and Bortle ratings',()=>{
 const data={places:[site],targets:['Vega'],notes:{Vega:'First night\n星空 ✨'},equipment:[camera]},source=storage(data),destination=storage();
 const backup=makePlannerBackup(source,new Date('2026-10-02T00:00Z'));
 assert.deepEqual(restorePlannerBackup(destination,parsePlannerBackup(JSON.stringify(backup))),{...data,deepTargets:[],diary:[]});
 assert.deepEqual(readSavedPlan(destination),{...data,deepTargets:[],diary:[]});
});
test('merging keeps existing conflicts, adds new records, deduplicates coordinates and targets',()=>{
 const existing={places:[site],targets:['Vega'],notes:{Vega:'Keep my note'},equipment:[camera]};
 const incoming={places:[{...site,name:'Renamed',latitude:51.00001},{...site,name:'Second',latitude:52}],targets:['Vega','Saturn'],notes:{Vega:'Imported note',Saturn:'New note'},equipment:[{...camera,focal:800},{...camera,name:'Second camera'}]};
 const merged=mergeSavedPlans(existing,incoming);
 assert.equal(merged.places.length,2);assert.deepEqual(merged.places[0],site);assert.deepEqual(merged.targets,['Vega','Saturn']);assert.deepEqual(merged.notes,{Vega:'Keep my note',Saturn:'New note'});assert.equal(merged.equipment[0].focal,400);assert.equal(merged.equipment.length,2);
 const current=storage(existing),preview=parsePlannerBackup(file(incoming));current.setItem(keys[2],JSON.stringify({Vega:'Edited after preview'}));
 assert.equal(restorePlannerBackup(current,preview).notes.Vega,'Edited after preview');
});
test('invalid versions, dates, values, collection limits and oversized files are rejected before writes',()=>{
 assert.throws(()=>parsePlannerBackup('{'));
 for(const change of [{version:4},{format:'another-app'},{exportedAt:'bad'}])assert.throws(()=>parsePlannerBackup(JSON.stringify({...JSON.parse(file(empty())),...change})));
 for(const data of [{...empty(),places:[{...site,latitude:91}]},{...empty(),notes:{Vega:'x'.repeat(2001)}},{...empty(),equipment:[{...camera,pixel:0}]},{...empty(),targets:Array.from({length:40},(_,i)=>String(i))},{...empty(),notes:JSON.parse('{"__proto__":"bad"}')}])assert.throws(()=>parsePlannerBackup(file(data)));
 assert.throws(()=>parsePlannerBackup('x'.repeat(1024*1024+1)));
 const current=storage();current.setItem(keys[0],'broken');const before=[...current.values];assert.throws(()=>restorePlannerBackup(current,parsePlannerBackup(file(empty()))));assert.deepEqual([...current.values],before);
});
test('quota failure rolls back all successful writes and preserves originally absent keys',()=>{
 for(let failAt=1;failAt<=6;failAt++){
  const current=storage();current.removeItem(keys[0]);const before=[...current.values].sort();let writes=0;const set=current.setItem;
  current.setItem=(key,value)=>{if(++writes===failAt)throw Error('Quota exceeded');set(key,value)};
  assert.throws(()=>restorePlannerBackup(current,parsePlannerBackup(file({places:[site],targets:['Vega'],notes:{Vega:'Note'},equipment:[camera]}))),/existing data has not been changed/);
  assert.deepEqual([...current.values].sort(),before);
 }
});
test('rollback failures report possible partial changes honestly',()=>{
 const current=storage();let writes=0;const set=current.setItem;current.setItem=(key,value)=>{if(++writes>=2)throw Error('Storage blocked');set(key,value)};
 assert.throws(()=>restorePlannerBackup(current,parsePlannerBackup(file({places:[site],targets:['Vega'],notes:{},equipment:[]}))),/some changes could not be undone/);
});

test('import preview distinguishes additions, changed conflicts and identical records',()=>{
 const existing={places:[site],targets:['Vega'],notes:{Vega:'My note'},equipment:[camera]};
 const incoming={places:[{...site,name:'Renamed'},{...site,name:'New site',latitude:53}],targets:['Vega','Saturn'],notes:{Vega:'Different note',Saturn:'New note'},equipment:[{...camera,focal:800},{...camera,name:'New camera'}]};
 const review=previewPlannerMerge(existing,incoming);
 assert.deepEqual(review.added,{places:1,targets:1,notes:1,equipment:1,deepTargets:0,diary:0});
 assert.deepEqual(review.kept,{places:['Dark field'],notes:['Vega'],equipment:['Camera'],diary:[]});
 assert.deepEqual(review.merged,mergeSavedPlans(existing,incoming));
 assert.deepEqual(previewPlannerMerge(existing,existing).kept,{places:[],notes:[],equipment:[],diary:[]});
 assert.deepEqual(previewPlannerMerge(existing,existing).added,{places:0,targets:0,notes:0,equipment:0,deepTargets:0,diary:0});
});

test('version 2 backups round-trip deep-sky lists while legacy version 1 remains importable',()=>{
 const legacy=parsePlannerBackup(file(empty()));assert.equal(legacy.version,3);assert.deepEqual(legacy.data.deepTargets,[]);
 const existing=storage({...empty(),deepTargets:['M31']}),incoming=parsePlannerBackup(JSON.stringify({format:'nightjar-backup',version:2,exportedAt:'2026-10-05T20:00:00Z',data:{...empty(),deepTargets:['M45','M31','M45']}}));
 const review=previewPlannerMerge(readSavedPlan(existing),incoming.data);assert.equal(review.added.deepTargets,1);
 assert.deepEqual(restorePlannerBackup(existing,incoming).deepTargets,['M31','M45']);
 const backup=makePlannerBackup(existing);assert.equal(backup.version,3);assert.deepEqual(parsePlannerBackup(JSON.stringify(backup)).data.deepTargets,['M31','M45']);
 for(const value of [['M102'],['bad'],Array(110).fill('M31')])assert.throws(()=>parsePlannerBackup(JSON.stringify({...backup,data:{...backup.data,deepTargets:value}})));
});
