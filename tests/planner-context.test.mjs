import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {serializePlannerContext,readPlannerContext,currentPlannerContextKey,recoveryPlannerContextKey,readPlannerSetup}=await vite.ssrLoadModule('/lib/planner-state.ts');
const {savePlannerTime,preservePlannerTime}=await vite.ssrLoadModule('/lib/reload-planner.ts');
const date=new Date('2026-10-09T21:45:17.123Z'),own={name:'Own site 星空',latitude:51.5,longitude:0,timezone:'Europe/London',country:'United Kingdom',bortle:4},peer={name:'Peer Paris',latitude:48.85,longitude:2.35,timezone:'Europe/Paris',extra:'Peer metadata'};
function storage(entries=[]){const values=new Map(entries);return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}}
const reset=()=>savePlannerTime(date,{setItem:()=>{}},{setItem:()=>{}});
test('paired snapshots retain exact time and known site fields without mutating the source',()=>{
 const input={...own,extra:'Opaque source metadata'},before=structuredClone(input),text=serializePlannerContext(date,input),store=storage([[recoveryPlannerContextKey,text]]);
 const restored=readPlannerContext(store,recoveryPlannerContextKey);assert.equal(restored.date.toISOString(),date.toISOString());assert.deepEqual(restored.place,own);assert.deepEqual(input,before);assert.equal(store.getItem(recoveryPlannerContextKey),text);
 assert(text.length<4096);assert.throws(()=>serializePlannerContext(new Date(NaN),own));assert.throws(()=>serializePlannerContext(date,{...own,latitude:91}));
});
test('malformed, oversized and unsupported paired snapshots are ignored without changing storage',()=>{
 const base=JSON.parse(serializePlannerContext(date,own));
 for(const raw of ['', '{','null','[]','42','x'.repeat(4097),JSON.stringify({...base,version:2}),JSON.stringify({...base,time:'2026-02-30T21:45:17.123Z'}),JSON.stringify({...base,time:'0000-01-01T00:00:00.000Z'}),JSON.stringify({...base,place:{...own,timezone:'Invalid/Zone'}})]){
  const store=storage([[recoveryPlannerContextKey,raw]]);assert.equal(readPlannerContext(store,recoveryPlannerContextKey),null);assert.equal(store.getItem(recoveryPlannerContextKey),raw);
 }
 assert.equal(readPlannerContext({getItem:()=>{throw Error('Blocked')}},recoveryPlannerContextKey),null);
});
test('reload restores this tab\'s paired view without replacing a newer shared selected site',()=>{
 const oldLocal=globalThis.localStorage,oldSession=globalThis.sessionStorage,raw=JSON.stringify(peer),local=storage([['nightjar-place',raw]]),session=storage();
 globalThis.localStorage=local;globalThis.sessionStorage=session;
 try{
  savePlannerTime(date,local,session,own);assert.equal(preservePlannerTime(local,session),true);
  const setup=readPlannerSetup(new Date('2026-10-09T12:00:00Z'));assert.deepEqual(setup.place,own);assert.equal(setup.date.toISOString(),date.toISOString());assert.equal(setup.placeReadError,false);assert.equal(local.getItem('nightjar-place'),raw);
  local.setItem('nightjar-place','{unreadable');const recovered=readPlannerSetup();assert.deepEqual(recovered.place,own);assert.equal(recovered.placeReadError,true);assert.equal(local.getItem('nightjar-place'),'{unreadable');
 }finally{reset();if(oldLocal===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldLocal;if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession}
});
test('live paired context remains current when its ordinary session save fails',()=>{
 const local=storage(),session=storage(),oldText=serializePlannerContext(new Date('2026-10-09T20:30:00Z'),own),next={...own,name:'Latest scene',latitude:35,longitude:-110};session.setItem(currentPlannerContextKey,oldText);
 const write=session.setItem;session.setItem=(key,value)=>{if(key===currentPlannerContextKey)throw Error('Current snapshot blocked');write(key,value)};
 try{savePlannerTime(date,local,session,next);assert.equal(session.getItem(currentPlannerContextKey),oldText);assert.equal(preservePlannerTime(local,session),true);const result=readPlannerContext(session,recoveryPlannerContextKey);assert.deepEqual(result.place,next);assert.equal(result.date.toISOString(),date.toISOString())}finally{reset()}
});
test('failed paired recovery writes refuse reload preservation while a legacy-token failure does not discard a successful pair',()=>{
 const local=storage(),session=storage(),write=session.setItem;
 try{
  savePlannerTime(date,local,session,own);session.setItem=(key,value)=>{if(key===recoveryPlannerContextKey)throw Error('Blocked pair');write(key,value)};
  assert.equal(preservePlannerTime(local,session),false);assert.equal(session.getItem(recoveryPlannerContextKey),null);assert.equal(session.getItem('nightjar-recovery-time-v1'),null);
  session.setItem=(key,value)=>{if(key==='nightjar-recovery-time-v1')throw Error('Blocked legacy token');write(key,value)};
  assert.equal(preservePlannerTime(local,session),true);assert.deepEqual(readPlannerContext(session,recoveryPlannerContextKey).place,own);
 }finally{reset()}
});
test('date-only compatibility clears a stale paired recovery instead of restoring an unrelated scene',()=>{
 const local=storage(),session=storage([[recoveryPlannerContextKey,serializePlannerContext(new Date('2026-10-08T20:00:00Z'),peer)]]);
 try{savePlannerTime(date,local,session);assert.equal(preservePlannerTime(local,session),true);assert.equal(session.getItem(recoveryPlannerContextKey),null);assert.equal(session.getItem('nightjar-recovery-time-v1'),JSON.stringify(date.toISOString()))}finally{reset()}
});
