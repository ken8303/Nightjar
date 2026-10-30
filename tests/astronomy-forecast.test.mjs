import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {parseAstronomyProvider,parseAstronomyResponse,seeingRanges,transparencyRanges}=await vite.ssrLoadModule('/lib/astronomy-forecast.ts');
const {GET}=await vite.ssrLoadModule('/app/api/astronomy-forecast/route.ts');
const fixture=()=>({product:'astro',init:'2026103000',dataseries:[{timepoint:3,seeing:1,transparency:8},{timepoint:6,seeing:-9999,transparency:2}]});
test('astronomy categories retain valid values, UTC forecast times and independent missing values',()=>{
 const result=parseAstronomyProvider(fixture());assert.equal(result.issuedAt,Date.parse('2026-10-30T00:00:00Z'));assert.deepEqual(result.samples,[{time:Date.parse('2026-10-30T03:00:00Z'),seeing:1,transparency:8},{time:Date.parse('2026-10-30T06:00:00Z'),seeing:null,transparency:2}]);assert.deepEqual(parseAstronomyResponse(result),result);
 assert.equal(seeingRanges[0],'<0.5');assert.equal(transparencyRanges[7],'>1');
});
test('invalid runs, duplicate times and malformed responses cannot become a forecast',()=>{
 for(const change of [f=>{f.init='2026023000'},f=>{f.product='civil'},f=>{f.dataseries[1].timepoint=3},f=>{f.dataseries[1].timepoint=241},f=>{f.dataseries=[]}]){const f=fixture();change(f);assert.throws(()=>parseAstronomyProvider(f))}
 const f=fixture();f.dataseries[0].seeing=9;f.dataseries[0].transparency='1';assert.deepEqual(parseAstronomyProvider(f).samples[0].seeing,null);assert.deepEqual(parseAstronomyProvider(f).samples[0].transparency,null);
 assert.throws(()=>parseAstronomyResponse({issuedAt:0,samples:[{time:-1}]}));
});
test('endpoint stays disabled until verified and validates coordinates before reaching provider',async()=>{
 const original=process.env.ASTRONOMY_FORECAST_VERIFIED,fetch=globalThis.fetch;let calls=0;
 try{delete process.env.ASTRONOMY_FORECAST_VERIFIED;globalThis.fetch=async()=>{calls++;throw Error('Unexpected provider call')};
 assert.equal((await GET(new Request('https://example.test/api/astronomy-forecast?lat=91&lon=0'))).status,400);
 const disabled=await GET(new Request('https://example.test/api/astronomy-forecast?lat=51.5&lon=0'));assert.equal(disabled.status,503);assert.equal(disabled.headers.get('cache-control'),'no-store');assert.equal(calls,0);
 process.env.ASTRONOMY_FORECAST_VERIFIED='true';globalThis.fetch=async(url,options)=>{calls++;const u=new URL(url);assert.equal(u.hostname,'www.7timer.info');assert.equal(u.searchParams.get('product'),'astro');assert.equal(u.searchParams.get('tzshift'),'0');assert(options.signal);return Response.json(fixture())};
 const result=await GET(new Request('https://example.test/api/astronomy-forecast?lat=51.5&lon=0'));assert.equal(result.status,200);assert.deepEqual(await result.json(),parseAstronomyProvider(fixture()));
 globalThis.fetch=async()=>new Response('private provider error',{status:503});const error=await GET(new Request('https://example.test/api/astronomy-forecast?lat=52&lon=0'));assert.equal(error.status,502);assert(!JSON.stringify(await error.json()).includes('private'));
 }finally{globalThis.fetch=fetch;if(original===undefined)delete process.env.ASTRONOMY_FORECAST_VERIFIED;else process.env.ASTRONOMY_FORECAST_VERIFIED=original}
});
test('endpoint coalesces same-site requests and limits oversized responses',async()=>{
 const original=process.env.ASTRONOMY_FORECAST_VERIFIED,fetch=globalThis.fetch;let calls=0;
 try{
  process.env.ASTRONOMY_FORECAST_VERIFIED='true';let release;const wait=new Promise(resolve=>{release=resolve});
  globalThis.fetch=async()=>{calls++;await wait;return Response.json(fixture())};
  const url='https://example.test/api/astronomy-forecast?lat=45&lon=2';const first=GET(new Request(url)),second=GET(new Request(url));release();
  assert.equal((await first).status,200);assert.equal((await second).status,200);assert.equal(calls,1);assert.equal((await GET(new Request(url))).status,200);assert.equal(calls,1);
  globalThis.fetch=async()=>new Response('x'.repeat(100001));assert.equal((await GET(new Request('https://example.test/api/astronomy-forecast?lat=46&lon=2'))).status,502);
 }finally{globalThis.fetch=fetch;if(original===undefined)delete process.env.ASTRONOMY_FORECAST_VERIFIED;else process.env.ASTRONOMY_FORECAST_VERIFIED=original}
});
