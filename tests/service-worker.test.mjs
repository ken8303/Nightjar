import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function runtime(fetcher,stored=new Map()){
 const handlers=new Map(),timers=new Map(),deleted=[],writes=[];let claimed=0,skipped=0,timerId=0;
 const cache={match:async request=>stored.get(typeof request==='string'?request:request.url),put:async(request,response)=>{const key=typeof request==='string'?request:request.url;stored.set(key,response);writes.push(key)},keys:async()=>[...stored.keys()],delete:async key=>stored.delete(key)};
 const caches={open:async()=>cache,match:async key=>stored.get(key),keys:async()=>['nightjar-offline-v4','nightjar-offline-v5','nightjar-offline-v6','nightjar-static-v0','nightjar-static-v1','other-app'],delete:async key=>deleted.push(key)};
 vm.runInNewContext(source,{self:{location:{origin:'https://nightjar.test'},addEventListener:(name,handler)=>handlers.set(name,handler),clients:{claim:async()=>claimed++},skipWaiting:async()=>skipped++},caches,fetch:fetcher,URL,Response,AbortController,setTimeout:(callback,delay)=>{timers.set(++timerId,{callback,delay});return timerId},clearTimeout:id=>timers.delete(id)});
 const dispatch=(name,input={})=>{let promise;handlers.get(name)({...input,respondWith:value=>{promise=value},waitUntil:value=>{promise=value}});return promise};
 return {dispatch,timers,cache,caches,stored,deleted,writes,claimed:()=>claimed,skipped:()=>skipped};
}
const request=(path='/',extra={})=>({url:'https://nightjar.test'+path,method:'GET',mode:'navigate',headers:new Headers(),...extra});
const offline=()=>new Response('Saved plans offline',{headers:{'content-type':'text/html'}});
test('navigation serves cached plans on network errors or server failures while preserving successful pages and real client errors',async()=>{
 for(const status of [200,404,401,500,502,503]){
  const network=new Response('Server response',{status}),app=runtime(async()=>network,new Map([['/offline',offline()]]));
  const response=await app.dispatch('fetch',{request:request()});assert.equal(await response.text(),status>=500?'Saved plans offline':'Server response');assert.equal(app.timers.size,0);assert.equal(app.writes.length,0);
 }
 const broken=runtime(async()=>{throw Error('offline')},new Map([['/offline',offline()]]));assert.equal(await(await broken.dispatch('fetch',{request:request()})).text(),'Saved plans offline');
 const unavailable=runtime(async()=>{throw Error('offline')});unavailable.caches.match=async()=>{throw Error('denied')};const fallback=await unavailable.dispatch('fetch',{request:request()});assert.equal(fallback.status,503);assert.match(await fallback.text(),/temporarily unavailable/);
});
test('stalled navigation aborts after eight seconds and returns saved plans without leaving a timer',async()=>{
 let signal;
 const app=runtime((_request,options)=>new Promise((_resolve,reject)=>{signal=options.signal;signal.addEventListener('abort',()=>reject(Error('aborted')))}),new Map([['/offline',offline()]]));
 const response=app.dispatch('fetch',{request:request()});assert.equal(app.timers.size,1);const timer=[...app.timers.values()][0];assert.equal(timer.delay,8000);timer.callback();assert(signal.aborted);assert.equal(await(await response).text(),'Saved plans offline');assert.equal(app.timers.size,0);
});
test('installation validates offline HTML and activation removes only outdated Nightjar caches',async()=>{
 const app=runtime(async path=>path==='/offline'?offline():new Response('export const recovery=true',{headers:{'content-type':'text/javascript'}}));await app.dispatch('install');assert.deepEqual(app.writes,['/offline','/planner-recovery.mjs']);await app.dispatch('activate');assert.deepEqual(app.deleted,['nightjar-offline-v4','nightjar-offline-v5','nightjar-static-v0']);assert.equal(app.claimed(),1);await app.dispatch('message',{data:{type:'SKIP_WAITING'}});assert.equal(app.skipped(),1);
 for(const response of [new Response('bad',{status:503}),new Response('{}',{headers:{'content-type':'application/json'}})]){const invalid=runtime(async()=>response);await assert.rejects(invalid.dispatch('install'),/Offline page unavailable/);assert.equal(invalid.writes.length,0)}
});
test('offline recovery module is served from its validated cache while denied caches fall back to the network',async()=>{
 const source='export const recovery=true',asset=request('/planner-recovery.mjs',{mode:'cors'}),app=runtime(async()=>{throw Error('offline')},new Map([['/planner-recovery.mjs',new Response(source,{headers:{'content-type':'text/javascript'}})]]));
 assert.equal(await(await app.dispatch('fetch',{request:asset})).text(),source);
 for(const response of [new Response('bad',{status:503}),new Response('<html>',{headers:{'content-type':'text/html'}})]){const invalid=runtime(async path=>path==='/offline'?offline():response);await assert.rejects(invalid.dispatch('install'),/Recovery tools unavailable/);assert.equal(invalid.writes.length,0)}
 const denied=runtime(async()=>new Response(source));denied.caches.match=async()=>{throw Error('denied')};assert.equal(await(await denied.dispatch('fetch',{request:asset})).text(),source);
 for(const ignored of [request('/planner-recovery.mjs?v=1',{mode:'cors'}),request('/planner-recovery.mjs',{mode:'cors',headers:new Headers({authorization:'test'})})])assert.equal(app.dispatch('fetch',{request:ignored}),undefined);
});
test('static caching remains bounded and skips APIs, foreign requests, auth, queries and non-GET requests',async()=>{
 let fetches=0;const response=()=>{const value=new Response('app code',{headers:{'content-type':'text/javascript'}});Object.defineProperty(value,'type',{value:'basic'});return value};
 const stored=new Map(Array.from({length:80},(_,i)=>['old-'+i,response()])),app=runtime(async()=>{fetches++;return response()},stored);
 const asset=request('/_next/static/chunks/app-hash.js',{mode:'cors'});await app.dispatch('fetch',{request:asset});assert.equal(stored.size,80);assert(stored.has(asset.url));assert(!stored.has('old-0'));await app.dispatch('fetch',{request:asset});assert.equal(fetches,1);
 for(const ignored of [request('/api/weather',{mode:'cors'}),request('/_next/static/app.js?v=1',{mode:'cors'}),request('/_next/static/app.js',{mode:'cors',headers:new Headers({authorization:'test'})}),request('/',{method:'POST'}),request('/',{url:'https://other.test/'})])assert.equal(app.dispatch('fetch',{request:ignored}),undefined);
 const denied=runtime(async()=>response());denied.caches.open=async()=>{throw Error('storage denied')};assert.equal((await denied.dispatch('fetch',{request:asset})).status,200);
 const privateApp=runtime(async()=>{const value=response();value.headers.set('cache-control','private, no-store');return value});await privateApp.dispatch('fetch',{request:asset});assert.equal(privateApp.writes.length,0);
});
