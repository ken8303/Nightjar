import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
async function route(t){const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});t.after(()=>vite.close());return (await vite.ssrLoadModule('/app/api/aurora/route.ts')).GET}
const provider=(forecast='2026-10-16T21:00:00Z')=>({'Observation Time':'2026-10-16T20:00:00Z','Forecast Time':forecast,coordinates:Array.from({length:100},(_,i)=>[i,60,20])});
function deferred(){let release;const promise=new Promise(resolve=>{release=resolve});return {promise,release}}
test('concurrent aurora requests share one provider read, independent responses and the existing five-minute cache',async t=>{
 const GET=await route(t),gate=deferred();let calls=0,clock=0,raw=provider();
 t.mock.method(Date,'now',()=>clock);
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls++;assert.equal(url,'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json');assert(options.signal instanceof AbortSignal);await gate.promise;return Response.json(raw)});
 const first=GET(),second=GET();gate.release();const responses=await Promise.all([first,second]);
 assert.equal(calls,1);assert.notEqual(responses[0],responses[1]);for(const response of responses){assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'public, max-age=300');assert.equal((await response.json()).forecastAt,'2026-10-16T21:00:00.000Z')}
 // A late cache hit must not grant a browser another full five minutes with
 // an old provider snapshot. Fractional seconds round down, not past expiry.
 clock=120001;const middle=await GET();assert.equal(middle.headers.get('cache-control'),'public, max-age=179');assert.equal(calls,1);
 clock=299999;const last=await GET();assert.equal(last.headers.get('cache-control'),'public, max-age=0');assert.equal((await last.json()).forecastAt,'2026-10-16T21:00:00.000Z');assert.equal(calls,1);
 clock=300000;raw=provider('2026-10-16T21:30:00Z');const refreshed=await GET();assert.equal(refreshed.headers.get('cache-control'),'public, max-age=300');assert.equal((await refreshed.json()).forecastAt,'2026-10-16T21:30:00.000Z');assert.equal(calls,2);
});
test('a shared provider rejection gives each caller recovery guidance and a later request can retry',async t=>{
 const GET=await route(t),gate=deferred();let calls=0,fail=true;
 t.mock.method(globalThis,'fetch',async()=>{calls++;await gate.promise;if(fail)throw new TypeError('Provider network failure');return Response.json(provider())});
 const first=GET(),second=GET();gate.release();for(const response of await Promise.all([first,second])){assert.equal(response.status,502);assert.match((await response.json()).error,/temporarily unavailable/)}assert.equal(calls,1);
 fail=false;assert.equal((await GET()).status,200);assert.equal(calls,2);assert.equal((await GET()).status,200);assert.equal(calls,2);
});
test('failed HTTP, unreadable and invalid provider bodies are not cached and remain retryable',async t=>{
 let read; t.mock.method(globalThis,'fetch',(...args)=>read(...args));
 for(const failed of [()=>new Response('Unavailable',{status:503}),()=>new Response('<html>Not JSON</html>',{headers:{'Content-Type':'text/html'}}),()=>Response.json({...provider(),'Forecast Time':'2026-10-16T19:00:00Z'})]){
  const GET=await route(t),gate=deferred();let calls=0,fail=true;
  read=async()=>{calls++;await gate.promise;return fail?failed():Response.json(provider())};
  const first=GET(),second=GET();gate.release();for(const response of await Promise.all([first,second]))assert.equal(response.status,502);assert.equal(calls,1);
  fail=false;assert.equal((await GET()).status,200);assert.equal(calls,2);
 }
});
