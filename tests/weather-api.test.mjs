import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {GET}=await vite.ssrLoadModule('/app/api/weather/route.ts');
const request=query=>new Request('https://nightjar.test/api/weather?'+query);
const forecast=(cloud=0)=>({timezone:'Europe/London',hourly:{time:[1792141200,1792144800],cloud_cover:[cloud,80],temperature_2m:[5,4]}});
test('invalid weather coordinates return 400 without contacting the provider',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('Must not fetch')});
 for(const query of ['', 'lat=0','lon=0','lat=&lon=0','lat=91&lon=0','lat=0&lon=-181','lat=0x20&lon=0','lat=NaN&lon=0','lat=0&lon=Infinity']){
  const response=await GET(request(query));assert.equal(response.status,400);assert.deepEqual(await response.json(),{error:'Invalid coordinates'});assert.equal(response.headers.get('cache-control'),null);
 }
 assert.equal(calls,0);
});
test('valid weather requests preserve coordinate identity, forecast data and successful cache policy',async t=>{
 const seen=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  const endpoint=new URL(url);assert.equal(endpoint.origin+endpoint.pathname,'https://api.open-meteo.com/v1/forecast');assert.equal(endpoint.searchParams.get('timezone'),'auto');assert.equal(endpoint.searchParams.get('timeformat'),'unixtime');assert.equal(endpoint.searchParams.get('forecast_days'),'7');assert(options.signal instanceof AbortSignal);
  const coordinates=[endpoint.searchParams.get('latitude'),endpoint.searchParams.get('longitude')];seen.push(coordinates);return Response.json(forecast(coordinates[0]==='0'?0:100));
 });
 for(const [query,cloud] of [['lat=0&lon=0',0],['lat=-33.8688&lon=151.2093',100]]){
  const response=await GET(request(query));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'public, max-age=900');assert.deepEqual(await response.json(),forecast(cloud));
 }
 assert.deepEqual(seen,[['0','0'],['-33.8688','151.2093']]);
});
test('provider HTTP, decoding, sample-validation and network failures give public retry guidance without caching errors',async t=>{
 let read;t.mock.method(globalThis,'fetch',(...args)=>read(...args));
 const bad=[()=>new Response('Private quota detail',{status:429}),()=>new Response('Private server detail',{status:503}),()=>new Response('<html>Private proxy page</html>'),()=>Response.json({hourly:{time:[1792141200],cloud_cover:[]}}),()=>Response.json({hourly:{time:[1792141200,1792141200],cloud_cover:[0,0]}}),()=>{throw new TypeError('Private network detail')}];
 for(const fail of bad){
  read=async()=>fail();const response=await GET(request('lat=51.5&lon=0'));assert.equal(response.status,502);assert.equal(response.headers.get('cache-control'),null);assert.deepEqual(await response.json(),{error:'Weather is temporarily unavailable. Please try again.'});
 }
 read=async()=>Response.json(forecast());assert.equal((await GET(request('lat=51.5&lon=0'))).status,200);
});
