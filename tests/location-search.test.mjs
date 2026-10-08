import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {searchLocations}=await vite.ssrLoadModule('/lib/location-search.ts');
const place={id:1,name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
const waiting=(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
test('location search encodes trimmed names and validates bounded provider results',async()=>{
 const controller=new AbortController();let captured;
 const results=await searchLocations('  São Paulo  ',{signal:controller.signal,fetcher:async(url,options)=>{captured={url,options};return Response.json({results:[{...place,id:null},{...place,id:Infinity},{...place,admin1:{}},...Array.from({length:8},(_,id)=>({...place,id}))]})}});
 assert(captured.url.includes('S%C3%A3o%20Paulo'));assert.equal(results.length,6);assert.equal(results[0].id,0);assert(!controller.signal.aborted);assert(!captured.options.signal.aborted);
 assert.deepEqual(await searchLocations('London',{signal:controller.signal,fetcher:async()=>Response.json({generationtime_ms:1})}),[]);
});
test('a stalled search times out without cancelling the caller or leaving it permanently busy',async()=>{
 const controller=new AbortController();await assert.rejects(searchLocations('London',{signal:controller.signal,fetcher:waiting,timeoutMs:5}),/timed out/);assert(!controller.signal.aborted);
 const retry=await searchLocations('London',{signal:controller.signal,fetcher:async()=>Response.json({results:[place]})});assert.equal(retry.length,1);
});
test('caller cancellation remains distinguishable from timeout and pre-cancelled requests never start',async()=>{
 const controller=new AbortController(),pending=searchLocations('London',{signal:controller.signal,fetcher:waiting});controller.abort();await assert.rejects(pending,error=>error.name==='AbortError');
 let requests=0;await assert.rejects(searchLocations('London',{signal:controller.signal,fetcher:async()=>{requests++;return Response.json({})}}),error=>error.name==='AbortError');assert.equal(requests,0);
});
test('provider and malformed-response failures remain actionable, and invalid queries do not fetch',async()=>{
 const signal=new AbortController().signal;
 await assert.rejects(searchLocations('London',{signal,fetcher:async()=>Response.json({error:'Provider unavailable'},{status:502})}),/Provider unavailable/);
 await assert.rejects(searchLocations('London',{signal,fetcher:async()=>new Response('<html>error</html>')}),/unreadable response/);
 for(const query of ['x','x'.repeat(101)])await assert.rejects(searchLocations(query,{signal,fetcher:async()=>{throw Error('must not fetch')}}),/2 to 100/);
});

test('late responses are rejected even if a transport ignores the abort signal',async()=>{const controller=new AbortController();await assert.rejects(searchLocations('London',{signal:controller.signal,timeoutMs:2,fetcher:async()=>{await new Promise(resolve=>setTimeout(resolve,8));return Response.json({results:[place]})}}),/timed out/);assert(!controller.signal.aborted)});


test('unreadable result containers and wholly unusable rows never masquerade as an empty successful search',async()=>{
 const signal=new AbortController().signal;
 for(const raw of [null,[],true,'bad',{results:null},{results:{}},{results:'London'},{results:[null,{...place,id:-1},{...place,id:.5},{...place,latitude:91}]}])await assert.rejects(searchLocations('London',{signal,fetcher:async()=>Response.json(raw)}),/unreadable response/);
 for(const raw of [{},{generationtime_ms:1},{results:[]}])assert.deepEqual(await searchLocations('London',{signal,fetcher:async()=>Response.json(raw)}),[]);
 await assert.rejects(searchLocations('London',{signal,fetcher:async()=>Response.json({error:true,reason:'Provider QA unavailable'})}),/Provider QA unavailable/);
 await assert.rejects(searchLocations('London',{signal,fetcher:async()=>Response.json({error:'Search QA unavailable'})}),/Search QA unavailable/);
 await assert.rejects(searchLocations('London',{signal,fetcher:async()=>Response.json({error:' ',reason:''})}),/unavailable/);
});
test('location IDs are unique safe integers and displayed administrative names stay bounded',async()=>{
 const signal=new AbortController().signal;
 const raw={results:[{...place,id:Number.MAX_SAFE_INTEGER+1},{...place,id:2,admin1:'x'.repeat(200)},{...place,id:3,admin1:42},{...place,id:1,name:'First QA',admin1:'地區'},{...place,id:1,name:'Duplicate QA'},...Array.from({length:8},(_,index)=>({...place,id:index+4,admin1:'Region QA'}))]};
 const original=structuredClone(raw);const results=await searchLocations('London',{signal,fetcher:async()=>Response.json(raw)});
 assert.equal(results.length,6);assert.deepEqual(results.map(result=>result.id),[1,4,5,6,7,8]);assert.equal(results[0].name,'First QA');assert.equal(results[0].admin1,'地區');assert.deepEqual(raw,original);
});
