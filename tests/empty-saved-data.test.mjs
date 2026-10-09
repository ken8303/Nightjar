import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {readSavedPlaces,readEquipmentProfiles}=await vite.ssrLoadModule('/lib/saved-collections.ts');
const {readSavedTargets}=await vite.ssrLoadModule('/lib/saved-targets.ts');
const {readTargetNotes}=await vite.ssrLoadModule('/lib/target-notes.ts');
const {readDeepSkyList}=await vite.ssrLoadModule('/lib/deep-sky-list.ts');
const {readDiary}=await vite.ssrLoadModule('/lib/observing-diary.ts');
const {makePlannerBackup,readSavedPlan}=await vite.ssrLoadModule('/lib/planner-backup.ts');
const {makePlannerRecovery}=await vite.ssrLoadModule('/lib/planner-recovery.ts');
const readers=[['nightjar-places',readSavedPlaces,[]],['nightjar-equipment',readEquipmentProfiles,[]],['nightjar-targets-v1',readSavedTargets,[]],['nightjar-target-notes-v1',readTargetNotes,{}],['nightjar-deep-targets-v1',readDeepSkyList,[]],['nightjar-observing-diary-v1',readDiary,[]]];
function store(values=new Map()){let writes=0;return {values,get writes(){return writes},getItem:key=>values.get(key)??null,setItem:(key,value)=>{writes++;values.set(key,value)},removeItem:key=>{writes++;values.delete(key)}}}
test('absent collections and explicitly serialized empty collections remain valid without writes',()=>{
 for(const [key,read,empty] of readers){for(const source of [store(),store(new Map([[key,JSON.stringify(empty)]]))]){assert.deepEqual(read(source),empty);assert.equal(source.writes,0)}}
 assert.deepEqual(readSavedPlan(store()),{places:[],targets:[],notes:{},equipment:[],deepTargets:[],diary:[]});
});
test('present empty strings are unreadable collections rather than new empty lists',()=>{
 for(const [key,read] of readers){const source=store(new Map([[key,'']]));assert.throws(()=>read(source));assert.equal(source.getItem(key),'');assert.equal(source.writes,0)}
});
test('normal backups reject empty or oversized legacy collections while raw recovery retains their exact source',()=>{
 for(const [key] of readers){const source=store(new Map([[key,'']]));assert.throws(()=>makePlannerBackup(source),/could not be read/);const raw=JSON.parse(makePlannerRecovery(source,{getItem:()=>null}).text);assert.equal(raw.stores.local[key],'');assert.equal(source.writes,0)}
 const legacy=JSON.stringify(Array.from({length:101},(_,i)=>({name:'Site '+i,latitude:0,longitude:i}))),source=store(new Map([['nightjar-places',legacy]]));assert.throws(()=>makePlannerBackup(source),/could not be read/);assert.equal(JSON.parse(makePlannerRecovery(source,{getItem:()=>null}).text).stores.local['nightjar-places'],legacy);assert.equal(source.writes,0);
});
test('deep-sky reads reject oversized valid JSON before interpreting it',()=>{
 const raw=' '.repeat(5*1024*1024)+JSON.stringify(['M31']),source=store(new Map([['nightjar-deep-targets-v1',raw]]));assert.throws(()=>readDeepSkyList(source),/too large/);assert.equal(source.getItem('nightjar-deep-targets-v1'),raw);assert.equal(source.writes,0);
});
