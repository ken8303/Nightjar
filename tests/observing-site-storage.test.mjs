import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {readObservingSite,readPlannerSetup,initialPlace}=await vite.ssrLoadModule('/lib/planner-state.ts');
const {saveForecastTimezone}=await vite.ssrLoadModule('/lib/place-timezone.ts');
const site={name:'Stored QA site',latitude:51.5,longitude:0,timezone:'UTC',country:'QA',bortle:4};
function store(raw){const values=new Map(raw===null?[]:[['nightjar-place',raw]]),writes=[];return {values,writes,getItem:key=>values.get(key)??null,setItem:(key,value)=>{writes.push([key,value]);values.set(key,value)}}}
test('site reads distinguish a new visitor from unreadable data without modifying the stored value',()=>{
 assert.deepEqual(readObservingSite(store(null)),{place:initialPlace,error:false});
 const valid=store(JSON.stringify({...site,extra:'preserved QA'}));assert.deepEqual(readObservingSite(valid),{place:{...site,extra:'preserved QA'},error:false});assert.deepEqual(valid.writes,[]);
 for(const raw of ['', 'null','[]','true','{bad',JSON.stringify({...site,latitude:91}),JSON.stringify({...site,timezone:'Invalid/QA'}),'x'.repeat(5*1024*1024+1)]){const storage=store(raw);assert.deepEqual(readObservingSite(storage),{place:initialPlace,error:true});assert.equal(storage.getItem('nightjar-place'),raw);assert.deepEqual(storage.writes,[])}
 assert.deepEqual(readObservingSite({getItem:()=>{throw Error('Blocked')}}),{place:initialPlace,error:true});
});
test('startup reports an unreadable selected site while keeping saved alternatives and recovered time',()=>{
 const previousLocal=globalThis.localStorage,previousSession=globalThis.sessionStorage,raw='{broken original QA';
 const storage=store(raw);storage.values.set('nightjar-places',JSON.stringify([site]));globalThis.localStorage=storage;globalThis.sessionStorage={getItem:()=>JSON.stringify('2026-10-08T20:00:00.000Z')};
 try{const setup=readPlannerSetup(new Date('2026-10-08T12:00Z'));assert.equal(setup.placeReadError,true);assert.deepEqual(setup.place,initialPlace);assert.deepEqual(setup.saved,[site]);assert.equal(setup.date.toISOString(),'2026-10-08T20:00:00.000Z');assert.equal(storage.getItem('nightjar-place'),raw);assert.deepEqual(storage.writes,[])}
 finally{if(previousLocal===undefined)delete globalThis.localStorage;else globalThis.localStorage=previousLocal;if(previousSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=previousSession}
});
test('forecast time zones update only the unchanged owning site and never overwrite unreadable or newer selections',()=>{
 const storage=store(JSON.stringify({...site,extra:'keep'}));assert.equal(saveForecastTimezone(storage,site,'Europe/London'),true);assert.deepEqual(JSON.parse(storage.getItem('nightjar-place')),{...site,extra:'keep',timezone:'Europe/London'});const writes=storage.writes.length;assert.equal(saveForecastTimezone(storage,{...site,timezone:'Europe/London'},'Europe/London'),true);assert.equal(storage.writes.length,writes);
 for(const changed of [{...site,name:'Renamed elsewhere'}, {...site,latitude:48.8}, {...site,longitude:2.3}, {...site,country:'Changed'}, {...site,bortle:2}, {...site,timezone:'Europe/Paris'}]){const newer=store(JSON.stringify(changed));assert.equal(saveForecastTimezone(newer,site,'Europe/London'),false);assert.equal(newer.getItem('nightjar-place'),JSON.stringify(changed));assert.deepEqual(newer.writes,[])}
 for(const raw of [null,'{bad','null','[]',JSON.stringify({...site,latitude:91})]){const invalid=store(raw);assert.equal(saveForecastTimezone(invalid,site,'Europe/London'),false);assert.equal(invalid.getItem('nightjar-place'),raw);assert.deepEqual(invalid.writes,[])}
 const invalidZone=store(JSON.stringify(site));assert.equal(saveForecastTimezone(invalidZone,site,'Invalid/QA'),false);assert.deepEqual(invalidZone.writes,[]);
 assert.equal(saveForecastTimezone({getItem:()=>{throw Error('Blocked')},setItem:()=>assert.fail('must not write')},site,'Europe/London'),false);
 const failed=store(JSON.stringify(site));failed.setItem=()=>{throw Error('Quota')};assert.equal(saveForecastTimezone(failed,site,'Europe/London'),false);assert.equal(failed.getItem('nightjar-place'),JSON.stringify(site));
});

test('startup treats a damaged saved-place collection as unreadable instead of silently dropping rows',()=>{
 const previousLocal=globalThis.localStorage,previousSession=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:()=>JSON.stringify('2026-10-08T20:00:00.000Z')};
 try{
  for(const raw of ['','bad','{}',JSON.stringify([site,{...site,latitude:91}]),'x'.repeat(5*1024*1024+1)]){const storage=store(JSON.stringify(site));storage.values.set('nightjar-places',raw);globalThis.localStorage=storage;const setup=readPlannerSetup();assert.equal(setup.savedReadError,true);assert.deepEqual(setup.saved,[]);assert.deepEqual(setup.place,site);assert.equal(setup.placeReadError,false);assert.equal(storage.getItem('nightjar-places'),raw);assert.deepEqual(storage.writes,[])}
  globalThis.localStorage={getItem:key=>{if(key==='nightjar-places')throw Error('Blocked');return JSON.stringify(site)}};assert.equal(readPlannerSetup().savedReadError,true);
 }finally{if(previousLocal===undefined)delete globalThis.localStorage;else globalThis.localStorage=previousLocal;if(previousSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=previousSession}
});
test('shared saved-place parsing accepts absent and serialized empty lists plus untruncated legacy data',async()=>{
 const {parseSavedPlaces}=await vite.ssrLoadModule('/lib/planner-state.ts');
 for(const raw of [null,'[]'])assert.deepEqual(parseSavedPlaces(raw),[]);assert.throws(()=>parseSavedPlaces(''));
 const legacy=Array.from({length:101},(_,index)=>({...site,name:`Legacy ${index}`})),raw=JSON.stringify(legacy);assert.deepEqual(parseSavedPlaces(raw),legacy);assert.equal(raw,JSON.stringify(legacy));assert.throws(()=>parseSavedPlaces(JSON.stringify([site,{...site,timezone:'Invalid/QA'}])),/invalid data/);
});
