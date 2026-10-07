import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {requestCoordinates}=await vite.ssrLoadModule('/lib/request-coordinates.ts');
const {GET}=await vite.ssrLoadModule('/app/api/weather/route.ts');
test('coordinate requests preserve valid zero, decimal, scientific notation and boundary values',()=>{
 for(const [lat,lon] of [['0','0'],['-90','180'],['90','-180'],[' 51.5 ',' -.126 '],['1e-5','2e1'],['+.5','-0']])assert.deepEqual(requestCoordinates(new URLSearchParams({lat,lon})),{latitude:Number(lat),longitude:Number(lon)});
 for(const [lat,lon] of [['','0'],['   ','0'],['0',''],['91','0'],['0','180.1'],['NaN','0'],['Infinity','0'],['1e999','0'],['0x10','0'],['1,5','0'],['+','0']])assert.equal(requestCoordinates(new URLSearchParams({lat,lon})),null);
 assert.equal(requestCoordinates(new URLSearchParams()),null);
});
test('weather API rejects blank or missing coordinates before making a provider request',async()=>{
 const original=globalThis.fetch;let requests=0;globalThis.fetch=async()=>{requests++;throw Error('Must not contact provider')};
 try{for(const query of ['', '?lat=&lon=0','?lat=%20&lon=0','?lat=0&lon=','?lat=91&lon=0']){const response=await GET(new Request('https://nightjar.test/api/weather'+query));assert.equal(response.status,400);assert.equal((await response.json()).error,'Invalid coordinates')}assert.equal(requests,0)}finally{globalThis.fetch=original}
});
test('valid zero coordinates reach the provider and retain the existing successful response contract',async()=>{
 const original=globalThis.fetch;let endpoint;const forecast={hourly:{time:[1791370800],cloud_cover:[40]},timezone:'UTC'};
 globalThis.fetch=async(url,options)=>{endpoint=new URL(url);assert(options.signal);return Response.json(forecast)};
 try{const response=await GET(new Request('https://nightjar.test/api/weather?lat=0&lon=0'));assert.equal(response.status,200);assert.equal(endpoint.searchParams.get('latitude'),'0');assert.equal(endpoint.searchParams.get('longitude'),'0');assert.equal(response.headers.get('cache-control'),'public, max-age=900');assert.deepEqual(await response.json(),forecast)}finally{globalThis.fetch=original}
});

test('malformed provider forecasts fail without caching a successful API response',async()=>{
 const original=globalThis.fetch;
 try{for(const forecast of [null,{}, {hourly:{time:[],cloud_cover:[]}}, {hourly:{time:[1791370800],cloud_cover:[]}}, {hourly:{time:[1791374400,1791370800],cloud_cover:[0,10]}}]){
  globalThis.fetch=async()=>Response.json(forecast);
  const response=await GET(new Request('https://nightjar.test/api/weather?lat=0&lon=0'));
  assert.equal(response.status,502);assert.equal(response.headers.get('cache-control'),null);assert.match((await response.json()).error,/Please try again/);
 }}finally{globalThis.fetch=original}
});
