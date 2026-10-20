import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {GET}=await vite.ssrLoadModule('/app/api/weather/route.ts');
const forecast={hourly:{time:[1791370800],cloud_cover:[40]},timezone:'UTC'};
const request=(latitude=51.5,longitude=-.1257)=>GET(new Request(`https://nightjar.test/api/weather?lat=${latitude}&lon=${longitude}`));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}

test('simultaneous planner and comparison requests share one validated weather read',async()=>{
 const original=globalThis.fetch,read=deferred();let calls=0;
 globalThis.fetch=async(_url,options)=>{calls++;assert(options.signal instanceof AbortSignal);return read.promise};
 try{
  const responses=Array.from({length:12},()=>request());assert.equal(calls,1);
  read.resolve(Response.json(forecast));
  const completed=await Promise.all(responses);
  for(const response of completed){assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'public, max-age=900');assert.deepEqual(await response.json(),forecast)}
  globalThis.fetch=async()=>{calls++;return Response.json(forecast)};
  assert.equal((await request()).status,200);assert.equal(calls,2,'completed data is not retained in a server cache');
 }finally{globalThis.fetch=original}
});

test('coordinate spellings normalize but precise nearby sites remain separate',async()=>{
 const original=globalThis.fetch,reads=[];
 globalThis.fetch=async url=>{const read=deferred();reads.push({url:new URL(url),...read});return read.promise};
 try{
  const a=request('5.15e1','-.125700'),b=request('51.5000','-0.1257'),c=request('51.500000001','-.1257'),d=request(0,180),e=request(0,-180);
  assert.equal(reads.length,4);assert.equal(reads[1].url.searchParams.get('latitude'),'51.500000001');
  reads.forEach(read=>read.resolve(Response.json(forecast)));
  for(const response of await Promise.all([a,b,c,d,e]))assert.equal(response.status,200);
 }finally{globalThis.fetch=original}
});

test('shared HTTP, parse, malformed-data and network failures release the request for retry',async()=>{
 const original=globalThis.fetch;
 try{
  for(const failure of ['http','json','data','network']){
   const read=deferred();let calls=0;
   globalThis.fetch=async()=>{calls++;return read.promise};
   const a=request(),b=request();assert.equal(calls,1);
   if(failure==='network')read.reject(new TypeError('Network failure'));
   else read.resolve(failure==='http'?new Response('Unavailable',{status:503}):failure==='json'?new Response('broken',{headers:{'content-type':'application/json'}}):Response.json({hourly:{time:[],cloud_cover:[]}}));
   for(const response of await Promise.all([a,b])){assert.equal(response.status,502);assert.equal(response.headers.get('cache-control'),null);assert.match((await response.json()).error,/Please try again/)}
   globalThis.fetch=async()=>{calls++;return Response.json(forecast)};
   assert.equal((await request()).status,200);assert.equal(calls,2);
  }
 }finally{globalThis.fetch=original}
});

test('shared request tracking stays bounded and saturated callers still receive independent responses',async()=>{
 const original=globalThis.fetch,reads=[];
 globalThis.fetch=async()=>{const read=deferred();reads.push(read);return read.promise};
 try{
  const pending=Array.from({length:32},(_,i)=>request(i,10));
  pending.push(request(0,10),request(45,10),request(45,10));
  assert.equal(reads.length,34,'tracked coordinates share; overflow does not allocate another tracked slot');
  reads.forEach(read=>read.resolve(Response.json(forecast)));
  assert((await Promise.all(pending)).every(response=>response.status===200));
  const next=request(45,10),same=request(45,10);assert.equal(reads.length,35,'a released slot can share again');
  reads.at(-1).resolve(Response.json(forecast));
  assert((await Promise.all([next,same])).every(response=>response.status===200));
 }finally{globalThis.fetch=original}
});
