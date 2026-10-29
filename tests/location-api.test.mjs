import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {GET}=await vite.ssrLoadModule('/app/api/locations/route.ts');
test('location provider language is restricted to supported planner languages',async()=>{
 const original=globalThis.fetch,seen=[];
 try{globalThis.fetch=async url=>{seen.push(new URL(url).searchParams.get('language'));return Response.json({results:[]})};
  await GET(new Request('https://nightjar.test/api/locations?q=Taipei&lang=zh-Hant'));
  await GET(new Request('https://nightjar.test/api/locations?q=Taipei&lang=unknown'));
  assert.deepEqual(seen,['zh-TW','en']);
 }finally{globalThis.fetch=original}
});
test('invalid town searches do not contact the provider and names retain literal punctuation',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(new URL(url).searchParams.get('name'),'A&B + village');assert(options.signal);return Response.json({results:[]})};
 try{for(const query of ['', ' ', 'A', 'x'.repeat(101)]){const response=await GET(new Request('https://nightjar.test/api/locations?q='+encodeURIComponent(query)));assert.deepEqual(await response.json(),{results:[]})}assert.equal(calls,0);const response=await GET(new Request('https://nightjar.test/api/locations?q='+encodeURIComponent(' A&B + village ')));assert.equal(response.status,200);assert.deepEqual(await response.json(),{results:[]});assert.equal(calls,1)}finally{globalThis.fetch=original}
});
test('failed or unreadable location responses return a recoverable public error',async()=>{
 const original=globalThis.fetch;
 try{for(const provider of [async()=>new Response('private upstream error',{status:503}),async()=>new Response('{'),async()=>{throw Error('private network error')}]){globalThis.fetch=provider;const response=await GET(new Request('https://nightjar.test/api/locations?q=London'));assert.equal(response.status,502);assert.deepEqual(await response.json(),{error:'Location search is unavailable. Try your device location or coordinates.'})}}finally{globalThis.fetch=original}
});


test('rejected search bodies are cancelled while cancellation failures leave search retry available',{timeout:2000},async t=>{
 let rejectBody=true,cleanupFails=false,cancelled=0;
 t.mock.method(globalThis,'fetch',async()=>rejectBody?new Response(new ReadableStream({cancel(){cancelled++;if(cleanupFails==='pending')return new Promise(()=>{});if(cleanupFails)throw Error('Private cleanup failure')}}),{status:503}):Response.json({results:[]}));
 for(const fail of [false,true,'pending']){
  cleanupFails=fail;rejectBody=true;const before=cancelled;
  const response=await GET(new Request('https://nightjar.test/api/locations?q=London'));
  assert.equal(response.status,502);assert.equal(cancelled,before+1);assert.deepEqual(await response.json(),{error:'Location search is unavailable. Try your device location or coordinates.'});
  rejectBody=false;assert.equal((await GET(new Request('https://nightjar.test/api/locations?q=London'))).status,200);
 }
});
