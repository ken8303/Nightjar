import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {normalizeDiary,readDiary,saveDiary,mergeDiary}=await vite.ssrLoadModule('/lib/observing-diary.ts');
const {makePlannerBackup,parsePlannerBackup,restorePlannerBackup,previewPlannerMerge}=await vite.ssrLoadModule('/lib/planner-backup.ts');
const entry={id:'night-1',target:'M31',observedAt:'2026-10-05T20:00:00.000Z',place:{name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'},outcome:'seen',equipment:'Binoculars',notes:'Faint glow\n星空 <img src=x>'};
const empty={places:[],targets:[],deepTargets:[],notes:{},equipment:[],diary:[]};
function storage(){const values=new Map();return {values,getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}}
test('diary preserves snapshot and multiline text, validates IDs, dates and collection bounds',()=>{
 const store=storage();saveDiary([entry],store);assert.deepEqual(readDiary(store),[entry]);assert.equal(readDiary(store)[0].notes,entry.notes);
 for(const patch of [{id:'<id>'},{target:'M102'},{observedAt:'2026-02-30T20:00:00.000Z'},{outcome:'probably'},{equipment:'x'.repeat(101)},{notes:'x'.repeat(2001)},{place:{...entry.place,latitude:91}}])assert.throws(()=>normalizeDiary([{...entry,...patch}]));
 assert.throws(()=>normalizeDiary([entry,entry]));assert.throws(()=>normalizeDiary(Array.from({length:201},(_,i)=>({...entry,id:`night-${i}`}))));
 assert.throws(()=>readDiary({getItem:()=>'{'}));assert.throws(()=>readDiary({getItem:()=>{throw Error('blocked')}}));assert.throws(()=>saveDiary([entry],{setItem:()=>{throw Error('quota')}}));
 assert.equal(normalizeDiary([{...entry,unknown:'ignored'}])[0].unknown,undefined);
});
test('backup diary merge keeps local conflicts and supports legacy files without observations',()=>{
 const current=storage();saveDiary([entry],current);
 const incoming={...empty,diary:[{...entry,notes:'Incoming conflict'},{...entry,id:'night-2',target:'M45'}]};
 const review=previewPlannerMerge({...empty,diary:[entry]},incoming);assert.equal(review.added.diary,1);assert.equal(review.kept.diary.length,1);assert.equal(mergeDiary([entry],incoming.diary)[0].notes,entry.notes);
 const backup=parsePlannerBackup(JSON.stringify({format:'nightjar-backup',version:3,exportedAt:'2026-10-05T21:00Z',data:incoming}));
 assert.equal(restorePlannerBackup(current,backup).diary.length,2);const exported=makePlannerBackup(current);assert.equal(exported.version,3);assert.deepEqual(parsePlannerBackup(JSON.stringify(exported)).data.diary,readDiary(current));
 const {diary:_legacyDiary,...legacy}=empty;for(const version of [1,2])assert.deepEqual(parsePlannerBackup(JSON.stringify({...backup,version,data:legacy})).data.diary,[]);
 assert.throws(()=>parsePlannerBackup(JSON.stringify({...backup,data:{...empty,diary:null}})));
 assert.throws(()=>parsePlannerBackup(JSON.stringify({...backup,data:{...empty,diary:[{...entry,target:'bad'}]}})));
});
