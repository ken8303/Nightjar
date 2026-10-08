import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
const {plannerBackupMaxBytes,parsePlannerBackup,makePlannerBackup,readSavedPlan,mergeSavedPlans,restorePlannerBackup,previewPlannerMerge,PlannerReviewChangedError}=await vite.ssrLoadModule('/lib/planner-backup.ts');
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
 for(const change of [{version:5},{format:'another-app'},{exportedAt:'bad'}])assert.throws(()=>parsePlannerBackup(JSON.stringify({...JSON.parse(file(empty())),...change})));
 for(const data of [{...empty(),places:[{...site,latitude:91}]},{...empty(),notes:{Vega:'x'.repeat(2001)}},{...empty(),equipment:[{...camera,pixel:0}]},{...empty(),targets:Array.from({length:43},(_,i)=>String(i))},{...empty(),notes:JSON.parse('{"__proto__":"bad"}')}])assert.throws(()=>parsePlannerBackup(file(data)));
 assert.throws(()=>parsePlannerBackup('x'.repeat(plannerBackupMaxBytes+1)),/5 MB/);
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
 const legacy=parsePlannerBackup(file(empty()));assert.equal(legacy.version,4);assert.deepEqual(legacy.data.deepTargets,[]);
 const existing=storage({...empty(),deepTargets:['M31']}),incoming=parsePlannerBackup(JSON.stringify({format:'nightjar-backup',version:2,exportedAt:'2026-10-05T20:00:00Z',data:{...empty(),deepTargets:['M45','M31','M45']}}));
 const review=previewPlannerMerge(readSavedPlan(existing),incoming.data);assert.equal(review.added.deepTargets,1);
 assert.deepEqual(restorePlannerBackup(existing,incoming).deepTargets,['M31','M45']);
 const backup=makePlannerBackup(existing);assert.equal(backup.version,4);assert.deepEqual(parsePlannerBackup(JSON.stringify(backup)).data.deepTargets,['M31','M45']);
 for(const value of [['M102'],['bad'],Array(110).fill('M31')])assert.throws(()=>parsePlannerBackup(JSON.stringify({...backup,data:{...backup.data,deepTargets:value}})));
});

test('full-capacity Unicode backups export and restore without the former one-megabyte rejection',()=>{
 const note='星'.repeat(2000),data={places:Array.from({length:100},(_,index)=>({...site,name:`Field ${index}`,longitude:-1+index/100})),targets:Array.from({length:42},(_,index)=>`Target ${index}`),notes:Object.fromEntries(Array.from({length:100},(_,index)=>[`Target ${index}`,note])),equipment:Array.from({length:100},(_,index)=>({...camera,name:`Setup ${index}`})),deepTargets:['M31','M45'],diary:Array.from({length:200},(_,index)=>({id:`unicode-${index}`,target:'M31',observedAt:'2026-10-07T20:00:00.000Z',place:site,outcome:'seen',equipment:'望遠鏡',notes:note}))};
 const source=storage(data),backup=makePlannerBackup(source),text=JSON.stringify(backup,null,2),bytes=new TextEncoder().encode(text).length;
 assert(bytes>1024*1024);assert(bytes<plannerBackupMaxBytes);
 const parsed=parsePlannerBackup(text),destination=storage();restorePlannerBackup(destination,parsed);
 assert.equal(readSavedPlan(destination).diary.length,200);assert.equal(readSavedPlan(destination).notes['Target 99'],note);assert.deepEqual(readSavedPlan(destination),backup.data);
});
test('maximum escaped note and metadata lengths stay within the formatted backup size bound',()=>{
 const fill='\u0000',longName=prefix=>prefix+fill.repeat(199-prefix.length),data={places:Array.from({length:100},(_,index)=>({...site,name:longName(`Field ${index}`),country:fill.repeat(199),longitude:-1+index/100})),targets:Array.from({length:42},(_,index)=>`Target ${index}`),notes:Object.fromEntries(Array.from({length:100},(_,index)=>[`Target ${index}`+fill.repeat(90),fill.repeat(2000)])),equipment:Array.from({length:100},(_,index)=>({...camera,name:`Setup ${index}`+fill.repeat(70)})),diary:Array.from({length:200},(_,index)=>({id:`escaped-${index}`,target:'M31',observedAt:'2026-10-07T20:00:00.000Z',place:{...site,name:longName('Field'),country:fill.repeat(199)},outcome:'imaged',equipment:fill.repeat(100),notes:fill.repeat(2000)}))};
 const backup=makePlannerBackup(storage(data)),text=JSON.stringify(backup,null,2);assert(new TextEncoder().encode(text).length<plannerBackupMaxBytes);assert.equal(parsePlannerBackup(text).data.diary[199].notes,fill.repeat(2000));
 assert.throws(()=>parsePlannerBackup(file({...empty(),places:[{...site,country:'x'.repeat(200)}]})));
});

test('version 4 backups retain all expanded sky identities and still normalize legacy versions',async()=>{
 const {skyTargets}=await vite.ssrLoadModule('/lib/sky.ts'),targets=skyTargets(new Date('2026-10-07T20:00Z'),site).map(target=>target.name),source=storage({...empty(),targets});
 const backup=makePlannerBackup(source);assert.equal(backup.version,4);assert.equal(backup.data.targets.length,42);
 for(const name of ['Mercury','Uranus','Neptune'])assert(backup.data.targets.includes(name));
 const destination=storage();restorePlannerBackup(destination,parsePlannerBackup(JSON.stringify(backup)));assert.deepEqual(readSavedPlan(destination).targets,targets);
 for(const version of [1,2,3]){const parsed=parsePlannerBackup(JSON.stringify({...backup,version,data:{...empty(),targets:['Moon','Vega']}}));assert.equal(parsed.version,4);assert.deepEqual(parsed.data.targets,['Moon','Vega'])}
});
test('reviewed imports refuse any changed saved collection before writes and expose a fresh review snapshot',()=>{
 const incoming=parsePlannerBackup(file({...empty(),targets:['Saturn']}));
 for(const [key,value] of [[keys[0],[site]],[keys[1],['Vega']],[keys[2],{Vega:'Changed after review'}],[keys[3],[camera]],[keys[4],['M31']],[keys[5],[{id:'new-record',target:'M31',observedAt:'2026-10-08T20:00:00.000Z',place:site,outcome:'seen',equipment:'',notes:'Peer observation'}]]]){
  const current=storage(),reviewed=readSavedPlan(current);current.setItem(key,JSON.stringify(value));const before=structuredClone([...current.values]);let writes=0;const set=current.setItem;current.setItem=(name,text)=>{writes++;set(name,text)};
  let changed;try{restorePlannerBackup(current,incoming,reviewed)}catch(error){changed=error}
  assert(changed instanceof PlannerReviewChangedError);assert.deepEqual(changed.current,readSavedPlan(current));assert.equal(writes,0);assert.deepEqual([...current.values],before);
  const result=restorePlannerBackup(current,incoming,changed.current);assert(result.targets.includes('Saturn'));assert.equal(writes,6);
 }
});
test('failed-import rollback preserves a newer value written elsewhere rather than restoring an older snapshot over it',()=>{
 const current=storage(),peerPlaces=JSON.stringify([{...site,name:'Peer changed site'}]),set=current.setItem;let writes=0;
 current.setItem=(key,value)=>{if(++writes===2){set(keys[0],peerPlaces);throw Error('Quota')}set(key,value)};
 assert.throws(()=>restorePlannerBackup(current,parsePlannerBackup(file({...empty(),places:[site],targets:['Vega']}))),/some changes could not be undone/);
 assert.equal(current.getItem(keys[0]),peerPlaces);assert.equal(current.getItem(keys[1]),'[]');
});
test('oversized stored backup values are refused before JSON parsing and are left available for raw recovery',()=>{
 const current=storage(),raw='x'.repeat(plannerBackupMaxBytes+1);current.setItem(keys[2],raw);const before=structuredClone([...current.values]),parse=JSON.parse;let parsedOversized=false;
 JSON.parse=function(value,...options){if(typeof value==='string'&&value.length>plannerBackupMaxBytes)parsedOversized=true;return parse(value,...options)};
 try{assert.throws(()=>readSavedPlan(current),/could not be read/)}finally{JSON.parse=parse}
 assert.equal(parsedOversized,false);assert.deepEqual([...current.values],before);
});
test('a refreshed review that now exceeds collection capacity still performs no import writes',()=>{
 const places=Array.from({length:99},(_,index)=>({...site,name:`Site ${index}`,latitude:0,longitude:-170+index/2})),current=storage({...empty(),places}),incoming=parsePlannerBackup(file({...empty(),places:[{...site,name:'Incoming site',latitude:40,longitude:20}]})),reviewed=readSavedPlan(current);
 assert.equal(previewPlannerMerge(reviewed,incoming.data).merged.places.length,100);current.setItem(keys[0],JSON.stringify([...places,{...site,name:'Peer site',latitude:45,longitude:30}]));const before=structuredClone([...current.values]);let changed;
 try{restorePlannerBackup(current,incoming,reviewed)}catch(error){changed=error}
 assert(changed instanceof PlannerReviewChangedError);assert.throws(()=>previewPlannerMerge(changed.current,incoming.data),/exceed 100 saved sites/);assert.deepEqual([...current.values],before);
});
test('valid backups that would exceed a merged collection limit give specific recovery guidance without writes',()=>{
 const observation={id:'new-record',target:'M31',observedAt:'2026-10-08T20:00:00.000Z',place:site,outcome:'seen',equipment:'',notes:''};
 const cases=[
  [{...empty(),places:Array.from({length:100},(_,index)=>({...site,name:`Site ${index}`,latitude:0,longitude:-170+index/2}))},{...empty(),places:[site]},'100 saved sites'],
  [{...empty(),equipment:Array.from({length:100},(_,index)=>({...camera,name:`Camera ${index}`}))},{...empty(),equipment:[camera]},'100 saved equipment setups'],
  [{...empty(),targets:Array.from({length:42},(_,index)=>`Legacy ${index}`)},{...empty(),targets:['Vega']},'42 saved bright-sky targets'],
  [{...empty(),notes:Object.fromEntries(Array.from({length:100},(_,index)=>[`Legacy ${index}`,'Note']))},{...empty(),notes:{Vega:'New note'}},'100 saved target notes'],
  [{...empty(),diary:Array.from({length:200},(_,index)=>({...observation,id:`record-${index}`}))},{...empty(),diary:[observation]},'200 saved observations']
 ];
 for(const [existing,incoming,expected] of cases){const current=storage(existing),before=structuredClone([...current.values]),backup=parsePlannerBackup(file(incoming));assert.throws(()=>restorePlannerBackup(current,backup,readSavedPlan(current)),error=>error.message.includes(expected)&&error.message.includes('Free space'));assert.deepEqual([...current.values],before)}
});


test('backup export times retain valid legacy and generated ISO UTC instants across supported versions',()=>{
 for(const version of [1,2,3,4])for(const exportedAt of ['2026-10-02T00:00:00Z','2026-10-02T00:00:59.987Z','2024-02-29T00:00:00.000Z','0000-01-01T00:00:00.000Z','+010000-01-01T00:00:00.000Z','-000001-01-01T00:00:00.000Z']){const text=JSON.stringify({...JSON.parse(file(empty())),version,exportedAt});assert.equal(parsePlannerBackup(text).exportedAt,exportedAt)}
});
test('backup metadata rejects repaired dates, ambiguous local dates and non-export formats',()=>{
 for(const exportedAt of ['2026-02-30T00:00:00.000Z','2026-10-02T24:00:00.000Z','2026-10-02T00:00:00','2026-10-02','October 2, 2026','2026-10-02T00:00:00+01:00','2026-10-02T00:00:00.1Z','+002026-10-02T00:00:00.000Z','-000000-01-01T00:00:00.000Z','x'.repeat(1000)])assert.throws(()=>parsePlannerBackup(JSON.stringify({...JSON.parse(file(empty())),exportedAt})),/export time is invalid/);
});
